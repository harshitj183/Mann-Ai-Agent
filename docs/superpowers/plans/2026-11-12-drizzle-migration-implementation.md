# Shared Drizzle ORM Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate auth, chat, agent, and memory services from direct `pg` SQL to one shared Drizzle database package with committed, idempotent Drizzle Kit migrations while preserving existing PostgreSQL data and API behavior.

**Architecture:** `backend/database` owns the PostgreSQL client, schema definitions, relations, and migrations. Services import this package and keep their existing HTTP boundaries; a dedicated migration command applies migrations before application containers start. No service creates tables on import.

**Tech Stack:** Node.js ESM, PostgreSQL, `drizzle-orm`, `drizzle-kit`, `pg`, Express, Docker Compose, Node test runner.

---

## File map

### Shared database package

- Create `backend/database/package.json`: package scripts and Drizzle dependencies.
- Create `backend/database/drizzle.config.js`: PostgreSQL dialect, schema glob, migration output, and `DATABASE_URL`.
- Create `backend/database/src/client.js`: bounded `pg` pool and Drizzle client.
- Create `backend/database/src/schema/users.js`: users and user sessions tables.
- Create `backend/database/src/schema/chat.js`: conversations and messages tables.
- Create `backend/database/src/schema/agents.js`: agents and agent runs tables.
- Create `backend/database/src/schema/memory.js`: memories and skills tables.
- Create `backend/database/src/schema/index.js`: schema/relation exports.
- Create `backend/database/src/index.js`: public database package exports.
- Create `backend/database/migrations/`: generated and reviewed SQL migrations.
- Create `backend/database/src/schema.test.js`: table/export contract tests.

### Service migrations

- Modify `backend/auth-service/src/db.js`: import shared Drizzle client and remove startup DDL.
- Modify `backend/auth-service/src/routes/auth.routes.js`: replace raw SQL with Drizzle queries and transactions.
- Modify `backend/chat-service/src/db.js`: re-export the shared database package without DDL.
- Modify `backend/chat-service/src/index.js`: replace raw SQL with Drizzle query helpers.
- Modify `backend/agent-service/src/db.js`: re-export shared database package without DDL.
- Modify `backend/agent-service/src/index.js`: replace agent/run SQL with Drizzle and transactions.
- Modify `backend/memory-service/src/db.js`: re-export shared database package without DDL.
- Modify `backend/memory-service/src/memory/router.js`: replace memory SQL with Drizzle.
- Modify `backend/memory-service/src/skill/router.js`: replace skill SQL with Drizzle.
- Modify each service `package.json`: add `@mann/database` workspace/file dependency and remove direct runtime `pg` dependency where no longer imported.
- Modify each service Dockerfile: copy/install the shared database package in the image.

### Migration orchestration

- Create `backend/database/migrate.js`: run Drizzle Kit migration and exit with explicit failure.
- Modify root `docker-compose.yml`: add a non-public `database-migrate` service and make database-backed services depend on it.
- Modify root `.dockerignore`/service `.dockerignore` files if needed so the shared package and migrations are included.

### Tests and docs

- Create service tests for auth, chat, agent, and memory query contracts.
- Modify `README.md`: document database package, migration commands, and Docker startup.
- Modify `.env.example` only if a new non-secret database migration variable is required.

## Task 1: Capture the current database state before changing code

**Files:**
- Create: `backend/database/schema-snapshot.sql`
- Create: `backend/database/src/schema-snapshot.test.js`

- [ ] **Step 1: Export the current PostgreSQL schema**

Run against the configured PostgreSQL database:

```bash
docker exec justpostgres pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > backend/database/schema-snapshot.sql
```

If the container does not expose `DATABASE_URL`, run:

```bash
docker exec justpostgres pg_dump --schema-only --no-owner --no-privileges -U postgres -d postgres > backend/database/schema-snapshot.sql
```

The snapshot must contain current table/index/check definitions and must not contain row data, passwords, tokens, or secrets.

- [ ] **Step 2: Write a failing snapshot contract test**

Assert that the snapshot mentions the existing tables:

```js
import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('database snapshot includes all existing application tables', () => {
  const sql = fs.readFileSync(new URL('../schema-snapshot.sql', import.meta.url), 'utf8')
  for (const table of ['users', 'user_sessions', 'messages', 'agents', 'agent_runs', 'memories', 'skills']) {
    assert.match(sql, new RegExp(`CREATE TABLE[^;]*\\b${table}\\b`, 'is'))
  }
})
```

- [ ] **Step 3: Run the snapshot test**

Run:

```bash
cd backend/database && node --test src/schema-snapshot.test.js
```

Expected: PASS before any migration code is changed.

- [ ] **Step 4: Commit the data-safety baseline**

```bash
git add backend/database/schema-snapshot.sql backend/database/src/schema-snapshot.test.js
git commit -m "test: capture postgres schema before drizzle migration"
```

## Task 2: Create the shared Drizzle package and schema tests

**Files:**
- Create: `backend/database/package.json`
- Create: `backend/database/drizzle.config.js`
- Create: `backend/database/src/client.js`
- Create: `backend/database/src/schema/users.js`
- Create: `backend/database/src/schema/chat.js`
- Create: `backend/database/src/schema/agents.js`
- Create: `backend/database/src/schema/memory.js`
- Create: `backend/database/src/schema/index.js`
- Create: `backend/database/src/index.js`
- Create: `backend/database/src/schema.test.js`

- [ ] **Step 1: Write the failing schema export test**

Use the intended public API:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { users, userSessions, conversations, messages, agents, agentRuns, memories, skills } from './index.js'

test('exports every application table', () => {
  for (const table of [users, userSessions, conversations, messages, agents, agentRuns, memories, skills]) {
    assert.ok(table)
  }
})
```

Run:

```bash
cd backend/database && node --test src/schema.test.js
```

Expected: FAIL because the shared package does not exist yet.

- [ ] **Step 2: Add the database package manifest**

Create:

```json
{
  "name": "@mann/database",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "test": "node --test"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.0",
    "pg": "8.13.3"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0"
  }
}
```

Use the repository's lockfile/package-manager conventions if the installed Drizzle versions resolve differently; keep one compatible version across all services.

- [ ] **Step 3: Implement the Drizzle client and schema**

Use `pg.Pool` with the existing `DATABASE_URL` and pool limits, then wrap it with `drizzle(pool, { schema })`. Define existing column names exactly, including `password_hash`, `created_at`, and `updated_at`. Use `bigint`/`serial` mappings that return the same JavaScript value shapes currently exposed by APIs.

The public entry point must export:

```js
export { db, pool } from './client.js'
export * from './schema/index.js'
export { eq, and, desc, asc, sql } from 'drizzle-orm'
```

- [ ] **Step 4: Run schema tests**

Run:

```bash
cd backend/database && npm install && npm test
```

Expected: schema export tests pass without opening a database connection during module import.

- [ ] **Step 5: Commit the shared package**

```bash
git add backend/database
git commit -m "feat: add shared drizzle database package"
```

## Task 3: Create reviewed Drizzle Kit migrations without data loss

**Files:**
- Modify: `backend/database/drizzle.config.js`
- Create: `backend/database/migrations/0000_baseline.sql`
- Create: `backend/database/migrations/0001_chat_memory_relations.sql`
- Create: `backend/database/migrations/meta/_journal.json`
- Create: `backend/database/migrations/meta/0000_snapshot.json`
- Create: `backend/database/migrations/meta/0001_snapshot.json`
- Create: `backend/database/src/migration.test.js`

- [ ] **Step 1: Configure Drizzle Kit**

Use:

```js
import 'dotenv/config'

export default {
  dialect: 'postgresql',
  schema: './src/schema/**/*.js',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
}
```

- [ ] **Step 2: Generate and inspect the baseline**

Run:

```bash
cd backend/database && npm run generate
```

Inspect the generated SQL. It must not drop or recreate existing tables in a way that destroys rows. If the generated baseline conflicts with the live schema, replace it with a reviewed no-op/baseline journal entry and keep actual changes in the follow-up migration.

- [ ] **Step 3: Write the follow-up migration**

The follow-up migration must use guarded statements for new objects/columns:

```sql
CREATE TABLE IF NOT EXISTS conversations (...);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id BIGINT;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS conversation_id BIGINT;
CREATE INDEX IF NOT EXISTS ...;
```

Backfill legacy rows in a transaction using one fallback conversation per user before adding non-null constraints. Preserve all old row values. Add foreign keys only after the referenced rows exist.

- [ ] **Step 4: Write migration idempotency tests**

The test must run the migration command twice against a disposable database and assert both commands exit `0`; it must also count rows before/after and compare counts for `users`, `messages`, `agent_runs`, `memories`, and `skills`.

- [ ] **Step 5: Apply and verify migrations**

Run:

```bash
cd backend/database
npm run migrate
npm run migrate
```

Expected: both runs exit `0`; the second run reports no pending migrations and row counts remain unchanged.

- [ ] **Step 6: Commit migrations**

```bash
git add backend/database/drizzle.config.js backend/database/migrations backend/database/src/migration.test.js
git commit -m "feat: add idempotent drizzle migrations"
```

## Task 4: Migrate auth service queries and transactions

**Files:**
- Modify: `backend/auth-service/package.json`
- Modify: `backend/auth-service/src/db.js`
- Modify: `backend/auth-service/src/routes/auth.routes.js`
- Create: `backend/auth-service/src/routes/auth.routes.test.js`
- Modify: `backend/auth-service/Dockerfile`

- [ ] **Step 1: Write failing auth query contract tests**

Test signup and login with an injected database object. Assert:

```js
assert.equal(db.insertCalls[0].table, 'users')
assert.equal(db.insertCalls[1].table, 'user_sessions')
assert.equal(await login({ email, password }), expectedUser)
```

Also assert duplicate email, invalid credentials, and password hashing behavior remain unchanged.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
cd backend/auth-service && node --test src/routes/auth.routes.test.js
```

Expected: FAIL because routes still call `pool.query`.

- [ ] **Step 3: Replace auth SQL with Drizzle**

Use `select().from(users).where(eq(users.email, email))`, `insert(users).values(...).returning(...)`, and `insert(userSessions).values(...)`. Wrap user creation and session creation in `db.transaction(async (tx) => ...)`. Preserve response JSON and JWT fields exactly.

- [ ] **Step 4: Remove startup DDL**

Replace `auth-service/src/db.js` with a shared package re-export. It must not call `CREATE TABLE`, `ALTER TABLE`, or await initialization on import.

- [ ] **Step 5: Run auth tests and health check**

Run:

```bash
cd backend/auth-service && node --test
docker compose up -d --build auth-service
curl -sS http://localhost:3001/health
```

Expected: tests pass and health returns the existing auth-service `ok` response.

- [ ] **Step 6: Commit auth migration**

```bash
git add backend/auth-service
git commit -m "feat: migrate auth service to drizzle"
```

## Task 5: Migrate chat service database access

**Files:**
- Modify: `backend/chat-service/package.json`
- Modify: `backend/chat-service/src/db.js`
- Modify: `backend/chat-service/src/index.js`
- Create: `backend/chat-service/src/chat.routes.test.js`
- Modify: `backend/chat-service/Dockerfile`

- [ ] **Step 1: Write failing chat query tests**

Cover ordered user message loading, conversation ownership predicates, conversation create/rename/delete, and message insert. Assert that a foreign conversation returns the existing not-found contract.

- [ ] **Step 2: Implement Drizzle chat queries**

Use `conversations`, `messages`, `eq`, `and`, `asc`, and `desc`. Keep old API response field names (`created_at` or existing gateway mapping) compatible with current frontend consumers. Use transactions where creating a conversation and initial message are coupled.

- [ ] **Step 3: Remove chat startup DDL**

Make `chat-service/src/db.js` re-export `@mann/database` only.

- [ ] **Step 4: Run chat tests and health check**

Run:

```bash
cd backend/chat-service && node --test
docker compose up -d --build chat-service
curl -sS http://localhost:3002/health
```

Expected: all tests pass, no import-time DDL runs, and health remains `ok`.

- [ ] **Step 5: Commit chat migration**

```bash
git add backend/chat-service
git commit -m "feat: migrate chat service to drizzle"
```

## Task 6: Migrate agent service and transactional run persistence

**Files:**
- Modify: `backend/agent-service/package.json`
- Modify: `backend/agent-service/src/db.js`
- Modify: `backend/agent-service/src/index.js`
- Modify: `backend/agent-service/src/orchestrator/agent-orchestrator.js`
- Modify: `backend/agent-service/src/orchestrator/agent-orchestrator.test.js`
- Modify: `backend/agent-service/Dockerfile`

- [ ] **Step 1: Add failing transaction/query assertions**

Extend the existing orchestrator tests to assert that a completed run writes the expected `agent_runs` row and that a failed Groq call persists a failed run. Assert that the transaction callback is called once and the returned shape remains unchanged.

- [ ] **Step 2: Replace agent SQL with Drizzle**

Use Drizzle `insert(agentRuns).values(...).returning(...)` and `db.transaction`. Keep Groq client behavior unchanged. Do not mix `pool.query` and Drizzle for the same operation.

- [ ] **Step 3: Preserve run API contract**

Keep:

```text
POST /runs/:userId
```

and the existing `{ run }` response while the conversation/memory feature is developed separately. Map Drizzle columns back to the existing camelCase response fields.

- [ ] **Step 4: Run agent tests and health check**

Run:

```bash
cd backend/agent-service && npm test
docker compose up -d --build agent-service
curl -sS http://localhost:3004/health
```

Expected: all agent tests pass and the service reports PostgreSQL health.

- [ ] **Step 5: Commit agent migration**

```bash
git add backend/agent-service
git commit -m "feat: migrate agent service to drizzle"
```

## Task 7: Migrate memory and skill service database access

**Files:**
- Modify: `backend/memory-service/package.json`
- Modify: `backend/memory-service/src/db.js`
- Modify: `backend/memory-service/src/memory/router.js`
- Modify: `backend/memory-service/src/skill/router.js`
- Create: `backend/memory-service/src/memory.test.js`
- Create: `backend/memory-service/src/skill.test.js`
- Modify: `backend/memory-service/Dockerfile`

- [ ] **Step 1: Write failing memory/skill query tests**

Test list, upsert, and delete ownership:

```js
assert.equal(await deleteMemory({ userId: 7, memoryId: 10 }), true)
assert.equal(await deleteMemory({ userId: 8, memoryId: 10 }), false)
```

Test that skill list/create/update queries always include `user_id`.

- [ ] **Step 2: Implement Drizzle memory and skill queries**

Use `select`, `insert`, `update`, `delete`, `onConflictDoUpdate`, `eq`, and `and`. Preserve current response fields, types, and status codes.

- [ ] **Step 3: Remove memory startup DDL**

Make `memory-service/src/db.js` re-export the shared package without creating tables.

- [ ] **Step 4: Run memory tests and health check**

Run:

```bash
cd backend/memory-service && node --test
docker compose up -d --build memory-service
curl -sS http://localhost:3003/health
```

Expected: tests pass and the health response remains unchanged.

- [ ] **Step 5: Commit memory migration**

```bash
git add backend/memory-service
git commit -m "feat: migrate memory service to drizzle"
```

## Task 8: Add the migration container and shared package to Docker builds

**Files:**
- Create: `backend/database/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: all database-backed service Dockerfiles
- Modify: relevant `.dockerignore` files

- [ ] **Step 1: Write the migration image command**

The migration image must run:

```dockerfile
CMD ["npm", "run", "migrate"]
```

It must load `DATABASE_URL` from the root `.env`, contain the shared schema/migrations, and expose no host port.

- [ ] **Step 2: Add `database-migrate` to Compose**

Configure:

```yaml
database-migrate:
  build:
    context: ./backend/database
  env_file:
    - .env
  depends_on:
    - justpostgres
```

Make auth, chat, agent, and memory services depend on the migration completion in the existing Compose topology. Do not create a second PostgreSQL container.

- [ ] **Step 3: Ensure service images can import `@mann/database`**

Use a consistent package copy/install strategy. Verify each image contains `backend/database/src` and its migrations at the path resolved by the service package import.

- [ ] **Step 4: Run Docker validation**

Run:

```bash
docker compose config -q
docker compose run --rm database-migrate
docker compose up -d --build
docker compose ps
```

Expected: migration exits `0`, all application services are running, and no service logs show missing package or missing migration files.

- [ ] **Step 5: Commit Docker migration wiring**

```bash
git add backend/database/Dockerfile docker-compose.yml backend/*/Dockerfile backend/*/.dockerignore
git commit -m "feat: run drizzle migrations before services"
```

## Task 9: Update documentation and verify all direct SQL is removed

**Files:**
- Modify: `README.md`
- Modify: `.env.example` only if required
- Create: `backend/database/src/no-direct-pg-query.test.js`

- [ ] **Step 1: Add a static direct-query guard**

Scan database-backed runtime source files and fail if application code contains `pool.query(` or `db.query(` outside the shared client/migration implementation.

- [ ] **Step 2: Run the guard**

Run:

```bash
cd backend/database && node --test src/no-direct-pg-query.test.js
```

Expected: no direct service SQL calls remain.

- [ ] **Step 3: Document operations**

Add:

```bash
cd backend/database
npm run generate
npm run migrate
```

Document that migrations run before services in Docker and that `.env` must remain local/ignored.

- [ ] **Step 4: Commit documentation and guard**

```bash
git add README.md backend/database/src/no-direct-pg-query.test.js
git commit -m "docs: document drizzle migrations"
```

## Task 10: Full verification and persistence check

**Files:**
- No new source files; inspect all changed files and Docker output.

- [ ] **Step 1: Run every backend test suite**

Run:

```bash
cd backend/database && npm test
cd ../auth-service && npm test
cd ../chat-service && npm test
cd ../agent-service && npm test
cd ../memory-service && npm test
```

Expected: all suites pass with zero failures.

- [ ] **Step 2: Run migration twice and compare row counts**

Run:

```bash
docker compose run --rm database-migrate
docker compose run --rm database-migrate
```

Query counts for `users`, `user_sessions`, `conversations`, `messages`, `agents`, `agent_runs`, `memories`, and `skills` before and after; counts must remain stable.

- [ ] **Step 3: Run application validation**

Run:

```bash
docker compose up -d --build
docker compose ps
docker compose config -q
cd frontend && npm run build && npm run lint
cd .. && git diff --check
```

Expected: all containers are healthy/running, frontend build/lint pass, and diff check is clean.

- [ ] **Step 4: Perform API smoke tests**

Verify:

```text
GET /health on auth, chat, agent, and memory → 200
Unauthenticated gateway request → 401
Authenticated signup/login → existing response shape
Authenticated agent run → persisted run
Memory/skill operations → existing response/status behavior
```

- [ ] **Step 5: Review the final diff**

Confirm no `.env`, credentials, generated frontend bundles, database dumps with row data, or unrelated pre-existing modifications are staged.

- [ ] **Step 6: Commit verification metadata only if needed**

Do not create a “verification” commit unless README or test files changed in this task. Leave runtime output and temporary logs untracked/cleaned.

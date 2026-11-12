# Shared Drizzle ORM Migration Design

## Goal

Migrate all PostgreSQL-backed Mann services from direct `pg` SQL queries to a
shared Drizzle ORM database package while preserving existing data and using
committed Drizzle Kit migrations.

## Scope

### Included

- Shared `backend/database` package used by auth, chat, agent, and memory
  services.
- Drizzle schema definitions for:
  `users`, `user_sessions`, `conversations`, `messages`, `agents`,
  `agent_runs`, `memories`, and `skills`.
- Drizzle PostgreSQL client and typed query helpers.
- Drizzle Kit configuration and committed migration files.
- Baseline migration compatible with the existing PostgreSQL tables.
- Service imports and queries migrated from `pool.query`.
- A one-time Docker migration command before application services start.
- Tests for schema/query behavior and migration idempotency.
- Documentation for generating and applying migrations.

### Excluded

- Changing business behavior unrelated to database access.
- Dropping existing columns or deleting existing rows.
- Replacing PostgreSQL with another database.
- Automatic schema push on application startup.
- Introducing a second ORM or query builder.

## Architecture

```text
backend/database
  ├── src/schema/*.js
  ├── src/client.js
  ├── src/queries/*.js
  ├── drizzle.config.js
  └── migrations/
          ↓
      PostgreSQL
          ↑
  auth / chat / agent / memory services
```

The shared package owns schema and migrations. Each service may own
service-specific query helpers, but all helpers import table definitions and
the database client from the shared package. Services must not create tables
on startup.

## Package layout

```text
backend/database/
├── package.json
├── drizzle.config.js
├── src/
│   ├── client.js
│   ├── schema/
│   │   ├── users.js
│   │   ├── chat.js
│   │   ├── agents.js
│   │   └── memory.js
│   └── index.js
└── migrations/
```

The package uses `drizzle-orm`, `drizzle-kit`, and `pg`. The client reads the
existing `DATABASE_URL`; credentials remain in the environment and are never
stored in schema or migration files.

## Schema ownership and relations

- `users` is the parent of sessions, conversations, agent runs, and memories.
- `conversations` belongs to one user.
- `messages` belongs to a user and conversation; an assistant message may
  reference an `agent_run`.
- `agent_runs` belongs to a user and may reference a conversation during the
  first migration phase so legacy rows can be backfilled safely.
- `memories` belongs to a user and may reference a conversation and source
  message.
- `agents` and `skills` remain user-scoped.

Existing table names, column names, enum/check semantics, and timestamp
behavior remain compatible with current data. New relations use foreign keys
with the deletion behavior defined by the approved chat-memory design.

## Migration strategy

1. Inspect the live schema and record existing columns/indexes before editing
   service code.
2. Add Drizzle schema definitions matching current tables and required
   conversation/memory additions.
3. Generate a baseline migration that does not recreate or delete existing
   tables.
4. Add explicit follow-up migration statements for new columns, indexes,
   foreign keys, and safe legacy backfills.
5. Run migrations once against the PostgreSQL instance.
6. Remove startup `CREATE TABLE`/`ALTER TABLE` calls from service database
   modules.
7. Start services using the migrated shared client.

The migration command must be idempotent. Running it twice must produce no
additional changes and must not modify existing user rows, passwords, tokens,
messages, runs, memories, or skills.

## Runtime behavior

The shared client creates a bounded PostgreSQL connection pool. Services import
the client and schema through the package entry point:

```js
import { db, users, eq } from '@mann/database'
```

Queries use Drizzle expressions and transactions. User-provided values must
never be interpolated into SQL strings. Transactions use the shared client
transaction API for signup/session creation, agent run/message persistence,
and any multi-table write that currently requires consistency.

## Docker flow

Add a dedicated migration command/service that:

1. Loads the same root `.env` and `DATABASE_URL`.
2. Runs `drizzle-kit migrate`.
3. Exits non-zero on migration failure.

Application services depend on the migration step completing. The migration
service must not expose a public port. Existing service ports and runtime
health endpoints remain unchanged.

## Error behavior

- Database errors are logged with service context and returned through the
  existing JSON error contract.
- Invalid input continues to return `400`.
- Ownership failures continue to return `404` where the existing API contract
  requires non-disclosure.
- Migration failures stop startup rather than silently falling back to
  startup-created tables.
- No broad catch may convert a database failure into fake success data.

## Testing

### Database package

- Schema exports contain all required tables and relations.
- Drizzle client reads `DATABASE_URL`.
- Migration command succeeds on a clean database.
- Migration command is idempotent on an already migrated database.
- Existing rows remain readable after migration.

### Services

- Auth signup/login/session queries work through Drizzle.
- Chat conversation/message queries preserve user ownership.
- Agent run persistence works inside a transaction.
- Memory and skill queries preserve existing behavior and ownership.
- No service database module executes `CREATE TABLE` on import.

### Validation commands

```bash
docker compose run --rm database-migrate
docker compose up -d --build
docker compose ps
cd backend/database && npm test
cd ../auth-service && npm test
cd ../chat-service && npm test
cd ../agent-service && npm test
cd ../memory-service && npm test
cd ../../frontend && npm run build && npm run lint
```

## Acceptance criteria

1. All four database-backed services use the shared Drizzle package.
2. No runtime service uses direct `pool.query` for application queries.
3. Committed Drizzle Kit migrations apply successfully and idempotently.
4. Existing PostgreSQL data remains available after migration.
5. Docker starts migrations before dependent services.
6. Auth, chat, agent runs, memories, and skills continue to work.
7. Existing frontend behavior and API contracts remain compatible.
8. Tests, frontend build, lint, and Docker validation pass.

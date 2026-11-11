# Chat Memory and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static frontend chat data with persistent user-scoped conversations, use the latest five messages plus safe long-term memories as agent context, and add working Chat, Agents, Memory, and Tools navigation.

**Architecture:** Keep the API Gateway as the JWT boundary. Extend the Chat Service with conversation/message CRUD, extend the Agent Service to persist conversation-linked runs and messages while calling Groq with a bounded context, and expose long-term memory CRUD through the existing Memory Service. The frontend loads all state through authenticated gateway APIs and never receives service credentials.

**Tech Stack:** Node.js, Express, PostgreSQL, `pg`, Groq Chat Completions, React 19, React Router 7, TypeScript, Vite, `react-markdown`, `remark-gfm`, Node test runner.

---

## File map

### Backend files

- Modify `backend/chat-service/src/db.js`: create the conversations table and migrate the existing messages table to conversation ownership.
- Modify `backend/chat-service/src/index.js`: add conversation and message endpoints with user ownership checks.
- Create `backend/chat-service/src/conversations.test.js`: verify idempotent schema/query contracts without contacting external services.
- Modify `backend/api-gateway/src/routes/chat.routes.js`: forward conversation CRUD and message requests.
- Modify `backend/api-gateway/src/routes/agent.routes.js`: accept `conversationId` on authenticated agent runs.
- Modify `backend/agent-service/src/db.js`: add `conversation_id` to `agent_runs` and indexes/constraints needed by the run flow.
- Modify `backend/agent-service/src/orchestrator/agent-orchestrator.js`: load five messages and long-term memories, call Groq with context, persist user/assistant messages and the run, and invoke safe memory extraction.
- Modify `backend/agent-service/src/index.js`: wire database-backed context, message persistence, and memory extraction into the orchestrator and validate request payloads.
- Create `backend/agent-service/src/orchestrator/agent-context.js`: query and format exactly the latest five messages plus a bounded long-term memory set.
- Create `backend/agent-service/src/orchestrator/memory-extractor.js`: parse, validate, deduplicate, and filter structured model memory output.
- Create `backend/agent-service/src/orchestrator/agent-context.test.js`: test the five-message bound and prompt context formatting.
- Create `backend/agent-service/src/orchestrator/memory-extractor.test.js`: test valid extraction, malformed output, duplicates, and secret filtering.
- Modify `backend/memory-service/src/db.js`: add the user-scoped memory schema or migration.
- Modify `backend/memory-service/src/memory/router.js` and its data helper files: implement long-term memory list/delete and ownership filtering.
- Modify `backend/api-gateway/src/routes/memory.routes.js`: expose authenticated memory list/delete forwarding.

### Frontend files

- Modify `frontend/src/pages/Chat.tsx`: replace `INITIAL` conversations with API-loaded state, create/load/rename/delete conversations, send `conversationId`, and render persisted messages.
- Create `frontend/src/pages/Memory.tsx`: load long-term memories, show loading/error/empty states, and delete a memory.
- Create `frontend/src/pages/Agents.tsx`: show the existing agent-management surface or an explicit unavailable state without fake agent data.
- Create `frontend/src/pages/Tools.tsx`: show the existing tools surface or an explicit unavailable state without fake tool results.
- Modify `frontend/src/App.tsx`: add protected routes for `/dashboard`, `/agents`, `/memory`, and `/tools`, preserving current login/signup routes.
- Modify `frontend/src/components/ProtectedRoute.tsx` only if route protection needs a shared loading state.
- Modify `frontend/src/App.css`: style history rename/delete controls, navigation states, memory cards, and explicit error/loading states.
- Create `frontend/src/lib/api.ts`: centralize authenticated JSON requests and consistent 401/error handling for Chat and Memory pages.

### Documentation and validation

- Modify `README.md`: document persistent conversations, five-message short-term context, long-term memory controls, and new routes.
- Modify `.env.example` only if a new non-secret configuration value is required; do not add credentials.

## Task 1: Add failing backend schema and conversation tests

**Files:**
- Create: `backend/chat-service/src/conversations.test.js`
- Create: `backend/memory-service/src/memory.test.js`
- Modify: `backend/agent-service/src/orchestrator/agent-orchestrator.test.js`

- [ ] **Step 1: Write the failing conversation contract tests**

Test that the intended service functions/HTTP handlers support:

```js
assert.deepEqual(conversationListQuery, {
  text: 'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
  values: [7],
})
```

Test that a message query includes both `conversation_id = $1` and `user_id = $2`, and that a missing/foreign conversation returns a not-found result.

- [ ] **Step 2: Write the failing memory ownership tests**

Cover:

```js
assert.equal(await deleteMemory({ memoryId: 10, userId: 7 }), true)
assert.equal(await deleteMemory({ memoryId: 10, userId: 8 }), false)
```

The implementation must use `DELETE ... WHERE id = $1 AND user_id = $2`, never delete by ID alone.

- [ ] **Step 3: Extend the orchestrator tests for conversation context**

Add a test that calls:

```js
await orchestrator.run({
  userId: 7,
  conversationId: 11,
  request: 'continue',
})
```

and expects the executor to receive a context containing only the latest five messages and the requested conversation ID.

- [ ] **Step 4: Run the focused tests and verify the expected failures**

Run:

```bash
cd backend/chat-service && node --test src/conversations.test.js
cd ../memory-service && node --test src/memory.test.js
cd ../agent-service && node --test src/orchestrator/agent-orchestrator.test.js
```

Expected result: failures must identify missing conversation/memory/context behavior, not syntax or test setup errors.

## Task 2: Implement idempotent PostgreSQL conversation and memory schema

**Files:**
- Modify: `backend/chat-service/src/db.js`
- Modify: `backend/agent-service/src/db.js`
- Modify: `backend/memory-service/src/db.js`

- [ ] **Step 1: Create `conversations` before dependent tables**

Add an idempotent migration:

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);
```

- [ ] **Step 2: Migrate existing `messages` safely**

Add `conversation_id` and `agent_run_id` columns if absent, create a default conversation per existing `user_id`, backfill existing messages into that conversation, then enforce the conversation foreign key and add:

```sql
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at ASC);
```

Keep the existing `user_id` column during this slice so old rows and ownership checks remain compatible.

- [ ] **Step 3: Extend `agent_runs`**

Add nullable `conversation_id` first for existing rows, create a fallback conversation for legacy runs, backfill it, then make the column non-null and add the foreign key and `(user_id, conversation_id, created_at DESC)` index.

- [ ] **Step 4: Add the memory schema**

Create or migrate the memory table with `memory_type`, `conversation_id`, `importance`, `source_message_id`, timestamps, ownership foreign key, valid type/importance constraints, and user/type indexes. Preserve existing memory/skill tables.

- [ ] **Step 5: Run service startup and schema checks**

Run:

```bash
docker compose up -d --build chat-service agent-service memory-service
docker compose logs --tail=100 chat-service agent-service memory-service
```

Expected result: each service reports its DB tables are ready and no migration error appears on a second restart.

## Task 3: Implement Chat Service and Gateway conversation APIs

**Files:**
- Modify: `backend/chat-service/src/index.js`
- Modify: `backend/api-gateway/src/routes/chat.routes.js`
- Test: `backend/chat-service/src/conversations.test.js`

- [ ] **Step 1: Implement conversation endpoints**

Implement:

```text
GET    /conversations/:userId
POST   /conversations/:userId
PATCH  /conversations/:userId/:conversationId
DELETE /conversations/:userId/:conversationId
GET    /conversations/:userId/:conversationId/messages
```

Every query must include the authenticated gateway-provided `userId`. Validate titles as non-empty strings with a maximum length of 120 characters and return `400` for invalid input, `404` for missing/foreign conversations, and `500` for database failures.

- [ ] **Step 2: Preserve existing message compatibility**

Keep old `/messages/:userId` endpoints working during migration, but make new frontend calls use conversation-scoped endpoints. New messages must write both `user_id` and `conversation_id`.

- [ ] **Step 3: Forward routes through the gateway**

Add gateway routes:

```text
GET    /api/chat/conversations
POST   /api/chat/conversations
PATCH  /api/chat/conversations/:conversationId
DELETE /api/chat/conversations/:conversationId
GET    /api/chat/conversations/:conversationId/messages
```

Use the existing `authenticateToken` middleware and forward `req.user.id`; never accept a browser-supplied user ID.

- [ ] **Step 4: Run focused backend tests**

Run:

```bash
cd backend/chat-service && node --test src/conversations.test.js
```

Expected result: conversation creation, ownership, rename, delete, ordered message loading, and invalid input tests pass.

## Task 4: Add memory list/delete APIs and safe extraction helper

**Files:**
- Create: `backend/agent-service/src/orchestrator/memory-extractor.js`
- Create: `backend/agent-service/src/orchestrator/memory-extractor.test.js`
- Modify: `backend/memory-service/src/memory/router.js`
- Modify: `backend/api-gateway/src/routes/memory.routes.js`

- [ ] **Step 1: Write extraction tests first**

Cover the exact helper contract:

```js
extractLongTermMemories('{"memories":[{"content":"User prefers Hindi","importance":4}]}')
// => [{ content: 'User prefers Hindi', importance: 4 }]
```

Also assert malformed JSON returns an empty list, duplicate content is collapsed, entries over the content limit are discarded, and strings containing `password`, `api key`, `access token`, or secret-like values are discarded.

- [ ] **Step 2: Implement strict extraction**

Parse JSON, require an array named `memories`, trim content, clamp only accepted integer importance values from 1 to 5, cap the number of memories per request, deduplicate case-insensitively, and return no model-generated free-form text.

- [ ] **Step 3: Implement memory endpoints**

Expose:

```text
GET    /memory/:userId?type=long_term
DELETE /memory/:userId/:memoryId
```

List only the authenticated user’s long-term memories. Delete with both memory ID and user ID and return `404` for another user’s record.

- [ ] **Step 4: Forward authenticated memory routes**

Add:

```text
GET    /api/memory
DELETE /api/memory/:memoryId
```

Use the existing gateway authentication and normalize service errors to JSON.

- [ ] **Step 5: Run extraction and memory tests**

Run:

```bash
cd backend/agent-service && node --test src/orchestrator/memory-extractor.test.js
cd ../memory-service && node --test src/memory.test.js
```

Expected result: all validation and ownership tests pass.

## Task 5: Make the agent use five-message context and persist messages

**Files:**
- Create: `backend/agent-service/src/orchestrator/agent-context.js`
- Create: `backend/agent-service/src/orchestrator/agent-context.test.js`
- Modify: `backend/agent-service/src/orchestrator/agent-orchestrator.js`
- Modify: `backend/agent-service/src/llm/groq-client.js`
- Modify: `backend/agent-service/src/index.js`
- Modify: `backend/api-gateway/src/routes/agent.routes.js`

- [ ] **Step 1: Write the context-bound test**

Given seven stored messages, assert that the context query requests the latest five and the executor receives them in chronological order. Assert that long-term memories are bounded and included separately from message context.

- [ ] **Step 2: Implement context loading**

Create `loadAgentContext({ db, userId, conversationId, messageLimit = 5 })`. First verify conversation ownership, query with `ORDER BY created_at DESC LIMIT 5`, reverse the result for prompt order, and load a fixed maximum number of long-term memories for that user.

- [ ] **Step 3: Extend Groq client input**

Keep the public client safe and deterministic by accepting:

```js
complete(request, { messages, memories } = {})
```

Construct a system/context message from bounded data, then send the user request. Do not send API keys or raw database objects.

- [ ] **Step 4: Persist a complete run transactionally**

The orchestrator must:

1. Validate `userId`, `conversationId`, and request.
2. Verify conversation ownership.
3. Load five messages and long-term memories.
4. Insert the user message.
5. Execute Groq.
6. Insert a completed/failed `agent_runs` row.
7. Insert the assistant message when output exists.
8. Update `conversations.updated_at`.
9. Run memory extraction and upsert safe memories without failing the chat response.

Use a PostgreSQL transaction for steps 4–8. If Groq fails, persist the failed run and return the existing `500` contract.

- [ ] **Step 5: Update request/response contracts**

Require:

```json
{
  "conversationId": "123",
  "request": "..."
}
```

Return the run plus the persisted user and assistant messages. Return `400` for invalid IDs/request and `404` for foreign conversations.

- [ ] **Step 6: Run agent tests and service checks**

Run:

```bash
cd backend/agent-service && node --test
docker compose up -d --build agent-service api-gateway
curl -sS http://localhost:3004/health
curl -sS http://localhost:5000/api/agents/runs -X POST -H 'Content-Type: application/json' -d '{"request":"without token"}'
```

Expected result: agent tests pass, health is `ok`, and the unauthenticated gateway request returns `401`.

## Task 6: Add shared frontend API client and persistent Chat page

**Files:**
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/src/pages/Chat.tsx`
- Modify: `frontend/src/App.css`

- [ ] **Step 1: Add API client tests or a pure request-contract test**

Verify that requests use `localStorage.getItem('token')`, set `Authorization: Bearer ...`, parse JSON errors, and throw on non-2xx responses. The client must not silently return fake data.

- [ ] **Step 2: Implement typed API helpers**

Define typed helpers for:

```ts
listConversations()
createConversation(title?: string)
loadMessages(conversationId: number)
renameConversation(conversationId: number, title: string)
deleteConversation(conversationId: number)
runAgent(conversationId: number, request: string)
listMemories()
deleteMemory(memoryId: number)
```

- [ ] **Step 3: Replace static Chat state**

Remove `INITIAL` as runtime conversation data. On mount, load conversations, select the newest one, and load its messages. Show explicit loading, empty, unauthorized, network, and server-error states.

- [ ] **Step 4: Implement new chat and sending**

New Chat creates a server conversation before sending. Sending must call `runAgent(activeId, request)`, append the returned persisted messages, clear input only after accepted submission, and keep the existing Markdown renderer and typing state.

- [ ] **Step 5: Implement rename and delete**

Add history-item controls with confirmation for delete. Rename through the API and update local state only after success. After deletion, select the newest remaining conversation or show the empty state.

- [ ] **Step 6: Run frontend validation**

Run:

```bash
cd frontend && npm run build && npm run lint
```

Expected result: TypeScript build and ESLint pass with no warnings treated as errors.

## Task 7: Add Memory page and navigation routes

**Files:**
- Create: `frontend/src/pages/Memory.tsx`
- Create: `frontend/src/pages/Agents.tsx`
- Create: `frontend/src/pages/Tools.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/Chat.tsx`
- Modify: `frontend/src/App.css`

- [ ] **Step 1: Implement Memory page states**

Render loading, empty, error, and populated states. Each long-term memory card must show content, importance, date, and a delete button. Delete the record through the API and remove it from local state only after a successful response.

- [ ] **Step 2: Add protected navigation**

Add protected routes:

```text
/dashboard -> Chat
/agents    -> Agents
/memory    -> Memory
/tools     -> Tools
```

Update the existing sidebar links to use router navigation and active styles. Agents and Tools must show an explicit unavailable state until their APIs are implemented; do not create fake successful data.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd frontend && npm run build && npm run lint
```

Expected result: routes compile and all navigation components type-check.

## Task 8: Update documentation and perform end-to-end verification

**Files:**
- Modify: `README.md`
- Modify: `docker-compose.yml` only if service build/env wiring requires it

- [ ] **Step 1: Document the user-visible flow**

Document authenticated conversation APIs, five-message short-term context, automatic safe long-term memory extraction, memory deletion, and frontend routes. Do not document real credentials or secret values.

- [ ] **Step 2: Rebuild the complete Docker stack**

Run:

```bash
docker compose up -d --build
docker compose ps
docker compose config -q
```

Expected result: all services are running and Compose validation exits successfully.

- [ ] **Step 3: Verify authenticated end-to-end behavior**

Using a logged-in browser session:

1. Open `/dashboard` and create a new chat.
2. Send a prompt and verify the request includes `conversationId`.
3. Refresh and verify the conversation and messages remain.
4. Rename the conversation and refresh again.
5. Delete it and verify it disappears.
6. Open `/memory`, verify extracted safe memories, and delete one.
7. Open Agents and Tools navigation and verify neither route breaks the app.

- [ ] **Step 4: Verify isolation and error paths**

Confirm an unauthenticated request returns `401`, a foreign conversation returns `404`, a foreign memory delete returns `404`, and Groq/memory extraction errors are shown or logged explicitly without fake success data.

- [ ] **Step 5: Run the complete validation set**

Run:

```bash
cd backend/agent-service && node --test
cd ../chat-service && node --test
cd ../memory-service && node --test
cd ../../frontend && npm run build && npm run lint
cd .. && git diff --check
```

Expected result: all tests pass, the frontend build/lint pass, and the diff check is clean.

## Commit sequence

Create focused commits after each green task:

```text
test: define conversation and memory contracts
feat: add persistent conversation and memory schema
feat: add conversation and memory APIs
feat: persist agent context and messages
feat: load persistent chat history in frontend
feat: add memory page and navigation
docs: document persistent chat memory flow
```

Do not include `.env`, credentials, Docker volumes, generated bundles, or unrelated pre-existing worktree changes in these commits.

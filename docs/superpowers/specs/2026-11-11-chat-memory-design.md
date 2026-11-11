# Chat Memory and Navigation Design

## Goal

Make the frontend use persistent, user-specific conversations and add two
memory layers to the agent:

- Short-term memory: the latest five messages from the active conversation.
- Long-term memory: automatically extracted stable facts and preferences, with
  frontend controls to view and delete them.

The implementation must preserve authenticated access and must never expose
provider credentials to the frontend.

## Scope

### Included

- Persistent conversations and messages linked to authenticated users.
- Agent runs linked to a conversation.
- Short-term context limited to the latest five messages.
- Automatic long-term memory extraction for important, non-sensitive facts.
- Memory listing and deletion from the frontend.
- Conversation creation, loading, renaming, and deletion.
- Frontend navigation for Chat, Agents, Memory, and Tools.
- API, service, and frontend tests for the new behavior.

### Excluded from this slice

- Vector embeddings or semantic search.
- Background queues or asynchronous memory workers.
- Tool execution from the agent.
- S3-backed conversation attachments.
- Cross-user memory sharing.
- Saving credentials, API keys, passwords, or other secrets as memory.

## Architecture

```text
Authenticated Frontend
        |
        v
    API Gateway
      /     \
     v       v
Chat Service  Agent Service ---> Groq
     |             |
     v             v
 PostgreSQL <--- Memory Service
```

The API Gateway remains the authentication boundary. Services receive the
authenticated user ID from the gateway and must scope every read, update, and
delete operation to that user.

## Data model

### Existing users

The existing `users` table remains the source of authenticated user identity.

### conversations

```text
id          BIGSERIAL PRIMARY KEY
user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
title       TEXT NOT NULL
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Index:

```text
(user_id, updated_at DESC)
```

### messages

Messages belong to a conversation and are retained as the complete chat
history.

```text
id               BIGSERIAL PRIMARY KEY
conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
agent_run_id     BIGINT NULL
role             TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system'))
content          TEXT NOT NULL
created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexes:

```text
(conversation_id, created_at ASC)
(user_id, created_at DESC)
```

`agent_run_id` is nullable because system and user messages do not always
originate from an agent run. A foreign key to `agent_runs` is added only after
the migration order guarantees that table exists.

### agent_runs

The existing table is extended with:

```text
conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
```

The run stores the request and generated output for observability. The
corresponding user and assistant messages reference the same conversation and
assistant messages reference the completed run.

### memories

The existing memory service table is extended or migrated to support:

```text
id                    BIGSERIAL PRIMARY KEY
user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
conversation_id       BIGINT NULL REFERENCES conversations(id) ON DELETE SET NULL
memory_type           TEXT NOT NULL CHECK (memory_type IN ('short_term', 'long_term'))
content               TEXT NOT NULL
importance            SMALLINT NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 5)
source_message_id     BIGINT NULL
created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
```

Short-term memory is conversation-scoped and may be refreshed from the latest
five messages. Long-term memory is user-scoped and can optionally retain the
conversation and source message that produced it.

Indexes:

```text
(user_id, memory_type, updated_at DESC)
(conversation_id, memory_type, updated_at DESC)
```

## Agent request flow

1. The frontend sends an authenticated request with `conversationId` and
   `request`.
2. The gateway authenticates the JWT and forwards the authenticated user ID.
3. The agent service verifies that the conversation belongs to the user.
4. The service loads the latest five messages in chronological order.
5. The service loads the user's long-term memories, excluding deleted records.
6. The service sends the request plus bounded context to Groq.
7. The service persists the agent run, user message, and assistant message.
8. The service asks the memory extractor to identify stable, useful facts.
9. Only safe, non-sensitive extracted facts are upserted as long-term memories.
10. The response returns the run and newly created messages.

The latest five messages are a strict input bound. Long-term memories must
also have a bounded count and content length so the prompt cannot grow
unboundedly.

## Memory extraction rules

The extractor must return structured data, not free-form text:

```json
{
  "memories": [
    {
      "content": "User prefers explanations in Hindi.",
      "importance": 4
    }
  ]
}
```

The service validates the result before persistence. It must reject or discard
entries containing passwords, API keys, access tokens, secret values, or
instructions to retain secrets. Duplicate or equivalent memories should be
updated rather than inserted repeatedly.

Failures in memory extraction must not fail an otherwise successful chat
response. They must be logged explicitly and returned only through service
observability, not as a fabricated memory result.

## API contract

### Conversations

```text
GET    /api/chat/conversations
POST   /api/chat/conversations
GET    /api/chat/conversations/:conversationId/messages
PATCH  /api/chat/conversations/:conversationId
DELETE /api/chat/conversations/:conversationId
```

All endpoints require JWT authentication and enforce ownership.

### Agent runs

```text
POST /api/agents/runs
```

Request:

```json
{
  "conversationId": "123",
  "request": "Explain Docker in simple words"
}
```

Response:

```json
{
  "run": {
    "id": "456",
    "conversationId": "123",
    "status": "completed",
    "output": "..."
  },
  "messages": [
    {
      "id": "789",
      "role": "user",
      "content": "Explain Docker in simple words"
    },
    {
      "id": "790",
      "role": "assistant",
      "content": "..."
    }
  ]
}
```

### Memories

```text
GET    /api/memory
DELETE /api/memory/:memoryId
```

Only long-term memories are shown and deletable from the first frontend
version. The delete endpoint must return `404` when the memory does not belong
to the authenticated user, without revealing whether another user's record
exists.

## Frontend behavior

- On dashboard load, fetch the authenticated user's conversations.
- Select the most recently updated conversation when one exists.
- Fetch messages when a conversation is selected.
- New Chat creates a conversation before the first agent request.
- The chat request sends the active conversation ID.
- The returned persisted messages update the active conversation state.
- Rename updates the title through the API and refreshes the history item.
- Delete removes the conversation and selects the next available conversation,
  or shows the empty state.
- Memory navigation loads long-term memories and provides delete controls.
- Agents and Tools navigation routes remain available; their existing pages or
  placeholders must not break the chat flow.
- Loading, unauthorized, network, empty, and server-error states are explicit.

## Error handling and security

- Never accept `user_id` from the browser as an authority.
- Validate conversation IDs, titles, message text, and memory IDs at service
  boundaries.
- Return consistent JSON errors with appropriate HTTP status codes.
- Do not silently fall back to static conversations after an API failure.
- Do not send the Groq API key or database credentials to the frontend.
- Treat memory extraction output as untrusted model output and validate it
  before database writes.

## Testing strategy

### Backend

- Migration creates all tables and indexes idempotently.
- Conversation CRUD enforces user ownership.
- Message reads are ordered and scoped to the conversation owner.
- Agent context contains exactly the latest five messages.
- Agent runs and messages persist under the requested conversation.
- Long-term memory extraction validates structure and filters secrets.
- Memory list and delete operations enforce ownership.
- Memory extraction failure does not fail a successful agent response.

### Frontend

- Conversation list and messages load from the API.
- New chat creates and selects a conversation.
- Sending includes `conversationId` and renders persisted response messages.
- Rename and delete update the visible history.
- Memory page lists and deletes memories.
- Unauthorized and server errors are displayed explicitly.
- Production build and lint pass.

## Acceptance criteria

1. A logged-in user can create a chat, refresh the page, and see the same chat
   and messages.
2. A second user cannot read, rename, delete, or send messages to the first
   user's conversation or memories.
3. Every agent request uses at most the latest five conversation messages as
   short-term context.
4. Important safe preferences can appear in long-term memory and can be
   deleted from the frontend.
5. Chat, Agents, Memory, and Tools navigation works without breaking existing
   routes.
6. Backend tests, frontend build, frontend lint, and Docker validation pass.

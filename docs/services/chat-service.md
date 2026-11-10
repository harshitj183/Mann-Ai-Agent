# Chat Service

**Port:** `3002`
**Path:** `backend/chat-service/`
**Role:** Chat messages store aur retrieve karna

---

## Folder Structure

```
chat-service/
├── src/
│   ├── index.js    ← Server + all routes
│   └── db.js       ← PostgreSQL pool + table init
├── .env            ← DATABASE_URL, PORT
└── package.json
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres.dush3xg41u7h:***@localhost:5433/postgres
PORT=3002
```

---

## API Endpoints

### `GET /messages/:userId`
Get all messages for a user, sorted by time.

```json
// Response 200
{
  "messages": [
    { "id": 1, "role": "user", "content": "Hello!", "created_at": "2026-11-09T..." },
    { "id": 2, "role": "assistant", "content": "Hi there!", "created_at": "2026-11-09T..." }
  ]
}
```

### `POST /messages/:userId`
Save a new message.

```json
// Request
{ "role": "user", "content": "What is an LLM?" }

// Response 201
{ "id": 3, "role": "user", "content": "What is an LLM?" }
```

---

## Database Table

```sql
messages (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  role       TEXT CHECK(role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

---

## Dependencies

```json
{
  "pg": "8.13.3",
  "dotenv": "16.4.7",
  "express": "^4.21.0",
  "cors": "^2.8.5"
}
```

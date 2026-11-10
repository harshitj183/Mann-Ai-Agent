# Agent Service

**Port:** `3004`
**Path:** `backend/agent-service/`
**Role:** AI Agents create karna, manage karna, status track karna

---

## Folder Structure

```
agent-service/
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
PORT=3004
```

---

## API Endpoints

### `GET /agents/:userId`
Ek user ke saare agents.

```json
// Response 200
{
  "agents": [
    {
      "id": 1,
      "user_id": 1,
      "name": "Mann Agent",
      "description": "Main AI agent",
      "system_prompt": "You are a helpful assistant",
      "status": "idle",
      "created_at": "2026-11-09T..."
    }
  ]
}
```

### `POST /agents/:userId`
Naya agent banao.

```json
// Request
{
  "name": "Research Agent",
  "description": "Does research tasks",
  "system_prompt": "You are a research expert..."
}

// Response 201
{ "id": 2, "name": "Research Agent", "description": "...", "system_prompt": "...", "status": "idle" }
```

### `PATCH /agents/:userId/:agentId/status`
Agent ka status change karo.

```json
// Request
{ "status": "running" }   // "idle" | "running" | "paused"

// Response 200
{ "message": "Status updated", "status": "running" }
```

---

## Database Table

```sql
agents (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  system_prompt TEXT,
  status        TEXT DEFAULT 'idle' CHECK(status IN ('idle','running','paused')),
  created_at    TIMESTAMPTZ DEFAULT now()
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

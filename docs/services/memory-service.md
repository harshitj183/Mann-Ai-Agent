# Memory Service

**Port:** `3003`
**Path:** `backend/memory-service/`
**Role:** User ki memories (key-value) aur skills (code snippets) store karna

---

## Folder Structure

```
memory-service/
├── src/
│   ├── index.js          ← Server start, routes mount
│   ├── db.js             ← PostgreSQL pool + table init
│   ├── memory/
│   │   └── router.js     ← /memory/:userId routes
│   └── skill/
│       └── router.js     ← /skill/:userId routes
├── .env                  ← DATABASE_URL, PORT
└── package.json
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres.dush3xg41u7h:***@localhost:5433/postgres
PORT=3003
```

---

## Sub-Services

### Memory Routes — `/memory/:userId`

| Method | Path                    | Kaam                          |
|--------|-------------------------|-------------------------------|
| GET    | /memory/:userId         | Saari memories fetch karo     |
| POST   | /memory/:userId         | Memory save ya update karo    |
| DELETE | /memory/:userId/:key    | Memory delete karo            |

```json
// POST /memory/1 — upsert
{ "key": "favorite_color", "value": "blue", "type": "memory" }

// GET /memory/1
{ "memories": [{ "id": 1, "user_id": 1, "key": "favorite_color", "value": "blue", "type": "memory", "created_at": "..." }] }
```

### Skill Routes — `/skill/:userId`

| Method | Path                       | Kaam                        |
|--------|----------------------------|-----------------------------|
| GET    | /skill/:userId             | Saare skills fetch karo     |
| GET    | /skill/:userId/:skillId    | Ek skill fetch karo         |
| POST   | /skill/:userId             | Naya skill create karo      |
| PUT    | /skill/:userId/:skillId    | Skill update karo           |
| DELETE | /skill/:userId/:skillId    | Skill delete karo           |

```json
// POST /skill/1
{ "name": "Fibonacci", "description": "Generate fibonacci", "code": "function fib(n) {...}" }

// Response 201
{ "id": 1, "name": "Fibonacci", "description": "...", "code": "..." }
```

---

## Database Tables

```sql
-- Key-value memory store
memories (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  type       TEXT CHECK(type IN ('skill','memory','context')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)   ← upsert ke liye
)

-- Code snippets / skills
skills (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  code        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

---

## Upsert Pattern

```sql
INSERT INTO memories (user_id, key, value, type)
VALUES ($1, $2, $3, $4)
ON CONFLICT(user_id, key)
DO UPDATE SET value = EXCLUDED.value, type = EXCLUDED.type
```

Same key dobara POST karo → value update ho jaata hai, duplicate nahi banta.

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

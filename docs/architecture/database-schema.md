# Database Schema — Mann AI Platform

**Database:** PostgreSQL 18.6 (via justpostgres)
**Connection:** `postgresql://postgres.dush3xg41u7h:***@localhost:5433/postgres`

---

## Tables Overview

```
PostgreSQL
├── users              (auth-service ka)
├── user_sessions      (auth-service ka)
├── messages           (chat-service ka)
├── memories           (memory-service ka)
├── skills             (memory-service ka)
└── agents             (agent-service ka)
```

---

## `users` Table

```sql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL UNIQUE,
  password    TEXT    NOT NULL,          -- bcrypt hashed
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
```

| Column     | Type        | Notes                        |
|------------|-------------|------------------------------|
| id         | SERIAL      | Auto-increment primary key   |
| name       | TEXT        | User ka display name         |
| email      | TEXT UNIQUE | Login identifier             |
| password   | TEXT        | bcrypt hash (never plaintext)|
| created_at | TIMESTAMPTZ | Timezone-aware timestamp     |

---

## `user_sessions` Table

```sql
CREATE TABLE user_sessions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT    NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ
);

CREATE INDEX idx_sessions_token ON user_sessions(token);
```

| Column     | Type        | Notes                                  |
|------------|-------------|----------------------------------------|
| id         | SERIAL      | Primary key                            |
| user_id    | INTEGER FK  | → users.id (CASCADE delete)            |
| token      | TEXT        | JWT token string                       |
| created_at | TIMESTAMPTZ | Session create time                    |
| expires_at | TIMESTAMPTZ | Token expiry (24h after creation)      |

> **ON DELETE CASCADE** — user delete ho to uski sessions bhi delete ho jaati hain automatically.

---

## `messages` Table

```sql
CREATE TABLE messages (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  role       TEXT    NOT NULL CHECK(role IN ('user','assistant')),
  content    TEXT    NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_user ON messages(user_id);
```

| Column     | Type        | Notes                              |
|------------|-------------|------------------------------------|
| id         | SERIAL      | Primary key                        |
| user_id    | INTEGER     | Kiska message hai                  |
| role       | TEXT        | 'user' ya 'assistant' only (CHECK) |
| content    | TEXT        | Message text                       |
| created_at | TIMESTAMPTZ | Message time                       |

> **CHECK constraint** — role sirf 'user' ya 'assistant' ho sakta hai, kuch aur nahi.

---

## `memories` Table

```sql
CREATE TABLE memories (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  key        TEXT    NOT NULL,
  value      TEXT    NOT NULL,
  type       TEXT    DEFAULT 'skill' CHECK(type IN ('skill','memory','context')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

CREATE INDEX idx_memories_user ON memories(user_id);
```

| Column     | Type        | Notes                                      |
|------------|-------------|--------------------------------------------|
| id         | SERIAL      | Primary key                                |
| user_id    | INTEGER     | Kiska memory                               |
| key        | TEXT        | Memory ka naam (e.g. 'favorite_color')     |
| value      | TEXT        | Memory ki value (e.g. 'blue')              |
| type       | TEXT        | 'skill', 'memory', ya 'context'            |
| created_at | TIMESTAMPTZ | Create time                                |

> **UNIQUE(user_id, key)** — Ek user ke paas ek key ek baar hi ho sakti hai. Duplicate pe upsert hota hai.

---

## `skills` Table

```sql
CREATE TABLE skills (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  description TEXT,
  code        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_skills_user ON skills(user_id);
```

| Column      | Type        | Notes                         |
|-------------|-------------|-------------------------------|
| id          | SERIAL      | Primary key                   |
| user_id     | INTEGER     | Kiska skill                   |
| name        | TEXT        | Skill ka naam                 |
| description | TEXT        | Optional description          |
| code        | TEXT        | Optional code snippet         |
| created_at  | TIMESTAMPTZ | Create time                   |

---

## `agents` Table

```sql
CREATE TABLE agents (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  name          TEXT    NOT NULL,
  description   TEXT,
  system_prompt TEXT,
  status        TEXT    DEFAULT 'idle' CHECK(status IN ('idle','running','paused')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agents_user ON agents(user_id);
```

| Column        | Type        | Notes                                    |
|---------------|-------------|------------------------------------------|
| id            | SERIAL      | Primary key                              |
| user_id       | INTEGER     | Kiska agent                              |
| name          | TEXT        | Agent ka naam                            |
| description   | TEXT        | Optional description                     |
| system_prompt | TEXT        | AI system prompt (agent ka behaviour)    |
| status        | TEXT        | 'idle', 'running', ya 'paused'           |
| created_at    | TIMESTAMPTZ | Create time                              |

---

## Relationships Diagram

```
users (1)
  ├──< user_sessions (many)   [FK: user_id → users.id CASCADE]
  ├──< messages (many)        [user_id — no FK, by convention]
  ├──< memories (many)        [user_id — no FK, by convention]
  ├──< skills (many)          [user_id — no FK, by convention]
  └──< agents (many)          [user_id — no FK, by convention]
```

> Note: Sirf `user_sessions` mein hard FK constraint hai. Baaki services mein `user_id` soft reference hai (microservices pattern — services independent rehti hain).

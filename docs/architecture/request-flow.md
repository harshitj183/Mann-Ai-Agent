# Request Flow — Ek Request Ka Poora Safar

## 1. Login Request

```
User types email + password → clicks "Sign in"
         │
         ▼
[Frontend — AuthContext.tsx]
  fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    body: { email, password }
  })
         │
         ▼
[API Gateway — auth.routes.js]
  POST /api/auth/login
  No JWT check needed (public route)
  forwardToService(SERVICES.auth, '/login', 'POST', body)
         │
         ▼
[Auth Service — :3001]
  1. SELECT * FROM users WHERE email = $1
  2. bcrypt.compare(password, hash)
  3. jwt.sign({ id, email, name }, JWT_SECRET)
  4. INSERT INTO user_sessions (user_id, token, expires_at)
  5. Return: { token, user }
         │
         ▼
[Gateway] → return response to Frontend
         │
         ▼
[Frontend]
  localStorage.setItem('token', data.token)
  localStorage.setItem('currentUser', JSON.stringify(data.user))
  navigate('/dashboard')
```

---

## 2. Protected Request (e.g., GET Chat Messages)

```
User opens Chat page
         │
         ▼
[Frontend — Chat.tsx]
  fetch('http://localhost:5000/api/chat/messages', {
    headers: { Authorization: 'Bearer <token>' }
  })
         │
         ▼
[API Gateway — middleware/auth.js]
  jwt.verify(token, JWT_SECRET)
  → req.user = { id: 1, email: '...', name: '...' }
  → next()
         │
         ▼
[API Gateway — chat.routes.js]
  forwardToService(SERVICES.chat, `/messages/${req.user.id}`, 'GET')
         │
         ▼
[Chat Service — :3002]
  SELECT id, role, content, created_at
  FROM messages
  WHERE user_id = $1
  ORDER BY created_at ASC
  → return { messages: [...] }
         │
         ▼
[Frontend]
  Display messages in chat UI
```

---

## 3. Database Connection Flow

```
Any Service (auth/chat/memory/agent)
         │
         ▼
[pg.Pool]
  connectionString = 'postgresql://postgres.dush3xg41u7h:***@localhost:5433/postgres'
         │
         ▼
[justpostgres Router — :5433]
  Parses username: postgres.dush3xg41u7h
  Extracts project-ref: dush3xg41u7h
  Looks up routing table → finds project container
         │
         ▼
[justpostgres Control Plane — :3000]
  Maintains routing table (which ref → which container)
         │
         ▼
[PostgreSQL 18.6 Container]
  Actual query execution
  Returns results
```

---

## 4. Signup + JWT Token Creation

```
POST /api/auth/signup
  { name, email, password }
         │
         ▼
Validation checks:
  ✓ All fields present?
  ✓ Password >= 6 chars?
  ✓ Email not already registered?
         │
         ▼
bcrypt.hash(password, 10)
  → hashed password (never store plaintext)
         │
         ▼
INSERT INTO users → RETURNING id
  → userId = 1
         │
         ▼
jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '24h' })
  → token = "eyJhbG..."
         │
         ▼
INSERT INTO user_sessions (user_id, token, expires_at)
         │
         ▼
Response: { message, token, user: { id, name, email } }
```

---

## 5. Memory Upsert Flow

```
POST /api/memory
  { key: 'favorite_color', value: 'blue', type: 'memory' }
  Authorization: Bearer <token>
         │
         ▼
Gateway verifies JWT → userId = 1
         │
         ▼
memory-service:3003 → POST /memory/1
         │
         ▼
INSERT INTO memories (user_id, key, value, type)
VALUES ($1, $2, $3, $4)
ON CONFLICT(user_id, key)
DO UPDATE SET value = EXCLUDED.value, type = EXCLUDED.type
         │
         ▼
Response: { key, value, type }
```

> **ON CONFLICT** = Agar same user ka same key already exist kare to update karo, insert mat karo (upsert).

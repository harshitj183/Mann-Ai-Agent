# API Gateway

**Port:** `5000`
**Path:** `backend/api-gateway/`
**Role:** Saari frontend requests ka single entry point

---

## Folder Structure

```
api-gateway/
├── src/
│   ├── index.js              ← Server start, routes mount
│   ├── config/
│   │   └── services.js       ← Backend service URLs
│   ├── middleware/
│   │   └── auth.js           ← JWT verification middleware
│   ├── routes/
│   │   ├── auth.routes.js    ← /api/auth/*
│   │   ├── chat.routes.js    ← /api/chat/*
│   │   ├── agent.routes.js   ← /api/agents/*
│   │   ├── memory.routes.js  ← /api/memory/*
│   │   └── tools.routes.js   ← /api/tools/*
│   └── utils/
│       └── forward.js        ← HTTP forward helper
└── package.json
```

---

## Routes

| Method | Path                           | Auth? | Forwards to                              |
|--------|--------------------------------|-------|------------------------------------------|
| POST   | /api/auth/signup               | ❌    | auth-service POST /signup                |
| POST   | /api/auth/login                | ❌    | auth-service POST /login                 |
| GET    | /api/auth/me                   | ✅    | Returns req.user from JWT                |
| GET    | /api/chat/messages             | ✅    | chat-service GET /messages/:userId       |
| POST   | /api/chat/message              | ✅    | chat-service POST /messages/:userId      |
| GET    | /api/agents                    | ✅    | agent-service GET /agents/:userId        |
| POST   | /api/agents                    | ✅    | agent-service POST /agents/:userId       |
| PATCH  | /api/agents/:agentId/status    | ✅    | agent-service PATCH /agents/:userId/:id/status |
| GET    | /api/memory                    | ✅    | memory-service GET /memory/:userId       |
| POST   | /api/memory                    | ✅    | memory-service POST /memory/:userId      |
| DELETE | /api/memory/:key               | ✅    | memory-service DELETE /memory/:userId/:key |
| GET    | /api/memory/skill              | ✅    | memory-service GET /skill/:userId        |
| POST   | /api/memory/skill              | ✅    | memory-service POST /skill/:userId       |
| PUT    | /api/memory/skill/:skillId     | ✅    | memory-service PUT /skill/:userId/:id    |
| DELETE | /api/memory/skill/:skillId     | ✅    | memory-service DELETE /skill/:userId/:id |

---

## Forward Helper

```js
// utils/forward.js
async function forwardToService(baseUrl, path, method, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  return { status: res.status, data }
}
```

Service down ho to `503 Service unavailable` return hota hai automatically.

---

## JWT Middleware

```js
// middleware/auth.js
jwt.verify(token, JWT_SECRET)
→ req.user = { id, email, name }
```

Verified user ka id saari downstream services ko milta hai via `req.user.id`.

---

## Dependencies

```json
{
  "express": "^4.21.0",
  "jsonwebtoken": "^9.0.2",
  "cors": "^2.8.5"
}
```

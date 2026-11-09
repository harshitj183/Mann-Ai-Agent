# Architecture Overview — Mann AI Platform

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                          │
│                      http://localhost:8000                      │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                      │
│                         Port: 8000                              │
│                                                                 │
│  Pages: Login, Signup, Dashboard, Chat                          │
│  Contexts: AuthContext (JWT), ThemeContext                      │
│  Components: MannLogo, ProtectedRoute                           │
└────────────────────────────┬────────────────────────────────────┘
                             │  fetch() → http://localhost:5000/api/*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Express)                        │
│                         Port: 5000                              │
│                                                                 │
│  /api/auth   → auth-service:3001                               │
│  /api/chat   → chat-service:3002                               │
│  /api/memory → memory-service:3003                             │
│  /api/agents → agent-service:3004                              │
│  /api/tools  → tools-service:3005                              │
│                                                                 │
│  Middleware: JWT verification (authenticateToken)              │
└──┬──────────┬──────────┬───────────┬──────────────────────────┘
   │          │          │           │
   ▼          ▼          ▼           ▼
┌──────┐  ┌──────┐  ┌────────┐  ┌────────┐
│ Auth │  │ Chat │  │ Memory │  │ Agent  │
│ :3001│  │ :3002│  │  :3003 │  │  :3004 │
└──┬───┘  └──┬───┘  └───┬────┘  └───┬────┘
   │         │           │           │
   └─────────┴───────────┴───────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  JUSTPOSTGRES ROUTER                            │
│                    Port: 5433 / 6544                            │
│                                                                 │
│  Connection: postgresql://postgres.dush3xg41u7h:***@:5433/     │
│  Routes traffic to correct project container                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              POSTGRESQL 18.6 (project container)                │
│                                                                 │
│  Tables: users, user_sessions, messages,                       │
│          memories, skills, agents                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Microservices Architecture
Har kaam ke liye alag service. Ek service crash ho to baaki chalti rehti hain.

```
auth-service    → sirf login/signup
chat-service    → sirf messages
memory-service  → sirf memories + skills
agent-service   → sirf agents
```

### 2. API Gateway Pattern
Frontend sirf ek URL se baat karta hai (`localhost:5000`). Gateway andar distribute karta hai.

```
Frontend → Gateway → Sahi service
```

Fayde:
- Frontend ko individual service ports nahi pata honge chahiye
- Authentication ek jagah hoti hai (gateway middleware)
- Future mein rate limiting, logging — ek hi jagah add karna hai

### 3. Shared Database, Separate Tables
Saari services ek hi PostgreSQL project use karti hain — alag alag tables mein.

```
justpostgres project: mann
├── users          (auth-service)
├── user_sessions  (auth-service)
├── messages       (chat-service)
├── memories       (memory-service)
├── skills         (memory-service)
└── agents         (agent-service)
```

### 4. JWT Authentication Flow
```
Login → auth-service → JWT token → localStorage
Request → Gateway → verify JWT → userId → forward to service
```

---

## Folder Structure

```
Mann/
├── frontend/              ← React TypeScript app
│   ├── src/
│   │   ├── pages/         ← Login, Signup, Dashboard, Chat
│   │   ├── components/    ← MannLogo, ProtectedRoute
│   │   └── contexts/      ← AuthContext, ThemeContext
│   └── vite.config.ts     ← Port: 8000
│
├── backend/
│   ├── api-gateway/       ← Entry point :5000
│   ├── auth-service/      ← Auth :3001
│   ├── chat-service/      ← Chat :3002
│   ├── memory-service/    ← Memory + Skills :3003
│   ├── agent-service/     ← Agents :3004
│   └── tools-service/     ← Tools :3005 (placeholder)
│
├── justpostgres/          ← Self-hosted Postgres platform
│   ├── docker-compose.yml ← Main compose file
│   └── .env               ← Master key, ports
│
├── nginx/                 ← Reverse proxy config (future)
├── docs/                  ← Yeh documentation folder
└── project/               ← PRD (Product Requirements Doc)
```

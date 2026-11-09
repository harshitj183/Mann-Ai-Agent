# Mann AI Platform — Documentation Index

> Yahan poori project ki documentation folder-wise organized hai.

## 📁 Folder Structure

```
docs/
├── README.md                    ← Yeh file (index)
├── architecture/
│   ├── overview.md              ← High-level system diagram
│   ├── request-flow.md          ← Ek request ka poora safar
│   └── database-schema.md       ← Saari tables aur relations
├── services/
│   ├── api-gateway.md           ← Gateway — entry point
│   ├── auth-service.md          ← Authentication & sessions
│   ├── chat-service.md          ← Chat messages
│   ├── memory-service.md        ← Memory + Skills store
│   ├── agent-service.md         ← AI Agents
│   └── tools-service.md         ← Tools (placeholder)
├── frontend/
│   └── overview.md              ← React app structure
├── database/
│   └── justpostgres.md          ← justpostgres setup & ports
└── techstack.md                 ← Full tech stack reference
```

## 🚀 Quick Start — Saari services kaise chalayein

```bash
# 1. Database (justpostgres)
cd justpostgres && docker compose up -d

# 2. Backend services (alag alag terminals mein)
cd backend/auth-service    && node src/index.js   # :3001
cd backend/chat-service    && node src/index.js   # :3002
cd backend/memory-service  && node src/index.js   # :3003
cd backend/agent-service   && node src/index.js   # :3004
cd backend/api-gateway     && node src/index.js   # :5000

# 3. Frontend
cd frontend && npm run dev                         # :8000
```

## 🌐 Live Ports

| Service           | Port  | URL                        |
|-------------------|-------|----------------------------|
| Frontend          | 8000  | http://localhost:8000       |
| API Gateway       | 5000  | http://localhost:5000       |
| Auth Service      | 3001  | http://localhost:3001       |
| Chat Service      | 3002  | http://localhost:3002       |
| Memory Service    | 3003  | http://localhost:3003       |
| Agent Service     | 3004  | http://localhost:3004       |
| justpostgres UI   | 3000  | http://localhost:3000       |
| PG Router (SQL)   | 5433  | postgresql://...@localhost:5433 |
| PG Pool           | 6544  | postgresql://...@localhost:6544 |

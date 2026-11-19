# Mann AI Agent

Mann is a browser-based AI workspace built with a React 19 frontend and Node.js microservices. It supports authenticated multi-turn chat, persistent memory, an LLM-powered agent with web search, and a tools layer — all wired together through an API gateway.

## Architecture

```text
Browser :8000
    │
    ▼
Frontend (React + Vite + TypeScript)
    │
    ▼
API Gateway :5000
    │
    ├── Auth Service    :3001  (JWT, HttpOnly cookies, bcrypt)
    ├── Chat Service    :3002  (conversation persistence)
    ├── Memory Service  :3003  (user memory store)
    ├── Agent Service   :3004  (LangGraph + Groq + Tavily)
    └── Tools Service   :3005  (utility endpoints)
              │
              ▼
        JustPostgres Router :5433
              │
              ▼
        PostgreSQL container
```

JustPostgres runs as its own Compose project. Mann connects to it through `host.docker.internal:5433` to avoid duplicating its control-plane orchestration.

## Services

| Service | Port | Stack |
|---|---|---|
| Frontend | 8000 | React 19, TypeScript, Vite 8, react-router-dom v7 |
| API Gateway | 5000 | Express, JWT verification, cookie-parser |
| Auth Service | 3001 | Express, bcryptjs, jsonwebtoken, HttpOnly cookies |
| Chat Service | 3002 | Express, Drizzle ORM |
| Memory Service | 3003 | Express, Drizzle ORM |
| Agent Service | 3004 | LangChain, LangGraph, Groq, Tavily, mathjs, Zod |
| Tools Service | 3005 | Express |
| Database package | — | Drizzle ORM, drizzle-kit, pg (shared `@mann/database`) |

## Agent workflow

The agent service handles `POST /api/agents/runs`. Each authenticated request runs through a small LangGraph workflow:

```text
Planner (LangChain + Groq)
  → search decision
  → Tavily web search  (skipped for casual prompts)
  → final response (LangChain + Groq)
  → persist result to PostgreSQL via Drizzle
```

Required env vars: `GROQ_API_KEY`, `TAVILY_API_KEY`.  
Optional: `GROQ_MODEL` (defaults to `openai/gpt-oss-20b`), `TAVILY_MAX_RESULTS` (defaults to `5`).  
Optional LangSmith tracing: `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`.

## Authentication

Auth uses an HttpOnly `mann_auth` cookie. The browser never stores the JWT in `localStorage`. Frontend requests include `credentials: 'include'` so the cookie is sent automatically. The current user profile is kept in `localStorage` for UI hydration only.

## Requirements

- Docker Engine or Docker Desktop
- Docker Compose v2
- A configured root `.env` file
- A running JustPostgres project

## Setup

Copy the env template and fill in real values:

```bash
cp .env.example .env
```

Required values to set:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string via JustPostgres router |
| `JWT_SECRET` | Random string, minimum 32 characters |
| `JP_MASTER_KEY` | JustPostgres master key (`openssl rand -base64 32`) |
| `GROQ_API_KEY` | Groq API key for the agent LLM |
| `TAVILY_API_KEY` | Tavily API key for web search |

For Docker, the database host must be reachable from inside a container:

```
DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5433/postgres
```

Never commit `.env`.

## Start the stack

```bash
# 1. Start JustPostgres
docker compose -f justpostgres/docker-compose.yml up -d

# 2. Build and start Mann (runs DB migration first, then all services)
docker compose -f docker-compose.yml up -d --build
```

The `database-migrate` container runs Drizzle migrations before any application service starts. All services wait on it via `depends_on: condition: service_completed_successfully`.

Check status:

```bash
docker compose -f docker-compose.yml ps
docker compose -f justpostgres/docker-compose.yml ps
```

Open in browser:

| URL | What |
|---|---|
| http://localhost:8000 | Frontend |
| http://localhost:5000/health | API Gateway health check |
| http://localhost:3000 | JustPostgres dashboard |

## Stop the stack

```bash
docker compose -f docker-compose.yml down
docker compose -f justpostgres/docker-compose.yml down
```

Do not use `down -v` unless you intentionally want to remove Docker volumes.

## Useful commands

```bash
# Rebuild a single service
docker compose build agent-service

# Follow logs for one service
docker compose logs -f agent-service

# Restart one service
docker compose restart chat-service

# Validate Compose config without starting containers
docker compose config -q
```

## Database

All services share the `@mann/database` Drizzle package at `backend/database`. The user schema:

```text
id, name, email, password_hash, avatar, created_at, updated_at
```

`avatar` is optional. Run migrations via the `database-migrate` container on startup. Add future schema changes as new Drizzle migration files — never modify the baseline migration directly.

## Repository layout

```text
backend/
  api-gateway/      Express proxy + JWT middleware
  auth-service/     Registration, login, logout
  chat-service/     Conversation CRUD
  memory-service/   Per-user memory store
  agent-service/    LangGraph agent (Groq + Tavily)
  tools-service/    Utility tool endpoints
  database/         Shared Drizzle ORM package (@mann/database)
frontend/           React 19 + TypeScript + Vite SPA
justpostgres/       PostgreSQL platform (separate Compose project)
docs/               Architecture and operational documentation
project/            Product requirements
```

## Current limitations

This setup targets local development. It does not yet include a production image strategy, reverse proxy, TLS termination, or orchestration platform deployment (e.g. Kubernetes, ECS).

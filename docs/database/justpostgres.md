# justpostgres — Database Setup

**Path:** `justpostgres/`
**Role:** Self-hosted PostgreSQL management platform (Supabase jaisa, self-hosted)

---

## Kya hai justpostgres?

justpostgres ek open-source tool hai jo Docker ke andar multiple PostgreSQL databases manage karta hai — ek UI ke saath. Ek project = ek isolated Postgres container.

---

## Running Services (Containers)

| Container                       | Port          | Kaam                                                     |
|---------------------------------|---------------|----------------------------------------------------------|
| justpostgres-control-plane-1    | 3000 (local)  | Management UI + API — projects banao, credentials dekho  |
| justpostgres-router-1           | 5433, 6544    | SQL traffic route karta hai sahi project container tak   |
| justpostgres-docker-socket-proxy| 2375 (internal)| Docker API sandbox — control plane ise use karta hai    |

---

## Ports Explained

```
:3000  — Control Plane UI
         Browser mein http://localhost:3000
         Admin dashboard — projects, users, backups

:5433  — Router (Session Mode)
         postgresql://...@localhost:5433/postgres
         Har client ka dedicated connection
         Direct queries ke liye

:6544  — Router (Pool Mode)
         postgresql://...@localhost:6544/postgres
         Connection pooling (PgBouncer-style)
         High traffic / multiple services ke liye better

:2375  — docker-socket-proxy
         Internal only — host pe accessible nahi
         Control plane Docker containers manage karne ke liye
```

---

## Connection String

```
postgresql://postgres.dush3xg41u7h:WfRvMJ0wjAVidmDRXHqymbyLJh4SNOKv@localhost:5433/postgres
             ────────┬──────────── ──────────────┬──────────────────── ─────┬─────
                     │                           │                          │
              role.project-ref              password                    router port
```

- **`postgres`** = DB role (superuser)
- **`dush3xg41u7h`** = Project reference ID (router parses this)
- **`5433`** = justpostgres router port (not default 5432 — conflict tha local Postgres se)

---

## .env File

```env
# justpostgres/.env
JP_MASTER_KEY=Gyn2+K8HNjc/GtJvzcQX6C7KWyeX9Vhln69cuOSy6n8=
JP_PORT=3030

# Local Postgres :5432 se conflict avoid karne ke liye
JP_ROUTER_SESSION_PORT=5433
JP_ROUTER_POOL_PORT=6544
```

> ⚠️ `JP_MASTER_KEY` must decode to exactly 32 bytes — `openssl rand -base64 32` se generate karo.

---

## Docker Compose Files

| File                       | Use                                              |
|----------------------------|--------------------------------------------------|
| `docker-compose.yml`       | Main — 3 services start karta hai               |
| `docker-compose.tls.yml`   | Overlay — Caddy TLS add karta hai (production)  |
| `docker-compose.build.yml` | Dev — source se build karta hai                 |
| `docker-compose.paste.yml` | Alternate paste deployment                      |

---

## Start / Stop Commands

```bash
# Start
cd justpostgres && docker compose up -d

# Stop
cd justpostgres && docker compose down

# Logs dekhna
docker logs justpostgres-control-plane-1
docker logs justpostgres-router-1

# Status check
docker ps --filter "name=justpostgres"
```

---

## TLS (Production ke liye)

```bash
# TLS overlay ke saath start (domain chahiye)
JP_DOMAIN=db.example.com docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d
```

Caddy automatically Let's Encrypt certificate issue karta hai.

---

## justpostgres Folder Structure

```
justpostgres/
├── apps/
│   ├── control-plane/  ← Management API + UI backend
│   ├── router/         ← SQL traffic router
│   └── web/            ← UI frontend (React)
├── packages/
│   ├── shared/         ← Shared types/utils
│   └── secrets/        ← Key management
├── images/
│   └── postgres/       ← Custom Postgres Docker image
├── deploy/
│   └── Caddyfile       ← Caddy TLS config
├── docs/               ← justpostgres ki apni docs
├── docker-compose.yml
└── .env
```

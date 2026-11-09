# Tech Stack — Mann AI Platform

## 🖥️ Frontend

| Technology       | Version   | Kaam                                      |
|------------------|-----------|-------------------------------------------|
| React            | 19.3.1    | UI library — component-based frontend     |
| TypeScript       | 6.0.3     | Type safety for JavaScript                |
| Vite             | 8.3.6     | Build tool + dev server (HMR)             |
| React Router DOM | 7.18.5    | Client-side routing (SPA)                 |
| CSS (vanilla)    | —         | Styling — no framework, custom CSS        |
| ESLint           | 10.x      | Code linting                              |

**Frontend runs on:** `http://localhost:8000`

---

## 🔀 API Gateway

| Technology   | Version | Kaam                                         |
|--------------|---------|----------------------------------------------|
| Node.js      | 20+     | JavaScript runtime                           |
| Express.js   | 4.21.0  | HTTP server framework                        |
| jsonwebtoken | 9.0.2   | JWT token verification (middleware)          |
| cors         | 2.8.5   | Cross-Origin Resource Sharing headers        |

**Pattern:** Reverse proxy — frontend ki saari requests yahan aati hain, gateway sahi service pe forward karta hai.

**Gateway runs on:** `http://localhost:5000`

---

## 🔐 Auth Service

| Technology  | Version  | Kaam                                          |
|-------------|----------|-----------------------------------------------|
| Node.js     | 20+      | Runtime                                       |
| Express.js  | 4.21.0   | HTTP framework                                |
| bcryptjs    | 2.4.3    | Password hashing (salt rounds: 10)            |
| jsonwebtoken| 9.0.2    | JWT token creation & signing                  |
| pg          | 8.13.3   | PostgreSQL client (connection pool)           |
| dotenv      | 16.4.7   | Environment variable loading                  |

**Auth runs on:** `http://localhost:3001`

---

## 💬 Chat Service

| Technology  | Version  | Kaam                             |
|-------------|----------|----------------------------------|
| Node.js     | 20+      | Runtime                          |
| Express.js  | 4.21.0   | HTTP framework                   |
| pg          | 8.13.3   | PostgreSQL client                |
| dotenv      | 16.4.7   | Environment variables            |

**Chat runs on:** `http://localhost:3002`

---

## 🧠 Memory Service

| Technology  | Version  | Kaam                                          |
|-------------|----------|-----------------------------------------------|
| Node.js     | 20+      | Runtime                                       |
| Express.js  | 4.21.0   | HTTP framework                                |
| pg          | 8.13.3   | PostgreSQL client                             |
| dotenv      | 16.4.7   | Environment variables                         |

**Sub-services:** `/memory` (key-value store) + `/skill` (code snippets)

**Memory runs on:** `http://localhost:3003`

---

## 🤖 Agent Service

| Technology  | Version  | Kaam                             |
|-------------|----------|----------------------------------|
| Node.js     | 20+      | Runtime                          |
| Express.js  | 4.21.0   | HTTP framework                   |
| pg          | 8.13.3   | PostgreSQL client                |
| dotenv      | 16.4.7   | Environment variables            |

**Agent runs on:** `http://localhost:3004`

---

## 🛠️ Tools Service

| Technology  | Version  | Kaam                             |
|-------------|----------|----------------------------------|
| Node.js     | 20+      | Runtime                          |
| Express.js  | 4.21.0   | HTTP framework                   |

> ⚠️ Currently placeholder — future mein AI tools integrate honge

**Tools runs on:** `http://localhost:3005`

---

## 🗄️ Database — justpostgres

| Technology          | Version   | Kaam                                              |
|---------------------|-----------|---------------------------------------------------|
| PostgreSQL          | 18.6      | Relational database (actual data store)           |
| justpostgres        | latest    | Self-hosted Postgres management platform          |
| docker-socket-proxy | 0.3.0     | Sandboxed Docker API access (security layer)      |
| Docker              | 29.9.2    | Container runtime                                 |

**Ports:**

| Port | Kaam                                                      |
|------|-----------------------------------------------------------|
| 3000 | justpostgres Control Plane UI (management dashboard)      |
| 5433 | Router — Session mode (direct connection per client)      |
| 6544 | Router — Pool mode (connection pooling, efficient)        |
| 2375 | docker-socket-proxy (internal only, not exposed to host)  |

**Connection String format:**
```
postgresql://role.project-ref:password@localhost:5433/postgres
             ──────┬────────── ────────┬─────────── ─────┬─────
                   │                  │                  │
             role + project-ref    password          database
```

---

## 🌐 Infrastructure / DevOps

| Technology     | Kaam                                                        |
|----------------|-------------------------------------------------------------|
| Docker Compose | justpostgres multi-container orchestration                  |
| Nginx          | Reverse proxy config (nginx/nginx.conf — future use)        |
| Caddy          | TLS termination (docker-compose.tls.yml — optional overlay) |

---

## 📦 Package Managers

| Tool | Kahan use hota hai         |
|------|----------------------------|
| npm  | Backend services, Frontend |
| pnpm | justpostgres monorepo      |

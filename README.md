# Mann AI Agent

Mann is a browser-based AI workspace with a React frontend and Node.js
microservices. The current repository contains the authentication, chat,
memory, agent, tools, API gateway, and Docker development foundation.

## Architecture

```text
Browser :8000
    |
    v
Frontend container
    |
    v
API Gateway :5000
    |
    +--> Auth Service :3001
    +--> Chat Service :3002
    +--> Memory Service :3003
    +--> Agent Service :3004
    +--> Tools Service :3006
             |
             v
       JustPostgres Router :5433
             |
             v
       PostgreSQL project container
```

JustPostgres remains its own Compose project. Mann connects to its router
through `host.docker.internal:5433`; this avoids duplicating or modifying
JustPostgres's control-plane orchestration.

## Requirements

- Docker Engine or Docker Desktop
- Docker Compose v2
- A configured root `.env` file
- A running JustPostgres project/database

Create the environment file from the template:

```bash
cp .env.example .env
```

Set real values for `DATABASE_URL`, `JWT_SECRET`, and `JP_MASTER_KEY`.
Never commit `.env`.

For Docker, the database host in `DATABASE_URL` must be reachable from a
container, for example:

```text
postgresql://USER:PASSWORD@host.docker.internal:5433/postgres
```

## Start the complete local stack

Run these commands from the repository root:

```bash
docker compose -f justpostgres/docker-compose.yml up -d
docker compose -f docker-compose.yml up -d --build
```

The first command starts JustPostgres. The second builds and starts all Mann
application containers.

Check status:

```bash
docker compose -f docker-compose.yml ps
docker compose -f justpostgres/docker-compose.yml ps
```

Open:

- Frontend: http://localhost:8000
- API Gateway health: http://localhost:5000/health
- JustPostgres dashboard: http://localhost:3000

## Stop the stack

```bash
docker compose -f docker-compose.yml down
docker compose -f justpostgres/docker-compose.yml down
```

Do not use `down -v` unless you intentionally want to remove Docker volumes.

## Useful commands

```bash
# Rebuild one service
docker compose build api-gateway

# Follow one service's logs
docker compose logs -f api-gateway

# Restart one service
docker compose restart auth-service

# Validate Compose configuration without starting containers
docker compose config -q
```

## Repository layout

```text
backend/       Node.js microservices and API gateway
frontend/      React + TypeScript + Vite application
justpostgres/  Separate PostgreSQL platform repository/source
docs/          Architecture and operational documentation
project/       Product requirements
```

## Current scope

The current Docker setup is for local development. It uses one basic
Dockerfile per application service and a root Compose file. It does not yet
provide a production image strategy, reverse proxy, TLS termination, or
orchestration platform deployment.

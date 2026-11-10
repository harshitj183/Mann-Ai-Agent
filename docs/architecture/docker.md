# Docker Development Setup

## Two Compose projects

The repository has two separate Compose files:

- `justpostgres/docker-compose.yml` runs the database control plane, router,
  and Docker socket proxy.
- Root `docker-compose.yml` runs the Mann frontend, API gateway, and backend
  services.

Start them directly from the repository root:

```bash
docker compose -f justpostgres/docker-compose.yml up -d
docker compose -f docker-compose.yml up -d --build
```

Keeping these files separate prevents duplicate JustPostgres containers and
port conflicts.

## Container inventory

| Container | Host port | Internal port |
|---|---:|---:|
| `mann-frontend` | 8000 | 8000 |
| `mann-api-gateway` | 5000 | 5000 |
| `mann-auth-service` | 3001 | 3001 |
| `mann-chat-service` | 3002 | 3002 |
| `mann-memory-service` | 3003 | 3003 |
| `mann-agent-service` | 3004 | 3004 |
| `mann-tools-service` | 3006 | 3006 |

## Environment flow

The root `.env` is passed to application containers through `env_file`.
Compose maps each service-specific port to the common `PORT` variable:

```yaml
environment:
  PORT: ${PORT_AUTH}
```

The gateway receives internal URLs such as:

```text
AUTH_SERVICE_URL=http://auth-service:3001
CHAT_SERVICE_URL=http://chat-service:3002
MEMORY_SERVICE_URL=http://memory-service:3003
AGENT_SERVICE_URL=http://agent-service:3004
TOOLS_SERVICE_URL=http://tools-service:3006
```

For database access from containers, `DATABASE_URL` must use
`host.docker.internal:5433`, not `localhost:5433`.

## Operations

```bash
# Validate configuration
docker compose config -q

# Check Mann services
docker compose -f docker-compose.yml ps

# Follow gateway logs
docker compose -f docker-compose.yml logs -f api-gateway

# Stop Mann services
docker compose -f docker-compose.yml down

# Stop JustPostgres
docker compose -f justpostgres/docker-compose.yml down
```

Do not use `down -v` unless you intentionally want to remove database or
control-plane volumes.

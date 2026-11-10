# Architecture Overview

Mann uses a React frontend, one API gateway, independent Node.js services,
and PostgreSQL managed through JustPostgres.

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

## Service responsibilities

| Service | Responsibility |
|---|---|
| Frontend | Login, signup, dashboard, and browser UI |
| API Gateway | Public API entry point, JWT middleware, request forwarding |
| Auth | Users, password hashing, JWTs, and sessions |
| Chat | User message persistence |
| Memory | Key-value memories and skills |
| Agent | Agent configuration and status |
| Tools | Tool registry and placeholder execution |
| JustPostgres | PostgreSQL project provisioning and routing |

The gateway uses Docker service names, such as
`http://auth-service:3001`. Browser code continues to use
`http://localhost:5000/api`, because the browser is outside the Compose
network.

## Compose boundary

JustPostgres remains a separate Compose project. Mann connects through the
host-published router at `host.docker.internal:5433`. This avoids duplicating
JustPostgres's control plane, router, socket proxy, and dynamic project
containers.

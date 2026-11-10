# Mann Documentation

## Documents

- [Architecture overview](architecture/overview.md)
- [Docker development setup](architecture/docker.md)
- [Database schema](architecture/database-schema.md)
- [Request flow](architecture/request-flow.md)
- [Frontend overview](frontend/overview.md)
- [Technology stack](techstack.md)
- [Product requirements](../project/prd.md)

## Start locally

From the repository root:

```bash
docker compose -f justpostgres/docker-compose.yml up -d
docker compose -f docker-compose.yml up -d --build
```

The frontend is available at `http://localhost:8000` and the gateway health
endpoint is available at `http://localhost:5000/health`.

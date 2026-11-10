# Mann AI Agent — Product Requirements

## Product goal

Mann is a browser-based AI workspace where users can chat with an assistant,
manage agents, save persistent memories, reuse skills, and connect tools.

## Current MVP capabilities

- User signup and login
- JWT-protected API gateway
- Persistent chat messages
- Key-value memories
- Reusable skills
- Agent configuration and status
- Tool registry placeholder
- Docker-based local development

## Planned capabilities

- Real LLM responses and streaming
- Agent execution and orchestration
- Tool and MCP connections
- Semantic memory with vector search
- Conversation management
- Skill enable/disable and versioning
- Production deployment and observability

## Current Docker milestone

The local development setup uses one basic Dockerfile per application
service and a root Compose file. JustPostgres stays in its own Compose
project and is started first.

Production reverse proxy, TLS, Kubernetes, automatic migrations, and
production image optimization are outside this milestone.

## Success criteria

1. JustPostgres is healthy.
2. All Mann containers report `Up`.
3. `http://localhost:8000` serves the frontend.
4. `http://localhost:5000/health` returns an OK gateway response.
5. Database-backed services connect through the JustPostgres router.

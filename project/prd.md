# Mann AI — Minimal Product Requirements Document (PRD)

**Project:** Mann AI  
**Type:** Browser-based AI Workspace  
**Goal:** Build a modular AI workspace where users can chat, manage agents, use skills, connect tools and MCP servers, and maintain persistent memory.

---

## 1. Product Overview

Mann AI is a browser-based AI workspace built around an agent-based architecture.

Users should be able to:
- Chat with an AI assistant.
- Manage and execute agents.
- Create and manage reusable skills.
- Connect and manage tools and MCP servers.
- Store and retrieve persistent memory.
- Manage conversations and settings.

The application must have a clean, minimal, responsive interface.

## 2. Confirmed Technology Stack

### Frontend
- Vite
- React
- TypeScript
- Tailwind CSS
- React Router
- Zustand (UI state)
- TanStack Query (API state)
- Lucide React (icons)

### Backend
- Node.js
- Express.js
- Mastra for agent orchestration
- JWT authentication
- REST APIs

### Infrastructure
- Nginx — reverse proxy
- Docker and Docker Compose
- PostgreSQL — primary database
- pgvector — vector search and semantic memory
- Redis — caching and temporary state (optional initially)
- Cloudflare R2 / S3 — file storage (optional initially)

## 3. Confirmed Architecture

Use a microservices architecture with a centralized API Gateway.

### Request Flow

Browser → Nginx → Frontend / API Gateway → Backend Microservices

### Nginx Routing

- `/` → React Frontend
- `/api/*` → API Gateway

### API Gateway

Port: `5000`

Responsibilities:
- Route requests to appropriate services.
- JWT authentication middleware.
- Request validation.
- HTTP request forwarding.
- Centralized error handling.

### Backend Microservices

| Service | Port | Responsibility |
|---|---:|---|
| Auth Service | 3001 | Users, login, registration, sessions |
| Chat Service | 3003 | Conversations and messages |
| Agent Service | 3004 | Agent execution using Mastra |
| Memory Service | 3005 | Persistent and semantic memory |
| Tools / MCP Service | 3006 | Tool registry and MCP connections |
| Skills Service | 3007 | Skill registry and SKILL.md loading |

Each service must have independent responsibilities and APIs.

### API Routes

- `/api/auth/*` → Auth Service
- `/api/chat/*` → Chat Service
- `/api/agents/*` → Agent Service
- `/api/memory/*` → Memory Service
- `/api/tools/*` → Tools / MCP Service
- `/api/skills/*` → Skills Service

Nginx forwards API traffic to the API Gateway. The Gateway routes requests using route-based forwarding.

Agent Service communicates internally with Memory, Tools and Skills services when executing an agent. Internal service-to-service requests should not unnecessarily pass through the public API Gateway.

Memory, Tools and Skills must also support authorized direct management operations through the API Gateway.

## 4. Database Architecture

Use PostgreSQL as the primary database.

Suggested logical ownership:

- Auth → Users, sessions and roles.
- Chat → Conversations and messages.
- Agent → Agent configurations and execution records.
- Memory → Persistent memories and embedding metadata.
- Tools → Tool registry and MCP configurations.
- Skills → Skill metadata and versions.

Use pgvector for semantic memory search.

Use separate database schemas or databases with clear service ownership. Each service must manage its own migrations and repository layer.

Redis and object storage are optional for the initial MVP.

Do not allow one service to directly query another service's database.

## 5. Core Application Modules

### A. Dashboard
- Overview of recent conversations.
- Available agents.
- Connected tools.
- Quick access to workspace.

### B. AI Workspace
- Chat interface.
- Message history.
- Streaming responses.
- Agent selection.
- New conversation.
- Loading and error states.

### C. Agent Management
- List available agents.
- Create and configure agents.
- Select an agent for execution.
- View execution status and results.

### D. Skills Management
- View available skills.
- Create and edit skills.
- Load skills from `SKILL.md`.
- Enable or disable skills.

### E. Tools & MCP
- View registered tools.
- Add MCP server configurations.
- Connect and disconnect servers.
- View connection status.
- Manage tool permissions.

### F. Memory
- View saved memories.
- Add and edit memories.
- Delete memories.
- Support semantic retrieval.

### G. Settings
- User profile.
- Theme preferences.
- Model/provider configuration.
- Basic application settings.

## 6. Important User Flows

### User Authentication
1. User opens Mann AI.
2. User registers or logs in.
3. Auth Service validates credentials.
4. Session is established.
5. User accesses the dashboard.

### AI Chat
1. User opens AI Workspace.
2. User selects an agent.
3. User sends a message.
4. Chat Service stores the message.
5. Agent Service executes the selected agent through Mastra.
6. Agent can retrieve memory, load skills and execute permitted tools.
7. Response is streamed or returned to Chat Service.
8. Conversation is updated and displayed.

### Agent Tool Execution
1. Agent receives a task.
2. Agent discovers available tools.
3. Agent checks permissions.
4. Agent executes the selected tool through Tools / MCP Service.
5. Tool result returns to Agent.
6. Agent generates the final response.

### Memory Management
1. Agent requests relevant memory.
2. Memory Service retrieves matching context.
3. Agent uses the retrieved context.
4. Relevant new memory can be saved.
5. User can inspect and manage saved memories.

## 7. Frontend Design Requirements

Design direction:
- Minimalist AI workspace.
- Dark theme as the default.
- Optional light/dark theme switcher.
- Responsive left sidebar.
- Compact top navigation.
- Spacious content areas.
- Consistent typography and spacing.
- Subtle borders and animations.
- Clean cards and reusable components.
- Lucide icons.

Main navigation:
1. Dashboard
2. Workspace
3. Agents
4. Skills
5. Tools & MCP
6. Memory
7. Settings

Avoid excessive gradients, unnecessary animations and cluttered dashboards.
 

Each backend service should maintain its own controllers, services, repositories, routes, configuration and database migrations.

## 9. Security Requirements

- Hash passwords securely.
- Validate JWTs on protected routes.
- Never expose provider API keys to the frontend.
- Encrypt sensitive MCP credentials.
- Apply tool-level permissions.
- Validate and sanitize user input.
- Restrict browser automation to authorized operations.
- Keep secrets in environment variables.
- Do not allow unrestricted operating-system or local-machine execution.

## 10. MVP Acceptance Criteria

The first working version is complete when:

- [ ] User can register and log in.
- [ ] Dashboard loads successfully.
- [ ] User can create and manage conversations.
- [ ] User can send messages and receive agent responses.
- [ ] At least one Mastra agent works end-to-end.
- [ ] Agent can retrieve and save memory.
- [ ] Skills can be registered and loaded.
- [ ] Tools can be registered and executed with permission checks.
- [ ] MCP connection management works at a basic level.
- [ ] Nginx correctly routes frontend and API requests.
- [ ] Docker Compose starts the required services.
- [ ] Basic error handling and loading states exist.

## 11. Development Priority

Build in this order:

**Phase 1 — Foundation**
- Repository setup.
- Vite frontend.
- Express API Gateway.
- Nginx configuration.
- Docker Compose.

**Phase 2 — Core Application**
- Auth Service.
- Chat Service.
- Agent Service with one working Mastra agent.
- Basic AI Workspace.

**Phase 3 — Agent Capabilities**
- Memory Service.
- Skills Service.
- Tools / MCP Service.
- Agent-to-service communication.

**Phase 4 — Completion**
- Dashboard and management screens.
- Security checks.
- Error handling.
- Testing and documentation.

## 12. Explicitly Out of Scope for MVP

Do not build these unless requested later:

- Kubernetes.
- Complex event-driven architecture.
- Kafka or NATS.
- Multiple databases for every service.
- Multi-agent orchestration complexity.
- Billing and subscription systems.
- Enterprise organization management.
- Advanced analytics.
- Mobile applications.
- Unrestricted computer or operating-system control.

## 13. Instructions for the Coding Agent

Build the actual working application, not just UI mockups or architecture diagrams.

Follow these rules:

1. Respect the confirmed architecture and technology stack.
2. Implement one working feature at a time.
3. Keep services modular and independently testable.
4. Do not invent unnecessary services or technologies.
5. Use real API integrations between frontend and backend.
6. Do not hardcode fake successful responses.
7. Include loading, empty, success and error states.
8. Add environment configuration and setup documentation.
9. Test each service and its integration before moving forward.
10. Keep the implementation beginner-friendly, maintainable and production-conscious.

Start with the repository foundation, frontend shell, Nginx and API Gateway. Then implement authentication, chat and one working Mastra agent before expanding the remaining services.

**Final Goal:** A clean, functional and extensible Mann AI workspace built on the confirmed microservices architecture.
# LangGraph Tavily Agent Microservice Design

## Goal

Replace the current single-step Groq orchestrator with a small, explicit
LangGraph workflow that can answer both conversational and web-search
questions:

```text
User input
  -> Planner node
  -> conditional search route
  -> Tavily search node (when required)
  -> Final response node
  -> persisted agent run
```

The implementation remains inside the existing Agent Service microservice. It
does not expose Tavily or Groq credentials to the frontend.

## Scope

### In scope

- LangGraph-based workflow in `backend/agent-service`.
- Planner node that produces a validated search plan.
- Conditional routing that skips Tavily for casual questions.
- Tavily search node supporting one or more planned queries.
- Final response node that formats a concise Markdown answer with source links.
- Existing `POST /runs/:userId` contract and `agent_runs` persistence.
- Existing API Gateway route and HttpOnly cookie authentication.
- Explicit validation and failure persistence.
- Unit tests for routing, search, formatting, and failures.
- Docker and environment configuration for the new dependencies.

### Out of scope

- Long-term or short-term conversation memory.
- File, terminal, browser, or arbitrary tool execution.
- Streaming responses.
- Background jobs or multi-agent concurrency.
- Deleting existing `agents` or `agent_runs` PostgreSQL tables.
- Exposing provider APIs directly from the frontend.

## Architecture

The existing Agent Service remains the boundary for authenticated agent runs:

```text
Frontend
  -> API Gateway /api/agents/runs
  -> HttpOnly JWT verification
  -> Agent Service /runs/:userId
  -> LangGraph workflow
       -> Planner (Groq)
       -> Search decision
       -> Tavily Search (if needed)
       -> Final Response (Groq)
  -> Drizzle agent_runs persistence
  -> API Gateway
  -> Frontend Markdown response and sources
```

The service owns provider clients and workflow state. The API Gateway remains
responsible for authentication and user identity forwarding.

## Graph State

The graph uses a single typed state object:

```js
{
  userId: number,
  userInput: string,
  plan: {
    needsSearch: boolean,
    searchQueries: string[],
    responseType: 'conversation' | 'answer'
  } | null,
  searchResults: Array<{
    title: string,
    url: string,
    content: string,
    score: number | null
  }>,
  finalResponse: string | null,
  error: string | null
}
```

The planner and final response nodes use Groq. The search node uses Tavily.
Provider responses are normalized at their client boundaries.

## Nodes and Routing

### Planner

The planner receives only the current user input and must return strict JSON.
The result is validated before entering the graph:

```json
{
  "needsSearch": true,
  "searchQueries": ["current React release features"],
  "responseType": "answer"
}
```

For casual input such as `hi how are you`, it returns `needsSearch: false`
with an empty query list. Invalid JSON, unsupported fields, empty queries, or
more than five queries fail the run explicitly.

### Search route

- `needsSearch: false` routes directly to Final Response.
- `needsSearch: true` routes to Search.
- A search plan with no valid query is rejected rather than silently skipped.

### Search

The node calls Tavily once per planned query, with a bounded result count.
Results are deduplicated by URL and normalized to title, URL, content, and
optional score. An empty result set is valid and is passed to the final node
so the response can say that no reliable sources were found.

### Final Response

The final node receives the original input, plan, and normalized results. It
must produce Markdown, avoid inventing facts not supported by search results
for search questions, and append a `Sources` section when URLs are available.
For casual questions it answers directly without pretending that a web search
occurred.

## API Contract

The existing endpoint remains unchanged:

```http
POST /api/agents/runs
Content-Type: application/json
Cookie: mann_auth=<HttpOnly JWT>
```

Request:

```json
{ "request": "latest React release features" }
```

Success response:

```json
{
  "run": {
    "id": 1,
    "userId": 5,
    "request": "latest React release features",
    "status": "completed",
    "output": "## ...",
    "sources": [
      { "title": "React Blog", "url": "https://react.dev/..." }
    ],
    "error": null
  }
}
```

The existing database schema does not currently have a sources column.
Sources will be included in the API response by the workflow result while the
persisted `output` remains the formatted answer. The persistence shape will be
extended only if the existing schema and migration review show that it is
necessary.

## Errors and Security

- Empty input returns HTTP 400.
- Missing provider keys fail with explicit configuration errors.
- Planner, Tavily, and final-model failures persist a failed `agent_runs` row
  and return the existing run failure response.
- Provider keys remain server-side environment variables.
- Search results are rendered as links; untrusted result content is treated as
  text and not injected as HTML.
- The Agent Service remains reachable through the authenticated Gateway route;
  direct public exposure is not part of this design.

## Configuration

Required:

```env
GROQ_API_KEY=...
TAVILY_API_KEY=...
```

Optional:

```env
GROQ_MODEL=openai/gpt-oss-20b
TAVILY_MAX_RESULTS=5
```

## Testing and Verification

- Planner output validation and casual-question routing.
- Search-required routing and multiple-query deduplication.
- Tavily response normalization and provider failure.
- Final response source formatting.
- Failed run persistence behavior.
- Existing Agent Service tests updated for the graph contract.
- Frontend build and Markdown/source rendering.
- Docker Compose build and startup.
- Authenticated API request with the existing HttpOnly cookie.
- `git diff --check` and a guard that provider secrets are not committed.

# LangGraph Tavily Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely replace the current Agent Service orchestration backend with a tested LangGraph workflow using LangChain/Groq for planning and final formatting and Tavily for web search.

**Architecture:** Keep `POST /runs/:userId` and existing API Gateway authentication unchanged, but replace the current orchestrator implementation inside Agent Service. A compiled LangGraph state graph will run a planner node, conditionally run Tavily searches, then run a final LangChain response node; the service will persist the formatted output through the existing Drizzle `agent_runs` table.

**Tech Stack:** Node.js ESM, Express, LangGraph JS, LangChain JS (`@langchain/core`, `@langchain/groq`), Tavily API, Drizzle ORM, PostgreSQL, Docker Compose, Node test runner.

---

## File map

### Agent Service replacement

- Delete: `backend/agent-service/src/orchestrator/agent-orchestrator.js`
- Delete: `backend/agent-service/src/orchestrator/agent-orchestrator.test.js`
- Delete: `backend/agent-service/src/llm/groq-client.js`
- Delete: `backend/agent-service/src/llm/groq-client.test.js`
- Create: `backend/agent-service/src/graph/state.js` — graph state schema and constants.
- Create: `backend/agent-service/src/graph/planner-node.js` — structured LangChain planner.
- Create: `backend/agent-service/src/graph/search-node.js` — Tavily client call, normalization, and URL deduplication.
- Create: `backend/agent-service/src/graph/final-response-node.js` — LangChain final answer formatting and source section.
- Create: `backend/agent-service/src/graph/agent-graph.js` — LangGraph nodes, conditional routing, and compiled graph.
- Create: `backend/agent-service/src/graph/agent-graph.test.js` — graph routing and failure tests.
- Modify: `backend/agent-service/src/index.js` — invoke the compiled graph and persist completed/failed runs.
- Modify: `backend/agent-service/package.json` — replace obsolete implementation dependencies with LangGraph/LangChain/Tavily dependencies and test script.
- Modify: `backend/agent-service/package-lock.json` — regenerate with npm.

### Shared configuration and deployment

- Modify: `.env.example` — document `TAVILY_API_KEY` and bounded `TAVILY_MAX_RESULTS`.
- Modify: `docker-compose.yml` — retain the Agent Service container but pass the new provider configuration; do not add a second agent container.
- Modify: `README.md` — document planner → search → final response behavior and required keys.

### Existing surfaces to preserve

- Preserve: `backend/api-gateway/src/routes/agent.routes.js`
- Preserve: `backend/api-gateway/src/middleware/auth.js`
- Preserve: `backend/database/src/schema/agents.js`
- Preserve: `agent_runs` migration/schema and existing HttpOnly cookie authentication.

## Task 1: Establish failing tests for the replacement graph

**Files:**
- Create: `backend/agent-service/src/graph/agent-graph.test.js`
- Modify: `backend/agent-service/package.json`

- [ ] **Step 1: Add focused tests for casual routing, search routing, and failure behavior**

Use dependency injection for planner, search, and final-response functions so tests never call external Groq or Tavily APIs:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentGraph } from './agent-graph.js'

test('routes casual input directly from planner to final response', async () => {
  const calls = []
  const graph = createAgentGraph({
    plan: async () => ({ needsSearch: false, searchQueries: [], responseType: 'conversation' }),
    search: async () => {
      calls.push('search')
      return []
    },
    finalResponse: async (state) => {
      calls.push('final')
      return { finalResponse: `reply:${state.userInput}`, sources: [] }
    },
  })

  const result = await graph.invoke({ userInput: 'hi how are you' })

  assert.equal(result.finalResponse, 'reply:hi how are you')
  assert.deepEqual(calls, ['final'])
})

test('routes search input through Tavily before final response', async () => {
  const calls = []
  const graph = createAgentGraph({
    plan: async () => ({
      needsSearch: true,
      searchQueries: ['LangGraph JS official docs'],
      responseType: 'answer',
    }),
    search: async (queries) => {
      calls.push(['search', queries])
      return [{ title: 'Docs', url: 'https://example.com/docs', content: 'Result', score: 1 }]
    },
    finalResponse: async (state) => {
      calls.push(['final', state.searchResults])
      return { finalResponse: 'formatted', sources: state.searchResults }
    },
  })

  const result = await graph.invoke({ userInput: 'What is LangGraph?' })

  assert.equal(result.finalResponse, 'formatted')
  assert.deepEqual(calls, [
    ['search', ['LangGraph JS official docs']],
    ['final', [{ title: 'Docs', url: 'https://example.com/docs', content: 'Result', score: 1 }]],
  ])
})

test('surfaces provider failures instead of returning a fake success', async () => {
  const graph = createAgentGraph({
    plan: async () => ({
      needsSearch: true,
      searchQueries: ['query'],
      responseType: 'answer',
    }),
    search: async () => {
      throw new Error('Tavily unavailable')
    },
    finalResponse: async () => ({ finalResponse: 'not reached', sources: [] }),
  })

  await assert.rejects(
    graph.invoke({ userInput: 'search this' }),
    /Tavily unavailable/,
  )
})
```

- [ ] **Step 2: Add a test script that runs the graph tests**

Set `package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "node --test src/**/*.test.js"
  }
}
```

- [ ] **Step 3: Run the tests and verify the replacement is genuinely RED**

Run:

```bash
cd backend/agent-service
npm test
```

Expected: FAIL because `src/graph/agent-graph.js` does not exist yet. Do not write graph production code before observing this failure.

## Task 2: Add LangGraph/LangChain/Tavily dependencies and typed graph state

**Files:**
- Modify: `backend/agent-service/package.json`
- Modify: `backend/agent-service/package-lock.json`
- Create: `backend/agent-service/src/graph/state.js`

- [ ] **Step 1: Add the provider dependencies**

Add these runtime dependencies:

```json
{
  "@langchain/core": "^0.3.0",
  "@langchain/groq": "^0.2.0",
  "@langchain/langgraph": "^0.2.0",
  "tavily": "^0.1.3"
}
```

Keep `cors`, `dotenv`, `express`, and `@mann/database`. Use the latest compatible versions resolved by npm if the specified ranges are unavailable, and record the resolved versions in the lockfile.

- [ ] **Step 2: Install and verify dependency resolution**

Run:

```bash
cd backend/agent-service
npm install
```

Expected: install succeeds and `npm ls @langchain/core @langchain/groq @langchain/langgraph tavily` reports no missing dependency.

- [ ] **Step 3: Define graph state and validation constants**

Create `state.js` with the exact normalized shapes:

```js
export const MAX_SEARCH_QUERIES = 5

export function createInitialState({ userId, userInput }) {
  return {
    userId,
    userInput,
    plan: null,
    searchResults: [],
    sources: [],
    finalResponse: null,
    error: null,
  }
}

export function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') throw new Error('Planner returned an invalid plan')
  if (typeof plan.needsSearch !== 'boolean') throw new Error('Planner needsSearch must be boolean')
  if (!['conversation', 'answer'].includes(plan.responseType)) {
    throw new Error('Planner responseType is invalid')
  }
  if (!Array.isArray(plan.searchQueries) || plan.searchQueries.length > MAX_SEARCH_QUERIES) {
    throw new Error(`Planner searchQueries must contain 0-${MAX_SEARCH_QUERIES} items`)
  }
  const searchQueries = plan.searchQueries
    .filter((query) => typeof query === 'string')
    .map((query) => query.trim())
    .filter(Boolean)
  if (plan.needsSearch && searchQueries.length === 0) {
    throw new Error('Planner requires at least one search query')
  }
  return { ...plan, searchQueries }
}
```

- [ ] **Step 4: Run the RED tests again**

Run:

```bash
cd backend/agent-service
npm test
```

Expected: still FAIL because graph nodes and compiled graph are not implemented.

## Task 3: Implement LangChain planner node

**Files:**
- Create: `backend/agent-service/src/graph/planner-node.js`
- Modify: `backend/agent-service/src/graph/agent-graph.test.js`

- [ ] **Step 1: Add planner validation tests**

Add tests that a planner response with invalid JSON, empty required queries, or more than five queries rejects with the exact validation error from `validatePlan`.

- [ ] **Step 2: Implement the planner with LangChain structured output**

Use `ChatGroq` and a Zod schema, not manual string parsing:

```js
import { ChatGroq } from '@langchain/groq'
import { z } from 'zod'
import { validatePlan } from './state.js'

const PlanSchema = z.object({
  needsSearch: z.boolean(),
  searchQueries: z.array(z.string()),
  responseType: z.enum(['conversation', 'answer']),
})

export function createPlanner({ model = process.env.GROQ_MODEL, apiKey = process.env.GROQ_API_KEY } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY is required')
  const llm = new ChatGroq({ apiKey, model })
  const structured = llm.withStructuredOutput(PlanSchema)
  return async ({ userInput }) => {
    const result = await structured.invoke([
      ['system', 'Decide whether the user request needs current web information. Return only the requested structured plan. Use no search for greetings or casual conversation. Use at most five focused search queries.'],
      ['human', userInput],
    ])
    return validatePlan(result)
  }
}
```

- [ ] **Step 3: Run planner unit tests**

Run:

```bash
cd backend/agent-service
npm test -- --test-name-pattern="planner"
```

Expected: PASS for validation tests; provider calls remain injected/mocked in graph tests.

## Task 4: Implement Tavily search node and normalization

**Files:**
- Create: `backend/agent-service/src/graph/search-node.js`
- Modify: `backend/agent-service/src/graph/agent-graph.test.js`

- [ ] **Step 1: Add Tavily normalization and deduplication tests**

Test that duplicate URLs collapse to one result, missing titles/content become safe empty strings, scores become `null` when absent, and multiple planned queries are processed in order.

- [ ] **Step 2: Implement the Tavily client boundary**

Use the Tavily SDK if its installed API supports the current package version; otherwise use `fetch` against Tavily's documented search endpoint from this isolated client file. Never expose the API key outside this module:

```js
export function normalizeSearchResults(results) {
  const byUrl = new Map()
  for (const result of results) {
    if (typeof result?.url !== 'string' || !result.url.trim()) continue
    const url = result.url.trim()
    if (!byUrl.has(url)) {
      byUrl.set(url, {
        title: typeof result.title === 'string' ? result.title.trim() : '',
        url,
        content: typeof result.content === 'string' ? result.content.trim() : '',
        score: typeof result.score === 'number' ? result.score : null,
      })
    }
  }
  return [...byUrl.values()]
}

export function createSearchNode({
  apiKey = process.env.TAVILY_API_KEY,
  maxResults = Number(process.env.TAVILY_MAX_RESULTS || 5),
  searchImpl,
} = {}) {
  if (!apiKey && !searchImpl) throw new Error('TAVILY_API_KEY is required')
  const runSearch = searchImpl ?? createTavilySearch({ apiKey, maxResults })
  return async ({ searchQueries }) => {
    const batches = []
    for (const query of searchQueries) batches.push(...await runSearch(query))
    const searchResults = normalizeSearchResults(batches).slice(0, maxResults)
    return { searchResults, sources: searchResults.map(({ title, url }) => ({ title, url })) }
  }
}
```

- [ ] **Step 3: Run search tests**

Run:

```bash
cd backend/agent-service
npm test -- --test-name-pattern="search"
```

Expected: PASS, including empty results and provider failure propagation.

## Task 5: Implement final LangChain response node

**Files:**
- Create: `backend/agent-service/src/graph/final-response-node.js`
- Modify: `backend/agent-service/src/graph/agent-graph.test.js`

- [ ] **Step 1: Add tests for formatting and source handling**

Verify that:

- casual input can be answered without search results;
- search answers include a Markdown `## Sources` section only when sources exist;
- source URLs are emitted as Markdown links;
- provider errors reject instead of returning an empty answer.

- [ ] **Step 2: Implement the final response node**

Use `ChatGroq` through LangChain:

```js
import { ChatGroq } from '@langchain/groq'

export function createFinalResponseNode({ model = process.env.GROQ_MODEL, apiKey = process.env.GROQ_API_KEY } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY is required')
  const llm = new ChatGroq({ apiKey, model })
  return async ({ userInput, plan, searchResults, sources }) => {
    const context = searchResults.map((item, index) =>
      `[${index + 1}] ${item.title}\nURL: ${item.url}\n${item.content}`
    ).join('\n\n')
    const response = await llm.invoke([
      ['system', 'Answer clearly in Markdown. For search-backed answers, use only the supplied results for factual claims. Do not invent citations.'],
      ['human', `Question: ${userInput}\nResponse type: ${plan.responseType}\nSearch context:\n${context || '(no search results)'}`],
    ])
    const finalResponse = typeof response.content === 'string' ? response.content.trim() : ''
    if (!finalResponse) throw new Error('Final response was empty')
    return { finalResponse, sources }
  }
}
```

- [ ] **Step 3: Run final-response tests**

Run:

```bash
cd backend/agent-service
npm test -- --test-name-pattern="response"
```

Expected: PASS.

## Task 6: Build and compile the LangGraph workflow

**Files:**
- Create: `backend/agent-service/src/graph/agent-graph.js`
- Modify: `backend/agent-service/src/graph/agent-graph.test.js`

- [ ] **Step 1: Implement the graph with explicit conditional routing**

Use `StateGraph`, `START`, and `END` from `@langchain/langgraph`:

```js
import { END, START, StateGraph } from '@langchain/langgraph'
import { createInitialState, validatePlan } from './state.js'
import { createPlanner } from './planner-node.js'
import { createSearchNode } from './search-node.js'
import { createFinalResponseNode } from './final-response-node.js'

export function createAgentGraph({
  plan = createPlanner(),
  search = createSearchNode(),
  finalResponse = createFinalResponseNode(),
} = {}) {
  const plannerNode = async (state) => ({ plan: validatePlan(await plan(state)) })
  const searchNode = async (state) => search(state.plan)
  const finalNode = async (state) => finalResponse(state)
  const routeAfterPlan = (state) => state.plan.needsSearch ? 'search' : 'final'

  return new StateGraph({
    channels: {
      userInput: { value: (_, next) => next },
      plan: { value: (_, next) => next, default: () => null },
      searchResults: { value: (_, next) => next, default: () => [] },
      sources: { value: (_, next) => next, default: () => [] },
      finalResponse: { value: (_, next) => next, default: () => null },
    },
  })
    .addNode('planner', plannerNode)
    .addNode('search', searchNode)
    .addNode('final', finalNode)
    .addEdge(START, 'planner')
    .addConditionalEdges('planner', routeAfterPlan, { search: 'search', final: 'final' })
    .addEdge('search', 'final')
    .addEdge('final', END)
    .compile()
}

export function createGraphInput({ userId, userInput }) {
  return createInitialState({ userId, userInput })
}
```

Adjust the exact StateGraph API to the installed `@langchain/langgraph` version while preserving these node names, state fields, and routing semantics.

- [ ] **Step 2: Make graph tests use injected dependencies**

Ensure tests do not instantiate provider clients and assert:

```js
const result = await graph.invoke({ userInput: '...' })
```

Expected result fields: `finalResponse`, `sources`, and normalized `searchResults`.

- [ ] **Step 3: Run all Agent Service tests**

Run:

```bash
cd backend/agent-service
npm test
```

Expected: all graph tests pass and no old orchestrator tests remain.

## Task 7: Replace Agent Service HTTP integration completely

**Files:**
- Modify: `backend/agent-service/src/index.js`
- Modify: `backend/agent-service/src/db.js` only if exports need tightening.
- Delete: old `src/orchestrator/` and `src/llm/` files already listed above.

- [ ] **Step 1: Add a failing HTTP-level persistence test**

Extract the run handler into a testable function or dependency-injected factory and assert that a valid request invokes the graph and saves:

```js
{
  userId: 5,
  request: 'latest React features',
  status: 'completed',
  output: 'formatted answer',
  error: null
}
```

Also assert graph failure saves `status: 'failed'`, `output: null`, and the error message.

- [ ] **Step 2: Replace the old orchestrator wiring**

The service must:

1. parse and validate `userId`;
2. validate non-empty `req.body.request`;
3. invoke the compiled LangGraph with `{ userId, userInput: request }`;
4. persist `result.finalResponse`;
5. return `run` plus `sources` without changing the existing endpoint path;
6. persist failures before returning HTTP 500.

Do not import `createAgentOrchestrator`, `createGroqClient`, or any old `src/llm` module.

- [ ] **Step 3: Remove obsolete source files and references**

Run:

```bash
cd /home/harshitj183/coding/Mann
rg "createAgentOrchestrator|createGroqClient|src/orchestrator|src/llm|GROQ_API_KEY" backend/agent-service
```

Expected: only the new LangChain graph provider modules and their configuration references remain; no old orchestrator or old Groq client imports remain.

- [ ] **Step 4: Run Agent Service tests and syntax checks**

Run:

```bash
cd backend/agent-service
npm test
node --check src/index.js
```

Expected: all tests pass and syntax check exits 0.

## Task 8: Update environment, Docker, and documentation

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `README.md`

- [ ] **Step 1: Document provider configuration without adding secrets**

Add:

```env
TAVILY_API_KEY=
TAVILY_MAX_RESULTS=5
```

Keep `GROQ_API_KEY` and `GROQ_MODEL` because LangChain/Groq still powers planner and final response.

- [ ] **Step 2: Verify Docker receives the new variables**

Ensure the existing Agent Service `env_file: .env` remains present and no provider secret is placed in Compose YAML.

- [ ] **Step 3: Document the new flow**

Update README with:

```text
Planner (LangGraph + LangChain/Groq)
  -> conditional Tavily search
  -> final LangChain/Groq response
  -> Drizzle agent_runs persistence
```

Document that `hi how are you` skips search while current-information questions use Tavily.

- [ ] **Step 4: Run documentation/config checks**

Run:

```bash
cd /home/harshitj183/coding/Mann
git diff --check
TAVILY_API_KEY=placeholder docker compose config -q
```

Expected: both commands exit 0.

## Task 9: Update frontend for sources and verify end-to-end behavior

**Files:**
- Modify: `frontend/src/pages/Chat.tsx`
- Modify: `frontend/src/App.css` only if source-card styling is needed.
- Modify: `frontend/package-lock.json` only if dependencies change.

- [ ] **Step 1: Add a frontend response-shape test or typed helper test**

Test that an API response with `run.output` and `sources` renders the answer and source links, while a response without sources still renders normally.

- [ ] **Step 2: Render normalized sources safely**

Keep `credentials: 'include'`. Render source titles as links using React properties (`href`, `target`, `rel`) and never inject provider HTML.

- [ ] **Step 3: Run frontend validation**

Run:

```bash
cd frontend
npm run build
```

Expected: TypeScript and Vite build pass.

## Task 10: Full verification, migration cleanup, and commit

**Files:**
- All changed files from Tasks 1-9.

- [ ] **Step 1: Run focused unit tests**

```bash
cd backend/agent-service
npm test
cd ../api-gateway
node --test src/middleware/auth.test.js src/routes/auth.routes.test.js
```

Expected: all tests pass.

- [ ] **Step 2: Build and start the complete Docker stack**

```bash
cd /home/harshitj183/coding/Mann
docker compose up -d --build
docker compose ps
```

Expected: database migration exits 0; auth, chat, memory, agent, tools, gateway, and frontend are Up.

- [ ] **Step 3: Verify health endpoints**

```bash
for url in \
  http://localhost:5000/health \
  http://localhost:3001/health \
  http://localhost:3002/health \
  http://localhost:3003/health \
  http://localhost:3004/health \
  http://localhost:3005/health; do
  curl -fsS "$url" >/dev/null
done
curl -fsSI http://localhost:8000/ | head -n 1
```

Expected: every command exits 0.

- [ ] **Step 4: Verify authenticated casual and search requests**

Use a cookie jar from signup/login. Confirm:

- `hi how are you` returns a completed response without a Tavily call;
- a current-information query returns `sources`;
- missing `TAVILY_API_KEY` produces an explicit failed run, not a fake answer.

Never print JWTs, API keys, or passwords in command output.

- [ ] **Step 5: Verify old backend is completely replaced**

```bash
cd /home/harshitj183/coding/Mann
test ! -e backend/agent-service/src/orchestrator/agent-orchestrator.js
test ! -e backend/agent-service/src/llm/groq-client.js
rg "createAgentOrchestrator|createGroqClient" backend/agent-service && exit 1 || true
git diff --check
```

- [ ] **Step 6: Commit the implementation**

```bash
git add backend/agent-service .env.example docker-compose.yml README.md frontend/src
git commit -m "feat: replace agent backend with langgraph tavily workflow" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 7: Push only after verification**

```bash
git push origin main
```

Confirm the pushed commit hash and leave `.env` untracked/ignored.

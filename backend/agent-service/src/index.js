import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

// ─── LangSmith tracing ────────────────────────────────────────────────────────
// Add these to your .env to enable tracing in LangSmith dashboard:
//
//   LANGCHAIN_TRACING_V2=true
//   LANGCHAIN_API_KEY=lsv2_pt_your_key_here
//   LANGCHAIN_PROJECT=mann-agent        ← project name in LangSmith (optional)
//
// LangChain SDK picks these up automatically — every graph.invoke() call
// will appear as a full trace (planner → search → final) in LangSmith.
// No other code changes are needed.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express'
import cors from 'cors'
import db, { agents, agentRuns, eq, and } from './db.js'
import { createAgentGraph } from './graph/core/agent-graph.js'
import { requestLogger } from './middleware/logger.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(requestLogger('agent-service'))

const PORT = process.env.PORT || 3004
const CHAT_SERVICE_URL  = process.env.CHAT_SERVICE_URL  || 'http://localhost:3002'
const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:3003'

const graph = createAgentGraph()

// ─── helpers ──────────────────────────────────────────────────────────────────

async function saveRun({ userId, request, status, output, error }) {
  const [run] = await db.insert(agentRuns).values({
    userId, request, status, output, error,
  }).returning({
    id: agentRuns.id,
    userId: agentRuns.userId,
    request: agentRuns.request,
    status: agentRuns.status,
    output: agentRuns.output,
    error: agentRuns.error,
    createdAt: agentRuns.createdAt,
    completedAt: agentRuns.completedAt,
  })
  return run
}

// Fetch last N messages for short-term memory context
async function fetchChatHistory(userId, conversationId, limit = 10) {
  if (!conversationId) return []
  try {
    const url = `${CHAT_SERVICE_URL}/messages/${userId}/${conversationId}?limit=${limit}`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return data.messages || []
  } catch {
    return []
  }
}

// Save a message to chat-service
async function saveMessage(userId, conversationId, role, content) {
  if (!conversationId) return
  try {
    await fetch(`${CHAT_SERVICE_URL}/messages/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, conversationId }),
    })
  } catch {
    // non-critical — don't fail the run
  }
}

// Upsert long-term memory summary to memory-service
async function upsertMemory(userId, key, value) {
  try {
    await fetch(`${MEMORY_SERVICE_URL}/memory/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, type: 'context' }),
    })
  } catch {
    // non-critical
  }
}

// Fetch long-term memories for context injection
async function fetchMemories(userId) {
  try {
    const res = await fetch(`${MEMORY_SERVICE_URL}/memory/${userId}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.memories || []).filter(m => m.type === 'context')
  } catch {
    return []
  }
}

// ─── routes ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ service: 'agent-service', status: 'ok', db: 'postgres' })
})

app.get('/agents/:userId', async (req, res) => {
  const rows = await db.select().from(agents).where(eq(agents.userId, Number(req.params.userId)))
  res.json({ agents: rows })
})

app.post('/agents/:userId', async (req, res) => {
  const { name, description, system_prompt } = req.body
  if (!name) return res.status(400).json({ message: 'name is required' })
  const [agent] = await db.insert(agents).values({
    userId: Number(req.params.userId),
    name,
    description: description ?? '',
    systemPrompt: system_prompt ?? '',
  }).returning({ id: agents.id })
  res.status(201).json({ id: agent.id, name, description, system_prompt, status: 'idle' })
})

app.patch('/agents/:userId/:agentId/status', async (req, res) => {
  const { status } = req.body
  if (!['idle', 'running', 'paused'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }
  await db.update(agents).set({ status }).where(and(
    eq(agents.id, Number(req.params.agentId)),
    eq(agents.userId, Number(req.params.userId)),
  ))
  res.json({ message: 'Status updated', status })
})

// POST /runs/:userId
// Body: { request, conversationId? }
app.post('/runs/:userId', async (req, res) => {
  const userId         = Number(req.params.userId)
  const request        = typeof req.body.request === 'string' ? req.body.request.trim() : ''
  const conversationId = req.body.conversationId ? Number(req.body.conversationId) : null

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'userId must be a positive integer' })
  }
  if (!request) {
    return res.status(400).json({ message: 'request is required' })
  }

  // ── console logs ────────────────────────────────────────────────────────────
  console.log('\n╔═════════════════════════════════════════')
  console.log('║ 📨 NEW RUN REQUEST')
  console.log(`║ userId         : ${userId}`)
  console.log(`║ conversationId : ${conversationId ?? 'none'}`)
  console.log(`║ input          : "${request}"`)
  console.log('╚═════════════════════════════════════════')
  const t0 = Date.now()
  // ───────────────────────────────────────────────────────────────────────────

  // 1. Fetch short-term history (last 10 messages)
  const chatHistory = await fetchChatHistory(userId, conversationId, 10)

  // 2. Fetch long-term memories (context type)
  const longTermMemories = await fetchMemories(userId)

  // ── console logs ────────────────────────────────────────────────────────────
  console.log(`║ 📚 short-term history : ${chatHistory.length} messages`)
  console.log(`║ 🧠 long-term memories : ${longTermMemories.length} items`)
  // ───────────────────────────────────────────────────────────────────────────

  try {
    // 3. Save user message
    await saveMessage(userId, conversationId, 'user', request)

    // 4. Run graph with history + memories as context
    const result = await graph.invoke({
      userInput:     request,
      chatHistory,
      longTermMemories,
    })

    // 5. Save assistant response
    await saveMessage(userId, conversationId, 'assistant', result.finalResponse)

    // 6. Upsert long-term memory — summarize what was discussed
    if (result.finalResponse) {
      const summaryKey = `last_topic_${userId}`
      const summaryVal = `User asked: "${request.slice(0, 200)}" | Answer summary: "${result.finalResponse.slice(0, 300)}"`
      await upsertMemory(userId, summaryKey, summaryVal)
    }

    // 7. Save run record
    const run = await saveRun({
      userId,
      request,
      status: 'completed',
      output: result.finalResponse,
      error: null,
    })

    // ── console logs ──────────────────────────────────────────────────────────
    console.log('╔═════════════════════════════════════════')
    console.log('║ ✅ RUN COMPLETED')
    console.log(`║ runId   : ${run.id}`)
    console.log(`║ sources : ${result.sources?.length ?? 0}`)
    console.log(`║ total   : ${Date.now() - t0}ms`)
    console.log('╚═════════════════════════════════════════\n')
    // ─────────────────────────────────────────────────────────────────────────

    res.status(201).json({ run, sources: result.sources })
  } catch (error) {
    // ── console logs ──────────────────────────────────────────────────────────
    console.error('╔═════════════════════════════════════════')
    console.error('║ ❌ RUN FAILED')
    console.error(`║ error  : ${error instanceof Error ? error.message : error}`)
    console.error(`║ total  : ${Date.now() - t0}ms`)
    console.error('╚═════════════════════════════════════════\n')
    // ─────────────────────────────────────────────────────────────────────────

    await saveRun({
      userId,
      request,
      status: 'failed',
      output: null,
      error: error instanceof Error ? error.message : 'Agent execution failed',
    })
    res.status(500).json({ message: 'Agent run failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Agent service running on http://localhost:${PORT}`)
})

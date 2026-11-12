import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import express from 'express'
import cors from 'cors'
import db, { agents, agentRuns, eq, and } from './db.js'
import { createGroqClient } from './llm/groq-client.js'
import { createAgentOrchestrator } from './orchestrator/agent-orchestrator.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3004
const groq = createGroqClient()
const orchestrator = createAgentOrchestrator({
  execute: async (request) => ({ output: await groq.complete(request) }),
  saveRun: async ({ userId, request, status, output, error }) => {
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
  },
})

app.get('/health', (req, res) => {
  res.json({ service: 'agent-service', status: 'ok', db: 'postgres' })
})

// Get all agents for a user
app.get('/agents/:userId', async (req, res) => {
  const rows = await db.select().from(agents).where(eq(agents.userId, Number(req.params.userId)))
  res.json({ agents: rows })
})

// Create a new agent
app.post('/agents/:userId', async (req, res) => {
  const { name, description, system_prompt } = req.body
  if (!name) return res.status(400).json({ message: 'name is required' })
  const [agent] = await db.insert(agents).values({
    userId: Number(req.params.userId),
    name,
    description: description ?? '',
    systemPrompt: system_prompt ?? '',
  }).returning({ id: agents.id })
  res.status(201).json({
    id: agent.id,
    name,
    description,
    system_prompt,
    status: 'idle',
  })
})

// Update agent status
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

app.post('/runs/:userId', async (req, res) => {
  const userId = Number(req.params.userId)

  try {
    const run = await orchestrator.run({ userId, request: req.body.request })
    res.status(201).json({ run })
  } catch (error) {
    if (error instanceof Error && (
      error.message === 'request is required' ||
      error.message.startsWith('userId')
    )) {
      return res.status(400).json({ message: error.message })
    }

    console.error('Agent run failed:', error)
    res.status(500).json({ message: 'Agent run failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Agent service running on http://localhost:${PORT}`)
})

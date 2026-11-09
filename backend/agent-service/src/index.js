import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import express from 'express'
import cors from 'cors'
import db from './db.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3004

app.get('/health', (req, res) => {
  res.json({ service: 'agent-service', status: 'ok', db: 'postgres' })
})

// Get all agents for a user
app.get('/agents/:userId', async (req, res) => {
  const result = await db.query(
    'SELECT * FROM agents WHERE user_id = $1',
    [req.params.userId]
  )
  res.json({ agents: result.rows })
})

// Create a new agent
app.post('/agents/:userId', async (req, res) => {
  const { name, description, system_prompt } = req.body
  if (!name) return res.status(400).json({ message: 'name is required' })
  const result = await db.query(
    'INSERT INTO agents (user_id, name, description, system_prompt) VALUES ($1, $2, $3, $4) RETURNING id',
    [req.params.userId, name, description ?? '', system_prompt ?? '']
  )
  res.status(201).json({
    id: result.rows[0].id,
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
  await db.query(
    'UPDATE agents SET status = $1 WHERE id = $2 AND user_id = $3',
    [status, req.params.agentId, req.params.userId]
  )
  res.json({ message: 'Status updated', status })
})

app.listen(PORT, () => {
  console.log(`Agent service running on http://localhost:${PORT}`)
})

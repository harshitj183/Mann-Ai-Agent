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

const PORT = process.env.PORT || 3002

app.get('/health', (req, res) => {
  res.json({ service: 'chat-service', status: 'ok', db: 'postgres' })
})

// Get chat history for a user
app.get('/messages/:userId', async (req, res) => {
  // 🔵 .rows — PostgreSQL result mein data .rows array mein hota hai
  const result = await db.query(
    'SELECT id, role, content, created_at FROM messages WHERE user_id = $1 ORDER BY created_at ASC',
    [req.params.userId]
  )
  res.json({ messages: result.rows })
})

// Save a new message
app.post('/messages/:userId', async (req, res) => {
  const { role, content } = req.body
  if (!role || !content) {
    return res.status(400).json({ message: 'role and content are required' })
  }
  // 🟢 RETURNING id — naya row ka id wapas lene ka PostgreSQL tarika
  const result = await db.query(
    'INSERT INTO messages (user_id, role, content) VALUES ($1, $2, $3) RETURNING id',
    [req.params.userId, role, content]
  )
  res.status(201).json({ id: result.rows[0].id, role, content })
})

app.listen(PORT, () => {
  console.log(`Chat service running on http://localhost:${PORT}`)
})

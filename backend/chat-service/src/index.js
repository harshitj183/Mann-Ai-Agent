import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import express from 'express'
import cors from 'cors'
import db, { asc, eq, messages } from './db.js'

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
  const rows = await db.select({
    id: messages.id,
    role: messages.role,
    content: messages.content,
    created_at: messages.createdAt,
  }).from(messages).where(eq(messages.userId, Number(req.params.userId))).orderBy(asc(messages.createdAt))
  res.json({ messages: rows })
})

// Save a new message
app.post('/messages/:userId', async (req, res) => {
  const { role, content } = req.body
  if (!role || !content) {
    return res.status(400).json({ message: 'role and content are required' })
  }
  // 🟢 RETURNING id — naya row ka id wapas lene ka PostgreSQL tarika
  const [message] = await db.insert(messages).values({
    userId: Number(req.params.userId), role, content,
  }).returning({ id: messages.id })
  res.status(201).json({ id: message.id, role, content })
})

app.listen(PORT, () => {
  console.log(`Chat service running on http://localhost:${PORT}`)
})

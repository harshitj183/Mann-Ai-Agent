import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import express from 'express'
import cors from 'cors'
import db, { asc, desc, eq, and, conversations, messages } from './db.js'
import { requestLogger } from './middleware/logger.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(requestLogger('chat-service'))

const PORT = process.env.PORT || 3002

app.get('/health', (req, res) => {
  res.json({ service: 'chat-service', status: 'ok', db: 'postgres' })
})

// ─── Conversations ────────────────────────────────────────────────────────────

// GET /conversations/:userId  — list all conversations (newest first)
app.get('/conversations/:userId', async (req, res) => {
  const rows = await db.select().from(conversations)
    .where(eq(conversations.userId, Number(req.params.userId)))
    .orderBy(desc(conversations.updatedAt))
  res.json({ conversations: rows })
})

// POST /conversations/:userId  — create a new conversation
app.post('/conversations/:userId', async (req, res) => {
  const { title = 'New conversation' } = req.body
  const [convo] = await db.insert(conversations).values({
    userId: Number(req.params.userId),
    title: title.slice(0, 100),
  }).returning()
  res.status(201).json({ conversation: convo })
})

// PATCH /conversations/:userId/:conversationId  — update title or updatedAt
app.patch('/conversations/:userId/:conversationId', async (req, res) => {
  const { title } = req.body
  const updates = { updatedAt: new Date() }
  if (title) updates.title = title.slice(0, 100)

  await db.update(conversations)
    .set(updates)
    .where(and(
      eq(conversations.id, Number(req.params.conversationId)),
      eq(conversations.userId, Number(req.params.userId)),
    ))
  res.json({ message: 'Conversation updated' })
})

// DELETE /conversations/:userId/:conversationId
app.delete('/conversations/:userId/:conversationId', async (req, res) => {
  await db.delete(conversations).where(and(
    eq(conversations.id, Number(req.params.conversationId)),
    eq(conversations.userId, Number(req.params.userId)),
  ))
  res.json({ message: 'Conversation deleted' })
})

// ─── Messages ─────────────────────────────────────────────────────────────────

// GET /messages/:userId/:conversationId  — get messages for a conversation
// ?limit=20  (default 20, short-term window for agent context)
app.get('/messages/:userId/:conversationId', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const rows = await db.select({
    id: messages.id,
    role: messages.role,
    content: messages.content,
    createdAt: messages.createdAt,
  }).from(messages)
    .where(and(
      eq(messages.userId, Number(req.params.userId)),
      eq(messages.conversationId, Number(req.params.conversationId)),
    ))
    .orderBy(asc(messages.createdAt))
    .limit(limit)
  res.json({ messages: rows })
})

// POST /messages/:userId  — save a message (user or assistant)
app.post('/messages/:userId', async (req, res) => {
  const { role, content, conversationId } = req.body
  if (!role || !content) {
    return res.status(400).json({ message: 'role and content are required' })
  }
  const [message] = await db.insert(messages).values({
    userId: Number(req.params.userId),
    conversationId: conversationId ? Number(conversationId) : null,
    role,
    content,
  }).returning({ id: messages.id })
  res.status(201).json({ id: message.id, role, content })
})

app.listen(PORT, () => {
  console.log(`Chat service running on http://localhost:${PORT}`)
})

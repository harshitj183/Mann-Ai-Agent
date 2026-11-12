import { Router } from 'express'
import db, { and, desc, eq, memories } from '../db.js'

const router = Router()

// GET /memory/:userId  — get all memories
router.get('/:userId', async (req, res) => {
  const rows = await db.select().from(memories)
    .where(eq(memories.userId, Number(req.params.userId)))
    .orderBy(desc(memories.createdAt))
  res.json({ memories: rows })
})

// POST /memory/:userId  — save or update a memory
router.post('/:userId', async (req, res) => {
  const { key, value, type = 'memory' } = req.body
  if (!key || !value) {
    return res.status(400).json({ message: 'key and value are required' })
  }
  // 🔵 ON CONFLICT — PostgreSQL ka upsert syntax (SQLite jaisa hi, bas $1 placeholders)
  await db.insert(memories).values({
    userId: Number(req.params.userId), key, value, type,
  }).onConflictDoUpdate({
    target: [memories.userId, memories.key],
    set: { value, type },
  })
  res.status(201).json({ key, value, type })
})

// DELETE /memory/:userId/:key  — remove a memory
router.delete('/:userId/:key', async (req, res) => {
  await db.delete(memories).where(and(
    eq(memories.userId, Number(req.params.userId)),
    eq(memories.key, req.params.key),
  ))
  res.json({ message: 'Memory deleted' })
})

export default router

import { Router } from 'express'
import db, { and, desc, eq, memories } from '../db.js'

const router = Router()

// GET /memory/:userId  — get all memories
router.get('/:userId', async (req, res) => {
  try {
    const rows = await db.select().from(memories)
      .where(eq(memories.userId, Number(req.params.userId)))
      .orderBy(desc(memories.createdAt))
    res.json({ memories: rows })
  } catch (err) {
    console.error('fetchMemories DB error:', err)
    res.status(500).json({ message: 'Failed to fetch memories' })
  }
})

// POST /memory/:userId  — save or update a memory
router.post('/:userId', async (req, res) => {
  try {
    const { key, value, type = 'memory' } = req.body
    if (!key || !value) {
      return res.status(400).json({ message: 'key and value are required' })
    }
    await db.insert(memories).values({
      userId: Number(req.params.userId), key, value, type,
    }).onConflictDoUpdate({
      target: [memories.userId, memories.key],
      set: { value, type, updatedAt: new Date() },
    })
    res.status(201).json({ key, value, type })
  } catch (err) {
    console.error('upsertMemory DB error:', err)
    res.status(500).json({ message: 'Failed to save memory' })
  }
})

// DELETE /memory/:userId/:key  — remove a memory
router.delete('/:userId/:key', async (req, res) => {
  try {
    await db.delete(memories).where(and(
      eq(memories.userId, Number(req.params.userId)),
      eq(memories.key, req.params.key),
    ))
    res.json({ message: 'Memory deleted' })
  } catch (err) {
    console.error('deleteMemory DB error:', err)
    res.status(500).json({ message: 'Failed to delete memory' })
  }
})

export default router

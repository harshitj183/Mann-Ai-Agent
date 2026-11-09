import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /memory/:userId  — get all memories
router.get('/:userId', async (req, res) => {
  const result = await db.query(
    'SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC',
    [req.params.userId]
  )
  res.json({ memories: result.rows })
})

// POST /memory/:userId  — save or update a memory
router.post('/:userId', async (req, res) => {
  const { key, value, type = 'memory' } = req.body
  if (!key || !value) {
    return res.status(400).json({ message: 'key and value are required' })
  }
  // 🔵 ON CONFLICT — PostgreSQL ka upsert syntax (SQLite jaisa hi, bas $1 placeholders)
  await db.query(
    `INSERT INTO memories (user_id, key, value, type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(user_id, key)
     DO UPDATE SET value = EXCLUDED.value, type = EXCLUDED.type`,
    [req.params.userId, key, value, type]
  )
  res.status(201).json({ key, value, type })
})

// DELETE /memory/:userId/:key  — remove a memory
router.delete('/:userId/:key', async (req, res) => {
  await db.query(
    'DELETE FROM memories WHERE user_id = $1 AND key = $2',
    [req.params.userId, req.params.key]
  )
  res.json({ message: 'Memory deleted' })
})

export default router

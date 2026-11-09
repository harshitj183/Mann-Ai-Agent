import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /skill/:userId  — get all skills
router.get('/:userId', async (req, res) => {
  const result = await db.query(
    'SELECT * FROM skills WHERE user_id = $1 ORDER BY created_at DESC',
    [req.params.userId]
  )
  res.json({ skills: result.rows })
})

// GET /skill/:userId/:skillId  — get one skill
router.get('/:userId/:skillId', async (req, res) => {
  const result = await db.query(
    'SELECT * FROM skills WHERE id = $1 AND user_id = $2',
    [req.params.skillId, req.params.userId]
  )
  if (result.rows.length === 0) return res.status(404).json({ message: 'Skill not found' })
  res.json({ skill: result.rows[0] })
})

// POST /skill/:userId  — create a skill
router.post('/:userId', async (req, res) => {
  const { name, description = '', code = '' } = req.body
  if (!name) return res.status(400).json({ message: 'name is required' })
  const result = await db.query(
    'INSERT INTO skills (user_id, name, description, code) VALUES ($1, $2, $3, $4) RETURNING id',
    [req.params.userId, name, description, code]
  )
  res.status(201).json({ id: result.rows[0].id, name, description, code })
})

// PUT /skill/:userId/:skillId  — update a skill
router.put('/:userId/:skillId', async (req, res) => {
  const existing = await db.query(
    'SELECT * FROM skills WHERE id = $1 AND user_id = $2',
    [req.params.skillId, req.params.userId]
  )
  if (existing.rows.length === 0) return res.status(404).json({ message: 'Skill not found' })

  const skill = existing.rows[0]
  const { name = skill.name, description = skill.description, code = skill.code } = req.body

  await db.query(
    'UPDATE skills SET name = $1, description = $2, code = $3 WHERE id = $4 AND user_id = $5',
    [name, description, code, req.params.skillId, req.params.userId]
  )
  res.json({ id: Number(req.params.skillId), name, description, code })
})

// DELETE /skill/:userId/:skillId  — delete a skill
router.delete('/:userId/:skillId', async (req, res) => {
  await db.query(
    'DELETE FROM skills WHERE id = $1 AND user_id = $2',
    [req.params.skillId, req.params.userId]
  )
  res.json({ message: 'Skill deleted' })
})

export default router

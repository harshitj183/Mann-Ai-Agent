import { Router } from 'express'
import db, { and, desc, eq, skills } from '../db.js'

const router = Router()

// GET /skill/:userId  — get all skills
router.get('/:userId', async (req, res) => {
  const rows = await db.select().from(skills)
    .where(eq(skills.userId, Number(req.params.userId)))
    .orderBy(desc(skills.createdAt))
  res.json({ skills: rows })
})

// GET /skill/:userId/:skillId  — get one skill
router.get('/:userId/:skillId', async (req, res) => {
  const [skill] = await db.select().from(skills).where(and(
    eq(skills.id, Number(req.params.skillId)),
    eq(skills.userId, Number(req.params.userId)),
  ))
  if (!skill) return res.status(404).json({ message: 'Skill not found' })
  res.json({ skill })
})

// POST /skill/:userId  — create a skill
router.post('/:userId', async (req, res) => {
  const { name, description = '', code = '' } = req.body
  if (!name) return res.status(400).json({ message: 'name is required' })
  const [skill] = await db.insert(skills).values({
    userId: Number(req.params.userId), name, description, code,
  }).returning({ id: skills.id })
  res.status(201).json({ id: skill.id, name, description, code })
})

// PUT /skill/:userId/:skillId  — update a skill
router.put('/:userId/:skillId', async (req, res) => {
  const [skill] = await db.select().from(skills).where(and(
    eq(skills.id, Number(req.params.skillId)),
    eq(skills.userId, Number(req.params.userId)),
  ))
  if (!skill) return res.status(404).json({ message: 'Skill not found' })
  const { name = skill.name, description = skill.description, code = skill.code } = req.body

  await db.update(skills).set({ name, description, code }).where(and(
    eq(skills.id, Number(req.params.skillId)),
    eq(skills.userId, Number(req.params.userId)),
  ))
  res.json({ id: Number(req.params.skillId), name, description, code })
})

// DELETE /skill/:userId/:skillId  — delete a skill
router.delete('/:userId/:skillId', async (req, res) => {
  await db.delete(skills).where(and(
    eq(skills.id, Number(req.params.skillId)),
    eq(skills.userId, Number(req.params.userId)),
  ))
  res.json({ message: 'Skill deleted' })
})

export default router

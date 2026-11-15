import { Router } from 'express'
import db, { and, desc, eq, sql, users } from '../db.js'

const router = Router()

// GET /memory/:userId or /profile/:userId  — get user profile and facts
router.get('/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const [row] = await db.select({ profile: users.profile }).from(users)
      .where(eq(users.id, userId))

    const profile = row?.profile || {}
    const memoriesList = Object.entries(profile).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      type: 'fact',
    }))

    res.json({
      userId,
      profile,
      memories: memoriesList,
    })
  } catch (err) {
    console.error('fetchProfile DB error:', err)
    res.status(500).json({ message: 'Failed to fetch user profile' })
  }
})

// POST /memory/:userId or /profile/:userId  — save or update individual fact or profile JSON
router.post('/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const { key, value, profile: incomingProfile, type = 'fact' } = req.body

    let patch = {}
    if (key && value !== undefined) {
      patch[key] = value
    }
    if (incomingProfile && typeof incomingProfile === 'object') {
      patch = { ...patch, ...incomingProfile }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'key and value or profile object are required' })
    }

    await db.update(users)
      .set({
        profile: sql`${users.profile} || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    res.status(201).json({ key, value, type, profile: patch })
  } catch (err) {
    console.error('upsertProfile DB error:', err)
    res.status(500).json({ message: 'Failed to save profile fact' })
  }
})

// DELETE /memory/:userId/:key  — remove an individual fact from profile
router.delete('/:userId/:key', async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const key = req.params.key

    await db.update(users)
      .set({
        profile: sql`${users.profile} - ${key}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    res.json({ message: 'Fact deleted from user profile', key })
  } catch (err) {
    console.error('deleteProfileFact DB error:', err)
    res.status(500).json({ message: 'Failed to delete fact from user profile' })
  }
})

export default router



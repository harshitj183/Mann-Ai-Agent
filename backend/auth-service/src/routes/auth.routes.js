import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db, { eq, users, userSessions } from '../db.js'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/constants.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()
const AUTH_COOKIE = 'mann_auth'
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
}

// POST /signup
router.post('/signup', async (req, res) => {
  const { name, email, password, avatar = null } = req.body

  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' })

  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' })

  // 🔵 $1 placeholder — PostgreSQL style (SQLite mein ? tha)
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (existing.length > 0)
    return res.status(409).json({ message: 'User already exists with this email' })

  const hashed = await bcrypt.hash(password, 10)

  // 🟢 RETURNING id — PostgreSQL mein lastInsertRowid nahi hota, RETURNING use karo
  const { user, token } = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({
      name, email, passwordHash: hashed, avatar,
    }).returning({
      id: users.id, name: users.name, email: users.email, avatar: users.avatar,
    })
    const token = jwt.sign({ id: created.id, email: created.email, name: created.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
    await tx.insert(userSessions).values({
      userId: created.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    return { user: created, token }
  })

  res.cookie(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS)
  res.status(201).json({
    message: 'User created successfully',
    user,
  })
})

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password)
    return res.status(400).json({ message: 'All fields are required' })

  const [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user) return res.status(401).json({ message: 'Invalid email or password' })

  const isMatch = await bcrypt.compare(password, user.passwordHash)
  if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' })

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
  await db.insert(userSessions).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  res.cookie(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS)
  res.json({
    message: 'Login successful',
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
  })
})

router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...AUTH_COOKIE_OPTIONS, maxAge: undefined })
  res.json({ message: 'Logout successful' })
})

// GET /verify  (called internally by api-gateway)
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user })
})

// GET /me  (protected — returns current user info)
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user })
})

export default router

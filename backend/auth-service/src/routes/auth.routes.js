import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/constants.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

// POST /signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' })

  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' })

  // 🔵 $1 placeholder — PostgreSQL style (SQLite mein ? tha)
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0)
    return res.status(409).json({ message: 'User already exists with this email' })

  const hashed = await bcrypt.hash(password, 10)

  // 🟢 RETURNING id — PostgreSQL mein lastInsertRowid nahi hota, RETURNING use karo
  const result = await db.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
    [name, email, hashed]
  )
  const userId = result.rows[0].id

  const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await db.query(
    'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  )

  res.status(201).json({
    message: 'User created successfully',
    token,
    user: { id: userId, name, email },
  })
})

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password)
    return res.status(400).json({ message: 'All fields are required' })

  const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
  const user = result.rows[0]
  if (!user) return res.status(401).json({ message: 'Invalid email or password' })

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' })

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await db.query(
    'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt]
  )

  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email },
  })
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

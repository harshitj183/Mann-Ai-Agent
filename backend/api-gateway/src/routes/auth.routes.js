import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { forwardToService } from '../utils/forward.js'
import { SERVICES } from '../config/services.js'

const router = Router()

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { status, data } = await forwardToService(SERVICES.auth, '/signup', 'POST', req.body)
  res.status(status).json(data)
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { status, data } = await forwardToService(SERVICES.auth, '/login', 'POST', req.body)
  res.status(status).json(data)
})

// GET /api/auth/me  (protected)
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user })
})

export default router

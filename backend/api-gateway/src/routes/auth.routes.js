import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { forwardToService } from '../utils/forward.js'
import { SERVICES } from '../config/services.js'

const router = Router()

export function copyAuthCookie(serviceResponse, clientResponse) {
  const cookie = serviceResponse.headers?.get('set-cookie')
  if (cookie) clientResponse.setHeader('Set-Cookie', cookie)
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { status, data, headers } = await forwardToService(SERVICES.auth, '/signup', 'POST', req.body)
  copyAuthCookie({ headers }, res)
  res.status(status).json(data)
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { status, data, headers } = await forwardToService(SERVICES.auth, '/login', 'POST', req.body)
  copyAuthCookie({ headers }, res)
  res.status(status).json(data)
})

router.post('/logout', async (req, res) => {
  const { status, data, headers } = await forwardToService(SERVICES.auth, '/logout', 'POST', null)
  copyAuthCookie({ headers }, res)
  res.status(status).json(data)
})

// GET /api/auth/me  (protected)
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user })
})

export default router

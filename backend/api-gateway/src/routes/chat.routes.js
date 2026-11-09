import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { forwardToService } from '../utils/forward.js'
import { SERVICES } from '../config/services.js'

const router = Router()

// All chat routes are protected
router.use(authenticateToken)

// GET /api/chat/messages
router.get('/messages', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.chat, `/messages/${req.user.id}`, 'GET', null
  )
  res.status(status).json(data)
})

// POST /api/chat/message
router.post('/message', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.chat, `/messages/${req.user.id}`, 'POST', req.body
  )
  res.status(status).json(data)
})

export default router

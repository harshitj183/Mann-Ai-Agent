import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { forwardToService } from '../utils/forward.js'
import { SERVICES } from '../config/services.js'

const router = Router()

// All chat routes are protected
router.use(authenticateToken)

// ─── Conversations ────────────────────────────────────────────────────────────

// GET  /api/chat/conversations
router.get('/conversations', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.chat, `/conversations/${req.user.id}`, 'GET', null
  )
  res.status(status).json(data)
})

// POST /api/chat/conversations
router.post('/conversations', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.chat, `/conversations/${req.user.id}`, 'POST', req.body
  )
  res.status(status).json(data)
})

// PATCH /api/chat/conversations/:conversationId
router.patch('/conversations/:conversationId', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.chat, `/conversations/${req.user.id}/${req.params.conversationId}`, 'PATCH', req.body
  )
  res.status(status).json(data)
})

// GET /api/chat/conversations/:conversationId/session  — get session summary
router.get('/conversations/:conversationId/session', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.chat, `/conversations/${req.user.id}/${req.params.conversationId}/session`, 'GET', null
  )
  res.status(status).json(data)
})

// DELETE /api/chat/conversations/:conversationId
router.delete('/conversations/:conversationId', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.chat, `/conversations/${req.user.id}/${req.params.conversationId}`, 'DELETE', null
  )
  res.status(status).json(data)
})

// ─── Messages ─────────────────────────────────────────────────────────────────

// GET /api/chat/messages/:conversationId
router.get('/messages/:conversationId', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.chat, `/messages/${req.user.id}/${req.params.conversationId}`, 'GET', null
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

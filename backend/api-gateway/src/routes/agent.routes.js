import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { forwardToService } from '../utils/forward.js'
import { SERVICES } from '../config/services.js'

const router = Router()

router.use(authenticateToken)

// GET /api/agents
router.get('/', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.agent, `/agents/${req.user.id}`, 'GET', null
  )
  res.status(status).json(data)
})

// POST /api/agents
router.post('/', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.agent, `/agents/${req.user.id}`, 'POST', req.body
  )
  res.status(status).json(data)
})

// PATCH /api/agents/:agentId/status
router.patch('/:agentId/status', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.agent, `/agents/${req.user.id}/${req.params.agentId}/status`, 'PATCH', req.body
  )
  res.status(status).json(data)
})

export default router

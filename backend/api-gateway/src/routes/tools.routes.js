import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { forwardToService } from '../utils/forward.js'
import { SERVICES } from '../config/services.js'

const router = Router()

router.use(authenticateToken)

// GET /api/tools
router.get('/', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.tools, '/tools', 'GET', null
  )
  res.status(status).json(data)
})

// POST /api/tools/execute
router.post('/execute', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.tools, '/execute', 'POST', req.body
  )
  res.status(status).json(data)
})

export default router

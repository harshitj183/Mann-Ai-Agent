import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { forwardToService } from '../utils/forward.js'
import { SERVICES } from '../config/services.js'

const router = Router()

router.use(authenticateToken)

// ---- Memory ----

// GET /api/memory
router.get('/', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.memory, `/memory/${req.user.id}`, 'GET', null
  )
  res.status(status).json(data)
})

// POST /api/memory
router.post('/', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.memory, `/memory/${req.user.id}`, 'POST', req.body
  )
  res.status(status).json(data)
})

// DELETE /api/memory/:key
router.delete('/:key', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.memory, `/memory/${req.user.id}/${req.params.key}`, 'DELETE', null
  )
  res.status(status).json(data)
})

// ---- Skill (sub-service inside memory-service) ----

// GET /api/memory/skill
router.get('/skill', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.memory, `/skill/${req.user.id}`, 'GET', null
  )
  res.status(status).json(data)
})

// POST /api/memory/skill
router.post('/skill', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.memory, `/skill/${req.user.id}`, 'POST', req.body
  )
  res.status(status).json(data)
})

// PUT /api/memory/skill/:skillId
router.put('/skill/:skillId', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.memory, `/skill/${req.user.id}/${req.params.skillId}`, 'PUT', req.body
  )
  res.status(status).json(data)
})

// DELETE /api/memory/skill/:skillId
router.delete('/skill/:skillId', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.memory, `/skill/${req.user.id}/${req.params.skillId}`, 'DELETE', null
  )
  res.status(status).json(data)
})

export default router

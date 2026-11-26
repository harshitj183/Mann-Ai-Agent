import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { forwardToService }  from '../utils/forward.js'
import { forwardBinary }     from '../utils/forwardBinary.js'
import { SERVICES } from '../config/services.js'

const router = Router()
router.use(authenticateToken)

// ═══════════════════════════════════════════════════════════════════════════════
//  WRITE MODE — input is JSON, output is a binary file
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/execution/write/html-to-pdf
// Body: { html: string, options?: { format, landscape, margin } }
// Returns: application/pdf
router.post('/write/html-to-pdf', async (req, res) => {
  await forwardBinary(res, SERVICES.execution, '/write/html-to-pdf', req.body)
})

// POST /api/execution/write/code-to-zip
// Body: { files: Record<string, string>, options?: { level } }
// Returns: application/zip
router.post('/write/code-to-zip', async (req, res) => {
  await forwardBinary(res, SERVICES.execution, '/write/code-to-zip', req.body)
})

// POST /api/execution/write/html-to-image
// Body: { html: string, options?: { width, height, format: 'png'|'gif' } }
// Returns: image/png or image/gif
router.post('/write/html-to-image', async (req, res) => {
  await forwardBinary(res, SERVICES.execution, '/write/html-to-image', req.body)
})

// ═══════════════════════════════════════════════════════════════════════════════
//  READ MODE — file sent as base64 string in JSON body, output is JSON
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/execution/read/parse-pdf
// Body: { base64: string }  (base64-encoded PDF bytes)
// Returns: { text, pages }
router.post('/read/parse-pdf', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.execution, '/read/parse-pdf', 'POST', req.body
  )
  res.status(status).json(data)
})

// POST /api/execution/read/parse-csv
// Body: { base64: string, columns?: bool, delimiter?: string }
// Returns: { rows, count }
router.post('/read/parse-csv', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.execution, '/read/parse-csv', 'POST', req.body
  )
  res.status(status).json(data)
})

// POST /api/execution/read/parse-docx
// Body: { base64: string }
// Returns: { text, messages }
router.post('/read/parse-docx', async (req, res) => {
  const { status, data } = await forwardToService(
    SERVICES.execution, '/read/parse-docx', 'POST', req.body
  )
  res.status(status).json(data)
})

export default router

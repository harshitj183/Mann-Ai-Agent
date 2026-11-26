import { Router } from 'express'
import multer from 'multer'
import { parsePdf }  from '../read/parse-pdf.js'
import { parseCsv }  from '../read/parse-csv.js'
import { parseDocx } from '../read/parse-docx.js'

const router  = Router()

// Store uploads in memory — no disk I/O, keeping the service stateless.
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 }, // 50 MB
})

// ─── POST /read/parse-pdf ─────────────────────────────────────────────────────
// Accepts multipart file (field: file) OR JSON body { base64: string }
// Returns: { text, pages }
router.post('/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    const buffer = resolveBuffer(req, 'pdf')
    console.log(`\n┌─ READ parse-pdf — ${buffer.length} bytes`)
    const t0     = Date.now()
    const result = await parsePdf(buffer)
    console.log(`└─ ✅ ${result.pages} page(s), ${result.text.length} chars (${Date.now() - t0}ms)`)
    res.json(result)
  } catch (err) {
    console.error(`❌ [execution-service] parse-pdf failed: ${err.message}`)
    res.status(err.status || 400).json({ message: err.message })
  }
})

// ─── POST /read/parse-csv ─────────────────────────────────────────────────────
// Accepts multipart file (field: file) OR JSON body { base64: string }
// Optional query params / body fields: columns (bool), delimiter (string)
// Returns: { rows, count }
router.post('/parse-csv', upload.single('file'), async (req, res) => {
  try {
    const buffer  = resolveBuffer(req, 'csv')
    const options = {
      columns:   req.body.columns   !== 'false',
      delimiter: req.body.delimiter || ',',
    }
    console.log(`\n┌─ READ parse-csv — ${buffer.length} bytes, delimiter: "${options.delimiter}"`)
    const t0     = Date.now()
    const result = await parseCsv(buffer, options)
    console.log(`└─ ✅ ${result.count} rows (${Date.now() - t0}ms)`)
    res.json(result)
  } catch (err) {
    console.error(`❌ [execution-service] parse-csv failed: ${err.message}`)
    res.status(err.status || 400).json({ message: err.message })
  }
})

// ─── POST /read/parse-docx ────────────────────────────────────────────────────
// Accepts multipart file (field: file) OR JSON body { base64: string }
// Returns: { text, messages }
router.post('/parse-docx', upload.single('file'), async (req, res) => {
  try {
    const buffer = resolveBuffer(req, 'docx')
    console.log(`\n┌─ READ parse-docx — ${buffer.length} bytes`)
    const t0     = Date.now()
    const result = await parseDocx(buffer)
    console.log(`└─ ✅ ${result.text.length} chars (${Date.now() - t0}ms)`)
    res.json(result)
  } catch (err) {
    console.error(`❌ [execution-service] parse-docx failed: ${err.message}`)
    res.status(err.status || 400).json({ message: err.message })
  }
})

export default router

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a file buffer from either a multer upload or a JSON base64 field.
 * Throws an error with .status = 400 if neither is present.
 */
function resolveBuffer(req, type) {
  if (req.file?.buffer) return req.file.buffer

  if (req.body?.base64) {
    return Buffer.from(req.body.base64, 'base64')
  }

  const err = new Error(
    `No file provided. Send a multipart upload (field: "file") or JSON body { base64: "<${type}_base64>" }`
  )
  err.status = 400
  throw err
}

import { Router } from 'express'
import { htmlToPdf }   from '../write/html-to-pdf.js'
import { codeToZip }   from '../write/code-to-zip.js'
import { htmlToImage } from '../write/html-to-image.js'

const router = Router()

// ─── POST /write/html-to-pdf ─────────────────────────────────────────────────
// Body: { html: string, options?: { format, landscape, margin } }
// Returns: application/pdf binary
router.post('/html-to-pdf', async (req, res) => {
  const { html, options = {} } = req.body

  if (typeof html !== 'string' || !html.trim()) {
    return res.status(400).json({ message: 'html (string) is required' })
  }

  try {
    console.log(`\n┌─ WRITE html-to-pdf — format: ${options.format || 'A4'}`)
    const t0     = Date.now()
    const buffer = await htmlToPdf(html, options)
    console.log(`└─ ✅ done ${buffer.length} bytes (${Date.now() - t0}ms)`)

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'inline; filename="output.pdf"',
      'Content-Length':      buffer.length,
    })
    res.end(buffer)
  } catch (err) {
    console.error(`❌ [execution-service] html-to-pdf failed: ${err.message}`)
    res.status(500).json({ message: err.message })
  }
})

// ─── POST /write/code-to-zip ──────────────────────────────────────────────────
// Body: { files: Record<string, string>, options?: { level } }
// Returns: application/zip binary
router.post('/code-to-zip', async (req, res) => {
  const { files, options = {} } = req.body

  if (!files || typeof files !== 'object' || Array.isArray(files)) {
    return res.status(400).json({ message: 'files must be a plain object { filename: content }' })
  }
  if (Object.keys(files).length === 0) {
    return res.status(400).json({ message: 'files object is empty' })
  }

  try {
    console.log(`\n┌─ WRITE code-to-zip — ${Object.keys(files).length} file(s)`)
    const t0     = Date.now()
    const buffer = await codeToZip(files, options)
    console.log(`└─ ✅ done ${buffer.length} bytes (${Date.now() - t0}ms)`)

    res.set({
      'Content-Type':        'application/zip',
      'Content-Disposition': 'attachment; filename="output.zip"',
      'Content-Length':      buffer.length,
    })
    res.end(buffer)
  } catch (err) {
    console.error(`❌ [execution-service] code-to-zip failed: ${err.message}`)
    res.status(500).json({ message: err.message })
  }
})

// ─── POST /write/html-to-image ────────────────────────────────────────────────
// Body: { html: string, options?: { width, height, format: 'png'|'gif' } }
// Returns: image/png or image/gif binary
router.post('/html-to-image', async (req, res) => {
  const { html, options = {} } = req.body

  if (typeof html !== 'string' || !html.trim()) {
    return res.status(400).json({ message: 'html (string) is required' })
  }

  const format = options.format || 'png'
  if (!['png', 'gif'].includes(format)) {
    return res.status(400).json({ message: 'options.format must be "png" or "gif"' })
  }

  try {
    console.log(`\n┌─ WRITE html-to-image — format: ${format}`)
    const t0     = Date.now()
    const buffer = await htmlToImage(html, options)
    console.log(`└─ ✅ done ${buffer.length} bytes (${Date.now() - t0}ms)`)

    res.set({
      'Content-Type':        format === 'gif' ? 'image/gif' : 'image/png',
      'Content-Disposition': `inline; filename="output.${format}"`,
      'Content-Length':      buffer.length,
    })
    res.end(buffer)
  } catch (err) {
    console.error(`❌ [execution-service] html-to-image failed: ${err.message}`)
    res.status(500).json({ message: err.message })
  }
})

export default router

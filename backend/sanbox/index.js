import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import express from 'express'
import cors from 'cors'
import multer from 'multer'

import { writeModePDF }   from './executors/write-pdf.js'
import { writeModeZIP }   from './executors/write-zip.js'
import { writeModeImage } from './executors/write-image.js'
import { readModeText }   from './executors/read-text.js'
import { readModeJSON }   from './executors/read-json.js'

const app    = express()
const PORT   = process.env.EXECUTION_SERVICE_PORT || 3006
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json({ limit: '20mb' }))

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ service: 'execution-service', status: 'ok' })
})

// ─── WRITE MODE ───────────────────────────────────────────────────────────────
// POST /execute/write
// Body (JSON): { mode: 'pdf'|'zip'|'png'|'gif', input: { ... } }
app.post('/execute/write', async (req, res) => {
  const { mode, input } = req.body

  if (!mode)  return res.status(400).json({ message: 'mode is required (pdf | zip | png | gif)' })
  if (!input) return res.status(400).json({ message: 'input is required' })

  console.log(`\n┌─────────────────────────────────────────`)
  console.log(`│ ✍️  WRITE MODE  →  ${mode.toUpperCase()}`)
  console.log(`└─────────────────────────────────────────`)

  try {
    let result

    switch (mode.toLowerCase()) {
      case 'pdf':
        result = await writeModePDF(input)
        break
      case 'zip':
        result = await writeModeZIP(input)
        break
      case 'png':
      case 'gif':
        result = await writeModeImage(input, mode)
        break
      default:
        return res.status(400).json({ message: `Unsupported write mode: "${mode}"` })
    }

    // result = { buffer: Buffer, mimeType: string, filename: string }
    res.set('Content-Type', result.mimeType)
    res.set('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.buffer)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Write execution failed'
    console.error(`❌ [execution-service] write/${mode} failed: ${message}`)
    res.status(500).json({ mode, status: 'error', message })
  }
})

// ─── READ/PARSE MODE ──────────────────────────────────────────────────────────
// POST /execute/read
// Multipart: field "file" + field "mode" (text | json)
app.post('/execute/read', upload.single('file'), async (req, res) => {
  const mode = req.body?.mode || 'text'
  const file = req.file

  if (!file) return res.status(400).json({ message: 'file upload is required' })

  console.log(`\n┌─────────────────────────────────────────`)
  console.log(`│ 📖 READ MODE  →  ${mode.toUpperCase()}`)
  console.log(`│ filename : ${file.originalname}  (${file.size} bytes)`)
  console.log(`└─────────────────────────────────────────`)

  try {
    let result

    switch (mode.toLowerCase()) {
      case 'text':
        result = await readModeText(file)
        break
      case 'json':
        result = await readModeJSON(file)
        break
      default:
        return res.status(400).json({ message: `Unsupported read mode: "${mode}"` })
    }

    res.json({ status: 'success', filename: file.originalname, mode, output: result })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Read execution failed'
    console.error(`❌ [execution-service] read/${mode} failed: ${message}`)
    res.status(500).json({ mode, status: 'error', message })
  }
})

app.listen(PORT, () => {
  console.log(`Execution service running on http://localhost:${PORT}`)
})

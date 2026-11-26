import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import express from 'express'
import cors from 'cors'
import { requestLogger } from './middleware/logger.js'
import writeRoutes from './routes/write.routes.js'
import readRoutes  from './routes/read.routes.js'

const app  = express()
const PORT = process.env.PORT || 3006

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(requestLogger('execution-service'))

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ service: 'execution-service', status: 'ok', port: PORT })
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/write', writeRoutes)
app.use('/read',  readRoutes)

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` })
})

app.listen(PORT, () => {
  console.log(`Execution service running on http://localhost:${PORT}`)
  console.log('  POST /write/html-to-pdf    → returns application/pdf')
  console.log('  POST /write/code-to-zip    → returns application/zip')
  console.log('  POST /write/html-to-image  → returns image/png or image/gif')
  console.log('  POST /read/parse-pdf       → returns { text }')
  console.log('  POST /read/parse-csv       → returns { rows }')
  console.log('  POST /read/parse-docx      → returns { text }')
})

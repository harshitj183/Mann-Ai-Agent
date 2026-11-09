import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import express from 'express'
import cors from 'cors'
import memoryRouter from './memory/router.js'
import skillRouter from './skill/router.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3003

app.get('/health', (req, res) => {
  res.json({
    service: 'memory-service',
    status: 'ok',
    db: 'postgres',
    sub_services: ['memory', 'skill'],
  })
})

app.use('/memory', memoryRouter)
app.use('/skill', skillRouter)

app.listen(PORT, () => {
  console.log(`Memory service running on http://localhost:${PORT}`)
  console.log('  /memory/:userId  — memory store')
  console.log('  /skill/:userId   — skill store')
})

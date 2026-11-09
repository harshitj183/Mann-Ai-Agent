import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import { PORT } from './config/constants.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'ok', db: 'postgres' })
})

app.use('/', authRoutes)

app.listen(PORT, () => {
  console.log(`Auth service  →  http://localhost:${PORT}`)
  console.log(`Database      →  PostgreSQL (justpostgres)`)
})

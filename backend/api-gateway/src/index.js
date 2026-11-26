import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { SERVICES } from './config/services.js'
import authRoutes   from './routes/auth.routes.js'
import chatRoutes   from './routes/chat.routes.js'
import agentRoutes  from './routes/agent.routes.js'
import memoryRoutes from './routes/memory.routes.js'
import toolsRoutes  from './routes/tools.routes.js'
import executionRoutes from './routes/execution.routes.js'
import { requestLogger } from './middleware/logger.js'

const app = express()
const HOST = process.env.SERVICE_HOST || 'localhost'
app.use(cors({
  origin: process.env.FRONTEND_URL || `http://${HOST}:8000`,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use(requestLogger('api-gateway'))

const PORT = process.env.PORT || 5000

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'ok',
    port: PORT,
    services: SERVICES,
  })
})

// ---- Mount routes ----
app.use('/api/auth',   authRoutes)
app.use('/api/chat',   chatRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/tools',      toolsRoutes)
app.use('/api/execution', executionRoutes)

// ---- 404 fallback ----
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` })
})

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`)
  console.log('  /api/auth    → auth-service:3001')
  console.log('  /api/chat    → chat-service:3002')
  console.log('  /api/agents  → agent-service:3004')
  console.log('  /api/memory  → memory-service:3003 (+ /skill)')
  console.log('  /api/tools       → tools-service:3005')
  console.log('  /api/execution   → execution-service:3006')
})

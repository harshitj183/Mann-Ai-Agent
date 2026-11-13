import express from 'express'
import cors from 'cors'
import { requestLogger } from './middleware/logger.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(requestLogger('tools-service'))

const PORT = process.env.PORT || 3005

// Registry of available tools/MCP integrations
const TOOLS = [
  { id: 'web-search', name: 'Web Search', description: 'Search the web', type: 'mcp', enabled: true },
  { id: 'code-exec', name: 'Code Executor', description: 'Execute code snippets', type: 'mcp', enabled: true },
  { id: 'file-reader', name: 'File Reader', description: 'Read and parse files', type: 'tool', enabled: true },
  { id: 'db-query', name: 'DB Query', description: 'Run read-only DB queries', type: 'tool', enabled: false },
]

app.get('/health', (req, res) => {
  res.json({ service: 'tools-service', status: 'ok' })
})

// Get all available tools
app.get('/tools', (req, res) => {
  res.json({ tools: TOOLS })
})

// Execute a tool
app.post('/execute', (req, res) => {
  const { toolId, input } = req.body
  if (!toolId) return res.status(400).json({ message: 'toolId is required' })

  const tool = TOOLS.find((t) => t.id === toolId)
  if (!tool) return res.status(404).json({ message: 'Tool not found' })
  if (!tool.enabled) return res.status(403).json({ message: 'Tool is disabled' })

  // Placeholder execution — integrate real MCP here
  res.json({
    toolId,
    input,
    output: `[${tool.name}] executed with input: ${JSON.stringify(input)}`,
    status: 'success',
  })
})

app.listen(PORT, () => {
  console.log(`Tools/MCP service running on http://localhost:${PORT}`)
})

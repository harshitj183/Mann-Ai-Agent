import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import express from 'express'
import cors from 'cors'
import { tavily } from '@tavily/core'
import { create, all } from 'mathjs'
import { requestLogger } from './middleware/logger.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(requestLogger('tools-service'))

const PORT = process.env.PORT || 3005

// ─── mathjs (sandboxed) ───────────────────────────────────────────────────────
const math = create(all)
math.import({
  import:     () => { throw new Error('disabled') },
  createUnit: () => { throw new Error('disabled') },
}, { override: true })

// ─── Tavily client ────────────────────────────────────────────────────────────
const TAVILY_API_KEY  = process.env.TAVILY_API_KEY
const TAVILY_MAX_RESULTS = Number(process.env.TAVILY_MAX_RESULTS || 5)

// ─── Tool registry ────────────────────────────────────────────────────────────
const TOOLS = [
  {
    id:          'web-search',
    name:        'Web Search',
    description: 'Search the web for current information using Tavily',
    type:        'builtin',
    enabled:     true,
    input: {
      queries:    'string[]  — search queries to run',
      maxResults: 'number    — max results per query (optional, default 5)',
    },
  },
  {
    id:          'calculator',
    name:        'Calculator',
    description: 'Evaluate a mathjs expression precisely',
    type:        'builtin',
    enabled:     true,
    input: {
      expression: 'string — valid mathjs expression, e.g. "10000000 * 83.5"',
    },
  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizeSearchResults(results) {
  const byUrl = new Map()
  for (const r of results) {
    if (typeof r?.url !== 'string' || !r.url.trim()) continue
    const url = r.url.trim()
    if (!byUrl.has(url)) {
      byUrl.set(url, {
        title:   typeof r.title   === 'string' ? r.title.trim()   : '',
        url,
        content: typeof r.content === 'string' ? r.content.trim() : '',
        score:   typeof r.score   === 'number' ? r.score          : null,
      })
    }
  }
  return [...byUrl.values()]
}

async function executeWebSearch({ queries, maxResults }) {
  if (!TAVILY_API_KEY) throw new Error('TAVILY_API_KEY is not configured')
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error('queries must be a non-empty array of strings')
  }

  const limit  = typeof maxResults === 'number' ? maxResults : TAVILY_MAX_RESULTS
  const client = tavily({ apiKey: TAVILY_API_KEY })

  console.log('\n┌─────────────────────────────────────────')
  console.log('│ 🔍 WEB SEARCH  →  Tavily API')
  console.log(`│ queries (${queries.length}): ${JSON.stringify(queries)}`)
 
 
  
  const allResults = []
  for (const [i, query] of queries.entries()) {
    const t0 = Date.now()
    console.log(`│   [${i + 1}/${queries.length}] searching: "${query}" ...`)
    const response = await client.search(query, { maxResults: limit })
    allResults.push(...(response.results || []))
    console.log(`│   [${i + 1}/${queries.length}] got ${response.results?.length ?? 0} results in ${Date.now() - t0}ms`)
  }

  const searchResults = normalizeSearchResults(allResults).slice(0, limit)
  const sources       = searchResults.map(({ title, url }) => ({ title, url }))

  console.log(`│ ✅ total unique results: ${searchResults.length}`)
  console.log('└─────────────────────────────────────────')

  return { searchResults, sources }
}

function executeCalculator({ expression }) {
  if (typeof expression !== 'string' || !expression.trim()) {
    throw new Error('expression must be a non-empty string')
  }

  console.log('\n┌─────────────────────────────────────────')
  console.log('│ 🧮 CALCULATOR  →  mathjs')
  console.log(`│ expression : "${expression}"`)

  try {
    const raw    = math.evaluate(expression.trim())
    const result = typeof raw?.toString === 'function' ? raw.toString() : String(raw)
    console.log(`│ ✅ result : ${result}`)
    console.log('└─────────────────────────────────────────')
    return { expression, result, error: null }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Calculation failed'
    console.log(`│ ❌ error : ${error}`)
    console.log('└─────────────────────────────────────────')
    return { expression, result: null, error }
  }
}

// ─── routes ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ service: 'tools-service', status: 'ok' })
})

// List all tools
app.get('/tools', (req, res) => {
  res.json({ tools: TOOLS })
})

// Execute a tool
// Body: { toolId, input: { ...toolSpecificFields } }
app.post('/execute', async (req, res) => {
  const { toolId, input } = req.body
  if (!toolId) return res.status(400).json({ message: 'toolId is required' })

  const tool = TOOLS.find(t => t.id === toolId)
  if (!tool)         return res.status(404).json({ message: `Tool "${toolId}" not found` })
  if (!tool.enabled) return res.status(403).json({ message: `Tool "${toolId}" is disabled` })

  try {
    let output

    if (toolId === 'web-search') {
      output = await executeWebSearch(input || {})
    } else if (toolId === 'calculator') {
      output = executeCalculator(input || {})
    } else {
      return res.status(501).json({ message: `Tool "${toolId}" has no implementation yet` })
    }

    res.json({ toolId, input, output, status: 'success' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool execution failed'
    console.error(`❌ [tools-service] execute "${toolId}" failed: ${message}`)
    res.status(500).json({ toolId, status: 'error', message })
  }
})

app.listen(PORT, () => {
  console.log(`Tools service running on http://localhost:${PORT}`)
})

import { ChatGroq } from '@langchain/groq'
import { z } from 'zod'
import { validatePlan } from '../core/state.js'

// ─── LangSmith tracing ────────────────────────────────────────────────────────
// Requires in .env:
//   LANGCHAIN_TRACING_V2=true
//   LANGCHAIN_API_KEY=your_key
//   LANGCHAIN_PROJECT=mann-agent   (optional, defaults to "default")
//
// LangChain reads these env vars automatically — no extra code needed here.
// Every .invoke() call below will be traced in the LangSmith dashboard.
// ─────────────────────────────────────────────────────────────────────────────

const PlanSchema = z.object({
  needsSearch:    z.boolean(),
  searchQueries:  z.array(z.string()),
  needsCalc:      z.boolean(),
  calcExpression: z.string(),   // mathjs expression, e.g. "10000000 * 83.5"
  responseType:   z.enum(['conversation', 'answer']),
})

export function createPlanner({
  apiKey = process.env.GROQ_API_KEY,
  model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  llm,
} = {}) {
  if (!apiKey && !llm) throw new Error('GROQ_API_KEY is required')

  const modelClient = llm || new ChatGroq({ apiKey, model })
  const structuredClient = modelClient.withStructuredOutput(PlanSchema)

  return async ({ userInput }) => {
    // ── console logs ──────────────────────────────────────────────────────────
    console.log('\n┌─────────────────────────────────────────')
    console.log('│ 🧠 PLANNER  →  LLM call (Groq)')
    console.log(`│ model      : ${model}`)
    console.log(`│ userInput  : "${userInput}"`)
    console.log('│ ...')
    const t0 = Date.now()
    // ─────────────────────────────────────────────────────────────────────────

    const plan = await structuredClient.invoke([
      ['system', `You are a planning agent. Decide which tools are needed to answer the request.

## Rules

**Search:**
- Set needsSearch=true if the request needs current/real-time information.
- Do NOT search for greetings or casual conversation.
- If comparing multiple entities (countries, companies), create ONE separate search query per entity.
- Use at most 5 focused search queries.

**Calculator:**
- Set needsCalc=true if the request requires precise arithmetic, unit conversion, or formula evaluation.
- Set calcExpression to a valid mathjs expression (e.g. "10000000 * 83.5", "sqrt(144)", "20% * 5000").
- Set needsCalc=false and calcExpression="" if no calculation is needed.

**Both can be true** (e.g. "What is 15% of Apple's 2024 revenue?" → search for revenue AND calculate).

Return only the structured plan.`],
      ['human', userInput],
    ])
    const validated = validatePlan(plan)

    // ── console logs ──────────────────────────────────────────────────────────
    console.log(`│ needsSearch    : ${validated.needsSearch}`)
    console.log(`│ searchQueries  : ${JSON.stringify(validated.searchQueries)}`)
    console.log(`│ needsCalc      : ${validated.needsCalc}`)
    console.log(`│ calcExpression : "${validated.calcExpression}"`)
    console.log(`│ responseType   : ${validated.responseType}`)
    console.log(`│ ✅ done in ${Date.now() - t0}ms`)
    console.log('└─────────────────────────────────────────')
    // ─────────────────────────────────────────────────────────────────────────

    return validated
  }
}

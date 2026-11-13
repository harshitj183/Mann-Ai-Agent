import { ChatGroq } from '@langchain/groq'

// ─── LangSmith tracing ────────────────────────────────────────────────────────
// Same as planner — this LLM call is auto-traced via LANGCHAIN_TRACING_V2=true.
// No extra code needed.
// ─────────────────────────────────────────────────────────────────────────────

function contentToText(content) {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => typeof part === 'string' ? part : part?.text || '')
    .join('')
    .trim()
}

export function createFinalResponseNode({
  apiKey = process.env.GROQ_API_KEY,
  model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  llm,
} = {}) {
  if (!apiKey && !llm) throw new Error('GROQ_API_KEY is required')
  const modelClient = llm || new ChatGroq({ apiKey, model })

  return async ({ userInput, plan, searchResults, calcResult, sources }) => {
    // ── console logs ──────────────────────────────────────────────────────────
    console.log('\n┌─────────────────────────────────────────')
    console.log('│ ✍️  FINAL RESPONSE  →  LLM call (Groq)')
    console.log(`│ model        : ${model}`)
    console.log(`│ responseType : ${plan.responseType}`)
    console.log(`│ context docs : ${searchResults.length}`)
    console.log(`│ calcResult   : ${calcResult ? JSON.stringify(calcResult) : 'none'}`)
    console.log('│ ...')
    const t0 = Date.now()
    // ─────────────────────────────────────────────────────────────────────────

    // Build search context
    const searchContext = searchResults.map((item, i) =>
      `[${i + 1}] ${item.title}\nURL: ${item.url}\n${item.content}`
    ).join('\n\n')

    // Build calc context
    const calcContext = calcResult
      ? calcResult.error
        ? `Calculator error for "${calcResult.expression}": ${calcResult.error}`
        : `Calculator result: ${calcResult.expression} = ${calcResult.result}`
      : ''

    const response = await modelClient.invoke([
      ['system', 'Answer clearly in Markdown. Use the calculator result as the precise answer for any arithmetic. For search-backed answers, use only the supplied results for factual claims. Do not invent citations.'],
      ['human', [
        `Question: ${userInput}`,
        `Response type: ${plan.responseType}`,
        calcContext   ? `\nCalculation:\n${calcContext}`        : '',
        searchContext ? `\nSearch context:\n${searchContext}`   : '',
      ].filter(Boolean).join('\n')],
    ])

    const finalResponse = contentToText(response.content)
    if (!finalResponse) throw new Error('Final response was empty')

    // ── console logs ──────────────────────────────────────────────────────────
    console.log(`│ ✅ done in ${Date.now() - t0}ms  |  ${finalResponse.length} chars`)
    console.log('└─────────────────────────────────────────\n')
    // ─────────────────────────────────────────────────────────────────────────

    return { finalResponse, sources }
  }
}

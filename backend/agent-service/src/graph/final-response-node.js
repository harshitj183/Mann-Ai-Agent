import { ChatGroq } from '@langchain/groq'

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

  return async ({ userInput, plan, searchResults, sources }) => {
    const context = searchResults.map((item, index) =>
      `[${index + 1}] ${item.title}\nURL: ${item.url}\n${item.content}`
    ).join('\n\n')

    const response = await modelClient.invoke([
      ['system', 'Answer clearly in Markdown. For search-backed answers, use only the supplied results for factual claims. Do not invent citations.'],
      ['human', `Question: ${userInput}\nResponse type: ${plan.responseType}\nSearch context:\n${context || '(no search results)'}`],
    ])
    const finalResponse = contentToText(response.content)
    if (!finalResponse) throw new Error('Final response was empty')
    return { finalResponse, sources }
  }
}

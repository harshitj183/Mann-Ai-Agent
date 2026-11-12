import { ChatGroq } from '@langchain/groq'
import { z } from 'zod'
import { validatePlan } from './state.js'

const PlanSchema = z.object({
  needsSearch: z.boolean(),
  searchQueries: z.array(z.string()),
  responseType: z.enum(['conversation', 'answer']),
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
    const plan = await structuredClient.invoke([
      ['system', 'Decide whether this request needs current web information. Do not search for greetings or casual conversation. Use at most five focused search queries. Return only the structured plan.'],
      ['human', userInput],
    ])
    return validatePlan(plan)
  }
}

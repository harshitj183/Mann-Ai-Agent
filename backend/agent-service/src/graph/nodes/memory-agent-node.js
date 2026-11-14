import { ChatGroq } from '@langchain/groq'
import { z } from 'zod'

// ─── Schema ───────────────────────────────────────────────────────────────────

const FactsSchema = z.object({
  facts: z.array(z.object({
    key:   z.string().describe('snake_case key, e.g. user_name, user_job, user_city, user_goal'),
    value: z.string().describe('The extracted fact value, e.g. "Harshit", "Software Engineer"'),
  })).describe('New or updated facts about the user. Empty array if nothing new was revealed.'),

  session: z.object({
    motive:  z.string().describe('One sentence: what the user wanted to achieve in this exchange'),
    topics:  z.array(z.string()).describe('Main topics discussed, 1-5 short labels'),
    outcome: z.string().describe('What was resolved or left open'),
  }).describe('Running summary of this conversation — updated each turn'),
})

// ─── Node factory ─────────────────────────────────────────────────────────────

export function createMemoryAgentNode({
  apiKey = process.env.GROQ_API_KEY,
  model  = process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  llm,
} = {}) {
  if (!apiKey && !llm) throw new Error('GROQ_API_KEY is required for memory-agent')

  const modelClient      = llm || new ChatGroq({ apiKey, model })
  const structuredClient = modelClient.withStructuredOutput(FactsSchema)

  /**
   * Runs after final-response-node.
   * Returns { memoryWrites: { facts, session } } — no DB calls here.
   * Writes happen in agent-service/src/index.js (persistMemoryWrites).
   */
  return async (state) => {
    const { userInput, finalResponse, chatHistory, longTermMemories, sessionMemory } = state
    const t0 = Date.now()

    console.log('\n┌─────────────────────────────────────────')
    console.log('│ 🧠 MEMORY AGENT  →  extracting facts + session')

    // Last 6 messages for context (already in short-term history)
    const historySnippet = (chatHistory || []).slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')

    // longTermMemories are already filtered to type='fact' by index.js
    const existingFactsText = (longTermMemories || []).length > 0
      ? longTermMemories.map(m => `  ${m.key}: ${m.value}`).join('\n')
      : '  (none yet)'

    const previousSession = sessionMemory
      ? `  Motive: ${sessionMemory.motive}\n  Topics: ${(sessionMemory.topics || []).join(', ')}`
      : '  (none yet)'

    const prompt = `You are a memory extraction agent. Analyze this conversation exchange.

## Task 1 — Extract user facts
Only extract facts EXPLICITLY stated by the user (name, job, location, language, preferences, goals).
Use snake_case keys: user_name, user_job, user_city, user_language, user_goal, user_age, etc.
Skip facts that already exist with the same value.
Return EMPTY array if nothing new was revealed — do NOT invent facts.

Existing known facts:
${existingFactsText}

## Task 2 — Update session summary
Write a running summary of what this conversation is about.
Build on the previous session summary if one exists.

Previous session summary:
${previousSession}

---
Recent conversation history:
${historySnippet || '(none)'}

This exchange:
User: ${userInput}
Assistant: ${(finalResponse || '').slice(0, 800)}
---`

    try {
      const result = await structuredClient.invoke([
        ['system', 'You are a precise memory extraction agent. Extract only what is explicitly stated. Return valid structured output.'],
        ['human', prompt],
      ])

      console.log(`│ facts extracted : ${result.facts.length}  ${result.facts.map(f => f.key).join(', ') || '—'}`)
      console.log(`│ session motive  : ${result.session?.motive?.slice(0, 80) || '—'}`)
      console.log(`│ ✅ done in ${Date.now() - t0}ms`)
      console.log('└─────────────────────────────────────────\n')

      return { memoryWrites: result }
    } catch (err) {
      console.warn(`│ ⚠️  memory-agent LLM failed: ${err?.message}`)
      console.log('└─────────────────────────────────────────\n')
      // Return null so persistMemoryWrites skips gracefully — run still succeeds
      return { memoryWrites: null }
    }
  }
}

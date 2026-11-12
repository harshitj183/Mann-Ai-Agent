const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-oss-20b'

export function createGroqClient({
  apiKey = process.env.GROQ_API_KEY,
  model = process.env.GROQ_MODEL || DEFAULT_MODEL,
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY is required')

  return {
    async complete(prompt) {
      const response = await fetchImpl(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error?.message || `Groq request failed (${response.status})`)
      }

      const content = data.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Groq response did not contain assistant content')
      }

      return content.trim()
    },
  }
}

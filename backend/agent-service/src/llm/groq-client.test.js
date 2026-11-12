import test from 'node:test'
import assert from 'node:assert/strict'
import { createGroqClient } from './groq-client.js'

test('sends a request to Groq and returns the assistant content', async () => {
  const requests = []
  const client = createGroqClient({
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Groq response' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  const result = await client.complete('Summarize this')

  assert.equal(result, 'Groq response')
  assert.equal(requests[0].url, 'https://api.groq.com/openai/v1/chat/completions')
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    model: 'openai/gpt-oss-20b',
    messages: [{ role: 'user', content: 'Summarize this' }],
  })
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-key')
})

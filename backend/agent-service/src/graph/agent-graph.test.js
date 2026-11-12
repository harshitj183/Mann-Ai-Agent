import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentGraph } from './agent-graph.js'

test('skips search for casual conversation', async () => {
  const calls = []
  const graph = createAgentGraph({
    plan: async () => ({
      needsSearch: false,
      searchQueries: [],
      responseType: 'conversation',
    }),
    search: async () => {
      calls.push('search')
      return { searchResults: [], sources: [] }
    },
    finalResponse: async (state) => {
      calls.push('final')
      return { finalResponse: `reply:${state.userInput}`, sources: [] }
    },
  })

  const result = await graph.invoke({ userInput: 'hi how are you' })

  assert.equal(result.finalResponse, 'reply:hi how are you')
  assert.deepEqual(calls, ['final'])
})

test('searches before formatting a current-information answer', async () => {
  const calls = []
  const resultItem = {
    title: 'Docs',
    url: 'https://example.com/docs',
    content: 'Result',
    score: 1,
  }
  const graph = createAgentGraph({
    plan: async () => ({
      needsSearch: true,
      searchQueries: ['LangGraph JS official docs'],
      responseType: 'answer',
    }),
    search: async (queries) => {
      calls.push(['search', queries])
      return { searchResults: [resultItem], sources: [{ title: 'Docs', url: resultItem.url }] }
    },
    finalResponse: async (state) => {
      calls.push(['final', state.searchResults])
      return { finalResponse: 'formatted', sources: state.sources }
    },
  })

  const result = await graph.invoke({ userInput: 'What is LangGraph?' })

  assert.equal(result.finalResponse, 'formatted')
  assert.deepEqual(calls, [
    ['search', ['LangGraph JS official docs']],
    ['final', [resultItem]],
  ])
  assert.deepEqual(result.sources, [{ title: 'Docs', url: resultItem.url }])
})

test('surfaces provider failures instead of returning fake success', async () => {
  const graph = createAgentGraph({
    plan: async () => ({
      needsSearch: true,
      searchQueries: ['query'],
      responseType: 'answer',
    }),
    search: async () => {
      throw new Error('Tavily unavailable')
    },
    finalResponse: async () => ({ finalResponse: 'not reached', sources: [] }),
  })

  await assert.rejects(graph.invoke({ userInput: 'search this' }), /Tavily unavailable/)
})

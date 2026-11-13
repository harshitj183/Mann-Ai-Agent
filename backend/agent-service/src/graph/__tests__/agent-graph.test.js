import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentGraph } from '../core/agent-graph.js'

// ─── helpers ──────────────────────────────────────────────────────────────────

const noop = { searchResults: [], sources: [] }

function makePlan(overrides = {}) {
  return {
    needsSearch:    false,
    searchQueries:  [],
    needsCalc:      false,
    calcExpression: '',
    responseType:   'answer',
    ...overrides,
  }
}

// ─── routing tests ────────────────────────────────────────────────────────────

test('skips search and calc for casual conversation', async () => {
  const calls = []
  const graph = createAgentGraph({
    plan:         async () => makePlan({ responseType: 'conversation' }),
    search:       async () => { calls.push('search'); return noop },
    calculator:   async () => { calls.push('calc');   return { calcResult: null } },
    finalResponse: async (state) => { calls.push('final'); return { finalResponse: `reply:${state.userInput}`, sources: [] } },
  })

  const result = await graph.invoke({ userInput: 'hi how are you' })

  assert.equal(result.finalResponse, 'reply:hi how are you')
  assert.deepEqual(calls, ['final'])
})

test('runs search then final when only needsSearch', async () => {
  const calls = []
  const resultItem = { title: 'Docs', url: 'https://example.com', content: 'Result', score: 1 }

  const graph = createAgentGraph({
    plan:         async () => makePlan({ needsSearch: true, searchQueries: ['LangGraph docs'] }),
    search:       async (queries) => { calls.push(['search', queries]); return { searchResults: [resultItem], sources: [] } },
    calculator:   async () => { calls.push('calc'); return { calcResult: null } },
    finalResponse: async (state) => { calls.push('final'); return { finalResponse: 'formatted', sources: state.sources } },
  })

  const result = await graph.invoke({ userInput: 'What is LangGraph?' })

  assert.equal(result.finalResponse, 'formatted')
  assert.deepEqual(calls, [['search', ['LangGraph docs']], 'final'])
})

test('runs calc then final when only needsCalc', async () => {
  const calls = []

  const graph = createAgentGraph({
    plan:         async () => makePlan({ needsCalc: true, calcExpression: '2 + 2' }),
    search:       async () => { calls.push('search'); return noop },
    calculator:   async (expr) => { calls.push(['calc', expr]); return { calcResult: { expression: expr, result: '4', error: null } } },
    finalResponse: async (state) => { calls.push('final'); return { finalResponse: `answer:${state.calcResult.result}`, sources: [] } },
  })

  const result = await graph.invoke({ userInput: 'What is 2 + 2?' })

  assert.equal(result.finalResponse, 'answer:4')
  assert.deepEqual(calls, [['calc', '2 + 2'], 'final'])
})

test('runs search → calc → final when both are needed', async () => {
  const calls = []

  const graph = createAgentGraph({
    plan: async () => makePlan({
      needsSearch:    true,
      searchQueries:  ['Apple revenue 2024'],
      needsCalc:      true,
      calcExpression: '391035000000 * 0.15',
    }),
    search:       async (q) => { calls.push(['search', q]); return noop },
    calculator:   async (e) => { calls.push(['calc', e]);   return { calcResult: { expression: e, result: '58655250000', error: null } } },
    finalResponse: async ()  => { calls.push('final');      return { finalResponse: 'done', sources: [] } },
  })

  await graph.invoke({ userInput: 'What is 15% of Apple 2024 revenue?' })

  assert.deepEqual(calls, [
    ['search', ['Apple revenue 2024']],
    ['calc',   '391035000000 * 0.15'],
    'final',
  ])
})

test('surfaces provider failures instead of returning fake success', async () => {
  const graph = createAgentGraph({
    plan:         async () => makePlan({ needsSearch: true, searchQueries: ['query'] }),
    search:       async () => { throw new Error('Tavily unavailable') },
    calculator:   async () => { return { calcResult: null } },
    finalResponse: async () => ({ finalResponse: 'not reached', sources: [] }),
  })

  await assert.rejects(graph.invoke({ userInput: 'search this' }), /Tavily unavailable/)
})

// ─── calculator-node unit tests ───────────────────────────────────────────────

test('calculator-node: basic arithmetic', async () => {
  const { createCalculatorNode } = await import('../nodes/calculator-node.js')
  const calc = createCalculatorNode()

  const { calcResult } = await calc('2 + 2')
  assert.equal(calcResult.result, '4')
  assert.equal(calcResult.error, null)
})

test('calculator-node: percentage', async () => {
  const { createCalculatorNode } = await import('../nodes/calculator-node.js')
  const calc = createCalculatorNode()

  const { calcResult } = await calc('15% * 200')
  assert.equal(calcResult.result, '30')
  assert.equal(calcResult.error, null)
})

test('calculator-node: unit conversion', async () => {
  const { createCalculatorNode } = await import('../nodes/calculator-node.js')
  const calc = createCalculatorNode()

  const { calcResult } = await calc('1 km to m')
  assert.ok(calcResult.result.includes('1000'), `expected 1000 m, got: ${calcResult.result}`)
  assert.equal(calcResult.error, null)
})

test('calculator-node: invalid expression returns error not throw', async () => {
  const { createCalculatorNode } = await import('../nodes/calculator-node.js')
  const calc = createCalculatorNode()

  const { calcResult } = await calc('abc###')
  assert.equal(calcResult.result, null)
  assert.ok(calcResult.error, 'should have an error message')
})

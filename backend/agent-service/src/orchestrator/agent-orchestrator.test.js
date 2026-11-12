import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentOrchestrator } from './agent-orchestrator.js'

test('rejects a run without a non-empty request', async () => {
  const orchestrator = createAgentOrchestrator({
    saveRun: async () => {
      throw new Error('saveRun should not be called')
    },
  })

  await assert.rejects(
    orchestrator.run({ userId: 7, request: '   ' }),
    { message: 'request is required' }
  )
})

test('executes and saves a completed run', async () => {
  const savedRuns = []
  const orchestrator = createAgentOrchestrator({
    execute: async (request) => ({ output: `Groq: ${request}` }),
    saveRun: async (run) => {
      savedRuns.push(run)
      return { id: 11, ...run }
    },
  })

  const result = await orchestrator.run({ userId: 7, request: 'Summarize this text' })

  assert.deepEqual(result, {
    id: 11,
    userId: 7,
    request: 'Summarize this text',
    status: 'completed',
    output: 'Groq: Summarize this text',
    error: null,
  })
  assert.equal(savedRuns[0].status, 'completed')
})

test('saves a failed run when execution throws', async () => {
  const savedRuns = []
  const orchestrator = createAgentOrchestrator({
    execute: async () => {
      throw new Error('execution failed')
    },
    saveRun: async (run) => {
      savedRuns.push(run)
      return { id: 12, ...run }
    },
  })

  await assert.rejects(
    orchestrator.run({ userId: 7, request: 'Run the agent' }),
    { message: 'execution failed' }
  )
  assert.deepEqual(savedRuns[0], {
    userId: 7,
    request: 'Run the agent',
    status: 'failed',
    output: null,
    error: 'execution failed',
  })
})

const defaultExecute = async (request) => ({
  output: `Agent received: ${request}`,
})

export function createAgentOrchestrator({ execute = defaultExecute, saveRun }) {
  if (typeof saveRun !== 'function') {
    throw new TypeError('saveRun must be a function')
  }

  return {
    async run({ userId, request }) {
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error('userId must be a positive integer')
      }

      if (typeof request !== 'string' || !request.trim()) {
        throw new Error('request is required')
      }

      const normalizedRequest = request.trim()

      try {
        const { output } = await execute(normalizedRequest)
        return saveRun({
          userId,
          request: normalizedRequest,
          status: 'completed',
          output,
          error: null,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Agent execution failed'
        await saveRun({
          userId,
          request: normalizedRequest,
          status: 'failed',
          output: null,
          error: message,
        })
        throw error
      }
    },
  }
}

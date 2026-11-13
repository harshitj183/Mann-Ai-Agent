import { Annotation } from '@langchain/langgraph'

export const MAX_SEARCH_QUERIES = 5

export const AgentState = Annotation.Root({
  userInput: Annotation(),
  plan: Annotation({
    reducer: (_, next) => next,
    default: () => null,
  }),
  searchResults: Annotation({
    reducer: (_, next) => next,
    default: () => [],
  }),
  sources: Annotation({
    reducer: (_, next) => next,
    default: () => [],
  }),
  calcResult: Annotation({
    reducer: (_, next) => next,
    default: () => null,
  }),
  finalResponse: Annotation({
    reducer: (_, next) => next,
    default: () => null,
  }),
})

export function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Planner returned an invalid plan')
  }
  if (typeof plan.needsSearch !== 'boolean') {
    throw new Error('Planner needsSearch must be boolean')
  }
  if (typeof plan.needsCalc !== 'boolean') {
    throw new Error('Planner needsCalc must be boolean')
  }
  if (!['conversation', 'answer'].includes(plan.responseType)) {
    throw new Error('Planner responseType is invalid')
  }
  if (!Array.isArray(plan.searchQueries) || plan.searchQueries.length > MAX_SEARCH_QUERIES) {
    throw new Error(`Planner searchQueries must contain 0-${MAX_SEARCH_QUERIES} items`)
  }

  const searchQueries = plan.searchQueries
    .filter((query) => typeof query === 'string')
    .map((query) => query.trim())
    .filter(Boolean)

  if (plan.needsSearch && searchQueries.length === 0) {
    throw new Error('Planner requires at least one search query')
  }

  const calcExpression = typeof plan.calcExpression === 'string'
    ? plan.calcExpression.trim()
    : ''

  if (plan.needsCalc && !calcExpression) {
    throw new Error('Planner requires calcExpression when needsCalc is true')
  }

  return { ...plan, searchQueries, calcExpression }
}

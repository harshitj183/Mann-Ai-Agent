import { END, START, StateGraph } from '@langchain/langgraph'
import { AgentState, validatePlan } from './state.js'
import { createPlanner } from './planner-node.js'
import { createSearchNode } from './search-node.js'
import { createFinalResponseNode } from './final-response-node.js'

export function createAgentGraph({
  plan = createPlanner(),
  search = createSearchNode(),
  finalResponse = createFinalResponseNode(),
} = {}) {
  const plannerNode = async (state) => ({
    plan: validatePlan(await plan(state)),
  })

  const searchNode = async (state) => search(state.plan.searchQueries)
  const finalNode = async (state) => finalResponse(state)
  const routeAfterPlan = (state) => state.plan.needsSearch ? 'search' : 'final'

  return new StateGraph(AgentState)
    .addNode('planner', plannerNode)
    .addNode('search', searchNode)
    .addNode('final', finalNode)
    .addEdge(START, 'planner')
    .addConditionalEdges('planner', routeAfterPlan, {
      search: 'search',
      final: 'final',
    })
    .addEdge('search', 'final')
    .addEdge('final', END)
    .compile()
}

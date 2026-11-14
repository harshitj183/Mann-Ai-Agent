import { END, START, StateGraph } from '@langchain/langgraph'
import { AgentState, validatePlan } from './state.js'
import { createPlanner } from '../nodes/planner-node.js'
import { createSearchNode } from '../nodes/search-node.js'
import { createCalculatorNode } from '../nodes/calculator-node.js'
import { createFinalResponseNode } from '../nodes/final-response-node.js'
import { createMemoryAgentNode } from '../nodes/memory-agent-node.js'

export function createAgentGraph({
  plan          = createPlanner(),
  search        = createSearchNode(),
  calculator    = createCalculatorNode(),
  finalResponse = createFinalResponseNode(),
  memoryAgent   = createMemoryAgentNode(),
} = {}) {
  const plannerNode      = async (state) => ({ plan: validatePlan(await plan(state)) })
  const searchNode       = async (state) => search(state.plan.searchQueries)
  const calcNode         = async (state) => calculator(state.plan.calcExpression)
  const finalNode        = async (state) => finalResponse(state)
  const memoryAgentNode  = async (state) => memoryAgent(state)

  // After planner: run search, calc, both, or neither
  const routeAfterPlan = (state) => {
    const { needsSearch, needsCalc } = state.plan
    if (needsSearch && needsCalc) return 'search'
    if (needsSearch)              return 'search'
    if (needsCalc)                return 'calc'
    return 'final'
  }

  // After search: still need calc?
  const routeAfterSearch = (state) => state.plan.needsCalc ? 'calc' : 'final'

  return new StateGraph(AgentState)
    .addNode('planner',      plannerNode)
    .addNode('search',       searchNode)
    .addNode('calc',         calcNode)
    .addNode('final',        finalNode)
    .addNode('memory_agent', memoryAgentNode)

    .addEdge(START,     'planner')
    .addConditionalEdges('planner', routeAfterPlan, {
      search: 'search',
      calc:   'calc',
      final:  'final',
    })
    .addConditionalEdges('search', routeAfterSearch, {
      calc:  'calc',
      final: 'final',
    })
    .addEdge('calc',         'final')
    .addEdge('final',        'memory_agent')   // ← memory agent runs after final response
    .addEdge('memory_agent', END)
    .compile()
}

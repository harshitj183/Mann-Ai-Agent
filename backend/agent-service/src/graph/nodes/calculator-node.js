import { create, all } from 'mathjs'

// ─── LangSmith tracing ────────────────────────────────────────────────────────
// This is a pure JS node — no LLM call. It won't appear as a separate span
// in LangSmith unless wrapped with traceable(). For now it shows as part of
// the parent graph run.
// ─────────────────────────────────────────────────────────────────────────────

// Restricted mathjs instance — disable only JS-escape hatches, keep evaluate()
const math = create(all)

math.import({
  import:     () => { throw new Error('disabled') },
  createUnit: () => { throw new Error('disabled') },
}, { override: true })

export function createCalculatorNode() {
  return async (expression) => {
    // ── console logs ────────────────────────────────────────────────────────
    console.log('\n┌─────────────────────────────────────────')
    console.log('│ 🧮 CALCULATOR  →  mathjs')
    console.log(`│ expression : "${expression}"`)
    // ────────────────────────────────────────────────────────────────────────

    let calcResult
    try {
      const raw = math.evaluate(expression)
      // math.evaluate can return a Matrix, Unit, etc. — always stringify
      calcResult = {
        expression,
        result: typeof raw?.toString === 'function' ? raw.toString() : String(raw),
        error: null,
      }
    } catch (err) {
      calcResult = {
        expression,
        result: null,
        error: err instanceof Error ? err.message : 'Calculation failed',
      }
    }

    // ── console logs ────────────────────────────────────────────────────────
    if (calcResult.error) {
      console.log(`│ ❌ error : ${calcResult.error}`)
    } else {
      console.log(`│ ✅ result : ${calcResult.result}`)
    }
    console.log('└─────────────────────────────────────────')
    // ────────────────────────────────────────────────────────────────────────

    return { calcResult }
  }
}

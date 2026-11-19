const TOOLS_SERVICE_URL = process.env.TOOLS_SERVICE_URL || 'http://localhost:3005'

export function createCalculatorNode({ toolsUrl = TOOLS_SERVICE_URL } = {}) {
  return async (expression) => {
    // ── console logs ────────────────────────────────────────────────────────
    console.log('\n┌─────────────────────────────────────────')
    console.log('│ 🧮 CALCULATOR  →  tools-service')
    console.log(`│ expression : "${expression}"`)
    const t0 = Date.now()
    // ────────────────────────────────────────────────────────────────────────

    const res = await fetch(`${toolsUrl}/execute`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ toolId: 'calculator', input: { expression } }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`tools-service calculator failed: ${res.status} ${err}`)
    }

    const { output } = await res.json()

    // ── console logs ────────────────────────────────────────────────────────
    if (output.error) {
      console.log(`│ ❌ error : ${output.error}`)
    } else {
      console.log(`│ ✅ result : ${output.result}  (${Date.now() - t0}ms)`)
    }
    console.log('└─────────────────────────────────────────')
    // ────────────────────────────────────────────────────────────────────────

    return { calcResult: output }
  }
}

const TOOLS_SERVICE_URL = process.env.TOOLS_SERVICE_URL || 'http://localhost:3005'

export function createSearchNode({ toolsUrl = TOOLS_SERVICE_URL } = {}) {
  return async (searchQueries) => {
    // ── console logs ──────────────────────────────────────────────────────────
    console.log('\n┌─────────────────────────────────────────')
    console.log('│ 🔍 SEARCH  →  tools-service')
    console.log(`│ queries (${searchQueries.length}): ${JSON.stringify(searchQueries)}`)
    const t0 = Date.now()
    // ─────────────────────────────────────────────────────────────────────────

    const res = await fetch(`${toolsUrl}/execute`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ toolId: 'web-search', input: { queries: searchQueries } }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`tools-service web-search failed: ${res.status} ${err}`)
    }

    const { output } = await res.json()

    // ── console logs ──────────────────────────────────────────────────────────
    console.log(`│ ✅ ${output.searchResults.length} results in ${Date.now() - t0}ms`)
    console.log('└─────────────────────────────────────────')
    // ─────────────────────────────────────────────────────────────────────────

    return {
      searchResults: output.searchResults,
      sources:       output.sources,
    }
  }
}

import { tavily } from '@tavily/core'

// ─── LangSmith tracing ────────────────────────────────────────────────────────
// Tavily calls are NOT LangChain tools here, so they won't appear in LangSmith
// automatically. To trace them, wrap each search call with a LangChain tool or
// use traceable() from @langchain/core/tracers/initialize if needed later.
// For now, LangSmith will show the overall graph run + planner/final LLM calls.
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeSearchResults(results) {
  const byUrl = new Map()

  for (const result of results) {
    if (typeof result?.url !== 'string' || !result.url.trim()) continue
    const url = result.url.trim()
    if (!byUrl.has(url)) {
      byUrl.set(url, {
        title: typeof result.title === 'string' ? result.title.trim() : '',
        url,
        content: typeof result.content === 'string' ? result.content.trim() : '',
        score: typeof result.score === 'number' ? result.score : null,
      })
    }
  }

  return [...byUrl.values()]
}

export function createSearchNode({
  apiKey = process.env.TAVILY_API_KEY,
  maxResults = Number(process.env.TAVILY_MAX_RESULTS || 5),
  searchImpl,
} = {}) {
  const search = searchImpl || (apiKey
    ? tavily({ apiKey })
    : { search: async () => { throw new Error('TAVILY_API_KEY is required') } })

  return async (searchQueries) => {
    // ── console logs ──────────────────────────────────────────────────────────
    console.log('\n┌─────────────────────────────────────────')
    console.log('│ 🔍 SEARCH  →  Tavily API')
    console.log(`│ queries (${searchQueries.length}): ${JSON.stringify(searchQueries)}`)
    // ─────────────────────────────────────────────────────────────────────────

    const allResults = []
    for (const [i, query] of searchQueries.entries()) {
      // ── console logs ────────────────────────────────────────────────────────
      const t0 = Date.now()
      console.log(`│   [${i + 1}/${searchQueries.length}] searching: "${query}" ...`)
      // ───────────────────────────────────────────────────────────────────────

      const response = await search.search(query, { maxResults })
      allResults.push(...(response.results || []))

      // ── console logs ────────────────────────────────────────────────────────
      console.log(`│   [${i + 1}/${searchQueries.length}] got ${response.results?.length ?? 0} results in ${Date.now() - t0}ms`)
      // ───────────────────────────────────────────────────────────────────────
    }

    const searchResults = normalizeSearchResults(allResults).slice(0, maxResults)

    // ── console logs ──────────────────────────────────────────────────────────
    console.log(`│ ✅ total unique results: ${searchResults.length}`)
    console.log('└─────────────────────────────────────────')
    // ─────────────────────────────────────────────────────────────────────────

    return {
      searchResults,
      sources: searchResults.map(({ title, url }) => ({ title, url })),
    }
  }
}

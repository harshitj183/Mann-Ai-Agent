import { tavily } from '@tavily/core'

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
    const allResults = []
    for (const query of searchQueries) {
      const response = await search.search(query, { maxResults })
      allResults.push(...(response.results || []))
    }

    const searchResults = normalizeSearchResults(allResults).slice(0, maxResults)
    return {
      searchResults,
      sources: searchResults.map(({ title, url }) => ({ title, url })),
    }
  }
}

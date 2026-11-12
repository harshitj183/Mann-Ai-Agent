export async function forwardToService(baseUrl, path, method, body) {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    return { status: res.status, data, headers: res.headers }
  } catch {
    return {
      status: 503,
      data: { message: 'Service unavailable. Is the microservice running?' },
    }
  }
}

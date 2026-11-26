/**
 * Forward a request to a downstream service and stream the raw binary response
 * back to the caller.  Used for execution-service write endpoints that return
 * application/pdf, application/zip, image/png, or image/gif.
 *
 * @param {import('express').Response} res - Express response to pipe into.
 * @param {string} baseUrl   - Service base URL.
 * @param {string} path      - Path on the service.
 * @param {object} body      - JSON body to send.
 */
export async function forwardBinary(res, baseUrl, path, body) {
  let upstream
  try {
    upstream = await fetch(`${baseUrl}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch {
    return res.status(503).json({ message: 'Execution service unavailable' })
  }

  if (!upstream.ok) {
    // Error responses from the service are JSON — parse and relay them.
    try {
      const err = await upstream.json()
      return res.status(upstream.status).json(err)
    } catch {
      return res.status(upstream.status).json({ message: 'Execution service error' })
    }
  }

  // Copy relevant headers then stream the bytes.
  const passHeaders = ['content-type', 'content-disposition', 'content-length']
  for (const header of passHeaders) {
    const value = upstream.headers.get(header)
    if (value) res.setHeader(header, value)
  }

  res.status(upstream.status)
  const buffer = await upstream.arrayBuffer()
  res.end(Buffer.from(buffer))
}

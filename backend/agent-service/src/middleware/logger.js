// ── request logger middleware ─────────────────────────────────────────────────
// Usage: app.use(requestLogger('agent-service'))
// ─────────────────────────────────────────────────────────────────────────────

export function requestLogger(serviceName) {
  return (req, res, next) => {
    if (req.path === '/health') return next()   // skip health-check noise

    const t0 = Date.now()
    res.on('finish', () => {
      const ms   = Date.now() - t0
      const icon = res.statusCode >= 500 ? '❌'
                 : res.statusCode >= 400 ? '⚠️ '
                 : '✅'
      console.log(`${icon} [${serviceName}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`)
    })
    next()
  }
}

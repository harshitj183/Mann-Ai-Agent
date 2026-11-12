import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key-change-in-production'

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization
  const cookieToken = req.cookies?.mann_auth
  const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)
  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

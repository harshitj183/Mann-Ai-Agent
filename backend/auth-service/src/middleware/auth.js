import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/constants.js'

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  const token = req.cookies?.mann_auth || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)
  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

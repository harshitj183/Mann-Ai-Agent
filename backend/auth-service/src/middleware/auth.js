import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/constants.js'

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

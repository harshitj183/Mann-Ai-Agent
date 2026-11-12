import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { authenticateToken } from './auth.js'

const SECRET = 'my-secret-key-change-in-production'

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('authenticates a JWT from the HttpOnly auth cookie', () => {
  const token = jwt.sign({ id: 7, email: 'user@example.com' }, SECRET)
  const req = { headers: {}, cookies: { mann_auth: token } }
  const res = response()
  let nextCalled = false

  authenticateToken(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(req.user.id, 7)
  assert.equal(res.statusCode, null)
})

test('keeps Bearer authentication working for existing clients', () => {
  const token = jwt.sign({ id: 8 }, SECRET)
  const req = { headers: { authorization: `Bearer ${token}` } }
  const res = response()
  let nextCalled = false

  authenticateToken(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(req.user.id, 8)
})

test('rejects a request without a cookie or Bearer token', () => {
  const req = { headers: {} }
  const res = response()

  authenticateToken(req, res, () => {
    throw new Error('next should not be called')
  })

  assert.equal(res.statusCode, 401)
  assert.equal(res.body.message, 'No token provided')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { copyAuthCookie } from './auth.routes.js'

// Helper: simulates Node.js fetch Headers object with getSetCookie()
function makeHeaders(cookies = []) {
  return {
    getSetCookie() {
      return cookies
    },
  }
}

test('copies Set-Cookie header using getSetCookie() (Node.js fetch Headers)', () => {
  const serviceResponse = {
    headers: makeHeaders(['mann_auth=abc; HttpOnly; Path=/']),
  }
  const outgoing = {
    values: {},
    setHeader(name, value) { this.values[name] = value },
  }

  copyAuthCookie(serviceResponse, outgoing)

  assert.deepEqual(outgoing.values['Set-Cookie'], ['mann_auth=abc; HttpOnly; Path=/'])
})

test('copies multiple Set-Cookie headers correctly', () => {
  const serviceResponse = {
    headers: makeHeaders([
      'mann_auth=abc; HttpOnly; Path=/',
      'session=xyz; Path=/',
    ]),
  }
  const outgoing = {
    values: {},
    setHeader(name, value) { this.values[name] = value },
  }

  copyAuthCookie(serviceResponse, outgoing)

  assert.deepEqual(outgoing.values['Set-Cookie'], [
    'mann_auth=abc; HttpOnly; Path=/',
    'session=xyz; Path=/',
  ])
})

test('does nothing when no cookies are present', () => {
  const serviceResponse = { headers: makeHeaders([]) }
  const outgoing = {
    values: {},
    setHeader(name, value) { this.values[name] = value },
  }

  copyAuthCookie(serviceResponse, outgoing)

  assert.equal(outgoing.values['Set-Cookie'], undefined)
})

test('does nothing when headers is null', () => {
  const outgoing = {
    values: {},
    setHeader(name, value) { this.values[name] = value },
  }

  copyAuthCookie({ headers: null }, outgoing)

  assert.equal(outgoing.values['Set-Cookie'], undefined)
})

test('falls back to .get() when getSetCookie() is not available', () => {
  const serviceResponse = {
    headers: {
      get(name) {
        return name === 'set-cookie' ? 'mann_auth=abc; HttpOnly; Path=/' : null
      },
    },
  }
  const outgoing = {
    values: {},
    setHeader(name, value) { this.values[name] = value },
  }

  copyAuthCookie(serviceResponse, outgoing)

  assert.deepEqual(outgoing.values['Set-Cookie'], ['mann_auth=abc; HttpOnly; Path=/'])
})

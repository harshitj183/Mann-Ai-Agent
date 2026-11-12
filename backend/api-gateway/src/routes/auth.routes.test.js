import test from 'node:test'
import assert from 'node:assert/strict'
import { copyAuthCookie } from './auth.routes.js'

test('copies the auth service Set-Cookie header to the browser response', () => {
  const response = {
    headers: {
      get(name) {
        return name === 'set-cookie' ? 'mann_auth=abc; HttpOnly; Path=/' : null
      },
    },
  }
  const outgoing = {
    values: {},
    setHeader(name, value) {
      this.values[name] = value
    },
  }

  copyAuthCookie(response, outgoing)

  assert.equal(outgoing.values['Set-Cookie'], 'mann_auth=abc; HttpOnly; Path=/')
})

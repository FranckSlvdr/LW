import assert from 'node:assert/strict'
import test from 'node:test'
import { hasPermission } from '@/server/security/permissions'
import { buildClearedSessionCookie } from '@/server/security/sessionCookie'

test('clearSessionCookie keeps the session cookie locked down', () => {
  const previousNodeEnv = process.env.NODE_ENV

  try {
    Reflect.set(process.env, 'NODE_ENV', 'production')
    const productionHeader = buildClearedSessionCookie()
    assert.match(productionHeader, /HttpOnly/)
    assert.match(productionHeader, /SameSite=Lax/)
    assert.match(productionHeader, /Max-Age=0/)
    assert.match(productionHeader, /; Secure/)

    Reflect.set(process.env, 'NODE_ENV', 'development')
    const developmentHeader = buildClearedSessionCookie()
    assert.doesNotMatch(developmentHeader, /; Secure/)
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV')
    } else {
      Reflect.set(process.env, 'NODE_ENV', previousNodeEnv)
    }
  }
})

test('hasPermission enforces the role matrix', () => {
  assert.equal(hasPermission('viewer', 'dashboard:view'), true)
  assert.equal(hasPermission('viewer', 'players:manage'), false)
  assert.equal(hasPermission('super_admin', 'settings:configure'), true)
})

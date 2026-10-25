import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHubAuth } from '../../server/hub-auth.ts'

type Result = { status: number; headers: Record<string, string>; body: string; nextCalled: boolean; url: string }

async function call(auth: ReturnType<typeof createHubAuth>, method: string, url: string, { body, cookie, origin }: { body?: unknown; cookie?: string; origin?: string } = {}): Promise<Result> {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as unknown as IncomingMessage
  Object.assign(req, { method, url, headers: { host: 'hub.test', ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) }, socket: { remoteAddress: '127.0.0.1' } })
  return new Promise(resolve => {
    const headers: Record<string, string> = {}
    const res = { statusCode: 200, setHeader: (key: string, value: string) => { headers[key.toLowerCase()] = value }, end: (text = '') => resolve({ status: res.statusCode, headers, body: text, nextCalled: false, url: req.url! }) } as unknown as ServerResponse & { statusCode: number }
    void auth(req, res, () => resolve({ status: 0, headers, body: '', nextCalled: true, url: req.url! }))
  })
}

const makeAuth = () => createHubAuth({ dataDirectory: mkdtempSync(join(tmpdir(), 'hub-auth-')), env: { HUB_ADMIN_PASSWORD: 'secret-pass' } as NodeJS.ProcessEnv })

test('signed-out visitors are sent to the sign-in page and Canopy APIs refuse them', async () => {
  const auth = makeAuth()
  const page = await call(auth, 'GET', '/canopy/')
  assert.equal(page.status, 302)
  assert.equal(page.headers.location, '/login?next=%2Fcanopy%2F')
  const api = await call(auth, 'GET', '/canopy/api/health')
  assert.equal(api.status, 401)
  assert.equal((await call(auth, 'GET', '/public/canopy/app.js')).status, 404)
  assert.equal((await call(auth, 'GET', '/learn')).nextCalled, true)
})

test('the admin signs in with a signed HttpOnly cookie, reaches Canopy, and signs out', async () => {
  const auth = makeAuth()
  assert.equal((await call(auth, 'POST', '/api/auth/login', { body: { username: 'admin', password: 'nope' } })).status, 401)
  assert.equal((await call(auth, 'POST', '/api/auth/login', { body: { username: 'admin', password: 'secret-pass' }, origin: 'https://elsewhere.test' })).status, 403)
  const login = await call(auth, 'POST', '/api/auth/login', { body: { username: 'admin', password: 'secret-pass' } })
  assert.equal(login.status, 200)
  assert.match(login.headers['set-cookie'], /HttpOnly; SameSite=Lax/)
  const cookie = login.headers['set-cookie'].split(';')[0]
  const me = JSON.parse((await call(auth, 'GET', '/api/auth/me', { cookie })).body)
  assert.deepEqual([me.admin, me.demoCredentials], [true, false])
  const page = await call(auth, 'GET', '/canopy/', { cookie })
  assert.equal(page.nextCalled, true)
  assert.equal(page.url, '/canopy/index.html')
  const tampered = cookie.replace(/.$/, character => character === 'a' ? 'b' : 'a')
  assert.equal((await call(auth, 'GET', '/canopy/', { cookie: tampered })).status, 302)
  const logout = await call(auth, 'POST', '/api/auth/logout', { cookie })
  assert.match(logout.headers['set-cookie'], /Max-Age=0/)
})

test('repeated wrong passwords are slowed down', async () => {
  const auth = makeAuth()
  for (let attempt = 0; attempt < 5; attempt++) await call(auth, 'POST', '/api/auth/login', { body: { username: 'admin', password: 'wrong' } })
  assert.equal((await call(auth, 'POST', '/api/auth/login', { body: { username: 'admin', password: 'secret-pass' } })).status, 429)
})

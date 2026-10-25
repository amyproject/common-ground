import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, resolve } from 'node:path'

type Next = (error?: unknown) => void
type CanopyApi = {
  providerConfig: (env: NodeJS.ProcessEnv) => object
  aiConfig: (env: NodeJS.ProcessEnv) => object
  PARTNER_CATEGORIES: unknown
  handleSend: (body: unknown, options: object) => Promise<{ status: number; json: unknown }>
  discoverPartners: (body: unknown, options: object) => Promise<{ status: number; json: unknown }>
  recommend: (body: unknown, options: object) => Promise<{ status: number; json: unknown }>
  ask: (body: unknown, options: object) => Promise<{ status: number; json: unknown }>
  loadDotEnv: (file: string) => Record<string, string>
}

const COOKIE = 'cg_admin'
const SESSION_SECONDS = 8 * 60 * 60
export const DEFAULT_ADMIN = { user: 'admin', password: 'permaculture' }

// A demo-grade admin gate: one configured account, a signed HttpOnly cookie, and a
// failed-login limit. It is not a multi-user identity system.
export function createHubAuth({ dataDirectory, env = process.env, disabled = false }: { dataDirectory: string; env?: NodeJS.ProcessEnv; disabled?: boolean }) {
  const user = env.HUB_ADMIN_USER || DEFAULT_ADMIN.user
  const password = env.HUB_ADMIN_PASSWORD || DEFAULT_ADMIN.password
  const usingDefaults = !env.HUB_ADMIN_PASSWORD
  const secret = env.HUB_SESSION_SECRET || persistentSecret(dataDirectory)
  const failures = new Map<string, { count: number; until: number }>()
  let canopy: Promise<CanopyApi> | null = null
  const canopyEnv = () => ({ ...(existsSync(resolve('.env')) ? loadEnvFile(resolve('.env')) : {}), ...env })

  const sign = (value: string) => createHmac('sha256', secret).update(value).digest('base64url')
  const issue = () => { const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS; const payload = `${user}.${expires}`; return `${payload}.${sign(payload)}` }
  const verify = (token: string | undefined) => {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [name, expires, mac] = parts
    const expected = Buffer.from(sign(`${name}.${expires}`)), given = Buffer.from(mac)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    if (Number(expires) * 1000 < Date.now() || name !== user) return null
    return { name }
  }
  const session = (req: IncomingMessage) => disabled ? { name: user } : verify(cookies(req)[COOKIE])

  const hubAuth = async function hubAuth(req: IncomingMessage, res: ServerResponse, next: Next) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = decodeURIComponent(url.pathname)
    try {
      if (path === '/api/auth/me') return json(res, 200, session(req) ? { admin: true, name: session(req)!.name, demoCredentials: usingDefaults } : { admin: false, demoCredentials: usingDefaults })
      if (path === '/api/auth/login') {
        if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
        if (!sameOrigin(req)) return json(res, 403, { error: 'Cross-site sign-in blocked.' })
        const ip = req.socket.remoteAddress ?? 'local'
        const lock = failures.get(ip)
        if (lock && lock.count >= 5 && lock.until > Date.now()) return json(res, 429, { error: 'Too many attempts. Wait a minute and try again.' })
        const body = await readJson(req)
        if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') return json(res, 400, { error: 'Enter a username and password.' })
        if (!safeEqual(body.username.trim(), user) || !safeEqual(body.password, password)) {
          const current = lock && lock.until > Date.now() ? lock : { count: 0, until: 0 }
          failures.set(ip, { count: current.count + 1, until: Date.now() + 60_000 })
          return json(res, 401, { error: 'That username and password don’t match the admin account.' })
        }
        failures.delete(ip)
        res.setHeader('Set-Cookie', `${COOKIE}=${issue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}`)
        return json(res, 200, { admin: true, name: user })
      }
      if (path === '/api/auth/logout') {
        if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
        if (!sameOrigin(req)) return json(res, 403, { error: 'Cross-site request blocked.' })
        res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
        return json(res, 200, { admin: false })
      }

      // Everything Canopy serves sits behind the admin session, including dev-server
      // aliases that could otherwise reach the same files.
      const canopyPath = path === '/canopy' || path.startsWith('/canopy/')
      const aliasPath = /^\/(@fs\/.*\/)?public\/canopy(\/|$)/.test(path) || (path.startsWith('/@fs/') && path.includes('/public/canopy/')) || path.startsWith('/server/')
      if (path === '/plan') { res.statusCode = 302; res.setHeader('Location', '/plan/' + url.search); return res.end() }
      if (path === '/plan/') { req.url = '/plan/index.html' + url.search; return next() }
      if (!canopyPath && !aliasPath) return next()
      if (aliasPath) return json(res, 404, { error: 'Not found' })
      if (!session(req)) {
        if (path.startsWith('/canopy/api/')) return json(res, 401, { error: 'Sign in as an admin to use Canopy.' })
        res.statusCode = 302
        res.setHeader('Location', `/login?next=${encodeURIComponent(path === '/canopy' ? '/canopy/' : path + url.search)}`)
        return res.end()
      }
      if (path === '/canopy') { res.statusCode = 302; res.setHeader('Location', '/canopy/'); return res.end() }
      if (path === '/canopy/') req.url = '/canopy/index.html' + url.search
      res.setHeader('Cache-Control', 'no-store')
      if (path.startsWith('/canopy/api/')) {
        canopy ??= import(/* @vite-ignore */ resolve('server/canopy/server.mjs')) as Promise<CanopyApi>
        const api = await canopy
        const env = canopyEnv()
        const route = path.slice('/canopy'.length)
        if (route === '/api/health') return json(res, 200, { ...api.providerConfig(env), ai: api.aiConfig(env), categories: api.PARTNER_CATEGORIES })
        const handlers: Record<string, CanopyApi['ask']> = { '/api/send': api.handleSend, '/api/ai/partners': api.discoverPartners, '/api/ai/recommendations': api.recommend, '/api/ai/ask': api.ask }
        const handler = handlers[route]
        if (!handler) return json(res, 404, { error: 'Not found' })
        if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
        if (!sameOrigin(req)) return json(res, 403, { error: 'Cross-site request blocked.' })
        const body = await readJson(req, route === '/api/send' ? 1e6 : 2e5)
        if (body === null) return json(res, 400, { error: 'Invalid JSON' })
        const out = await handler(body, { env, fetchImpl: globalThis.fetch, logPath: join(dataDirectory, 'canopy-outbox-dryrun.log') })
        return json(res, out.status, out.json)
      }
      return next()
    } catch (error) {
      if (error instanceof PayloadError) return json(res, 413, { error: 'Payload too large' })
      return json(res, 500, { error: 'Server error' })
    }
  }
  // Lets other local APIs (volunteer sign-ups) check for an organizer session.
  return Object.assign(hubAuth, { isAdmin: (req: IncomingMessage) => Boolean(session(req)), secret })
}

class PayloadError extends Error {}

function persistentSecret(directory: string) {
  const file = join(directory, 'hub-session-secret')
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  mkdirSync(directory, { recursive: true })
  const value = randomBytes(32).toString('base64url')
  writeFileSync(file, value, { mode: 0o600 })
  return value
}

function loadEnvFile(file: string) {
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match) out[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

function cookies(req: IncomingMessage) {
  return Object.fromEntries((req.headers.cookie ?? '').split(';').map(part => part.trim().split('=')).filter(([key]) => key).map(([key, ...rest]) => [key, rest.join('=')]))
}

function safeEqual(a: string, b: string) {
  const left = createHmac('sha256', 'compare').update(a).digest(), right = createHmac('sha256', 'compare').update(b).digest()
  return timingSafeEqual(left, right)
}

function sameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host } catch { return false }
}

async function readJson(req: IncomingMessage, limit = 1e4): Promise<Record<string, unknown> | null> {
  let raw = ''
  for await (const chunk of req) { raw += chunk; if (raw.length > limit) throw new PayloadError() }
  try { const value = JSON.parse(raw); return value && typeof value === 'object' ? value : null } catch { return null }
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

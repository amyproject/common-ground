// Vercel Routing Middleware: the hosted version of server/hub-auth.ts.
// Vercel serves the built site as static files, so the admin sign-in and the
// Canopy gate run here at the edge instead of in the Vite dev server.
// Set HUB_ADMIN_PASSWORD and HUB_SESSION_SECRET in the Vercel project settings;
// without them the demo account admin / permaculture applies.

export const config = { matcher: ['/api/auth/:path*', '/canopy', '/canopy/:path*'] }

const COOKIE = 'cg_admin'
const SESSION_SECONDS = 8 * 60 * 60
const encoder = new TextEncoder()

const settings = () => {
  const env = (typeof process !== 'undefined' && process.env) || {}
  const user = env.HUB_ADMIN_USER || 'admin'
  const password = env.HUB_ADMIN_PASSWORD || 'permaculture'
  return { user, password, demo: !env.HUB_ADMIN_PASSWORD, secret: env.HUB_SESSION_SECRET || `common-ground:${user}:${password}` }
}

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })
const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } })
const toBase64Url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

// Compare HMACs of both strings so timing doesn't reveal how much matched.
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sign('compare', a), sign('compare', b)])
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.min(x.length, y.length); i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

async function session(request, { user, secret }) {
  const cookie = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))
  if (!cookie) return null
  const [name, expires, mac] = cookie.slice(COOKIE.length + 1).split('.')
  if (!name || !expires || !mac || name !== user || Number(expires) * 1000 < Date.now()) return null
  return await safeEqual(mac, await sign(secret, `${name}.${expires}`)) ? { name } : null
}

const sameOrigin = request => {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try { return new URL(origin).host === new URL(request.url).host } catch { return false }
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const path = url.pathname
  const config = settings()

  if (path === '/api/auth/me') {
    const signedIn = await session(request, config)
    return json(200, signedIn ? { admin: true, name: signedIn.name, demoCredentials: config.demo } : { admin: false, demoCredentials: config.demo })
  }
  if (path === '/api/auth/login') {
    if (request.method !== 'POST') return json(405, { error: 'POST only' })
    if (!sameOrigin(request)) return json(403, { error: 'Cross-site sign-in blocked.' })
    let body = null
    try { body = await request.json() } catch { /* handled below */ }
    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') return json(400, { error: 'Enter a username and password.' })
    const ok = (await safeEqual(body.username.trim(), config.user)) & (await safeEqual(body.password, config.password))
    if (!ok) {
      // Edge instances don't share memory, so slow every miss instead of counting them.
      await new Promise(resolve => setTimeout(resolve, 800))
      return json(401, { error: 'That username and password don’t match the admin account.' })
    }
    const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS
    const payload = `${config.user}.${expires}`
    return json(200, { admin: true, name: config.user }, { 'set-cookie': `${COOKIE}=${payload}.${await sign(config.secret, payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}` })
  }
  if (path === '/api/auth/logout') {
    if (request.method !== 'POST') return json(405, { error: 'POST only' })
    if (!sameOrigin(request)) return json(403, { error: 'Cross-site request blocked.' })
    return json(200, { admin: false }, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` })
  }

  // Canopy pages and assets.
  if (!(await session(request, config))) {
    if (path.startsWith('/canopy/api/')) return json(401, { error: 'Sign in as an admin to use Canopy.' })
    const target = path === '/canopy' ? '/canopy/' : path + url.search
    return Response.redirect(new URL(`/login?next=${encodeURIComponent(target)}`, url), 302)
  }
  // Sending and AI need the Node server, which only runs locally; Canopy falls back to
  // mailto/sms links when its health check fails.
  if (path.startsWith('/canopy/api/')) return json(404, { error: 'Not available on the hosted site.' })
  if (path === '/canopy') return Response.redirect(new URL('/canopy/', url), 302)
  return next()
}

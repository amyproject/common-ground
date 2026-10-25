// Verifies the organizer cookie that middleware.js issues on Vercel (same secret and format).
import { createHmac, timingSafeEqual } from 'node:crypto'

export function adminSecret(env) {
  const user = env.HUB_ADMIN_USER || 'admin', password = env.HUB_ADMIN_PASSWORD || 'permaculture'
  return { user, secret: env.HUB_SESSION_SECRET || `common-ground:${user}:${password}` }
}

export function isAdminCookie(req, env) {
  const { user, secret } = adminSecret(env)
  const raw = (req.headers.cookie ?? '').split(';').map(part => part.trim()).find(part => part.startsWith('cg_admin='))
  if (!raw) return false
  const [name, expires, mac] = raw.slice('cg_admin='.length).split('.')
  if (name !== user || !expires || !mac || Number(expires) * 1000 < Date.now()) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(`${name}.${expires}`).digest('base64url')), given = Buffer.from(mac)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

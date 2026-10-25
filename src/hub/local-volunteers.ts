// Device mode for the volunteer program. The hosted hub answers /api/volunteer with 503
// until organizers connect a database; then this runs the same API (server/volunteers.mjs)
// in the browser, saving volunteers to localStorage, so sign-up, the dashboard, Seeds,
// the shop, and Canopy's Hub sign-ups all keep working on this device. Once storage is
// connected the server answers normally and this stays out of the way.
// Loaded on every hub page by /hub/hub.js (built to /hub/local-volunteers.js).
type Api = (req: unknown, res: unknown) => Promise<void>

const STORE_KEY = 'common-ground-volunteers-v1'
const COOKIE_KEY = 'common-ground-volunteer-session'
const flag = window as unknown as { hubVolunteersInstalled?: boolean }

function deviceStore() {
  const read = (): Record<string, Record<string, unknown>> => { try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') } catch { return {} } }
  const write = (data: Record<string, Record<string, unknown>>) => localStorage.setItem(STORE_KEY, JSON.stringify(data))
  return {
    async hget(name: string, field: string) { return read()[name]?.[field] ?? null },
    async hset(name: string, field: string, value: unknown) { const data = read(); (data[name] ??= {})[field] = value; write(data) },
    async hsetnx(name: string, field: string, value: unknown) { const data = read(); if (data[name] && field in data[name]) return false; (data[name] ??= {})[field] = value; write(data); return true },
    async hgetall(name: string) { return read()[name] ?? {} },
  }
}

let api: Promise<Api> | null = null
let admin = false
const loadApi = () => api ??= (async () => {
  // @ts-expect-error plain JS shim
  await import('./device/buffer.js')
  // @ts-expect-error classic script that sets globalThis.MY (Seeds rules and tiers)
  await import('../../public/canopy/engine/core.js')
  // @ts-expect-error classic script
  await import('../../public/canopy/engine/rewards.js')
  // @ts-expect-error plain JS module shared with the dev server and the Vercel function
  const { createVolunteerApi } = await import('../../server/volunteers.mjs')
  return createVolunteerApi({ store: deviceStore(), secret: 'volunteers:this-device', isAdmin: () => admin }) as Api
})()

async function answer(url: URL, init: RequestInit | undefined, realFetch: typeof fetch): Promise<Response> {
  const handler = await loadApi()
  const route = url.pathname.replace(/^\/api\/volunteer\/?/, '')
  // Organizer routes still need the real organizer session (the cookie is HttpOnly, so ask the server).
  if (route.startsWith('admin/')) admin = await realFetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : {}).then((state: { admin?: boolean }) => Boolean(state.admin)).catch(() => false)
  let body: unknown = {}
  if (typeof init?.body === 'string') { try { body = JSON.parse(init.body) } catch { body = init.body } }
  const req = { method: (init?.method ?? 'GET').toUpperCase(), url: url.pathname + url.search, body, headers: { host: location.host, cookie: localStorage.getItem(COOKIE_KEY) ?? '' }, socket: { remoteAddress: 'device' } }
  return new Promise(resolve => {
    const res = {
      statusCode: 200,
      setHeader(key: string, value: string) {
        if (key.toLowerCase() !== 'set-cookie') return
        if (/Max-Age=0\b/.test(value)) localStorage.removeItem(COOKIE_KEY)
        else localStorage.setItem(COOKIE_KEY, value.split(';')[0])
      },
      end(text: string) { resolve(new Response(text, { status: res.statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' } })) },
    }
    void handler(req, res)
  })
}

function install() {
  if (flag.hubVolunteersInstalled) return
  flag.hubVolunteersInstalled = true
  try { localStorage.getItem(STORE_KEY) } catch { return } // no storage: let the 503 through to the "open soon" card
  const realFetch = window.fetch.bind(window)
  let onDevice = false
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href)
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/volunteer')) return realFetch(input, init)
    if (!onDevice) {
      const response = await realFetch(input, init)
      if (response.status !== 503) return response
      onDevice = true
    }
    return answer(url, init, realFetch)
  }
}

install()

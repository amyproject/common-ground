// Vercel function for /api/volunteer/* (see the rewrite in vercel.json).
import { isAdminCookie } from '../server/admin-cookie.mjs'
import { upstashConfig, upstashStore } from '../server/volunteer-store-upstash.mjs'
import { createVolunteerApi, memoryStore } from '../server/volunteers.mjs'

const env = process.env
const storage = upstashConfig(env)
// Volunteer sessions need a private secret: the explicit one, else the storage token.
const secret = env.HUB_SESSION_SECRET || storage?.token || 'unconfigured'
const api = createVolunteerApi({
  store: storage ? upstashStore(storage) : memoryStore(),
  secret: `volunteers:${secret}`,
  isAdmin: req => isAdminCookie(req, env),
  secureCookies: true,
  // Set HUB_DEMO_VOLUNTEER=off to hide the shared demo volunteer account.
  demo: env.HUB_DEMO_VOLUNTEER !== 'off',
  unavailable: storage ? null : 'Volunteer sign-up isn’t switched on for this site yet. The organizers need to connect a database (Vercel → Storage → Upstash Redis).',
})

export default function handler(req, res) { return api(req, res) }

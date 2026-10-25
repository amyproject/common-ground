// Volunteer sign-up, sessions, and Seeds for the hub, shared by the Vite dev server
// (server/volunteer-store-sqlite.mjs) and the Vercel function (api/volunteer.mjs).
// Seeds use Canopy's own earn rules and tiers, so a volunteer's dashboard and the
// organizer's view agree. Points are derived from stored facts (sign-up, attendance,
// referrals who showed up, Explore stamps), never stored as a balance.
import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const require = createRequire(import.meta.url)
require('../public/canopy/engine/core.js')
require('../public/canopy/engine/rewards.js')
const MY = globalThis.MY
const RULE = Object.fromEntries(MY.EARN_RULES.map(rule => [rule.id, rule]))

const COOKIE = 'cg_vol'
const SESSION_DAYS = 30
export const INTERESTS = ['planting', 'building', 'watering', 'compost', 'teaching', 'outreach']
export const AVAILABILITY = ['weekday-mornings', 'weekday-evenings', 'weekends']
export const NEIGHBORHOODS = ['West Oakland', 'Downtown Oakland', 'Lake Merritt', 'Fruitvale', 'East Oakland', 'North Oakland / Temescal', 'Berkeley', 'Emeryville', 'Richmond', 'Alameda', 'San Leandro / Hayward', 'San Francisco', 'Marin', 'Peninsula', 'South Bay', 'North Bay', 'Elsewhere']
const ZONES = ['coast', 'bay', 'hills', 'valley', 'inland']
const STAMP_POINTS = 3
const SEEDS_PER_LOGGED_HOUR = 2
const EVENT_HOURS = { workday: 3, meeting: 2.5, workshop: 2 }
// The Guild shop, built around the Permaculture Seed Kit: rewards organizers hand out at
// meetings. Prices are in Seeds; stock is what the Guild has on hand (a starting sample).
export const KIT_VARIETIES = {
  Vegetables: ['Tomato', 'Pepper', 'Lettuce', 'Spinach', 'Kale', 'Cabbage', 'Broccoli', 'Carrot', 'Radish', 'Beet', 'Onion', 'Garlic', 'Peas', 'Bush beans', 'Corn', 'Squash', 'Cucumber', 'Potato', 'Strawberry'],
  Herbs: ['Basil', 'Dill', 'Chives', 'Rosemary'],
  Flowers: ['Marigold', 'Nasturtium', 'Borage', 'Sunflower', 'Yarrow'],
  'Cover crops': ['Comfrey', 'White clover'],
}
const VARIETIES = Object.values(KIT_VARIETIES).flat()
export const SHOP = [
  { id: 'seed-kit', name: 'Permaculture Seed Kit', detail: 'The full collection: 30 seed packets across vegetables, herbs, flowers, and cover crops, a permaculture gardening guide, plant markers, compostable pots, and coir seed-starting discs.', price: 150, stock: 12, kind: 'kit', image: '/hub/shop/permaculture-seed-kit.jpg', contents: KIT_VARIETIES },
  { id: 'seed-packet', name: 'Single seed packet', detail: 'Any one variety from the kit, from the Guild seed library.', price: 5, stock: 400, kind: 'seeds', varieties: VARIETIES },
  { id: 'pollinator-patch', name: 'Pollinator patch', detail: 'Borage, marigold, nasturtium, sunflower, yarrow, and dill to bring bees and beneficial insects.', price: 25, stock: 40, kind: 'seeds' },
  { id: 'three-sisters', name: 'Three sisters', detail: 'Corn, bush beans, and squash: the classic guild where each plant helps the others.', price: 15, stock: 40, kind: 'seeds' },
  { id: 'soil-builders', name: 'Soil builders', detail: 'Comfrey, white clover, and peas to fix nitrogen, mine nutrients, and feed the soil.', price: 15, stock: 40, kind: 'seeds' },
  { id: 'salad-bed', name: 'Salad bed', detail: 'Lettuce, spinach, kale, radish, and chives for a fast cool-season bed.', price: 20, stock: 40, kind: 'seeds' },
  { id: 'starter-supplies', name: 'Seed-starting supplies', detail: 'Plant markers, compostable pots, and coir discs from the kit, enough for a tray of starts.', price: 20, stock: 30, kind: 'supplies' },
]
const WELCOME_POINTS = 5

class ApiError extends Error { constructor(status, message) { super(message); this.status = status } }
const today = () => new Date().toISOString().slice(0, 10)
const clean = (value, max) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

// --- Seeds, tiers, badges ------------------------------------------------------------
export function seedsFor(volunteer, everyone, events) {
  const byId = Object.fromEntries(events.map(event => [event.id, event]))
  const ledger = [{ date: volunteer.createdAt.slice(0, 10), points: WELCOME_POINTS, reason: 'Joined through Common Ground', category: 'Grow' }]
  const attended = (volunteer.attended ?? []).map(id => byId[id]).filter(Boolean).sort((a, b) => a.date < b.date ? -1 : 1)
  attended.forEach((event, index) => {
    if (index === 0) ledger.push({ date: event.date, points: RULE.first.points, reason: RULE.first.label, category: RULE.first.category })
    const rule = RULE[event.kind] ?? RULE.workday
    ledger.push({ date: event.date, points: rule.points, reason: event.title, category: rule.category })
  })
  for (const friend of everyone) {
    if (friend.referredBy !== volunteer.id || !(friend.attended ?? []).length) continue
    const first = friend.attended.map(id => byId[id]?.date).filter(Boolean).sort()[0]
    if (first) ledger.push({ date: first, points: RULE.referral.points, reason: `${friend.firstName} came to their first event`, category: RULE.referral.category })
  }
  for (const stamp of volunteer.stamps ?? []) ledger.push({ date: stamp.date, points: STAMP_POINTS, reason: `Explore field stamp: ${stamp.zone}`, category: 'Learn' })
  for (const log of volunteer.logs ?? []) if (log.status === 'verified') ledger.push({ date: log.date, points: Math.round(log.hours * SEEDS_PER_LOGGED_HOUR), reason: `Logged ${log.hours} h: ${log.activity}`, category: 'Show up' })
  ledger.sort((a, b) => a.date < b.date ? -1 : 1)
  const points = ledger.reduce((sum, item) => sum + item.points, 0)
  // Spending draws down the wallet; the tier follows lifetime Seeds, so it never drops.
  const spent = (volunteer.orders ?? []).filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + order.price, 0)
  return { ledger, points, spent, balance: points - spent, tier: MY.tierFor(points) }
}

export function trackerFor(volunteer, events) {
  const byId = Object.fromEntries(events.map(event => [event.id, event]))
  const done = [
    ...(volunteer.attended ?? []).map(id => byId[id]).filter(Boolean).map(event => ({ date: event.date, hours: event.hours ?? EVENT_HOURS[event.kind] ?? 3, what: event.title, source: 'event', status: 'verified' })),
    ...(volunteer.logs ?? []).filter(log => log.status !== 'declined').map(log => ({ date: log.date, hours: log.hours, what: log.activity, source: 'logged', status: log.status, id: log.id, place: log.place })),
  ].sort((a, b) => a.date < b.date ? 1 : -1)
  const month = today().slice(0, 7)
  const thisMonth = done.filter(item => item.date.slice(0, 7) === month)
  const months = new Set(done.map(item => item.date.slice(0, 7)))
  let streak = 0
  for (let cursor = new Date(); months.has(cursor.toISOString().slice(0, 7)) || (streak === 0 && cursor.toISOString().slice(0, 7) === month); cursor.setUTCMonth(cursor.getUTCMonth() - 1, 1)) {
    if (months.has(cursor.toISOString().slice(0, 7))) streak++; else if (streak === 0) continue
    if (streak > 120) break
  }
  const goal = volunteer.goal ?? { hoursPerMonth: 4, eventsPerMonth: 2, focus: '' }
  const round = value => Math.round(value * 10) / 10
  return {
    totalHours: round(done.reduce((sum, item) => sum + item.hours, 0)),
    totalActivities: done.length,
    monthHours: round(thisMonth.reduce((sum, item) => sum + item.hours, 0)),
    monthEvents: thisMonth.length,
    streakMonths: streak,
    goal,
    history: done.slice(0, 40),
  }
}

export function badgesFor(volunteer, everyone) {
  const attended = (volunteer.attended ?? []).length
  const referred = everyone.filter(friend => friend.referredBy === volunteer.id)
  return [
    { id: 'joined', name: 'First step', detail: 'Signed up', earned: true },
    { id: 'rsvp', name: 'Count me in', detail: 'RSVP to an event', earned: (volunteer.rsvps ?? []).length > 0 || attended > 0 },
    { id: 'first', name: 'Boots on', detail: 'Come to your first event', earned: attended >= 1 },
    { id: 'regular', name: 'Regular', detail: 'Come to 3 events', earned: attended >= 3 },
    { id: 'connector', name: 'Connector', detail: 'A friend you invited shows up', earned: referred.some(friend => (friend.attended ?? []).length) },
    { id: 'explorer', name: 'Explorer', detail: 'Collect 3 field stamps in Explore', earned: (volunteer.stamps ?? []).length >= 3 },
    { id: 'plugged', name: 'Plugged in', detail: 'Join the Guild’s email list and one other channel', earned: (volunteer.plugIn ?? []).includes('email') && (volunteer.plugIn ?? []).length >= 2 },
  ]
}

// --- Store helpers ---------------------------------------------------------------------
async function all(store, hash) { return Object.values(await store.hgetall(hash)).map(value => JSON.parse(value)) }
async function one(store, hash, id) { const value = await store.hget(hash, id); return value ? JSON.parse(value) : null }
const put = (store, hash, record) => store.hset(hash, record.id, JSON.stringify(record))

// The Guild's monthly meeting is real and recurring (2nd Mondays at the Oakland Peace Center).
function secondMondays(count) {
  const out = []
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let offset = 0; out.length < count && offset < 24; offset++) {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const date = new Date(first.getFullYear(), first.getMonth(), 1 + ((8 - first.getDay()) % 7) + 7)
    if (date >= start) out.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)
  }
  return out
}

function starterEvents() {
  const meetings = secondMondays(2).map(date => ({ title: 'Guild monthly meeting & potluck', kind: 'meeting', hours: 2.5, date, time: '6:00–8:30 PM', place: 'Oakland Peace Center, 111 Fairmount Ave', neighborhood: 'Lake Merritt', capacity: 0, url: 'https://partiful.com/u/PcnFYcpQOwCLdVFxzZ3i', description: 'Bring food or drink and your own plate. Announcements, needs and offers, and guest speakers every other month. Confirm the date on the Guild’s Partiful.', sample: false }))
  const day = offset => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
  const sample = { title: 'Sheet-mulch Saturday (sample)', kind: 'workday', hours: 3, date: day(6), time: '9:30 AM–12:30 PM', place: 'Community garden, Fruitvale', neighborhood: 'Fruitvale', capacity: 20, description: 'A placeholder workday so the calendar isn’t empty. Organizers replace it with real workdays in Canopy.', sample: true }
  return [sample, ...meetings].map(event => ({ ...event, id: randomUUID(), createdAt: new Date().toISOString() }))
}

async function events(store) {
  let list = await all(store, 'events')
  if (!list.length && !(await store.hget('meta', 'seeded'))) {
    // Starter events: the Guild's next two monthly meetings plus one labeled sample workday.
    if (await store.hsetnx('meta', 'seeded', '1')) for (const event of starterEvents()) await put(store, 'events', event)
    list = await all(store, 'events')
  }
  return list.filter(event => !event.archived).sort((a, b) => a.date < b.date ? -1 : 1)
}

async function stockLeft(store) {
  const saved = await store.hgetall('stock')
  return Object.fromEntries(SHOP.map(item => [item.id, saved[item.id] === undefined ? item.stock : Number(saved[item.id])]))
}

async function shopFor(store, volunteer) {
  const stock = await stockLeft(store)
  return { items: SHOP.map(item => ({ ...item, stock: stock[item.id] })), orders: (volunteer.orders ?? []).slice().reverse() }
}

async function referralCode(store, firstName) {
  const stem = firstName.toUpperCase().normalize('NFD').replace(/[^A-Z]/g, '').slice(0, 6) || 'GROW'
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `${stem}-${randomBytes(2).readUInt16BE() % 9000 + 1000}`
    if (!(await store.hget('codes', code))) return code
  }
  return `${stem}-${randomBytes(4).toString('hex').toUpperCase()}`
}

// --- HTTP ---------------------------------------------------------------------------------
// A shared demo volunteer so people can try the dashboard from the sign-in page ("Fill in").
export const DEMO_VOLUNTEER = { email: 'demo.volunteer@commonground.example', password: 'grow-together' }

export function createVolunteerApi({ store, secret, isAdmin, secureCookies = false, unavailable = null, demo = true }) {
  const sign = value => createHmac('sha256', secret).update(value).digest('base64url')
  const cookieFlags = `Path=/; HttpOnly; SameSite=Lax${secureCookies ? '; Secure' : ''}`
  const issue = id => { const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400; return `${COOKIE}=${id}.${expires}.${sign(`${id}.${expires}`)}; ${cookieFlags}; Max-Age=${SESSION_DAYS * 86_400}` }
  const sessionId = req => {
    const raw = (req.headers.cookie ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))
    if (!raw) return null
    const [id, expires, mac] = raw.slice(COOKIE.length + 1).split('.')
    if (!id || !expires || !mac || Number(expires) * 1000 < Date.now()) return null
    const expected = Buffer.from(sign(`${id}.${expires}`)), given = Buffer.from(mac)
    return expected.length === given.length && timingSafeEqual(expected, given) ? id : null
  }
  const failures = new Map()

  async function dashboard(volunteer) {
    const [everyone, list] = await Promise.all([all(store, 'volunteers'), events(store)])
    const seeds = seedsFor(volunteer, everyone, list)
    const month = today().slice(0, 7)
    const teams = {}
    for (const person of everyone) {
      const earned = seedsFor(person, everyone, list).ledger.filter(item => item.date.slice(0, 7) === month).reduce((sum, item) => sum + item.points, 0)
      teams[person.neighborhood] = (teams[person.neighborhood] ?? 0) + earned
    }
    const standings = Object.entries(teams).map(([name, points]) => ({ name, points })).sort((a, b) => b.points - a.points)
    const upcoming = list.filter(event => event.date >= today())
    return {
      volunteer: publicVolunteer(volunteer),
      tracker: trackerFor(volunteer, list),
      shop: await shopFor(store, volunteer),
      seeds: { points: seeds.points, balance: seeds.balance, spent: seeds.spent, ledger: seeds.ledger.slice().reverse(), tier: seeds.tier, tiers: MY.TIERS, rules: [...MY.EARN_RULES.filter(rule => ['workday', 'meeting', 'workshop', 'first', 'referral'].includes(rule.id)), { id: 'stamp', label: 'Explore field stamp (up to 5)', points: STAMP_POINTS, category: 'Learn' }, { id: 'logged', label: 'Logged volunteer hour, once an organizer verifies it', points: SEEDS_PER_LOGGED_HOUR, category: 'Show up' }] },
      badges: badgesFor(volunteer, everyone),
      events: upcoming.map(event => ({ ...event, going: (volunteer.rsvps ?? []).includes(event.id), attended: (volunteer.attended ?? []).includes(event.id), count: everyone.filter(person => (person.rsvps ?? []).includes(event.id)).length })),
      attended: list.filter(event => (volunteer.attended ?? []).includes(event.id)).map(event => ({ id: event.id, title: event.title, date: event.date })),
      team: { mine: volunteer.neighborhood, rank: standings.findIndex(team => team.name === volunteer.neighborhood) + 1, standings: standings.slice(0, 6), month },
      referral: { code: volunteer.referralCode, signedUp: everyone.filter(friend => friend.referredBy === volunteer.id).length, showedUp: everyone.filter(friend => friend.referredBy === volunteer.id && (friend.attended ?? []).length).length },
    }
  }

  async function ensureDemo() {
    if (await store.hget('emails', DEMO_VOLUNTEER.email)) return
    const id = randomUUID()
    if (!(await store.hsetnx('emails', DEMO_VOLUNTEER.email, id))) return
    const salt = randomBytes(16)
    const hash = await scrypt(DEMO_VOLUNTEER.password, salt, 32)
    const day = offset => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10)
    const volunteer = {
      id, firstName: 'Demo', lastName: 'Volunteer', email: DEMO_VOLUNTEER.email, phone: '', neighborhood: 'Lake Merritt',
      interests: ['planting', 'compost'], availability: ['weekends'], consentEmail: false, consentSms: false, note: 'Shared demo account.', demo: true,
      referredBy: null, referralCode: await referralCode(store, 'Demo'), password: `${salt.toString('base64')}.${hash.toString('base64')}`, createdAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
      rsvps: [], attended: [], stamps: [{ zone: 'coast', date: day(20) }, { zone: 'bay', date: day(12) }], plugIn: ['email'],
      logs: [{ id: randomUUID(), date: day(30), hours: 4, activity: 'Mulched fruit trees at a community garden', place: 'Oakland', status: 'verified', createdAt: new Date().toISOString() }, { id: randomUUID(), date: day(3), hours: 2, activity: 'Seed swap table at the Guild meeting', place: 'Oakland Peace Center', status: 'pending', createdAt: new Date().toISOString() }],
      orders: [], goal: { hoursPerMonth: 6, eventsPerMonth: 2, focus: 'Learn to build a swale' },
    }
    await store.hset('codes', volunteer.referralCode, id)
    await put(store, 'volunteers', volunteer)
  }

  const routes = {
    'GET demo': async () => { if (!demo) throw new ApiError(404, 'No demo account on this site.'); await ensureDemo(); return DEMO_VOLUNTEER },
    'GET session': async ({ volunteer }) => volunteer ? { signedIn: true, firstName: volunteer.firstName, points: seedsFor(volunteer, await all(store, 'volunteers'), await events(store)).points } : { signedIn: false },
    'POST signup': async ({ body, res, req }) => {
      if (body.website) throw new ApiError(400, 'Something went wrong.')
      const firstName = clean(body.firstName, 40), lastName = clean(body.lastName, 60), email = clean(body.email, 120).toLowerCase()
      const password = typeof body.password === 'string' ? body.password : ''
      if (!firstName) throw new ApiError(400, 'Add your first name.')
      if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new ApiError(400, 'Add an email address we can reach you at.')
      if (password.length < 8) throw new ApiError(400, 'Choose a password of at least 8 characters.')
      if (!body.ageOk) throw new ApiError(400, 'Confirm you’re 16 or older, or have a parent or guardian’s OK.')
      const neighborhood = NEIGHBORHOODS.includes(body.neighborhood) ? body.neighborhood : 'Elsewhere'
      const referrerId = typeof body.referral === 'string' && body.referral.trim() ? await store.hget('codes', body.referral.trim().toUpperCase()) : null
      const id = randomUUID()
      if (!(await store.hsetnx('emails', email, id))) throw new ApiError(409, 'That email already has an account. Sign in instead.')
      const salt = randomBytes(16)
      const hash = await scrypt(password, salt, 32)
      const volunteer = {
        id, firstName, lastName, email, phone: clean(body.phone, 30), neighborhood,
        interests: (Array.isArray(body.interests) ? body.interests : []).filter(item => INTERESTS.includes(item)),
        availability: (Array.isArray(body.availability) ? body.availability : []).filter(item => AVAILABILITY.includes(item)),
        consentEmail: Boolean(body.consentEmail), consentSms: Boolean(body.consentSms) && Boolean(clean(body.phone, 30)),
        note: clean(body.note, 400), referredBy: referrerId, referralCode: await referralCode(store, firstName),
        password: `${salt.toString('base64')}.${hash.toString('base64')}`, createdAt: new Date().toISOString(), rsvps: [], attended: [], stamps: [], plugIn: [], logs: [], orders: [], goal: { hoursPerMonth: 4, eventsPerMonth: 2, focus: '' },
      }
      await store.hset('codes', volunteer.referralCode, id)
      await put(store, 'volunteers', volunteer)
      res.setHeader('Set-Cookie', issue(id))
      void req
      return dashboard(volunteer)
    },
    'POST signin': async ({ body, res, req }) => {
      const ip = req.socket?.remoteAddress ?? req.headers['x-forwarded-for'] ?? 'local'
      const lock = failures.get(ip)
      if (lock && lock.count >= 8 && lock.until > Date.now()) throw new ApiError(429, 'Too many attempts. Wait a minute and try again.')
      const email = clean(body.email, 120).toLowerCase()
      if (demo && email === DEMO_VOLUNTEER.email) await ensureDemo()
      const id = email ? await store.hget('emails', email) : null
      const volunteer = id ? await one(store, 'volunteers', id) : null
      const [salt, stored] = (volunteer?.password ?? `${randomBytes(16).toString('base64')}.${randomBytes(32).toString('base64')}`).split('.')
      const hash = await scrypt(typeof body.password === 'string' ? body.password : '', Buffer.from(salt, 'base64'), 32)
      if (!volunteer || !timingSafeEqual(hash, Buffer.from(stored, 'base64'))) {
        const current = lock && lock.until > Date.now() ? lock : { count: 0, until: 0 }
        failures.set(ip, { count: current.count + 1, until: Date.now() + 60_000 })
        throw new ApiError(401, 'That email and password don’t match a volunteer account.')
      }
      failures.delete(ip)
      res.setHeader('Set-Cookie', issue(volunteer.id))
      return { signedIn: true }
    },
    'POST signout': async ({ res }) => { res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieFlags}; Max-Age=0`); return { signedIn: false } },
    'GET me': async ({ volunteer }) => dashboard(need(volunteer)),
    // Public shop catalog for the Volunteer page before anyone signs up.
    'GET shop': async () => ({ items: (await shopFor(store, { orders: [] })).items }),
    'POST rsvp': async ({ volunteer, body }) => {
      const me = need(volunteer)
      const event = (await events(store)).find(item => item.id === body.eventId && item.date >= today())
      if (!event) throw new ApiError(404, 'That event isn’t open for RSVPs.')
      const going = new Set(me.rsvps ?? [])
      if (body.going) {
        if (!going.has(event.id) && event.capacity && (await all(store, 'volunteers')).filter(person => (person.rsvps ?? []).includes(event.id)).length >= event.capacity) throw new ApiError(409, 'That event is full.')
        going.add(event.id)
      } else going.delete(event.id)
      me.rsvps = [...going]
      await put(store, 'volunteers', me)
      return dashboard(me)
    },
    'POST stamps': async ({ volunteer, body }) => {
      // Field stamps come from this browser's Explore progress; at most one per climate zone.
      const me = need(volunteer)
      const have = new Set((me.stamps ?? []).map(stamp => stamp.zone))
      for (const zone of Array.isArray(body.zones) ? body.zones : []) if (ZONES.includes(zone) && !have.has(zone)) { have.add(zone); me.stamps = [...(me.stamps ?? []), { zone, date: today() }] }
      await put(store, 'volunteers', me)
      return dashboard(me)
    },
    'POST log': async ({ volunteer, body }) => {
      // Past or outside volunteer work. It counts toward the tracker now and earns Seeds once verified.
      const me = need(volunteer)
      const date = clean(body.date, 10), hours = Number(body.hours), activity = clean(body.activity, 100)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today() || date < '2000-01-01') throw new ApiError(400, 'Pick the date you volunteered (today or earlier).')
      if (!(hours > 0 && hours <= 12)) throw new ApiError(400, 'Hours should be between 0.5 and 12 for one entry.')
      if (!activity) throw new ApiError(400, 'Say what you did.')
      if ((me.logs ?? []).filter(log => log.status === 'pending').length >= 20) throw new ApiError(429, 'You have 20 entries waiting for an organizer. Check back after they review them.')
      me.logs = [...(me.logs ?? []), { id: randomUUID(), date, hours: Math.round(hours * 2) / 2, activity, place: clean(body.place, 100), status: 'pending', createdAt: new Date().toISOString() }]
      await put(store, 'volunteers', me)
      return dashboard(me)
    },
    'POST goal': async ({ volunteer, body }) => {
      const me = need(volunteer)
      me.goal = { hoursPerMonth: Math.max(1, Math.min(60, Math.round(Number(body.hoursPerMonth) || 4))), eventsPerMonth: Math.max(1, Math.min(20, Math.round(Number(body.eventsPerMonth) || 2))), focus: clean(body.focus, 140) }
      await put(store, 'volunteers', me)
      return dashboard(me)
    },
    'POST order': async ({ volunteer, body }) => {
      const me = need(volunteer)
      const item = SHOP.find(entry => entry.id === body.itemId)
      if (!item) throw new ApiError(404, 'That reward isn’t in the shop.')
      const [everyone, list, stock] = await Promise.all([all(store, 'volunteers'), events(store), stockLeft(store)])
      if (stock[item.id] <= 0) throw new ApiError(409, 'That one’s out of stock for now.')
      const variety = item.varieties ? item.varieties.find(name => name === body.variety) : null
      if (item.varieties && !variety) throw new ApiError(400, 'Pick which seeds you want.')
      if (!item.varieties && (me.orders ?? []).some(order => order.itemId === item.id && order.status === 'requested')) throw new ApiError(409, 'You already have that one on order.')
      if (seedsFor(me, everyone, list).balance < item.price) throw new ApiError(409, 'Not enough Seeds yet. Keep showing up!')
      me.orders = [...(me.orders ?? []), { id: randomUUID(), itemId: item.id, name: variety ? `${variety} seed packet` : item.name, price: item.price, status: 'requested', createdAt: new Date().toISOString() }]
      await store.hset('stock', item.id, String(stock[item.id] - 1))
      await put(store, 'volunteers', me)
      return dashboard(me)
    },
    'POST order/cancel': async ({ volunteer, body }) => {
      const me = need(volunteer)
      const order = (me.orders ?? []).find(entry => entry.id === body.orderId)
      if (!order || order.status !== 'requested') throw new ApiError(409, 'Only requests that aren’t packed yet can be cancelled.')
      order.status = 'cancelled'
      const stock = await stockLeft(store)
      await store.hset('stock', order.itemId, String((stock[order.itemId] ?? 0) + 1))
      await put(store, 'volunteers', me)
      return dashboard(me)
    },
    'POST plugin': async ({ volunteer, body }) => {
      // Self-reported "plug in to the Guild" steps; they unlock a badge, not Seeds.
      const me = need(volunteer)
      const steps = new Set(me.plugIn ?? [])
      if (['email', 'partiful', 'hylo', 'instagram'].includes(body.step)) body.done === false ? steps.delete(body.step) : steps.add(body.step)
      me.plugIn = [...steps]
      await put(store, 'volunteers', me)
      return dashboard(me)
    },
    'POST profile': async ({ volunteer, body }) => {
      const me = need(volunteer)
      if (body.neighborhood && NEIGHBORHOODS.includes(body.neighborhood)) me.neighborhood = body.neighborhood
      if (Array.isArray(body.interests)) me.interests = body.interests.filter(item => INTERESTS.includes(item))
      if (Array.isArray(body.availability)) me.availability = body.availability.filter(item => AVAILABILITY.includes(item))
      if (typeof body.consentEmail === 'boolean') me.consentEmail = body.consentEmail
      if (typeof body.consentSms === 'boolean') me.consentSms = body.consentSms && Boolean(me.phone)
      await put(store, 'volunteers', me)
      return dashboard(me)
    },

    // Organizer endpoints, used by Canopy's Hub sign-ups page.
    'GET admin/overview': async ({ req }) => {
      admin(req)
      const [everyone, list] = await Promise.all([all(store, 'volunteers'), events(store)])
      const names = Object.fromEntries(everyone.map(person => [person.id, `${person.firstName} ${person.lastName}`.trim()]))
      return {
        volunteers: everyone.sort((a, b) => a.createdAt < b.createdAt ? 1 : -1).map(person => {
          const seeds = seedsFor(person, everyone, list)
          return { ...publicVolunteer(person), email: person.email, phone: person.phone, note: person.note, points: seeds.points, balance: seeds.balance, hours: trackerFor(person, list).totalHours, tier: seeds.tier.tier.name, referredByName: person.referredBy ? names[person.referredBy] ?? null : null, attendedCount: (person.attended ?? []).length }
        }),
        events: list.map(event => ({ ...event, going: everyone.filter(person => (person.rsvps ?? []).includes(event.id)).map(person => person.id), attended: everyone.filter(person => (person.attended ?? []).includes(event.id)).map(person => person.id) })),
        tiers: MY.TIERS.map(tier => ({ name: tier.name, min: tier.min })),
        logs: everyone.flatMap(person => (person.logs ?? []).map(log => ({ ...log, volunteerId: person.id, volunteerName: names[person.id] }))).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1),
        orders: everyone.flatMap(person => (person.orders ?? []).map(order => ({ ...order, volunteerId: person.id, volunteerName: names[person.id] }))).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1),
        stock: await stockLeft(store),
      }
    },
    'POST admin/events': async ({ req, body }) => {
      admin(req)
      const title = clean(body.title, 80), date = clean(body.date, 10)
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, 'Add a title and a date.')
      const url = /^https:\/\//.test(clean(body.url, 300)) ? clean(body.url, 300) : ''
      const kind = ['workday', 'meeting', 'workshop'].includes(body.kind) ? body.kind : 'workday'
      const event = { id: randomUUID(), title, date, url, hours: Number(body.hours) > 0 && Number(body.hours) <= 12 ? Number(body.hours) : EVENT_HOURS[kind], kind: ['workday', 'meeting', 'workshop'].includes(body.kind) ? body.kind : 'workday', time: clean(body.time, 40), place: clean(body.place, 100), neighborhood: clean(body.neighborhood, 60), capacity: Math.max(0, Math.min(500, Number(body.capacity) || 0)), description: clean(body.description, 400), sample: false, createdAt: new Date().toISOString() }
      await put(store, 'events', event)
      return { event }
    },
    'POST admin/archive': async ({ req, body }) => {
      admin(req)
      const event = await one(store, 'events', clean(body.eventId, 60))
      if (!event) throw new ApiError(404, 'Event not found.')
      event.archived = true
      await put(store, 'events', event)
      return { ok: true }
    },
    'POST admin/log': async ({ req, body }) => {
      admin(req)
      const person = await one(store, 'volunteers', clean(body.volunteerId, 60))
      const log = person?.logs?.find(entry => entry.id === body.logId)
      if (!log || !['verified', 'declined', 'pending'].includes(body.status)) throw new ApiError(404, 'Log entry not found.')
      log.status = body.status
      await put(store, 'volunteers', person)
      return { ok: true }
    },
    'POST admin/order': async ({ req, body }) => {
      admin(req)
      const person = await one(store, 'volunteers', clean(body.volunteerId, 60))
      const order = person?.orders?.find(entry => entry.id === body.orderId)
      if (!order || !['requested', 'ready', 'picked-up', 'cancelled'].includes(body.status)) throw new ApiError(404, 'Order not found.')
      if (order.status === 'cancelled') throw new ApiError(409, 'That order was already cancelled.')
      if (body.status === 'cancelled') { const stock = await stockLeft(store); await store.hset('stock', order.itemId, String((stock[order.itemId] ?? 0) + 1)) }
      order.status = body.status
      await put(store, 'volunteers', person)
      return { ok: true }
    },
    'POST admin/checkin': async ({ req, body }) => {
      admin(req)
      const person = await one(store, 'volunteers', clean(body.volunteerId, 60))
      const event = await one(store, 'events', clean(body.eventId, 60))
      if (!person || !event) throw new ApiError(404, 'Volunteer or event not found.')
      const attended = new Set(person.attended ?? [])
      if (body.present === false) attended.delete(event.id); else attended.add(event.id)
      person.attended = [...attended]
      await put(store, 'volunteers', person)
      return { ok: true, attended: person.attended }
    },
  }

  const need = volunteer => { if (!volunteer) throw new ApiError(401, 'Sign in to see your volunteer dashboard.'); return volunteer }
  const admin = req => { if (!isAdmin(req)) throw new ApiError(401, 'Sign in as an organizer.') }

  return async function volunteerApi(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const route = (url.searchParams.get('path') ?? url.pathname.replace(/^\/api\/volunteer/, '')).replace(/^\/+|\/+$/g, '')
    const send = (status, payload) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(payload)) }
    try {
      if (unavailable) throw new ApiError(503, unavailable)
      const handler = routes[`${req.method} ${route}`]
      if (!handler) throw new ApiError(routes[`GET ${route}`] || routes[`POST ${route}`] ? 405 : 404, 'Not found')
      if (req.method === 'POST') {
        const origin = req.headers.origin
        if (origin) { try { if (new URL(origin).host !== req.headers.host) throw new ApiError(403, 'Cross-site request blocked.') } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(403, 'Cross-site request blocked.') } }
      }
      const body = req.method === 'POST' ? await readBody(req) : {}
      const id = sessionId(req)
      const volunteer = id ? await one(store, 'volunteers', id) : null
      send(200, await handler({ req, res, body, volunteer }))
    } catch (error) {
      if (error instanceof ApiError) send(error.status, { error: error.message })
      else { console.error('volunteer api', error); send(500, { error: 'Something went wrong on our side. Try again.' }) }
    }
  }
}

function publicVolunteer(volunteer) {
  const { password: _password, email: _email, phone: _phone, note: _note, ...rest } = volunteer
  return { ...rest, hasPhone: Boolean(volunteer.phone) }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { throw new ApiError(400, 'Invalid JSON') } }
  let raw = ''
  for await (const chunk of req) { raw += chunk; if (raw.length > 2e4) throw new ApiError(413, 'Too much data.') }
  if (!raw) return {}
  try { const value = JSON.parse(raw); return value && typeof value === 'object' ? value : {} } catch { throw new ApiError(400, 'Invalid JSON') }
}

// In-memory store for tests.
export function memoryStore() {
  const data = new Map()
  const hash = name => { if (!data.has(name)) data.set(name, new Map()); return data.get(name) }
  return {
    async hget(name, field) { return hash(name).get(field) ?? null },
    async hset(name, field, value) { hash(name).set(field, value) },
    async hsetnx(name, field, value) { if (hash(name).has(field)) return false; hash(name).set(field, value); return true },
    async hgetall(name) { return Object.fromEntries(hash(name)) },
  }
}

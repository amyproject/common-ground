import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import type { IncomingMessage, ServerResponse } from 'node:http'
// @ts-expect-error plain JS module shared with the Vercel function
import { createVolunteerApi, memoryStore } from '../../server/volunteers.mjs'

type Call = { status: number; body: any; cookie?: string }

function harness(admin = false) {
  const api = createVolunteerApi({ store: memoryStore(), secret: 'test-secret', isAdmin: () => admin })
  return async (method: string, route: string, body?: unknown, cookie?: string): Promise<Call> => {
    const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as unknown as IncomingMessage
    Object.assign(req, { method, url: `/api/volunteer/${route}`, headers: { host: 'hub.test', ...(cookie ? { cookie } : {}) }, socket: { remoteAddress: '127.0.0.1' } })
    return new Promise(resolve => {
      const headers: Record<string, string> = {}
      const res = { statusCode: 200, setHeader: (key: string, value: string) => { headers[key.toLowerCase()] = value }, end: (text: string) => resolve({ status: res.statusCode, body: JSON.parse(text), cookie: headers['set-cookie']?.split(';')[0] }) } as unknown as ServerResponse & { statusCode: number }
      void api(req, res)
    })
  }
}

const signup = { firstName: 'Rosa', email: 'rosa@example.org', password: 'compost-heap', neighborhood: 'Fruitvale', interests: ['planting', 'nope'], ageOk: true, consentEmail: true }

test('a volunteer signs up, gets a session, Seeds, and the Guild meetings', async () => {
  const call = harness()
  const missing = await call('POST', 'signup', { ...signup, ageOk: false })
  assert.equal(missing.status, 400)
  const joined = await call('POST', 'signup', signup)
  assert.equal(joined.status, 200)
  assert.ok(joined.cookie?.startsWith('cg_vol='))
  assert.equal(joined.body.seeds.points, 5)
  assert.equal(joined.body.seeds.tier.tier.name, 'Seed')
  assert.deepEqual(joined.body.volunteer.interests, ['planting'])
  assert.equal(joined.body.volunteer.email, undefined, 'dashboard payload hides contact details')
  assert.match(joined.body.volunteer.referralCode, /^ROSA-\d{4}$/)
  assert.ok(joined.body.events.some((event: any) => event.title.startsWith('Guild monthly meeting')))
  assert.equal((await call('POST', 'signup', signup)).status, 409)
  assert.equal((await call('GET', 'me')).status, 401)
  assert.equal((await call('GET', 'me', undefined, joined.cookie)).body.volunteer.firstName, 'Rosa')
  assert.equal((await call('POST', 'signin', { email: 'rosa@example.org', password: 'wrong-pass' })).status, 401)
  assert.ok((await call('POST', 'signin', { email: 'ROSA@example.org', password: 'compost-heap' })).cookie)
})

test('RSVPs, stamps, check-ins, and referrals turn into Seeds', async () => {
  const call = harness(true)
  const rosa = await call('POST', 'signup', signup)
  const friend = await call('POST', 'signup', { ...signup, firstName: 'Kai', email: 'kai@example.org', referral: rosa.body.volunteer.referralCode.toLowerCase() })
  const event = friend.body.events[0]
  const rsvp = await call('POST', 'rsvp', { eventId: event.id, going: true }, friend.cookie)
  assert.equal(rsvp.body.events[0].going, true)
  const stamps = await call('POST', 'stamps', { zones: ['coast', 'coast', 'bay', 'moon'] }, friend.cookie)
  assert.equal(stamps.body.seeds.points, 5 + 2 * 3)
  const overview = await call('GET', 'admin/overview')
  assert.equal(overview.body.volunteers.length, 2)
  assert.equal(overview.body.volunteers.find((v: any) => v.firstName === 'Kai').referredByName, 'Rosa')
  const kai = overview.body.volunteers.find((v: any) => v.firstName === 'Kai')
  assert.equal((await call('POST', 'admin/checkin', { volunteerId: kai.id, eventId: event.id })).status, 200)
  const kaiAfter = await call('GET', 'me', undefined, friend.cookie)
  const rule = event.kind === 'meeting' ? 5 : event.kind === 'workshop' ? 8 : 10
  assert.equal(kaiAfter.body.seeds.points, 5 + 6 + 15 + rule)
  const rosaAfter = await call('GET', 'me', undefined, rosa.cookie)
  assert.equal(rosaAfter.body.seeds.points, 5 + 25, 'referrer earns Seeds once the friend shows up')
  assert.equal(rosaAfter.body.referral.showedUp, 1)
  assert.ok(rosaAfter.body.badges.find((b: any) => b.id === 'connector').earned)
})

test('organizer endpoints refuse volunteers and cross-site posts', async () => {
  const call = harness(false)
  const rosa = await call('POST', 'signup', signup)
  assert.equal((await call('GET', 'admin/overview', undefined, rosa.cookie)).status, 401)
  assert.equal((await call('POST', 'admin/events', { title: 'X', date: '2030-01-01' }, rosa.cookie)).status, 401)
})

test('logged hours count in the tracker now and earn Seeds once verified; the shop spends Seeds without lowering the tier', async () => {
  const call = harness(true)
  const rosa = await call('POST', 'signup', signup)
  assert.equal((await call('POST', 'log', { date: '2999-01-01', hours: 2, activity: 'Future' }, rosa.cookie)).status, 400)
  const logged = await call('POST', 'log', { date: '2026-09-12', hours: 30, activity: 'Too long' }, rosa.cookie)
  assert.equal(logged.status, 400)
  const ok = await call('POST', 'log', { date: new Date().toISOString().slice(0, 10), hours: 3, activity: 'Weeded the food forest', place: 'Unity Park' }, rosa.cookie)
  assert.equal(ok.body.tracker.totalHours, 3)
  assert.equal(ok.body.tracker.monthHours, 3)
  assert.equal(ok.body.seeds.points, 5, 'pending hours earn no Seeds yet')
  const goal = await call('POST', 'goal', { hoursPerMonth: 6, eventsPerMonth: 3, focus: 'Learn grafting' }, rosa.cookie)
  assert.deepEqual(goal.body.tracker.goal, { hoursPerMonth: 6, eventsPerMonth: 3, focus: 'Learn grafting' })
  const overview = await call('GET', 'admin/overview')
  const entry = overview.body.logs[0]
  await call('POST', 'admin/log', { volunteerId: entry.volunteerId, logId: entry.id, status: 'verified' })
  const verified = await call('GET', 'me', undefined, rosa.cookie)
  assert.equal(verified.body.seeds.points, 5 + 6)
  assert.equal((await call('POST', 'order', { itemId: 'seed-kit' }, rosa.cookie)).status, 409, 'not enough Seeds for the kit')
  assert.equal((await call('POST', 'order', { itemId: 'seed-packet' }, rosa.cookie)).status, 400, 'packets need a variety')
  const bought = await call('POST', 'order', { itemId: 'seed-packet', variety: 'Borage' }, rosa.cookie)
  assert.equal(bought.status, 200)
  assert.equal(bought.body.seeds.balance, 11 - 5)
  assert.equal(bought.body.seeds.points, 11, 'lifetime Seeds (and tier) unchanged by spending')
  assert.equal(bought.body.shop.orders[0].name, 'Borage seed packet')
  assert.equal(bought.body.shop.items.find((item: any) => item.id === 'seed-packet').stock, 399)
  const cancelled = await call('POST', 'order/cancel', { orderId: bought.body.shop.orders[0].id }, rosa.cookie)
  assert.equal(cancelled.body.seeds.balance, 11)
  assert.equal(cancelled.body.shop.items.find((item: any) => item.id === 'seed-packet').stock, 400)
})

test('the shared demo volunteer can be filled in and signed in, with a dashboard that has some history', async () => {
  const call = harness()
  const demo = await call('GET', 'demo')
  assert.equal(demo.status, 200)
  const signin = await call('POST', 'signin', { email: demo.body.email, password: demo.body.password })
  assert.ok(signin.cookie)
  const me = await call('GET', 'me', undefined, signin.cookie)
  assert.equal(me.body.volunteer.firstName, 'Demo')
  assert.equal(me.body.tracker.totalHours, 6)
  assert.equal(me.body.seeds.points, 5 + 6 + 8, 'welcome + two stamps + four confirmed hours')
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { guildActivities, guildLinks, guildVenue } from '../guild/data.ts'
import { activityAction, activityDate, activityStatus, activityTime, calendarAvailable, createActivityCalendar, createWorkdayCsv, createWorkdayMarkdown, defaultWorkday, duplicateWorkday, initialGuildState, restoreGuildState, workdayErrors, workdayMessages } from '../guild/model.ts'
import { restoreState } from './storage.ts'

const workday = guildActivities.find(activity => activity.kind === 'workday')!
const before = Date.parse('2026-10-25T16:59:59Z')
const during = Date.parse('2026-10-25T18:00:00Z')
const after = Date.parse('2026-10-25T21:00:00Z')

test('dated Guild events change at their actual start and end, without turning past events into invitations', () => {
  assert.equal(activityStatus(workday, before), 'upcoming')
  assert.equal(activityStatus(workday, Date.parse(workday.startAt!)), 'in-progress')
  assert.equal(activityStatus(workday, during), 'in-progress')
  assert.equal(activityStatus(workday, after), 'past')
  assert.deepEqual(activityAction(workday, during), { label: 'RSVP on Partiful', url: workday.registrationUrl })
  assert.deepEqual(activityAction(workday, after), { label: 'Find the next gathering', url: guildLinks.events })
  for (const activity of guildActivities.filter(item => item.id !== workday.id)) {
    assert.equal(activityStatus(activity, during), 'past')
    assert.equal(calendarAvailable(activity, during), false)
  }
})

test('cancelled and unconfirmed dates never produce a registration invitation or calendar', () => {
  for (const activity of [
    { ...workday, cancelled: true },
    { ...workday, startAt: null, endAt: null },
    { ...workday, startAt: 'not-a-date' },
    { ...workday, endAt: workday.startAt },
  ]) {
    assert.equal(calendarAvailable(activity, during), false)
    assert.equal(createActivityCalendar(activity, during), null)
    assert.equal(activityAction(activity, during).url, guildLinks.events)
  }
  assert.equal(activityStatus({ ...workday, cancelled: true }, during), 'cancelled')
  assert.equal(activityStatus({ ...workday, startAt: null }, during), 'unconfirmed')
})

test('public calendar exports keep the confirmed instant across daylight saving changes', () => {
  const calendar = createActivityCalendar(workday, during)!
  assert.ok(calendar.includes('DTSTART:20261025T170000Z\r\n'))
  assert.ok(calendar.includes('DTEND:20261025T210000Z\r\n'))
  assert.ok(calendar.includes(`URL:${workday.registrationUrl}\r\n`))
  assert.equal(createActivityCalendar(workday, after), null)
  const futureDraft = { ...workday, id: 'test-only-future', startAt: '2026-11-08T10:00:00-08:00', endAt: '2026-11-08T14:00:00-08:00' }
  assert.equal(activityDate(futureDraft), 'Nov 8, 2026')
  assert.match(activityTime(futureDraft), /10:00.*2:00.*Pacific/)
  assert.ok(createActivityCalendar(futureDraft, during)!.includes('DTSTART:20261108T180000Z\r\n'))
})

test('calendar text escapes delimiters and folds by UTF-8 bytes without splitting characters', () => {
  const title = `Garden, soil; water\\care\n${'🌱'.repeat(40)}`
  const calendar = createActivityCalendar({ ...workday, title }, during)!
  assert.ok(calendar.endsWith('END:VCALENDAR\r\n'))
  for (const line of calendar.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75)
  const unfolded = calendar.replace(/\r\n /g, '')
  assert.ok(unfolded.includes(`SUMMARY:Garden\\, soil\\; water\\\\care\\n${'🌱'.repeat(40)}`))
  assert.ok(unfolded.includes('does not RSVP'))
  assert.ok(unfolded.includes('not a live calendar subscription'))
  assert.equal(createActivityCalendar({ ...workday, registrationUrl: 'https://example.org/\r\nBEGIN:VEVENT' }, during), null)
  assert.equal(createActivityCalendar({ ...workday, id: 'event\r\nBEGIN:VEVENT' }, during), null)
  assert.equal(createActivityCalendar({ ...workday, registrationUrl: 'javascript:alert(1)' }, during), null)
})

test('reusing a kit preserves edits but clears date, signup link and assignments', () => {
  const original = defaultWorkday('original')
  original.title = 'Neighbors planting together'
  original.date = '2026-11-08'
  original.registrationUrl = 'https://example.org/approved-event'
  original.tasks = 'Review the water plan with the lead.'
  original.roles[0].assignedTo = 'Garden owl'
  original.roles[4].needed = 8
  original.agenda[0].time = '08:45'
  const duplicate = duplicateWorkday(original, 'copy')
  assert.equal(duplicate.id, 'copy')
  assert.equal(duplicate.date, '')
  assert.equal(duplicate.registrationUrl, '')
  assert.equal(duplicate.roles[0].assignedTo, '')
  assert.equal(duplicate.tasks, original.tasks)
  assert.equal(duplicate.roles[4].needed, 8)
  assert.equal(duplicate.agenda[0].time, '08:45')
  duplicate.roles[4].needed = 3
  assert.equal(original.roles[4].needed, 8)
  assert.equal(original.date, '2026-11-08')
  assert.equal(original.roles[0].assignedTo, 'Garden owl')
})

test('draft persistence preserves multiple plans, returning preparation and observation answers', () => {
  const state = initialGuildState()
  state.visitor = 'returning'
  state.walk = { water: 'ask', shade: 'observe', soil: 'check' }
  state.drafts[0].tasks = 'A custom plan worth keeping.'
  const duplicate = duplicateWorkday(state.drafts[0], 'second')
  state.drafts.push(duplicate)
  state.selectedDraftId = duplicate.id
  const restored = restoreGuildState(JSON.stringify(state))
  assert.equal(restored.error, false)
  assert.deepEqual(restored.state, state)
  assert.equal(restoreGuildState(null).error, false)
})

test('malformed or incompatible saved drafts are flagged for preservation, not accepted as valid', () => {
  const fresh = initialGuildState()
  const badRole = structuredClone(fresh)
  badRole.drafts[0].roles[0].needed = -1
  const duplicateIds = structuredClone(fresh)
  duplicateIds.drafts.push(structuredClone(duplicateIds.drafts[0]))
  for (const raw of [
    '{broken',
    JSON.stringify({ ...fresh, version: 2 }),
    JSON.stringify({ ...fresh, selectedDraftId: 'missing' }),
    JSON.stringify({ ...fresh, walk: { water: 'invented-answer' } }),
    JSON.stringify(badRole),
    JSON.stringify(duplicateIds),
  ]) {
    assert.equal(restoreGuildState(raw).error, true)
  }
})

test('workday review catches impossible dates, unsafe links and out-of-order agenda steps', () => {
  const draft = defaultWorkday()
  assert.deepEqual(workdayErrors(draft), [])
  assert.ok(workdayErrors({ ...draft, date: '2026-02-30' }).length)
  assert.ok(workdayErrors({ ...draft, registrationUrl: 'javascript:alert(1)' }).length)
  assert.ok(workdayErrors({ ...draft, tasks: ' ' }).length)
  const agenda = structuredClone(draft.agenda)
  agenda[1].time = '08:00'
  assert.ok(workdayErrors({ ...draft, agenda }).some(error => error.includes('order')))
  assert.ok(workdayErrors({ ...draft, roles: draft.roles.map(role => ({ ...role, needed: 0 })) }).length)
  assert.ok(workdayErrors({ ...draft, roles: draft.roles.map(role => ({ ...role, needed: 1.5 })) }).length)
})

test('kit exports contain edited plans and distinguish requested roles from attendance', () => {
  const draft = defaultWorkday()
  draft.title = 'Plan, "water" and grow'
  draft.tasks = 'Use our edited task list.'
  draft.roles[4].needed = 8
  draft.roles[0].assignedTo = '=1+1'
  const markdown = createWorkdayMarkdown(draft)
  const csv = createWorkdayCsv(draft)
  assert.ok(markdown.includes(draft.tasks))
  assert.ok(markdown.includes('Garden team: 8 requested'))
  assert.ok(markdown.includes('DRAFT FOR HOST REVIEW'))
  assert.ok(csv.includes('"Plan, ""water"" and grow"'))
  assert.ok(csv.includes('"\'=1+1"'))
  assert.ok(csv.includes('DRAFT ROLE PLAN — not attendance'))
  assert.equal(csv.split('\r\n').filter(Boolean).length, draft.roles.length + 1)
  const messages = workdayMessages(draft)
  assert.ok(messages.invitation.includes('[add the host’s official RSVP link]'))
  assert.ok(messages.followUp.includes(guildLinks.events))
})

test('adding the public Guild venue keeps source dates separate and preserves prior local listing edits', () => {
  const raw = JSON.stringify({
    version: 1,
    resources: [{ id: 'anv-west-oakland', status: 'demo-reviewed', access: 'A prior local correction stays available.', reviewSourceUrl: 'https://anvfarm.org/', reviewedAt: '2026-10-24T20:00:00Z' }],
  })
  const restored = restoreState(raw)
  assert.equal(restored.resources.find(resource => resource.id === 'anv-west-oakland')!.access, 'A prior local correction stays available.')
  const venue = restored.resources.find(resource => resource.id === guildVenue.id)!
  assert.deepEqual(venue.coordinates, guildVenue.coordinates)
  assert.equal(venue.checkedAt, '2026-10-25')
  assert.equal(venue.status, 'source-checked')
  assert.equal(guildActivities.find(activity => activity.kind === 'planning')!.venueId, null)
})

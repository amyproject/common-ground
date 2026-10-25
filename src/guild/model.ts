import { safePublicUrl } from '../lib/directory.ts'
import { guildLinks, guildVenue, setupChecklist, walkSteps, workdayAgenda, workdayRoles } from './data.ts'
import type { ActivityStatus, GuildActivity, GuildState, WorkdayDraft } from './types.ts'

const validDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}
const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const bounded = (value: unknown, maximum: number): value is string => typeof value === 'string' && value.length <= maximum && !value.includes('\0')

export function activityStatus(activity: GuildActivity, now = Date.now()): ActivityStatus {
  if (activity.cancelled) return 'cancelled'
  const start = activity.startAt ? Date.parse(activity.startAt) : NaN
  const end = activity.endAt ? Date.parse(activity.endAt) : NaN
  if (!Number.isFinite(now) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'unconfirmed'
  if (now >= end) return 'past'
  return now < start ? 'upcoming' : 'in-progress'
}

export const statusLabels: Record<ActivityStatus, string> = {
  upcoming: 'Upcoming', 'in-progress': 'Happening now', past: 'Past gathering', cancelled: 'Cancelled', unconfirmed: 'Date unconfirmed',
}

export function activityDate(activity: GuildActivity): string {
  if (!activity.startAt || !Number.isFinite(Date.parse(activity.startAt))) return 'Date to be announced'
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: activity.timeZone }).format(new Date(activity.startAt))
  return date
}

export function activityTime(activity: GuildActivity): string {
  if (!activity.startAt || !activity.endAt || !Number.isFinite(Date.parse(activity.startAt)) || !Number.isFinite(Date.parse(activity.endAt))) return 'Check the host’s details'
  const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: activity.timeZone })
  return `${formatter.format(new Date(activity.startAt))}–${formatter.format(new Date(activity.endAt))} Pacific`
}

export function activityAction(activity: GuildActivity, now = Date.now()): { label: string; url: string } {
  const status = activityStatus(activity, now)
  return status === 'upcoming' || status === 'in-progress'
    ? { label: 'RSVP on Partiful', url: activity.registrationUrl }
    : { label: 'Find the next gathering', url: guildLinks.events }
}

export function calendarAvailable(activity: GuildActivity, now = Date.now()): boolean {
  return ['upcoming', 'in-progress'].includes(activityStatus(activity, now))
}

const escapeCalendar = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
function foldCalendar(line: string): string {
  const encoder = new TextEncoder()
  const lines: string[] = []
  let part = ''
  let bytes = 0
  for (const character of line) {
    const size = encoder.encode(character).length
    if (bytes + size > 75) { lines.push(part); part = ' '; bytes = 1 }
    part += character
    bytes += size
  }
  lines.push(part)
  return lines.join('\r\n')
}
const calendarTimestamp = (value: string | number) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

export function createActivityCalendar(activity: GuildActivity, now = Date.now()): string | null {
  if (!calendarAvailable(activity, now) || !/^[a-z0-9-]+$/.test(activity.id) ||
    /[\r\n]/.test(activity.registrationUrl) || !safePublicUrl(activity.registrationUrl)) return null
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Common Ground//Source-checked Guild activities//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${activity.id}@common-ground.local`, `DTSTAMP:${calendarTimestamp(now)}`,
    `DTSTART:${calendarTimestamp(activity.startAt!)}`, `DTEND:${calendarTimestamp(activity.endAt!)}`,
    `SUMMARY:${escapeCalendar(activity.title)}`, `LOCATION:${escapeCalendar(activity.location)}`,
    `DESCRIPTION:${escapeCalendar(`${activity.description}\nRSVP and check current instructions with the host: ${activity.registrationUrl}\nPublic source checked ${activity.checkedAt}. Saving this calendar file does not RSVP. It is not a live calendar subscription.`)}`,
    `URL:${activity.registrationUrl}`, 'END:VEVENT', 'END:VCALENDAR',
  ].map(foldCalendar).join('\r\n') + '\r\n'
}

export function defaultWorkday(id = 'first-workday'): WorkdayDraft {
  return {
    id, title: 'A neighborhood garden workday', date: '', venue: guildVenue.address,
    tasks: 'Agree today’s priorities with the garden lead.\nCare for beds and discuss the watering plan.',
    registrationUrl: '', bring: 'Gloves, water, and your own plate and utensils. Confirm with the host.',
    followUp: 'Share one discovery, agree who will care for the garden, and invite interested people to the next gathering.',
    agenda: workdayAgenda.map(item => ({ ...item })),
    roles: workdayRoles.map(role => ({ ...role })),
  }
}

export function duplicateWorkday(draft: WorkdayDraft, id: string): WorkdayDraft {
  return {
    ...structuredClone(draft), id, title: `Copy of ${draft.title}`.slice(0, 100), date: '', registrationUrl: '',
    roles: draft.roles.map(role => ({ ...role, assignedTo: '' })),
  }
}

export function initialGuildState(): GuildState {
  const draft = defaultWorkday()
  return { version: 1, visitor: 'new', walk: {}, drafts: [draft], selectedDraftId: draft.id }
}

function validWorkday(value: unknown): value is WorkdayDraft {
  if (!object(value) || !bounded(value.id, 120) || !value.id || !bounded(value.title, 100) ||
    !bounded(value.date, 10) || value.date !== '' && !validDate(value.date) || !bounded(value.venue, 180) ||
    !bounded(value.tasks, 1600) || !bounded(value.registrationUrl, 2048) || value.registrationUrl !== '' && !safePublicUrl(value.registrationUrl) ||
    !bounded(value.bring, 500) || !bounded(value.followUp, 600)) return false
  if (!Array.isArray(value.agenda) || value.agenda.length !== workdayAgenda.length || !Array.isArray(value.roles) || value.roles.length !== workdayRoles.length) return false
  return value.agenda.every((item, index) => object(item) && item.id === workdayAgenda[index].id && bounded(item.time, 5) && (item.time === '' || validTime(item.time)) && bounded(item.title, 240)) &&
    value.roles.every((role, index) => object(role) && role.id === workdayRoles[index].id && bounded(role.name, 80) && bounded(role.description, 400) &&
      Number.isInteger(role.needed) && Number(role.needed) >= 0 && Number(role.needed) <= 50 && bounded(role.assignedTo, 100))
}

export function restoreGuildState(raw: string | null): { state: GuildState; error: boolean } {
  const fresh = initialGuildState()
  if (!raw) return { state: fresh, error: false }
  try {
    const value: unknown = JSON.parse(raw)
    if (!object(value) || value.version !== 1 || !['new', 'returning'].includes(String(value.visitor)) ||
      !object(value.walk) || !Array.isArray(value.drafts) || !value.drafts.length || value.drafts.length > 12 ||
      !value.drafts.every(validWorkday) || new Set(value.drafts.map(draft => draft.id)).size !== value.drafts.length ||
      !bounded(value.selectedDraftId, 120) || !value.drafts.some(draft => draft.id === value.selectedDraftId)) return { state: fresh, error: true }
    for (const [id, answer] of Object.entries(value.walk)) {
      const step = walkSteps.find(item => item.id === id)
      if (!step || !step.choices.some(choice => choice.id === answer)) return { state: fresh, error: true }
    }
    return { state: value as unknown as GuildState, error: false }
  } catch { return { state: fresh, error: true } }
}

export function workdayErrors(draft: WorkdayDraft): string[] {
  const errors = []
  if (draft.title.trim().length < 3) errors.push('Give the draft a name.')
  if (draft.venue.trim().length < 3) errors.push('Add a public venue or an arrival note.')
  if (draft.tasks.trim().length < 5) errors.push('Add the workday’s tasks.')
  if (draft.date && !validDate(draft.date)) errors.push('Choose a valid date, or leave it unconfirmed.')
  if (draft.registrationUrl && !safePublicUrl(draft.registrationUrl)) errors.push('Use an http or https registration link.')
  if (draft.agenda.some(item => !validTime(item.time) || !item.title.trim())) errors.push('Add a time and description to every agenda step.')
  else if (draft.agenda.some((item, index) => index > 0 && item.time < draft.agenda[index - 1].time)) errors.push('Put the agenda times in order.')
  if (!draft.roles.some(role => role.needed > 0)) errors.push('Choose at least one role to request.')
  if (draft.roles.some(role => !Number.isInteger(role.needed) || role.needed < 0 || role.needed > 50)) errors.push('Choose a whole helper count from 0 to 50 for each role.')
  if (draft.roles.some(role => !role.name.trim() || !role.description.trim())) errors.push('Give each role a name and description.')
  return errors
}

export function workdayDate(draft: WorkdayDraft): string {
  return draft.date && validDate(draft.date) ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${draft.date}T12:00:00Z`)) : 'Date to be confirmed'
}

export function shortTime(time: string): string {
  if (!validTime(time)) return 'Time to be confirmed'
  const [hours, minutes] = time.split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'a.m.' : 'p.m.'}`
}

export function workdayMessages(draft: WorkdayDraft): { invitation: string; reminder: string; followUp: string } {
  const welcome = draft.agenda.find(item => item.id === 'welcome')!
  const link = draft.registrationUrl || '[add the host’s official RSVP link]'
  return {
    invitation: `Come grow with neighbors.\n\n${draft.title}\n${workdayDate(draft)} · arrival ${shortTime(welcome.time)} Pacific\n${draft.venue}\n\n${draft.tasks.trim()}\n\nWhat to bring: ${draft.bring.trim()}\nAsk a garden lead about a task that fits you.\n\nDetails and RSVP: ${link}`,
    reminder: `A quick note before ${draft.title}.\n\n${workdayDate(draft)} · arrival ${shortTime(welcome.time)} Pacific\n${draft.venue}\nBring: ${draft.bring.trim()}\n\nCheck the host’s current instructions: ${link}`,
    followUp: `Thanks for caring for the garden together.\n\n${draft.followUp.trim()}\n\nFind the next gathering: ${guildLinks.events}\nInterested in ongoing help? ${guildLinks.volunteer}\n\nShare this only through the host’s agreed channels and with people who want to hear from you.`,
  }
}

export function createWorkdayMarkdown(draft: WorkdayDraft): string {
  const messages = workdayMessages(draft)
  return [
    `# ${draft.title}`, '', 'DRAFT FOR HOST REVIEW — not published, a registration, or an attendee roster.', '',
    `${workdayDate(draft)} · ${draft.venue}`, 'All agenda times are Pacific. Staffing numbers are editable planning targets.', '',
    '## Tasks', '', draft.tasks, '', '## Agenda', '',
    ...draft.agenda.map(item => `- ${shortTime(item.time)} — ${item.title}`), '',
    '## Role plan', '',
    ...draft.roles.filter(role => role.needed > 0).map(role => `- ${role.name}: ${role.needed} requested. ${role.description}${role.assignedTo.trim() ? ` Draft lead nickname: ${role.assignedTo.trim()}.` : ''}`), '',
    '## Before the day', '', ...setupChecklist.map(item => `- [ ] ${item}`), '',
    '## What to bring', '', draft.bring, '', '## Draft invitation', '', messages.invitation,
    '', '## Draft reminder', '', messages.reminder, '', '## Draft follow-up', '', messages.followUp,
    '', '## Template sources and review', '',
    `Adapted from the public OPC workday SOP and agendas: ${guildLinks.sop}`,
    'Role descriptions and the draft agenda need host review. No automated publishing, messaging, RSVP synchronization, or attendance tracking is implemented.', '',
  ].join('\n')
}

// Keep user-entered spreadsheet cells from becoming formulas when opened.
function csvCell(value: string | number): string {
  let text = String(value)
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function createWorkdayCsv(draft: WorkdayDraft): string {
  const rows: (string | number)[][] = [
    ['Record type', 'Workday draft', 'Date', 'Venue', 'Role', 'Requested helpers', 'Responsibility', 'Draft lead nickname'],
    ...draft.roles.filter(role => role.needed > 0).map(role => ['DRAFT ROLE PLAN — not attendance', draft.title, draft.date || 'Unconfirmed', draft.venue, role.name, role.needed, role.description, role.assignedTo]),
  ]
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

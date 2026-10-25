import { ArrowRight, CalendarDays, Download, ExternalLink, MapPin, Sprout, Users, Utensils } from 'lucide-react'
import { Modal } from '../components/Modal.tsx'
import { formatSourceDate } from '../lib/dates.ts'
import { downloadText } from '../lib/proposal.ts'
import { guildActivities, guildLinks, guildPrograms, guildVenue } from './data.ts'
import { activityAction, activityDate, activityStatus, activityTime, calendarAvailable, createActivityCalendar, statusLabels } from './model.ts'
import type { GuildActivity, GuildKind, GuildProgram } from './types.ts'

const kindIcons = { workday: Sprout, potluck: Utensils, planning: Users }
const kindLabels: Record<GuildKind, string> = { workday: 'Workday & skill share', potluck: 'Community evening', planning: 'Garden planning' }

export function ActivityCard({ activity, now, onOpen }: { activity: GuildActivity; now: number; onOpen: (id: string) => void }) {
  const status = activityStatus(activity, now)
  const Icon = kindIcons[activity.kind]
  return <article className={`guild-event-card status-${status}`}>
    <div className="guild-card-top"><span><Icon size={19} />{kindLabels[activity.kind]}</span><span className={`activity-status ${status}`}>{statusLabels[status]}</span></div>
    <h3><button onClick={() => onOpen(activity.id)}>{activity.title}<ArrowRight size={20} /></button></h3>
    <p className="guild-event-date"><CalendarDays size={18} /><time dateTime={activity.startAt ?? undefined}>{activityDate(activity)}</time><span>{activityTime(activity)}</span></p>
    <p>{activity.description}</p>
    <button className="text-button" onClick={() => onOpen(activity.id)}>{status === 'past' ? 'See this past gathering' : status === 'cancelled' ? 'See cancellation details' : 'Details & joining'}<ArrowRight size={18} /></button>
  </article>
}

export function GuildActivities({ now, onOpen, onPrepare }: { now: number; onOpen: (id: string) => void; onPrepare: () => void }) {
  const live = guildActivities.filter(activity => ['upcoming', 'in-progress'].includes(activityStatus(activity, now))).sort((a, b) => Date.parse(a.startAt!) - Date.parse(b.startAt!))
  const other = guildActivities.filter(activity => !live.some(item => item.id === activity.id)).sort((a, b) => Date.parse(b.startAt ?? '') - Date.parse(a.startAt ?? ''))
  return <div className="guild-activities">
    <section className="guild-next" aria-labelledby="guild-next-heading">
      <div className="guild-section-heading"><h2 id="guild-next-heading">{live.length ? 'Come join in.' : 'Find the next gathering.'}</h2><a href={guildLinks.events} target="_blank" rel="noreferrer">Official events <ExternalLink size={17} /></a></div>
      {live.length ? <div className="guild-live-events">{live.map(activity => <ActivityCard key={activity.id} activity={activity} now={now} onOpen={onOpen} />)}</div> : <div className="guild-next-empty"><CalendarDays size={30} /><div><h3>New dates are announced by the Guild.</h3><p>Check Partiful for the latest invitation.</p></div><a className="button button-primary" href={guildLinks.events} target="_blank" rel="noreferrer">Browse Guild events <ExternalLink size={19} /></a></div>}
    </section>
    <section aria-labelledby="guild-programs-heading"><div className="guild-section-heading"><h2 id="guild-programs-heading">There’s a place for you.</h2></div>
      <div className="guild-program-grid">{guildPrograms.map(program => {
        const Icon = kindIcons[program.kind]
        return <article className={`guild-program-card kind-${program.kind}`} key={program.id}>
          <span className="guild-program-icon"><Icon size={31} strokeWidth={1.5} /></span>
          <h3>{program.title}</h3><p>{program.description}</p>
          <button className="text-button" onClick={() => onOpen(program.id)}>Explore {program.kind === 'workday' ? 'workdays' : program.kind === 'potluck' ? 'community nights' : 'garden planning'} <ArrowRight size={19} /></button>
        </article>
      })}</div>
    </section>
    <section className="guild-first-visit"><div><span className="guild-overline">A little preparation</span><h2>Bring your curiosity.</h2><p>Try three garden observations before you meet a steward.</p></div><button className="button button-secondary" onClick={onPrepare}>Try the garden walk <ArrowRight size={20} /></button></section>
    {other.length > 0 && <details className="guild-archive"><summary>Past gatherings & other dates <span>{other.length}</span></summary><p>These are dated records. Check the Guild’s official events for what’s next.</p><div className="guild-archive-grid">{other.map(activity => <ActivityCard key={activity.id} activity={activity} now={now} onOpen={onOpen} />)}</div></details>}
    <GuildSourceNotes />
  </div>
}

export function GuildActivityDialog({ activity, program, now, onClose, onOpen, onPrepare, onNotice }: {
  activity?: GuildActivity; program?: GuildProgram; now: number; onClose: () => void
  onOpen: (id: string) => void; onPrepare: () => void; onNotice: (message: string, error?: boolean) => void
}) {
  if (!activity && !program) return null
  const source = activity ?? program!
  const currentProgram = program ?? guildPrograms.find(item => item.id === activity?.programId)!
  const status = activity ? activityStatus(activity, now) : null
  const action = activity ? activityAction(activity, now) : { label: 'Find the next gathering', url: guildLinks.events }
  const related = guildActivities.filter(item => item.programId === currentProgram.id)
  return <Modal title={source.title} wide onClose={onClose}>
    <div className="guild-detail">
      <div className="guild-card-top"><span className="guild-overline">East Bay Permaculture Guild</span><span className={`activity-status ${status ?? 'unconfirmed'}`}>{status ? statusLabels[status] : 'Next date on Partiful'}</span></div>
      <h2>{source.title}</h2><p className="guild-detail-lead">{source.description}</p>
      {activity ? <div className="guild-detail-facts"><p><CalendarDays size={21} /><span>{activityDate(activity)}<small>{activityTime(activity)}</small></span></p><p><MapPin size={21} /><span>{activity.location}</span></p><p><Users size={21} /><span>{activity.hosts}</span></p></div> : <div className="guild-detail-facts"><p><CalendarDays size={21} /><span>{currentProgram.pattern}<small>A recurring program does not confirm the next event’s date.</small></span></p>{program?.kind === 'workday' && <p><MapPin size={21} /><span>{guildVenue.name}<small>{guildVenue.address} · confirm arrival with the host</small></span></p>}</div>}
      <div className="guild-detail-actions"><a className="button button-primary" href={action.url} target="_blank" rel="noreferrer">{action.label}<ExternalLink size={19} /></a><button className="button button-secondary" onClick={onPrepare}>Garden walk <ArrowRight size={19} /></button>
        {activity && calendarAvailable(activity, now) && <button className="text-button" onClick={() => {
          const calendar = createActivityCalendar(activity)
          if (!calendar) { onNotice('This event has ended or its date is unconfirmed. Check the Guild’s current events.'); return }
          downloadText(calendar, `${activity.id}.ics`, 'text/calendar;charset=utf-8')
          onNotice('Calendar file downloaded. RSVP separately with the host.')
        }}><Download size={18} />Save to calendar</button>}
      </div>
      <section className="guild-preparation-card"><h3>Before you go</h3><ul>{source.preparation.map(item => <li key={item}>{item}</li>)}</ul><p>Confirm current instructions and participation arrangements with the host.</p></section>
      {!activity && related.length > 0 && <div className="guild-related-events"><h3>Dated gathering</h3>{related.map(item => <button key={item.id} onClick={() => onOpen(item.id)}><span>{activityDate(item)} · {statusLabels[activityStatus(item, now)]}</span><strong>{item.title}</strong><ArrowRight size={19} /></button>)}</div>}
      <section className="guild-return-card"><h3>Keep growing with neighbors.</h3><p>Interested in ongoing help? The Guild already has a volunteer-interest form.</p><a href={guildLinks.volunteer} target="_blank" rel="noreferrer">Explore volunteer opportunities <ExternalLink size={18} /></a></section>
      <details className="guild-source-notes"><summary>Source & participation notes</summary><p>Public source checked {formatSourceDate(source.checkedAt)}. This is a source check, not steward confirmation.</p><a href={source.sourceUrl} target="_blank" rel="noreferrer">Read the original {activity ? 'event' : 'program source'} <ExternalLink size={17} /></a><p>Partiful handles the official RSVP. This app does not book places, track attendance, or expose guest lists. Calendar downloads are one-time copies.</p></details>
    </div>
  </Modal>
}

export function GuildSourceNotes() {
  return <details className="guild-source-notes"><summary>About the Guild & these listings</summary><p>The East Bay Permaculture Guild is a program of Collective Resilience. This independent prototype was built for its hackathon challenge; adoption and endorsement have not been agreed.</p>
    <div className="guild-source-links"><a href={guildLinks.background} target="_blank" rel="noreferrer">Meet the Guild <ExternalLink size={17} /></a><a href={guildLinks.events} target="_blank" rel="noreferrer">Official event profile <ExternalLink size={17} /></a><a href={guildLinks.volunteer} target="_blank" rel="noreferrer">Existing volunteer form <ExternalLink size={17} /></a></div>
    <p>Public sources checked October 25, 2026. Status uses published times; listings are not live-synced. Next dates, age requirements, access, and arrangements come from the host.</p>
  </details>
}

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, CalendarDays, Check, Clock, Copy, ExternalLink, Flame, MapPin, ShoppingBasket, Sprout, Stamp, Target, Trophy, Users } from 'lucide-react'
import { guild, meetingLabel, nextMeetings, plugIn } from './guild.ts'

const NEIGHBORHOODS = ['West Oakland', 'Downtown Oakland', 'Lake Merritt', 'Fruitvale', 'East Oakland', 'North Oakland / Temescal', 'Berkeley', 'Emeryville', 'Richmond', 'Alameda', 'San Leandro / Hayward', 'San Francisco', 'Marin', 'Peninsula', 'South Bay', 'North Bay', 'Elsewhere']
const INTERESTS: [string, string][] = [['planting', 'Planting'], ['building', 'Building beds & swales'], ['watering', 'Watering crews'], ['compost', 'Compost'], ['teaching', 'Teaching & workshops'], ['outreach', 'Outreach & events']]
const AVAILABILITY: [string, string][] = [['weekday-mornings', 'Weekday mornings'], ['weekday-evenings', 'Weekday evenings'], ['weekends', 'Weekends']]
const TIERS = [
  { name: 'Seed', min: 0, perk: 'Welcome kit and a buddy at your first workday' },
  { name: 'Sprout', min: 50, perk: 'Seed-library picks and a plant start each season' },
  { name: 'Root', min: 150, perk: 'A free workshop seat every quarter' },
  { name: 'Canopy', min: 300, perk: 'Permaculture Design Course discount and the crew-lead track' },
]
const PASSPORT_KEY = 'common-ground-bay-passport-v1'

type Tier = { name: string; min: number; perks: string[] }
interface ShopItem { id: string; name: string; detail: string; price: number; stock: number; kind: string; image?: string; contents?: Record<string, string[]>; varieties?: string[] }
interface Order { id: string; itemId: string; name: string; price: number; status: 'requested' | 'ready' | 'picked-up' | 'cancelled'; createdAt: string }
interface Tracker { totalHours: number; totalActivities: number; monthHours: number; monthEvents: number; streakMonths: number; goal: { hoursPerMonth: number; eventsPerMonth: number; focus: string }; history: { date: string; hours: number; what: string; source: 'event' | 'logged'; status: string; place?: string }[] }
interface Dashboard {
  tracker: Tracker
  shop: { items: ShopItem[]; orders: Order[] }
  volunteer: { firstName: string; neighborhood: string; referralCode: string; interests: string[]; plugIn?: string[] }
  seeds: { points: number; balance: number; spent: number; ledger: { date: string; points: number; reason: string; category: string }[]; tier: { tier: Tier; next: Tier | null; toNext: number; progress: number }; tiers: Tier[]; rules: { id: string; label: string; points: number }[] }
  badges: { id: string; name: string; detail: string; earned: boolean }[]
  events: { id: string; title: string; date: string; time: string; place: string; kind: string; description: string; going: boolean; count: number; capacity: number; sample?: boolean; url?: string }[]
  team: { mine: string; rank: number; standings: { name: string; points: number }[]; month: string }
  referral: { code: string; signedUp: number; showedUp: number }
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/volunteer/${path}`, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(data.error ?? 'Something went wrong.'), { status: response.status })
  return data as T
}
const refreshHeader = () => window.dispatchEvent(new Event('hub:refresh'))
const dateLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// "Supported by" mark linking to the Guild's page on Collective Resilience.
export function SupportedBy({ className = '' }: { className?: string }) {
  return <a className={`supported-by ${className}`} href={guild.links.website} target="_blank" rel="noreferrer">
    <span className="supported-by-mark" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21v-7" /><path d="M12 14c-4.5 0-7-2.8-7-7 4 0 7 2.4 7 7z" /><path d="M12 12c0-4 2.6-6.3 7-6.3 0 4.3-2.7 6.3-7 6.3z" /></svg></span>
    <span><small>Supported by</small><strong>{guild.name}</strong></span>
    <ExternalLink size={14} />
  </a>
}

export function GuildMeetingCard({ compact = false }: { compact?: boolean }) {
  const [next] = nextMeetings(1)
  return <aside className={`guild-meeting ${compact ? 'compact' : ''}`}>
    <div className="guild-meeting-date"><span>{next.toLocaleDateString('en-US', { month: 'short' })}</span><strong>{next.getDate()}</strong></div>
    <div>
      <p className="guild-meeting-kicker">Next Guild meeting</p>
      <h3>{meetingLabel(next)}, 6–8:30 PM</h3>
      <p><MapPin size={14} />{guild.meeting.place}, {guild.meeting.address}</p>
      {!compact && <p className="guild-meeting-note">{guild.meeting.note}</p>}
      <a href={guild.links.partiful} target="_blank" rel="noreferrer">Confirm and RSVP on Partiful <ExternalLink size={13} /></a>
    </div>
  </aside>
}

export function Join() {
  const params = new URLSearchParams(window.location.search)
  // The Volunteer page's quick start hands its answers over in the URL so this form opens filled in.
  const listParam = (key: string, allowed: [string, string][]) => (params.get(key) ?? '').split(',').filter(id => allowed.some(([value]) => value === id))
  const [form, setForm] = useState({ firstName: params.get('first') ?? '', lastName: params.get('last') ?? '', email: params.get('email') ?? '', password: '', phone: '', neighborhood: NEIGHBORHOODS.includes(params.get('neighborhood') ?? '') ? params.get('neighborhood')! : '', note: '', referral: params.get('ref') ?? '', website: '' })
  const [interests, setInterests] = useState<string[]>(() => listParam('interests', INTERESTS))
  const [availability, setAvailability] = useState<string[]>(() => listParam('availability', AVAILABILITY))
  const prefilled = Boolean(params.get('first') || params.get('email'))
  const [consentEmail, setConsentEmail] = useState(true)
  const [consentSms, setConsentSms] = useState(false)
  const [ageOk, setAgeOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm(current => ({ ...current, [key]: event.target.value }))
  const toggle = (list: string[], setList: (next: string[]) => void, id: string) => setList(list.includes(id) ? list.filter(item => item !== id) : [...list, id])
  useEffect(() => { fetch('/api/volunteer/session', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(state => { if (state?.signedIn) window.location.replace('/volunteer') }).catch(() => undefined) }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await api('signup', { ...form, interests, availability, consentEmail, consentSms, ageOk })
      try { localStorage.setItem('cg-volunteer-email', form.email.trim()) } catch { /* storage unavailable */ }
      window.location.assign('/volunteer?welcome=1')
    } catch (failure) { setError((failure as Error).message); setBusy(false) }
  }
  return <div className="hub-page">
    <main className="join-page" id="main-content">
      <section className="join-pitch">
        <SupportedBy />
        <p className="home-kicker">Volunteer with the {guild.name}</p>
        <h1>Grow food, soil, and <em>neighbors.</em></h1>
        <p className="home-lede">{guild.about} Sign up once, and every workday, meeting, and friend you bring earns Seeds toward real perks.</p>
        <ol className="join-ladder" aria-label="Seeds tiers">{TIERS.map((tier, index) => <li key={tier.name} style={{ ['--step' as string]: index }}><span className="join-ladder-dot" /><div><strong>{tier.name}</strong><small>{tier.min ? `${tier.min} Seeds` : 'When you join'}</small><p>{tier.perk}</p></div></li>)}</ol>
        <div className="join-earn"><h2>How Seeds work</h2><ul><li><b>+15</b> your first visit</li><li><b>+10</b> each workday</li><li><b>+25</b> when a friend you invite shows up</li><li><b>+3</b> each field stamp from Explore</li></ul><p>Perks are thank-yous, never cash. Seeds come from what you actually do, checked in by organizers.</p></div>
        <GuildMeetingCard />
      </section>
      <form className="join-card" onSubmit={submit} noValidate>
        <h2>Join the <em>crew.</em></h2>
        {prefilled && <p className="join-ref"><Check size={15} />We filled in what you told us. Add a password and you’re in.</p>}
        {form.referral && <p className="join-ref"><Users size={15} />Invited with code <b>{form.referral.toUpperCase()}</b>. Your friend earns Seeds when you show up.</p>}
        <div className="join-row"><label>First name<input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required /></label><label>Last name <small>optional</small><input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" /></label></div>
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
        <label>Password <small>8+ characters, for your dashboard</small><input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} required autoFocus={prefilled} /></label>
        <div className="join-row"><label>Phone <small>optional</small><input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></label>
          <label>Neighborhood<select value={form.neighborhood} onChange={set('neighborhood')}><option value="">Choose…</option>{NEIGHBORHOODS.map(name => <option key={name}>{name}</option>)}</select></label></div>
        <fieldset><legend>What sounds fun?</legend><div className="chips">{INTERESTS.map(([id, label]) => <button type="button" key={id} aria-pressed={interests.includes(id)} onClick={() => toggle(interests, setInterests, id)}>{interests.includes(id) && <Check size={14} />}{label}</button>)}</div></fieldset>
        <fieldset><legend>When can you help?</legend><div className="chips">{AVAILABILITY.map(([id, label]) => <button type="button" key={id} aria-pressed={availability.includes(id)} onClick={() => toggle(availability, setAvailability, id)}>{availability.includes(id) && <Check size={14} />}{label}</button>)}</div></fieldset>
        <label>Anything we should know? <small>optional</small><textarea rows={2} value={form.note} onChange={set('note')} placeholder="Skills, access needs, a garden you care about…" /></label>
        <label className="join-hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
        <label className="check"><input type="checkbox" checked={consentEmail} onChange={event => setConsentEmail(event.target.checked)} />Email me about workdays and meetings</label>
        <label className="check"><input type="checkbox" checked={consentSms} disabled={!form.phone} onChange={event => setConsentSms(event.target.checked)} />Text me reminders {!form.phone && <small>(add a phone first)</small>}</label>
        <label className="check"><input type="checkbox" checked={ageOk} onChange={event => setAgeOk(event.target.checked)} />I’m 16 or older, or I have a parent or guardian’s OK</label>
        {!form.referral && <label>Invite code <small>optional</small><input value={form.referral} onChange={set('referral')} placeholder="e.g. ROSA-4821" /></label>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="hub-button hub-button-primary join-submit" disabled={busy}>{busy ? 'Signing you up…' : <>Sign me up · earn 5 Seeds <ArrowRight size={18} /></>}</button>
        <p className="join-fine">Organizers in the Guild see your name, contact details, and interests so they can welcome you. Nothing is sold or shared. Already joined? <a href="/login">Sign in</a>.</p>
      </form>
    </main>
  </div>
}

export function VolunteerDashboard() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<{ status?: number; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [busyEvent, setBusyEvent] = useState<string | null>(null)
  const welcome = new URLSearchParams(window.location.search).get('welcome') === '1'
  useEffect(() => { api<Dashboard>('me').then(setData).catch(failure => setError({ status: (failure as { status?: number }).status, message: (failure as Error).message })) }, [])
  const update = (promise: Promise<Dashboard>) => promise.then(next => { setData(next); refreshHeader() }).catch(failure => setError({ message: (failure as Error).message }))
  const stamps = useMemo(() => {
    try { const value = JSON.parse(localStorage.getItem(PASSPORT_KEY) ?? 'null'); return value?.stamps ? Object.keys(value.stamps) : [] } catch { return [] }
  }, [])
  if (error?.status === 401) return <VolunteerLanding />
  if (!data) return <div className="hub-page"><main className="volunteer-page"><p className="view-loading" role="status">{error ? error.message : 'Opening your dashboard…'}</p></main></div>
  const { seeds, volunteer } = data
  const claimable = stamps.filter(zone => !data.seeds.ledger.some(item => item.reason.endsWith(`: ${zone}`)))
  const link = `${window.location.origin}/join?ref=${encodeURIComponent(data.referral.code)}`
  const plugged = new Set(volunteer.plugIn ?? [])
  const nextTier = seeds.tier.next
  return <div className="hub-page">
    <main className="volunteer-page" id="main-content">
      {welcome && <div className="welcome-banner" role="status"><Sprout size={22} /><div><strong>You’re in, {volunteer.firstName}. Here are your first 5 Seeds.</strong><p>Next: RSVP to a meeting below, and plug in to the Guild’s channels so you hear about workdays.</p></div></div>}
      <section className="vol-hero">
        <div>
          <p className="home-kicker">{guild.name} · {volunteer.neighborhood}</p>
          <h1>Hi {volunteer.firstName}, you’re a <em>{seeds.tier.tier.name}.</em></h1>
          {error && <p className="login-error" role="alert">{error.message}</p>}
        </div>
        <div className="seed-meter">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="#e4ebd8" strokeWidth="11" /><circle className="seed-meter-arc" cx="60" cy="60" r="50" fill="none" stroke="#668051" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${Math.max(.02, seeds.tier.progress) * 314} 314`} transform="rotate(-90 60 60)" /></svg>
          <div><strong>{seeds.balance}</strong><span>Seeds to spend</span></div>
          <p><b>{seeds.points}</b> earned all time{seeds.spent ? ` · ${seeds.spent} spent in the shop` : ''}. {nextTier ? <><b>{seeds.tier.toNext}</b> more to {nextTier.name}.</> : 'Top tier. Thank you.'}</p>
        </div>
      </section>

      <TrackerCard tracker={data.tracker} onUpdate={update} />
      <ShopCard shop={data.shop} balance={seeds.balance} onUpdate={update} />
      <div className="vol-grid">
        <section className="vol-card vol-events">
          <h2><CalendarDays size={19} />Coming up</h2>
          {data.events.length ? <ul>{data.events.map(event => <li key={event.id} className={event.going ? 'going' : ''}>
            <div className="vol-event-date"><span>{dateLabel(event.date).split(',')[0]}</span><strong>{event.date.slice(8)}</strong></div>
            <div className="vol-event-copy"><strong>{event.title}</strong>{event.sample && <span className="sample-tag">sample</span>}<small>{event.time} · {event.place}</small><p>{event.description}</p>{event.url && <a href={event.url} target="_blank" rel="noreferrer">Event page <ExternalLink size={12} /></a>}</div>
            <div className="vol-event-act"><button className={`rsvp ${event.going ? 'on' : ''}`} disabled={busyEvent === event.id} aria-pressed={event.going} onClick={() => { setBusyEvent(event.id); void update(api('rsvp', { eventId: event.id, going: !event.going })).finally(() => setBusyEvent(null)) }}>{event.going ? <><Check size={15} />Going</> : 'I’ll come'}</button><small>{event.count} going{event.capacity ? ` · ${event.capacity} spots` : ''}</small><small className="vol-earn">+{event.kind === 'meeting' ? 5 : event.kind === 'workshop' ? 8 : 10} Seeds at check-in</small></div>
          </li>)}</ul> : <p className="muted">No events yet. The Guild meets {guild.meeting.rule}.</p>}
        </section>

        <section className="vol-card vol-plugin">
          <h2><Users size={19} />Plug in to the Guild</h2>
          <p>Most news travels through these channels. Tick them off as you join.</p>
          <ul>{plugIn.map(step => <li key={step.id}><button className={`tick-box ${plugged.has(step.id) ? 'on' : ''}`} aria-pressed={plugged.has(step.id)} aria-label={`Mark done: ${step.label}`} onClick={() => void update(api('plugin', { step: step.id, done: !plugged.has(step.id) }))}>{plugged.has(step.id) && <Check size={14} />}</button><a href={step.href} target="_blank" rel="noreferrer" onClick={() => { if (!plugged.has(step.id)) void update(api('plugin', { step: step.id, done: true })) }}>{step.label} <ExternalLink size={12} /></a></li>)}</ul>
          <a className="vol-donate" href={guild.links.donate} target="_blank" rel="noreferrer">Chip in to keep the Guild running <ExternalLink size={12} /></a>
        </section>

        <section className="vol-card vol-referral">
          <h2><Sprout size={19} />Bring a friend, earn 25</h2>
          <p>Share your link. When your friend comes to their first event, you both get Seeds.</p>
          <div className="ref-link"><code>{link.replace(/^https?:\/\//, '')}</code><button onClick={() => { void navigator.clipboard?.writeText(link).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800) }) }}>{copied ? <><Check size={15} />Copied</> : <><Copy size={15} />Copy</>}</button></div>
          <p className="ref-stats"><b>{data.referral.signedUp}</b> signed up · <b>{data.referral.showedUp}</b> showed up</p>
        </section>

        <section className="vol-card vol-stamps">
          <h2><Stamp size={19} />Field stamps → Seeds</h2>
          {claimable.length ? <><p>You collected {claimable.length} stamp{claimable.length === 1 ? '' : 's'} in Explore on this device.</p><button className="hub-button hub-button-primary" onClick={() => void update(api('stamps', { zones: claimable }))}>Add {claimable.length * 3} Seeds</button></>
            : <><p>Answer a field question at a place in each climate zone on the map. Each stamp is worth 3 Seeds, up to 5.</p><a className="door-link" href="/learn?layer=summer">Collect stamps in Explore <ArrowRight size={15} /></a></>}
        </section>

        <section className="vol-card vol-team">
          <h2><Trophy size={19} />Neighborhood challenge</h2>
          <p>Seeds earned this month, by neighborhood. Your team: <b>{data.team.mine}</b>{data.team.rank ? ` (#${data.team.rank})` : ''}.</p>
          <ol>{data.team.standings.map(team => { const max = Math.max(1, data.team.standings[0]?.points ?? 1); return <li key={team.name} className={team.name === data.team.mine ? 'mine' : ''}><span>{team.name}</span><i style={{ width: `${Math.max(4, team.points / max * 100)}%` }} /><b>{team.points}</b></li> })}</ol>
        </section>

        <section className="vol-card vol-tiers">
          <h2>Tiers & perks</h2>
          <ol>{seeds.tiers.map(tier => <li key={tier.name} className={tier.name === seeds.tier.tier.name ? 'current' : seeds.points >= tier.min ? 'done' : ''}><div><strong>{tier.name}</strong><small>{tier.min} Seeds</small></div><ul>{tier.perks.map(perk => <li key={perk}>{perk}</li>)}</ul></li>)}</ol>
        </section>

        <section className="vol-card vol-badges">
          <h2>Badges</h2>
          <div className="badge-grid">{data.badges.map(badge => <div key={badge.id} className={`badge ${badge.earned ? 'earned' : ''}`} title={badge.detail}><span className="badge-coin">{badge.earned ? <Check size={18} /> : <Sprout size={16} />}</span><strong>{badge.name}</strong><small>{badge.detail}</small></div>)}</div>
        </section>

        <section className="vol-card vol-ledger">
          <h2>Where your Seeds came from</h2>
          <ul>{seeds.ledger.map((item, index) => <li key={index}><span>{dateLabel(item.date)}</span><span>{item.reason}</span><b>+{item.points}</b></li>)}</ul>
          <details><summary>All the ways to earn</summary><ul>{seeds.rules.map(rule => <li key={rule.id}><span>{rule.label}</span><b>+{rule.points}</b></li>)}</ul></details>
        </section>
      </div>
    </main>
  </div>
}

function TrackerCard({ tracker, onUpdate }: { tracker: Tracker; onUpdate: (promise: Promise<Dashboard>) => Promise<void> }) {
  const [goal, setGoal] = useState(tracker.goal)
  const [editing, setEditing] = useState(false)
  const [log, setLog] = useState({ date: new Date().toISOString().slice(0, 10), hours: '2', activity: '', place: '' })
  const [logOpen, setLogOpen] = useState(tracker.totalActivities === 0)
  const [busy, setBusy] = useState(false)
  useEffect(() => setGoal(tracker.goal), [tracker.goal])
  const pct = (value: number, target: number) => Math.min(100, Math.round(value / Math.max(1, target) * 100))
  return <section className="vol-card tracker" aria-labelledby="tracker-title">
    <div className="tracker-head"><h2 id="tracker-title"><Clock size={19} />Your volunteer tracker</h2><button className="text-button" onClick={() => setLogOpen(open => !open)}>{logOpen ? 'Close' : '+ Log volunteer work'}</button></div>
    <div className="tracker-stats">
      <div><strong>{tracker.totalHours}</strong><span>hours given</span></div>
      <div><strong>{tracker.totalActivities}</strong><span>workdays & shifts</span></div>
      <div><strong><Flame size={20} />{tracker.streakMonths}</strong><span>month streak</span></div>
    </div>
    <div className="tracker-goals">
      <div className="goal-bar"><div><span><Target size={15} />Hours this month</span><b>{tracker.monthHours} / {tracker.goal.hoursPerMonth}</b></div><i><span style={{ width: `${pct(tracker.monthHours, tracker.goal.hoursPerMonth)}%` }} /></i></div>
      <div className="goal-bar"><div><span><CalendarDays size={15} />Events this month</span><b>{tracker.monthEvents} / {tracker.goal.eventsPerMonth}</b></div><i><span style={{ width: `${pct(tracker.monthEvents, tracker.goal.eventsPerMonth)}%` }} /></i></div>
      {tracker.goal.focus && !editing && <p className="goal-focus">Focus: {tracker.goal.focus}</p>}
      {editing ? <form className="goal-form" onSubmit={event => { event.preventDefault(); void onUpdate(api('goal', goal)).then(() => setEditing(false)) }}>
        <label>Hours a month <output>{goal.hoursPerMonth}</output><input type="range" min="1" max="30" value={goal.hoursPerMonth} onChange={event => setGoal({ ...goal, hoursPerMonth: Number(event.target.value) })} /></label>
        <label>Events a month <output>{goal.eventsPerMonth}</output><input type="range" min="1" max="8" value={goal.eventsPerMonth} onChange={event => setGoal({ ...goal, eventsPerMonth: Number(event.target.value) })} /></label>
        <label>What do you want to get better at?<input value={goal.focus} maxLength={140} onChange={event => setGoal({ ...goal, focus: event.target.value })} placeholder="e.g. build a swale, lead a crew, grow from seed" /></label>
        <div><button className="hub-button hub-button-primary">Save my plan</button><button type="button" className="text-button" onClick={() => { setGoal(tracker.goal); setEditing(false) }}>Cancel</button></div>
      </form> : <button className="text-button" onClick={() => setEditing(true)}>Set my plan & targets <ArrowRight size={14} /></button>}
    </div>
    {logOpen && <form className="log-form" onSubmit={event => { event.preventDefault(); setBusy(true); void onUpdate(api('log', { ...log, hours: Number(log.hours) })).then(() => { setLog({ ...log, activity: '', place: '' }); setLogOpen(false) }).finally(() => setBusy(false)) }}>
      <p>Add volunteer work you did before joining, or with another group. It counts toward your tracker now, and earns 2 Seeds an hour once an organizer confirms it.</p>
      <label>Date<input type="date" value={log.date} max={new Date().toISOString().slice(0, 10)} onChange={event => setLog({ ...log, date: event.target.value })} required /></label>
      <label>Hours<input type="number" min="0.5" max="12" step="0.5" value={log.hours} onChange={event => setLog({ ...log, hours: event.target.value })} required /></label>
      <label className="wide">What you did<input value={log.activity} maxLength={100} onChange={event => setLog({ ...log, activity: event.target.value })} placeholder="e.g. Planted natives with Urban Tilth" required /></label>
      <label className="wide">Where <small>optional</small><input value={log.place} maxLength={100} onChange={event => setLog({ ...log, place: event.target.value })} /></label>
      <button className="hub-button hub-button-primary" disabled={busy}>{busy ? 'Saving…' : 'Add to my tracker'}</button>
    </form>}
    {tracker.history.length > 0 && <ul className="tracker-history">{tracker.history.slice(0, 8).map((item, index) => <li key={index}><span>{dateLabel(item.date)}</span><span>{item.what}{item.place ? ` · ${item.place}` : ''}</span><span>{item.hours} h</span><span className={`status status-${item.status}`}>{item.source === 'event' ? 'Checked in' : item.status === 'verified' ? 'Confirmed' : 'Waiting for review'}</span></li>)}</ul>}
  </section>
}

function ShopCard({ shop, balance, onUpdate }: { shop: Dashboard['shop']; balance: number; onUpdate: (promise: Promise<Dashboard>) => Promise<void> }) {
  const [variety, setVariety] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const kit = shop.items.find(item => item.id === 'seed-kit')
  const others = shop.items.filter(item => item.id !== 'seed-kit')
  const buy = (item: ShopItem, extra: Record<string, string> = {}) => { setBusy(item.id); void onUpdate(api('order', { itemId: item.id, ...extra })).finally(() => setBusy(null)) }
  const button = (item: ShopItem, extra: Record<string, string> = {}, disabled = false) => {
    const short = item.price - balance
    return <button className="hub-button hub-button-primary" disabled={disabled || busy === item.id || short > 0 || item.stock <= 0} onClick={() => buy(item, extra)}>{item.stock <= 0 ? 'Out of stock' : short > 0 ? `${short} more Seeds` : busy === item.id ? 'Requesting…' : <>Redeem · {item.price} Seeds</>}</button>
  }
  const open = shop.orders.filter(order => order.status !== 'cancelled')
  return <section className="vol-card shop" aria-labelledby="shop-title">
    <div className="tracker-head"><h2 id="shop-title"><ShoppingBasket size={19} />Guild seed shop</h2><span className="shop-balance"><b>{balance}</b> Seeds to spend</span></div>
    {kit && <article className="shop-kit">
      {kit.image && <img src={kit.image} alt="The Permaculture Seed Kit: a kraft box, a gardening guide, about thirty illustrated seed packets, plant markers, compostable pots, and coir discs." loading="lazy" />}
      <div>
        <p className="home-kicker">Featured reward</p>
        <h3>{kit.name}</h3>
        <p>{kit.detail}</p>
        {kit.contents && <div className="kit-contents">{Object.entries(kit.contents).map(([group, names]) => <div key={group}><strong>{group}</strong><span>{names.join(', ')}</span></div>)}</div>}
        <div className="shop-buy">{button(kit)}<small>{kit.stock} left</small></div>
      </div>
    </article>}
    <div className="shop-grid">{others.map(item => <article key={item.id} className="shop-item">
      <h3>{item.name}</h3><p>{item.detail}</p>
      {item.varieties && <select value={variety} onChange={event => setVariety(event.target.value)} aria-label="Choose seeds"><option value="">Choose seeds…</option>{item.varieties.map(name => <option key={name}>{name}</option>)}</select>}
      <div className="shop-buy">{button(item, item.varieties ? { variety } : {}, Boolean(item.varieties && !variety))}<small>{item.stock} left</small></div>
    </article>)}</div>
    {open.length > 0 && <div className="shop-orders"><h3>Your rewards</h3><ul>{open.map(order => <li key={order.id}><span>{order.name}</span><span>{order.price} Seeds</span><span className={`status status-${order.status}`}>{order.status === 'requested' ? 'Requested' : order.status === 'ready' ? 'Ready at the next meeting' : 'Picked up'}</span>{order.status === 'requested' && <button className="text-button" onClick={() => void onUpdate(api('order/cancel', { orderId: order.id }))}>Cancel</button>}</li>)}</ul><p>Organizers pack requests and hand them out at the monthly meeting.</p></div>}
  </section>
}

const KIT_FALLBACK: ShopItem = { id: 'seed-kit', name: 'Permaculture Seed Kit', price: 150, stock: 12, kind: 'kit', image: '/hub/shop/permaculture-seed-kit.jpg', detail: 'The full collection: 30 seed packets across vegetables, herbs, flowers, and cover crops, a permaculture gardening guide, plant markers, compostable pots, and coir seed-starting discs.', contents: { Vegetables: ['Tomato', 'Pepper', 'Lettuce', 'Spinach', 'Kale', 'Cabbage', 'Broccoli', 'Carrot', 'Radish', 'Beet', 'Onion', 'Garlic', 'Peas', 'Bush beans', 'Corn', 'Squash', 'Cucumber', 'Potato', 'Strawberry'], Herbs: ['Basil', 'Dill', 'Chives', 'Rosemary'], Flowers: ['Marigold', 'Nasturtium', 'Borage', 'Sunflower', 'Yarrow'], 'Cover crops': ['Comfrey', 'White clover'] } }

// The Volunteer tab for people who haven't joined yet: the pitch, the kit, and a quick start
// that opens the sign-up form already filled in.
export function VolunteerLanding() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [quick, setQuick] = useState({ first: '', email: '', neighborhood: '' })
  const [interests, setInterests] = useState<string[]>([])
  useEffect(() => { api<{ items: ShopItem[] }>('shop').then(data => setItems(data.items)).catch(() => undefined) }, [])
  const kit = items.find(item => item.id === 'seed-kit') ?? KIT_FALLBACK
  const rest = items.filter(item => item.id !== 'seed-kit')
  const go = (event?: FormEvent) => {
    event?.preventDefault()
    const query = new URLSearchParams()
    if (quick.first.trim()) query.set('first', quick.first.trim())
    if (quick.email.trim()) query.set('email', quick.email.trim())
    if (quick.neighborhood) query.set('neighborhood', quick.neighborhood)
    if (interests.length) query.set('interests', interests.join(','))
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) query.set('ref', ref)
    window.location.assign(`/join${query.size ? `?${query}` : ''}`)
  }
  return <div className="hub-page">
    <main className="volunteer-landing" id="main-content">
      <section className="vl-hero">
        <div>
          <SupportedBy />
          <p className="home-kicker">Volunteer with the {guild.name}</p>
          <h1>Give a few hours. <em>Grow a lot.</em></h1>
          <p className="home-lede">Plant, build, compost, and teach alongside neighbors across the East Bay. Every hour earns Seeds you can trade for seed packets and the Permaculture Seed Kit.</p>
          <ul className="guild-band-perks"><li><b>+5</b> for signing up</li><li><b>+15</b> first visit</li><li><b>+10</b> each workday</li><li><b>+25</b> per friend who shows up</li></ul>
        </div>
        <form className="vl-quick" onSubmit={go}>
          <h2>Start in <em>30 seconds.</em></h2>
          <label>First name<input value={quick.first} onChange={event => setQuick({ ...quick, first: event.target.value })} autoComplete="given-name" /></label>
          <label>Email<input type="email" value={quick.email} onChange={event => setQuick({ ...quick, email: event.target.value })} autoComplete="email" /></label>
          <label>Neighborhood<select value={quick.neighborhood} onChange={event => setQuick({ ...quick, neighborhood: event.target.value })}><option value="">Choose…</option>{NEIGHBORHOODS.map(name => <option key={name}>{name}</option>)}</select></label>
          <fieldset><legend>I’d like to help with</legend><div className="chips">{INTERESTS.map(([id, label]) => <button type="button" key={id} aria-pressed={interests.includes(id)} onClick={() => setInterests(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id])}>{interests.includes(id) && <Check size={14} />}{label}</button>)}</div></fieldset>
          <button className="hub-button hub-button-volunteer hub-button-big">Volunteer <ArrowRight size={20} /></button>
          <p className="join-fine">Next you’ll see the sign-up form with this filled in. Already joined? <a href="/login?as=volunteer">Sign in</a>.</p>
        </form>
      </section>

      <section className="vl-kit" aria-labelledby="vl-kit-title">
        <img src={kit.image} alt="The Permaculture Seed Kit: a kraft box, a permaculture gardening guide, about thirty illustrated seed packets, plant markers, compostable pots, and coir discs." />
        <div>
          <p className="home-kicker">Earn it by volunteering</p>
          <h2 id="vl-kit-title">The Permaculture <em>Seed Kit.</em></h2>
          <p>{kit.detail}</p>
          {kit.contents && <div className="kit-contents">{Object.entries(kit.contents).map(([group, names]) => <div key={group}><strong>{group}</strong><span>{names.join(', ')}</span></div>)}</div>}
          <div className="vl-kit-price"><span><b>{kit.price}</b> Seeds</span><small>About {Math.ceil((kit.price - 20) / 10)} workdays, or fewer if you bring friends</small></div>
          <button className="hub-button hub-button-volunteer" onClick={() => go()}>Volunteer to earn it <ArrowRight size={18} /></button>
        </div>
      </section>

      {rest.length > 0 && <section className="vl-shop" aria-labelledby="vl-shop-title">
        <h2 id="vl-shop-title">More in the Guild <em>seed shop.</em></h2>
        <div className="shop-grid">{rest.map(item => <article key={item.id} className="shop-item"><h3>{item.name}</h3><p>{item.detail}</p><span className="vl-price"><b>{item.price}</b> Seeds</span></article>)}</div>
      </section>}

      <section className="vl-how">
        <div className="join-earn"><h2>How it works</h2><ol className="vl-steps"><li><b>Sign up</b> and pick what you like doing.</li><li><b>RSVP</b> to a workday or the monthly meeting.</li><li><b>Show up.</b> An organizer checks you in and Seeds land on your dashboard.</li><li><b>Track</b> your hours against your own monthly goal.</li><li><b>Spend</b> Seeds in the shop. Your tier keeps climbing either way.</li></ol></div>
        <GuildMeetingCard />
      </section>
    </main>
  </div>
}


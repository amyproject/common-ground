import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, ClipboardList, Footprints, Sprout } from 'lucide-react'
import { GuildActivities, GuildActivityDialog } from './Activities.tsx'
import { activityById, programById } from './data.ts'
import { GuildPreparation } from './Preparation.tsx'
import { duplicateWorkday } from './model.ts'
import { persistGuildState, readGuildState } from './storage.ts'
import { WorkdayKit } from './WorkdayKit.tsx'
import type { GuildState, GuildTab, WorkdayDraft } from './types.ts'

export function GuildHub({ tab, selectedId, onTab, onSelect, onNotice }: {
  tab: GuildTab; selectedId: string | null; onTab: (tab: GuildTab) => void; onSelect: (id: string | null) => void
  onNotice: (message: string, error?: boolean) => void
}) {
  const [loaded] = useState(readGuildState)
  const [state, setState] = useState(loaded.state)
  const [saved, setSaved] = useState(!loaded.error)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!loaded.error) setSaved(persistGuildState(state))
  }, [state, loaded.error])
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  useEffect(() => {
    if (selectedId) return
    const frame = window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.guild-hero h1')?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [tab])
  const update = (patch: Partial<GuildState>) => setState(current => ({ ...current, ...patch }))
  const switchTab = (next: GuildTab) => { onSelect(null); onTab(next) }
  const draft = state.drafts.find(item => item.id === state.selectedDraftId)!
  const updateDraft = (patch: Partial<WorkdayDraft>) => setState(current => ({ ...current, drafts: current.drafts.map(item => item.id === current.selectedDraftId ? { ...item, ...patch } : item) }))
  const reuse = () => {
    if (state.drafts.length >= 12) { onNotice('Twelve drafts are saved. Download a kit to keep a copy.'); return }
    const duplicate = duplicateWorkday(draft, crypto.randomUUID())
    setState(current => ({ ...current, drafts: [...current.drafts, duplicate], selectedDraftId: duplicate.id }))
    onNotice('New draft ready. Date, RSVP link, and lead assignments are cleared.')
  }
  const activity = selectedId && Object.hasOwn(activityById, selectedId) ? activityById[selectedId] : undefined
  const program = selectedId && Object.hasOwn(programById, selectedId) ? programById[selectedId] : undefined
  return <div className="guild-hub">
    <section className="guild-hero"><div><span className="guild-overline"><Sprout size={19} />East Bay Permaculture Guild</span><h1 tabIndex={-1}>{tab === 'kit' ? <>Grow a <em>good gathering.</em></> : tab === 'prepare' ? <>Bring your <em>curiosity.</em></> : <>Find your <em>people.</em></>}</h1><p>{tab === 'kit' ? 'A reusable workday plan, ready for host review.' : tab === 'prepare' ? 'A few observations. A warm welcome. A real next step.' : 'Garden, share a meal, and learn together.'}</p></div>{tab !== 'kit' && <button className="button button-secondary" onClick={() => switchTab('kit')}><ClipboardList size={21} />Organize a workday <ArrowRight size={19} /></button>}</section>
    <nav className="guild-tabs" aria-label="Guild participation"><button aria-current={tab === 'activities' ? 'page' : undefined} onClick={() => switchTab('activities')}><CalendarDays size={21} />Join in</button><button aria-current={tab === 'prepare' ? 'page' : undefined} onClick={() => switchTab('prepare')}><Footprints size={21} />Garden walk</button><button aria-current={tab === 'kit' ? 'page' : undefined} onClick={() => switchTab('kit')}><ClipboardList size={21} />Workday kit</button></nav>
    {tab === 'activities' && <GuildActivities now={now} onOpen={onSelect} onPrepare={() => switchTab('prepare')} />}
    {tab === 'prepare' && <GuildPreparation state={state} onUpdate={update} onJoin={() => switchTab('activities')} />}
    {tab === 'kit' && <WorkdayKit key={draft.id} drafts={state.drafts} draft={draft} saved={saved} blocked={loaded.error} onUpdate={updateDraft} onSelect={id => update({ selectedDraftId: id })} onDuplicate={reuse} onNotice={onNotice} />}
    {!saved && tab !== 'kit' && <p className="kit-save-note unsaved" role="status">Preparation changes last for this visit. Browser saving is unavailable.</p>}
    {(activity || program) && <GuildActivityDialog activity={activity} program={program} now={now} onClose={() => onSelect(null)} onOpen={onSelect} onPrepare={() => switchTab('prepare')} onNotice={onNotice} />}
  </div>
}

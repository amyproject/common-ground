import { lazy, Suspense, useEffect, useState } from 'react'
import { ArrowRight, BookOpen, Check, Compass, Leaf, Sprout, Users, X } from 'lucide-react'
import { initialResources } from './data/resources.ts'
import { exampleSuggestion, reviewSuggestion } from './lib/directory.ts'
import { downloadText } from './lib/proposal.ts'
import { persistState, readState } from './lib/storage.ts'
import { CorrectionForm, ResourceDetail } from './components/Dialogs.tsx'
import { Modal } from './components/Modal.tsx'
import { evidence, hotspots, placeById } from './exploration/content.ts'
import { ExplorationHow, ExplorationSources } from './exploration/Information.tsx'
import { JournalDialog } from './exploration/Journal.tsx'
import { createFieldJournal } from './exploration/journal.ts'
import { PlaceView } from './exploration/Place.tsx'
import { initialExploration, persistExploration, persistPreviousExploration, readExploration, readPreviousExploration } from './exploration/storage.ts'
import { World } from './exploration/World.tsx'
import type { ExplorationState, HotspotId, PlaceId } from './exploration/types.ts'
import type { PracticeId, Resource, Suggestion, View } from './types.ts'
import { activityById, programById } from './guild/data.ts'
import type { GuildTab } from './guild/types.ts'

const ResourceMap = lazy(() => import('./components/ResourceMap.tsx').then(module => ({ default: module.ResourceMap })))
const ReviewDesk = lazy(() => import('./components/ReviewDesk.tsx').then(module => ({ default: module.ReviewDesk })))
const GuildHub = lazy(() => import('./guild/GuildHub.tsx').then(module => ({ default: module.GuildHub })))

type DialogState = { type: 'how' | 'sources' | 'journal' } | { type: 'resource' | 'correction'; resourceId: string } | null
const params = new URLSearchParams(window.location.search)
const initialView: View = params.get('view') === 'map' ? 'map' : params.get('view') === 'review' ? 'review' : params.get('view') === 'guild' ? 'guild' : 'game'
const initialResourceId = params.get('resource')
const initialPlace: PlaceId | null = Object.hasOwn(placeById, params.get('place') ?? '') ? params.get('place') as PlaceId : null
const initialHotspot = params.get('discovery') as HotspotId | null
const initialProjectId = /^[a-f0-9-]{36}$/.test(params.get('project') ?? '') ? params.get('project') : null
// Hub deep links: /learn?focus=lat,lon centers the map, mode=create|check opens a tool, layer=summer|rain|frost shows climate.
const focusMatch = (params.get('focus') ?? '').match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/)
const initialFocus = focusMatch ? { latitude: Number(focusMatch[1]), longitude: Number(focusMatch[2]) } : null
const initialMode = params.get('mode') === 'create' ? 'create' as const : params.get('mode') === 'check' ? 'check' as const : null
const initialLayer = (['summer', 'rain', 'frost'] as const).find(layer => layer === params.get('layer')) ?? null
const requestedActivity = params.get('activity') ?? ''
const initialGuildId = Object.hasOwn(activityById, requestedActivity) || Object.hasOwn(programById, requestedActivity) ? requestedActivity : null
const initialGuildTab: GuildTab = params.get('tool') === 'workday' ? 'kit' : params.get('tool') === 'walk' ? 'prepare' : 'activities'

export default function App() {
  const [directory, setDirectory] = useState(readState)
  const [progress, setProgress] = useState(readExploration)
  const [previousTrip, setPreviousTrip] = useState(readPreviousExploration)
  const [view, setView] = useState<View>(initialView)
  const [guildTab, setGuildTab] = useState<GuildTab>(initialGuildTab)
  const [guildId, setGuildId] = useState<string | null>(initialGuildId)
  const [place, setPlace] = useState<PlaceId | null>(initialPlace)
  const [active, setActive] = useState<HotspotId | null>(initialPlace && initialHotspot && placeById[initialPlace].hotspots.includes(initialHotspot) ? initialHotspot : null)
  const [location, setLocation] = useState<PlaceId>(initialPlace ?? 'library')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId)
  const [travel, setTravel] = useState<{ to: PlaceId; discovery: HotspotId | null } | null>(null)
  const [dialog, setDialog] = useState<DialogState>(() => initialView === 'map' && initialResources.some(resource => resource.id === initialResourceId) ? { type: 'resource', resourceId: initialResourceId! } : null)
  const [mapPractices, setMapPractices] = useState<PracticeId[]>([])
  const [mapVersion, setMapVersion] = useState(0)
  const [storage, setStorage] = useState({ directory: true, progress: true })
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)
  const notify = (text: string, error = false) => setToast({ text, error })

  useEffect(() => { setStorage(current => ({ ...current, directory: persistState(directory) })) }, [directory])
  useEffect(() => { setStorage(current => ({ ...current, progress: persistExploration(progress) })) }, [progress])
  useEffect(() => {
    if (!initialPlace) return
    setProgress(current => current.visited.includes(initialPlace) ? current : { ...current, visited: [...current.visited, initialPlace] })
  }, [])
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), toast.error ? 6500 : 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])
  useEffect(() => {
    if (!travel) return
    const arrive = () => {
      setLocation(travel.to); setPlace(travel.to); setActive(travel.discovery); setTravel(null)
      setProgress(current => current.visited.includes(travel.to) ? current : { ...current, visited: [...current.visited, travel.to] })
      window.scrollTo({ top: 0, behavior: 'instant' })
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.place-header h1')?.focus())
    }
    if (progress.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches || location === travel.to) { arrive(); return }
    const timer = window.setTimeout(arrive, 1450)
    return () => window.clearTimeout(timer)
  }, [travel, progress.reducedMotion, location])
  useEffect(() => {
    const search = new URLSearchParams()
    if (view !== 'game') search.set('view', view)
    else if (place) { search.set('place', place); if (active) search.set('discovery', active) }
    else if (selectedProjectId) search.set('project', selectedProjectId)
    if (view === 'guild') {
      if (guildTab !== 'activities') search.set('tool', guildTab === 'kit' ? 'workday' : 'walk')
      if (guildId) search.set('activity', guildId)
    }
    window.history.replaceState(null, '', search.size ? `/learn?${search}` : '/learn')
  }, [view, place, active, selectedProjectId, guildTab, guildId])

  const visit = (next: PlaceId, discovery?: HotspotId) => {
    setDialog(null); setView('game'); setPlace(null); setActive(null); setSelectedProjectId(null)
    setTravel({ to: next, discovery: discovery && placeById[next].hotspots.includes(discovery) ? discovery : null })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const neighborhood = () => {
    setTravel(null); setPlace(null); setActive(null); setView('game'); setDialog(null); setSelectedProjectId(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const navigate = (next: View, practices: PracticeId[] = []) => {
    setTravel(null); setDialog(null); setView(next); setSelectedProjectId(null)
    if (next === 'map') { setMapPractices(practices); setMapVersion(current => current + 1) }
    if (next === 'game') { setPlace(null); setActive(null) }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const openGuild = (id?: string) => {
    setGuildTab('activities'); setGuildId(id ?? null); navigate('guild')
  }
  const updateProgress = (patch: Partial<ExplorationState>) => setProgress(current => ({ ...current, ...patch }))
  const complete = (id: HotspotId, observation: string, reasoning: string) => {
    setProgress(current => ({ ...current, entries: { ...current.entries, [id]: { id, place: hotspots[id].place, title: hotspots[id].name, observation, reasoning, savedAt: new Date().toISOString() } } }))
    notify(`${progress.entries[id] ? 'Field note updated' : 'Discovery collected'}: ${hotspots[id].name}.`)
  }
  const download = () => {
    downloadText(createFieldJournal(progress), 'common-ground-field-journal.md')
    notify('Journal downloaded.')
  }
  const restart = () => {
    if (!persistPreviousExploration(progress)) { notify('Your previous journal could not be saved. Download it before starting another trip.', true); return }
    setPreviousTrip(progress)
    setProgress({ ...initialExploration(), reducedMotion: progress.reducedMotion })
    setLocation('library')
    neighborhood()
    notify('A fresh field trip is ready. Your previous journal is kept on this device.')
  }
  const restorePrevious = () => {
    if (!previousTrip) return
    if (!persistPreviousExploration(progress)) { notify('Your current journal could not be saved. Download it before restoring another trip.', true); return }
    setPreviousTrip(progress)
    setProgress(previousTrip)
    neighborhood()
    notify('Your previous field trip has been restored.')
  }
  const submitSuggestion = (suggestion: Suggestion) => setDirectory(current => ({ ...current, suggestions: [...current.suggestions, suggestion] }))
  const review = (id: string, decision: 'approved' | 'declined') => {
    const result = reviewSuggestion(directory.resources, directory.suggestions, id, decision)
    if (result.error) { notify(result.error, true); return }
    setDirectory(current => ({ ...current, resources: result.resources, suggestions: result.suggestions }))
    notify(decision === 'approved' ? 'Correction approved in this device’s directory.' : 'Correction declined.')
  }
  const resource = dialog && 'resourceId' in dialog ? directory.resources.find(item => item.id === dialog.resourceId) : undefined
  const openResource = (item: Resource) => setDialog({ type: 'resource', resourceId: item.id })
  const pending = directory.suggestions.filter(suggestion => suggestion.status === 'pending').length

  return <div className={`app-shell exploration-app ${progress.reducedMotion ? 'reduced-motion' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to the map</a>
    <nav className="explore-subnav" aria-label="Explore"><div className="explore-subnav-inner">
      <button className={view === 'game' ? 'active' : ''} aria-current={view === 'game' ? 'page' : undefined} onClick={neighborhood}><Compass size={18} />Map</button>
      <button className={view === 'guild' ? 'active' : ''} aria-current={view === 'guild' ? 'page' : undefined} onClick={() => openGuild()}><Users size={18} />Guild</button>
      <button onClick={() => setDialog({ type: 'journal' })}><BookOpen size={18} />Journal<span className="nav-journal-count">{Object.keys(progress.entries).length}</span></button>
      <button className={view === 'map' ? 'active' : ''} aria-current={view === 'map' ? 'page' : undefined} onClick={() => navigate('map')}><Sprout size={18} />Places directory</button>
      <a className="explore-subnav-plan" href="/plan/">Plan a plot <ArrowRight size={16} /></a>
    </div></nav>
    {(!storage.directory || !storage.progress) && <div className="storage-notice" role="status">Browser storage is unavailable. You can still explore and download your journal; changes last for this visit.</div>}
    <main id="main-content" className={`main-content view-${view}`}>
      {view === 'game' && (place ? <PlaceView key={place} placeId={place} active={active} state={progress} onHotspot={setActive} onBack={neighborhood} onUpdate={updateProgress} onComplete={complete} onAbout={() => setDialog({ type: 'resource', resourceId: placeById[place].resourceId })} onDownload={download} onGuild={() => openGuild()} /> : <World state={progress} location={location} travel={travel?.to ?? null} onVisit={visit} onJournal={() => setDialog({ type: 'journal' })} onHow={() => setDialog({ type: 'how' })} selectedProjectId={selectedProjectId} onProjectChange={setSelectedProjectId} onNotice={notify} initialFocus={initialFocus} initialMode={initialMode} initialLayer={initialLayer} onGuild={openGuild} />)}
      <Suspense fallback={<p className="view-loading" role="status">Opening the Bay Area directory…</p>}>
        {view === 'guild' && <GuildHub tab={guildTab} selectedId={guildId} onTab={setGuildTab} onSelect={setGuildId} onNotice={notify} />}
        {view === 'map' && <ResourceMap key={mapVersion} resources={directory.resources} initialPractices={mapPractices} initialResourceId={initialResourceId} onOpen={openResource} onReview={() => navigate('review')} onGame={neighborhood} onGuild={() => openGuild()} />}
        {view === 'review' && <ReviewDesk resources={directory.resources} suggestions={directory.suggestions} onReview={review} onExample={() => { const suggestion = exampleSuggestion(directory.resources[0]); suggestion.id = `demo-${crypto.randomUUID()}`; suggestion.submittedAt = new Date().toISOString(); submitSuggestion(suggestion) }} onReset={() => { setDirectory(current => ({ ...current, resources: initialResources.map(item => ({ ...item })), suggestions: [] })); notify('The directory demo has been restored.') }} onMap={() => navigate('map')} onOpen={openResource} />}
      </Suspense>
    </main>
    <footer className="site-footer"><div className="footer-inner"><div className="footer-context"><p><Leaf size={18} />Journal saved on this device</p><span className="guild-challenge-credit">Built for the East Bay Permaculture Guild challenge</span></div><div><button onClick={() => setDialog({ type: 'sources' })}>Sources <span className="source-count">{evidence.length}</span></button><label className="motion-toggle"><input type="checkbox" checked={progress.reducedMotion} onChange={event => updateProgress({ reducedMotion: event.target.checked })} />Less motion</label><button onClick={() => navigate('review')}>Review{pending > 0 && <span className="pending-count">{pending}</span>}</button></div></div></footer>
    {dialog && <Modal title={dialog.type === 'resource' ? resource?.name ?? 'Place information' : dialog.type === 'correction' ? 'Suggest a correction' : dialog.type === 'journal' ? 'My journal' : dialog.type === 'sources' ? 'Learning and sources' : 'How to play'} onClose={() => setDialog(null)} wide={dialog.type === 'journal' || dialog.type === 'sources'}>
      {dialog.type === 'resource' && resource && <ResourceDetail resource={resource} onCorrect={() => setDialog({ type: 'correction', resourceId: resource.id })} onGuild={resource.id === 'oakland-peace-center' ? () => openGuild('opc-workdays') : undefined} />}
      {dialog.type === 'correction' && resource && <CorrectionForm resource={resource} onSubmit={submitSuggestion} onReview={() => navigate('review')} onBack={() => setDialog({ type: 'resource', resourceId: resource.id })} />}
      {dialog.type === 'journal' && <JournalDialog state={progress} previous={previousTrip} onVisit={visit} onDownload={download} onRestart={restart} onRestore={restorePrevious} />}
      {dialog.type === 'how' && <ExplorationHow onSources={() => setDialog({ type: 'sources' })} onStart={() => visit('farm')} />}
      {dialog.type === 'sources' && <ExplorationSources />}
    </Modal>}
    {toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role={toast.error ? 'alert' : 'status'}><Check size={18} /><span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </div>
}

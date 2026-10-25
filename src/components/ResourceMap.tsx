import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { ArrowRight, BookOpen, ExternalLink, Leaf, MapPin, Search, SlidersHorizontal, Sprout, Wrench, X } from 'lucide-react'
import { practices, practiceById } from '../data/practices.ts'
import { filterResources } from '../lib/directory.ts'
import { PracticeIcon } from './PracticeIcon.tsx'
import type { PracticeId, Resource, ResourceCategory } from '../types.ts'
import { GuildBridge } from '../guild/GuildBridge.tsx'

const categoryColors: Record<ResourceCategory, string> = { Garden: '#3c7552', Learning: '#507d83', 'Tools & seeds': '#a77947' }
const categoryIcons = { Garden: Sprout, Learning: BookOpen, 'Tools & seeds': Wrench }

function LeafletMap({ resources, selectedId, onSelect }: { resources: Resource[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<Map<string, L.Marker>>(new Map())
  const select = useRef(onSelect)
  const [tileError, setTileError] = useState(false)
  useEffect(() => { select.current = onSelect }, [onSelect])
  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, { zoomControl: false, scrollWheelZoom: false, maxZoom: 17, minZoom: 7 }).setView([37.8205, -122.26], 12)
    map.current = instance
    L.control.zoom({ position: 'topright' }).addTo(instance)
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(instance)
    tiles.on('tileerror', () => setTileError(true))
    tiles.on('tileload', () => setTileError(false))
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
      markers.current.clear()
    }
  }, [])
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    markers.current.forEach((marker) => marker.remove())
    markers.current.clear()
    const plotted = resources.filter((resource) => resource.coordinates)
    plotted.forEach((resource) => {
      const number = resources.indexOf(resource) + 1
      const icon = L.divIcon({
        className: 'cg-marker',
        html: `<span style="--marker-color:${categoryColors[resource.category]}"><b>${number}</b></span>`,
        iconSize: [36, 42],
        iconAnchor: [18, 39],
      })
      const tooltip = document.createElement('span')
      tooltip.textContent = resource.name
      const marker = L.marker(resource.coordinates!, { icon, title: resource.name, alt: resource.name, riseOnHover: true }).addTo(instance).bindTooltip(tooltip, { direction: 'top', offset: [0, -32] })
      marker.getElement()?.setAttribute('aria-label', `${resource.name}. Show map preview.`)
      marker.on('click', () => select.current(resource.id))
      markers.current.set(resource.id, marker)
    })
    if (plotted.length > 1) {
      instance.fitBounds(L.latLngBounds(plotted.map((resource) => resource.coordinates!)), { padding: [52, 52], maxZoom: 14, animate: false })
    } else if (plotted.length === 1) {
      instance.setView(plotted[0].coordinates!, 14, { animate: false })
    } else {
      instance.setView([37.8205, -122.26], 12, { animate: false })
    }
  }, [resources])
  useEffect(() => {
    markers.current.forEach((marker, id) => {
      marker.getElement()?.classList.toggle('selected', id === selectedId)
      marker.setZIndexOffset(id === selectedId ? 500 : 0)
    })
    const selected = markers.current.get(selectedId ?? '')
    if (selected && map.current && !map.current.getBounds().contains(selected.getLatLng())) {
      map.current.panTo(selected.getLatLng())
    }
  }, [selectedId, resources])
  return <>
    <div ref={container} className="leaflet-map" aria-label="Map of approximate public resource locations" />
    {tileError && <div className="map-tile-notice" role="status">Map tiles are unavailable. Every resource is still in the list.</div>}
  </>
}

export function ResourceMap({
  resources, initialPractices, initialResourceId, onOpen, onReview, onGame, onGuild,
}: {
  resources: Resource[]; initialPractices: PracticeId[]; initialResourceId: string | null
  onOpen: (resource: Resource) => void; onReview: () => void; onGame: () => void; onGuild: () => void
}) {
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('All')
  const [category, setCategory] = useState<ResourceCategory | 'All'>('All')
  const [chosen, setChosen] = useState<PracticeId[]>(initialPractices)
  const [selectedId, setSelectedId] = useState<string | null>(initialResourceId)
  const filtered = useMemo(() => filterResources(resources, { search, city, category, practices: chosen }), [resources, search, city, category, chosen])
  const selected = filtered.find((resource) => resource.id === selectedId)
  const plotted = filtered.filter((resource) => resource.coordinates).length
  const reset = () => { setSearch(''); setCity('All'); setCategory('All'); setChosen([]); setSelectedId(null) }
  const hasFilters = Boolean(search || city !== 'All' || category !== 'All' || chosen.length)
  return <>
    <section className="hero map-hero"><div><div className="eyebrow"><Leaf size={14} />Rooted in the Bay Area</div><h1>Find your people.<br /><em>Grow something together.</em></h1></div><div className="hero-copy"><p>Real places to learn, grow, and get involved.<br className="desktop-break" /> Carry your neighborhood discoveries into<br className="desktop-break" /> the community around you.</p><button className="text-button" onClick={onGame}>Back to the map <ArrowRight size={17} /></button></div></section>
    <GuildBridge compact onGuild={onGuild} />
    <section className="directory" aria-label="Bay Area resource directory">
      <div className="directory-controls">
        <label className="search-field"><Search size={19} /><input aria-label="Search resources" placeholder="Search a place, neighborhood, or idea…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}><X size={16} /></button>}</label>
        <label className="select-field"><MapPin size={16} /><select aria-label="Filter by county" value={city} onChange={(event) => setCity(event.target.value)}><option value="All">All counties</option>{[...new Set(resources.map(resource => resource.county ?? resource.city))].sort((a, b) => a === 'Online' ? 1 : b === 'Online' ? -1 : a.localeCompare(b)).map(county => <option key={county}>{county}</option>)}</select></label>
        <div className="category-tabs" role="group" aria-label="Filter by resource type">{(['All', 'Garden', 'Learning', 'Tools & seeds'] as const).map((value) => <button key={value} className={category === value ? 'active' : ''} aria-pressed={category === value} onClick={() => setCategory(value)}>{value === 'All' ? 'All resources' : value === 'Garden' ? 'Gardens' : value}</button>)}</div>
      </div>
      <div className="practice-filters"><span><SlidersHorizontal size={14} />Related to</span>{practices.map((practice) => <button key={practice.id} className={`filter-chip ${chosen.includes(practice.id) ? 'active' : ''}`} aria-pressed={chosen.includes(practice.id)} onClick={() => setChosen((previous) => previous.includes(practice.id) ? previous.filter((id) => id !== practice.id) : [...previous, practice.id])}><PracticeIcon id={practice.id} size={14} />{practice.shortName}</button>)}{hasFilters && <button className="clear-filters" onClick={reset}>Clear filters <X size={13} /></button>}</div>
      {initialPractices.length > 0 && <div className="design-match"><span className="status-dot" />Start with resources related to your design. Practice tags describe learning and participation, not measured ecological results.</div>}
      <div className="directory-grid">
        <div className="resource-list-panel"><div className="resource-list-heading"><h2>{filtered.length} {filtered.length === 1 ? 'place' : 'places'} & resources</h2><span>Source-check dates in each listing</span></div>
          <div className="resource-list" role="list" aria-label="Matching resources">
            {filtered.map((resource, index) => {
              const Icon = categoryIcons[resource.category]
              return <article role="listitem" key={resource.id} className={`resource-card ${selectedId === resource.id ? 'selected' : ''}`} data-resource={resource.id}>
                <div className="resource-card-top"><span className={`category-label category-${resource.category === 'Garden' ? 'garden' : resource.category === 'Learning' ? 'learning' : 'tools'}`}><Icon size={13} />{resource.category}</span><button className="resource-number" aria-label={`Locate ${resource.name}`} disabled={!resource.coordinates} onClick={() => setSelectedId(resource.id)}>{resource.coordinates ? <><MapPin size={11} />{index + 1}</> : resource.city === 'Online' ? 'Online' : 'By arrangement'}</button></div>
                <button className="resource-title" onClick={() => onOpen(resource)}>{resource.name}<ArrowRight size={15} /></button>
                <p className="resource-location">{resource.city} · {resource.neighborhood}</p><p className="resource-description">{resource.description}</p>
                <div className="resource-tags">{resource.practices.slice(0, 3).map((id) => <span key={id}>{practiceById[id].shortName}</span>)}{resource.practices.length > 3 && <span>+{resource.practices.length - 3}</span>}</div>
                {resource.status === 'demo-reviewed' && <span className="demo-reviewed-label">Reviewed in this demo</span>}
              </article>
            })}
            {!filtered.length && <div className="empty-state"><Search size={28} /><h3>No places in this mix yet.</h3><p>Try another keyword or open up a filter.</p><button className="button button-secondary button-small" onClick={reset}>Show all resources</button></div>}
          </div>
        </div>
        <div className="map-panel">
          <LeafletMap resources={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          <div className="map-legend"><span><i style={{ background: categoryColors.Garden }} />Gardens</span><span><i style={{ background: categoryColors.Learning }} />Learning</span><span><i style={{ background: categoryColors['Tools & seeds'] }} />Tools & seeds</span></div>
          {selected && <div className="map-preview"><div><span className="eyebrow muted">{selected.city} · {selected.category}</span><h3>{selected.name}</h3><p>{selected.access}</p><button className="text-button" onClick={() => onOpen(selected)}>See how to take part <ArrowRight size={15} /></button></div><button className="icon-button" aria-label="Close map preview" onClick={() => setSelectedId(null)}><X size={17} /></button></div>}
          <div className="map-privacy-note"><MapPin size={14} /><span>{plotted} approximate public pins · {filtered.length - plotted} listed without a pin<br /><strong>Confirm access with each provider. Private residences stay off this map.</strong></span></div>
        </div>
      </div>
    </section>
    <div className="directory-bottom"><p><Sprout size={18} />A living directory needs people who care for it.</p><button className="text-button" onClick={onReview}>Visit the local review desk <ArrowRight size={16} /></button><a className="text-button muted" href="/projects/index.html" target="_blank" rel="noreferrer">Readable resource pages <ExternalLink size={14} /></a></div>
  </>
}

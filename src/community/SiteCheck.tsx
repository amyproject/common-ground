import { useState } from 'react'
import { ArrowRight, Check, ChevronRight, Droplets, ExternalLink, LayoutGrid, MapPin, Mountain, Sun, Thermometer } from 'lucide-react'
import { assessPlant, plants, soilSource } from './plants.ts'
import { climateAt, inPilot, regionalClimateAt, terrainAt } from './geography.ts'
import { zoneNames } from '../hub/climate.ts'
import { PlantArt } from './PlantArt.tsx'
import type { PlantId, SelectedSite, SiteConditions, SiteEnvironment } from './types.ts'

const fahrenheit = (value: number) => Math.round(value * 9 / 5 + 32)
const seasonNames = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' }

export function SiteQuestions({ conditions, onChange }: { conditions: SiteConditions; onChange: (conditions: SiteConditions) => void }) {
  return <div className="site-questions">
    <label>Direct sun<Sun size={17} /><select value={conditions.sun} onChange={event => onChange({ ...conditions, sun: event.target.value as SiteConditions['sun'] })}><option value="unknown">Not sure yet</option><option value="shade">Under 4 hours</option><option value="part">4–6 hours</option><option value="full">6+ hours</option></select></label>
    <label>Water available<Droplets size={17} /><select value={conditions.water} onChange={event => onChange({ ...conditions, water: event.target.value as SiteConditions['water'] })}><option value="unknown">Not sure yet</option><option value="none">No water plan</option><option value="limited">Occasional watering</option><option value="regular">Regular watering</option></select></label>
    <label>Drainage<select value={conditions.drainage} onChange={event => onChange({ ...conditions, drainage: event.target.value as SiteConditions['drainage'] })}><option value="unknown">Not sure yet</option><option value="drains">Water drains away</option><option value="ponds">Water stays pooled</option></select></label>
    <label>Growing area<select value={conditions.surface} onChange={event => onChange({ ...conditions, surface: event.target.value as SiteConditions['surface'], ...(event.target.value !== 'containers' && conditions.soil === 'clean-bed' ? { soil: 'unknown' as const } : {}) })}><option value="unknown">Not sure yet</option><option value="ground">In the ground</option><option value="containers">Raised beds / containers</option></select></label>
    <label>Soil check<select value={conditions.soil} onChange={event => onChange({ ...conditions, soil: event.target.value as SiteConditions['soil'], ...(event.target.value === 'clean-bed' ? { surface: 'containers' as const } : {}) })}><option value="unknown">Not tested / not sure</option><option value="tested">Test reviewed for this use</option><option value="clean-bed">Verified clean container soil</option><option value="concern">A concern needs assessment</option></select></label>
    <label>Planting season<select value={conditions.season} onChange={event => onChange({ ...conditions, season: event.target.value as SiteConditions['season'] })}>{Object.entries(seasonNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
  </div>
}

export function SiteFacts({ site, environment }: { site: SelectedSite; environment: SiteEnvironment | null }) {
  const terrain = environment ? terrainAt(environment, site) : null
  const climate = environment ? climateAt(environment, site) : null
  const regional = environment ? regionalClimateAt(environment, site) : null
  if (regional) return <div className="site-facts">
    <div><Thermometer size={22} /><span><strong>{fahrenheit(regional.reference.summerHighC)}°F</strong><small>Summer high · {zoneNames[regional.reference.zone]}</small></span></div>
    <div><Sun size={22} /><span><strong>{regional.reference.freezingDaysPerYear}</strong><small>Frost nights a year</small></span></div>
    <div><Droplets size={22} /><span><strong>{(regional.reference.annualRainMm / 25.4).toFixed(0)} in</strong><small>Rain a year · {(regional.reference.summerRainMm / 25.4).toFixed(1)} in in summer</small></span></div>
  </div>
  return <div className="site-facts">
    <div><Mountain size={22} /><span><strong>{terrain ? `~${Math.round(terrain.elevation * 3.28084)} ft` : 'Unknown'}</strong><small>Elevation estimate</small></span></div>
    <div><MapPin size={22} /><span><strong>{terrain?.slope != null ? `~${Math.round(terrain.slope)}%` : 'Unknown'}</strong><small>Area slope estimate</small></span></div>
    <div><Droplets size={22} /><span><strong>{climate ? `${(climate.summerRainMm / 25.4).toFixed(1)} in` : 'Unknown'}</strong><small>Regional summer rain</small></span></div>
  </div>
}

export function SiteObservations({ conditions }: { conditions: SiteConditions }) {
  const observations = [
    ['Direct sun', { unknown: 'Not sure yet', shade: 'Under 4 hours', part: '4–6 hours', full: '6+ hours' }[conditions.sun]],
    ['Water', { unknown: 'Not sure yet', none: 'No water plan', limited: 'Occasional watering', regular: 'Regular watering' }[conditions.water]],
    ['Drainage', { unknown: 'Not sure yet', drains: 'Drains away', ponds: 'Water stays pooled' }[conditions.drainage]],
    ['Growing area', { unknown: 'Not sure yet', ground: 'In the ground', containers: 'Raised beds / containers' }[conditions.surface]],
    ['Soil', { unknown: 'Not tested / not sure', tested: 'Test reviewed for this use', 'clean-bed': 'Verified clean container soil', concern: 'A concern needs assessment' }[conditions.soil]],
    ['Season', seasonNames[conditions.season]],
  ]
  return <dl className="site-observations">{observations.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
}

export function SiteEvidence({ environment, site }: { environment: SiteEnvironment | null; site: SelectedSite }) {
  const covered = inPilot(site.latitude, site.longitude)
  const regional = environment ? regionalClimateAt(environment, site) : null
  return <details className="site-evidence"><summary>Data, seasons & what to check <ChevronRight size={17} /></summary>
    <p>Climate is a regional model, terrain is approximate, and site answers come from you. Sun bands and plant matches are a simplified shortlist, not a site assessment. Check mature size, soil tests, access, and local varieties before planting.</p>
    <p>Mapped green space doesn’t establish permission. Soil condition, contamination, utilities, building shade, and boundaries aren’t measured by this map. <a href={soilSource} target="_blank" rel="noreferrer">UC ANR soil guidance <ExternalLink size={15} /></a></p>
    {environment && covered ? <>
      <p><a href={environment.climate.url} target="_blank" rel="noreferrer">Open-Meteo / Copernicus ERA5 <ExternalLink size={15} /></a>: {environment.climate.period}, ~{environment.climate.resolutionKm} km grid; one reference for this Oakland pilot. These ten years are not official 30-year climate normals or a USDA hardiness-zone lookup.</p>
      <div className="climate-summary"><span><strong>{(environment.climate.annualRainMm / 25.4).toFixed(1)} in</strong> modeled rain / year</span><span><strong>{fahrenheit(environment.climate.coldestNightC)}°F</strong> coldest modeled night</span></div>
      <div className="season-chart-scroll"><div className="season-chart" role="img" aria-label={`Average modeled monthly precipitation for ${environment.climate.period}. Summer rain: ${environment.climate.summerRainMm} millimeters.`}>{environment.climate.months.map(month => <div key={month.month} className={month.month >= 6 && month.month <= 8 ? 'dry' : ''}><span>{(month.precipitationMm / 25.4).toFixed(1)}″</span><i style={{ height: `${Math.max(3, month.precipitationMm / Math.max(...environment.climate.months.map(item => item.precipitationMm)) * 95)}px` }} /><strong>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month.month - 1]}</strong><small>{fahrenheit(month.lowC)}–{fahrenheit(month.highC)}°</small></div>)}</div></div>
      <p>Chart: modeled average rain (inches) and daily low–high temperatures (°F). Summer water must be planned; low-water natives also need establishment care.</p>
      <p><a href={environment.terrain.url} target="_blank" rel="noreferrer">Open-Meteo / Copernicus DEM GLO-90 <ExternalLink size={15} /></a>: 90 m elevation data, sampled about every {environment.terrain.sampleSpacingMeters} m. Slope is a neighborhood estimate; it can miss beds, walls, trees, and local drainage. Data checked {environment.checkedAt}.</p>
    </> : regional ? <>
      <p><a href={regional.source.url} target="_blank" rel="noreferrer">{regional.source.source} <ExternalLink size={15} /></a>: {regional.source.period}, ~{regional.source.resolutionKm} km grid. This spot uses the nearest of {regional.source.references.length} Bay Area reference points, <strong>{regional.reference.name}</strong>, about {Math.round(regional.distanceKm)} km away. Hills, fog gaps, and the bay change conditions over short distances, so treat it as a neighbor’s weather, not yours. Terrain hasn’t been added outside Oakland.</p>
      <div className="climate-summary"><span><strong>{(regional.reference.annualRainMm / 25.4).toFixed(1)} in</strong> modeled rain / year</span><span><strong>{fahrenheit(regional.reference.coldestNightC)}°F</strong> coldest modeled night</span></div>
      <div className="season-chart-scroll"><div className="season-chart" role="img" aria-label={`Average modeled monthly precipitation near ${regional.reference.name}, ${regional.source.period}.`}>{regional.reference.months.map(month => <div key={month.month} className={month.month >= 6 && month.month <= 8 ? 'dry' : ''}><span>{(month.precipitationMm / 25.4).toFixed(1)}″</span><i style={{ height: `${Math.max(3, month.precipitationMm / Math.max(...regional.reference.months.map(item => item.precipitationMm)) * 95)}px` }} /><strong>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month.month - 1]}</strong><small>{fahrenheit(month.lowC)}–{fahrenheit(month.highC)}°</small></div>)}</div></div>
      <p>Chart: modeled average rain (inches) and daily low–high temperatures (°F). Five years of reanalysis are not official climate normals or a hardiness-zone lookup.</p>
    </> : <p>{covered ? 'Environmental data is unavailable.' : 'Local climate and terrain data have not been added for this area. The regional map shows general geography; check this site and local plant varieties.'} No climate or terrain measurements have been guessed.</p>}
  </details>
}

export function SiteCheck({ site, environment, conditions, selected, onConditions, onSelected, onStart }: {
  site: SelectedSite; environment: SiteEnvironment | null; conditions: SiteConditions; selected: PlantId[]
  onConditions: (conditions: SiteConditions) => void; onSelected: (plants: PlantId[]) => void; onStart: () => void
}) {
  const [filter, setFilter] = useState<'all' | 'food' | 'habitat'>('all')
  const matches = plants.map(plant => ({ plant, match: assessPlant(plant, conditions, site.feature) }))
  const unknowns = ['sun', 'water', 'drainage', 'soil', 'surface'].filter(key => conditions[key as keyof SiteConditions] === 'unknown').length
  return <div className="community-dialog site-check">
    <div className="community-location"><MapPin size={17} />{site.label}<span>{site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}</span></div>
    <h2>What can grow <em>here?</em></h2>
    <p className="community-lead">Add what you observe. Pick plants for your plan.</p>
    <div className={`mapped-feature ${site.feature === 'water' || site.feature === 'road' || site.feature === 'building' ? 'feature-caution' : ''}`}>{site.featureName}<small>Mapped feature · access unconfirmed</small></div>
    <SiteFacts site={site} environment={environment} />
    {!inPilot(site.latitude, site.longitude) && (() => { const regional = environment ? regionalClimateAt(environment, site) : null; return <p className="site-coverage-note">{regional ? `Climate from the nearest reference point, ${regional.reference.name} (~${Math.round(regional.distanceKm)} km). Terrain not added here yet.` : 'Local climate & terrain: not added for this spot. Plant matches use your answers.'}</p> })()}
    <SiteQuestions conditions={conditions} onChange={onConditions} />
    <div className="plant-result-heading"><h3>Plant shortlist</h3><span role="status">{unknowns ? `${unknowns} site checks left` : 'Based on your answers'}</span></div>
    <div className="plant-filter" role="group" aria-label="Plant type">{([['all', 'All plants'], ['food', 'Food'], ['habitat', 'California natives']] as const).map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
    <div className="site-plant-grid">{matches.filter(({ plant }) => filter === 'all' || plant.kind === filter).map(({ plant, match }) => <article key={plant.id} className={`site-plant ${selected.includes(plant.id) ? 'selected' : ''}`}>
      <button className="plant-select" aria-pressed={selected.includes(plant.id)} aria-label={`Select ${plant.name}`} onClick={() => onSelected(selected.includes(plant.id) ? selected.filter(id => id !== plant.id) : [...selected, plant.id])}><PlantArt id={plant.id} /><span><strong>{plant.name}</strong><small>{plant.benefit}</small></span><span className="plant-tick">{selected.includes(plant.id) && <Check size={16} />}</span></button>
      <span className={`plant-match match-${match.status}`}>{match.status === 'likely' ? 'Promising' : match.label}</span>
      <p>{match.status === 'check' ? `Check ${match.unknowns.join(', ').toLowerCase()}.` : match.reasons[0]}</p>
      <details><summary>Care & source</summary><p>{plant.care}</p>{match.reasons.length > 1 && <p>{match.reasons.slice(1).join(' ')}</p>}{match.unknowns.length > 0 && <p>Also check: {match.unknowns.join(', ').toLowerCase()}.</p>}<p>{plant.seasonNote}</p><a href={plant.source} target="_blank" rel="noreferrer">{plant.sourceName} <ExternalLink size={15} /></a></details>
    </article>)}</div>
    <SiteEvidence environment={environment} site={site} />
    <div className="community-sticky-actions"><span>{selected.length ? `${selected.length} plant${selected.length === 1 ? '' : 's'} picked` : 'You can choose plants in your plan.'}</span><a className="button button-secondary" href={`/plan/?lat=${site.latitude.toFixed(5)}&lon=${site.longitude.toFixed(5)}&place=${encodeURIComponent(site.label)}#check`}><LayoutGrid size={17} />Plan my own plot here</a><button className="button button-primary" onClick={onStart}>Start a garden <ArrowRight size={19} /></button></div>
  </div>
}

import { memo, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Droplets, ExternalLink, LayoutGrid, MapPin, Snowflake, Stamp, Sun } from 'lucide-react'
import { mapPoint } from '../community/geography.ts'
import { nearestReference, zoneNames } from '../hub/climate.ts'
import type { BayClimate, ClimateLayer, ClimateReference, ClimateZone } from '../hub/climate.ts'
import { formatSourceDate } from '../lib/dates.ts'
import type { Resource } from '../types.ts'
import type { NeighborhoodGeometry } from './geography.ts'

type Point = number[]
export type LayerId = 'summer' | 'rain' | 'frost'
export const layerKeys: Record<LayerId, ClimateLayer> = { summer: 'summerHighC', rain: 'annualRainMm', frost: 'freezingDaysPerYear' }

// Bucket edges are in display units (°F, inches, nights) so legend labels read naturally.
export const layerStyles: Record<LayerId, { title: string; short: string; unit: (value: number) => string; toDisplay: (raw: number) => number; edges: number[]; colors: string[]; labels: string[] }> = {
  summer: { title: 'Summer afternoons', short: 'Summer heat', toDisplay: c => c * 9 / 5 + 32, unit: v => `${Math.round(v)}°F`, edges: [70, 75, 80, 85, 89], colors: ['#9cc8cc', '#c3dcc4', '#e4e3b2', '#edcf95', '#e2ab79', '#cc845f'], labels: ['<70°', '70s', '75+', '80+', '85+', '89°+'] },
  rain: { title: 'Rain a year', short: 'Rain', toDisplay: mm => mm / 25.4, unit: v => `${Math.round(v)} in`, edges: [16, 20, 24, 30, 38], colors: ['#efe2bf', '#dde2bb', '#bdd6bd', '#99c6c0', '#73acb2', '#4e8b97'], labels: ['<16″', '16″', '20″', '24″', '30″', '38″+'] },
  frost: { title: 'Frost nights a year', short: 'Frost', toDisplay: n => n, unit: v => v < .5 ? 'almost none' : `${Math.round(v)} night${Math.round(v) === 1 ? '' : 's'}`, edges: [.3, 1, 2.5, 5], colors: ['#f2efdc', '#dde6eb', '#c1d3e3', '#9fb9d6', '#7e9cc6'], labels: ['~0', '1', '2–3', '3–5', '5+'] },
}
const bucket = (edges: number[], value: number) => { let i = 0; while (i < edges.length && value >= edges[i]) i++; return i }

const hex = (color: string) => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
// Continuous color between bucket colors, so the bilinear-smoothed image reads as a gradient.
function rampColor(edges: number[], colors: string[], value: number) {
  const i = bucket(edges, value)
  if (i === 0 || i === colors.length - 1) return hex(colors[i])
  const low = edges[i - 1], high = edges[i] ?? low + 1
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  const a = hex(colors[i]), b = hex(colors[Math.min(colors.length - 1, i + 1)])
  return a.map((v, k) => Math.round(v + (b[k] - v) * t * .6))
}

export const ClimateGrid = memo(function ClimateGrid({ map, climate, layer }: { map: NeighborhoodGeometry; climate: BayClimate; layer: LayerId }) {
  const art = useMemo(() => {
    const style = layerStyles[layer]
    const { bounds: [west, south, east, north], step, columns, rows, layers } = climate.grid
    const values = layers[layerKeys[layer]]
    const canvas = document.createElement('canvas')
    canvas.width = columns; canvas.height = rows
    const context = canvas.getContext('2d')
    if (!context) return null
    const image = context.createImageData(columns, rows)
    values.forEach((raw, index) => {
      if (raw === null) return
      const [r, g, b] = rampColor(style.edges, style.colors, style.toDisplay(raw))
      image.data.set([r, g, b, 255], index * 4)
    })
    context.putImageData(image, 0, 0)
    const [x0, y0] = mapPoint(map, { latitude: north + step / 2, longitude: west - step / 2 })
    const [x1, y1] = mapPoint(map, { latitude: south - step / 2, longitude: east + step / 2 })
    const land = map.region ? map.region.land.map(shape => shape.rings.map(ring => ring.map(([lon, lat], i) => { const [x, y] = mapPoint(map, { latitude: lat, longitude: lon }); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ') + 'Z').join(' ')).join(' ') : null
    return { href: canvas.toDataURL(), x: x0, y: y0, width: x1 - x0, height: y1 - y0, land }
  }, [map, climate, layer])
  if (!art) return null
  return <g className="climate-grid" aria-hidden="true">
    {art.land && <clipPath id="climate-land"><path d={art.land} fillRule="evenodd" /></clipPath>}
    <image href={art.href} x={art.x} y={art.y} width={art.width} height={art.height} preserveAspectRatio="none" opacity=".72" clipPath={art.land ? 'url(#climate-land)' : undefined} />
  </g>
})

export function ClimateLegend({ layer, climate }: { layer: LayerId; climate: BayClimate }) {
  const style = layerStyles[layer]
  return <div className="climate-legend" role="note">
    <strong>{style.title}</strong>
    <div className="climate-legend-swatches">{style.colors.map((color, index) => <span key={color}><i style={{ background: color }} />{style.labels[index]}</span>)}</div>
    <small>Blended between {climate.references.length} reference points · {climate.period}</small>
  </div>
}

export function StopArt({ kind, size = 40 }: { kind: Resource['kind']; size?: number }) {
  return <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden="true">
    <ellipse cy="13" rx="17" ry="5" fill="#cbd7ab" />
    {kind === 'farm' ? <g><path d="M-14 12 L-14 -2 L-7 -9 L0 -2 L0 12Z" fill="#b65d47" stroke="#7d3d2f" strokeWidth="1.2" /><rect x="-10" y="3" width="6" height="9" fill="#f3e3c4" /><path d="M3 12 q5 -6 13 -2 M3 8 q5 -6 13 -2 M3 4 q5 -6 13 -2" stroke="#6f8a57" strokeWidth="2" fill="none" strokeLinecap="round" /></g>
      : kind === 'nursery' ? <g>{[-11, 0, 11].map((x, i) => <g key={x} transform={`translate(${x} 0)`}><path d="M-5 4 h10 l-2 8 h-6z" fill="#c4825a" /><path d={`M0 4 V${-4 - i * 2} M0 ${-1 - i} q-5 -2 -6 -7 M0 ${-2 - i} q5 -3 6 -8`} stroke="#5f8a45" strokeWidth="1.8" fill="none" strokeLinecap="round" /></g>)}</g>
      : kind === 'learning' ? <g><path d="M-13 12 V-1 L0 -11 L13 -1 V12Z" fill="#e7d3b0" stroke="#9b7a52" strokeWidth="1.2" /><path d="M-8 4 q4 -3 8 0 q4 -3 8 0 V11 q-4 -3 -8 0 q-4 -3 -8 0Z" fill="#fffaf0" stroke="#6f7e5a" strokeWidth="1" /><path d="M0 4 V11" stroke="#6f7e5a" strokeWidth="1" /></g>
      : kind === 'park' ? <g><path d="M-7 12 V2 M8 12 V0" stroke="#7d6a4c" strokeWidth="2.6" strokeLinecap="round" /><circle cx="-7" cy="-3" r="8" fill="#7d9a5f" /><circle cx="8" cy="-6" r="9.5" fill="#8fac6c" /></g>
      : <g><rect x="-14" y="2" width="28" height="9" rx="2" fill="#a77b52" /><rect x="-12" y="3.5" width="24" height="5" fill="#7a5a3e" />{[-9, -3, 3, 9].map((x, i) => <g key={x}><path d={`M${x} 4 V${-3 - i % 2 * 3}`} stroke="#5f8a45" strokeWidth="1.6" /><circle cx={x} cy={-5 - i % 2 * 3} r="3" fill={['#e8a33c', '#d8664a', '#f0c75e', '#c9553e'][i]} /></g>)}</g>}
  </svg>
}

export function StopMarkers({ map, stops, screenPoint, width, height, zoom, visited, hovered, onHover, onOpen, disabled }: {
  map: NeighborhoodGeometry; stops: Resource[]; screenPoint: (point: Point) => Point; width: number; height: number; zoom: number
  visited: string[]; hovered: string | null; onHover: (id: string | null) => void; onOpen: (stop: Resource) => void; disabled: boolean
}) {
  const showNames = zoom >= .3
  return <g className="stop-markers">{stops.map(stop => {
    const [x, y] = screenPoint(mapPoint(map, { latitude: stop.coordinates![0], longitude: stop.coordinates![1] }))
    if (x < -30 || x > width + 30 || y < -30 || y > height + 30) return null
    const active = hovered === stop.id
    const stamped = visited.includes(stop.id)
    const label = stop.name.length > 30 ? `${stop.name.slice(0, 29)}…` : stop.name
    const labelWidth = label.length * 7.4 + 22
    return <g key={stop.id} className={`stop-marker ${active ? 'active' : ''} ${stamped ? 'stamped' : ''}`} transform={`translate(${x} ${y})`} data-map-action={`stop-${stop.id}`} role="button" tabIndex={disabled ? -1 : 0} aria-label={`Open ${stop.name}, ${stop.city}`}
      onMouseEnter={() => onHover(stop.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(stop.id)} onBlur={() => onHover(null)}
      onClick={event => { event.stopPropagation(); if (!disabled) onOpen(stop) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (!disabled) onOpen(stop) } }}>
      <g className="stop-marker-body"><circle r="21" fill="#fffcef" stroke={stamped ? '#5f7f4b' : '#a5b78b'} strokeWidth={stamped ? 2.5 : 1.5} /><g transform="translate(-17 -18.5)"><StopArt kind={stop.kind} size={34} /></g></g>
      {stamped && <g transform="translate(15 -15)"><circle r="8" fill="#5f7f4b" stroke="#fffcef" strokeWidth="2" /><path d="M-3.5 0 l2.4 2.4 L3.8 -2.6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" /></g>}
      {(showNames || active) && <g className="stop-marker-label" transform="translate(0 27)"><rect x={-labelWidth / 2} width={labelWidth} height="26" rx="8" fill="#fffcef" stroke="#b4c4a3" /><text y="17.5" textAnchor="middle" fontSize="13" fontWeight="600" fill="#34533c">{label}</text></g>}
    </g>
  })}</g>
}

const questions: Record<ClimateZone, { prompt: string; options: string[]; answer: number; why: string }> = {
  coast: { prompt: 'A July afternoon here is often in the low 60s under fog. Which crop will sulk?', options: ['Tomatoes', 'Kale', 'Potatoes'], answer: 0, why: 'Tomatoes need warm days and nights to set and ripen fruit. Cool-loving kale and potatoes shrug off fog.' },
  bay: { prompt: 'Rain stops around April and comes back in October. What carries a bed through summer on the least water?', options: ['A quick sprinkle every day', 'Three inches of mulch and a deep weekly soak', 'Bare soil raked smooth'], answer: 1, why: 'Mulch slows evaporation and deep, infrequent water sends roots down where the soil stays moist.' },
  hills: { prompt: 'Winter storms send water racing downhill here. What slows it so the soil can drink?', options: ['A ditch straight down the slope', 'A swale dug along the contour', 'Clearing the slope bare'], answer: 1, why: 'A level swale catches runoff and spreads it sideways so it soaks in, instead of carrying soil away.' },
  valley: { prompt: 'Winter nights here drop close to freezing. Why do fruit growers like that?', options: ['It gives fruit trees the chill hours they need to bloom', 'It kills every pest', 'It sweetens grapes in winter'], answer: 0, why: 'Apples, cherries, and many stone fruits need hundreds of cool hours before they flower well in spring.' },
  inland: { prompt: 'Summers here top 90°F with no rain. Where does a young tree do best in year one?', options: ['Full western sun on bare soil', 'A mulched basin with afternoon shade and slow, deep water', 'Under a lawn sprinkler'], answer: 1, why: 'Shade and mulch keep roots cool while deep, slow water builds a root system that can find water later.' },
}

const PASSPORT_KEY = 'common-ground-bay-passport-v1'
export interface Passport { visited: string[]; stamps: Partial<Record<ClimateZone, number>> }
export function usePassport() {
  const [passport, setPassport] = useState<Passport>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(PASSPORT_KEY) ?? 'null')
      if (value && Array.isArray(value.visited) && value.stamps && typeof value.stamps === 'object') return { visited: value.visited.filter((id: unknown) => typeof id === 'string'), stamps: value.stamps }
    } catch { /* storage unavailable */ }
    return { visited: [], stamps: {} }
  })
  useEffect(() => { try { localStorage.setItem(PASSPORT_KEY, JSON.stringify(passport)) } catch { /* storage unavailable */ } }, [passport])
  return [passport, setPassport] as const
}

export function zoneOf(climate: BayClimate | null, stop: Resource) {
  if (!climate || !stop.coordinates) return null
  return nearestReference(climate, { latitude: stop.coordinates[0], longitude: stop.coordinates[1] }, 40)
}

export function StopCard({ stop, climate, passport, onPassport, onCheck }: {
  stop: Resource; climate: BayClimate | null; passport: Passport; onPassport: (next: Passport) => void; onCheck: () => void
}) {
  const near = zoneOf(climate, stop)
  const oakland = climate?.references.find(reference => reference.name === 'Oakland') ?? null
  const [compare, setCompare] = useState(false)
  const question = near ? questions[near.reference.zone] : null
  const earned = near ? passport.stamps[near.reference.zone] : undefined
  const [choice, setChoice] = useState<number | null>(earned ?? null)
  useEffect(() => { if (!passport.visited.includes(stop.id)) onPassport({ ...passport, visited: [...passport.visited, stop.id] }) }, [stop.id])
  const answer = (index: number) => {
    setChoice(index)
    if (near && question && index === question.answer && earned === undefined) onPassport({ ...passport, visited: passport.visited.includes(stop.id) ? passport.visited : [...passport.visited, stop.id], stamps: { ...passport.stamps, [near.reference.zone]: index } })
  }
  const [lat, lon] = stop.coordinates!
  return <div className="community-dialog stop-card">
    <div className="stop-card-head"><div className="stop-card-art"><StopArt kind={stop.kind} size={92} /></div><div>
      <div className="community-location"><MapPin size={16} />{stop.city}{stop.county && stop.county !== stop.city ? ` · ${stop.county} County` : ''}</div>
      <h2>{stop.name}</h2>
      <p className="community-lead">{stop.description}</p>
    </div></div>
    {near && <section className="stop-climate">
      <div className="stop-climate-head"><span className={`zone-chip zone-${near.reference.zone}`}>{zoneNames[near.reference.zone]}</span><span>Weather modeled near {near.reference.name}{near.distanceKm > 3 ? ` (${Math.round(near.distanceKm)} km away)` : ''}</span>{oakland && near.reference.name !== 'Oakland' && <label className="stop-compare"><input type="checkbox" checked={compare} onChange={event => setCompare(event.target.checked)} />Compare with Oakland</label>}</div>
      <div className="stop-climate-body">
        <dl>
          <div><dt><Sun size={15} />Summer high</dt><dd>{Math.round(near.reference.summerHighC * 9 / 5 + 32)}°F{compare && oakland && <small> vs {Math.round(oakland.summerHighC * 9 / 5 + 32)}°</small>}</dd></div>
          <div><dt><Droplets size={15} />Rain a year</dt><dd>{Math.round(near.reference.annualRainMm / 25.4)} in{compare && oakland && <small> vs {Math.round(oakland.annualRainMm / 25.4)}″</small>}</dd></div>
          <div><dt><Snowflake size={15} />Frost nights</dt><dd>{near.reference.freezingDaysPerYear}{compare && oakland && <small> vs {oakland.freezingDaysPerYear}</small>}</dd></div>
        </dl>
        <MonthChart reference={near.reference} compare={compare ? oakland : null} />
      </div>
    </section>}
    {question && near && <section className={`stop-question ${choice !== null ? (choice === question.answer ? 'right' : 'wrong') : ''}`}>
      <h3>Field question <span>{earned !== undefined ? <><Stamp size={15} />Stamp collected</> : 'Answer to earn this zone’s stamp'}</span></h3>
      <p>{question.prompt}</p>
      <div className="stop-options">{question.options.map((option, index) => <button key={option} aria-pressed={choice === index} className={choice !== null && index === question.answer ? 'is-answer' : ''} onClick={() => answer(index)}>{choice === index && index === question.answer && <Check size={16} />}{option}</button>)}</div>
      {choice !== null && <p className="stop-why" role="status">{choice === question.answer ? 'Yes. ' : 'Not quite. '}{question.why}</p>}
      {choice === question.answer && earned === undefined && <div className="stamp-burst" aria-hidden="true"><Stamp size={22} /></div>}
    </section>}
    <section className="stop-visit">
      <h3>Take part</h3>
      <p>{stop.access}</p>
      {stop.address && <p className="stop-address">{stop.address}</p>}
      <div className="stop-actions">
        <a className="button button-primary" href={stop.url} target="_blank" rel="noreferrer">{stop.action} <ExternalLink size={16} /></a>
        <button className="button button-secondary" onClick={onCheck}><MapPin size={16} />Check a spot nearby</button>
        <a className="button button-secondary" href={`/plan/?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&place=${encodeURIComponent(stop.city)}#check`}><LayoutGrid size={16} />Plan a plot near here</a>
      </div>
      <p className="stop-source">Checked on <a href={stop.sourceUrl} target="_blank" rel="noreferrer">{stop.sourcePublisher}’s website</a> · {formatSourceDate(stop.checkedAt)}. Not confirmed by the stewards; schedules change.</p>
    </section>
  </div>
}

function MonthChart({ reference, compare }: { reference: ClimateReference; compare: ClimateReference | null }) {
  const w = 300, h = 96
  const y = (c: number) => 60 - (c - 4) / 30 * 54
  const rainMax = 180
  const line = (r: ClimateReference) => r.months.map((m, i) => `${i ? 'L' : 'M'}${i * 25 + 12.5} ${y(m.highC).toFixed(1)}`).join(' ')
  return <svg className="month-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Monthly rain bars and afternoon high line near ${reference.name}${compare ? ', compared with Oakland' : ''}.`}>
    {reference.months.map((m, i) => { const bh = Math.min(rainMax, m.precipitationMm) / rainMax * 28; return <rect key={m.month} x={i * 25 + 5} y={84 - bh} width="15" height={bh} rx="2" fill="#acd0cf" /> })}
    {compare && <path d={line(compare)} fill="none" stroke="#9aa58b" strokeWidth="1.6" strokeDasharray="4 3" />}
    <path className="month-line" d={line(reference)} fill="none" stroke="#b8734c" strokeWidth="2.2" strokeLinejoin="round" />
    {reference.months.map((m, i) => <text key={m.month} x={i * 25 + 12.5} y="95" textAnchor="middle">{'JFMAMJJASOND'[i]}</text>)}
    <text x="2" y="10" className="month-chart-key">— afternoon high{compare ? '  ‐ ‐ Oakland' : ''}   ▮ rain</text>
  </svg>
}

export function PassportDialog({ passport, stops, climate, onOpen }: { passport: Passport; stops: Resource[]; climate: BayClimate | null; onOpen: (stop: Resource) => void }) {
  const zones: ClimateZone[] = ['coast', 'bay', 'hills', 'valley', 'inland']
  return <div className="passport">
    <p className="community-lead">Visit a place in each climate zone and answer its field question to collect a stamp.</p>
    <div className="passport-stamps">{zones.map(zone => {
      const earned = passport.stamps[zone] !== undefined
      const options = stops.filter(stop => zoneOf(climate, stop)?.reference.zone === zone)
      return <div key={zone} className={`passport-stamp ${earned ? 'earned' : ''}`}>
        <div className={`stamp-ring zone-${zone}`}>{earned ? <Stamp size={30} /> : <span>?</span>}</div>
        <strong>{zoneNames[zone]}</strong>
        <small>{earned ? 'Collected' : options.length ? `${options.length} place${options.length === 1 ? '' : 's'} to try` : 'No places yet'}</small>
        {!earned && options[0] && <button className="text-button" onClick={() => onOpen(options[0])}>Try {options[0].name.length > 22 ? `${options[0].name.slice(0, 21)}…` : options[0].name} <ArrowRight size={14} /></button>}
      </div>
    })}</div>
    <p className="passport-foot">{passport.visited.length} place{passport.visited.length === 1 ? '' : 's'} visited. Saved on this device.</p>
  </div>
}

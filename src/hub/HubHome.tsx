import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Droplets, KeyRound, Snowflake, Sun } from 'lucide-react'
import type { BayAreaGeometry } from '../exploration/geography.ts'
import type { Resource } from '../types.ts'
import type { BayClimate, ClimateReference } from './climate.ts'
import { seasons } from './seasons.ts'

type ZoneId = 'coast' | 'bay' | 'hills' | 'valley' | 'inland'
const zones: { id: ZoneId; name: string; reference: string; x: [number, number]; blurb: string; bets: string }[] = [
  { id: 'coast', name: 'Fog belt', reference: 'Half Moon Bay', x: [0, 190], blurb: 'Summer fog keeps afternoons cool and damp. Heat lovers sulk; greens and berries thrive.', bets: 'Kale, chard, potatoes, strawberries, coyote brush' },
  { id: 'bay', name: 'Bayside', reference: 'Oakland', x: [190, 420], blurb: 'Mild all year with a dry summer. Almost everything grows if you mulch and water deeply.', bets: 'Tomatoes, beans, figs, California fuchsia, sage' },
  { id: 'hills', name: 'Ridges', reference: 'Berkeley Hills', x: [420, 600], blurb: 'More rain and wind, cooler nights, shallow soils on slopes. Swales and oaks belong here.', bets: 'Oaks, toyon, currants, apples, cover crops' },
  { id: 'valley', name: 'Warm valleys', reference: 'Napa', x: [600, 800], blurb: 'Warm days, cold winter nights. Good chill for fruit trees; watch for late frost.', bets: 'Stone fruit, grapes, garlic, squash, buckwheat' },
  { id: 'inland', name: 'Hot interior', reference: 'Livermore', x: [800, 1000], blurb: 'Long hot summers with almost no rain from May to October. Shade, mulch, and drip matter most.', bets: 'Melons, peppers, olives, pomegranates, sagebrush' },
]

export function HubHome() {
  const [climate, setClimate] = useState<BayClimate | null>(null)
  const [region, setRegion] = useState<BayAreaGeometry | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  useEffect(() => {
    const controller = new AbortController()
    const get = <T,>(url: string) => fetch(url, { signal: controller.signal }).then(r => r.ok ? r.json() as Promise<T> : Promise.reject(new Error(url)))
    get<BayClimate>('/data/bay-area-climate.json').then(setClimate).catch(() => undefined)
    get<BayAreaGeometry>('/data/bay-area-map.json').then(setRegion).catch(() => undefined)
    get<{ resources: Resource[] }>('/data/resources.json').then(data => setResources(data.resources)).catch(() => undefined)
    return () => controller.abort()
  }, [])
  return <div className="hub-page">
    <main className="hub-home" id="main-content">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker">A permaculture commons for the Bay Area</p>
          <h1>Learn the land, plan a plot, <em>grow it together.</em></h1>
          <p className="home-lede">Walk the map to find real farms and gardens, test your own yard in the planner, and—if you organize a crew—run volunteers from one place.</p>
          <div className="home-hero-actions"><a className="hub-button hub-button-primary" href="/learn">Explore the map <ArrowRight size={17} /></a><a className="hub-button" href="/plan/">Plan my plot</a></div>
        </div>
        <Transect climate={climate} />
      </section>

      <section className="home-doors" aria-label="Hub sections">
        <article className="door door-explore">
          <header><span className="door-number">1</span><div><h2>Explore</h2><p>{resources.filter(r => r.coordinates).length || 'Dozens of'} real places across nine counties, plus playable lessons on soil, water, and shade.</p></div></header>
          <MiniMap region={region} resources={resources} />
          <a className="door-link" href="/learn">Open the Bay Area map <ArrowRight size={16} /></a>
        </article>
        <article className="door door-plan">
          <header><span className="door-number">2</span><div><h2>Plan</h2><p>Check your site’s climate, then lay out a bed with plants that help each other.</p></div></header>
          <MiniBed />
          <a className="door-link" href="/plan/">Open the planner <ArrowRight size={16} /></a>
        </article>
        <article className="door door-organize">
          <header><span className="door-number">3</span><div><h2>Organize</h2><p>Canopy is the guild’s volunteer desk: crews, events, partners, and messages.</p></div></header>
          <Notebook />
          <a className="door-link" href="/login?next=%2Fcanopy%2F"><KeyRound size={16} />Sign in as an organizer</a>
        </article>
      </section>

      <SeasonStrip />
    </main>
    <footer className="hub-footer"><p>Common Ground is a community prototype. Place listings are public-source checks, not steward endorsements. Climate figures come from Open-Meteo ERA5 reanalysis.</p><p><a href="/learn?view=map">Places directory</a> · <a href="/projects/index.html">Readable listings</a></p></footer>
  </div>
}

function Transect({ climate }: { climate: BayClimate | null }) {
  const [active, setActive] = useState<ZoneId>('bay')
  const zone = zones.find(z => z.id === active)!
  const reference = climate?.references.find(r => r.name === zone.reference) ?? null
  return <figure className="transect" aria-label="Bay Area cross-section from the coast to the interior">
    <svg viewBox="0 0 1000 330" role="group" aria-label="Choose a climate zone">
      <defs>
        <pattern id="t-grain" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".7" fill="#8e9b70" opacity=".35" /></pattern>
        <clipPath id="t-clip"><rect width="1000" height="330" rx="14" /></clipPath>
      </defs>
      <g clipPath="url(#t-clip)">
        <rect width="1000" height="330" fill="#eef0dd" />
        <circle className="t-sun" cx={active === 'inland' ? 900 : active === 'valley' ? 720 : 840} cy="62" r="26" fill="#f2d48a" />
        {/* ocean */}
        <path d="M0 200 Q40 194 80 200 T160 200 L190 205 L190 330 L0 330Z" fill="#acd0cf" />
        <path className="t-wave" d="M10 214 q15 -6 30 0 t30 0 M90 226 q15 -6 30 0 t30 0" fill="none" stroke="#e9f4f0" strokeWidth="2.4" strokeLinecap="round" />
        {/* coast bluff and fog */}
        <path d="M150 330 L160 196 Q175 160 205 150 Q235 146 250 170 L270 220 L270 330Z" fill="#c5d5a5" />
        <g className="t-fog" opacity={active === 'coast' ? .95 : .7}><ellipse cx="140" cy="150" rx="120" ry="26" fill="#fbfbf3" /><ellipse cx="230" cy="132" rx="90" ry="20" fill="#fbfbf3" /></g>
        {/* bay */}
        <path d="M250 232 Q330 222 420 234 L420 330 L250 330Z" fill="#9fc6c6" />
        <g fill="#d4b9a3" stroke="#b2a18a" strokeWidth="1"><rect x="292" y="206" width="14" height="22" /><rect x="310" y="198" width="10" height="30" /><rect x="372" y="210" width="16" height="20" /><rect x="392" y="202" width="9" height="28" /></g>
        {/* hills */}
        <path d="M400 330 L410 228 Q470 120 520 116 Q575 118 610 210 L620 330Z" fill="#b4c893" />
        <Oak x={480} y={150} /><Oak x={530} y={136} s={.8} /><Oak x={566} y={160} s={.9} />
        {/* valley */}
        <path d="M600 330 L606 236 Q700 226 800 236 L800 330Z" fill="#d8dcb0" />
        {[630, 660, 690, 720, 750].map(x => <path key={x} d={`M${x} 258 l0 -16 M${x - 7} 248 q7 -9 14 0`} stroke="#6f8a57" strokeWidth="2.4" fill="none" strokeLinecap="round" />)}
        {/* interior */}
        <path d="M790 330 L800 230 Q860 170 920 190 Q970 200 1000 182 L1000 330Z" fill="#e2cf98" />
        <Oak x={880} y={196} s={.7} dry /><Oak x={950} y={194} s={.6} dry />
        <rect width="1000" height="330" fill="url(#t-grain)" />
        {zones.map(z => <g key={z.id} className={`t-zone ${active === z.id ? 'active' : ''}`} role="button" tabIndex={0} aria-pressed={active === z.id} aria-label={`${z.name}: ${z.reference}`}
          onMouseEnter={() => setActive(z.id)} onFocus={() => setActive(z.id)} onClick={() => setActive(z.id)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(z.id) } }}>
          <rect x={z.x[0]} y="0" width={z.x[1] - z.x[0]} height="330" fill="transparent" />
          <line x1={z.x[1]} x2={z.x[1]} y1="276" y2="316" stroke="#9aab83" strokeDasharray="3 4" />
          <text x={(z.x[0] + z.x[1]) / 2} y="304" textAnchor="middle">{z.name}</text>
        </g>)}
      </g>
    </svg>
    <figcaption className="transect-card" aria-live="polite">
      <div><strong>{zone.name}</strong><span>Measured near {zone.reference}</span></div>
      <p>{zone.blurb}</p>
      <dl>
        <div><dt><Sun size={15} />Summer high</dt><dd>{reference ? `${Math.round(reference.summerHighC * 9 / 5 + 32)}°F` : '…'}</dd></div>
        <div><dt><Droplets size={15} />Rain a year</dt><dd>{reference ? `${(reference.annualRainMm / 25.4).toFixed(0)} in` : '…'}</dd></div>
        <div><dt><Snowflake size={15} />Frost nights</dt><dd>{reference ? reference.freezingDaysPerYear : '…'}</dd></div>
      </dl>
      {reference && <Spark reference={reference} />}
      <p className="transect-bets"><span>Good bets</span>{zone.bets}</p>
      {reference && <a className="door-link" href={`/learn?layer=summer&focus=${reference.latitude},${reference.longitude}`}>See this zone on the map <ArrowRight size={15} /></a>}
    </figcaption>
  </figure>
}

function Spark({ reference }: { reference: ClimateReference }) {
  const months = reference.months
  const maxRain = 160
  const hi = (c: number) => 62 - (c - 4) / 28 * 52
  return <svg className="transect-spark" viewBox="0 0 240 70" role="img" aria-label={`Monthly highs from ${Math.round(Math.min(...months.map(m => m.highC)))} to ${Math.round(Math.max(...months.map(m => m.highC)))} °C; rain falls mostly from November to March.`}>
    {months.map((m, i) => <rect key={m.month} x={i * 20 + 3} y={66 - Math.min(maxRain, m.precipitationMm) / maxRain * 40} width="14" height={Math.min(maxRain, m.precipitationMm) / maxRain * 40} rx="2" fill="#acd0cf" />)}
    <path d={months.map((m, i) => `${i ? 'L' : 'M'}${i * 20 + 10} ${hi(m.highC)}`).join(' ')} fill="none" stroke="#b8734c" strokeWidth="2" strokeLinejoin="round" />
    {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((l, i) => <text key={i} x={i * 20 + 10} y="70" textAnchor="middle">{l}</text>)}
  </svg>
}

function Oak({ x, y, s = 1, dry = false }: { x: number; y: number; s?: number; dry?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}><path d="M0 0 V26" stroke="#7d6a4c" strokeWidth="4" strokeLinecap="round" /><ellipse cx="0" cy="-6" rx="24" ry="17" fill={dry ? '#a9a865' : '#7d9a5f'} /><ellipse cx="-10" cy="-12" rx="12" ry="9" fill={dry ? '#b8b672' : '#8fac6c'} /></g>
}

function MiniMap({ region, resources }: { region: BayAreaGeometry | null; resources: Resource[] }) {
  const [hover, setHover] = useState<Resource | null>(null)
  const view = { west: -123.2, east: -121.5, north: 38.6, south: 36.95 }
  const w = 420, h = 300
  const project = ([lon, lat]: number[]) => [(lon - view.west) / (view.east - view.west) * w, (view.north - lat) / (view.north - view.south) * h]
  const land = useMemo(() => region ? region.land.map(shape => shape.rings.map(ring => ring.map(project).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + 'Z').join(' ')).join(' ') : '', [region])
  const pins = resources.filter(r => r.coordinates)
  return <div className="mini-map">
    <svg viewBox={`0 0 ${w} ${h}`} role="group" aria-label="Places on the Bay Area map">
      <rect width={w} height={h} fill="#acd0cf" />
      <path d={land} fill="#e7ead4" stroke="#86ad99" strokeWidth="1" fillRule="evenodd" />
      {pins.map(r => { const [x, y] = project([r.coordinates![1], r.coordinates![0]]); return <a key={r.id} href={`/learn?focus=${r.coordinates![0]},${r.coordinates![1]}`} aria-label={r.name} onMouseEnter={() => setHover(r)} onFocus={() => setHover(r)} onMouseLeave={() => setHover(null)}>
        <circle className="mini-pin" cx={x} cy={y} r={hover?.id === r.id ? 7 : 4.5} fill={hover?.id === r.id ? '#244d36' : '#668051'} stroke="#fffbee" strokeWidth="1.6" />
      </a> })}
    </svg>
    <p className="mini-map-label" aria-live="polite">{hover ? <><strong>{hover.name}</strong> · {hover.city}</> : 'Hover a dot to peek. Click to fly there.'}</p>
  </div>
}

type Crop = 'tomato' | 'basil' | 'marigold' | null
const cropOrder: Crop[] = [null, 'tomato', 'basil', 'marigold']
function MiniBed() {
  const [cells, setCells] = useState<Crop[]>(['tomato', 'basil', null, null, 'marigold', null, null, 'tomato', null, null, 'basil', null])
  const cols = 4
  const friends = cells.flatMap((crop, i) => {
    const right = i % cols < cols - 1 ? i + 1 : -1, below = i + cols < cells.length ? i + cols : -1
    return [right, below].filter(j => j >= 0 && crop && cells[j] && crop !== cells[j]).map(j => [i, j])
  })
  const cycle = (i: number) => setCells(current => current.map((c, j) => j === i ? cropOrder[(cropOrder.indexOf(c) + 1) % cropOrder.length] : c))
  const center = (i: number) => [i % cols * 62 + 31 + 8, Math.floor(i / cols) * 62 + 31 + 8]
  return <div className="mini-bed">
    <svg viewBox="0 0 264 202" role="group" aria-label="Tiny raised bed: click squares to change plants">
      <rect x="2" y="2" width="260" height="198" rx="10" fill="#b48a62" />
      <rect x="8" y="8" width="248" height="186" rx="6" fill="#7a5a3e" />
      {cells.map((crop, i) => { const x = i % cols * 62 + 8, y = Math.floor(i / cols) * 62 + 8; return <g key={i} className="bed-cell" role="button" tabIndex={0} aria-label={`Square ${i + 1}: ${crop ?? 'empty'}`} onClick={() => cycle(i)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cycle(i) } }}>
        <rect x={x + 1} y={y + 1} width="60" height="60" rx="4" fill="#8a6748" stroke="#9c7a58" />
        {crop && <g className="bed-plant" transform={`translate(${x + 31} ${y + 33})`}><Plant crop={crop} /></g>}
      </g> })}
      {friends.map(([a, b]) => { const [x1, y1] = center(a), [x2, y2] = center(b); return <line key={`${a}-${b}`} className="bed-friend" x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c2d697" strokeWidth="3" strokeDasharray="2 5" strokeLinecap="round" pointerEvents="none" /> })}
    </svg>
    <p className="mini-map-label">{friends.length ? `${friends.length} good-neighbor pair${friends.length === 1 ? '' : 's'}. Click a square to swap plants.` : 'Click squares to plant. Different neighbors help each other.'}</p>
  </div>
}

function Plant({ crop }: { crop: Exclude<Crop, null> }) {
  if (crop === 'tomato') return <g><path d="M0 14 V-6" stroke="#4f7a3f" strokeWidth="2.5" /><path d="M0 0 q-12 -4 -14 -14 M0 -4 q12 -4 13 -15" stroke="#4f7a3f" strokeWidth="2.2" fill="none" strokeLinecap="round" /><circle cx="-7" cy="5" r="6" fill="#c9553e" /><circle cx="7" cy="2" r="5" fill="#d8664a" /></g>
  if (crop === 'basil') return <g fill="#7fb35e"><ellipse cx="-7" cy="-2" rx="7" ry="11" transform="rotate(-25)" /><ellipse cx="7" cy="-2" rx="7" ry="11" transform="rotate(25)" /><ellipse cx="0" cy="-10" rx="6" ry="10" fill="#93c46f" /><path d="M0 14 V0" stroke="#4f7a3f" strokeWidth="2" /></g>
  return <g><path d="M0 14 V2" stroke="#4f7a3f" strokeWidth="2" />{[0, 60, 120, 180, 240, 300].map(a => <ellipse key={a} cx="0" cy="-7" rx="4.5" ry="7" fill="#e8a33c" transform={`rotate(${a} 0 -2)`} />)}<circle cy="-2" r="4.5" fill="#c4682d" /></g>
}

function Notebook() {
  return <div className="notebook" aria-hidden="true">
    <div className="notebook-page">
      <p className="notebook-title">Saturday crew · Fruitvale</p>
      <ul><li><span className="tick done" />Sheet mulch the north beds</li><li><span className="tick done" />Text the new volunteers</li><li><span className="tick" />Seed swap table</li></ul>
      <div className="notebook-bars">{[38, 52, 44, 61, 70, 66, 80].map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div>
      <p className="notebook-foot">Crew sign-ups, last 7 weeks</p>
    </div>
    <div className="notebook-lock"><span><KeyRound size={17} />Organizers only</span></div>
  </div>
}

function SeasonStrip() {
  const now = new Date().getMonth()
  const [month, setMonth] = useState(now)
  const [inland, setInland] = useState(false)
  const season = seasons[month]
  return <section className="season" aria-labelledby="season-title">
    <div className="season-head">
      <h2 id="season-title">What to do in <em>{season.name}</em></h2>
      <div className="season-toggle" role="group" aria-label="Where you garden"><button aria-pressed={!inland} onClick={() => setInland(false)}>Near the bay or coast</button><button aria-pressed={inland} onClick={() => setInland(true)}>Inland valleys</button></div>
    </div>
    <div className="season-months" role="tablist" aria-label="Month">
      {seasons.map((s, i) => <button key={s.name} role="tab" aria-selected={i === month} className={i === now ? 'is-now' : ''} onClick={() => setMonth(i)}>{s.name.slice(0, 3)}</button>)}
    </div>
    <ol className="season-tasks" key={`${month}-${inland}`}>
      {(inland ? season.inland : season.bay).map((task, i) => <li key={task} style={{ animationDelay: `${i * 60}ms` }}><span>{i + 1}</span>{task}</li>)}
    </ol>
    <p className="season-note">General Bay Area timing. Fog, frost, and your own microclimate shift it by weeks, so check your spot in Plan.</p>
  </section>
}

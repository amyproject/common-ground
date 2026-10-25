import { ArrowRight, Check, Droplets, ExternalLink, Leaf, Sprout, Sun, Users } from 'lucide-react'
import { guildLinks, walkSteps } from './data.ts'
import type { GuildState, WalkStep } from './types.ts'
import { useState } from 'react'

function GardenWalkArt({ active, sun, onStep }: { active: WalkStep; sun: number; onStep: (step: WalkStep) => void }) {
  const sunX = [125, 360, 585][sun]
  const shadow = [155, 60, -100][sun]
  return <svg className="garden-walk-art" viewBox="0 0 720 390" role="group" aria-label="Illustrated garden observation activity">
    <defs><pattern id="walk-grain" width="35" height="35" patternUnits="userSpaceOnUse"><circle cx="8" cy="11" r="1" fill="#98aa77" opacity=".3" /></pattern></defs>
    <rect width="720" height="390" fill="#e6edd7" /><rect width="720" height="390" fill="url(#walk-grain)" />
    <path d="M0 315 Q180 252 355 319 Q540 354 720 303 L720 390H0Z" fill="#d4dfbe" />
    <path d="M287 296L650 366" stroke="#efe1b7" strokeWidth="56" strokeLinecap="round" />
    <g aria-hidden="true"><circle cx={sunX} cy="66" r="31" fill="#e8bf69" /><path d={`M${sunX} 18v-8 M${sunX} 114v8 M${sunX - 47} 66h-8 M${sunX + 47} 66h8`} stroke="#d7a653" strokeWidth="5" strokeLinecap="round" />
      <path d={`M80 260L220 260L${220 + shadow} 322L${80 + shadow} 322Z`} fill="#526656" opacity=".17" />
      <rect x="65" y="141" width="166" height="121" rx="6" fill="#d5b69a" stroke="#927c62" strokeWidth="3" /><path d="M48 145L145 90L247 145Z" fill="#b3795d" stroke="#8a604d" strokeWidth="3" />
      <rect x="94" y="171" width="35" height="40" rx="3" fill="#bfd4ca" stroke="#8b9c8b" strokeWidth="3" /><rect x="158" y="181" width="42" height="79" rx="4" fill="#9b9b76" stroke="#778463" strokeWidth="3" />
      <path d="M545 153v142" stroke="#8c785b" strokeWidth="14" strokeLinecap="round" /><circle cx="544" cy="139" r="57" fill="#77965a" /><circle cx="508" cy="153" r="35" fill="#91aa6b" /><circle cx="583" cy="154" r="37" fill="#819c63" />
      <path d={`M534 291L564 291L${564 + shadow} 333L${534 + shadow} 333Z`} fill="#526656" opacity=".14" />
    </g>
    {(['water', 'shade', 'soil'] as const).map(step => <g key={step} className={`garden-walk-object ${active === step ? 'active' : ''}`} role="button" tabIndex={0} aria-label={step === 'water' ? 'Explore the water station' : step === 'shade' ? 'Explore light and shade' : 'Explore the growing beds'} aria-pressed={active === step} onClick={() => onStep(step)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onStep(step) } }}>
      {step === 'water' ? <><ellipse className="walk-halo" cx="282" cy="205" rx="65" ry="58" /><rect x="261" y="174" width="46" height="65" rx="8" fill="#92bdc0" stroke="#567e82" strokeWidth="3" /><path d="M266 170Q285 146 303 170M307 186h16v14" fill="none" stroke="#567e82" strokeWidth="5" strokeLinecap="round" /><path d="M323 211q-10 13 0 13t0-13" fill="#58999e" /></>
        : step === 'shade' ? <><ellipse className="walk-halo" cx="474" cy="275" rx="76" ry="43" /><path d="M427 260h99M438 260v36M515 260v36" stroke="#8a7359" strokeWidth="10" strokeLinecap="round" /><path d="M427 242h99" stroke="#a99067" strokeWidth="9" strokeLinecap="round" /></>
          : <><ellipse className="walk-halo" cx="399" cy="201" rx="71" ry="63" /><path d="M339 192L409 172L466 194L395 219Z" fill="#82674e" stroke="#b18b63" strokeWidth="6" /><path d="M339 192v18l57 27 70-24v-19l-71 25Z" fill="#c39d6f" stroke="#9b7b56" strokeWidth="3" />{[363, 392, 419].map((x, index) => <g key={x} transform={`translate(${x} ${195 - index * 5})`}><path d="M0 0v-19" stroke="#65894f" strokeWidth="3" /><path d="M0 -8q-19-22-22-7q0 12 22 9M0-14q17-24 21-10q3 10-21 13" fill="#88a85d" stroke="#6a8a4c" strokeWidth="2" /></g>)}</>}
    </g>)}
  </svg>
}

export function GuildPreparation({ state, onUpdate, onJoin }: {
  state: GuildState; onUpdate: (patch: Partial<GuildState>) => void; onJoin: () => void
}) {
  const [active, setActive] = useState<WalkStep>('water')
  const [sun, setSun] = useState(1)
  const step = walkSteps.find(item => item.id === active)!
  const choice = step.choices.find(item => item.id === state.walk[active])
  const explored = Object.keys(state.walk).length
  return <div className="guild-preparation">
    <div className="guild-section-heading"><h2>Look first. Ask a steward.</h2><span className="guild-walk-count">{explored}/3 questions explored</span></div>
    <p className="guild-section-intro">Adapted from the Guild’s Peace Center property walk.</p>
    <div className="guild-walk-layout">
      <div className="guild-walk-scene"><GardenWalkArt active={active} sun={sun} onStep={setActive} /><p>Learning illustration · tap the water, shade, or growing bed</p>
        {active === 'shade' && <div className="guild-sun-controls" role="group" aria-label="Move the illustrated sun">{['Morning', 'Midday', 'Afternoon'].map((label, index) => <button key={label} aria-pressed={sun === index} onClick={() => setSun(index)}><Sun size={19} />{label}</button>)}</div>}
      </div>
      <section className="guild-walk-question" aria-label="Garden observation question">
        <div className="guild-walk-tabs" role="group" aria-label="Garden observations">{walkSteps.map((item, index) => <button key={item.id} aria-pressed={active === item.id} onClick={() => setActive(item.id)}>{state.walk[item.id] ? <Check size={18} /> : index + 1}{item.id === 'water' ? 'Water' : item.id === 'shade' ? 'Shade' : 'Soil'}</button>)}</div>
        <h3>{step.title}</h3><p>{step.question}</p>
        <div className="guild-walk-choices">{step.choices.map(item => <button key={item.id} aria-pressed={choice?.id === item.id} onClick={() => onUpdate({ walk: { ...state.walk, [active]: item.id } })}>{item.text}<ArrowRight size={20} /></button>)}</div>
        {choice && <div className="guild-walk-feedback" role="status"><Leaf size={23} /><p>{choice.feedback}</p></div>}
        {choice && active !== 'soil' && <button className="text-button" onClick={() => setActive(active === 'water' ? 'shade' : 'soil')}>Next observation <ArrowRight size={19} /></button>}
        {explored === 3 && <p className="guild-walk-complete"><Check size={20} />Three questions to bring to a steward.</p>}
      </section>
    </div>
    <section className="guild-arrival-guide"><div className="guild-section-heading"><h2>{state.visitor === 'new' ? 'A friendly first visit.' : 'Welcome back.'}</h2><div className="guild-visitor-choice" role="group" aria-label="Volunteer preparation"><button aria-pressed={state.visitor === 'new'} onClick={() => onUpdate({ visitor: 'new' })}>First visit</button><button aria-pressed={state.visitor === 'returning'} onClick={() => onUpdate({ visitor: 'returning' })}>Returning</button></div></div>
      <div className="guild-arrival-steps">
        <article><span><Users size={25} /></span><h3>Before</h3><p>{state.visitor === 'new' ? 'Read the host’s RSVP, arrival, and what-to-bring details.' : 'Check the new date, tasks, and arrival details with the host.'}</p></article>
        <article><span><Sprout size={25} /></span><h3>On the day</h3><p>{state.visitor === 'new' ? 'Meet the welcome crew. Find a lead and a task that fits you.' : 'Find the lead, share what you know, and agree today’s task.'}</p></article>
        <article><span><Droplets size={25} /></span><h3>After</h3><p>Share a discovery. Ask about ongoing care and the next gathering.</p></article>
      </div><div className="guild-detail-actions"><button className="button button-primary" onClick={onJoin}>Find a Guild activity <ArrowRight size={20} /></button><a className="text-button" href={guildLinks.volunteer} target="_blank" rel="noreferrer">Ongoing volunteer opportunities <ExternalLink size={18} /></a></div>
    </section>
    <details className="guild-source-notes"><summary>Learning sources & review</summary><p>The observation prompts are adapted from the Guild’s public property walk. The welcoming sequence draws on its workday agendas.</p><div className="guild-source-links"><a href={guildLinks.walk} target="_blank" rel="noreferrer">Original property walk <ExternalLink size={17} /></a><a href={guildLinks.sop} target="_blank" rel="noreferrer">Workday SOP & agendas <ExternalLink size={17} /></a></div><p>The illustration does not map actual taps, beds, or soil conditions. A knowledgeable review of these adapted prompts is pending. Exploring questions is optional and does not certify skills or register you for an event.</p></details>
  </div>
}

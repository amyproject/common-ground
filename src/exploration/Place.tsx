import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CloudRain, Download, ExternalLink, Info, Leaf, MapPin, Sprout, Sun, Trees } from 'lucide-react'
import { CompostLabArt, ParkLabArt, PlaceArrivalArt, ShadeLabArt, SoilLabArt } from './Art.tsx'
import { hotspots, placeById } from './content.ts'
import { compareFarm, defaultFarm, farmChoiceError, farmCosts, parkChoiceError, parkCosts, simulateFarm, simulatePark } from './model.ts'
import { Notebook } from './Journal.tsx'
import { Indicators, LessonFrame, LessonHeading, Reasoning, SaveDiscovery, TokenBudget } from './LessonUI.tsx'
import type { LessonProps, SaveEntry, Update } from './LessonUI.tsx'
import { GravityArrivalArt } from './GardenArt.tsx'
import { HabitatLesson, SharingLesson } from './Gravity.tsx'
import { formatSourceDate } from '../lib/dates.ts'
import type { ExplorationState, FarmChoice, FarmRun, FarmTime, HotspotId, ParkChoice, PlaceId, Weather } from './types.ts'
import { GuildBridge } from '../guild/GuildBridge.tsx'

function CompostLesson({ state, onComplete, onNext }: LessonProps) {
  const [stage, setStage] = useState(0)
  const [answer, setAnswer] = useState('')
  const complete = answer === 'soil'
  return <LessonFrame art={<CompostLabArt stage={stage} />}>
    <LessonHeading id="compost" completed={Boolean(state.entries.compost)} />
    <div className="compost-story"><span className="stage-number">0{stage + 1} / 03</span><h3>{['Food scraps.', 'Tiny helpers.', 'Finished compost.'][stage]}</h3><p>{[
      'Oakland collects food scraps and plant debris in compost carts.',
      'Decomposers turn organic material into finished compost over time.',
      'Pick up finished compost at Farm Park. Check ANV’s instructions.',
    ][stage]}</p></div>
    <div className="compost-stage-buttons" role="group" aria-label="Explore the compost journey">{['Scraps', 'Breakdown', 'Compost'].map((label, i) => <button key={label} className={stage === i ? 'active' : ''} onClick={() => { setStage(i); setAnswer('') }} aria-pressed={stage === i}>{i + 1}. {label}</button>)}</div>
    {stage < 2 ? <button className="button button-primary" onClick={() => setStage(stage + 1)}>{stage === 0 ? 'Next' : 'Next'} <ArrowRight size={16} /></button>
      : <div className="understanding-check"><strong>What comes back to the community?</strong><button className={answer === 'soil' ? 'correct' : ''} onClick={() => setAnswer('soil')}>Compost to help soil <Check size={14} /></button><button className={answer === 'instant' ? 'incorrect' : ''} onClick={() => setAnswer('instant')}>Instant growth without care</button>{answer && <p role="status">{complete ? 'Yes! Compost helps soil; plants still need water and care.' : 'Compost helps soil. It doesn’t replace water and care.'}</p>}</div>}
    {stage === 2 && <SaveDiscovery id="compost" state={state} ready={complete} onSave={() => onComplete('compost', 'Oakland’s curbside organic material can become finished compost. Farm Park offers a real pickup resource.', 'Compost can help care for soil, but growing still needs water, time, and upkeep.')} />}
    <details className="lesson-details"><summary>About the real compost hub</summary><p>Farm Park is a compost pickup hub. Check ANV before visiting; don’t assume scraps can be dropped off there.</p></details>
    {state.entries.compost && <button className="text-button" onClick={() => onNext('soil')}>Explore soil <ArrowRight size={14} /></button>}
  </LessonFrame>
}

function FarmLesson({ id, state, onUpdate, onComplete, onNext }: LessonProps & { id: 'soil' | 'water' }) {
  const [weather, setWeather] = useState<Weather>(id === 'soil' ? 'rain' : 'dry')
  const [time, setTime] = useState<FarmTime>(id === 'soil' ? 'now' : 'season')
  const [run, setRun] = useState<FarmRun | null>(null)
  const [serial, setSerial] = useState(0)
  const [error, setError] = useState('')
  const [answer, setAnswer] = useState('')
  const [reason, setReason] = useState(state.entries[id]?.reasoning ?? '')
  const [comparing, setComparing] = useState(false)
  const choice: FarmChoice = id === 'soil' ? { ...state.farm, watering: 'pour' } : state.farm
  const result = run ? simulateFarm(run.choice, run.weather, run.time) : null
  const baseline = run ? simulateFarm({ ...defaultFarm, water: run.choice.water }, run.weather, run.time) : null
  const costs = farmCosts(choice)
  const comparison = state.savedFarm && run ? compareFarm(state.savedFarm, run) : null
  const commit = (patch: Partial<FarmChoice>) => {
    const next = { ...choice, ...patch }
    const invalid = farmChoiceError(next)
    if (invalid) { setError(invalid); return }
    onUpdate({ farm: next }); setRun(null); setError(''); setAnswer(''); setComparing(false)
  }
  const ready = id === 'soil' ? Boolean(run && run.weather === 'rain' && result!.infiltration !== baseline!.infiltration && answer === 'movement')
    : Boolean(run && run.weather === 'dry' && comparison?.different && comparing && reason.trim().length >= 12)
  return <LessonFrame art={<SoilLabArt choice={choice} result={result} baseline={baseline} weather={weather} serial={serial} />} className="farm-lesson">
    <LessonHeading id={id} completed={Boolean(state.entries[id])} />
    {id === 'soil' && <p className="lesson-intro">Healthy soil supports plants and holds water. Try cover or compost.</p>}
    <TokenBudget {...costs} water={id === 'soil' ? undefined : costs.water} />
    <fieldset className="lesson-controls"><legend>What covers the soil?</legend><div className="choice-segments">{([['bare', 'Bare soil'], ['mulch', 'Mulch'], ['living', 'Living cover']] as const).map(([value, label]) => <button key={value} className={choice.cover === value ? 'active' : ''} aria-pressed={choice.cover === value} onClick={() => commit({ cover: value })}>{label}</button>)}</div><label className="check-control"><input type="checkbox" checked={choice.compost} onChange={event => commit({ compost: event.target.checked })} /><span>Add finished compost<small>1 credit · 1 care</small></span></label></fieldset>
    {id === 'water' && <fieldset className="lesson-controls"><legend>How will you water?</legend><div className="choice-segments">{(['pour', 'drip'] as const).map(value => <button key={value} className={choice.watering === value ? 'active' : ''} aria-pressed={choice.watering === value} onClick={() => commit({ watering: value })}>{value === 'pour' ? 'Water by hand' : 'Drip delivery'}</button>)}</div><label className="range-control"><span>Water allocation <strong>{choice.water} of 6 tokens</strong></span><input aria-label="Water allocation" type="range" min="0" max="6" step="1" value={choice.water} onChange={event => commit({ water: Number(event.target.value) })} /></label></fieldset>}
    <fieldset className="lesson-controls"><legend>Conditions</legend><div className="choice-segments weather-segments"><button className={weather === 'rain' ? 'active' : ''} aria-pressed={weather === 'rain'} onClick={() => { setWeather('rain'); setRun(null); setAnswer(''); setComparing(false) }}><CloudRain size={15} />Rain</button><button className={weather === 'dry' ? 'active' : ''} aria-pressed={weather === 'dry'} onClick={() => { setWeather('dry'); setRun(null); setAnswer(''); setComparing(false) }}><Sun size={15} />Dry period</button></div><div className="choice-segments time-segments"><button className={time === 'now' ? 'active' : ''} aria-pressed={time === 'now'} onClick={() => { setTime('now'); setRun(null); setComparing(false) }}>This season</button><button className={time === 'season' ? 'active' : ''} aria-pressed={time === 'season'} onClick={() => { setTime('season'); setRun(null); setComparing(false) }}>Later season</button></div></fieldset>
    {error && <p className="lesson-error" role="alert">{error}</p>}
    <button className="button button-primary experiment-run" onClick={() => { setRun({ choice: { ...choice }, weather, time }); setSerial(serial + 1); setAnswer(''); setComparing(false) }}>{weather === 'rain' ? <CloudRain size={16} /> : <Sun size={16} />}{weather === 'rain' ? 'Make it rain' : 'Try dry weather'} <ArrowRight size={15} /></button>
    {result && <div className="experiment-feedback" aria-live="polite">
      <Indicators items={weather === 'rain' ? [{ name: 'Soaks in', value: result.infiltration }, { name: 'Runoff', value: result.runoff, color: '#a3bbc2' }] : [{ name: 'Soil moisture', value: result.moisture, color: '#7fa9b3' }, { name: 'Plant health', value: result.vitality }]} />
      <p className="causal-note">{weather === 'rain' ? choice.cover === 'bare' && !choice.compost ? 'Same beds so far. Add cover or compost, then try again.' : 'Cover and compost help this bed absorb more of the same rain.' : result.moisture < 35 ? 'Still dry. Try cover or a different watering method.' : 'Compare the water saved with the credits and care used.'}</p>
      <div className="experiment-actions"><button className="button button-secondary button-small" onClick={() => { onUpdate({ savedFarm: { ...run!, choice: { ...run!.choice } } }); setComparing(false) }}>Save A</button><button className="text-button" disabled={!state.savedFarm} onClick={() => setComparing(true)}>Compare A & B <ArrowRight size={13} /></button></div>
    </div>}
    {!result && <p className="lesson-hint">{id === 'soil' ? 'Add cover. Make it rain. Compare the beds.' : 'Try it → save A → change one thing → compare.'}</p>}
    {comparing && comparison && <div className="mini-comparison" aria-live="polite"><h3>A & B</h3><p>Both approaches rerun in the {weather === 'dry' ? 'dry period' : 'rain event'}, {time === 'now' ? 'this season' : 'a later season'}.</p><table><caption>Game indicators</caption><thead><tr><th>Result</th><th>A</th><th>B</th></tr></thead><tbody><tr><th>Water tokens</th><td>{comparison.a.costs.water}</td><td>{comparison.b.costs.water}</td></tr><tr><th>Moisture</th><td>{comparison.a.moisture}</td><td>{comparison.b.moisture}</td></tr><tr><th>Soil condition</th><td>{comparison.a.soil}</td><td>{comparison.b.soil}</td></tr><tr><th>Credits / care</th><td>{comparison.a.costs.credits} / {comparison.a.costs.care}</td><td>{comparison.b.costs.credits} / {comparison.b.costs.care}</td></tr></tbody></table>{!comparison.different && <p className="lesson-hint">Same setup. Change a choice and rerun B.</p>}</div>}
    {id === 'soil' && result && weather === 'rain' && <div className="understanding-check"><strong>Why do the beds differ?</strong><button className={answer === 'movement' ? 'correct' : ''} onClick={() => setAnswer('movement')}>Cover and compost change water movement</button><button className={answer === 'rain' ? 'incorrect' : ''} onClick={() => setAnswer('rain')}>Cover creates more rain</button>{answer && <p role="status">{answer === 'movement' ? 'Yes! Same rain, different soil.' : 'Same rain. Look at the soil.'}</p>}</div>}
    {id === 'water' && comparing && comparison?.different && <Reasoning value={reason} onChange={setReason} label="What improved? What was the cost?" />}
    <SaveDiscovery id={id} state={state} ready={ready} onSave={() => {
      if (id === 'soil') onComplete('soil', `In the same rain experiment, ${result!.infiltration} of 100 game drops soaked into my bed, compared with ${baseline!.infiltration} in the uncovered reference.`, 'I changed soil cover or organic matter, not the rain. Real infiltration also depends on soil, slope, rainfall, and maintenance.')
      else onComplete('water', `Under the same ${time === 'season' ? 'later-season ' : ''}dry period, A used ${comparison!.a.costs.water} water tokens and B used ${comparison!.b.costs.water}. Moisture indicators were ${comparison!.a.moisture} and ${comparison!.b.moisture}.`, reason.trim())
    }} />
    {state.entries[id] && <button className="text-button" onClick={() => onNext(id === 'soil' ? 'water' : null)}>{id === 'soil' ? 'Explore water' : 'Look around'} <ArrowRight size={14} /></button>}
  </LessonFrame>
}

function ParkLesson({ id, state, onUpdate, onComplete, onNext }: LessonProps & { id: 'trees' | 'community' }) {
  const [year, setYear] = useState<0 | 5>(0)
  const [reason, setReason] = useState(state.entries[id]?.reasoning ?? '')
  const [error, setError] = useState('')
  const [comparing, setComparing] = useState(false)
  const choice = state.park
  const result = simulatePark(choice, year)
  const previous = state.savedPark ? simulatePark(state.savedPark, year) : null
  const changed = state.savedPark && JSON.stringify(state.savedPark) !== JSON.stringify(choice)
  const commit = (patch: Partial<ParkChoice>) => {
    const next = { ...choice, ...patch }
    const invalid = parkChoiceError(next)
    if (invalid) { setError(invalid); return }
    onUpdate({ park: next }); setError(''); setComparing(false)
  }
  const ready = reason.trim().length >= 12 && (id === 'trees' ? year === 5 : Boolean(previous && changed && comparing))
  return <LessonFrame art={<ParkLabArt choice={choice} result={result} year={year} />}>
    <LessonHeading id={id} completed={Boolean(state.entries[id])} />
    <p className="lesson-intro">{id === 'trees' ? 'Choose shade. See what five years of care can do.' : 'Try two gathering spaces within the same budget.'}</p>
    <TokenBudget credits={parkCosts(choice)} care={choice.care} park />
    <fieldset className="lesson-controls"><legend>Choose an approach</legend><div className="stacked-choices">{([
      ['existing', 'Use established shade', '2 credits · shade now'],
      ['tree', 'Plant a young tree', '4 credits · needs care to grow'],
      ['canopy', 'Add a built shade canopy', '6 credits · little habitat'],
    ] as const).map(([value, title, caption]) => <button className={choice.strategy === value ? 'active' : ''} key={value} aria-pressed={choice.strategy === value} onClick={() => commit({ strategy: value })}><span className="choice-radio" /><span><strong>{title}</strong><small>{caption}</small></span></button>)}</div></fieldset>
    <label className="check-control"><input type="checkbox" checked={choice.seating} onChange={event => commit({ seating: event.target.checked })} /><span>Add accessible seating<small>2 credits</small></span></label>
    <label className="range-control"><span>Ongoing care <strong>{choice.care} of 2 tokens</strong></span><input type="range" aria-label="Tree and space care" min="0" max="2" step="1" value={choice.care} onChange={event => commit({ care: Number(event.target.value) })} /></label>
    {error && <p className="lesson-error" role="alert">{error}</p>}
    <div className="choice-segments park-timeline" role="group" aria-label="Tree experiment time"><button className={year === 0 ? 'active' : ''} aria-pressed={year === 0} onClick={() => setYear(0)}><Sun size={15} />Today</button><button className={year === 5 ? 'active' : ''} aria-pressed={year === 5} onClick={() => setYear(5)}><Trees size={15} />Year 5</button></div>
    <Indicators items={[{ name: 'Shade', value: result.shade }, { name: 'Habitat', value: result.habitat }, { name: 'Gathering', value: result.gathering, color: '#c4a375' }]} />
    <p className="causal-note" aria-live="polite">{choice.strategy === 'tree' ? year === 0 ? 'A young tree needs time and care to grow shade.' : choice.care < 2 ? 'Less care means less future shade here.' : 'Time and care help shade grow.' : choice.strategy === 'existing' ? 'Established trees offer shade and habitat now.' : 'A canopy gives shade now, with little living habitat.'}</p>
    <details className="lesson-details"><summary>Why?</summary><p>{result.note}</p></details>
    {id === 'community' && <><div className="experiment-actions"><button className="button button-secondary button-small" onClick={() => { onUpdate({ savedPark: { ...choice } }); setComparing(false) }}>Save A</button><button className="text-button" disabled={!previous} onClick={() => setComparing(true)}>Compare A & B <ArrowRight size={13} /></button></div>{comparing && previous && <div className="mini-comparison"><h3>Both at {year === 0 ? 'today’s checkpoint' : 'year five'}.</h3><table><caption>Authored indicators, same time</caption><thead><tr><th>Result</th><th>A</th><th>B</th></tr></thead><tbody><tr><th>Shade</th><td>{previous.shade}</td><td>{result.shade}</td></tr><tr><th>Habitat</th><td>{previous.habitat}</td><td>{result.habitat}</td></tr><tr><th>Gathering</th><td>{previous.gathering}</td><td>{result.gathering}</td></tr><tr><th>Credits / care</th><td>{previous.credits} / {previous.care}</td><td>{result.credits} / {result.care}</td></tr></tbody></table>{!changed && <p className="lesson-hint">Change a choice to compare.</p>}</div>}</>}
    <Reasoning value={reason} onChange={setReason} label={id === 'trees' ? 'How did time and care help?' : 'Who benefits? What’s the tradeoff?'} />
    <SaveDiscovery id={id} state={state} ready={ready} onSave={() => onComplete(id, id === 'trees' ? `I explored ${choice.strategy === 'tree' ? 'a young tree' : choice.strategy === 'existing' ? 'established canopy' : 'a built canopy'} at year five, with ${choice.care} care tokens. Shade was ${result.shade}/100 in the learning model.` : `I compared two hypothetical gathering ideas at year ${year}. A used ${previous!.credits} credits; B used ${result.credits}, with gathering indicators of ${previous!.gathering} and ${result.gathering}.`, reason.trim())} />
    {state.entries[id] && <button className="text-button" onClick={() => onNext(id === 'trees' ? 'shade' : null)}>{id === 'trees' ? 'Explore shade' : 'Look around'} <ArrowRight size={14} /></button>}
  </LessonFrame>
}

function ShadeLesson({ state, onComplete, onNext }: LessonProps) {
  const [sun, setSun] = useState(35)
  const [bench, setBench] = useState(1)
  const [moved, setMoved] = useState(false)
  const [answer, setAnswer] = useState('')
  const shadeX = 510 + (sun - 50) * 2.2
  const shaded = Math.abs([350, 520, 690][bench] - shadeX) < 177 - Math.abs(sun - 50) * .45
  return <LessonFrame art={<ShadeLabArt sun={sun} bench={bench} onBench={setBench} />}>
    <LessonHeading id="shade" completed={Boolean(state.entries.shade)} />
    <p className="lesson-intro">Pick a bench. Move the sun.</p>
    <label className="range-control sun-range"><span>Move the sun <Sun size={17} /></span><input type="range" aria-label="Sun position" min="0" max="100" value={sun} onChange={event => { setSun(Number(event.target.value)); setMoved(true); setAnswer('') }} /><span className="range-endpoints"><small>Earlier</small><small>Later</small></span></label>
    <div className="choice-segments" role="group" aria-label="Choose a bench">{[0, 1, 2].map(value => <button key={value} className={bench === value ? 'active' : ''} aria-pressed={bench === value} onClick={() => setBench(value)}>Bench {value + 1}</button>)}</div>
    <div className="shade-status" aria-live="polite">{shaded ? <Leaf size={26} /> : <Sun size={26} />}<div><strong>{shaded ? 'In the shade.' : 'In the sun.'}</strong><p>{shaded ? 'The shadow covers your bench.' : 'Try another bench or time.'}</p></div></div>
    {moved ? <div className="understanding-check"><strong>What changes the shade?</strong><button className={answer === 'position' ? 'correct' : ''} onClick={() => setAnswer('position')}>The canopy, sun, and where we sit</button><button className={answer === 'anywhere' ? 'incorrect' : ''} onClick={() => setAnswer('anywhere')}>Every nearby bench is always shaded</button>{answer && <p role="status">{answer === 'position' ? 'Yes! Shade moves as the sun changes.' : 'The shadow moves. Try another bench.'}</p>}</div> : <p className="lesson-hint">Move the sun to continue.</p>}
    <SaveDiscovery id="shade" state={state} ready={moved && answer === 'position'} onSave={() => onComplete('shade', `I moved the sun and tested bench ${bench + 1}. It was ${shaded ? 'in shade' : 'in sunshine'} at my chosen position in the illustration.`, 'A tree’s shade moves. The canopy, the place we sit, and the time all matter; being near a tree does not guarantee shade all day.')} />
    {state.entries.shade && <button className="text-button" onClick={() => onNext('community')}>Explore shared space <ArrowRight size={14} /></button>}
  </LessonFrame>
}

function LibraryJournalLesson({ state, onComplete, onNext }: LessonProps) {
  const [reason, setReason] = useState(state.entries.journal?.reasoning ?? '')
  const discoveries = Object.keys(state.entries).filter(id => id !== 'journal' && id !== 'idea').length
  return <LessonFrame art={<Notebook state={state} />} className="notebook-lesson">
    <LessonHeading id="journal" completed={Boolean(state.entries.journal)} />
    <p className="lesson-intro">Look back at your discoveries.</p>
    <div className="journal-review-list">{(['farm', 'park', 'gravity'] as PlaceId[]).map(id => <div key={id}><span>{id === 'farm' ? <Sprout size={18} /> : <Trees size={18} />}</span><div><strong>{placeById[id].shortName}</strong><small>{placeById[id].hotspots.filter(h => state.entries[h]).length} discoveries collected</small></div></div>)}</div>
    {discoveries >= 2 ? <Reasoning value={reason} onChange={setReason} label="What surprised you?" /> : <p className="lesson-hint">Find two outdoor discoveries first.</p>}
    <SaveDiscovery id="journal" state={state} ready={discoveries >= 2 && reason.trim().length >= 12} onSave={() => onComplete('journal', `I brought ${discoveries} outdoor discoveries to the library’s fictional field-journal desk.`, reason.trim())} />
    {state.entries.journal && <button className="button button-secondary" onClick={() => onNext('idea')}>Make an idea <ArrowRight size={15} /></button>}
    <p className="lesson-hint">A fictional learning desk.</p>
  </LessonFrame>
}

function IdeaLesson({ state, onUpdate, onComplete, onDownload }: LessonProps & { onDownload: () => void }) {
  const idea = state.idea
  const learned = Boolean((state.entries.soil || state.entries.water || state.entries.habitat) && (state.entries.trees || state.entries.community || state.entries.sharing))
  const valid = learned && [idea.proposal, idea.tradeoff, idea.question].every(text => text.trim().length >= 12)
  const updateIdea = (patch: Partial<ExplorationState['idea']>) => onUpdate({ idea: { ...idea, ...patch } })
  return <LessonFrame art={<div className="ideas-illustration"><div className="idea-paper"><span className="eyebrow"><Leaf size={15} />My neighborhood idea</span><h2>What if we<br /><em>{idea.choice === 'care' ? 'cared for what’s here?' : 'grew something new?'}</em></h2><div className="idea-sketch"><svg viewBox="0 0 960 560" aria-hidden="true"><ParkLabArt choice={{ strategy: idea.choice === 'care' ? 'existing' : 'tree', care: 2, seating: true }} result={simulatePark({ strategy: idea.choice === 'care' ? 'existing' : 'tree', care: 2, seating: true }, 5)} year={5} /></svg></div><span className="idea-priority">A little more {idea.priority === 'community' ? 'room for people' : idea.priority === 'soil' ? 'care for living soil' : idea.priority === 'water' ? 'water resilience' : 'shade'}.</span><p>{idea.proposal || 'Start with what you learned.'}</p><div className="idea-paper-foot"><Sprout size={16} />A conversation starter.</div></div></div>} className="ideas-lesson">
    <LessonHeading id="idea" completed={Boolean(state.entries.idea)} />
    {!learned && <div className="lesson-hint">First: learn about soil, water, or plants, plus trees, shared space, or the pantry.</div>}
    <label className="lesson-select">What matters most?<select value={idea.priority} onChange={event => updateIdea({ priority: event.target.value as typeof idea.priority })}><option value="water">Water resilience</option><option value="soil">Healthy soil</option><option value="shade">Shade and vegetation</option><option value="community">Community use and access</option></select></label>
    <fieldset className="lesson-controls"><legend>Start with…</legend><div className="stacked-choices">{([['care', 'Care for what’s here', 'Existing soil, trees, and people.'], ['new', 'Grow something new', 'Needs resources and ongoing care.']] as const).map(([value, title, caption]) => <button key={value} className={idea.choice === value ? 'active' : ''} aria-pressed={idea.choice === value} onClick={() => updateIdea({ choice: value })}><span className="choice-radio" /><span><strong>{title}</strong><small>{caption}</small></span></button>)}</div></fieldset>
    <label className="lesson-reflection">Your idea + what you learned<textarea rows={3} maxLength={1200} value={idea.proposal} onChange={event => updateIdea({ proposal: event.target.value })} placeholder="I would explore… My experiment showed…" /></label>
    <label className="lesson-reflection">Who benefits? What does it need?<textarea rows={2} maxLength={600} value={idea.tradeoff} onChange={event => updateIdea({ tradeoff: event.target.value })} placeholder="This could help… It would need water, effort, or…" /></label>
    <label className="lesson-reflection">What would you ask first?<textarea rows={2} maxLength={600} value={idea.question} onChange={event => updateIdea({ question: event.target.value })} placeholder="I’d ask the steward or neighbors…" /><small>One sentence in each field.</small></label>
    <button className="button button-primary" disabled={!valid} onClick={() => onComplete('idea', idea.proposal.trim(), `${idea.tradeoff.trim()} Before acting: ${idea.question.trim()}`)}><BookOpen size={15} />{state.entries.idea ? 'Update idea' : 'Save idea'} <ArrowRight size={14} /></button>
    {state.entries.idea && <button className="button button-secondary" onClick={onDownload}><Download size={15} />Download journal</button>}
    <a className="text-button" href="https://www.oaklandca.gov/Government/Boards-Commissions/Planning-Commission" target="_blank" rel="noreferrer">Oakland planning <ExternalLink size={13} /></a>
    <p className="lesson-hint">Before acting: ask the steward and neighbors.</p>
  </LessonFrame>
}

export function PlaceView({ placeId, active, state, onHotspot, onBack, onUpdate, onComplete, onAbout, onDownload, onGuild }: { placeId: PlaceId; active: HotspotId | null; state: ExplorationState; onHotspot: (id: HotspotId | null) => void; onBack: () => void; onUpdate: Update; onComplete: SaveEntry; onAbout: () => void; onDownload: () => void; onGuild: () => void }) {
  const place = placeById[placeId]
  const lessonProps: LessonProps = { state, onUpdate, onComplete, onNext: onHotspot }
  return <div className="place-view">
    <div className="place-breadcrumb"><button onClick={onBack}><ArrowLeft size={18} />East Bay</button><ChevronRight size={15} /><button onClick={() => onHotspot(null)}>{place.shortName}</button>{active && <><ChevronRight size={15} /><span>{hotspots[active].name}</span></>}</div>
    <section className="place-header"><div><span className="eyebrow"><MapPin size={16} />{place.address} · {place.neighborhood}</span><h1 tabIndex={-1}>{place.name}<span className="place-visit-stamp">{place.hotspots.filter(id => state.entries[id]).length}/{place.hotspots.length}</span></h1>{!active && <p>{place.intro}</p>}</div><button className="about-place-button" onClick={onAbout}><Info size={20} />About <ArrowRight size={17} /></button></section>
    <div className="place-discoveries" role="group" aria-label={`Discoveries at ${place.name}`}><button className={!active ? 'active' : ''} onClick={() => onHotspot(null)} aria-pressed={!active}><MapPin size={14} />Look around</button>{place.hotspots.map(id => <button key={id} className={active === id ? 'active' : ''} onClick={() => onHotspot(id)} aria-pressed={active === id}>{state.entries[id] ? <Check size={14} /> : <span className="discovery-dot" />}{hotspots[id].name}</button>)}</div>
    {!active ? <LessonFrame art={placeId === 'gravity' ? <GravityArrivalArt onSelect={onHotspot} completed={state.entries} /> : <PlaceArrivalArt place={placeId} onSelect={onHotspot} completed={state.entries} />}>
      <div className="arrival-guide"><h2>Look around.</h2><p>Tap something to explore.</p></div>
      <div className="arrival-activities">{place.hotspots.map((id, i) => <button key={id} onClick={() => onHotspot(id)}><span>{state.entries[id] ? <Check size={20} /> : i + 1}</span><span><strong>{hotspots[id].name}</strong></span><ArrowRight size={19} /></button>)}</div>
      <details className="lesson-details"><summary>About this place</summary><p>{place.fact}</p><button className="text-button" onClick={onAbout}>Sources & visiting <ArrowRight size={17} /></button></details>
    </LessonFrame> : active === 'compost' ? <CompostLesson {...lessonProps} /> : active === 'soil' || active === 'water' ? <FarmLesson key={active} {...lessonProps} id={active} /> : active === 'trees' || active === 'community' ? <ParkLesson key={active} {...lessonProps} id={active} /> : active === 'shade' ? <ShadeLesson {...lessonProps} /> : active === 'habitat' ? <HabitatLesson {...lessonProps} /> : active === 'sharing' ? <SharingLesson {...lessonProps} /> : active === 'journal' ? <LibraryJournalLesson {...lessonProps} /> : <IdeaLesson {...lessonProps} onDownload={onDownload} />}
    <GuildBridge compact onGuild={onGuild} />
    <div className="place-footer"><button className="text-button" onClick={onBack}><ArrowLeft size={18} />East Bay map</button><a href={place.actionUrl} target="_blank" rel="noreferrer">Visit the real place <ExternalLink size={16} /></a><span>Checked {formatSourceDate(place.checkedAt)}</span></div>
  </div>
}

import { useState } from 'react'
import { ArrowRight, BookOpen, Check, Download, ExternalLink, FileCheck2, Info, MapPin } from 'lucide-react'
import { evidence, outcomes, practices, practiceById } from '../data/practices.ts'
import { scenario } from '../data/scenario.ts'
import { makeSuggestion } from '../lib/directory.ts'
import { formatSourceDate } from '../lib/dates.ts'
import { costsOf, selectedPractices, simulate } from '../lib/game.ts'
import { createProposal, downloadText } from '../lib/proposal.ts'
import { BlockScene } from './BlockScene.tsx'
import { Timeline } from './Game.tsx'
import { PracticeIcon } from './PracticeIcon.tsx'
import type { Checkpoint, Layout, Resource, SavedDesign, Suggestion } from '../types.ts'

export function ResourceDetail({ resource, onCorrect, onGuild }: { resource: Resource; onCorrect: () => void; onGuild?: () => void }) {
  return <>
    <div className="dialog-eyebrow"><MapPin size={14} />{resource.city} · {resource.category}</div>
    <h2 className="dialog-title">{resource.name}</h2><p className="dialog-lead">{resource.description}</p>
    <div className="detail-tags">{resource.practices.map((id) => <span className="filter-chip" key={id}><PracticeIcon id={id} size={14} />{practiceById[id].shortName}</span>)}</div>
    <section className="detail-access"><h3>How to take part</h3><p>{resource.access}</p>{resource.address ? <p className="detail-address"><MapPin size={16} /><span>{resource.address}<small>Approximate public location. Confirm directions and access with the provider.</small></span></p> : <p className="detail-address"><Info size={16} /><span>{resource.city === 'Online' ? 'Online resource · no map pin' : 'Arranged visits · precise location kept off the map'}</span></p>}</section>
    <div className="source-box"><FileCheck2 size={19} /><div><strong>Public source checked · {formatSourceDate(resource.checkedAt)}</strong><p>Checked against {resource.sourcePublisher}’s website. Not confirmed by a project steward.</p><a href={resource.sourceUrl} target="_blank" rel="noreferrer">Read the original source <ExternalLink size={12} /></a></div></div>
    {resource.status === 'demo-reviewed' && <div className="source-box demo-source"><Check size={18} /><div><strong>Access information reviewed in this demo</strong><p>This browser has a local review by {resource.reviewer?.toLowerCase()}. The original source-check date stays separate.</p>{resource.reviewSourceUrl && <a href={resource.reviewSourceUrl} target="_blank" rel="noreferrer">Review source <ExternalLink size={12} /></a>}</div></div>}
    {resource.status === 'inactive' && <div className="form-error" role="status">Marked inactive in this demo. This listing is hidden from discovery.</div>}
    <div className="dialog-actions">{onGuild && <button className="button button-primary" onClick={onGuild}>Find a Guild activity <ArrowRight size={17} /></button>}<a className={`button ${onGuild ? 'button-secondary' : 'button-primary'}`} href={resource.url} target="_blank" rel="noreferrer">{resource.action} <ExternalLink size={15} /></a><button className="button button-secondary" onClick={onCorrect}>Suggest a correction</button></div>
    <p className="dialog-footnote">Practice tags describe related learning or participation. They do not certify this site’s environmental performance.</p>
    <a className="text-button muted" href={`/projects/${resource.id}/index.html`} target="_blank" rel="noreferrer">Open the readable resource page <ArrowRight size={14} /></a>
  </>
}

export function CorrectionForm({ resource, onSubmit, onReview, onBack }: { resource: Resource; onSubmit: (suggestion: Suggestion) => void; onReview: () => void; onBack: () => void }) {
  const [field, setField] = useState<'access' | 'status'>('access')
  const [after, setAfter] = useState(resource.access)
  const [sourceUrl, setSourceUrl] = useState(resource.sourceUrl)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  if (submitted) return <div className="submission-success"><span className="empty-illustration"><FileCheck2 size={39} strokeWidth={1.5} /></span><h2 className="dialog-title">Ready for a careful look.</h2><p>Your correction is in the local review queue. The listing stays as it is until a reviewer approves the change.</p><div className="dialog-actions"><button className="button button-primary" onClick={onReview}>Open the review desk <ArrowRight size={16} /></button><button className="button button-secondary" onClick={onBack}>Back to the resource</button></div></div>
  return <>
    <div className="dialog-eyebrow">Care for the directory</div><h2 className="dialog-title">Make a useful correction.</h2><p className="dialog-lead">{resource.name}</p>
    <form className="correction-form" onSubmit={(event) => {
      event.preventDefault()
      const result = makeSuggestion(resource, { field, after, sourceUrl, note })
      if (result.error) { setError(result.error); return }
      onSubmit(result.suggestion!)
      setSubmitted(true)
    }}>
      <label>What needs updating?<select value={field} onChange={(event) => {
        const next = event.target.value as 'access' | 'status'
        setField(next); setAfter(next === 'access' ? resource.access : resource.status === 'inactive' ? 'source-checked' : 'inactive'); setError('')
      }}><option value="access">Participation & access information</option><option value="status">Active / inactive status</option></select></label>
      <div className="current-value"><span className="eyebrow muted">Current listing</span><p>{resource[field]}</p></div>
      {field === 'access' ? <label>Proposed participation information<textarea value={after} onChange={(event) => setAfter(event.target.value)} required minLength={10} maxLength={600} rows={4} /></label>
        : <label>Proposed status<select value={after} onChange={(event) => setAfter(event.target.value)}><option value="source-checked">Active</option><option value="inactive">Inactive</option></select></label>}
      <label>Public source link<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required maxLength={2048} placeholder="https://…" /></label>
      <label>Why is this change helpful? <span className="optional">Optional</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} rows={2} placeholder="Briefly explain what you found." /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="form-local-note"><Info size={15} />This suggestion stays on your device. No personal details are needed.</p>
      <div className="dialog-actions"><button type="submit" className="button button-primary">Send to local review <ArrowRight size={16} /></button><button type="button" className="text-button muted" onClick={onBack}>Back</button></div>
    </form>
  </>
}

export function CompareDesigns({ layout, savedDesign, year, onYear, onUse, onReplace, onProposal }: {
  layout: Layout; savedDesign: SavedDesign; year: Checkpoint; onYear: (year: Checkpoint) => void
  onUse: () => void; onReplace: () => void; onProposal: () => void
}) {
  const designA = simulate(savedDesign.layout, year)
  const designB = simulate(layout, year)
  return <>
    <div className="dialog-eyebrow">Different choices, the same future</div><h2 className="dialog-title">Two designs. What matters to you?</h2><p className="dialog-lead">Compare both at the same checkpoint. Higher scores tell one part of the story; water and care tell another.</p>
    <Timeline year={year} onChange={onYear} compact />
    <div className="compare-scenes"><div><span className="eyebrow">Design A · saved</span><BlockScene layout={savedDesign.layout} year={year} compact /><p>{designA.costs.budget} credits · {designA.costs.water} water · {designA.costs.care} care</p></div><div><span className="eyebrow">Design B · current</span><BlockScene layout={layout} year={year} compact /><p>{designB.costs.budget} credits · {designB.costs.water} water · {designB.costs.care} care</p></div></div>
    <div className="comparison-table"><div className="comparison-table-head"><span>Year {year} · illustrative indices</span><span>A</span><span>B</span><span>Difference</span></div>{outcomes.map(({ id, name }) => {
      const difference = designB.scores[id] - designA.scores[id]
      return <div key={id}><span>{name}</span><strong>{designA.scores[id]}</strong><strong>{designB.scores[id]}</strong><span className={difference > 0 ? 'positive' : difference < 0 ? 'negative' : ''}>{difference > 0 ? '+' : ''}{difference}</span></div>
    })}<div><span>Water units over allowance</span><strong>{designA.waterShortfall}</strong><strong>{designB.waterShortfall}</strong><span>Lower is better</span></div><div><span>Care units over allowance</span><strong>{designA.careShortfall}</strong><strong>{designB.careShortfall}</strong><span>Lower is better</span></div></div>
    <div className="dialog-actions"><button className="button button-primary" onClick={onProposal}>Make a conversation starter <ArrowRight size={16} /></button><button className="button button-secondary" onClick={onUse}>Use A as my draft</button></div><button className="text-button muted" onClick={onReplace}>Replace saved A with this draft</button>
  </>
}

export function ProposalDialog({ layout, savedDesign, reflection, resources, onReflection, onDownloaded }: {
  layout: Layout; savedDesign: SavedDesign | null; reflection: string; resources: Resource[]; onReflection: (text: string) => void; onDownloaded: () => void
}) {
  const chosen = selectedPractices(layout)
  const costs = costsOf(layout)
  return <>
    <div className="dialog-eyebrow">Give the idea a next step</div><h2 className="dialog-title">Start a neighborhood conversation.</h2><p className="dialog-lead">Take your choices, their tradeoffs, and real local resources into a discussion with a community steward or planner.</p>
    <div className="proposal-summary"><span className="eyebrow muted">Your design</span><div className="detail-tags">{chosen.map((id) => <span key={id} className="filter-chip"><PracticeIcon id={id} size={14} />{practiceById[id].shortName} × {layout.filter((item) => item === id).length}</span>)}</div><p>{costs.budget} budget credits · {costs.water} water units · {costs.care} care units</p></div>
    <label className="reflection-label">Which tradeoff matters most, and who would care for this space?<textarea rows={4} maxLength={1200} value={reflection} onChange={(event) => onReflection(event.target.value)} placeholder="I chose… because… Before changing a real site, I’d ask…" /><span className="optional">Optional · saved in this browser</span></label>
    <div className="source-box"><BookOpen size={19} /><div><strong>Your download includes the context.</strong><p>Design choices, three time checkpoints, comparison with A, your reflection, source links, and questions about land ownership, access, soil, water, and stewardship.</p></div></div>
    <p className="dialog-footnote">This fictional block is a learning exercise. Scores and costs are uncalibrated game values. The proposal has no confirmed civic recipient and has not been submitted anywhere.</p>
    <div className="dialog-actions"><button className="button button-primary" onClick={() => {
      downloadText(createProposal(layout, savedDesign, reflection, resources), 'common-ground-conversation-starter.md')
      onDownloaded()
    }}><Download size={17} />Download my proposal</button></div>
    <a className="text-button muted" href="https://www.oaklandca.gov/Government/Boards-Commissions/Planning-Commission" target="_blank" rel="noreferrer">Explore Oakland’s planning process <ExternalLink size={14} /></a>
  </>
}

export function HowItWorks({ onSources }: { onSources: () => void }) {
  return <>
    <div className="dialog-eyebrow">One small block. A bigger conversation.</div><h2 className="dialog-title">Play with possibilities.</h2><p className="dialog-lead">Common Ground connects a youth land-use learning experience with real community resources in the East Bay.</p>
    <div className="how-steps"><div><span>01</span><div><h3>Make a mix</h3><p>Choose five kinds of improvements for a fictional West Oakland block. Keep within budget, water, and care limits. Existing trees and the hall stay.</p></div></div><div><span>02</span><div><h3>See a longer story</h3><p>New trees grow. A drought tightens water. A storm tests runoff and maintenance. Save one design and compare another at the same time.</p></div></div><div><span>03</span><div><h3>Find a real next step</h3><p>Explore source-checked gardens, learning spaces, tools, and seeds. Follow a provider’s participation process or download a conversation starter.</p></div></div></div>
    <div className="source-box"><Info size={19} /><div><strong>Learning, with the assumptions in view.</strong><p>The block is fictional. Scores are illustrative; no environmental forecast, measured impact, or land-use permission is implied. Your draft and corrections stay in this browser. There are no accounts or analytics. Map imagery loads from OpenStreetMap.</p></div></div>
    <button className="button button-secondary" onClick={onSources}>Read the rules & sources <ArrowRight size={16} /></button>
  </>
}

export function SourcesDialog() {
  return <>
    <div className="dialog-eyebrow">Evidence-informed. Open about assumptions.</div><h2 className="dialog-title">What is behind the numbers?</h2><p className="dialog-lead">Sources support the direction of effects. Every coefficient, cost, event allowance, and maturation rate below is an authored learning assumption.</p>
    <div className="method-warning"><Info size={20} /><p>These are relative 0–100 game indices, not litres saved, temperature changes, dollars, or a forecast for a real site. Positions illustrate a layout; this version evaluates the practice mix, not spatial drainage or accessibility.</p></div>
    <h3 className="method-heading">The practice catalog</h3><div className="method-table-wrapper"><table className="method-table"><caption>Authored game costs and full-growth index contributions per plot</caption><thead><tr><th>Practice</th><th>Credits</th><th>Water</th><th>Care</th><th>Water resilience</th><th>Shade</th><th>Soil</th><th>Shared value</th></tr></thead><tbody>{practices.map((practice) => <tr key={practice.id}><th>{practice.shortName}</th><td>{practice.costs.budget}</td><td>{practice.costs.water}</td><td>{practice.costs.care}</td>{outcomes.map(({ id }) => <td key={id}>{practice.effects[id]}</td>)}</tr>)}</tbody></table></div>
    <h3 className="method-heading">Three checkpoints, two stresses</h3><p className="method-copy">The unchanged block’s [water, shade, soil, shared value] baselines are [24, 13, 22, 30] at year 0, [16, 18, 19, 30] at year 5, and [19, 24, 20, 28] at year 15.</p><div className="method-checkpoints">{scenario.checkpoints.map((item) => <div key={item.year}><strong>Year {item.year}</strong><span>{item.year === 0 ? 'Establishment' : item.year === 5 ? 'Drought' : 'Heavy rain'}</span><p>{item.water} water · {item.care} care units</p></div>)}</div>
    <p className="method-copy">Growth factors at years 0 / 5 / 15: trees 0.20 / 0.65 / 1; rain gardens 0.85 / 1 / 1; food gardens 0.65 / 1 / 1; native plants 0.55 / 1 / 1; paths 1 / 1 / 1. Full-growth trees include the whole game contribution, not a biological maturity prediction.</p>
    <p className="method-copy">Each contribution is multiplied by growth, a water-stress factor, and a care-stress factor. Water stress = shortfall ÷ demand. Sensitivity is 0.35 for trees and rain gardens, 0.85 for food gardens, 0.20 for natives, and 0 for paths. Care reduces contributions by 0.6 × (care shortfall ÷ demand). Year 15 multiplies rain-garden and path water contributions by 1.16. Three or more practices add 3 soil and 4 shared-value points. Totals are rounded and capped at 100.</p>
    <h3 className="method-heading">Read the underlying sources</h3><div className="evidence-list">{evidence.map((source) => <div key={source.id}><span className="eyebrow muted">{source.publisher}</span><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={14} /></a><p>{source.note}</p></div>)}</div>
  </>
}

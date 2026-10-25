import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Copy, Download, ExternalLink, FileText, Printer, Users } from 'lucide-react'
import { downloadText } from '../lib/proposal.ts'
import { guildLinks, setupChecklist } from './data.ts'
import { createWorkdayCsv, createWorkdayMarkdown, shortTime, workdayDate, workdayErrors, workdayMessages } from './model.ts'
import type { WorkdayDraft } from './types.ts'

export function WorkdayKit({ drafts, draft, saved, blocked, onUpdate, onSelect, onDuplicate, onNotice }: {
  drafts: WorkdayDraft[]; draft: WorkdayDraft; saved: boolean; blocked: boolean
  onUpdate: (patch: Partial<WorkdayDraft>) => void; onSelect: (id: string) => void; onDuplicate: () => void
  onNotice: (message: string, error?: boolean) => void
}) {
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const editor = useRef<HTMLDivElement>(null)
  const previousStep = useRef(step)
  useEffect(() => {
    if (previousStep.current === step) return
    previousStep.current = step
    const heading = editor.current?.querySelector<HTMLElement>('h2')
    heading?.focus({ preventScroll: true })
    heading?.scrollIntoView({ block: 'start' })
  }, [step])
  const requested = draft.roles.reduce((total, role) => total + role.needed, 0)
  const messages = workdayMessages(draft)
  const change = (patch: Partial<WorkdayDraft>) => { setErrors([]); onUpdate(patch) }
  const changeAgenda = (index: number, patch: { time?: string; title?: string }) =>
    change({ agenda: draft.agenda.map((item, i) => i === index ? { ...item, ...patch } : item) })
  const navigate = (next: number) => {
    if (next === 2) {
      const invalid = workdayErrors(draft)
      if (invalid.length) { setErrors(invalid); return }
    }
    setStep(next)
    setErrors([])
  }
  const exportKit = (format: 'markdown' | 'csv' | 'print') => {
    const invalid = workdayErrors(draft)
    if (invalid.length) { setErrors(invalid); return }
    if (format === 'print') { window.print(); return }
    downloadText(format === 'csv' ? createWorkdayCsv(draft) : createWorkdayMarkdown(draft), format === 'csv' ? 'common-ground-workday-roles.csv' : 'common-ground-workday-kit.md', format === 'csv' ? 'text/csv;charset=utf-8' : undefined)
    onNotice(format === 'csv' ? 'Draft role plan exported. It is not an attendee roster.' : 'Workday kit downloaded for host review.')
  }
  return <div className="workday-kit" ref={editor}>
    <div className="kit-toolbar"><label>Your drafts<select aria-label="Choose a workday draft" value={draft.id} onChange={event => { onSelect(event.target.value); setStep(0); setErrors([]) }}>{drafts.map(item => <option key={item.id} value={item.id}>{item.title || 'Untitled workday'}</option>)}</select></label><button className="button button-secondary" disabled={drafts.length >= 12} onClick={() => { onDuplicate(); setStep(0); setErrors([]) }}><Copy size={19} />Reuse for another day</button></div>
    <p className={`kit-save-note ${saved ? '' : 'unsaved'}`} role="status">{blocked ? 'Saved draft data could not load. It has been preserved; download this kit to keep your changes.' : saved ? <><Check size={18} />Draft saved on this device</> : 'Changes are not saved yet. You can download a copy.'}</p>
    <div className="kit-stepper" role="group" aria-label="Build a workday kit">{['The plan', 'The people', 'Review & export'].map((label, index) => <button key={label} aria-pressed={step === index} onClick={() => navigate(index)}><span>{index + 1}</span>{label}</button>)}</div>
    {errors.length > 0 && <div className="guild-form-errors" role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div>}
    {step < 2 ? <form className="kit-editor" noValidate={step === 1} onSubmit={event => { event.preventDefault(); navigate(step + 1) }}>
      {step === 0 ? <section className="kit-plan">
        <div className="guild-section-heading"><h2 tabIndex={-1}>A day worth gathering for.</h2><span className="activity-status unconfirmed">Draft · host review needed</span></div>
        <p className="guild-section-intro">Start with the workday template. Make it fit your group.</p>
        <label>Workday name<input value={draft.title} maxLength={100} required minLength={3} onChange={event => change({ title: event.target.value })} /></label>
        <div className="kit-form-row"><label>Date <span>optional</span><input type="date" value={draft.date} onInput={event => change({ date: event.currentTarget.value })} onChange={event => change({ date: event.target.value })} /></label><label>Public venue or arrival note<input value={draft.venue} required minLength={3} maxLength={180} onChange={event => change({ venue: event.target.value })} /></label></div>
        <label>What will you work on?<textarea value={draft.tasks} rows={3} required minLength={5} maxLength={1600} onChange={event => change({ tasks: event.target.value })} /></label>
        <label>What should people bring?<textarea value={draft.bring} rows={2} maxLength={500} onChange={event => change({ bring: event.target.value })} /></label>
        <label>Host’s official RSVP link <span>optional</span><input type="url" value={draft.registrationUrl} maxLength={2048} placeholder="Add a confirmed event link when you have one" onChange={event => change({ registrationUrl: event.target.value.trim() })} /></label>
      </section> : <section className="kit-people">
        <div className="guild-section-heading"><h2 tabIndex={-1}>Many ways to help.</h2><span className="kit-requested"><Users size={20} />{requested} requested helpers</span></div>
        <p className="guild-section-intro">Editable planning targets. The host confirms roles and registration.</p>
        <div className="kit-role-grid">{draft.roles.map((role, index) => <article key={role.id} className={`kit-role-card ${role.needed === 0 ? 'role-off' : ''}`}>
          <div><h3>{role.name}</h3><label className="kit-role-count">Requested<input type="number" min="0" max="50" step="1" aria-label={`Requested helpers: ${role.name}`} value={role.needed} onChange={event => change({ roles: draft.roles.map((item, i) => i === index ? { ...item, needed: Math.max(0, Math.min(50, Math.floor(Number(event.target.value) || 0))) } : item) })} /></label></div>
          <p>{role.description}</p>
          <details><summary>Edit role & draft lead</summary><label>Role name<input value={role.name} required maxLength={80} onChange={event => change({ roles: draft.roles.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></label><label>Responsibility<textarea value={role.description} rows={2} required maxLength={400} onChange={event => change({ roles: draft.roles.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} /></label><label>Draft lead nickname <span>optional</span><input value={role.assignedTo} maxLength={100} placeholder="A nickname, not contact details" onChange={event => change({ roles: draft.roles.map((item, i) => i === index ? { ...item, assignedTo: event.target.value } : item) })} /></label></details>
        </article>)}</div>
      </section>}
      <div className="kit-footer">{step > 0 && <button type="button" className="text-button" onClick={() => navigate(step - 1)}><ArrowLeft size={19} />Back</button>}<button className="button button-primary" type="submit">{step === 0 ? 'Choose the roles' : 'Review the kit'}<ArrowRight size={20} /></button></div>
    </form> : <section className="kit-preview">
      <div className="kit-export-actions"><button className="button button-primary" onClick={() => exportKit('markdown')}><FileText size={19} />Download kit</button><button className="button button-secondary" onClick={() => exportKit('csv')}><Download size={19} />Roles CSV</button><button className="button button-secondary" onClick={() => exportKit('print')}><Printer size={19} />Print</button><button className="text-button" onClick={() => navigate(0)}>Edit plan <ArrowRight size={18} /></button></div>
      <article className="workday-preview">
        <header><span className="guild-overline">Draft for host review</span><h2 tabIndex={-1}>{draft.title}</h2><p>{workdayDate(draft)} · {draft.venue}</p><small>Planning targets · not a registration or attendance record</small></header>
        <section><h3>Today’s tasks</h3><p className="kit-preserve-lines">{draft.tasks}</p></section>
        <section><div className="guild-section-heading"><h3>Agenda <small>Pacific time</small></h3></div><ol className="kit-agenda">{draft.agenda.map(item => <li key={item.id}><time>{shortTime(item.time)}</time><span>{item.title}</span></li>)}</ol>
          <details className="kit-agenda-editor"><summary>Edit the agenda</summary>{draft.agenda.map((item, index) => <div className="kit-agenda-row" key={item.id}><label>Time<input type="time" aria-label={`Time: ${workdayAgendaLabel(item.id)}`} value={item.time} onInput={event => changeAgenda(index, { time: event.currentTarget.value })} onChange={event => changeAgenda(index, { time: event.target.value })} /></label><label>Step<input aria-label={`Agenda: ${workdayAgendaLabel(item.id)}`} value={item.title} maxLength={240} onChange={event => changeAgenda(index, { title: event.target.value })} /></label></div>)}</details>
        </section>
        <section><div className="guild-section-heading"><h3>Role plan</h3><span>{requested} requested helpers</span></div><ul className="kit-preview-roles">{draft.roles.filter(role => role.needed > 0).map(role => <li key={role.id}><div><strong>{role.name}</strong><span>{role.needed} requested</span></div><p>{role.description}</p>{role.assignedTo.trim() && <p>Draft lead: {role.assignedTo}</p>}</li>)}</ul></section>
        <section><h3>Before the day</h3><ul className="kit-checklist">{setupChecklist.map(item => <li key={item}><span aria-hidden="true">□</span>{item}</li>)}</ul></section>
        <section><h3>What to bring</h3><p>{draft.bring}</p></section>
        <section><h3>After the day</h3><p>{draft.followUp}</p></section>
        <footer><p>Adapted from the OPC workday SOP and agendas. Confirm the plan with the host.</p><a href={guildLinks.sop} target="_blank" rel="noreferrer">Original workday SOP <ExternalLink size={17} /></a></footer>
      </article>
      <section className="kit-message-drafts"><h3>Invitations with a human voice.</h3><p>Review and copy into the host’s agreed channels.</p>
        <label>Follow-up plan<textarea rows={2} maxLength={600} value={draft.followUp} onChange={event => change({ followUp: event.target.value })} /></label>
        {Object.entries(messages).map(([name, text]) => <details key={name}><summary>Draft {name === 'followUp' ? 'follow-up' : name}</summary><p className="kit-preserve-lines">{text}</p><button className="text-button" onClick={async () => {
          try { await navigator.clipboard.writeText(text); onNotice(`Draft ${name === 'followUp' ? 'follow-up' : name} copied. Review before sending.`) }
          catch { onNotice('Copy was unavailable. Download the kit to keep the draft.', true) }
        }}><Copy size={18} />Copy draft</button></details>)}
      </section>
      <div className="kit-footer"><button className="text-button" onClick={() => navigate(1)}><ArrowLeft size={19} />Edit roles</button><button className="button button-secondary" disabled={drafts.length >= 12} onClick={() => { onDuplicate(); setStep(0) }}><Copy size={19} />Reuse for another day</button></div>
    </section>}
    <details className="guild-source-notes kit-template-notes"><summary>Template sources & prototype limits</summary><p>Responsibilities and timing are adapted from the Guild’s public workday agendas. Cleanup timing and editable helper targets are prototype suggestions, not official event staffing.</p><a href={guildLinks.sop} target="_blank" rel="noreferrer">Workday SOP & agendas <ExternalLink size={17} /></a><p>Drafts stay in this browser. Exports do not publish an event, send messages, synchronize RSVPs, or create a shared roster. The host must review tasks, roles, and participation arrangements.</p></details>
  </div>
}

function workdayAgendaLabel(id: string): string {
  return ({ setup: 'Setup', welcome: 'Arrival', intro: 'Introductions', tasks: 'Garden tasks', lunch: 'Lunch', reflect: 'Reflection', cleanup: 'Cleanup', close: 'Closing' } as Record<string, string>)[id] ?? id
}

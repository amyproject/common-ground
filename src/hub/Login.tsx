import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, KeyRound } from 'lucide-react'

const nextPath = () => {
  const next = new URLSearchParams(window.location.search).get('next') ?? '/canopy/'
  // Only same-site paths; never bounce to another origin.
  return next.startsWith('/') && !next.startsWith('//') ? next : '/canopy/'
}

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [demo, setDemo] = useState(false)
  const [shake, setShake] = useState(0)
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.json()).then(state => {
      if (state.admin) window.location.replace(nextPath())
      setDemo(Boolean(state.demoCredentials))
    }).catch(() => undefined)
  }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) { setError(body.error ?? 'Sign-in failed.'); setShake(value => value + 1); setBusy(false); return }
      setOpen(true)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.setTimeout(() => window.location.assign(nextPath()), reduced ? 0 : 750)
    } catch {
      setError('The hub server didn’t answer. Is `npm run dev` running?'); setBusy(false)
    }
  }
  return <div className="hub-page">
    <main className="login-page" id="main-content">
      <div className={`login-gate ${open ? 'is-open' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 260 220">
          <path d="M10 200 H250" stroke="#b9a77f" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 200 V70 Q130 10 220 70 V200" fill="none" stroke="#7d9a5f" strokeWidth="14" strokeLinecap="round" />
          {[52, 80, 108, 150, 178, 206].map((x, i) => <circle key={x} cx={x} cy={i < 3 ? 64 - i * 9 : 46 + (i - 3) * 9} r="9" fill={i % 2 ? '#8fac6c' : '#a4bf7c'} />)}
          <circle cx="96" cy="40" r="5" fill="#e8a33c" /><circle cx="170" cy="44" r="5" fill="#d8664a" />
          <g className="gate-left"><rect x="56" y="96" width="74" height="104" rx="3" fill="#c49a6c" stroke="#8d6a45" strokeWidth="2" />{[70, 88, 106].map(x => <rect key={x} x={x} y="104" width="10" height="88" rx="2" fill="#b0855a" />)}</g>
          <g className="gate-right"><rect x="130" y="96" width="74" height="104" rx="3" fill="#c49a6c" stroke="#8d6a45" strokeWidth="2" />{[144, 162, 180].map(x => <rect key={x} x={x} y="104" width="10" height="88" rx="2" fill="#b0855a" />)}<circle cx="138" cy="150" r="4" fill="#5d4a33" /></g>
        </svg>
      </div>
      <form key={shake} className={`login-card ${shake ? 'shake' : ''}`} onSubmit={submit} noValidate>
        <h1>Organizer <em>sign-in.</em></h1>
        <p>Canopy holds volunteer contacts, so it’s for guild organizers only.</p>
        <label>Username<input name="username" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} autoFocus required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="hub-button hub-button-primary" disabled={busy || !username || !password}>{open ? 'Opening Canopy…' : busy ? 'Checking…' : <>Sign in <ArrowRight size={17} /></>}</button>
        {demo && <div className="login-demo"><KeyRound size={16} /><span>Demo admin: <code>admin</code> / <code>permaculture</code></span><button type="button" onClick={() => { setUsername('admin'); setPassword('permaculture'); setError('') }}>Fill in</button></div>}
        <a className="login-back" href="/">Back to the hub</a>
      </form>
    </main>
  </div>
}

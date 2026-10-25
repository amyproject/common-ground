// Shared hub header for the static sections (Plan, Canopy). The React Explore app renders
// the same markup from src/hub/HubBar.tsx; keep the two in step.
(function () {
  const icons = {
    explore: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
    plan: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 12h17M12 3.5v17"/><path d="M7 8.2c1-1.4 2.2-1.4 2.6 0M15.6 16.4c.6-1.6 1.8-1.8 2.4-.4"/></svg>',
    canopy: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-7"/><path d="M7.5 14.5a4.5 4.5 0 0 1-.9-8.9A5.5 5.5 0 0 1 17 6.4a4.2 4.2 0 0 1 .4 8.1z"/></svg>',
    key: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2 2M14 9l2 2"/></svg>',
  }
  const sprout = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>'
  const squiggle = '<svg class="hub-squiggle" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><path d="M1 4c8-3 14 2 22 0s14-3 22 0 14 2 22-.5S83 1 99 3"/></svg>'

  function render(state) {
    const current = document.documentElement.dataset.hubSection
    const link = (id, href, label, small) => `<a href="${href}" data-hub="${id}"${current === id ? ' aria-current="page"' : ''}>${icons[id]}<span>${label}${small ? ` <small>${small}</small>` : ''}</span>${squiggle}</a>`
    const account = state.admin
      ? `<a class="hub-signin is-admin" href="/canopy/">${icons.canopy}<span class="hub-signin-label">${state.name || 'Admin'}</span></a><button class="hub-signout" type="button" data-hub-signout>Sign out</button>`
      : `<a class="hub-signin" href="/login?next=${encodeURIComponent('/canopy/')}">${icons.key}<span class="hub-signin-label">Sign in</span></a>`
    return `<div class="hub-bar-inner">
      <a class="hub-brand" href="/" aria-label="Common Ground hub home"><span class="hub-brand-mark">${sprout}</span><strong>Common Ground</strong></a>
      <nav class="hub-nav" aria-label="Hub sections">
        ${link('explore', '/learn', 'Explore', 'Bay Area')}
        ${link('plan', '/plan/', 'Plan', 'your plot')}
        ${state.admin ? link('canopy', '/canopy/', 'Canopy', 'organizers') : ''}
      </nav>
      <div class="hub-account">${account}</div>
    </div>`
  }

  function mount() {
    let bar = document.querySelector('header.hub-bar')
    if (!bar) { bar = document.createElement('header'); bar.className = 'hub-bar'; document.body.prepend(bar) }
    const draw = state => { bar.innerHTML = render(state) }
    draw({ admin: false })
    bar.addEventListener('click', async event => {
      if (!event.target.closest('[data-hub-signout]')) return
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null)
      location.href = '/'
    })
    // Static file previews have no auth server; the header just stays signed out.
    if (location.protocol.startsWith('http')) {
      fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : { admin: false }).then(draw).catch(() => undefined)
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
  else mount()
})()

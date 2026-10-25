// Canopy app: hash router, three nav sections, pages, profile drawer, message composer.
(function () {
  'use strict';
  const MY = window.MY, CH = window.CHARTS;
  const esc = MY.esc, fmtN = CH.fmtN;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const today = () => MY.today(window.MY_NOW || new Date());

  const storage = (() => { try { const s = window.localStorage; s.getItem('probe'); return s; } catch (_) { return null; } })();
  let state = MY.loadState(storage, today());
  const ensureAI = () => { state.discoveries = state.discoveries || []; state.chat = state.chat || []; state.aiRecs = state.aiRecs || null; };
  ensureAI();

  const ui = {
    route: 'overview', f: { days: 90, neighborhood: 'all', source: 'all' }, gf: { days: 365, neighborhood: 'all', source: 'all' }, table: {},
    metric: 'active', hidden: {}, anim: true, me: null,
    vol: { seg: 'all', q: '', hood: 'all', tier: 'all', sort: 'last', dir: -1, page: 0, sel: new Set(), preset: null },
    drawer: null, msgTab: 'compose', compose: null, eventId: null, plan: null, panel: null,
    server: { available: false, email: null, sms: null, dryRun: { email: true, sms: true }, ai: { configured: false, model: null } },
    disc: { city: 'Oakland, CA', category: MY.PARTNER_CATEGORIES[0], count: 8, busy: false, error: null, run: 0 },
    chat: { open: false, busy: false, draft: '', error: null }, recs: { source: 'data', busy: false, error: null },
  };

  const ICON = {
    signups: '<path d="M10 17v-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M10 11c-3.4 0-5-2-5-5 3 0 5 1.7 5 5zM10 9.5c0-3 1.9-4.7 5-4.7 0 3.1-2 4.7-5 4.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    overview: '<path d="M3 10l7-6 7 6v7H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    volunteers: '<circle cx="7" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="14" cy="8" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2 17c0-3 2.5-5 5-5s5 2 5 5M12 16c.3-2 1.6-3.5 3.5-3.5S18 14 18 16" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    events: '<rect x="3" y="4" width="14" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.7"/>',
    messages: '<rect x="2.5" y="4" width="15" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 5l7 6 7-6" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    rewards: '<path d="M10 2l2.4 5 5.4.6-4 3.7 1.1 5.3L10 14l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    partners: '<path d="M2 10l4-4 4 3 4-3 4 4-8 7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    sites: '<path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="10" cy="8" r="2" fill="currentColor"/>',
    funnel: '<path d="M2 3h16l-6 7v6l-4 2v-8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    recs: '<path d="M10 2a5.5 5.5 0 0 0-3 10.1V14h6v-1.9A5.5 5.5 0 0 0 10 2zM7.5 17h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    plan: '<circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="10" cy="10" r="1" fill="currentColor"/>',
  };
  // Small hand-drawn line icons for inline status (no emoji).
  const svgI = (d, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IC = {
    ok: svgI('<path d="M5 12.5 10 17l9-10"/>', 'ic-ok'),
    warn: svgI('<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.2M12 17v.3"/>', 'ic-warn'),
    block: svgI('<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>', 'ic-block'),
    x: svgI('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    out: svgI('<path d="M14 5h5v5M19 5l-8 8"/><path d="M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10"/>'),
    search: svgI('<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>'),
    bubble: svgI('<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-7.5L7 20.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/><path d="M8 10h8M8 13h5"/>'),
    up: svgI('<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>'),
    down: svgI('<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>'),
    leaf: '<svg class="leaf" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10C2 5 5 2 10.5 1.5 10.5 7 7.5 10 2 10zM2 10l5-5"/></svg>',
  };
  const NAV = [
    ['Volunteers & Crews', [['overview', 'Overview'], ['signups', 'Hub sign-ups'], ['volunteers', 'Volunteers'], ['events', 'Events & Crews'], ['messages', 'Messages'], ['rewards', 'Rewards']]],
    ['GTM Partnerships', [['partners', 'Partners'], ['sites', 'Sites']]],
    ['Growth Plan', [['funnel', 'Market funnel'], ['recs', 'Recommendations'], ['plan', '30/60/90 plan']]],
  ];
  // Page titles in the hub's display voice: Fraunces with one italic sage accent word.
  const TITLE_HTML = {
    overview: 'Volunteer <em>overview.</em>', signups: 'Hub <em>sign-ups.</em>', volunteers: 'Volunteer <em>roster.</em>', events: 'Events &amp; <em>crews.</em>',
    messages: 'Messages <em>out.</em>', rewards: 'Seeds &amp; <em>rewards.</em>', partners: 'Partner <em>groups.</em>', sites: 'Garden <em>sites.</em>',
    funnel: 'Market <em>funnel.</em>', recs: 'What to try <em>next.</em>', plan: '30/60/90 <em>plan.</em>',
  };
  const TITLES = Object.fromEntries(NAV.flatMap(([sec, items]) => items.map(([id, l]) => [id, [sec, l]])));
  const RANGES = [[30, '30D'], [90, '90D'], [180, '6M'], [365, '12M']];
  const TIER_COLOR = ['var(--ord-1)', 'var(--ord-2)', 'var(--ord-3)', 'var(--ord-4)'];
  const CAT = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
  const HEALTH_LABEL = Object.fromEntries(MY.HEALTH.map(([id, l]) => [id, l]));
  const ACTION_SHORT = { welcome: 'Welcome', remind: 'Remind', thank: 'Thank', nudge: 'Reconnect', 'check-in': 'Check in', 'invite-first': 'Invite', 'invite-lead': 'Invite to lead' };
  const ACTION_TEMPLATE = { welcome: 'welcome', remind: 'remind', thank: 'thank', nudge: 'nudge', 'check-in': 'nudge', 'invite-first': 'event', 'invite-lead': 'reward' };

  // ---------- helpers ----------
  const save = () => MY.saveState(storage, state);
  const commit = (msg) => { save(); render(); if (msg) toast(msg); };
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  const vol = (id) => state.volunteers.find((v) => v.id === id);
  const initials = (n) => String(n).split(/\s+/).map((p) => p[0]).join('').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
  const pct = (v) => (v == null ? '–' : `${v}%`);
  const F = () => (['funnel', 'plan'].includes(ui.route) ? ui.gf : ui.f);
  const rangeLabel = () => (RANGES.find((r) => r[0] === F().days) || [0, ''])[1];
  const priorLabel = () => `vs prior ${rangeLabel()}`;
  const opt = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const statusHTML = (h) => `<span class="status st-${h}"><i aria-hidden="true"></i>${esc(HEALTH_LABEL[h])}</span>`;
  const HCOLOR = { active: 'var(--st-active)', cooling: 'var(--st-cooling)', 'at-risk': 'var(--st-risk)', lapsed: 'var(--st-lapsed)', new: 'var(--st-new)', never: 'var(--st-never)' };
  const tierHTML = (t) => `<span class="tier"><i style="background:${TIER_COLOR[t.index]}"></i>${esc(t.tier.name)}</span>`;
  const reachHTML = (v) => `<span class="reach" aria-label="Consented channels">${[['email', '@'], ['sms', 'T'], ['whatsapp', 'W']].map(([k, l]) => `<span class="${v.channels && v.channels[k] ? 'on' : ''}" title="${k}${v.channels && v.channels[k] ? ' ok' : ' not consented'}">${l}</span>`).join('')}</span>`;

  function card(id, title, sub, body, table, cls, tools) {
    const showTable = table && ui.table[id];
    return `<section class="card ${cls || ''}" aria-labelledby="h-${id}"><div class="card-h"><div><h3 id="h-${id}">${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
      <div class="card-tools">${tools || ''}${table ? `<button class="view-toggle" data-act="toggle-table" data-id="${id}" aria-pressed="${!!showTable}">${showTable ? 'Chart' : 'Table'}</button>` : ''}</div></div>
      <div class="card-b">${showTable ? tableHTML(table) : body}</div></section>`;
  }
  function tableHTML(t) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${t.cols.map((c, i) => `<th scope="col"${i ? ' class="num"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td class="num">${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  // Spark points are trailing 28-day readings ending on these dates (see MY.kpis).
  const sparkLabels = (days) => { const step = Math.max(1, Math.round(days / 12)); return Array.from({ length: 12 }, (_, j) => MY.fmtDate(MY.addDays(today(), -(11 - j) * step)).replace(/^\w+, /, '')); };
  // KPI tile = a button: selecting it swaps the metric the participation chart plots.
  function kpiHTML(k) {
    const val = k.value == null ? '–' : k.fmt === '%' ? `${k.value}%` : fmtN(k.value);
    let d = '<span class="delta flat">no change data</span>';
    if (k.delta != null) {
      const good = k.delta === 0 ? null : (k.delta > 0) === k.goodUp;
      const txt = k.fmt === '%' ? `${k.delta > 0 ? '+' : ''}${k.delta} pts` : `${k.delta > 0 ? '+' : ''}${k.pct != null ? `${k.pct}%` : fmtN(k.delta)}`;
      d = `<span class="delta ${good == null ? 'flat' : good ? 'up' : 'down'}">${k.delta > 0 ? IC.up : k.delta < 0 ? IC.down : ''}${esc(txt)}</span>`;
    }
    const sel = ui.metric === k.id;
    return `<button type="button" class="kpi${sel ? ' on' : ''}" data-act="kpi" data-id="${k.id}" aria-pressed="${sel}" aria-label="${esc(`${k.label}: ${val}. ${sel ? 'Plotted below' : 'Plot this below'}`)}"><span class="k-label">${esc(k.label)}${sel ? '<span class="k-pin" title="Plotted in the chart below"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16M7 16v-4M12 16V7M17 16v-6"/></svg><span class="sr-only">charted below</span></span>' : ''}</span><span class="k-row"><span class="k-val">${esc(val)}</span>${k.spark ? CH.spark(k.spark, { w: 84, h: 30, labels: sparkLabels(F().days), unit: k.fmt === '%' ? '%' : '' }) : ''}</span><span class="k-foot">${d}<span class="k-prior">${esc(priorLabel())}</span></span></button>`;
  }
  const simpleKpi = (label, value, foot) => `<div class="kpi"><span class="k-label">${esc(label)}</span><div class="k-row"><span class="k-val">${esc(value)}</span></div><span class="k-foot">${esc(foot || '')}</span></div>`;

  function pageHead(sub, actions) {
    const [sec, title] = TITLES[ui.route];
    return `<div class="page-head"><div><p class="crumbs">${esc(sec)}<span aria-hidden="true"> / </span>${esc(title)}</p><h1>${TITLE_HTML[ui.route] || esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div><div class="actions">${actions || ''}</div></div>`;
  }
  function filterRow(withSource) {
    const f = F();
    return `<div class="filters" role="group" aria-label="Filters"><label>Range</label><div class="seg">${RANGES.map(([d, l]) => `<button data-act="range" data-days="${d}" aria-pressed="${f.days === d}">${l}</button>`).join('')}</div>
      <label for="f-hood">Neighborhood</label><select id="f-hood" data-change="f-hood">${opt([['all', 'All neighborhoods']].concat(MY.NEIGHBORHOODS.map((n) => [n, n])), f.neighborhood)}</select>
      ${withSource !== false ? `<label for="f-source">Source</label><select id="f-source" data-change="f-source">${opt([['all', 'All sources']].concat(MY.SOURCES.map((n) => [n, n])), f.source)}</select>` : ''}
      <span class="muted f-dates">${esc(MY.fmtDate(MY.windowOf(today(), f.days, 0).from))} – ${esc(MY.fmtDate(today()))}</span></div>`;
  }

  // ---------- Overview ----------
  function pageOverview() {
    const T = today(), f = ui.f;
    const ks = MY.kpis(state, T, f);
    const weekly = MY.weeklySeries(state, T, f);
    const fn = MY.funnel(state, T, f);
    const src = MY.sources(state, T, f);
    const hoods = MY.neighborhoods(state, T, f);
    const reach = MY.reachability(state, f);
    const health = MY.healthCounts(state, T, f);
    const coh = MY.cohorts(state, T, f, 6);
    const rows = MY.rosterRows(state, T).filter((r) => r.action).sort((a, b) => a.action.priority - b.action.priority || (b.last || b.v.signedUpAt).localeCompare(a.last || a.v.signedUpAt)).slice(0, 7);
    const upcoming = state.events.filter((e) => e.date >= T).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 4);
    const healthOrder = ['active', 'cooling', 'at-risk', 'lapsed', 'new', 'never'];
    const hTotal = healthOrder.reduce((s, k) => s + health[k], 0) || 1;
    const hColor = HCOLOR;
    const per = f.days > 120 ? 'month' : 'week';
    const M = METRICS[ui.metric] || METRICS.active;
    const mChart = M.kind === 'line'
      ? CH.lines({ id: 'participation', data: weekly, series: M.series, unit: M.unit, max: 100, height: 230, title: M.title })
      : CH.columns({ id: 'participation', data: weekly, series: M.series, hidden: hiddenOf('participation'), unit: M.unit, height: 230, title: M.title });
    return `${pageHead('East Bay Permaculture Guild · volunteer program health', `<button class="btn" data-act="export-roster">Export CSV</button><button class="btn primary" data-act="new-message">New message</button>`)}
      ${filterRow()}
      <div class="kpis ledger" role="group" aria-label="Key numbers. Pick one to plot it below.">${ks.map(kpiHTML).join('')}</div>
      <div class="grid">
        ${card('participation', M.title, M.sub(per), `<div class="swap" data-metric="${ui.metric}">${mChart}</div>`,
          { cols: ['Period'].concat(M.series.map((s) => s.label)).concat(ui.metric === 'active' ? ['Signups'] : []), rows: weekly.map((w) => [w.label].concat(M.series.map((s) => (w[s.key] == null ? '–' : `${w[s.key]}${M.unit}`))).concat(ui.metric === 'active' ? [w.signups] : [])) }, 'c8 main-chart', ui.metric !== 'active' ? '<button class="view-toggle" data-act="kpi" data-id="active">Back to attendance</button>' : '')}
        ${card('health', 'Volunteer health', 'Everyone, by days since last visit',
          `<div class="hbar-stack">${healthOrder.map((k) => (health[k] ? `<span style="flex:${health[k]};background:${hColor[k]}" ${CH.tip(`<strong>${HEALTH_LABEL[k]}</strong><div>${health[k]} people</div>`)}></span>` : '')).join('')}</div>
           <ul class="legend vertical linked">${healthOrder.map((k) => `<li><button type="button" data-act="health-seg" data-seg="${k}" aria-label="${esc(`${HEALTH_LABEL[k]}: ${health[k]} people. Open them in the roster`)}">${statusHTML(k)}<b>${health[k]}</b><span class="muted">${Math.round((health[k] / hTotal) * 100)}%</span></button></li>`).join('')}</ul>
           <p class="card-note">Pick a status to open those people in the roster.</p>`,
          { cols: ['Status', 'People'], rows: healthOrder.map((k) => [HEALTH_LABEL[k], health[k]]) }, 'c4')}
        ${card('funnel', 'Volunteer funnel', `People who signed up in the last ${rangeLabel()}`, CH.funnel(fn, { bottleneck: worstStep(fn), act: 'people', kind: 'funnel' }),
          { cols: ['Step', 'People', '% of previous'], rows: fn.map((s) => [s.label, s.count, s.ofPrev == null ? '–' : `${s.ofPrev}%`]) }, 'c4')}
        ${card('sources', 'Signups by source', 'Bar = signups · % = came to a first visit', CH.hbars(src.map((s) => ({ label: s.label, value: s.signups, sub: `${pct(s.conv)} first visit`, tip: `${s.signups} signups · ${s.came} came (${pct(s.conv)})` })), { act: 'people', kind: 'source', hint: 'Click to see who signed up this way' }),
          { cols: ['Source', 'Signups', 'Came', 'Conversion'], rows: src.map((s) => [s.label, s.signups, s.came, pct(s.conv)]) }, 'c4')}
        ${card('hoods', 'Active volunteers by neighborhood', `Attended in the last ${rangeLabel()}`, CH.hbars(hoods.map((h) => ({ label: h.label, value: h.value, tip: `${h.value} active` })), { act: 'people', kind: 'hood' }),
          { cols: ['Neighborhood', 'Active'], rows: hoods.map((h) => [h.label, h.value]) }, 'c4')}
        ${card('cohorts', 'Retention by first-visit month', 'Share of each cohort who came back in later months', CH.heatmap(coh, { cols: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'], rowHead: 'Cohort', sizeHead: 'People' }), null, 'c8')}
        ${card('reach', 'Reachability', 'Consent on file by channel', CH.donut(reach.map((r, i) => ({ label: r.label, value: r.value, color: [CAT[0], CAT[1], CAT[2], 'var(--st-never)'][i] })), { center: fmtN(reach.reduce((s, r) => s + r.value, 0)), centerLabel: 'people', title: 'Reachability' }),
          { cols: ['Channel consent', 'People'], rows: reach.map((r) => [r.label, r.value]) }, 'c4')}
        <section class="card c8" aria-labelledby="h-attn"><div class="card-h"><div><h3 id="h-attn">Needs attention</h3><p>Next best touch for each person, highest priority first</p></div><button class="btn sm" data-act="go" data-route="volunteers">View all</button></div>
          <div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Volunteer</th><th scope="col">Why</th><th scope="col">Health</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td><div class="person"><span class="avatar sm">${esc(initials(r.v.name))}</span><button class="nm" data-act="open-vol" data-id="${r.v.id}">${esc(r.v.name)}</button></div></td>
            <td class="wrap"><b>${esc(MY.ACTION_LABELS[r.action.kind])}</b> <span class="muted">· ${esc(r.action.why)}</span></td><td>${statusHTML(r.health)}</td>
            <td class="num"><button class="btn sm" data-act="quick-msg" data-id="${r.v.id}" data-template="${ACTION_TEMPLATE[r.action.kind]}">Draft</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nothing waiting.</td></tr>'}
          </tbody></table></div></div></section>
        <section class="card c4" aria-labelledby="h-up"><div class="card-h"><div><h3 id="h-up">Upcoming events</h3><p>RSVPs vs capacity</p></div><button class="btn sm" data-act="go" data-route="events">Manage</button></div>
          <div class="card-b">${upcoming.map((e) => `<div class="up-ev"><div class="up-row"><span><b>${esc(MY.fmtDate(e.date))}</b> · ${esc(e.title)}</span><span class="num">${e.rsvps.length}/${e.capacity}</span></div>${CH.meter(e.rsvps.length, e.capacity)}</div>`).join('') || '<p class="empty">No upcoming events.</p>'}</div></section>
      </div>`;
  }
  // What the participation chart plots for each KPI tile.
  const METRICS = {
    active: { title: 'Participation', sub: (p) => `Unique attendees per ${p}, first visit vs returning`, kind: 'col', unit: '', series: [{ key: 'returning', label: 'Returning', color: 'var(--s1)' }, { key: 'first', label: 'First visit', color: 'var(--s2)' }] },
    signups: { title: 'New signups', sub: (p) => `People who signed up, per ${p}`, kind: 'col', unit: '', series: [{ key: 'signups', label: 'Signups', color: 'var(--s1)' }] },
    show: { title: 'Show rate', sub: (p) => `Share of RSVPs who came, per ${p}; gaps are ${p}s with no RSVPs`, kind: 'line', unit: '%', series: [{ key: 'show', label: 'Show rate', color: 'var(--s1)' }] },
    retention: { title: 'Returning share', sub: (p) => `Share of each ${p}’s attendees who had been before`, kind: 'line', unit: '%', series: [{ key: 'back', label: 'Returning share', color: 'var(--s1)' }] },
    hours: { title: 'Volunteer hours', sub: (p) => `Hours given at workdays, meetings, and workshops, per ${p}`, kind: 'col', unit: '', series: [{ key: 'hours', label: 'Hours', color: 'var(--s1)' }] },
    referrals: { title: 'Referral signups', sub: (p) => `Signups that came from a friend’s referral, per ${p}`, kind: 'col', unit: '', series: [{ key: 'referrals', label: 'Referral signups', color: 'var(--s1)' }] },
  };
  const hiddenOf = (id) => ui.hidden[id] || (ui.hidden[id] = new Set());
  const worstStep = (fn) => { const c = fn.slice(1, -1).filter((s) => s.ofPrev != null); return c.length ? c.sort((a, b) => a.ofPrev - b.ofPrev)[0].label : null; };

  // ---------- Volunteers ----------
  function volRows() {
    const T = today();
    const V = ui.vol;
    let rows = MY.rosterRows(state, T);
    if (V.preset) rows = rows.filter((r) => V.preset.ids.has(r.v.id));
    if (V.seg === 'leads') rows = rows.filter((r) => r.v.lead);
    else if (V.seg !== 'all') rows = rows.filter((r) => r.health === V.seg);
    if (V.hood !== 'all') rows = rows.filter((r) => r.v.neighborhood === V.hood);
    if (V.tier !== 'all') rows = rows.filter((r) => r.tier.tier.id === V.tier);
    const q = V.q.trim().toLowerCase();
    if (q) rows = rows.filter((r) => `${r.v.name} ${r.v.email} ${r.v.neighborhood} ${(r.v.interests || []).join(' ')}`.toLowerCase().includes(q));
    const key = { name: (r) => r.v.name, visits: (r) => r.visits, hours: (r) => r.hours, last: (r) => r.last || '', points: (r) => r.points, signed: (r) => r.v.signedUpAt, health: (r) => MY.HEALTH.findIndex((h) => h[0] === r.health) }[V.sort];
    rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * V.dir || a.v.name.localeCompare(b.v.name); });
    return rows;
  }
  function pageVolunteers() {
    const T = today(), V = ui.vol;
    const hc = MY.healthCounts(state, T, { days: 90 });
    const segs = [['all', 'All', state.volunteers.length]].concat(MY.HEALTH.map(([id, l]) => [id, l, hc[id]])).concat([['leads', 'Crew leads', state.volunteers.filter((v) => v.lead).length]]);
    const rows = volRows();
    const per = 25, pages = Math.max(1, Math.ceil(rows.length / per));
    V.page = Math.min(V.page, pages - 1);
    const pageRows = rows.slice(V.page * per, V.page * per + per);
    const th = (k, l, num) => `<th scope="col"${num ? ' class="num"' : ''} aria-sort="${V.sort === k ? (V.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-act="sort" data-key="${k}">${esc(l)}${V.sort === k ? (V.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
    const allSel = pageRows.length && pageRows.every((r) => V.sel.has(r.v.id));
    return `${pageHead(`${state.volunteers.length} people · ${hc.active} active in the last 30 days`, `<button class="btn" data-act="panel" data-panel="import">Import CSV</button><button class="btn" data-act="export-roster">Export</button><button class="btn primary" data-act="panel" data-panel="add">Add volunteer</button>`)}
      ${ui.panel === 'import' ? `<section class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>Import signups</h3><p>Paste a Google Forms, listserv, or Partiful CSV export. Headers are matched loosely. Existing people are merged, not duplicated.</p></div><button class="btn ghost sm" data-act="panel" data-panel="">Close</button></div>
        <div class="card-b"><label for="csv-in" class="sr-only">CSV</label><textarea id="csv-in" rows="5" placeholder="Timestamp,Name,Email,Phone,Neighborhood,Interests,How did you hear about us?,Preferred contact"></textarea><div class="actions" style="margin-top:8px"><button class="btn primary" data-act="import-csv">Import</button></div></div></section>` : ''}
      ${ui.panel === 'add' ? `<section class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>Add volunteer</h3></div><button class="btn ghost sm" data-act="panel" data-panel="">Close</button></div>
        <form class="card-b" data-form="add-vol"><div class="form-grid">
          <div class="field"><label for="nv-name">Name</label><input id="nv-name" name="name" type="text" required></div>
          <div class="field"><label for="nv-email">Email</label><input id="nv-email" name="email" type="email"></div>
          <div class="field"><label for="nv-phone">Phone</label><input id="nv-phone" name="phone" type="tel"></div>
          <div class="field"><label for="nv-hood">Neighborhood</label><select id="nv-hood" name="neighborhood">${opt(MY.NEIGHBORHOODS.map((n) => [n, n]), MY.NEIGHBORHOODS[0])}</select></div>
          <div class="field"><label for="nv-src">Source</label><select id="nv-src" name="source">${opt(MY.SOURCES.map((n) => [n, n]), 'Monthly meeting')}</select></div>
          <div class="field"><label for="nv-int">Interests</label><input id="nv-int" name="interests" type="text" placeholder="seeds, plants"></div>
        </div><p style="display:flex;gap:14px;margin:10px 0">${[['email', 'Email OK'], ['sms', 'Text OK'], ['whatsapp', 'WhatsApp OK']].map(([k, l]) => `<label style="font-weight:500"><input type="checkbox" name="ch-${k}"> ${l}</label>`).join('')}</p>
        <button class="btn primary" type="submit">Add volunteer</button></form></section>` : ''}
      ${V.preset ? `<div class="preset" role="status"><span>Showing <b>${V.preset.ids.size}</b> ${V.preset.ids.size === 1 ? 'person' : 'people'} from <b>${esc(V.preset.label)}</b></span><button class="btn sm" data-act="clear-preset">${IC.x}Show everyone</button></div>` : ''}
      <div class="tabs" role="tablist" aria-label="Segments">${segs.map(([id, l, n]) => `<button role="tab" aria-selected="${V.seg === id}" data-act="vol-seg" data-seg="${id}">${esc(l)}<span class="count">${n}</span></button>`).join('')}</div>
      ${V.sel.size ? `<div class="bulk" role="region" aria-label="Bulk actions"><span>${V.sel.size} selected</span><button class="btn sm" data-act="bulk-msg" data-channel="email">Email</button><button class="btn sm" data-act="bulk-msg" data-channel="sms">Text</button><button class="btn sm" data-act="bulk-msg" data-channel="whatsapp">WhatsApp</button><button class="btn ghost sm" data-act="bulk-clear">Clear</button></div>` : ''}
      <section class="card">
        <div class="toolbar"><label for="vol-q" class="sr-only">Filter</label><input id="vol-q" type="search" placeholder="Filter by name, email, interest" value="${esc(V.q)}" style="flex:1;max-width:320px">
          <label for="vol-hood" class="sr-only">Neighborhood</label><select id="vol-hood" data-change="vol-hood">${opt([['all', 'All neighborhoods']].concat(MY.NEIGHBORHOODS.map((n) => [n, n])), V.hood)}</select>
          <label for="vol-tier" class="sr-only">Tier</label><select id="vol-tier" data-change="vol-tier">${opt([['all', 'All tiers']].concat(MY.TIERS.map((t) => [t.id, t.name])), V.tier)}</select>
          <span class="muted" style="margin-left:auto">${rows.length} results</span></div>
        <div class="tbl-wrap"><table class="tbl nowrap"><thead><tr><th scope="col"><input type="checkbox" aria-label="Select page" data-act="sel-page"${allSel ? ' checked' : ''}></th>
          ${th('name', 'Volunteer')}${th('health', 'Health')}<th scope="col">Tier</th>${th('points', 'Seeds', true)}${th('visits', 'Visits', true)}${th('hours', 'Hours', true)}${th('last', 'Last visit')}<th scope="col">Neighborhood</th><th scope="col">Source</th><th scope="col">Reach</th><th scope="col">Next step</th></tr></thead>
          <tbody>${pageRows.map((r) => `<tr class="${V.sel.has(r.v.id) ? 'sel' : ''}"><td><input type="checkbox" aria-label="Select ${esc(r.v.name)}" data-act="sel" data-id="${r.v.id}"${V.sel.has(r.v.id) ? ' checked' : ''}></td>
            <td><div class="person"><span class="avatar sm">${esc(initials(r.v.name))}</span><div><button class="nm" data-act="open-vol" data-id="${r.v.id}">${esc(r.v.name)}</button>${r.v.lead ? ' <span class="pill mint">Lead</span>' : ''}<div class="em">${esc(r.v.email || r.v.phone || 'no contact')}</div></div></div></td>
            <td>${statusHTML(r.health)}</td><td>${tierHTML(r.tier)}</td><td class="num">${r.points}</td><td class="num">${r.visits}</td><td class="num">${r.hours}</td>
            <td class="tabular">${r.last ? esc(MY.fmtDate(r.last)) : '<span class="muted">–</span>'}</td><td>${esc(r.v.neighborhood)}</td><td>${esc(r.v.source || '–')}</td><td>${reachHTML(r.v)}</td>
            <td>${r.action ? `<button class="btn sm" data-act="quick-msg" data-id="${r.v.id}" data-template="${ACTION_TEMPLATE[r.action.kind]}" title="${esc(r.action.why)}">${esc(ACTION_SHORT[r.action.kind])}</button>` : '<span class="muted">–</span>'}</td></tr>`).join('') || '<tr><td colspan="12" class="empty">No volunteers match.</td></tr>'}</tbody></table></div>
        <div class="pager"><span>${rows.length ? `${V.page * per + 1}–${Math.min(rows.length, V.page * per + per)} of ${rows.length}` : '0'}</span><span class="actions"><button class="btn sm" data-act="page" data-dir="-1"${V.page ? '' : ' disabled'}>Previous</button><button class="btn sm" data-act="page" data-dir="1"${V.page < pages - 1 ? '' : ' disabled'}>Next</button></span></div>
      </section>`;
  }

  // ---------- Events & Crews ----------
  function pageEvents() {
    const T = today();
    const sorted = state.events.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const past = sorted.filter((e) => e.date < T).slice(-12);
    const upcoming = sorted.filter((e) => e.date >= T);
    if (!ui.eventId || !state.events.some((e) => e.id === ui.eventId)) ui.eventId = (upcoming.find((e) => e.type === 'workday') || upcoming[0] || past[past.length - 1] || {}).id;
    const e = state.events.find((x) => x.id === ui.eventId);
    const data = past.map((x) => {
      const came = x.attended.filter((id) => x.rsvps.includes(id)).length;
      return { label: MY.fmtDate(x.date).replace(/^\w+, /, ''), came, walkin: x.attended.length - came, noshow: x.rsvps.length - came };
    });
    const series = [{ key: 'came', label: 'RSVP’d and came', color: 'var(--s1)' }, { key: 'walkin', label: 'Walk-in', color: 'var(--s2)' }, { key: 'noshow', label: 'No-show', color: 'var(--s3)' }];
    const list = upcoming.concat(past.slice().reverse()).slice(0, 14);
    let detail = '';
    if (e) {
      const isPast = e.date <= T;
      const people = e.rsvps.map(vol).filter(Boolean).concat(isPast ? e.attended.filter((id) => !e.rsvps.includes(id)).map(vol).filter(Boolean) : []);
      const plan = ui.plan && ui.plan.eventId === e.id ? ui.plan : e.crews;
      const addable = state.volunteers.filter((v) => !e.rsvps.includes(v.id)).sort((a, b) => a.name.localeCompare(b.name));
      detail = `<section class="card c12" aria-labelledby="h-ev"><div class="card-h"><div><h3 id="h-ev">${esc(e.title)} · ${esc(MY.fmtDate(e.date))}</h3><p>${e.rsvps.length} RSVPs · capacity ${e.capacity}${isPast ? ` · ${e.attended.length} attended` : ''}</p></div>
        <div class="card-tools"><button class="btn sm" data-act="event-msg" data-template="${isPast ? 'thank' : 'remind'}">${isPast ? 'Thank attendees' : 'Remind RSVPs'}</button></div></div>
        <div class="card-b"><div class="grid">
          <div class="c6"><h4 style="margin:0 0 6px;font-size:12.5px">${isPast ? 'Check-in (awards Seeds automatically)' : 'RSVPs'}</h4>
            <div class="tbl-wrap" style="max-height:300px;overflow-y:auto"><table class="tbl"><tbody>${people.map((v) => `<tr><td><div class="person"><span class="avatar sm">${esc(initials(v.name))}</span><button class="nm" data-act="open-vol" data-id="${v.id}">${esc(v.name)}</button></div></td>
              <td>${isPast ? `<label style="font-weight:500"><input type="checkbox" data-change="attend" data-id="${v.id}"${e.attended.includes(v.id) ? ' checked' : ''}> Attended</label>` : `<button class="btn ghost sm" data-act="unrsvp" data-id="${v.id}">Remove</button>`}</td></tr>`).join('') || '<tr><td class="empty">No RSVPs yet.</td></tr>'}</tbody></table></div>
            <div class="actions" style="margin-top:8px"><label for="add-rsvp" class="sr-only">Add RSVP</label><select id="add-rsvp" style="flex:1">${opt(addable.map((v) => [v.id, v.name]), '')}</select><button class="btn sm" data-act="add-rsvp">Add ${isPast ? 'attendee' : 'RSVP'}</button></div></div>
          <div class="c6"><h4 style="margin:0 0 6px;font-size:12.5px">Crews</h4>
            ${e.type === 'workday' ? `${(e.projects || []).length ? '' : '<button class="btn sm" data-act="use-projects">Use OPC project areas</button>'}
              ${(e.projects || []).length ? `<p class="muted" style="margin:0 0 8px;font-size:12px">${e.projects.map((p) => esc(p.area)).join(' · ')}</p><button class="btn primary sm" data-act="form-crews"${e.rsvps.length ? '' : ' disabled'}>Form crews from ${e.rsvps.length} RSVPs</button>` : ''}
              ${plan ? `<div style="margin-top:10px">${plan.warnings.map((w) => `<p class="ck-warn" style="margin:2px 0;font-size:12px">${IC.warn}${esc(w)}</p>`).join('')}
                <div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Crew</th><th scope="col">Anchor</th><th scope="col">Members</th></tr></thead><tbody>${plan.crews.map((c) => `<tr><td>${esc(c.project.area)}</td><td>${c.anchor ? esc(c.anchor.name) : '<span class="ck-warn">none</span>'}</td><td class="wrap">${c.members.map((m) => esc(m.name) + (m.isNew ? ' <span class="pill mint">new</span>' : '')).join(', ') || '–'}</td></tr>`).join('')}</tbody></table></div>
                <div class="actions" style="margin-top:8px">${plan === e.crews ? '<span class="pill mint">Saved</span>' : '<button class="btn sm" data-act="save-crews">Save crews</button>'}<button class="btn sm" data-act="crew-msg">Send crew assignments</button></div></div>` : ''}`
              : '<p class="muted">Crews are for workdays.</p>'}</div>
        </div></div></section>`;
    }
    return `${pageHead('Workdays, meetings, and workshops at the Oakland Peace Center', `<button class="btn" data-act="export-ics">Export calendar (.ics)</button><button class="btn primary" data-act="panel" data-panel="event">New event</button>`)}
      ${ui.panel === 'event' ? `<section class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>New event</h3></div><button class="btn ghost sm" data-act="panel" data-panel="">Close</button></div>
        <form class="card-b" data-form="add-event"><div class="form-grid">
          <div class="field"><label for="ne-title">Title</label><input id="ne-title" name="title" type="text" value="Saturday garden workday" required></div>
          <div class="field"><label for="ne-date">Date</label><input id="ne-date" name="date" type="date" value="${MY.nextWeekday(T, 6, 1)}" required></div>
          <div class="field"><label for="ne-type">Type</label><select id="ne-type" name="type">${opt([['workday', 'Workday'], ['meeting', 'Monthly meeting'], ['workshop', 'Workshop']], 'workday')}</select></div>
          <div class="field"><label for="ne-cap">Capacity</label><input id="ne-cap" name="capacity" type="number" value="30" min="1"></div>
          <div class="field"><label for="ne-partner">Co-host</label><select id="ne-partner" name="partner"><option value="">None</option>${opt(state.partners.map((p) => [p.id, p.name]), '')}</select></div>
        </div><div class="actions" style="margin-top:10px"><button class="btn primary" type="submit">Create event</button></div></form></section>` : ''}
      <div class="grid">
        ${card('attendance', 'Attendance by event', 'Last 12 events', CH.columns({ id: 'attendance', data, series, hidden: hiddenOf('attendance'), height: 220, title: 'Attendance by event' }),
          { cols: ['Event', 'RSVP’d and came', 'Walk-in', 'No-show'], rows: data.map((d) => [d.label, d.came, d.walkin, d.noshow]) }, 'c7')}
        <section class="card c5" aria-labelledby="h-evl"><div class="card-h"><div><h3 id="h-evl">Events</h3><p>Upcoming first</p></div></div><div class="card-b flush"><div class="tbl-wrap" style="max-height:290px;overflow-y:auto"><table class="tbl"><thead><tr><th scope="col">Date</th><th scope="col">Event</th><th scope="col" class="num">RSVPs</th><th scope="col" class="num">Show</th></tr></thead><tbody>
          ${list.map((x) => { const came = x.attended.filter((id) => x.rsvps.includes(id)).length; return `<tr class="${x.id === ui.eventId ? 'sel' : ''}"><td class="tabular">${esc(MY.fmtDate(x.date))}</td><td><button class="nm" style="all:unset;cursor:pointer;color:var(--forest-ink)" data-act="pick-event" data-id="${x.id}">${esc(x.title.replace(/ \(.*\)/, ''))}</button></td><td class="num" ${CH.tip(`<strong>${esc(x.title)}</strong><div>${x.rsvps.length} of ${x.capacity} spots</div>`)}>${x.rsvps.length}/${x.capacity}</td><td class="num">${x.date < T && x.rsvps.length ? `${Math.round((came / x.rsvps.length) * 100)}%` : '–'}</td></tr>`; }).join('')}
        </tbody></table></div></div></section>
        ${detail}
      </div>`;
  }

  // ---------- Messages ----------
  function defaultCompose(opts) {
    const tpl = MY.TEMPLATES.find((t) => t.id === ((opts && opts.template) || 'welcome')) || MY.TEMPLATES[0];
    return Object.assign({ seg: 'unwelcomed', ids: null, channel: 'email', template: tpl.id, subject: tpl.subject, body: tpl.body, preview: 0, sentVia: null }, opts || {}, { subject: (opts && opts.subject) || tpl.subject, body: (opts && opts.body) || tpl.body });
  }
  function composeIds() {
    const c = ui.compose;
    return c.ids ? c.ids : MY.segmentIds(state, today(), c.seg);
  }
  function pageMessages() {
    const tabs = [['compose', 'Compose'], ['campaigns', 'Campaigns'], ['outbox', 'Outbox'], ['templates', 'Templates'], ['integrations', 'Integrations']];
    let body = '';
    if (ui.msgTab === 'compose') body = composeHTML();
    if (ui.msgTab === 'campaigns') body = campaignsHTML();
    if (ui.msgTab === 'outbox') body = outboxHTML();
    if (ui.msgTab === 'templates') body = `<div class="int-grid">${MY.TEMPLATES.map((t) => `<section class="card int"><h3>${esc(t.name)}</h3><p class="muted" style="margin:2px 0 6px">${esc(t.subject)}</p><p>${esc(t.body.slice(0, 180))}${t.body.length > 180 ? '…' : ''}</p><button class="btn sm" data-act="use-template" data-id="${t.id}">Use template</button></section>`).join('')}</div>`;
    if (ui.msgTab === 'integrations') body = integrationsHTML();
    return `${pageHead('Email, text, and WhatsApp volunteers, only on channels they agreed to', `<button class="btn primary" data-act="msg-tab" data-tab="compose">New message</button>`)}
      <div class="tabs" role="tablist" aria-label="Messages">${tabs.map(([id, l]) => `<button role="tab" aria-selected="${ui.msgTab === id}" data-act="msg-tab" data-tab="${id}">${esc(l)}${id === 'outbox' ? `<span class="count">${state.outbox.length}</span>` : ''}</button>`).join('')}</div>${body}`;
  }
  function composeHTML() {
    if (!ui.compose) ui.compose = defaultCompose();
    const c = ui.compose, T = today();
    const ids = composeIds();
    const built = MY.buildMessages(state, T, { ids, channel: c.channel, subject: c.subject, body: c.body, sender: state.settings.sender });
    c.built = built;
    const pv = built.messages[Math.min(c.preview, Math.max(0, built.messages.length - 1))];
    const seg = c.channel === 'email' ? null : MY.smsSegments(pv ? pv.body : c.body);
    const findings = [];
    built.messages.forEach((m) => m.findings.forEach((f) => { if (!findings.some((x) => x.rule === f.rule)) findings.push(f); }));
    const provider = c.channel === 'email' ? ui.server.email : c.channel === 'sms' ? ui.server.sms : null;
    const canProvider = ui.server.available && provider && built.messages.length && !built.blocked;
    const personalized = /\{\{/.test(c.body + c.subject);
    let links = '';
    if (built.messages.length && !built.blocked) {
      if (c.channel === 'email') {
        const ls = personalized || built.messages.length === 1 ? built.messages.map((m) => [m.name, MY.mailtoLinks([m.to], m.subject, m.body)[0]]) : MY.mailtoLinks(built.messages.map((m) => m.to), built.messages[0].subject, built.messages[0].body).map((l, i) => [`Batch ${i + 1} (BCC)`, l]);
        links = ls.map(([n, l]) => `<li><span>${esc(n)}</span><a href="${esc(l)}" data-act="link-used">Open in Mail</a></li>`).join('');
      } else {
        links = built.messages.map((m) => `<li><span>${esc(m.name)} · ${esc(m.to)}</span><a href="${esc(c.channel === 'sms' ? MY.smsLink(m.to, m.body) : MY.waLink(m.to, m.body))}" target="_blank" rel="noopener" data-act="link-used">${c.channel === 'sms' ? 'Open in Messages' : 'Open WhatsApp'}</a></li>`).join('');
      }
    }
    const audLabel = c.ids ? `Selected people (${c.ids.length})` : MY.label(MY.SEGMENTS, c.seg);
    return `<div class="compose">
      <section class="card"><div class="card-h"><div><h3>Message</h3><p>Merge fields fill in per person</p></div></div><div class="card-b">
        <div class="form-grid" style="grid-template-columns:1fr 1fr">
          <div class="field"><label for="c-seg">Audience</label><select id="c-seg" data-change="c-seg">${c.ids ? `<option value="__sel" selected>${esc(audLabel)}</option>` : ''}${opt(MY.SEGMENTS, c.ids ? '' : c.seg)}</select></div>
          <div class="field"><label for="c-tpl">Template</label><select id="c-tpl" data-change="c-tpl">${opt(MY.TEMPLATES.map((t) => [t.id, t.name]).concat([['custom', 'Custom']]), c.template)}</select></div>
        </div>
        <div class="field" style="margin-top:10px"><span id="ch-label" style="font-size:12.5px;font-weight:600;color:var(--ink-2)">Channel</span><div class="seg" role="group" aria-labelledby="ch-label">${[['email', 'Email'], ['sms', 'Text (SMS)'], ['whatsapp', 'WhatsApp']].map(([k, l]) => `<button data-act="c-channel" data-ch="${k}" aria-pressed="${c.channel === k}">${l}</button>`).join('')}</div></div>
        ${c.channel === 'email' ? `<div class="field" style="margin-top:10px"><label for="c-subject">Subject</label><input id="c-subject" type="text" value="${esc(c.subject)}"></div>` : ''}
        <div class="field" style="margin-top:10px"><label for="c-body">Body</label><textarea id="c-body" rows="8">${esc(c.body)}</textarea></div>
        <div class="merge" aria-label="Insert merge field">${MY.MERGE_FIELDS.map((m) => `<button type="button" data-act="merge" data-f="${m}">{{${m}}}</button>`).join('')}</div>
      </div></section>
      <section class="card"><div class="card-h"><div><h3>Review & send</h3><p>${esc(audLabel)}</p></div></div><div class="card-b">
        <div class="mini-kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px"><div><b>${built.messages.length}</b><span>will receive</span></div><div><b>${built.excluded.length}</b><span>excluded (no consent)</span></div><div><b>${seg ? seg.segments : '—'}</b><span>${seg ? `SMS segment${seg.segments === 1 ? '' : 's'} · ${seg.encoding}` : 'email'}</span></div></div>
        ${pv ? `<div class="field"><label for="c-prev">Preview as</label><select id="c-prev" data-change="c-prev">${opt(built.messages.map((m, i) => [i, `${m.name} · ${m.to}`]), c.preview)}</select></div>
          ${pv.subject ? `<p style="margin:8px 0 4px;font-size:12.5px"><b>Subject:</b> ${esc(pv.subject)}</p>` : ''}<div class="preview ${c.channel !== 'email' ? 'sms' : ''}" style="margin-top:8px">${esc(pv.body)}</div>` : '<p class="empty">No one in this audience can receive this channel.</p>'}
        <h4 style="margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">Checks</h4>
        <ul class="checks">
          <li class="ck-ok">${IC.ok}Consent: only people who agreed to ${esc(c.channel === 'sms' ? 'texts' : c.channel)} are included</li>
          ${built.excluded.length ? `<li class="ck-warn">${IC.warn}${built.excluded.length} excluded: ${esc(Object.entries(built.excluded.reduce((m, x) => { m[x.reason] = (m[x.reason] || 0) + 1; return m; }, {})).map(([r, n]) => `${n} ${r.toLowerCase()}`).join(', '))}</li>` : ''}
          ${built.unknown.length ? `<li class="ck-block">${IC.block}Unknown merge field: ${esc(built.unknown.join(', '))}</li>` : ''}
          ${findings.length ? findings.map((f) => `<li class="${f.severity === 'block' ? 'ck-block' : 'ck-warn'}">${f.severity === 'block' ? IC.block : IC.warn}${esc(MY.RULE_LABELS[f.rule])}: “${esc(f.excerpt)}”. ${esc(f.fix)}</li>`).join('') : `<li class="ck-ok">${IC.ok}Content: no promises, private addresses, or pressure language</li>`}
          ${seg && seg.segments > 2 ? `<li class="ck-warn">${IC.warn}${seg.segments} SMS segments per person; shorter texts cost less and read better</li>` : ''}
        </ul>
        <div class="actions" style="margin-top:14px">
          <button class="btn primary" data-act="send-provider"${canProvider && !built.unknown.length ? '' : ' disabled'}>Send via ${esc(provider || (c.channel === 'whatsapp' ? 'WhatsApp app' : 'provider'))}${canProvider && ui.server.dryRun[c.channel] ? ' (dry run)' : ''}</button>
          <button class="btn" data-act="copy-all"${built.messages.length ? '' : ' disabled'}>Copy all</button>
        </div>
        ${!ui.server.available && c.channel !== 'whatsapp' ? '<p class="muted" style="font-size:12px;margin:6px 0 0">Sending through Resend or Twilio goes through the hub server; without their keys in the hub’s <code>.env</code> it logs a dry run instead of sending (see Integrations). For now, open each message in your own app:</p>' : ''}
        ${links ? `<ul class="links">${links}</ul><div class="actions" style="margin-top:8px"><button class="btn sm" data-act="mark-sent">Mark ${built.messages.length} as sent</button></div>` : ''}
        ${c.sentVia ? `<p class="ck-ok" style="margin-top:8px">${IC.ok}Logged ${esc(c.sentVia)}</p>` : ''}
      </div></section></div>`;
  }
  function campaignsHTML() {
    const cs = state.campaigns.filter((c) => c.channel === 'email' && c.delivered).slice(0, 8).reverse();
    const data = cs.map((c) => ({ label: c.name.length > 14 ? `${c.name.slice(0, 13)}…` : c.name, open: Math.round((c.opened / c.delivered) * 100), click: Math.round((c.clicked / c.delivered) * 100) }));
    return `<div class="grid">${card('camp-perf', 'Email engagement', 'Open and click rate by campaign', CH.lines({ id: 'camp-perf', data, series: [{ key: 'open', label: 'Open rate', color: 'var(--s1)' }, { key: 'click', label: 'Click rate', color: 'var(--s2)' }], hidden: hiddenOf('camp-perf'), unit: '%', height: 210, title: 'Email engagement' }),
      { cols: ['Campaign', 'Open rate', 'Click rate'], rows: data.map((d) => [d.label, `${d.open}%`, `${d.click}%`]) }, 'c12')}
      <section class="card c12"><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Campaign</th><th scope="col">Channel</th><th scope="col">Sent</th><th scope="col">Via</th><th scope="col" class="num">Recipients</th><th scope="col" class="num">Delivered</th><th scope="col" class="num">Opened</th><th scope="col" class="num">Clicked</th><th scope="col">Status</th></tr></thead><tbody>
      ${state.campaigns.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.channel)}</td><td class="tabular">${esc(MY.fmtDate(c.sentAt))}</td><td>${esc(c.via)}</td><td class="num">${c.recipients}</td><td class="num">${c.delivered == null ? '–' : c.delivered}</td><td class="num">${c.opened == null ? '–' : `${Math.round((c.opened / c.delivered) * 100)}%`}</td><td class="num">${c.clicked == null ? '–' : `${Math.round((c.clicked / (c.delivered || c.recipients)) * 100)}%`}</td><td><span class="pill">${esc(c.status)}</span></td></tr>`).join('')}
      </tbody></table></div></div></section></div>`;
  }
  function outboxHTML() {
    return `<section class="card"><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Date</th><th scope="col">To</th><th scope="col">Channel</th><th scope="col">Via</th><th scope="col">Message</th><th scope="col">Status</th></tr></thead><tbody>
      ${state.outbox.slice(0, 200).map((o) => `<tr><td class="tabular">${esc(MY.fmtDate(o.date))}</td><td>${esc(o.name)}<div class="em muted" style="font-size:11.5px">${esc(o.to)}</div></td><td>${esc(o.channel)}</td><td>${esc(o.via)}</td><td class="wrap">${esc((o.subject ? `${o.subject} · ` : '') + o.body.slice(0, 90))}…</td><td><span class="pill">${esc(o.status)}</span></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nothing sent yet. Messages you send or hand off appear here.</td></tr>'}
      </tbody></table></div></div></section>`;
  }
  function integrationsHTML() {
    const S = ui.server;
    const srv = (ch) => (S.available ? (S.dryRun[ch] ? '<span class="conn off"><i></i>Dry run · no key in .env</span>' : '<span class="conn on"><i></i>Connected · live</span>') : '<span class="conn off"><i></i>Hub server not reached</span>');
    const I = (logo, name, status, desc, action) => `<section class="card int"><header><span class="logo">${logo}</span><div><h3>${esc(name)}</h3>${status}</div></header><p>${esc(desc)}</p>${action || ''}</section>`;
    const on = '<span class="conn on"><i></i>Built in</span>';
    return `<div class="int-grid">
      ${I('@', 'Email app', on, 'Opens your own mail app with each message filled in (mailto). Group sends use BCC batches of 40.', '')}
      ${I('T', 'Text messages', on, 'Opens Messages on your phone or Mac with the text ready to send (sms: links).', '')}
      ${I('W', 'WhatsApp', on, 'Click-to-chat links (wa.me) with the message prefilled, one per person.', '')}
      ${I('R', 'Resend · email API', srv('email'), 'Send personalized email from the Guild’s address. Put RESEND_API_KEY and RESEND_FROM in the hub’s .env, then restart npm run dev.', '')}
      ${I('Tw', 'Twilio · SMS API', srv('sms'), 'Send texts from a Guild number. Put TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM in the hub’s .env, then restart npm run dev.', '')}
      ${I('G', 'Google Forms / Sheets', '<span class="conn on"><i></i>Ready</span>', 'Import signups from the listserv Google Form export (CSV).', '<button class="btn sm" data-act="go-import">Import CSV</button>')}
      ${I('P', 'Partiful', '<span class="conn on"><i></i>Ready</span>', 'Import a guest list CSV to add RSVPs and new people.', '<button class="btn sm" data-act="go-import">Import CSV</button>')}
      ${I('M', 'Mailchimp', '<span class="conn on"><i></i>Ready</span>', 'Export an audience CSV (email-consented people only) for newsletters.', '<button class="btn sm" data-act="export-mailchimp">Export audience</button>')}
      ${I('31', 'Google Calendar', '<span class="conn on"><i></i>Ready</span>', 'Subscribe-ready .ics file of upcoming workdays, meetings, and workshops.', '<button class="btn sm" data-act="export-ics">Export .ics</button>')}
    </div>
    <section class="card" style="margin-top:14px"><div class="card-h"><div><h3>Provider setup</h3><p>Keys live in the hub’s <code>.env</code>. Without them, sends run as a dry run: logged, not delivered.</p></div></div>
      <div class="card-b"><pre class="preview code"># permaculture-hub/.env
RESEND_API_KEY=…
RESEND_FROM="EBPG &lt;hello@your-domain.org&gt;"
TWILIO_ACCOUNT_SID=…
TWILIO_AUTH_TOKEN=…
TWILIO_FROM=+15105550100
OPENROUTER_API_KEY=…      # or GEMINI_API_KEY / OPENAI_API_KEY, for the AI tools

# then restart the hub
npm run dev</pre></div></section>`;
  }

  // ---------- Rewards ----------
  function pageRewards() {
    const T = today();
    const rw = MY.rewardsSummary(state, T);
    const sproutPlus = rw.people.filter((p) => p.t.index >= 1).length;
    const refCame = rw.referrers.reduce((s, r) => s + r.came, 0);
    const series = MY.REWARD_CATEGORIES.map((c, i) => ({ key: c, label: c, color: CAT[i] }));
    const data = rw.byMonth.map((m) => Object.assign({ label: new Date(Date.UTC(+m.month.slice(0, 4), +m.month.slice(5, 7) - 1, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) }, m));
    const lead = rw.challenge[0];
    const publicRefs = rw.referrers.filter((r) => r.v.publicRecognition).slice(0, 6);
    return `${pageHead('Seeds: recognition for showing up, bringing neighbors, and leading', `<button class="btn" data-act="msg-almost">Message ${rw.almost.length} close to next tier</button><button class="btn primary" data-act="msg-referral">Launch bring-a-neighbor</button>`)}
      <div class="kpis k4">${simpleKpi('Seeds earned (all time)', fmtN(rw.issued), 'from attendance, streaks, referrals, leading')}${simpleKpi('Sprout tier or higher', fmtN(sproutPlus), `${Math.round((sproutPlus / Math.max(1, rw.people.length)) * 100)}% of volunteers`)}${simpleKpi('Referrals who showed up', fmtN(refCame), 'each earns the referrer +25 Seeds')}${simpleKpi(`Leading neighborhood · ${rw.quarter}`, lead ? lead.name : '–', lead ? `${fmtN(lead.points)} Seeds this quarter` : '')}</div>
      <div class="grid">
        ${card('tiers', 'Members by tier', 'Seed 0 · Sprout 50 · Root 150 · Canopy 300', CH.hbars(rw.tierCounts.map((t, i) => ({ label: t.tier.name, value: t.count, color: TIER_COLOR[i], tip: `${t.count} people` }))),
          { cols: ['Tier', 'People'], rows: rw.tierCounts.map((t) => [t.tier.name, t.count]) }, 'c4')}
        ${card('earned', 'Seeds earned by month', 'By how they were earned', CH.columns({ id: 'earned', data, series, hidden: hiddenOf('earned'), height: 220, title: 'Seeds earned by month' }),
          { cols: ['Month'].concat(MY.REWARD_CATEGORIES), rows: data.map((d) => [d.label].concat(MY.REWARD_CATEGORIES.map((c) => d[c]))) }, 'c8')}
        ${card('challenge', `Neighborhood challenge · ${rw.quarter}`, 'Team totals: every member’s Seeds count toward their neighborhood', CH.hbars(rw.challenge.slice(0, 8).map((h) => ({ label: h.name, value: h.points, tip: `${h.points} Seeds` }))),
          { cols: ['Neighborhood', 'Seeds'], rows: rw.challenge.map((h) => [h.name, h.points]) }, 'c6')}
        <section class="card c6" aria-labelledby="h-almost"><div class="card-h"><div><h3 id="h-almost">Almost there</h3><p>Within 15 Seeds of the next tier: one workday away</p></div><button class="btn sm" data-act="msg-almost">Message all</button></div>
          <div class="card-b flush"><div class="tbl-wrap" style="max-height:268px;overflow-y:auto"><table class="tbl"><thead><tr><th scope="col">Volunteer</th><th scope="col">Now</th><th scope="col">Next</th><th scope="col" class="num">To go</th></tr></thead><tbody>
          ${rw.almost.slice(0, 20).map((p) => `<tr><td><div class="person"><span class="avatar sm">${esc(initials(p.v.name))}</span><button class="nm" data-act="open-vol" data-id="${p.v.id}">${esc(p.v.name)}</button></div></td><td>${tierHTML(p.t)} <span class="muted num">${p.points}</span></td><td>${esc(p.t.next.name)}</td><td class="num">${p.t.toNext}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No one is close right now.</td></tr>'}
          </tbody></table></div></div></section>
        <section class="card c5" aria-labelledby="h-refs"><div class="card-h"><div><h3 id="h-refs">Top referrers</h3><p>Opted in to public recognition</p></div></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Volunteer</th><th scope="col">Code</th><th scope="col" class="num">Invited</th><th scope="col" class="num">Came</th></tr></thead><tbody>
          ${publicRefs.map((r) => `<tr><td><button class="nm" style="all:unset;cursor:pointer;font-weight:600" data-act="open-vol" data-id="${r.v.id}">${esc(r.v.name)}</button></td><td class="tabular">${esc(MY.referralCode(r.v))}</td><td class="num">${r.invited}</td><td class="num">${r.came}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No referrals yet.</td></tr>'}
          </tbody></table></div></div></section>
        <section class="card c7" aria-labelledby="h-rules"><div class="card-h"><div><h3 id="h-rules">How Seeds are earned</h3><p>Points come from what people did. Never bought, never cash.</p></div></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Action</th><th scope="col">Category</th><th scope="col" class="num">Seeds</th></tr></thead><tbody>
          ${MY.EARN_RULES.map((r) => `<tr><td>${esc(r.label)}</td><td><span class="pill">${esc(r.category)}</span></td><td class="num">+${r.points}</td></tr>`).join('')}</tbody></table></div></div></section>
        <div class="c12"><div class="tiers">${MY.TIERS.map((t, i) => `<div class="tier-card" style="--c:${TIER_COLOR[i]}"><h4>${esc(t.name)}</h4><span class="min">${t.min}+ Seeds · ${rw.tierCounts[i].count} people</span><ul>${t.perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`).join('')}</div></div>
      </div>`;
  }

  // ---------- GTM Partnerships ----------
  function pagePartners() {
    const T = today();
    const rows = MY.partnerRows(state, T);
    const impact = MY.partnerImpact(state, T);
    const pf = MY.partnerFunnel(state);
    const deep = pf.find((s) => s.id === 'co-hosted').count;
    const via = impact.reduce((s, x) => s + x.referred, 0);
    const cohosted = impact.reduce((s, x) => s + x.cohosted, 0);
    const matches = MY.boardMatches(state).filter((m) => m.score > 0).slice(0, 4);
    const imp = impact.filter((x) => x.referred || x.attendees).sort((a, b) => b.referred - a.referred);
    return `${pageHead('Other groups are partners, not competitors for volunteers', `<button class="btn primary" data-act="panel" data-panel="partner">Add partner</button>`)}
      ${ui.panel === 'partner' ? `<section class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>Add partner group</h3></div><button class="btn ghost sm" data-act="panel" data-panel="">Close</button></div><form class="card-b" data-form="add-partner"><div class="form-grid">
        <div class="field"><label for="np-name">Name</label><input id="np-name" name="name" type="text" required></div><div class="field"><label for="np-route">How you know them</label><input id="np-route" name="route" type="text"></div>
        <div class="field"><label for="np-focus">Focus</label><input id="np-focus" name="focus" type="text" placeholder="seeds, food"></div><div class="field"><label for="np-stage">Relationship</label><select id="np-stage" name="stage">${opt(MY.PARTNER_STAGES, 'aware')}</select></div>
        </div><div class="actions" style="margin-top:10px"><button class="btn primary" type="submit">Add</button></div></form></section>` : ''}
      ${discoveryHTML()}
      <div class="kpis k4">${simpleKpi('Partner groups', state.partners.length, 'from Guild materials and agendas')}${simpleKpi('Co-hosted or deeper', deep, `${state.partners.length - deep} still at aware/connected`)}${simpleKpi('Co-hosted events', cohosted, 'in the last 12 months')}${simpleKpi('Volunteers via partners', via, 'signups with source “Partner org”')}</div>
      <div class="grid">
        ${card('pfunnel', 'Partnership funnel', 'Groups at or beyond each stage', CH.funnel(pf.map((s, i) => ({ label: s.label, count: s.count, ofPrev: i && pf[i - 1].count ? Math.round((s.count / pf[i - 1].count) * 100) : null }))),
          { cols: ['Stage', 'Groups'], rows: pf.map((s) => [s.label, s.count]) }, 'c5')}
        ${card('pimpact', 'Volunteers sourced by partner', 'Signups attributed to each partner group', CH.hbars(imp.map((x) => ({ label: x.p.name, value: x.referred, tip: `${x.referred} volunteers · ${x.cohosted} co-hosted events · ${x.attendees} attendees` }))),
          { cols: ['Partner', 'Volunteers', 'Co-hosted events', 'Attendees'], rows: imp.map((x) => [x.p.name, x.referred, x.cohosted, x.attendees]) }, 'c7')}
        <section class="card c12" aria-labelledby="h-plist"><div class="card-h"><div><h3 id="h-plist">Partner pipeline</h3><p>Each relationship has a next play that deepens it</p></div></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Partner</th><th scope="col">Stage</th><th scope="col">Focus</th><th scope="col">Last touch</th><th scope="col" class="num">Co-hosted</th><th scope="col" class="num">Volunteers</th><th scope="col">Next play</th></tr></thead><tbody>
          ${rows.map((r) => { const im = impact.find((x) => x.p.id === r.p.id); return `<tr><td><button class="nm" style="all:unset;cursor:pointer;font-weight:600" data-act="open-partner" data-id="${r.p.id}">${esc(r.p.name)}</button><div class="muted" style="font-size:11.5px">${esc(r.p.route)}</div></td>
            <td><span class="pill mint">${esc(MY.label(MY.PARTNER_STAGES, r.p.stage))}</span></td><td>${(r.p.focus || []).map((t) => `<span class="pill">${esc(t)}</span>`).join(' ') || '<span class="muted">unknown</span>'}</td>
            <td class="tabular">${r.quiet == null ? '<span class="ck-warn">never</span>' : `${r.quiet}d ago`}</td><td class="num">${im.cohosted}</td><td class="num">${im.referred}</td><td>${r.next ? `<button class="btn sm" data-act="open-partner" data-id="${r.p.id}">${esc(r.next.title)}</button>` : '–'}</td></tr>`; }).join('')}
          </tbody></table></div></div></section>
        <section class="card c6" aria-labelledby="h-no"><div class="card-h"><div><h3 id="h-no">Needs & offers matches</h3><p>Matched against offers, volunteer skills, and partner focus</p></div></div><div class="card-b">
          ${matches.map((m) => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(m.need.text)}</b> <span class="muted">· ${esc(m.need.who.name)}</span><div style="font-size:12.5px;color:var(--ink-2);margin-top:3px">${[m.offers.length ? `Offer: ${m.offers.map((o) => esc(o.item.who.name)).join(', ')}` : '', m.volunteers.length ? `${m.volunteers.length} volunteers with ${esc([...new Set(m.volunteers.flatMap((v) => v.shared))].join(', '))}` : '', m.partners.length ? `Partners: ${esc(m.partners.map((p) => p.name).join(', '))}` : ''].filter(Boolean).join(' · ')}</div></div>`).join('') || '<p class="empty">No open matches.</p>'}</div></section>
        <section class="card c6" aria-labelledby="h-plays"><div class="card-h"><div><h3 id="h-plays">Collaboration plays</h3><p>From first intro to coalition</p></div></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Play</th><th scope="col">Moves from</th><th scope="col">Effort</th></tr></thead><tbody>
          ${MY.PLAYS.map((p) => `<tr><td>${esc(p.title)}</td><td>${esc(MY.label(MY.PARTNER_STAGES, p.from))} → ${esc(MY.label(MY.PARTNER_STAGES, p.to))}</td><td>${esc(p.effort)}</td></tr>`).join('')}</tbody></table></div></div></section>
      </div>`;
  }
  function pageSites() {
    const T = today();
    const rows = MY.siteRows(state, T);
    const sf = MY.siteFunnel(state);
    const live = rows.filter((r) => ['active', 'steward-led'].includes(r.s.stage)).length;
    const stale = rows.filter((r) => r.stale).length;
    const open = rows.filter((r) => !['paused', 'declined'].includes(r.s.stage));
    const avg = open.length ? Math.round(open.reduce((s, r) => s + r.score.score, 0) / open.length) : 0;
    const cols = MY.SITE_STAGES.concat([['closed', 'Paused / declined']]);
    return `${pageHead('Places that could host a garden, seed library, or workdays', `<button class="btn primary" data-act="panel" data-panel="site">Add site</button>`)}
      ${ui.panel === 'site' ? `<section class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>Add site</h3></div><button class="btn ghost sm" data-act="panel" data-panel="">Close</button></div><form class="card-b" data-form="add-site"><div class="form-grid">
        <div class="field"><label for="ns-name">Name</label><input id="ns-name" name="name" type="text" required></div><div class="field"><label for="ns-type">Type</label><select id="ns-type" name="type">${opt(MY.SITE_TYPES, 'faith')}</select></div>
        <div class="field"><label for="ns-hood">Neighborhood</label><input id="ns-hood" name="neighborhood" type="text"></div><div class="field"><label for="ns-route">Way in</label><input id="ns-route" name="route" type="text"></div>
        </div><p><label style="font-weight:500"><input type="checkbox" name="isPrivate"> Private land: neighborhood only in anything public</label></p><button class="btn primary" type="submit">Add site</button></form></section>` : ''}
      <div class="kpis k4">${simpleKpi('Sites in pipeline', open.length, 'excluding paused / declined')}${simpleKpi('Live sites', live, 'active or steward-led')}${simpleKpi('Average fit score', avg, 'out of 100')}${simpleKpi('Follow-ups due', stale, 'quiet 14+ days in outreach')}</div>
      <div class="grid">
        ${card('sfunnel', 'Site funnel', 'Sites at or beyond each stage', CH.funnel(sf.map((s, i) => ({ label: s.label, count: s.count, ofPrev: i && sf[i - 1].count ? Math.round((s.count / sf[i - 1].count) * 100) : null }))),
          { cols: ['Stage', 'Sites'], rows: sf.map((s) => [s.label, s.count]) }, 'c5')}
        ${card('sfit', 'Fit score by site', 'Growing space, anchor, water, access, mission fit, plus nearby volunteers', CH.hbars(open.slice().sort((a, b) => b.score.score - a.score.score).map((r) => ({ label: r.s.name, value: r.score.score, max: 100, sub: MY.label(MY.SITE_STAGES, r.s.stage), tip: `${r.score.score}/100 · ${r.score.nearby} volunteers nearby` })), { max: 100 }),
          { cols: ['Site', 'Fit', 'Stage'], rows: open.map((r) => [r.s.name, r.score.score, MY.label(MY.SITE_STAGES, r.s.stage)]) }, 'c7')}
        <section class="card c12" aria-labelledby="h-kb"><div class="card-h"><div><h3 id="h-kb">Pipeline</h3><p>Click a site for fit details, outreach note, and stage updates</p></div></div><div class="card-b"><div class="kanban">
          ${cols.map(([id, l]) => { const inCol = rows.filter((r) => (id === 'closed' ? ['paused', 'declined'].includes(r.s.stage) : r.s.stage === id)); return `<div class="kcol"><h4><span>${esc(l)}</span><span>${inCol.length}</span></h4>${inCol.map((r) => `<button class="kcard" data-act="open-site" data-id="${r.s.id}"><b>${esc(r.s.name)}</b><span>${esc(MY.label(MY.SITE_TYPES, r.s.type))} · ${esc(r.s.neighborhood)}</span><div style="margin-top:4px;display:flex;gap:6px;align-items:center"><span class="score">${r.score.score}</span>${r.stale ? '<span class="ck-warn" style="font-size:11px">${IC.warn}follow up</span>' : ''}</div></button>`).join('')}</div>`; }).join('')}
        </div></div></section>
      </div>`;
  }

  // ---------- Growth Plan ----------
  function pageFunnel() {
    const T = today(), f = ui.gf;
    const mf = MY.marketFunnel(state, T, f);
    const sfn = MY.sourceFunnel(state, T, f);
    const pf = MY.partnerFunnel(state), sf = MY.siteFunnel(state);
    const b = mf.bottleneck;
    const heatRows = sfn.map((r) => ({ label: r.label, size: r.signups, cells: [r.first, r.back, r.regular] }));
    return `${pageHead('Where people come from, and where they drop off', '')}
      ${filterRow()}
      ${b ? `<div class="callout leak" style="margin-bottom:14px"><span class="ico" aria-hidden="true">${IC.down}</span><div><h3>Biggest drop: ${esc(mf.steps[mf.steps.indexOf(b) - 1].label)} → ${esc(b.label)}</h3><p>${b.ofPrev}% make it through this step. ${fmtN(b.lost)} people were lost here in the last ${rangeLabel()}. The 30/60/90 plan starts here.</p></div><button class="btn sm" data-act="go" data-route="plan" style="margin-left:auto">Open plan</button></div>` : ''}
      <div class="grid">
        ${card('mfunnel', 'Current market funnel', `Reach is an estimate (editable below); every other step is measured · last ${rangeLabel()}`, `<div class="funnel big">${CH.funnel(mf.steps, { bottleneck: b && b.label, skipFirst: true })}</div><p class="muted" style="font-size:12px;margin:10px 0 0">Reach → signup: ${mf.steps[1].ofTop}% of an estimated ${fmtN(mf.reach.net)} people reached (${fmtN(mf.reach.gross)} gross, minus ${Math.round(MY.REACH_OVERLAP * 100)}% overlap). The reach bar is not to scale.</p>`,
          { cols: ['Step', 'People', '% of previous', 'Lost'], rows: mf.steps.map((s) => [s.label, s.count, s.ofPrev == null ? '–' : `${s.ofPrev}%`, s.lost]) }, 'c8')}
        <section class="card c4" aria-labelledby="h-reach"><div class="card-h"><div><h3 id="h-reach">Reach estimates</h3><p>Replace these sample numbers with the Guild’s own</p></div></div><div class="card-b"><form data-form="reach">
          ${state.growth.reach.map((r) => `<div style="display:grid;grid-template-columns:1fr 96px;gap:8px;align-items:center;margin-bottom:6px"><label for="reach-${r.id}" style="font-weight:500">${esc(r.label)}</label><input id="reach-${r.id}" name="${r.id}" type="number" min="0" value="${r.value}" class="num" style="text-align:right"></div>`).join('')}
          <div class="actions" style="margin-top:8px"><button class="btn sm" type="submit">Update funnel</button></div></form></div></section>
        ${card('srcfunnel', 'Funnel by source', 'Which channels bring people who stay', CH.heatmap(heatRows, { cols: ['First visit', 'Came back', 'Regular'], rowHead: 'Source', sizeHead: 'Signups' }), null, 'c12')}
        ${card('pf2', 'Partnership funnel', 'Groups at or beyond each stage', CH.funnel(pf.map((s, i) => ({ label: s.label, count: s.count, ofPrev: i && pf[i - 1].count ? Math.round((s.count / pf[i - 1].count) * 100) : null }))), { cols: ['Stage', 'Groups'], rows: pf.map((s) => [s.label, s.count]) }, 'c6')}
        ${card('sf2', 'Site funnel', 'Sites at or beyond each stage', CH.funnel(sf.map((s, i) => ({ label: s.label, count: s.count, ofPrev: i && sf[i - 1].count ? Math.round((s.count / sf[i - 1].count) * 100) : null }))), { cols: ['Stage', 'Sites'], rows: sf.map((s) => [s.label, s.count]) }, 'c6')}
      </div>`;
  }
  function pagePlan() {
    const T = today(), f = ui.gf;
    const mf = MY.marketFunnel(state, T, f);
    const ks = MY.kpis(state, T, f);
    const plan = MY.growthPlan(mf, ks);
    const get = (id) => ks.find((k) => k.id === id);
    const targets = [
      ['Show rate', get('show').value, get('show').value == null ? null : Math.min(95, get('show').value + 8), '%'],
      ['Retention (prior-period attendees)', get('retention').value, get('retention').value == null ? null : Math.min(95, get('retention').value + 7), '%'],
      [`New signups (${rangeLabel()})`, get('signups').value, Math.round((get('signups').value || 0) * 1.2), ''],
      ['Referral signups', get('referrals').value, Math.max(3, Math.round((get('referrals').value || 0) * 2)), ''],
      ['Partners co-hosted or deeper', MY.partnerFunnel(state)[2].count, MY.partnerFunnel(state)[2].count + 2, ''],
      ['Live sites', MY.siteFunnel(state)[6].count, MY.siteFunnel(state)[6].count + 1, ''],
    ];
    return `${pageHead('Aimed at the biggest leak in the funnel. Targets are experiments, not promises.', `<button class="btn" data-act="go" data-route="funnel">View funnel</button>`)}
      ${plan.focus ? `<div class="callout leak" style="margin-bottom:14px"><span class="ico" aria-hidden="true">1</span><div><h3>Focus: ${esc(plan.focus.theme)}</h3><p>${esc(plan.focus.step)} converts at ${plan.focus.rate}% (${fmtN(plan.focus.lost)} people lost in the last ${rangeLabel()}).</p></div></div>` : ''}
      <div class="grid">${plan.windows.map((w, i) => `<section class="card c4"><div class="card-h"><div><h3>${esc(w.window)}</h3><p>${esc(w.theme)}</p></div><span class="pill mint">${['Now', 'Next', 'Later'][i]}</span></div><div class="card-b"><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${w.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></section>`).join('')}
        <section class="card c6" aria-labelledby="h-tg"><div class="card-h"><div><h3 id="h-tg">Targets</h3><p>Current vs 90-day experiment target</p></div></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Metric</th><th scope="col" class="num">Current</th><th scope="col" class="num">Target</th><th scope="col" style="width:35%">Progress</th></tr></thead><tbody>
          ${targets.map(([l, cur, tgt, u]) => `<tr><td>${esc(l)}</td><td class="num">${cur == null ? '–' : `${cur}${u}`}</td><td class="num">${tgt == null ? '–' : `${tgt}${u}`}</td><td>${cur != null && tgt ? CH.meter(cur, tgt) : ''}</td></tr>`).join('')}</tbody></table></div></div></section>
        <section class="card c6" aria-labelledby="h-cp"><div class="card-h"><div><h3 id="h-cp">Channel plan</h3><p>The Guild’s real channels, mapped to funnel steps</p></div></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Step</th><th scope="col">Channels & moves</th><th scope="col">Measure</th></tr></thead><tbody>
          ${MY.CHANNEL_PLAN.map((r) => `<tr><td><b>${esc(r.stage)}</b></td><td class="wrap">${esc(r.channels)}</td><td class="wrap">${esc(r.measure)}</td></tr>`).join('')}</tbody></table></div></div></section>
      </div>`;
  }


  // ---------- AI helpers ----------
  const aiReady = () => ui.server.available && ui.server.ai && ui.server.ai.configured;
  function aiBlocker() {
    if (!ui.server.available) return 'These tools run through the hub server, which didn’t answer. Add an AI key to the hub’s <code>.env</code> (<code>OPENROUTER_API_KEY=…</code>, or a Gemini/OpenAI key) and restart <code>npm run dev</code>.';
    if (!ui.server.ai.configured) return 'The hub has no AI key yet. Add <code>OPENROUTER_API_KEY=…</code> (or <code>GEMINI_API_KEY</code> / <code>OPENAI_API_KEY</code>) to the hub’s <code>.env</code> and restart <code>npm run dev</code>.';
    return '';
  }
  async function aiPost(url, body) {
    const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  }
  const PLAY_LABEL = Object.fromEntries(MY.PLAYS.map((p) => [p.id, p.title]));

  function discoveryHTML() {
    const D = ui.disc;
    const runs = state.discoveries;
    const run = runs[Math.min(D.run, runs.length - 1)];
    const blocker = aiBlocker();
    let result = '';
    if (run) {
      const live = run.partners.filter((p) => p.status !== 'dismissed');
      const col = (pri, label) => {
        const items = live.filter((p) => p.priority === pri);
        return `<div class="kcol"><h4><span>${label}</span><span>${items.length}</span></h4>${items.map((p) => `<article class="kcard disc-card">
          <b>${esc(p.name)}</b><span>${esc(p.neighborhood || run.city)} · ${esc(p.category)}</span>
          <p>${esc(p.why_fit)}</p>
          <p class="muted"><strong>First play:</strong> ${esc(PLAY_LABEL[p.first_play] || p.first_play)} · ${esc(p.next_step)}</p>
          <div class="disc-foot"><span><a href="${esc(p.source_url)}" target="_blank" rel="noopener">Source ${IC.out}</a>${p.verified ? ` <span class="ck-ok" title="This site appeared in the web search results">${IC.ok}in search</span>` : ' <span class="muted" title="Not matched to a search result; check before reaching out">check</span>'}</span>${p.status === 'added' ? '<span class="pill mint">In pipeline</span>' : `<span><button class="btn sm" data-act="disc-add" data-i="${run.partners.indexOf(p)}">Add</button> <button class="btn ghost sm" data-act="disc-dismiss" data-i="${run.partners.indexOf(p)}" aria-label="Dismiss ${esc(p.name)}">${IC.x}</button></span>`}</div></article>`).join('') || '<p class="empty">None</p>'}</div>`;
      };
      result = `<div class="disc-head"><div><b>${esc(run.category)} · ${esc(run.city)}</b> <span class="muted">· ${esc(MY.fmtDate(run.at))} · ${esc(run.model)} · ${run.webSearch ? 'web-verified sources' : '<span class="ck-warn">not web-verified</span>'}</span></div>
        <div class="actions">${runs.length > 1 ? `<label for="disc-run" class="sr-only">Previous searches</label><select id="disc-run" data-change="disc-run">${opt(runs.map((r, i) => [i, `${r.category} · ${r.city} · ${MY.fmtDate(r.at)}`]), D.run)}</select>` : ''}<button class="btn sm" data-act="disc-add-high"${live.some((p) => p.priority === 'high' && p.status !== 'added') ? '' : ' disabled'}>Add all high priority</button></div></div>
        ${run.summary ? `<p class="disc-summary">${esc(run.summary)}</p>` : ''}
        <div class="kanban disc-board">${col('high', 'High priority')}${col('medium', 'Medium')}${col('low', 'Low')}</div>
        <p class="muted" style="font-size:12px;margin:8px 0 0">Found by a language model with web search. Open each source before reaching out. Added groups start at “Aware of each other”.</p>`;
    }
    return `<section class="card ai-card" style="margin-bottom:14px" aria-labelledby="h-disc"><div class="card-h"><div><h3 id="h-disc">Find groups to partner with</h3><p>Pick a city and a kind of group. Canopy searches the web and sorts what it finds into high, medium, and low priority.</p></div></div>
      <div class="card-b"><form data-form="discover" class="disc-form">
        <div class="field"><label for="disc-city">City</label><input id="disc-city" name="city" type="text" value="${esc(D.city)}" required></div>
        <div class="field"><label for="disc-cat">Partnership category</label><select id="disc-cat" name="category">${opt(MY.PARTNER_CATEGORIES.map((c) => [c, c]), D.category)}</select></div>
        <div class="field"><label for="disc-n">How many</label><select id="disc-n" name="count">${opt([[5, '5'], [8, '8'], [12, '12']], D.count)}</select></div>
        <div class="field" style="justify-content:flex-end"><button class="btn primary" type="submit"${D.busy || blocker ? ' disabled' : ''}>${D.busy ? 'Searching…' : `${IC.search}Search`}</button></div>
      </form>
      ${blocker ? `<p class="ai-note">${blocker}</p>` : ''}${D.error ? `<p class="ck-block" role="alert" style="margin:8px 0 0">${IC.block}${esc(D.error)}</p>` : ''}
      ${result}</div></section>`;
  }

  function recCard(r, i) {
    return `<article class="rec"><div class="rec-n">${i + 1}</div><div class="rec-b"><div class="rec-h"><h4>${esc(r.title)}</h4><span class="pill">${esc(r.effort)} effort</span></div>
      <p class="rec-why">${esc(r.why)}</p><ul>${(r.actions || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      <div class="rec-foot"><span class="muted">Watch: ${esc(r.metric)}</span>${PAGES[r.page] ? `<button class="btn sm" data-act="go" data-route="${r.page}">Open ${esc(TITLES[r.page][1])}</button>` : ''}</div></div></article>`;
  }
  function pageRecs() {
    const R = ui.recs;
    const base = MY.baselineRecommendations(state, today());
    const ai = state.aiRecs;
    const useAI = R.source === 'ai' && ai;
    const recs = useAI ? ai : base;
    const blocker = aiBlocker();
    return `${pageHead('How to grow volunteering and strengthen partnerships, grounded in this dashboard’s numbers', `<button class="btn" data-act="recs-generate"${R.busy || blocker ? ' disabled' : ''}>${R.busy ? 'Drafting…' : ai ? 'Redraft with a model' : 'Draft with a model'}</button>`)}
      <div class="filters"><span class="seg" role="group" aria-label="Recommendation source"><button data-act="recs-source" data-src="data" aria-pressed="${!useAI}">From your numbers</button><button data-act="recs-source" data-src="ai" aria-pressed="${!!useAI}"${ai ? '' : ' disabled'}>Model draft${ai ? ` · ${esc(MY.fmtDate(ai.at))}` : ''}</button></span>
        <span class="muted" style="font-size:12px;margin-left:auto">${useAI ? `Generated by ${esc(ai.model)} from aggregate stats and first names only` : 'Rules computed live from the funnel, health, sources, rewards, and partner data'}</span></div>
      ${blocker && !ai ? `<p class="ai-note" style="margin:0 0 14px">${blocker}</p>` : ''}${R.error ? `<p class="ck-block" role="alert">${IC.block}${esc(R.error)}</p>` : ''}
      ${useAI && ai.headline ? `<div class="callout" style="margin-bottom:14px"><span class="ico ai" aria-hidden="true">${IC.bubble}</span><div><h3>Headline</h3><p>${esc(ai.headline)}</p></div></div>` : ''}
      <div class="grid">
        <section class="card c6" aria-labelledby="h-rv"><div class="card-h"><div><h3 id="h-rv">Grow volunteering</h3><p>${recs.volunteer.length} recommendations, highest impact first</p></div></div><div class="card-b">${recs.volunteer.map(recCard).join('') || '<p class="empty">Nothing urgent.</p>'}</div></section>
        <section class="card c6" aria-labelledby="h-rp"><div class="card-h"><div><h3 id="h-rp">Improve partnerships</h3><p>${recs.partnership.length} recommendations, highest impact first</p></div></div><div class="card-b">${recs.partnership.map(recCard).join('') || '<p class="empty">Nothing urgent.</p>'}</div></section>
      </div>`;
  }

  function assistHTML() {
    const C = ui.chat;
    if (!C.open) return '';
    const blocker = aiBlocker();
    const msgs = state.chat;
    return `<aside class="assist" role="dialog" aria-labelledby="assist-title"><div class="assist-h"><h2 id="assist-title">${IC.bubble}Ask about this dashboard</h2>
      <div class="actions">${msgs.length ? '<button class="btn ghost sm" data-act="chat-clear">Clear</button>' : ''}<button class="icon-btn" data-act="toggle-assist" aria-label="Close">${IC.x}</button></div></div>
      <div class="assist-b" id="assist-log" aria-live="polite">
        ${msgs.length ? msgs.map((m) => `<div class="bubble ${m.role}">${m.role === 'assistant' ? MY.miniMarkdown(m.content) : esc(m.content)}</div>`).join('') : '<p class="muted" style="font-size:13px">Ask about volunteers, the funnel, Seeds, or partner groups. Answers are drafted by a language model from this dashboard’s numbers, so check them before acting.</p>'}
        ${C.busy ? '<div class="bubble assistant thinking">Thinking…</div>' : ''}${C.error ? `<p class="ck-block" role="alert">${IC.block}${esc(C.error)}</p>` : ''}
        ${blocker ? `<p class="ai-note">${blocker}</p>` : ''}
      </div>
      <div class="assist-sugg" aria-label="Suggested questions">${MY.SUGGESTED_QUESTIONS.map((q) => `<button type="button" class="chip" data-act="ask-suggested" data-q="${esc(q)}"${C.busy || blocker ? ' disabled' : ''}>${esc(q)}</button>`).join('')}</div>
      <form class="assist-f" data-form="ask"><label for="ask-in" class="sr-only">Your question</label><textarea id="ask-in" name="q" rows="2" placeholder="Ask a question…">${esc(C.draft)}</textarea><button class="btn primary" type="submit"${C.busy || blocker ? ' disabled' : ''}>Send</button></form>
      <p class="assist-privacy">Shares aggregate stats and first names with ${esc(ui.server.ai.label || 'the AI provider')}${ui.server.ai.model ? ` (${esc(ui.server.ai.model)})` : ''}, never emails or phone numbers.</p></aside>`;
  }
  async function askAI(q) {
    const C = ui.chat;
    q = String(q || '').trim();
    if (!q || C.busy) return;
    const history = state.chat.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    state.chat.push({ role: 'user', content: q });
    C.busy = true; C.error = null; C.draft = '';
    render(); scrollChat();
    try {
      const j = await aiPost('api/ai/ask', { question: q, history, context: MY.aiContext(state, today()) });
      state.chat.push({ role: 'assistant', content: j.answer || '(no answer)' });
      state.chat = state.chat.slice(-30);
    } catch (e) { C.error = e.message; }
    C.busy = false; save(); render(); scrollChat();
  }
  function scrollChat() { const l = $('#assist-log'); if (l) l.scrollTop = l.scrollHeight; }

  // ---------- Drawers ----------
  function drawerHTML() {
    const d = ui.drawer;
    if (!d) return '';
    const T = today();
    let head = '', body = '';
    if (d.type === 'vol') {
      const v = vol(d.id);
      if (!v) return '';
      const r = MY.rosterRows(state, T).find((x) => x.v.id === v.id);
      const ledger = MY.pointsLedger(v, state, T);
      const refs = state.volunteers.filter((x) => x.referredBy === v.id);
      const referrer = v.referredBy ? vol(v.referredBy) : null;
      head = `<span class="avatar lg">${esc(initials(v.name))}</span><div style="flex:1"><h2 id="drawer-title">${esc(v.name)}</h2><div style="display:flex;gap:10px;align-items:center;margin-top:2px">${statusHTML(r.health)}${tierHTML(r.tier)}${v.lead ? '<span class="pill mint">Crew lead</span>' : ''}</div></div>`;
      body = `<div class="actions" style="margin-bottom:14px"><button class="btn primary sm" data-act="vol-msg" data-ch="email"${v.channels.email && v.email ? '' : ' disabled'}>Email</button><button class="btn sm" data-act="vol-msg" data-ch="sms"${v.channels.sms && v.phone ? '' : ' disabled'}>Text</button><button class="btn sm" data-act="vol-msg" data-ch="whatsapp"${v.channels.whatsapp && v.phone ? '' : ' disabled'}>WhatsApp</button><button class="btn ghost sm" data-act="toggle-lead">${v.lead ? 'Remove lead' : 'Make crew lead'}</button></div>
        <div class="mini-kpis"><div><b>${r.visits}</b><span>visits</span></div><div><b>${r.hours}</b><span>hours</span></div><div><b>${r.points}</b><span>Seeds</span></div><div><b>${refs.length}</b><span>referred</span></div></div>
        <h4>Tier progress</h4>${r.tier.next ? `<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><span>${esc(r.tier.tier.name)}</span><span class="muted">${r.tier.toNext} Seeds to ${esc(r.tier.next.name)}</span></div><div class="progress"><span style="width:${Math.round(r.tier.progress * 100)}%"></span></div>` : '<p style="margin:0">Top tier reached. Thank you!</p>'}
        <h4>Attendance, last 26 weeks</h4>${CH.weeks(MY.activityWeeks(v, state, T, 26))}
        <h4>Contact & consent</h4><dl class="kv"><dt>Email</dt><dd>${esc(v.email || '–')}</dd><dt>Phone</dt><dd>${esc(v.phone || '–')}</dd>
          <dt>OK to contact</dt><dd>${[['email', 'Email'], ['sms', 'Text'], ['whatsapp', 'WhatsApp']].map(([k, l]) => `<label style="font-weight:500;margin-right:10px"><input type="checkbox" data-change="consent" data-k="${k}"${v.channels[k] ? ' checked' : ''}> ${l}</label>`).join('')}</dd>
          <dt>Recognition</dt><dd><label style="font-weight:500"><input type="checkbox" data-change="recog"${v.publicRecognition ? ' checked' : ''}> OK to show name on leaderboards</label></dd>
          <dt>Neighborhood</dt><dd>${esc(v.neighborhood)}</dd><dt>Source</dt><dd>${esc(v.source || '–')}${referrer ? ` · referred by <button class="nm" style="all:unset;cursor:pointer;color:var(--forest-ink);text-decoration:underline" data-act="open-vol" data-id="${referrer.id}">${esc(referrer.name)}</button>` : ''}</dd>
          <dt>Signed up</dt><dd>${esc(MY.fmtDate(v.signedUpAt))}</dd><dt>Referral code</dt><dd class="tabular"><b>${esc(MY.referralCode(v))}</b></dd><dt>Interests</dt><dd>${(v.interests || []).map((t) => `<span class="pill">${esc(t)}</span>`).join(' ') || '–'}</dd></dl>
        <h4>Seeds ledger</h4><ul class="timeline">${ledger.slice(-8).reverse().map((x) => `<li><span>${esc(MY.fmtDate(x.date))} · ${esc(x.reason)}</span><span>+${x.points}</span></li>`).join('') || '<li><span class="muted">No Seeds yet. The first visit earns +25.</span><span></span></li>'}</ul>
        <form data-form="award" style="display:flex;gap:6px;margin-top:10px"><label for="aw-pts" class="sr-only">Seeds</label><input id="aw-pts" name="points" type="number" value="30" min="1" max="200" style="width:80px"><label for="aw-why" class="sr-only">Reason</label><input id="aw-why" name="reason" type="text" placeholder="Taught a workshop" style="flex:1" required><button class="btn sm" type="submit">Award</button></form>`;
    }
    if (d.type === 'site') {
      const s = state.sites.find((x) => x.id === d.id);
      const r = MY.siteRows(state, T).find((x) => x.s.id === s.id);
      const draft = MY.draftSiteOutreach(s, { org: state.org, sender: state.settings.sender });
      head = `<div style="flex:1"><h2 id="drawer-title">${esc(s.name)}</h2><p class="muted" style="margin:2px 0 0">${esc(MY.label(MY.SITE_TYPES, s.type))} · ${esc(s.neighborhood)}${s.isPrivate ? ' · private land' : ''}</p></div><span class="score" style="font-size:14px">${r.score.score}</span>`;
      body = `<h4>Fit</h4>${MY.FIT_FACTORS.map(([k, l]) => `<div style="display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;margin-bottom:6px"><label for="fit-${k}" style="font-weight:500">${esc(l)}</label><select id="fit-${k}" data-change="fit" data-k="${k}">${opt([['0', '0 · none'], ['1', '1 · a little'], ['2', '2 · good'], ['3', '3 · great']], String(s.fit[k] || 0))}</select></div>`).join('')}
        <p class="muted" style="font-size:12px">${r.score.base} from the site + ${r.score.bonus} for ${r.score.nearby} volunteers nearby.</p>
        <h4>Next step</h4><p style="margin:0">${esc(r.next)}</p>
        <form data-form="site-move" style="display:flex;gap:6px;margin-top:10px"><label for="mv-st" class="sr-only">Stage</label><select id="mv-st" name="stage">${opt(MY.SITE_STAGES.concat(MY.SITE_CLOSED), s.stage)}</select><label for="mv-note" class="sr-only">Note</label><input id="mv-note" name="note" type="text" placeholder="What happened?" style="flex:1"><button class="btn sm" type="submit">Update</button></form>
        <h4>Outreach note</h4><div class="preview">${esc(draft.text)}</div>
        <div class="actions" style="margin-top:8px"><button class="btn sm" data-act="copy-text" data-text="${esc(draft.text)}">Copy</button><a class="btn sm" href="${esc(MY.mailtoLinks([''], `East Bay Permaculture Guild × ${s.name}`, draft.text)[0])}">Open in Mail</a></div>
        ${(s.history || []).length ? `<h4>History</h4><ul class="timeline">${s.history.slice().reverse().map((h) => `<li><span>${esc(MY.fmtDate(h.date))} · ${esc(MY.label(MY.SITE_STAGES.concat(MY.SITE_CLOSED), h.to))}${h.note ? ` · ${esc(h.note)}` : ''}</span><span></span></li>`).join('')}</ul>` : ''}`;
    }
    if (d.type === 'partner') {
      const p = state.partners.find((x) => x.id === d.id);
      const r = MY.partnerRows(state, T).find((x) => x.p.id === p.id);
      const play = MY.PLAYS.find((x) => x.id === (d.play || p.suggestedPlay || (r.next && r.next.id))) || MY.PLAYS[0];
      const draft = MY.draftPartnerMessage(p, play, { org: state.org, sender: state.settings.sender });
      head = `<div style="flex:1"><h2 id="drawer-title">${esc(p.name)}</h2><p class="muted" style="margin:2px 0 0">${esc(MY.label(MY.PARTNER_STAGES, p.stage))} · ${esc(p.route)}</p></div>`;
      body = `<dl class="kv"><dt>Source</dt><dd>${esc(p.source)}</dd><dt>Focus</dt><dd>${(p.focus || []).map((t) => `<span class="pill">${esc(t)}</span>`).join(' ') || esc(p.notes || '–')}</dd><dt>Last touch</dt><dd>${r.quiet == null ? 'Never logged' : `${r.quiet} days ago`}</dd></dl>
        <h4>Play</h4><label for="pl-sel" class="sr-only">Play</label><select id="pl-sel" data-change="partner-play" style="width:100%">${opt(MY.PLAYS.map((x) => [x.id, `${x.title} (${MY.label(MY.PARTNER_STAGES, x.from)})`]), play.id)}</select>
        <ol style="font-size:12.5px;color:var(--ink-2);padding-left:18px">${play.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        <h4>Draft ask</h4><div class="preview">${esc(draft.text)}</div>
        <div class="actions" style="margin-top:8px"><button class="btn sm" data-act="copy-text" data-text="${esc(draft.text)}">Copy</button></div>
        <h4>Log a conversation</h4><form data-form="partner-log" style="display:flex;gap:6px"><label for="pl-note" class="sr-only">Note</label><input id="pl-note" name="note" type="text" placeholder="What did you talk about?" style="flex:1"><label for="pl-stage" class="sr-only">Stage</label><select id="pl-stage" name="stage">${opt(MY.PARTNER_STAGES, p.stage)}</select><button class="btn sm" type="submit">Save</button></form>`;
    }
    return `<div class="scrim" data-act="close-drawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div class="drawer-h">${head}<button class="icon-btn" data-act="close-drawer" aria-label="Close">${IC.x}</button></div><div class="drawer-b">${body}</div></aside>`;
  }

  // ---------- render ----------
  // ---------- Hub sign-ups: volunteers who joined through Common Ground (/join) ----------
  // Lives on the hub server (/api/volunteer/admin/*), shared with each volunteer's dashboard.
  const hub = { data: null, loading: false, error: '', eventId: null };
  async function hubApi(path, body) {
    const r = await fetch(`/api/volunteer/admin/${path}`, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  }
  async function loadHub() {
    hub.loading = true;
    try { hub.data = await hubApi('overview'); hub.error = ''; } catch (e) { hub.error = e.message; }
    hub.loading = false;
    if (ui.route === 'signups') render();
  }
  async function hubAct(path, body, msg) {
    try { await hubApi(path, body); await loadHub(); if (msg) toast(msg); } catch (e) { toast(e.message); }
  }
  const hubDate = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  function pageSignups() {
    if (!hub.data && !hub.loading && !hub.error) loadHub();
    const head = pageHead('People who signed up on the Common Ground hub. Check them in at events to award Seeds, confirm the hours they log, and pack their shop rewards.', `<a class="btn" href="/join" target="_blank" rel="noreferrer">Open the sign-up page</a><button class="btn" data-act="hub-csv"${hub.data ? '' : ' disabled'}>Export CSV</button><button class="btn primary" data-act="hub-refresh">Refresh</button>`);
    if (!hub.data) return `${head}<section class="card"><div class="card-b"><p>${hub.error ? `${esc(hub.error)} <button class="btn sm" data-act="hub-refresh">Try again</button>` : 'Loading sign-ups…'}</p></div></section>`;
    const d = hub.data, vols = d.volunteers;
    const byId = Object.fromEntries(vols.map((v) => [v.id, v]));
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const pendingLogs = d.logs.filter((l) => l.status === 'pending');
    const openOrders = d.orders.filter((o) => o.status === 'requested' || o.status === 'ready');
    const ev = d.events.find((e) => e.id === hub.eventId) || d.events.find((e) => e.date >= today()) || d.events[0];
    const name = (v) => esc(`${v.firstName} ${v.lastName || ''}`.trim());
    const status = (s) => ({ requested: 'Requested', ready: 'Ready to hand out', 'picked-up': 'Picked up', cancelled: 'Cancelled', pending: 'Waiting', verified: 'Confirmed', declined: 'Declined' })[s] || s;
    return `${head}
      <div class="kpis k4">${simpleKpi('Hub volunteers', fmtN(vols.length), `${vols.filter((v) => v.createdAt > weekAgo).length} joined in the last 7 days`)}${simpleKpi('Came through a friend', fmtN(vols.filter((v) => v.referredByName).length), 'signed up with an invite code')}${simpleKpi('Hours to confirm', fmtN(pendingLogs.reduce((s, l) => s + l.hours, 0)), `${pendingLogs.length} entries · 2 Seeds per confirmed hour`)}${simpleKpi('Rewards to pack', fmtN(openOrders.length), 'hand out at the monthly meeting')}</div>
      <div class="grid">
        <section class="card c12" aria-labelledby="h-hubvols"><div class="card-h"><div><h3 id="h-hubvols">New volunteers</h3><p>Newest first. Contact them only on the channels they agreed to.</p></div></div>
          <div class="card-b flush"><div class="tbl-wrap" style="max-height:360px;overflow-y:auto"><table class="tbl"><thead><tr><th scope="col">Volunteer</th><th scope="col">Neighborhood</th><th scope="col">Interests</th><th scope="col">Joined</th><th scope="col">Contact</th><th scope="col" class="num">Hours</th><th scope="col" class="num">Seeds</th><th scope="col">Tier</th><th scope="col">Invited by</th></tr></thead><tbody>
          ${vols.length ? vols.map((v) => `<tr><td><div class="person"><span class="avatar sm">${esc(initials(`${v.firstName} ${v.lastName || ''}`))}</span><span>${name(v)}${v.note ? `<br><small class="muted">${esc(v.note)}</small>` : ''}</span></div></td><td>${esc(v.neighborhood)}</td><td>${esc((v.interests || []).join(', ') || '—')}</td><td class="tabular">${hubDate(v.createdAt)}</td><td>${v.consentEmail ? `<a href="mailto:${esc(v.email)}">${esc(v.email)}</a>` : `<span class="muted">${esc(v.email)} (no email consent)</span>`}${v.phone ? `<br><small>${esc(v.phone)}${v.consentSms ? ' · texts OK' : ''}</small>` : ''}</td><td class="num">${v.hours}</td><td class="num">${v.points}${v.balance !== v.points ? `<br><small class="muted">${v.balance} unspent</small>` : ''}</td><td>${esc(v.tier)}</td><td>${esc(v.referredByName || '—')}</td></tr>`).join('') : '<tr><td colspan="9">No sign-ups yet. Share the hub’s sign-up link at the next meeting.</td></tr>'}
          </tbody></table></div></div></section>
        <section class="card c7" aria-labelledby="h-hubev"><div class="card-h"><div><h3 id="h-hubev">Check-in</h3><p>Checking someone in awards Seeds on their dashboard: +15 first visit, then +10 workday, +5 meeting, +8 workshop. Their inviter gets +25 the first time.</p></div></div>
          <div class="card-b">${d.events.length ? `<label class="sr-only" for="hub-ev">Event</label><select id="hub-ev" data-change="hub-ev">${d.events.map((e) => `<option value="${e.id}"${ev && e.id === ev.id ? ' selected' : ''}>${esc(hubDate(e.date))} · ${esc(e.title)} · ${e.going.length} going</option>`).join('')}</select>
            ${ev ? `<p class="muted" style="margin:8px 0">${esc(ev.time || '')} · ${esc(ev.place || '')}${ev.capacity ? ` · ${ev.capacity} spots` : ''} <button class="btn sm" data-act="hub-archive" data-id="${ev.id}">Remove event</button></p>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Volunteer</th><th scope="col">RSVP</th><th scope="col">Here?</th></tr></thead><tbody>
            ${[...ev.going, ...vols.map((v) => v.id).filter((id) => !ev.going.includes(id))].map((id) => byId[id]).filter(Boolean).map((v) => { const here = ev.attended.includes(v.id); return `<tr><td>${name(v)}</td><td>${ev.going.includes(v.id) ? 'Going' : '<span class="muted">—</span>'}</td><td><button class="btn sm${here ? ' primary' : ''}" data-act="hub-checkin" data-vol="${v.id}" data-ev="${ev.id}" data-present="${here ? 'false' : 'true'}" aria-pressed="${here}">${here ? 'Checked in' : 'Check in'}</button></td></tr>`; }).join('') || '<tr><td colspan="3">No volunteers yet.</td></tr>'}
            </tbody></table></div>` : ''}` : '<p>No events yet. Publish one below.</p>'}</div></section>
        <section class="card c5" aria-labelledby="h-hubnew"><div class="card-h"><div><h3 id="h-hubnew">Publish an event</h3><p>Shows on every volunteer’s dashboard for RSVPs.</p></div></div>
          <div class="card-b"><form data-form="hub-event" class="form-grid hub-event-form">
            <label>Title<input name="title" required maxlength="80" placeholder="Sheet-mulch Saturday"></label>
            <label>Type<select name="kind"><option value="workday">Workday</option><option value="meeting">Meeting</option><option value="workshop">Workshop</option></select></label>
            <label>Date<input name="date" type="date" required></label>
            <label>Time<input name="time" maxlength="40" placeholder="9:30 AM–12:30 PM"></label>
            <label>Place<input name="place" maxlength="100" placeholder="Oakland Peace Center garden"></label>
            <label>Spots (0 = no limit)<input name="capacity" type="number" min="0" max="500" value="0"></label>
            <label>Event link (optional)<input name="url" type="url" placeholder="https://partiful.com/e/…"></label>
            <label>What to expect<textarea name="description" rows="2" maxlength="400"></textarea></label>
            <button class="btn primary" type="submit">Publish to volunteers</button></form></div></section>
        <section class="card c6" aria-labelledby="h-hublogs"><div class="card-h"><div><h3 id="h-hublogs">Logged hours to confirm</h3><p>Work volunteers did before joining or with partner groups. Confirmed hours earn 2 Seeds each.</p></div></div>
          <div class="card-b flush"><div class="tbl-wrap" style="max-height:300px;overflow-y:auto"><table class="tbl"><thead><tr><th scope="col">Volunteer</th><th scope="col">What</th><th scope="col">Date</th><th scope="col" class="num">Hours</th><th scope="col">Status</th></tr></thead><tbody>
          ${d.logs.length ? d.logs.slice(0, 50).map((l) => `<tr><td>${esc(l.volunteerName)}</td><td>${esc(l.activity)}${l.place ? `<br><small class="muted">${esc(l.place)}</small>` : ''}</td><td class="tabular">${hubDate(l.date)}</td><td class="num">${l.hours}</td><td>${l.status === 'pending' ? `<button class="btn sm primary" data-act="hub-log" data-vol="${l.volunteerId}" data-id="${l.id}" data-status="verified">Confirm</button> <button class="btn sm" data-act="hub-log" data-vol="${l.volunteerId}" data-id="${l.id}" data-status="declined">Decline</button>` : esc(status(l.status))}</td></tr>`).join('') : '<tr><td colspan="5">Nothing to review.</td></tr>'}
          </tbody></table></div></div></section>
        <section class="card c6" aria-labelledby="h-huborders"><div class="card-h"><div><h3 id="h-huborders">Shop rewards</h3><p>Requests paid in Seeds. Pack them, then hand them out at the meeting.</p></div></div>
          <div class="card-b flush"><div class="tbl-wrap" style="max-height:300px;overflow-y:auto"><table class="tbl"><thead><tr><th scope="col">Volunteer</th><th scope="col">Reward</th><th scope="col" class="num">Seeds</th><th scope="col">Status</th></tr></thead><tbody>
          ${d.orders.length ? d.orders.slice(0, 50).map((o) => `<tr><td>${esc(o.volunteerName)}</td><td>${esc(o.name)}<br><small class="muted">${hubDate(o.createdAt)}</small></td><td class="num">${o.price}</td><td>${o.status === 'requested' ? `<button class="btn sm primary" data-act="hub-order" data-vol="${o.volunteerId}" data-id="${o.id}" data-status="ready">Packed</button> <button class="btn sm" data-act="hub-order" data-vol="${o.volunteerId}" data-id="${o.id}" data-status="cancelled">Cancel</button>` : o.status === 'ready' ? `<button class="btn sm primary" data-act="hub-order" data-vol="${o.volunteerId}" data-id="${o.id}" data-status="picked-up">Handed out</button>` : esc(status(o.status))}</td></tr>`).join('') : '<tr><td colspan="4">No rewards requested yet.</td></tr>'}
          </tbody></table></div></div></section>
      </div>`;
  }

  const PAGES = { signups: pageSignups, overview: pageOverview, volunteers: pageVolunteers, events: pageEvents, messages: pageMessages, rewards: pageRewards, partners: pagePartners, sites: pageSites, funnel: pageFunnel, recs: pageRecs, plan: pagePlan };
  function renderNav() {
    const due = MY.rosterRows(state, today()).filter((r) => r.action && r.action.priority === 1).length;
    $('#nav').innerHTML = NAV.map(([sec, items]) => `<div class="nav-sec"><h2>${esc(sec)}</h2>${items.map(([id, l]) => `<a class="nav-link" href="#/${id}"${ui.route === id ? ' aria-current="page"' : ''}>${ui.route === id ? IC.leaf : ''}<svg viewBox="0 0 20 20" aria-hidden="true">${ICON[id]}</svg><span>${esc(l)}</span>${id === 'volunteers' && due ? `<span class="num-badge" aria-label="${due} urgent">${due}</span>` : ''}</a>`).join('')}</div>`).join('');
  }
  let animTimer;
  function render() {
    // One light theme: the hub header is light-only, so Canopy matches it (no dark toggle).
    document.documentElement.dataset.theme = 'light';
    renderNav();
    const content = $('#content');
    // Charts grow in only when their data changed (range, filter, metric, page), not on every click.
    if (ui.anim) { content.classList.add('anim'); clearTimeout(animTimer); animTimer = setTimeout(() => content.classList.remove('anim'), 520); ui.anim = false; }
    content.innerHTML = PAGES[ui.route]();
    $('#drawer-root').innerHTML = drawerHTML();
    $('#assist-root').innerHTML = assistHTML();
    $('#ask-btn').setAttribute('aria-expanded', String(ui.chat.open));
    $('#sample-chip').hidden = !state.volunteers.some((v) => v.sample);
    $('#sender').value = state.settings.sender || '';
    const chip = $('#server-chip');
    chip.hidden = !ui.server.available;
    chip.textContent = ui.server.available ? `Email ${ui.server.dryRun.email ? 'dry run' : 'live'} · SMS ${ui.server.dryRun.sms ? 'dry run' : 'live'}` : '';
    renderMe();
  }
  function renderMe() {
    const me = ui.me;
    const name = me && me.admin ? (me.name || 'Admin') : null;
    $('#me-btn').textContent = name ? (initials(name) || 'ME') : 'ME';
    $('#me-btn').setAttribute('aria-label', name ? `Account: ${name}` : 'Account');
    $('#me-name').textContent = name || 'Organizer';
    $('#me-role').textContent = me == null ? 'Sign-in not checked (offline preview)' : me.admin ? 'Signed in · hub admin' : 'Not signed in (preview mode)';
  }
  // go() updates state synchronously; the later hashchange is then a no-op.
  function route() {
    const r = (location.hash.match(/^#\/([a-z]+)/) || [])[1];
    const next = PAGES[r] ? r : 'overview';
    if (ui.rendered && next === ui.route) return;
    ui.route = next; ui.panel = null; ui.rendered = true; ui.anim = true;
    render();
  }
  function go(r, panel) {
    ui.route = PAGES[r] ? r : 'overview';
    ui.panel = panel || null;
    ui.rendered = true; ui.anim = true;
    if (location.hash !== `#/${ui.route}`) location.hash = `#/${ui.route}`;
    render();
  }
  function openCompose(opts, tab) {
    ui.compose = defaultCompose(opts);
    ui.msgTab = tab || 'compose';
    ui.drawer = null;
    go('messages');
  }

  // ---------- utils ----------
  async function copy(text) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); toast('Copied'); return; } } catch (_) { /* fallback */ }
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (_) { /* nothing else to try */ }
    ta.remove(); toast('Copied');
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Downloaded ${name}`);
  }
  const formData = (form) => { const o = {}; $$('input, select, textarea', form).forEach((el) => { if (el.name) o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); return o; };

  async function detectServer() {
    if (!/^https?:$/.test(location.protocol) || typeof fetch !== 'function') return;
    try {
      const r = await fetch('api/health', { credentials: 'same-origin' });
      if (!r.ok) return;
      const j = await r.json();
      ui.server = { available: true, email: j.email, sms: j.sms, dryRun: j.dryRun || { email: true, sms: true }, ai: j.ai || { configured: false, model: null } };
      render();
    } catch (_) { /* static hosting */ }
  }
  // The hub's admin session (GET /api/auth/me → { admin, name }) labels the account menu.
  async function detectAdmin() {
    if (!/^https?:$/.test(location.protocol) || typeof fetch !== 'function') return;
    try {
      const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
      ui.me = r.ok ? await r.json() : { admin: false };
    } catch (_) { ui.me = { admin: false }; }
    renderMe();
  }

  // ---------- actions ----------
  const ACT = {
    'hub-refresh': () => { hub.data = null; hub.error = ''; loadHub(); render(); },
    'hub-checkin': (el) => hubAct('checkin', { volunteerId: el.dataset.vol, eventId: el.dataset.ev, present: el.dataset.present === 'true' }, el.dataset.present === 'true' ? 'Checked in: Seeds awarded' : 'Check-in removed'),
    'hub-log': (el) => hubAct('log', { volunteerId: el.dataset.vol, logId: el.dataset.id, status: el.dataset.status }, el.dataset.status === 'verified' ? 'Hours confirmed: Seeds awarded' : 'Entry declined'),
    'hub-order': (el) => hubAct('order', { volunteerId: el.dataset.vol, orderId: el.dataset.id, status: el.dataset.status }, el.dataset.status === 'cancelled' ? 'Request cancelled and Seeds returned' : 'Reward updated'),
    'hub-archive': (el) => { if (confirm('Remove this event from volunteer dashboards?')) hubAct('archive', { eventId: el.dataset.id }, 'Event removed'); },
    'hub-csv': () => {
      const rows = [['First name', 'Last name', 'Email', 'Email OK', 'Phone', 'Texts OK', 'Neighborhood', 'Interests', 'Availability', 'Joined', 'Hours', 'Seeds', 'Tier', 'Invited by']].concat((hub.data ? hub.data.volunteers : []).map((v) => [v.firstName, v.lastName, v.email, v.consentEmail ? 'yes' : 'no', v.phone, v.consentSms ? 'yes' : 'no', v.neighborhood, (v.interests || []).join('; '), (v.availability || []).join('; '), v.createdAt.slice(0, 10), v.hours, v.points, v.tier, v.referredByName || '']));
      download('hub-signups.csv', rows.map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
    },
    go: (el) => go(el.dataset.route),
    range: (el) => { F().days = +el.dataset.days; ui.anim = true; render(); },
    kpi: (el) => { ui.metric = el.dataset.id; ui.anim = true; render(); const t = $(`.kpi[data-id="${el.dataset.id}"]`) || $('.kpi.on'); if (t && el.classList.contains('kpi')) t.focus(); },
    legend: (el, ev) => {
      const set = hiddenOf(el.dataset.chart), key = el.dataset.key;
      const keys = $$(`[data-act=legend][data-chart="${el.dataset.chart}"]`).map((b) => b.dataset.key);
      if (ev && (ev.shiftKey || ev.altKey)) { const only = set.size === keys.length - 1 && !set.has(key); set.clear(); if (!only) keys.forEach((k) => { if (k !== key) set.add(k); }); }
      else if (set.has(key)) set.delete(key);
      else if (set.size < keys.length - 1) set.add(key);
      else { toast('At least one series stays visible'); return; }
      ui.anim = true; render();
      const b = $(`[data-act=legend][data-chart="${el.dataset.chart}"][data-key="${key}"]`); if (b) b.focus();
    },
    people: (el) => {
      const T = today(), f = ui.f, kind = el.dataset.kind, key = el.dataset.key;
      let ids = [], label = '';
      if (kind === 'funnel') { const st = MY.funnelPeople(state, T, f)[+key]; ids = st.ids; label = `${st.label} · signed up in the last ${rangeLabel()}`; }
      if (kind === 'hood') { const g = MY.neighborhoodPeople(state, T, f).find((x) => x.label === key); ids = g ? g.ids : []; label = `${key} · active in the last ${rangeLabel()}`; }
      if (kind === 'source') { ids = MY.sourcePeople(state, T, f, key); label = `${key} · signups in the last ${rangeLabel()}`; }
      Object.assign(ui.vol, { preset: { label, ids: new Set(ids) }, seg: 'all', hood: 'all', tier: 'all', q: '', page: 0 });
      go('volunteers');
      window.scrollTo(0, 0); $('#content').focus({ preventScroll: true });
    },
    'clear-preset': () => { ui.vol.preset = null; ui.vol.page = 0; render(); },
    'health-seg': (el) => { Object.assign(ui.vol, { seg: el.dataset.seg, preset: null, page: 0 }); go('volunteers'); window.scrollTo(0, 0); $('#content').focus({ preventScroll: true }); },
    'sign-out': async () => {
      closeMenus();
      try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (_) { /* go home either way */ }
      location.href = '/';
    },
    'toggle-table': (el) => { ui.table[el.dataset.id] = !ui.table[el.dataset.id]; render(); },
    panel: (el) => { ui.panel = el.dataset.panel || null; render(); const first = $('#content form input, #content textarea'); if (first && ui.panel) first.focus(); },
    'open-vol': (el) => { ui.drawer = { type: 'vol', id: el.dataset.id }; render(); $('.drawer .icon-btn').focus(); },
    'open-site': (el) => { ui.drawer = { type: 'site', id: el.dataset.id }; render(); },
    'open-partner': (el) => { ui.drawer = { type: 'partner', id: el.dataset.id }; render(); },
    'close-drawer': () => { ui.drawer = null; render(); },
    'quick-msg': (el) => { const v = vol(el.dataset.id); openCompose({ ids: [v.id], channel: MY.pickChannel(v) || 'email', template: el.dataset.template }); },
    'vol-msg': (el) => openCompose({ ids: [ui.drawer.id], channel: el.dataset.ch, template: 'custom', subject: 'Hello from the Guild', body: 'Hi {{first_name}}, ' }),
    'toggle-lead': () => { const v = vol(ui.drawer.id); v.lead = !v.lead; commit(v.lead ? 'Marked as crew lead' : 'Lead role removed'); },
    'vol-seg': (el) => { ui.vol.seg = el.dataset.seg; ui.vol.page = 0; render(); },
    sort: (el) => { const V = ui.vol; if (V.sort === el.dataset.key) V.dir *= -1; else { V.sort = el.dataset.key; V.dir = ['name'].includes(V.sort) ? 1 : -1; } render(); },
    page: (el) => { ui.vol.page += +el.dataset.dir; render(); },
    sel: (el) => { const s = ui.vol.sel; if (s.has(el.dataset.id)) s.delete(el.dataset.id); else s.add(el.dataset.id); render(); },
    'sel-page': (el) => { const rows = volRows().slice(ui.vol.page * 25, ui.vol.page * 25 + 25); if (el.checked) rows.forEach((r) => ui.vol.sel.add(r.v.id)); else rows.forEach((r) => ui.vol.sel.delete(r.v.id)); render(); },
    'bulk-clear': () => { ui.vol.sel.clear(); render(); },
    'bulk-msg': (el) => openCompose({ ids: [...ui.vol.sel], channel: el.dataset.channel, template: 'event' }),
    'import-csv': () => {
      const { volunteers, skipped } = MY.parseSignups($('#csv-in').value, today());
      if (!volunteers.length) { toast('No rows with a name found'); return; }
      volunteers.forEach((v) => { if (!MY.SOURCES.includes(v.source)) v.source = v.source ? 'Partner org' : 'Listserv'; });
      const res = MY.mergeVolunteers(state.volunteers, volunteers);
      state.volunteers = res.list; ui.panel = null;
      commit(`Imported: ${res.added} new, ${res.merged} merged${skipped.length ? `, ${skipped.length} skipped` : ''}`);
    },
    'go-import': () => go('volunteers', 'import'),
    'export-roster': () => download(`ebpg-volunteers-${today()}.csv`, MY.toCSV(MY.rosterRows(state, today()), [
      ['name', (r) => r.v.name], ['email', (r) => r.v.email], ['phone', (r) => r.v.phone], ['neighborhood', (r) => r.v.neighborhood], ['source', (r) => r.v.source],
      ['health', (r) => HEALTH_LABEL[r.health]], ['tier', (r) => r.tier.tier.name], ['seeds', (r) => r.points], ['visits', (r) => r.visits], ['hours', (r) => r.hours], ['last_visit', (r) => r.last],
      ['ok_email', (r) => !!r.v.channels.email], ['ok_text', (r) => !!r.v.channels.sms], ['ok_whatsapp', (r) => !!r.v.channels.whatsapp]]), 'text/csv'),
    'export-mailchimp': () => download(`ebpg-mailchimp-${today()}.csv`, MY.mailchimpCSV(state), 'text/csv'),
    'export-ics': () => download('ebpg-events.ics', MY.eventsICS(state, today()), 'text/calendar'),
    'pick-event': (el) => { ui.eventId = el.dataset.id; ui.plan = null; render(); },
    'add-rsvp': () => { const id = $('#add-rsvp').value; const e = state.events.find((x) => x.id === ui.eventId); if (!id) return; e.rsvps.push(id); if (e.date <= today()) e.attended.push(id); e.crews = null; ui.plan = null; commit(e.date <= today() ? 'Checked in · Seeds awarded' : 'RSVP added'); },
    unrsvp: (el) => { const e = state.events.find((x) => x.id === ui.eventId); e.rsvps = e.rsvps.filter((x) => x !== el.dataset.id); e.crews = null; ui.plan = null; commit('RSVP removed'); },
    'use-projects': () => { state.events.find((x) => x.id === ui.eventId).projects = MY.clone(MY.OPC_PROJECTS); commit(); },
    'form-crews': () => { const e = state.events.find((x) => x.id === ui.eventId); ui.plan = MY.formCrews(e, state.volunteers, state.events); render(); },
    'save-crews': () => { state.events.find((x) => x.id === ui.eventId).crews = ui.plan; commit('Crews saved'); },
    'crew-msg': () => { const e = state.events.find((x) => x.id === ui.eventId); const plan = ui.plan || e.crews; openCompose({ ids: e.rsvps.slice(), channel: 'whatsapp', template: 'custom', subject: `Crews for ${MY.fmtDate(e.date)}`, body: plan.text }); },
    'event-msg': (el) => { const e = state.events.find((x) => x.id === ui.eventId); openCompose({ ids: (e.date <= today() ? e.attended : e.rsvps).slice(), channel: 'email', template: el.dataset.template }); },
    'msg-tab': (el) => { ui.msgTab = el.dataset.tab; if (el.dataset.tab === 'compose' && !ui.compose) ui.compose = defaultCompose(); if (ui.route !== 'messages') go('messages'); else render(); },
    'new-message': () => { closeMenus(); openCompose({}); },
    'new-volunteer': () => { closeMenus(); go('volunteers', 'add'); },
    'new-event': () => { closeMenus(); go('events', 'event'); },
    'use-template': (el) => openCompose({ template: el.dataset.id, seg: 'all' }),
    'c-channel': (el) => { ui.compose.channel = el.dataset.ch; ui.compose.preview = 0; ui.compose.sentVia = null; render(); },
    merge: (el) => {
      const ta = $('#c-body'); const tok = `{{${el.dataset.f}}}`;
      const s = ta.selectionStart || ta.value.length;
      ta.value = ta.value.slice(0, s) + tok + ta.value.slice(ta.selectionEnd || s);
      ui.compose.body = ta.value; ui.compose.template = 'custom'; render(); $('#c-body').focus();
    },
    'copy-all': () => copy(ui.compose.built.messages.map((m) => `To: ${m.name} <${m.to}>\n${m.subject ? `Subject: ${m.subject}\n` : ''}\n${m.body}`).join('\n\n---\n\n')),
    'link-used': () => { /* the browser follows the link; nothing to block */ },
    'mark-sent': () => {
      const c = ui.compose;
      const via = { email: 'Mail app', sms: 'Messages app', whatsapp: 'WhatsApp' }[c.channel];
      MY.logSend(state, { name: (MY.TEMPLATES.find((t) => t.id === c.template) || { name: 'Custom message' }).name, channel: c.channel, via, template: c.template, messages: c.built.messages, status: 'handed off' }, today());
      c.sentVia = `${c.built.messages.length} via ${via}`;
      commit(`Logged ${c.built.messages.length} messages`);
    },
    'send-provider': async () => {
      const c = ui.compose;
      try {
        const r = await fetch('api/send', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: c.channel, messages: c.built.messages.map((m) => ({ to: m.to, subject: m.subject, body: m.body })) }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Send failed');
        const via = c.channel === 'email' ? ui.server.email : ui.server.sms;
        MY.logSend(state, { name: (MY.TEMPLATES.find((t) => t.id === c.template) || { name: 'Custom message' }).name, channel: c.channel, via, template: c.template, messages: c.built.messages, status: j.dryRun ? 'dry run' : `sent ${j.sent}/${c.built.messages.length}` }, today());
        c.sentVia = `${c.built.messages.length} via ${via}${j.dryRun ? ' (dry run)' : ''}`;
        commit(j.dryRun ? 'Dry run complete: logged, not sent' : `Sent ${j.sent} messages`);
      } catch (err) { toast(`Couldn’t send: ${err.message}`); }
    },
    'msg-almost': () => openCompose({ seg: 'almost-tier', template: 'reward', channel: 'email' }),
    'msg-referral': () => openCompose({ seg: 'active', template: 'referral', channel: 'email' }),
    'copy-text': (el) => copy(el.dataset.text),
    'toggle-assist': () => { ui.chat.open = !ui.chat.open; render(); if (ui.chat.open) { scrollChat(); const t = $('#ask-in'); if (t) t.focus(); } else $('#ask-btn').focus(); },
    'ask-suggested': (el) => askAI(el.dataset.q),
    'chat-clear': () => { state.chat = []; ui.chat.error = null; commit(); },
    'disc-add': (el) => addDiscovered([+el.dataset.i]),
    'disc-add-high': () => { const run = state.discoveries[ui.disc.run]; addDiscovered(run.partners.map((p, i) => (p.priority === 'high' && !p.status ? i : -1)).filter((i) => i >= 0)); },
    'disc-dismiss': (el) => { state.discoveries[ui.disc.run].partners[+el.dataset.i].status = 'dismissed'; commit(); },
    'recs-source': (el) => { ui.recs.source = el.dataset.src; render(); },
    'recs-generate': async () => {
      const R = ui.recs; R.busy = true; R.error = null; render();
      try {
        const j = await aiPost('api/ai/recommendations', { context: MY.aiContext(state, today()) });
        state.aiRecs = { at: today(), model: j.model, headline: j.headline, volunteer: j.volunteer || [], partnership: j.partnership || [] };
        R.source = 'ai';
      } catch (e) { R.error = e.message; }
      R.busy = false; save(); render();
    },
    'reset-sample': () => { if (!window.confirm('Reload the sample workspace? Your changes will be replaced.')) return; state = MY.seedState(today()); ensureAI(); ui.drawer = null; ui.compose = null; closeMenus(); commit('Sample workspace loaded'); },
    'start-empty': () => { if (!window.confirm('Start an empty workspace? Sample people and activity will be removed; Guild details and partners stay.')) return; state = MY.seedState(today(), { samples: false }); ensureAI(); ui.drawer = null; ui.compose = null; closeMenus(); commit('Empty workspace ready'); },
  };
  function addDiscovered(idxs) {
    const run = state.discoveries[ui.disc.run];
    let n = 0;
    idxs.forEach((i) => {
      const c = run.partners[i];
      if (!c || c.status) return;
      if (state.partners.some((p) => p.name.toLowerCase() === c.name.toLowerCase())) { c.status = 'added'; return; }
      state.partners.push({ id: MY.uid('p'), name: c.name, kind: 'group', stage: 'aware', focus: [], route: c.public_contact_route || 'Find a warm intro first', source: `AI suggestion (${run.category}, ${run.city}) · ${c.source_url}`, notes: c.why_fit, lastTouch: null, history: [], ai: true, suggestedPlay: c.first_play });
      c.status = 'added'; n++;
    });
    commit(n ? `Added ${n} to the partner pipeline` : 'Already in the pipeline');
  }
  const FORMS = {
    'hub-event': (o, form) => { hubAct('events', o, 'Event published to volunteer dashboards'); form.reset(); },
    discover: async (f) => {
      const D = ui.disc;
      Object.assign(D, { city: f.city.trim(), category: f.category, count: +f.count, busy: true, error: null });
      render();
      try {
        const j = await aiPost('api/ai/partners', { city: D.city, category: D.category, count: D.count, exclude: state.partners.map((p) => p.name) });
        state.discoveries.unshift({ id: MY.uid('d'), at: today(), city: j.city, category: j.category, model: j.model, webSearch: j.webSearch, summary: j.summary, partners: (j.partners || []).map((p) => Object.assign({ status: null }, p)) });
        state.discoveries = state.discoveries.slice(0, 10);
        D.run = 0;
      } catch (e) { D.error = e.message; }
      D.busy = false; save(); render();
    },
    ask: (f) => askAI(f.q),
    'add-vol': (f) => {
      const ch = { email: !!f['ch-email'], sms: !!f['ch-sms'], whatsapp: !!f['ch-whatsapp'] };
      const v = MY.volunteerFromInput(Object.assign({}, f, { channels: ch }), today());
      v.source = f.source;
      const res = MY.mergeVolunteers(state.volunteers, [v]);
      state.volunteers = res.list; ui.panel = null;
      commit(res.added ? `Added ${v.name}` : `${v.name} already existed, details merged`);
    },
    'add-event': (f) => {
      const e = { id: MY.uid('e'), title: f.title, date: f.date, type: f.type, capacity: +f.capacity || 30, projects: f.type === 'workday' ? MY.clone(MY.OPC_PROJECTS) : [], crews: null, rsvps: [], attended: [], partnerIds: f.partner ? [f.partner] : [] };
      state.events.push(e); ui.eventId = e.id; ui.panel = null; commit(`Created ${f.title}`);
    },
    award: (f) => { const v = vol(ui.drawer.id); v.awards = (v.awards || []).concat([{ date: today(), points: Math.max(1, Math.min(200, +f.points || 0)), reason: f.reason }]); commit(`Awarded ${f.points} Seeds`); },
    'site-move': (f) => { MY.moveSite(state.sites.find((s) => s.id === ui.drawer.id), f.stage, f.note, today()); commit('Site updated'); },
    'add-site': (f) => {
      const s = { id: MY.uid('s'), name: f.name, type: f.type, neighborhood: f.neighborhood, address: '', isPrivate: !!f.isPrivate, stage: 'identified', fit: { land: 0, water: 0, anchor: 0, access: 0, alignment: 0 }, route: f.route, notes: '', source: 'Added by a coordinator', history: [{ date: today(), from: null, to: 'identified', note: 'Added' }], lastTouch: today(), partnerIds: [] };
      state.sites.push(s); ui.panel = null; ui.drawer = { type: 'site', id: s.id }; commit(`Added ${f.name}`);
    },
    'partner-log': (f) => { MY.logPartnerTouch(state.partners.find((p) => p.id === ui.drawer.id), today(), f.note, ui.drawer.play || null, f.stage); commit('Conversation logged'); },
    'add-partner': (f) => { state.partners.push({ id: MY.uid('p'), name: f.name, kind: 'group', stage: f.stage, focus: MY.tagList(f.focus), route: f.route, source: 'Added by a coordinator', lastTouch: null, notes: '', history: [] }); ui.panel = null; commit(`Added ${f.name}`); },
    reach: (f) => { state.growth.reach.forEach((r) => { if (f[r.id] != null) r.value = Math.max(0, +f[r.id] || 0); }); commit('Reach updated'); },
  };
  const CHANGE = {
    'hub-ev': (el) => { hub.eventId = el.value; render(); },
    'f-hood': (el) => { F().neighborhood = el.value; render(); },
    'f-source': (el) => { F().source = el.value; render(); },
    'vol-hood': (el) => { ui.vol.hood = el.value; ui.vol.page = 0; render(); },
    'vol-tier': (el) => { ui.vol.tier = el.value; ui.vol.page = 0; render(); },
    attend: (el) => { const e = state.events.find((x) => x.id === ui.eventId); e.attended = el.checked ? [...new Set(e.attended.concat(el.dataset.id))] : e.attended.filter((x) => x !== el.dataset.id); commit(el.checked ? 'Checked in · Seeds awarded' : 'Check-in removed'); },
    consent: (el) => { vol(ui.drawer.id).channels[el.dataset.k] = el.checked; commit('Consent updated'); },
    recog: (el) => { vol(ui.drawer.id).publicRecognition = el.checked; commit(); },
    fit: (el) => { state.sites.find((s) => s.id === ui.drawer.id).fit[el.dataset.k] = +el.value; commit(); },
    'partner-play': (el) => { ui.drawer.play = el.value; render(); },
    'disc-run': (el) => { ui.disc.run = +el.value; render(); },
    'c-seg': (el) => { if (el.value === '__sel') return; ui.compose.seg = el.value; ui.compose.ids = null; ui.compose.preview = 0; ui.compose.sentVia = null; render(); },
    'c-tpl': (el) => { const t = MY.TEMPLATES.find((x) => x.id === el.value); ui.compose.template = el.value; if (t) { ui.compose.subject = t.subject; ui.compose.body = t.body; } ui.compose.sentVia = null; render(); },
    'c-prev': (el) => { ui.compose.preview = +el.value; render(); },
  };

  function closeMenus() { ['new', 'me'].forEach((m) => { $(`#${m}-menu`).hidden = true; $(`#${m}-btn`).setAttribute('aria-expanded', 'false'); }); }

  // ---------- wiring ----------
  document.addEventListener('click', (ev) => {
    const menuBtn = ev.target.closest('#new-btn, #me-btn');
    if (menuBtn) { const m = menuBtn.id.replace('-btn', ''); const pop = $(`#${m}-menu`); const open = pop.hidden; closeMenus(); pop.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); return; }
    if (!ev.target.closest('.menu-pop')) closeMenus();
    const res = ev.target.closest('#search-results button');
    if (res) { $('#search-results').hidden = true; $('#global-search').value = ''; ui.drawer = { type: 'vol', id: res.dataset.id }; render(); return; }
    if (!ev.target.closest('.search')) $('#search-results').hidden = true;
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled || !ACT[el.dataset.act]) return;
    if (el.tagName === 'A' && el.dataset.act === 'link-used') return; // let the link open
    if (el.type !== 'checkbox') ev.preventDefault();
    ACT[el.dataset.act](el, ev);
  });
  document.addEventListener('submit', (ev) => {
    const form = ev.target.closest('[data-form]');
    if (!form) return;
    ev.preventDefault();
    FORMS[form.dataset.form](formData(form), form);
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.id === 'sender') { state.settings.sender = el.value.trim(); save(); return; }
    if (el.dataset && el.dataset.change && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el);
  });
  let qTimer;
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.id === 'vol-q') { ui.vol.q = el.value; ui.vol.page = 0; clearTimeout(qTimer); qTimer = setTimeout(() => { const pos = el.selectionStart; render(); const n = $('#vol-q'); n.focus(); n.setSelectionRange(pos, pos); }, 150); }
    if (el.id === 'c-body' || el.id === 'c-subject') {
      ui.compose[el.id === 'c-body' ? 'body' : 'subject'] = el.value; ui.compose.template = 'custom'; ui.compose.sentVia = null;
      clearTimeout(qTimer); qTimer = setTimeout(() => { const pos = el.selectionStart; const id = el.id; render(); const n = $(`#${id}`); n.focus(); n.setSelectionRange(pos, pos); }, 250);
    }
    if (el.id === 'ask-in') { ui.chat.draft = el.value; return; }
    if (el.id === 'global-search') {
      const q = el.value.trim().toLowerCase();
      const out = $('#search-results');
      if (!q) { out.hidden = true; return; }
      const hits = state.volunteers.filter((v) => `${v.name} ${v.email}`.toLowerCase().includes(q)).slice(0, 8);
      out.innerHTML = hits.map((v) => `<li><button data-id="${v.id}"><span class="avatar sm">${esc(initials(v.name))}</span>${esc(v.name)} <span class="muted">${esc(v.neighborhood)}</span></button></li>`).join('') || '<li class="empty" style="padding:8px">No matches</li>';
      out.hidden = false;
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey && ev.target.id === 'ask-in') { ev.preventDefault(); askAI(ev.target.value); return; }
    const plot = ev.target.closest && ev.target.closest('svg.chart');
    if (plot && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) {
      ev.preventDefault();
      if (ev.key === 'Home') delete plot.dataset.kb;
      kbStep(plot, ev.key === 'ArrowLeft' ? -1 : ev.key === 'End' ? 999 : 1);
      return;
    }
    if (ev.key === 'Escape') { if (ui.drawer) { ui.drawer = null; render(); } else if (ui.chat.open) { ui.chat.open = false; render(); } closeMenus(); $('#search-results').hidden = true; }
    if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { ev.preventDefault(); $('#global-search').focus(); }
  });

  // Tooltip: one element, follows the pointer, shows the same detail as the table view.
  const tipEl = $('#tip');
  document.addEventListener('mouseover', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-tip]');
    if (!t) { tipEl.hidden = true; return; }
    tipEl.innerHTML = t.getAttribute('data-tip');
    tipEl.hidden = false;
  });
  const placeTip = (x, y) => {
    const w = tipEl.offsetWidth || 200, h = tipEl.offsetHeight || 60;
    tipEl.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, x + 14))}px`;
    tipEl.style.top = `${Math.max(8, y - h - 10)}px`;
  };
  document.addEventListener('mousemove', (ev) => { if (!tipEl.hidden) placeTip(ev.clientX, ev.clientY); });

  // Sparkline scrub: a crosshair follows the pointer and the tile's footer reads out that point.
  function scrubSpark(svg, clientX) {
    const vals = JSON.parse(svg.dataset.values || '[]'), labels = JSON.parse(svg.dataset.labels || '[]');
    const pts = (svg.dataset.points || '').split(' ');
    const box = svg.getBoundingClientRect();
    const rel = Math.max(0, Math.min(1, (clientX - box.left) / (box.width || 1)));
    let i = Math.round(rel * (vals.length - 1));
    if (vals[i] == null) { const near = vals.map((v, j) => (v == null ? Infinity : Math.abs(j - i))); i = near.indexOf(Math.min(...near)); }
    if (!pts[i]) return;
    const [px, py] = pts[i].split(',');
    const xl = svg.querySelector('.spark-x'), dot = svg.querySelector('.spark-dot');
    xl.setAttribute('x1', px); xl.setAttribute('x2', px); dot.setAttribute('cx', px); dot.setAttribute('cy', py);
    svg.classList.add('scrub');
    const tile = svg.closest('.kpi');
    let out = tile.querySelector('.k-read');
    if (!out) { out = document.createElement('span'); out.className = 'k-read'; tile.querySelector('.k-foot').appendChild(out); }
    out.textContent = `${labels[i]} · ${CH.fmtN(vals[i])}${svg.dataset.unit || ''} (28 days)`;
    tile.classList.add('reading');
  }
  function endScrub(svg) { svg.classList.remove('scrub'); const tile = svg.closest('.kpi'); if (tile) tile.classList.remove('reading'); }
  document.addEventListener('pointermove', (ev) => {
    const svg = ev.target.closest && ev.target.closest('.kpi svg.spark[data-values]');
    $$('.kpi svg.spark.scrub').forEach((s) => { if (s !== svg) endScrub(s); });
    if (svg) scrubSpark(svg, ev.clientX);
  });
  document.addEventListener('pointerleave', () => $$('.kpi svg.spark.scrub').forEach(endScrub), true);

  // Keyboard scrub for plots: focus a chart, then arrow keys step through the same readouts as hover.
  function kbStep(svg, dir) {
    const hits = $$('.hit', svg);
    if (!hits.length) return;
    let i = +(svg.dataset.kb == null ? (dir > 0 ? -1 : hits.length) : svg.dataset.kb) + dir;
    i = Math.max(0, Math.min(hits.length - 1, i));
    svg.dataset.kb = i;
    hits.forEach((h, j) => { h.classList.toggle('kb', j === i); const g = h.closest('.xh'); if (g) g.classList.toggle('kb', j === i); });
    tipEl.innerHTML = hits[i].getAttribute('data-tip');
    tipEl.hidden = false;
    const r = hits[i].getBoundingClientRect();
    placeTip(r.left + r.width / 2 - 14, r.top + 10);
  }
  document.addEventListener('focusout', (ev) => {
    const svg = ev.target.closest && ev.target.closest('svg.chart');
    if (!svg) return;
    delete svg.dataset.kb; $$('.kb', svg).forEach((h) => h.classList.remove('kb')); tipEl.hidden = true;
  });

  // The hub bar is sticky on top; Canopy's sidebar and search bar stick just below it.
  const syncHubHeight = () => { const bar = $('header.hub-bar'); document.documentElement.style.setProperty('--hub-h', `${bar ? Math.round(bar.getBoundingClientRect().height) : 0}px`); };
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(syncHubHeight);
    const watch = () => { const bar = $('header.hub-bar'); if (bar) { ro.observe(bar); syncHubHeight(); return true; } return false; };
    if (!watch()) new MutationObserver((_, mo) => { if (watch()) mo.disconnect(); }).observe(document.body, { childList: true });
  }

  let lastPlotW = CH.plotWidth();
  window.addEventListener('resize', () => { const w = CH.plotWidth(); if (w !== lastPlotW) { lastPlotW = w; render(); } });
  window.addEventListener('hashchange', route);
  route();
  detectServer();
  detectAdmin();
  window.CANOPY = { get state() { return state; }, ui, go, render, today, openCompose };
})();

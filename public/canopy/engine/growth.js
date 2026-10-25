// Growth plan: the market funnel (reach → lead), where it leaks, partner and site funnels, and a plan aimed at the leak.
(function (root) {
  'use strict';
  const MY = root.MY;

  MY.reachEstimate = function reachEstimate(state) {
    const gross = (state.growth && state.growth.reach || []).reduce((s, r) => s + (+r.value || 0), 0);
    return { gross, net: Math.round(gross * (1 - MY.REACH_OVERLAP)) };
  };

  MY.marketFunnel = function marketFunnel(state, today, f) {
    const reach = MY.reachEstimate(state);
    const inner = MY.funnel(state, today, f);
    const steps = [{ label: 'Reached (estimate)', count: reach.net, estimate: true }].concat(inner.map((s) => ({ label: s.label, count: s.count })));
    steps.forEach((s, i) => {
      s.ofTop = steps[0].count ? +((s.count / steps[0].count) * 100).toFixed(1) : 0;
      s.ofPrev = i ? (steps[i - 1].count ? Math.round((s.count / steps[i - 1].count) * 100) : null) : null;
      s.lost = i ? Math.max(0, steps[i - 1].count - s.count) : 0;
    });
    // The bottleneck is the weakest step the Guild controls (after signup, before crew lead).
    const candidates = steps.slice(2, steps.length - 1).filter((s) => s.ofPrev != null);
    const bottleneck = candidates.slice().sort((a, b) => a.ofPrev - b.ofPrev)[0] || null;
    return { steps, bottleneck, reach };
  };

  MY.sourceFunnel = function sourceFunnel(state, today, f) {
    const { from } = MY.windowOf(today, f.days, 0);
    const idx = MY.attendanceIndex(state, today);
    const vols = MY.filterVolunteers(state, Object.assign({}, f, { source: 'all' })).filter((v) => v.signedUpAt >= from);
    const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);
    return MY.SOURCES.map((s) => {
      const g = vols.filter((v) => v.source === s);
      const n = (k) => g.filter((v) => (idx[v.id] || []).length >= k).length;
      return { label: s, signups: g.length, first: pct(n(1), g.length), back: pct(n(2), n(1)), regular: pct(n(3), g.length) };
    }).filter((r) => r.signups).sort((a, b) => b.signups - a.signups);
  };

  // "At or beyond" counts so each bar is a funnel step.
  const atOrBeyond = (list, items, key) => list.map(([id, label], i) => ({ id, label, count: items.filter((x) => list.findIndex((l) => l[0] === x[key]) >= i).length }));
  MY.partnerFunnel = (state) => atOrBeyond(MY.PARTNER_STAGES, state.partners, 'stage');
  MY.siteFunnel = (state) => atOrBeyond(MY.SITE_STAGES, state.sites.filter((s) => !['paused', 'declined'].includes(s.stage)), 'stage');

  MY.partnerImpact = function partnerImpact(state, today) {
    return state.partners.map((p) => {
      const evs = state.events.filter((e) => (e.partnerIds || []).includes(p.id) && e.date <= today);
      return {
        p, referred: state.volunteers.filter((v) => v.partnerId === p.id).length,
        cohosted: evs.length, attendees: evs.reduce((s, e) => s + (e.attended || []).length, 0),
        sites: state.sites.filter((s) => (s.partnerIds || []).includes(p.id)).length,
      };
    });
  };

  const FOCUS = {
    Welcomed: { theme: 'Answer every signup within 48 hours', moves: ['Welcome template on a daily 5-minute check', 'Auto-segment "New" in Messages', 'Text-first for people who opted into SMS'] },
    'First visit': { theme: 'Turn signups into a first visit', moves: ['Reminder 1–3 days before for every first-timer', 'Buddy assigned in crew formation', 'First-visit bonus (+15 Seeds) in the welcome message'] },
    'Came back': { theme: 'Get first-timers to come back', moves: ['Thank-you within 3 days naming their crew', 'Same crew on the next workday', 'Sprout tier (50 Seeds) is two visits away: say so'] },
    'Regular (3+)': { theme: 'Make returning people regulars', moves: ['Quarterly streak bonus (3 workdays = +20 Seeds)', 'Invite to a workshop with a free Root-tier seat', 'Neighborhood challenge to build crews of friends'] },
  };

  MY.growthPlan = function growthPlan(mf, kpis) {
    const b = mf.bottleneck;
    const focus = (b && FOCUS[b.label]) || FOCUS['Came back'];
    const show = kpis.find((k) => k.id === 'show');
    const ret = kpis.find((k) => k.id === 'retention');
    const tgt = (v, add) => (v == null ? null : Math.min(95, v + add));
    return {
      focus: b ? { step: b.label, rate: b.ofPrev, lost: b.lost, theme: focus.theme } : null,
      windows: [
        { window: 'Days 1–30', theme: focus.theme, items: focus.moves.concat(show && show.value != null ? [`Experiment target: show rate ${show.value}% → ${tgt(show.value, 8)}%`] : []) },
        { window: 'Days 31–60', theme: 'Grow reach through partners', items: ['Co-host one workday with a "Connected" partner', 'Swap event announcements with two partner groups', 'Bring-a-neighbor month: +25 Seeds when a friend shows up', 'Move two sites to a site walk'] },
        { window: 'Days 61–90', theme: 'Build leaders so it scales', items: ['Invite Root-tier regulars to the crew-lead track', 'Recruit a steward for the next active site', ret && ret.value != null ? `Experiment target: retained from prior period ${ret.value}% → ${tgt(ret.value, 7)}%` : 'Baseline retention for the first cohort', 'Quarterly call with partner groups and a shared calendar'] },
      ],
    };
  };

  MY.CHANNEL_PLAN = [
    { stage: 'Reach', channels: 'Instagram reels (faces with consent), Linktree QR signs at sites, partner newsletters, Bay Delta Unconference', measure: 'Reach estimate, signups by source' },
    { stage: 'Sign up', channels: 'Listserv Google Form, Partiful RSVP, monthly meeting sign-in sheet', measure: 'Signups, referral share' },
    { stage: 'First visit', channels: 'Welcome in 48h, reminder 1–3 days before, buddy and welcome table', measure: 'Show rate, first visits' },
    { stage: 'Come back', channels: 'Thank-you naming their crew, same crew next time, WhatsApp/Signal for regulars', measure: 'Came back %, retention' },
    { stage: 'Lead', channels: 'Seeds tiers and perks, crew-lead track, site steward role', measure: 'Regulars, crew leads' },
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);

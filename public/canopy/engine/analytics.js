// Analytics over the volunteer workspace. Every function takes (state, today, filter)
// where filter = { days, neighborhood, source }, so all charts on a page share one slice.
(function (root) {
  'use strict';
  const MY = root.MY;

  MY.HEALTH = [
    ['active', 'Active', 'Visited in the last 30 days'],
    ['cooling', 'Cooling', 'Last visit 31–60 days ago'],
    ['at-risk', 'At risk', 'Last visit 61–90 days ago'],
    ['lapsed', 'Lapsed', 'No visit in 90+ days'],
    ['new', 'New', 'Signed up in the last 21 days, no visit yet'],
    ['never', 'Never attended', 'Signed up 21+ days ago, no visit yet'],
  ];

  const inRange = (d, from, to) => d >= from && d <= to;
  const hours = (e) => MY.EVENT_HOURS[e.type] || 3;

  MY.filterVolunteers = (state, f) => state.volunteers.filter((v) =>
    (!f.neighborhood || f.neighborhood === 'all' || v.neighborhood === f.neighborhood) &&
    (!f.source || f.source === 'all' || v.source === f.source));

  MY.windowOf = (today, days, back) => {
    const to = MY.addDays(today, -(back || 0) * days);
    return { from: MY.addDays(to, -days + 1), to };
  };

  // Index: volunteer id -> sorted attended dates (past only).
  MY.attendanceIndex = function attendanceIndex(state, today) {
    const idx = {};
    state.events.filter((e) => e.date <= today).forEach((e) => (e.attended || []).forEach((id) => { (idx[id] || (idx[id] = [])).push(e.date); }));
    Object.values(idx).forEach((a) => a.sort());
    return idx;
  };

  MY.healthOf = function healthOf(v, dates, today) {
    const last = dates && dates.length ? dates[dates.length - 1] : null;
    if (!last) return MY.daysBetween(v.signedUpAt, today) <= 21 ? 'new' : 'never';
    const d = MY.daysBetween(last, today);
    return d <= 30 ? 'active' : d <= 60 ? 'cooling' : d <= 90 ? 'at-risk' : 'lapsed';
  };

  function windowStats(state, vols, ids, from, to, idx) {
    const events = state.events.filter((e) => inRange(e.date, from, to));
    const att = new Set(), rs = { n: 0, show: 0 };
    let hrs = 0;
    events.forEach((e) => {
      (e.attended || []).forEach((id) => { if (ids.has(id)) { att.add(id); hrs += hours(e); } });
      (e.rsvps || []).forEach((id) => { if (ids.has(id)) { rs.n++; if ((e.attended || []).includes(id)) rs.show++; } });
    });
    const signups = vols.filter((v) => inRange(v.signedUpAt, from, to));
    const firsts = vols.filter((v) => idx[v.id] && inRange(idx[v.id][0], from, to)).length;
    return { active: att, hours: Math.round(hrs), showRate: rs.n ? Math.round((rs.show / rs.n) * 100) : null, signups: signups.length, referrals: signups.filter((v) => v.source === 'Friend referral').length, firsts };
  }

  MY.kpis = function kpis(state, today, f) {
    const vols = MY.filterVolunteers(state, f);
    const ids = new Set(vols.map((v) => v.id));
    const idx = MY.attendanceIndex(state, today);
    const cur = MY.windowOf(today, f.days, 0), prev = MY.windowOf(today, f.days, 1), prev2 = MY.windowOf(today, f.days, 2);
    const a = windowStats(state, vols, ids, cur.from, cur.to, idx);
    const b = windowStats(state, vols, ids, prev.from, prev.to, idx);
    const c = windowStats(state, vols, ids, prev2.from, prev2.to, idx);
    const retained = (x, y) => (y.active.size ? Math.round(([...y.active].filter((id) => x.active.has(id)).length / y.active.size) * 100) : null);
    // Sparklines: 12 points across the window, each a trailing 28-day reading (workdays are biweekly, so shorter buckets would zig-zag).
    const step = Math.max(1, Math.round(f.days / 12));
    const spark = (fn) => {
      const out = [];
      for (let i = 11; i >= 0; i--) {
        const to = MY.addDays(today, -i * step), from = MY.addDays(to, -Math.max(step, 28) + 1);
        out.push(fn(windowStats(state, vols, ids, from, to, idx)));
      }
      return out;
    };
    const tile = (id, label, value, prior, fmt, sparkFn, goodUp) => ({ id, label, value, prior, fmt, spark: sparkFn ? spark(sparkFn) : null, goodUp: goodUp !== false, delta: value != null && prior != null ? value - prior : null, pct: value != null && prior ? Math.round(((value - prior) / prior) * 100) : null });
    return [
      tile('active', 'Active volunteers', a.active.size, b.active.size, 'n', (s) => s.active.size),
      tile('signups', 'New signups', a.signups, b.signups, 'n', (s) => s.signups),
      tile('show', 'Show rate', a.showRate, b.showRate, '%', (s) => s.showRate),
      tile('retention', 'Retention', retained(a, b), retained(b, c), '%', null),
      tile('hours', 'Volunteer hours', a.hours, b.hours, 'n', (s) => s.hours),
      tile('referrals', 'Referral signups', a.referrals, b.referrals, 'n', (s) => s.referrals),
    ];
  };

  // Weekly buckets (Monday start) across the window: first-time vs returning attendees, plus signups.
  MY.weeklySeries = function weeklySeries(state, today, f) {
    const vols = MY.filterVolunteers(state, f);
    const ids = new Set(vols.map((v) => v.id));
    const idx = MY.attendanceIndex(state, today);
    const { from } = MY.windowOf(today, f.days, 0);
    let wk = MY.addDays(from, -((MY.weekday(from) + 6) % 7));
    const buckets = [];
    const byMonth = f.days > 120;
    while (wk <= today) {
      const end = byMonth ? null : MY.addDays(wk, 6);
      buckets.push({ start: wk, end });
      wk = MY.addDays(wk, 7);
    }
    // Long ranges read better monthly.
    let rows;
    if (byMonth) {
      const months = [];
      for (let d = from.slice(0, 7); d <= today.slice(0, 7);) {
        months.push(d);
        const [y, m] = d.split('-').map(Number);
        d = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      }
      rows = months.map((m) => ({ start: `${m}-01`, end: `${m}-31`, label: new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) }));
    } else {
      rows = buckets.map((b) => ({ start: b.start, end: b.end, label: MY.fmtDate(b.start).replace(/^\w+, /, '') }));
    }
    return rows.map((r) => {
      const att = new Set();
      let hrs = 0, rsvp = 0, came = 0;
      state.events.filter((e) => e.date <= today && inRange(e.date, r.start, r.end)).forEach((e) => {
        (e.attended || []).forEach((id) => { if (ids.has(id)) { att.add(id); hrs += hours(e); } });
        (e.rsvps || []).forEach((id) => { if (ids.has(id)) { rsvp++; if ((e.attended || []).includes(id)) came++; } });
      });
      const first = [...att].filter((id) => inRange(idx[id][0], r.start, r.end)).length;
      const signed = vols.filter((v) => inRange(v.signedUpAt, r.start, r.end));
      // Extra per-period readings drive the KPI-selected view of the participation chart.
      return {
        label: r.label, start: r.start, first, returning: att.size - first, signups: signed.length,
        hours: Math.round(hrs), show: rsvp ? Math.round((came / rsvp) * 100) : null,
        back: att.size ? Math.round(((att.size - first) / att.size) * 100) : null,
        referrals: signed.filter((v) => v.source === 'Friend referral').length,
      };
    });
  };

  // Funnel steps with the people at each one (ids feed the click-to-filter on the overview).
  function funnelGroups(state, today, f) {
    const { from } = MY.windowOf(today, f.days, 0);
    const vols = MY.filterVolunteers(state, f).filter((v) => v.signedUpAt >= from);
    const idx = MY.attendanceIndex(state, today);
    const who = (fn) => vols.filter(fn).map((v) => v.id);
    const visits = (v) => (idx[v.id] || []).length;
    return [
      ['Signed up', who(() => true)],
      ['Welcomed', who((v) => (v.touches || []).some((t) => t.kind === 'welcome') || visits(v) > 0)],
      ['First visit', who((v) => visits(v) >= 1)],
      ['Came back', who((v) => visits(v) >= 2)],
      ['Regular (3+)', who((v) => visits(v) >= 3)],
      ['Crew lead', who((v) => v.lead)],
    ];
  }
  MY.funnelPeople = (state, today, f) => funnelGroups(state, today, f).map(([label, ids]) => ({ label, ids }));

  MY.funnel = function funnel(state, today, f) {
    const steps = funnelGroups(state, today, f).map(([label, ids]) => [label, ids.length]);
    return steps.map(([label, count], i) => ({ label, count, ofTop: steps[0][1] ? Math.round((count / steps[0][1]) * 100) : 0, ofPrev: i && steps[i - 1][1] ? Math.round((count / steps[i - 1][1]) * 100) : null }));
  };

  // Rows: month of first visit. Columns: share of that cohort who came to anything k months later.
  MY.cohorts = function cohorts(state, today, f, nCohorts) {
    const vols = MY.filterVolunteers(state, f);
    const idx = MY.attendanceIndex(state, today);
    const ym = (d) => d.slice(0, 7);
    const addM = (m, k) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + k, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
    const now = ym(today);
    const out = [];
    for (let i = (nCohorts || 8) - 1; i >= 0; i--) {
      const m = addM(now, -i);
      const members = vols.filter((v) => idx[v.id] && ym(idx[v.id][0]) === m);
      const cells = [];
      for (let k = 0; k <= 5; k++) {
        const mk = addM(m, k);
        if (mk > now) { cells.push(null); continue; }
        const c = members.filter((v) => idx[v.id].some((d) => ym(d) === mk)).length;
        cells.push(members.length ? Math.round((c / members.length) * 100) : null);
      }
      out.push({ month: m, label: new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }), size: members.length, cells });
    }
    return out;
  };

  MY.sources = function sources(state, today, f) {
    const { from } = MY.windowOf(today, f.days, 0);
    const vols = MY.filterVolunteers(state, Object.assign({}, f, { source: 'all' })).filter((v) => v.signedUpAt >= from);
    const idx = MY.attendanceIndex(state, today);
    return MY.SOURCES.map((s) => {
      const g = vols.filter((v) => v.source === s);
      const came = g.filter((v) => idx[v.id]).length;
      return { label: s, signups: g.length, came, conv: g.length ? Math.round((came / g.length) * 100) : null };
    }).filter((x) => x.signups).sort((a, b) => b.signups - a.signups);
  };

  function neighborhoodGroups(state, today, f, top) {
    const { from } = MY.windowOf(today, f.days, 0);
    const vols = MY.filterVolunteers(state, Object.assign({}, f, { neighborhood: 'all' }));
    const ids = new Set(vols.map((v) => v.id));
    const act = new Set();
    state.events.filter((e) => inRange(e.date, from, today)).forEach((e) => (e.attended || []).forEach((id) => { if (ids.has(id)) act.add(id); }));
    const groups = {};
    vols.filter((v) => act.has(v.id)).forEach((v) => { (groups[v.neighborhood] || (groups[v.neighborhood] = [])).push(v.id); });
    const rows = Object.entries(groups).map(([label, list]) => ({ label, ids: list })).sort((a, b) => b.ids.length - a.ids.length);
    const k = top || 8;
    if (rows.length <= k) return rows;
    return rows.slice(0, k).concat([{ label: 'Other', ids: rows.slice(k).flatMap((r) => r.ids) }]);
  }
  MY.neighborhoods = (state, today, f, top) => neighborhoodGroups(state, today, f, top).map((r) => ({ label: r.label, value: r.ids.length }));
  MY.neighborhoodPeople = (state, today, f, top) => neighborhoodGroups(state, today, f, top);
  // Signups in the window from one source (click-to-filter from "Signups by source").
  MY.sourcePeople = (state, today, f, source) => {
    const { from } = MY.windowOf(today, f.days, 0);
    return MY.filterVolunteers(state, Object.assign({}, f, { source: 'all' })).filter((v) => v.signedUpAt >= from && v.source === source).map((v) => v.id);
  };

  MY.reachability = function reachability(state, f) {
    const vols = MY.filterVolunteers(state, f);
    const text = (v) => v.channels && (v.channels.sms || v.channels.whatsapp);
    const mail = (v) => v.channels && v.channels.email;
    return [
      { label: 'Email + text', value: vols.filter((v) => mail(v) && text(v)).length },
      { label: 'Email only', value: vols.filter((v) => mail(v) && !text(v)).length },
      { label: 'Text only', value: vols.filter((v) => !mail(v) && text(v)).length },
      { label: 'No consent on file', value: vols.filter((v) => !mail(v) && !text(v)).length },
    ];
  };

  MY.healthCounts = function healthCounts(state, today, f) {
    const idx = MY.attendanceIndex(state, today);
    const vols = MY.filterVolunteers(state, f);
    const c = Object.fromEntries(MY.HEALTH.map(([id]) => [id, 0]));
    vols.forEach((v) => { c[MY.healthOf(v, idx[v.id], today)]++; });
    return c;
  };

  // Month-end snapshots of health for people who had attended at least once by then.
  MY.healthTrend = function healthTrend(state, today, f, months) {
    const out = [];
    for (let i = (months || 6) - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - i, 0));
      const end = i === 0 ? today : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const idx = MY.attendanceIndex(state, end);
      const row = { label: new Date(Date.UTC(+end.slice(0, 4), +end.slice(5, 7) - 1, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), active: 0, cooling: 0, 'at-risk': 0, lapsed: 0 };
      MY.filterVolunteers(state, f).filter((v) => v.signedUpAt <= end && idx[v.id]).forEach((v) => { row[MY.healthOf(v, idx[v.id], end)]++; });
      out.push(row);
    }
    return out;
  };

  MY.hoursByMonth = function hoursByMonth(state, today, f, months) {
    const ids = new Set(MY.filterVolunteers(state, f).map((v) => v.id));
    const out = [];
    for (let i = (months || 6) - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1 - i, 1));
      const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      let h = 0;
      state.events.filter((e) => e.date <= today && e.date.slice(0, 7) === m).forEach((e) => { h += (e.attended || []).filter((id) => ids.has(id)).length * hours(e); });
      out.push({ label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), value: Math.round(h) });
    }
    return out;
  };

  // A row per volunteer with everything the table needs.
  MY.rosterRows = function rosterRows(state, today) {
    const idx = MY.attendanceIndex(state, today);
    const rw = MY.rewardsSummary(state, today);
    const pts = Object.fromEntries(rw.people.map((p) => [p.v.id, p]));
    return state.volunteers.map((v) => {
      const dates = idx[v.id] || [];
      const h = MY.volunteerHistory(v, state.events, today);
      const hrs = state.events.filter((e) => e.date <= today && (e.attended || []).includes(v.id)).reduce((s, e) => s + hours(e), 0);
      return {
        v, visits: dates.length, last: dates[dates.length - 1] || null, hours: hrs, health: MY.healthOf(v, dates, today),
        points: pts[v.id].points, tier: pts[v.id].t, stage: MY.volunteerStage(v, h), action: MY.nextVolunteerAction(v, h, today), upcoming: h.upcoming,
      };
    });
  };

  // 26-week attendance strip for a profile.
  MY.activityWeeks = function activityWeeks(v, state, today, weeks) {
    const n = weeks || 26;
    const end = MY.addDays(today, 6 - ((MY.weekday(today) + 6) % 7));
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const to = MY.addDays(end, -i * 7), from = MY.addDays(to, -6);
      const evs = state.events.filter((e) => inRange(e.date, from, to) && e.date <= today && (e.attended || []).includes(v.id));
      out.push({ from, count: evs.length, titles: evs.map((e) => e.title) });
    }
    return out;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

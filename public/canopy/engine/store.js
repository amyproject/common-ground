// Persistence. State lives in the browser; CSV/ICS exports feed other tools.
(function (root) {
  'use strict';
  const MY = root.MY;

  MY.STORAGE_KEY = 'canopy-ebpg-v5';
  const LISTS = ['volunteers', 'events', 'campaigns', 'outbox', 'partners', 'sites', 'board', 'candidates'];

  MY.validateState = function validateState(s) {
    const errors = [];
    if (!s || typeof s !== 'object') return { ok: false, errors: ['Not an object'] };
    LISTS.forEach((k) => { if (!Array.isArray(s[k])) errors.push(`Missing list: ${k}`); });
    if (!s.org || !s.org.name) errors.push('Missing org');
    return { ok: !errors.length, errors };
  };

  MY.loadState = function loadState(storage, now) {
    try {
      const raw = storage && storage.getItem(MY.STORAGE_KEY);
      if (raw) { const s = JSON.parse(raw); if (MY.validateState(s).ok) return s; }
    } catch (_) { /* corrupt: reseed */ }
    return MY.seedState(now);
  };

  MY.saveState = (storage, state) => { if (storage) storage.setItem(MY.STORAGE_KEY, JSON.stringify(state)); };

  MY.toCSV = function toCSV(rows, cols) {
    const q = (v) => { const s = Array.isArray(v) ? v.join('; ') : String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [cols.map((c) => c[0]).join(',')].concat(rows.map((r) => cols.map((c) => q(c[1](r))).join(','))).join('\n');
  };

  // Mailchimp-compatible audience export: only people with email consent.
  MY.mailchimpCSV = (state) => MY.toCSV(state.volunteers.filter((v) => v.channels && v.channels.email && v.email), [
    ['Email Address', (v) => v.email], ['First Name', (v) => MY.firstName(v.name)], ['Neighborhood', (v) => v.neighborhood], ['Tags', (v) => (v.interests || []).join(',')],
  ]);

  MY.eventsICS = function eventsICS(state, today) {
    const stamp = today.replace(/-/g, '') + 'T000000Z';
    const times = { workday: ['100000', '140000'], meeting: ['180000', '203000'], workshop: ['130000', '150000'] };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EBPG//Canopy//EN', 'X-WR-CALNAME:East Bay Permaculture Guild'];
    state.events.filter((e) => e.date >= today).forEach((e) => {
      const [s, en] = times[e.type] || times.workday;
      const d = e.date.replace(/-/g, '');
      lines.push('BEGIN:VEVENT', `UID:${e.id}@ebpg-canopy`, `DTSTAMP:${stamp}`, `DTSTART;TZID=America/Los_Angeles:${d}T${s}`, `DTEND;TZID=America/Los_Angeles:${d}T${en}`,
        `SUMMARY:${e.title.replace(/[,;]/g, '\\$&')}`, 'LOCATION:Oakland Peace Center\\, 111 Fairmount Ave\\, Oakland', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

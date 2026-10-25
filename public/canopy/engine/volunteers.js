// Volunteer pipeline: intake, dedupe, attendance-based stages, and the next kind thing to do for each person.
(function (root) {
  'use strict';
  const MY = root.MY;

  const LAPSED_DAYS = 60;
  const THANK_WINDOW = 21;

  // ---------- CSV ----------
  MY.parseCSV = function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    const s = String(text || '').replace(/\r\n?/g, '\n');
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) {
        if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const nonEmpty = rows.filter((r) => r.some((c) => c.trim()));
    if (!nonEmpty.length) return [];
    const head = nonEmpty[0].map((h) => h.trim().toLowerCase());
    return nonEmpty.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  };

  // Google Form exports use long question text as headers, so match loosely.
  const FIELD_MATCHERS = [
    ['name', /^(?:full )?name|your name/],
    ['email', /e-?mail/],
    ['phone', /phone|mobile|cell/],
    ['neighborhood', /neighbo|city|zip|where do you live|area/],
    ['interests', /interest|excite|want to (?:learn|help)/],
    ['skills', /skill|experience|bring/],
    ['availability', /availab|when can/],
    ['channel', /prefer|contact|reach you|channel/],
    ['source', /hear about|how did you find|source/],
    ['timestamp', /timestamp|date/],
  ];
  const mapHeaders = (obj) => {
    const out = {};
    Object.keys(obj).forEach((k) => {
      const m = FIELD_MATCHERS.find(([f, re]) => !out[f] && re.test(k));
      if (m) out[m[0]] = obj[k];
    });
    return out;
  };

  const channelsFrom = (pref, email, phone) => {
    const p = String(pref || '').toLowerCase();
    const ch = {
      email: /mail/.test(p) || (!p && !!email),
      sms: /text|sms/.test(p),
      whatsapp: /whatsapp/.test(p),
      signal: /signal/.test(p),
    };
    if (!Object.values(ch).some(Boolean) && email) ch.email = true;
    return ch;
  };

  MY.volunteerFromInput = function volunteerFromInput(f, today) {
    const channels = f.channels || channelsFrom(f.channel, f.email, f.phone);
    const ts = f.timestamp && /^\d{4}-\d\d-\d\d/.test(f.timestamp) ? f.timestamp.slice(0, 10) :
      f.timestamp && !isNaN(Date.parse(f.timestamp)) ? MY.iso(new Date(f.timestamp)) : null;
    return {
      id: MY.uid('v'),
      name: String(f.name || '').trim(),
      email: String(f.email || '').trim().toLowerCase(),
      phone: String(f.phone || '').trim(),
      neighborhood: String(f.neighborhood || '').trim(),
      interests: MY.tagList(f.interests),
      skills: MY.tagList(f.skills),
      availability: MY.tagList(f.availability),
      channels,
      preferred: (MY.CHANNELS.map((c) => c[0]).find((c) => channels[c])) || null,
      signedUpAt: ts || MY.today(today),
      wantsToLead: !!f.wantsToLead,
      lead: false,
      touches: [],
      notes: String(f.notes || ''),
      source: String(f.source || '').trim(),
      awards: [],
      publicRecognition: false,
    };
  };

  MY.parseSignups = function parseSignups(csvText, today) {
    const rows = MY.parseCSV(csvText).map(mapHeaders);
    const volunteers = [], skipped = [];
    rows.forEach((r, i) => (r.name ? volunteers.push(MY.volunteerFromInput(r, today)) : skipped.push(i + 2)));
    return { volunteers, skipped };
  };

  // ---------- dedupe ----------
  const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
  const sameName = (a, b) => a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    (a.neighborhood || '').toLowerCase() === (b.neighborhood || '').toLowerCase();
  MY.isSamePerson = (a, b) => (a.email && a.email === b.email) || (digits(a.phone).length === 10 && digits(a.phone) === digits(b.phone)) || sameName(a, b);

  // Merging fills gaps and unions tags; it never overwrites what a coordinator already recorded.
  MY.mergeVolunteers = function mergeVolunteers(existing, incoming) {
    const list = existing.map(MY.clone);
    let added = 0, merged = 0;
    incoming.forEach((n) => {
      const m = list.find((v) => MY.isSamePerson(v, n));
      if (!m) { list.push(n); added++; return; }
      merged++;
      ['email', 'phone', 'neighborhood'].forEach((k) => { if (!m[k] && n[k]) m[k] = n[k]; });
      ['interests', 'skills', 'availability'].forEach((k) => { m[k] = [...new Set([...(m[k] || []), ...(n[k] || [])])]; });
      Object.keys(n.channels || {}).forEach((c) => { if (n.channels[c]) m.channels[c] = true; });
      if (!m.preferred) m.preferred = n.preferred;
      if (n.signedUpAt < m.signedUpAt) m.signedUpAt = n.signedUpAt;
    });
    return { list, added, merged };
  };

  // ---------- history and stage ----------
  MY.volunteerHistory = function volunteerHistory(v, events, today) {
    const past = events.filter((e) => e.date <= today);
    const attended = past.filter((e) => (e.attended || []).includes(v.id)).map((e) => e.date).sort();
    const noShows = past.filter((e) => e.date < today && (e.rsvps || []).includes(v.id) && !(e.attended || []).includes(v.id)).length;
    const upcoming = events.filter((e) => e.date >= today && (e.rsvps || []).includes(v.id) && !(e.attended || []).includes(v.id))
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
    return { attended, count: attended.length, first: attended[0] || null, last: attended[attended.length - 1] || null, noShows, upcoming };
  };

  const lastTouch = (v, kind) => (v.touches || []).filter((t) => t.kind === kind).map((t) => t.date).sort().pop() || null;
  MY.lastTouch = lastTouch;

  MY.volunteerStage = function volunteerStage(v, h) {
    if (v.lead) return 'crew-lead';
    if (h.count >= 3) return 'regular';
    if (h.count === 2) return 'returning';
    if (h.count === 1) return 'first';
    return lastTouch(v, 'welcome') ? 'welcomed' : 'signed-up';
  };

  MY.isLapsed = (h, today) => !!h.last && MY.daysBetween(h.last, today) > LAPSED_DAYS;

  MY.pickChannel = (v) => {
    const ch = v.channels || {};
    if (v.preferred && ch[v.preferred]) return v.preferred;
    return (MY.CHANNELS.map((c) => c[0]).find((c) => ch[c])) || null;
  };

  // ---------- next action ----------
  const ACTIONS = {
    welcome: 'Welcome',
    remind: 'Remind before first visit',
    thank: 'Thank after visit',
    'invite-lead': 'Invite to anchor a crew',
    nudge: 'We miss you',
    'check-in': 'Gentle check-in',
    'invite-first': 'Invite to a first visit',
  };
  MY.ACTION_LABELS = ACTIONS;

  const since = (d, today) => (d ? MY.daysBetween(d, today) : Infinity);

  MY.nextVolunteerAction = function nextVolunteerAction(v, h, today) {
    const stage = MY.volunteerStage(v, h);
    const welcomed = lastTouch(v, 'welcome');
    const age = MY.daysBetween(v.signedUpAt, today);
    if (!welcomed && h.count === 0 && age <= 30) {
      return { kind: 'welcome', priority: age >= 2 ? 1 : 2, why: age >= 2 ? `Signed up ${age} days ago and hasn't heard from us` : 'New signup: aim to welcome within 48 hours' };
    }
    if (h.upcoming && h.count === 0 && MY.daysBetween(today, h.upcoming.date) <= 7 && since(lastTouch(v, 'remind'), today) > 7) {
      return { kind: 'remind', priority: 2, why: `First visit coming up ${MY.fmtDate(h.upcoming.date)}: a reminder is the biggest lever on show rate` };
    }
    if (h.last && since(h.last, today) <= THANK_WINDOW && (lastTouch(v, 'thank') || '') < h.last && h.count <= 2) {
      return { kind: 'thank', priority: 2, why: `Came on ${MY.fmtDate(h.last)}. A thank-you after the 1st or 2nd visit drives the return` };
    }
    if (stage === 'regular' && v.wantsToLead && !v.lead && !lastTouch(v, 'invite-lead')) {
      return { kind: 'invite-lead', priority: 3, why: `${h.count} visits and said they'd like to lead` };
    }
    if (MY.isLapsed(h, today) && since(lastTouch(v, 'nudge'), today) > 30) {
      return { kind: 'nudge', priority: 3, why: `Last came ${since(h.last, today)} days ago` };
    }
    if (h.count === 0 && h.noShows >= 2 && since(lastTouch(v, 'check-in'), today) > 30) {
      return { kind: 'check-in', priority: 3, why: `RSVP'd ${h.noShows} times but hasn't made it: the time may not fit` };
    }
    if (h.count === 0 && !h.upcoming && since(lastTouch(v, 'invite-first'), today) > 14 && h.noShows < 2) {
      return { kind: 'invite-first', priority: 3, why: welcomed ? 'Welcomed but no first visit on the calendar yet' : `Signed up ${age} days ago and never came: send a fresh invite` };
    }
    return null;
  };

  MY.volunteerRows = function volunteerRows(state, today) {
    return state.volunteers.map((v) => {
      const h = MY.volunteerHistory(v, state.events, today);
      return { v, h, stage: MY.volunteerStage(v, h), lapsed: MY.isLapsed(h, today), action: MY.nextVolunteerAction(v, h, today) };
    });
  };

  // ---------- messages ----------
  const upcomingOf = (events, type, today) => events.filter((e) => e.type === type && e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
  MY.upcomingEvent = upcomingOf;

  MY.draftVolunteerMessage = function draftVolunteerMessage(kind, v, ctx) {
    const org = ctx.org;
    const first = MY.firstName(v.name.replace(/\s*\(sample\)/, ''));
    const work = ctx.nextWorkday ? MY.fmtDate(ctx.nextWorkday.date) : 'our next Saturday';
    const meet = ctx.nextMeeting ? MY.fmtDate(ctx.nextMeeting.date) : 'the 2nd Monday';
    const rsvp = (org.channels.find((c) => c.id === 'partiful') || {}).url || '';
    const interest = (v.interests && v.interests[0]) ? v.interests[0].replace(/-/g, ' ') : '';
    const sender = ctx.sender || 'the Guild';
    const channel = MY.pickChannel(v);
    const T = {
      welcome: `Hi ${first}! Thanks for signing up with the East Bay Permaculture Guild. We're a volunteer-run crew that gardens together at the Oakland Peace Center and around the East Bay, and no experience is needed. The easiest first step is our next Saturday workday (${work}, 10 AM–2 PM, 111 Fairmount Ave, Oakland): you'll get a buddy and an easy first task, and lunch is shared.${interest ? ` You mentioned ${interest}, so we'll point you to that crew.` : ''} RSVP: ${rsvp}. Questions? Just reply. — ${sender}`,
      'invite-first': `Hi ${first}, it's ${sender} from the Permaculture Guild. Want to come to your first workday? ${work}, 10 AM–2 PM at the Oakland Peace Center. Newcomers get a buddy and a simple task, and you can leave whenever you need to. Or come say hi at the monthly meeting (${meet}, 6 PM). RSVP: ${rsvp}`,
      remind: `Hi ${first}! Looking forward to seeing you ${work} at 10 AM at the Oakland Peace Center, 111 Fairmount Ave. Wear clothes that can get muddy and bring a water bottle. Gloves and tools are there. Look for the welcome table and we'll introduce you to your crew. Can't make it? No problem, just reply so we can plan crews.`,
      thank: `Thanks for coming out, ${first}! It was great to have you at the garden. Our next workday is ${work}${interest ? `, and the ${interest} crew would love to have you back` : ''}. If you're up for it, reply with one thing you enjoyed or one thing that would make it easier to come again.`,
      'invite-lead': `Hi ${first}, you've been a steady part of the garden. Thank you. Would you like to anchor a crew at an upcoming workday? It means welcoming 2–4 people, showing a newcomer the ropes, and checking in at lunch. It's completely fine to say not now.`,
      nudge: `Hi ${first}, we've missed you at the garden! No pressure at all. If Saturdays are tricky, the monthly meeting (${meet}, 6 PM, potluck-style) is a relaxed way to reconnect. We're getting the seed library ready right now${interest ? `, and the ${interest} crew could use you` : ''}. Want me to save you a spot on ${work}?`,
      'check-in': `Hi ${first}, it looks like Saturdays haven't worked out lately, which is completely understandable. Is there a time or kind of activity that would suit you better? Weekday evenings, the monthly meeting, or a one-off project are all options. We'd love to find a fit.`,
    };
    const text = T[kind] || '';
    return {
      kind, channel, text,
      subject: channel === 'email' ? ({ welcome: 'Welcome to the East Bay Permaculture Guild', remind: `See you ${work}!`, thank: 'Thanks for coming out' }[kind] || 'From the East Bay Permaculture Guild') : null,
      inPerson: !channel,
      findings: MY.checkCopy(text, { publicAddresses: org.publicAddresses }),
    };
  };

  MY.recordTouch = function recordTouch(v, kind, date) {
    v.touches = (v.touches || []).concat([{ date, kind }]);
    return v;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

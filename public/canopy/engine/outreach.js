// Messaging: templates with merge fields, audience segments, consent filtering, SMS segment math,
// and send paths (provider via server.mjs, or mailto / sms / WhatsApp deep links).
(function (root) {
  'use strict';
  const MY = root.MY;

  MY.MERGE_FIELDS = ['first_name', 'next_workday', 'next_meeting', 'seeds', 'tier', 'next_tier', 'seeds_to_next', 'referral_code', 'rsvp_link', 'sender'];

  MY.TEMPLATES = [
    { id: 'welcome', name: 'Welcome', subject: 'Welcome to the East Bay Permaculture Guild',
      body: 'Hi {{first_name}}! Thanks for joining the East Bay Permaculture Guild. No experience needed. Come to our next workday on {{next_workday}}, 10 AM–2 PM at the Oakland Peace Center, 111 Fairmount Ave. You\'ll get a buddy, lunch is shared, and your first visit earns +15 Seeds toward perks like free seed packets. RSVP: {{rsvp_link}} — {{sender}}' },
    { id: 'remind', name: 'Workday reminder', subject: 'See you {{next_workday}}',
      body: 'Hi {{first_name}}, see you {{next_workday}} at 10 AM at the Oakland Peace Center. Wear clothes that can get muddy and bring water; gloves and tools are there. Can\'t make it? Just reply so we can plan crews.' },
    { id: 'thank', name: 'Thank you', subject: 'Thanks for coming out',
      body: 'Thanks for coming out, {{first_name}}! You\'re at {{seeds}} Seeds, {{seeds_to_next}} from {{next_tier}}. Next workday is {{next_workday}}, and your crew would love to have you back.' },
    { id: 'nudge', name: 'We miss you', subject: 'We miss you at the garden',
      body: 'Hi {{first_name}}, we\'ve missed you at the garden. No pressure. If Saturdays are tricky, the monthly meeting ({{next_meeting}}, 6 PM, potluck) is an easy way to reconnect. Want me to save you a spot on {{next_workday}}?' },
    { id: 'referral', name: 'Bring a neighbor', subject: 'Bring a neighbor, earn 25 Seeds',
      body: 'Hi {{first_name}}! Know someone who\'d love the garden? Share your code {{referral_code}}. When they come to their first workday you both get a warm welcome, and you earn +25 Seeds. Next workday: {{next_workday}}. RSVP: {{rsvp_link}}' },
    { id: 'reward', name: 'Almost the next tier', subject: 'You\'re {{seeds_to_next}} Seeds from {{next_tier}}',
      body: 'Hi {{first_name}}, you\'re {{seeds_to_next}} Seeds from {{next_tier}}! One more workday ({{next_workday}}) gets you there. Thanks for everything you put into the garden.' },
    { id: 'event', name: 'Event announcement', subject: 'Garden workday {{next_workday}}',
      body: 'Hi {{first_name}}, our next garden workday is {{next_workday}}, 10 AM–2 PM at the Oakland Peace Center. We\'re working on the seed library, greenhouse, and Fennel Hill. Every visit earns Seeds. RSVP: {{rsvp_link}}' },
  ];

  MY.SEGMENTS = [
    ['all', 'Everyone'], ['new', 'New signups (no visit yet)'], ['unwelcomed', 'Not yet welcomed (last 30 days)'], ['upcoming-first', 'First-timers RSVP\'d to next workday'],
    ['active', 'Active (30 days)'], ['cooling', 'Cooling (31–60 days)'], ['at-risk', 'At risk (61–90 days)'], ['lapsed', 'Lapsed (90+ days)'],
    ['almost-tier', 'Within 15 Seeds of next tier'], ['leads', 'Crew leads'],
  ];

  MY.segmentIds = function segmentIds(state, today, seg) {
    const rows = MY.rosterRows(state, today);
    const next = MY.upcomingEvent(state.events, 'workday', today);
    const pick = {
      all: () => true,
      new: (r) => r.health === 'new',
      unwelcomed: (r) => r.visits === 0 && MY.daysBetween(r.v.signedUpAt, today) <= 30 && !(r.v.touches || []).some((t) => t.kind === 'welcome'),
      'upcoming-first': (r) => r.visits === 0 && next && (next.rsvps || []).includes(r.v.id),
      active: (r) => r.health === 'active', cooling: (r) => r.health === 'cooling', 'at-risk': (r) => r.health === 'at-risk', lapsed: (r) => r.health === 'lapsed',
      'almost-tier': (r) => r.tier.next && r.tier.toNext <= 15,
      leads: (r) => r.v.lead,
    }[seg] || (() => false);
    return rows.filter(pick).map((r) => r.v.id);
  };

  const digits = (p) => String(p || '').replace(/\D/g, '');
  MY.e164 = (p) => { const d = digits(p); return d.length === 10 ? `+1${d}` : d.length === 11 && d[0] === '1' ? `+${d}` : d ? `+${d}` : ''; };

  // Who can actually receive this message on this channel, and why the rest can't.
  MY.resolveRecipients = function resolveRecipients(state, ids, channel) {
    const ok = [], excluded = [];
    ids.map((id) => state.volunteers.find((v) => v.id === id)).filter(Boolean).forEach((v) => {
      const ch = v.channels || {};
      if (channel === 'email') { if (ch.email && v.email) ok.push({ v, address: v.email }); else excluded.push({ v, reason: v.email ? 'No email consent' : 'No email on file' }); }
      else if (channel === 'sms') { if (ch.sms && v.phone) ok.push({ v, address: MY.e164(v.phone) }); else excluded.push({ v, reason: v.phone ? 'No text consent' : 'No phone on file' }); }
      else if (channel === 'whatsapp') { if (ch.whatsapp && v.phone) ok.push({ v, address: MY.e164(v.phone) }); else excluded.push({ v, reason: v.phone ? 'No WhatsApp consent' : 'No phone on file' }); }
    });
    return { ok, excluded };
  };

  MY.mergeContext = function mergeContext(state, today, sender) {
    const rw = MY.rewardsSummary(state, today);
    return {
      today, sender: sender || 'the Guild',
      nextWorkday: MY.upcomingEvent(state.events, 'workday', today), nextMeeting: MY.upcomingEvent(state.events, 'meeting', today),
      rsvp: (state.org.channels.find((c) => c.id === 'partiful') || {}).url || '',
      people: Object.fromEntries(rw.people.map((p) => [p.v.id, p])),
    };
  };

  MY.renderTemplate = function renderTemplate(text, v, mc) {
    const p = mc.people[v.id] || { points: 0, t: MY.tierFor(0) };
    const vals = {
      first_name: MY.firstName(v.name), next_workday: mc.nextWorkday ? MY.fmtDate(mc.nextWorkday.date) : 'our next Saturday',
      next_meeting: mc.nextMeeting ? MY.fmtDate(mc.nextMeeting.date) : 'the 2nd Monday', seeds: String(p.points), tier: p.t.tier.name,
      next_tier: p.t.next ? p.t.next.name : 'the top tier', seeds_to_next: String(p.t.toNext), referral_code: MY.referralCode(v), rsvp_link: mc.rsvp, sender: mc.sender,
    };
    return String(text || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => (k in vals ? vals[k] : m));
  };

  MY.unknownFields = (text) => [...new Set((String(text).match(/\{\{\s*([a-z_]+)\s*\}\}/g) || []).map((m) => m.replace(/[{}\s]/g, '')).filter((k) => !MY.MERGE_FIELDS.includes(k)))];

  const GSM = /^[\n\r @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
  MY.smsSegments = function smsSegments(text) {
    const t = String(text || '');
    const gsm = GSM.test(t);
    const len = gsm ? [...t].reduce((s, c) => s + ('^{}\\[~]|€'.includes(c) ? 2 : 1), 0) : [...t].length;
    const single = gsm ? 160 : 70, multi = gsm ? 153 : 67;
    return { length: len, encoding: gsm ? 'GSM-7' : 'Unicode', segments: len === 0 ? 0 : len <= single ? 1 : Math.ceil(len / multi) };
  };

  // Deep links work from a static file: they open the user's own mail / messaging app with everything filled in.
  MY.mailtoLinks = function mailtoLinks(addresses, subject, body, batch) {
    const size = batch || 40;
    const out = [];
    for (let i = 0; i < addresses.length; i += size) {
      const chunk = addresses.slice(i, i + size);
      const q = `subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
      out.push(chunk.length === 1 ? `mailto:${encodeURIComponent(chunk[0])}?${q}` : `mailto:?bcc=${chunk.map(encodeURIComponent).join(',')}&${q}`);
    }
    return out;
  };
  MY.smsLink = (phone, body) => `sms:${MY.e164(phone)}?&body=${encodeURIComponent(body || '')}`;
  MY.waLink = (phone, body) => `https://wa.me/${MY.e164(phone).replace('+', '')}?text=${encodeURIComponent(body || '')}`;

  // Personalised messages, one per eligible recipient, each checked by the guardrails.
  MY.buildMessages = function buildMessages(state, today, opts) {
    const mc = MY.mergeContext(state, today, opts.sender);
    const { ok, excluded } = MY.resolveRecipients(state, opts.ids, opts.channel);
    const messages = ok.map(({ v, address }) => {
      const body = MY.renderTemplate(opts.body, v, mc);
      return { volunteerId: v.id, name: v.name, to: address, subject: opts.channel === 'email' ? MY.renderTemplate(opts.subject, v, mc) : null, body, findings: MY.checkCopy(body, { publicAddresses: state.org.publicAddresses }) };
    });
    return { messages, excluded, blocked: messages.some((m) => MY.isBlocked(m.findings)), unknown: MY.unknownFields(`${opts.subject || ''} ${opts.body || ''}`) };
  };

  MY.logSend = function logSend(state, entry, today) {
    const touchKind = { welcome: 'welcome', remind: 'remind', thank: 'thank', nudge: 'nudge' }[entry.template];
    entry.messages.forEach((m) => {
      state.outbox.unshift({ id: MY.uid('o'), date: today, to: m.to, name: m.name, channel: entry.channel, via: entry.via, subject: m.subject, body: m.body, status: entry.status || 'handed off' });
      const v = state.volunteers.find((x) => x.id === m.volunteerId);
      if (v && touchKind) MY.recordTouch(v, touchKind, today);
    });
    state.campaigns.unshift({ id: MY.uid('c'), name: entry.name || 'Message', channel: entry.channel, sentAt: today, recipients: entry.messages.length, delivered: null, opened: null, clicked: null, template: entry.template || 'custom', via: entry.via, status: entry.status || 'handed off' });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

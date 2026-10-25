const test = require('node:test');
const assert = require('node:assert/strict');
const MY = require('./load.cjs')();

const T = '2026-10-25';
const seed = () => MY.seedState(T);
const F = { days: 90, neighborhood: 'all', source: 'all' };

test('seed is deterministic, fictional, and keeps the real Guild data', () => {
  const a = seed(), b = seed();
  assert.equal(JSON.stringify(a.volunteers), JSON.stringify(b.volunteers));
  assert.equal(a.volunteers.length, 156);
  assert.equal(new Set(a.volunteers.map((v) => v.name)).size, a.volunteers.length, 'names unique');
  a.volunteers.forEach((v) => {
    assert.ok(!v.email || v.email.endsWith('@example.org'), v.email);
    assert.ok(!v.phone || /555-01\d\d/.test(v.phone), v.phone);
    assert.ok(v.sample);
  });
  assert.equal(a.partners.length, 8);
  assert.ok(a.partners.every((p) => p.source && !/@/.test(JSON.stringify(p))));
  assert.ok(a.sites.find((s) => s.id === 'site-opc' && !s.sample));
  const empty = MY.seedState(T, { samples: false });
  assert.equal(empty.volunteers.length, 0);
  assert.equal(empty.partners.length, 8);
  assert.equal(MY.validateState(empty).ok, true);
});

test('kpis compare current vs prior window and carry sparklines', () => {
  const k = MY.kpis(seed(), T, F);
  assert.deepEqual(k.map((x) => x.id), ['active', 'signups', 'show', 'retention', 'hours', 'referrals']);
  k.forEach((x) => { assert.ok(x.value != null, x.id); if (x.spark) assert.equal(x.spark.length, 12); });
  const show = k.find((x) => x.id === 'show');
  assert.ok(show.value > 0 && show.value <= 100);
  assert.equal(show.delta, show.value - show.prior);
});

test('filters narrow every metric', () => {
  const s = seed();
  const all = MY.kpis(s, T, F)[0].value;
  const one = MY.kpis(s, T, Object.assign({}, F, { neighborhood: 'Berkeley' }))[0].value;
  assert.ok(one < all && one > 0);
  const src = MY.sources(s, T, Object.assign({}, F, { days: 365 }));
  assert.equal(src.reduce((n, r) => n + r.signups, 0), MY.funnel(s, T, { days: 365 })[0].count);
});

test('funnel is monotone and the market funnel flags a bottleneck', () => {
  const s = seed();
  const fn = MY.funnel(s, T, { days: 365 });
  for (let i = 2; i < fn.length; i++) assert.ok(fn[i].count <= fn[i - 1].count + 0, fn[i].label);
  const mf = MY.marketFunnel(s, T, { days: 365 });
  assert.equal(mf.steps[0].estimate, true);
  assert.equal(mf.steps[0].count, Math.round(mf.reach.gross * (1 - MY.REACH_OVERLAP)));
  assert.ok(mf.bottleneck && ['Welcomed', 'First visit', 'Came back', 'Regular (3+)'].includes(mf.bottleneck.label));
  const plan = MY.growthPlan(mf, MY.kpis(s, T, { days: 365 }));
  assert.equal(plan.windows.length, 3);
  assert.equal(plan.focus.step, mf.bottleneck.label);
});

test('cohorts, health, weekly series, reachability add up', () => {
  const s = seed();
  const coh = MY.cohorts(s, T, F, 6);
  assert.equal(coh.length, 6);
  coh.forEach((c) => { if (c.size) assert.equal(c.cells[0], 100); });
  assert.equal(coh[5].cells.slice(1).every((x) => x == null), true, 'current month has no future columns');
  const h = MY.healthCounts(s, T, F);
  assert.equal(Object.values(h).reduce((a, b) => a + b, 0), s.volunteers.length);
  const w = MY.weeklySeries(s, T, F);
  assert.ok(w.length >= 13 && w.length <= 15);
  assert.ok(MY.weeklySeries(s, T, { days: 365 }).length <= 13, 'long ranges are monthly');
  assert.equal(MY.reachability(s, F).reduce((a, r) => a + r.value, 0), s.volunteers.length);
});

test('rewards: ledger explains points, tiers and referrals count only when the friend shows up', () => {
  const s = seed();
  const rw = MY.rewardsSummary(s, T);
  rw.people.forEach((p) => assert.equal(p.points, p.ledger.reduce((a, x) => a + x.points, 0)));
  assert.equal(rw.tierCounts.reduce((a, t) => a + t.count, 0), s.volunteers.length);
  assert.equal(MY.tierFor(0).tier.id, 'seed');
  assert.equal(MY.tierFor(50).tier.id, 'sprout');
  assert.equal(MY.tierFor(149).toNext, 1);
  assert.equal(MY.tierFor(300).next, null);
  // A referral with no attendance earns nothing.
  const v = s.volunteers[0];
  const before = MY.pointsLedger(v, s, T).filter((x) => x.category === 'Grow').length;
  s.volunteers.push({ id: 'v-new', name: 'Newbie Q.', referredBy: v.id, signedUpAt: T, channels: {}, touches: [], awards: [] });
  assert.equal(MY.pointsLedger(v, s, T).filter((x) => x.category === 'Grow').length, before);
  s.events.find((e) => e.date <= T && e.type === 'workday' && e.date > '2026-10-01').attended.push('v-new');
  assert.equal(MY.pointsLedger(v, s, T).filter((x) => x.category === 'Grow').length, before + 1);
  assert.ok(rw.almost.every((p) => p.t.toNext <= 15));
  assert.match(MY.referralCode(v), /^[A-Z]+-\d+$/);
});

test('outreach: segments, consent filtering, merge fields, guardrails', () => {
  const s = seed();
  const ids = MY.segmentIds(s, T, 'all');
  const sms = MY.resolveRecipients(s, ids, 'sms');
  assert.equal(sms.ok.length + sms.excluded.length, ids.length);
  sms.ok.forEach((r) => { assert.ok(r.v.channels.sms); assert.match(r.address, /^\+1\d{10}$/); });
  const em = MY.resolveRecipients(s, ids, 'email');
  em.ok.forEach((r) => assert.ok(r.v.channels.email && r.v.email));
  const tpl = MY.TEMPLATES.find((t) => t.id === 'thank');
  const out = MY.buildMessages(s, T, { ids: ids.slice(0, 10), channel: 'email', subject: tpl.subject, body: tpl.body, sender: 'Alex' });
  out.messages.forEach((m) => { assert.ok(!/\{\{/.test(m.body), m.body); assert.deepEqual(m.findings, []); });
  MY.TEMPLATES.forEach((t) => {
    const r = MY.buildMessages(s, T, { ids: ids.slice(0, 5), channel: 'email', subject: t.subject, body: t.body });
    assert.equal(r.blocked, false, t.id);
    assert.deepEqual(r.unknown, []);
  });
  const bad = MY.buildMessages(s, T, { ids: ids.slice(0, 3), channel: 'email', subject: 'x', body: 'Guaranteed spot {{nickname}}' });
  assert.equal(bad.blocked, true);
  assert.deepEqual(bad.unknown, ['nickname']);
  const unw = MY.segmentIds(s, T, 'unwelcomed').map((id) => s.volunteers.find((v) => v.id === id));
  assert.ok(unw.every((v) => MY.daysBetween(v.signedUpAt, T) <= 30));
});

test('sms segments and deep links', () => {
  assert.deepEqual(MY.smsSegments('hi'), { length: 2, encoding: 'GSM-7', segments: 1 });
  assert.equal(MY.smsSegments('x'.repeat(161)).segments, 2);
  assert.equal(MY.smsSegments('🌱 hi').encoding, 'Unicode');
  assert.equal(MY.smsSegments('é'.repeat(70)).segments, 1);
  assert.equal(MY.smsSegments('€'.repeat(81)).segments, 2, '€ counts double in GSM-7');
  const links = MY.mailtoLinks(Array.from({ length: 85 }, (_, i) => `p${i}@example.org`), 'Hi', 'Body & more');
  assert.equal(links.length, 3);
  assert.match(links[0], /^mailto:\?bcc=/);
  assert.match(links[0], /body=Body%20%26%20more/);
  assert.match(MY.mailtoLinks(['a@example.org'], 's', 'b')[0], /^mailto:a%40example\.org\?/);
  assert.equal(MY.smsLink('(510) 555-0100', 'Hi there'), 'sms:+15105550100?&body=Hi%20there');
  assert.equal(MY.waLink('(510) 555-0100', 'Hi'), 'https://wa.me/15105550100?text=Hi');
});

test('logSend records outbox, campaign, and touches that clear actions', () => {
  const s = seed();
  const ids = MY.segmentIds(s, T, 'unwelcomed');
  assert.ok(ids.length > 0);
  const t = MY.TEMPLATES[0];
  const b = MY.buildMessages(s, T, { ids, channel: 'email', subject: t.subject, body: t.body });
  MY.logSend(s, { name: 'Welcome', channel: 'email', via: 'Mail app', template: 'welcome', messages: b.messages }, T);
  assert.equal(s.outbox.length, b.messages.length);
  assert.equal(s.campaigns[0].recipients, b.messages.length);
  const left = MY.segmentIds(s, T, 'unwelcomed');
  assert.equal(left.length, ids.length - b.messages.length);
});

test('crews reuse v4 engine on the next workday', () => {
  const s = seed();
  const e = MY.upcomingEvent(s.events, 'workday', T);
  assert.ok(e.projects.length);
  const plan = MY.formCrews(e, s.volunteers, s.events);
  const placed = plan.crews.flatMap((c) => (c.anchor ? [c.anchor.id] : []).concat(c.members.map((m) => m.id))).concat(plan.floaters.map((f) => f.id));
  assert.equal(new Set(placed).size, e.rsvps.length);
});

test('partners, sites, and exports', () => {
  const s = seed();
  const pf = MY.partnerFunnel(s);
  assert.equal(pf[0].count, 8);
  assert.ok(pf.every((x, i) => !i || x.count <= pf[i - 1].count));
  assert.ok(MY.partnerImpact(s, T).some((x) => x.referred > 0));
  const sf = MY.siteFunnel(s);
  assert.ok(sf.every((x, i) => !i || x.count <= sf[i - 1].count));
  const mc = MY.mailchimpCSV(s);
  assert.match(mc.split('\n')[0], /^Email Address,First Name/);
  assert.equal(mc.split('\n').length - 1, s.volunteers.filter((v) => v.channels.email && v.email).length);
  const ics = MY.eventsICS(s, T);
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, s.events.filter((e) => e.date >= T).length);
  assert.ok(ics.includes('\r\n'));
});

// Starting data. The org, channels, and OPC project areas are real (from east-bay-permaculture-contacts.md).
// The workspace (people, attendance, campaigns) is generated, deterministic, and fictional:
// emails use example.org and phones use the reserved 555-01xx range.
(function (root) {
  'use strict';
  const MY = root.MY;

  MY.ORG = {
    name: 'East Bay Permaculture Guild',
    short: 'EBPG',
    parent: 'Collective Resilience',
    website: 'https://collectiveresiliencenow.org/east-bay-permaculture-guild/',
    meeting: { when: '2nd Mondays, 6:00–8:30 PM', where: 'Oakland Peace Center, Grace Room, 111 Fairmount Ave, Oakland' },
    workday: { when: 'Saturdays 10:00 AM–2:00 PM' },
    channels: [
      { id: 'partiful', name: 'Partiful', url: 'https://partiful.com/u/PcnFYcpQOwCLdVFxzZ3i' },
      { id: 'listserv', name: 'Listserv signup', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeOsRcMnW2NFCFLemG9S7bgbUgVxIjOIoiKAdr0ukfdWkDokg/viewform' },
      { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/eastbaypermacultureguild/' },
      { id: 'linktree', name: 'Linktree', url: 'https://linktr.ee/eastbaypermacultureguild' },
      { id: 'donate', name: 'Donate (Zeffy)', url: 'https://www.zeffy.com/en-US/donation-form/donate-to-support-the-east-bay-permaculture-guild-2' },
    ],
    publicAddresses: ['111 Fairmount Ave'],
  };

  MY.OPC_PROJECTS = [
    { id: 'greenhouse', area: 'Greenhouse & guild boxes', need: 'Set up benches, pot up starts', tags: ['carpentry', 'plants'], min: 2, max: 5 },
    { id: 'seed-library', area: 'Seed library', need: 'Sort, label, and package seeds', tags: ['seeds', 'teaching'], min: 2, max: 4 },
    { id: 'signage', area: 'Signage & plant labels', need: 'Paint signs and write plant labels', tags: ['design', 'outreach'], min: 2, max: 4 },
    { id: 'fennel-hill', area: 'Entrance garden / "Fennel Hill"', need: 'Mulch paths, clear fennel', tags: ['mulch', 'labor'], min: 3, max: 8 },
    { id: 'welcome', area: 'Welcome table', need: 'Name tags, sign-in, first-timer intros', tags: ['outreach', 'teaching'], min: 1, max: 2 },
  ];

  MY.SOURCES = ['Instagram', 'Partiful', 'Friend referral', 'Monthly meeting', 'Partner org', 'Listserv', 'Flyer / QR sign', 'Unconference'];
  MY.NEIGHBORHOODS = ['Fruitvale', 'Temescal', 'West Oakland', 'Lake Merritt', 'North Oakland', 'Downtown Oakland', 'Berkeley', 'Richmond', 'Alameda', 'Emeryville', 'San Antonio', 'East Oakland'];
  MY.EVENT_HOURS = { workday: 4, meeting: 2.5, workshop: 2 };
  MY.EVENT_CAPACITY = { workday: 30, meeting: 60, workshop: 20 };

  // mulberry32: small, fast, deterministic.
  MY.rng = function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const pickW = (r, items, weights) => {
    const total = weights.reduce((s, w) => s + w, 0);
    let x = r() * total;
    for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  };

  const FIRST = ['Rosa', 'Bea', 'Dev', 'Kai', 'Tomás', 'Priya', 'Luis', 'Noor', 'Hana', 'Marcus', 'Lena', 'Eli', 'Jo', 'Ari', 'Sam', 'Maya', 'Omar', 'June', 'Theo', 'Ines',
    'Kofi', 'Mei', 'Ravi', 'Sofia', 'Dani', 'Amara', 'Felix', 'Yuki', 'Leila', 'Mateo', 'Grace', 'Isaac', 'Zara', 'Nico', 'Aisha', 'Ben', 'Carmen', 'Diego', 'Esme', 'Farah',
    'Gus', 'Ivy', 'Jamal', 'Kira', 'Liam', 'Mina', 'Nate', 'Olu', 'Pia', 'Quinn', 'Rae', 'Sana', 'Tariq', 'Uma', 'Vic', 'Wren', 'Xochitl', 'Yara', 'Zeke', 'Alma',
    'Bo', 'Cleo', 'Dara', 'Emil', 'Fern', 'Gio', 'Hollis', 'Ibrahim', 'Jade', 'Kenji', 'Lupe', 'Malik', 'Nadia', 'Oscar', 'Paz', 'Remy', 'Sage', 'Tess', 'Vera', 'Willa'];
  const INTERESTS = ['plants', 'seeds', 'compost', 'mulch', 'design', 'carpentry', 'food', 'teaching', 'outreach', 'water', 'social-media', 'labor'];

  function buildEvents(t, r) {
    const start = MY.addDays(t, -364);
    const end = MY.addDays(t, 35);
    const events = [];
    const workshops = ['Seed saving 101', 'Sheet mulching hands-on', 'Intro to permaculture design', 'Grafting fruit trees', 'Compost basics', 'Native plants of the East Bay', 'Rainwater harvesting'];
    let w = 0;
    for (let d = start; d <= end; d = MY.addDays(d, 1)) {
      const dom = +d.slice(8, 10);
      const wd = MY.weekday(d);
      if (wd === 6 && ((dom >= 8 && dom <= 14) || (dom >= 22 && dom <= 28))) {
        events.push({ id: `e-${d}`, title: 'Saturday garden workday', date: d, type: 'workday', capacity: MY.EVENT_CAPACITY.workday, projects: [], crews: null, rsvps: [], attended: [], partnerIds: [], sample: true });
      }
      if (wd === 1 && dom >= 8 && dom <= 14) {
        events.push({ id: `e-${d}`, title: 'Monthly Guild meeting', date: d, type: 'meeting', capacity: MY.EVENT_CAPACITY.meeting, projects: [], crews: null, rsvps: [], attended: [], partnerIds: [], sample: true });
      }
      if (wd === 0 && dom >= 15 && dom <= 21 && (+d.slice(5, 7)) % 2 === 0) {
        events.push({ id: `e-${d}`, title: `Workshop: ${workshops[w++ % workshops.length]}`, date: d, type: 'workshop', capacity: MY.EVENT_CAPACITY.workshop, projects: [], crews: null, rsvps: [], attended: [], partnerIds: [], sample: true });
      }
    }
    const nextWorkday = events.find((e) => e.type === 'workday' && e.date >= t);
    if (nextWorkday) nextWorkday.projects = MY.clone(MY.OPC_PROJECTS);
    events.filter((e) => e.type === 'workday' && r() < 0.15).forEach((e) => { e.title = 'Saturday garden workday (co-hosted with Wood Street Commons)'; });
    return events;
  }

  function buildVolunteers(t, events, r) {
    const N = 156;
    const vols = [];
    let phone = 100;
    const usedEmail = new Set(), usedNames = new Set();
    for (let i = 0; i < N; i++) {
      // More signups recently: the Guild is growing.
      const offset = Math.round(364 * Math.pow(r(), 0.8));
      const signedUpAt = MY.addDays(t, -offset);
      const first = FIRST[i % FIRST.length];
      let last = String.fromCharCode(65 + Math.floor(r() * 26));
      while (usedNames.has(`${first} ${last}`)) last = String.fromCharCode(65 + ((last.charCodeAt(0) - 64) % 26));
      usedNames.add(`${first} ${last}`);
      const hasEmail = r() < 0.9;
      let email = '';
      if (hasEmail) {
        let base = `${first.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.${last.toLowerCase()}`;
        let n = 1;
        while (usedEmail.has(base + (n > 1 ? n : ''))) n++;
        base += n > 1 ? n : '';
        usedEmail.add(base);
        email = `${base}@example.org`;
      }
      const sms = r() < 0.55, whatsapp = r() < 0.3;
      const ac = ['510', '415', '925'][Math.floor(phone / 200) % 3];
      const ph = (sms || whatsapp) ? `(${ac}) 555-01${String(phone++ % 100).padStart(2, '0')}` : '';
      const channels = { email: hasEmail && r() < 0.95, sms: sms && !!ph, whatsapp: whatsapp && !!ph };
      const preferred = channels.sms && r() < 0.4 ? 'sms' : channels.email ? 'email' : channels.whatsapp ? 'whatsapp' : channels.sms ? 'sms' : null;
      const interests = [...new Set([INTERESTS[Math.floor(r() * INTERESTS.length)], INTERESTS[Math.floor(r() * INTERESTS.length)]])];
      vols.push({
        id: `v-${String(i + 1).padStart(3, '0')}`, name: `${first} ${last}.`, email, phone: ph,
        neighborhood: pickW(r, MY.NEIGHBORHOODS, [14, 12, 11, 10, 9, 8, 9, 6, 6, 4, 5, 6]),
        source: pickW(r, MY.SOURCES, [24, 18, 16, 12, 10, 8, 7, 5]),
        referredBy: null, signedUpAt, channels, preferred, interests,
        skills: r() < 0.5 ? [interests[0]] : [], availability: ['sat'],
        wantsToLead: r() < 0.15, lead: false, publicRecognition: r() < 0.7,
        touches: [], awards: [], notes: '', sample: true,
        _p: Math.pow(r(), 1.3) * 0.85 + 0.05, // how likely they are to keep coming
      });
    }
    vols.sort((a, b) => (a.signedUpAt < b.signedUpAt ? -1 : 1));

    // Attendance simulation.
    vols.forEach((v) => {
      const window = events.filter((e) => e.date >= v.signedUpAt);
      let active = true, came = 0;
      const firstChance = r() < 0.66;
      window.forEach((e, idx) => {
        const future = e.date > t;
        if (!active) return;
        let want;
        if (came === 0) want = firstChance && idx < 4 && e.type !== 'meeting' ? 0.5 : (idx < 10 ? 0.03 : 0);
        else want = v._p * (e.type === 'workday' ? 0.8 : e.type === 'meeting' ? 0.45 : 0.35);
        if (r() < want) {
          e.rsvps.push(v.id);
          if (!future && r() < (came === 0 ? 0.68 : 0.8)) { e.attended.push(v.id); came++; }
        }
        if (!future && came > 0 && e.type === 'workday' && r() < 0.06 * (1 - v._p)) active = false; // drifts away
      });
    });

    // Referrals: "Friend referral" signups point to someone who joined before them and showed up.
    const attendedIds = new Set(events.flatMap((e) => e.attended));
    vols.forEach((v, i) => {
      if (v.source !== 'Friend referral') return;
      const pool = vols.slice(0, i).filter((x) => attendedIds.has(x.id));
      if (pool.length) v.referredBy = pool[Math.floor(Math.pow(r(), 2) * pool.length)].id; // a few people refer a lot
    });

    // Welcomes: most get one within a few days; recent ones are the backlog.
    vols.forEach((v) => {
      const age = MY.daysBetween(v.signedUpAt, t);
      if ((age > 6 && r() < 0.78) || (age <= 6 && age > 2 && r() < 0.3)) v.touches.push({ date: MY.addDays(v.signedUpAt, Math.floor(r() * 4)), kind: 'welcome' });
    });

    // Leads: the most regular people who said they'd like to lead.
    const counts = Object.fromEntries(vols.map((v) => [v.id, events.filter((e) => e.attended.includes(v.id)).length]));
    vols.slice().sort((a, b) => counts[b.id] - counts[a.id]).slice(0, 7).forEach((v, i) => {
      v.lead = true; v.wantsToLead = true;
      if (i < 4) v.awards.push({ date: MY.addDays(t, -Math.floor(r() * 120) - 5), points: 30, reason: 'Taught a workshop' });
    });
    vols.forEach((v) => { delete v._p; });
    return vols;
  }

  function buildCampaigns(t, vols) {
    const C = (id, name, channel, days, recipients, delivered, opened, clicked, template) => ({ id, name, channel, sentAt: MY.addDays(t, -days), recipients, delivered, opened, clicked, template, via: channel === 'email' ? 'Resend' : 'Twilio', status: 'sent', sample: true });
    return [
      C('c1', 'October workday invite', 'email', 18, 118, 116, 71, 29, 'event'),
      C('c2', 'Seed library volunteers needed', 'email', 33, 96, 95, 52, 18, 'event'),
      C('c3', 'Saturday reminder', 'sms', 8, 41, 40, null, 11, 'remind'),
      C('c4', 'We miss you: fall reconnect', 'email', 45, 38, 37, 17, 6, 'nudge'),
      C('c5', 'Bring a neighbor month', 'email', 60, 104, 101, 49, 22, 'referral'),
      C('c6', 'Sprout tier unlocked', 'sms', 25, 9, 9, null, 4, 'reward'),
    ];
  }


  // Real partner groups (from the contacts file). `history` entries are sample activity.
  MY.REAL_PARTNERS = () => [
    { id: 'p-opc', name: 'Oakland Peace Center (OPC)', stage: 'sharing', focus: ['space', 'food'], route: 'Main venue partner, 111 Fairmount Ave', source: 'Guild site; workday agendas' },
    { id: 'p-wood-street', name: 'Wood Street Commons', stage: 'co-hosted', focus: ['labor'], route: 'Via OPC / EBPG', source: 'Credited with garden work alongside EBPG at OPC' },
    { id: 'p-bay-delta', name: 'Bay Delta Bioregional Unconference', stage: 'co-hosted', focus: ['food', 'land', 'water', 'teaching'], route: 'Via Guild page', source: 'Partner event on the Guild page (150+ changemakers)' },
    { id: 'p-acta', name: 'Acta Non Verba', stage: 'connected', focus: [], route: 'Via OPC / EBPG', source: 'Named in OPC State of the Garden update' },
    { id: 'p-ufo', name: 'Urban Farm Oasis', stage: 'connected', focus: [], route: 'Via OPC / EBPG', source: 'Named in OPC State of the Garden update' },
    { id: 'p-grand-lake', name: 'Grand Lake ACE', stage: 'connected', focus: [], route: 'Via OPC / EBPG', source: 'Named in OPC State of the Garden update' },
    { id: 'p-bay-resistance', name: 'Bay Resistance', stage: 'aware', focus: ['food'], route: 'Via OPC', source: 'Renovated and installed the Mutual Aid Pantry at OPC' },
    { id: 'p-radd', name: 'RADD', stage: 'connected', focus: ['land', 'food'], route: 'Via Guild meeting (speakers Elias & Sarah Reyes)', source: 'Guest speakers: land reform and buyer\'s clubs' },
  ].map((p) => Object.assign({ kind: 'group', lastTouch: null, notes: p.focus.length ? '' : 'Focus not in sources yet.', history: [] }, p));

  function buildSites(t) {
    const d = (n) => MY.addDays(t, n);
    const S = (id, name, type, hood, stage, fit, touch, extra) => Object.assign({
      id, name, type, neighborhood: hood, address: '', isPrivate: false, stage, fit,
      route: '', notes: '', source: 'Sample (fictional)', history: [], lastTouch: touch == null ? null : d(touch), partnerIds: [], sample: true,
    }, extra || {});
    return [
      { id: 'site-opc', name: 'Oakland Peace Center Garden', type: 'community-center', neighborhood: 'Pill Hill, Oakland', address: '111 Fairmount Ave, Oakland', isPrivate: false, stage: 'active',
        fit: { land: 3, water: 2, anchor: 3, access: 3, alignment: 3 }, route: 'Existing partner: workdays and monthly meetings are held here',
        notes: 'Front garden, back lot, tool center, water spigot, greenhouse/guild boxes. Mutual Aid Pantry. Seed library planned by November.',
        source: 'OPC Garden Work Day agendas', history: [], lastTouch: d(-2), partnerIds: ['p-opc'] },
      S('s-lawn', 'Congregation with an unused side lawn', 'faith', 'Fruitvale', 'conversation', { land: 3, water: 2, anchor: 3, access: 2, alignment: 2 }, -20, { route: 'Rosa, a Guild volunteer who attends services there' }),
      S('s-school', 'Elementary school garden needing summer care', 'school', 'West Oakland', 'intro', { land: 2, water: 3, anchor: 2, access: 3, alignment: 3 }, -5, { route: 'a parent volunteer at the school' }),
      S('s-library', 'Branch library: seed library host', 'library', 'Temescal', 'researched', { land: 0, water: 1, anchor: 3, access: 3, alignment: 3 }, -12),
      S('s-lot', 'City-owned vacant lot', 'vacant-lot', 'San Antonio', 'identified', { land: 3, water: 0, anchor: 0, access: 2, alignment: 1 }, null),
      S('s-coop', 'Housing co-op backyard', 'housing', 'North Oakland', 'site-walk', { land: 2, water: 3, anchor: 2, access: 2, alignment: 3 }, -9, { isPrivate: true }),
      S('s-center', 'Community center raised beds', 'community-center', 'Richmond', 'agreement', { land: 2, water: 3, anchor: 3, access: 1, alignment: 3 }, -16, { route: 'Urban Farm Oasis intro', partnerIds: ['p-ufo'] }),
      S('s-cafe', 'Café with a sunny back patio', 'business', 'Temescal', 'declined', { land: 1, water: 2, anchor: 1, access: 3, alignment: 1 }, -40),
    ];
  }

  function buildBoard(t) {
    const d = (n) => MY.addDays(t, n);
    const B = (id, kind, who, text, tags, n) => ({ id, kind, who, text, tags, status: 'open', createdAt: d(n), sample: true });
    const guild = { type: 'guild', id: 'guild', name: 'EBPG' };
    return [
      B('b1', 'need', guild, 'Benches and shelving for the OPC greenhouse', ['carpentry', 'tools'], -6),
      B('b2', 'need', guild, 'Seed envelopes and donated seed for the seed library launch', ['seeds'], -10),
      B('b3', 'need', guild, 'Spanish translation for workday flyers', ['translation', 'outreach'], -3),
      B('b4', 'offer', guild, 'Guild can lead a sheet-mulching workshop at a partner site', ['teaching', 'mulch'], -14),
      B('b5', 'offer', { type: 'other', id: 'x-tools', name: 'Neighborhood tool library' }, 'Can lend wheelbarrows and loppers for workdays', ['tools', 'transport'], -8),
      B('b6', 'need', { type: 'site', id: 's-school', name: 'School garden' }, 'Summer watering crew, two mornings a week', ['water', 'labor'], -4),
    ];
  }

  // Reach is an estimate the Guild enters; the sample values are placeholders to replace.
  MY.DEFAULT_REACH = [
    { id: 'instagram', label: 'Instagram followers', value: 2100 },
    { id: 'listserv', label: 'Listserv subscribers', value: 900 },
    { id: 'partiful', label: 'Partiful event guests (year)', value: 650 },
    { id: 'partners', label: 'Partner newsletters & announcements', value: 1200 },
    { id: 'in-person', label: 'Meetings, flyers & unconference', value: 500 },
  ];
  MY.REACH_OVERLAP = 0.35; // share of people reached by more than one channel (estimate)

  function sampleActivity(t, events, volunteers, partners) {
    const r = MY.rng(77);
    events.filter((e) => /Wood Street/.test(e.title)).forEach((e) => { e.partnerIds = ['p-wood-street']; });
    const ws = events.filter((e) => e.type === 'workshop');
    if (ws.length > 2) { ws[ws.length - 3].partnerIds = ['p-bay-delta']; ws[ws.length - 3].title += ' (with Bay Delta Unconference)'; }
    const partnerIds = ['p-opc', 'p-wood-street', 'p-bay-delta', 'p-acta', 'p-ufo', 'p-grand-lake', 'p-radd'];
    volunteers.filter((v) => v.source === 'Partner org').forEach((v) => { v.partnerId = partnerIds[Math.floor(Math.pow(r(), 1.6) * partnerIds.length)]; });
    const touch = { 'p-opc': -2, 'p-wood-street': -19, 'p-bay-delta': -52, 'p-acta': -38, 'p-ufo': -16, 'p-radd': -70 };
    partners.forEach((p) => {
      if (touch[p.id] != null) {
        p.lastTouch = MY.addDays(t, touch[p.id]);
        p.history = [{ date: p.lastTouch, note: 'Sample activity', play: null, from: p.stage, to: p.stage, sample: true }];
      }
    });
  }

  MY.seedState = function seedState(now, opts) {
    const t = MY.today(now);
    if (opts && opts.samples === false) {
      return { version: 5, org: MY.clone(MY.ORG), volunteers: [], events: [], campaigns: [], outbox: [], partners: MY.REAL_PARTNERS(), sites: buildSites(t).filter((x) => !x.sample), board: [], candidates: [], growth: { reach: MY.clone(MY.DEFAULT_REACH) }, settings: { sender: '', theme: 'light' } };
    }
    const r = MY.rng(20261025);
    const events = buildEvents(t, r);
    const volunteers = buildVolunteers(t, events, r);
    const partners = MY.REAL_PARTNERS();
    sampleActivity(t, events, volunteers, partners);
    return {
      version: 5, org: MY.clone(MY.ORG), volunteers, events, campaigns: buildCampaigns(t, volunteers), outbox: [],
      partners, sites: buildSites(t), board: buildBoard(t), candidates: [],
      growth: { reach: MY.clone(MY.DEFAULT_REACH) }, settings: { sender: '', theme: 'light' },
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

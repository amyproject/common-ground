// Site outreach: places that could host permaculture work, scored for fit, moved through a pipeline,
// with a next step, a stale-follow-up nudge, and an outreach script per site type.
(function (root) {
  'use strict';
  const MY = root.MY;

  MY.FIT_FACTORS = [
    ['land', 'Growing space', 3, 'Beds, lawn, lot, or roof that could be planted'],
    ['anchor', 'Community anchor', 3, 'Someone on site who wants this and will stay involved'],
    ['water', 'Water access', 2, 'A spigot or hookup volunteers can use'],
    ['access', 'Easy to reach', 2, 'Transit, bike, or walking distance for volunteers'],
    ['alignment', 'Mission fit', 2, 'Food, ecology, or community goals that overlap with the Guild'],
  ];
  const MAX_RAW = MY.FIT_FACTORS.reduce((s, f) => s + f[2] * 3, 0);
  const STALE_DAYS = 14;
  const OUTREACH_STAGES = ['researched', 'intro', 'conversation', 'site-walk', 'agreement'];

  // Score out of 100: 85 from the site itself, up to 15 for volunteers who already live nearby.
  MY.siteScore = function siteScore(site, volunteers) {
    const fit = site.fit || {};
    const raw = MY.FIT_FACTORS.reduce((s, [k, , w]) => s + (Math.max(0, Math.min(3, +fit[k] || 0)) * w), 0);
    const hood = String(site.neighborhood || '').toLowerCase().split(',')[0].trim();
    const nearby = hood ? (volunteers || []).filter((v) => String(v.neighborhood || '').toLowerCase().includes(hood)).length : 0;
    const base = Math.round((raw / MAX_RAW) * 85);
    const bonus = Math.min(nearby, 5) * 3;
    const parts = MY.FIT_FACTORS.map(([k, label, w]) => ({ key: k, label, value: +fit[k] || 0, weight: w }));
    const gaps = parts.filter((p) => p.value <= 1).map((p) => p.label.toLowerCase());
    return { score: base + bonus, base, nearby, bonus, parts, gaps };
  };

  const NEXT = {
    identified: 'Look up who stewards it and whether anyone in the Guild or a partner group knows them.',
    researched: 'Find a warm intro (a volunteer, partner, or congregation member) before cold outreach.',
    intro: 'Send the outreach note and offer a short call or a visit at a time that suits them.',
    conversation: 'Listen first: what do they want from the space? Propose a 30-minute site walk.',
    'site-walk': 'Walk the site with them; note sun, water, soil, and access. Agree on one small first project.',
    agreement: 'Write down the simple agreement (who, what, when, water, tools, insurance questions) and schedule a first workday.',
    active: 'Recruit a site steward from the regulars who live nearby and add the site to the workday rotation.',
    'steward-led': 'Check in quarterly. Ask what they need from the Guild and share their wins at the monthly meeting.',
    paused: 'Note why it paused. Revisit in a season.',
    declined: 'Thank them. Ask if you can stay in touch.',
  };

  MY.siteRows = function siteRows(state, today) {
    return state.sites.map((s) => {
      const sc = MY.siteScore(s, state.volunteers);
      const quiet = s.lastTouch ? MY.daysBetween(s.lastTouch, today) : null;
      const stale = OUTREACH_STAGES.includes(s.stage) && (quiet == null || quiet > STALE_DAYS);
      const partners = (s.partnerIds || []).map((id) => state.partners.find((p) => p.id === id)).filter(Boolean);
      return { s, score: sc, quiet, stale, next: NEXT[s.stage] || '', partners };
    }).sort((a, b) => MY.SITE_STAGES.findIndex((x) => x[0] === b.s.stage) - MY.SITE_STAGES.findIndex((x) => x[0] === a.s.stage) || b.score.score - a.score.score);
  };

  MY.moveSite = function moveSite(site, stage, note, today) {
    site.history = (site.history || []).concat([{ date: today, from: site.stage, to: stage, note: note || '' }]);
    site.stage = stage;
    site.lastTouch = today;
    return site;
  };

  // Each script opens with what the place cares about and asks for something small.
  const HOOKS = {
    faith: ['creation care and feeding neighbors', 'a shared garden that members and neighbors tend together (with produce for your pantry or community meals, if you want it)'],
    school: ['hands-on learning outdoors', 'a garden students can learn in, with volunteer help on weekends and over the summer so it doesn\'t go dry'],
    library: ['free, shared community resources', 'a seed library: a small cabinet where neighbors borrow and return seed, plus an occasional seed-saving workshop'],
    'community-center': ['programs that bring neighbors together', 'a community garden space with regular volunteer workdays your members can join'],
    housing: ['residents\' wellbeing and shared outdoor space', 'a resident-led garden, designed with the people who live there, with help on setup from Guild volunteers'],
    'vacant-lot': ['putting unused land to good use for the neighborhood', 'a temporary, low-cost community garden with a clear agreement on access and duration'],
    garden: ['keeping your garden thriving', 'extra hands at workdays, help with a project on your list, and a connection to the wider East Bay permaculture network'],
    business: ['being a good neighbor', 'turning an underused strip or roof into a pollinator or food garden, with Guild volunteers doing setup'],
    public: ['public land that serves residents', 'a community-stewarded planting with a volunteer crew and a simple maintenance plan'],
  };

  MY.draftSiteOutreach = function draftSiteOutreach(site, ctx) {
    const [cares, offer] = HOOKS[site.type] || HOOKS['community-center'];
    const via = site.route ? ` I'm reaching out through ${site.route.replace(/\s*\(sample\)/g, '')}.` : '';
    const name = site.name.replace(/\s*\(sample\)/, '');
    const text = [
      `Hello,`,
      ``,
      `I'm ${ctx.sender || '[your name]'} with the East Bay Permaculture Guild, a volunteer-run group that has gardened with East Bay communities for over 15 years. We currently hold workdays at the Oakland Peace Center garden.${via}`,
      ``,
      `We know you care about ${cares}. We'd love to explore whether ${offer} could be a fit for ${name}. We'd shape it around what you want; nothing is decided in advance.`,
      ``,
      `Would you be open to a short conversation, or a 30-minute walk around the space at a time that suits you? If now isn't the right time, that's completely fine.`,
      ``,
      `Warmly,`,
      `${ctx.sender || '[your name]'}`,
      `East Bay Permaculture Guild · ${ctx.org.website}`,
    ].join('\n');
    return { text, findings: MY.checkCopy(text, { publicAddresses: ctx.org.publicAddresses }) };
  };

  // A prompt a volunteer can paste into any AI assistant (or follow by hand) to find candidate sites.
  // Results come back as CSV and land in the review queue; nothing is added automatically.
  MY.siteScoutPrompt = function siteScoutPrompt(opts) {
    const hoods = (opts.neighborhoods && opts.neighborhoods.length) ? opts.neighborhoods.join(', ') : 'Oakland, Berkeley, Richmond, Alameda, Emeryville, and San Leandro';
    const types = (opts.types && opts.types.length ? opts.types : MY.SITE_TYPES.map((t) => t[0])).map((t) => MY.label(MY.SITE_TYPES, t)).join(', ');
    const known = (opts.known || []).map((s) => `- ${s}`).join('\n') || '- (none)';
    return `You are helping the East Bay Permaculture Guild, a volunteer-run community gardening group, find places that might host a community garden, seed library, or volunteer workdays.

Search for public, verifiable information about places in: ${hoods}.
Place types to look for: ${types}.
Good signs: unused growing space, an existing garden asking for volunteers, a food pantry wanting fresh produce, a school or library with a sustainability program.

Rules:
- Only include organizations and public places. Never include private homes or individuals.
- Every row must cite a public source URL where you found it.
- Don't invent contact details. If no public contact route is listed, leave it blank.
- Skip anything already on this list:
${known}

Return ONLY CSV with this header:
name,type,neighborhood,source_url,why
where type is one of: ${MY.SITE_TYPES.map((t) => t[0]).join(', ')}.`;
  };

  MY.parseCandidates = function parseCandidates(csvText, existingNames) {
    const known = new Set((existingNames || []).map((n) => n.toLowerCase().trim()));
    const types = new Set(MY.SITE_TYPES.map((t) => t[0]));
    const out = [], rejected = [];
    MY.parseCSV(csvText).forEach((r) => {
      const name = r.name || '';
      const src = r.source_url || r.source || r.url || '';
      if (!name || !/^https?:\/\//i.test(src)) { rejected.push({ name: name || '(blank)', reason: 'missing name or source URL' }); return; }
      if (known.has(name.toLowerCase().trim())) { rejected.push({ name, reason: 'already listed' }); return; }
      known.add(name.toLowerCase().trim());
      out.push({ id: MY.uid('c'), name, type: types.has(r.type) ? r.type : 'community-center', neighborhood: r.neighborhood || '', sourceUrl: src, why: r.why || '', status: 'pending' });
    });
    return { candidates: out, rejected };
  };

  MY.acceptCandidate = function acceptCandidate(c, today) {
    return {
      id: MY.uid('s'), name: c.name, type: c.type, neighborhood: c.neighborhood, address: '', isPrivate: false, stage: 'identified',
      fit: { land: 0, water: 0, anchor: 0, access: 0, alignment: 0 }, route: '', notes: c.why, source: c.sourceUrl,
      history: [{ date: today, from: null, to: 'identified', note: 'Accepted from scout review queue' }], lastTouch: today, partnerIds: [], sample: !!c.sample,
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

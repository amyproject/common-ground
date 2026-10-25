// Network: relationships with other groups, collaboration plays that deepen them,
// and a needs & offers board matched across the Guild, partners, sites, and volunteer skills.
(function (root) {
  'use strict';
  const MY = root.MY;

  const QUIET_DAYS = 45;

  // `from` is the relationship stage where the play makes sense; doing it moves things toward `to`.
  MY.PLAYS = [
    { id: 'intro', from: 'aware', to: 'connected', title: 'Two-person intro', effort: 'Low',
      steps: ['Ask whoever knows them for a warm intro', 'Meet for 30 minutes: what are you working on, what do you need, what could you share?', 'Invite them to make an announcement at the next monthly meeting'],
      ask: 'meet for half an hour to swap what we\'re each working on and see where we might help each other' },
    { id: 'cross-announce', from: 'connected', to: 'connected', title: 'Announce each other', effort: 'Low',
      steps: ['Swap your next events', 'Each group shares the other\'s event on its listserv and Instagram', 'Give them a 2-minute slot at the monthly meeting'],
      ask: 'share each other\'s next events with our communities, and give you a few minutes at our monthly meeting' },
    { id: 'cohost-workday', from: 'connected', to: 'co-hosted', title: 'Co-hosted workday', effort: 'Medium',
      steps: ['Pick a site and one clear project', 'One shared Partiful page; both groups invite', 'Mix crews so each has someone from each group', 'Shared lunch, joint debrief, photos only with consent'],
      ask: 'co-host a workday together, at your site or ours, on a project you care about' },
    { id: 'skill-share', from: 'connected', to: 'co-hosted', title: 'Skill-share swap', effort: 'Medium',
      steps: ['Each group offers one thing it\'s good at (seed saving, compost, grafting, design)', 'Alternate hosting', 'Record a one-page handout each time for the shared library'],
      ask: 'trade workshops: you teach something your crew is great at, we teach something ours is' },
    { id: 'volunteer-exchange', from: 'co-hosted', to: 'sharing', title: 'Volunteer exchange', effort: 'Low',
      steps: ['Agree that short-staffed workdays get posted to both groups', 'Use each other\'s WhatsApp/Signal for calls for help (with group admins\' OK)', 'Track crossover volunteers so both groups can thank them'],
      ask: 'share calls for help when either of our workdays is short-handed' },
    { id: 'shared-library', from: 'co-hosted', to: 'sharing', title: 'Shared seed & tool library', effort: 'Medium',
      steps: ['List what each group owns that sits idle', 'One shared inventory sheet with borrow and return dates', 'Hold seed swaps at both groups\' events'],
      ask: 'pool seeds and tools that sit idle between workdays, with a simple shared borrow list' },
    { id: 'bioregional-session', from: 'sharing', to: 'coalition', title: 'Joint session at the Bay Delta Unconference', effort: 'Medium',
      steps: ['Propose an Open Space session together: "Who\'s growing what, where, in the East Bay?"', 'Bring the shared needs & offers board', 'Leave with a list of groups that want to join a quarterly call'],
      ask: 'run a session together at the Bay Delta Bioregional Unconference on connecting East Bay growing projects' },
    { id: 'coalition-call', from: 'coalition', to: 'coalition', title: 'Quarterly network call + shared calendar', effort: 'Low',
      steps: ['Rotate hosting each quarter', 'One shared calendar and one public needs & offers board (this tool\'s public share)', 'Each group keeps its own data and decides what to share'],
      ask: 'join a quarterly call and shared calendar for East Bay growing groups, where every group keeps control of its own info' },
  ];

  MY.playsFor = (stage) => MY.PLAYS.filter((p) => p.from === stage);

  MY.partnerRows = function partnerRows(state, today) {
    return state.partners.map((p) => {
      const quiet = p.lastTouch ? MY.daysBetween(p.lastTouch, today) : null;
      const cohosted = state.events.filter((e) => (e.partnerIds || []).includes(p.id)).length;
      const sites = state.sites.filter((s) => (s.partnerIds || []).includes(p.id));
      const done = new Set((p.history || []).map((h) => h.play).filter(Boolean));
      const plays = MY.playsFor(p.stage);
      const next = plays.find((pl) => !done.has(pl.id)) || plays[0] || null;
      return { p, quiet, stale: quiet == null || quiet > QUIET_DAYS, cohosted, sites, next };
    }).sort((a, b) => MY.PARTNER_STAGES.findIndex((x) => x[0] === b.p.stage) - MY.PARTNER_STAGES.findIndex((x) => x[0] === a.p.stage) || a.p.name.localeCompare(b.p.name));
  };

  MY.logPartnerTouch = function logPartnerTouch(p, today, note, playId, newStage) {
    p.history = (p.history || []).concat([{ date: today, note: note || '', play: playId || null, from: p.stage, to: newStage || p.stage }]);
    if (newStage) p.stage = newStage;
    p.lastTouch = today;
    return p;
  };

  MY.draftPartnerMessage = function draftPartnerMessage(partner, play, ctx) {
    const text = [
      `Hi ${partner.name} folks,`,
      ``,
      `This is ${ctx.sender || '[your name]'} from the East Bay Permaculture Guild. We've appreciated ${partner.source ? 'crossing paths with you' : 'what you do'} and would love to work together more.`,
      ``,
      `Would you be up for something simple: we'd like to ${play.ask}? We're flexible on timing and format, and happy to start small.`,
      ``,
      `We meet ${ctx.org.meeting.when} at the Oakland Peace Center, 111 Fairmount Ave, Oakland, and you're always welcome to share your news during needs & offers.`,
      ``,
      `Thanks,`,
      `${ctx.sender || '[your name]'}`,
    ].join('\n');
    return { text, findings: MY.checkCopy(text, { publicAddresses: ctx.org.publicAddresses }) };
  };

  // ---------- needs & offers ----------
  MY.boardMatches = function boardMatches(state) {
    const open = state.board.filter((b) => b.status === 'open');
    const needs = open.filter((b) => b.kind === 'need');
    const offers = open.filter((b) => b.kind === 'offer');
    return needs.map((n) => {
      const fromOffers = offers.filter((o) => o.who.id !== n.who.id)
        .map((o) => ({ type: 'offer', item: o, shared: MY.overlap(n.tags, o.tags) })).filter((m) => m.shared.length);
      const fromVolunteers = state.volunteers
        .map((v) => ({ type: 'volunteer', id: v.id, name: v.name, shared: MY.overlap(n.tags, v.skills) })).filter((m) => m.shared.length);
      const fromPartners = state.partners
        .map((p) => ({ type: 'partner', id: p.id, name: p.name, shared: MY.overlap(n.tags, p.focus) })).filter((m) => m.shared.length);
      const score = fromOffers.length * 3 + Math.min(fromVolunteers.length, 3) * 2 + fromPartners.length;
      return { need: n, offers: fromOffers, volunteers: fromVolunteers, partners: fromPartners, score };
    }).sort((a, b) => b.score - a.score || (a.need.createdAt < b.need.createdAt ? -1 : 1));
  };

  // Ready-to-read list for the "needs & offers" segment of the monthly meeting.
  MY.meetingNeedsOffersText = function meetingNeedsOffersText(state) {
    const open = state.board.filter((b) => b.status === 'open');
    const line = (b) => `• ${b.text.replace(/\s*\(sample\)/g, '')} (${b.who.name.replace(/\s*\(sample\)/g, '')})`;
    const needs = open.filter((b) => b.kind === 'need').map(line);
    const offers = open.filter((b) => b.kind === 'offer').map(line);
    return ['NEEDS', ...(needs.length ? needs : ['• none open']), '', 'OFFERS', ...(offers.length ? offers : ['• none open']), '', 'Have something to add? Tell a coordinator tonight or reply on the listserv.'].join('\n');
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

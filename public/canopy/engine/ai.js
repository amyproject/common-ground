// AI support: the dashboard summary sent to the model (aggregates and first names only, never emails/phones),
// rule-based recommendations that work offline, and one-click questions for the assistant.
(function (root) {
  'use strict';
  const MY = root.MY;

  MY.PARTNER_CATEGORIES = [
    'Community gardens & urban farms', 'Food justice & mutual aid', 'Schools & youth programs', 'Faith communities',
    'Environmental & watershed groups', 'Seed & tool libraries', 'Indigenous land stewardship', 'Housing co-ops & cohousing',
    'Libraries & community centers', 'Local businesses & nurseries',
  ];

  MY.SUGGESTED_QUESTIONS = [
    'Who should I contact first this week, and why?',
    'Why aren’t first-timers coming back, and what should we change?',
    'Which signup source brings people who stay?',
    'Which partner should we deepen next, and what should we propose?',
    'Which neighborhoods should we recruit in next?',
    'How can we get more referrals with Seeds rewards?',
    'Draft a short text inviting lapsed volunteers back',
    'What should our next 30 days focus on?',
  ];

  const short = (name) => String(name || '').trim();

  MY.aiContext = function aiContext(state, today) {
    const f90 = { days: 90, neighborhood: 'all', source: 'all' }, f365 = { days: 365, neighborhood: 'all', source: 'all' };
    const kv = (ks) => Object.fromEntries(ks.map((k) => [k.label, { value: k.value, prior: k.prior }]));
    const mf = MY.marketFunnel(state, today, f365);
    const rw = MY.rewardsSummary(state, today);
    const rows = MY.rosterRows(state, today);
    const partnerRows = MY.partnerRows(state, today);
    const impact = MY.partnerImpact(state, today);
    return {
      org: state.org.name, today,
      sample_workspace: state.volunteers.some((v) => v.sample),
      kpis_last_90_days_vs_prior: kv(MY.kpis(state, today, f90)),
      market_funnel_12m: mf.steps.map((s) => ({ step: s.label, people: s.count, pct_of_previous: s.ofPrev })),
      biggest_drop: mf.bottleneck ? { step: mf.bottleneck.label, pct: mf.bottleneck.ofPrev, lost: mf.bottleneck.lost } : null,
      funnel_by_source_12m: MY.sourceFunnel(state, today, f365),
      health_now: MY.healthCounts(state, today, f90),
      retention_cohorts: MY.cohorts(state, today, f90, 6).map((c) => ({ cohort: c.label, people: c.size, pct_active_by_month: c.cells })),
      active_by_neighborhood_90d: MY.neighborhoods(state, today, f90, 12),
      reachability: MY.reachability(state, f90),
      rewards: { tiers: rw.tierCounts.map((t) => ({ tier: t.tier.name, people: t.count })), within_15_of_next_tier: rw.almost.length, referrals_who_showed_up: rw.referrers.reduce((s, r) => s + r.came, 0), neighborhood_challenge: rw.challenge.slice(0, 6) },
      needs_attention: rows.filter((r) => r.action).sort((a, b) => a.action.priority - b.action.priority).slice(0, 12)
        .map((r) => ({ name: short(r.v.name), action: MY.ACTION_LABELS[r.action.kind], why: r.action.why, health: r.health, preferred_channel: MY.pickChannel(r.v) || 'none (in person)' })),
      crew_leads: rows.filter((r) => r.v.lead).length,
      upcoming_events: state.events.filter((e) => e.date >= today).slice(0, 5).map((e) => ({ date: e.date, title: e.title, rsvps: e.rsvps.length, capacity: e.capacity })),
      recent_campaigns: state.campaigns.slice(0, 6).map((c) => ({ name: c.name, channel: c.channel, recipients: c.recipients, open_rate: c.opened != null && c.delivered ? Math.round((c.opened / c.delivered) * 100) : null })),
      partners: partnerRows.map((r) => {
        const im = impact.find((x) => x.p.id === r.p.id);
        return { name: r.p.name, stage: MY.label(MY.PARTNER_STAGES, r.p.stage), focus: r.p.focus, days_since_contact: r.quiet, cohosted_events: im.cohosted, volunteers_referred: im.referred, next_play: r.next && r.next.title };
      }),
      sites: MY.siteRows(state, today).map((r) => ({ name: r.s.name, type: r.s.type, stage: r.s.stage, fit: r.score.score, needs_follow_up: r.stale })),
      open_needs_and_offers: (state.board || []).filter((b) => b.status === 'open').map((b) => ({ kind: b.kind, text: b.text, from: b.who.name })),
    };
  };

  // Offline recommendations, computed from the same numbers the dashboard shows.
  MY.baselineRecommendations = function baselineRecommendations(state, today) {
    const f365 = { days: 365, neighborhood: 'all', source: 'all' }, f90 = { days: 90, neighborhood: 'all', source: 'all' };
    const vol = [], part = [];
    const mf = MY.marketFunnel(state, today, f365);
    const b = mf.bottleneck;
    const ks = MY.kpis(state, today, f90);
    const k = (id) => ks.find((x) => x.id === id);
    const health = MY.healthCounts(state, today, f90);
    const src = MY.sourceFunnel(state, today, f365).filter((s) => s.signups >= 10);
    const rw = MY.rewardsSummary(state, today);
    const unwelcomed = MY.segmentIds(state, today, 'unwelcomed').length;
    const rows = MY.rosterRows(state, today);
    const activeN = rows.filter((r) => r.health === 'active').length;
    const leads = rows.filter((r) => r.v.lead).length;

    if (b) {
      const FIX = {
        Welcomed: ['Check the "Not yet welcomed" segment every two days', 'Send the Welcome template on each person\'s preferred channel', 'Mention the +15 Seeds first-visit bonus'],
        'First visit': ['Text every first-timer 1–3 days before their workday (Remind template)', 'Assign a buddy in crew formation and say so in the reminder', 'Offer the monthly meeting as a lower-commitment first step'],
        'Came back': ['Send a thank-you within 3 days that names their crew', 'Put first-timers on the same crew next time', 'Tell them they are one visit from Sprout tier'],
        'Regular (3+)': ['Promote the 3-workdays-a-quarter streak bonus', 'Invite returners to a workshop with a reserved seat', 'Use the neighborhood challenge to build crews of friends'],
      }[b.label] || ['Look at who drops at this step and ask two of them why'];
      vol.push({ title: `Fix the biggest leak: ${mf.steps[mf.steps.indexOf(b) - 1].label} → ${b.label}`, why: `Only ${b.ofPrev}% make it through this step; ${b.lost} people were lost here in the last 12 months.`, actions: FIX, metric: `${b.label} conversion`, effort: 'low', page: b.label === 'Welcomed' || b.label === 'First visit' ? 'messages' : 'events' });
    }
    if (unwelcomed) vol.push({ title: `Welcome ${unwelcomed} new signup${unwelcomed > 1 ? 's' : ''} within 48 hours`, why: `${unwelcomed} ${unwelcomed > 1 ? 'people' : 'person'} signed up in the last 30 days and ${unwelcomed > 1 ? 'haven\'t' : 'hasn\'t'} heard from the Guild. Fast welcomes are the cheapest lever on show rate.`, actions: ['Open Messages → audience "Not yet welcomed"', 'Use the Welcome template; send on each person\'s preferred channel', 'Mark as sent so their status updates'], metric: 'Welcomed within 48h', effort: 'low', page: 'messages' });
    if (src.length >= 2) {
      const best = src.slice().sort((a, b2) => (b2.regular || 0) - (a.regular || 0))[0];
      const avg = Math.round(src.reduce((s, x) => s + (x.regular || 0) * x.signups, 0) / src.reduce((s, x) => s + x.signups, 0));
      if (best.regular > avg) vol.push({ title: `Invest in ${best.label}: it brings people who stay`, why: `${best.regular}% of ${best.label} signups become regulars, vs ${avg}% across sources (last 12 months).`, actions: [`Ask current regulars from ${best.label} what drew them`, `Put more effort into ${best.label} this quarter`, 'Track the source on every signup form'], metric: 'Regulars by source', effort: 'medium', page: 'funnel' });
    }
    const atRisk = health['at-risk'] + health.cooling;
    if (atRisk) vol.push({ title: `Win back ${atRisk} cooling and at-risk volunteers`, why: `${health.cooling} people last came 31–60 days ago and ${health['at-risk']} came 61–90 days ago. They're easier to bring back now than after they lapse.`, actions: ['Volunteers → At risk / Cooling segments', 'Send the "We miss you" template; offer the monthly meeting as an easy return', 'Invite them to the crew they were on before'], metric: 'Retention', effort: 'low', page: 'volunteers' });
    const refs = k('referrals'), sign = k('signups');
    const refSrc = src.find((x) => x.label === 'Friend referral');
    const allReg = src.length ? Math.round(src.reduce((s, x) => s + (x.regular || 0) * x.signups, 0) / src.reduce((s, x) => s + x.signups, 0)) : null;
    const refNote = refSrc && allReg != null && refSrc.regular > allReg ? ` Referred signups became regulars at ${refSrc.regular}% vs ${allReg}% overall (12 months).` : '';
    if (sign.value && (refs.value || 0) / sign.value < 0.15) vol.push({ title: 'Launch a bring-a-neighbor month', why: `Only ${refs.value || 0} of ${sign.value} signups in the last 90 days came from referrals.${refNote}`, actions: ['Rewards → Launch bring-a-neighbor (each regular gets a personal code)', '+25 Seeds when the friend shows up, credited automatically', 'Thank top referrers at the monthly meeting (opt-in only)'], metric: 'Referral signups', effort: 'low', page: 'rewards' });
    if (activeN && leads && activeN / leads > 8) vol.push({ title: 'Grow crew leads so workdays don\'t depend on a few people', why: `${leads} crew leads for ${activeN} active volunteers (1 per ${Math.round(activeN / leads)}).`, actions: ['Invite Root-tier regulars who said they\'d lead', 'Pair each new lead with an experienced one for two workdays', '+10 Seeds per crew anchored'], metric: 'Crew leads', effort: 'medium', page: 'volunteers' });
    if (rw.almost.length) vol.push({ title: `Nudge ${rw.almost.length} people who are one visit from the next tier`, why: `${rw.almost.length} volunteers are within 15 Seeds of their next tier. A small milestone message often brings them back.`, actions: ['Rewards → Message all in "Almost there"', 'Name the perk they will unlock'], metric: 'Tier upgrades', effort: 'low', page: 'rewards' });

    const pr = MY.partnerRows(state, today);
    const impact = MY.partnerImpact(state, today);
    const never = pr.filter((r) => r.quiet == null);
    if (never.length) part.push({ title: `Start a conversation log with ${never.map((r) => r.p.name).join(', ')}`, why: `${never.length} partner group${never.length > 1 ? 's have' : ' has'} no logged contact, so the relationship can't move forward.`, actions: ['Ask whoever knows them for a warm intro', 'Run the Two-person intro play: what are you working on, what do you need?', 'Log the conversation in their partner panel'], metric: 'Partners with a logged contact', effort: 'low', page: 'partners' });
    const connected = pr.filter((r) => r.p.stage === 'connected').map((r) => ({ r, im: impact.find((x) => x.p.id === r.p.id) })).sort((a, c) => c.im.referred - a.im.referred);
    if (connected.length) part.push({ title: `Co-host a workday with ${connected[0].r.p.name}`, why: `${connected.length} partners are "Connected" but have never co-hosted. ${connected[0].r.p.name} already sent ${connected[0].im.referred} volunteers.`, actions: ['Pick one project they care about', 'One shared Partiful page; both groups invite', 'Mix crews so each has someone from each group'], metric: 'Partners at co-hosted or deeper', effort: 'medium', page: 'partners' });
    const topSrc = impact.slice().sort((a, c) => c.referred - a.referred)[0];
    if (topSrc && topSrc.referred) part.push({ title: `Propose a volunteer exchange with ${topSrc.p.name}`, why: `${topSrc.p.name} is the top partner source of volunteers (${topSrc.referred}).`, actions: ['Share short-staffed workday calls with each other', 'Thank crossover volunteers in both groups', 'Swap announcements monthly'], metric: 'Volunteers via partners', effort: 'low', page: 'partners' });
    const stale = MY.siteRows(state, today).filter((r) => r.stale);
    if (stale.length) part.push({ title: `Follow up on ${stale.length} quiet site${stale.length > 1 ? 's' : ''}`, why: `${stale.map((r) => r.s.name).join(', ')} ${stale.length > 1 ? 'have' : 'has'} had no contact for 14+ days during outreach.`, actions: ['Open the site panel and send the outreach note', 'Offer a 30-minute site walk', 'Log the contact so the follow-up clears'], metric: 'Sites moving stage', effort: 'low', page: 'sites' });
    if (!pr.some((r) => r.p.stage === 'coalition')) part.push({ title: 'Convene a quarterly call of East Bay growing groups', why: `No partner is at the coalition stage yet; ${pr.filter((r) => ['co-hosted', 'sharing'].includes(r.p.stage)).length} are close.`, actions: ['Invite co-hosting partners to a 45-minute call', 'Share one calendar and the needs & offers board', 'Rotate the host each quarter'], metric: 'Coalition members', effort: 'medium', page: 'partners' });
    const unknown = pr.filter((r) => !(r.p.focus || []).length);
    if (unknown.length) part.push({ title: `Learn what ${unknown.length} partners focus on`, why: `${unknown.map((r) => r.p.name).join(', ')}: focus unknown, so needs & offers can't match them.`, actions: ['Ask in your next conversation', 'Add focus tags in the partner panel'], metric: 'Partners with focus tags', effort: 'low', page: 'partners' });
    return { volunteer: vol.slice(0, 6), partnership: part.slice(0, 5) };
  };

  // Escape first, then allow **bold** and "- " bullets. Safe to inject as HTML.
  MY.miniMarkdown = function miniMarkdown(text) {
    const lines = MY.esc(String(text || '')).split(/\r?\n/);
    let html = '', inList = false;
    lines.forEach((l) => {
      const b = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
      const fmt = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (b) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${fmt(b[1])}</li>`; return; }
      if (inList) { html += '</ul>'; inList = false; }
      if (l.trim()) html += `<p>${fmt(l)}</p>`;
    });
    if (inList) html += '</ul>';
    return html;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

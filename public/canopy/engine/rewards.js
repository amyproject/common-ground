// Seeds: the Guild's recognition program. Points are derived from what people actually did
// (attendance, referrals who showed up, leading, teaching), never bought. Perks are non-cash.
(function (root) {
  'use strict';
  const MY = root.MY;

  MY.EARN_RULES = [
    { id: 'workday', label: 'Attend a workday', points: 10, category: 'Show up' },
    { id: 'meeting', label: 'Attend a monthly meeting', points: 5, category: 'Show up' },
    { id: 'workshop', label: 'Attend a workshop', points: 8, category: 'Learn' },
    { id: 'first', label: 'First visit bonus', points: 15, category: 'Show up' },
    { id: 'streak', label: '3 workdays in a calendar quarter', points: 20, category: 'Streaks' },
    { id: 'referral', label: 'A friend you referred shows up', points: 25, category: 'Grow' },
    { id: 'lead', label: 'Anchor a crew (per workday)', points: 10, category: 'Lead' },
    { id: 'award', label: 'Teach a workshop or special contribution', points: 30, category: 'Lead' },
  ];
  MY.REWARD_CATEGORIES = ['Show up', 'Learn', 'Streaks', 'Grow', 'Lead'];

  MY.TIERS = [
    { id: 'seed', name: 'Seed', min: 0, perks: ['Welcome kit: name tag and Guild sticker', 'Buddy at your first workday'] },
    { id: 'sprout', name: 'Sprout', min: 50, perks: ['Pick 3 seed packets from the seed library', 'Take-home plant start each season'] },
    { id: 'root', name: 'Root', min: 150, perks: ['One free workshop seat per quarter', 'First pick of plant starts and seed swaps', 'Name on the garden thank-you board (opt-in)'] },
    { id: 'canopy', name: 'Canopy', min: 300, perks: ['Discounted Permaculture Design Course seat', 'Invitation to the crew-lead track', 'Guild apron or tote'] },
  ];

  const quarter = (iso) => `${iso.slice(0, 4)}-Q${Math.floor((+iso.slice(5, 7) - 1) / 3) + 1}`;

  // A full ledger lets the profile show where every Seed came from.
  MY.pointsLedger = function pointsLedger(v, state, today) {
    const R = Object.fromEntries(MY.EARN_RULES.map((x) => [x.id, x]));
    const ledger = [];
    const attended = state.events.filter((e) => e.date <= today && (e.attended || []).includes(v.id)).sort((a, b) => (a.date < b.date ? -1 : 1));
    attended.forEach((e, i) => {
      if (i === 0) ledger.push({ date: e.date, points: R.first.points, reason: R.first.label, category: R.first.category });
      const rule = R[e.type] || R.workday;
      ledger.push({ date: e.date, points: rule.points, reason: `${rule.label.replace(/^Attend an? /, '')}: ${MY.fmtDate(e.date)}`, category: rule.category });
      if (v.lead && e.type === 'workday') ledger.push({ date: e.date, points: R.lead.points, reason: 'Anchored a crew', category: R.lead.category });
    });
    const perQuarter = {};
    attended.filter((e) => e.type === 'workday').forEach((e) => {
      const q = quarter(e.date);
      perQuarter[q] = (perQuarter[q] || 0) + 1;
      if (perQuarter[q] === 3) ledger.push({ date: e.date, points: R.streak.points, reason: `Streak: 3 workdays in ${q}`, category: R.streak.category });
    });
    state.volunteers.filter((x) => x.referredBy === v.id).forEach((x) => {
      const fv = state.events.filter((e) => e.date <= today && (e.attended || []).includes(x.id)).map((e) => e.date).sort()[0];
      if (fv) ledger.push({ date: fv, points: R.referral.points, reason: `Referred ${x.name}`, category: R.referral.category });
    });
    (v.awards || []).forEach((a) => ledger.push({ date: a.date, points: a.points, reason: a.reason, category: 'Lead' }));
    return ledger.sort((a, b) => (a.date < b.date ? -1 : 1));
  };

  MY.tierFor = function tierFor(points) {
    let idx = 0;
    MY.TIERS.forEach((t, i) => { if (points >= t.min) idx = i; });
    const tier = MY.TIERS[idx], next = MY.TIERS[idx + 1] || null;
    return { tier, next, index: idx, toNext: next ? next.min - points : 0, progress: next ? (points - tier.min) / (next.min - tier.min) : 1 };
  };

  MY.referralCode = (v) => `${MY.firstName(v.name).toUpperCase().normalize('NFD').replace(/[^A-Z]/g, '').slice(0, 6)}-${v.id.replace(/\D/g, '').replace(/^0+/, '')}`;

  // Everything the Rewards page charts, computed once.
  MY.rewardsSummary = function rewardsSummary(state, today) {
    const people = state.volunteers.map((v) => {
      const ledger = MY.pointsLedger(v, state, today);
      const points = ledger.reduce((s, x) => s + x.points, 0);
      return { v, ledger, points, t: MY.tierFor(points) };
    });
    const tierCounts = MY.TIERS.map((t) => ({ tier: t, count: people.filter((p) => p.t.tier.id === t.id).length }));
    // Seeds earned per month by category (last 6 months).
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1 - i, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    const byMonth = months.map((m) => {
      const row = { month: m };
      MY.REWARD_CATEGORIES.forEach((c) => { row[c] = 0; });
      people.forEach((p) => p.ledger.forEach((x) => { if (x.date.slice(0, 7) === m) row[x.category] += x.points; }));
      return row;
    });
    // Neighborhood challenge: team totals this quarter.
    const q = quarter(today);
    const hoods = {};
    people.forEach((p) => {
      const pts = p.ledger.filter((x) => quarter(x.date) === q).reduce((s, x) => s + x.points, 0);
      if (!pts) return;
      hoods[p.v.neighborhood || 'Unknown'] = (hoods[p.v.neighborhood || 'Unknown'] || 0) + pts;
    });
    const challenge = Object.entries(hoods).map(([name, points]) => ({ name, points })).sort((a, b) => b.points - a.points);
    // Referrals that converted into a visit.
    const refs = {};
    state.volunteers.filter((v) => v.referredBy).forEach((v) => {
      const came = state.events.some((e) => e.date <= today && (e.attended || []).includes(v.id));
      const r = refs[v.referredBy] || (refs[v.referredBy] = { invited: 0, came: 0 });
      r.invited++; if (came) r.came++;
    });
    const referrers = Object.entries(refs).map(([id, r]) => ({ v: state.volunteers.find((x) => x.id === id), ...r }))
      .filter((r) => r.v).sort((a, b) => b.came - a.came || b.invited - a.invited);
    const almost = people.filter((p) => p.t.next && p.t.toNext <= 15).sort((a, b) => a.t.toNext - b.t.toNext);
    const issued = people.reduce((s, p) => s + p.points, 0);
    return { people, tierCounts, byMonth, months, quarter: q, challenge, referrers, almost, issued };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

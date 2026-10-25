// Crew formation for a workday: one experienced anchor per crew, newcomers buddied up,
// people placed by interest and skill, crews filled to their minimum first.
// Deterministic: same input, same crews (ties break by name).
(function (root) {
  'use strict';
  const MY = root.MY;

  const NEWCOMERS_PER_ANCHOR = 3;

  function fitScore(v, project) {
    const interest = MY.overlap(v.interests, project.tags.concat([project.id]));
    const skill = MY.overlap(v.skills, project.tags);
    return { score: interest.length * 3 + skill.length * 2, interest, skill };
  }

  function reasonText(fit, isNew) {
    const bits = [];
    if (fit.interest.length) bits.push(`interested in ${fit.interest.join(', ')}`);
    if (fit.skill.length) bits.push(`brings ${fit.skill.join(', ')}`);
    if (!bits.length) bits.push(isNew ? 'good first task' : 'helps fill the crew');
    return bits.join('; ');
  }

  MY.formCrews = function formCrews(event, volunteers, allEvents) {
    const byId = Object.fromEntries(volunteers.map((v) => [v.id, v]));
    const people = (event.rsvps || []).map((id) => byId[id]).filter(Boolean)
      .map((v) => {
        const prior = (allEvents || []).filter((e) => e.date < event.date && (e.attended || []).includes(v.id)).length;
        return { v, prior, isNew: prior === 0, canAnchor: v.lead || prior >= 3 };
      })
      .sort((a, b) => a.v.name.localeCompare(b.v.name));

    const crews = (event.projects || []).map((p) => ({ project: p, anchor: null, members: [], buddies: [], warnings: [] }));
    const warnings = [];
    if (!crews.length) return { crews: [], floaters: [], warnings: ['Add at least one project area to this event first.'], text: '' };

    const taken = new Set();
    // 1. Anchors: biggest crews pick first; leads before regulars; then best fit.
    const anchorPool = people.filter((p) => p.canAnchor);
    crews.slice().sort((a, b) => b.project.min - a.project.min || a.project.area.localeCompare(b.project.area)).forEach((c) => {
      const pick = anchorPool.filter((p) => !taken.has(p.v.id))
        .map((p) => ({ p, s: fitScore(p.v, c.project).score + (p.v.lead ? 2 : 0) }))
        .sort((a, b) => b.s - a.s || a.p.v.name.localeCompare(b.p.v.name))[0];
      if (pick) {
        taken.add(pick.p.v.id);
        c.anchor = { id: pick.p.v.id, name: pick.p.v.name, why: reasonText(fitScore(pick.p.v, c.project), false) };
      }
    });

    // 2. Everyone else: experienced people first so newcomers can follow them in.
    const rest = people.filter((p) => !taken.has(p.v.id)).sort((a, b) => b.prior - a.prior || a.v.name.localeCompare(b.v.name));
    const size = (c) => c.members.length + (c.anchor ? 1 : 0);
    const newcomers = (c) => c.members.filter((m) => m.isNew).length;
    const experienced = (c) => c.members.filter((m) => !m.isNew).length + (c.anchor ? 1 : 0);
    const floaters = [];
    rest.forEach((p) => {
      const options = crews.filter((c) => size(c) < c.project.max).map((c) => {
        const fit = fitScore(p.v, c.project);
        let s = fit.score;
        if (size(c) < c.project.min) s += 4; // fill minimums first
        if (p.isNew) {
          if (!experienced(c)) s -= 6; // newcomers need someone who knows the ropes
          if (newcomers(c) >= Math.max(1, experienced(c)) * NEWCOMERS_PER_ANCHOR) s -= 8;
        }
        s -= size(c) * 0.5; // spread people out
        return { c, s, fit };
      }).sort((a, b) => b.s - a.s || a.c.project.area.localeCompare(b.c.project.area));
      if (!options.length) { floaters.push({ id: p.v.id, name: p.v.name, isNew: p.isNew }); return; }
      const best = options[0];
      best.c.members.push({ id: p.v.id, name: p.v.name, isNew: p.isNew, why: reasonText(best.fit, p.isNew) });
    });

    // 3. Buddies: pair each newcomer with an experienced member, rotating through them.
    crews.forEach((c) => {
      const guides = (c.anchor ? [c.anchor] : []).concat(c.members.filter((m) => !m.isNew));
      c.members.filter((m) => m.isNew).forEach((m, i) => {
        if (guides.length) c.buddies.push([m.id, guides[i % guides.length].id]);
      });
      if (!c.anchor) c.warnings.push('No experienced anchor: ask a lead or regular to take this crew.');
      if (size(c) < c.project.min) c.warnings.push(`Needs ${c.project.min - size(c)} more (${size(c)}/${c.project.min} minimum).`);
      if (c.members.some((m) => m.isNew) && !guides.length) c.warnings.push('Newcomers here have no buddy.');
    });

    const noAnchor = crews.filter((c) => !c.anchor);
    if (noAnchor.length) warnings.push(`${noAnchor.length} crew${noAnchor.length > 1 ? 's have' : ' has'} no experienced anchor: ask a regular to step up, or merge with an anchored crew.`);
    const short = crews.filter((c) => size(c) < c.project.min);
    if (short.length) warnings.push(`${short.length} crew${short.length > 1 ? 's are' : ' is'} below minimum: post a call on WhatsApp/Signal or merge crews.`);
    if (floaters.length) warnings.push(`${floaters.length} ${floaters.length > 1 ? 'people' : 'person'} beyond crew capacity: add a project area or raise a max.`);

    const result = { eventId: event.id, crews, floaters, warnings };
    result.text = MY.crewPlanText(event, result, byId);
    return result;
  };

  const plain = (name) => String(name).replace(/\s*\(sample\)/, '');

  MY.crewPlanText = function crewPlanText(event, plan, byId) {
    const nameOf = (id) => plain((byId[id] || {}).name || id);
    const lines = [`🌱 Crews for ${event.title}, ${MY.fmtDate(event.date)}`, 'Meet at the welcome table at 10. Gloves and tools are there. Bring water.', ''];
    plan.crews.forEach((c) => {
      const names = (c.anchor ? [`${plain(c.anchor.name)} (anchor)`] : []).concat(c.members.map((m) => plain(m.name) + (m.isNew ? ' (first time, welcome!)' : '')));
      lines.push(`• ${c.project.area}: ${c.project.need}`);
      lines.push(`  ${names.length ? names.join(', ') : 'Open, could use help'}`);
      c.buddies.forEach(([n, g]) => lines.push(`  Buddy: ${nameOf(n)} + ${nameOf(g)}`));
    });
    if (plan.floaters.length) lines.push('', `Floaters (help where needed): ${plan.floaters.map((f) => plain(f.name)).join(', ')}`);
    lines.push('', 'Can\'t make it? Just reply so we can rebalance. Thank you! 💚');
    return lines.join('\n');
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

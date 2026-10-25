// UI tests: drive public/canopy/index.html in jsdom (Chromium can't launch here). jsdom from /tmp/mk or JSDOM_PATH.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

let JSDOM, ResourceLoader;
try { ({ JSDOM, ResourceLoader } = require(process.env.JSDOM_PATH || '/tmp/mk/node_modules/jsdom')); } catch (_) {
  try { ({ JSDOM, ResourceLoader } = require('jsdom')); } catch (_) { JSDOM = null; }
}
// The page links the shared hub header root-relatively (/hub/hub.css, /hub/hub.js); from file://
// those would point at the filesystem root, so map them to public/hub/ like the dev server does.
const HUB_DIR = path.join(__dirname, '..', '..', 'public', 'hub');
const hubLoader = () => {
  if (!ResourceLoader) return 'usable';
  class HubLoader extends ResourceLoader {
    fetch(url, o) {
      const m = /^file:\/\/\/hub\/(.+)$/.exec(url);
      return super.fetch(m ? require('url').pathToFileURL(path.join(HUB_DIR, m[1])).href : url, o);
    }
  }
  return new HubLoader();
};
const opts = { skip: JSDOM ? false : 'jsdom not installed' };

async function open() {
  const errors = [];
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', '..', 'public', 'canopy', 'index.html'), {
    runScripts: 'dangerously', resources: hubLoader(), pretendToBeVisual: true,
    beforeParse(w) {
      w.MY_NOW = '2026-10-25'; w.confirm = () => true;
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      w.addEventListener('error', (e) => errors.push(e.message));
    },
  });
  await new Promise((r) => dom.window.addEventListener('load', r));
  const w = dom.window;
  w.__errors = errors;
  return w;
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const $ = (w, s) => w.document.querySelector(s);
const $$ = (w, s) => [...w.document.querySelectorAll(s)];
const change = (w, el, v) => { if (v !== undefined) el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
const submit = (w, form) => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

test('sidebar has the three sections and no Data & trust page', opts, async () => {
  const w = await open();
  assert.deepEqual($$(w, '.nav-sec h2').map((h) => h.textContent), ['Volunteers & Crews', 'GTM Partnerships', 'Growth Plan']);
  const links = $$(w, '.nav-link').map((a) => a.textContent.replace(/\d+$/, '').trim());
  assert.deepEqual(links, ['Overview', 'Hub sign-ups', 'Volunteers', 'Events & Crews', 'Messages', 'Rewards', 'Partners', 'Sites', 'Market funnel', 'Recommendations', '30/60/90 plan']);
  assert.ok(!w.document.body.textContent.includes('Data & trust'));
  assert.deepEqual(w.__errors, []);
});

test('overview: KPI tiles, charts with table twins, range filter re-renders', opts, async () => {
  const w = await open();
  assert.equal($$(w, '.kpi').length, 6);
  assert.ok($$(w, '#content svg.chart').length >= 1);
  assert.ok($(w, '.funnel') && $(w, '.heat') && $(w, '.donut'));
  const before = $(w, '.kpi .k-val').textContent;
  click(w, $(w, '[data-act=range][data-days="365"]'));
  assert.equal($(w, '[data-act=range][data-days="365"]').getAttribute('aria-pressed'), 'true');
  assert.notEqual($(w, '.kpi .k-val').textContent, before);
  click(w, $(w, '[data-act=toggle-table][data-id=participation]'));
  assert.ok($(w, '#h-participation').closest('.card').querySelector('table.tbl'));
  change(w, $(w, '#f-hood'), 'Berkeley');
  assert.equal(w.CANOPY.ui.f.neighborhood, 'Berkeley');
});

test('growth pages default to 12 months and lead with the market funnel', opts, async () => {
  const w = await open();
  w.CANOPY.go('funnel');
  assert.match($(w, '#content').textContent, /Current market funnel/);
  assert.equal($(w, '[data-act=range][data-days="365"]').getAttribute('aria-pressed'), 'true');
  assert.match($(w, '.callout.leak h3').textContent, /Biggest drop/);
  const reach = $(w, '#reach-instagram');
  reach.value = '4100';
  submit(w, $(w, '[data-form=reach]'));
  assert.equal(w.CANOPY.state.growth.reach.find((r) => r.id === 'instagram').value, 4100);
  w.CANOPY.go('plan');
  assert.match($(w, '#content').textContent, /Days 1–30/);
});

test('volunteers: segments, sort, search, drawer with consent and award', opts, async () => {
  const w = await open();
  w.CANOPY.go('volunteers');
  const all = $$(w, 'table.tbl tbody tr').length;
  assert.equal(all, 25);
  click(w, $(w, '[data-act=vol-seg][data-seg=leads]'));
  assert.ok($$(w, 'table.tbl tbody tr').length <= 7);
  click(w, $(w, '[data-act=vol-seg][data-seg=all]'));
  click(w, $(w, '[data-act=sort][data-key=points]'));
  const pts = $$(w, 'table.tbl tbody tr').map((tr) => +tr.children[4].textContent);
  assert.deepEqual(pts, pts.slice().sort((a, b) => b - a));
  click(w, $(w, '[data-act=open-vol]'));
  assert.ok($(w, '.drawer'));
  assert.ok($(w, '.drawer .weeks'));
  const id = w.CANOPY.ui.drawer.id;
  const box = $(w, '.drawer [data-change=consent][data-k=whatsapp]');
  const was = box.checked;
  box.checked = !was; change(w, box);
  assert.equal(w.CANOPY.state.volunteers.find((v) => v.id === id).channels.whatsapp, !was);
  const before = w.CANOPY.state.volunteers.find((v) => v.id === id).awards.length;
  $(w, '#aw-why').value = 'Built greenhouse benches';
  submit(w, $(w, '[data-form=award]'));
  assert.equal(w.CANOPY.state.volunteers.find((v) => v.id === id).awards.length, before + 1);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal($(w, '.drawer'), null);
});

test('bulk select → text composer respects SMS consent', opts, async () => {
  const w = await open();
  w.CANOPY.go('volunteers');
  click(w, $(w, '[data-act=sel-page]'));
  assert.match($(w, '.bulk').textContent, /25 selected/);
  click(w, $(w, '[data-act=bulk-msg][data-channel=sms]'));
  assert.equal(w.CANOPY.ui.route, 'messages');
  const c = w.CANOPY.ui.compose;
  assert.equal(c.ids.length, 25);
  assert.equal(c.built.messages.length + c.built.excluded.length, 25);
  c.built.messages.forEach((m) => assert.match(m.to, /^\+1\d{10}$/));
  assert.ok($$(w, '.links a').every((a) => a.getAttribute('href').startsWith('sms:+1')));
});

test('compose: welcome to new signups, guardrail blocks, mark as sent logs outbox', opts, async () => {
  const w = await open();
  w.CANOPY.go('messages');
  assert.match($(w, '.preview').textContent, /Thanks for joining/);
  const n = w.CANOPY.ui.compose.built.messages.length;
  assert.ok(n > 0);
  const body = $(w, '#c-body');
  w.CANOPY.ui.compose.body = body.value + ' Guaranteed plot for everyone!';
  w.CANOPY.render();
  assert.match($(w, '.checks').textContent, /Makes a promise/);
  assert.equal($$(w, '.links a').length, 0, 'blocked drafts get no send links');
  w.CANOPY.ui.compose.body = body.value;
  w.CANOPY.render();
  assert.ok($$(w, '.links a')[0].getAttribute('href').startsWith('mailto:'));
  click(w, $(w, '[data-act=mark-sent]'));
  assert.equal(w.CANOPY.state.outbox.length, n);
  click(w, $(w, '[data-act=msg-tab][data-tab=outbox]'));
  assert.equal($$(w, 'table.tbl tbody tr').length, n);
});

test('messages tabs: campaigns chart, templates, integrations', opts, async () => {
  const w = await open();
  w.CANOPY.go('messages');
  click(w, $(w, '[data-act=msg-tab][data-tab=campaigns]'));
  assert.ok($(w, '#content svg.chart'));
  click(w, $(w, '[data-act=msg-tab][data-tab=integrations]'));
  const names = $$(w, '.int h3').map((h) => h.textContent);
  ['Email app', 'Text messages', 'WhatsApp', 'Resend · email API', 'Twilio · SMS API', 'Mailchimp', 'Google Calendar'].forEach((x) => assert.ok(names.includes(x), x));
  click(w, $(w, '[data-act=msg-tab][data-tab=templates]'));
  click(w, $(w, '[data-act=use-template][data-id=referral]'));
  assert.match($(w, '#c-body').value, /referral_code/);
  assert.match($(w, '.preview').textContent, /[A-Z]+-\d+/);
});

test('events: crews form and check-in awards Seeds', opts, async () => {
  const w = await open();
  w.CANOPY.go('events');
  click(w, $(w, '[data-act=form-crews]'));
  assert.ok($$(w, '#content table.tbl').some((t) => t.textContent.includes('Greenhouse') && t.textContent.includes('Anchor')));
  click(w, $(w, '[data-act=save-crews]'));
  const ev = w.CANOPY.state.events.find((e) => e.id === w.CANOPY.ui.eventId);
  assert.ok(ev.crews);
  const past = w.CANOPY.state.events.filter((e) => e.date < '2026-10-25' && e.type === 'workday').pop();
  click(w, $(w, `[data-act=pick-event][data-id="${past.id}"]`));
  const cb = $(w, '[data-change=attend]:not(:checked)') || $(w, '[data-change=attend]');
  const vid = cb.dataset.id;
  const MY = w.MY;
  const ptsBefore = MY.pointsLedger(w.CANOPY.state.volunteers.find((v) => v.id === vid), w.CANOPY.state, '2026-10-25').length;
  const wasChecked = cb.checked;
  cb.checked = !wasChecked; change(w, cb);
  const ptsAfter = MY.pointsLedger(w.CANOPY.state.volunteers.find((v) => v.id === vid), w.CANOPY.state, '2026-10-25').length;
  assert.notEqual(ptsAfter, ptsBefore);
});

test('rewards, partners, sites render and drawers open', opts, async () => {
  const w = await open();
  w.CANOPY.go('rewards');
  assert.equal($$(w, '.tier-card').length, 4);
  click(w, $(w, '[data-act=msg-almost]'));
  assert.equal(w.CANOPY.ui.compose.seg, 'almost-tier');
  w.CANOPY.go('partners');
  click(w, $(w, '[data-act=open-partner]'));
  assert.match($(w, '.drawer .preview').textContent, /East Bay Permaculture Guild/);
  submit(w, $(w, '[data-form=partner-log]'));
  assert.ok(w.CANOPY.state.partners.some((p) => p.history.length > 1 || (p.history[0] && !p.history[0].sample)));
  w.CANOPY.go('sites');
  click(w, $(w, '[data-act=open-site][data-id=s-lot]'));
  change(w, $(w, '#fit-water'), '3');
  assert.equal(w.CANOPY.state.sites.find((s) => s.id === 's-lot').fit.water, 3);
  assert.deepEqual(w.__errors, []);
});

// Hub restyle: Canopy is light-only to match the hub header, so the dark toggle is gone.
test('no dark-mode toggle (light hub theme) and global search opens a profile', opts, async () => {
  const w = await open();
  assert.equal($(w, '#theme-btn'), null);
  assert.equal(w.document.documentElement.dataset.theme, 'light');
  const q = $(w, '#global-search');
  q.value = 'rosa';
  q.dispatchEvent(new w.Event('input', { bubbles: true }));
  const hit = $(w, '#search-results button');
  assert.ok(hit);
  click(w, hit);
  assert.ok($(w, '.drawer'));
});

test('start an empty workspace keeps Guild partners and renders every page', opts, async () => {
  const w = await open();
  click(w, $(w, '[data-act=start-empty]'));
  assert.equal(w.CANOPY.state.volunteers.length, 0);
  assert.equal($(w, '#sample-chip').hidden, true);
  for (const r of ['overview', 'volunteers', 'events', 'messages', 'rewards', 'partners', 'sites', 'funnel', 'plan']) w.CANOPY.go(r);
  assert.deepEqual(w.__errors, []);
});

// Pretend the local server is running with an OpenAI key, and stub its responses.
function withFakeServer(w, handlers) {
  Object.assign(w.CANOPY.ui.server, { available: true, ai: { configured: true, model: 'gpt-test' } });
  w.__calls = [];
  w.fetch = async (url, init) => {
    const body = init && init.body ? JSON.parse(init.body) : null;
    w.__calls.push({ url, body });
    const h = handlers[url];
    const out = h ? h(body) : { status: 404, json: { error: 'nope' } };
    return { ok: out.status === 200, status: out.status, json: async () => out.json };
  };
}
const settle = () => new Promise((r) => setTimeout(r, 20));

test('AI blocked without server: clear setup message, buttons disabled, offline recs still shown', opts, async () => {
  const w = await open();
  w.CANOPY.go('partners');
  // Hub wording: keys go in the hub's .env and the hub restarts with npm run dev.
  assert.match($(w, '.ai-card .ai-note').textContent, /OPENROUTER_API_KEY/);
  assert.match($(w, '.ai-card .ai-note').textContent, /npm run dev/);
  assert.doesNotMatch($(w, '.ai-card .ai-note').textContent, /node server\.mjs|localhost:8787/);
  assert.equal($(w, '[data-form=discover] button[type=submit]').disabled, true);
  w.CANOPY.go('recs');
  assert.ok($$(w, '.rec').length >= 5, 'data-driven recommendations render offline');
  assert.match($(w, '#content').textContent, /Grow volunteering/);
  assert.match($(w, '#content').textContent, /Improve partnerships/);
});

test('partner discovery: city + category → prioritized pipeline → add to partners', opts, async () => {
  const w = await open();
  const P = (name, priority) => ({ name, category: 'Community gardens & urban farms', neighborhood: 'Fruitvale', what_they_do: 'x', why_fit: `${name} fits`, priority, first_play: 'cohost-workday', next_step: 'Email via site form', source_url: `https://${name.replace(/\W/g, '').toLowerCase()}.org`, public_contact_route: 'contact form on website' });
  withFakeServer(w, { 'api/ai/partners': (b) => ({ status: 200, json: { city: b.city, category: b.category, model: 'gpt-test', webSearch: true, summary: 'Work high first.', partners: [P('Garden A', 'high'), P('Garden B', 'high'), P('Garden C', 'medium'), P('Garden D', 'low')] } }) });
  w.CANOPY.go('partners');
  $(w, '#disc-city').value = 'Berkeley, CA';
  $(w, '#disc-cat').value = 'Seed & tool libraries';
  submit(w, $(w, '[data-form=discover]'));
  await settle();
  const call = w.__calls.find((c) => c.url === 'api/ai/partners');
  assert.equal(call.body.city, 'Berkeley, CA');
  assert.equal(call.body.category, 'Seed & tool libraries');
  assert.ok(call.body.exclude.includes('Acta Non Verba'), 'existing partners excluded');
  assert.deepEqual($$(w, '.disc-board .kcol h4').map((h) => [...h.children].map((c) => c.textContent).join(' ')), ['High priority 2', 'Medium 1', 'Low 1']);
  assert.match($(w, '.disc-summary').textContent, /Work high first/);
  const n = w.CANOPY.state.partners.length;
  click(w, $(w, '[data-act=disc-add-high]'));
  assert.equal(w.CANOPY.state.partners.length, n + 2);
  const added = w.CANOPY.state.partners.find((p) => p.name === 'Garden A');
  assert.equal(added.stage, 'aware');
  assert.match(added.source, /https:\/\/gardena\.org/);
  click(w, $(w, '[data-act=disc-dismiss]'));
  assert.equal($$(w, '.disc-card').length, 3);
  click(w, $(w, '[data-act=open-partner][data-id="' + added.id + '"]'));
  assert.equal($(w, '#pl-sel').value, 'cohost-workday', 'AI-suggested first play preselected');
});

test('partner discovery surfaces API errors (e.g. no credits)', opts, async () => {
  const w = await open();
  withFakeServer(w, { 'api/ai/partners': () => ({ status: 502, json: { error: 'You have no credits remaining.' } }) });
  w.CANOPY.go('partners');
  submit(w, $(w, '[data-form=discover]'));
  await settle();
  assert.match($(w, '.ai-card [role=alert]').textContent, /no credits/);
  assert.equal($(w, '[data-form=discover] button[type=submit]').disabled, false);
});

test('AI recommendations replace the offline set and link to pages', opts, async () => {
  const w = await open();
  withFakeServer(w, { 'api/ai/recommendations': (b) => ({ status: 200, json: { model: 'gpt-test', headline: 'Fix first visits.', volunteer: [{ title: 'Text first-timers', why: '67% show', actions: ['a', 'b'], metric: 'First visit %', effort: 'low', page: 'messages' }], partnership: [{ title: 'Co-host with Acta', why: '2 referred', actions: ['c'], metric: 'Co-hosted', effort: 'medium', page: 'partners' }] } }) });
  w.CANOPY.go('recs');
  click(w, $(w, '[data-act=recs-generate]'));
  await settle();
  const call = w.__calls.find((c) => c.url === 'api/ai/recommendations');
  assert.ok(call.body.context.market_funnel_12m, 'sends the dashboard summary');
  assert.ok(!/@example\.org/.test(JSON.stringify(call.body)), 'no emails sent');
  assert.match($(w, '#content').textContent, /Fix first visits\./);
  assert.equal($$(w, '.rec').length, 2);
  click(w, $(w, '.rec [data-act=go][data-route=messages]'));
  assert.equal(w.CANOPY.ui.route, 'messages');
  w.CANOPY.go('recs');
  click(w, $(w, '[data-act=recs-source][data-src=data]'));
  assert.ok($$(w, '.rec').length >= 5);
});

test('assistant: suggested question is one click, answer renders, Escape closes', opts, async () => {
  const w = await open();
  withFakeServer(w, { 'api/ai/ask': (b) => ({ status: 200, json: { model: 'gpt-test', answer: `**Answer** to: ${b.question}\n- first bullet\n- second <script>bad()</script>` } }) });
  click(w, $(w, '#ask-btn'));
  assert.ok($(w, '.assist'));
  const chips = $$(w, '.assist .chip');
  assert.equal(chips.length, 8);
  click(w, chips[0]);
  await settle();
  const call = w.__calls.find((c) => c.url === 'api/ai/ask');
  assert.match(call.body.question, /contact first this week/);
  assert.ok(call.body.context.needs_attention.length > 0);
  const bubbles = $$(w, '.assist .bubble');
  assert.equal(bubbles.length, 2);
  assert.ok(bubbles[1].querySelector('strong') && bubbles[1].querySelectorAll('li').length === 2);
  assert.equal(bubbles[1].querySelector('script'), null, 'answers are escaped');
  const ta = $(w, '#ask-in');
  ta.value = 'Follow-up?';
  ta.dispatchEvent(new w.Event('input', { bubbles: true }));
  submit(w, $(w, '[data-form=ask]'));
  await settle();
  const second = w.__calls.filter((c) => c.url === 'api/ai/ask')[1];
  assert.equal(second.body.history.length, 2, 'previous turn sent as history');
  assert.equal(w.CANOPY.state.chat.length, 4);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal($(w, '.assist'), null);
});

// ---------- hub integration + interactions added in the Common Ground restyle ----------
const fs = require('fs');

test('hub shell: shared header assets, canopy section, admin account menu with sign out', opts, async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'canopy', 'index.html'), 'utf8');
  assert.match(html, /<html[^>]*data-hub-section="canopy"/);
  assert.match(html, /<link rel="stylesheet" href="\/hub\/hub\.css">/);
  assert.match(html, /<script src="\/hub\/hub\.js" defer><\/script>/);
  const w = await open();
  assert.ok($(w, '#me-menu [data-act=sign-out]'), 'sign out in the account menu');
  assert.ok($(w, '#me-menu #sender') && $(w, '#me-menu [data-act=reset-sample]') && $(w, '#me-menu [data-act=start-empty]'));
  assert.ok($(w, 'header.hub-bar a[data-hub="explore"]'), 'shared hub header mounted');
  assert.doesNotMatch($(w, '#ask-btn').textContent, /✦|Canopy/);
  assert.match($(w, '#ask-btn').textContent, /Ask/);
  assert.deepEqual(w.__errors, []);
});

test('client calls relative api/ paths (→ /canopy/api/ in the hub), never root /api/ for Canopy', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'canopy', 'app.js'), 'utf8');
  for (const p of ['api/health', 'api/send', 'api/ai/partners', 'api/ai/recommendations', 'api/ai/ask']) {
    assert.ok(src.includes(`'${p}'`), `${p} is called relative`);
    assert.ok(!src.includes(`'/${p}'`), `${p} is not root-relative`);
  }
  // Only the hub's own auth endpoints stay root-relative.
  assert.ok(src.includes("'/api/auth/me'") && src.includes("'/api/auth/logout'"));
});

test('KPI tile drives the participation chart and shows a selected state', opts, async () => {
  const w = await open();
  const tile = (id) => $(w, `.kpi[data-id="${id}"]`);
  assert.equal(tile('active').getAttribute('aria-pressed'), 'true');
  assert.match($(w, '#h-participation').textContent, /Participation/);
  click(w, tile('hours'));
  assert.equal(w.CANOPY.ui.metric, 'hours');
  assert.equal(tile('hours').getAttribute('aria-pressed'), 'true');
  assert.equal(tile('active').getAttribute('aria-pressed'), 'false');
  assert.match($(w, '#h-participation').textContent, /Volunteer hours/);
  click(w, $(w, '[data-act=toggle-table][data-id=participation]'));
  assert.deepEqual($$(w, '#h-participation ~ * th, .main-chart thead th').map((t) => t.textContent).slice(0, 2), ['Period', 'Hours']);
  click(w, $(w, '[data-act=toggle-table][data-id=participation]'));
  click(w, tile('show'));
  assert.ok($(w, '.main-chart svg.chart path.line'), 'rates plot as a line');
  click(w, $(w, '.main-chart [data-act=kpi][data-id=active]'));
  assert.equal(w.CANOPY.ui.metric, 'active');
});

test('legend toggles and isolates a series without repainting the others', opts, async () => {
  const w = await open();
  const legend = () => $$(w, '.main-chart [data-act=legend]');
  assert.equal(legend().length, 2);
  const fills = () => [...new Set($$(w, '.main-chart svg.chart .bar').map((b) => b.getAttribute('fill')))].sort();
  assert.deepEqual(fills(), ['var(--s1)', 'var(--s2)']);
  click(w, legend()[1]);
  assert.equal(legend()[1].getAttribute('aria-pressed'), 'false');
  assert.deepEqual(fills(), ['var(--s1)']);
  click(w, legend()[0]); // the last visible series stays on
  assert.equal(legend()[0].getAttribute('aria-pressed'), 'true');
  click(w, legend()[1]);
  assert.deepEqual(fills(), ['var(--s1)', 'var(--s2)']);
  legend()[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true, shiftKey: true }));
  assert.deepEqual(fills(), ['var(--s2)'], 'shift-click shows only that series');
});

test('funnel step, neighborhood bar, and health status filter the volunteer table', opts, async () => {
  const w = await open();
  const step = $(w, '.funnel [data-act=people][data-kind=funnel][data-key="2"]');
  const n = +step.querySelector('.fn-val').textContent;
  click(w, step);
  assert.equal(w.CANOPY.ui.route, 'volunteers');
  assert.match($(w, '.preset').textContent, /First visit/);
  assert.equal(+$(w, '.preset b').textContent, n);
  assert.equal($$(w, 'table.tbl tbody tr').length, Math.min(25, n));
  click(w, $(w, '[data-act=clear-preset]'));
  assert.equal($(w, '.preset'), null);
  assert.equal($$(w, 'table.tbl tbody tr').length, 25);
  w.CANOPY.go('overview');
  const hood = $(w, '[data-act=people][data-kind=hood]');
  const hn = +hood.querySelector('.hb-val').textContent;
  click(w, hood);
  assert.equal(w.CANOPY.ui.vol.preset.ids.size, hn);
  assert.ok($$(w, 'table.tbl tbody tr').every((tr) => tr.textContent.includes(hood.dataset.key) || hood.dataset.key === 'Other'));
  w.CANOPY.go('overview');
  click(w, $(w, '[data-act=health-seg][data-seg=lapsed]'));
  assert.equal(w.CANOPY.ui.vol.seg, 'lapsed');
  assert.equal($(w, '[data-act=vol-seg][data-seg=lapsed]').getAttribute('aria-selected'), 'true');
});

test('charts can be read from the keyboard; sparklines carry scrub data', opts, async () => {
  const w = await open();
  const svg = $(w, '.main-chart svg.chart');
  assert.equal(svg.getAttribute('tabindex'), '0');
  svg.focus();
  svg.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal($(w, '#tip').hidden, false);
  assert.ok($(w, '.main-chart .hit.kb'));
  const sp = $(w, '.kpi svg.spark[data-values]');
  assert.equal(JSON.parse(sp.dataset.values).length, JSON.parse(sp.dataset.labels).length);
  assert.ok(!/✦|✓|⚠|✕|▲|▼/.test(w.document.body.innerHTML), 'no emoji-style glyphs in the UI');
});

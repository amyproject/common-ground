import test from 'node:test';
import assert from 'node:assert/strict';
import { providerConfig, validateBatch, handleSend, createServer } from '../../server/canopy/server.mjs';

const KEYS = { RESEND_API_KEY: 'rk', RESEND_FROM: 'EBPG <hi@x.org>', TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM: '+15105550100' };

test('provider config: dry run without keys, live with keys, forced by DRY_RUN', () => {
  assert.deepEqual(providerConfig({}).dryRun, { email: true, sms: true });
  assert.deepEqual(providerConfig(KEYS).dryRun, { email: false, sms: false });
  assert.deepEqual(providerConfig({ ...KEYS, DRY_RUN: '1' }).dryRun, { email: true, sms: true });
});

test('validation: channel, addresses, guardrails, size', () => {
  assert.match(validateBatch({ channel: 'fax', messages: [] }), /channel/);
  assert.match(validateBatch({ channel: 'sms', messages: [{ to: '510-555-0100', body: 'hi' }] }), /E\.164/);
  assert.match(validateBatch({ channel: 'email', messages: [{ to: 'a@x.org', body: 'hi' }] }), /subject/);
  assert.match(validateBatch({ channel: 'email', messages: [{ to: 'a@x.org', subject: 's', body: 'Guaranteed access to food!' }] }), /guardrail/);
  assert.match(validateBatch({ channel: 'sms', messages: Array.from({ length: 201 }, () => ({ to: '+15105550100', body: 'x' })) }), /at most/);
  assert.equal(validateBatch({ channel: 'sms', messages: [{ to: '+15105550100', body: 'See you Saturday!' }] }), null);
});

test('dry run never calls the network', async () => {
  let calls = 0;
  const out = await handleSend({ channel: 'sms', messages: [{ to: '+15105550100', body: 'hi' }] }, { env: {}, fetchImpl: () => { calls++; }, logPath: null });
  assert.equal(out.status, 200);
  assert.equal(out.json.dryRun, true);
  assert.equal(calls, 0);
});

test('live send calls Twilio and Resend with the right shape, reports failures', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    if (String(init.body).includes('fail')) return { ok: false, status: 400, json: async () => ({ message: 'bad number' }) };
    return { ok: true, status: 201, json: async () => ({ sid: 'SM1', id: 'em1' }) };
  };
  const sms = await handleSend({ channel: 'sms', messages: [{ to: '+15105550100', body: 'hi' }, { to: '+15105550101', body: 'fail please' }] }, { env: KEYS, fetchImpl, logPath: null });
  assert.equal(sms.json.sent, 1);
  assert.equal(sms.json.failed, 1);
  assert.match(seen[0].url, /api\.twilio\.com\/2010-04-01\/Accounts\/AC1\/Messages\.json/);
  assert.equal(seen[0].init.headers.Authorization, `Basic ${Buffer.from('AC1:tok').toString('base64')}`);
  assert.match(seen[0].init.body, /To=%2B15105550100/);
  const em = await handleSend({ channel: 'email', messages: [{ to: 'a@x.org', subject: 'Hi', body: 'Hello' }] }, { env: KEYS, fetchImpl, logPath: null });
  assert.equal(em.json.sent, 1);
  const last = seen.at(-1);
  assert.equal(last.url, 'https://api.resend.com/emails');
  assert.deepEqual(JSON.parse(last.init.body), { from: 'EBPG <hi@x.org>', to: ['a@x.org'], subject: 'Hi', text: 'Hello' });
});

test('http server: health, static files, traversal blocked, send endpoint', async () => {
  const srv = createServer({ env: {}, logPath: null });
  await new Promise((r) => srv.listen(0, r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const h = await (await fetch(`${base}/api/health`)).json();
    assert.equal(h.dryRun.email, true);
    // In the hub, Vite serves the Canopy page from public/canopy/ behind the admin gate, so the
    // standalone server's folder (server/canopy/) holds no index.html and `/` is a plain 404.
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 404);
    assert.equal((await fetch(`${base}/..%2f..%2fetc%2fpasswd`)).status, 404);
    assert.equal((await fetch(`${base}/api/send`)).status, 405);
    const r = await fetch(`${base}/api/send`, { method: 'POST', body: JSON.stringify({ channel: 'email', messages: [{ to: 'a@x.org', subject: 'Hi', body: 'Hello' }] }) });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).dryRun, true);
    const bad = await fetch(`${base}/api/send`, { method: 'POST', body: '{nope' });
    assert.equal(bad.status, 400);
  } finally { srv.close(); }
});

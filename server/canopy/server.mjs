// Optional zero-dependency server: serves the app and sends messages through Twilio (SMS) and Resend (email).
// Without keys (or with DRY_RUN=1) each channel runs dry: messages are validated and logged, never sent.
//   RESEND_API_KEY, RESEND_FROM                      → email via Resend
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM → SMS via Twilio
//   OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY (AI_PROVIDER / AI_MODEL optional) → AI partner discovery, recommendations, assistant
//   PORT (default 8787), DRY_RUN=1 to force dry run. Keys can also live in a local .env file (never served).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
require('../../public/canopy/engine/core.js'); // engine is shared with the browser app
require('../../public/canopy/engine/guardrails.js');
const MY = globalThis.MY;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8' };
const MAX_MESSAGES = 200;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const E164_RE = /^\+[1-9]\d{7,14}$/;

export function providerConfig(env) {
  const email = env.RESEND_API_KEY && env.RESEND_FROM ? 'Resend' : null;
  const sms = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM ? 'Twilio' : null;
  const force = env.DRY_RUN === '1';
  return {
    email: email || 'Resend', sms: sms || 'Twilio',
    dryRun: { email: force || !email, sms: force || !sms },
  };
}

// Returns an error string, or null when the batch is OK to send.
export function validateBatch(body) {
  if (!body || !['email', 'sms'].includes(body.channel)) return 'channel must be "email" or "sms"';
  const msgs = body.messages;
  if (!Array.isArray(msgs) || !msgs.length) return 'messages must be a non-empty array';
  if (msgs.length > MAX_MESSAGES) return `at most ${MAX_MESSAGES} messages per batch`;
  for (const [i, m] of msgs.entries()) {
    if (!m || typeof m.body !== 'string' || !m.body.trim()) return `message ${i + 1}: empty body`;
    if (body.channel === 'email' && !EMAIL_RE.test(m.to || '')) return `message ${i + 1}: invalid email address`;
    if (body.channel === 'sms' && !E164_RE.test(m.to || '')) return `message ${i + 1}: phone must be E.164 (+15105550100)`;
    if (body.channel === 'sms' && m.body.length > 1600) return `message ${i + 1}: SMS longer than 1600 characters`;
    if (body.channel === 'email' && !String(m.subject || '').trim()) return `message ${i + 1}: missing subject`;
    const blocked = MY.checkCopy(m.body).filter((f) => f.severity === 'block');
    if (blocked.length) return `message ${i + 1}: blocked by guardrail "${MY.RULE_LABELS[blocked[0].rule]}"`;
  }
  return null;
}

async function sendOne(channel, m, env, fetchImpl) {
  if (channel === 'sms') {
    const sid = env.TWILIO_ACCOUNT_SID;
    const r = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: m.to, From: env.TWILIO_FROM, Body: m.body }).toString(),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { to: m.to, ok: true, id: j.sid } : { to: m.to, ok: false, error: j.message || `HTTP ${r.status}` };
  }
  const r = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM, to: [m.to], subject: m.subject, text: m.body }),
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { to: m.to, ok: true, id: j.id } : { to: m.to, ok: false, error: j.message || `HTTP ${r.status}` };
}

export async function handleSend(body, { env, fetchImpl, logPath }) {
  const err = validateBatch(body);
  if (err) return { status: 422, json: { error: err } };
  const cfg = providerConfig(env);
  if (cfg.dryRun[body.channel]) {
    if (logPath) await fs.appendFile(logPath, body.messages.map((m) => JSON.stringify({ at: new Date().toISOString(), channel: body.channel, to: m.to, subject: m.subject || null, body: m.body })).join('\n') + '\n');
    return { status: 200, json: { dryRun: true, sent: 0, results: body.messages.map((m) => ({ to: m.to, ok: true, dryRun: true })) } };
  }
  const results = [];
  for (const m of body.messages) {
    try { results.push(await sendOne(body.channel, m, env, fetchImpl)); } catch (e) { results.push({ to: m.to, ok: false, error: e.message }); }
  }
  const sent = results.filter((r) => r.ok).length;
  return { status: 200, json: { dryRun: false, sent, failed: results.length - sent, results } };
}


// ---------- AI (OpenAI Responses API) ----------
export const DEFAULT_MODEL = 'gpt-5.4-mini';
export const DEFAULT_GEMINI_MODEL = 'gemma-4-31b-it'; // free Gemma on the Gemini API; AI_MODEL overrides
export const DEFAULT_OPENROUTER_MODEL = 'google/gemma-4-31b-it:free'; // free Gemma; AI_MODEL overrides
export const PARTNER_CATEGORIES = [
  'Community gardens & urban farms', 'Food justice & mutual aid', 'Schools & youth programs', 'Faith communities',
  'Environmental & watershed groups', 'Seed & tool libraries', 'Indigenous land stewardship', 'Housing co-ops & cohousing',
  'Libraries & community centers', 'Local businesses & nurseries',
];

export function loadDotEnv(file) {
  const out = {};
  try {
    for (const line of require('node:fs').readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch (_) { /* no .env */ }
  return out;
}

// Preference when several keys exist: OpenRouter, then Gemini, then OpenAI. AI_PROVIDER overrides.
export function aiConfig(env) {
  const provider = ['openrouter', 'gemini', 'openai'].includes(env.AI_PROVIDER) ? env.AI_PROVIDER
    : env.OPENROUTER_API_KEY ? 'openrouter' : env.GEMINI_API_KEY ? 'gemini' : env.OPENAI_API_KEY ? 'openai' : null;
  if (provider === 'openrouter') return { provider, label: 'OpenRouter', configured: !!env.OPENROUTER_API_KEY, model: env.AI_MODEL || env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL };
  if (provider === 'gemini') return { provider, label: 'Google Gemini', configured: !!env.GEMINI_API_KEY, model: env.AI_MODEL || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL };
  if (provider === 'openai') return { provider, label: 'OpenAI', configured: !!env.OPENAI_API_KEY, model: env.AI_MODEL || env.OPENAI_MODEL || DEFAULT_MODEL };
  return { provider: null, label: 'AI provider', configured: false, model: env.OPENAI_MODEL || DEFAULT_MODEL };
}

function outputText(j) {
  if (typeof j.output_text === 'string') return j.output_text;
  const parts = [];
  (j.output || []).forEach((o) => (o.content || []).forEach((c) => { if (c.type === 'output_text' && c.text) parts.push(c.text); }));
  return parts.join('');
}
function citations(j) {
  const urls = [];
  (j.output || []).forEach((o) => (o.content || []).forEach((c) => (c.annotations || []).forEach((a) => { if (a.url) urls.push(a.url); })));
  return [...new Set(urls)];
}

// One call with graceful fallbacks: drop reasoning, then drop web search, if the model rejects them.
export async function callOpenAI({ env, fetchImpl, instructions, input, schema, webSearch, maxTokens }) {
  const cfg = { ...aiConfig({ ...env, AI_PROVIDER: 'openai' }) };
  if (!cfg.configured) throw Object.assign(new Error('OPENAI_API_KEY is not set on the server'), { status: 503 });
  const attempt = async (opts) => {
    const body = { model: cfg.model, instructions, input, max_output_tokens: maxTokens || 4000 };
    if (opts.reasoning) body.reasoning = { effort: 'low' };
    if (opts.web) body.tools = [{ type: 'web_search' }];
    if (schema) body.text = { format: { type: 'json_schema', name: schema.name, schema: schema.schema, strict: true } };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120000);
    try {
      const r = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, j };
    } finally { clearTimeout(timer); }
  };
  let opts = { reasoning: /^(gpt-5|o\d)/.test(cfg.model), web: !!webSearch };
  let res = await attempt(opts);
  for (let i = 0; i < 2 && !res.ok && res.status === 400; i++) {
    const msg = JSON.stringify(res.j.error || '');
    if (opts.reasoning && /reasoning/i.test(msg)) opts = { ...opts, reasoning: false };
    else if (opts.web && /tool|web_search/i.test(msg)) opts = { ...opts, web: false };
    else break;
    res = await attempt(opts);
  }
  if (!res.ok) throw Object.assign(new Error((res.j.error && res.j.error.message) || `OpenAI HTTP ${res.status}`), { status: 502 });
  const text = outputText(res.j);
  return { text, json: schema ? JSON.parse(text) : null, web: opts.web, citations: citations(res.j), model: res.j.model || cfg.model, usage: res.j.usage || null };
}


// Pull a JSON object out of model text (handles ```json fences and leading prose).
export function extractJSON(text) {
  const t = String(text || '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(t); } catch (_) { /* fall through */ }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw Object.assign(new Error('The AI returned text that was not valid JSON. Try again.'), { status: 502 });
}


// Google's 429 body says which quota was hit (free tier? per-minute or per-day? which model?) and when to retry.
export function geminiError(err, status) {
  const e = err || {};
  let msg = (e.message || `Gemini HTTP ${status}`).split(/ For more information/)[0].trim();
  const details = Array.isArray(e.details) ? e.details : [];
  const quota = details.find((d) => /QuotaFailure$/.test(d['@type'] || ''));
  const retry = details.find((d) => /RetryInfo$/.test(d['@type'] || ''));
  const v = quota && (quota.violations || [])[0];
  if (v) {
    const id = String(v.quotaId || v.quotaMetric || '');
    const parts = [
      /FreeTier|free_tier/i.test(id) ? 'free tier' : 'paid tier',
      /PerDay/i.test(id) ? 'daily limit' : /PerMinute/i.test(id) ? 'per-minute limit' : null,
      /Token/i.test(id) ? 'tokens' : /Request/i.test(id) ? 'requests' : null,
      v.quotaDimensions && v.quotaDimensions.model ? `model ${v.quotaDimensions.model}` : null,
      v.quotaValue != null ? `limit ${v.quotaValue}` : null,
    ].filter(Boolean);
    msg += ` [Quota hit: ${parts.join(', ')}${id ? ` · ${id}` : ''}]`;
    if (String(v.quotaValue) === '0') msg += ' This model has no free quota on this project: enable billing for the Google Cloud project, or set AI_MODEL to a model with free quota.';
  }
  if (retry && retry.retryDelay) msg += ` Retry in ${retry.retryDelay}.`;
  return msg;
}

// Gemini API (generativelanguage.googleapis.com). Search grounding cannot be combined with JSON mode,
// so with web search we ask for JSON in the prompt and parse it; without it we use responseMimeType.
export async function callGemini(opts) {
  const { env, fetchImpl, instructions, input, schema, webSearch, maxTokens } = opts;
  const cfg = aiConfig({ ...env, AI_PROVIDER: 'gemini' });
  if (!cfg.configured) throw Object.assign(new Error('GEMINI_API_KEY is not set on the server'), { status: 503 });
  const turns = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  const system = schema ? `${instructions}\n\nRespond with ONLY a JSON object (no prose, no code fences) that matches this JSON Schema:\n${JSON.stringify(schema.schema)}` : instructions;
  // Gemma on the Gemini API rejects systemInstruction, JSON mode, and Google Search: fold instructions into the first turn.
  const gemma = /^gemma/i.test(cfg.model);
  const attempt = async (web) => {
    const contents = turns.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    if (gemma) {
      const first = contents.findIndex((c) => c.role === 'user');
      contents[first].parts[0].text = `Instructions:\n${system}\n\n---\n\n${contents[first].parts[0].text}`;
    }
    const body = {
      contents,
      generationConfig: { maxOutputTokens: maxTokens || 4000, ...(schema && !web && !gemma ? { responseMimeType: 'application/json' } : {}) },
    };
    if (!gemma) body.systemInstruction = { parts: [{ text: system }] };
    if (web) body.tools = [{ google_search: {} }];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120000);
    try {
      const r = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, j };
    } finally { clearTimeout(timer); }
  };
  let web = !!webSearch && !gemma;
  let res = await attempt(web);
  // Free Gemma/Gemini capacity throws transient 500/503s: retry once after a short pause.
  if (!res.ok && (res.status === 500 || res.status === 503)) { await new Promise((r) => setTimeout(r, opts.retryDelayMs ?? 1500)); res = await attempt(web); }
  // Search grounding has its own (often tiny) free quota: if it's unsupported or exhausted, answer without it.
  if (!res.ok && web && (res.status === 429 || (res.status === 400 && /tool|search|grounding/i.test(JSON.stringify(res.j.error || ''))))) { web = false; res = await attempt(false); }
  if (!res.ok) throw Object.assign(new Error(geminiError(res.j.error, res.status)), { status: res.status === 429 ? 429 : 502 });
  const cand = (res.j.candidates || [])[0];
  if (!cand || !cand.content) throw Object.assign(new Error(`Gemini returned no answer${cand && cand.finishReason ? ` (${cand.finishReason})` : ''}`), { status: 502 });
  const text = (cand.content.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
  const chunks = ((cand.groundingMetadata || {}).groundingChunks || []).map((c) => c.web || {}).filter((w) => w.uri || w.title);
  return {
    text, json: schema ? extractJSON(text) : null, web: web && chunks.length > 0,
    citations: chunks.map((w) => w.title || w.uri), model: res.j.modelVersion || cfg.model, usage: res.j.usageMetadata || null,
  };
}


// OpenRouter (OpenAI-compatible chat completions). Web search via the "web" plugin; citations come back as annotations.
export function openRouterError(j, status) {
  const e = (j && j.error) || {};
  let msg = String(e.message || `OpenRouter HTTP ${status}`);
  if (status === 402) msg += ' Add credits at https://openrouter.ai/settings/credits, or pick a ":free" model with AI_MODEL.';
  if (status === 401) msg += ' Check OPENROUTER_API_KEY in .env.';
  if (status === 429) msg += ' Rate limited (free models allow a limited number of requests per minute and per day): wait a minute and try again.';
  const raw = e.metadata && e.metadata.raw;
  if (raw && status >= 400 && status !== 402) msg += ` (${String(raw).slice(0, 160)})`;
  return msg;
}

export async function callOpenRouter({ env, fetchImpl, instructions, input, schema, webSearch, maxTokens }) {
  const cfg = aiConfig({ ...env, AI_PROVIDER: 'openrouter' });
  if (!cfg.configured) throw Object.assign(new Error('OPENROUTER_API_KEY is not set on the server'), { status: 503 });
  const turns = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  const system = schema ? `${instructions}\n\nRespond with ONLY a JSON object (no prose, no code fences) that matches this JSON Schema:\n${JSON.stringify(schema.schema)}` : instructions;
  const attempt = async (opts) => {
    const body = { model: cfg.model, messages: [{ role: 'system', content: system }].concat(turns.map((m) => ({ role: m.role, content: m.content }))), max_tokens: maxTokens || 4000 };
    // Free models lack strict schemas; ask for a JSON object there and rely on the schema in the prompt.
    if (opts.format && schema) body.response_format = /:free$/.test(cfg.model) ? { type: 'json_object' } : { type: 'json_schema', json_schema: { name: schema.name, strict: true, schema: schema.schema } };
    if (opts.web) body.plugins = [{ id: 'web', max_results: 8 }];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120000);
    try {
      const r = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:8787', 'X-Title': 'Canopy (East Bay Permaculture Guild)' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok && !j.error, status: j.error && j.error.code ? +j.error.code || r.status : r.status, j };
    } finally { clearTimeout(timer); }
  };
  let opts = { format: !!schema, web: !!webSearch };
  let res = await attempt(opts);
  for (let i = 0; i < 3 && !res.ok && (res.status === 400 || (res.status === 402 && opts.web)); i++) {
    const msg = JSON.stringify(res.j.error || '');
    if (res.status === 402 && opts.web) opts = { ...opts, web: false }; // web search is paid even on free models
    else if (opts.format && /response_format|json_schema|json_object|structured/i.test(msg)) opts = { ...opts, format: false };
    else if (opts.web && /plugin|web/i.test(msg)) opts = { ...opts, web: false };
    else break;
    res = await attempt(opts);
  }
  if (!res.ok) throw Object.assign(new Error(openRouterError(res.j, res.status)), { status: res.status === 402 || res.status === 429 ? res.status : 502 });
  const choice = (res.j.choices || [])[0];
  const msgObj = choice && choice.message;
  if (!msgObj || !msgObj.content) throw Object.assign(new Error(`OpenRouter returned no answer${choice && choice.finish_reason ? ` (${choice.finish_reason})` : ''}`), { status: 502 });
  const text = Array.isArray(msgObj.content) ? msgObj.content.map((c) => c.text || '').join('') : String(msgObj.content);
  const urls = (msgObj.annotations || []).map((a) => (a.url_citation && a.url_citation.url) || a.url).filter(Boolean);
  return { text, json: schema ? extractJSON(text) : null, web: opts.web && urls.length > 0, citations: [...new Set(urls)], model: res.j.model || cfg.model, usage: res.j.usage || null };
}

export function callAI(opts) {
  const cfg = aiConfig(opts.env);
  if (!cfg.configured) throw Object.assign(new Error('No AI key on the server. Add OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY to .env and restart node server.mjs.'), { status: 503 });
  return cfg.provider === 'openrouter' ? callOpenRouter(opts) : cfg.provider === 'gemini' ? callGemini(opts) : callOpenAI(opts);
}

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; } };
const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);

const str = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const strictObj = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });

const PARTNER_SCHEMA = {
  name: 'partner_pipeline',
  schema: strictObj({
    summary: { type: 'string' },
    partners: {
      type: 'array',
      items: strictObj({
        name: { type: 'string' },
        category: { type: 'string' },
        neighborhood: { type: 'string' },
        what_they_do: { type: 'string' },
        why_fit: { type: 'string' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        first_play: { type: 'string', enum: ['intro', 'cross-announce', 'cohost-workday', 'skill-share', 'volunteer-exchange', 'shared-library'] },
        next_step: { type: 'string' },
        source_url: { type: 'string' },
        public_contact_route: { type: 'string' },
      }),
    },
  }),
};

export async function discoverPartners(body, { env, fetchImpl }) {
  const city = str(body.city, 80), category = str(body.category, 80);
  const count = Math.max(3, Math.min(15, +body.count || 8));
  if (!city || !category) return { status: 422, json: { error: 'city and category are required' } };
  const exclude = (Array.isArray(body.exclude) ? body.exclude : []).slice(0, 60).map((x) => str(x, 80)).filter(Boolean);
  const instructions = `You research local partners for the East Bay Permaculture Guild, a small volunteer-run group (15+ years) that runs garden workdays at the Oakland Peace Center, monthly meetings, workshops, and seed/tool sharing. It wants organizations to co-host workdays, swap volunteers, share seeds/tools/space, and cross-promote.
Rules:
- Only real, currently operating organizations you can verify with a public web page. Cite that page in source_url (https). If you cannot verify one, leave it out rather than guess.
- Never include private individuals, home addresses, personal emails, or phone numbers. public_contact_route is the organization's public route only (e.g. "contact form on website", "Instagram DMs", "general info email listed on site"), or "" if none is listed.
- Prioritize: high = strong mission overlap and nearby, likely to say yes to a small first step; low = worth knowing.
- first_play is the smallest collaboration to propose first.
- Keep each text field to one or two sentences. summary: 2-3 sentences on how to work this pipeline.`;
  const input = `City/area: ${city}\nPartnership category: ${category}\nReturn up to ${count} organizations, best fits first.\nAlready partners (exclude): ${exclude.join('; ') || 'none'}`;
  try {
    const r = await callAI({ env, fetchImpl, instructions, input, schema: PARTNER_SCHEMA, webSearch: true, maxTokens: 6000 });
    const cited = r.citations.map((c) => hostOf(/^https?:/.test(c) ? c : `https://${c}`)).filter(Boolean);
    const seen = new Set(exclude.map((x) => x.toLowerCase()));
    const partners = (Array.isArray(r.json.partners) ? r.json.partners : []).map((p) => ({
      name: str(p.name, 120), category: str(p.category, 80) || category, neighborhood: str(p.neighborhood, 80), what_they_do: str(p.what_they_do, 400),
      why_fit: str(p.why_fit, 400), priority: oneOf(p.priority, ['high', 'medium', 'low'], 'medium'),
      first_play: oneOf(p.first_play, ['intro', 'cross-announce', 'cohost-workday', 'skill-share', 'volunteer-exchange', 'shared-library'], 'intro'),
      next_step: str(p.next_step, 300), source_url: str(p.source_url, 300), public_contact_route: str(p.public_contact_route, 200),
    })).filter((p) => {
      const k = p.name.toLowerCase().trim();
      if (!k) return false;
      if (!/^https?:\/\//i.test(p.source_url) || seen.has(k)) return false;
      seen.add(k);
      return true;
    }).map((p) => ({ ...p, verified: !!hostOf(p.source_url) && cited.some((h) => h === hostOf(p.source_url) || h.endsWith(`.${hostOf(p.source_url)}`) || hostOf(p.source_url).endsWith(`.${h}`)), public_contact_route: p.public_contact_route.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '(email on website)').replace(/\+?\d[\d\s().-]{8,}\d/g, '(phone on website)') }));
    return { status: 200, json: { city, category, model: r.model, webSearch: r.web, summary: r.json.summary, partners, citations: r.citations } };
  } catch (e) { return { status: e.status || 500, json: { error: e.message } }; }
}

const REC = strictObj({
  title: { type: 'string' }, why: { type: 'string' },
  actions: { type: 'array', items: { type: 'string' } },
  metric: { type: 'string' }, effort: { type: 'string', enum: ['low', 'medium', 'high'] },
  page: { type: 'string', enum: ['overview', 'volunteers', 'events', 'messages', 'rewards', 'partners', 'sites', 'funnel', 'plan'] },
});
const RECS_SCHEMA = { name: 'recommendations', schema: strictObj({ headline: { type: 'string' }, volunteer: { type: 'array', items: REC }, partnership: { type: 'array', items: REC } }) };

const CONTEXT_RULES = 'The JSON context is the Guild\'s own dashboard data (aggregates and first names only). Ground every claim in it and cite the numbers. If the data cannot answer something, say so. Do not invent organizations, people, or statistics. No cash incentives; recognition and perks only. Respect consent: never suggest contacting people on channels they did not agree to.';

export async function recommend(body, { env, fetchImpl }) {
  const ctx = JSON.stringify(body.context || {}).slice(0, 40000);
  try {
    const r = await callAI({
      env, fetchImpl, schema: RECS_SCHEMA, maxTokens: 5000,
      instructions: `You are a nonprofit growth advisor for the East Bay Permaculture Guild. ${CONTEXT_RULES} Return 4-5 volunteer-growth and 3-4 partnership recommendations, highest impact first. Each: a short imperative title, why (with the specific numbers), 2-4 concrete actions a volunteer coordinator can do this month, the metric to watch, effort, and the Canopy page where they would act.`,
      input: `Dashboard context:\n${ctx}`,
    });
    const PAGES_OK = ['overview', 'volunteers', 'events', 'messages', 'rewards', 'partners', 'sites', 'funnel', 'plan'];
    const norm = (list) => (Array.isArray(list) ? list : []).slice(0, 6).map((x) => ({
      title: str(x.title, 160), why: str(x.why, 500), actions: (Array.isArray(x.actions) ? x.actions : []).slice(0, 5).map((a) => str(a, 240)).filter(Boolean),
      metric: str(x.metric, 120), effort: oneOf(x.effort, ['low', 'medium', 'high'], 'medium'), page: oneOf(x.page, PAGES_OK, 'overview'),
    })).filter((x) => x.title);
    return { status: 200, json: { model: r.model, headline: str(r.json.headline, 400), volunteer: norm(r.json.volunteer), partnership: norm(r.json.partnership) } };
  } catch (e) { return { status: e.status || 500, json: { error: e.message } }; }
}

export async function ask(body, { env, fetchImpl }) {
  const question = str(body.question, 1200);
  if (!question) return { status: 422, json: { error: 'question is required' } };
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => m && ['user', 'assistant'].includes(m.role)).slice(-8).map((m) => ({ role: m.role, content: str(m.content, 4000) }));
  const ctx = JSON.stringify(body.context || {}).slice(0, 40000);
  try {
    const r = await callAI({
      env, fetchImpl, maxTokens: 2500,
      instructions: `You are Canopy, the assistant inside the East Bay Permaculture Guild's volunteer CRM. Answer coordinators' questions briefly and practically: lead with the answer, then up to 5 bullets, then one suggested next action in Canopy. Use **bold** and "- " bullets only. ${CONTEXT_RULES} When asked to draft a message, keep it warm, short, community-rooted, and free of promises (no guaranteed access or emergency services).\n\nDashboard context:\n${ctx}`,
      input: history.concat([{ role: 'user', content: question }]),
    });
    return { status: 200, json: { model: r.model, answer: r.text } };
  } catch (e) { return { status: e.status || 500, json: { error: e.message } }; }
}

export function createServer(opts = {}) {
  const env = opts.env || process.env;
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const logPath = opts.logPath === undefined ? path.join(ROOT, 'outbox-dryrun.log') : opts.logPath;
  return http.createServer(async (req, res) => {
    const send = (status, obj, type) => { res.writeHead(status, { 'Content-Type': type || 'application/json' }); res.end(type ? obj : JSON.stringify(obj)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/health') return send(200, { ...providerConfig(env), ai: aiConfig(env), categories: PARTNER_CATEGORIES });
      const AI_ROUTES = { '/api/ai/partners': discoverPartners, '/api/ai/recommendations': recommend, '/api/ai/ask': ask };
      if (AI_ROUTES[url.pathname]) {
        if (req.method !== 'POST') return send(405, { error: 'POST only' });
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 2e5) return send(413, { error: 'Payload too large' }); }
        let body;
        try { body = JSON.parse(raw); } catch (_) { return send(400, { error: 'Invalid JSON' }); }
        const out = await AI_ROUTES[url.pathname](body, { env, fetchImpl });
        return send(out.status, out.json);
      }
      if (url.pathname === '/api/send') {
        if (req.method !== 'POST') return send(405, { error: 'POST only' });
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 1e6) return send(413, { error: 'Payload too large' }); }
        let body;
        try { body = JSON.parse(raw); } catch (_) { return send(400, { error: 'Invalid JSON' }); }
        const out = await handleSend(body, { env, fetchImpl, logPath });
        return send(out.status, out.json);
      }
      const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = path.normalize(path.join(ROOT, rel));
      if (!file.startsWith(ROOT + path.sep) || /(^|[\\/])\.|outbox-dryrun\.log$/.test(path.relative(ROOT, file))) return send(404, 'Not found', 'text/plain');
      const data = await fs.readFile(file);
      return send(200, data, TYPES[path.extname(file)] || 'application/octet-stream');
    } catch (e) {
      return send(e.code === 'ENOENT' ? 404 : 500, e.code === 'ENOENT' ? 'Not found' : 'Server error', 'text/plain');
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const env = { ...loadDotEnv(path.join(ROOT, '.env')), ...process.env };
  const port = +env.PORT || 8787;
  const cfg = providerConfig(env), ai = aiConfig(env);
  createServer({ env }).listen(port, () => {
    console.log(`Canopy on http://localhost:${port}`);
    console.log(`  email: ${cfg.email}${cfg.dryRun.email ? ' (dry run)' : ''} · sms: ${cfg.sms}${cfg.dryRun.sms ? ' (dry run)' : ''}`);
    console.log(`  AI: ${ai.configured ? `${ai.label} · ${ai.model}` : 'off (set OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY)'}`);
  });
}

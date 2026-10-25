// Injected into every page: visible cursor + action helpers. All actions return Promises.
(() => {
  if (window.__demo) return;
  const st = window.__demoState || { x: 720, y: 450 };
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let cur, ring;
  function ensure() {
    if (cur && document.documentElement.contains(cur)) return;
    cur = document.createElement('div');
    cur.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M5 3 L5 22 L10 17.5 L13.5 25 L17 23.5 L13.6 16.2 L20 16 Z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    cur.style.cssText = 'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));transform-origin:5px 3px;transition:transform .12s';
    ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(232,163,60,.95);background:rgba(232,163,60,.25);z-index:2147483646;pointer-events:none;opacity:0;transform:scale(.3)';
    document.documentElement.append(ring, cur);
    place();
  }
  function place() { cur.style.left = (st.x - 5) + 'px'; cur.style.top = (st.y - 3) + 'px'; }
  function find(q) {
    if (q instanceof Element) return q;
    if (typeof q === 'string' && q.startsWith('text=')) {
      const [t, scope] = q.slice(5).split('@@');
      const root = scope ? document.querySelector(scope) : document;
      const els = [...root.querySelectorAll('button,a,[role=button],label,summary,input,select,li,div,span,h1,h2,h3,td,th,p')];
      const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return els.find(e => vis(e) && e.textContent.trim() === t) || els.filter(vis).filter(e => e.textContent.trim().includes(t)).sort((a,b)=>a.textContent.length-b.textContent.length)[0];
    }
    return document.querySelector(q);
  }
  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; };
  async function moveTo(x, y, ms) {
    ensure();
    const x0 = st.x, y0 = st.y, d = Math.hypot(x - x0, y - y0);
    ms = ms ?? Math.min(900, 280 + d * 0.7);
    // slight arc so it feels hand-driven
    const nx = -(y - y0) / (d || 1), ny = (x - x0) / (d || 1), bow = Math.min(60, d * 0.12);
    const t0 = performance.now();
    while (true) {
      const t = Math.min(1, (performance.now() - t0) / ms), e = ease(t), b = Math.sin(Math.PI * t) * bow;
      st.x = x0 + (x - x0) * e + nx * b; st.y = y0 + (y - y0) * e + ny * b; place();
      window.__demoState = st;
      if (t >= 1) break;
      await new Promise(r => requestAnimationFrame(r));
    }
  }
  async function reveal(el) {
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 20) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); await sleep(700); }
  }
  async function pulse() {
    ensure();
    ring.style.left = st.x + 'px'; ring.style.top = st.y + 'px';
    ring.animate([{ opacity: 1, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(1.4)' }], { duration: 450, easing: 'ease-out' });
    cur.style.transform = 'scale(.85)'; await sleep(110); cur.style.transform = '';
  }
  function fire(el, x, y) {
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerover', o)); el.dispatchEvent(new MouseEvent('mouseover', o));
    el.dispatchEvent(new PointerEvent('pointerdown', { ...o, buttons: 1 })); el.dispatchEvent(new MouseEvent('mousedown', { ...o, buttons: 1 }));
    if (el.focus) el.focus({ preventScroll: true });
    el.dispatchEvent(new PointerEvent('pointerup', o)); el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }
  async function click(q, opts = {}) {
    const el = find(q); if (!el) throw new Error('not found: ' + q);
    await reveal(el);
    let [x, y] = center(el); if (opts.dx) x += opts.dx; if (opts.dy) y += opts.dy;
    await moveTo(x, y, opts.ms); await sleep(opts.hover ?? 160);
    await pulse();
    const target = document.elementFromPoint(x, y);
    fire(target && el.contains(target) ? target : el, x, y);
    await sleep(opts.after ?? 350);
  }
  async function clickAt(x, y, opts = {}) {
    await moveTo(x, y, opts.ms); await sleep(160); await pulse();
    const t = document.elementFromPoint(x, y); if (t) fire(t, x, y); await sleep(opts.after ?? 350);
  }
  async function hover(q, ms) { const el = find(q); await reveal(el); const [x, y] = center(el); await moveTo(x, y, ms); }
  async function type(q, text, cps = 18) {
    const el = find(q); if (!el) throw new Error('not found: ' + q);
    await click(el, { after: 150 });
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
    for (const ch of text) {
      set.call(el, el.value + ch);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
      await sleep(1000 / cps * (0.6 + Math.random() * 0.8));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function scrollBy(dy, ms = 900, sel) {
    const sc = sel ? find(sel) : document.scrollingElement; const y0 = sc.scrollTop, t0 = performance.now();
    while (true) { const t = Math.min(1, (performance.now() - t0) / ms); sc.scrollTop = y0 + dy * ease(t); if (t >= 1) break; await new Promise(r => requestAnimationFrame(r)); }
  }
  function dump(sel) {
    const root = sel ? document.querySelector(sel) : document;
    const out = [];
    root.querySelectorAll('button,a,input,select,textarea,[role=button],[role=tab],summary,h1,h2,h3').forEach(e => {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      const id = e.id ? '#' + e.id : '', cls = (e.className && typeof e.className === 'string') ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      out.push(`${e.tagName.toLowerCase()}${id}${cls} [${Math.round(r.left)},${Math.round(r.top + scrollY)} ${Math.round(r.width)}x${Math.round(r.height)}] "${(e.textContent || e.value || e.placeholder || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 70)}"`);
    });
    return out.join('\n');
  }
  function setPos(x, y) { st.x = x; st.y = y; ensure(); place(); }
  window.__demo = { setPos, moveTo, click, clickAt, hover, type, scrollBy, sleep, find, dump, pulse, ensure };
  if (document.body) ensure(); else addEventListener('DOMContentLoaded', ensure);
})();

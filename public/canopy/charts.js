// Canopy charts: small, dependency-free SVG/HTML chart builders. Each returns an HTML string.
// Colors come from CSS custom properties (earthy palette in styles.css, validated with the
// dataviz six-checks script). Hover detail uses [data-tip] (HTML-escaped) and one shared
// tooltip; plots with a [tabindex] svg can be scrubbed with the arrow keys; every chart also
// has a table view in app.js.
(function (root) {
  'use strict';
  const MY = root.MY;
  const esc = MY.esc;
  const C = (root.CHARTS = {});

  const fmtN = (v) => (v == null ? '–' : Math.abs(v) >= 10000 ? `${(v / 1000).toFixed(1)}k` : Number(v).toLocaleString('en-US'));
  C.fmtN = fmtN;
  const tip = (html) => `data-tip="${esc(html)}"`;
  C.tip = tip;
  const tipRow = (color, label, value, line) => `<div><span class="key${line ? ' line' : ''}" style="background:${color}"></span>${esc(label)} <b>${value}</b></div>`;

  function niceMax(v, ticks) {
    if (v <= 0) return { max: ticks, step: 1 };
    const raw = v / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    return { max: step * ticks, step };
  }

  // Legend. With a chart id it becomes a row of toggle buttons: click hides/shows a series,
  // Shift/Alt-click shows only that series. Hidden series keep their color (color follows the entity).
  C.legend = (series, o) => {
    const opt = o || {};
    const hidden = opt.hidden || new Set();
    if (!opt.id) return `<ul class="legend">${series.map((s) => `<li><span class="key${opt.line ? ' line' : ''}" style="background:${s.color}"></span>${esc(s.label)}</li>`).join('')}</ul>`;
    return `<ul class="legend interactive" aria-label="Series (click to hide or show; Shift-click to show only one)">${series.map((s) => {
      const on = !hidden.has(s.key);
      return `<li><button type="button" data-act="legend" data-chart="${esc(opt.id)}" data-key="${esc(s.key)}" aria-pressed="${on}" title="${on ? 'Hide' : 'Show'} ${esc(s.label)} · Shift-click to show only this"><span class="key${opt.line ? ' line' : ''}" style="background:${s.color}"></span>${esc(s.label)}</button></li>`;
    }).join('')}</ul>`;
  };

  // Sparkline: 1.8px line, end dot, gaps for null. With opts.labels it can be hover-scrubbed
  // (app.js reads data-values / data-labels and moves the crosshair + readout).
  C.spark = function spark(values, opts) {
    const o = Object.assign({ w: 120, h: 34, color: 'var(--s1)' }, opts);
    const vals = values.map((v) => (v == null ? null : +v));
    const nums = vals.filter((v) => v != null);
    if (nums.length < 2) return '';
    const min = Math.min(...nums), max = Math.max(...nums);
    const x = (i) => 3 + (i / (vals.length - 1)) * (o.w - 6);
    const y = (v) => o.h - 4 - (max === min ? 0.5 : (v - min) / (max - min)) * (o.h - 8);
    let d = '', pen = false;
    vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
    const li = vals.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
    const area = `${d}L${x(li).toFixed(1)},${o.h}L${x(vals.findIndex((v) => v != null)).toFixed(1)},${o.h}Z`;
    const pts = vals.map((v, i) => (v == null ? '' : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(' ');
    const data = o.labels ? ` data-points="${pts}" data-values="${esc(JSON.stringify(vals))}" data-labels="${esc(JSON.stringify(o.labels))}" data-unit="${esc(o.unit || '')}"` : '';
    return `<svg class="spark" viewBox="0 0 ${o.w} ${o.h}" width="${o.w}" height="${o.h}" aria-hidden="true"${data}><path d="${area}" fill="${o.color}" opacity=".09"/><path class="spark-line" pathLength="1" d="${d}" fill="none" stroke="${o.color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle class="spark-end" cx="${x(li)}" cy="${y(vals[li])}" r="2.8" fill="${o.color}" stroke="var(--surface)" stroke-width="1.6"/><line class="spark-x" x1="0" x2="0" y1="0" y2="${o.h}"/><circle class="spark-dot" r="3.2" fill="${o.color}" stroke="var(--surface)" stroke-width="1.6"/></svg>`;
  };

  // Narrow screens get a narrower viewBox so tick labels stay legible when the svg scales down.
  C.plotWidth = () => (root.innerWidth && root.innerWidth < 640 ? 400 : 640);
  const plotAttrs = (o, kind) => `class="chart" viewBox="0 0 ${o.W} ${o.H}" role="img" tabindex="0" aria-label="${esc(o.title || kind)}. Arrow keys read each value; the Table button lists them all."`;

  // Column chart (stacked when series > 1). One y-axis, recessive grid, 2px gaps, 4px rounded top.
  // o.hidden = Set of series keys to leave out; o.id makes the legend interactive.
  C.columns = function columns(o) {
    const all = o.series;
    const hidden = o.hidden || new Set();
    const series = all.filter((s) => !hidden.has(s.key));
    const direct = o.directLabels !== false && series.length >= 1 && series.length <= 4;
    const W = o.width || C.plotWidth(), H = o.height || 220, padL = 36, padR = direct ? (series.length > 1 ? Math.min(120, 14 + 6.3 * Math.max(...series.map((x) => x.label.length))) : 30) : 8, padT = 14, padB = 26;
    const data = o.data;
    const totals = data.map((d) => series.reduce((s, se) => s + (+d[se.key] || 0), 0));
    const { max, step } = niceMax(Math.max(1, ...totals), 4);
    const iw = W - padL - padR, ih = H - padT - padB;
    const band = iw / Math.max(1, data.length);
    const bw = Math.max(3, Math.min(34, band * 0.62));
    const y = (v) => padT + ih - (v / max) * ih;
    let g = '';
    for (let t = 0; t <= max + 1e-9; t += step) g += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${padL - 6}" y="${y(t) + 3.5}" text-anchor="end">${fmtN(t)}${o.unit || ''}</text>`;
    const every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 46)));
    let bars = '', labels = '', hits = '', ends = '';
    data.forEach((d, i) => {
      const cx = padL + band * i + band / 2;
      let base = 0;
      const present = series.filter((se) => +d[se.key] > 0);
      present.forEach((se, si) => {
        const v = +d[se.key];
        const top = y(base + v), bot = y(base);
        const h = Math.max(0, bot - top - (si > 0 ? 2 : 0));
        const yy = top;
        const r = si === present.length - 1 ? Math.min(4, h / 2, bw / 2) : 0;
        const x0 = cx - bw / 2;
        const sty = `style="--i:${i}"`;
        bars += r > 0
          ? `<path class="bar" ${sty} fill="${se.color}" d="M${x0},${yy + h}V${yy + r}Q${x0},${yy} ${x0 + r},${yy}H${x0 + bw - r}Q${x0 + bw},${yy} ${x0 + bw},${yy + r}V${yy + h}Z"/>`
          : `<rect class="bar" ${sty} fill="${se.color}" x="${x0}" y="${yy}" width="${bw}" height="${h}"/>`;
        // Direct labels on the last column: series names for stacks, the value for one series.
        if (direct && i === data.length - 1) {
          if (series.length > 1 && h >= 11) ends += `<text class="end-label" x="${x0 + bw + 6}" y="${yy + h / 2 + 3.5}">${esc(se.label)}</text>`;
        }
        base += v;
      });
      if (direct && series.length === 1 && i === data.length - 1) ends += `<text class="end-value" x="${cx}" y="${y(totals[i]) - 5}" text-anchor="middle">${fmtN(totals[i])}${o.unit || ''}</text>`;
      if (i % every === 0) labels += `<text class="tick" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`;
      const tipHtml = `<strong>${esc(d.label)}</strong>${series.map((se) => tipRow(se.color, se.label, `${fmtN(d[se.key])}${o.unit || ''}`)).join('')}${series.length > 1 ? `<div class="tip-total">Total <b>${fmtN(totals[i])}${o.unit || ''}</b></div>` : ''}`;
      hits += `<rect class="hit" data-i="${i}" x="${padL + band * i}" y="${padT}" width="${band}" height="${ih}" ${tip(tipHtml)}/>`;
    });
    const axis = `<line class="axis" x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}"/>`;
    return `<svg ${plotAttrs({ W, H, title: o.title }, 'Column chart')}>${g}${bars}${axis}${labels}${ends}${hits}</svg>${all.length > 1 ? C.legend(all, { id: o.id, hidden }) : ''}`;
  };

  // Line chart with crosshair hover. Same unit for all series (no dual axis). Null = gap.
  C.lines = function lines(o) {
    const all = o.series;
    const hidden = o.hidden || new Set();
    const series = all.filter((s) => !hidden.has(s.key));
    const direct = o.directLabels !== false && series.length <= 4;
    const W = o.width || C.plotWidth(), H = o.height || 220, padL = 36, padR = direct ? (series.length > 1 ? Math.min(120, 16 + 6.3 * Math.max(...series.map((x) => x.label.length))) : 40) : 12, padT = 12, padB = 26;
    const data = o.data;
    const val = (d, k) => (d[k] == null ? null : +d[k]);
    const all2 = data.flatMap((d) => series.map((s) => val(d, s.key) || 0));
    const { max, step } = niceMax(Math.max(1, o.max || 0, ...all2), 4);
    const iw = W - padL - padR, ih = H - padT - padB;
    const x = (i) => padL + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
    const y = (v) => padT + ih - (v / max) * ih;
    let g = '';
    for (let t = 0; t <= max + 1e-9; t += step) g += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${padL - 6}" y="${y(t) + 3.5}" text-anchor="end">${fmtN(t)}${o.unit || ''}</text>`;
    const lastIdx = (k) => { for (let i = data.length - 1; i >= 0; i--) if (val(data[i], k) != null) return i; return -1; };
    const paths = series.map((s) => {
      let d = '', pen = false;
      data.forEach((r, i) => { const v = val(r, s.key); if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
      // Isolated points (a reading with gaps on both sides) get a small dot so they don't vanish.
      const solo = data.map((r, i) => (val(r, s.key) != null && (i === 0 || val(data[i - 1], s.key) == null) && (i === data.length - 1 || val(data[i + 1], s.key) == null) ? `<circle cx="${x(i)}" cy="${y(val(r, s.key))}" r="2.5" fill="${s.color}"/>` : '')).join('');
      return `<path class="line" pathLength="1" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" d="${d}"/>${solo}`;
    }).join('');
    let ends = '';
    series.forEach((s) => {
      const li = lastIdx(s.key);
      if (li < 0) return;
      const v = val(data[li], s.key);
      ends += `<circle cx="${x(li)}" cy="${y(v)}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
      if (direct) ends += `<text class="end-label" x="${x(li) + 8}" y="${y(v) + 3.5}">${series.length > 1 ? esc(s.label) : `${fmtN(v)}${o.unit || ''}`}</text>`;
    });
    const every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 46)));
    const band = iw / Math.max(1, data.length - 1);
    const labels = data.map((d, i) => (i % every === 0 ? `<text class="tick" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>` : '')).join('');
    const hits = data.map((d, i) => `<g class="xh"><line class="xhair" x1="${x(i)}" x2="${x(i)}" y1="${padT}" y2="${padT + ih}"/>${series.map((s) => (val(d, s.key) == null ? '' : `<circle class="xdot" cx="${x(i)}" cy="${y(val(d, s.key))}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`)).join('')}<rect class="hit" data-i="${i}" x="${x(i) - band / 2}" y="${padT}" width="${band}" height="${ih}" ${tip(`<strong>${esc(d.label)}</strong>${series.map((s) => tipRow(s.color, s.label, d[s.key] == null ? 'no data' : `${fmtN(d[s.key])}${o.unit || ''}`, true)).join('')}`)}/></g>`).join('');
    return `<svg ${plotAttrs({ W, H, title: o.title }, 'Line chart')}>${g}<line class="axis" x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}"/>${paths}${ends}${labels}${hits}</svg>${all.length > 1 ? C.legend(all, { id: o.id, hidden, line: true }) : ''}`;
  };

  // Horizontal bars in HTML: crisp text, easy truncation, direct value labels.
  // opt.act turns each row into a button (data-act / data-kind / data-key) for click-to-filter.
  C.hbars = function hbars(items, o) {
    const opt = Object.assign({ color: 'var(--s1)' }, o);
    const max = opt.max || Math.max(1, ...items.map((d) => +d.value || 0));
    return `<ul class="hbars${opt.act ? ' linked' : ''}">${items.map((d, i) => {
      const inner = `<span class="hb-label" title="${esc(d.label)}">${esc(d.label)}</span>
      <span class="hb-track"><span class="hb-bar" style="width:${Math.max(0.6, ((+d.value || 0) / max) * 100)}%;background:${d.color || opt.color};--i:${i}"></span></span>
      <span class="hb-val">${esc(d.display != null ? d.display : fmtN(d.value))}${d.sub ? `<span class="hb-sub">${esc(d.sub)}</span>` : ''}</span>`;
      const t = tip(`<strong>${esc(d.label)}</strong><div>${esc(d.tip || fmtN(d.value))}</div>${opt.act ? `<div class="tip-hint">${esc(opt.hint || 'Click to see these people')}</div>` : ''}`);
      return opt.act
        ? `<li ${t}><button type="button" class="hb-row" data-act="${opt.act}" data-kind="${esc(opt.kind || '')}" data-key="${esc(d.key != null ? d.key : d.label)}" aria-label="${esc(`${d.label}: ${d.tip || fmtN(d.value)}. ${opt.hint || 'Show these people in the roster'}`)}">${inner}${opt.arrow !== false ? '<svg class="go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>' : ''}</button></li>`
        : `<li ${t}>${inner}</li>`;
    }).join('')}</ul>`;
  };

  // Funnel: one hue (bar length carries magnitude), step conversion between bars, the leak flagged with icon + label.
  C.funnel = function funnel(steps, o) {
    const opt = Object.assign({ color: 'var(--s1)', bottleneck: null, scale: 'top' }, o);
    const max = Math.max(1, ...steps.map((s, i) => (opt.skipFirst && i === 0 ? 0 : s.count)));
    return `<ol class="funnel${opt.act ? ' linked' : ''}">${steps.map((s, i) => {
      const scaled = opt.skipFirst && i === 0;
      const w = scaled ? 100 : Math.max(1.2, (s.count / max) * 100);
      const leak = opt.bottleneck && opt.bottleneck === s.label;
      const row = `<span class="fn-label">${esc(s.label)}${s.estimate ? ' <span class="est">est.</span>' : ''}</span>
          <span class="fn-track"><span class="fn-bar${scaled ? ' fn-ghost' : ''}" style="width:${w}%;background:${scaled ? 'var(--seq-150)' : opt.color};--i:${i}"></span></span>
          <span class="fn-val">${fmtN(s.count)}</span>`;
      return `<li class="fn-step${leak ? ' leak' : ''}" ${tip(`<strong>${esc(s.label)}</strong><div>${fmtN(s.count)} people</div>${s.ofPrev != null ? `<div>${s.ofPrev}% of previous step</div>` : ''}${s.lost ? `<div>${fmtN(s.lost)} lost at this step</div>` : ''}${opt.act && s.count ? '<div class="tip-hint">Click to see these people</div>' : ''}`)}>
        ${i > 0 ? `<span class="fn-conv${leak ? ' bad' : ''}">${leak ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13M6 12l6 6 6-6"/></svg>' : ''}${s.ofPrev != null ? `${s.ofPrev}%` : ''}${leak ? ' · biggest drop' : ''}</span>` : ''}
        ${opt.act ? `<button type="button" class="fn-row" data-act="${opt.act}" data-kind="${esc(opt.kind || '')}" data-key="${i}"${s.count ? '' : ' disabled'} aria-label="${esc(`${s.label}: ${s.count} people. Show them in the roster`)}">${row}</button>` : `<div class="fn-row">${row}</div>`}</li>`;
    }).join('')}</ol>`;
  };

  // Donut for part-to-whole with <= 5 segments; 2px surface gaps; legend carries the numbers.
  C.donut = function donut(segs, o) {
    const opt = Object.assign({ size: 150, thick: 20, center: '' }, o);
    const total = segs.reduce((s, x) => s + x.value, 0) || 1;
    const R = opt.size / 2, r = R - opt.thick / 2;
    let a0 = -Math.PI / 2, arcs = '';
    segs.forEach((s) => {
      if (!s.value) return;
      const a1 = a0 + (s.value / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a) => `${(R + r * Math.cos(a)).toFixed(2)},${(R + r * Math.sin(a)).toFixed(2)}`;
      const d = s.value === total ? `M${R},${R - r}A${r},${r} 0 1 1 ${R - 0.01},${R - r}` : `M${p(a0)}A${r},${r} 0 ${large} 1 ${p(a1)}`;
      arcs += `<path class="arc" d="${d}" fill="none" stroke="${s.color}" stroke-width="${opt.thick}" ${tip(`<strong>${esc(s.label)}</strong><div>${fmtN(s.value)} · ${Math.round((s.value / total) * 100)}%</div>`)}/>`;
      arcs += `<path d="M${p(a1)}L${(R + (r + opt.thick) * Math.cos(a1)).toFixed(2)},${(R + (r + opt.thick) * Math.sin(a1)).toFixed(2)}" stroke="var(--surface)" stroke-width="2"/>`;
      a0 = a1;
    });
    return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 ${opt.size} ${opt.size}" width="${opt.size}" height="${opt.size}" role="img" aria-label="${esc(opt.title || 'Donut chart')}">${arcs}<text x="${R}" y="${R + 4}" text-anchor="middle" class="donut-n">${esc(opt.center)}</text><text x="${R}" y="${R + 20}" text-anchor="middle" class="donut-l">${esc(opt.centerLabel || '')}</text></svg>
      <ul class="legend vertical">${segs.map((s) => `<li><span class="key" style="background:${s.color}"></span>${esc(s.label)}<b>${fmtN(s.value)}</b><span class="muted">${Math.round((s.value / total) * 100)}%</span></li>`).join('')}</ul></div>`;
  };

  // Sequential heatmap (one hue, sage → forest). Text flips to light ink on dark steps.
  const SEQ = ['--seq-100', '--seq-150', '--seq-200', '--seq-250', '--seq-300', '--seq-350', '--seq-400', '--seq-450', '--seq-500', '--seq-550', '--seq-600'];
  C.seqColor = (v, max) => {
    if (v == null) return null;
    const i = Math.min(SEQ.length - 1, Math.max(0, Math.round((v / (max || 100)) * (SEQ.length - 1))));
    return { bg: `var(${SEQ[i]})`, dark: i >= 6 };
  };
  C.heatmap = function heatmap(rows, o) {
    const opt = Object.assign({ cols: [], max: 100, unit: '%' }, o);
    return `<div class="heat-wrap"><table class="heat"><thead><tr><th scope="col">${esc(opt.rowHead || '')}</th>${opt.sizeHead ? `<th scope="col" class="num">${esc(opt.sizeHead)}</th>` : ''}${opt.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th>${opt.sizeHead ? `<td class="num">${fmtN(r.size)}</td>` : ''}${r.cells.map((v, i) => {
        const c = C.seqColor(v, opt.max);
        return c ? `<td class="cell${c.dark ? ' on-dark' : ''}" style="background:${c.bg}" ${tip(`<strong>${esc(r.label)} · ${esc(opt.cols[i])}</strong><div>${v}${opt.unit}</div>`)}>${v}${opt.unit}</td>` : '<td class="cell empty"></td>';
      }).join('')}</tr>`).join('')}</tbody></table>
      <div class="scale"><span>0${opt.unit}</span><span class="scale-bar"></span><span>${opt.max}${opt.unit}</span></div></div>`;
  };

  // Profile activity strip: one square per week.
  C.weeks = function weeks(ws) {
    return `<div class="weeks" role="img" aria-label="Attendance by week, last ${ws.length} weeks">${ws.map((w) => {
      const lvl = Math.min(2, w.count);
      return `<span class="wk l${lvl}" ${tip(`<strong>Week of ${esc(MY.fmtDate(w.from))}</strong><div>${w.count ? esc(w.titles.join(', ')) : 'No visits'}</div>`)}></span>`;
    }).join('')}</div>`;
  };

  C.meter = (v, max, color) => `<span class="meter"><span style="width:${Math.min(100, (v / (max || 1)) * 100)}%;background:${color || 'var(--s1)'}"></span></span>`;
})(typeof globalThis !== 'undefined' ? globalThis : this);

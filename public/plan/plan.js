'use strict';
// ───────────────────────── Plant icons ─────────────────────────
// 30 photo stickers live in one embedded 6×5 WebP sprite (see .veg.ph in CSS),
// in this order. Plants without a photo (fennel) and the logo fall back to SVG.
const PHOTO_IDS = ['tomato','pepper','basil','lettuce','spinach','kale','cabbage','broccoli','carrot','radish','beet','onion',
  'garlic','peas','beans','corn','squash','cucumber','potato','strawberry','marigold','nasturtium','borage','dill',
  'chives','rosemary','sunflower','comfrey','yarrow','clover'];
(() => {
  const LEAF = 'M0 0C-7-5-8-17 0-26C8-17 7-5 0 0Z', ROUND = 'M0 0C-10-6-10-19 0-26C10-19 10-6 0 0Z';
  const f1 = n => +n.toFixed(1);
  const leaf = (x, y, r, s, fill, vein, d = LEAF) =>
    `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="${d}" fill="${fill}"/><path d="M0-2V-22" stroke="${vein}" stroke-width="1.2" fill="none"/></g>`;
  const lin = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const defs = lin('vg-leaf', '#8fd066', '#3f8a32') + lin('vg-dark', '#4f9446', '#22553a') + lin('vg-fen', '#f6faea', '#c7df9c');
  let fronds = '';
  for (const [x, y] of [[15, 14], [32, 10], [49, 14], [20, 22], [44, 22]]) for (let k = 0; k < 7; k++) {
    const a = (-75 + k * 25) * Math.PI / 180;
    fronds += `<path d="M${x} ${y}l${f1(8 * Math.sin(a))} ${f1(-8 * Math.cos(a))}"/>`;
  }
  const svg = {
    fennel: `<g stroke="#9cc96f" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M27 40C24 30 20 22 15 14"/><path d="M32 40V10"/><path d="M37 40c3-10 7-18 12-26"/></g>
      <g stroke="#6fae4a" stroke-width="1" stroke-linecap="round">${fronds}</g>
      <path d="M17 47c0-8 7-12 15-12s15 4 15 12c0 8-7 14-15 14s-15-6-15-14z" fill="url(#vg-fen)" stroke="#b9d38e" stroke-width="1"/>
      <path d="M24 38c-3 8-1 16 5 22M40 38c3 8 1 16-5 22M32 36v24" stroke="#b6cf8a" stroke-width="1.3" fill="none"/>`,
    logo: `<path d="M32 60V34" stroke="#3f7a2c" stroke-width="4" stroke-linecap="round"/>
      ${leaf(32, 40, -52, 1.15, 'url(#vg-leaf)', 'rgba(255,255,255,.5)', ROUND)}${leaf(32, 35, 42, .95, 'url(#vg-dark)', 'rgba(255,255,255,.4)', ROUND)}
      <path d="M16 60h32" stroke="#8a6644" stroke-width="4" stroke-linecap="round"/>`,
  };
  document.body.insertAdjacentHTML('afterbegin',
    `<svg id="veg-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${defs}</defs>` +
    Object.entries(svg).map(([k, v]) => `<symbol id="v-${k}" viewBox="0 0 64 64">${v}</symbol>`).join('') + '</svg>');
})();
function ico(id, size = 24, cls = '') {
  const i = PHOTO_IDS.indexOf(id);
  if (i < 0) return `<svg class="veg ${cls}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><use href="#v-${id}"/></svg>`;
  return `<span class="veg ph ${cls}" aria-hidden="true" style="width:${size}px;height:${size}px;background-position:${(i % 6) * 20}% ${Math.floor(i / 6) * 25}%"></span>`;
}
// ───────────────────────── Data ─────────────────────────
// Timing windows are in weeks relative to the last spring frost (indoor/out/sow)
// or the first fall frost (fall). sq = plants per square foot. dtm = days to maturity.
const PLANTS = [
  {id:'tomato',k:'T',n:'Tomato',sq:1,roles:['crop'],indoor:[-8,-6],out:[1,3],dtm:70,hw:10,c:['basil','marigold','carrot','onion','borage','chives','garlic','pepper'],a:['potato','kale','cabbage','broccoli','corn','dill']},
  {id:'pepper',k:'Q',n:'Pepper',sq:1,roles:['crop'],indoor:[-10,-8],out:[2,4],dtm:70,hw:10,c:['basil','onion','carrot','tomato'],a:[]},
  {id:'basil',k:'b',n:'Basil',sq:4,roles:['crop','repellent','pollinator'],indoor:[-6,-4],out:[1,3],dtm:30,hw:12,c:['tomato','pepper'],a:[]},
  {id:'lettuce',k:'L',n:'Lettuce',sq:4,roles:['crop'],sow:[-4,2],fall:[-8,-5],dtm:45,hw:5,shade:1,hardy:1,c:['carrot','radish','strawberry','onion','chives','beet'],a:[]},
  {id:'spinach',k:'H',n:'Spinach',sq:9,roles:['crop'],sow:[-6,-2],fall:[-7,-4],dtm:40,hw:5,shade:1,hardy:1,c:['strawberry','peas','radish'],a:[]},
  {id:'kale',k:'K',n:'Kale',sq:1,roles:['crop'],indoor:[-6,-4],out:[-2,2],fall:[-10,-8],dtm:55,hw:12,shade:1,hardy:1,c:['onion','beet','dill','nasturtium','rosemary','garlic'],a:['tomato','strawberry']},
  {id:'cabbage',k:'J',n:'Cabbage',sq:1,roles:['crop'],indoor:[-6,-4],out:[-2,1],dtm:70,hw:4,hardy:1,c:['onion','dill','rosemary','nasturtium','beet'],a:['tomato','strawberry']},
  {id:'broccoli',k:'B',n:'Broccoli',sq:1,roles:['crop'],indoor:[-6,-4],out:[-2,1],dtm:60,hw:4,hardy:1,c:['onion','dill','rosemary','beet','nasturtium'],a:['tomato','strawberry']},
  {id:'carrot',k:'C',n:'Carrot',sq:16,roles:['crop'],sow:[-3,4],dtm:70,hw:6,hardy:1,c:['tomato','onion','lettuce','rosemary','chives','peas','radish'],a:['dill']},
  {id:'radish',k:'R',n:'Radish',sq:16,roles:['crop'],sow:[-4,4],fall:[-6,-3],dtm:28,hw:3,shade:1,hardy:1,c:['lettuce','carrot','cucumber','peas','spinach','nasturtium'],a:[]},
  {id:'beet',k:'E',n:'Beet',sq:9,roles:['crop','accumulator'],sow:[-3,4],dtm:55,hw:6,shade:1,hardy:1,c:['onion','lettuce','kale','garlic'],a:[]},
  {id:'onion',k:'O',n:'Onion',sq:9,roles:['crop','repellent'],indoor:[-10,-8],out:[-4,-2],dtm:100,hw:4,hardy:1,c:['carrot','tomato','lettuce','beet','pepper','kale'],a:['beans','peas']},
  {id:'garlic',k:'G',n:'Garlic',sq:9,roles:['crop','repellent'],fallPlant:[-6,-3],dtm:240,hardy:1,c:['tomato','carrot','beet','strawberry','kale'],a:['beans','peas']},
  {id:'peas',k:'P',n:'Peas',sq:8,roles:['crop','nitrogen'],sow:[-6,-2],dtm:60,hw:4,shade:1,hardy:1,c:['carrot','radish','cucumber','corn','spinach'],a:['onion','garlic','chives']},
  {id:'beans',k:'N',n:'Bush beans',sq:9,roles:['crop','nitrogen'],sow:[1,8],dtm:55,hw:5,c:['corn','squash','cucumber','carrot','rosemary','marigold','potato'],a:['onion','garlic','chives']},
  {id:'corn',k:'Z',n:'Corn',sq:4,roles:['crop'],sow:[1,4],dtm:80,hw:3,c:['beans','squash','peas','cucumber','sunflower'],a:['tomato']},
  {id:'squash',k:'S',n:'Squash',sq:1,roles:['crop','groundcover'],sow:[1,4],dtm:55,hw:10,c:['corn','beans','nasturtium','borage','marigold'],a:['potato']},
  {id:'cucumber',k:'U',n:'Cucumber',sq:2,roles:['crop'],sow:[1,4],dtm:55,hw:8,c:['beans','peas','radish','dill','nasturtium','sunflower'],a:['potato']},
  {id:'potato',k:'p',n:'Potato',sq:1,roles:['crop'],sow:[-2,2],dtm:90,hw:4,c:['beans','corn','marigold'],a:['tomato','squash','cucumber','sunflower']},
  {id:'strawberry',k:'W',n:'Strawberry',sq:4,roles:['crop','perennial','groundcover'],out:[-4,0],dtm:60,hw:5,shade:1,hardy:1,c:['spinach','lettuce','onion','borage','chives'],a:['kale','cabbage','broccoli']},
  {id:'marigold',k:'M',n:'Marigold',sq:4,roles:['repellent','pollinator'],indoor:[-6,-4],out:[1,2],dtm:50,c:['tomato','potato','squash','beans'],a:[]},
  {id:'nasturtium',k:'X',n:'Nasturtium',sq:1,roles:['repellent','groundcover','pollinator'],sow:[1,3],dtm:50,c:['squash','cucumber','kale','radish'],a:[]},
  {id:'borage',k:'V',n:'Borage',sq:1,roles:['pollinator','accumulator'],sow:[-1,2],dtm:50,c:['tomato','squash','strawberry'],a:[]},
  {id:'dill',k:'D',n:'Dill',sq:4,roles:['pollinator','crop'],sow:[0,4],dtm:40,hw:6,c:['cucumber','lettuce','kale','cabbage','broccoli'],a:['carrot','tomato']},
  {id:'chives',k:'I',n:'Chives',sq:9,roles:['repellent','perennial','pollinator'],indoor:[-8,-6],out:[-2,0],dtm:60,hw:20,shade:1,hardy:1,c:['carrot','tomato','strawberry','lettuce'],a:['beans','peas']},
  {id:'rosemary',k:'r',n:'Rosemary',sq:1,roles:['repellent','perennial','pollinator'],out:[1,3],dtm:90,c:['carrot','beans','cabbage','kale','broccoli'],a:[]},
  {id:'sunflower',k:'A',n:'Sunflower',sq:1,roles:['pollinator'],sow:[0,3],dtm:80,c:['cucumber','corn'],a:['potato']},
  {id:'comfrey',k:'F',n:'Comfrey',sq:1,roles:['accumulator','perennial','pollinator'],out:[-2,2],dtm:60,shade:1,hardy:1,c:[],a:[]},
  {id:'yarrow',k:'Y',n:'Yarrow',sq:4,roles:['accumulator','perennial','pollinator'],out:[-2,2],dtm:90,hardy:1,c:[],a:[]},
  {id:'clover',k:'c',n:'White clover',sq:16,roles:['nitrogen','groundcover','perennial'],sow:[-4,4],dtm:60,shade:1,hardy:1,c:[],a:[]},
  {id:'fennel',k:'f',n:'Fennel',sq:1,roles:['pollinator'],sow:[0,3],dtm:80,hw:6,c:[],a:['tomato','pepper','beans','carrot','dill','kale','cabbage','broccoli','corn','potato','cucumber','peas']},
];
const P = Object.fromEntries(PLANTS.map(p => [p.id, p]));
const BYKEY = Object.fromEntries(PLANTS.map(p => [p.k, p.id]));
// Symmetric companion / antagonist lookups
const GOOD = {}, BAD = {};
for (const p of PLANTS) { GOOD[p.id] ||= new Set(); BAD[p.id] ||= new Set(); }
for (const p of PLANTS) {
  for (const o of p.c) { GOOD[p.id].add(o); GOOD[o].add(p.id); }
  for (const o of p.a) { BAD[p.id].add(o); BAD[o].add(p.id); }
}
const ROLES = {
  crop:['tomato','Food crops'], nitrogen:['peas','Nitrogen fixers'], pollinator:['sunflower','Pollinator magnets'],
  repellent:['marigold','Pest repellers'], accumulator:['comfrey','Dynamic accumulators'], groundcover:['clover','Living mulch'],
  perennial:['strawberry','Perennials'],
};

// Templates are rows of plant keys ('.' = empty)
const TEMPLATES = [
  {id:'sisters',name:'Three Sisters, plus',tag:'Summer · full sun · 4 × 8 ft',desc:'Corn holds up the beans, beans feed the soil, squash shades it. Nasturtium and borage pull in the bees.',
   rows:['ZNZN','SXSV','ZNZN','AUXU','ZNZN','SMSV','ZNZN','UXUA']},
  {id:'salsa',name:'Salsa bed',tag:'Summer · warmest spot you have',desc:'Tomatoes, peppers, onions and herbs, with marigolds on guard. Good for the fog-free side of the hills.',
   rows:['TbTb','OQIQ','TMTb','COCI','QbQM','OCOC','TVTb','LLLL']},
  {id:'salad',name:'Cut-and-come salad',tag:'Cool season · fine in part shade',desc:'Fast greens to pick all winter, with a pea trellis along the back. Suits foggy Bay Area summers too.',
   rows:['LRLR','CHCH','EOKL','EDEV','WHWI','LRLR','PPPP','XcXc']},
  {id:'pollinator',name:'Pollinator border',tag:'Perennial · low water once settled',desc:'Comfrey, yarrow and borage that feed bees for years and drop their own mulch.',
   rows:['YVYA','FMFX','DWDY','VIVM','YFYA','cWcW','XMXV','rcrY']},
];


// Progress checklist: a quiet replacement for the old XP/referral system.
const QUESTS = [
  {id:'check', label:'Run a site check', href:'#check'},
  {id:'plant10', label:'Plant 10 squares', href:'#planner'},
  {id:'guild', label:'Grow a guild of 5+ species with no conflicts', href:'#planner'},
  {id:'remix', label:'Borrow a community layout', href:'#community'},
  {id:'ics', label:'Add the planting calendar to yours', href:'#calendar'},
  {id:'share', label:'Share your plan with someone', href:'#community'},
];
// [checklist items done, stage name]
const LEVELS = [[0,'Seedling'],[2,'Sprout'],[3,'Sapling'],[5,'Grower'],[6,'Food forester']];

// ───────────────────────── Line icons ─────────────────────────
// Hand-drawn feel: 24px grid, round caps and joins, stroke = currentColor.
const ICONS = {
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  locate: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  cloudsun: '<path d="M8 3.5V5M3.5 8H5M4.8 4.8l1 1M11.2 4.8l-1 1"/><path d="M5.6 10.6a3 3 0 1 1 5.2-2.9"/><path d="M9 19.5a3.5 3.5 0 0 1-.4-7 4.6 4.6 0 0 1 8.7 1.3 3 3 0 0 1-.3 5.7z"/>',
  rain: '<path d="M7.5 15a4 4 0 0 1-.6-8 5.2 5.2 0 0 1 10.1.4 3.8 3.8 0 0 1 .3 7.6z"/><path d="m8.5 18-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
  waves: '<path d="M3 8c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 13c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 18c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"/>',
  cactus: '<path d="M10 20.5V6a2 2 0 0 1 4 0v14.5"/><path d="M14 12h2a2 2 0 0 0 2-2V8M10 14H8a2 2 0 0 1-2-2v-2M5 20.5h14"/>',
  beds: '<path d="M3 15h18v4.5H3z"/><path d="M6 15c.6-2.6 2.2-4 4.5-4.2M12.5 15c.5-2.4 1.9-3.8 4.3-4.2M9 10.8c-.2-2 .6-3.6 2.2-4.6"/>',
  contour: '<path d="M3 7.5c3 2 6 2 9 0s6-2 9 0"/><path d="M3 12.5c3 2 6 2 9 0s6-2 9 0" stroke-dasharray="1.5 3"/><path d="M3 17.5c3 2 6 2 9 0s6-2 9 0"/>',
  terrace: '<path d="M3 20.5h18M3 20.5v-4h5v-4h5v-4h5V4.5"/><path d="M17.5 4.5c0-1.4 1-2.3 2.5-2.3"/>',
  worm: '<path d="M3.5 15.5c1.2-3 3.6-3 4.6-1s3.6 2.4 4.4-.4 3.2-4.4 5.2-2.6 1.6 3.6 2.8 3"/><path d="M4 19.5h16" stroke-dasharray="1 3"/>',
  sand: '<path d="M3 16.5c3-4 6-4 9 0 2.5-2.6 5.5-3 9 0"/><path d="M7 20h.01M12 20.5h.01M17 20h.01M9.5 12.5h.01M15 11h.01"/>',
  jar: '<path d="M8 3.5h8M9 3.5v3L7 9v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 19V9l-2-2.5v-3"/><path d="M7 13h10M7 16.5h10"/>',
  loam: '<path d="M4 19.5h16"/><path d="M12 19.5v-6.5"/><path d="M12 13c0-4 2.8-6.5 7-6.5 0 4-2.8 6.5-7 6.5zM12 15.5c-.3-3-2.5-5-6-5 0 3 2.3 5 6 5z"/>',
  tree: '<path d="M12 21v-6.5"/><path d="M7.5 14.5a4.5 4.5 0 0 1-.9-8.9A5.5 5.5 0 0 1 17 6.4a4.2 4.2 0 0 1 .4 8.1z"/>',
  cloche: '<path d="M4 19.5h16"/><path d="M6 19.5V13a6 6 0 0 1 12 0v6.5"/><path d="M12 7V5.5M12 19.5v-4M12 15.5c-1.5 0-2.5-1-2.5-2.5 1.5 0 2.5 1 2.5 2.5zM12 16.5c1.5 0 2.5-1 2.5-2.5-1.5 0-2.5 1-2.5 2.5z"/>',
  thermo: '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  drop: '<path d="M12 3.5s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  eraser: '<path d="M14 4.5 19.5 10 11 18.5H6.5L4 16z"/><path d="m9 9.5 5.5 5.5M12 18.5h8"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="1.5"/><path d="M7 14h10v6.5H7z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  share: '<path d="M12 15V3.5M8 7.5l4-4 4 4"/><path d="M5 12v7.5h14V12"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  heart: '<path d="M12 20s-7.5-4.5-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z"/>',
  remix: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20v-4.5h4.5"/>',
  code: '<path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5.5l-3 13"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19.5c.5-3.5 2.6-5.5 5.5-5.5s5 2 5.5 5.5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.7.8 2.7 2.5 3 5.2"/>',
  stake: '<path d="M12 21V9"/><path d="M12 9.5 5 6l7-3.5 7 3.5z"/><path d="M7.5 21c1.5-2.5 3-3.5 4.5-3.5s3 1 4.5 3.5"/>',
  grip: '<path d="M19.5 11v8.5H11"/><path d="m13.5 19.5 6-6M17 19.5l2.5-2.5"/>',
  sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
};
function ic(name, size = 18, sw = 1.7) {
  return `<svg class="ic-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
// Five growth stages for the progress badge, seed to fruiting tree.
function stageSvg(level, size = 22) {
  const soil = '<path d="M4.5 21h15"/>';
  const art = [
    '<path d="M12 21v-2.5"/><path d="M12 18.5c-1.6 0-2.6-1-2.6-2.6 1.6 0 2.6 1 2.6 2.6z"/><path d="M8.5 21c.5-.8 1.2-1.2 2-1.3M15.5 21c-.5-.8-1.2-1.2-2-1.3"/>',
    '<path d="M12 21v-7"/><path d="M12 15.5c-2.6 0-4.2-1.6-4.2-4.2 2.6 0 4.2 1.6 4.2 4.2zM12 14.5c0-2.6 1.6-4.2 4.2-4.2 0 2.6-1.6 4.2-4.2 4.2z"/>',
    '<path d="M12 21V7"/><path d="M12 17c-2.4 0-3.8-1.4-3.8-3.8 2.4 0 3.8 1.4 3.8 3.8zM12 13.5c0-2.4 1.4-3.8 3.8-3.8 0 2.4-1.4 3.8-3.8 3.8zM12 9.5c-1.8 0-3-1.2-3-3 1.8 0 3 1.2 3 3zM12 7c0-1.6.9-2.6 2.4-2.8"/>',
    '<path d="M12 21v-6"/><path d="M12 15c-3.8 0-6.5-1.9-6.5-4.6S8 6 12 6s6.5 1.7 6.5 4.4S15.8 15 12 15z"/><path d="M12 15l-2.5-3M12 13.5l2.6-3"/>',
    '<path d="M12 21v-6.5"/><path d="M7.5 14.5a4.5 4.5 0 0 1-.9-8.9A5.5 5.5 0 0 1 17 6.4a4.2 4.2 0 0 1 .4 8.1z"/><circle cx="9.5" cy="9.5" r=".9"/><circle cx="14.5" cy="8.5" r=".9"/><circle cx="13" cy="12" r=".9"/>',
  ][level] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${soil}${art}</svg>`;
}
// ───────────────────────── Helpers ─────────────────────────
const $ = s => document.querySelector(s);
const DAY = 864e5;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const doyOf = d => Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1;
const wrapDoy = d => ((Math.round(d) - 1) % 365 + 365) % 365 + 1;
const doyDate = (doy, y) => new Date(Date.UTC(y, 0, 1) + (doy - 1) * DAY);
const fmtDoy = doy => { const d = doyDate(doy, 2025); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const todayDoy = () => doyOf(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
const baseUrl = () => location.origin === 'null' || location.protocol === 'file:' ? location.href.split(/[?#]/)[0] : location.origin + location.pathname;

const STORE_KEY = 'permaplot.v1';
const S = Object.assign({
  loc: null, climate: null,
  site: {slope:'gentle', sun:'full', soil:'loam', water:'rain', area:200, roof:80},
  bed: {w:4, h:8, cells:Array(32).fill(null)},
  quests: {}, email: null, ref: null, liked: {}, done: {},
  units: /^en-US/.test(navigator.language || '') ? 'imperial' : 'metric',
}, (() => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } })());
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch {} };

const imp = () => S.units === 'imperial';
const fmtT = c => imp() ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`;
const fmtP = mm => imp() ? `${(mm / 25.4).toFixed(1)} in` : `${Math.round(mm)} mm`;
const fmtVol = L => imp() ? `${Math.round(L * 0.264).toLocaleString()} gal` : `${Math.round(L).toLocaleString()} L`;
const M2FT = 10.7639;

function toast(msg, action) {
  const t = document.createElement('div'); t.className = 'toast';
  const m = document.createElement('span'); m.textContent = msg; t.appendChild(m);
  if (action) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = action.label;
    b.addEventListener('click', () => { action.fn(); t.remove(); }); t.appendChild(b);
  }
  const box = $('#toasts'); box.appendChild(t);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => t.remove(), action ? 6000 : 3200);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast('Copied to clipboard');
}

// ───────────────────────── Climate ─────────────────────────
async function geocode(q) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
  if (!r.ok) throw new Error('geocode ' + r.status);
  const j = await r.json();
  return (j.results || []).map(x => ({name: [x.name, x.admin1, x.country_code].filter(Boolean).join(', '), lat: x.latitude, lon: x.longitude}));
}

async function fetchClimate(lat, lon) {
  const y = new Date().getFullYear();
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${y - 5}-01-01&end_date=${y - 1}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('climate ' + r.status);
  const j = await r.json();
  const c = analyzeClimate(j.daily, lat);
  c.elevation = j.elevation;
  return c;
}

// Derives frost dates, hardiness zone and rainfall from daily series.
// Southern-hemisphere sites are analysed in a frame shifted by ~6 months so the
// growing season never straddles the year boundary.
function analyzeClimate(d, lat) {
  const SH = lat < 0, SHIFT = 184;
  const seasons = {}, cal = {};
  const monMax = Array.from({length:12}, () => []), monMin = Array.from({length:12}, () => []), monP = Array(12).fill(0);
  for (let i = 0; i < d.time.length; i++) {
    const tmin = d.temperature_2m_min[i], tmax = d.temperature_2m_max[i], p = d.precipitation_sum[i] || 0;
    if (tmin == null) continue;
    const dt = new Date(d.time[i] + 'T00:00:00Z'), y = dt.getUTCFullYear(), m = dt.getUTCMonth();
    const c = (cal[y] ||= {min: Infinity, p: 0, n: 0});
    c.min = Math.min(c.min, tmin); c.p += p; c.n++;
    monMin[m].push(tmin); if (tmax != null) monMax[m].push(tmax); monP[m] += p;
    const sd = SH ? new Date(dt.getTime() + SHIFT * DAY) : dt;
    const s = (seasons[sd.getUTCFullYear()] ||= {n: 0, last: null, first: null}), sdoy = doyOf(sd);
    s.n++;
    if (tmin <= 0) {
      if (sdoy < 182) { if (s.last == null || sdoy > s.last) s.last = sdoy; }
      else if (s.first == null || sdoy < s.first) s.first = sdoy;
    }
  }
  const full = Object.values(seasons).filter(s => s.n >= 360);
  const lasts = full.map(s => s.last).filter(v => v != null), firsts = full.map(s => s.first).filter(v => v != null);
  const frostFree = !full.length || (lasts.length * 2 < full.length && firsts.length * 2 < full.length);
  const lastS = lasts.length ? Math.round(median(lasts)) : 1, firstS = firsts.length ? Math.round(median(firsts)) : 365;
  const unshift = v => SH ? wrapDoy(v - SHIFT) : v;
  const years = Object.values(cal).filter(c => c.n >= 360);
  const yrs = years.length || 1;
  const extremeMin = years.length ? mean(years.map(c => c.min)) : Math.min(...Object.values(cal).map(c => c.min));
  const monthly = {
    max: monMax.map(a => a.length ? mean(a) : null),
    min: monMin.map(a => a.length ? mean(a) : null),
    p: monP.map(v => v / yrs),
  };
  return {
    frostFree,
    lastFrost: frostFree ? null : unshift(lastS),
    firstFrost: frostFree ? null : unshift(firstS),
    season: frostFree ? 365 : firstS - lastS,
    extremeMin,
    zone: usdaZone(extremeMin),
    annualPrecip: years.length ? mean(years.map(c => c.p)) : monthly.p.reduce((a, b) => a + b, 0),
    warmMax: Math.max(...monthly.max.filter(v => v != null)),
    coldMin: Math.min(...monthly.min.filter(v => v != null)),
    monthly, years: full.length, hemisphere: SH ? 'S' : 'N',
  };
}

function usdaZone(minC) {
  const f = minC * 9 / 5 + 32, v = f + 60;
  if (v < 0) return '1a';
  const z = Math.min(13, Math.floor(v / 10) + 1);
  return z + (z === 13 || v % 10 >= 5 ? 'b' : 'a');
}

// Rough latitude-only fallback for when the archive API can't be reached.
function estimateClimate(lat) {
  const a = Math.abs(lat), SH = lat < 0;
  const base = {estimate: true, hemisphere: SH ? 'S' : 'N', annualPrecip: 800, years: 0, monthly: null};
  if (a < 24) return {...base, frostFree: true, lastFrost: null, firstFrost: null, season: 365, extremeMin: 8, zone: usdaZone(8), warmMax: 31, coldMin: 18};
  const lastN = Math.round(Math.min(170, 15 + (a - 24) * 4.6));
  const firstN = Math.round(Math.max(200, 350 - (a - 24) * 4));
  const ext = 8 - (a - 24) * 1.4;
  return {...base, frostFree: false, lastFrost: SH ? wrapDoy(lastN + 182) : lastN, firstFrost: SH ? wrapDoy(firstN + 182) : firstN,
    season: firstN - lastN, extremeMin: ext, zone: usdaZone(ext), warmMax: 34 - (a - 24) * 0.3, coldMin: ext + 6};
}

// Frost anchors used by the calendar; falls back to a typical zone-7 garden.
function anchors() {
  const c = S.climate;
  if (!c) return {lf: 105, ff: 288, ff_free: false};
  if (c.frostFree) return c.hemisphere === 'S' ? {lf: 213, ff: 152, ff_free: true} : {lf: 32, ff: 335, ff_free: true};
  return {lf: c.lastFrost, ff: c.firstFrost, ff_free: false};
}


// ───────────────────────── Recommendations ─────────────────────────
function recommend(c, s) {
  const out = [];
  const rain = c.annualPrecip;
  if (rain < 400) out.push(['cactus','Dryland strategy','Rain is scarce, so every drop counts. Dig swales on contour, mulch 10–15 cm deep, reuse greywater, and lean on drought-hardy perennials like rosemary, yarrow and comfrey.']);
  else if (rain < 1000) out.push(['rain','Catch and store','Moderate rain, nearly all of it in winter here. Add barrels or a tank, and send the overflow to a mulched basin near your fruit trees.']);
  else out.push(['waves','Manage the surplus','Plenty of rain. Raised beds or hugelkultur mounds help drainage, a small pond brings frogs, and covered soil stays put.']);

  if (s.slope === 'flat') out.push(['beds','Build up, not across','On flat ground, raised beds and hugelkultur warm up sooner and drain better. Keyhole beds save walking space.']);
  else if (s.slope === 'gentle') out.push(['contour','Swales on contour','A gentle slope is ideal for swales. Find contour with an A-frame level, dig a shallow ditch, and plant the berm with nitrogen-fixing shrubs.']);
  else out.push(['terrace','Terrace and go perennial','On a steep slope, skip tilling. Terrace with logs or stone and favour a perennial food forest whose roots hold the hill.']);

  if (s.soil === 'clay') out.push(['worm','Open up the clay','Loosen with a broadfork (no tilling), add compost twice a year, and let tap-rooted daikon and comfrey break up the subsoil.']);
  else if (s.soil === 'sandy') out.push(['sand','Feed the sand','Sandy soil drains fast and loses nutrients. Add organic matter, mulch heavily, and keep clover growing as a living mulch.']);
  else if (s.soil === 'unknown') out.push(['jar','Do a jar test','Shake soil and water in a jar and leave it overnight. Sand settles first, then silt, then clay; the layer thicknesses tell you what you have.']);
  else out.push(['loam','Protect the loam','Loam is a great start. Keep it that way with no-dig beds and permanent mulch so the structure stays intact.']);

  if (s.sun === 'shade') out.push(['tree','Plant for shade','With under 4 hours of sun, grow leafy greens, peas, chives, strawberries and comfrey. Fruiting crops will struggle.']);
  else if (s.sun === 'part') out.push(['cloudsun','Partial sun','Give tomatoes and squash the sunniest spots, and fill the rest with greens, roots and herbs.']);

  if (!c.frostFree && c.season < 130) out.push(['cloche','Stretch the season','Your frost-free season is short. Start plants indoors, use cold frames and row cover, and pick varieties under 60 days.']);
  if (c.frostFree) out.push(['sun','Grow all year','Frost is rare here. Plant cool-season crops in fall and winter and heat lovers through the warm months.']);
  if (c.warmMax > 32) out.push(['thermo','Beat the heat','Summer highs pass 32 °C (90 °F). Hang 30% shade cloth for the afternoon, mulch deeply and water early.']);
  if (s.water === 'rain' && rain < 700) out.push(['drop','Store for the dry months','You rely on rain alone. Size your tank for about three months of summer use and run drip lines under the mulch.']);
  return out;
}

function siteScore(c, s) {
  let v = 40;
  v += Math.min(25, (c.season / 365) * 30);
  v += c.annualPrecip >= 500 && c.annualPrecip <= 1400 ? 12 : c.annualPrecip >= 300 ? 6 : 0;
  v += {loam: 10, clay: 4, sandy: 4, unknown: 5}[s.soil];
  v += {full: 10, part: 6, shade: 1}[s.sun];
  v += {flat: 5, gentle: 6, steep: 1}[s.slope];
  v += s.water === 'rain' ? 0 : 3;
  return Math.max(10, Math.min(99, Math.round(v)));
}

function zonePlan(areaM2) {
  const small = areaM2 < 120, mid = areaM2 < 2000;
  return [
    ['0','Home','Your base. Use it for seed starting, compost scraps and windowsill herbs.'],
    ['1','Daily garden', small ? 'This could be your whole site. Use vertical trellises, salad beds and herbs by the door.' : 'Put salad, herbs and the beds you planned here, within 10 steps of the door.'],
    ['2','Weekly care', small ? 'Containers, berries along fences, a worm bin.' : 'Berries, perennial vegetables, compost, chickens and a rain tank.'],
    ['3','Main crops', mid ? 'Fruit-tree guilds, the Three Sisters and squash patches.' : 'Orchard, field crops, swales and a pond.'],
    ['4','Forage', mid ? 'Optional: a wild hedgerow for birds and beneficial insects.' : 'Nut trees, coppice, pasture and timber.'],
    ['5','Wild', 'Leave some untouched space, even a corner, for wildlife and observation.'],
  ];
}


function zonesSvg() {
  const col = ['#b8734c','#356145','#668051','#86995d','#b7c98d','#dfe8cc'];
  let g = '';
  for (let i = 5; i >= 0; i--) g += `<circle cx="30" cy="120" r="${18 + i * 22}" fill="${col[i]}" opacity="${i ? .9 : 1}"><title>Zone ${i}</title></circle>`;
  for (let i = 0; i <= 5; i++) g += `<text x="${30 + (i ? 18 + (i - 1) * 22 + 6 : -4)}" y="${i ? 116 : 124}" font-size="12" font-family="Fraunces Variable, Georgia, serif" font-style="italic" fill="${i < 3 ? '#fbfcf4' : '#263e2e'}">${i}</text>`;
  return `<svg viewBox="0 0 240 240" width="100%" style="max-width:200px" role="img" aria-label="Permaculture zones diagram"><clipPath id="zc"><rect width="240" height="240" rx="12"/></clipPath><g clip-path="url(#zc)"><rect width="240" height="240" fill="#f1f2e6"/>${g}</g></svg>`;
}

function climateChart(m) {
  if (!m) return '';
  const W = 520, H = 150, pad = 26, bw = (W - pad * 2) / 12;
  const pMax = Math.max(...m.p, 1);
  const tVals = [...m.max, ...m.min].filter(v => v != null);
  const tLo = Math.min(...tVals) - 2, tHi = Math.max(...tVals) + 2;
  const ty = t => H - pad - ((t - tLo) / (tHi - tLo)) * (H - pad * 2);
  let bars = '', labels = '';
  m.p.forEach((p, i) => {
    const h = (p / pMax) * (H - pad * 2) * .8;
    bars += `<rect x="${pad + i * bw + 5}" y="${H - pad - h}" width="${bw - 10}" height="${h}" rx="3" fill="#acd0cf" opacity=".75"><title>${MONTHS[i]}: ${fmtP(p)} rain, highs ${m.max[i] != null ? fmtT(m.max[i]) : '–'}, lows ${m.min[i] != null ? fmtT(m.min[i]) : '–'}</title></rect>`;
    labels += `<text x="${pad + i * bw + bw / 2}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#687464">${MONTHS[i][0]}</text>`;
  });
  const pts = arr => arr.map((t, i) => `${pad + i * bw + bw / 2},${ty(t)}`).join(' ');
  const lineHi = `<polyline points="${pts(m.max)}" fill="none" stroke="#b8734c" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const lineLo = `<polyline points="${pts(m.min)}" fill="none" stroke="#356145" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const zero = tLo < 0 && tHi > 0 ? `<line x1="${pad}" x2="${W - pad}" y1="${ty(0)}" y2="${ty(0)}" stroke="#467e83" stroke-dasharray="4 4"/><text x="${W - pad}" y="${ty(0) - 3}" font-size="9" text-anchor="end" fill="#467e83">freezing</text>` : '';
  return `<div class="chart-legend"><span><i style="background:#b8734c"></i>Average high</span><span><i style="background:#356145"></i>Average low</span><span><i class="bar" style="background:#7fb3b2"></i>Rain</span></div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monthly temperature and rainfall">${bars}${zero}${lineHi}${lineLo}${labels}</svg>`;
}

// Links out to Explore (the Common Ground map). Plain links, coordinates when known.
function exploreLinks(loc) {
  const f = loc ? `focus=${(+loc.lat).toFixed(4)},${(+loc.lon).toFixed(4)}` : '';
  const near = loc ? ` near ${esc(loc.name.split(',')[0])}` : ' near you';
  return `<div class="out-links">
    <a class="go" href="/learn${f ? '?' + f : ''}"><span class="gi">${ic('people', 20)}</span><span><strong>Find community gardens${near}</strong><small>See who's already growing on the Explore map.</small></span><span class="ga">${ic('arrow', 18)}</span></a>
    <a class="go" href="/learn?mode=create${f ? '&' + f : ''}"><span class="gi">${ic('stake', 20)}</span><span><strong>Propose a community garden here</strong><small>Pin an empty lot or schoolyard and gather neighbours.</small></span><span class="ga">${ic('arrow', 18)}</span></a>
  </div>`;
}

// ───────────────────────── Site check UI ─────────────────────────
let pickedLoc = null, cameFromExplore = false, lastScore = 0;
const AREA = {min: 5, max: 5000}, ROOF = {min: 0, max: 400}; // m²
const areaToSlider = m2 => Math.round(1000 * Math.log(Math.max(AREA.min, m2) / AREA.min) / Math.log(AREA.max / AREA.min));
const sliderToArea = v => AREA.min * Math.pow(AREA.max / AREA.min, v / 1000);
const roofToSlider = m2 => Math.round(1000 * Math.min(ROOF.max, m2) / ROOF.max);
const sliderToRoof = v => ROOF.max * v / 1000;
const niceNum = x => x < 100 ? Math.round(x) : x < 1000 ? Math.round(x / 5) * 5 : Math.round(x / 50) * 50;

function fillRange(el) {
  const p = (el.value - el.min) / (el.max - el.min) * 100;
  el.style.setProperty('--fill', p + '%');
}
function syncRanges() {
  $('#areaR').value = areaToSlider(S.site.area); $('#roofR').value = roofToSlider(S.site.roof);
  fillRange($('#areaR')); fillRange($('#roofR'));
}
function buildSegs() {
  document.querySelectorAll('.segs[data-for]').forEach(box => {
    const sel = $('#' + box.dataset.for);
    box.innerHTML = [...sel.options].map(o => `<button type="button" data-v="${o.value}" aria-pressed="false">${o.textContent}</button>`).join('');
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if (!b || sel.value === b.dataset.v) return;
      sel.value = b.dataset.v; sel.dispatchEvent(new Event('change'));
    });
  });
}
function syncSegs() {
  document.querySelectorAll('.segs[data-for]').forEach(box => {
    const v = $('#' + box.dataset.for).value;
    box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  });
}

function readSite() {
  const k = imp() ? 1 / M2FT : 1;
  S.site = {
    slope: $('#slope').value, sun: $('#sun').value, soil: $('#soil').value, water: $('#water').value,
    area: Math.max(1, +$('#area').value || 1) * k, roof: Math.max(0, +$('#roof').value || 0) * k,
  };
}
function writeSite() {
  const k = imp() ? M2FT : 1;
  for (const f of ['slope', 'sun', 'soil', 'water']) $('#' + f).value = S.site[f];
  $('#area').value = niceNum(S.site.area * k);
  $('#roof').value = niceNum(S.site.roof * k);
  document.querySelectorAll('.u-area').forEach(e => e.textContent = imp() ? 'ft²' : 'm²');
  if (S.loc) $('#loc').value = S.loc.name;
  syncSegs(); syncRanges();
}

async function runCheck(loc) {
  S.loc = loc; save();
  $('#loc').value = loc.name;
  $('#results').innerHTML = `<div class="loading"><div><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path class="rays" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg><p>Reading five years of weather for <b>${esc(loc.name)}</b>…</p></div></div>`;
  try { S.climate = await fetchClimate(loc.lat, loc.lon); }
  catch (e) { console.warn(e); S.climate = estimateClimate(loc.lat); toast('Couldn\'t reach the weather archive, so this is an estimate from latitude'); }
  save();
  renderResults();
  renderCalendar();
  renderPalette();
  renderCommunityLinks();
  complete('check');
}

// Signed difference in days between two day-of-year values (handles year wrap).
const doyDiff = (d, d0) => ((Math.round(d - d0) % 365) + 365 + 182) % 365 - 182;

function renderResults() {
  const c = S.climate, s = S.site, loc = S.loc;
  if (!c || !loc) return;
  const score = siteScore(c, s);
  const harvestL = s.roof * c.annualPrecip * 0.8;
  const verdict = score >= 80 ? 'Excellent growing potential' : score >= 65 ? 'Strong growing potential' : score >= 50 ? 'Workable, with a few design moves' : 'Tough, but workable with the right design';
  if (!c.frostFree) { c.lf0 ??= c.lastFrost; c.ff0 ??= c.firstFrost; }
  const R = 34, CIRC = 2 * Math.PI * R, off = p => (CIRC * (1 - p / 100)).toFixed(1);
  const back = cameFromExplore ? `<a class="back-map" href="/learn?focus=${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}">${ic('back', 15)}Back to the map</a>` : '';
  $('#results').innerHTML = `
    <div class="res-head">
      <div><h3>${ic('pin', 22)}${esc(loc.name)}</h3>
        <div class="fine">${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°${c.elevation != null ? ` · ${imp() ? Math.round(c.elevation * 3.281) + ' ft' : Math.round(c.elevation) + ' m'} up` : ''} · ${c.estimate ? '<b style="color:var(--cg-clay)">estimated from latitude</b>' : `${c.years}-year weather record`}</div>${back}</div>
      <div class="units" role="group" aria-label="Units"><button type="button" data-u="metric" class="${imp() ? '' : 'on'}" aria-pressed="${!imp()}">Metric</button><button type="button" data-u="imperial" class="${imp() ? 'on' : ''}" aria-pressed="${imp()}">Imperial</button></div>
    </div>
    <div class="score"><div class="ring"><svg width="82" height="82" viewBox="0 0 82 82"><circle class="track" cx="41" cy="41" r="${R}"/><circle class="val" cx="41" cy="41" r="${R}" stroke-dasharray="${CIRC.toFixed(1)}" style="--from:${off(lastScore)};stroke-dashoffset:${off(score)}"/></svg><span>${score}</span></div>
      <div><strong>${verdict}</strong><div class="fine">Site score weighs season length, rain, soil, sun, slope and water. Change the details on the left and it updates.</div></div></div>
    <div class="stats">
      <div class="stat"><small>Hardiness zone</small><strong>${c.zone}</strong><em>coldest night ≈ ${fmtT(c.extremeMin)}</em></div>
      <div class="stat"><small>Last spring frost</small><strong id="stLF">${c.frostFree ? 'Rare' : fmtDoy(c.lastFrost)}</strong><em>${c.frostFree ? 'frost-free most years' : 'median date'}</em></div>
      <div class="stat"><small>First fall frost</small><strong id="stFF">${c.frostFree ? 'Rare' : fmtDoy(c.firstFrost)}</strong><em>${c.frostFree ? 'frost-free most years' : 'median date'}</em></div>
      <div class="stat"><small>Growing season</small><strong id="stSeason">${c.season} days</strong><em>${c.frostFree ? 'no hard frost' : 'between frosts'}</em></div>
      <div class="stat"><small>Rain per year</small><strong>${fmtP(c.annualPrecip)}</strong><em>${c.estimate ? 'assumed' : 'yearly average'}</em></div>
      <div class="stat"><small>From your roof</small><strong>${fmtVol(harvestL)}</strong><em>could be caught each year</em></div>
    </div>
    ${c.frostFree ? '' : `<div class="frost-adjust">
      <div><label for="lfR">Last frost <b id="lfOut">${fmtDoy(c.lastFrost)}</b></label><input type="range" id="lfR" min="-42" max="42" step="1" value="${doyDiff(c.lastFrost, c.lf0)}"></div>
      <div><label for="ffR">First frost <b id="ffOut">${fmtDoy(c.firstFrost)}</b></label><input type="range" id="ffR" min="-42" max="42" step="1" value="${doyDiff(c.firstFrost, c.ff0)}"></div>
      <p class="fine">Cold pocket or warm wall? Drag the dates and the calendar below redraws as you go.</p></div>`}
    ${climateChart(c.monthly)}
    <h3 class="res-h">What to build first</h3>
    <ul class="recs">${recommend(c, s).map(([i, t, p]) => `<li><span class="ri">${ic(i, 19)}</span><div><h4>${t}</h4><p>${p}</p></div></li>`).join('')}</ul>
    <h3 class="res-h">Your permaculture zones</h3>
    <div class="zones-wrap">${zonesSvg()}<ul class="zones-list">${zonePlan(s.area).map(([n, t, d]) => `<li><b>Zone ${n}, ${t.toLowerCase()}:</b> ${d}</li>`).join('')}</ul></div>
    ${exploreLinks(loc)}
  `;
  $('#results').querySelectorAll('input[type=range]').forEach(fillRange);
  lastScore = score;
}

// Live frost-date scrubbing: update labels and calendar without rebuilding the panel.
function scrubFrost(input) {
  const c = S.climate; if (!c || c.frostFree) return;
  const isLast = input.id === 'lfR';
  const doy = wrapDoy((isLast ? c.lf0 : c.ff0) + +input.value);
  c[isLast ? 'lastFrost' : 'firstFrost'] = doy;
  c.season = ((c.firstFrost - c.lastFrost) % 365 + 365) % 365;
  $(isLast ? '#lfOut' : '#ffOut').textContent = fmtDoy(doy);
  $(isLast ? '#stLF' : '#stFF').textContent = fmtDoy(doy);
  $('#stSeason').textContent = c.season + ' days';
  fillRange(input);
  renderCalendar();
}

function renderCommunityLinks() { $('#communityLinks').innerHTML = exploreLinks(S.loc); }

// ───────────────────────── Planner ─────────────────────────
let selected = 'tomato', erasing = false, filter = 'all', painting = false;
let prevStatus = [], popIdx = -1, cursor = 0, hoverIdx = -1;

function renderPalette() {
  const q = $('#plSearch').value.trim().toLowerCase();
  const shadeSite = S.site.sun === 'shade';
  const list = PLANTS.filter(p =>
    (!q || p.n.toLowerCase().includes(q)) &&
    (filter === 'all' || (filter === 'shade' ? p.shade : p.roles.includes(filter))));
  $('#palette').innerHTML = list.map(p => `<button type="button" class="pl ${p.id === selected && !erasing ? 'on' : ''} ${shadeSite && !p.shade ? 'dim' : ''}" data-id="${p.id}" aria-pressed="${p.id === selected && !erasing}" title="${p.sq} per sq ft · ${p.roles.map(r => ROLES[r][1]).join(', ')}${shadeSite && !p.shade ? ' · wants more sun than your site gets' : ''}">${ico(p.id, 28)}<span>${p.n}</span></button>`).join('') || '<p class="fine">Nothing matches that. Try "bean" or "herb".</p>';
  $('#plCount').textContent = erasing ? 'Eraser on' : `Planting ${P[selected].n.toLowerCase()}`;
}
function renderFilters() {
  const f = [['all','All'],['crop','Food'],['nitrogen','Nitrogen'],['pollinator','Pollinators'],['repellent','Pest control'],['perennial','Perennials'],['shade','Shade-ok']];
  $('#plFilters').innerHTML = f.map(([k, l]) => `<button type="button" class="chip ${filter === k ? 'on' : ''}" data-f="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
}
function setEraser(on) {
  erasing = on;
  $('#eraseBtn').setAttribute('aria-pressed', String(on));
  renderPalette();
}

function neighbors(i) {
  const {w, h} = S.bed, x = i % w, y = Math.floor(i / w), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx);
  }
  return out;
}

function analyzeBed() {
  const cells = S.bed.cells, status = [], conflicts = new Map(), pairs = new Set();
  cells.forEach((id, i) => {
    if (!id) return;
    let good = false, bad = false;
    for (const j of neighbors(i)) {
      const o = cells[j]; if (!o || o === id) continue;
      if (BAD[id].has(o)) { bad = true; conflicts.set([id, o].sort().join('|'), [id, o]); }
      else if (GOOD[id].has(o)) { good = true; pairs.add([id, o].sort().join('|')); }
    }
    status[i] = bad ? 'bad' : good ? 'good' : '';
  });
  const placed = cells.filter(Boolean), species = new Set(placed);
  const roleCount = {};
  for (const r in ROLES) roleCount[r] = 0;
  for (const id of placed) for (const r of P[id].roles) roleCount[r]++;
  const rolesCovered = Object.values(roleCount).filter(Boolean).length;
  const score = placed.length ? Math.max(0, Math.min(100, Math.round(species.size * 5 + rolesCovered * 8 + pairs.size * 3 - conflicts.size * 12))) : 0;
  const plantCount = placed.reduce((a, id) => a + P[id].sq, 0);
  return {status, conflicts: [...conflicts.values()], pairs: pairs.size, species, roleCount, score, placed: placed.length, plantCount};
}


function renderBed() {
  const {w, cells} = S.bed, A = analyzeBed();
  const bed = $('#bed');
  if (cursor >= cells.length) cursor = 0;
  const icSize = Math.round((parseFloat(getComputedStyle(bed).getPropertyValue('--cell')) || 52) * .8);
  bed.style.gridTemplateColumns = `repeat(${w}, var(--cell))`;
  bed.innerHTML = cells.map((id, i) => {
    const p = P[id], st = A.status[i] || '';
    const cls = ['cell', st, st && st !== prevStatus[i] ? 'fresh' : '', i === popIdx ? 'pop' : '', i === cursor ? 'cur' : ''].filter(Boolean).join(' ');
    const where = `row ${Math.floor(i / w) + 1}, column ${i % w + 1}`;
    return `<div class="${cls}" id="cell${i}" data-i="${i}" role="gridcell" aria-label="${p ? `${p.n}, ${where}${st === 'bad' ? ', conflict' : st === 'good' ? ', has a companion' : ''}` : `Empty, ${where}`}">${p ? `${ico(id, icSize)}<small>${p.sq}</small>` : ''}</div>`;
  }).join('');
  bed.setAttribute('aria-activedescendant', 'cell' + cursor);
  prevStatus = A.status.slice(); popIdx = -1;

  $('#guildScore').textContent = A.score;
  $('#guildMeter').style.width = A.score + '%';
  $('#guildLabel').textContent = !A.placed ? 'Start planting' : A.score >= 80 ? 'Thriving guild' : A.score >= 55 ? 'Healthy mix' : A.score >= 30 ? 'Getting there' : 'Needs more variety';
  $('#roles').innerHTML = Object.entries(ROLES).map(([k, [icId, l]]) => `<li class="${A.roleCount[k] ? '' : 'zero'}"><span>${ico(icId, 22)} ${l}</span><b>${A.roleCount[k]}</b></li>`).join('') +
    `<li><span>Species</span><b>${A.species.size}</b></li><li><span>Companion pairs</span><b>${A.pairs}</b></li><li><span>Plants in the bed</span><b>${A.plantCount}</b></li>`;
  $('#issues').innerHTML = A.conflicts.length
    ? `<h4 class="issues-h">${ic('warn', 16)}${A.conflicts.length} conflict${A.conflicts.length > 1 ? 's' : ''}</h4><ul class="issues">${A.conflicts.map(([a, b]) => `<li>${ico(a, 20)} ${P[a].n} and ${ico(b, 20)} ${P[b].n.toLowerCase()} don't get along</li>`).join('')}</ul>` : '';
  $('#guildTip').innerHTML = guildTip(A);

  if (A.placed >= 10) complete('plant10');
  if (A.species.size >= 5 && !A.conflicts.length) complete('guild');
  if (hoverIdx >= 0 && !painting) showPreview(hoverIdx);
}

function guildTip(A) {
  const t = s => `<b>Next move</b>${s}`;
  if (!A.placed) return t('Not sure where to start? Pick a layout from the menu above, or borrow one from the community below.');
  if (A.conflicts.length) { const [a, b] = A.conflicts[0]; return t(`Move ${P[a].n.toLowerCase()} at least 2 ft from ${P[b].n.toLowerCase()}, or put a neutral plant like marigold or borage between them.`); }
  if (!A.roleCount.nitrogen) return t('Add a nitrogen fixer (beans, peas or clover) to feed the heavy eaters for free.');
  if (!A.roleCount.pollinator) return t('Add borage, dill or sunflowers to bring in pollinators and the insects that eat aphids.');
  if (!A.roleCount.repellent) return t('Marigolds, nasturtiums and alliums confuse pests. Tuck a few along the edges.');
  if (!A.roleCount.accumulator) return t('Comfrey or yarrow pull minerals up from deep down. Cut them and drop them as mulch.');
  return t('This is a solid guild. Share it, or put the planting dates in your calendar.');
}

let savedTimer;
function persist() {
  save();
  const n = $('#savedNote'); if (!n) return;
  n.classList.add('flash'); clearTimeout(savedTimer); savedTimer = setTimeout(() => n.classList.remove('flash'), 700);
}

function paint(i, forceErase = false) {
  const v = erasing || forceErase ? null : selected;
  if (S.bed.cells[i] === v) return;
  S.bed.cells[i] = v; popIdx = v ? i : -1;
  persist(); renderBed(); renderCalendar();
}

function resizeFrom(old, w, h) {
  w = Math.max(1, Math.min(16, w | 0)); h = Math.max(1, Math.min(24, h | 0));
  const cells = Array(w * h).fill(null);
  for (let y = 0; y < Math.min(h, old.h); y++) for (let x = 0; x < Math.min(w, old.w); x++) cells[y * w + x] = old.cells[y * old.w + x];
  S.bed = {w, h, cells};
  $('#bedW').value = w; $('#bedH').value = h;
  renderBed(); renderCalendar();
}
function resizeBed(w, h) { resizeFrom(S.bed, w, h); persist(); }

function loadTemplate(t, isRemix) {
  const h = t.rows.length, w = t.rows[0].length;
  const before = {...S.bed, cells: S.bed.cells.slice()};
  S.bed = {w, h, cells: t.rows.join('').split('').map(k => BYKEY[k] || null)};
  persist();
  $('#bedW').value = w; $('#bedH').value = h;
  renderBed(); renderCalendar();
  if (isRemix) complete('remix');
  if (isRemix !== undefined) {
    toast(`Loaded "${t.name}". Make it yours.`, before.cells.some(Boolean) ? {label: 'Undo', fn: () => { S.bed = before; persist(); $('#bedW').value = before.w; $('#bedH').value = before.h; renderBed(); renderCalendar(); }} : null);
    document.getElementById('planner').scrollIntoView({behavior: reducedMotion() ? 'auto' : 'smooth'});
  }
}

// Hover preview: ghost of the selected plant plus companion / conflict rings on its neighbours.
function clearPreview() {
  document.querySelectorAll('#bed .pv-good, #bed .pv-bad, #bed .erase-pv').forEach(c => c.classList.remove('pv-good', 'pv-bad', 'erase-pv'));
  document.querySelectorAll('#bed .ghost').forEach(g => g.remove());
  $('#hoverTip').hidden = true;
}
function showPreview(i) {
  clearPreview();
  const bed = $('#bed'), cell = bed.children[i];
  if (!cell) return;
  const cur = S.bed.cells[i];
  let html;
  if (erasing) {
    if (!cur) return;
    cell.classList.add('erase-pv');
    html = `Clear the <b>${P[cur].n.toLowerCase()}</b>`;
  } else {
    const p = P[selected], friends = new Set(), foes = new Set();
    for (const j of neighbors(i)) {
      const o = S.bed.cells[j]; if (!o || o === selected) continue;
      if (BAD[selected].has(o)) { foes.add(o); bed.children[j].classList.add('pv-bad'); }
      else if (GOOD[selected].has(o)) { friends.add(o); bed.children[j].classList.add('pv-good'); }
    }
    if (cur === selected) html = `<b>${p.n}</b>, ${p.sq} per square foot`;
    else {
      if (!cur) cell.insertAdjacentHTML('afterbegin', ico(selected, Math.round(cell.offsetWidth * .8), 'ghost'));
      const names = s => [...s].map(id => P[id].n.toLowerCase()).join(', ');
      html = `<b>${p.n}</b> ${cur ? `replaces ${P[cur].n.toLowerCase()}` : 'here'}` +
        (friends.size ? `<br><span class="g">Good next to ${names(friends)}</span>` : '') +
        (foes.size ? `<br><span class="r">Clashes with ${names(foes)}</span>` : '') +
        (!friends.size && !foes.size ? '<br><span class="fine">No neighbours it cares about</span>' : '');
    }
  }
  const tip = $('#hoverTip'), stage = tip.parentElement.getBoundingClientRect(), r = cell.getBoundingClientRect();
  tip.innerHTML = html; tip.hidden = false;
  const tw = tip.offsetWidth;
  const left = Math.max(4, Math.min(stage.width - tw - 4, r.left - stage.left + r.width / 2 - tw / 2));
  let top = r.top - stage.top - tip.offsetHeight - 8;
  if (top < 0) top = r.bottom - stage.top + 8;
  tip.style.left = left + 'px'; tip.style.top = top + 'px';
}
function moveCursor(i) {
  const bed = $('#bed');
  bed.children[cursor]?.classList.remove('cur');
  cursor = i; bed.children[cursor]?.classList.add('cur');
  bed.setAttribute('aria-activedescendant', 'cell' + cursor);
  showPreview(cursor);
}

// ───────────────────────── Calendar ─────────────────────────
// Returns [{type, a, b}] windows in day-of-year (b may exceed 365 → wraps).
function plantWindows(p, {lf, ff}) {
  const wk = (anchor, [x, y]) => [anchor + x * 7, anchor + y * 7];
  const W = [];
  const isCrop = p.roles.includes('crop');
  if (p.fallPlant) {
    const [a, b] = wk(ff, p.fallPlant);
    W.push({type: 'fall', a, b});
    W.push({type: 'harvest', a: lf + 70 + 365, b: lf + 100 + 365});
    return W;
  }
  let start = null;
  if (p.indoor) { const [a, b] = wk(lf, p.indoor); W.push({type: 'indoor', a, b}); }
  if (p.out) { const [a, b] = wk(lf, p.out); W.push({type: 'out', a, b}); start = a; }
  if (p.sow) { const [a, b] = wk(lf, p.sow); W.push({type: 'sow', a, b}); start ??= a; }
  if (start != null) {
    const hs = start + p.dtm;
    let he = isCrop ? hs + (p.hw || 6) * 7 : (ff > lf ? ff : ff + 365) + (p.hardy ? 21 : 0);
    if (isCrop && !p.hardy) he = Math.min(he, ff > lf ? ff : ff + 365);
    if (he > hs + 6) W.push({type: isCrop ? 'harvest' : 'bloom', a: hs, b: he});
  }
  if (p.fall) {
    const [a, b] = wk(ff, p.fall);
    W.push({type: 'fall', a, b});
    W.push({type: 'harvest', a: a + p.dtm, b: a + p.dtm + (p.hw || 4) * 7});
  }
  return W;
}

const VERB = {indoor: 'Start seeds indoors', out: 'Transplant outside', sow: 'Direct sow', fall: 'Fall planting', harvest: 'Harvest', bloom: 'Flowering'};

function calPlants() {
  const ids = [...new Set(S.bed.cells.filter(Boolean))];
  return (ids.length ? ids : ['tomato', 'lettuce', 'beans', 'garlic']).map(id => P[id]);
}

function segHtml(w) {
  const len = Math.max(4, w.b - w.a), a = wrapDoy(w.a), parts = [];
  if (a + len - 1 > 365) { parts.push([a, 365]); parts.push([1, a + len - 366]); } else parts.push([a, a + len - 1]);
  return parts.map(([x, y]) => `<div class="seg ${w.type}" style="left:${(x - 1) / 365 * 100}%;width:${(y - x + 1) / 365 * 100}%" title="${VERB[w.type]}: ${fmtDoy(wrapDoy(w.a))} – ${fmtDoy(wrapDoy(w.a + len))}"></div>`).join('');
}


function renderCalendar() {
  const an = anchors(), td = todayDoy();
  const list = calPlants();
  const nowM = new Date().getMonth();
  const marks = `<div class="today" style="left:${(td - 1) / 365 * 100}%"></div>` +
    (an.ff_free ? '' : `<div class="frostline" style="left:${(an.lf - 1) / 365 * 100}%" title="Last frost ≈ ${fmtDoy(an.lf)}"></div><div class="frostline" style="left:${(an.ff - 1) / 365 * 100}%" title="First frost ≈ ${fmtDoy(an.ff)}"></div>`);
  $('#calGrid').innerHTML = `<div class="cal-head"><div></div><div class="months" style="position:relative">${MONTHS.map((m, i) => `<span class="${i === nowM ? 'now' : ''}">${m}</span>`).join('')}</div></div>` +
    list.map(p => `<div class="cal-row"><div class="nm">${ico(p.id, 30)} ${p.n}</div><div class="track">${marks}${plantWindows(p, an).map(segHtml).join('')}</div></div>`).join('');
  $('#calLead').textContent = S.climate && S.loc
    ? `Timed to ${S.loc.name.split(',')[0]}: ${an.ff_free ? 'frost is rare, so windows follow the cool and warm seasons' : `last frost around ${fmtDoy(an.lf)}, first frost around ${fmtDoy(an.ff)}`}. ${S.bed.cells.some(Boolean) ? 'These are the plants in your bed.' : 'Add plants to your bed to see their windows.'}`
    : 'Built from the plants in your bed and your frost dates. Until you run a site check, it uses a typical zone 7 garden.';
  renderTasks(list, an, td);
}

function renderTasks(list, an, td) {
  const tasks = [];
  for (const p of list) for (const w of plantWindows(p, an)) {
    if (w.type === 'bloom') continue;
    const len = w.b - w.a, a = wrapDoy(w.a);
    const end = a + len;
    // Active now, or opening within the next 14 days (handles year wrap)
    const active = (td >= a && td <= end) || (td + 365 >= a && td + 365 <= end);
    const soon = !active && ((a - td + 365) % 365) <= 14;
    if (active || soon) tasks.push({key: `${p.id}-${w.type}-${a}`, text: `${ico(p.id, 24)} ${VERB[w.type]}: ${p.n.toLowerCase()}`, note: active ? `until ${fmtDoy(wrapDoy(end))}` : `opens ${fmtDoy(a)}`, active});
  }
  tasks.sort((x, y) => y.active - x.active);
  $('#tasks').innerHTML = tasks.length
    ? tasks.map(t => `<li class="${S.done[t.key] ? 'done' : ''}"><label><input type="checkbox" data-k="${t.key}" ${S.done[t.key] ? 'checked' : ''}><span class="tt">${t.text}</span><span class="when ${t.active ? 'open' : ''}">${t.note}</span></label></li>`).join('')
    : '<li><span class="fine">Nothing is due in the next two weeks. Good time to turn the compost, top up mulch and plan the next bed.</span></li>';
}

function exportIcs() {
  const an = anchors(), now = new Date(), y = now.getFullYear(), td = todayDoy();
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  const stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Common Ground//Plan//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:My garden (Common Ground)'];
  let n = 0;
  for (const p of calPlants()) for (const w of plantWindows(p, an)) {
    if (w.type === 'bloom') continue;
    const len = Math.max(1, Math.round(w.b - w.a));
    const a = wrapDoy(w.a);
    // Schedule the next upcoming occurrence of the window
    const yr = a + len < td ? y + 1 : y;
    const start = doyDate(a, yr), end = new Date(start.getTime() + (len + 1) * DAY);
    lines.push('BEGIN:VEVENT', `UID:${p.id}-${w.type}-${yr}-${n++}@commonground-plan`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fmt(start)}`, `DTEND;VALUE=DATE:${fmt(end)}`,
      `SUMMARY:${VERB[w.type]}: ${p.n}`, `DESCRIPTION:From your Common Ground plan. ${baseUrl()}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${VERB[w.type]}: ${p.n}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], {type: 'text/calendar'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'garden-calendar.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  complete('ics');
}

// ───────────────────────── Sharing & growth ─────────────────────────
function encodePlan() {
  const o = {l: S.loc, s: S.site, w: S.bed.w, h: S.bed.h, c: S.bed.cells.map(id => id ? P[id].k : '.').join('')};
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
function decodePlan(str) {
  const o = JSON.parse(decodeURIComponent(escape(atob(str))));
  const cells = o.c.split('').map(k => BYKEY[k] || null);
  if (cells.length !== o.w * o.h) throw new Error('bad plan');
  return {loc: o.l, site: o.s, bed: {w: o.w, h: o.h, cells}};
}
const planUrl = () => `${baseUrl()}#p=${encodeURIComponent(encodePlan())}`;

async function sharePlan() {
  const url = planUrl();
  const text = `My garden plan${S.loc ? ' for ' + S.loc.name.split(',')[0] : ''}. Open it to see the bed and planting dates.`;
  if (navigator.share) { try { await navigator.share({title: 'My garden plan', text, url}); complete('share'); return; } catch {} }
  await copyText(url); complete('share');
}

function renderShare() {
  const embedSrc = `${baseUrl()}?embed=frost`;
  $('#embedCode').value = `<iframe src="${embedSrc}" width="380" height="360" style="border:0;border-radius:12px" title="Frost-date finder from Common Ground" loading="lazy"></iframe>`;
  $('#previewEmbed').href = embedSrc;
}

// ───────────────────────── Progress ─────────────────────────
const doneCount = () => QUESTS.filter(q => S.quests[q.id]).length;
const levelOf = n => { let i = 0; while (i < LEVELS.length - 1 && n >= LEVELS[i + 1][0]) i++; return i; };
function renderProgress() {
  const n = doneCount(), li = levelOf(n), name = LEVELS[li][1], next = LEVELS[li + 1];
  $('#stageIco').innerHTML = stageSvg(li, 20); $('#stageName').textContent = name; $('#stageCount').textContent = `${n} of ${QUESTS.length}`;
  $('#lvIco').innerHTML = stageSvg(li, 38); $('#lvName').textContent = name;
  $('#lvNext').textContent = next ? `${n} of ${QUESTS.length} done. ${next[0] - n} more and it's a ${next[1].toLowerCase()}.` : `All ${QUESTS.length} done. Your plot is in full swing.`;
  $('#quests').innerHTML = QUESTS.map(q => `<li class="${S.quests[q.id] ? 'done' : ''}"><span class="qc">${ic('check', 13, 2.4)}</span><a class="q" href="${q.href}">${q.label}</a></li>`).join('');
  const stepDone = {check: S.quests.check, planner: S.quests.plant10, calendar: S.quests.ics, community: S.quests.remix || S.quests.share};
  document.querySelectorAll('.tabs a[data-step]').forEach(a => a.classList.toggle('done', !!stepDone[a.dataset.step]));
}
function complete(id) {
  if (S.quests[id]) return;
  const q = QUESTS.find(q => q.id === id); if (!q) return;
  const before = levelOf(doneCount());
  S.quests[id] = Date.now(); save();
  const after = levelOf(doneCount());
  toast(`Checked off: ${q.label.toLowerCase()}`);
  if (after > before) setTimeout(() => toast(`Your plot grew. It's a ${LEVELS[after][1].toLowerCase()} now.`), 900);
  renderProgress();
}

function renderGallery() {
  $('#gallery').innerHTML = TEMPLATES.map(t => {
    const w = t.rows[0].length, liked = S.liked[t.id];
    return `<div class="panel gcard">
      <h3>${t.name}</h3>
      <div class="tag">${t.tag}</div>
      <div class="mini" style="grid-template-columns:repeat(${w},26px)" aria-hidden="true">${t.rows.join('').split('').map(k => `<div>${BYKEY[k] ? ico(BYKEY[k], 24) : ''}</div>`).join('')}</div>
      <p>${t.desc}</p>
      <div class="gmeta"><button type="button" class="like ${liked ? 'on' : ''}" data-like="${t.id}" aria-pressed="${!!liked}">${ic('heart', 17)}${liked ? 'Kept' : 'Keep'}</button>
        <button type="button" class="btn ghost sm" data-remix="${t.id}">${ic('remix', 15)}Use this layout</button></div>
    </div>`;
  }).join('');
}

// ───────────────────────── Location search wiring ─────────────────────────
function wireSearch(input, box, onPick) {
  let timer, results = [], idx = -1;
  const show = () => {
    box.hidden = !results.length;
    box.innerHTML = results.map((r, i) => `<button type="button" class="${i === idx ? 'on' : ''}" data-i="${i}">${ic('pin', 16)}${esc(r.name)}</button>`).join('');
  };
  input.addEventListener('input', () => {
    clearTimeout(timer); pickedLoc = null;
    const q = input.value.trim();
    if (q.length < 2) { results = []; show(); return; }
    timer = setTimeout(async () => { try { results = await geocode(q); idx = -1; show(); } catch { results = []; show(); } }, 280);
  });
  input.addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { idx = Math.min(results.length - 1, idx + 1); show(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); show(); e.preventDefault(); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(results[idx]); }
    else if (e.key === 'Escape') { results = []; show(); }
  });
  box.addEventListener('mousedown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); pick(results[+b.dataset.i]); } });
  input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
  function pick(r) { pickedLoc = r; input.value = r.name; results = []; show(); onPick && onPick(r); }
}

async function resolveLoc(text) {
  if (pickedLoc && pickedLoc.name === text) return pickedLoc;
  if (S.loc && S.loc.name === text) return S.loc;
  const r = await geocode(text);
  if (!r.length) throw new Error('not found');
  return r[0];
}

// ───────────────────────── Embed mode ─────────────────────────
function initEmbed() {
  document.body.classList.add('embed-mode');
  $('#embed').hidden = false;
  $('#embedCta').href = baseUrl();
  $('#embedForm').addEventListener('submit', async e => {
    e.preventDefault();
    const q = $('#embedLoc').value.trim(); if (!q) return;
    const out = $('#embedOut');
    out.innerHTML = '<div class="loading" style="min-height:80px">Looking it up…</div>';
    try {
      const loc = (await geocode(q))[0];
      if (!loc) throw new Error('not found');
      let c; try { c = await fetchClimate(loc.lat, loc.lon); } catch { c = estimateClimate(loc.lat); }
      out.innerHTML = `<b>${esc(loc.name)}</b><div class="stats">
        <div class="stat"><small>Zone</small><strong>${c.zone}</strong></div>
        <div class="stat"><small>Season</small><strong>${c.season} days</strong></div>
        <div class="stat"><small>Last frost</small><strong>${c.frostFree ? 'Rare' : fmtDoy(c.lastFrost)}</strong></div>
        <div class="stat"><small>First frost</small><strong>${c.frostFree ? 'Rare' : fmtDoy(c.firstFrost)}</strong></div></div>`;
    } catch { out.textContent = 'We couldn\'t find that place. Try a nearby city.'; }
  });
}

// ───────────────────────── Page chrome ─────────────────────────
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function fillIcons(root = document) {
  root.querySelectorAll('i[data-ic]').forEach(el => { el.innerHTML = ic(el.dataset.ic, +(el.dataset.s || 16)); });
}
// Keep the sub-nav tucked under the shared hub bar, whatever height it renders at.
function trackHubBar() {
  const bar = document.querySelector('header.hub-bar');
  if (!bar) return;
  const set = () => document.documentElement.style.setProperty('--hub-h', bar.offsetHeight + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(bar);
}
// Highlight the sub-nav step whose section is in view.
function watchSections() {
  const ids = ['check', 'planner', 'calendar', 'community'];
  const tabs = Object.fromEntries(ids.map(id => [id, document.querySelector(`.tabs a[data-step="${id}"]`)]));
  const pick = () => {
    const line = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hub-h')) + 58 + 120;
    let cur = null;
    for (const id of ids) if (document.getElementById(id).getBoundingClientRect().top <= line) cur = id;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = ids.at(-1);
    for (const id of ids) {
      const on = id === cur;
      tabs[id].classList.toggle('on', on);
      if (on) { tabs[id].setAttribute('aria-current', 'step'); const box = tabs[id].parentElement; if (box.scrollWidth > box.clientWidth) box.scrollTo({left: tabs[id].offsetLeft - 16, behavior: 'auto'}); }
      else tabs[id].removeAttribute('aria-current');
    }
  };
  const io = new IntersectionObserver(pick, {threshold: [0, .25, .5, .75, 1], rootMargin: '-120px 0px -40% 0px'});
  ids.forEach(id => io.observe(document.getElementById(id)));
  addEventListener('scroll', pick, {passive: true});
  pick();
  return pick;
}

// ───────────────────────── Init ─────────────────────────
function init() {
  fillIcons();
  const params = new URLSearchParams(location.search);
  if (params.get('embed') === 'frost') { initEmbed(); return; }
  trackHubBar();

  // Shared plan in URL hash
  if (location.hash.startsWith('#p=')) {
    try {
      const plan = decodePlan(decodeURIComponent(location.hash.slice(3)));
      Object.assign(S, plan); S.climate = null; save();
      const b = $('#sharedBanner'); b.hidden = false;
      b.innerHTML = `You're looking at a shared plan${plan.loc ? ' for <b>' + esc(plan.loc.name) + '</b>' : ''}. It's in your planner now, so change anything you like.`;
      history.replaceState(null, '', location.pathname + location.search + '#planner');
      if (plan.loc) runCheck(plan.loc);
    } catch (e) { console.warn('Bad shared plan', e); }
  }

  // Page head sample bed: click to load a full layout into the planner
  $('#heroBed').innerHTML = 'TbTQOMIbTVTCLLOM'.split('').map(k => `<span>${ico(BYKEY[k], 34)}</span>`).join('');
  $('#sampleBed').addEventListener('click', () => loadTemplate(TEMPLATES.find(t => t.id === 'salsa'), false));

  // Site form
  buildSegs();
  writeSite();
  wireSearch($('#loc'), $('#locSuggest'));
  $('#siteForm').addEventListener('submit', async e => {
    e.preventDefault(); readSite(); save();
    const q = $('#loc').value.trim();
    if (!q) { toast('Type a neighbourhood or city first'); $('#loc').focus(); return; }
    cameFromExplore = false;
    try { await runCheck(await resolveLoc(q)); } catch { toast('We couldn\'t find that place. Try a nearby city.'); }
  });
  ['slope', 'sun', 'soil', 'water'].forEach(id => $('#' + id).addEventListener('change', () => { readSite(); save(); syncSegs(); renderResults(); renderPalette(); }));
  ['area', 'roof'].forEach(id => $('#' + id).addEventListener('change', () => { readSite(); save(); syncRanges(); renderResults(); }));
  let liveRaf;
  const live = (id, toM2) => $('#' + id + 'R').addEventListener('input', e => {
    const m2 = toM2(+e.target.value), k = imp() ? M2FT : 1;
    S.site[id] = m2; $('#' + id).value = niceNum(m2 * k); fillRange(e.target);
    cancelAnimationFrame(liveRaf); liveRaf = requestAnimationFrame(() => { renderResults(); save(); });
  });
  live('area', sliderToArea); live('roof', sliderToRoof);
  $('#geoBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('This browser can\'t share its location');
    navigator.geolocation.getCurrentPosition(
      p => { readSite(); cameFromExplore = false; runCheck({name: `My spot (${p.coords.latitude.toFixed(2)}, ${p.coords.longitude.toFixed(2)})`, lat: p.coords.latitude, lon: p.coords.longitude}); },
      () => toast('Location permission was denied'));
  });

  // Results panel (delegated: units toggle, frost sliders)
  $('#results').addEventListener('click', e => {
    const u = e.target.closest('[data-u]');
    if (u) { readSite(); S.units = u.dataset.u; save(); writeSite(); renderResults(); }
  });
  $('#results').addEventListener('input', e => { if (e.target.id === 'lfR' || e.target.id === 'ffR') scrubFrost(e.target); });
  $('#results').addEventListener('change', e => { if (e.target.id === 'lfR' || e.target.id === 'ffR') save(); });

  // Planner
  renderFilters(); renderPalette();
  $('#bedW').value = S.bed.w; $('#bedH').value = S.bed.h;
  $('#template').innerHTML += TEMPLATES.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  $('#template').addEventListener('change', e => { const t = TEMPLATES.find(t => t.id === e.target.value); if (t) loadTemplate(t); e.target.value = ''; });
  $('#plSearch').addEventListener('input', renderPalette);
  $('#plFilters').addEventListener('click', e => { const c = e.target.closest('[data-f]'); if (c) { filter = c.dataset.f; renderFilters(); renderPalette(); } });
  $('#palette').addEventListener('click', e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    selected = b.dataset.id; setEraser(false);
  });
  $('#eraseBtn').addEventListener('click', () => setEraser(!erasing));
  $('#clearBtn').addEventListener('click', () => {
    if (!S.bed.cells.some(Boolean)) return toast('The bed is already empty');
    const before = S.bed.cells.slice();
    S.bed.cells = S.bed.cells.map(() => null); persist(); renderBed(); renderCalendar();
    toast('Bed cleared', {label: 'Undo', fn: () => { S.bed.cells = before; persist(); renderBed(); renderCalendar(); }});
  });
  $('#bedW').addEventListener('change', () => resizeBed(+$('#bedW').value, S.bed.h));
  $('#bedH').addEventListener('change', () => resizeBed(S.bed.w, +$('#bedH').value));
  document.querySelector('.size').addEventListener('click', e => {
    const b = e.target.closest('.step-btn'); if (!b) return;
    const d = +b.dataset.d;
    b.dataset.dim === 'w' ? resizeBed(S.bed.w + d, S.bed.h) : resizeBed(S.bed.w, S.bed.h + d);
  });
  $('#printBtn').addEventListener('click', () => window.print());

  const bed = $('#bed');
  bed.addEventListener('pointerdown', e => {
    const c = e.target.closest('.cell'); if (!c) return;
    e.preventDefault(); painting = true; clearPreview();
    if (e.target.hasPointerCapture?.(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
    cursor = +c.dataset.i;
    paint(+c.dataset.i, e.button === 2);
  });
  bed.addEventListener('pointerover', e => {
    const c = e.target.closest('.cell'); if (!c) return;
    const i = +c.dataset.i;
    if (painting) { paint(i, e.buttons === 2); return; }
    if (e.pointerType === 'mouse' && i !== hoverIdx) { hoverIdx = i; showPreview(i); }
  });
  bed.addEventListener('pointerleave', () => { hoverIdx = -1; clearPreview(); });
  bed.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('pointerup', () => { if (painting) { painting = false; if (hoverIdx >= 0) showPreview(hoverIdx); } });
  bed.addEventListener('focus', () => { if (!bed.matches(':focus-visible')) return; moveCursor(Math.min(cursor, S.bed.cells.length - 1)); });
  bed.addEventListener('blur', () => clearPreview());
  bed.addEventListener('keydown', e => {
    const {w, h} = S.bed, x = cursor % w, y = Math.floor(cursor / w);
    const moves = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key], nx = Math.max(0, Math.min(w - 1, x + dx)), ny = Math.max(0, Math.min(h - 1, y + dy));
      moveCursor(ny * w + nx);
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); paint(cursor); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); paint(cursor, true); }
  });

  // Drag the corner handle to resize the bed, snapping to whole feet.
  const grip = $('#bedResize');
  let drag = null;
  grip.addEventListener('pointerdown', e => {
    e.preventDefault(); try { grip.setPointerCapture(e.pointerId); } catch {} clearPreview();
    const cell = bed.querySelector('.cell');
    drag = {x: e.clientX, y: e.clientY, w: S.bed.w, h: S.bed.h, pitch: (cell ? cell.offsetWidth : 52) + 3, snap: {...S.bed, cells: S.bed.cells.slice()}};
    grip.classList.add('drag');
    grip.parentElement.insertAdjacentHTML('beforeend', `<span class="size-badge">${S.bed.w} × ${S.bed.h} ft</span>`);
  });
  grip.addEventListener('pointermove', e => {
    if (!drag) return;
    const nw = Math.max(1, Math.min(16, drag.w + Math.round((e.clientX - drag.x) / drag.pitch)));
    const nh = Math.max(1, Math.min(24, drag.h + Math.round((e.clientY - drag.y) / drag.pitch)));
    if (nw !== S.bed.w || nh !== S.bed.h) { resizeFrom(drag.snap, nw, nh); document.querySelector('.size-badge').textContent = `${nw} × ${nh} ft`; }
  });
  const endDrag = () => { if (!drag) return; drag = null; grip.classList.remove('drag'); document.querySelector('.size-badge')?.remove(); persist(); };
  grip.addEventListener('pointerup', endDrag); grip.addEventListener('pointercancel', endDrag);
  grip.addEventListener('keydown', e => {
    const d = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[e.key];
    if (d) { e.preventDefault(); resizeBed(S.bed.w + d[0], S.bed.h + d[1]); }
  });

  // Calendar
  $('#icsBtn').addEventListener('click', exportIcs);
  $('#tasks').addEventListener('change', e => { const k = e.target.dataset.k; if (!k) return; S.done[k] = e.target.checked; save(); e.target.closest('li').classList.toggle('done', e.target.checked); });

  // Community
  renderCommunityLinks();
  renderShare();
  $('#sharePlan').addEventListener('click', sharePlan);
  $('#copyPlan').addEventListener('click', () => { copyText(planUrl()); complete('share'); });
  $('#copyEmbed').addEventListener('click', () => copyText($('#embedCode').value));
  renderGallery();
  $('#gallery').addEventListener('click', e => {
    const r = e.target.closest('[data-remix]');
    if (r) return loadTemplate(TEMPLATES.find(t => t.id === r.dataset.remix), true);
    const l = e.target.closest('[data-like]');
    if (l) { S.liked[l.dataset.like] = !S.liked[l.dataset.like]; save(); renderGallery(); }
  });

  renderBed(); renderCalendar(); renderProgress();
  const pickSection = watchSections();

  // Deep link from Explore: /plan/?lat=37.80&lon=-122.27&place=West%20Oakland#check
  const lat = parseFloat(params.get('lat')), lon = parseFloat(params.get('lon'));
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    const place = (params.get('place') || '').trim().slice(0, 80);
    const loc = {name: place || `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon};
    cameFromExplore = true;
    // Consume the params so a reload shows the saved result instead of re-running.
    ['lat', 'lon', 'place'].forEach(k => params.delete(k));
    const qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + (location.hash || '#check'));
    readSite(); pickedLoc = loc;
    runCheck(loc);
  } else if (S.climate && S.loc) renderResults();

  // The hub bar mounts after the browser's first anchor jump; settle on the target section again.
  const target = location.hash.slice(1);
  if (/^(check|planner|calendar|community|faq|progress)$/.test(target)) requestAnimationFrame(() => { document.getElementById(target).scrollIntoView({behavior: 'auto'}); pickSection(); });
}
init();

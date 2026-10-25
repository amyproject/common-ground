// Mycelium engine core: shared namespace, vocabularies, date and text helpers.
// Classic script (file:// can't load ES modules); also loadable from Node.
(function (root) {
  'use strict';
  const MY = (root.MY = root.MY || {});

  // Volunteer stages are earned by showing up, not by signing up.
  MY.VOL_STAGES = [
    ['signed-up', 'Signed up'],
    ['welcomed', 'Welcomed'],
    ['first', 'First visit'],
    ['returning', 'Returning'],
    ['regular', 'Regular'],
    ['crew-lead', 'Crew lead'],
  ];

  MY.SITE_STAGES = [
    ['identified', 'Identified'],
    ['researched', 'Researched'],
    ['intro', 'Intro made'],
    ['conversation', 'First conversation'],
    ['site-walk', 'Site walk'],
    ['agreement', 'Agreement'],
    ['active', 'Active project'],
    ['steward-led', 'Steward-led'],
  ];
  MY.SITE_CLOSED = [['paused', 'Paused'], ['declined', 'Not now']];

  MY.SITE_TYPES = [
    ['faith', 'Faith community'],
    ['school', 'School'],
    ['library', 'Library'],
    ['community-center', 'Community center'],
    ['housing', 'Housing / co-op'],
    ['vacant-lot', 'Vacant lot'],
    ['garden', 'Existing garden'],
    ['business', 'Business'],
    ['public', 'Public agency land'],
  ];

  MY.PARTNER_STAGES = [
    ['aware', 'Aware of each other'],
    ['connected', 'Connected'],
    ['co-hosted', 'Co-hosted'],
    ['sharing', 'Sharing resources'],
    ['coalition', 'Coalition'],
  ];

  MY.TAGS = ['compost', 'mulch', 'seeds', 'plants', 'tools', 'water', 'irrigation', 'carpentry', 'design',
    'teaching', 'labor', 'space', 'food', 'outreach', 'social-media', 'translation', 'childcare', 'transport', 'land'];

  MY.CHANNELS = [['email', 'Email'], ['sms', 'Text'], ['whatsapp', 'WhatsApp'], ['signal', 'Signal']];

  MY.POLICIES = [
    'A person reviews and sends every message from their own account. Nothing is sent automatically.',
    'Only contact people on channels they agreed to. No consented channel means say hello in person.',
    'Volunteer details never appear in the public share. Private homes and gardens show a neighborhood, never an address.',
    'No promises the Guild or a site hasn\'t made: no guaranteed access, real-time availability, or emergency services.',
    'Sites get a fit score. People don\'t: volunteers are neighbors, not leads.',
    'Crawled or AI-found candidates wait in a review queue. Nothing is added without a person checking the source.',
  ];

  MY.label = (list, id) => (list.find((x) => x[0] === id) || [id, id])[1];

  MY.esc = function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  };

  MY.clone = (o) => JSON.parse(JSON.stringify(o));

  let counter = 0;
  MY.uid = (prefix) => `${prefix || 'id'}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  // ---------- dates: ISO yyyy-mm-dd, compared as UTC days ----------
  const pad = (n) => String(n).padStart(2, '0');
  MY.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  MY.today = (now) => (typeof now === 'string' ? now.slice(0, 10) : MY.iso(now || new Date()));
  const dayNum = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
  MY.daysBetween = (a, b) => dayNum(b) - dayNum(a);
  MY.addDays = (iso, n) => {
    const d = new Date((dayNum(iso) + n) * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  };
  MY.weekday = (iso) => new Date(dayNum(iso) * 86400000).getUTCDay(); // 0 = Sunday
  MY.nextWeekday = (iso, wd, minAhead) => {
    let d = MY.addDays(iso, minAhead || 0);
    while (MY.weekday(d) !== wd) d = MY.addDays(d, 1);
    return d;
  };
  // Guild meets the 2nd Monday of each month.
  MY.nextSecondMonday = (iso) => {
    for (let m = 0; m < 3; m++) {
      const first = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1 + m, 1));
      const f = `${first.getUTCFullYear()}-${pad(first.getUTCMonth() + 1)}-01`;
      const d = MY.addDays(MY.nextWeekday(f, 1), 7);
      if (d >= iso) return d;
    }
    return null;
  };
  MY.fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(dayNum(iso) * 86400000);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  // ---------- text ----------
  MY.normTag = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, '-');
  MY.tagList = (v) => (Array.isArray(v) ? v : String(v || '').split(/[,;|]/)).map(MY.normTag).filter(Boolean);
  MY.overlap = (a, b) => {
    const s = new Set((b || []).map(MY.normTag));
    return (a || []).map(MY.normTag).filter((x) => s.has(x));
  };
  MY.firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';

  if (typeof module !== 'undefined' && module.exports) module.exports = MY;
})(typeof globalThis !== 'undefined' ? globalThis : this);

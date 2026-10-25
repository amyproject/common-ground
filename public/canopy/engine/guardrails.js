// Trust checks on every outreach draft, generated or edited.
// `block` findings disable the Copy button; `warn` asks for a human look.
(function (root) {
  'use strict';
  const MY = root.MY;

  const ADDRESS_RE = /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Way|Ct|Court|Dr|Drive|Ln|Lane|Pl|Place)\b\.?/g;

  const RULES = [
    {
      rule: 'promise', severity: 'block',
      re: /\bguarantee(?:d|s)?\b|\bemergency (?:shelter|services?|response|supplies)\b|\b(?:always|24\/7) open\b|\bopen 24\/7\b|\breal[- ]time availability\b|\bwe(?:'ll| will) (?:keep you safe|provide (?:food|shelter))\b/i,
      fix: 'Don\'t promise access, availability, or emergency help the Guild or the site hasn\'t confirmed. Describe what people can do and point to official alerts for emergencies.',
    },
    {
      rule: 'hardship-disclosure', severity: 'block',
      re: /\b(?:tell|share|describe|explain)\s+(?:us\s+)?(?:about\s+)?(?:your|the)\s+(?:\w+\s+)?(?:trauma|struggles?|hardships?|income|immigration status)\b|\b(?:prove|show us)\s+(?:your\s+)?(?:need|income|hardship)\b/i,
      fix: 'Never ask people to disclose hardship, income, or status to take part. Ask what they want to grow or learn.',
    },
    {
      rule: 'pressure', severity: 'warn',
      re: /\b(?:last chance|act now|don'?t miss out|only \d+ spots? left|you must|mandatory|urgent!)\b/i,
      fix: 'The Guild invites, it doesn\'t pressure. Say when and why it matters, and that it\'s fine to skip.',
    },
    {
      rule: 'consent', severity: 'warn',
      test: (t) => /\b(?:photos?|videos?|stor(?:y|ies)|testimonials?|portraits?)\b/i.test(t) &&
        !/\b(?:permission|consent|opt[- ]in|only if you(?:'re| are)? (?:ok|comfortable|want)|you decide|ask first)\b/i.test(t),
      fix: 'Photos and stories need a clear yes. Say you\'ll ask first and that people can say no.',
    },
    {
      rule: 'jargon', severity: 'warn',
      re: /\b(?:hugelkultur|swales?|polycultures?|zone (?:0|1|2|3|4|5)|chop[- ]and[- ]drop|keyline|biochar|sheet mulch(?:ing)?)\b/i,
      fix: 'Most newcomers haven\'t met this word. Explain it in a few plain words, or say "you\'ll learn this on the day".',
    },
  ];

  // publicAddresses: addresses already public (e.g. a venue's posted address) that are fine to include.
  MY.checkCopy = function checkCopy(text, opts) {
    const t = String(text || '');
    const allowed = new Set(((opts && opts.publicAddresses) || []).map((a) => a.toLowerCase().replace(/\W+/g, '')));
    const findings = [];
    RULES.forEach((r) => {
      const hit = r.re ? t.match(r.re) : (r.test(t) ? [t.slice(0, 50)] : null);
      if (hit) findings.push({ rule: r.rule, severity: r.severity, excerpt: hit[0], fix: r.fix });
    });
    (t.match(ADDRESS_RE) || []).forEach((addr) => {
      const key = addr.toLowerCase().replace(/\W+/g, '');
      if ([...allowed].some((a) => key.startsWith(a) || a.startsWith(key))) return;
      findings.push({
        rule: 'private-address', severity: 'block', excerpt: addr,
        fix: 'This looks like a street address that isn\'t a public venue. Use the neighborhood, and share exact details one-to-one once the host agrees.',
      });
    });
    return findings;
  };

  MY.RULE_LABELS = {
    promise: 'Makes a promise',
    'hardship-disclosure': 'Asks for hardship disclosure',
    pressure: 'Pressure language',
    consent: 'Needs consent language',
    jargon: 'Permaculture jargon',
    'private-address': 'Private address',
  };

  MY.isBlocked = (findings) => findings.some((f) => f.severity === 'block');
})(typeof globalThis !== 'undefined' ? globalThis : this);

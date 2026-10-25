// Loads the browser engine scripts into Node in the same order index.html does.
const path = require('path');
const FILES = ['core.js', 'guardrails.js', 'seed.js', 'volunteers.js', 'crews.js', 'sites.js', 'network.js', 'rewards.js', 'analytics.js', 'growth.js', 'outreach.js', 'store.js', 'ai.js'];
module.exports = function loadMY() {
  delete globalThis.MY;
  for (const f of FILES) {
    const p = path.join(__dirname, '..', '..', 'public', 'canopy', 'engine', f);
    delete require.cache[p];
    require(p);
  }
  return globalThis.MY;
};
module.exports.FILES = FILES;

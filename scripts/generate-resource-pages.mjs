import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initialResources } from '../src/data/resources.ts'
import { practices } from '../src/data/practices.ts'
import { formatSourceDate } from '../src/lib/dates.ts'
import { guildActivities, guildLinks, guildPrograms, guildVenue } from '../src/guild/data.ts'
import { activityDate, activityTime } from '../src/guild/model.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const css = `
*{box-sizing:border-box}body{margin:0;background:#f7f7ef;color:#203c2d;font:17px/1.7 system-ui,sans-serif}
main{max-width:820px;margin:0 auto;padding:56px 24px}a{color:#326b4c;text-underline-offset:4px}
nav{display:flex;gap:24px;padding-bottom:32px;border-bottom:1px solid #d6ddce}h1{font:500 clamp(32px,6vw,52px)/1.15 Georgia,serif;letter-spacing:-1px;margin:36px 0 20px}
h2{font:500 25px/1.3 Georgia,serif;margin-top:32px}.eyebrow{font-size:16px;text-transform:uppercase;letter-spacing:1.5px;margin-top:40px}.tags{display:flex;flex-wrap:wrap;gap:8px}
.tag{border:1px solid #d6ddce;border-radius:30px;padding:3px 12px;font-size:16px}.card{background:white;border:1px solid #d6ddce;border-radius:12px;padding:22px;margin:24px 0}
.button{display:inline-block;background:#244d36;color:#fff;padding:10px 20px;border-radius:7px;text-decoration:none}.small{font-size:16px;color:#58695c}footer{margin-top:40px;border-top:1px solid #d6ddce;padding-top:20px}nav{flex-wrap:wrap}`;

function document(title, description, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(description)}"><title>${escape(title)} · Common Ground</title><link rel="icon" href="/favicon.svg"><style>${css}</style></head><body><main><nav><a href="/">Common Ground</a><a href="/learn?view=map">Bay Area places</a><a href="/activities/index.html">Guild activities</a><a href="/projects/index.html">All resource pages</a></nav>${body}<footer class="small">A local learning prototype. No partnership, availability, or permission to access a site is implied. Source checks are separate from local demo reviews.</footer></main></body></html>`
}

await mkdir(path.join(root, 'data'), { recursive: true })
for (const name of ['east-bay', 'west-oakland', 'ivy-hill']) {
  await copyFile(path.resolve(root, '..', 'src', 'data', `${name}-map.json`), path.join(root, 'data', `${name}-map.json`))
}
await copyFile(path.resolve(root, '..', 'src', 'data', 'site-environment.json'), path.join(root, 'data', 'site-environment.json'))
await copyFile(path.resolve(root, '..', 'src', 'data', 'bay-area-climate.json'), path.join(root, 'data', 'bay-area-climate.json'))
await copyFile(path.resolve(root, '..', 'src', 'data', 'bay-area-map.json'), path.join(root, 'data', 'bay-area-map.json'))
// This directory contains only this script's generated listing pages.
await rm(path.join(root, 'projects'), { recursive: true, force: true })
await mkdir(path.join(root, 'projects'), { recursive: true })
await writeFile(path.join(root, 'data', 'resources.json'), JSON.stringify({ version: 1, latestSourceCheck: initialResources.map(resource => resource.checkedAt).sort().at(-1), locationAccuracy: 'approximate public wayfinding points', resources: initialResources }, null, 2))
await writeFile(path.join(root, 'data', 'practices.json'), JSON.stringify({ version: 1, numericalValues: 'authored educational assumptions, uncalibrated', practices }, null, 2))
for (const resource of initialResources) {
  const destination = path.join(root, 'projects', resource.id)
  await mkdir(destination, { recursive: true })
  const tags = resource.practices.map((id) => `<span class="tag">${escape(practices.find((practice) => practice.id === id).name)}</span>`).join('')
  const body = `<p class="eyebrow">${escape(resource.city)} · ${escape(resource.category)}</p><h1>${escape(resource.name)}</h1><p>${escape(resource.description)}</p><div class="tags">${tags}</div><section class="card"><h2>How to take part</h2><p>${escape(resource.access)}</p>${resource.address ? `<p><strong>Public location:</strong> ${escape(resource.address)}<br><span class="small">Approximate map location; confirm directions with the provider.</span></p>` : `<p class="small">This resource has no map pin. ${resource.city === 'Online' ? 'Visit its website to learn.' : 'Arranged access protects a private residence.'}</p>`}<a class="button" href="${escape(resource.url)}" target="_blank" rel="noopener noreferrer">${escape(resource.action)}</a></section><h2>Where this information comes from</h2><p><a href="${escape(resource.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(resource.sourcePublisher)} — original source</a></p><p class="small">Public source checked ${escape(formatSourceDate(resource.checkedAt))}. Not steward-confirmed. Schedules, eligibility, and availability can change.</p><p class="small">Practice tags connect learning and participation opportunities; they do not certify a site’s design or ecological performance.</p><p><a href="/learn?view=map&resource=${encodeURIComponent(resource.id)}">View in the interactive directory or suggest a correction →</a></p>`
  await writeFile(path.join(destination, 'index.html'), document(resource.name, resource.description, body))
}
const indexBody = `<p class="eyebrow">Bay Area regeneration directory</p><h1>Find your people.<br>Grow something together.</h1><p>Source-checked public resources for growing, learning, and practical local action.</p>${initialResources.map((resource) => `<article class="card"><p class="small">${escape(resource.city)} · ${escape(resource.category)}</p><h2><a href="/projects/${escape(resource.id)}/index.html">${escape(resource.name)}</a></h2><p>${escape(resource.description)}</p></article>`).join('')}<p class="small">Machine-readable seed data: <a href="/data/resources.json">resources.json</a> · <a href="/data/practices.json">practices.json</a></p>`
await writeFile(path.join(root, 'projects', 'index.html'), document('Bay Area resources', 'Public community resources for gardening, learning, tools, and seeds across the Bay Area.', indexBody))

// Only public, curated source records are exported. Browser workday drafts and
// the local garden database are never inputs to this generator.
await rm(path.join(root, 'activities'), { recursive: true, force: true })
await mkdir(path.join(root, 'activities'), { recursive: true })
await writeFile(path.join(root, 'data', 'guild-activities.json'), JSON.stringify({
  version: 1,
  latestSourceCheck: '2026-10-25',
  locationAccuracy: 'approximate public wayfinding points, not garden boundaries',
  locationAttribution: '© OpenStreetMap contributors · ODbL 1.0',
  locationLicenseUrl: 'https://www.openstreetmap.org/copyright',
  statusPolicy: 'Calculate from confirmed start/end instants; recurring programs do not confirm future dates.',
  eventsUrl: guildLinks.events,
  volunteerUrl: guildLinks.volunteer,
  venues: [guildVenue],
  programs: guildPrograms,
  activities: guildActivities,
}, null, 2))
const datedLink = activity => `/activities/${encodeURIComponent(activity.id)}/index.html`
for (const activity of guildActivities) {
  const destination = path.join(root, 'activities', activity.id)
  await mkdir(destination, { recursive: true })
  // Static pages use explicit dates, never a frozen "next" or "upcoming" label.
  const body = `<p class="eyebrow">East Bay Permaculture Guild · dated gathering</p><h1>${escape(activity.title)}</h1><p>${escape(activity.description)}</p><section class="card"><h2>Published event details</h2><p><strong>${escape(activityDate(activity))}</strong><br>${escape(activityTime(activity))}</p><p>${escape(activity.location)}</p><p>Hosted by ${escape(activity.hosts)}.</p><a href="${escape(activity.sourceUrl)}" target="_blank" rel="noopener noreferrer">Original event page</a><p class="small">This dated record does not confirm a future gathering. Check the host for updates and participation arrangements.</p><a class="button" href="${escape(guildLinks.events)}" target="_blank" rel="noopener noreferrer">Find the next Guild gathering</a></section><h2>Preparation from the source</h2><ul>${activity.preparation.map(item => `<li>${escape(item)}</li>`).join('')}</ul><p><a href="/learn?view=guild&activity=${encodeURIComponent(activity.id)}">Open this activity in Common Ground →</a></p><p><a href="/learn?view=guild&tool=walk">Try the illustrated garden walk →</a></p><p class="small">Public source checked ${escape(formatSourceDate(activity.checkedAt))}. Not steward-confirmed. Official RSVPs happen through the host; this page is not a registration or guest list.</p>`
  await writeFile(path.join(destination, 'index.html'), document(activity.title, activity.description, body))
}
const activitiesBody = `<p class="eyebrow">East Bay Permaculture Guild</p><h1>Find your people.</h1><p>Garden, share a meal, and learn together.</p><p><a class="button" href="${escape(guildLinks.events)}" target="_blank" rel="noopener noreferrer">Find the next gathering</a></p><h2>Ways to take part</h2>${guildPrograms.map(program => `<article class="card"><h2>${escape(program.title)}</h2><p>${escape(program.description)}</p><p>${escape(program.pattern)}</p><p><a href="/learn?view=guild&activity=${encodeURIComponent(program.id)}">Explore this program →</a></p></article>`).join('')}<h2>Dated gatherings</h2><p>These are source records, not a list of upcoming invitations.</p>${guildActivities.map(activity => `<article class="card"><p class="small">${escape(activityDate(activity))} · ${escape(activityTime(activity))}</p><h2><a href="${datedLink(activity)}">${escape(activity.title)}</a></h2><p>${escape(activity.description)}</p></article>`).join('')}<p><a href="${escape(guildLinks.volunteer)}" target="_blank" rel="noopener noreferrer">Existing Guild volunteer-interest form →</a></p><p class="small">Public sources checked October 25, 2026. <a href="/data/guild-activities.json">Download the public activity records</a>.</p>`
await writeFile(path.join(root, 'activities', 'index.html'), document('Guild activities', 'Public Guild programs, dated event records, and official participation links.', activitiesBody))
console.log(`Generated ${initialResources.length} resource pages, ${guildActivities.length} activity pages, 3 public JSON exports, 4 map datasets, and planting-check data.`)

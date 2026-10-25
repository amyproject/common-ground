import type { HotspotId, NeighborhoodId, PlaceId } from './types.ts'

export const places: {
  id: PlaceId; resourceId: string; name: string; shortName: string; category: string; address: string
  color: string; accent: string; intro: string; fact: string; source: string; sourceLabel: string
  action: string; actionUrl: string; hotspots: HotspotId[]; question: string
  neighborhoodId: NeighborhoodId; neighborhood: string; checkedAt: string
}[] = [
  {
    id: 'farm', resourceId: 'anv-west-oakland', name: 'West Oakland Farm Park', shortName: 'Farm Park', category: 'Soil · water · growing',
    neighborhoodId: 'west-oakland', neighborhood: 'West Oakland', checkedAt: '2026-10-24',
    address: '2847 Peralta Street', color: '#3e7350', accent: '#dbe9be',
    intro: 'Meet the soil beneath your feet.',
    fact: 'Acta Non Verba describes gardens, growing spaces, picnic areas, play structures, and a compost hub at this community farm park. The city launched its free compost pickup hub here in May 2026.',
    source: 'https://anvfarm.org/our-farms/west-oakland-farm-park/', sourceLabel: 'Acta Non Verba',
    action: 'Explore ANV volunteering', actionUrl: 'https://anvfarm.org/get-involved/volunteer-with-us/',
    hotspots: ['compost', 'soil', 'water'], question: 'What helps a growing bed get through a dry summer?',
  },
  {
    id: 'park', resourceId: 'defremery-park', name: 'deFremery Park', shortName: 'deFremery Park', category: 'Trees · shade · shared space',
    neighborhoodId: 'west-oakland', neighborhood: 'West Oakland', checkedAt: '2026-10-24',
    address: '1651 Adeline Street', color: '#507459', accent: '#e7e4bb',
    intro: 'Explore trees, shade, and shared space.',
    fact: 'Oakland documents mature trees, green fields, picnic areas, recreation facilities, and community gathering at deFremery Park. The neighborhood also knows it as Little Bobby Hutton Park.',
    source: 'https://www.oaklandca.gov/Community/Parks-Facilities/Recreation-Centers/DeFremery-Recreation-Center', sourceLabel: 'City of Oakland',
    action: 'Read park & recreation information', actionUrl: 'https://www.oaklandca.gov/Community/Parks-Facilities/Recreation-Centers/DeFremery-Recreation-Center',
    hotspots: ['trees', 'shade', 'community'], question: 'How do we make a comfortable space now and care for its future?',
  },
  {
    id: 'gravity', resourceId: 'gravity-garden', name: 'Gravity Garden', shortName: 'Gravity Garden', category: 'Biodiversity · food · neighbors',
    neighborhoodId: 'ivy-hill', neighborhood: 'Ivy Hill, Oakland', checkedAt: '2026-10-25',
    address: '2519 7th Avenue', color: '#7a7750', accent: '#eadfba',
    intro: 'Grow food. Make room for nature.',
    fact: 'Oakland Urban Farming Project describes Gravity Garden in Ivy Hill as a place to learn gardening, harvest produce, and contribute to a community pantry. Its work includes protecting native elder trees from invasive cape ivy.',
    source: 'https://www.oufp.org/', sourceLabel: 'Oakland Urban Farming Project',
    action: 'Explore Gravity Garden participation', actionUrl: 'https://www.oufp.org/',
    hotspots: ['habitat', 'sharing'], question: 'What can a garden grow for plants, pollinators, and neighbors?',
  },
  {
    id: 'library', resourceId: 'west-oakland-library', name: 'West Oakland Library', shortName: 'The library', category: 'Ideas · people · local action',
    neighborhoodId: 'west-oakland', neighborhood: 'West Oakland', checkedAt: '2026-10-24',
    address: '1801 Adeline Street', color: '#9b674f', accent: '#f1dfbd',
    intro: 'Turn your discoveries into an idea.',
    fact: 'The West Oakland Branch offers collections for all ages, computers, and meeting and study rooms. Our field-journal desk is a fictional learning scene, rather than an advertised library program.',
    source: 'https://oaklandlibrary.org/locations/was/', sourceLabel: 'Oakland Public Library',
    action: 'Explore the West Oakland Branch', actionUrl: 'https://oaklandlibrary.org/locations/was/',
    hotspots: ['journal', 'idea'], question: 'What would you like to see in your neighborhood—and what would you ask first?',
  },
]

export const placeById = Object.fromEntries(places.map(place => [place.id, place])) as Record<PlaceId, typeof places[number]>

export const hotspots: Record<HotspotId, { name: string; title: string; question: string; place: PlaceId; label: string }> = {
  compost: { name: 'Compost', title: 'Scraps to soil.', question: 'How do food scraps help soil?', place: 'farm', label: 'Explore compost' },
  soil: { name: 'Soil', title: 'Where does rain go?', question: 'What helps soil absorb rain?', place: 'farm', label: 'Inspect soil' },
  water: { name: 'Water', title: 'Make every drop count.', question: 'Can you grow with less water?', place: 'farm', label: 'Try watering' },
  trees: { name: 'Trees', title: 'Grow some shade.', question: 'How does care change a tree’s future?', place: 'park', label: 'Explore trees' },
  shade: { name: 'Shade', title: 'Chase the shade.', question: 'Where is the shade now?', place: 'park', label: 'Follow shade' },
  community: { name: 'Shared space', title: 'Make room for people.', question: 'Who benefits? Who cares for it?', place: 'park', label: 'Plan a gathering' },
  habitat: { name: 'Plants', title: 'Plant a living garden.', question: 'What can different plants provide?', place: 'gravity', label: 'Explore plants' },
  sharing: { name: 'Pantry', title: 'Share the harvest.', question: 'Who gets a basket? Who decides?', place: 'gravity', label: 'Explore the pantry' },
  journal: { name: 'Journal', title: 'What did you notice?', question: 'What changed your mind?', place: 'library', label: 'Open your journal' },
  idea: { name: 'Ideas', title: 'Your neighborhood idea.', question: 'What would you improve?', place: 'library', label: 'Visit the ideas table' },
}

export const evidence = [
  { id: 'guild-events', publisher: 'East Bay Permaculture Guild / event hosts', title: 'Guild workdays and community gatherings', url: 'https://partiful.com/u/PcnFYcpQOwCLdVFxzZ3i', note: 'Public October 2026 events checked October 25. Dated records are separate from recurring programs; official RSVPs and current arrangements remain with the host.' },
  { id: 'guild-sop', publisher: 'East Bay Permaculture Guild / Oakland Peace Center', title: 'Garden workday SOP and agendas', url: 'https://docs.google.com/document/d/1T-lPrgM3dPlboTDOcU-ODvnFgtNQyguP5td1CtvXHOg/edit?usp=sharing', note: 'Source for editable welcome, agenda, role, and follow-up drafts. The prototype’s adaptations need host review and do not establish actual staffing, attendance, or automated outreach.' },
  { id: 'guild-walk', publisher: 'East Bay Permaculture Guild', title: 'Oakland Peace Center property walk', url: 'https://docs.google.com/document/d/1KzH6SQ_T65FXoSWJB_hPVGtevyWb3qqSL6NuPx5NzPQ/edit?usp=drivesdk', note: 'March 2026 observation activity about sun, water, shade, soil concerns, and planting choices. Adapted into three illustrated preparation questions; knowledgeable review remains pending.' },
  { id: 'unccd', publisher: 'UNCCD', title: 'Land management and restoration', url: 'https://www.unccd.int/land-and-life/land-management-and-restoration/overview', note: 'Land health, water, biodiversity, and people’s livelihoods provide the educational context. The game’s numerical experiments are authored teaching examples.' },
  { id: 'anv', publisher: 'Acta Non Verba', title: 'West Oakland Farm Park', url: places[0].source, note: 'Place information, growing areas, and the compost hub. A public source check is separate from steward confirmation.' },
  { id: 'compost', publisher: 'City of Oakland', title: 'Free community compost at West Oakland Farm Park', url: 'https://www.oaklandca.gov/News-Releases/Oakland-launches-year-round-free-compost-giveaway-for-residents', note: 'May 2026 launch; compost made from Oakland curbside food scraps and plant debris. Pickup does not imply a scrap drop-off service.' },
  { id: 'park', publisher: 'City of Oakland', title: 'deFremery Park and Recreation Center', url: places[1].source, note: 'Mature trees, recreation, gathering places, and public location.' },
  { id: 'library', publisher: 'Oakland Public Library', title: 'West Oakland Branch', url: placeById.library.source, note: 'Public address and facilities. The game’s learning desk and dialogue are fictional.' },
  { id: 'gravity', publisher: 'Oakland Urban Farming Project', title: 'Gravity Garden: learn, harvest, and share', url: placeById.gravity.source, note: 'Ivy Hill location, hands-on gardening, community pantry, and native elder care. Checked October 25, 2026; the game’s planting and sharing experiments are fictional.' },
  { id: 'gravity-address', publisher: 'OUFP / Garden Steward Newsletter', title: 'Earth Day Block Party 2026', url: 'https://garden-steward.beehiiv.com/p/earth-day-block-party-2026', note: 'Provider-published public address: 2519 7th Avenue. April event details are historical, not a current schedule. This newsletter is linked from OUFP’s website.' },
  { id: 'pollinators', publisher: 'USDA NRCS', title: 'Basics of pollinator conservation', url: 'https://www.nrcs.usda.gov/sites/default/files/2024-08/Basics%20of%20Pollinator%20Conserv_Sept_2020.pdf', note: 'Native flowers and habitat can support pollinators in urban spaces. Supports the garden’s causal lesson, not its numerical coefficients or a site planting prescription.' },
  { id: 'ebmud', publisher: 'EBMUD', title: 'Lawn to Garden Design Center', url: 'https://www.ebmud.com/water/conservation-and-rebates/watersmart-gardener/lawn-garden-design-center', note: 'Local guidance for soil, waterwise plants, and irrigation. Supports causal explanations; it does not calibrate game values.' },
  { id: 'epa', publisher: 'US EPA', title: 'Benefits of green infrastructure', url: 'https://www.epa.gov/green-infrastructure/benefits-green-infrastructure', note: 'Relationships among vegetation, water, shade, maintenance, and community benefits. Illustrations are not site-specific forecasts.' },
  { id: 'osm', publisher: 'OpenStreetMap contributors', title: 'Map data and ODbL attribution', url: 'https://www.openstreetmap.org/copyright', note: 'Continuous East Bay geometry extracted October 25, 2026. Gravity Garden uses an approximate address point, not a surveyed garden footprint. Original artwork is stylized.' },
  { id: 'site-climate', publisher: 'Open-Meteo / Copernicus ERA5', title: 'Regional historical weather', url: 'https://open-meteo.com/en/docs/historical-weather-api', note: '2016–2025 daily modeled weather, summarized into monthly temperatures and precipitation. One ~25 km reference grid serves the Oakland pilot. Ten-year summaries are not official climate normals, measured microclimate, or USDA hardiness zones.' },
  { id: 'site-terrain', publisher: 'Open-Meteo / Copernicus DEM', title: 'Approximate elevation and terrain', url: 'https://open-meteo.com/en/docs/elevation-api', note: 'Copernicus GLO-90, 2021 release: 90 m data sampled at 504 points across the pilot. Neighborhood slope estimates can miss beds, walls, trees, and local drainage. Checked October 25, 2026.' },
  { id: 'plant-vegetables', publisher: 'UC ANR / Contra Costa Master Gardeners', title: 'Creating a family garden bed', url: 'https://ucanr.edu/blog/hort-coco-uc-master-gardener-program-contra-costa/article/creating-family-garden-bed', note: 'Warm-season crops, six hours of direct sun, water, soil, cool-season greens, and planning care. Supports the shortlist; site matches use simplified screening bands and the player’s answers.' },
  { id: 'plant-handbook', publisher: 'UC Agriculture and Natural Resources', title: 'Vegetable gardening handbook for beginners', url: 'https://ucanr.edu/sites/default/files/2025-03/vegetable_gardening_handbook_for_beginners.pdf', note: 'Garden siting, sun, drainage, leafy crops, seasonal planting, and care. Plant-specific varieties, mature size, and soil conditions still need local review.' },
  { id: 'site-soil', publisher: 'UC ANR Urban Agriculture', title: 'Soil contaminants and soil testing', url: 'https://ucanr.edu/site/urban-agriculture/soil-contaminants-and-soil-testing', note: 'Qualified lab testing and site history matter for urban gardening. The app does not test or certify soil. A plant match based on user reports is a planning aid.' },
  { id: 'plant-poppy', publisher: 'CNPS / Calscape', title: 'California poppy', url: 'https://calscape.org/plant/1602/Eschscholzia-californica-(California-Poppy)', note: 'Sun, establishment care, fall sowing, and pollinator habitat. California native does not establish that every plant or cultivar fits every Oakland site.' },
  { id: 'plant-fuchsia', publisher: 'CNPS / Calscape', title: 'California fuchsia', url: 'https://calscape.org/plant/1413/Epilobium-canum-(California-Fuchsia)', note: 'Full sun to partial shade, low established water needs, maintenance, and hummingbird flowers. Select a suitable form and recheck the site.' },
  { id: 'plant-buckwheat', publisher: 'CNPS / Calscape', title: 'California buckwheat', url: 'https://calscape.org/plant/1502/Eriogonum-fasciculatum-(California-Buckwheat)', note: 'Sunny sites, low established water needs, mature shrub space, and habitat. A California native shortlist is separate from a locally appropriate planting plan.' },
]

export const hotspotOrder = Object.keys(hotspots) as HotspotId[]

import type { AgendaItem, GuildActivity, GuildProgram, WorkdayRole } from './types.ts'

export const guildLinks = {
  background: 'https://collectiveresiliencenow.org/east-bay-permaculture-guild/',
  events: 'https://partiful.com/u/PcnFYcpQOwCLdVFxzZ3i',
  volunteer: 'https://docs.google.com/forms/d/e/1FAIpQLScWYNUTGP3sdrGopwEcImSZ--WlXjbktrZH6KJ5ptlR3p3xLQ/viewform?usp=publish-editor',
  sop: 'https://docs.google.com/document/d/1T-lPrgM3dPlboTDOcU-ODvnFgtNQyguP5td1CtvXHOg/edit?usp=sharing',
  walk: 'https://docs.google.com/document/d/1KzH6SQ_T65FXoSWJB_hPVGtevyWb3qqSL6NuPx5NzPQ/edit?usp=drivesdk',
  challenge: 'https://hackforsocialimpact.notion.site/Growing-Participation-in-East-Bay-Permaculture-4022cb772f1e80dabe47cd94b010654e',
}

// Current public venue address is published by the October 25 event.
// The map point is an approximate OSM wayfinding point, not a garden boundary.
export const guildVenue = {
  id: 'oakland-peace-center',
  name: 'Oakland Peace Center',
  shortName: 'Peace Center',
  address: '111 Fairmount Avenue, Oakland',
  coordinates: [37.8167292, -122.2609187] as [number, number],
  coordinateSource: 'https://www.openstreetmap.org/relation/17651405',
  coordinateCheckedAt: '2026-10-25',
}

export const guildPrograms: GuildProgram[] = [
  {
    id: 'opc-workdays',
    kind: 'workday',
    title: 'Garden workdays',
    description: 'Care for the Peace Center garden with neighbors.',
    pattern: 'Workdays and skill shares · next date on Partiful',
    preparation: ['Check the host’s RSVP and arrival details.', 'Bring gloves and your own plate and utensils.', 'Ask a garden lead which task fits you.'],
    practices: ['food', 'rain', 'native'],
    sourceUrl: 'https://partiful.com/e/y11uw9Cv7OA7BVn8LSVC',
    checkedAt: '2026-10-25',
  },
  {
    id: 'guild-gatherings',
    kind: 'potluck',
    title: 'Potlucks & community nights',
    description: 'Share a meal, meet people, and exchange ideas.',
    pattern: 'Second Mondays · confirm the next gathering',
    preparation: ['Open the current event before making plans.', 'Bring a dish if you can; label allergens.', 'Bring your own plate and cutlery.'],
    practices: ['food', 'trees', 'native'],
    sourceUrl: 'https://partiful.com/e/Ndbcr15Aa142zBLZZU3U',
    checkedAt: '2026-10-25',
  },
  {
    id: 'opc-planning',
    kind: 'planning',
    title: 'Help shape the garden',
    description: 'Bring ideas for planting, habitat, and ongoing care.',
    pattern: 'Planning gatherings · next date to be announced',
    preparation: ['Check the next meeting’s official details.', 'Bring an idea and a question for the stewards.', 'Consider the people and care your idea would need.'],
    practices: ['food', 'native', 'rain', 'trees'],
    sourceUrl: 'https://partiful.com/e/HZPB5ZAkhvFUePeQGwgt',
    checkedAt: '2026-10-25',
  },
]

export const guildActivities: GuildActivity[] = [
  {
    id: 'opc-workday-2026-10-25',
    programId: 'opc-workdays',
    kind: 'workday',
    title: 'OPC Garden Workday & Skill Share',
    description: 'Water, weed, tend plants, harvest, and share produce.',
    hosts: 'EBPG, Oakland Peace Center & Wood Street Commons',
    venueId: guildVenue.id,
    location: guildVenue.address,
    startAt: '2026-10-25T10:00:00-07:00',
    endAt: '2026-10-25T14:00:00-07:00',
    timeZone: 'America/Los_Angeles',
    cancelled: false,
    registrationUrl: 'https://partiful.com/e/y11uw9Cv7OA7BVn8LSVC',
    sourceUrl: 'https://partiful.com/e/y11uw9Cv7OA7BVn8LSVC',
    checkedAt: '2026-10-25',
    preparation: ['RSVP on Partiful so hosts can plan tools and food.', 'Bring gloves, your own plate, and utensils.', 'Snacks and lunch are listed; check current host details.'],
  },
  {
    id: 'opc-planning-2026-10-15',
    programId: 'opc-planning',
    kind: 'planning',
    title: 'OPC Garden Planning Meeting',
    description: 'A gathering about workday roles, seasonal planting, and habitat.',
    hosts: 'EBPG, Oakland Peace Center & Wood Street Commons',
    venueId: null,
    location: 'Oakland · full meeting location on Partiful',
    startAt: '2026-10-15T17:30:00-07:00',
    endAt: '2026-10-15T19:30:00-07:00',
    timeZone: 'America/Los_Angeles',
    cancelled: false,
    registrationUrl: 'https://partiful.com/e/HZPB5ZAkhvFUePeQGwgt',
    sourceUrl: 'https://partiful.com/e/HZPB5ZAkhvFUePeQGwgt',
    checkedAt: '2026-10-25',
    preparation: ['Bring your interests and questions about garden care.', 'Use the host’s published location and participation details.'],
  },
  {
    id: 'guild-potluck-2026-10-12',
    programId: 'guild-gatherings',
    kind: 'potluck',
    title: 'October Potluck & Community Hangout',
    description: 'A meal, a short talk on community-owned tools, and small-group conversations.',
    hosts: 'East Bay Permaculture Guild, OPC & friends',
    venueId: guildVenue.id,
    location: 'Oakland Peace Center · Grace Room',
    startAt: '2026-10-12T18:00:00-07:00',
    endAt: '2026-10-12T20:30:00-07:00',
    timeZone: 'America/Los_Angeles',
    cancelled: false,
    registrationUrl: 'https://partiful.com/e/Ndbcr15Aa142zBLZZU3U',
    sourceUrl: 'https://partiful.com/e/Ndbcr15Aa142zBLZZU3U',
    checkedAt: '2026-10-25',
    preparation: ['Bring a dish if you can; label allergens.', 'Bring your own plate and cutlery.'],
  },
]

export const activityById = Object.fromEntries(guildActivities.map(activity => [activity.id, activity]))
export const programById = Object.fromEntries(guildPrograms.map(program => [program.id, program]))

// Editable draft responsibilities derived from the SOP and public workday.
// These are not an approved role taxonomy or the event's actual staffing.
export const workdayRoles: WorkdayRole[] = [
  { id: 'lead', name: 'Event lead', description: 'Confirm priorities, welcome the group, and coordinate the day.', needed: 1, assignedTo: '' },
  { id: 'setup', name: 'Space & tools', description: 'Prepare the space, tools, materials, and arrival signs with the host.', needed: 1, assignedTo: '' },
  { id: 'welcome', name: 'Welcome crew', description: 'Help with nametags, sign-in, and finding the garden lead.', needed: 1, assignedTo: '' },
  { id: 'care', name: 'Comfort & care', description: 'Prepare water, snacks, and the shared meal with the host.', needed: 2, assignedTo: '' },
  { id: 'garden', name: 'Garden team', description: 'Work on the agreed tasks with an experienced garden lead.', needed: 4, assignedTo: '' },
  { id: 'cleanup', name: 'Cleanup crew', description: 'Return tools and help leave the space ready for its neighbors.', needed: 2, assignedTo: '' },
  { id: 'notes', name: 'Notes & next steps', description: 'Capture ideas from the closing discussion and agreed follow-up.', needed: 1, assignedTo: '' },
]

export const workdayAgenda: AgendaItem[] = [
  { id: 'setup', time: '09:00', title: 'Leads arrive · prepare space, tools, and refreshments' },
  { id: 'welcome', time: '09:45', title: 'Arrival · nametags, welcome, and housekeeping' },
  { id: 'intro', time: '10:15', title: 'Introductions · what are we planting, nurturing, or harvesting?' },
  { id: 'tasks', time: '10:45', title: 'Garden walk · agree tasks and work with a lead' },
  { id: 'lunch', time: '12:30', title: 'Check-in · wash up and share lunch' },
  { id: 'reflect', time: '12:50', title: 'Reflection · share discoveries and ideas' },
  { id: 'cleanup', time: '13:40', title: 'Return tools · tidy up together' },
  { id: 'close', time: '14:00', title: 'Closing · agree care tasks and the next connection' },
]

export const setupChecklist = [
  'Confirm the host, tasks, and public arrival details.',
  'Prepare tools, water, refreshments, and nametags.',
  'Brief the leads and identify a welcome person.',
  'Review the host’s safety and participation arrangements.',
  'Agree how to share next steps with people who want them.',
]

export const walkSteps = [
  {
    id: 'water' as const,
    title: 'Find the water',
    question: 'Before planning a bed, what would you check?',
    choices: [
      { id: 'ask', text: 'Where water comes from, and who waters', feedback: 'Ask about water access and ongoing care. A tap in an illustration tells us nothing about the real garden.' },
      { id: 'rain', text: 'Assume rain will cover every season', feedback: 'Rain changes through the year. Ask about water access and the garden’s care plan.' },
    ],
  },
  {
    id: 'shade' as const,
    title: 'Watch the shade',
    question: 'How could you understand light at a growing spot?',
    choices: [
      { id: 'observe', text: 'Look at shade at different times', feedback: 'Buildings and trees can shade a bed as the sun moves. Observe the real spot at different times.' },
      { id: 'noon', text: 'Use one sunny midday view', feedback: 'One moment cannot describe the whole day. Notice what shades the bed in the morning and afternoon.' },
    ],
  },
  {
    id: 'soil' as const,
    title: 'Ask about the soil',
    question: 'Can a green-looking garden prove soil is suitable?',
    choices: [
      { id: 'check', text: 'Ask about site history and soil review', feedback: 'Ask a steward about site history, soil assessment, and the growing approach. The game cannot test soil.' },
      { id: 'looks', text: 'Healthy-looking plants are enough', feedback: 'Appearance cannot establish soil safety. Ask about site history and appropriate soil assessment.' },
    ],
  },
]

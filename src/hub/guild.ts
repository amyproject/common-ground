// The East Bay Permaculture Guild: the community this hub exists to grow.
// From collectiveresiliencenow.org/east-bay-permaculture-guild and the Guild's Linktree, checked 2026-10-25.
export const guild = {
  name: 'East Bay Permaculture Guild',
  short: 'the Guild',
  about: 'A volunteer-led community for everyone interested in permaculture, from the permie-curious to longtime designers. Monthly meetings, shared projects, and a lot of potluck.',
  meeting: { rule: '2nd Mondays, 6:00–8:30 PM', place: 'Oakland Peace Center, Grace Room', address: '111 Fairmount Ave, Oakland', note: 'Potluck: bring food or drink and your own plate. Guest speakers every other month; open community nights in between.' },
  links: {
    website: 'https://collectiveresiliencenow.org/east-bay-permaculture-guild/',
    linktree: 'https://linktr.ee/eastbaypermacultureguild',
    volunteerForm: 'https://docs.google.com/forms/d/e/1FAIpQLScWYNUTGP3sdrGopwEcImSZ--WlXjbktrZH6KJ5ptlR3p3xLQ/viewform',
    emailList: 'https://docs.google.com/forms/d/e/1FAIpQLSeOsRcMnW2NFCFLemG9S7bgbUgVxIjOIoiKAdr0ukfdWkDokg/viewform',
    partiful: 'https://partiful.com/u/PcnFYcpQOwCLdVFxzZ3i',
    regenEvents: 'https://partiful.com/co/LHmEtfsSc909udzIop8H',
    instagram: 'https://www.instagram.com/eastbaypermacultureguild/',
    hylo: 'https://www.hylo.com/groups/east-bay-permaculture-guild',
    facebook: 'https://facebook.com/eastbaypermaculture',
    donate: 'https://www.zeffy.com/en-US/donation-form/donate-to-support-the-east-bay-permaculture-guild-2',
  },
  partners: ['Oakland Peace Center', 'Bay Delta Bioregional Unconference'],
}

// Second Monday of a month, local time.
function secondMonday(year: number, month: number) {
  const first = new Date(year, month, 1)
  return new Date(year, month, 1 + ((8 - first.getDay()) % 7) + 7)
}

export function nextMeetings(count = 2, from = new Date()) {
  const out: Date[] = []
  const cutoff = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  for (let offset = 0; out.length < count && offset < 24; offset++) {
    const date = secondMonday(from.getFullYear(), from.getMonth() + offset)
    if (date >= cutoff) out.push(date)
  }
  return out
}

export const meetingLabel = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

export const plugIn = [
  { id: 'email', label: 'Join the Guild email list', href: guild.links.emailList },
  { id: 'partiful', label: 'Follow the Guild on Partiful for RSVPs', href: guild.links.partiful },
  { id: 'hylo', label: 'Join the Guild’s Hylo group', href: guild.links.hylo },
  { id: 'instagram', label: 'Follow @eastbaypermacultureguild', href: guild.links.instagram },
] as const

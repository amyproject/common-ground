import { ArrowRight, Sprout, Users } from 'lucide-react'

export function GuildBridge({ onGuild, compact = false }: { onGuild: () => void; compact?: boolean }) {
  return <section className={`guild-bridge ${compact ? 'compact' : ''}`} aria-label="Connect learning with Guild participation">
    <span className="guild-bridge-icon">{compact ? <Sprout size={29} strokeWidth={1.5} /> : <Users size={34} strokeWidth={1.5} />}</span>
    <div><span className="guild-overline">East Bay Permaculture Guild</span><h2>{compact ? 'Try it with neighbors.' : 'Find your people.'}</h2><p>{compact ? 'Explore a real workday, meal, or planning gathering.' : 'Work in a garden. Share a meal. Bring an idea.'}</p></div>
    <button className="button button-primary" onClick={onGuild}>Find a Guild activity <ArrowRight size={19} /></button>
  </section>
}

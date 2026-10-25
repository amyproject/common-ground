import { initialGuildState, restoreGuildState } from './model.ts'
import type { GuildState } from './types.ts'

export const GUILD_STORAGE_KEY = 'common-ground-guild-v1'

export function readGuildState(): { state: GuildState; error: boolean } {
  try { return restoreGuildState(localStorage.getItem(GUILD_STORAGE_KEY)) }
  catch { return { state: initialGuildState(), error: true } }
}

export function persistGuildState(state: GuildState): boolean {
  try {
    const raw = JSON.stringify(state)
    if (restoreGuildState(raw).error) return false
    localStorage.setItem(GUILD_STORAGE_KEY, raw)
    return true
  } catch { return false }
}

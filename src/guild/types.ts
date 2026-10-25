import type { PracticeId } from '../types.ts'

export type GuildKind = 'workday' | 'potluck' | 'planning'
export type ActivityStatus = 'upcoming' | 'in-progress' | 'past' | 'cancelled' | 'unconfirmed'
export type GuildTab = 'activities' | 'prepare' | 'kit'
export type WalkStep = 'water' | 'shade' | 'soil'

export interface GuildProgram {
  id: string
  kind: GuildKind
  title: string
  description: string
  pattern: string
  preparation: string[]
  practices: PracticeId[]
  sourceUrl: string
  checkedAt: string
}

export interface GuildActivity {
  id: string
  programId: string
  kind: GuildKind
  title: string
  description: string
  hosts: string
  venueId: string | null
  location: string
  startAt: string | null
  endAt: string | null
  timeZone: string
  cancelled: boolean
  registrationUrl: string
  sourceUrl: string
  checkedAt: string
  preparation: string[]
}

export type WorkdayRoleId = 'lead' | 'setup' | 'welcome' | 'care' | 'garden' | 'cleanup' | 'notes'

export interface WorkdayRole {
  id: WorkdayRoleId
  name: string
  description: string
  needed: number
  assignedTo: string
}

export interface AgendaItem {
  id: string
  time: string
  title: string
}

export interface WorkdayDraft {
  id: string
  title: string
  date: string
  venue: string
  tasks: string
  registrationUrl: string
  bring: string
  followUp: string
  agenda: AgendaItem[]
  roles: WorkdayRole[]
}

export interface GuildState {
  version: 1
  visitor: 'new' | 'returning'
  walk: Partial<Record<WalkStep, string>>
  drafts: WorkdayDraft[]
  selectedDraftId: string
}

export type PracticeId = 'trees' | 'rain' | 'food' | 'native' | 'permeable'
export type Checkpoint = 0 | 5 | 15
export type OutcomeId = 'water' | 'shade' | 'soil' | 'community'
export type View = 'game' | 'map' | 'review'
export type Placement = PracticeId | null
export type Layout = Placement[]
export type Costs = { budget: number; water: number; care: number }

export interface EvidenceSource {
  id: string
  title: string
  publisher: string
  url: string
  note: string
}

export interface Practice {
  id: PracticeId
  name: string
  shortName: string
  description: string
  tradeoff: string
  color: string
  softColor: string
  costs: Costs
  effects: Record<OutcomeId, number>
  sources: string[]
}

export interface Scenario {
  id: string
  name: string
  neighborhood: string
  description: string
  columns: number
  rows: number
  fixedPlots: Record<number, 'hall' | 'existing-tree'>
  pavement: number[]
  budgets: Costs
  checkpoints: { year: Checkpoint; title: string; subtitle: string; water: number; care: number }[]
}

export interface Simulation {
  year: Checkpoint
  scores: Record<OutcomeId, number>
  costs: Costs
  waterShortfall: number
  careShortfall: number
  diversity: number
  insights: string[]
}

export interface SavedDesign {
  name: string
  layout: Layout
}

export type ResourceCategory = 'Garden' | 'Learning' | 'Tools & seeds'
export interface Resource {
  id: string
  name: string
  city: string
  county?: string
  // Which illustration the regional map uses for this place.
  kind?: 'farm' | 'garden' | 'nursery' | 'learning' | 'park'
  neighborhood: string
  category: ResourceCategory
  description: string
  access: string
  address?: string
  coordinates?: [number, number]
  practices: PracticeId[]
  action: string
  url: string
  sourceUrl: string
  sourcePublisher: string
  checkedAt: string
  status: 'source-checked' | 'demo-reviewed' | 'inactive'
  reviewedAt?: string
  reviewSourceUrl?: string
  reviewer?: string
}

export interface Suggestion {
  id: string
  resourceId: string
  resourceName: string
  field: 'access' | 'status'
  before: string
  after: string
  sourceUrl: string
  note: string
  status: 'pending' | 'approved' | 'declined'
  submittedAt: string
  reviewedAt?: string
  demo?: boolean
}

export interface StoredState {
  version: 1
  layout: Layout
  savedDesign: SavedDesign | null
  resources: Resource[]
  suggestions: Suggestion[]
  reflection: string
}

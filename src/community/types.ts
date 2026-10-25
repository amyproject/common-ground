import type { BayClimate } from '../hub/climate.ts'
export type PlantId = 'tomato' | 'lettuce' | 'kale' | 'poppy' | 'fuchsia' | 'buckwheat'
export type Season = 'spring' | 'summer' | 'fall' | 'winter'
export type SiteFeature = 'water' | 'building' | 'road' | 'green' | 'unmapped'
export type ProjectKind = 'new-garden' | 'revive-garden' | 'landscape'
export type HelpRole = 'planting' | 'building' | 'watering' | 'planning'
export type PermissionStatus = 'checking' | 'contacted' | 'confirmed'

export interface SiteConditions {
  sun: 'unknown' | 'shade' | 'part' | 'full'
  water: 'unknown' | 'none' | 'limited' | 'regular'
  drainage: 'unknown' | 'drains' | 'ponds'
  soil: 'unknown' | 'tested' | 'clean-bed' | 'concern'
  surface: 'unknown' | 'ground' | 'containers'
  season: Season
}

export interface SelectedSite {
  latitude: number
  longitude: number
  label: string
  feature: SiteFeature
  featureName: string
  nearestStreet: string | null
}

export interface ClimateMonth {
  month: number
  highC: number
  lowC: number
  precipitationMm: number
}

export interface SiteEnvironment {
  version: 1
  checkedAt: string
  // Bay Area reference climates, merged in by the client when loaded (outside the Oakland pilot).
  regional?: BayClimate
  climate: {
    source: string
    url: string
    requestUrl: string
    period: string
    years: number
    resolutionKm: number
    requestedCoordinates: number[]
    returnedCoordinates: number[]
    months: ClimateMonth[]
    annualRainMm: number
    summerRainMm: number
    coldestNightC: number
    freezingDaysPerYear: number
  }
  terrain: {
    source: string
    url: string
    resolutionMeters: number
    sampleSpacingMeters: number
    bounds: number[]
    columns: number
    rows: number
    elevations: (number | null)[]
    requestUrls: string[]
  }
}

export interface ProjectInput {
  title: string
  kind: ProjectKind
  goal: string
  site: SelectedSite
  conditions: SiteConditions
  plants: PlantId[]
  otherPlants: string
  budget: number
  budgetNote: string
  volunteersNeeded: number
  roles: HelpRole[]
  organizerName: string
  permission: PermissionStatus
  permissionNote: string
  workDate: string
  meetupNote: string
  carePlan: string
}

export interface JoinInput {
  name: string
  role: HelpRole
  availability: string
}

export interface ProjectMember extends JoinInput {
  joinedAt: string
  mine: boolean
}

export interface GardenProject extends ProjectInput {
  id: string
  createdAt: string
  updatedAt: string
  revision: number
  status: 'open' | 'closed'
  isOrganizer: boolean
  joined: boolean
  members: ProjectMember[]
}

export interface CommunitySnapshot {
  projects: GardenProject[]
  visitorName: string
}

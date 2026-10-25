import type { ClimateMonth } from '../community/types.ts'

export type ClimateZone = 'coast' | 'bay' | 'valley' | 'inland' | 'hills'
export interface ClimateReference {
  name: string
  latitude: number
  longitude: number
  zone: ClimateZone
  returnedCoordinates: number[]
  gridElevation: number
  months: ClimateMonth[]
  annualRainMm: number
  summerRainMm: number
  summerHighC: number
  winterLowC: number
  coldestNightC: number
  freezingDaysPerYear: number
}
export type ClimateLayer = 'summerHighC' | 'annualRainMm' | 'freezingDaysPerYear'
export interface BayClimate {
  version: 1
  checkedAt: string
  source: string
  url: string
  period: string
  years: number
  resolutionKm: number
  note: string
  references: ClimateReference[]
  grid: { bounds: number[]; step: number; columns: number; rows: number; land: number[]; layers: Record<ClimateLayer, (number | null)[]> }
}

export const zoneNames: Record<ClimateZone, string> = { coast: 'Fog belt', bay: 'Bayside', valley: 'Warm valley', inland: 'Hot interior', hills: 'Ridges' }

const distanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) =>
  Math.hypot((a.longitude - b.longitude) * 111.32 * Math.cos(a.latitude * Math.PI / 180), (a.latitude - b.latitude) * 110.57)

// The closest reference point within 30 km stands in for a site's climate. Farther than that,
// the climate stays unknown rather than borrowing a distant town's weather.
export function nearestReference(climate: BayClimate, site: { latitude: number; longitude: number }, maxKm = 30): { reference: ClimateReference; distanceKm: number } | null {
  let best: { reference: ClimateReference; distanceKm: number } | null = null
  for (const reference of climate.references) {
    const distance = distanceKm(site, reference)
    if (!best || distance < best.distanceKm) best = { reference, distanceKm: distance }
  }
  return best && best.distanceKm <= maxKm ? best : null
}

export function gridValue(climate: BayClimate, layer: ClimateLayer, site: { latitude: number; longitude: number }): number | null {
  const { bounds: [west, , , north], step, columns, rows, layers } = climate.grid
  const column = Math.round((site.longitude - west) / step), row = Math.round((north - site.latitude) / step)
  if (column < 0 || row < 0 || column >= columns || row >= rows) return null
  return layers[layer][row * columns + column]
}

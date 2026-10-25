import { bayAreaBounds, type NeighborhoodGeometry, type RegionalPolygon } from '../exploration/geography.ts'
import { nearestReference } from '../hub/climate.ts'
import type { SelectedSite, SiteEnvironment } from './types.ts'

export const pilotBounds = [-122.299, 37.7965, -122.2365, 37.827] as const

export function inPilot(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= pilotBounds[1] && latitude <= pilotBounds[3] && longitude >= pilotBounds[0] && longitude <= pilotBounds[2]
}

export function inBayArea(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= bayAreaBounds[1] && latitude <= bayAreaBounds[3] && longitude >= bayAreaBounds[0] && longitude <= bayAreaBounds[2]
}

export function geographicPoint(map: NeighborhoodGeometry, [x, y]: number[]): { latitude: number; longitude: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const [west, south, east, north] = map.bounds
  const longitude = west + (x - 65) / (map.width - 130) * (east - west)
  const latitude = north - (y - 50) / (map.height - 100) * (north - south)
  const coverage = map.region?.bounds ?? map.bounds
  return latitude < coverage[1] || latitude > coverage[3] || longitude < coverage[0] || longitude > coverage[2] ? null : { latitude, longitude }
}

export function mapPoint(map: NeighborhoodGeometry, site: { latitude: number; longitude: number }): number[] {
  const [west, south, east, north] = map.bounds
  return [65 + (site.longitude - west) / (east - west) * (map.width - 130), 50 + (north - site.latitude) / (north - south) * (map.height - 100)]
}

export function pointInPolygon([x, y]: number[], points: number[][]): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function inRegionalPolygon(point: number[], polygon: RegionalPolygon): boolean {
  return Boolean(polygon.rings[0] && pointInPolygon(point, polygon.rings[0]) && !polygon.rings.slice(1).some(ring => pointInPolygon(point, ring)))
}

function segmentDistance(point: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = dx || dy ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy)
}

export function describeSite(map: NeighborhoodGeometry, coordinates: { latitude: number; longitude: number }): SelectedSite {
  if (!inPilot(coordinates.latitude, coordinates.longitude)) {
    const point = [coordinates.longitude, coordinates.latitude]
    const water = Boolean(map.region && (!map.region.land.some(shape => inRegionalPolygon(point, shape)) || map.region.lakes.some(shape => inRegionalPolygon(point, shape))))
    const cities = map.region?.cities ?? []
    const distance = (city: typeof cities[number]) => Math.hypot((city.coordinates[0] - coordinates.longitude) * Math.cos(coordinates.latitude * Math.PI / 180), city.coordinates[1] - coordinates.latitude)
    const city = [...cities].sort((a, b) => distance(a) - distance(b))[0]
    return { ...coordinates, label: city && distance(city) < .35 ? `Near ${city.name}` : 'Bay Area spot', feature: water ? 'water' : 'unmapped', featureName: water ? 'Regional mapped water' : 'Regional map · site details unknown', nearestStreet: null }
  }
  const point = mapPoint(map, coordinates)
  let nearestStreet: string | null = null
  let distance = Infinity
  let road: NeighborhoodGeometry['roads'][number] | null = null
  let roadDistance = Infinity
  for (const candidate of map.roads) {
    for (let index = 1; index < candidate.points.length; index++) {
      const next = segmentDistance(point, candidate.points[index - 1], candidate.points[index])
      if (next < roadDistance) { roadDistance = next; road = candidate }
      if (candidate.name && next < distance) { distance = next; nearestStreet = candidate.name }
    }
  }
  // Geometry describes mapped features, never ownership, soil quality, or access.
  const water = map.water.find(shape => pointInPolygon(point, shape.points))
  const building = map.buildings.find(shape => pointInPolygon(point, shape.points))
  const green = map.greens.find(shape => pointInPolygon(point, shape.points))
  const roadThreshold = road?.kind === 'motorway' || road?.kind === 'trunk' ? 11 : road?.kind === 'secondary' || road?.kind === 'tertiary' ? 7 : road?.kind === 'residential' ? 4.5 : 2
  const feature = water ? 'water' : building ? 'building' : roadDistance < roadThreshold ? 'road' : green ? 'green' : 'unmapped'
  const featureName = (feature === 'water' ? water?.name : feature === 'road' ? road?.name : feature === 'green' ? green?.name : null) || ({ water: 'Mapped water', building: 'Mapped building', road: 'Mapped road', green: 'Mapped green space', unmapped: 'Selected spot' } as const)[feature]
  return { ...coordinates, label: green?.name || (nearestStreet ? `Near ${nearestStreet}` : 'East Bay spot'), feature, featureName, nearestStreet }
}

export function climateAt(environment: SiteEnvironment, site: { latitude: number; longitude: number }) {
  return inPilot(site.latitude, site.longitude) ? environment.climate : null
}

// Outside the pilot, the nearest Bay Area reference point (within 30 km) stands in.
export function regionalClimateAt(environment: SiteEnvironment, site: { latitude: number; longitude: number }) {
  if (inPilot(site.latitude, site.longitude) || !environment.regional) return null
  const near = nearestReference(environment.regional, site)
  return near ? { ...near, source: environment.regional } : null
}

export function terrainAt(environment: SiteEnvironment, site: { latitude: number; longitude: number }): { elevation: number; slope: number | null } | null {
  const grid = environment.terrain
  const [west, south, east, north] = grid.bounds
  if (site.longitude < west || site.longitude > east || site.latitude < south || site.latitude > north) return null
  const col = Math.max(0, Math.min(grid.columns - 1, Math.round((site.longitude - west) / (east - west) * (grid.columns - 1))))
  const row = Math.max(0, Math.min(grid.rows - 1, Math.round((north - site.latitude) / (north - south) * (grid.rows - 1))))
  const at = (r: number, c: number) => grid.elevations[r * grid.columns + c]
  const elevation = at(row, col)
  if (elevation === null || !Number.isFinite(elevation)) return null
  const leftCol = Math.max(0, col - 1), rightCol = Math.min(grid.columns - 1, col + 1)
  const upperRow = Math.max(0, row - 1), lowerRow = Math.min(grid.rows - 1, row + 1)
  const left = at(row, leftCol), right = at(row, rightCol), top = at(upperRow, col), bottom = at(lowerRow, col)
  if ([left, right, top, bottom].some(value => value === null || !Number.isFinite(value))) return { elevation, slope: null }
  const dx = (east - west) / (grid.columns - 1) * 111_320 * Math.cos(site.latitude * Math.PI / 180) * (rightCol - leftCol)
  const dy = (north - south) / (grid.rows - 1) * 111_320 * (lowerRow - upperRow)
  return { elevation, slope: Math.hypot((right! - left!) / dx, (bottom! - top!) / dy) * 100 }
}

import { memo, useMemo } from 'react'
import { mapPoint } from '../community/geography.ts'
import type { NeighborhoodGeometry, RegionalPolygon } from './geography.ts'

type Point = number[]
const pathLine = (points: Point[]) => points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')
const overviewCities = ['Oakland', 'San Francisco', 'San Jose', 'Santa Rosa', 'Napa', 'San Rafael', 'Fremont', 'Vallejo', 'San Mateo', 'Concord', 'Livermore', 'Fairfield', 'Berkeley', 'Petaluma', 'Redwood City', 'Walnut Creek', 'Vacaville', 'Half Moon Bay', 'Gilroy']

export const RegionalBase = memo(function RegionalBase({ map, scale }: { map: NeighborhoodGeometry; scale: number }) {
  const region = map.region
  const paths = useMemo(() => {
    if (!region) return null
    const project = ([longitude, latitude]: Point) => mapPoint(map, { latitude, longitude })
    const polygons = (shapes: RegionalPolygon[]) => shapes.map(shape => shape.rings.map(ring => `${pathLine(ring.map(project))} Z`).join(' ')).join(' ')
    const [west, south, east, north] = region.dataBounds
    const [left, top] = project([west, north]), [right, bottom] = project([east, south])
    return {
      land: polygons(region.land), lakes: polygons(region.lakes), urban: polygons(region.urban),
      roads: region.roads.filter(road => road.kind !== 'Ferry').map(road => pathLine(road.points.map(project))).join(' '),
      left, top, width: right - left, height: bottom - top,
    }
  }, [map, region])
  if (!paths) return null
  return <g aria-hidden="true" className="regional-base">
    <rect x={paths.left} y={paths.top} width={paths.width} height={paths.height} fill="#acd0cf" />
    <path d={paths.land} fill="#e7ead4" fillRule="evenodd" stroke="#86ad99" strokeWidth={1.6 / scale} strokeLinejoin="round" />
    <path d={paths.urban} fill="#d8d2b5" fillRule="evenodd" opacity=".68" />
    <path d={paths.lakes} fill="#acd0cf" fillRule="evenodd" />
    <path d={paths.roads} fill="none" stroke="#c7b99b" strokeWidth={4.7 / scale} strokeLinejoin="round" strokeLinecap="round" />
    <path d={paths.roads} fill="none" stroke="#fff4dc" strokeWidth={2.6 / scale} strokeLinejoin="round" strokeLinecap="round" />
  </g>
})

export function RegionalLabels({ map, width, height, screenPoint, onCity, onOakland, compact, overview, picking, avoid = [] }: {
  map: NeighborhoodGeometry; width: number; height: number; screenPoint: (point: Point) => Point
  onCity: (point: Point) => void; onOakland: () => void; compact: boolean; overview: boolean; picking: boolean
  avoid?: { left: number; top: number; right: number; bottom: number }[]
}) {
  const fontSize = compact ? 16 : 18
  const occupied: { left: number; top: number; right: number; bottom: number }[] = [
    { left: width - 76, top: 0, right: width, bottom: compact ? 205 : 230 },
    ...(compact ? [{ left: 0, top: 0, right: width - 86, bottom: 65 }]
      : [{ left: width / 2 - 185, top: height - 98, right: width / 2 + 185, bottom: height }]),
    ...(picking ? [{ left: width - 175, top: height - 90, right: width, bottom: height }] : []),
    // Climate-layer chips (top left) and legend (bottom left).
    { left: 0, top: 0, right: 430, bottom: 64 }, { left: 0, top: height - 120, right: 300, bottom: height },
    ...avoid,
  ]
  const cities = map.region?.cities ?? []
  const priority = (name: string) => { const index = overviewCities.indexOf(name); return index < 0 ? overviewCities.length : index }
  const prioritized = cities.filter(city => !overview || overviewCities.includes(city.name))
    .sort((a, b) => priority(a.name) - priority(b.name) || b.population - a.population)
  const labels = []
  for (const city of prioritized) {
    const point = mapPoint(map, { latitude: city.coordinates[1], longitude: city.coordinates[0] })
    const [x, y] = screenPoint(point)
    if (x < 12 || x > width - 12 || y < 18 || y > height - 50) continue
    const oakland = city.name === 'Oakland'
    const name = oakland ? 'Oakland · 4 lessons' : city.name
    const labelWidth = name.length * fontSize * .55 + 24
    const positions = [[10, -18], [-labelWidth - 10, -18], [-labelWidth / 2, 14], [-labelWidth / 2, -52]]
    const chosen = positions.map(([dx, dy]) => ({ dx, dy, left: x + dx, top: y + dy, right: x + dx + labelWidth, bottom: y + dy + 37 }))
      .find(box => box.left >= 8 && box.right <= width - 8 && box.top >= 8 && box.bottom <= height - 48 && !occupied.some(other => box.left < other.right + 7 && box.right + 7 > other.left && box.top < other.bottom + 7 && box.bottom + 7 > other.top))
    if (!chosen) continue
    occupied.push(chosen)
    labels.push(<g key={city.name} className="regional-city" data-map-action={`city-${city.name}`} role="button" tabIndex={0} aria-label={oakland ? 'Explore Oakland learning places' : `Explore ${city.name}`} onClick={event => { event.stopPropagation(); oakland ? onOakland() : onCity(point) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); oakland ? onOakland() : onCity(point) } }}>
      <circle cx={x} cy={y} r={oakland ? 10 : 5} fill={oakland ? '#64814f' : '#698970'} stroke="#fffbee" strokeWidth="2" />
      <path d={`M${x} ${y} L${chosen.left + labelWidth / 2} ${chosen.top + 18}`} fill="none" stroke="#79917a" strokeWidth="1.3" />
      <rect x={chosen.left} y={chosen.top} width={labelWidth} height="37" rx="11" fill="#fffcef" stroke={oakland ? '#739059' : '#b4c4a3'} strokeWidth={oakland ? 2 : 1.2} />
      <text x={chosen.left + labelWidth / 2} y={chosen.top + 25} textAnchor="middle" fill="#3e6048" fontSize={fontSize} fontWeight={oakland ? 650 : 550}>{name}</text>
    </g>)
  }
  const waterLabels = [
    { name: 'Pacific Ocean', longitude: -123.25, latitude: 37.7 },
    { name: 'San Francisco Bay', longitude: -122.235, latitude: 37.64 },
    { name: 'San Pablo Bay', longitude: -122.405, latitude: 38.075 },
  ]
  return <g className="regional-labels">
    <g aria-hidden="true" fill="#467e83" fontSize={fontSize} fontStyle="italic" textAnchor="middle" stroke="#acd0cf" strokeWidth="5" paintOrder="stroke">
      {waterLabels.map(label => {
        const [x, y] = screenPoint(mapPoint(map, label))
        const half = label.name.length * fontSize * .26
        const overlaps = occupied.some(box => x + half > box.left && x - half < box.right && y + 5 > box.top && y - fontSize < box.bottom)
        return x > half + 12 && x < width - half - 12 && y > 35 && y < height - 40 && !overlaps ? <text key={label.name} x={x} y={y}>{label.name}</text> : null
      })}
    </g>
    {labels}
  </g>
}

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { ArrowRight, BookOpen, Check, Compass, Footprints, Globe2, Layers, MapPin, Minus, Plus, Scan, Sprout, Stamp, Users } from 'lucide-react'
import { Modal } from '../components/Modal.tsx'
import { useCommunity } from '../community/client.ts'
import { describeSite, geographicPoint, inPilot, mapPoint } from '../community/geography.ts'
import { emptyConditions } from '../community/plants.ts'
import { ProjectForm } from '../community/ProjectForm.tsx'
import { ProjectBoard, ProjectDetail } from '../community/Projects.tsx'
import { SiteCheck } from '../community/SiteCheck.tsx'
import type { GardenProject, PlantId, ProjectKind, SelectedSite, SiteConditions, SiteEnvironment } from '../community/types.ts'
import { FarmVignette, LibraryBuilding, ParkVignette, Person, Tree } from './Art.tsx'
import { GardenVignette } from './GardenArt.tsx'
import { hotspotOrder, placeById, places } from './content.ts'
import type { BayAreaGeometry, NeighborhoodGeometry } from './geography.ts'
import { bayAreaCamera, clampCamera, initialCamera, screenToWorld, startingScale, zoomCamera } from './map-camera.ts'
import type { Camera } from './map-camera.ts'
import { RegionalBase, RegionalLabels } from './RegionalMap.tsx'
import { ClimateGrid, ClimateLegend, layerKeys, layerStyles, PassportDialog, StopArt, StopCard, StopMarkers, usePassport } from './BayRegion.tsx'
import type { LayerId } from './BayRegion.tsx'
import { gridValue } from '../hub/climate.ts'
import type { BayClimate } from '../hub/climate.ts'
import { initialResources } from '../data/resources.ts'
import type { Resource } from '../types.ts'
import type { ExplorationState, PlaceId } from './types.ts'

type Point = number[]
type MapMode = 'explore' | 'check' | 'create'
type CommunityDialog = 'site' | 'create' | 'board' | 'project' | 'edit' | 'stop' | 'passport' | null
type Focus = { latitude: number; longitude: number } | null
const defaultKind = (resource: Resource): Resource['kind'] => resource.kind ?? (resource.category === 'Garden' ? 'garden' : 'learning')
// Regional stops: every mapped place outside the detailed Oakland pilot.
const bayStops = initialResources.filter(resource => resource.coordinates && !inPilot(resource.coordinates[0], resource.coordinates[1])).map(resource => ({ ...resource, kind: defaultKind(resource) }))
const line = (points: Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
const closedLine = (points: Point[]) => `${line(points)} Z`
const roadWidth = (kind: string) => kind === 'motorway' || kind === 'trunk' ? 22 : kind === 'secondary' || kind === 'tertiary' ? 14 : kind === 'residential' ? 9 : kind === 'footway' || kind === 'path' ? 3 : 6
const houseColors = ['#d4b9a3', '#d4c6a5', '#b9c9b8', '#c6b9af', '#b8c9c8', '#d5b7a0', '#c9cba9']
const namedStreets = ['Peralta Street', 'Adeline Street', 'Market Street', 'West Grand Avenue', 'San Pablo Avenue', 'Broadway', 'Grand Avenue', 'Lakeshore Avenue', '7th Avenue', 'Park Boulevard']

const MapBase = memo(function MapBase({ map, hidden }: { map: NeighborhoodGeometry; hidden: boolean }) {
  // Group the real footprints by roof color so the larger map stays responsive.
  const roofs = useMemo(() => houseColors.map((color, index) => ({
    color,
    path: map.buildings.filter(b => !['43919891', '25207153'].includes(b.id) && Number(b.id) % houseColors.length === index).map(b => closedLine(b.points)).join(' '),
  })), [map])
  const roads = useMemo(() => [...new Set(map.roads.map(r => r.kind))].map(kind => ({
    kind, path: map.roads.filter(r => r.kind === kind).map(r => line(r.points)).join(' '),
  })), [map])
  return <g className="world-base" aria-hidden="true" display={hidden ? 'none' : undefined}>
    <defs>
      <pattern id="ground-grain" width="39" height="39" patternUnits="userSpaceOnUse"><circle cx="8" cy="12" r=".8" fill="#a6b58d" opacity=".3" /><circle cx="29" cy="31" r=".9" fill="#a6b58d" opacity=".25" /></pattern>
      <pattern id="roof-lines" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><path d="M0 0 L0 12" stroke="#fff5dc" strokeWidth="1.3" opacity=".22" /></pattern>
      <clipPath id="world-clip"><rect width={map.width} height={map.height} rx="30" /></clipPath>
    </defs>
    <g clipPath="url(#world-clip)">
      <rect width={map.width} height={map.height} fill="#e7ead4" /><rect width={map.width} height={map.height} fill="url(#ground-grain)" />
      <g fill="#c5d5a5" stroke="#afc38e" strokeWidth="2">{map.greens.map(green => <path key={green.id} d={closedLine(green.points)} />)}</g>
      <g fill="#acd0cf" stroke="#84b4b5" strokeWidth="2">{map.water.map(shape => <path key={shape.id} d={closedLine(shape.points)} />)}</g>
      <g fill="#c9d1ab" stroke="#acbb95" strokeWidth="2">{map.pitches.map(shape => <path key={shape.id} d={closedLine(shape.points)} />)}</g>
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        {roads.map(road => <path key={`edge-${road.kind}`} d={road.path} stroke="#d0c7ac" strokeWidth={roadWidth(road.kind) + 3} />)}
        {roads.map(road => <path key={road.kind} d={road.path} stroke={road.kind === 'motorway' ? '#ddd9c2' : '#faf4df'} strokeWidth={roadWidth(road.kind)} />)}
      </g>
      <g strokeLinejoin="round">{roofs.map(roof => <g key={roof.color}><path d={roof.path} transform="translate(2 4)" fill="#8e8871" opacity=".22" /><path d={roof.path} fill={roof.color} stroke="#b2a18a" strokeWidth="1.1" /><path d={roof.path} fill="url(#roof-lines)" /></g>)}</g>
      {map.trees.filter((_, i) => i % 4 === 0).map(([x, y], i) => <Tree key={i} x={x} y={y} scale={.24 + i % 3 * .02} variant={i % 4} />)}
    </g>
  </g>
})

function PlaceDrawing({ id, point, visited, completed, onVisit, disabled, compact, canvasWidth }: { id: PlaceId; point: Point; visited: boolean; completed: number; onVisit: (id: PlaceId) => void; disabled: boolean; compact: boolean; canvasWidth: number }) {
  const place = placeById[id]
  const [x, y] = point
  const artOffset = compact ? id === 'farm' ? [0, -65] : id === 'park' ? [-14, 36] : id === 'library' ? [105, -80] : [0, 8]
    : id === 'park' ? [-24, 24] : id === 'library' ? [76, -30] : [0, 0]
  const labelOffset = compact ? id === 'farm' ? [12, -20] : id === 'park' ? [10, 85] : id === 'library' ? [118, -25] : [0, 59]
    : id === 'park' ? [-42, 80] : id === 'library' ? [105, 27] : [0, 48]
  const name = compact ? place.shortName.replace('The library', 'Library') : place.name
  const width = compact ? id === 'park' ? 170 : id === 'library' ? 125 : id === 'gravity' ? 177 : 147 : id === 'farm' ? 270 : id === 'library' ? 254 : 195
  const labelX = Math.max(width / 2 + 12, Math.min(canvasWidth - width / 2 - 12, x + labelOffset[0]))
  const labelY = y + labelOffset[1]
  const artX = compact ? Math.max(60, Math.min(canvasWidth - 65, x + artOffset[0])) : x + artOffset[0]
  const artY = y + artOffset[1]
  return <g className={`world-destination ${visited ? 'visited' : ''}`} data-destination={id} onClick={event => { event.stopPropagation(); if (!disabled) onVisit(id) }}>
    <path d={`M${x} ${y} L${artX} ${artY} M${x} ${y} Q${labelX} ${y + 30} ${labelX} ${labelY}`} fill="none" stroke="#637f52" strokeWidth="1.8" strokeDasharray="4 3" pointerEvents="none" />
    <circle cx={x} cy={y} r="5" fill="#496c47" stroke="#fffbee" strokeWidth="2" />
    <g transform={`translate(${artX} ${artY})`}>
      <ellipse className="destination-glow" rx={compact ? 58 : 79} ry={compact ? 24 : 33} fill="#fff5c9" opacity=".9" stroke="#d5bd7a" strokeWidth="1.5" />
      <g className="destination-art" transform={`scale(${compact ? .57 : .79})`}>{id === 'farm' ? <FarmVignette /> : id === 'park' ? <ParkVignette /> : id === 'gravity' ? <GardenVignette /> : <LibraryBuilding />}</g>
    </g>
    <g transform={`translate(${labelX} ${labelY})`} className="destination-sign" role="button" tabIndex={disabled ? -1 : 0} aria-label={`Visit ${place.name}`} aria-disabled={disabled} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!disabled) onVisit(id) } }}>
      <rect x={-width / 2 + 2} y="3" width={width} height="43" rx="13" fill="#5c6f48" opacity=".17" /><rect x={-width / 2} width={width} height="43" rx="13" fill="#fffcef" stroke="#a5b78b" strokeWidth="1.5" />
      <circle cx={-width / 2 + 20} cy="21" r="10" fill={completed === place.hotspots.length ? '#66874f' : '#e8d4a1'} />
      <text x={-width / 2 + 20} y="26" textAnchor="middle" fill={completed === place.hotspots.length ? '#fff' : '#735d36'} fontSize="14" fontWeight="700">{completed === place.hotspots.length ? '✓' : places.indexOf(place) + 1}</text>
      <text x="12" y="27" textAnchor="middle" fill="#345a3d" fontSize={compact ? 16 : 18} fontWeight="650">{name}</text>
    </g>
  </g>
}

function EastBayMap({ map, state, location, travel, onVisit, mode, selected, projects, selectedProjectId, onChoose, onReopen, onProject, onRegionalView, climate, layer, onLayer, stops, visitedStops, onStop, focus, onViewChange }: {
  map: NeighborhoodGeometry; state: ExplorationState; location: PlaceId; travel: PlaceId | null; onVisit: (id: PlaceId) => void
  mode: MapMode; selected: SelectedSite | null; projects: GardenProject[]; selectedProjectId: string | null
  onChoose: (point: Point, place?: PlaceId) => void; onReopen: () => void; onProject: (id: string) => void
  onRegionalView: (regional: boolean) => void
  climate: BayClimate | null; layer: LayerId | null; onLayer: (layer: LayerId | null) => void
  stops: Resource[]; visitedStops: string[]; onStop: (stop: Resource) => void; focus: Focus
  onViewChange: (view: { center: { latitude: number; longitude: number } | null; zoom: number; west: number; east: number; north: number; south: number }) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const pan = useRef<{ x: number; y: number; camera: Camera; pointer: number; moved: boolean } | null>(null)
  const [viewport, setViewport] = useState({ width: 1200, height: 740 })
  const [camera, setCamera] = useState(() => {
    if (!focus) return initialCamera(map)
    const [x, y] = mapPoint(map, focus)
    return inPilot(focus.latitude, focus.longitude) ? { zoom: 1.5, x, y } : { zoom: .35, x, y }
  })
  const [hoveredStop, setHoveredStop] = useState<string | null>(null)
  const [readout, setReadout] = useState<{ x: number; y: number; text: string } | null>(null)
  const focusedProject = useRef<string | null>(null)
  useEffect(() => {
    const element = svg.current!
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const compact = viewport.width < 650
  const center = geographicPoint(map, [camera.x, camera.y])
  const regionalView = Boolean(map.region && (camera.zoom < .7 || center && !inPilot(center.latitude, center.longitude)))
  const minimumZoom = map.region ? bayAreaCamera(map, viewport).zoom : 1
  const scale = startingScale(map, viewport) * camera.zoom
  const tx = viewport.width / 2 - camera.x * scale
  const ty = viewport.height / 2 - camera.y * scale
  const screenPoint = ([x, y]: Point) => [tx + x * scale, ty + y * scale]
  const zoom = (direction: number) => setCamera(current => zoomCamera(map, viewport, current, direction))
  const restoreOakland = () => setCamera(initialCamera(map))
  useEffect(() => { onRegionalView(regionalView) }, [regionalView, onRegionalView])
  useEffect(() => {
    const halfW = viewport.width / 2 / scale, halfH = viewport.height / 2 / scale
    const [west, south, east, north] = map.bounds
    const lon = (x: number) => west + (x - 65) / (map.width - 130) * (east - west), lat = (y: number) => north - (y - 50) / (map.height - 100) * (north - south)
    onViewChange({ center, zoom: camera.zoom, west: lon(camera.x - halfW), east: lon(camera.x + halfW), north: lat(camera.y - halfH), south: lat(camera.y + halfH) })
  }, [camera.x, camera.y, camera.zoom, viewport.width, viewport.height])
  useEffect(() => { if (layer && map.region && camera.zoom >= .7) setCamera(bayAreaCamera(map, viewport)) }, [layer, Boolean(map.region)])
  useEffect(() => { setCamera(current => clampCamera(map, viewport, current)) }, [map, viewport])
  useEffect(() => { if (travel) setCamera(initialCamera(map)) }, [travel, map])
  useEffect(() => {
    if (!selectedProjectId) { focusedProject.current = null; return }
    if (selectedProjectId === focusedProject.current) return
    const project = projects.find(item => item.id === selectedProjectId)
    if (!project || !map.region) return
    focusedProject.current = selectedProjectId
    if (!inPilot(project.site.latitude, project.site.longitude)) {
      const [x, y] = mapPoint(map, project.site)
      setCamera(clampCamera(map, viewport, { zoom: .35, x, y }))
    }
  }, [selectedProjectId, projects, map, viewport])
  const finishPan = (event: PointerEvent<SVGSVGElement>, cancelled = false) => {
    if (pan.current?.pointer !== event.pointerId) return
    const picked = !pan.current.moved && !cancelled && !travel
    pan.current = null
    if (svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId)
    if (picked && svg.current) {
      const bounds = svg.current.getBoundingClientRect()
      onChoose(screenToWorld(map, viewport, camera, [(event.clientX - bounds.left) * viewport.width / bounds.width, (event.clientY - bounds.top) * viewport.height / bounds.height]))
    }
  }
  const route = travel && travel !== location ? map.routes[`${location}-${travel}`] : null
  const routePath = route ? line(route) : null
  const arrival = map.anchors[location]?.arrival
  const streetLabels = useMemo(() => namedStreets.map(name => map.roads.filter(road => road.name === name).sort((a, b) => {
    const distance = (ps: Point[]) => ps.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - ps[i][0], p[1] - ps[i][1]), 0)
    return distance(b.points) - distance(a.points)
  })[0]).filter(Boolean), [map])
  const lake = map.water.find(shape => shape.name === 'Lake Merritt')
  const lakePoint = lake ? [lake.points.reduce((sum, p) => sum + p[0], 0) / lake.points.length, lake.points.reduce((sum, p) => sum + p[1], 0) / lake.points.length] : null
  const selectedPoint = selected ? screenPoint(mapPoint(map, selected)) : null
  return <div className={`neighborhood-canvas map-mode-${mode}`}>
    <p className="sr-only" id="map-picking-help">Tap an empty spot for a plant check. Drag to pan. Zoom out or use the globe to see the Bay Area; the frame returns to Oakland. Arrow keys move the map; Enter chooses its center. Garden pins open neighborhood projects.</p>
    <svg ref={svg} tabIndex={0} viewBox={`0 0 ${viewport.width} ${viewport.height}`} className="neighborhood-svg" role="group" aria-label={regionalView ? 'Interactive cartoon map of the Bay Area' : 'Interactive cartoon map of East Bay: West Oakland, Lake Merritt, and Ivy Hill'} aria-describedby="map-picking-help" onKeyDown={event => {
      if (event.target !== svg.current || travel) return
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onChoose([camera.x, camera.y]); return }
      if (event.key === '+' || event.key === '=' || event.key === '-') { event.preventDefault(); zoom(event.key === '-' ? -1 : 1); return }
      const movement: Record<string, Point> = { ArrowLeft: [-90, 0], ArrowRight: [90, 0], ArrowUp: [0, -90], ArrowDown: [0, 90] }
      if (movement[event.key]) { event.preventDefault(); const [dx, dy] = movement[event.key]; setCamera(current => clampCamera(map, viewport, { ...current, x: current.x + dx / scale, y: current.y + dy / scale })) }
    }} onPointerDown={event => {
      if ((event.target as Element).closest('[data-destination], [data-map-action]') || event.button !== 0 || travel) return
      pan.current = { x: event.clientX, y: event.clientY, camera, pointer: event.pointerId, moved: false }
      svg.current!.setPointerCapture(event.pointerId)
    }} onPointerMove={event => {
      if (!pan.current && layer && climate && regionalView && svg.current) {
        const bounds = svg.current.getBoundingClientRect()
        const sx = (event.clientX - bounds.left) * viewport.width / bounds.width, sy = (event.clientY - bounds.top) * viewport.height / bounds.height
        const where = geographicPoint(map, screenToWorld(map, viewport, camera, [sx, sy]))
        const raw = where ? gridValue(climate, layerKeys[layer], where) : null
        setReadout(raw === null ? null : { x: sx, y: sy, text: `${layerStyles[layer].short}: ${layerStyles[layer].unit(layerStyles[layer].toDisplay(raw))}` })
      }
      if (!pan.current || pan.current.pointer !== event.pointerId) return
      const start = pan.current
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 7 && !start.moved) return
      start.moved = true
      setCamera(clampCamera(map, viewport, { ...start.camera, x: start.camera.x - (event.clientX - start.x) / scale, y: start.camera.y - (event.clientY - start.y) / scale }))
    }} onPointerUp={event => finishPan(event)} onPointerCancel={event => finishPan(event, true)} onPointerLeave={() => setReadout(null)}>
      <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
        <RegionalBase map={map} scale={scale} />
        {climate && layer && regionalView && <ClimateGrid map={map} climate={climate} layer={layer} />}
        <MapBase map={map} hidden={camera.zoom < .7} />
        {routePath && <path d={routePath} fill="none" stroke="#9e7f3c" strokeWidth={3 / scale} strokeDasharray={`${5 / scale} ${6 / scale}`} opacity=".9" />}
        {routePath ? <g key={travel} className="map-walker"><Person scale={.6 / scale} walking /><animateMotion path={routePath} dur="1.3s" fill="freeze" /></g> : !regionalView && arrival && <Person x={arrival[0]} y={arrival[1]} scale={.55 / scale} />}
      </g>
      <g aria-hidden="true" className="map-labels" fill="#5f7353" fontSize={compact ? 15 : 19} fontWeight="600" stroke="#edf0dc" strokeWidth="5" paintOrder="stroke" textAnchor="middle">
        {!regionalView && !compact && camera.zoom < 2 && <><text x={screenPoint([300, 550])[0]} y={screenPoint([300, 550])[1]}>West Oakland</text><text x={screenPoint([2220, 940])[0]} y={screenPoint([2220, 940])[1]}>Ivy Hill</text></>}
        {!regionalView && lakePoint && (!compact || camera.zoom >= 2) && <text x={screenPoint(lakePoint)[0]} y={screenPoint(lakePoint)[1]} fill="#39767e" stroke="#acd0cf">Lake Merritt</text>}
      </g>
      {camera.zoom >= 2 && <g aria-hidden="true" fill="#5b6756" fontSize="15" fontWeight="550" stroke="#fcf7e5" strokeWidth="4" paintOrder="stroke" textAnchor="middle">{streetLabels.map(road => {
        const start = screenPoint(road.points[0]), end = screenPoint(road.points.at(-1)!)
        if (Math.hypot(end[0] - start[0], end[1] - start[1]) < 150) return null
        let angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI
        if (angle > 90) angle -= 180
        if (angle < -90) angle += 180
        const [x, y] = screenPoint(road.points[Math.floor(road.points.length / 2)])
        return <text key={road.id} x={x} y={y} transform={`rotate(${angle} ${x} ${y})`}>{road.name.replace(' Street', ' St').replace(' Avenue', ' Ave')}</text>
      })}</g>}
      {regionalView && <RegionalLabels avoid={stops.flatMap(stop => { const [x, y] = screenPoint(mapPoint(map, { latitude: stop.coordinates![0], longitude: stop.coordinates![1] })); return [{ left: x - 24, top: y - 24, right: x + 24, bottom: y + 24 }] })} map={map} width={viewport.width} height={viewport.height} screenPoint={screenPoint} compact={compact} overview={camera.zoom < .12} picking={mode !== 'explore'} onOakland={restoreOakland} onCity={point => setCamera(clampCamera(map, viewport, { zoom: .35, x: point[0], y: point[1] }))} />}
      {regionalView && <StopMarkers map={map} stops={stops} screenPoint={screenPoint} width={viewport.width} height={viewport.height} zoom={camera.zoom} visited={visitedStops} hovered={hoveredStop} onHover={setHoveredStop} onOpen={onStop} disabled={Boolean(travel) || mode !== 'explore'} />}
      {readout && <g className="climate-readout" transform={`translate(${Math.min(viewport.width - 190, readout.x + 14)} ${Math.max(10, readout.y - 40)})`} pointerEvents="none"><rect width={readout.text.length * 7.2 + 20} height="28" rx="8" fill="#263e2e" opacity=".9" /><text x="10" y="19" fill="#f5f7ec" fontSize="13" fontWeight="600">{readout.text}</text></g>}
      {!regionalView && places.map(place => {
        const anchor = map.anchors[place.id]
        if (!anchor) return null
        const point = screenPoint(anchor.point)
        if (point[0] < -80 || point[0] > viewport.width + 80 || point[1] < -80 || point[1] > viewport.height + 40) return null
        return <PlaceDrawing key={place.id} id={place.id} point={point} compact={compact} canvasWidth={viewport.width} visited={state.visited.includes(place.id)} completed={place.hotspots.filter(id => state.entries[id]).length} onVisit={id => mode === 'explore' ? onVisit(id) : onChoose(map.anchors[id]!.point, id)} disabled={Boolean(travel)} />
      })}
      {projects.map(project => {
        const [x, y] = screenPoint(mapPoint(map, project.site))
        if (x < -40 || x > viewport.width + 40 || y < -40 || y > viewport.height + 50) return null
        return <g key={project.id} className={`project-pin ${project.id === selectedProjectId ? 'active' : ''} ${project.status === 'closed' ? 'closed' : ''}`} transform={`translate(${x} ${y})`} data-map-action={project.id} role="button" tabIndex={travel ? -1 : 0} aria-label={`Open garden project: ${project.title}`} onClick={event => { event.stopPropagation(); if (!travel) onProject(project.id) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (!travel) onProject(project.id) } }}>
          <title>{project.title} · {project.members.length}/{project.volunteersNeeded} volunteers</title>
          <path d="M0 2 L-10 -15 L10 -15Z" fill="#416b50" stroke="#fffbed" strokeWidth="2" />
          <circle cy="-29" r="21" fill={project.status === 'closed' ? '#8a9178' : '#416b50'} stroke="#fffbed" strokeWidth="3" />
          <path d="M0 -17 L0 -31 M0 -25 Q-15 -24 -12 -37 Q0 -36 0 -25 M0 -29 Q11 -42 14 -33 Q14 -24 0 -27" fill="#c2d697" stroke="#dce7bb" strokeWidth="1.5" />
          <g className="project-pin-label"><rect x="-112" y="-80" width="224" height="36" rx="10" fill="#fffbee" stroke="#91a177" /><text y="-57" textAnchor="middle" fill="#34533c" fontSize="16" fontWeight="600">{project.title.length > 24 ? `${project.title.slice(0, 23)}…` : project.title}</text></g>
        </g>
      })}
      {selectedPoint && <g className="selected-site-pin" transform={`translate(${selectedPoint[0]} ${selectedPoint[1]})`} data-map-action="selected-site" role="button" tabIndex={travel ? -1 : 0} aria-label="Reopen selected spot planting check" onClick={event => { event.stopPropagation(); if (!travel) onReopen() }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (!travel) onReopen() } }}><circle r="26" fill="#e9cc7a" opacity=".35" /><circle r="10" fill="#d6a550" stroke="#fffbed" strokeWidth="3" /><path d="M0 -19 V-29 M0 19 V29 M-19 0 H-29 M19 0 H29" stroke="#986d32" strokeWidth="2.5" strokeLinecap="round" /></g>}
      {mode !== 'explore' && <g className="map-center-target" transform={`translate(${viewport.width / 2} ${viewport.height / 2})`} aria-hidden="true"><circle r="12" /><path d="M-19 0 H-6 M6 0 H19 M0 -19 V-6 M0 6 V19" /></g>}
    </svg>
    <div className="map-layers" role="group" aria-label="Climate layer"><span><Layers size={16} />Climate</span>{([null, 'summer', 'rain', 'frost'] as const).map(id => <button key={id ?? 'off'} aria-pressed={layer === id} disabled={Boolean(travel) || (id !== null && !climate)} onClick={() => onLayer(id)}>{id ? layerStyles[id].short : 'Off'}</button>)}</div>
    {climate && layer && regionalView && <ClimateLegend layer={layer} climate={climate} />}
    <div className="map-zoom" role="group" aria-label="Map controls"><button aria-label="Zoom in map" title="Zoom in" onClick={() => zoom(1)} disabled={Boolean(travel) || camera.zoom >= 6}><Plus size={22} /></button><button aria-label="Zoom out map" title="Zoom out" onClick={() => zoom(-1)} disabled={Boolean(travel) || camera.zoom <= minimumZoom + 1e-9}><Minus size={22} /></button><button aria-label="Show whole Bay Area" title={map.region ? 'Whole Bay Area' : 'Loading Bay Area…'} disabled={!map.region || Boolean(travel)} onClick={() => setCamera(bayAreaCamera(map, viewport))}><Globe2 size={22} /></button><button aria-label="Show whole East Bay" title="Back to Oakland" disabled={Boolean(travel)} onClick={restoreOakland}><Scan size={21} /></button></div>
    <div className="map-play-hint" role="status">{travel ? <><Footprints size={18} />To {placeById[travel].shortName}…</> : mode === 'create' ? <><Sprout size={18} />Tap your garden spot</> : mode === 'check' ? <><MapPin size={18} />Tap a spot to check</> : <><Compass size={18} />{compact ? 'Tap & drag' : regionalView ? 'Tap a city or spot · drag to explore' : 'Tap a place or spot · drag to explore'}</>}</div>
    {mode !== 'explore' && <button className="pick-map-center" disabled={Boolean(travel)} onClick={() => onChoose([camera.x, camera.y])}><MapPin size={18} />Choose center</button>}
    <div className="world-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>{map.region && <><span> · </span><a href={map.region.source.url} target="_blank" rel="noreferrer">Natural Earth</a></>}</div>
  </div>
}

export function World({ state, location, travel, onVisit, onJournal, onHow, selectedProjectId, onProjectChange, onNotice, initialFocus = null, initialMode = null, initialLayer = null }: {
  state: ExplorationState; location: PlaceId; travel: PlaceId | null; onVisit: (id: PlaceId) => void; onJournal: () => void; onHow: () => void
  selectedProjectId: string | null; onProjectChange: (id: string | null) => void; onNotice: (text: string, error?: boolean) => void
  initialFocus?: Focus; initialMode?: 'create' | 'check' | null; initialLayer?: LayerId | null
}) {
  const [localMap, setMap] = useState<NeighborhoodGeometry | null>(null)
  const [region, setRegion] = useState<BayAreaGeometry | null>(null)
  const [regionalView, setRegionalView] = useState(false)
  const [regionError, setRegionError] = useState(false)
  const [regionAttempt, setRegionAttempt] = useState(0)
  const map = useMemo(() => localMap ? { ...localMap, ...(region ? { region } : {}) } : null, [localMap, region])
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const client = useCommunity()
  const [baseEnvironment, setEnvironment] = useState<SiteEnvironment | null>(null)
  const [climate, setClimate] = useState<BayClimate | null>(null)
  const environment = useMemo(() => baseEnvironment && climate ? { ...baseEnvironment, regional: climate } : baseEnvironment, [baseEnvironment, climate])
  const [layer, setLayer] = useState<LayerId | null>(initialLayer)
  const [passport, setPassport] = usePassport()
  const [activeStop, setActiveStop] = useState<Resource | null>(null)
  const [view, setView] = useState<{ center: { latitude: number; longitude: number } | null; west: number; east: number; north: number; south: number } | null>(null)
  const [mode, setMode] = useState<MapMode>(initialMode ?? 'explore')
  const [communityDialog, setCommunityDialog] = useState<CommunityDialog>(selectedProjectId ? 'project' : null)
  const [site, setSite] = useState<SelectedSite | null>(null)
  const [conditions, setConditions] = useState<SiteConditions>(emptyConditions)
  const [selectedPlants, setSelectedPlants] = useState<PlantId[]>([])
  const [newKind, setNewKind] = useState<ProjectKind>('new-garden')
  const [editingProject, setEditingProject] = useState<GardenProject | null>(null)
  const project = client.projects.find(item => item.id === selectedProjectId)
  useEffect(() => { if (selectedProjectId) setCommunityDialog('project') }, [selectedProjectId])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/site-environment.json', { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Site data unavailable'); return response.json() as Promise<SiteEnvironment> }).then(setEnvironment).catch(() => undefined)
    fetch('/data/bay-area-climate.json', { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Climate data unavailable'); return response.json() as Promise<BayClimate> }).then(setClimate).catch(() => undefined)
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!communityDialog) return
    const frame = window.requestAnimationFrame(() => {
      const modal = document.querySelector<HTMLDialogElement>('dialog:has(.community-dialog)')
      modal?.scrollTo({ top: 0 })
      const heading = modal?.querySelector<HTMLElement>('h2')
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [communityDialog, selectedProjectId])
  useEffect(() => {
    const controller = new AbortController()
    setError(false)
    fetch('/data/east-bay-map.json', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Map unavailable')
      return response.json() as Promise<NeighborhoodGeometry>
    }).then(setMap).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => {
    const controller = new AbortController()
    setRegionError(false)
    fetch('/data/bay-area-map.json', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Regional map unavailable')
      return response.json() as Promise<BayAreaGeometry>
    }).then(setRegion).catch(() => { if (!controller.signal.aborted) setRegionError(true) })
    return () => controller.abort()
  }, [regionAttempt])
  const closeCommunity = () => { setCommunityDialog(null); onProjectChange(null); setActiveStop(null) }
  const openStop = (stop: Resource) => { onProjectChange(null); setActiveStop(stop); setCommunityDialog('stop') }
  const stamps = Object.keys(passport.stamps).length
  const inView = view ? bayStops.filter(stop => { const [lat, lon] = stop.coordinates!; return lat <= view.north && lat >= view.south && lon >= view.west && lon <= view.east }) : bayStops
  const nearby = view?.center ? [...inView].sort((a, b) => Math.hypot(a.coordinates![0] - view.center!.latitude, a.coordinates![1] - view.center!.longitude) - Math.hypot(b.coordinates![0] - view.center!.latitude, b.coordinates![1] - view.center!.longitude)) : inView
  const openProject = (id: string) => { onProjectChange(id); setCommunityDialog('project') }
  const openBoard = () => { onProjectChange(null); setCommunityDialog('board') }
  const choose = (point: Point, place?: PlaceId) => {
    if (!map) return
    const coordinates = geographicPoint(map, point)
    if (!coordinates) { onNotice('Choose a spot inside the mapped area.'); return }
    const picked = describeSite(map, coordinates)
    if (place) picked.label = placeById[place].name
    setSite(picked); setConditions(emptyConditions()); setSelectedPlants([])
    setNewKind(place === 'farm' || place === 'gravity' ? 'revive-garden' : 'new-garden')
    onProjectChange(null)
    setCommunityDialog(mode === 'create' ? 'create' : 'site')
  }
  const pickMode = (next: MapMode) => {
    closeCommunity(); setMode(next)
    if (next === 'create') { setSite(null); onNotice('Tap a spot for your garden.') }
  }
  const savedProject = (saved: GardenProject) => { setMode('explore'); setSite(null); setEditingProject(null); openProject(saved.id); onNotice(editingProject ? 'Garden plan updated.' : 'Your garden idea is on the map.') }
  const count = Object.keys(state.entries).length
  return <div className="exploration-world">
    <section className="explore-hero"><div><h1>{regionalView ? <>Bay <em>Area.</em></> : <>Oakland, <em>up close.</em></>}</h1><p>{regionalView ? `${bayStops.length + places.length} places across nine counties. Tap one to visit.` : 'Four playable places. Zoom out for the whole Bay Area.'}</p></div><div className="hero-pills"><button className="journal-pill passport-pill" onClick={() => { onProjectChange(null); setCommunityDialog('passport') }}><Stamp size={24} /><span><strong>Field stamps</strong><small>{stamps}/5 climate zones</small></span><ArrowRight size={19} /></button><button className="journal-pill" onClick={onJournal}><BookOpen size={24} /><span><strong>My journal</strong><small>{count}/{hotspotOrder.length} discoveries</small></span><ArrowRight size={19} /></button></div></section>
    <div className="world-toolbar" role="group" aria-label="Explore, check, and grow"><div className="world-modes"><button aria-pressed={mode === 'explore'} disabled={Boolean(travel)} onClick={() => pickMode('explore')}><Compass size={20} />Explore</button><button aria-pressed={mode === 'check'} disabled={Boolean(travel)} onClick={() => pickMode('check')}><MapPin size={20} />Check a spot</button><button aria-pressed={mode === 'create'} disabled={Boolean(travel)} onClick={() => pickMode('create')}><Sprout size={21} />Start a garden</button></div><button className="world-projects-button" aria-label="Garden projects" disabled={Boolean(travel)} onClick={openBoard}><Users size={21} />Projects <span>{client.loading ? '…' : client.error ? '?' : client.projects.length}</span></button></div>
    <section className="world-panel" aria-label={regionalView ? 'Explore the Bay Area' : 'Explore East Bay'}>
      {map ? <EastBayMap map={map} state={state} location={location} travel={travel} onVisit={onVisit} mode={mode} selected={site} projects={client.projects} selectedProjectId={selectedProjectId} onChoose={choose} onReopen={() => setCommunityDialog('site')} onProject={openProject} onRegionalView={setRegionalView} climate={climate} layer={layer} onLayer={setLayer} stops={bayStops} visitedStops={passport.visited} onStop={openStop} focus={initialFocus} onViewChange={setView} /> : <div className="neighborhood-canvas view-loading" role="status">{error ? <><p>Map couldn’t load.</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></> : 'Opening East Bay…'}</div>}
    </section>
    {regionError && <p className="regional-map-error" role="status">Bay Area overview couldn’t load. <button onClick={() => setRegionAttempt(value => value + 1)}>Retry overview</button></p>}
    <p className="world-community-note">{client.error ? <><span role="status">Garden projects couldn’t refresh.</span><button onClick={() => { void client.refresh() }}>Retry</button></> : <><Sprout size={17} />Projects shared locally · Pins are proposals</>}</p>
    {regionalView ? <section className="stop-strip" aria-label="Places in view">
      <div className="stop-strip-head"><h2>{inView.length ? <>In view <em>({inView.length})</em></> : 'Pan the map to find places'}</h2><span>Closest to the map’s center first</span></div>
      <div className="stop-strip-row">{nearby.slice(0, 12).map(stop => <button key={stop.id} className={`stop-chip ${passport.visited.includes(stop.id) ? 'visited' : ''}`} disabled={Boolean(travel)} onClick={() => openStop(stop)}><StopArt kind={stop.kind} size={46} /><span><strong>{stop.name}</strong><small>{stop.city}{passport.visited.includes(stop.id) ? ' · visited' : ''}</small></span></button>)}</div>
    </section> : <nav className="destination-list" aria-label="Places to visit">{places.map(place => {
      const found = place.hotspots.filter(id => state.entries[id]).length
      return <button key={place.id} className={`destination-card ${found === place.hotspots.length ? 'done' : ''}`} disabled={Boolean(travel)} onClick={() => onVisit(place.id)}>
        <span className="destination-card-art"><svg viewBox="-118 -120 236 170" aria-hidden="true">{place.id === 'farm' ? <FarmVignette small /> : place.id === 'park' ? <ParkVignette /> : place.id === 'gravity' ? <GardenVignette /> : <LibraryBuilding scale={1.3} />}</svg></span>
        <strong>{place.shortName}</strong><span className="destination-count">{found === place.hotspots.length ? <Check size={18} /> : `${found}/${place.hotspots.length}`}</span>
      </button>
    })}</nav>}
    <button className="map-how text-button" onClick={onHow}>How to play <ArrowRight size={17} /></button>
    {communityDialog && <Modal title={communityDialog === 'stop' ? activeStop?.name ?? 'Place' : communityDialog === 'passport' ? 'Field stamps' : communityDialog === 'site' ? 'Planting check' : communityDialog === 'board' ? 'Garden projects' : communityDialog === 'create' ? 'Start a garden' : communityDialog === 'edit' ? 'Edit garden project' : 'Garden project'} wide onClose={closeCommunity}>
      {communityDialog === 'stop' && activeStop && <StopCard key={activeStop.id} stop={activeStop} climate={climate} passport={passport} onPassport={setPassport} onCheck={() => { const [latitude, longitude] = activeStop.coordinates!; if (!map) return; const picked = describeSite(map, { latitude, longitude }); picked.label = activeStop.name; setSite(picked); setConditions(emptyConditions()); setSelectedPlants([]); setNewKind('new-garden'); setCommunityDialog('site') }} />}
      {communityDialog === 'passport' && <PassportDialog passport={passport} stops={bayStops} climate={climate} onOpen={openStop} />}
      {communityDialog === 'site' && site && <SiteCheck site={site} environment={environment} conditions={conditions} selected={selectedPlants} onConditions={setConditions} onSelected={setSelectedPlants} onStart={() => setCommunityDialog('create')} />}
      {communityDialog === 'create' && site && <ProjectForm site={site} conditions={conditions} selected={selectedPlants} kind={newKind} visitorName={client.visitorName} client={client} onSaved={savedProject} onBack={() => setCommunityDialog('site')} />}
      {communityDialog === 'edit' && editingProject && <ProjectForm key={editingProject.id} site={editingProject.site} conditions={editingProject.conditions} selected={editingProject.plants} existing={editingProject} visitorName={client.visitorName} client={client} onSaved={savedProject} onBack={() => setCommunityDialog('project')} />}
      {communityDialog === 'board' && <ProjectBoard client={client} onOpen={openProject} onStart={() => pickMode('create')} />}
      {communityDialog === 'project' && (project ? <ProjectDetail key={project.id} project={project} environment={environment} client={client} onEdit={() => { setEditingProject(structuredClone(project)); setCommunityDialog('edit') }} onBoard={openBoard} onSiteCheck={() => { setSite(project.site); setConditions(emptyConditions()); setSelectedPlants(project.plants); setCommunityDialog('site'); onProjectChange(null) }} onNotice={onNotice} /> : <div className="community-dialog"><h2>{client.loading ? 'Opening the garden…' : client.error ? 'Projects couldn’t load.' : 'Project not found.'}</h2>{client.error && <p className="community-error" role="alert">{client.error}</p>}<button className="button button-secondary" onClick={client.error ? () => { void client.refresh() } : openBoard}>{client.error ? 'Try again' : 'Garden projects'}</button></div>)}
    </Modal>}
  </div>
}

// Builds src/data/bay-area-climate.json: monthly climate for 30 Bay Area reference points
// (Open-Meteo ERA5-Land, 2021–2025) plus an interpolated land grid for the map's climate layers.
// Raw downloads are cached in scripts/data/; pass --refresh to download again.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = fileURLToPath(new URL('../', import.meta.url))
const refresh = process.argv.includes('--refresh')
const start = '2021-01-01', end = '2025-12-31', years = 5

// Representative towns chosen to cover fog-belt coast, bayside, warm valleys, hot interior, and hills.
export const references = [
  ['Bodega Bay', 38.333, -123.048, 'coast'], ['Point Reyes Station', 38.069, -122.806, 'coast'], ['Pacifica', 37.614, -122.487, 'coast'],
  ['Outer Sunset, SF', 37.753, -122.495, 'coast'], ['Half Moon Bay', 37.464, -122.429, 'coast'], ['Pescadero', 37.255, -122.383, 'coast'],
  ['Santa Cruz', 36.974, -122.031, 'coast'],
  ['Mission District, SF', 37.76, -122.415, 'bay'], ['Oakland', 37.804, -122.271, 'bay'], ['Richmond', 37.936, -122.348, 'bay'],
  ['San Mateo', 37.563, -122.323, 'bay'], ['Palo Alto', 37.442, -122.143, 'bay'], ['Fremont', 37.548, -121.989, 'bay'],
  ['San Rafael', 37.974, -122.531, 'bay'], ['Vallejo', 38.104, -122.256, 'bay'],
  ['Petaluma', 38.232, -122.637, 'valley'], ['Santa Rosa', 38.44, -122.714, 'valley'], ['Sonoma', 38.292, -122.458, 'valley'],
  ['Napa', 38.297, -122.286, 'valley'], ['San Jose', 37.338, -121.886, 'valley'],
  ['Walnut Creek', 37.91, -122.065, 'inland'], ['Concord', 37.978, -122.031, 'inland'], ['Brentwood', 37.932, -121.696, 'inland'],
  ['Livermore', 37.682, -121.768, 'inland'], ['Fairfield', 38.249, -122.04, 'inland'], ['Vacaville', 38.357, -121.988, 'inland'],
  ['Gilroy', 37.006, -121.568, 'inland'],
  ['Berkeley Hills', 37.893, -122.245, 'hills'], ['Mill Valley', 37.906, -122.545, 'hills'], ['Santa Cruz Mountains', 37.2, -122.05, 'hills'],
].map(([name, latitude, longitude, zone]) => ({ name, latitude, longitude, zone }))

const round = (value, precision = 1) => Number(value.toFixed(precision))
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// ERA5-Land has no daily precipitation in Open-Meteo, so rain comes from a second request
// (era5_seamless falls back to ERA5's ~25 km precipitation).
async function download(prefix, daily, model) {
  await mkdir(`${root}scripts/data`, { recursive: true })
  const batches = []
  for (let i = 0; i < references.length; i += 4) batches.push(references.slice(i, i + 4))
  for (const [index, batch] of batches.entries()) {
    const file = `${root}scripts/data/${prefix}-${index}.json`
    if (existsSync(file) && !refresh) continue
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${batch.map(p => p.latitude).join(',')}&longitude=${batch.map(p => p.longitude).join(',')}&start_date=${start}&end_date=${end}&daily=${daily}&models=${model}&timezone=America%2FLos_Angeles`
    for (let attempt = 0; ; attempt++) {
      try { await run('curl', ['--fail', '--silent', '--show-error', '--max-time', '120', url, '-o', file]); break }
      catch (error) { if (attempt >= 4) throw error; console.log(`Batch ${index} retry after rate limit…`); await sleep(65_000) }
    }
    console.log(`${prefix} batch ${index + 1}/${batches.length}`)
    // Stay well under Open-Meteo's per-minute limit for multi-year requests.
    if (index < batches.length - 1) await sleep(50_000)
  }
  const out = []
  for (let index = 0; index < batches.length; index++) {
    const data = JSON.parse(await readFile(`${root}scripts/data/${prefix}-${index}.json`, 'utf8'))
    out.push(...(Array.isArray(data) ? data : [data]))
  }
  return out
}

function summarize(reference, data, rainData) {
  const days = { ...data.daily, precipitation_sum: rainData.daily.precipitation_sum }
  if (rainData.daily.time.join() !== data.daily.time.join()) throw new Error(`Rain dates differ for ${reference.name}`)
  for (const key of ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum']) {
    if (days[key].length !== days.time.length) throw new Error(`Incomplete ${key} for ${reference.name}`)
  }
  const valid = key => days[key].map(value => Number.isFinite(value) ? value : null)
  const max = valid('temperature_2m_max'), min = valid('temperature_2m_min'), rain = valid('precipitation_sum')
  if (max.filter(v => v === null).length > 30 || rain.filter(v => v === null).length > 30) throw new Error(`Too many gaps for ${reference.name}`)
  const months = Array.from({ length: 12 }, (_, month) => {
    const indices = days.time.flatMap((date, index) => Number(date.slice(5, 7)) === month + 1 ? [index] : [])
    const mean = values => { const list = indices.map(i => values[i]).filter(v => v !== null); return list.reduce((a, b) => a + b, 0) / list.length }
    return { month: month + 1, highC: round(mean(max)), lowC: round(mean(min)), precipitationMm: round(indices.reduce((sum, i) => sum + (rain[i] ?? 0), 0) / years) }
  })
  const lows = min.filter(v => v !== null)
  return {
    ...reference,
    returnedCoordinates: [data.latitude, data.longitude],
    gridElevation: data.elevation,
    months,
    annualRainMm: round(rain.reduce((sum, v) => sum + (v ?? 0), 0) / years),
    summerRainMm: round(months.filter(m => m.month >= 6 && m.month <= 8).reduce((sum, m) => sum + m.precipitationMm, 0)),
    summerHighC: round((months[6].highC + months[7].highC + months[8].highC) / 3),
    winterLowC: round((months[11].lowC + months[0].lowC + months[1].lowC) / 3),
    coldestNightC: Math.min(...lows),
    freezingDaysPerYear: round(lows.filter(v => v <= 0).length / years),
  }
}

function pointInRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const raw = await download('bay-climate', 'temperature_2m_max,temperature_2m_min,precipitation_sum', 'era5_land')
const rain = await download('bay-rain', 'precipitation_sum', 'era5_seamless')
if (raw.length !== references.length || rain.length !== references.length) throw new Error(`Expected ${references.length} locations`)
const points = references.map((reference, index) => summarize(reference, raw[index], rain[index]))

// Inverse-distance interpolation on a land grid. This draws an illustrative surface between
// reference points; it is not a downscaled climate model.
const region = JSON.parse(await readFile(`${root}src/data/bay-area-map.json`, 'utf8'))
const [west, south, east, north] = region.bounds
const step = 0.025
const columns = Math.round((east - west) / step) + 1, rows = Math.round((north - south) / step) + 1
const onLand = point => region.land.some(shape => pointInRing(point, shape.rings[0]) && !shape.rings.slice(1).some(ring => pointInRing(point, ring)))
  && !region.lakes.some(shape => pointInRing(point, shape.rings[0]))
const layers = { summerHighC: [], annualRainMm: [], freezingDaysPerYear: [] }
const land = []
for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
  const longitude = west + column * step, latitude = north - row * step
  const isLand = onLand([longitude, latitude])
  land.push(isLand ? 1 : 0)
  for (const key of Object.keys(layers)) {
    if (!isLand) { layers[key].push(null); continue }
    let weight = 0, total = 0
    for (const p of points) {
      const d = Math.hypot((p.longitude - longitude) * Math.cos(latitude * Math.PI / 180), p.latitude - latitude) + 0.01
      const w = 1 / d ** 2.4
      weight += w; total += w * p[key]
    }
    layers[key].push(round(total / weight, key === 'annualRainMm' ? 0 : 1))
  }
}

const out = {
  version: 1,
  checkedAt: new Date().toISOString().slice(0, 10),
  source: 'Open-Meteo / Copernicus ERA5-Land (temperature) and ERA5 (rain)',
  url: 'https://open-meteo.com/en/docs/historical-weather-api',
  period: '2021–2025',
  years,
  resolutionKm: 9,
  rainResolutionKm: 25,
  note: 'Monthly means from daily reanalysis at each reference point: temperature from ERA5-Land (~9 km), rain from ERA5 (~25 km). The map grid interpolates between points for illustration; it is not a microclimate measurement.',
  references: points,
  grid: { bounds: [west, south, east, north], step, columns, rows, land, layers },
}
await writeFile(`${root}src/data/bay-area-climate.json`, JSON.stringify(out))
await mkdir(`${root}public/data`, { recursive: true })
await writeFile(`${root}public/data/bay-area-climate.json`, JSON.stringify(out))
console.log(points.map(p => `${p.name.padEnd(22)} ${p.zone.padEnd(7)} summer ${p.summerHighC}°C  rain ${Math.round(p.annualRainMm)} mm  frost ${p.freezingDaysPerYear} d`).join('\n'))

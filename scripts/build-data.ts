/**
 * Data build script — replaces build.R
 *
 * Reads xz-compressed CSVs from data/ directory, pivots them into
 * indexed JSON lookup objects matching the format used by the dashboard,
 * and writes them to public/data/.
 *
 * Also fetches GeoJSON shapes from GitHub and saves to public/geo/.
 *
 * Usage: npx tsx scripts/build-data.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as lzma from 'lzma-native'
import { parse } from 'csv-parse/sync'
import { mean, median, standardDeviation, min as ssMin, max as ssMax } from 'simple-statistics'

const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')
const PUBLIC_DATA_DIR = path.join(ROOT, 'public', 'data')
const PUBLIC_GEO_DIR = path.join(ROOT, 'public', 'geo')

interface CsvRow {
  ID: string
  time: string
  [variable: string]: string
}

interface VariableMeta {
  code: string
  time_range: [number, number]
}

interface DataLookup {
  _meta: {
    time: { value: number[]; name: string }
    variables: Record<string, VariableMeta>
  }
  [regionId: string]: Record<string, number | string | (number | string)[]> | { time: unknown; variables: unknown }
}

interface FieldInfo {
  name: string
  type: string
  time_range: [number, number]
  missing: number
  mean?: number
  sd?: number
  min?: number
  max?: number
}

// Dataset definitions mapping to source CSV files
const DATASETS: Record<string, string> = {
  district: 'health_district.csv.xz',
  county: 'county.csv.xz',
  tract: 'tract.csv.xz',
}

// GeoJSON shape URLs to fetch at build time
const GEOJSON_URLS: Record<string, string> = {
  'tract-2020.geojson':
    'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/VA/Census%20Geographies/Tract/2020/data/distribution/va_geo_census_cb_2020_census_tracts.geojson',
  'county-2020.geojson':
    'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/VA/Census%20Geographies/County/2020/data/distribution/va_geo_census_cb_2020_counties.geojson',
  'district.geojson':
    'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/VA/State%20Geographies/Health%20Districts/2020/data/distribution/va_geo_vhd_2020_health_districts.geojson',
}

// Entity mapping URL
const ENTITY_MAP_URL =
  'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/entities/data/distribution/VA.json'

async function decompressXz(filePath: string): Promise<string> {
  const compressed = fs.readFileSync(filePath)
  return new Promise((resolve, reject) => {
    lzma.decompress(compressed, undefined, (result: Buffer | string, error?: Error) => {
      if (error) reject(error)
      else resolve(typeof result === 'string' ? result : result.toString('utf-8'))
    })
  })
}

function parseValue(val: string): number | string {
  if (val === '' || val === 'NA' || val === 'na' || val === 'null') return 'NA'
  const num = Number(val)
  return isNaN(num) ? val : num
}

/**
 * Build a lookup JSON object from a CSV dataset.
 *
 * The CSV has columns: ID, time, var1, var2, ...
 * The output has the structure:
 * {
 *   "_meta": { "time": { "value": [2009,...,2023], "name": "time" }, "variables": { "var1": { "code": "X2", "time_range": [start, end] }, ... } },
 *   "region_id_1": { "X2": [val1, val2, ...], "X3": scalar_or_array, ... },
 *   ...
 * }
 */
function buildLookup(rows: CsvRow[], variableNames: string[]): DataLookup {
  // Determine all unique time values
  const timeSet = new Set<number>()
  for (const row of rows) {
    const t = parseInt(row.time, 10)
    if (!isNaN(t)) timeSet.add(t)
  }
  const timeValues = Array.from(timeSet).sort((a, b) => a - b)
  const timeMin = timeValues[0]

  // Build time index: year -> offset
  const timeIndex = new Map<number, number>()
  for (const t of timeValues) {
    timeIndex.set(t, t - timeMin)
  }
  const totalTimeSlots = timeValues.length

  // Group rows by region ID
  const regionRows = new Map<string, CsvRow[]>()
  for (const row of rows) {
    const id = row.ID.replace(/^"|"$/g, '')
    if (!regionRows.has(id)) regionRows.set(id, [])
    regionRows.get(id)!.push(row)
  }

  // For each variable, determine which time offsets have data across any entity
  const variableTimeRanges = new Map<string, [number, number]>()
  for (const varName of variableNames) {
    let minOffset = totalTimeSlots
    let maxOffset = -1
    for (const row of rows) {
      const val = row[varName]
      if (val !== '' && val !== 'NA' && val !== undefined) {
        const t = parseInt(row.time, 10)
        const offset = t - timeMin
        if (offset < minOffset) minOffset = offset
        if (offset > maxOffset) maxOffset = offset
      }
    }
    if (maxOffset >= 0) {
      variableTimeRanges.set(varName, [minOffset, maxOffset])
    } else {
      variableTimeRanges.set(varName, [-1, -1])
    }
  }

  // Assign X-codes: X1 is reserved for time conceptually, variables start at X2
  const variableMeta: Record<string, VariableMeta> = {}
  const codeToVar = new Map<string, string>()
  for (let i = 0; i < variableNames.length; i++) {
    const varName = variableNames[i]
    const code = `X${i + 2}` // X2, X3, X4, ...
    const timeRange = variableTimeRanges.get(varName) || [-1, -1]
    variableMeta[varName] = { code, time_range: timeRange }
    codeToVar.set(code, varName)
  }

  // Build region data
  const lookup: DataLookup = {
    _meta: {
      time: { value: timeValues, name: 'time' },
      variables: variableMeta,
    },
  }

  for (const [regionId, rRows] of regionRows) {
    const regionData: Record<string, number | string | (number | string)[]> = {}

    for (const varName of variableNames) {
      const meta = variableMeta[varName]
      const [rangeStart, rangeEnd] = meta.time_range
      if (rangeStart === -1 && rangeEnd === -1) continue // No data for this variable

      const arrayLen = rangeEnd - rangeStart + 1

      // Check if this is a single time point
      if (arrayLen === 1) {
        // Find the value for this single time point
        for (const row of rRows) {
          const t = parseInt(row.time, 10)
          const offset = t - timeMin
          if (offset === rangeStart) {
            const val = parseValue(row[varName])
            if (val !== 'NA') {
              regionData[meta.code] = val
            }
            break
          }
        }
      } else {
        // Build array of values across the time range
        const values: (number | string)[] = new Array(arrayLen).fill('NA')
        let hasData = false
        for (const row of rRows) {
          const t = parseInt(row.time, 10)
          const offset = t - timeMin
          if (offset >= rangeStart && offset <= rangeEnd) {
            const val = parseValue(row[varName])
            values[offset - rangeStart] = val
            if (val !== 'NA') hasData = true
          }
        }
        if (hasData) {
          // If all values are the same scalar, simplify
          const nonNA = values.filter((v) => v !== 'NA')
          if (nonNA.length === 1 && arrayLen === 1) {
            regionData[meta.code] = nonNA[0]
          } else {
            regionData[meta.code] = values
          }
        }
      }
    }

    lookup[regionId] = regionData
  }

  return lookup
}

/**
 * Build datapackage.json field definitions for a dataset.
 */
function buildFieldInfo(rows: CsvRow[], variableNames: string[], timeValues: number[]): FieldInfo[] {
  const timeMin = timeValues[0]
  const fields: FieldInfo[] = [
    {
      name: 'time',
      type: 'integer',
      time_range: [0, timeValues.length - 1],
      missing: 0,
    },
  ]

  for (const varName of variableNames) {
    const numericValues: number[] = []
    let missingCount = 0
    let minOffset = timeValues.length
    let maxOffset = -1

    for (const row of rows) {
      const raw = row[varName]
      if (raw === '' || raw === 'NA' || raw === undefined) {
        missingCount++
      } else {
        const num = Number(raw)
        if (!isNaN(num)) {
          numericValues.push(num)
          const t = parseInt(row.time, 10)
          const offset = t - timeMin
          if (offset < minOffset) minOffset = offset
          if (offset > maxOffset) maxOffset = offset
        } else {
          missingCount++
        }
      }
    }

    const fieldInfo: FieldInfo = {
      name: varName,
      type: numericValues.length > 0 ? (numericValues.some((v) => v % 1 !== 0) ? 'float' : 'integer') : 'unknown',
      time_range: maxOffset >= 0 ? [minOffset, maxOffset] : [-1, -1],
      missing: missingCount,
    }

    if (numericValues.length > 0) {
      fieldInfo.mean = mean(numericValues)
      fieldInfo.sd = numericValues.length > 1 ? standardDeviation(numericValues) : 0
      fieldInfo.min = ssMin(numericValues)
      fieldInfo.max = ssMax(numericValues)
    }

    fields.push(fieldInfo)
  }

  return fields
}

async function fetchJson(url: string): Promise<unknown> {
  console.log(`  Fetching ${url}...`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.json()
}

async function fetchGeoJsonShapes(): Promise<void> {
  fs.mkdirSync(PUBLIC_GEO_DIR, { recursive: true })

  for (const [filename, url] of Object.entries(GEOJSON_URLS)) {
    const outPath = path.join(PUBLIC_GEO_DIR, filename)
    if (fs.existsSync(outPath)) {
      console.log(`  Skipping ${filename} (already exists)`)
      continue
    }
    const data = await fetchJson(url)
    fs.writeFileSync(outPath, JSON.stringify(data))
    console.log(`  Wrote ${filename}`)
  }
}

async function buildDataset(datasetName: string, csvFile: string): Promise<{
  lookup: DataLookup
  fields: FieldInfo[]
  rowCount: number
  entityCount: number
}> {
  console.log(`\nBuilding ${datasetName} from ${csvFile}...`)
  const csvPath = path.join(DATA_DIR, csvFile)

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Data file not found: ${csvPath}`)
  }

  // Decompress and parse CSV
  console.log('  Decompressing...')
  const csvContent = await decompressXz(csvPath)

  console.log('  Parsing CSV...')
  const rows: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  })

  console.log(`  Parsed ${rows.length} rows`)

  // Get variable names (all columns except ID and time)
  const allColumns = Object.keys(rows[0])
  const variableNames = allColumns.filter((col) => {
    const clean = col.replace(/^"|"$/g, '')
    return clean !== 'ID' && clean !== 'time'
  })

  // Clean column names (remove quotes)
  const cleanRows = rows.map((row) => {
    const clean: CsvRow = { ID: '', time: '' }
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.replace(/^"|"$/g, '')
      clean[cleanKey] = typeof val === 'string' ? val.replace(/^"|"$/g, '') : val
    }
    return clean
  })

  const cleanVariableNames = variableNames.map((v) => v.replace(/^"|"$/g, ''))

  // Build lookup
  console.log('  Building lookup...')
  const lookup = buildLookup(cleanRows, cleanVariableNames)

  // Get unique time values and entity count
  const timeValues = lookup._meta.time.value
  const entityIds = Object.keys(lookup).filter((k) => k !== '_meta')

  // Build field info for datapackage
  console.log('  Computing field statistics...')
  const fields = buildFieldInfo(cleanRows, cleanVariableNames, timeValues)

  console.log(`  Done: ${entityIds.length} entities, ${cleanVariableNames.length} variables`)

  return { lookup, fields, rowCount: cleanRows.length, entityCount: entityIds.length }
}

async function main() {
  console.log('=== VDH Rural Health Data Build ===\n')

  // Ensure output directories exist
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true })
  fs.mkdirSync(PUBLIC_GEO_DIR, { recursive: true })

  // Check data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data directory not found: ${DATA_DIR}`)
    console.error('Please ensure the source CSV.xz files are in the data/ directory.')
    process.exit(1)
  }

  // Copy measure_info.json
  const measureInfoSrc = path.join(DATA_DIR, 'measure_info.json')
  const measureInfoDest = path.join(PUBLIC_DATA_DIR, 'measure_info.json')
  if (fs.existsSync(measureInfoSrc)) {
    fs.copyFileSync(measureInfoSrc, measureInfoDest)
    console.log('Copied measure_info.json')
  }

  // Build each dataset
  const resources: Array<{
    name: string
    schema: { fields: FieldInfo[] }
    bytes: number
    rows: number
    entities: number
  }> = []

  for (const [name, csvFile] of Object.entries(DATASETS)) {
    const result = await buildDataset(name, csvFile)

    // Write lookup JSON
    const lookupPath = path.join(PUBLIC_DATA_DIR, `${name}.json`)
    const jsonStr = JSON.stringify(result.lookup)
    fs.writeFileSync(lookupPath, jsonStr)
    console.log(`  Wrote ${name}.json (${(jsonStr.length / 1024 / 1024).toFixed(1)} MB)`)

    resources.push({
      name,
      schema: { fields: result.fields },
      bytes: Buffer.byteLength(jsonStr),
      rows: result.rowCount,
      entities: result.entityCount,
    })
  }

  // Build datapackage.json
  const measureInfo = fs.existsSync(measureInfoSrc) ? JSON.parse(fs.readFileSync(measureInfoSrc, 'utf-8')) : {}

  const datapackage = {
    name: 'vdh_rural_health',
    title: 'Virginia Department of Health Rural Health Data',
    licence: 'public',
    resources,
    measure_info: measureInfo,
  }

  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'datapackage.json'), JSON.stringify(datapackage, null, 2))
  console.log('\nWrote datapackage.json')

  // Fetch GeoJSON shapes
  console.log('\nFetching GeoJSON shapes...')
  await fetchGeoJsonShapes()

  console.log('\n=== Build complete ===')
}

main().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})

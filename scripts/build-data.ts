/**
 * Data build script — replaces build.R
 *
 * Reads xz-compressed CSVs from data/ directory, pivots them into
 * indexed JSON lookup objects matching the format used by the dashboard,
 * and writes them to public/data/.
 *
 * Also copies GeoJSON shapes from geo-sources/ to public/geo/.
 *
 * Usage: npx tsx scripts/build-data.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as lzma from 'lzma-native'
import { parse } from 'csv-parse/sync'
import { mean, median, standardDeviation, min as ssMin, max as ssMax } from 'simple-statistics'
import * as yazl from 'yazl'

const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')
const PUBLIC_DATA_DIR = path.join(ROOT, 'public', 'data')
const PUBLIC_GEO_DIR = path.join(ROOT, 'public', 'geo')
const GEO_SRC_DIR = path.join(ROOT, 'geo-sources')

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

// GeoJSON shape files in geo-sources/ (copied from sdc-monorepo via scripts/refresh-geo.sh)
const GEOJSON_FILES = ['tract-2020.geojson', 'county-2020.geojson', 'district.geojson']

// Entity map file in geo-sources/
const ENTITY_MAP_FILE = 'VA.json'

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

function copyGeoJsonShapes(): void {
  fs.mkdirSync(PUBLIC_GEO_DIR, { recursive: true })

  for (const filename of GEOJSON_FILES) {
    const srcPath = path.join(GEO_SRC_DIR, filename)
    const destPath = path.join(PUBLIC_GEO_DIR, filename)
    if (!fs.existsSync(srcPath)) {
      console.warn(`  Warning: Source GeoJSON not found: ${srcPath}`)
      continue
    }
    fs.copyFileSync(srcPath, destPath)
    const size = (fs.statSync(destPath).size / 1024 / 1024).toFixed(1)
    console.log(`  Copied ${filename} (${size} MB)`)
  }
}

/**
 * Read the VA entity map from geo-sources/ and extract a { geoid -> "rural"|"mixed"|"urban" } lookup.
 *
 * The entity map is structured as { category: { geoid: { type, ... } } }.
 * We extract from the "county", "district", and "tract" categories, which
 * correspond to the three geographic levels in the dashboard.
 */
function buildRegionTypeLookup(): void {
  const outPath = path.join(PUBLIC_DATA_DIR, 'region-types.json')
  const srcPath = path.join(GEO_SRC_DIR, ENTITY_MAP_FILE)

  console.log('\nBuilding region type classification from entity map...')
  if (!fs.existsSync(srcPath)) {
    console.warn(`  Warning: Entity map not found: ${srcPath}`)
    return
  }

  const entityMap = JSON.parse(fs.readFileSync(srcPath, 'utf-8')) as Record<string, Record<string, { type?: string }>>

  const lookup: Record<string, 'rural' | 'mixed' | 'urban'> = {}
  const validTypes = new Set(['rural', 'mixed', 'urban'])
  const categories = ['county', 'district', 'tract']

  for (const category of categories) {
    const entities = entityMap[category]
    if (!entities) continue
    for (const [id, entity] of Object.entries(entities)) {
      const t = entity?.type?.toLowerCase()
      if (t && validTypes.has(t)) {
        lookup[id] = t as 'rural' | 'mixed' | 'urban'
      }
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(lookup))
  console.log(`  Wrote region-types.json (${Object.keys(lookup).length} classified regions)`)
}

async function buildDataset(
  datasetName: string,
  csvFile: string
): Promise<{
  lookup: DataLookup
  fields: FieldInfo[]
  rowCount: number
  entityCount: number
  cleanRows: CsvRow[]
  cleanVariableNames: string[]
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

  return { lookup, fields, rowCount: cleanRows.length, entityCount: entityIds.length, cleanRows, cleanVariableNames }
}

/** Helper: write a buffer to a zip file */
async function writeZip(zipPath: string, entries: { name: string; data: Buffer }[]): Promise<void> {
  const zipfile = new yazl.ZipFile()
  for (const entry of entries) {
    zipfile.addBuffer(entry.data, entry.name)
  }
  zipfile.end()

  const chunks: Buffer[] = []
  zipfile.outputStream.on('data', (chunk: Buffer) => chunks.push(chunk))
  await new Promise<void>((resolve, reject) => {
    zipfile.outputStream.on('end', () => {
      fs.writeFileSync(zipPath, Buffer.concat(chunks))
      resolve()
    })
    zipfile.outputStream.on('error', reject)
  })
}

/**
 * Extract a single variable from a JSON lookup as a tall CSV buffer.
 * Returns null if the variable has no data at this level.
 */
function extractVariableCsv(dataset: DataLookup, varName: string): Buffer | null {
  const meta = dataset._meta
  const varInfo = meta.variables[varName]
  if (!varInfo || varInfo.time_range[0] === -1) return null

  const { code, time_range: [rangeStart, rangeEnd] } = varInfo
  const regionIds = Object.keys(dataset).filter((k) => k !== '_meta')
  const lines: string[] = ['geoid,time,value']

  for (const regionId of regionIds) {
    const rd = dataset[regionId] as Record<string, number | string | (number | string)[]>
    const data = rd[code]
    if (data === undefined) continue

    if (Array.isArray(data)) {
      for (let i = 0; i <= rangeEnd - rangeStart; i++) {
        const val = data[i]
        if (val === 'NA' || val === undefined) continue
        lines.push(`${regionId},${meta.time.value[rangeStart + i]},${val}`)
      }
    } else {
      if (data === 'NA') continue
      lines.push(`${regionId},${meta.time.value[rangeStart]},${data}`)
    }
  }

  if (lines.length <= 1) return null
  return Buffer.from(lines.join('\n'), 'utf-8')
}

/**
 * Generate one zip per variable, each containing up to 3 CSVs
 * (district.csv, county.csv, tract.csv) with columns: geoid,time,value
 */
async function writePerVariableZips(lookups: Record<string, DataLookup>): Promise<void> {
  // Collect all variable names across all levels
  const allVars = new Set<string>()
  for (const dataset of Object.values(lookups)) {
    for (const [name, info] of Object.entries(dataset._meta.variables)) {
      if (info.time_range[0] !== -1) allVars.add(name)
    }
  }

  const levels = ['district', 'county', 'tract'] as const
  let count = 0

  for (const varName of allVars) {
    const entries: { name: string; data: Buffer }[] = []
    for (const level of levels) {
      const dataset = lookups[level]
      if (!dataset) continue
      const csv = extractVariableCsv(dataset, varName)
      if (csv) entries.push({ name: `${level}.csv`, data: csv })
    }
    if (entries.length === 0) continue

    const zipPath = path.join(PUBLIC_DATA_DIR, `${varName}.csv.zip`)
    await writeZip(zipPath, entries)
    count++
  }

  console.log(`  Wrote ${count} per-variable zip files`)
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

  const lookups: Record<string, DataLookup> = {}

  for (const [name, csvFile] of Object.entries(DATASETS)) {
    try {
      const result = await buildDataset(name, csvFile)

      // Write lookup JSON
      const lookupPath = path.join(PUBLIC_DATA_DIR, `${name}.json`)
      const jsonStr = JSON.stringify(result.lookup)
      fs.writeFileSync(lookupPath, jsonStr)
      console.log(`  Wrote ${name}.json (${(jsonStr.length / 1024 / 1024).toFixed(1)} MB)`)

      lookups[name] = result.lookup

      resources.push({
        name,
        schema: { fields: result.fields },
        bytes: Buffer.byteLength(jsonStr),
        rows: result.rowCount,
        entities: result.entityCount,
      })
    } catch (err) {
      console.warn(`  WARNING: Failed to build ${name} from ${csvFile}: ${err}`)
      // Fall back to loading existing JSON for zip generation
      const jsonPath = path.join(PUBLIC_DATA_DIR, `${name}.json`)
      if (fs.existsSync(jsonPath)) {
        console.log(`  Loading existing ${name}.json for zip generation...`)
        lookups[name] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as DataLookup
      }
    }
  }

  // Generate per-variable zip files (one zip per variable, containing CSVs for each level)
  console.log('\nGenerating per-variable download zips...')
  await writePerVariableZips(lookups)

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

  // Copy GeoJSON shapes from geo-sources/
  console.log('\nCopying GeoJSON shapes...')
  copyGeoJsonShapes()

  // Build region type lookup from geo-sources/
  buildRegionTypeLookup()

  console.log('\n=== Build complete ===')
}

main().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})

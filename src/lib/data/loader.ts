import type { DataLookup, MeasureInfoMap, Datapackage, GeoJSONFeatureCollection, DatasetName, NarrativeMap, CorrelationMatrix } from './types'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const dataCache = new Map<string, unknown>()

async function fetchJson<T>(url: string, cacheKey?: string): Promise<T> {
  const key = cacheKey || url
  if (dataCache.has(key)) return dataCache.get(key) as T

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  const data = (await response.json()) as T
  dataCache.set(key, data)
  return data
}

/** Load a dataset lookup JSON */
export async function loadDataset(name: DatasetName): Promise<DataLookup> {
  return fetchJson<DataLookup>(`${basePath}/data/${name}.json`, `dataset:${name}`)
}

/** Load measure_info.json */
export async function loadMeasureInfo(): Promise<MeasureInfoMap> {
  return fetchJson<MeasureInfoMap>(`${basePath}/data/measure_info.json`, 'measure_info')
}

/** Load datapackage.json */
export async function loadDatapackage(): Promise<Datapackage> {
  return fetchJson<Datapackage>(`${basePath}/data/datapackage.json`, 'datapackage')
}

/** Load narratives.json — AI-generated variable summaries */
export async function loadNarratives(): Promise<NarrativeMap> {
  try {
    return await fetchJson<NarrativeMap>(`${basePath}/data/narratives.json`, 'narratives')
  } catch {
    return {}
  }
}

/** Load region-types.json — a { geoid: "rural"|"mixed"|"urban" } lookup */
export async function loadRegionTypes(): Promise<Record<string, 'rural' | 'mixed' | 'urban'>> {
  return fetchJson<Record<string, 'rural' | 'mixed' | 'urban'>>(`${basePath}/data/region-types.json`, 'region_types')
}

/** Load correlations.json — pre-computed pairwise correlations */
export async function loadCorrelations(): Promise<CorrelationMatrix> {
  try {
    return await fetchJson<CorrelationMatrix>(`${basePath}/data/correlations.json`, 'correlations')
  } catch {
    return {}
  }
}

/** Load region-names.json — a { geoid: "Region Name" } lookup */
export async function loadRegionNames(): Promise<Record<string, string>> {
  try {
    return await fetchJson<Record<string, string>>(`${basePath}/data/region-names.json`, 'region_names')
  } catch {
    return {}
  }
}

/** Load a GeoJSON shape file */
export async function loadGeoJson(path: string): Promise<GeoJSONFeatureCollection> {
  const url = path.startsWith('/') ? `${basePath}${path}` : path
  return fetchJson<GeoJSONFeatureCollection>(url, `geo:${path}`)
}

/** Check if a dataset is already cached */
export function isDatasetCached(name: DatasetName): boolean {
  return dataCache.has(`dataset:${name}`)
}

/** Clear all cached data */
export function clearCache(): void {
  dataCache.clear()
}

/**
 * Load the initial set of data needed for the dashboard:
 * - district.json (smallest, default view)
 * - county.json
 * - measure_info.json
 * - datapackage.json
 *
 * Tract data is loaded lazily when needed.
 */
export async function loadInitialData(): Promise<{
  district: DataLookup
  county: DataLookup
  measureInfo: MeasureInfoMap
  datapackage: Datapackage
}> {
  const [district, county, measureInfo, datapackage] = await Promise.all([
    loadDataset('district'),
    loadDataset('county'),
    loadMeasureInfo(),
    loadDatapackage(),
  ])

  return { district, county, measureInfo, datapackage }
}

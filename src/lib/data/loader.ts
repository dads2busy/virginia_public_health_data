import type { DataLookup, MeasureInfoMap, Datapackage, GeoJSONFeatureCollection, DatasetName } from './types'

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

/**
 * Map shape configuration.
 * Matches the shapes array from site.R lines 549-587.
 *
 * In the original site, shapes are fetched at runtime from GitHub.
 * In the Next.js version, they are pre-fetched at build time by scripts/build-data.ts
 * and served from public/geo/.
 */

export interface MapShapeSource {
  name: string
  time?: number
  url: string
  localPath: string
  idProperty: string
}

export const mapShapeSources: MapShapeSource[] = [
  {
    name: 'tract',
    time: 2010,
    url: 'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/VA/Census%20Geographies/Tract/2020/data/distribution/va_geo_census_cb_2020_census_tracts.geojson',
    localPath: '/geo/tract-2020.geojson',
    idProperty: 'geoid',
  },
  {
    name: 'county',
    time: 2010,
    url: 'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/VA/Census%20Geographies/County/2020/data/distribution/va_geo_census_cb_2020_counties.geojson',
    localPath: '/geo/county-2020.geojson',
    idProperty: 'geoid',
  },
  {
    name: 'tract',
    time: 2020,
    url: 'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/VA/Census%20Geographies/Tract/2020/data/distribution/va_geo_census_cb_2020_census_tracts.geojson',
    localPath: '/geo/tract-2020.geojson',
    idProperty: 'geoid',
  },
  {
    name: 'county',
    time: 2020,
    url: 'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/VA/Census%20Geographies/County/2020/data/distribution/va_geo_census_cb_2020_counties.geojson',
    localPath: '/geo/county-2020.geojson',
    idProperty: 'geoid',
  },
  {
    name: 'district',
    url: 'https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/VA/State%20Geographies/Health%20Districts/2020/data/distribution/va_geo_vhd_2020_health_districts.geojson',
    localPath: '/geo/district.geojson',
    idProperty: 'geoid',
  },
]

/** Map tile URLs for light and dark themes */
export const tileSources = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
}

/** Default map center and zoom for Virginia */
export const mapDefaults = {
  center: [37.85, -79.45] as [number, number],
  zoom: 6.8,
  height: '430px',
  /** Tight bounding box for Virginia — narrowed vertically so the wide east-west shape fills the map */
  bounds: [[37.0, -83.68], [39.0, -75.24]] as [[number, number], [number, number]],
}

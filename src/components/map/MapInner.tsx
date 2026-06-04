'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import { useDashboardStore } from '@/lib/store'
import { selectShapes, selectPalette } from '@/lib/store/selectors'
import { useData } from '@/components/DataProvider'
import { getRegionValues, computeSummary } from '@/lib/data/aggregation'
import { valueToColor, getNAColor } from '@/lib/color/scale'
import { loadGeoJson } from '@/lib/data/loader'
import { mapDefaults, tileSources } from '@/lib/config/map-shapes'
import type { GeoJSONFeatureCollection, GeoJSONFeature } from '@/lib/data/types'
import 'leaflet/dist/leaflet.css'

/** Component to handle map view changes */
function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap()
  const mapAnimations = useDashboardStore((s) => s.settings.mapAnimations)

  useEffect(() => {
    if (bounds) {
      const opts = { padding: [20, 20] as [number, number] }
      if (mapAnimations === 'fly') {
        map.flyToBounds(bounds, opts)
      } else if (mapAnimations === 'zoom') {
        map.fitBounds(bounds, { ...opts, animate: true })
      } else {
        map.fitBounds(bounds, { ...opts, animate: false })
      }
    } else {
      if (mapAnimations === 'fly') {
        map.flyTo(mapDefaults.center, mapDefaults.zoom)
      } else if (mapAnimations === 'zoom') {
        map.setView(mapDefaults.center, mapDefaults.zoom, { animate: true })
      } else {
        map.setView(mapDefaults.center, mapDefaults.zoom, { animate: false })
      }
    }
  }, [map, bounds, mapAnimations])

  return null
}

export function MapInner() {
  const shapes = useDashboardStore(selectShapes)
  const paletteName = useDashboardStore(selectPalette)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const themeDark = useDashboardStore((s) => s.settings.themeDark)
  const polygonOutline = useDashboardStore((s) => s.settings.polygonOutline)
  const colorScaleCenter = useDashboardStore((s) => s.settings.colorScaleCenter)
  const colorByOrder = useDashboardStore((s) => s.settings.colorByOrder)
  const setHoveredRegionId = useDashboardStore((s) => s.setHoveredRegionId)
  const setSelectedRegionId = useDashboardStore((s) => s.setSelectedRegionId)
  const setSelectedDistrict = useDashboardStore((s) => s.setSelectedDistrict)
  const setSelectedCounty = useDashboardStore((s) => s.setSelectedCounty)
  const hoveredRegionId = useDashboardStore((s) => s.hoveredRegionId)

  const selectedDistrict = useDashboardStore((s) => s.selectedDistrict)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)

  const regionTypes = useDashboardStore((s) => s.regionTypes)

  const { activeDataset, regionTypeMap } = useData()

  const [geoData, setGeoData] = useState<Record<string, GeoJSONFeatureCollection>>({})
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null)

  // Stable handle to the active GeoJSON layer + an index of per-feature layers by geoid.
  // These let us recolor / highlight imperatively instead of remounting all features.
  const geoJsonRef = useRef<L.GeoJSON | null>(null)
  const layersByIdRef = useRef<Map<string, L.Path>>(new Map())
  const prevHoveredRef = useRef<string | null>(null)

  // Zoom map bounds when drill-down selection changes
  const prevDistrict = useRef(selectedDistrict)
  const prevCounty = useRef(selectedCounty)
  useEffect(() => {
    const districtCleared = prevDistrict.current && !selectedDistrict
    const countyCleared = prevCounty.current && !selectedCounty
    const countyChanged = selectedCounty !== prevCounty.current

    if (districtCleared) {
      // Went all the way back to district overview
      setMapBounds(null)
    } else if (countyCleared && selectedDistrict && geoData.district) {
      // Went back from tract to county: re-zoom to the selected district
      const feature = geoData.district.features.find(
        (f) => f.properties.geoid === selectedDistrict
      )
      if (feature) {
        const layer = L.geoJSON(feature as GeoJSON.Feature)
        setMapBounds(layer.getBounds())
      }
    } else if (countyChanged && selectedCounty && geoData.county) {
      // County selected (from dropdown or map click): zoom to county bounds
      const feature = geoData.county.features.find(
        (f) => f.properties.geoid === selectedCounty
      )
      if (feature) {
        const layer = L.geoJSON(feature as GeoJSON.Feature)
        setMapBounds(layer.getBounds())
      }
    }

    prevDistrict.current = selectedDistrict
    prevCounty.current = selectedCounty
  }, [selectedDistrict, selectedCounty, geoData.district, geoData.county])

  // Load GeoJSON shapes
  useEffect(() => {
    const paths: Record<string, string> = {
      district: '/geo/district.geojson',
      county: '/geo/county-2020.geojson',
      tract: '/geo/tract-2020.geojson',
    }
    const path = paths[shapes]
    if (path && !geoData[shapes]) {
      loadGeoJson(path).then((data) => {
        setGeoData((prev) => ({ ...prev, [shapes]: data }))
      })
    }
    // Also load county boundaries for tract overlay
    if (shapes === 'tract' && !geoData.county) {
      loadGeoJson('/geo/county-2020.geojson').then((data) => {
        setGeoData((prev) => ({ ...prev, county: data }))
      })
    }
    // Ensure district GeoJSON is available for back-navigation bounds
    if (selectedDistrict && !geoData.district) {
      loadGeoJson('/geo/district.geojson').then((data) => {
        setGeoData((prev) => ({ ...prev, district: data }))
      })
    }
  }, [shapes, geoData, selectedDistrict])

  // Build a filter function from the active regionTypes checkboxes
  const regionTypeFilter = useMemo(() => {
    const allOn = regionTypes.rural && regionTypes.mixed && regionTypes.urban
    if (allOn || Object.keys(regionTypeMap).length === 0) return undefined
    return (regionId: string) => {
      const t = regionTypeMap[regionId]
      if (!t) return true // unknown regions pass through
      return regionTypes[t]
    }
  }, [regionTypes, regionTypeMap])

  // Compute region values and summary for coloring
  const { regionValues, summary, sortedValues } = useMemo(() => {
    if (!activeDataset) return { regionValues: new Map<string, number>(), summary: null, sortedValues: [] }

    const meta = activeDataset._meta
    const timeOffset = selectedYear - meta.time.value[0]

    const values = getRegionValues(activeDataset, selectedVariable, timeOffset, regionTypeFilter)
    const summ = computeSummary(activeDataset, selectedVariable, timeOffset, regionTypeFilter)
    const sorted = Array.from(values.values()).sort((a, b) => a - b)

    return { regionValues: values, summary: summ, sortedValues: sorted }
  }, [activeDataset, selectedVariable, selectedYear, regionTypeFilter])

  const css = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const borderColor = css?.getPropertyValue('--border-map').trim() || (themeDark ? '#475569' : '#94a3b8')
  const hoverBorderColor = css?.getPropertyValue('--border-map-hover').trim() || '#93c5fd'

  // Style function for GeoJSON features
  const styleFeature = useCallback(
    (feature?: GeoJSONFeature): PathOptions => {
      if (!feature || !summary) {
        return { fillColor: getNAColor(themeDark), weight: polygonOutline, color: borderColor, fillOpacity: 0.7 }
      }

      const regionId = feature.properties.geoid
      const value = regionValues.get(regionId)

      const fillColor =
        value !== undefined
          ? valueToColor(value, summary, paletteName, colorScaleCenter, colorByOrder, sortedValues)
          : getNAColor(themeDark)

      // Base style only. Hover highlight is applied imperatively (see applyHover) so that
      // hovering does not force a recolor of every feature.
      return {
        fillColor,
        weight: polygonOutline,
        color: borderColor,
        fillOpacity: 0.7,
        opacity: 1,
      }
    },
    [summary, regionValues, paletteName, colorScaleCenter, colorByOrder, sortedValues, themeDark, polygonOutline, borderColor]
  )

  // Event handlers for features
  const onEachFeature = useCallback(
    (feature: GeoJSONFeature, layer: Layer) => {
      layersByIdRef.current.set(feature.properties.geoid, layer as L.Path)
      layer.on({
        mouseover: () => {
          setHoveredRegionId(feature.properties.geoid, (feature.properties.region_name as string) ?? feature.properties.name)
        },
        mouseout: () => {
          setHoveredRegionId(null)
        },
        click: (e: LeafletMouseEvent) => {
          const id = feature.properties.geoid
          const name = (feature.properties.region_name as string) ?? feature.properties.name ?? null
          if (shapes === 'district') {
            setMapBounds((e.target as L.Polygon).getBounds())
            setSelectedDistrict(id, name)
          } else if (shapes === 'county') {
            setMapBounds((e.target as L.Polygon).getBounds())
            setSelectedCounty(id, name)
          } else {
            setSelectedRegionId(id)
          }
        },
      })
    },
    [shapes, setMapBounds, setHoveredRegionId, setSelectedDistrict, setSelectedCounty, setSelectedRegionId]
  )

  // Apply / clear the hover highlight on a single feature layer (O(1) per hover).
  const applyHover = useCallback(
    (id: string | null) => {
      const layers = layersByIdRef.current
      const prev = prevHoveredRef.current
      if (prev && prev !== id) {
        layers.get(prev)?.setStyle({ weight: polygonOutline, color: borderColor })
      }
      if (id) {
        const target = layers.get(id)
        if (target) {
          target.setStyle({ weight: polygonOutline + 2, color: hoverBorderColor })
          target.bringToFront()
        }
      }
      prevHoveredRef.current = id
    },
    [polygonOutline, borderColor, hoverBorderColor]
  )

  // Highlight the hovered region (driven by hover on the map OR the table) without
  // rebuilding any layers.
  useEffect(() => {
    applyHover(hoveredRegionId)
  }, [hoveredRegionId, applyHover])

  // Recolor the existing layer in place when coloring inputs change, instead of
  // remounting all features via a changing `key`.
  useEffect(() => {
    const layer = geoJsonRef.current
    if (!layer) return
    layer.setStyle(styleFeature as L.StyleFunction)
    // setStyle resets every feature to its base style, so re-apply the current hover.
    const hovered = prevHoveredRef.current
    if (hovered) {
      layersByIdRef.current.get(hovered)?.setStyle({ weight: polygonOutline + 2, color: hoverBorderColor })
    }
  }, [styleFeature, polygonOutline, hoverBorderColor])

  const currentGeoJson = geoData[shapes]
  const countyOverlayGeoJson = shapes === 'tract' ? geoData.county : null
  const tileUrl = themeDark ? tileSources.dark : tileSources.light

  const overlayColor = css?.getPropertyValue('--border-map-overlay').trim() || (themeDark ? '#e2e8f0' : '#1e293b')
  const countyOverlayStyle: PathOptions = {
    fillOpacity: 0,
    weight: 2.5,
    color: overlayColor,
    opacity: 0.8,
  }

  return (
    <MapContainer
      preferCanvas
      center={mapDefaults.center}
      zoom={mapDefaults.zoom}
      zoomSnap={0.1}
      scrollWheelZoom={false}
      style={{ height: mapDefaults.height, width: '100%', background: 'var(--surface-dark)' }}
      attributionControl={false}
    >
      <TileLayer url={tileUrl} />
      <MapController bounds={mapBounds} />
      {currentGeoJson && (
        <GeoJSON
          // Rebuild only when the underlying geography changes. Recoloring and hover
          // highlighting are handled imperatively (setStyle) to avoid remounting all features.
          key={shapes}
          ref={geoJsonRef}
          data={currentGeoJson}
          style={styleFeature as (feature?: GeoJSON.Feature) => PathOptions}
          onEachFeature={onEachFeature as (feature: GeoJSON.Feature, layer: Layer) => void}
        />
      )}
      {countyOverlayGeoJson && (
        <GeoJSON
          key={`county-overlay-${themeDark}`}
          data={countyOverlayGeoJson}
          style={() => countyOverlayStyle}
          interactive={false}
        />
      )}
    </MapContainer>
  )
}

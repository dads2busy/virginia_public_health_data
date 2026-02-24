'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadInitialData, loadDataset, isDatasetCached } from '@/lib/data/loader'
import { useDashboardStore } from '@/lib/store'
import { selectShapes } from '@/lib/store/selectors'
import type { DataLookup, MeasureInfoMap, Datapackage, ShapeLevel } from '@/lib/data/types'

/** Check if a variable has data at a given level using the datapackage metadata */
function variableAvailableAtLevel(
  datapackage: Datapackage | null,
  variableName: string,
  level: ShapeLevel
): boolean {
  if (!datapackage) return true // assume available until metadata loads
  const resource = datapackage.resources.find((r) => r.name === level)
  if (!resource) return false
  const field = resource.schema.fields.find((f) => f.name === variableName)
  if (!field) return false
  return field.time_range[0] !== -1
}

export interface AvailableLevels {
  district: boolean
  county: boolean
  tract: boolean
}

interface DataContextValue {
  district: DataLookup | null
  county: DataLookup | null
  tract: DataLookup | null
  measureInfo: MeasureInfoMap | null
  datapackage: Datapackage | null
  loading: boolean
  error: string | null
  activeDataset: DataLookup | null
  availableLevels: AvailableLevels
}

const DataContext = createContext<DataContextValue>({
  district: null,
  county: null,
  tract: null,
  measureInfo: null,
  datapackage: null,
  loading: true,
  error: null,
  activeDataset: null,
  availableLevels: { district: true, county: true, tract: true },
})

export function useData() {
  return useContext(DataContext)
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [district, setDistrict] = useState<DataLookup | null>(null)
  const [county, setCounty] = useState<DataLookup | null>(null)
  const [tract, setTract] = useState<DataLookup | null>(null)
  const [measureInfo, setMeasureInfo] = useState<MeasureInfoMap | null>(null)
  const [datapackage, setDatapackage] = useState<Datapackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const shapes = useDashboardStore(selectShapes)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const startingShapes = useDashboardStore((s) => s.startingShapes)
  const setStartingShapes = useDashboardStore((s) => s.setStartingShapes)

  // Load initial data (district + county + metadata)
  useEffect(() => {
    loadInitialData()
      .then((data) => {
        setDistrict(data.district)
        setCounty(data.county)
        setMeasureInfo(data.measureInfo)
        setDatapackage(data.datapackage)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Lazy-load tract data when needed
  useEffect(() => {
    if (shapes === 'tract' && !tract && !isDatasetCached('tract')) {
      loadDataset('tract')
        .then(setTract)
        .catch((err) => setError(err.message))
    }
  }, [shapes, tract])

  // Compute which geographic levels have data for the selected variable
  const availableLevels = useMemo((): AvailableLevels => {
    return {
      district: variableAvailableAtLevel(datapackage, selectedVariable, 'district'),
      county: variableAvailableAtLevel(datapackage, selectedVariable, 'county'),
      tract: variableAvailableAtLevel(datapackage, selectedVariable, 'tract'),
    }
  }, [datapackage, selectedVariable])

  // Auto-switch starting layer when the selected variable doesn't exist at the current level.
  // Priority: tract > county > district (prefer the most granular available level).
  useEffect(() => {
    if (loading) return
    if (availableLevels[startingShapes]) return // current level is fine

    const preferred: ShapeLevel[] = ['tract', 'county', 'district']
    for (const level of preferred) {
      if (availableLevels[level]) {
        setStartingShapes(level)
        return
      }
    }
  }, [availableLevels, startingShapes, setStartingShapes, loading])

  // Determine the active dataset based on current shape level
  const activeDataset = shapes === 'district' ? district : shapes === 'county' ? county : tract

  return (
    <DataContext.Provider
      value={{ district, county, tract, measureInfo, datapackage, loading, error, activeDataset, availableLevels }}
    >
      {children}
    </DataContext.Provider>
  )
}

'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { selectShapes, selectShowCountyInput } from '@/lib/store/selectors'
import { useData } from '@/components/DataProvider'
import { resolveVariables, groupByCategory } from '@/lib/data/measure-info-resolver'
import type { ShapeLevel } from '@/lib/data/types'

export function FilterMenu() {
  const filterOpen = useDashboardStore((s) => s.filterOpen)
  const startingShapes = useDashboardStore((s) => s.startingShapes)
  const setStartingShapes = useDashboardStore((s) => s.setStartingShapes)
  const selectedDistrict = useDashboardStore((s) => s.selectedDistrict)
  const setSelectedDistrict = useDashboardStore((s) => s.setSelectedDistrict)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)
  const setSelectedCounty = useDashboardStore((s) => s.setSelectedCounty)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const setSelectedVariable = useDashboardStore((s) => s.setSelectedVariable)
  const regionTypes = useDashboardStore((s) => s.regionTypes)
  const setRegionType = useDashboardStore((s) => s.setRegionType)
  const shapes = useDashboardStore(selectShapes)
  const showCountyInput = useDashboardStore(selectShowCountyInput)

  const { district, county, measureInfo, availableLevels } = useData()

  // Get district IDs for the combobox
  const districtIds = useMemo(() => {
    if (!district) return []
    return Object.keys(district)
      .filter((k) => k !== '_meta')
      .sort()
  }, [district])

  // Get county IDs, optionally filtered by selected district
  const countyIds = useMemo(() => {
    if (!county) return []
    return Object.keys(county)
      .filter((k) => k !== '_meta')
      .sort()
  }, [county])

  // Get variable options grouped by category — use dataset _meta.variables
  // as the source of truth for which variables exist, then resolve labels
  // from measure_info (expanding templates like race_{variant.name}{category.name})
  const variableOptions = useMemo(() => {
    if (!measureInfo || !county) return []
    const varNames = Object.keys(county._meta.variables)
    const resolved = resolveVariables(measureInfo, varNames)
    return groupByCategory(resolved)
  }, [measureInfo, county])

  if (!filterOpen) return null

  return (
    <div className="border-b border-slate-700 bg-[#0f1b35] px-4 py-3">
      <div className="flex flex-wrap items-end gap-4">
        {/* Starting Layer */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Starting Layer</label>
          <div className="flex gap-1">
            {(['district', 'county', 'tract'] as ShapeLevel[]).map((level) => {
              const available = availableLevels[level]
              return (
                <button
                  key={level}
                  disabled={!available}
                  onClick={() => setStartingShapes(level)}
                  className={`rounded px-3 py-1 text-sm capitalize ${
                    !available
                      ? 'cursor-not-allowed bg-slate-800 text-slate-600'
                      : shapes === level
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title={!available ? `No data available at ${level} level for the selected variable` : undefined}
                >
                  {level === 'district' ? 'Districts' : level === 'county' ? 'Counties' : 'Census Tracts'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Health District */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Health District</label>
          <select
            value={selectedDistrict || ''}
            onChange={(e) => setSelectedDistrict(e.target.value || null)}
            className="rounded border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200"
          >
            <option value="">All Districts</option>
            {districtIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        {/* County (conditional) */}
        {showCountyInput && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">County</label>
            <select
              value={selectedCounty || ''}
              onChange={(e) => setSelectedCounty(e.target.value || null)}
              className="rounded border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200"
            >
              <option value="">All Counties</option>
              {countyIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Region Types */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Region Types</label>
          <div className="flex gap-2">
            {(['rural', 'mixed', 'urban'] as const).map((type) => (
              <label key={type} className="flex items-center gap-1 text-sm capitalize text-slate-300">
                <input
                  type="checkbox"
                  checked={regionTypes[type]}
                  onChange={(e) => setRegionType(type, e.target.checked)}
                  className="h-3.5 w-3.5 rounded"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Variable */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-400">Variable</label>
          <select
            value={selectedVariable}
            onChange={(e) => setSelectedVariable(e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200"
          >
            {variableOptions.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.variables.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

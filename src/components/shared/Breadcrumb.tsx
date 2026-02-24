'use client'

import { useDashboardStore } from '@/lib/store'
import { selectShapes } from '@/lib/store/selectors'

const LEVEL_LABELS = {
  district: 'Health District',
  county: 'County',
  tract: 'Census Tract',
} as const

export function Breadcrumb() {
  const shapes = useDashboardStore(selectShapes)
  const startingShapes = useDashboardStore((s) => s.startingShapes)
  const selectedDistrict = useDashboardStore((s) => s.selectedDistrict)
  const selectedDistrictName = useDashboardStore((s) => s.selectedDistrictName)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)
  const selectedCountyName = useDashboardStore((s) => s.selectedCountyName)
  const resetSelection = useDashboardStore((s) => s.resetSelection)
  const setSelectedCounty = useDashboardStore((s) => s.setSelectedCounty)

  // Build breadcrumb trail based on starting level and current drill-down state
  // Starting from district: Health District > {district} County > {county} Census Tract
  // Starting from county:   County > {county} Census Tract
  // Starting from tract:    Census Tract (no drill-down)

  type Crumb = { label: string; active: boolean; onClick?: () => void }
  const crumbs: Crumb[] = []

  if (startingShapes === 'district') {
    crumbs.push({
      label: LEVEL_LABELS.district,
      active: shapes === 'district',
      onClick: shapes !== 'district' ? resetSelection : undefined,
    })

    if (selectedDistrict) {
      const districtLabel = selectedDistrictName || selectedDistrict
      crumbs.push({
        label: `${districtLabel} Counties`,
        active: shapes === 'county',
        onClick: shapes === 'tract' ? () => setSelectedCounty(null) : undefined,
      })
    }

    if (selectedCounty) {
      const countyLabel = selectedCountyName || selectedCounty
      crumbs.push({
        label: `${countyLabel} Census Tracts`,
        active: true,
      })
    }
  } else if (startingShapes === 'county') {
    crumbs.push({
      label: LEVEL_LABELS.county,
      active: shapes === 'county',
      onClick: shapes !== 'county' ? () => setSelectedCounty(null) : undefined,
    })

    if (selectedCounty) {
      const countyLabel = selectedCountyName || selectedCounty
      crumbs.push({
        label: `${countyLabel} Census Tracts`,
        active: true,
      })
    }
  } else {
    crumbs.push({
      label: LEVEL_LABELS.tract,
      active: true,
    })
  }

  return (
    <nav className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-400 dark:text-gray-500">&gt;</span>}
          <span
            className={
              crumb.active
                ? 'font-medium text-gray-700 dark:text-gray-200'
                : 'cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
            }
            onClick={crumb.onClick}
          >
            {crumb.label}
          </span>
        </span>
      ))}
    </nav>
  )
}

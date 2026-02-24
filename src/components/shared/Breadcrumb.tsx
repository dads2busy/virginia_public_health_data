'use client'

import { useDashboardStore } from '@/lib/store'

export function Breadcrumb() {
  const selectedDistrict = useDashboardStore((s) => s.selectedDistrict)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)
  const setSelectedDistrict = useDashboardStore((s) => s.setSelectedDistrict)
  const setSelectedCounty = useDashboardStore((s) => s.setSelectedCounty)

  return (
    <nav className="mb-2 text-sm text-gray-600 dark:text-gray-400">
      <span
        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
        onClick={() => {
          setSelectedDistrict(null)
          setSelectedCounty(null)
        }}
      >
        State: Virginia
      </span>
      {selectedDistrict && (
        <>
          <span className="mx-1">&gt;</span>
          <span
            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => setSelectedCounty(null)}
          >
            Health District: {selectedDistrict}
          </span>
        </>
      )}
      {selectedCounty && (
        <>
          <span className="mx-1">&gt;</span>
          <span>{selectedCounty}</span>
        </>
      )}
    </nav>
  )
}

'use client'

import { useDashboardStore } from '@/lib/store'
import { selectShapes } from '@/lib/store/selectors'

export function DynamicHeading() {
  const shapes = useDashboardStore(selectShapes)
  const selectedDistrict = useDashboardStore((s) => s.selectedDistrict)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)

  let heading: string

  if (selectedCounty) {
    heading = `${selectedCounty} Census Tracts`
  } else if (selectedDistrict) {
    heading = `${selectedDistrict} Counties`
  } else if (shapes === 'tract') {
    heading = 'Virginia Census Tracts'
  } else if (shapes === 'district') {
    heading = 'Virginia (Health Districts)'
  } else {
    heading = 'Virginia Counties'
  }

  return <h1 className="mb-3 text-center text-2xl font-bold">{heading}</h1>
}

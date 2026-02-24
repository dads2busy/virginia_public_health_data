import type { DashboardState } from './index'
import type { ShapeLevel } from '@/lib/data/types'

/**
 * Computed "shapes" variable: determines which geographic level to display.
 * Matches the logic from settings.json.variables[0] (id: "shapes")
 */
export const selectShapes = (state: DashboardState): ShapeLevel => {
  // If starting at district level and no district is selected, show districts
  if (state.startingShapes === 'district' && !state.selectedDistrict) return 'district'
  // If starting at tract level or a county is selected, show tracts
  if (state.startingShapes === 'tract' || state.selectedCounty) return 'tract'
  // Default: show counties
  return 'county'
}

/**
 * Computed "regionSelect" variable: determines which selection field to update on click.
 * Matches settings.json.variables[1] (id: "region_select")
 */
export const selectRegionSelect = (state: DashboardState): 'selectedCounty' | 'selectedDistrict' => {
  const shapes = selectShapes(state)
  return shapes === 'county' ? 'selectedCounty' : 'selectedDistrict'
}

/**
 * Computed "selectedRegion" variable: the currently active region identifier.
 * Matches settings.json.variables[2] (id: "selected_region")
 */
export const selectSelectedRegion = (state: DashboardState): string | null => {
  return state.selectedCounty || state.selectedDistrict || null
}

/**
 * Computed "setPalette" variable: color palette based on colorByOrder setting.
 * Matches settings.json.variables[3] (id: "set_palette")
 */
export const selectPalette = (state: DashboardState): string => {
  return state.settings.colorByOrder ? 'lajolla' : 'vik'
}

/**
 * Computed "countySubset" variable: filter mode for county dropdown.
 * Matches settings.json.variables[4] (id: "county_subset")
 */
export const selectCountySubset = (state: DashboardState): 'siblings' | 'full_filter' => {
  return state.selectedDistrict ? 'siblings' : 'full_filter'
}

/**
 * The active dataset name based on the computed shapes level.
 */
export const selectActiveDataset = (state: DashboardState): 'district' | 'county' | 'tract' => {
  return selectShapes(state)
}

/**
 * Whether the side panel section for a given metric set should be visible.
 * Matches the conditional display rules from settings.json.rules
 */
export const selectMetricSetVisible = (metricSet: string) => (state: DashboardState): boolean => {
  return state.metricSet === metricSet
}

/**
 * Whether the county combobox should be shown.
 * Rule: show when starting_shapes != district OR selected_district is set
 */
export const selectShowCountyInput = (state: DashboardState): boolean => {
  return state.startingShapes !== 'district' || !!state.selectedDistrict
}

/**
 * Whether the county combobox should be locked (disabled).
 * Rule: lock when selected_county is set
 */
export const selectCountyInputLocked = (state: DashboardState): boolean => {
  return !!state.selectedCounty
}

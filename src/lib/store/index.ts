import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MetricSet,
  ShapeLevel,
  PlotType,
  MapAnimation,
  ColorScaleCenter,
  SummarySelection,
  ScrollBehavior,
  TableFormat,
  FileFormat,
} from '@/lib/data/types'

export interface DashboardSettings {
  themeDark: boolean
  colorByOrder: boolean
  colorScaleCenter: ColorScaleCenter
  hideUrlParameters: boolean
  hideTooltips: boolean
  showEmptyTimes: boolean
  digits: number
  summarySelection: SummarySelection
  mapAnimations: MapAnimation
  backgroundTop: boolean
  polygonOutline: number
  backgroundPolygonOutline: number
  circleRadius: number
  circleProperty: string
  plotType: PlotType
  boxplots: boolean
  iqrBox: boolean
  traceLimit: number
  tableAutosort: boolean
  tableAutoscroll: boolean
  tableScrollBehavior: ScrollBehavior
  tracking: boolean
}

export interface DashboardState {
  // Primary inputs
  metricSet: MetricSet
  startingShapes: ShapeLevel
  selectedDistrict: string | null
  selectedCounty: string | null
  selectedVariable: string
  selectedYear: number
  regionTypes: { rural: boolean; mixed: boolean; urban: boolean }

  // Settings (persisted to localStorage)
  settings: DashboardSettings

  // Interaction state (for cross-component highlighting)
  hoveredRegionId: string | null
  hoveredRegionName: string | null
  selectedRegionId: string | null

  // Export settings
  exportTableFormat: TableFormat
  exportFileFormat: FileFormat

  // Filter menu visibility
  filterOpen: boolean

  // Actions
  setMetricSet: (set: MetricSet) => void
  setStartingShapes: (shapes: ShapeLevel) => void
  setSelectedDistrict: (id: string | null) => void
  setSelectedCounty: (id: string | null) => void
  setSelectedVariable: (variable: string) => void
  setSelectedYear: (year: number) => void
  setRegionType: (type: 'rural' | 'mixed' | 'urban', value: boolean) => void
  setSetting: <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => void
  setHoveredRegionId: (id: string | null, name?: string | null) => void
  setSelectedRegionId: (id: string | null) => void
  setExportTableFormat: (format: TableFormat) => void
  setExportFileFormat: (format: FileFormat) => void
  setFilterOpen: (open: boolean) => void
  resetSelection: () => void
}

const defaultSettings: DashboardSettings = {
  themeDark: false,
  colorByOrder: false,
  colorScaleCenter: 'none',
  hideUrlParameters: false,
  hideTooltips: false,
  showEmptyTimes: false,
  digits: 2,
  summarySelection: 'dataset',
  mapAnimations: 'fly',
  backgroundTop: false,
  polygonOutline: 1.5,
  backgroundPolygonOutline: 2,
  circleRadius: 7,
  circleProperty: '',
  plotType: 'scatter',
  boxplots: true,
  iqrBox: true,
  traceLimit: 20,
  tableAutosort: true,
  tableAutoscroll: true,
  tableScrollBehavior: 'smooth',
  tracking: false,
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      // Primary inputs
      metricSet: 'rural_health',
      startingShapes: 'district',
      selectedDistrict: null,
      selectedCounty: null,
      selectedVariable: 'perc_hh_with_broadband',
      selectedYear: 2023,
      regionTypes: { rural: true, mixed: true, urban: true },

      // Settings
      settings: defaultSettings,

      // Interaction
      hoveredRegionId: null,
      hoveredRegionName: null,
      selectedRegionId: null,

      // Export
      exportTableFormat: 'mixed',
      exportFileFormat: 'csv',

      // Filter
      filterOpen: true,

      // Actions
      setMetricSet: (metricSet) => set({ metricSet }),
      setStartingShapes: (startingShapes) =>
        set({ startingShapes, selectedDistrict: null, selectedCounty: null, selectedRegionId: null }),
      setSelectedDistrict: (selectedDistrict) =>
        set({ selectedDistrict, selectedCounty: null, selectedRegionId: selectedDistrict }),
      setSelectedCounty: (selectedCounty) => set({ selectedCounty, selectedRegionId: selectedCounty }),
      setSelectedVariable: (selectedVariable) => set({ selectedVariable }),
      setSelectedYear: (selectedYear) => set({ selectedYear }),
      setRegionType: (type, value) =>
        set((state) => ({
          regionTypes: { ...state.regionTypes, [type]: value },
        })),
      setSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      setHoveredRegionId: (hoveredRegionId, name) => set({ hoveredRegionId, hoveredRegionName: name ?? null }),
      setSelectedRegionId: (id) => set({ selectedRegionId: id }),
      setExportTableFormat: (exportTableFormat) => set({ exportTableFormat }),
      setExportFileFormat: (exportFileFormat) => set({ exportFileFormat }),
      setFilterOpen: (filterOpen) => set({ filterOpen }),
      resetSelection: () =>
        set({
          selectedDistrict: null,
          selectedCounty: null,
          selectedRegionId: null,
          hoveredRegionId: null,
        }),
    }),
    {
      name: 'vdh-dashboard-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)

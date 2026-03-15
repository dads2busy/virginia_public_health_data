'use client'

import { useDashboardStore } from '@/lib/store'
import { ruralHealthSections, hoiSections, unitProfilesSections, type MetricSection } from '@/lib/config/metric-sets'
import type { MetricSet } from '@/lib/data/types'

const metricSetTabs: { key: MetricSet; label: string; subtitle: string }[] = [
  { key: 'rural_health', label: 'Office of Rural Health', subtitle: '- Priority Metrics -' },
  { key: 'hoi', label: 'Office of Health Equity', subtitle: '- Health Opportunity Index -' },
  { key: 'unit_profiles', label: 'Virginia Cooperative Extension', subtitle: '- Unit Profiles -' },
]

const sectionsBySet: Record<MetricSet, MetricSection[]> = {
  rural_health: ruralHealthSections,
  hoi: hoiSections,
  unit_profiles: unitProfilesSections,
}

export function SidePanel() {
  const metricSet = useDashboardStore((s) => s.metricSet)
  const setMetricSet = useDashboardStore((s) => s.setMetricSet)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const setSelectedVariable = useDashboardStore((s) => s.setSelectedVariable)

  const sections = sectionsBySet[metricSet]

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-gray-50 dark:border-gray-700 dark:bg-gray-900 lg:block">
      {/* Metric set selector */}
      <div className="border-b bg-red-50 p-2 dark:border-gray-700 dark:bg-red-950/40">
        <p className="mb-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
          Priority Metrics for:
        </p>
        {metricSetTabs.map((tab) => (
          <button
            key={tab.key}
            data-testid={`metric-tab-${tab.key}`}
            onClick={() => setMetricSet(tab.key)}
            className={`w-full rounded px-3 py-2 text-left text-sm font-medium transition-colors ${
              metricSet === tab.key
                ? 'bg-red-800 text-white'
                : 'text-gray-700 hover:bg-red-100 dark:text-gray-300 dark:hover:bg-red-950/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Variable buttons */}
      <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        {sections.map((section, i) => (
          <div key={i} className="mb-2">
            {section.heading && (
              <p className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {section.heading}
              </p>
            )}
            {section.buttons.map((btn) => (
              <button
                key={btn.variable}
                data-testid={`var-btn-${btn.variable}`}
                onClick={() => setSelectedVariable(btn.variable)}
                className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${
                  selectedVariable === btn.variable
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}

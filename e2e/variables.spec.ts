import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears, getVariableHeading, assertVariableChanged } from './lib/signals'
import { getAvailableVariables, selectVariableFromSidePanel, selectVariableFromDropdown, switchMetricSet, getDashboardName, isVA } from './lib/navigation'
import { ruralHealthSections, hoiSections, unitProfilesSections } from '../src/lib/config/metric-sets'

// Collect all SidePanel variable keys grouped by metric set (VA) for efficient iteration
const metricSetVariables: Record<string, string[]> = {
  rural_health: ruralHealthSections.flatMap((s) => s.buttons.map((b) => b.variable)),
  hoi: hoiSections.flatMap((s) => s.buttons.map((b) => b.variable)),
  unit_profiles: unitProfilesSections.flatMap((s) => s.buttons.map((b) => b.variable)),
}
const allSidePanelVars = new Set(Object.values(metricSetVariables).flat())

test.describe('Variable coverage', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 })

  let variables: string[]

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)
    variables = await getAvailableVariables(page)
    await page.close()
  })

  test('every variable loads data when selected', async ({ page }) => {
    const guards = await attachNetworkGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    const dashboardName = await getDashboardName(page)
    const failures: string[] = []
    let prevHeading: string | null = null

    if (isVA(dashboardName)) {
      // VA: iterate by metric set to handle tab switching
      for (const [metricSet, vars] of Object.entries(metricSetVariables)) {
        await switchMetricSet(page, metricSet)
        await waitForDataUpdate(page)
        prevHeading = await getVariableHeading(page)

        for (const v of vars) {
          if (!variables.includes(v)) continue
          try {
            guards.resetDataResponseCount()
            await selectVariableFromSidePanel(page, v)
            await waitForDataUpdate(page)
            prevHeading = await assertVariableChanged(page, prevHeading)
            await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
          } catch (e) {
            failures.push(`${v} (SidePanel, ${metricSet}): ${(e as Error).message.slice(0, 200)}`)
          }
        }
      }

      // Variables in measure_info but not in any SidePanel — try dropdown
      const dropdownOnly = variables.filter((v) => !allSidePanelVars.has(v))
      for (const v of dropdownOnly) {
        try {
          guards.resetDataResponseCount()
          await selectVariableFromDropdown(page, v)
          await waitForDataUpdate(page)
          prevHeading = await assertVariableChanged(page, prevHeading)
          await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
        } catch (e) {
          // Variable exists in measure_info/datapackage but not in any UI control — skip
          const msg = (e as Error).message
          if (msg.includes('variable-option-') && msg.includes('to be visible')) continue
          failures.push(`${v} (Dropdown): ${msg.slice(0, 200)}`)
        }
      }
    } else {
      // NCR: iterate all variables via SidePanel, fallback to dropdown
      prevHeading = await getVariableHeading(page)
      for (const v of variables) {
        try {
          guards.resetDataResponseCount()
          const btn = page.locator(`[data-testid="var-btn-${v}"]`)
          if (await btn.count() > 0) {
            await selectVariableFromSidePanel(page, v)
          } else {
            await selectVariableFromDropdown(page, v)
          }
          await waitForDataUpdate(page)
          prevHeading = await assertVariableChanged(page, prevHeading)
          await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
        } catch (e) {
          const msg = (e as Error).message
          if (msg.includes('variable-option-') && msg.includes('to be visible')) continue
          failures.push(`${v}: ${msg.slice(0, 200)}`)
        }
      }
    }

    expect(
      failures,
      `${failures.length} variable(s) failed to load data:\n${failures.join('\n')}`
    ).toEqual([])
  })
})

# E2E Testing System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playwright E2E tests that verify every variable, layer, and year control loads data in both VA and NCR dashboards.

**Architecture:** Add `data-testid` attributes to UI components in both dashboards, extract shared test helpers into `e2e/lib/`, then write data-driven test files that read variable lists at runtime and assert data signals after each interaction.

**Tech Stack:** Playwright, TypeScript, Next.js dev server

**Spec:** `docs/superpowers/specs/2026-03-15-e2e-testing-system-design.md`

---

## File Structure

### VA Dashboard (`virginia_public_health_data`)

| File | Action | Purpose |
|------|--------|---------|
| `src/components/layout/SidePanel.tsx` | Modify | Add `data-testid` to metric tabs + variable buttons |
| `src/components/layout/FilterMenu.tsx` | Modify | Add `data-testid` to container + layer buttons |
| `src/components/shared/VariableDropdown.tsx` | Modify | Add `data-testid` to trigger + options |
| `src/components/shared/YearSelector.tsx` | Modify | Add `data-testid` to prev/next/input |
| `src/components/table/RankTable.tsx` | Modify | Add `data-testid` to container |
| `src/components/map/DashboardMap.tsx` | Modify | Add `data-testid` wrapper div |
| `playwright.config.ts` | Modify | Add `webServer` block |
| `e2e/lib/signals.ts` | Create | Data signal detection helpers |
| `e2e/lib/navigation.ts` | Create | UI interaction helpers |
| `e2e/smoke.spec.ts` | Modify | Refactor to use shared lib |
| `e2e/variables.spec.ts` | Create | Data-driven variable coverage test |
| `e2e/layers.spec.ts` | Create | Geographic level switching test |
| `e2e/years.spec.ts` | Create | Year navigation test |

### NCR Dashboard (`national_capital_region_data`)

| File | Action | Purpose |
|------|--------|---------|
| `src/components/layout/SidePanel.tsx` | Modify | Add `data-testid` to category headers + variable buttons |
| `src/components/layout/FilterMenu.tsx` | Modify | Add `data-testid` to container + layer select |
| `src/components/shared/VariableDropdown.tsx` | Modify | Add `data-testid` to trigger + options |
| `src/components/shared/YearSelector.tsx` | Modify | Add `data-testid` to prev/next/input |
| `src/components/table/RankTable.tsx` | Modify | Add `data-testid` to container |
| `src/components/map/DashboardMap.tsx` | Modify | Add `data-testid` wrapper div |
| `playwright.config.ts` | Create | Playwright config (copy from VA, adjust) |
| `e2e/lib/signals.ts` | Create | Copy from VA |
| `e2e/lib/navigation.ts` | Create | Copy from VA |
| `e2e/smoke.spec.ts` | Create | Copy from VA |
| `e2e/variables.spec.ts` | Create | Copy from VA |
| `e2e/layers.spec.ts` | Create | Copy from VA |
| `e2e/years.spec.ts` | Create | Copy from VA |
| `e2e/README.md` | Create | Copy from VA |

---

## Chunk 1: VA Dashboard — data-testid Attributes

### Task 1: Add data-testid to VA SidePanel

**Files:**
- Modify: `virginia_public_health_data/src/components/layout/SidePanel.tsx:35,59`

- [ ] **Step 1: Add `data-testid` to metric set tab buttons**

At line 35, the `<button>` inside `metricSetTabs.map` — add `data-testid={`metric-tab-${tab.key}`}`:

```tsx
          <button
            key={tab.key}
            data-testid={`metric-tab-${tab.key}`}
            onClick={() => setMetricSet(tab.key)}
```

- [ ] **Step 2: Add `data-testid` to variable buttons**

At line 59, the `<button>` inside `section.buttons.map` — add `data-testid={`var-btn-${btn.variable}`}`:

```tsx
              <button
                key={btn.variable}
                data-testid={`var-btn-${btn.variable}`}
                onClick={() => setSelectedVariable(btn.variable)}
```

- [ ] **Step 3: Verify the app still builds**

Run: `cd /Users/ads7fg/git/virginia_public_health_data && npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add src/components/layout/SidePanel.tsx
git commit -m "feat(e2e): add data-testid to VA SidePanel metric tabs and variable buttons"
```

### Task 2: Add data-testid to VA FilterMenu

**Files:**
- Modify: `virginia_public_health_data/src/components/layout/FilterMenu.tsx:47,56`

- [ ] **Step 1: Add `data-testid="filter-menu"` to the container div**

At line 47:

```tsx
    <div data-testid="filter-menu" className="border-b border-slate-700 px-4 py-3" style={{ backgroundColor: 'var(--surface-dark)' }}>
```

- [ ] **Step 2: Add `data-testid` to layer buttons**

At line 56, inside the `(['district', 'county', 'tract'] as ShapeLevel[]).map` — add `data-testid={`layer-btn-${level}`}`:

```tsx
                <button
                  key={level}
                  data-testid={`layer-btn-${level}`}
                  disabled={!available}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add src/components/layout/FilterMenu.tsx
git commit -m "feat(e2e): add data-testid to VA FilterMenu container and layer buttons"
```

### Task 3: Add data-testid to VA VariableDropdown

**Files:**
- Modify: `virginia_public_health_data/src/components/shared/VariableDropdown.tsx:68,91`

- [ ] **Step 1: Add `data-testid="variable-dropdown"` to the trigger button**

At line 68:

```tsx
      <button
        data-testid="variable-dropdown"
        onClick={() => setOpen(!open)}
```

- [ ] **Step 2: Add `data-testid` to each variable option button**

At line 91, inside `group.variables.map` — add `data-testid={`variable-option-${v.name}`}`:

```tsx
                    <button
                      key={v.name}
                      data-testid={`variable-option-${v.name}`}
                      onClick={() => {
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add src/components/shared/VariableDropdown.tsx
git commit -m "feat(e2e): add data-testid to VA VariableDropdown trigger and options"
```

### Task 4: Add data-testid to VA YearSelector

**Files:**
- Modify: `virginia_public_health_data/src/components/shared/YearSelector.tsx:41,48,58`

- [ ] **Step 1: Add testids to prev button, input, and next button**

At line 41 (prev button):
```tsx
      <button
        data-testid="year-prev"
        onClick={() => setSelectedYear(Math.max(minYear, selectedYear - 1))}
```

At line 48 (input):
```tsx
      <input
        data-testid="year-input"
        type="text"
```

At line 58 (next button):
```tsx
      <button
        data-testid="year-next"
        onClick={() => setSelectedYear(Math.min(maxYear, selectedYear + 1))}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add src/components/shared/YearSelector.tsx
git commit -m "feat(e2e): add data-testid to VA YearSelector prev/next/input"
```

### Task 5: Add data-testid to VA RankTable and DashboardMap

**Files:**
- Modify: `virginia_public_health_data/src/components/table/RankTable.tsx:137`
- Modify: `virginia_public_health_data/src/components/map/DashboardMap.tsx:13`

- [ ] **Step 1: Add `data-testid="rank-table"` to RankTable container**

At line 137:
```tsx
    <div data-testid="rank-table" ref={containerRef} className="mt-2 max-h-[300px] overflow-auto rounded border dark:border-gray-700">
```

- [ ] **Step 2: Wrap DashboardMap return in a div with `data-testid="dashboard-map"`**

At line 13, change:
```tsx
export function DashboardMap() {
  return <MapInner />
}
```
to:
```tsx
export function DashboardMap() {
  return <div data-testid="dashboard-map"><MapInner /></div>
}
```

- [ ] **Step 3: Verify app builds**

Run: `cd /Users/ads7fg/git/virginia_public_health_data && npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add src/components/table/RankTable.tsx src/components/map/DashboardMap.tsx
git commit -m "feat(e2e): add data-testid to VA RankTable and DashboardMap"
```

---

## Chunk 2: NCR Dashboard — data-testid Attributes

### Task 6: Add data-testid to NCR SidePanel

**Files:**
- Modify: `national_capital_region_data/src/components/layout/SidePanel.tsx:71,81`

- [ ] **Step 1: Add `data-testid` to category header buttons**

At line 71, the `<button>` inside `categoryGroups.map` — add `data-testid`:

```tsx
              <button
                data-testid={`var-category-${group.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                onClick={() => toggleCategory(group.category)}
```

- [ ] **Step 2: Add `data-testid` to variable buttons**

At line 81, inside `group.variables.map` — add `data-testid={`var-btn-${v.name}`}`:

```tsx
                    <button
                      key={v.name}
                      data-testid={`var-btn-${v.name}`}
                      onClick={() => setSelectedVariable(v.name)}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ads7fg/git/national_capital_region_data
git add src/components/layout/SidePanel.tsx
git commit -m "feat(e2e): add data-testid to NCR SidePanel categories and variable buttons"
```

### Task 7: Add data-testid to NCR FilterMenu

**Files:**
- Modify: `national_capital_region_data/src/components/layout/FilterMenu.tsx:57,62`

- [ ] **Step 1: Add `data-testid="filter-menu"` to container and `data-testid="layer-select"` to the select element**

At line 57:
```tsx
    <div data-testid="filter-menu" className="border-b border-slate-700 px-4 py-3" style={{ backgroundColor: 'var(--surface-dark)' }}>
```

At line 62:
```tsx
          <select
            data-testid="layer-select"
            value={shapes}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ads7fg/git/national_capital_region_data
git add src/components/layout/FilterMenu.tsx
git commit -m "feat(e2e): add data-testid to NCR FilterMenu container and layer select"
```

### Task 8: Add data-testid to NCR VariableDropdown, YearSelector, RankTable, DashboardMap

These components are identical between dashboards. Apply the same changes as Tasks 3-5.

**Files:**
- Modify: `national_capital_region_data/src/components/shared/VariableDropdown.tsx:68,91`
- Modify: `national_capital_region_data/src/components/shared/YearSelector.tsx:41,48,58`
- Modify: `national_capital_region_data/src/components/table/RankTable.tsx:123`
- Modify: `national_capital_region_data/src/components/map/DashboardMap.tsx:13`

- [ ] **Step 1: Add `data-testid="variable-dropdown"` to VariableDropdown trigger button (line 68)**

```tsx
      <button
        data-testid="variable-dropdown"
        onClick={() => setOpen(!open)}
```

- [ ] **Step 2: Add `data-testid` to VariableDropdown option buttons (line 91)**

```tsx
                    <button
                      key={v.name}
                      data-testid={`variable-option-${v.name}`}
                      onClick={() => {
```

- [ ] **Step 3: Add `data-testid` to YearSelector prev (line 41), input (line 48), next (line 58)**

Same as VA Task 4.

- [ ] **Step 4: Add `data-testid="rank-table"` to RankTable container (line 123)**

```tsx
    <div data-testid="rank-table" ref={containerRef} className="mt-2 max-h-[300px] overflow-auto rounded border dark:border-gray-700">
```

- [ ] **Step 5: Wrap DashboardMap return in `<div data-testid="dashboard-map">` (line 13)**

```tsx
export function DashboardMap() {
  return <div data-testid="dashboard-map"><MapInner /></div>
}
```

- [ ] **Step 6: Verify NCR builds**

Run: `cd /Users/ads7fg/git/national_capital_region_data && npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
cd /Users/ads7fg/git/national_capital_region_data
git add src/components/shared/VariableDropdown.tsx src/components/shared/YearSelector.tsx src/components/table/RankTable.tsx src/components/map/DashboardMap.tsx
git commit -m "feat(e2e): add data-testid to NCR VariableDropdown, YearSelector, RankTable, DashboardMap"
```

---

## Chunk 3: VA Test Infrastructure — Shared Library + Config

### Task 9: Update VA playwright.config.ts with webServer

**Files:**
- Modify: `virginia_public_health_data/playwright.config.ts`

- [ ] **Step 1: Add webServer block**

Replace the comment block at lines 46-53 with:

```typescript
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
```

- [ ] **Step 2: Add Playwright artifacts to .gitignore**

Append these lines to `.gitignore` (if not already present):

```
# Playwright
test-results/
playwright-report/
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add playwright.config.ts .gitignore
git commit -m "feat(e2e): add webServer to playwright config, gitignore Playwright artifacts"
```

### Task 10: Create e2e/lib/signals.ts

**Files:**
- Create: `virginia_public_health_data/e2e/lib/signals.ts`

- [ ] **Step 1: Create the signals helper file**

```typescript
import { expect, Page, Request } from '@playwright/test'

const APP_SHELL_TIMEOUT_MS = 30_000

export type DataSignal = {
  tablesWithRows: number
  plotlyCharts: number
  mapContainers: number
  successfulDataResponses: number
}

export async function collectDataSignals(page: Page): Promise<DataSignal> {
  const dom = await page.evaluate(() => {
    function isVisible(el: HTMLElement) {
      const style = window.getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom >= 0 &&
        rect.right >= 0
      )
    }

    const tables = Array.from(document.querySelectorAll('table')).filter(
      (t) => t instanceof HTMLTableElement && isVisible(t as unknown as HTMLElement)
    ) as HTMLTableElement[]

    const tablesWithRows = tables.filter((t) => {
      const bodyRows = t.tBodies?.[0]?.rows?.length ?? 0
      if (bodyRows > 0) return true
      return (t.rows?.length ?? 0) >= 2
    }).length

    const plotlyCharts = Array.from(document.querySelectorAll('.js-plotly-plot')).filter((el) =>
      isVisible(el as HTMLElement)
    ).length

    const mapContainers = Array.from(document.querySelectorAll('.leaflet-container')).filter((el) =>
      isVisible(el as HTMLElement)
    ).length

    return { tablesWithRows, plotlyCharts, mapContainers }
  })

  return { ...dom, successfulDataResponses: 0 }
}

export function looksLikeDataUrl(url: string): boolean {
  return (
    url.includes('/data/') &&
    (url.endsWith('.json') || url.includes('.json?') || url.endsWith('.csv') || url.includes('.csv?'))
  )
}

export async function attachNetworkGuards(page: Page) {
  const failures: { url: string; status?: number; method: string }[] = []
  let successfulDataResponses = 0

  page.on('requestfailed', (req: Request) => {
    const url = req.url()
    if (url.includes('favicon')) return
    failures.push({ url, method: req.method() })
  })

  page.on('response', async (res) => {
    const url = res.url()
    if (!looksLikeDataUrl(url)) return
    if (res.ok()) {
      successfulDataResponses += 1
      return
    }
    failures.push({ url, status: res.status(), method: res.request().method() })
  })

  return {
    getFailures: () => failures.slice(),
    getSuccessfulDataResponses: () => successfulDataResponses,
    resetDataResponseCount: () => { successfulDataResponses = 0 },
  }
}

export async function waitForAppShell(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle', { timeout: APP_SHELL_TIMEOUT_MS }).catch(() => {})
  await expect(page.locator('body')).toBeVisible()
}

export async function waitForDataUpdate(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(500)
}

export async function assertSomeDataAppears(page: Page, successfulDataResponses: number) {
  const signals = await collectDataSignals(page)
  signals.successfulDataResponses = successfulDataResponses

  const totalSignals =
    signals.tablesWithRows + signals.plotlyCharts + signals.mapContainers + signals.successfulDataResponses

  expect(
    totalSignals,
    `Expected at least one data signal, got:\n` +
    `tablesWithRows=${signals.tablesWithRows}\n` +
    `plotlyCharts=${signals.plotlyCharts}\n` +
    `mapContainers=${signals.mapContainers}\n` +
    `successfulDataResponses=${signals.successfulDataResponses}\n` +
    `URL=${page.url()}`
  ).toBeGreaterThan(0)

  if (signals.tablesWithRows > 0) {
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.toLowerCase()).not.toContain('no data')
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add e2e/lib/signals.ts
git commit -m "feat(e2e): create shared signals helper library"
```

### Task 11: Create e2e/lib/navigation.ts

**Files:**
- Create: `virginia_public_health_data/e2e/lib/navigation.ts`

This file needs access to the VA metric-set config. Playwright tests run in Node, so we can import TypeScript modules from the project.

- [ ] **Step 1: Create the navigation helper file**

```typescript
import { Page } from '@playwright/test'

// --- Dashboard detection ---

let _dashboardName: string | null = null

export async function getDashboardName(page: Page): Promise<string> {
  if (_dashboardName) return _dashboardName
  const res = await page.request.get('/data/datapackage.json')
  const pkg = await res.json()
  _dashboardName = pkg.name
  return _dashboardName
}

export function isVA(name: string): boolean {
  return name === 'vdh_rural_health'
}

// --- Filter menu ---

export async function openFilterMenu(page: Page) {
  const filterMenu = page.locator('[data-testid="filter-menu"]')
  if (await filterMenu.count() > 0) return // already open
  // Click the Filter button in the navbar
  await page.locator('button', { hasText: /filter/i }).click()
  await filterMenu.waitFor({ state: 'visible', timeout: 5_000 })
}

// --- Variable selection ---

export async function selectVariableFromSidePanel(page: Page, variableKey: string) {
  const dashboardName = await getDashboardName(page)
  const btn = page.locator(`[data-testid="var-btn-${variableKey}"]`)

  if (!isVA(dashboardName)) {
    // NCR: categories may be collapsed; expand by clicking category headers until button is visible
    if (await btn.count() === 0 || !(await btn.isVisible())) {
      // Click all collapsed category headers to expand them
      const categories = page.locator('[data-testid^="var-category-"]')
      const count = await categories.count()
      for (let i = 0; i < count; i++) {
        await categories.nth(i).click()
        if (await btn.isVisible().catch(() => false)) break
      }
    }
  }

  await btn.click()
}

export async function selectVariableFromDropdown(page: Page, variableKey: string) {
  await openFilterMenu(page)
  const trigger = page.locator('[data-testid="variable-dropdown"]')
  await trigger.click()
  const option = page.locator(`[data-testid="variable-option-${variableKey}"]`)
  await option.waitFor({ state: 'visible', timeout: 5_000 })
  await option.click()
}

// --- Layer switching ---

export async function switchLayer(page: Page, level: string) {
  await openFilterMenu(page)
  const dashboardName = await getDashboardName(page)

  if (isVA(dashboardName)) {
    const btn = page.locator(`[data-testid="layer-btn-${level}"]`)
    await btn.click()
  } else {
    // NCR uses a native <select>
    await page.selectOption('[data-testid="layer-select"]', level)
  }
}

// --- Metric set (VA only) ---

export async function switchMetricSet(page: Page, set: string) {
  const tab = page.locator(`[data-testid="metric-tab-${set}"]`)
  await tab.click()
}

// --- Year navigation ---

export async function changeYear(page: Page, direction: 'prev' | 'next') {
  const btn = page.locator(`[data-testid="year-${direction}"]`)
  await btn.click()
}

export async function getCurrentYear(page: Page): Promise<number> {
  const input = page.locator('[data-testid="year-input"]')
  const val = await input.inputValue()
  return parseInt(val, 10)
}

// --- Variable list ---

interface MeasureInfo {
  [key: string]: { category: string; [k: string]: unknown }
}

interface DatapackageResource {
  name: string
  schema: { fields: { name: string }[] }
}

interface Datapackage {
  name: string
  resources: DatapackageResource[]
}

export async function getAvailableVariables(page: Page): Promise<string[]> {
  const [miRes, dpRes] = await Promise.all([
    page.request.get('/data/measure_info.json'),
    page.request.get('/data/datapackage.json'),
  ])
  const measureInfo: MeasureInfo = await miRes.json()
  const datapackage: Datapackage = await dpRes.json()

  // Collect all field names across all resources
  const datapackageFields = new Set<string>()
  for (const resource of datapackage.resources) {
    for (const field of resource.schema.fields) {
      datapackageFields.add(field.name)
    }
  }

  // Intersect with measure_info keys, excluding _geo10 and time
  return Object.keys(measureInfo).filter((key) => {
    if (key.endsWith('_geo10')) return false
    if (key === 'time') return false
    return datapackageFields.has(key)
  })
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add e2e/lib/navigation.ts
git commit -m "feat(e2e): create shared navigation helper library"
```

---

## Chunk 4: VA Test Files

### Task 12: Refactor VA smoke.spec.ts to use shared lib

**Files:**
- Modify: `virginia_public_health_data/e2e/smoke.spec.ts`

- [ ] **Step 1: Rewrite smoke.spec.ts to import from shared lib**

Replace the entire file. Preserves both original tests but uses shared helpers. The `clickFirstUsefulNavLink` helper is inlined since it's only used here:

```typescript
import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'

async function clickFirstUsefulNavLink(page: import('@playwright/test').Page) {
  const candidates = page
    .locator('a[href^="/"]')
    .filter({ hasNotText: /github|privacy|terms|mailto|http/i })

  const count = await candidates.count()
  for (let i = 0; i < Math.min(count, 30); i++) {
    const a = candidates.nth(i)
    if (!(await a.isVisible())) continue

    const href = (await a.getAttribute('href')) ?? ''
    if (!href || href === '/' || href.startsWith('/#')) continue

    await a.click()
    return
  }
}

test.describe('Dashboard smoke', () => {
  test('home loads and at least one data-driven view can be reached', async ({ page }) => {
    const guards = await attachNetworkGuards(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    await clickFirstUsefulNavLink(page)
    await waitForAppShell(page)
    await page.waitForTimeout(500)

    await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())

    const failures = guards.getFailures()
    expect(
      failures,
      `Expected no failed requests, but saw:\n${failures
        .slice(0, 10)
        .map((f) => `- ${f.method} ${f.status ?? ''} ${f.url}`)
        .join('\n')}`
    ).toEqual([])
  })

  test('can click through a few internal links without blanking out data', async ({ page }) => {
    const guards = await attachNetworkGuards(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    for (let step = 0; step < 3; step++) {
      await clickFirstUsefulNavLink(page)
      await waitForAppShell(page)
      await page.waitForTimeout(500)
      await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
    }

    const failures = guards.getFailures()
    expect(
      failures,
      `Expected no failed requests, but saw:\n${failures
        .slice(0, 10)
        .map((f) => `- ${f.method} ${f.status ?? ''} ${f.url}`)
        .join('\n')}`
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Verify tests still pass**

Run: `cd /Users/ads7fg/git/virginia_public_health_data && npx playwright test e2e/smoke.spec.ts --reporter=list 2>&1 | tail -10`
Expected: 2 tests pass (the webServer starts dev server automatically now)

- [ ] **Step 3: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add e2e/smoke.spec.ts
git commit -m "refactor(e2e): simplify smoke test using shared signal helpers"
```

### Task 13: Create VA variables.spec.ts

**Files:**
- Create: `virginia_public_health_data/e2e/variables.spec.ts`

- [ ] **Step 1: Create the data-driven variable coverage test**

```typescript
import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'
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

    if (isVA(dashboardName)) {
      // VA: iterate by metric set to handle tab switching
      for (const [metricSet, vars] of Object.entries(metricSetVariables)) {
        await switchMetricSet(page, metricSet)
        await waitForDataUpdate(page)

        for (const v of vars) {
          if (!variables.includes(v)) continue
          try {
            guards.resetDataResponseCount()
            await selectVariableFromSidePanel(page, v)
            await waitForDataUpdate(page)
            await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
          } catch (e) {
            failures.push(`${v} (SidePanel, ${metricSet}): ${(e as Error).message.slice(0, 200)}`)
          }
        }
      }

      // Variables in measure_info but not in any SidePanel — use dropdown
      const dropdownOnly = variables.filter((v) => !allSidePanelVars.has(v))
      for (const v of dropdownOnly) {
        try {
          guards.resetDataResponseCount()
          await selectVariableFromDropdown(page, v)
          await waitForDataUpdate(page)
          await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
        } catch (e) {
          failures.push(`${v} (Dropdown): ${(e as Error).message.slice(0, 200)}`)
        }
      }
    } else {
      // NCR: iterate all variables via SidePanel, fallback to dropdown
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
          await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
        } catch (e) {
          failures.push(`${v}: ${(e as Error).message.slice(0, 200)}`)
        }
      }
    }

    expect(
      failures,
      `${failures.length} variable(s) failed to load data:\n${failures.join('\n')}`
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test**

Run: `cd /Users/ads7fg/git/virginia_public_health_data && npx playwright test e2e/variables.spec.ts --reporter=list 2>&1 | tail -20`
Expected: Test passes (may take 1-3 minutes for all variables)

- [ ] **Step 3: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add e2e/variables.spec.ts
git commit -m "feat(e2e): add data-driven variable coverage test"
```

### Task 14: Create VA layers.spec.ts

**Files:**
- Create: `virginia_public_health_data/e2e/layers.spec.ts`

- [ ] **Step 1: Create the layer switching test**

```typescript
import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'
import { switchLayer, getDashboardName, isVA } from './lib/navigation'

test.describe('Geographic layer switching', () => {
  test.describe.configure({ mode: 'serial' })

  test('can switch through all core layers with data loading', async ({ page }) => {
    const guards = await attachNetworkGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    const dashboardName = await getDashboardName(page)
    const layers = isVA(dashboardName)
      ? ['district', 'county', 'tract']
      : ['county', 'tract', 'block_group']

    for (const layer of layers) {
      await switchLayer(page, layer)
      await waitForDataUpdate(page)
      await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
    }

    const failures = guards.getFailures()
    expect(
      failures,
      `Failed requests during layer switching:\n${failures
        .map((f) => `- ${f.method} ${f.status ?? ''} ${f.url}`)
        .join('\n')}`
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test**

Run: `cd /Users/ads7fg/git/virginia_public_health_data && npx playwright test e2e/layers.spec.ts --reporter=list 2>&1 | tail -10`
Expected: Test passes

- [ ] **Step 3: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add e2e/layers.spec.ts
git commit -m "feat(e2e): add geographic layer switching test"
```

### Task 15: Create VA years.spec.ts

**Files:**
- Create: `virginia_public_health_data/e2e/years.spec.ts`

- [ ] **Step 1: Create the year navigation test**

```typescript
import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'
import { changeYear, getCurrentYear } from './lib/navigation'

test.describe('Year navigation', () => {
  test('can navigate years and data persists', async ({ page }) => {
    const guards = await attachNetworkGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)
    await waitForDataUpdate(page)

    const startYear = await getCurrentYear(page)

    // Navigate forward
    await changeYear(page, 'next')
    await waitForDataUpdate(page)
    const afterNext = await getCurrentYear(page)
    expect(afterNext).toBeGreaterThanOrEqual(startYear)
    await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())

    // Navigate backward
    await changeYear(page, 'prev')
    await waitForDataUpdate(page)
    await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
  })

  test('prev button disabled at min year', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    // Click prev until disabled
    const prevBtn = page.locator('[data-testid="year-prev"]')
    for (let i = 0; i < 30; i++) {
      if (await prevBtn.isDisabled()) break
      await prevBtn.click()
      await page.waitForTimeout(100)
    }
    await expect(prevBtn).toBeDisabled()
  })

  test('next button disabled at max year', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    // Click next until disabled
    const nextBtn = page.locator('[data-testid="year-next"]')
    for (let i = 0; i < 30; i++) {
      if (await nextBtn.isDisabled()) break
      await nextBtn.click()
      await page.waitForTimeout(100)
    }
    await expect(nextBtn).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the test**

Run: `cd /Users/ads7fg/git/virginia_public_health_data && npx playwright test e2e/years.spec.ts --reporter=list 2>&1 | tail -10`
Expected: 3 tests pass

- [ ] **Step 3: Commit**

```bash
cd /Users/ads7fg/git/virginia_public_health_data
git add e2e/years.spec.ts
git commit -m "feat(e2e): add year navigation tests"
```

### Task 16: Run full VA test suite

- [ ] **Step 1: Run all E2E tests**

Run: `cd /Users/ads7fg/git/virginia_public_health_data && npx playwright test --reporter=list 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 2: If any tests fail, debug and fix**

Use `npx playwright test --ui` for interactive debugging. Fix issues in the test files or data-testid placements, then re-run.

---

## Chunk 5: NCR Dashboard — Test Infrastructure + Tests

### Task 17: Create NCR playwright.config.ts and install Playwright

**Files:**
- Create: `national_capital_region_data/playwright.config.ts`

- [ ] **Step 1: Install Playwright as dev dependency**

Run: `cd /Users/ads7fg/git/national_capital_region_data && npm install -D @playwright/test && npx playwright install chromium`

- [ ] **Step 2: Add test:e2e script to package.json**

Add `"test:e2e": "playwright test"` to the `scripts` section.

- [ ] **Step 3: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 4: Add Playwright artifacts to .gitignore**

Append these lines to `.gitignore` (if not already present):

```
# Playwright
test-results/
playwright-report/
```

- [ ] **Step 5: Commit**

```bash
cd /Users/ads7fg/git/national_capital_region_data
git add playwright.config.ts package.json package-lock.json .gitignore
git commit -m "feat(e2e): add Playwright config and dependency for NCR dashboard"
```

### Task 18: Copy e2e/ test files and lib to NCR

**Files:**
- Create: `national_capital_region_data/e2e/lib/signals.ts` (copy from VA)
- Create: `national_capital_region_data/e2e/lib/navigation.ts` (copy from VA, remove VA metric-set import)
- Create: `national_capital_region_data/e2e/smoke.spec.ts` (copy from VA)
- Create: `national_capital_region_data/e2e/variables.spec.ts` (copy from VA, remove metric-set import)
- Create: `national_capital_region_data/e2e/layers.spec.ts` (copy from VA)
- Create: `national_capital_region_data/e2e/years.spec.ts` (copy from VA)
- Create: `national_capital_region_data/e2e/README.md` (copy from VA)

- [ ] **Step 1: Copy e2e/lib/ files**

```bash
mkdir -p /Users/ads7fg/git/national_capital_region_data/e2e/lib
cp /Users/ads7fg/git/virginia_public_health_data/e2e/lib/signals.ts /Users/ads7fg/git/national_capital_region_data/e2e/lib/
cp /Users/ads7fg/git/virginia_public_health_data/e2e/lib/navigation.ts /Users/ads7fg/git/national_capital_region_data/e2e/lib/
```

- [ ] **Step 2: Verify navigation.ts works in NCR context**

The `navigation.ts` file has no VA-specific imports — it uses `getDashboardName()` to detect VA vs NCR at runtime and only the VA-specific code paths reference metric-set concepts. No changes needed to `navigation.ts` for NCR. The NCR-specific `variables.spec.ts` (created in Step 4) does not import metric-sets.

- [ ] **Step 3: Copy test files**

```bash
cp /Users/ads7fg/git/virginia_public_health_data/e2e/smoke.spec.ts /Users/ads7fg/git/national_capital_region_data/e2e/
cp /Users/ads7fg/git/virginia_public_health_data/e2e/layers.spec.ts /Users/ads7fg/git/national_capital_region_data/e2e/
cp /Users/ads7fg/git/virginia_public_health_data/e2e/years.spec.ts /Users/ads7fg/git/national_capital_region_data/e2e/
cp /Users/ads7fg/git/virginia_public_health_data/e2e/README.md /Users/ads7fg/git/national_capital_region_data/e2e/
```

- [ ] **Step 4: Create NCR-specific variables.spec.ts**

The NCR version does not need metric-set handling. It iterates all variables directly via SidePanel or dropdown fallback:

```typescript
import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'
import { getAvailableVariables, selectVariableFromSidePanel, selectVariableFromDropdown } from './lib/navigation'

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

    const failures: string[] = []

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
        await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
      } catch (e) {
        failures.push(`${v}: ${(e as Error).message.slice(0, 200)}`)
      }
    }

    expect(
      failures,
      `${failures.length} variable(s) failed to load data:\n${failures.join('\n')}`
    ).toEqual([])
  })
})
```

- [ ] **Step 5: Run NCR tests**

Run: `cd /Users/ads7fg/git/national_capital_region_data && npx playwright test --reporter=list 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/ads7fg/git/national_capital_region_data
git add e2e/ package.json package-lock.json
git commit -m "feat(e2e): add complete E2E test suite for NCR dashboard"
```

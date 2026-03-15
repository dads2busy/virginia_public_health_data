# E2E Testing System Design

Cross-dashboard Playwright test suite that verifies every interactive control (variable buttons, layer selectors, year navigation) results in data appearing in the map and table.

## Dashboards Under Test

| Dashboard | Repo | Geographic Levels | Variable Selection |
|-----------|------|-------------------|-------------------|
| VA | `virginia_public_health_data` | district, county, tract | 3 metric-set tabs + SidePanel buttons + VariableDropdown |
| NCR | `national_capital_region_data` | county, tract, block_group + 5 special levels | SidePanel buttons (by category) + VariableDropdown |

Both dashboards share the same component architecture: Next.js 15, Zustand store, Leaflet map, Plotly charts, TanStack RankTable, and JSON data lookups in `public/data/`.

## Test Infrastructure

### Playwright Config

Each dashboard has its own `playwright.config.ts` (already exists in VA). Both configs:

- Test directory: `./e2e`
- Base URL: `BASE_URL` env var, default `http://127.0.0.1:3000`
- Chromium only, 60s timeout, traces on failure
- Add `webServer` block so Playwright starts/stops `npm run dev` automatically:

```typescript
webServer: {
  command: 'npm run dev',
  url: baseURL,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
},
```

`reuseExistingServer: true` (local) means if you already have `npm run dev` running, Playwright uses it. In CI, it always starts fresh.

### Directory Structure

```
e2e/
  lib/
    signals.ts        # Data signal detection + network guards
    navigation.ts     # Helpers for selecting variables, layers, years
  smoke.spec.ts       # App loads, basic navigation works
  variables.spec.ts   # Data-driven: every variable loads data
  layers.spec.ts      # Geographic level switching
  years.spec.ts       # Year navigation
  README.md           # Usage instructions (exists in VA)
```

### Shared Library (`e2e/lib/`)

#### `signals.ts`

Extracted from the existing `smoke.spec.ts`. Provides:

- `collectDataSignals(page)` — counts visible tables-with-rows, Plotly charts, Leaflet map containers. The `isVisible` helper is defined *inside* the `page.evaluate` callback (not importable from module scope) because `page.evaluate` serializes and runs in the browser context.
- `attachNetworkGuards(page)` — tracks failed requests and successful `/data/*.json` responses
- `assertSomeDataAppears(page, dataResponseCount)` — asserts at least one data signal exists and no "no data" text
- `waitForDataUpdate(page)` — waits for `networkidle` + 500ms settle period. This matches the existing smoke test pattern. The settle accounts for React state updates that trigger after data fetch completes.

#### `navigation.ts`

Dashboard-interaction helpers that use `data-testid` attributes:

- `openFilterMenu(page)` — checks if `[data-testid="filter-menu"]` exists in the DOM; if not, clicks the Filter button in Navbar to open it. **Must be called before** `selectVariableFromDropdown` or `switchLayer`, since FilterMenu conditionally renders (`if (!filterOpen) return null`).
- `selectVariableFromSidePanel(page, variableKey)` — clicks `[data-testid="var-btn-{key}"]`. In NCR, expands the parent category header first if collapsed. In VA, the SidePanel has no collapsible categories (buttons are always rendered within the active metric set), so no expansion is needed.
- `selectVariableFromDropdown(page, variableKey)` — calls `openFilterMenu`, then opens the VariableDropdown trigger, clicks `[data-testid="variable-option-{key}"]`
- `switchLayer(page, level)` — calls `openFilterMenu`. For VA: clicks `[data-testid="layer-btn-{level}"]` (throws if the button is disabled, indicating the variable has no data at that level). For NCR: uses `page.selectOption('[data-testid="layer-select"]', level)` (native `<select>` element).
- `changeYear(page, direction)` — clicks `[data-testid="year-prev"]` or `[data-testid="year-next"]`
- `switchMetricSet(page, set)` — VA only; clicks `[data-testid="metric-tab-{set}"]`
- `getAvailableVariables(page)` — fetches both `measure_info.json` and `datapackage.json` from the running app, returns the intersection: `Object.keys(measureInfo)` filtered to keys that appear in at least one `datapackage.resources[].schema.fields[]`. Excludes `_geo10` suffixed keys (dashboard is `_geo20` only).
- `getCurrentYear(page)` — reads value from `[data-testid="year-input"]`

**Dashboard detection:** Navigation helpers detect which dashboard they're running against by reading the `name` field from `datapackage.json` (already fetched by `getAvailableVariables`). VA uses `"vdh_rural_health"`, NCR uses a different name. This is more robust than checking for DOM elements that may not exist yet during test setup.

**VA metric-set mapping:** The test imports the metric-set configuration directly from `src/lib/config/metric-sets.ts` (a TypeScript module that maps metric set names to their variable lists). Playwright tests run in Node and can import project TypeScript files. This avoids hardcoding the mapping or probing the DOM.

## `data-testid` Attributes

Added to components in both dashboards. These are the stable selectors tests depend on.

### Both Dashboards

| Component | Attribute | Example |
|-----------|-----------|---------|
| SidePanel variable button | `data-testid="var-btn-{variableKey}"` | `var-btn-perc_above_25_3_geo20` |
| SidePanel category header | `data-testid="var-category-{slug}"` | `var-category-broadband` |
| VariableDropdown trigger | `data-testid="variable-dropdown"` | |
| VariableDropdown option | `data-testid="variable-option-{key}"` | `variable-option-perc_above_25_3_geo20` |
| YearSelector prev button | `data-testid="year-prev"` | |
| YearSelector next button | `data-testid="year-next"` | |
| YearSelector input | `data-testid="year-input"` | |
| RankTable container | `data-testid="rank-table"` | |
| Map container wrapper | `data-testid="dashboard-map"` | |
| FilterMenu container | `data-testid="filter-menu"` | |

### VA Only

| Component | Attribute | Example |
|-----------|-----------|---------|
| Metric set tab | `data-testid="metric-tab-{set}"` | `metric-tab-rural_health` |
| Layer button | `data-testid="layer-btn-{level}"` | `layer-btn-district` |

### NCR Only

| Component | Attribute | Example |
|-----------|-----------|---------|
| Layer dropdown | `data-testid="layer-select"` | |

## Test Specifications

### `smoke.spec.ts` (existing, refactored)

Refactor to import helpers from `e2e/lib/signals.ts`. No behavior changes — same two tests:

1. Home loads and data appears
2. Can interact without blanking out data

Note: the refactoring also fixes the existing `isVisible` scoping bug (currently defined at module scope but used inside `page.evaluate`, which works by accident due to function hoisting but is fragile).

### `variables.spec.ts` (new, highest value)

Data-driven test that verifies every variable loads data when selected.

**Strategy:**
1. At test setup, fetch `measure_info.json` and `datapackage.json` from the running app
2. Compute the testable variable list (intersection of both files, excluding `_geo10` keys)
3. Generate one `test()` call per variable using `test.describe` + loop. Individual `test()` calls per variable (not a single test with a loop) so that failures are isolated and the report shows exactly which variables broke.
4. Each test:
   - Click the variable's SidePanel button (`var-btn-{key}`)
   - Wait for data update (networkidle + 500ms settle)
   - Assert data signals (table rows + map container)
   - Assert no failed `/data/*.json` requests

**VA metric-set handling:** The VA SidePanel only shows variables for the active metric set. The test must switch metric sets to reach all variables. Strategy: group variables by metric set (using the metric-set config), iterate metric sets in order, and within each set iterate its variables. Call `switchMetricSet(page, set)` once per group before iterating that group's variables.

**NCR category handling:** NCR's SidePanel shows all variables grouped by category. Categories start collapsed. The `selectVariableFromSidePanel` helper expands the category before clicking the variable button.

**Variables only in VariableDropdown:** Some variables may appear in `measure_info.json` and `datapackage.json` but not in the SidePanel (the SidePanel shows a curated subset). For these, fall back to `selectVariableFromDropdown`. Detection: if `[data-testid="var-btn-{key}"]` does not exist in the DOM, use the dropdown instead.

**Parallelism:** `variables.spec.ts` uses `test.describe.configure({ mode: 'serial' })` to ensure sequential execution within the describe block, since tests share browser state (the dashboard is a single-page app — each variable click mutates shared state). Different test *files* can still run concurrently via `fullyParallel`.

**Timeout:** 15 seconds per variable test (includes network + render + possible lazy data load). Total suite timeout is Playwright's default per-file timeout (60s), increased if needed via `test.describe.configure({ timeout })` based on variable count.

**Data stability assumption:** Tests assume `public/data/` contains a complete data build. If data files are missing, the network guard will catch 404s and the test will fail with a clear message indicating which data file was not found.

### `layers.spec.ts` (new)

Tests geographic level switching for a known-good variable that exists at multiple levels.

**VA tests:**
1. Start at district → assert data
2. Switch to county → assert data
3. Switch to tract → assert data (lazy load)

**NCR tests:**
1. Start at county → assert data
2. Switch to tract → assert data
3. Switch to block_group → assert data (lazy load)

Uses a hardcoded "reference variable" known to exist at all levels (e.g., a demographics variable).

NCR's 5 special geographic levels (civic_association, zip_code, planning_district, supervisor_district, human_services_region) are excluded from initial layer tests. Most variables only have data at county/tract/block_group. Special levels can be added as a follow-up once the core tests are stable.

### `years.spec.ts` (new)

Tests year navigation for a sample variable.

1. Load default variable
2. Click year-next, assert data persists
3. Click year-prev, assert data persists
4. Navigate to min year boundary, assert prev button is disabled (`expect(button).toBeDisabled()`)
5. Navigate to max year boundary, assert next button is disabled (`expect(button).toBeDisabled()`)

## Component Modifications Required

Every `data-testid` attribute listed above must be added to the source components. None exist today.

### VA Dashboard (`virginia_public_health_data`)

| File | Attribute(s) to Add |
|------|---------------------|
| `src/components/layout/SidePanel.tsx` | `var-btn-{variable}` on each variable button, `metric-tab-{set}` on each metric set tab |
| `src/components/layout/FilterMenu.tsx` | `filter-menu` on container div, `layer-btn-{level}` on each layer button |
| `src/components/shared/VariableDropdown.tsx` | `variable-dropdown` on trigger button, `variable-option-{key}` on each option |
| `src/components/shared/YearSelector.tsx` | `year-prev`, `year-next` on arrow buttons, `year-input` on the input |
| `src/components/table/RankTable.tsx` | `rank-table` on the outermost container |
| `src/components/map/DashboardMap.tsx` | `dashboard-map` on the map wrapper div |

### NCR Dashboard (`national_capital_region_data`)

| File | Attribute(s) to Add |
|------|---------------------|
| `src/components/layout/SidePanel.tsx` | `var-btn-{variable}` on each variable button, `var-category-{slug}` on each category header |
| `src/components/layout/FilterMenu.tsx` | `filter-menu` on container div, `layer-select` on the geographic level `<select>` |
| `src/components/shared/VariableDropdown.tsx` | `variable-dropdown` on trigger button, `variable-option-{key}` on each option |
| `src/components/shared/YearSelector.tsx` | `year-prev`, `year-next` on arrow buttons, `year-input` on the input |
| `src/components/table/RankTable.tsx` | `rank-table` on the outermost container |
| `src/components/map/DashboardMap.tsx` | `dashboard-map` on the map wrapper div |

## Category Slug Generation

SidePanel category headers need a slugified `data-testid`. Use a simple slug function:

```typescript
function slugify(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
// "Broadband" → "broadband"
// "Cost-burdened HHs" → "cost-burdened-hhs"
```

## Scope Exclusions

- No visual regression / screenshot comparison
- No Gemini chat interaction testing
- No mobile viewport testing (can add as separate Playwright project later)
- No export/download testing
- Tests run against dev server only, not production static export
- No unit tests (vitest) in this design — E2E only

## Cross-Dashboard Reuse

Both dashboards get identical `e2e/lib/` files and test files. The tests are dashboard-agnostic because:

- Variable lists come from each dashboard's own `measure_info.json` + `datapackage.json` at runtime
- Navigation helpers auto-detect the dashboard (VA vs NCR) by checking for VA-only elements
- Layer switching uses the appropriate interaction method per dashboard (buttons vs `<select>`)
- The `webServer` config points each dashboard to its own `npm run dev`

When adding a test to one dashboard, copy it to the other. The shared library (`e2e/lib/`) is duplicated rather than extracted to a shared package — this avoids cross-repo dependency management for a small amount of code.

## CI Integration

The existing `playwright.config.ts` already has CI-specific settings (retries: 2, workers: 2, GitHub Actions reporter). Adding a GitHub Actions workflow for E2E tests is out of scope for this design but the config is ready for it. The `webServer` block ensures CI can run tests without a separate server-start step.

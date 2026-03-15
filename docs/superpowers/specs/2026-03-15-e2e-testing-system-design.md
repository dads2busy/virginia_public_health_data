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
- Add `webServer` block so Playwright starts/stops `npm run dev` automatically
- Chromium only, 60s timeout, traces on failure

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

- `collectDataSignals(page)` — counts visible tables-with-rows, Plotly charts, Leaflet map containers
- `attachNetworkGuards(page)` — tracks failed requests and successful `/data/*.json` responses
- `assertSomeDataAppears(page, dataResponseCount)` — asserts at least one data signal exists and no "no data" text
- `waitForDataUpdate(page, opts?)` — waits for network idle + a short settle period after an interaction
- `isVisible(el)` — CSS visibility check (used inside `page.evaluate`)

#### `navigation.ts`

Dashboard-interaction helpers that use `data-testid` attributes:

- `selectVariableFromSidePanel(page, variableKey)` — clicks `[data-testid="var-btn-{key}"]`, expanding the parent category if collapsed
- `selectVariableFromDropdown(page, variableKey)` — opens dropdown, clicks `[data-testid="variable-option-{key}"]`
- `switchLayer(page, level)` — clicks layer button or selects from dropdown
- `changeYear(page, direction)` — clicks `[data-testid="year-prev"]` or `[data-testid="year-next"]`
- `switchMetricSet(page, set)` — VA only; clicks `[data-testid="metric-tab-{set}"]`
- `getAvailableVariables(page)` — reads `measure_info.json` via fetch to get the full variable list
- `getCurrentYear(page)` — reads value from `[data-testid="year-input"]`

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

### `variables.spec.ts` (new, highest value)

Data-driven test that verifies every variable in `measure_info.json` loads data.

**Strategy:**
1. Fetch `measure_info.json` from the running app at test setup
2. Group variables by category (matching SidePanel structure)
3. For each variable:
   - Click its SidePanel button (`var-btn-{key}`)
   - Wait for data update (network idle + settle)
   - Assert data signals (table rows + map container)
   - Assert no failed `/data/*.json` requests

**Parallelism:** Tests run sequentially within a single browser context (the dashboard is a single-page app; each variable click is a state change, not a navigation). But Playwright's `fullyParallel` can run different test files concurrently.

**Timeout:** 5 seconds per variable interaction (includes network + render). Total test timeout scaled to variable count.

**Filtering variables:** Skip `_geo10` suffixed variables (dashboard is `_geo20` only). Read the variable list from `measure_info.json` keys, filtering to only keys present in `datapackage.json` resources (confirming they have actual data).

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

### `years.spec.ts` (new)

Tests year navigation for a sample variable.

1. Load default variable
2. Click year-next, assert data persists
3. Click year-prev, assert data persists
4. Navigate to min year boundary, assert prev button disabled
5. Navigate to max year boundary, assert next button disabled

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

- Variable lists come from each dashboard's own `measure_info.json` at runtime
- Layer switching uses `data-testid` attributes that map to each dashboard's UI pattern
- The `webServer` config points each dashboard to its own `npm run dev`

When adding a test to one dashboard, copy it to the other. The shared library (`e2e/lib/`) is duplicated rather than extracted to a shared package — this avoids cross-repo dependency management for a small amount of code.

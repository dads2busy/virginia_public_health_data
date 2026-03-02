# Virginia Public Health Data Dashboard

An interactive choropleth map dashboard for exploring Virginia public health, demographic, economic, and environmental metrics. Built for the **Virginia Department of Health (VDH)**, this is a Next.js/TypeScript rewrite of an original R/Shiny application (`site.R` / `build.R`).

**Live site:** https://uva-bi-sdad.github.io/virginia_public_health_data

---

## Purpose

The dashboard lets users visualize ~50 health-related variables across three geographic levels:

- **Health Districts** — 35 VDH administrative regions
- **Counties** — Virginia counties and independent cities
- **Census Tracts** — Fine-grained tract-level data

Users can drill down from district → county → tract, filter by rural/mixed/urban region type, scrub through time (2009–2023), view ranked tables, and plot time-series charts. Dashboard state is serialized to the URL for sharing.

### Metric Sets

Three top-level metric groupings are available:

| Metric Set | Categories |
|---|---|
| **Rural Health** | Education, Broadband, Nutrition/Food Security, Maternal & Infant Health, Healthcare Access, Behavioral Health, Employment |
| **Health Opportunity Index (HOI)** | HOI composite index, Economic Opportunity, Built Environment, Consumer Opportunity, Social Impact, and 14 related measures |
| **Unit Profiles** | Demographic Summary, Agriculture, Health, Education, Business & Employment |

---

## Architecture

### Tech Stack

| Technology | Role |
|---|---|
| **Next.js 15** (App Router) | React framework; static site export (`output: 'export'`) |
| **React 19** | UI component library |
| **TypeScript 5.7** | Strict typing throughout; build errors are not suppressed |
| **Tailwind CSS 4** | Utility-first styling via PostCSS |
| **Zustand 5** | Global state with `persist` middleware (localStorage) |
| **nuqs 2** | URL search-param state sync for shareable dashboard URLs |
| **next-themes** | Dark/light theme switching |
| **react-leaflet 5** / **Leaflet 1.9** | Interactive choropleth map with GeoJSON overlays |
| **react-plotly.js** / **plotly.js-basic-dist-min** | Time-series scatter/bar plots |
| **@tanstack/react-table 8** | Sortable rank table |
| **@tanstack/react-virtual** | Row virtualization for large (tract-level) tables |
| **tsx** | TypeScript execution for the Node.js build script |
| **lzma-native** | xz decompression in the build script |
| **csv-parse** | CSV parsing in the build script |
| **simple-statistics** | Descriptive statistics (mean, SD, min, max) in the build script |
| **Vitest** | Unit testing |
| **Playwright** | End-to-end testing |

---

### Directory Structure

```
virginia_public_health_data/
├── data/                        # Source data (not served; committed as-is)
│   ├── health_district.csv.xz   # xz-compressed CSV for district level
│   ├── county.csv.xz            # xz-compressed CSV for county level
│   ├── tract.csv.xz             # xz-compressed CSV for tract level (~9.2 MB compressed)
│   └── measure_info.json        # Human-readable variable metadata (~864 KB)
│
├── public/
│   ├── data/                    # Build output — JSON lookups served to the browser
│   │   ├── district.json        # ~367 KB
│   │   ├── county.json          # ~1.8 MB
│   │   ├── tract.json           # ~32 MB (loaded lazily, only on tract drill-down)
│   │   ├── measure_info.json    # Variable metadata copy
│   │   └── datapackage.json     # Schema + per-variable stats (~1.4 MB)
│   └── geo/                     # GeoJSON boundary files (fetched at build time)
│       ├── district.geojson     # 35 VDH Health Districts (~193 KB)
│       ├── county-2020.geojson  # Virginia counties, 2020 Census (~88 KB)
│       └── tract-2020.geojson   # Census tracts, 2020 (~940 KB)
│
├── scripts/
│   └── build-data.ts            # Data build script (replaces build.R)
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx           # Root layout: ThemeProvider, NuqsAdapter, fonts
│   │   ├── page.tsx             # Single-page dashboard: composes all panels
│   │   └── globals.css
│   ├── components/              # React UI components (see below)
│   └── lib/                     # Core logic: data, state, color, config
│
├── .github/workflows/
│   └── build.yml                # CI/CD: build:data → next build → GitHub Pages deploy
├── next.config.ts               # Static export, basePath, env vars
├── package.json
└── tsconfig.json
```

---

### Component Tree (`src/components/`)

```
DataProvider.tsx              # React Context: data loading + availableLevels computation
├── layout/
│   ├── Navbar.tsx            # Top bar: metric-set switcher, theme toggle
│   ├── SidePanel.tsx         # Left panel: variable selector tree
│   ├── FilterMenu.tsx        # Region type (rural/mixed/urban) + drill-down controls
│   ├── SettingsDrawer.tsx    # Color scale, animation, plot type, table settings
│   └── AboutDrawer.tsx       # About / data source information
├── map/
│   ├── DashboardMap.tsx      # Map outer shell, SSR guard (dynamic import)
│   └── MapInner.tsx          # Leaflet map: GeoJSON render, coloring, hover, drill-down
├── info/
│   ├── VariableInfo.tsx      # Selected variable name, description, sources
│   ├── RegionInfo.tsx        # Hovered/selected region name + value callout
│   └── SummaryInfo.tsx       # Descriptive statistics for current view
├── legend/
│   └── ColorLegend.tsx       # Color scale bar + min/max/median labels
├── plot/
│   └── TimeSeriesPlot.tsx    # Plotly scatter/bar chart for selected region over time
├── table/
│   └── RankTable.tsx         # Virtualized, sortable rank table (all regions)
└── shared/
    ├── Breadcrumb.tsx         # District > County > Tract navigation crumbs
    ├── YearSelector.tsx       # Year slider/input
    ├── ExportDialog.tsx       # CSV/TSV export dialog
    └── DynamicHeading.tsx     # Utility: heading with dynamic level
```

---

### Core Library (`src/lib/`)

#### `lib/data/`

- **`types.ts`** — All TypeScript interfaces. Key types:
  - `DataLookup` — the runtime data format: `{ _meta: { time, variables }, [regionId]: { [xCode]: value|array } }`
  - `DataMeta` / `VariableMapping` — variable-to-short-code mapping and time range
  - `MeasureInfo` / `MeasureInfoMap` — human-readable variable metadata
  - `Datapackage` / `DatapackageField` — schema metadata with per-variable stats (mean, SD, min, max)
  - `GeoJSONFeatureCollection` / `GeoJSONFeature` — GeoJSON shapes
  - Union types: `ShapeLevel`, `MetricSet`, `RegionType`, `PlotType`, `MapAnimation`, etc.

- **`loader.ts`** — Runtime data fetching with an in-memory `Map` cache. Prepends `NEXT_PUBLIC_BASE_PATH` to all URLs for GitHub Pages compatibility. Key functions: `loadInitialData()`, `loadDataset(name)`, `loadGeoJson(path)`.

- **`aggregation.ts`** — Pure data utilities:
  - `getValueAtTime()` — extracts a scalar from a time-series array at a given offset
  - `getRegionValues()` — builds `Map<regionId, number>` for all regions at a given year (used for map coloring)
  - `computeSummary()` — computes descriptive statistics (n, min, max, mean, median, Q1/Q3, IQR, fences)

#### `lib/store/`

- **`index.ts`** — Zustand store with `persist` middleware:
  - Selection state: `metricSet`, `selectedDistrict`, `selectedCounty`, `selectedVariable`, `selectedYear`
  - Filter state: `startingShapes`, `regionTypes` (rural/mixed/urban)
  - Interaction state: `hoveredRegionId`, `selectedRegionId`
  - `settings` object (theme, color scale mode/palette, map animation style, plot type, table behavior) — persisted to localStorage under key `vdh-dashboard-settings`

- **`selectors.ts`** — Derived state:
  - `selectShapes` — resolves active `ShapeLevel` from drill-down state
  - `selectPalette` — picks `lajolla` (rank mode) or `vik` (diverging)
  - `selectShowCountyInput`, `selectCountyInputLocked`

#### `lib/color/`

- **`scale.ts`** — `valueToColor(value, palette, stats, settings)` maps a numeric value to a hex color string. Supports linear, median-centered, mean-centered, and rank-order scaling.
- **`palettes.ts`** — Color palette definitions (`vik` diverging blue–red, `lajolla` sequential).

#### `lib/config/`

- **`metric-sets.ts`** — Defines the three metric sets and their category/button hierarchies for the side panel. ~50+ named variables.
- **`map-shapes.ts`** — GeoJSON source URLs (from `uva-bi-sdad/sdc.geographies` on GitHub), local paths, and Virginia map defaults (center `[37.85, -79.45]`, zoom 6.8).

---

### Data Pipeline

#### Source format (`data/*.csv.xz`)

xz-compressed CSVs with columns: `ID`, `time`, then one column per variable (e.g., `perc_hh_with_broadband`, `percent_food_insecure`).

#### Build script (`scripts/build-data.ts`)

Replaces the original `build.R`. Run via `npm run build:data`:

1. Decompresses `.csv.xz` files with `lzma-native`
2. Parses CSVs with `csv-parse`
3. Computes per-variable statistics with `simple-statistics`
4. Encodes variable names as short codes (`X2`, `X3`, …) to reduce JSON payload size
5. Writes indexed JSON lookups to `public/data/`
6. Fetches GeoJSON boundary files from `uva-bi-sdad/sdc.geographies` on GitHub → `public/geo/`
7. Writes `datapackage.json` with field-level schema and statistics

#### Runtime JSON format (`public/data/*.json`)

Variables are short-code encoded. Time-series data is stored as arrays offset from the global time minimum:

```json
{
  "_meta": {
    "time": { "value": [2009, 2010, ..., 2023], "name": "time" },
    "variables": {
      "perc_hh_with_broadband": { "code": "X2", "time_range": [0, 14] },
      "percent_food_insecure":  { "code": "X3", "time_range": [2, 14] }
    }
  },
  "51001": { "X2": [42.1, 43.5, ...], "X3": 18.2 },
  "51003": { "X2": [55.0, 56.1, ...] }
}
```

Region IDs are GEOID strings (e.g., `"51001"` for Accomack County). Scalar values indicate the variable has only one time point for that region.

#### Data loading at runtime

`DataProvider.tsx` manages loading state:
- **Eagerly** loads `district.json`, `county.json`, `measure_info.json`, `datapackage.json` in parallel on mount
- **Lazily** loads `tract.json` only when the user drills down to tract level (~32 MB)
- `availableLevels` is computed from `datapackage.json` metadata; the active level auto-switches when the selected variable isn't available at the current level

---

### Deployment

#### Local development

```bash
npm install
npm run build:data      # generate public/data/ and public/geo/
npm run dev             # Next.js dev server at http://localhost:3000
```

`public/data/` and `public/geo/` are committed to the repo, so `build:data` only needs to be re-run when source data changes.

#### Production build

```bash
npm run build           # Next.js static export → out/
```

`next.config.ts` sets `basePath: '/virginia_public_health_data'` in production and exposes it as `NEXT_PUBLIC_BASE_PATH` for runtime fetch calls.

#### CI/CD (`.github/workflows/build.yml`)

Triggered on push to `main`:
1. `npm ci`
2. `npm run build:data` — regenerates JSON data files
3. `npm run build` — Next.js static export to `out/`
4. Uploads `out/` as a GitHub Pages artifact and deploys

#### Testing

```bash
npm test          # Vitest unit tests
npm run test:e2e  # Playwright end-to-end tests
```

Neither `vitest.config.ts` nor `playwright.config.ts` exist; both runners use their default configurations.

---

### Key Design Decisions

- **Static export:** The entire site is pre-rendered to static HTML/JS/CSS. There is no server-side runtime. All data is fetched from static JSON files at runtime.
- **Short-code variable encoding:** Variable names like `perc_hh_with_broadband` are mapped to `X2`, `X3`, etc. in the JSON output to reduce file size (especially important for `tract.json` at ~32 MB).
- **Lazy tract loading:** Tract-level data is the largest dataset and is only fetched on demand when the user drills down, keeping initial page load fast.
- **URL state via nuqs:** All significant dashboard state (variable, year, selected region, drill-down level) is reflected in URL search params, enabling bookmarkable and shareable views.
- **Zustand + localStorage persistence:** User preferences (color scale, theme, animation style, etc.) are persisted across sessions without requiring a backend.
- **GeoJSON sourced from `uva-bi-sdad/sdc.geographies`:** Boundary files are fetched at build time and committed to `public/geo/`. They do not need to be re-fetched unless boundaries change.

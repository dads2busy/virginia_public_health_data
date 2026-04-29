# Virginia Public Health Data Dashboard

An interactive choropleth map dashboard for exploring Virginia public health, demographic, economic, and environmental indicators across health districts, counties, and census tracts.

**Live site:** https://uva-bi-sdad.github.io/virginia_public_health_data

---

## Purpose

The dashboard visualizes dozens of indicators across three geographic levels:

- **Health Districts** — 35 VDH administrative regions
- **Counties** — Virginia counties and independent cities
- **Census Tracts** — tract-level data for fine-grained analysis

Users can drill down from district → county → tract, filter by region type (rural/mixed/urban), scrub through time, view ranked tables, and plot time-series charts. Dashboard state is serialized to the URL for sharing, and an embedded Gemini chat assistant answers natural-language questions about the visible data.

### Metric Sets

| Metric Set | Categories |
|---|---|
| **Rural Health** | Education, Broadband, Nutrition / Food Security, Maternal & Infant Health, Healthcare Access, Behavioral Health, Employment |
| **Health Opportunity Index (HOI)** | HOI composite, Economic Opportunity, Built Environment, Consumer Opportunity, Social Impact, and related sub-measures |
| **Unit Profiles** | Demographic Summary, Agriculture, Health, Education, Business & Employment |

---

## Stack

| Technology | Role |
|---|---|
| **Next.js 15** (App Router) | React framework; static export (`output: 'export'`) |
| **React 19** | UI components |
| **TypeScript 5.7** (strict) | Type safety throughout |
| **Tailwind CSS 4** | Utility-first styling via PostCSS |
| **Zustand 5** | Global UI state with `persist` middleware (localStorage) |
| **Nuqs 2** | URL search-param state for shareable views |
| **next-themes** | Dark / light theme switching |
| **React Leaflet 5** + **Leaflet 1.9** | Choropleth map with GeoJSON overlays (lazy loaded, no SSR) |
| **Plotly.js** (basic, minified) | Time-series scatter / bar plots |
| **TanStack Table 8** + **TanStack Virtual** | Sortable, virtualized rank table |
| **@google/generative-ai** | Gemini-powered chat assistant and narrative / correlation generation |
| **tsx** | TypeScript execution for build-time Node scripts |
| **lzma-native** | xz decompression in build scripts |
| **csv-parse** | CSV parsing in build scripts |
| **simple-statistics** | Descriptive statistics in build scripts |
| **Vitest** | Unit tests |
| **Playwright** | End-to-end tests |

---

## Architecture

### Directory layout

```
virginia_public_health_data/
├── data/                        # Source data — wide-format xz-compressed CSVs
│   ├── health_district.csv.xz   # combined district-level wide CSV
│   ├── county.csv.xz            # combined county-level wide CSV
│   ├── tract.csv.xz             # combined tract-level wide CSV
│   ├── va_*.csv.xz              # per-indicator source files from social-data-commons
│   └── measure_info.json        # human-readable variable metadata
│
├── public/                      # Static assets served by Next.js
│   ├── data/                    # Build output (gitignored, generated in CI)
│   │   ├── district.json
│   │   ├── county.json
│   │   ├── tract.json           # loaded lazily on tract drill-down
│   │   ├── measure_info.json
│   │   ├── datapackage.json     # schema + per-variable stats
│   │   ├── narratives/          # AI-generated narrative text
│   │   └── correlations/        # precomputed correlation matrices
│   └── geo/                     # GeoJSON boundary files (gitignored, fetched in CI)
│
├── scripts/
│   ├── build-data.ts            # Decompresses CSVs → indexed JSON lookups
│   ├── generate-narratives.ts   # Gemini-authored narrative blurbs per region/variable
│   ├── generate-correlations.ts # Pairwise correlations across variables
│   └── refresh-geo.sh           # Helper to refresh GeoJSON sources
│
├── src/
│   ├── app/                     # Next.js App Router (layout, page, globals.css)
│   ├── components/              # React UI (see below)
│   ├── hooks/
│   └── lib/                     # Core logic: data, state, color, config, gemini, geo
│
├── e2e/                         # Playwright specs
├── geo-sources/                 # GeoJSON source manifests
├── .github/workflows/build.yml  # CI: build:data → next build → GitHub Pages deploy
├── next.config.ts
├── package.json
└── tsconfig.json
```

### Components (`src/components/`)

```
DataProvider.tsx              # React Context: data loading + availableLevels
├── chat/
│   ├── AskGeminiButton.tsx   # Entry point for the AI chat assistant
│   ├── ChatDrawer.tsx        # Slide-in chat panel
│   └── ChatInput.tsx
├── layout/                   # Navbar, SidePanel, FilterMenu, drawers (Settings, About)
├── map/                      # DashboardMap (SSR guard) + MapInner (Leaflet)
├── info/                     # VariableInfo, RegionInfo, SummaryInfo
├── legend/                   # ColorLegend
├── plot/                     # TimeSeriesPlot (Plotly)
├── table/                    # RankTable (virtualized)
└── shared/                   # Breadcrumb, YearSelector, ExportDialog, etc.
```

### Library (`src/lib/`)

- **`data/`** — `types.ts` (all interfaces), `loader.ts` (runtime fetch with in-memory cache, `NEXT_PUBLIC_BASE_PATH` aware), `aggregation.ts` (time-slice extraction, summary stats).
- **`store/`** — Zustand store (`index.ts`) with `persist` middleware under key `vdh-dashboard-settings`; derived selectors (`selectors.ts`) for shape level, palette, drill-down state.
- **`color/`** — `valueToColor()` with linear, mean-centered, median-centered, and rank-order modes; `lajolla` (sequential) and `vik` (diverging) palettes.
- **`config/`** — `metric-sets.ts` defines the three metric sets and their side-panel hierarchies; `map-shapes.ts` lists GeoJSON sources and Virginia map defaults.
- **`gemini/`** — Gemini client, prompt context builder, and types for the chat assistant.
- **`geo/`** — Geo helpers used by the map and build scripts.

---

## Data pipeline

### Source format

`data/*.csv.xz` files are xz-compressed wide-format CSVs with columns `ID`, `time`, then one column per variable (e.g. `perc_hh_with_broadband`, `percent_food_insecure`). They are produced upstream by the [social-data-commons](https://github.com/uva-bi-sdad/social-data-commons) pipelines and copied into this repo.

### Build (`npm run build:data`)

`scripts/build-data.ts`:

1. Decompresses each `.csv.xz` with `lzma-native`.
2. Parses CSVs with `csv-parse`.
3. Computes per-variable statistics with `simple-statistics`.
4. Encodes variable names as short codes (`X2`, `X3`, …) to shrink the JSON payload (especially `tract.json`).
5. Writes indexed JSON lookups to `public/data/`.
6. Fetches GeoJSON boundary files from `uva-bi-sdad/sdc.geographies` into `public/geo/`.
7. Emits `datapackage.json` with per-field schema and statistics.

Two optional build steps power the AI features:

- `npm run build:narratives` (`scripts/generate-narratives.ts`) — uses Gemini to generate narrative blurbs per region/variable.
- `npm run build:correlations` (`scripts/generate-correlations.ts`) — precomputes pairwise correlations across variables.

### Runtime JSON format

```json
{
  "_meta": {
    "time": { "value": [2009, 2010, ..., 2024], "name": "time" },
    "variables": {
      "perc_hh_with_broadband": { "code": "X2", "time_range": [0, 14] },
      "percent_food_insecure":  { "code": "X3", "time_range": [2, 14] }
    }
  },
  "51001": { "X2": [42.1, 43.5, ...], "X3": 18.2 },
  "51003": { "X2": [55.0, 56.1, ...] }
}
```

Region IDs are GEOID strings (e.g. `"51001"` for Accomack County). Time-series are arrays offset from the global time minimum; scalars indicate a single observation.

### Runtime data loading

`DataProvider.tsx` orchestrates loading:

- **Eagerly** loads `district.json`, `county.json`, `measure_info.json`, and `datapackage.json` in parallel on mount.
- **Lazily** loads `tract.json` only when the user drills down to tract level.
- Computes `availableLevels` from `datapackage.json`; the active level auto-switches when the selected variable isn't available at the current level.
- All data loading flows through DataProvider — components never fetch JSON directly.

---

## Development

### Local setup

```bash
npm install
npm run build:data      # generate public/data/ and public/geo/
npm run dev             # http://localhost:3000
```

`build:data` only needs to be re-run when source data changes. Build artifacts (`public/data/`, `public/geo/`) are gitignored.

### Environment

Configure in `.env.local` (never hardcode keys):

```
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

### Production build

```bash
npm run build           # static export → out/
```

`next.config.ts` sets `basePath: '/virginia_public_health_data'` in production and exposes `NEXT_PUBLIC_BASE_PATH` for runtime fetches.

### Testing

```bash
npm test                # Vitest unit tests
npm run test:e2e        # Playwright end-to-end tests
```

### CI/CD (`.github/workflows/build.yml`)

On push to `main`:

1. `npm ci`
2. `npm run build:data` — regenerate JSON data and GeoJSON
3. `npm run build` — Next.js static export to `out/`
4. Upload `out/` as a GitHub Pages artifact and deploy

---

## Key design decisions

- **Static export.** The site is fully pre-rendered; there is no server runtime. All data is fetched from static JSON at runtime.
- **Short-code variable encoding.** Long variable names are mapped to `X2`, `X3`, … in the runtime JSON to keep payload sizes manageable, especially at the tract level.
- **Lazy tract loading.** Tract data is fetched only on drill-down, keeping initial page load fast.
- **URL state via Nuqs.** Variable, year, selected region, and drill-down level are all URL-reflected, enabling bookmarkable and shareable views.
- **Persisted preferences.** Settings (color scale, theme, animation, plot type, table behavior) are persisted to localStorage via Zustand's `persist` middleware.
- **GeoJSON from `uva-bi-sdad/sdc.geographies`.** Boundary files are fetched at build time. The dashboard renders the `_geo20` (2020 Census) geography only.
- **AI assistance is first-class.** The Gemini chat assistant and pre-generated narrative/correlation outputs are integral to the user experience, not bolt-ons.

---

## Related repositories

- **[social-data-commons](https://github.com/uva-bi-sdad/social-data-commons)** — Python pipelines that produce the source datasets in `data/`.
- **[national_capital_region_data](https://github.com/uva-bi-sdad/national_capital_region_data)** — Sister dashboard for the National Capital Region; same architecture, kept in sync.

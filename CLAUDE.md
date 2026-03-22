# VA Dashboard — Claude Instructions

## Project (GOAL)

This is the Virginia Public Health Data Next.js dashboard. It displays demographic, economic, health, housing, and other indicator data on interactive maps and charts.

Data is produced by pipelines in the social-data-commons and copied into `data/` as wide-format compressed CSVs. `npm run build:data` transforms these into JSON lookups in `public/data/`.

Success = the dashboard builds via `npm run build` with zero TypeScript errors, renders correctly as a static export, and all data flows from data/*.csv.xz → public/data/*.json → map/chart/table components.

## Related Repos

- `/Users/ads7fg/git/social-data-commons` — data pipelines (Python/uv) that produce the datasets for this dashboard. Read `/Users/ads7fg/git/social-data-commons/CLAUDE.md` when working on data pipeline tasks.
- `/Users/ads7fg/git/national_capital_region_data` — NCR dashboard (same architecture)

## Architecture

See `/Users/ads7fg/.claude/projects/-Users-ads7fg-git-national-capital-region-data/memory/architecture.md` for the full data flow, app structure, state management, and key source files.

## Memory

Read the memory index at `/Users/ads7fg/.claude/projects/-Users-ads7fg-git-national-capital-region-data/memory/MEMORY.md` at the start of every conversation. Load specific memory files as needed based on the task.

## Stack (CONSTRAINTS — non-negotiable)

- **Framework**: Next.js 15 App Router, React 19, TypeScript strict mode
- **Output**: Static export (`output: 'export'`)
- **Styling**: Tailwind CSS 4 + tailwind-merge. No CSS modules, no styled-components, no other CSS-in-JS.
- **State**: Zustand 5 (UI state, localStorage persistence), React Context (data loading), Nuqs (URL state)
- **Map**: React Leaflet 5 (lazy loaded, no SSR)
- **Charts**: Plotly.js (via react-plotly.js)
- **Table**: TanStack Table 8 + TanStack Virtual
- **AI**: Gemini API (@google/generative-ai) for chat integration AND narrative generation. Never remove or replace Gemini chat.
- **Build scripts**: tsx for Node scripts (build-data.ts, generate-narratives.ts, generate-correlations.ts)
- **Testing**: Vitest (unit), Playwright (e2e)
- **Deployment**: GitHub Pages via CI (.github/workflows/build.yml). `build:data` runs in CI — build artifacts are gitignored.

## Hard Rules (CONSTRAINTS)

- **Dashboard parity**: Any operational change to this dashboard (build process, data loading, geo sourcing, CI workflow, state management patterns) must be considered for the NCR dashboard too, and vice versa. The two dashboards must stay architecturally in sync. Flag divergences explicitly.
- Never install a new dependency without asking first.
- Never swap a library in the stack.
- All data flows through DataProvider context — never fetch JSON directly in components.
- Server components by default. Client components only when interactivity requires it.
- `@/*` path alias for all imports from `src/`.
- Prettier config: printWidth 120, no semicolons, single quotes, trailing commas in es5 positions.
- Dashboard shows `_geo20` geography only. `_geo10` is for researcher downloads, not displayed.
- VA geographic levels include health_district (not present in NCR).
- Environment variables via `.env.local`, never hardcoded.
- VA has `build:narratives` and `build:correlations` scripts — NCR does not. Don't remove these.
- The Gemini chat integration (AskGeminiButton + ChatDrawer) must never be removed. "AI summary panel" refers to narrative text, NOT the chat.

## Output Format (FORMAT)

- Same component/directory structure as NCR: `src/components/{domain}/`, `src/lib/data/`, `src/lib/store/`.
- Types in `src/lib/data/types.ts` or co-located.
- Build/data scripts in `scripts/`.
- Source data in `data/`. Built output in `public/data/` and `public/geo/` (gitignored, built in CI).
- Keep components under 200 lines. Extract sub-components if exceeding.
- TypeScript types on all exported function parameters and return values.

## Failure Conditions (what makes output unacceptable)

- TypeScript build errors (`npm run build` must pass).
- Using `useEffect` to fetch data that should go through DataProvider.
- Using `useState` for data that belongs in Zustand store or URL state (Nuqs).
- Any component that imports data JSON directly instead of going through the data loading layer.
- Missing loading/error states on async data renders.
- Introducing a UI library — Tailwind utility classes only.
- SSR-incompatible code in server components.
- Hardcoded basePath or API keys.
- Removing or breaking the Gemini chat integration or narrative generation.
- Build artifacts (public/data/*.json, public/geo/*.geojson) committed to git.

#!/usr/bin/env bash
# Refresh geo-sources/ from social-data-commons geographies.
# Run this when census boundary files change in social-data-commons.

set -euo pipefail

SDC="${SDC_MONOREPO:-/Users/ads7fg/git/social-data-commons}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/geo-sources"

if [ ! -d "$SDC/geographies" ]; then
  echo "Error: social-data-commons not found at $SDC" >&2
  echo "Set SDC_MONOREPO env var to the correct path." >&2
  exit 1
fi

mkdir -p "$DEST"

declare -A SOURCES=(
  [county-2020.geojson]="$SDC/geographies/VA/Census Geographies/County/2020/data/distribution/va_geo_census_cb_2020_counties.geojson"
  [tract-2020.geojson]="$SDC/geographies/VA/Census Geographies/Tract/2020/data/distribution/va_geo_census_cb_2020_census_tracts.geojson"
  [district.geojson]="$SDC/geographies/VA/State Geographies/Health Districts/2020/data/distribution/va_geo_vhd_2020_health_districts.geojson"
  [VA.json]="$SDC/geographies/entities/data/distribution/VA.json"
)

for dest_name in "${!SOURCES[@]}"; do
  src="${SOURCES[$dest_name]}"
  if [ ! -f "$src" ]; then
    echo "WARNING: $src not found, skipping $dest_name" >&2
    continue
  fi
  cp "$src" "$DEST/$dest_name"
  echo "Copied $dest_name"
done

echo "Done. Review changes with: git diff geo-sources/"

#!/bin/sh
set -e
mkdir -p ne
for f in ne_10m_admin_0_countries ne_10m_admin_1_states_provinces ne_10m_populated_places ne_10m_lakes ne_10m_lakes_europe ne_10m_lakes_north_america ne_10m_rivers_lake_centerlines ne_10m_rivers_europe ne_10m_rivers_north_america ne_10m_geography_marine_polys ne_10m_geography_regions_polys; do
  [ -f ne/$f.geojson ] || curl -s -f -o ne/$f.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/$f.geojson
done

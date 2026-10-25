# East Bay and Bay Area map provenance

The game starts in one continuous **Oakland pilot window** connecting West Oakland, the Lake Merritt area, and Ivy Hill. Its initial display name is **East Bay**. Original cartoon SVG art sits over projected OpenStreetMap streets, buildings, parks, trees, and water shapes. Zooming out reveals a separately saved **Bay Area** overview; the original starting camera, local geometry, anchors, and routes are retained.

- Attribution: **© OpenStreetMap contributors**.
- Data license: **ODbL 1.0**.
- License information: https://www.openstreetmap.org/copyright
- Extract date: **October 25, 2026 (UTC)**.
- Source: twelve overlapping extracts from the official OpenStreetMap map API, `https://www.openstreetmap.org/api/0.6/map`.
- Every exact extract URL and fetch result is saved in `scripts/data/east-bay-source.json` and copied into the derived dataset's source metadata.
- Rendered bounds, west/south/east/north: `[-122.299, 37.7965, -122.2365, 37.827]`.
- Drawing: **2520 × 1580**.
- Derived dataset: `src/data/east-bay-map.json`, distributed at `/data/east-bay-map.json`.

The dataset contains 10,567 road segments, 16,716 building footprints, 1,308 green-space shapes, 98 water shapes, and 914 mapped tree points. These are geometry records, not a site inventory. The renderer samples tree points and adds original destination illustrations. It joins Lake Merritt's mapped multipolygon boundary instead of inventing a lake outline.

`scripts/prepare-world.py` deduplicates shared OSM elements by type/id and version, projects the geometry, and computes **twelve routes** between the four places using connected street segments. Route selection excludes motorway travel and ways marked private or prohibiting foot access. These are game animation routes, not checked pedestrian directions. Every generated route is tested against the extracted street segments.

| Place | Checked public address | Approximate anchor, latitude/longitude |
| --- | --- | --- |
| West Oakland Farm Park | 2847 Peralta Street | `37.8221718, -122.2858882` |
| deFremery Park | 1651 Adeline Street | `37.8124217, -122.2870094` |
| West Oakland Library | 1801 Adeline Street | `37.81295879, -122.28537639` |
| Gravity Garden | 2519 7th Avenue | `37.8019293, -122.2421346` |
| Oakland Peace Center — Guild participation destination | 111 Fairmount Avenue | `37.8167292, -122.2609187` |

The first three addresses were checked October 24 against ANV, the City of Oakland, and Oakland Public Library. Gravity Garden's address was checked October 25 against the OUFP-linked Garden Steward newsletter: https://garden-steward.beehiiv.com/p/earth-day-block-party-2026. OUFP describes its neighborhood as Ivy Hill: https://www.oufp.org/.

Gravity Garden's point is geocoded from its provider-published address. OSM way 477141854 is an address/building reference, **not a surveyed garden boundary or entrance**. Other anchors use mapped public sites and checked addresses. Destination drawings, beds, benches, people, interiors, learning experiments, and future indicators are stylized teaching material. Their positions and quantities do not establish site conditions or access.

The Peace Center address was checked October 25 against the [public October 25 workday](https://partiful.com/e/y11uw9Cv7OA7BVn8LSVC). Its approximate point comes from the address/building reference [OSM relation 17651405](https://www.openstreetmap.org/relation/17651405), checked the same day. It opens Guild activities rather than a fifth game lesson; no additional character route or surveyed garden outline is asserted. The preparation illustration's tap, bench, beds, and sun positions are authored. The October 15 planning event's location is gated on Partiful, so it has no inferred event pin.

## Regeneration and distribution

Normal `npm run dev` and `npm run build` copy the saved derived datasets into `public/data/`; they do not call an external map service. The game fetches its local East Bay JSON separately from the JavaScript bundle.

For an optional source refresh:

```sh
node scripts/download-world.mjs
python3 scripts/prepare-world.py east-bay
```

The downloader uses twelve small overlapping boxes and at most two simultaneous requests. Raw XML tiles are ignored. Keep the source manifest and derived attribution when distributing the map.

The earlier `west-oakland-map.json` and `ivy-hill-map.json` remain as historical source artifacts. They are no longer separate game views. Their corresponding generator arguments still work with the saved legacy extracts.

## Bay Area overview

- Regional navigation/picking bounds, west/south/east/north: `[-123.6, 36.85, -121.1, 38.95]`. This rectangular window covers the nine-county Bay Area and some neighboring context; it is not an administrative boundary.
- Background geometry bounds: `[-125, 35.7, -119.7, 40.1]`. The larger context halo fills wide and tall screens without treating the edge of the extract as a coastline.
- Natural Earth **1:10 million** land, lakes, roads, and urban areas provide the generalized geographic layer. Source: [Natural Earth downloads](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/), using the [maintainer’s GeoJSON repository](https://github.com/nvkelso/natural-earth-vector) pinned to a revision. Geometry is [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
- City and town names/points use a saved OpenStreetMap place-node extract under **ODbL 1.0**. The regional dataset includes 130 unique labels; wider views prioritize a smaller selection and avoid collisions.
- Source check: **October 25, 2026 (UTC)**. Exact Natural Earth revision, file URLs, SHA-256 hashes, and terms are retained in `scripts/data/bay-area-source.json`. The exact single Overpass query, endpoint, extract timestamp, and filtered public node records are in `scripts/data/bay-area-places.json`.
- Derived layer: `src/data/bay-area-map.json`, served at `/data/bay-area-map.json`, about **200 KB uncompressed**. It contains 4 land polygons, 2 lake polygons, 45 urban-area polygons, and 187 clipped road lines. Population fields are historical hints for label ordering, not displayed population statistics.

The overview stays in geographic coordinates, projected into the unchanged local map coordinate system at render time. Polygon holes are preserved. Small features, exact shorelines, streets, parcels, and site conditions are unresolved at this scale. The detailed Oakland layer reappears on zoom-in; elsewhere site geometry and local environmental evidence remain unknown. Four learning places and the Guild participation destination are grouped as “Oakland · Explore” in the overview. City labels move the camera rather than inventing visitable sites or educational activities.

Camera helpers in `src/exploration/map-camera.ts` calculate a viewport-dependent regional fit, finite zoom limits, panning bounds, and screen-to-world picks. The globe fits the region, the frame restores the original view, and garden pins use their saved geographic coordinates at every zoom.

Optional refresh, using Node and Python 3’s standard library:

```sh
node scripts/download-bay-area.mjs
node scripts/download-bay-area-places.mjs
python3 scripts/prepare-bay-area.py
node scripts/generate-resource-pages.mjs
```

Natural Earth downloads run two at a time. The city downloader runs one read-only query and retains only public city/town fields; it is manually invoked and does not retry automatically. Raw Natural Earth files are ignored by Git. Normal dev/build copies the committed assets and makes no tile, Overpass, or other runtime geographic API calls for the cartoon map. Retain both Natural Earth provenance and OpenStreetMap attribution when reusing the layer.

# RestaurantFinder Architecture and Tradeoffs

This document describes the architecture currently implemented in RestaurantFinder, the reasons behind its major design decisions, and the constraints those decisions create. It covers the visit-led recommendation flow, classic nearby discovery, local persistence, menu enrichment, and native Expo runtime.

## System goals

The primary product loop is:

1. Record restaurants the user actually visited.
2. Capture ratings, notes, photos, menus, and liked dishes from those visits.
3. Derive geographic areas and a local taste profile.
4. Find unvisited restaurants around those areas.
5. Rank them using location, quality, taste, novelty, and price signals.

The app is intentionally local-first. It has no user accounts, cross-device synchronization, or server-side taste profile. A small Node server supports the web build by fetching restaurant data and public menu pages; personal history and ranking stay in the browser.

## System context

```text
                         External providers
              ┌────────────────┬──────────────────┐
              │ Overture Maps │ OSM / Overpass   │
              └───────┬────────┴─────────┬────────┘
                      │ candidates       │
                      ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│                    React Native / Expo app                   │
│                                                              │
│  Visits UI ──► Zustand store ──► MMKV                        │
│      │               │                                       │
│      │               ├──► area clustering                    │
│      │               └──► taste-profile construction         │
│      │                           │                            │
│      └── photos ──► app document storage                     │
│                                  ▼                            │
│  area centroid ──► candidate fetch/cache ──► initial rank    │
│                                               │              │
│                             top websites ─────┘              │
│                                  │                            │
│                                  ▼                            │
│                         menu fetch/cache                      │
│                                  │                            │
│                                  ▼                            │
│                           final rerank ──► For You UI          │
│                                                              │
│  current GPS ──► classic recommendation engine ──► Explore   │
└──────────────────────────────────────────────────────────────┘
```

## Runtime layers

| Layer | Responsibilities | Main modules |
|---|---|---|
| Presentation | Visit capture, recommendations, maps, preferences, details | `src/screens/*`, `src/components/*` |
| Navigation | Five bottom tabs with per-tab stacks | `App.tsx` |
| Orchestration | Coordinates location, fetching, enrichment, ranking, and refresh state | `src/hooks/*` |
| Domain | Pure clustering, taste extraction, and scoring | `src/algorithm/*` |
| Integration | Places, reverse geocoding, menu parsing, filesystem, caches | `src/api/*` |
| State | User preferences, visits, menus, and liked dishes | `src/store/useAppStore.ts` |
| Persistence | MMKV key/value stores plus app document storage for photos | `react-native-mmkv`, `expo-file-system` |

The domain layer is kept mostly pure. External calls and device APIs stay in hooks or API modules, which makes scoring and clustering deterministic and unit-testable.

## Primary recommendation pipeline

### 1. Visit capture

`LogVisitScreen` records a `VisitRecord` containing the restaurant identity, name, cuisines, personal rating, timestamp, and coordinates. Users can enter liked dishes at the same time; the dishes become local menu items and likes. `VisitMenuScreen` can later add notes, up to five photo URIs, menus, and more likes. If GPS is unavailable, explicit neighborhood search supplies a selected location. Manual restaurant entries use that area center; selecting a provider result gives exact restaurant coordinates.

MMKV stores structured visit data synchronously. Photos are copied into the app document directory; only their durable URIs are stored in MMKV. Deleting a visit also deletes its copied photos.

### 2. Area derivation

`AreaClustering.clusterVisits` performs a greedy, single-pass clustering operation:

- A visit joins the first cluster whose current centroid is within 1,000 meters.
- Otherwise, it starts a new cluster.
- The centroid is the arithmetic mean of member coordinates.
- The search radius is at least 1,500 meters and expands to cluster spread plus 500 meters.
- The most recent visit supplies the fallback label.
- Legacy records with missing coordinates are retained in history but excluded from clustering.

The centroid is reverse-geocoded into a neighborhood-style label when possible. Labels are cached by a roughly 100-meter coordinate bucket because neighborhood names change rarely and reverse geocoding is rate-limited.

### 3. Taste profile construction

`TasteProfile.buildTasteProfile` converts local history into three signals:

- Up to 40 normalized terms, weighted by source: liked dish `3`, visit note `2`, menu-item name `1`, menu description `0.5`.
- Cuisine affinity, calculated as the average normalized personal rating for each cuisine.
- Price affinity, inferred from the average price of logged menu items.

Common filler words are removed, but the implementation is intentionally lexical rather than semantic. No embedding model or external profile service is required.

### 4. Candidate acquisition

`useAreaRecommendations` searches one explicitly selected center: current location (the default), a saved visit neighborhood, or a city/neighborhood selected through Photon. Users choose a 1, 3, or 5 km radius. Candidate distances are recomputed from that center and candidates outside the exact radius are excluded. At least one liked dish is required. Stale asynchronous responses cannot overwrite results after a location change.

Native acquisition:

- OpenStreetMap Overpass is the no-key fallback.
- Eligible OSM results are cached in MMKV for 30 minutes using rounded coordinates and radius.
- Already visited restaurant IDs are excluded before display.

Web acquisition uses same-origin `/api/places` with the public Overture places release. A pinned Python reader downloads a bounded area through the official STAC/S3 client, filters restaurant categories, excludes permanently closed/low-confidence records, and returns names, coordinates, cuisine categories, and available websites. Downloads are cached for seven days in `.cache/open-places`, bounded to 64 areas; up to four jobs can wait, and downloads run serially. Results are clipped to the exact radius and duplicate listings are removed. Snapshot dates and attribution are displayed; unknown prices/hours/ratings remain unknown. No account, API key, or paid provider is involved. `FREE_PLACES_PROVIDER=overpass` retains the free Overpass alternative, including node, way, and relation restaurants. Native builds can use the same server with `EXPO_PUBLIC_API_BASE_URL`. `/api/areas` provides explicit neighborhood search. Concurrent identical provider requests share an in-flight read, and failed reads can be retried immediately. The Explore tab keeps its separate generic discovery engine.

### 5. Two-pass scoring and menu enrichment

The first pass ranks every candidate using metadata already available. Up to six nearby unvisited candidates with a public HTTP(S) website are considered for menu enrichment, starting with metadata matches. Candidates without a metadata match can still be promoted by a matching menu dish.

Automated menu fetching:

- Rejects malformed URLs, unsupported schemes, localhost, `.local`, and common private IPv4 ranges.
- Times out after eight seconds.
- Treats fetch, parse, and empty-menu failures as non-fatal.
- Caches successful results for seven days.
- Negatively caches failed or empty results for 24 hours.
- Never adds candidate menus to the user's logged-menu store, preventing recommendations from contaminating the user's taste profile.

The second pass reranks candidates with fetched menu information. Named dishes are compared to explicitly liked dishes, with filler and generic preparation words removed. Menu matches appear before cuisine-only suggestions and preserve the candidate dish, liked dish, and original restaurant for the explanation. Cuisine/keyword fallbacks explicitly say dish availability is unconfirmed. Unrelated candidates are excluded.

The parser accepts structured menu items or price-bearing HTML lines; homepage headings and SEO titles are excluded. One same-origin menu link can be followed. JavaScript-rendered menus, PDFs, and image menus are not extracted.

### 6. Scoring model

`AreaRecommendationEngine` produces a 0–100 score from:

| Factor | Weight | Meaning |
|---|---:|---|
| Taste | 40% | Cuisine affinity plus matches against restaurant metadata and fetched menu text |
| Proximity | 20% | Exponential decay from the selected search center, inside the exact search radius |
| Rating | 20% | Bayesian-adjusted public rating, dampening sparse review counts |
| Novelty | 10% | Currently constant because previously visited candidates are excluded |
| Price | 10% | Fit with the inferred price-affinity band |

Avoided cuisines and unmet dietary restrictions are eligibility gates applied before scoring in both recommendation engines. Dietary matching is conservative: a candidate must advertise every selected restriction in its tags, so missing or incomplete metadata excludes it.

## Persistence model

| Store | Contents | Lifetime / invalidation |
|---|---|---|
| `restaurant-finder-store` | Preferences, visits, logged menus, liked dishes | Persistent until changed or app data is cleared |
| `restaurant-finder-cache` | Nearby candidate results and reverse-geocoded labels | Candidates: 30 minutes; labels: effectively permanent; oldest-entry eviction above 250 combined entries |
| `candidate-menu-cache` | Parsed candidate menus or negative results | Success: 7 days; failure: 24 hours; oldest-entry eviction above 100 entries |
| App document directory | User-selected visit photos | Until photo/visit deletion or app removal |

`migrateVisitRecords` fills fields missing from older persisted records. It cannot reconstruct old coordinates, so records with `0,0` remain visible but cannot anchor an area.

At startup, the app lists only its managed `visit-photos` directory and deletes files that are no longer referenced by any persisted visit. Cleanup is best-effort: storage errors do not block startup, and files outside that directory are never considered.

### Backup boundary

Preferences exposes a versioned JSON export/import flow for structured app data. Exports include
visits, ratings, notes, preferences, menus, and liked dishes. Device-local photo URIs are removed
because their files cannot be restored on another installation. Imports validate the schema and a
5 MB size limit, merge visits by restaurant ID plus timestamp, merge liked dishes by restaurant and
item ID, and preserve existing local photos when updating a matching visit.

The JSON file is written only to the temporary cache directory for sharing and deleted after the
share operation. Imported documents are copied to the app cache by Expo DocumentPicker so they can
be read immediately.

## Major architectural tradeoffs

### Local-first storage instead of a backend

Decision: keep visits, tastes, menus, and photos on the device.

Benefits:

- Low operational cost and no server deployment.
- Fast synchronous reads through MMKV.
- No account requirement.
- Personal history is not uploaded to an application backend.

Costs:

- No cross-device sync, collaboration, or web access.
- Clearing app data or losing the device loses history.
- Schema migration logic runs in the client.
- Export/import is required for backup and portability.

### MMKV instead of AsyncStorage or SQLite

Decision: use MMKV for small JSON documents and caches.

Benefits:

- Simple synchronous API and fast startup reads.
- Good fit for the current bounded history and compact cache records.
- Minimal repository and query complexity.

Costs:

- Native MMKV/Nitro modules require a development build; stock Expo Go is insufficient.
- Whole JSON values are rewritten for updates.
- No relational queries, transactions across keys, or efficient partial updates.
- Growth beyond the current 100-visit bound would favor SQLite or another structured store.

### Filesystem photos instead of base64 in MMKV

Decision: copy images to the durable app document directory and persist URIs.

Benefits:

- Avoids inflating MMKV values and memory use.
- Preserves photos after image-picker cache eviction.
- Makes photo deletion explicit.

Costs:

- Structured data and files can become inconsistent after crashes or manual corruption.
- Orphan cleanup is not currently performed at startup.
- Photos are not included in a backup/export flow yet.

### Greedy clustering instead of DBSCAN or server-side geospatial indexing

Decision: cluster visits in one client-side pass with fixed distance thresholds.

Benefits:

- Linear, understandable, dependency-free behavior for small histories.
- Deterministic enough for an on-device list capped at 100 visits.
- No backend or geospatial database.

Costs:

- Cluster membership depends on input order.
- A moving centroid can create unintuitive boundaries.
- Dense cities and rural areas use the same thresholds.
- Arithmetic longitude means are inaccurate around the antimeridian.

### Lexical taste matching instead of embeddings

Decision: normalize words and match them against cuisines, tags, names, notes, and menu text.

Benefits:

- Fully local, explainable, inexpensive, and easy to test.
- No model download, embedding API, or vector database.
- Exact matched terms can be shown directly to the user.

Costs:

- Misses synonyms, spelling variants, negation, and meaning.
- Substring matching can produce false positives.
- English-oriented normalization limits multilingual quality.
- Notes such as “did not like truffle” still increase the `truffle` signal.

### Heuristic price inference

Decision: infer a price band from average menu-item prices.

Benefits:

- Works without a separate price-preference questionnaire.
- Uses observed behavior rather than only declared preference.

Costs:

- Menu currencies are not normalized.
- Appetizers, tasting menus, and partial menus distort averages.
- Thresholds are fixed and market-insensitive.

### Two-pass candidate ranking

Decision: rank cheaply first, enrich only the top three eligible candidates, then rerank.

Benefits:

- Bounds network traffic and latency.
- Spends enrichment effort on likely visible results.
- Keeps the app usable when restaurant websites fail.

Costs:

- A low-ranked candidate that would be a strong menu match may never be enriched.
- Website homepages are not guaranteed to expose menu data.
- Results can change after cache expiry as website content changes.
- Parallel per-area enrichment can still generate several requests when many areas exist.

### Positive and negative caching

Decision: cache successful menu parses longer than failures.

Benefits:

- Reduces repeated traffic, latency, and load on third-party sites.
- Negative caching prevents a broken site from slowing every refresh.

Costs:

- Successful menus can be stale for up to seven days.
- A transient failure can suppress retries for 24 hours.
- Entry-count caps bound persistent cache growth but do not directly constrain serialized byte size.

### Dual places providers

Decision: use Overture open places for the web app and retain a free Overpass alternative.

Benefits:

- The app works without a paid API key.
- Overture provides a downloadable global dataset with cuisine categories and website metadata.
- OSM can expose restaurant website metadata used for menu enrichment.

Costs:

- Provider records have different completeness and identifiers.
- The first Overture search in an area requires a bounded download and a Python environment.
- OSM ratings are unavailable and default to zero.
- Provider fallback can change result quality and ranking behavior.

### Separate For You and Explore engines

Decision: retain the original generic Explore engine alongside the taste-driven For You engine, which now also supports current-location search.

Benefits:

- Supports both intentional taste-led discovery and immediate nearby browsing.
- Limits regression risk in the mature Explore flow.

Costs:

- Scoring logic and user expectations are split across two engines.
- Similar concepts have different weights and distance anchors.
- Future features may require changes in both pipelines.

## Failure behavior

| Failure | Behavior |
|---|---|
| Location permission denied | Users can explicitly search a city/neighborhood or choose a saved area; existing history remains available |
| Open places download unavailable | Reports an error; previously cached areas continue to work within their cache lifetime |
| Candidate fetch fails | Search reports an error; old results are cleared so they cannot be mistaken for the new location |
| Reverse geocoding fails | Uses `Around <most recent visit>` |
| Candidate menu fetch fails | Negative cache entry; recommendation uses metadata-only score |
| Menu parser returns no items | Treated as an enrichment failure, not a screen failure |
| Persisted JSON is malformed | Store reader falls back to defaults for that key |
| Photo copy fails | Visit remains intact and the UI reports that the photo was not saved |
| Legacy visit has no coordinates | Retained in history and taste inputs, excluded from area clustering |

## Privacy and trust boundaries

- Personal ratings, notes, selected photo copies, menus, and likes stay in local app storage.
- Restaurant queries reveal coordinates or area centroids to the configured places provider.
- Reverse geocoding sends area coordinates through Expo Location's platform-backed service.
- Native menu enrichment requests third-party websites directly. Browser menu enrichment uses `/api/menu` on the app server to avoid cross-origin restrictions. The server resolves public addresses, pins each connection address, revalidates redirects, limits time and response size, caches bounded results, and rate-limits requests. Third-party HTML is returned inside JSON, never served as a document on the app origin.
- Candidate URLs are untrusted external input and receive scheme/private-network checks before automated fetches.
- The web server is intended for personal use and has no accounts. It does not receive visits, likes, or taste profiles; it receives search coordinates, neighborhood queries, and public menu URLs. Public multi-user hosting needs additional operational capacity planning.

This is local storage, not encrypted vault storage. Anyone with access to an unlocked device or its accessible app data may be able to inspect the history.

## Build and distribution architecture

The project uses Expo Continuous Native Generation and EAS profiles rather than checked-in iOS and
Android projects. `expo-dev-client` is included because MMKV, Nitro Modules, maps, document picking,
and other native dependencies require a custom native runtime.

- `development` produces an internally distributed development client for devices and Android emulators.
- `development-simulator` extends that profile for the iOS Simulator.
- `preview` produces a production-like internal build without development tools.
- `production` uses EAS store-distribution defaults.

Adding or changing a native dependency or config plugin requires rebuilding the development client;
JavaScript-only changes can continue to use the installed client and Metro.

### Web runtime and platform boundaries

The same application exports through Expo to React Native Web. `server/index.mjs` serves the export and `/api/places`, `/api/areas`, and `/api/menu`. This avoids introducing a second frontend while enabling browser-safe menu requests. A static-only deployment cannot supply those endpoints. The server uses built-in Node APIs and bounded in-memory caches; no database or backend account is required.

Platform-specific modules keep native integrations out of the browser path:

- MMKV supplies its browser storage implementation for structured app data.
- Browser photos are resized into data URIs persisted with visits and count against browser storage quotas.
- Browser backup export downloads JSON; import reads an explicitly selected file. Photos remain excluded.
- The web Map screen links saved areas to OpenStreetMap; native maps remain embedded.
- Browser confirmations use native browser dialogs because React Native Alert does not implement the required web actions.

These choices keep the personal-use app small. A larger deployment should move photos into an appropriately managed store and replace public demonstration geocoding/restaurant services with provisioned providers. Browser storage is scoped to the origin, so changing the host or port creates a different local data store.

## Performance characteristics

- Visit history is capped at 100 entries.
- Greedy clustering is effectively linear for this small bound, though worst-case cluster search is quadratic.
- Candidate ranking is linearithmic because candidates are scored and sorted.
- Areas are processed concurrently with `Promise.all`.
- Each search can attempt at most six candidate menu fetches.
- Restaurant, label, and menu caches reduce repeated external work.
- MMKV JSON writes copy the complete affected collection, which is acceptable only while collections remain small.

## Testing and validation boundaries

Pure algorithms have unit coverage for clustering, taste extraction, scoring, menu enrichment safety, area labels, migrations, and store actions. TypeScript strict checking validates interface consistency, and Expo export verifies that the dependency graph bundles for a release target.

The remaining validation boundary is native-device behavior: location permissions, reverse geocoding, MMKV/Nitro initialization, image picking, persistent photo URIs, maps, and real restaurant websites require a development build on physical or simulated hardware.

## Evolution triggers

Revisit the architecture when any of these become true:

- More than roughly 100–500 visits or large menu collections: move structured data to SQLite.
- Cross-device backup or accounts: introduce an authenticated backend and explicit sync/conflict rules.
- Better semantic matching: add on-device embeddings or a privacy-reviewed remote embedding service.
- Higher-quality areas: replace greedy clustering with order-independent geospatial clustering and density-aware thresholds.
- Reliable candidate menus: integrate a licensed menu provider or a server-side extraction pipeline with robots, rate, and content controls.
- Stronger dietary guarantees: replace provider-supplied tags with verified structured attributes; candidates with unknown tags are already excluded.
- Production observability: add privacy-preserving error and performance telemetry with explicit consent and retention rules.

## Current known debt

- JSON export/import covers structured app data, but photo backup is not implemented.
- Dietary tags come from external provider metadata and are not independently verified.
- Candidate-menu parsing is conservative but still heuristic; extracted menu entries may be outdated or incomplete.
- Open places does not provide public ratings, current opening hours, or verified prices.
- Stock Expo Go cannot load the MMKV/Nitro native dependency; use the configured EAS development build.

# RestaurantFinder

Find new restaurants nearby from the restaurants you enjoyed and the dishes you liked. Built with Expo SDK 56, React Native, and React Native Web.

1. Add a nearby restaurant, give it a rating, and enter dishes you liked.
2. Open **For You** and choose **Near me**, a saved neighborhood, or search another city or neighborhood.
3. Choose a 1, 3, or 5 km radius. Suggestions exclude previously visited restaurants and stay inside that radius.
4. **Menu dish matches** show both the candidate dish and the dish you liked. **Similar cuisine** and **Food keyword match** suggestions clearly say dish availability is unconfirmed.

You can also import a readable menu URL, heart individual dishes, add private notes/photos, explore nearby restaurants, and export or restore structured data as JSON.

## Run in a browser

Requires Node.js 20.19+, npm, and Python 3.11 for the free data reader. From the project root:

```sh
npm install
python3.11 -m venv .venv
.venv/bin/pip install -r server/requirements.txt
npx expo export --platform web
node server/index.mjs
```

Open **http://localhost:3000**. Allow location access, or explicitly search a city/neighborhood if location is unavailable. No API key is needed for the web version.

The Node server serves the exported app and same-origin restaurant, neighborhood, and menu requests. Run it alongside the web app: a static-only host cannot provide menu fetching. Re-export after changing application code. Set `PORT` to change the listening port; `WEB_DIST_DIR` can select a different export directory.

The web app reads the free [Overture Maps open places dataset](https://docs.overturemaps.org/getting-data/overturemaps-py/) directly. It downloads only a bounded area, keeps public restaurant records in `.cache/open-places` for seven days, and reuses them for repeat searches. The first search in a new area can take a minute; searches within a downloaded area are faster. No account, API key, or paid provider is used. The cache holds at most 64 areas. Source snapshot dates are displayed with results.

`OVERTURE_PYTHON` can select an existing environment containing the pinned reader. `OPEN_PLACES_CACHE_DIR` can relocate the public-data cache. On Windows, create the environment with your Python 3.11 executable and use `.venv\Scripts\pip` for installation.

`FREE_PLACES_PROVIDER=overpass` selects the original public Overpass lookup instead; `OVERPASS_API_URL` can override its endpoint. Provider outages display an error; the app does not substitute invented restaurants.

For live UI development, `npm run web` starts Expo. Its standalone development server does not implement the `/api` endpoints; use the exported app with the Node server to exercise the complete flow.

For an external deployment, use HTTPS for browser location access. This repository does not include hosted infrastructure or deployment credentials.

## Run on iOS or Android

MMKV/Nitro requires a development build. EAS profiles are already configured:

```sh
npx eas-cli build --platform android --profile development
# Or: npx eas-cli build --platform ios --profile development
npm run start:dev-client
```

Local native builds are available with `npx expo run:ios` or `npx expo run:android` when the platform toolchain is installed. Native device behavior still needs hardware verification.

## Data and matching

- Visits, liked dishes, menus, and preferences persist locally. Native builds use MMKV; web builds use its browser storage implementation. Browser data belongs to that browser and origin, and clearing site data removes it.
- Photos stay on the device. Browser photos are resized into data URIs and count against browser storage limits. JSON backups exclude photos.
- Web restaurant data comes from Overture Maps open places; neighborhood search uses Photon. Native builds use free Overpass by default. Set `EXPO_PUBLIC_API_BASE_URL` to the app server’s reachable `/api` base URL to use Overture from a native development build. Public providers may be slow, rate-limited, incomplete, or unavailable.
- Menu enrichment checks up to six candidate websites per search, follows one same-origin menu link, and caches results. Structured menu entries and price-bearing lines provide dish evidence; ordinary homepage headings do not.
- Overture places include names, categories, coordinates, and available websites. The app does not invent ratings, opening hours, or prices when those are absent. Listings can be outdated or incomplete.
- Similarity uses normalized dish words and cuisine preferences. It does not infer unseen dishes or guarantee current menu availability. JavaScript-only menus, PDFs, and image menus need manual entry.
- Avoided cuisines and requested dietary tags are hard filters. Provider tags are incomplete and are not independently verified.
- The web Map tab links saved neighborhoods to OpenStreetMap. Native builds retain their embedded map.

## Personal use and contributions

This is a local-first app for personal use. It has no accounts or cross-device sync, and public data providers carry no availability guarantee. Export backups before changing browsers or devices. At larger scale, replace public demo services with appropriately provisioned providers.

Keep UI and device integrations in screens/hooks/API modules, and keep scoring/parsing functions pure in `src/algorithm`. Update the README when behavior changes. Never commit environment files, keys, local agent instructions, or generated exports.

Validate changes with:

```sh
npm run type-check
npm test -- --runInBand --watchman=false
node --test server/*.test.mjs
python3 -m unittest discover -s server -p '*_test.py'
npx expo export --platform web
```

The server protects menu fetching with public-address validation, connection address pinning, redirect checks, response/time limits, and request limits. It does not store visits or liked dishes. It is intended for personal use; public multi-user hosting needs operational capacity planning.

See [architecture and tradeoffs](projects/tradeoff/architecutre/README.md) for the domain pipeline and design decisions.

## License

MIT — see [LICENSE](LICENSE).

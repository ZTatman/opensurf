# OpenSurf

A small, open-source dashboard for public surf and beach cameras. Browse nearby and worldwide beach carousels from a catalog of 32 public cameras (29 beach views) in six countries, save favorites in your browser, and watch up to four cameras side by side.

## Run locally

Use a current Node.js LTS release compatible with Vite 8 and npm. This checkout was built with Node.js 26.12.0.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally http://127.0.0.1:5173/.

```sh
npm test
npm run lint
npm run build
npm run preview
```

The production output is in `dist/` and can be served by a static web server. There is no backend, account, API key, or video proxy. Some public sources open their own player in a new tab when third-party embedding is restricted.

## Using the app

- **Near you** is a horizontal carousel of beach cameras inside the selected range, sorted nearest first. The page requests browser location automatically on load; 25 miles is the default, with 5, 10, 25, 50, and 100 mile options in the nearby header. No video player loads before selection.
- **Explore** is a second carousel of other beaches, excluding those already within the nearby radius. Swipe, scroll, use arrow buttons, or focus a carousel and use the left/right keyboard arrows. The carousels never auto-advance.
- Select a preview to watch it. Listings marked **Watch on Visit St. Lucie** open the official operator page in a new tab; they cannot be added to the comparison grid. Known operator-reported outages are labeled. Press Play inside the provider's player when needed.
- Use the **star** to save a favorite, and the toolbar star to show favorites.
- Use **plus/check** to add or remove a camera from comparison, up to four. The layout follows the selection count automatically.
- Use the toolbar's **camera count** to jump back to selected players while browsing.
- Search by beach, city, state, or region. Catalog beaches and regions appear alongside city suggestions; choose a beach to watch it or a city to browse cameras around it. A searched city is an explicitly labeled nearby fallback while device location is unavailable. Once a device position is set, city search only filters Explore; the nearby row stays anchored to your location. Use arrow keys and Enter to choose a suggestion.
- The nearby **range** picker uses approximate straight-line distances. Search and country/region filters affect Explore; the nearby row keeps its location. The favorites toggle applies to both rows. Changing range moves beaches between Nearby and Explore without duplication.
- The **filter** icon reveals country and region/state pickers. Search covers the bundled catalog, not every public camera on the web. An empty result means the curated catalog has no matching cameras in that area; it does not mean the beach has no webcams.
- If location access is denied or unavailable, search for a city as a fallback, or allow location in browser settings and reload. There is no separate location button. Coordinates stay in memory for this visit.
- Player **refresh**, **external-link**, and **close** icons reload, open the original page, and remove the player. Icon actions have accessible labels and tooltips.

## Camera sources

The embedded part of the catalog uses the published embeds from [Live Beach Cams](https://worldbeachcams.com/en). Its [embedding terms](https://worldbeachcams.com/en/terms) permit free embeds with attribution, which is retained in the app and provider players.

Publicly listed cameras are not guaranteed to be broadcasting. Preview images may be cached; they are not proof of current conditions. Some provider players show their own consent UI and may require a click. The app cannot reliably detect playback errors inside a third-party iframe. Provider metadata, names, and locations are sourced from the directory and have not been independently surveyed.

The catalog is in `src/data/catalog/`, split into three files:

- `sources.json`: each source's name, terms, attribution, access method (embed or link to the operator's page), and review notes. Rejected sources stay listed with the reason; OpenWebcamDB is rejected because its terms prohibit competing aggregators and redistribution.
- `beaches.json`: beach name, region, country, coordinates, and optional alternate names. One beach can have several camera views.
- `cameras.json`: each view's source, beach, embed path or official page, preview, and the date its listing was last checked (`checkedAt`). Views that are not on a beach (inlets, marinas, river walks) have no beach and carry their own locality and coordinates.

`src/catalog.ts` joins and validates the records when the app loads: duplicate IDs, unknown or rejected sources, missing beaches, invalid coordinates, and non-HTTPS links fail the tests and the build. `checkedAt` means the listing was reviewed, not that the stream was live.

The catalog contains 26 embeddable listings in six countries and 15 regions, with most additions on the US coast. Six more come from the official [Visit St. Lucie](https://visitstlucie.com/live-web-cams/) pages, including Fort Pierce Surf, Beach, Jetty, Inlet, Boardwalk at The Port, and Marina cams. Search recognizes St. Lucie, Saint Lucie, Port St. Lucie, Fort Pierce, Hutchinson Island, and Treasure Coast aliases. The Inlet and Marina pages report temporary outages as of 2026-10-23; those notices are retained in the source data. The river Boardwalk, Marina and inlet-only waterway views are excluded from the beach carousels because they have no beach. The Surf, Beach and Jetty views are included; the Beach and Jetty cams are two views of Jetty Park Beach. These listings use operator location photos, not live video previews. The combined catalog is not a complete global webcam index. The public listing coordinates are approximate and are used for discovery, not navigation.

Visit St. Lucie's Vista Webcams players enforce an approved-domain list. Their public `/api/embed/page/<stream>` response has a `frame-ancestors` policy listing official tourism and municipal domains; OpenSurf/localhost is not listed. The external records link to the official camera pages and do not inject the operator script, proxy streams, or construct alternate stream URLs. Approximate discovery coordinates come from the tourism board's public place listings. See [source evidence](docs/research/visit-st-lucie.md).

To refresh the embeddable snapshot, run `python3 scripts/import-cameras.py` (Python 3 and curl required). It fetches the 26 curated public listing pages sequentially, one second apart, and, after the entire import succeeds, replaces the Live Beach Cams entries in `cameras.json` and adds any missing beaches to `beaches.json`. Other sources' cameras and existing beaches are left unchanged. It does not fetch video streams. `scripts/camera-seeds.json` preserves stable IDs and curated display names. To add a camera, add its supported public embed path and a unique ID to that file, refresh, preserve attribution, and check playback. Do not substitute an internal stream URL for its supported embed.

City lookup accepts St./St and Ft./Ft abbreviations as Saint and Fort. City suggestions use [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api), based on [GeoNames](https://www.geonames.org/) data with attribution. The public endpoint is free for non-commercial use; review Open-Meteo's terms before commercial deployment. Search is debounced, cancelled when superseded, times out after eight seconds, and caches up to 40 searches for the current session. Catalog text search and region filters continue working if the geocoder is unavailable.

Device coordinates remain in memory and are used only for distance calculations against the bundled catalog. They are not saved or sent to the geocoding service. Typed place queries are sent to Open-Meteo while the search has focus. The on-load location request is deferred one tick so React StrictMode replay does not ask twice, and ignores stale responses after unmount or choosing a fallback city. Browser geolocation requires permission and HTTPS (localhost is supported). Denied, unavailable, and timed-out location requests offer city/region search instead.

## REA investigation

The existing REA 6.5.0 installation on this Mac was used to inspect a public embed and its click-to-load player. REA also captured the Pipeline player fetching video segments. One different candidate reported offline and was excluded from the starter list. See [the investigation](docs/research/rea-public-player.md).

REA is a development tool and is not needed to run OpenSurf. Raw captures and screenshots are local files under the ignored `.rea/` directory.

## Stack and checks

React, TypeScript, Vite, HeroUI 3, Tailwind CSS 4, Lucide icons, and Vitest. HeroUI supplies buttons, form fields, country and region pickers, selection controls, and tooltips. The interface uses flat image tiles and player surfaces rather than nested cards. Components live in `src/components/`: `ui/` holds generic pieces (icon buttons with tooltips, option pickers, the carousel), `camera/` the cards, players and watch grid, `search/` the toolbar, search and filters, and `layout/` the header and footer. `App.tsx` holds page state and composes them; catalog, distance, and place logic stay in `src/`. App-specific CSS is limited to readable theme tokens in `src/styles/theme.css` and camera layout in `src/styles/layout.css`; `src/styles.css` imports them and the library styles.

Tests cover automatic location setup and StrictMode cleanup, range changes and the default 25-mile carousel split, exclusion of non-beach views, no duplicate beaches across rows, unknown location behavior, official St. Lucie search aliases and nearby coverage, external source routing, operator outage labels, combined region/text/favorite filtering, catalog identities and valid coordinates, distance ordering and radius limits, antimeridian/antipodal cases, geocoder responses/errors/abort propagation, geolocation success/denial/errors, favorite persistence, and the four-camera limit. In-app browser checks of the simplified interface covered search, the optional country picker, favorites after reload, the four-camera limit, removing a selection and reusing its slot, and starting without mounted players. All 10 original provider previews loaded during the initial browser check; sustained playback of every feed has not been verified.

## License

MIT for project-authored code. Camera video, previews, provider players, and third-party dependencies retain their owners' rights and terms. The app has not been deployed.

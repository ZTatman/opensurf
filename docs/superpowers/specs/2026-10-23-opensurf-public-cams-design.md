# OpenSurf public camera dashboard

Status: approved in conversation on 2026-10-23. The user subsequently requested that further planning be skipped in favor of starting the MVP. The local MVP is implemented; see README.md for delivered behavior and verification limits.

## Purpose and first release

Build an open-source web app for finding and watching free, public surf and beach cameras. The user selected public cameras as the starting scope and approved beach/region search, single-camera viewing, a four-camera grid, browser-saved favorites, an initial catalog of 8–12 verified cameras, source attribution, and links to original camera pages.

Success means a user can run the app locally, find a beach, play a camera, compare up to four cameras, and retain favorites after reloading. Playback depends on the camera provider's availability and embedding configuration.

## Proposed stack

- React and TypeScript for the interface, camera records, and selection state.
- Vite for the development server and production static build.
- HeroUI 3 for UI components, with Tailwind CSS 4 for responsive layout and small, readable CSS files for theme tokens and camera frames. This supersedes the original plain-CSS proposal at the user's request.
- A version-controlled, typed camera catalog bundled with the app.
- Browser localStorage for favorite camera identifiers.
- Provider-supported iframe players for initial playback.
- npm and a committed lockfile for repeatable installation.

The first release is a client application. Hosting serves static files; video loads from camera providers. A backend, database, account system, video proxy, and transcoding infrastructure are outside this release. Favorites remain specific to a browser and origin. REA is a development investigation tool, not a runtime dependency.

## Alternatives considered

1. **Curated static app, recommended:** a small deployment and explicit, reviewable camera sources. New cameras require a catalog update.
2. **Backend-driven discovery:** can refresh provider catalogs centrally, but adds hosting, ingestion, caching, and operational work before basic playback is proven. Revisit when manual catalog maintenance becomes a demonstrated problem.

## Camera catalog and sources

Each record contains a stable ID, camera name, beach/locality, region, country, provider name, original page URL, embed URL, required attribution, embed documentation URL, and the date playback was last manually checked. Coordinates are optional and reserved for a future map.

Prefer surf-facing views. Begin with 8–12 cameras across available regions; select them through actual playback checks rather than assuming a search result is working. Do not label a camera as operational solely because its page or iframe returned HTTP 200.

Live Beach Cams is an initial source candidate. Its published terms permit camera-page embeds with visible attribution:

- https://worldbeachcams.com/en/terms
- https://worldbeachcams.com/en

The terms and catalog pages were inspected on 2026-10-23. Individual feeds have not yet been verified. Use the provider's documented embed URLs and preserve its player and attribution. Each additional source gets its own documented integration and playback check.

## REA investigation

Use the official REA distribution identified by https://github.com/morluto/rea and https://rea.tools/. REA was absent from the shell PATH during the initial environment check. Subsequent inspection found an existing npm-cached REA 6.5.0 installation configured for Claude Code; its CLI was successfully used without changing agent configuration. See `docs/research/rea-public-player.md` for observations and evidence references.

During implementation, inspect its CLI documentation and use a locally scoped CLI invocation to examine one public player integration. Record the target, commands, observed behavior, limitations, and resulting integration choice in a short repository note. Choose inspection that reads public website assets without changing global agent configuration. Do not run the interactive agent setup as part of the app install.

The investigation should establish how a published player is initialized and how to integrate it reliably. The app should continue using the supported embed even if REA exposes internal implementation details.

## Interface and data flow

The page contains a search field, region filter, favorites filter, camera list, and viewing area. Use a clean coastal visual style with clear camera names and minimal decoration around video.

1. Load and validate the bundled catalog.
2. Filter by camera name, beach, region, and country, with an explicit empty-results state.
3. Selecting a camera opens its player in single-camera mode.
4. A compare action adds cameras to a grid, limited to four. At the limit, explain that a camera must be removed first.
5. Favorite controls update application state and localStorage. Invalid or unavailable storage falls back to in-memory favorites without preventing playback.

Use one column on small screens and two columns for the comparison grid where space permits. Mount players only when selected for viewing; remove them when their camera is removed or the view changes. Do not request automatic audible playback.

## Player behavior and failures

Each player includes its camera title, visible source attribution, an original-page link, and controls to reload or remove it. Offer a way to report or identify an unavailable source through its original page.

Cross-origin iframe contents cannot generally be inspected by the app. An iframe load event is not proof of playing video. Avoid automatically asserting that a stream is live or offline when that cannot be observed. If a provider blocks embedding or a stream stops, keep the original-page link accessible and explain that provider availability may vary.

Use validated HTTPS source URLs, appropriate iframe permissions, descriptive frame titles, and accessible names for controls. Retain provider playback controls and branding. Public access does not guarantee uninterrupted availability.

## Code boundaries

- Catalog: typed records, validation, and source metadata.
- Filtering: pure search and region matching.
- Favorites: browser persistence with safe parsing and fallback behavior.
- Player: supported embeds and source controls.
- Dashboard: camera selection, viewing modes, and layout.

Keep components focused. Add provider adapters only when a second integration needs behavior that cannot be expressed by catalog metadata.

## Verification and delivery

- Run TypeScript checks, linting, and the production build.
- Test meaningful behavior: combined search/filter results, favorites persistence and malformed storage recovery, and the four-camera limit.
- Check desktop and mobile layouts, keyboard navigation, source links, player removal, and favorites after reload in a browser.
- Manually verify each initial feed and record the date and any provider-specific limitations. External stream playback is an integration check, not a deterministic unit-test assertion.
- Deliver source, setup/run/build instructions, source attribution notes, a REA investigation note, and an MIT license for project-authored code. Third-party streams and assets retain their owners' rights and terms.
- Keep deployment as a separate user-directed step after the local app is verified.

## References

- Vite React/TypeScript template: https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts
- Vite static build: https://github.com/vitejs/vite/blob/main/docs/guide/build.md

## Execution update

The user approved this design and then explicitly prioritized an MVP over more planning. Implementation proceeded directly. The first version includes 10 public directory entries; all previews loaded, while sustained playback of every feed remains unverified. REA was used through the existing local installation. The project remains local and has not been published or deployed.

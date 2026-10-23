# REA public-player investigation

Date: 2026-10-23.

## Questions and status

1. Can the existing REA installation be used from this chat? **Answered:** REA 6.5.0 runs through its installed CLI.
2. How does the chosen public embed initialize its player? **Answered for this embed:** a thumbnail button is replaced with a YouTube iframe after a click.
3. Is this particular stream currently playing? **Not verified as playing:** the resulting player reported “Live stream offline” during the check.
4. Are 8–12 public cameras verified for release? **Partially answered:** the MVP has 10 public directory entries, all with loaded provider previews. A subsequent REA Pipeline check observed video segment responses. Sustained playback of all 10 feeds is not verified.

## Installation

REA was not on the shell PATH. A targeted check found an existing Claude Code MCP registration using `npx -y rea-agents@6.5.0 mcp` and the matching cached package:

`/Users/zachtatman/.npm/_npx/ad9a3fdbcad992c6/node_modules/rea-agents`

Reading the package metadata and running the installed CLI confirmed version 6.5.0. This chat does not expose REA MCP tools, so the CLI was used directly. No registration, global configuration, installation, or update was performed.

The bundled REA skill was used:

`/Users/zachtatman/.npm/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/skills/reverse-engineer-anything/SKILL.md`

## Target and procedure

Public camera page:

https://worldbeachcams.com/en/netherlands/unknown/alohasurf-amp-inntel-hotels-beach-webcam-scheveningen-nl

Published embed:

https://worldbeachcams.com/embed/netherlands/unknown/alohasurf-amp-inntel-hotels-beach-webcam-scheveningen-nl

Published embedding terms:

https://worldbeachcams.com/en/terms

The page and terms were read. Two REA `capture-browser-scenario` calls then used the installed Google Chrome executable in headless launch mode with temporary, REA-owned profiles. The first navigated to the embed and waited eight seconds. The second clicked the observed `button[aria-label^="Play "]`, waited eight seconds, and captured DOM, accessibility text, network metadata, and a screenshot. Request/response bodies and header values were not requested. REA reported `terminated-owned-process` cleanup for both captures.

Reproduce the second call with the saved scenario while the package remains installed:

```sh
node /Users/zachtatman/.npm/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/scripts/rea.mjs capture-browser-scenario .rea/scheveningen-playback-scenario.json --format json
```

## Observations

- Initial evidence: `ev_3bd1b4c9a1b6c5e2baa32423bb83f53b74cf2c593e0349449bed098e824a5bae`.
- Playback-attempt evidence: `ev_00e2b35f7ba11c7705eb2ce3a23cbd28a654586cbabed759ad12e9c5b87d964c`.
- The initial accessibility capture contained a Play button, thumbnail, and visible “Powered by Live Beach Cams” link.
- After the declared click, the top-level DOM contained a YouTube iframe for video `pa7g8EaPwt8`, with `autoplay=1&mute=1`.
- The final screenshot showed a beach image and a player message reading “Live stream offline.” This is an observed state during this run, not a claim of permanent camera failure.
- The provider's cookie-consent interface was visible. The scenario did not accept or decline it.

Full local evidence is in `.rea/scheveningen-initial.json`, `.rea/scheveningen-playback.json`, and `.rea/scheveningen-playback.png`. These artifacts include provider-generated DOM and telemetry metadata and should remain local investigation artifacts rather than public project assets.

## Integration decisions and limits

- Keep the provider's supported embed and attribution. The observed inner YouTube URL is evidence of initialization, not a reason to replace the published integration.
- Select cameras using playback checks. Neither a directory “live” badge, a successful page load, nor iframe creation proves moving live video.
- Exclude this feed from the verified starter set unless a later check demonstrates working playback.
- Leave the original-page link available when a stream cannot play.
- This check navigated directly to the published embed. It does not establish that embedding from the future OpenSurf origin works; verify that in the running app.
- The capture does not establish sustained playback, availability elsewhere, or the health of other cameras.

## Follow-up: Pipeline and the running MVP

A third REA scenario used the same declared click and wait actions against the published Banzai Pipeline embed:

https://worldbeachcams.com/embed/usa/hawaii/banzai-pipeline-hawaii

Evidence ID: `ev_eaa2041e7328ce09300c3c99ec67b2f88115cd9fb4e84f2f128460a6715a8fb0`.

The capture recorded completed actions, a nighttime ocean image with the source's explore.org branding, and multiple successful HTTP 200 responses for video segment requests to a Googlevideo origin. This establishes that video data was fetched in this scenario; it does not establish uninterrupted or future playback. Local artifacts are `.rea/pipeline-scenario.json`, `.rea/pipeline-playback.json`, and `.rea/pipeline-playback.png`. REA reported that its owned browser was terminated.

The running OpenSurf origin also successfully displayed the Pipeline provider embed, including its Play button and attribution. All 10 catalog preview images loaded. Browser QA verified combined filtering, saved favorites after a page reload, the four-camera cap, removal followed by adding a different camera, and unmounting hidden players in single view. A mobile check identified an aspect-ratio/min-height interaction that widened the player; explicit width containment was added.

REA's raw network URLs can contain ephemeral playback query values. Keep full captures ignored; the public investigation note records only the evidence IDs, observations, and stable source pages.

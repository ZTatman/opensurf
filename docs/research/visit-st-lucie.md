# Visit St. Lucie public camera listings

Verified 2026-10-23 against the official site, not the earlier third-party directory.

The earlier nearby implementation only searched the 26-entry bundled directory. It did not discover additional cameras from local tourism sources. Visit St. Lucie was missing from the catalog, so its cameras could not appear regardless of search radius. Six official source records now supplement that directory.

## Official camera pages

| Listing               | Official URL                                                   | Public script stream identifier |
| --------------------- | -------------------------------------------------------------- | ------------------------------- |
| Fort Pierce Surf      | https://visitstlucie.com/fort-pierce-inlet-webcam-surf/        | BBD9QCDZ4L                      |
| Fort Pierce Beach     | https://visitstlucie.com/fort-pierce-inlet-webcam-jetty-beach/ | OQAKWAR14M                      |
| Fort Pierce Jetty     | https://visitstlucie.com/fort-pierce-inlet-webcam-and-jetty/   | CQ3CJMGV53                      |
| Fort Pierce Inlet     | https://visitstlucie.com/fort-pierce-inlet-waterway/           | B5CQNN6U78                      |
| Boardwalk at The Port | https://visitstlucie.com/the-boardwalk-at-the-port/            | 611HI3YFI1                      |
| Fort Pierce Marina    | https://visitstlucie.com/fort-pierce-marina-webcam/            | SQC5HPGJDY                      |

The official index https://visitstlucie.com/live-web-cams/ supplies the display photos and source page links. Photos are hotlinked as location images, and are not labeled as live previews. Inlet and Marina source pages explicitly report a temporary outage; these records retain an operator-reported-offline note. No claim is made that every listed camera is currently live.

## Embedding evidence

The pages publish `data-vistawebcams-stream` containers and load `https://my.vistawebcams.com/js/vistawebcams-embed.js`. That public script requests an embed authorization response and stops on HTTP 403 with `Domain not allowed`.

A normal HEAD request to `https://my.vistawebcams.com/api/embed/page/BBD9QCDZ4L` returned HTTP 200 with a `Content-Security-Policy: frame-ancestors` containing the Vista host, visitstlucie.com, stlucieco.gov, cityoffortpierce.com, fppd.org, fl-fortpierce.civicplus.com, and choosefortpierce.com (and their specified www variants). Neither localhost nor an OpenSurf origin is included. This is a real host restriction, not an offline-camera diagnosis. OpenSurf therefore uses direct links to the official pages, without attempting the restricted embeds.

## Coordinates

Coordinates describe the corresponding public place, not a surveyed camera mount. They are used only for approximate discovery distance.

- Jetty and Beach (and the Inlet area): public Jetty Park Beach listing, https://visitstlucie.com/wp-json/wp/v2/listings/221869 — 27.469948, -80.291907.
- Surf: Fort Pierce Inlet State Park listing, https://visitstlucie.com/wp-json/wp/v2/listings/221902 — 27.485440, -80.303179.
- Boardwalk: https://visitstlucie.com/listing/the-boardwalk-at-the-port/ and public listing 221968 — 27.276116, -80.319446.
- Marina: https://visitstlucie.com/listing/fort-pierce-city-marina/ and public listing 221904 — 27.449730, -80.321659.

Only the public latitude/longitude fields are used. No location request or precise user coordinates are sent to these sources. `scripts/import-cameras.py` only refreshes the separate embeddable directory; it does not overwrite the official St. Lucie file.

## Search verification

Open-Meteo returned no candidates for `Port St Lucie`, while `Port Saint Lucie` returned the intended Florida city (27.29393, -80.35033). Place queries now expand the standard city abbreviations St./St to Saint and Ft./Ft to Fort. This fixes city-centred discovery independently of the catalog's local text aliases.

Unit checks cover all six records appearing within 25 mi of Port St. Lucie, common place/provider aliases, external-only playback routing, and the operator's two outage notes. Browser checks confirmed the St. Lucie text results and an actual live player on the official Fort Pierce Surf Cam page, reached through an OpenSurf tile. Escape dismisses the suggestions while preserving the typed search.

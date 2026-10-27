import { describe, expect, it } from "vitest";
import {
  buildBeachIndex,
  buildCatalog,
  type BeachRecord,
  type CameraRecord,
  type IndexBeachRecord,
  type SourceRecord,
} from "./catalog";
import { beaches, cameras, embedUrl, loadBeachIndex, sourceUrl, sources } from "./cameras";
import { validCoordinates } from "./lib/geo";

const embed: SourceRecord = {
  id: "embed",
  name: "Embed Source",
  status: "approved",
  access: "embed",
  pageBase: "https://example.com/en/",
  embedBase: "https://example.com/embed/",
  notes: "",
};
const external: SourceRecord = {
  id: "external",
  name: "Operator",
  status: "approved",
  access: "external",
  searchTerms: ["operator brand"],
  notes: "",
};
const rejected: SourceRecord = {
  id: "rejected",
  name: "Rejected",
  status: "rejected",
  notes: "Terms prohibit redistribution.",
};
const beach: BeachRecord = {
  id: "jetty-park",
  name: "Jetty Park",
  region: "Florida",
  country: "USA",
  latitude: 27.47,
  longitude: -80.29,
  aliases: ["South Jetty"],
};
const camera = (fields: Partial<CameraRecord>): CameraRecord => ({
  id: "cam",
  sourceId: "embed",
  beachId: "jetty-park",
  name: "Cam",
  path: "usa/cam",
  previewUrl: "https://example.com/cam.jpg",
  checkedAt: "2026-10-23",
  ...fields,
});
const build = (rows: CameraRecord[], beachRows = [beach]) =>
  buildCatalog([embed, external, rejected], beachRows, rows);

describe("catalog records", () => {
  it("joins several views of one beach and inherits its location", () => {
    const [surf, pier] = build([
      camera({ id: "surf" }),
      camera({ id: "pier", latitude: 27.48, longitude: -80.3 }),
    ]);
    expect(surf).toMatchObject({
      beach: "Jetty Park",
      region: "Florida",
      latitude: 27.47,
      isBeach: true,
      sourceName: "Embed Source",
    });
    expect(pier).toMatchObject({ beachId: "jetty-park", latitude: 27.48, longitude: -80.3 });
    expect(surf.playback === "embed" && [surf.pageUrl, surf.embedUrl]).toEqual([
      "https://example.com/en/usa/cam",
      "https://example.com/embed/usa/cam",
    ]);
  });
  it("keeps non-beach views with their own locality and combines search terms", () => {
    const [marina] = build([
      camera({
        sourceId: "external",
        beachId: undefined,
        path: undefined,
        watchUrl: "https://example.com/marina",
        locality: "City Marina",
        region: "Florida",
        country: "USA",
        latitude: 27.45,
        longitude: -80.32,
        searchTerms: ["marina"],
      }),
    ]);
    expect(marina).toMatchObject({
      playback: "external",
      beach: "City Marina",
      isBeach: false,
      pageUrl: "https://example.com/marina",
      searchTerms: ["operator brand", "marina"],
    });
    expect("path" in marina || "beachId" in marina).toBe(false);
    expect(build([camera({})])[0].searchTerms).toEqual(["South Jetty"]);
  });
  it("rejects broken references, rejected sources, and missing access details", () => {
    const invalid: [CameraRecord[], string][] = [
      [[camera({}), camera({})], "duplicate camera cam"],
      [[camera({ sourceId: "missing" })], "unknown source missing"],
      [[camera({ sourceId: "rejected" })], "source rejected is rejected"],
      [[camera({ beachId: "missing" })], "unknown beach missing"],
      [[camera({ path: undefined })], "embed sources need a path"],
      [[camera({ sourceId: "external", watchUrl: "http://example.com" })], "HTTPS watchUrl"],
      [[camera({ beachId: undefined })], "needs a beach or a locality"],
      [
        [camera({ beachId: undefined, locality: "Inlet", region: "Florida", country: "USA" })],
        "invalid coordinates",
      ],
      [[camera({ previewUrl: "not a url" })], "preview must be an HTTPS URL"],
    ];
    for (const [rows, message] of invalid) expect(() => build(rows)).toThrow(message);
    expect(() => build([], [beach, beach])).toThrow("duplicate beach jetty-park");
    expect(() => build([], [{ ...beach, latitude: 91 }])).toThrow(
      "beach jetty-park: invalid coordinates",
    );
  });
});

describe("bundled catalog", () => {
  it("has distinct IDs, valid coordinates, and HTTPS provider links", () => {
    expect(new Set(cameras.map((camera) => camera.id)).size).toBe(cameras.length);
    for (const camera of cameras) {
      expect(new URL(sourceUrl(camera)).protocol).toBe("https:");
      if (camera.playback === "embed")
        expect(new URL(embedUrl(camera)).origin).toBe("https://worldbeachcams.com");
      else expect(new URL(sourceUrl(camera)).origin).toBe("https://visitstlucie.com");
    }
    expect(cameras.every(validCoordinates)).toBe(true);
    expect(
      new Set(
        cameras
          .filter((camera) => camera.playback === "embed" && camera.path.startsWith("usa/"))
          .map((camera) => camera.country),
      ),
    ).toEqual(new Set(["USA"]));
  });
  it("keeps host-restricted players external and preserves operator offline notices", () => {
    const official = cameras.filter((camera) => camera.playback === "external");
    expect(official.every((camera) => !("path" in camera))).toBe(true);
    expect(official.filter((camera) => camera.availabilityNote).map((camera) => camera.id)).toEqual(
      ["stlucie-inlet", "stlucie-marina"],
    );
    expect(sourceUrl(official.find((camera) => camera.id === "stlucie-surf")!)).toBe(
      "https://visitstlucie.com/fort-pierce-inlet-webcam-surf/",
    );
  });
  it("attributes only sources that supply cameras", () => {
    expect(sources.map((source) => source.id)).toEqual(["worldbeachcams", "visit-st-lucie"]);
    expect(cameras.every((camera) => sources.some((source) => source.id === camera.sourceId))).toBe(
      true,
    );
  });
  it("groups the St. Lucie beach and jetty views under one beach", () => {
    const jetty = beaches
      .filter((camera) => camera.beachId === "jetty-park-beach-fort-pierce-florida")
      .map((camera) => camera.id);
    expect(jetty).toEqual(["stlucie-beach", "stlucie-jetty"]);
  });
});

describe("beach index", () => {
  const indexed = (fields: Partial<IndexBeachRecord>): IndexBeachRecord => ({
    id: "south-beach-florida",
    name: "South Beach",
    region: "Florida",
    latitude: 25.78,
    longitude: -80.13,
    epaIds: ["FL1"],
    ...fields,
  });
  it("lists index beaches that no curated beach covers", () => {
    const listed = buildBeachIndex(
      [{ ...beach, externalIds: ["epa:FL2"] }],
      [indexed({}), indexed({ id: "jetty", epaIds: ["FL2", "FL3"] })],
    );
    expect(listed).toEqual([
      {
        id: "south-beach-florida",
        name: "South Beach",
        region: "Florida",
        country: "USA",
        latitude: 25.78,
        longitude: -80.13,
      },
    ]);
  });
  it("rejects stale links, duplicates, and bad coordinates", () => {
    expect(() => buildBeachIndex([{ ...beach, externalIds: ["epa:FL9"] }], [indexed({})])).toThrow(
      "epa:FL9 is not in the index",
    );
    expect(() => buildBeachIndex([], [indexed({}), indexed({})])).toThrow("duplicate index beach");
    expect(() => buildBeachIndex([], [indexed({ latitude: 91 })])).toThrow("invalid coordinates");
    expect(() => buildBeachIndex([{ ...beach, id: "south-beach-florida" }], [indexed({})])).toThrow(
      "duplicates a curated beach ID",
    );
  });
  it("loads the bundled EPA index with every curated link resolved", async () => {
    const index = await loadBeachIndex();
    expect(index.length).toBeGreaterThan(5000);
    expect(index.some((entry) => entry.id === "jetty-park-beach-florida")).toBe(false);
    expect(index.every(validCoordinates)).toBe(true);
  });
});

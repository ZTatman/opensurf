import { describe, expect, it } from "vitest";
import { beaches } from "../cameras";
import {
  browserReducer,
  browseResults,
  initialBrowserState,
  type BrowserState,
} from "./useCameraBrowser";

const fortPierce = {
  id: "place:1",
  name: "Fort Pierce",
  label: "Fort Pierce, Florida, United States",
  latitude: 27.4467,
  longitude: -80.3256,
};
const device = {
  latitude: 27.29393,
  longitude: -80.35033,
  label: "your location",
  kind: "device" as const,
};
const narrowed: BrowserState = {
  ...initialBrowserState,
  query: "pier",
  country: "USA",
  region: "Florida",
  explorePlace: fortPierce,
};

describe("filter rules", () => {
  it("clears the region when the country changes without changing search", () => {
    expect(browserReducer(narrowed, { type: "filter", patch: { country: "Italy" } })).toMatchObject(
      { country: "Italy", region: "", query: "pier", explorePlace: fortPierce },
    );
    expect(
      browserReducer(narrowed, { type: "filter", patch: { region: "New York" } }),
    ).toMatchObject({
      country: "USA",
      region: "New York",
      query: "pier",
      explorePlace: fortPierce,
    });
    expect(browserReducer(narrowed, { type: "filter", patch: { favoritesOnly: true } })).toEqual({
      ...narrowed,
      favoritesOnly: true,
    });
  });
  it("keeps a chosen city only while the search box shows its label", () => {
    expect(
      browserReducer(
        { ...narrowed, query: fortPierce.label },
        { type: "filter", patch: { query: fortPierce.label } },
      ).explorePlace,
    ).toBe(fortPierce);
    expect(
      browserReducer(narrowed, { type: "filter", patch: { query: "Fort" } }).explorePlace,
    ).toBeNull();
  });
  it("keeps the nearby location independent when selecting a city", () => {
    const fallback = browserReducer(narrowed, { type: "place", place: fortPierce });
    expect(fallback).toMatchObject({
      area: null,
      explorePlace: fortPierce,
      query: fortPierce.label,
      country: "USA",
      region: "Florida",
    });
    const located = browserReducer(fallback, { type: "located", area: device });
    expect(located).toMatchObject({ area: device, query: fortPierce.label });
    expect(browserReducer(located, { type: "place", place: fortPierce })).toMatchObject({
      area: device,
      explorePlace: fortPierce,
    });
  });
  it("keeps typed text when the device location arrives", () => {
    expect(
      browserReducer({ ...initialBrowserState, query: "pier" }, { type: "located", area: device })
        .query,
    ).toBe("pier");
  });
  it("resets filters but keeps location and range", () => {
    const state = { ...narrowed, favoritesOnly: true, area: device, radiusMiles: 50 };
    expect(browserReducer(state, { type: "reset" })).toEqual({
      ...initialBrowserState,
      area: device,
      radiusMiles: 50,
    });
  });
});

describe("browse results", () => {
  it("submits text against the catalog without changing nearby or explore", () => {
    const base = { ...initialBrowserState, area: device };
    const typed = browserReducer(base, { type: "filter", patch: { query: "pipeline" } });
    const submitted = browserReducer(typed, { type: "search-text" });
    const results = browseResults(submitted, beaches, []);
    expect(results.searchResults?.map(({ camera }) => camera.id)).toContain("pipeline");
    expect(results.nearby).toEqual(browseResults(base, beaches, []).nearby);
    expect(results.explore).toEqual(browseResults(base, beaches, []).explore);
    const cleared = browserReducer(submitted, { type: "filter", patch: { query: "" } });
    expect(browseResults(cleared, beaches, []).searchResults).toBeNull();
  });
  it("reports no matches for an unmatched submitted query", () => {
    const typed = browserReducer(initialBrowserState, {
      type: "filter",
      patch: { query: "zzzzzz" },
    });
    const submitted = browserReducer(typed, { type: "search-text" });
    expect(browseResults(submitted, beaches, []).searchResults).toEqual([]);
  });
  it("does not change browsing rows while typing and clears selected results", () => {
    const base = { ...initialBrowserState, area: device };
    const baseline = browseResults(base, beaches, []);
    const typed = browserReducer(base, { type: "filter", patch: { query: "Fort" } });
    expect(browseResults(typed, beaches, []).explore).toEqual(baseline.explore);
    expect(browseResults(typed, beaches, []).searchResults).toBeNull();
    const selected = browserReducer(typed, { type: "place", place: fortPierce });
    const cleared = browserReducer(selected, { type: "filter", patch: { query: "" } });
    expect(browseResults(cleared, beaches, []).searchResults).toBeNull();
  });
  it("shows region search results without filtering explore", () => {
    const base = { ...initialBrowserState, area: device };
    const selected = browserReducer(base, {
      type: "search-region",
      region: "Veneto",
      country: "Italy",
    });
    const results = browseResults(selected, beaches, []);
    expect(results.explore).toEqual(browseResults(base, beaches, []).explore);
    expect(results.searchResults?.length).toBeGreaterThan(0);
    expect(results.searchResults?.every(({ camera }) => camera.region === "Veneto")).toBe(true);
  });
  it("returns an empty search section when no cameras are near a selected place", () => {
    const state = browserReducer(initialBrowserState, {
      type: "place",
      place: { id: "remote", name: "Remote", label: "Remote", latitude: 0, longitude: 0 },
    });
    expect(browseResults(state, beaches, []).searchResults).toEqual([]);
  });
  it("keeps nearby and explore stable when a city is selected", () => {
    const results = browseResults({ ...initialBrowserState, area: device }, beaches, []);
    expect(results.nearby).toHaveLength(3);
    expect(results.hasFilters).toBe(false);
    const city = (radiusMiles: number) =>
      browseResults(
        {
          ...initialBrowserState,
          area: device,
          radiusMiles,
          explorePlace: fortPierce,
          query: fortPierce.label,
        },
        beaches,
        [],
      );
    expect(city(25).explore).toEqual(results.explore);
    expect(city(25).nearby).toEqual(results.nearby);
    expect(city(25).searchResults?.length).toBeGreaterThan(0);
    expect(city(25).hasSelectedPlace).toBe(true);
  });
  it("uses the range picker for a city explored from a device location", () => {
    const carolinaBeach = {
      id: "place:2",
      name: "Carolina Beach",
      label: "Carolina Beach, North Carolina, United States",
      latitude: 34.0352,
      longitude: -77.8936,
    };
    const explore = (radiusMiles: number) =>
      browseResults(
        { ...initialBrowserState, area: device, radiusMiles, explorePlace: carolinaBeach },
        beaches,
        [],
      ).searchResults!;
    expect(explore(5).map(({ camera }) => camera.id)).toEqual(["carolina-beach"]);
    expect(new Set(explore(25).map(({ camera }) => camera.id))).toEqual(
      new Set(["carolina-beach", "bald-head", "wrightsville"]),
    );
    expect(explore(25).every(({ distanceKm }) => distanceKm! <= 25 * 1.609344)).toBe(true);
  });
  it("applies favorites to both rows and lists regions for the chosen country", () => {
    const results = browseResults(
      { ...initialBrowserState, area: device, favoritesOnly: true },
      beaches,
      ["stlucie-surf", "pipeline"],
    );
    expect(results.nearby.map(({ camera }) => camera.id)).toEqual(["stlucie-surf"]);
    expect(results.explore.map(({ camera }) => camera.id)).toEqual(["pipeline"]);
    expect(
      browseResults({ ...initialBrowserState, country: "Italy" }, beaches, []).regions,
    ).toEqual(["Veneto"]);
  });
});

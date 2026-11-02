import { useReducer } from "react";
import { beaches, type Camera } from "../cameras";
import { beachSections, nearbyCameras, NEARBY_RADIUS_MILES } from "../lib/geo";
import { filterCameras } from "../lib/search";
import type { Place } from "../services/geocoding";
import { useNearby, type SearchArea } from "./useNearby";

export type Filters = { query: string; country: string; region: string; favoritesOnly: boolean };
export type BrowserState = Filters & {
  radiusMiles: number;
  area: SearchArea | null;
  explorePlace: Place | null;
  searchRegion: { region: string; country: string } | null;
  submittedQuery: string;
};
export type BrowserAction =
  | { type: "filter"; patch: Partial<Filters> }
  | { type: "radius"; miles: number }
  | { type: "place"; place: Place }
  | { type: "search-region"; region: string; country: string }
  | { type: "search-text" }
  | { type: "located"; area: SearchArea }
  | { type: "reset" };

export const initialBrowserState: BrowserState = {
  query: "",
  country: "",
  region: "",
  favoritesOnly: false,
  radiusMiles: NEARBY_RADIUS_MILES,
  area: null,
  explorePlace: null,
  searchRegion: null,
  submittedQuery: "",
};

/**
 * Updates browsing state. A country filter patch clears the region, and a changed query clears
 * the selected place, region search, and submitted text. Place, region, and text searches replace
 * one another without changing the nearby area. Reset keeps the area and radius in miles.
 */
export function browserReducer(state: BrowserState, action: BrowserAction): BrowserState {
  switch (action.type) {
    case "filter": {
      const { patch } = action;
      const next = { ...state, ...patch };
      // A broader choice clears narrower ones: country clears region, and either clears the text search and explored city.
      if ("country" in patch) next.region = "";
      // Editing the text away from a chosen city's label drops that city.
      if ("query" in patch && patch.query !== state.query) {
        next.explorePlace = null;
        next.searchRegion = null;
        next.submittedQuery = "";
      }
      return next;
    }
    case "radius":
      return { ...state, radiusMiles: action.miles };
    case "place": {
      return {
        ...state,
        explorePlace: action.place,
        searchRegion: null,
        submittedQuery: "",
        query: action.place.label,
      };
    }
    case "search-region":
      return {
        ...state,
        explorePlace: null,
        searchRegion: { region: action.region, country: action.country },
        submittedQuery: "",
        query: action.region,
      };
    case "search-text":
      return {
        ...state,
        explorePlace: null,
        searchRegion: null,
        submittedQuery: state.query.trim(),
      };
    case "located":
      // Replace a fallback city with the device position and clear its label from the search box.
      return {
        ...state,
        area: action.area,
      };
    case "reset":
      return {
        ...state,
        query: "",
        country: "",
        region: "",
        favoritesOnly: false,
        explorePlace: null,
        searchRegion: null,
        submittedQuery: "",
      };
  }
}

/**
 * Derives nearby and Explore beach camera rows, filter options, and separate search results.
 * Nearby uses the area's radius in miles and the favorites filter; Explore also applies country
 * and region filters. Search results use the full catalog without those filters: a selected place
 * takes precedence over a region, then submitted text. Place results are within the radius and
 * carry distances in kilometers. Returns null for searchResults when no search is active and an
 * empty array when an active search has no matches. Favorites contains camera IDs.
 */
export function browseResults(state: BrowserState, catalog: Camera[], favorites: string[]) {
  const {
    country,
    region,
    favoritesOnly,
    radiusMiles,
    area,
    explorePlace,
    searchRegion,
    submittedQuery,
  } = state;
  const favoriteIds = new Set(favorites);
  const sections = beachSections(catalog, area, radiusMiles);
  const explored = filterCameras(sections.explore, {
    country,
    region,
    onlyIds: favoritesOnly ? favoriteIds : undefined,
  });
  return {
    countries: [...new Set(catalog.map((camera) => camera.country))].sort(),
    regions: [
      ...new Set(
        catalog
          .filter((camera) => !country || camera.country === country)
          .map((camera) => camera.region),
      ),
    ].sort(),
    nearby: sections.nearby.filter(({ camera }) => !favoritesOnly || favoriteIds.has(camera.id)),
    explore: explored.map((camera) => ({ camera, distanceKm: undefined })),
    searchResults: explorePlace
      ? nearbyCameras(catalog, explorePlace, radiusMiles)
      : searchRegion
        ? filterCameras(catalog, searchRegion).map((camera) => ({ camera, distanceKm: undefined }))
        : submittedQuery
          ? filterCameras(catalog, { query: submittedQuery }).map((camera) => ({
              camera,
              distanceKm: undefined,
            }))
          : null,
    hasFilters: !!(country || region || favoritesOnly),
    hasSelectedPlace: !!(explorePlace || searchRegion),
  };
}

// Search, filters, location and the nearby range, with the Nearby and Explore rows derived from them.
/**
 * Manages camera browsing and search, requesting device location on mount. Returns state, derived
 * rows, location status and retry, and actions to update filters, the radius in miles, and search.
 * Favorites are camera IDs; location failures are exposed through locationError.
 */
export function useCameraBrowser(favorites: string[]) {
  const [state, dispatch] = useReducer(browserReducer, initialBrowserState);
  const location = useNearby((area) => dispatch({ type: "located", area }));
  const { query, country, region, favoritesOnly } = state;

  return {
    ...state,
    ...browseResults(state, beaches, favorites),
    filters: { query, country, region, favoritesOnly } satisfies Filters,
    locating: location.locating,
    locationError: location.locationError,
    retryLocation: location.retry,
    setFilter: (patch: Partial<Filters>) => dispatch({ type: "filter", patch }),
    setRadius: (miles: number) => dispatch({ type: "radius", miles }),
    choosePlace: (place: Place) => dispatch({ type: "place", place }),
    chooseRegion: (region: string, country: string) =>
      dispatch({ type: "search-region", region, country }),
    submitSearch: () => dispatch({ type: "search-text" }),
    resetFilters: () => dispatch({ type: "reset" }),
  };
}

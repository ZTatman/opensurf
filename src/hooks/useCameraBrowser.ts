import { useReducer } from 'react'
import { beaches, type Camera } from '../cameras'
import { beachSections, nearbyCameras, NEARBY_RADIUS_MILES } from '../lib/geo'
import { filterCameras } from '../lib/search'
import type { Place } from '../services/geocoding'
import { useNearby, type SearchArea } from './useNearby'

export type Filters = { query: string; country: string; region: string; favoritesOnly: boolean }
export type BrowserState = Filters & { radiusMiles: number; area: SearchArea | null; explorePlace: Place | null }
export type BrowserAction =
  | { type: 'filter'; patch: Partial<Filters> }
  | { type: 'radius'; miles: number }
  | { type: 'place'; place: Place }
  | { type: 'located'; area: SearchArea }
  | { type: 'reset' }

export const initialBrowserState: BrowserState = {
  query: '', country: '', region: '', favoritesOnly: false,
  radiusMiles: NEARBY_RADIUS_MILES, area: null, explorePlace: null,
}

export function browserReducer(state: BrowserState, action: BrowserAction): BrowserState {
  switch (action.type) {
    case 'filter': {
      const { patch } = action
      const next = { ...state, ...patch }
      // A broader choice clears narrower ones: country clears region, and either clears the text search and explored city.
      if ('country' in patch) Object.assign(next, { region: '', query: '', explorePlace: null })
      if ('region' in patch) Object.assign(next, { query: '', explorePlace: null })
      // Editing the text away from a chosen city's label drops that city.
      if ('query' in patch && patch.query !== state.explorePlace?.label) next.explorePlace = null
      return next
    }
    case 'radius':
      return { ...state, radiusMiles: action.miles }
    case 'place': {
      // With a device location the city only narrows Explore; otherwise it becomes the nearby fallback.
      const located = state.area?.kind === 'device'
      return {
        ...state,
        area: located ? state.area : { ...action.place, kind: 'place' },
        explorePlace: located ? action.place : null,
        query: action.place.label, country: '', region: '',
      }
    }
    case 'located':
      // Replace a fallback city with the device position and clear its label from the search box.
      return { ...state, area: action.area, query: state.query === state.area?.label ? '' : state.query }
    case 'reset':
      return { ...state, query: '', country: '', region: '', favoritesOnly: false, explorePlace: null }
  }
}

export function browseResults(state: BrowserState, catalog: Camera[], favorites: string[]) {
  const { query, country, region, favoritesOnly, radiusMiles, area, explorePlace } = state
  const favoriteIds = new Set(favorites)
  const sections = beachSections(catalog, area, radiusMiles)
  const selectedPlaceLabel = explorePlace?.label ?? (area?.kind === 'place' ? area.label : '')
  // The chosen city's label fills the search box but is not a text filter.
  const exploreQuery = query === selectedPlaceLabel ? '' : query
  const explored = filterCameras(sections.explore, { query: exploreQuery, country, region, onlyIds: favoritesOnly ? favoriteIds : undefined })
  return {
    countries: [...new Set(catalog.map(camera => camera.country))].sort(),
    regions: [...new Set(catalog.filter(camera => !country || camera.country === country).map(camera => camera.region))].sort(),
    nearby: sections.nearby.filter(({ camera }) => !favoritesOnly || favoriteIds.has(camera.id)),
    explore: explorePlace
      // A city chosen while the device location is known uses the same range as the nearby row.
      ? nearbyCameras(explored, explorePlace, radiusMiles)
      : explored.map(camera => ({ camera, distanceKm: undefined })),
    exploreQuery,
    hasFilters: !!(exploreQuery || explorePlace || country || region || favoritesOnly),
    hasSelectedPlace: !!selectedPlaceLabel && query === selectedPlaceLabel,
  }
}

// Search, filters, location and the nearby range, with the Nearby and Explore rows derived from them.
export function useCameraBrowser(favorites: string[]) {
  const [state, dispatch] = useReducer(browserReducer, initialBrowserState)
  const location = useNearby(area => dispatch({ type: 'located', area }))
  const { query, country, region, favoritesOnly } = state

  return {
    ...state,
    ...browseResults(state, beaches, favorites),
    filters: { query, country, region, favoritesOnly } satisfies Filters,
    locating: location.locating,
    locationError: location.locationError,
    setFilter: (patch: Partial<Filters>) => dispatch({ type: 'filter', patch }),
    setRadius: (miles: number) => dispatch({ type: 'radius', miles }),
    choosePlace: (place: Place) => { location.cancel(); dispatch({ type: 'place', place }) },
    resetFilters: () => dispatch({ type: 'reset' }),
  }
}

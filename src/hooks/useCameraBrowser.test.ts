import { describe, expect, it } from 'vitest'
import { beaches } from '../cameras'
import { browserReducer, browseResults, initialBrowserState, type BrowserState } from './useCameraBrowser'

const fortPierce = { id: 'place:1', name: 'Fort Pierce', label: 'Fort Pierce, Florida, United States', latitude: 27.4467, longitude: -80.3256 }
const device = { latitude: 27.29393, longitude: -80.35033, label: 'your location', kind: 'device' as const }
const narrowed: BrowserState = { ...initialBrowserState, query: 'pier', country: 'USA', region: 'Florida', explorePlace: fortPierce }

describe('filter rules', () => {
  it('clears narrower filters when a broader one changes', () => {
    expect(browserReducer(narrowed, { type: 'filter', patch: { country: 'Italy' } })).toMatchObject({ country: 'Italy', region: '', query: '', explorePlace: null })
    expect(browserReducer(narrowed, { type: 'filter', patch: { region: 'New York' } })).toMatchObject({ country: 'USA', region: 'New York', query: '', explorePlace: null })
    expect(browserReducer(narrowed, { type: 'filter', patch: { favoritesOnly: true } })).toEqual({ ...narrowed, favoritesOnly: true })
  })
  it('keeps a chosen city only while the search box shows its label', () => {
    expect(browserReducer(narrowed, { type: 'filter', patch: { query: fortPierce.label } }).explorePlace).toBe(fortPierce)
    expect(browserReducer(narrowed, { type: 'filter', patch: { query: 'Fort' } }).explorePlace).toBeNull()
  })
  it('uses a city as the nearby fallback until the device location arrives', () => {
    const fallback = browserReducer(narrowed, { type: 'place', place: fortPierce })
    expect(fallback).toMatchObject({ area: { kind: 'place', label: fortPierce.label }, explorePlace: null, query: fortPierce.label, country: '', region: '' })
    const located = browserReducer(fallback, { type: 'located', area: device })
    expect(located).toMatchObject({ area: device, query: '' })
    expect(browserReducer(located, { type: 'place', place: fortPierce })).toMatchObject({ area: device, explorePlace: fortPierce })
  })
  it('keeps typed text when the device location arrives', () => {
    expect(browserReducer({ ...initialBrowserState, query: 'pier' }, { type: 'located', area: device }).query).toBe('pier')
  })
  it('resets filters but keeps location and range', () => {
    const state = { ...narrowed, favoritesOnly: true, area: device, radiusMiles: 50 }
    expect(browserReducer(state, { type: 'reset' })).toEqual({ ...initialBrowserState, area: device, radiusMiles: 50 })
  })
})

describe('browse results', () => {
  it('splits nearby and explore and narrows explore around a chosen city', () => {
    const results = browseResults({ ...initialBrowserState, area: device }, beaches, [])
    expect(results.nearby).toHaveLength(3)
    expect(results.hasFilters).toBe(false)
    const city = (radiusMiles: number) => browseResults({ ...initialBrowserState, area: device, radiusMiles, explorePlace: fortPierce, query: fortPierce.label }, beaches, [])
    expect(city(25).exploreQuery).toBe('')
    expect(city(25).hasSelectedPlace).toBe(true)
  })
  it('uses the range picker for a city explored from a device location', () => {
    const carolinaBeach = { id: 'place:2', name: 'Carolina Beach', label: 'Carolina Beach, North Carolina, United States', latitude: 34.0352, longitude: -77.8936 }
    const explore = (radiusMiles: number) => browseResults({ ...initialBrowserState, area: device, radiusMiles, explorePlace: carolinaBeach }, beaches, []).explore
    expect(explore(5).map(({ camera }) => camera.id)).toEqual(['carolina-beach'])
    expect(new Set(explore(25).map(({ camera }) => camera.id))).toEqual(new Set(['carolina-beach', 'bald-head', 'wrightsville']))
    expect(explore(25).every(({ distanceKm }) => distanceKm! <= 25 * 1.609344)).toBe(true)
  })
  it('applies favorites to both rows and lists regions for the chosen country', () => {
    const results = browseResults({ ...initialBrowserState, area: device, favoritesOnly: true }, beaches, ['stlucie-surf', 'pipeline'])
    expect(results.nearby.map(({ camera }) => camera.id)).toEqual(['stlucie-surf'])
    expect(results.explore.map(({ camera }) => camera.id)).toEqual(['pipeline'])
    expect(browseResults({ ...initialBrowserState, country: 'Italy' }, beaches, []).regions).toEqual(['Veneto'])
  })
})

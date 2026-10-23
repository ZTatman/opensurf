import type { Camera } from './cameras'
import { validCoordinates, type Coordinates } from './places'

export const FAVORITES_KEY = 'opensurf.favorites.v1'
export const MAX_CAMERAS = 4

export function filterCameras(cameras: Camera[], query: string, country: string, favoritesOnly: boolean, favorites: string[], region = '') {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')
  const words = normalize(query).trim().split(/\s+/).filter(Boolean)
  return cameras.filter(camera => {
    const text = normalize(`${camera.name} ${camera.beach} ${camera.region} ${camera.country} ${(camera.searchTerms ?? []).join(' ')} ${camera.country === 'USA' ? 'United States US' : ''}`)
    return (country === '' || camera.country === country)
      && (region === '' || camera.region === region)
      && (!favoritesOnly || favorites.includes(camera.id))
      && words.every(word => text.includes(word))
  })
}

export function addCamera(selected: string[], id: string) {
  if (selected.includes(id) || selected.length >= MAX_CAMERAS) return selected
  return [...selected, id]
}

export function readFavorites(storage: Pick<Storage, 'getItem'>, knownIds: string[]) {
  try {
    const value: unknown = JSON.parse(storage.getItem(FAVORITES_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return [...new Set(value.filter((id): id is string => typeof id === 'string' && knownIds.includes(id)))]
  } catch {
    return []
  }
}

export function writeFavorites(storage: Pick<Storage, 'setItem'>, ids: string[]) {
  try {
    storage.setItem(FAVORITES_KEY, JSON.stringify(ids))
    return true
  } catch {
    return false
  }
}

// Great-circle distances, suitable for approximate beach discovery rather than driving directions.
export function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = Math.PI / 180
  const dLat = (to.latitude - from.latitude) * radians
  const dLon = (to.longitude - from.longitude) * radians
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.latitude * radians)
    * Math.cos(to.latitude * radians) * Math.sin(dLon / 2) ** 2
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
}

export function nearbyCameras(cameras: Camera[], origin: Coordinates, radiusMiles: number) {
  if (!validCoordinates(origin) || !Number.isFinite(radiusMiles) || radiusMiles < 0) return []
  return cameras.filter(validCoordinates)
    .map(camera => ({ camera, distanceKm: distanceKm(origin, camera) }))
    .filter(result => result.distanceKm <= radiusMiles * 1.609344)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.camera.name.localeCompare(b.camera.name))
}

export function formatDistance(km: number) {
  const miles = km / 1.609344
  return miles < 1 ? '<1 mi' : `${Math.round(miles).toLocaleString()} mi`
}


export const NEARBY_RADIUS_MILES = 25

export function beachSections(cameras: Camera[], origin: Coordinates | null, radiusMiles = NEARBY_RADIUS_MILES) {
  const beaches = cameras.filter(camera => camera.isBeach !== false)
  const nearby = origin ? nearbyCameras(beaches, origin, radiusMiles) : []
  const localIds = new Set(nearby.map(({ camera }) => camera.id))
  return { nearby, explore: beaches.filter(camera => !localIds.has(camera.id)) }
}

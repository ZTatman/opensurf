import type { Camera } from '../cameras'

export type Coordinates = { latitude: number; longitude: number }

export const NEARBY_RADIUS_MILES = 25
export const RANGE_MILES = [5, 10, 25, 50, 100]
const KM_PER_MILE = 1.609344

export function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false
  const point = value as Coordinates
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
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
    .filter(result => result.distanceKm <= radiusMiles * KM_PER_MILE)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.camera.name.localeCompare(b.camera.name))
}

export function formatDistance(km: number) {
  const miles = km / KM_PER_MILE
  return miles < 1 ? '<1 mi' : `${Math.round(miles).toLocaleString()} mi`
}

// Splits beach cameras into those within the radius of the origin and everything else.
export function beachSections(cameras: Camera[], origin: Coordinates | null, radiusMiles = NEARBY_RADIUS_MILES) {
  const beaches = cameras.filter(camera => camera.isBeach)
  const nearby = origin ? nearbyCameras(beaches, origin, radiusMiles) : []
  const localIds = new Set(nearby.map(({ camera }) => camera.id))
  return { nearby, explore: beaches.filter(camera => !localIds.has(camera.id)) }
}

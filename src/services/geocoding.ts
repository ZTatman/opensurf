import { validCoordinates, type Coordinates } from '../lib/geo'

export type Place = Coordinates & { id: string; label: string; name: string }

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  const name = query.trim().replace(/\bst\.?(?=\s)/gi, 'Saint').replace(/\bft\.?(?=\s)/gi, 'Fort')
  url.search = new URLSearchParams({ name, count: '4', language: 'en', format: 'json' }).toString()
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Place search is unavailable. Try a beach or region in the catalog.')
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object' || !('results' in data)) return []
  if (!Array.isArray(data.results)) throw new Error('Place search returned an unexpected response.')
  return data.results.flatMap((value: unknown) => {
    if (!validCoordinates(value)) return []
    const item = value as Coordinates & Record<string, unknown>
    if (typeof item.name !== 'string' || typeof item.id !== 'number') return []
    const parts = [item.name, item.admin1, item.country].filter((part): part is string => typeof part === 'string' && part.length > 0)
    return [{ id: `place:${item.id}`, name: item.name, label: [...new Set(parts)].join(', '), latitude: item.latitude, longitude: item.longitude }]
  })
}

// Session cache of recent results, keyed by lowercased query, oldest evicted first.
const CACHE_LIMIT = 40
const cache = new Map<string, Place[]>()

export function cachedPlaces(query: string) {
  return cache.get(query.trim().toLocaleLowerCase())
}

export function cachePlaces(query: string, places: Place[]) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  cache.set(query.trim().toLocaleLowerCase(), places)
}

import type { Camera, IndexedBeach } from '../cameras'

export type CameraFilter = {
  query?: string
  country?: string
  region?: string
  // When set, only cameras with these IDs match (the favorites filter).
  onlyIds?: Set<string>
}

// Accent- and case-insensitive, with punctuation treated as spaces, so "Balneário" matches "balneario".
export function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')
}

function searchText(camera: Camera) {
  return normalizeText([camera.name, camera.beach, camera.region, camera.country, ...camera.searchTerms, camera.country === 'USA' ? 'United States US' : ''].join(' '))
}

// Every query word must appear somewhere in the camera's name, place, or search terms.
export function filterCameras(cameras: Camera[], { query = '', country = '', region = '', onlyIds }: CameraFilter = {}) {
  const words = normalizeText(query).trim().split(/\s+/).filter(Boolean)
  return cameras.filter(camera => {
    if ((country && camera.country !== country) || (region && camera.region !== region) || (onlyIds && !onlyIds.has(camera.id))) return false
    const text = searchText(camera)
    return words.every(word => text.includes(word))
  })
}

const indexText = new WeakMap<IndexedBeach[], string[]>()

// Beaches whose name, county or state contain every query word, names starting with the query first.
export function searchBeachIndex(index: IndexedBeach[], query: string, limit: number) {
  const words = normalizeText(query).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  let texts = indexText.get(index)
  if (!texts) {
    texts = index.map(beach => normalizeText([beach.name, beach.county ?? '', beach.region].join(' ')))
    indexText.set(index, texts)
  }
  const phrase = words.join(' ')
  return index.filter((_, position) => words.every(word => texts[position].includes(word)))
    .map(beach => ({ beach, rank: normalizeText(beach.name).trim().startsWith(phrase) ? 0 : 1 }))
    .sort((a, b) => a.rank - b.rank || a.beach.name.length - b.beach.name.length || a.beach.name.localeCompare(b.beach.name))
    .slice(0, limit)
    .map(({ beach }) => beach)
}


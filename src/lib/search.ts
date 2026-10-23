import type { Camera } from '../cameras'

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

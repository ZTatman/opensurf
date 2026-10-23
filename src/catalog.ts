import { validCoordinates } from './places'

// Records as stored in src/data/catalog. Beaches, cameras and sources are kept apart so one beach
// can have several views and each source carries its own terms, attribution and access method.
export type SourceRecord = {
  id: string
  name: string
  status: 'approved' | 'rejected'
  access?: 'embed' | 'external'
  homepage?: string
  terms?: string
  pageBase?: string
  embedBase?: string
  searchTerms?: string[]
  notes: string
}

export type BeachRecord = {
  id: string
  name: string
  region: string
  country: string
  latitude: number
  longitude: number
  aliases?: string[]
}

// Cameras without a beach (inlets, marinas, river views) carry their own locality and coordinates.
// Cameras on a beach inherit its coordinates unless they set their own.
export type CameraRecord = {
  id: string
  sourceId: string
  beachId?: string
  name: string
  path?: string
  watchUrl?: string
  previewUrl: string
  locality?: string
  region?: string
  country?: string
  latitude?: number
  longitude?: number
  searchTerms?: string[]
  availabilityNote?: string
  checkedAt: string
}

type CameraInfo = {
  id: string
  sourceId: string
  sourceName: string
  beachId?: string
  name: string
  beach: string
  region: string
  country: string
  latitude: number
  longitude: number
  previewUrl: string
  pageUrl: string
  isBeach: boolean
  searchTerms: string[]
  availabilityNote?: string
  checkedAt: string
}

export type EmbeddedCamera = CameraInfo & { playback: 'embed'; path: string; embedUrl: string }
export type ExternalCamera = CameraInfo & { playback: 'external'; watchUrl: string }
export type Camera = EmbeddedCamera | ExternalCamera

const isHttps = (value: unknown) => {
  try {
    return typeof value === 'string' && new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function duplicates(rows: { id: string }[]) {
  const seen = new Set<string>()
  return rows.filter(({ id }) => seen.has(id) || !seen.add(id)).map(({ id }) => id)
}

// Joins and validates the catalog. Throws on any problem so a bad record fails tests and the build.
export function buildCatalog(sources: SourceRecord[], beaches: BeachRecord[], cameras: CameraRecord[]): Camera[] {
  const errors = [
    ...duplicates(sources).map(id => `duplicate source ${id}`),
    ...duplicates(beaches).map(id => `duplicate beach ${id}`),
    ...duplicates(cameras).map(id => `duplicate camera ${id}`),
    ...beaches.flatMap(({ id, ...point }) => validCoordinates(point) ? [] : [`beach ${id}: invalid coordinates`]),
  ]
  const sourceById = new Map(sources.map(source => [source.id, source]))
  const beachById = new Map(beaches.map(beach => [beach.id, beach]))
  const joined: Camera[] = []

  for (const record of cameras) {
    const fail = (problem: string) => errors.push(`camera ${record.id}: ${problem}`)
    const source = sourceById.get(record.sourceId)
    if (!source) { fail(`unknown source ${record.sourceId}`); continue }
    if (source.status !== 'approved') { fail(`source ${source.id} is ${source.status}`); continue }
    const beach = record.beachId === undefined ? undefined : beachById.get(record.beachId)
    if (record.beachId !== undefined && !beach) { fail(`unknown beach ${record.beachId}`); continue }
    const place = beach
      ? { beach: beach.name, region: beach.region, country: beach.country }
      : { beach: record.locality, region: record.region, country: record.country }
    if (!place.beach || !place.region || !place.country) { fail('needs a beach or a locality, region and country'); continue }
    const point = { latitude: record.latitude ?? beach?.latitude, longitude: record.longitude ?? beach?.longitude }
    if (!validCoordinates(point)) { fail('invalid coordinates'); continue }
    if (!isHttps(record.previewUrl)) fail('preview must be an HTTPS URL')

    const info: Omit<CameraInfo, 'pageUrl'> = {
      id: record.id,
      sourceId: source.id,
      sourceName: source.name,
      ...(beach ? { beachId: beach.id } : {}),
      name: record.name,
      beach: place.beach,
      region: place.region,
      country: place.country,
      ...point,
      previewUrl: record.previewUrl,
      isBeach: !!beach,
      searchTerms: [...source.searchTerms ?? [], ...beach?.aliases ?? [], ...record.searchTerms ?? []],
      ...(record.availabilityNote ? { availabilityNote: record.availabilityNote } : {}),
      checkedAt: record.checkedAt,
    }
    if (source.access === 'embed') {
      if (!record.path || !isHttps(source.pageBase) || !isHttps(source.embedBase)) { fail('embed sources need a path, pageBase and embedBase'); continue }
      joined.push({ ...info, playback: 'embed', path: record.path, pageUrl: source.pageBase + record.path, embedUrl: source.embedBase + record.path })
    } else if (source.access === 'external') {
      if (!isHttps(record.watchUrl)) { fail('external cameras need an HTTPS watchUrl'); continue }
      joined.push({ ...info, playback: 'external', watchUrl: record.watchUrl!, pageUrl: record.watchUrl! })
    } else {
      fail(`source ${source.id} has no access method`)
    }
  }

  if (errors.length) throw new Error(`Invalid camera catalog:\n${errors.join('\n')}`)
  return joined
}

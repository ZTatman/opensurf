import catalog from './data/cameras.json'
import stLucieCatalog from './data/visit-st-lucie.json'

type CameraInfo = {
  id: string
  name: string
  beach: string
  region: string
  country: string
  latitude: number
  longitude: number
  previewUrl: string
  isBeach?: boolean
  searchTerms?: string[]
  availabilityNote?: string
}

export type EmbeddedCamera = CameraInfo & { playback: 'embed'; path: string }
export type ExternalCamera = CameraInfo & { playback: 'external'; watchUrl: string; sourceName: string }
export type Camera = EmbeddedCamera | ExternalCamera

export const provider = {
  name: 'Live Beach Cams',
  terms: 'https://worldbeachcams.com/en/terms',
}

export const sourceUrl = (camera: Camera) => camera.playback === 'external'
  ? camera.watchUrl
  : `https://worldbeachcams.com/en/${camera.path}`
export const embedUrl = (camera: EmbeddedCamera) => `https://worldbeachcams.com/embed/${camera.path}`

// Curated snapshots of public listings, 2026-10-23. Coordinates are approximate.
// External listings retain the operator's own player and viewing restrictions.
export const cameras: Camera[] = [
  ...catalog.map(camera => ({ ...camera, playback: 'embed' as const })),
  ...stLucieCatalog.map(camera => ({ ...camera, playback: 'external' as const })),
]

export const beaches = cameras.filter(camera => camera.isBeach !== false)

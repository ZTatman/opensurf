import sourceRecords from './data/catalog/sources.json'
import beachRecords from './data/catalog/beaches.json'
import cameraRecords from './data/catalog/cameras.json'
import { buildCatalog, type BeachRecord, type Camera, type CameraRecord, type EmbeddedCamera, type SourceRecord } from './catalog'

export type { Camera, EmbeddedCamera, ExternalCamera } from './catalog'

// Curated snapshots of public listings; see each camera's checkedAt. Coordinates are approximate.
// External listings retain the operator's own player and viewing restrictions.
// JSON imports are typed loosely, so buildCatalog validates every record at load.
export const cameras: Camera[] = buildCatalog(sourceRecords as SourceRecord[], beachRecords as BeachRecord[], cameraRecords as CameraRecord[])

// Approved sources that currently supply cameras, in catalog order, for attribution.
export const sources = (sourceRecords as SourceRecord[]).filter(source => cameras.some(camera => camera.sourceId === source.id))

export const sourceUrl = (camera: Camera) => camera.pageUrl
export const embedUrl = (camera: EmbeddedCamera) => camera.embedUrl

export const beaches = cameras.filter(camera => camera.isBeach)

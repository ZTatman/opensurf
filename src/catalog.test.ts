import { describe, expect, it } from 'vitest'
import { buildCatalog, type BeachRecord, type CameraRecord, type SourceRecord } from './catalog'
import { beaches, cameras, sources } from './cameras'

const embed: SourceRecord = { id: 'embed', name: 'Embed Source', status: 'approved', access: 'embed', pageBase: 'https://example.com/en/', embedBase: 'https://example.com/embed/', notes: '' }
const external: SourceRecord = { id: 'external', name: 'Operator', status: 'approved', access: 'external', searchTerms: ['operator brand'], notes: '' }
const rejected: SourceRecord = { id: 'rejected', name: 'Rejected', status: 'rejected', notes: 'Terms prohibit redistribution.' }
const beach: BeachRecord = { id: 'jetty-park', name: 'Jetty Park', region: 'Florida', country: 'USA', latitude: 27.47, longitude: -80.29, aliases: ['South Jetty'] }
const camera = (fields: Partial<CameraRecord>): CameraRecord => ({ id: 'cam', sourceId: 'embed', beachId: 'jetty-park', name: 'Cam', path: 'usa/cam', previewUrl: 'https://example.com/cam.jpg', checkedAt: '2026-10-23', ...fields })
const build = (rows: CameraRecord[], beachRows = [beach]) => buildCatalog([embed, external, rejected], beachRows, rows)

describe('catalog records', () => {
  it('joins several views of one beach and inherits its location', () => {
    const [surf, pier] = build([camera({ id: 'surf' }), camera({ id: 'pier', latitude: 27.48, longitude: -80.3 })])
    expect(surf).toMatchObject({ beach: 'Jetty Park', region: 'Florida', latitude: 27.47, isBeach: true, sourceName: 'Embed Source' })
    expect(pier).toMatchObject({ beachId: 'jetty-park', latitude: 27.48, longitude: -80.3 })
    expect(surf.playback === 'embed' && [surf.pageUrl, surf.embedUrl]).toEqual(['https://example.com/en/usa/cam', 'https://example.com/embed/usa/cam'])
  })
  it('keeps non-beach views with their own locality and combines search terms', () => {
    const [marina] = build([camera({ sourceId: 'external', beachId: undefined, path: undefined, watchUrl: 'https://example.com/marina', locality: 'City Marina', region: 'Florida', country: 'USA', latitude: 27.45, longitude: -80.32, searchTerms: ['marina'] })])
    expect(marina).toMatchObject({ playback: 'external', beach: 'City Marina', isBeach: false, pageUrl: 'https://example.com/marina', searchTerms: ['operator brand', 'marina'] })
    expect('path' in marina || 'beachId' in marina).toBe(false)
    expect(build([camera({})])[0].searchTerms).toEqual(['South Jetty'])
  })
  it('rejects broken references, rejected sources, and missing access details', () => {
    const invalid: [CameraRecord[], string][] = [
      [[camera({}), camera({})], 'duplicate camera cam'],
      [[camera({ sourceId: 'missing' })], 'unknown source missing'],
      [[camera({ sourceId: 'rejected' })], 'source rejected is rejected'],
      [[camera({ beachId: 'missing' })], 'unknown beach missing'],
      [[camera({ path: undefined })], 'embed sources need a path'],
      [[camera({ sourceId: 'external', watchUrl: 'http://example.com' })], 'HTTPS watchUrl'],
      [[camera({ beachId: undefined })], 'needs a beach or a locality'],
      [[camera({ beachId: undefined, locality: 'Inlet', region: 'Florida', country: 'USA' })], 'invalid coordinates'],
      [[camera({ previewUrl: 'not a url' })], 'preview must be an HTTPS URL'],
    ]
    for (const [rows, message] of invalid) expect(() => build(rows)).toThrow(message)
    expect(() => build([], [beach, beach])).toThrow('duplicate beach jetty-park')
    expect(() => build([], [{ ...beach, latitude: 91 }])).toThrow('beach jetty-park: invalid coordinates')
  })
})

describe('bundled catalog', () => {
  it('attributes only sources that supply cameras', () => {
    expect(sources.map(source => source.id)).toEqual(['worldbeachcams', 'visit-st-lucie'])
    expect(cameras.every(camera => sources.some(source => source.id === camera.sourceId))).toBe(true)
  })
  it('groups the St. Lucie beach and jetty views under one beach', () => {
    const jetty = beaches.filter(camera => camera.beachId === 'jetty-park-beach-fort-pierce-florida').map(camera => camera.id)
    expect(jetty).toEqual(['stlucie-beach', 'stlucie-jetty'])
  })
})

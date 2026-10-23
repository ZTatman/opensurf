import { describe, expect, it } from 'vitest'
import { cameras } from '../cameras'
import { filterCameras } from './search'

const ids = (list: { id: string }[]) => list.map(camera => camera.id)

describe('camera search', () => {
  it('combines search words, country, and an ID restriction', () => {
    expect(ids(filterCameras(cameras, { query: 'HAWAII pipeline', country: 'USA', onlyIds: new Set(['pipeline']) }))).toEqual(['pipeline'])
    expect(filterCameras(cameras, { query: 'pipeline', country: 'France' })).toEqual([])
    expect(ids(filterCameras(cameras, { query: '  north   carolina  ' }))).toEqual(['bald-head', 'carolina-beach', 'wrightsville'])
    expect(filterCameras(cameras)).toEqual(cameras)
  })
  it('combines an exact region with favorites and ignores accents', () => {
    expect(ids(filterCameras(cameras, { country: 'USA', region: 'New York' }))).toEqual(['georgica', 'tobay', 'rogers'])
    expect(ids(filterCameras(cameras, { country: 'USA', region: 'New York', onlyIds: new Set(['georgica', 'pipeline']) }))).toEqual(['georgica'])
    expect(ids(filterCameras(cameras, { query: 'balneario rincao' }))).toEqual(['rincao'])
  })
  it('finds all six official St. Lucie cameras through county and city aliases', () => {
    const official = cameras.filter(camera => camera.playback === 'external')
    expect(official).toHaveLength(6)
    for (const query of ['st lucie', 'St. Lucie', 'Saint Lucie', 'Port St Lucie', 'Visit St Lucie', 'visitstlucie']) {
      expect(filterCameras(cameras, { query })).toEqual(official)
    }
    expect(filterCameras(cameras, { query: 'Fort Pierce', country: 'USA', region: 'Florida' })).toHaveLength(5)
    expect(filterCameras(cameras, { query: 'Hutchinson Island' })).toHaveLength(4)
  })
})

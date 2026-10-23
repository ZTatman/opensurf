import { describe, expect, it } from 'vitest'
import { cameras } from '../cameras'
import { filterCameras, searchBeachIndex } from './search'

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

describe('beach index search', () => {
  const index = [
    { id: 'a', name: 'Fort Pierce Beach Access', county: 'St. Lucie', region: 'Florida', country: 'USA', latitude: 27.4, longitude: -80.3 },
    { id: 'b', name: 'Blind Creek Beach', county: 'St. Lucie', region: 'Florida', country: 'USA', latitude: 27.3, longitude: -80.2 },
    { id: 'c', name: 'Beach', county: 'Kenosha', region: 'Wisconsin', country: 'USA', latitude: 42.6, longitude: -87.8 },
  ]
  it('matches name, county and state words, preferring names that start with the query', () => {
    expect(searchBeachIndex(index, 'st lucie beach', 5).map(beach => beach.id)).toEqual(['b', 'a'])
    expect(searchBeachIndex(index, 'beach', 5).map(beach => beach.id)).toEqual(['c', 'b', 'a'])
    expect(searchBeachIndex(index, 'blind creek', 5).map(beach => beach.id)).toEqual(['b'])
    expect(searchBeachIndex(index, 'beach', 1)).toHaveLength(1)
    expect(searchBeachIndex(index, '  ', 5)).toEqual([])
  })
})


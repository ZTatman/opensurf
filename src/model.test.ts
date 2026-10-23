import { describe, expect, it } from 'vitest'
import { cameras, embedUrl, sourceUrl } from './cameras'
import { addCamera, FAVORITES_KEY, filterCameras, nearbyCameras, beachSections, distanceKm, readFavorites, writeFavorites } from './model'

describe('camera discovery', () => {
  it('combines search words, country, and favorites', () => {
    expect(filterCameras(cameras, 'HAWAII pipeline', 'USA', true, ['pipeline']).map(camera => camera.id)).toEqual(['pipeline'])
    expect(filterCameras(cameras, 'pipeline', 'France', false, [])).toEqual([])
    expect(filterCameras(cameras, '  north   carolina  ', '', false, []).map(camera => camera.id)).toEqual(['bald-head', 'carolina-beach', 'wrightsville'])
  })
  it('has distinct IDs and HTTPS provider embed paths', () => {
    expect(new Set(cameras.map(camera => camera.id)).size).toBe(cameras.length)
    for (const camera of cameras) {
      expect(new URL(sourceUrl(camera)).protocol).toBe('https:')
      if (camera.playback === 'embed') expect(new URL(embedUrl(camera)).origin).toBe('https://worldbeachcams.com')
      else expect(new URL(sourceUrl(camera)).origin).toBe('https://visitstlucie.com')
    }
  })
})

describe('watch grid', () => {
  it('never duplicates a camera or exceeds four selections', () => {
    const selected = ['pipeline', 'avalon', 'bald-head', 'ocean-city']
    expect(addCamera(selected, 'anacapa')).toEqual(selected)
    expect(addCamera(['pipeline'], 'pipeline')).toEqual(['pipeline'])
    expect(addCamera(['pipeline'], 'avalon')).toEqual(['pipeline', 'avalon'])
    expect(selected).toHaveLength(4)
  })
})

describe('browser favorites', () => {
  it('persists and restores only valid unique camera IDs', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
    expect(writeFavorites(storage, ['pipeline', 'deleted-camera', 'pipeline', 'avalon'])).toBe(true)
    expect(readFavorites(storage, cameras.map(camera => camera.id))).toEqual(['pipeline', 'avalon'])
    expect(data.has(FAVORITES_KEY)).toBe(true)
  })
  it('recovers from invalid, non-array, or blocked storage', () => {
    for (const value of ['broken json', '{"id":"pipeline"}', '[23,null]']) expect(readFavorites({ getItem: () => value }, ['pipeline'])).toEqual([])
    expect(readFavorites({ getItem: () => { throw new Error('blocked') } }, ['pipeline'])).toEqual([])
    expect(writeFavorites({ setItem: () => { throw new Error('quota') } }, ['pipeline'])).toBe(false)
  })
})


describe('location discovery', () => {
  const boston = { latitude: 42.36, longitude: -71.06 }
  it('ranks cameras by distance and excludes cameras outside the radius', () => {
    const results = nearbyCameras(cameras, boston, 100)
    expect(results.map(({ camera }) => camera.id)).toEqual(['salisbury', 'cahoon-hollow'])
    expect(results[0].distanceKm).toBeGreaterThan(50)
    expect(results[0].distanceKm).toBeLessThan(65)
    expect(nearbyCameras(cameras, boston, 25)).toEqual([])
    expect(nearbyCameras(cameras, boston, 250).map(({ camera }) => camera.id)).toContain('georgica')
  })
  it('handles coincident, antimeridian and antipodal coordinates', () => {
    expect(distanceKm(boston, boston)).toBe(0)
    expect(distanceKm({ latitude: 0, longitude: 179 }, { latitude: 0, longitude: -179 })).toBeCloseTo(222.39, 1)
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 })).toBeCloseTo(20015.11, 1)
    expect(nearbyCameras(cameras, { latitude: NaN, longitude: 0 }, 100)).toEqual([])
    expect(nearbyCameras(cameras, boston, -1)).toEqual([])
  })
  it('combines an exact region with favorites and ignores accents in search', () => {
    expect(filterCameras(cameras, '', 'USA', false, [], 'New York').map(camera => camera.id)).toEqual(['georgica', 'tobay', 'rogers'])
    expect(filterCameras(cameras, '', 'USA', true, ['georgica', 'pipeline'], 'New York').map(camera => camera.id)).toEqual(['georgica'])
    expect(filterCameras(cameras, 'balneario rincao', '', false, []).map(camera => camera.id)).toEqual(['rincao'])
    expect(cameras.every(camera => Number.isFinite(camera.latitude) && Math.abs(camera.latitude) <= 90 && Number.isFinite(camera.longitude) && Math.abs(camera.longitude) <= 180)).toBe(true)
    expect(new Set(cameras.filter(camera => camera.playback === 'embed' && camera.path.startsWith('usa/')).map(camera => camera.country))).toEqual(new Set(['USA']))
  })
})


describe('official St. Lucie sources', () => {
  it('finds all six official cameras through county and city aliases', () => {
    const official = cameras.filter(camera => camera.playback === 'external')
    expect(official).toHaveLength(6)
    for (const query of ['st lucie', 'St. Lucie', 'Saint Lucie', 'Port St Lucie', 'Visit St Lucie', 'visitstlucie']) {
      expect(filterCameras(cameras, query, '', false, [])).toEqual(official)
    }
    expect(filterCameras(cameras, 'Fort Pierce', 'USA', false, [], 'Florida')).toHaveLength(5)
    expect(filterCameras(cameras, 'Hutchinson Island', '', false, [])).toHaveLength(4)
  })
  it('includes local official sources within 25 miles of Port St. Lucie', () => {
    const local = nearbyCameras(cameras, { latitude: 27.2939, longitude: -80.3503 }, 25)
    expect(local).toHaveLength(6)
    expect(local.every(({ camera }) => camera.id.startsWith('stlucie-'))).toBe(true)
    expect(local[0].camera.id).toBe('stlucie-boardwalk')
    expect(local.at(-1)!.distanceKm).toBeLessThan(25)
  })
  it('keeps host-restricted players external and preserves operator offline notices', () => {
    const official = cameras.filter(camera => camera.playback === 'external')
    expect(official.every(camera => !('path' in camera))).toBe(true)
    expect(official.filter(camera => camera.availabilityNote).map(camera => camera.id)).toEqual(['stlucie-inlet', 'stlucie-marina'])
    expect(sourceUrl(official.find(camera => camera.id === 'stlucie-surf')!)).toBe('https://visitstlucie.com/fort-pierce-inlet-webcam-surf/')
  })
})


describe('homepage beach carousels', () => {
  it('keeps nearby beaches inside 25 miles and puts all other beaches in Explore', () => {
    const { nearby, explore } = beachSections(cameras, { latitude: 27.29393, longitude: -80.35033 })
    expect(new Set(nearby.map(({ camera }) => camera.id))).toEqual(new Set(['stlucie-surf', 'stlucie-beach', 'stlucie-jetty']))
    expect(nearby.every(({ distanceKm }) => distanceKm <= 25 * 1.609344)).toBe(true)
    const nearbyIds = new Set(nearby.map(({ camera }) => camera.id))
    expect(explore.every(camera => !nearbyIds.has(camera.id))).toBe(true)
    expect(explore.map(camera => camera.id)).toContain('deerfield')
    expect([...nearby.map(({ camera }) => camera), ...explore].every(camera => camera.isBeach !== false)).toBe(true)
    expect(nearby.length + explore.length).toBe(cameras.filter(camera => camera.isBeach !== false).length)
  })
  it('shows no nearby beaches before a location is provided', () => {
    const sections = beachSections(cameras, null)
    expect(sections.nearby).toEqual([])
    expect(sections.explore).toHaveLength(29)
    expect(beachSections(cameras, { latitude: 0, longitude: 0 }).nearby).toEqual([])
  })
})


it('moves beaches between Nearby and Explore when the range changes', () => {
  const point = { latitude: 27.29393, longitude: -80.35033 }
  const narrow = beachSections(cameras, point, 10)
  const normal = beachSections(cameras, point, 25)
  const wide = beachSections(cameras, point, 100)
  expect(narrow.nearby).toEqual([])
  expect(normal.nearby).toHaveLength(3)
  expect(wide.nearby).toHaveLength(4)
  expect(normal.explore.some(camera => camera.id === 'deerfield')).toBe(true)
  expect(wide.explore.some(camera => camera.id === 'deerfield')).toBe(false)
  expect(narrow.explore.length).toBe(wide.explore.length + wide.nearby.length)
})

import { expect, it } from 'vitest'
import { FAVORITES_KEY, readFavorites, writeFavorites } from './favorites'

it('persists and restores only valid unique camera IDs', () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  expect(writeFavorites(storage, ['pipeline', 'deleted-camera', 'pipeline', 'avalon'])).toBe(true)
  expect(readFavorites(storage, ['pipeline', 'avalon'])).toEqual(['pipeline', 'avalon'])
  expect(data.has(FAVORITES_KEY)).toBe(true)
})

it('recovers from invalid, non-array, or blocked storage', () => {
  for (const value of ['broken json', '{"id":"pipeline"}', '[23,null]']) expect(readFavorites({ getItem: () => value }, ['pipeline'])).toEqual([])
  expect(readFavorites({ getItem: () => { throw new Error('blocked') } }, ['pipeline'])).toEqual([])
  expect(writeFavorites({ setItem: () => { throw new Error('quota') } }, ['pipeline'])).toBe(false)
})

import { Button } from '@heroui/react'
import { useState } from 'react'
import { beaches, cameras, sourceUrl, type EmbeddedCamera } from './cameras'
import { addCamera, filterCameras, beachSections, nearbyCameras, MAX_CAMERAS, readFavorites, writeFavorites } from './model'
import CameraCarousel from './components/camera/CameraCarousel'
import type { CameraActions } from './components/camera/CameraCard'
import WatchGrid from './components/camera/WatchGrid'
import SiteFooter from './components/layout/SiteFooter'
import SiteHeader from './components/layout/SiteHeader'
import CameraFilters from './components/search/CameraFilters'
import RangeSelect from './components/search/RangeSelect'
import { useNearby, type SearchArea } from './useNearby'
import type { Place } from './places'

const countries = [...new Set(beaches.map(camera => camera.country))].sort()
const knownIds = cameras.map(camera => camera.id)
const cameraById = new Map(cameras.map(camera => [camera.id, camera]))

function initialFavorites() {
  try {
    return readFavorites(window.localStorage, knownIds)
  } catch {
    return []
  }
}

function revealPlayers() {
  requestAnimationFrame(() => {
    document.getElementById('watch-window')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
  })
}

export default function App() {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [radiusMiles, setRadiusMiles] = useState(25)
  const [area, setArea] = useState<SearchArea | null>(null)
  const [explorePlace, setExplorePlace] = useState<Place | null>(null)
  const nearby = useNearby(located => {
    setArea(located)
    setQuery(current => current === area?.label ? '' : current)
  })
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(initialFavorites)
  const [selected, setSelected] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const regions = [...new Set(beaches.filter(camera => !country || camera.country === country).map(camera => camera.region))].sort()
  const sections = beachSections(beaches, area, radiusMiles)
  const viewing = selected.map(id => cameraById.get(id)).filter((camera): camera is EmbeddedCamera => camera?.playback === 'embed')
  const selectedIds = new Set(selected)
  const favoriteIds = new Set(favorites)
  const nearbyResults = sections.nearby.filter(({ camera }) => !favoritesOnly || favoriteIds.has(camera.id))
  const selectedPlaceLabel = explorePlace?.label ?? (area?.kind === 'place' ? area.label : '')
  const exploreQuery = query === selectedPlaceLabel ? '' : query
  const explored = filterCameras(sections.explore, exploreQuery, country, favoritesOnly, favorites, region)
  const exploreResults = explorePlace ? nearbyCameras(explored, explorePlace, 25) : explored.map(camera => ({ camera, distanceKm: undefined }))
  const hasFilters = !!(exploreQuery || explorePlace || country || region || favoritesOnly)
  const nearbyTitle = area?.kind === 'place' ? `Near ${area.label.split(',')[0]}` : 'Near you'

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id]
    setFavorites(next)
    try {
      if (!writeFavorites(window.localStorage, next)) {
        setNotice('Favorites are saved for this visit. Browser storage is unavailable.')
      }
    } catch {
      setNotice('Favorites are saved for this visit. Browser storage is unavailable.')
    }
  }

  function toggleComparison(id: string) {
    if (selectedIds.has(id)) {
      setSelected(current => current.filter(value => value !== id))
      setNotice('')
      return
    }
    if (selected.length >= MAX_CAMERAS) {
      setNotice('Four cameras selected. Remove one to add another.')
      return
    }
    setSelected(current => addCamera(current, id))
    setNotice('')
    if (selected.length === 0) revealPlayers()
  }

  function resetFilters() {
    setQuery('')
    setCountry('')
    setFavoritesOnly(false)
    setRegion('')
    setExplorePlace(null)
  }

  function choosePlace(place: Place) {
    nearby.cancel()
    if (area?.kind === 'device') setExplorePlace(place)
    else { setArea({ ...place, kind: 'place' }); setExplorePlace(null) }
    setQuery(place.label)
    setCountry('')
    setRegion('')
  }

  function changeQuery(value: string) {
    setQuery(value)
    if (value !== explorePlace?.label) setExplorePlace(null)
  }

  function watchCamera(id: string) {
    const camera = cameraById.get(id)
    if (!camera) return
    if (camera.playback === 'external') {
      window.open(sourceUrl(camera), '_blank', 'noopener,noreferrer')
      return
    }
    setSelected([id])
    setNotice('')
    revealPlayers()
  }

  const cameraActions: CameraActions = { selectedIds, favoriteIds, onWatch: watchCamera, onCompare: toggleComparison, onSave: toggleFavorite }

  return (
    <>
      <SiteHeader notice={notice}>
        <CameraFilters
          query={query}
          country={country}
          countries={countries}
          region={region}
          regions={regions}
          hasSelectedPlace={!!selectedPlaceLabel && query === selectedPlaceLabel}
          onRegionChange={value => { setRegion(value); setQuery(''); setExplorePlace(null) }}
          onPlace={choosePlace}
          onWatch={watchCamera}
          favoritesOnly={favoritesOnly}
          selectedCount={selected.length}
          onQueryChange={changeQuery}
          onCountryChange={value => { setCountry(value); setRegion(''); setQuery(''); setExplorePlace(null) }}
          onFavoritesChange={setFavoritesOnly}
          onRevealPlayers={revealPlayers}
        />
      </SiteHeader>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <h1 className="sr-only">Public surf and beach cameras</h1>
        <WatchGrid cameras={viewing} onRemove={id => {
          setSelected(current => current.filter(value => value !== id))
          setNotice('')
        }} />

        <div id="camera-library" className="space-y-10 scroll-mt-40 sm:scroll-mt-28">
          <CameraCarousel key={`nearby:${area?.label ?? 'unknown'}:${radiusMiles}:${favoritesOnly}`} title={nearbyTitle}
            description={area ? `${nearbyResults.length} beach cam${nearbyResults.length === 1 ? '' : 's'} within ${radiusMiles} miles${area.kind === 'place' ? ' of this city' : ''}` : `Beaches within ${radiusMiles} miles of your location`}
            status={nearby.locationError || (nearby.locating ? 'Finding your location…' : '')}
            entries={nearbyResults} actions={cameraActions}
            action={<RangeSelect miles={radiusMiles} onChange={setRadiusMiles} />}
            empty={area ? (
              <p>{favoritesOnly ? `No saved beaches within ${radiusMiles} miles.` : `No listed beaches within ${radiusMiles} miles. Try a wider range.`}</p>
            ) : (
              <p>{nearby.locating ? 'Allow location access in your browser to see nearby beaches.' : 'Search for a city to look nearby instead.'}</p>
            )} />

          <CameraCarousel key={`explore:${area?.label ?? 'all'}:${radiusMiles}:${explorePlace?.id ?? ''}:${exploreQuery}:${country}:${region}:${favoritesOnly}`} title="Explore"
            description={explorePlace ? `${exploreResults.length} beaches within 25 miles of ${explorePlace.name}` : hasFilters ? `${exploreResults.length} matching beaches outside your nearby selection` : area ? 'Other beaches around the world' : 'Discover beaches around the world'}
            entries={exploreResults} actions={cameraActions}
            empty={hasFilters ? <>
              <p>No other beaches match these filters.</p>
              <Button className="mt-3" variant="secondary" onPress={resetFilters}>Clear filters</Button>
            </> : <p>No other beaches in the catalog yet.</p>} />
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

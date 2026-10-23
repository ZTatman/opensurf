import { Button, Link, ListBox, Select } from '@heroui/react'
import { Fragment, useState } from 'react'
import { beaches, cameras, sources, sourceUrl, type EmbeddedCamera } from './cameras'
import { addCamera, filterCameras, beachSections, nearbyCameras, MAX_CAMERAS, readFavorites, writeFavorites } from './model'
import CameraCarousel from './CameraCarousel'
import CameraFilters from './CameraFilters'
import CameraPlayer from './CameraPlayer'
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

  return (
    <>
      <a className="sr-only fixed left-4 top-3 z-50 bg-surface p-3 focus:not-sr-only" href="#camera-library">
        Skip to cameras
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:gap-8 sm:px-8">
          <a className="text-xl font-bold tracking-tight" href="./" aria-label="OpenSurf home">OpenSurf</a>
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
        </div>
        <p className={`mx-auto max-w-7xl px-4 text-sm text-foreground sm:px-8 ${notice ? 'pb-3' : 'sr-only'}`} role="status">
          {notice}
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <h1 className="sr-only">Public surf and beach cameras</h1>
        {viewing.length > 0 ? (
          <section id="watch-window" className="mb-8 scroll-mt-40 sm:scroll-mt-28" aria-label="Selected cameras">
            <div className={viewing.length > 1 ? 'players-grid grid grid-cols-1 gap-6 md:grid-cols-2' : 'mx-auto max-w-4xl'}>
              {viewing.map(camera => (
                <CameraPlayer key={camera.id} camera={camera} onRemove={() => {
                  setSelected(current => current.filter(id => id !== camera.id))
                  setNotice('')
                }} />
              ))}
            </div>
          </section>
        ) : null}

        <div id="camera-library" className="space-y-10 scroll-mt-40 sm:scroll-mt-28">
          <CameraCarousel key={`nearby:${area?.label ?? 'unknown'}:${radiusMiles}:${favoritesOnly}`} title={nearbyTitle}
            description={area ? `${nearbyResults.length} beach cam${nearbyResults.length === 1 ? '' : 's'} within ${radiusMiles} miles${area.kind === 'place' ? ' of this city' : ''}` : `Beaches within ${radiusMiles} miles of your location`}
            status={nearby.locationError || (nearby.locating ? 'Finding your location…' : '')}
            entries={nearbyResults} selectedIds={selectedIds} favoriteIds={favoriteIds}
            onWatch={watchCamera} onCompare={toggleComparison} onSave={toggleFavorite}
            action={
              <Select className="w-36" aria-label="Nearby range" value={String(radiusMiles)}
                onChange={value => { if (value && [5, 10, 25, 50, 100].includes(Number(value))) setRadiusMiles(Number(value)) }}>
                <Select.Trigger className="h-10"><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>
                  {[5, 10, 25, 50, 100].map(miles => <ListBox.Item key={miles} id={String(miles)} textValue={`Within ${miles} mi`}>Within {miles} mi<ListBox.ItemIndicator /></ListBox.Item>)}
                </ListBox></Select.Popover>
              </Select>
            }
            empty={area ? (
              <p>{favoritesOnly ? `No saved beaches within ${radiusMiles} miles.` : `No listed beaches within ${radiusMiles} miles. Try a wider range.`}</p>
            ) : (
              <p>{nearby.locating ? 'Allow location access in your browser to see nearby beaches.' : 'Search for a city to look nearby instead.'}</p>
            )} />

          <CameraCarousel key={`explore:${area?.label ?? 'all'}:${radiusMiles}:${explorePlace?.id ?? ''}:${exploreQuery}:${country}:${region}:${favoritesOnly}`} title="Explore"
            description={explorePlace ? `${exploreResults.length} beaches within 25 miles of ${explorePlace.name}` : hasFilters ? `${exploreResults.length} matching beaches outside your nearby selection` : area ? 'Other beaches around the world' : 'Discover beaches around the world'}
            entries={exploreResults} selectedIds={selectedIds} favoriteIds={favoriteIds}
            onWatch={watchCamera} onCompare={toggleComparison} onSave={toggleFavorite}
            empty={hasFilters ? <>
              <p>No other beaches match these filters.</p>
              <Button className="mt-3" variant="secondary" onPress={resetFilters}>Clear filters</Button>
            </> : <p>No other beaches in the catalog yet.</p>} />
        </div>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap gap-x-3 gap-y-1 px-4 py-6 text-xs text-muted sm:px-8">
        <span>Public cameras from {sources.map((source, index) => (
          <Fragment key={source.id}>
            {index === 0 ? '' : index === sources.length - 1 ? ' and ' : ', '}
            <Link className="text-xs text-muted" href={source.homepage} target="_blank" rel="noopener noreferrer">{source.name}</Link>
          </Fragment>
        ))}.</span>
        {sources.filter(source => source.terms).map(source => (
          <Link key={source.id} className="text-xs text-muted" href={source.terms} target="_blank" rel="noopener noreferrer">
            {source.name} terms
          </Link>
        ))}
        <span>Places: <Link className="text-xs text-muted" href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noopener noreferrer">GeoNames via Open-Meteo</Link>.</span>
        <span>Locations and distances are approximate.</span>
        <span>Search covers the listed sources. Some cameras open on the operator’s site. Availability varies; images may be cached or location photos.</span>
      </footer>
    </>
  )
}

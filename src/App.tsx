import { Button } from '@heroui/react'
import { useState } from 'react'
import CameraCarousel from './components/camera/CameraCarousel'
import type { CameraActions } from './components/camera/CameraCard'
import WatchGrid from './components/camera/WatchGrid'
import SiteFooter from './components/layout/SiteFooter'
import SiteHeader from './components/layout/SiteHeader'
import CameraFilters from './components/search/CameraFilters'
import RangeSelect from './components/search/RangeSelect'
import { useCameraBrowser } from './hooks/useCameraBrowser'
import { useFavorites } from './hooks/useFavorites'
import { revealPlayers, useSelection } from './hooks/useSelection'

export default function App() {
  // One status line, shared by favorites and selection; the latest message wins.
  const [notice, setNotice] = useState('')
  const favorites = useFavorites(setNotice)
  const selection = useSelection(setNotice)
  const browser = useCameraBrowser(favorites.favorites)
  const { area, radiusMiles, favoritesOnly, explorePlace, nearby, explore, hasFilters } = browser
  const nearbyTitle = area?.kind === 'place' ? `Near ${area.label.split(',')[0]}` : 'Near you'
  const cameraActions: CameraActions = {
    selectedIds: selection.selectedIds, favoriteIds: favorites.favoriteIds,
    onWatch: selection.watch, onCompare: selection.toggle, onSave: favorites.toggle,
  }

  return (
    <>
      <SiteHeader notice={notice}>
        <CameraFilters filters={browser.filters} countries={browser.countries} regions={browser.regions}
          hasSelectedPlace={browser.hasSelectedPlace} selectedCount={selection.count}
          onFilterChange={browser.setFilter} onPlace={browser.choosePlace} onWatch={selection.watch}
          onRevealPlayers={revealPlayers} />
      </SiteHeader>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <h1 className="sr-only">Public surf and beach cameras</h1>
        <WatchGrid cameras={selection.viewing} onRemove={selection.remove} />

        <div id="camera-library" className="space-y-10 scroll-mt-40 sm:scroll-mt-28">
          <CameraCarousel key={`nearby:${area?.label ?? 'unknown'}:${radiusMiles}:${favoritesOnly}`} title={nearbyTitle}
            description={area ? `${nearby.length} beach cam${nearby.length === 1 ? '' : 's'} within ${radiusMiles} miles${area.kind === 'place' ? ' of this city' : ''}` : `Beaches within ${radiusMiles} miles of your location`}
            status={browser.locationError || (browser.locating ? 'Finding your location…' : '')}
            entries={nearby} actions={cameraActions}
            action={<RangeSelect miles={radiusMiles} onChange={browser.setRadius} />}
            empty={area ? (
              <p>{favoritesOnly ? `No saved beaches within ${radiusMiles} miles.` : `No listed beaches within ${radiusMiles} miles. Try a wider range.`}</p>
            ) : (
              <p>{browser.locating ? 'Allow location access in your browser to see nearby beaches.' : 'Search for a city to look nearby instead.'}</p>
            )} />

          <CameraCarousel key={`explore:${area?.label ?? 'all'}:${radiusMiles}:${explorePlace?.id ?? ''}:${browser.exploreQuery}:${browser.country}:${browser.region}:${favoritesOnly}`} title="Explore"
            description={explorePlace ? `${explore.length} beaches within 25 miles of ${explorePlace.name}` : hasFilters ? `${explore.length} matching beaches outside your nearby selection` : area ? 'Other beaches around the world' : 'Discover beaches around the world'}
            entries={explore} actions={cameraActions}
            empty={hasFilters ? <>
              <p>No other beaches match these filters.</p>
              <Button className="mt-3" variant="secondary" onPress={browser.resetFilters}>Clear filters</Button>
            </> : <p>No other beaches in the catalog yet.</p>} />
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

import { Button } from "@heroui/react";
import { useState } from "react";
import CameraCarousel from "./components/camera/CameraCarousel";
import type { CameraActions } from "./components/camera/CameraCard";
import WatchGrid from "./components/camera/WatchGrid";
import SiteFooter from "./components/layout/SiteFooter";
import SiteHeader from "./components/layout/SiteHeader";
import CameraFilters from "./components/search/CameraFilters";
import RangeSelect from "./components/search/RangeSelect";
import { useCameraBrowser } from "./hooks/useCameraBrowser";
import { useFavorites } from "./hooks/useFavorites";
import { revealPlayers, useSelection } from "./hooks/useSelection";
import { CHROME_LOCATION_SETTINGS } from "./services/geolocation";

export default function App() {
  // One status line, shared by favorites and selection; the latest message wins.
  const [notice, setNotice] = useState("");
  const favorites = useFavorites(setNotice);
  const selection = useSelection(setNotice);
  const browser = useCameraBrowser(favorites.favorites);
  const { area, radiusMiles, favoritesOnly, explorePlace, nearby, explore, hasFilters } = browser;
  const nearbyTitle = area?.kind === "place" ? `Near ${area.label.split(",")[0]}` : "Near you";
  const locationMessage = browser.locationError.split(CHROME_LOCATION_SETTINGS);
  const cameraActions: CameraActions = {
    selectedIds: selection.selectedIds,
    favoriteIds: favorites.favoriteIds,
    onWatch: selection.watch,
    onCompare: selection.toggle,
    onSave: favorites.toggle,
  };

  return (
    <>
      <SiteHeader notice={notice}>
        <CameraFilters
          filters={browser.filters}
          countries={browser.countries}
          regions={browser.regions}
          hasSelectedPlace={browser.hasSelectedPlace}
          hasDeviceLocation={browser.area?.kind === "device"}
          locating={browser.locating}
          onUseLocation={browser.retryLocation}
          selectedCount={selection.count}
          onFilterChange={browser.setFilter}
          onPlace={browser.choosePlace}
          onRegion={browser.chooseRegion}
          onSearch={browser.submitSearch}
          onWatch={selection.watch}
          onRevealPlayers={revealPlayers}
        />
      </SiteHeader>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <h1 className="mb-6 text-sm text-muted">Free beach cams, all in one place.</h1>
        <WatchGrid cameras={selection.viewing} onRemove={selection.remove} />

        <div id="camera-library" className="space-y-10 scroll-mt-40 sm:scroll-mt-28">
          {browser.searchResults ? (
            <CameraCarousel
              title={
                explorePlace
                  ? `Cameras near ${explorePlace.name}`
                  : browser.searchRegion
                    ? `Cameras in ${browser.searchRegion.region}`
                    : `Results for “${browser.submittedQuery}”`
              }
              description={
                explorePlace
                  ? `${browser.searchResults.length} ${browser.searchResults.length === 1 ? "camera" : "cameras"} within ${radiusMiles} miles`
                  : `${browser.searchResults.length} ${browser.searchResults.length === 1 ? "camera" : "cameras"}`
              }
              entries={browser.searchResults}
              actions={cameraActions}
              empty={
                <p>
                  {explorePlace
                    ? `No cameras listed within ${radiusMiles} miles.`
                    : browser.searchRegion
                      ? `No cameras listed in ${browser.searchRegion.region}.`
                      : "No cameras match your search."}
                </p>
              }
            />
          ) : null}
          <CameraCarousel
            title={nearbyTitle}
            description={
              area
                ? `${nearby.length} ${nearby.length === 1 ? "camera" : "cameras"} within ${radiusMiles} miles`
                : `Cameras within ${radiusMiles} miles of your location`
            }
            status={
              browser.locationError ? (
                locationMessage.length === 2 ? (
                  <>
                    {locationMessage[0]}
                    <code className="rounded bg-foreground/15 px-1 py-0.5 font-mono text-foreground break-all">
                      {CHROME_LOCATION_SETTINGS}
                    </code>
                    {locationMessage[1]}
                  </>
                ) : (
                  browser.locationError
                )
              ) : browser.locating ? (
                "Finding your location…"
              ) : null
            }
            entries={nearby}
            actions={cameraActions}
            action={<RangeSelect miles={radiusMiles} onChange={browser.setRadius} />}
            empty={
              area ? (
                <p>
                  {favoritesOnly
                    ? `No saved cameras within ${radiusMiles} miles.`
                    : `No cameras listed within ${radiusMiles} miles. Try a wider range.`}
                </p>
              ) : (
                <p>
                  {browser.locating
                    ? "Allow location access in your browser to see nearby cameras."
                    : "Search for a city or use your location."}
                </p>
              )
            }
          />

          <CameraCarousel
            title="Explore"
            description={
              hasFilters
                ? `${explore.length} matching ${explore.length === 1 ? "camera" : "cameras"} outside your nearby selection`
                : area
                  ? "Other cameras around the world"
                  : "Discover cameras around the world"
            }
            entries={explore}
            actions={cameraActions}
            empty={
              hasFilters ? (
                <>
                  <p>No cameras match these filters.</p>
                  <Button className="mt-3" variant="secondary" onPress={browser.resetFilters}>
                    Clear filters
                  </Button>
                </>
              ) : (
                <p>No other cameras in the catalog yet.</p>
              )
            }
          />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

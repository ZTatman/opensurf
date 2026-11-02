import { Button } from "@heroui/react";
import { SlidersHorizontal, Star, Video } from "lucide-react";
import { useState } from "react";
import type { Filters } from "../../hooks/useCameraBrowser";
import type { Place } from "../../services/geocoding";
import ActionHint from "../ui/ActionHint";
import { IconButton, IconToggle } from "../ui/IconButton";
import BeachSearch from "./BeachSearch";
import RegionFilters from "./RegionFilters";

type CameraFiltersProps = {
  filters: Filters;
  countries: string[];
  regions: string[];
  hasSelectedPlace: boolean;
  hasDeviceLocation: boolean;
  locating: boolean;
  onUseLocation: () => void;
  selectedCount: number;
  onFilterChange: (patch: Partial<Filters>) => void;
  onPlace: (place: Place) => void;
  onWatch: (id: string) => void;
  onRevealPlayers: () => void;
};

/** Renders search, favorites and region filters, and access to selected cameras. */
export default function CameraFilters({
  filters,
  countries,
  regions,
  hasSelectedPlace,
  hasDeviceLocation,
  locating,
  onUseLocation,
  selectedCount,
  onFilterChange,
  onPlace,
  onWatch,
  onRevealPlayers,
}: CameraFiltersProps) {
  const { query, country, region, favoritesOnly } = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selectedLabel = `View ${selectedCount} selected ${selectedCount === 1 ? "camera" : "cameras"}`;

  return (
    <div className="min-w-0 flex-1 basis-full sm:basis-0">
      <div className="flex items-center gap-2">
        <BeachSearch
          query={query}
          onQueryChange={(value) => onFilterChange({ query: value })}
          onPlace={onPlace}
          onWatch={onWatch}
          hasSelectedPlace={hasSelectedPlace}
          hasDeviceLocation={hasDeviceLocation}
          locating={locating}
          onUseLocation={onUseLocation}
        />
        <IconToggle
          label="Show favorites"
          className="favorites-filter"
          isSelected={favoritesOnly}
          onChange={(value) => onFilterChange({ favoritesOnly: value })}
        >
          <Star size={20} fill={favoritesOnly ? "currentColor" : "none"} aria-hidden="true" />
        </IconToggle>
        <IconButton
          label="Filter by region"
          className={country || region || filtersOpen ? "text-accent" : ""}
          aria-expanded={filtersOpen}
          aria-controls="region-filters"
          onPress={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={20} aria-hidden="true" />
        </IconButton>
        {selectedCount > 0 ? (
          <ActionHint label={selectedLabel}>
            <Button
              className="h-11 min-w-14 gap-2"
              variant="secondary"
              onPress={onRevealPlayers}
              aria-label={selectedLabel}
            >
              <Video size={18} aria-hidden="true" />
              <span>{selectedCount}</span>
            </Button>
          </ActionHint>
        ) : null}
      </div>
      {filtersOpen ? (
        <RegionFilters
          id="region-filters"
          country={country}
          countries={countries}
          region={region}
          regions={regions}
          onCountryChange={(value) => onFilterChange({ country: value })}
          onRegionChange={(value) => onFilterChange({ region: value })}
        />
      ) : null}
    </div>
  );
}

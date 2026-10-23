import { Button } from '@heroui/react'
import { SlidersHorizontal, Star, Video } from 'lucide-react'
import { useState } from 'react'
import type { Place } from '../../places'
import ActionHint from '../ui/ActionHint'
import { IconButton, IconToggle } from '../ui/IconButton'
import BeachSearch from './BeachSearch'
import RegionFilters from './RegionFilters'

type CameraFiltersProps = {
  query: string
  country: string
  countries: string[]
  region: string
  regions: string[]
  hasSelectedPlace: boolean
  onRegionChange: (value: string) => void
  onPlace: (place: Place) => void
  onWatch: (id: string) => void
  favoritesOnly: boolean
  selectedCount: number
  onQueryChange: (value: string) => void
  onCountryChange: (value: string) => void
  onFavoritesChange: (value: boolean) => void
  onRevealPlayers: () => void
}

export default function CameraFilters({
  query,
  country,
  countries,
  region, regions, hasSelectedPlace, onRegionChange, onPlace, onWatch,
  favoritesOnly,
  selectedCount,
  onQueryChange,
  onCountryChange,
  onFavoritesChange,
  onRevealPlayers,
}: CameraFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const selectedLabel = `View ${selectedCount} selected ${selectedCount === 1 ? 'camera' : 'cameras'}`

  return (
    <div className="min-w-0 flex-1 basis-full sm:basis-0">
      <div className="flex items-center gap-2">
        <BeachSearch query={query} onQueryChange={onQueryChange} onPlace={onPlace} onWatch={onWatch} hasSelectedPlace={hasSelectedPlace} />
        <IconToggle label="Show favorites" className="favorites-filter" isSelected={favoritesOnly} onChange={onFavoritesChange}>
          <Star size={20} fill={favoritesOnly ? 'currentColor' : 'none'} aria-hidden="true" />
        </IconToggle>
        <IconButton label="Filter by region" className={country || region || filtersOpen ? 'text-accent' : ''}
          aria-expanded={filtersOpen} aria-controls="region-filters"
          onPress={() => setFiltersOpen(open => !open)}>
          <SlidersHorizontal size={20} aria-hidden="true" />
        </IconButton>
        {selectedCount > 0 ? (
          <ActionHint label={selectedLabel}>
            <Button className="h-11 min-w-14 gap-2" variant="secondary" onPress={onRevealPlayers} aria-label={selectedLabel}>
              <Video size={18} aria-hidden="true" /><span>{selectedCount}</span>
            </Button>
          </ActionHint>
        ) : null}
      </div>
      {filtersOpen ? (
        <RegionFilters id="region-filters" country={country} countries={countries} region={region} regions={regions}
          onCountryChange={onCountryChange} onRegionChange={onRegionChange} />
      ) : null}
    </div>
  )
}

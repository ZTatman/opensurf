import { Button, Label, ListBox, Select, ToggleButton } from '@heroui/react'
import { SlidersHorizontal, Star, Video } from 'lucide-react'
import { useState } from 'react'
import ActionHint from './ActionHint'
import BeachSearch from './BeachSearch'
import type { Place } from './places'

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

  return (
    <div className="min-w-0 flex-1 basis-full sm:basis-0">
      <div className="flex items-center gap-2">
        <BeachSearch query={query} onQueryChange={onQueryChange} onPlace={onPlace} onWatch={onWatch} hasSelectedPlace={hasSelectedPlace} />
        <ActionHint label="Show favorites">
          <ToggleButton className="favorites-filter size-11 min-w-11" variant="ghost" isIconOnly
            isSelected={favoritesOnly} onChange={onFavoritesChange} aria-label="Show favorites">
            <Star size={20} fill={favoritesOnly ? 'currentColor' : 'none'} aria-hidden="true" />
          </ToggleButton>
        </ActionHint>
        <ActionHint label="Filter by region">
          <Button className={`size-11 min-w-11 ${country || region || filtersOpen ? 'text-accent' : ''}`}
            variant="ghost" isIconOnly aria-label="Filter by region"
            aria-expanded={filtersOpen} aria-controls="region-filters"
            onPress={() => setFiltersOpen(open => !open)}>
            <SlidersHorizontal size={20} aria-hidden="true" />
          </Button>
        </ActionHint>
        {selectedCount > 0 ? (
          <ActionHint label={`View ${selectedCount} selected ${selectedCount === 1 ? 'camera' : 'cameras'}`}>
            <Button className="h-11 min-w-14 gap-2" variant="secondary" onPress={onRevealPlayers}
              aria-label={`View ${selectedCount} selected ${selectedCount === 1 ? 'camera' : 'cameras'}`}>
              <Video size={18} aria-hidden="true" /><span>{selectedCount}</span>
            </Button>
          </ActionHint>
        ) : null}
      </div>
      {filtersOpen ? (
        <div id="region-filters" className="grid gap-3 pt-3 sm:grid-cols-2">
          <Select className="w-full sm:max-w-64" value={country || 'all'}
            onChange={value => onCountryChange(value === 'all' || value === null ? '' : String(value))}>
            <Label>Country</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue="All countries">All countries<ListBox.ItemIndicator /></ListBox.Item>
                {countries.map(value => (
                  <ListBox.Item key={value} id={value} textValue={value}>{value}<ListBox.ItemIndicator /></ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Select className="w-full sm:max-w-64" value={region || 'all'}
            onChange={value => onRegionChange(value === 'all' || value === null ? '' : String(value))}>
            <Label>Region / state</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover><ListBox>
              <ListBox.Item id="all" textValue="All regions">All regions<ListBox.ItemIndicator /></ListBox.Item>
              {regions.map(value => <ListBox.Item key={value} id={value} textValue={value}>{value}<ListBox.ItemIndicator /></ListBox.Item>)}
            </ListBox></Select.Popover>
          </Select>
        </div>
      ) : null}
    </div>
  )
}

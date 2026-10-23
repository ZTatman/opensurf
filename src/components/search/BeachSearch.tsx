import { ComboBox, Input, Label, ListBox } from '@heroui/react'
import { ExternalLink, MapPin, Search, Video } from 'lucide-react'
import { useState } from 'react'
import { beaches as cameras } from '../../cameras'
import { filterCameras } from '../../lib/search'
import { usePlaceSearch } from '../../hooks/usePlaceSearch'
import type { Place } from '../../services/geocoding'

type Suggestion = { id: string; label: string; detail: string; kind: 'beach' | 'region' | 'place'; external?: boolean; place?: Place }
type Props = {
  query: string
  onQueryChange: (query: string) => void
  onWatch: (id: string) => void
  onPlace: (place: Place) => void
  hasSelectedPlace: boolean
}
const regions = [...new Map(cameras.map(camera => [camera.region, camera.country])).entries()]

export default function BeachSearch({ query, onQueryChange, onWatch, onPlace, hasSelectedPlace }: Props) {
  const [focused, setFocused] = useState(false)
  const [selected, setSelected] = useState<Suggestion | null>(null)
  const search = usePlaceSearch(query, focused && !hasSelectedPlace)
  const term = query.trim().toLocaleLowerCase()
  const candidates: Suggestion[] = term && !hasSelectedPlace ? [
    ...regions.filter(([region, country]) => `${region} ${country}`.toLocaleLowerCase().includes(term)).slice(0, 3)
      .map(([region, country]) => ({ id: `region:${region}`, label: region, detail: country, kind: 'region' as const })),
    ...filterCameras(cameras, { query }).slice(0, 4)
      .map(camera => ({ id: `beach:${camera.id}`, label: camera.name, detail: `${camera.beach}, ${camera.region}${camera.playback === 'external' ? ` · Opens ${camera.sourceName}` : ''}`, external: camera.playback === 'external', kind: 'beach' as const })),
    ...(search?.places ?? []).map(place => ({ id: place.id, label: place.label, detail: 'Find cameras nearby', kind: 'place' as const, place })),
  ] : []
  const matches = selected?.label === query && !candidates.some(item => item.id === selected.id) ? [selected, ...candidates] : candidates

  return (
    <ComboBox className="min-w-0 flex-1" inputValue={query} selectedKey={selected?.label === query ? selected.id : null}
      onInputChange={onQueryChange} items={matches} allowsCustomValue allowsEmptyCollection
      menuTrigger="input" onFocusChange={setFocused}
      onSelectionChange={key => {
        const match = matches.find(item => item.id === key)
        if (!match) return
        setSelected(match)
        onQueryChange(match.label)
        if (match.kind === 'beach') onWatch(match.id.slice(6))
        if (match.place) onPlace(match.place)
      }}>
      <Label className="sr-only">Search beaches, cities or regions</Label>
      <ComboBox.InputGroup className="relative h-11">
        <Input className="h-11 w-full pr-10" placeholder="Beach, city or region…" type="search"
          onKeyDownCapture={event => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            event.stopPropagation()
            event.currentTarget.blur()
          }} />
        <ComboBox.Trigger aria-label="Show beach and place suggestions"><Search size={18} aria-hidden="true" /></ComboBox.Trigger>
      </ComboBox.InputGroup>
      <ComboBox.Popover className="max-h-96 overflow-y-auto">
        <ListBox items={matches} renderEmptyState={() => (
          <p className="px-3 py-4 text-sm text-muted">{term.length < 3 ? 'Type a beach, city or region.' : search?.status === 'loading' || !search ? 'Searching places…' : 'No matching places. Try a nearby city.'}</p>
        )}>
          {item => (
            <ListBox.Item id={item.id} textValue={item.label}>
              {item.external ? <ExternalLink size={17} aria-hidden="true" /> : item.kind === 'beach' ? <Video size={17} aria-hidden="true" /> : <MapPin size={17} aria-hidden="true" />}
              <div className="min-w-0"><Label className="truncate">{item.label}</Label><span className="block text-xs text-muted">{item.detail}</span></div>
            </ListBox.Item>
          )}
        </ListBox>
        {term.length >= 3 && !hasSelectedPlace ? (
          <p className="border-t border-border px-3 py-2 text-xs text-muted" role="status">
            {search?.status === 'error' ? search.error : search?.status === 'ready' ? 'Cities via Open-Meteo · Select a place to find nearby cams.' : 'Looking up cities…'}
          </p>
        ) : null}
      </ComboBox.Popover>
    </ComboBox>
  )
}

import { Button, Link } from '@heroui/react'
import { Check, ExternalLink, Plus, Star } from 'lucide-react'
import { sourceUrl, type Camera } from '../../cameras'
import { formatDistance } from '../../lib/geo'
import { IconToggle } from '../ui/IconButton'

// Shared by every card in a row, so lists pass one object instead of five props.
export type CameraActions = {
  selectedIds: Set<string>
  favoriteIds: Set<string>
  onWatch: (id: string) => void
  onCompare: (id: string) => void
  onSave: (id: string) => void
}

type CameraCardProps = {
  camera: Camera
  distanceKm?: number
  actions: CameraActions
}

export default function CameraCard({ camera, distanceKm, actions }: CameraCardProps) {
  const isSelected = actions.selectedIds.has(camera.id)
  const isSaved = actions.favoriteIds.has(camera.id)
  const saveLabel = `${isSaved ? 'Unsave' : 'Save'} ${camera.name}`
  const compareLabel = `${isSelected ? 'Remove' : 'Add'} ${camera.name} ${isSelected ? 'from' : 'to'} grid`

  const preview = (
    <img src={camera.previewUrl}
      alt={camera.playback === 'external' ? `${camera.name} location photo from ${camera.sourceName}` : `${camera.name} provider preview`}
      loading="lazy" width="640" height="360" />
  )

  return (
    <article className="camera-card min-w-0">
      <div className={`relative rounded-xl ${isSelected ? 'ring-2 ring-accent ring-offset-3 ring-offset-background' : ''}`}>
        {camera.playback === 'external' ? (
          <Link className="camera-preview h-auto w-full overflow-hidden rounded-xl p-0"
            href={sourceUrl(camera)} target="_blank" rel="noopener noreferrer"
            aria-label={`Open ${camera.name} on ${camera.sourceName} (new tab)`}>
            {preview}
          </Link>
        ) : (
          <Button className="camera-preview h-auto w-full overflow-hidden rounded-xl p-0"
            variant="ghost" aria-label={`Watch ${camera.name}`} onPress={() => actions.onWatch(camera.id)}>
            {preview}
          </Button>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <IconToggle label={saveLabel} className="bg-black/55 text-white data-[selected=true]:bg-accent"
            isSelected={isSaved} onChange={() => actions.onSave(camera.id)}>
            <Star size={19} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
          </IconToggle>
          {camera.playback === 'embed' ? (
            <IconToggle label={compareLabel} className="compare-button bg-black/55 text-white data-[selected=true]:bg-accent"
              isSelected={isSelected} onChange={() => actions.onCompare(camera.id)}>
              {isSelected ? <Check size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
            </IconToggle>
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        <h2 className="text-sm font-semibold leading-5">{camera.name}</h2>
        <p className="mt-1 text-xs leading-5 text-muted">{camera.beach} · {camera.region}{distanceKm === undefined ? `, ${camera.country}` : ` · ${formatDistance(distanceKm)} away`}</p>
        {camera.playback === 'external' ? (
          <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-muted">
            <ExternalLink className="mt-1 shrink-0" size={12} aria-hidden="true" />
            <span>{camera.availabilityNote ? `${camera.availabilityNote} · ${camera.sourceName}` : `Watch on ${camera.sourceName}`}</span>
          </p>
        ) : null}
      </div>
    </article>
  )
}

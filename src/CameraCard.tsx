import { Button, Link, ToggleButton } from '@heroui/react'
import { Check, ExternalLink, Plus, Star } from 'lucide-react'
import { sourceUrl, type Camera } from './cameras'
import { formatDistance } from './model'
import ActionHint from './ActionHint'

type CameraCardProps = {
  camera: Camera
  distanceKm?: number
  isSelected: boolean
  isSaved: boolean
  onWatch: () => void
  onCompare: () => void
  onSave: () => void
}

export default function CameraCard({
  camera,
  distanceKm,
  isSelected,
  isSaved,
  onWatch,
  onCompare,
  onSave,
}: CameraCardProps) {
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
            variant="ghost" aria-label={`Watch ${camera.name}`} onPress={onWatch}>
            {preview}
          </Button>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <ActionHint label={saveLabel}>
            <ToggleButton
              className="size-11 min-w-11 bg-black/55 text-white data-[selected=true]:bg-accent"
              variant="ghost"
              isIconOnly
              isSelected={isSaved}
              onChange={onSave}
              aria-label={saveLabel}
            >
              <Star size={19} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            </ToggleButton>
          </ActionHint>
          {camera.playback === 'embed' ? <ActionHint label={compareLabel}>
            <ToggleButton
              className="compare-button size-11 min-w-11 bg-black/55 text-white data-[selected=true]:bg-accent"
              variant="ghost"
              isIconOnly
              isSelected={isSelected}
              onChange={onCompare}
              aria-label={compareLabel}
            >
              {isSelected ? <Check size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
            </ToggleButton>
          </ActionHint> : null}
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

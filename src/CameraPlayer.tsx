import { Button, Link } from '@heroui/react'
import { ExternalLink, RotateCw, X } from 'lucide-react'
import { useState } from 'react'
import { embedUrl, sourceUrl, type EmbeddedCamera } from './cameras'
import ActionHint from './ActionHint'

type CameraPlayerProps = {
  camera: EmbeddedCamera
  onRemove: () => void
}

export default function CameraPlayer({ camera, onRemove }: CameraPlayerProps) {
  const [reload, setReload] = useState(0)

  return (
    <article className="player-card min-w-0">
      <div className="player-heading mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{camera.name}</h2>
          <p className="mt-1 text-xs text-muted">{camera.region}, {camera.country}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <ActionHint label={`Reload ${camera.name}`}>
            <Button className="size-11 min-w-11" variant="ghost" isIconOnly
              onPress={() => setReload(value => value + 1)} aria-label={`Reload ${camera.name}`}>
              <RotateCw size={18} aria-hidden="true" />
            </Button>
          </ActionHint>
          <ActionHint label={`Open original ${camera.name} camera`}>
            <Link className="flex size-11 items-center justify-center rounded-full"
              href={sourceUrl(camera)} target="_blank" rel="noopener noreferrer"
              aria-label={`Open original ${camera.name} camera`}>
              <ExternalLink size={18} aria-hidden="true" />
            </Link>
          </ActionHint>
          <ActionHint label={`Remove ${camera.name}`}>
            <Button className="size-11 min-w-11" variant="ghost" isIconOnly
              onPress={onRemove} aria-label={`Remove ${camera.name}`}>
              <X size={20} aria-hidden="true" />
            </Button>
          </ActionHint>
        </div>
      </div>
      <div className="camera-frame overflow-hidden rounded-xl">
        <iframe
          key={reload}
          src={embedUrl(camera)}
          title={`${camera.name} public camera`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <Link className="mt-2 text-xs text-muted" href={sourceUrl(camera)} target="_blank" rel="noopener noreferrer">
        Powered by {camera.sourceName}
      </Link>
    </article>
  )
}

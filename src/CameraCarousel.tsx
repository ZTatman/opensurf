import { Button } from '@heroui/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Camera } from './cameras'
import ActionHint from './ActionHint'
import CameraCard from './CameraCard'

type Props = {
  title: string
  description: string
  entries: { camera: Camera; distanceKm?: number }[]
  selectedIds: Set<string>
  favoriteIds: Set<string>
  onWatch: (id: string) => void
  onCompare: (id: string) => void
  onSave: (id: string) => void
  empty: ReactNode
  action?: ReactNode
  status?: string
}

export default function CameraCarousel({ title, description, entries, selectedIds, favoriteIds, onWatch, onCompare, onSave, empty, action, status }: Props) {
  const headingId = useId()
  const trackId = useId()
  const track = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ previous: false, next: false })
  const syncEdges = useCallback(() => {
    const node = track.current
    if (!node) return
    const previous = node.scrollLeft > 2
    const next = node.scrollLeft + node.clientWidth < node.scrollWidth - 2
    setEdges(current => current.previous === previous && current.next === next ? current : { previous, next })
  }, [])

  useEffect(() => {
    const node = track.current
    if (!node) return
    const observer = new ResizeObserver(syncEdges)
    observer.observe(node)
    return () => observer.disconnect()
  }, [syncEdges, entries.length])

  function move(direction: number) {
    const node = track.current
    if (!node) return
    node.scrollBy({
      left: direction * node.clientWidth * 0.85,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }

  return (
    <section className="min-w-0" aria-labelledby={headingId}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <h2 id={headingId} className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted" role="status">{description}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {action}
          {entries.length > 1 ? <>
            <ActionHint label={`Previous ${title.toLocaleLowerCase()} beaches`}>
              <Button className="size-11 min-w-11" variant="ghost" isIconOnly isDisabled={!edges.previous}
                aria-label={`Previous ${title.toLocaleLowerCase()} beaches`} aria-controls={trackId} onPress={() => move(-1)}>
                <ChevronLeft size={20} aria-hidden="true" />
              </Button>
            </ActionHint>
            <ActionHint label={`Next ${title.toLocaleLowerCase()} beaches`}>
              <Button className="size-11 min-w-11" variant="ghost" isIconOnly isDisabled={!edges.next}
                aria-label={`Next ${title.toLocaleLowerCase()} beaches`} aria-controls={trackId} onPress={() => move(1)}>
                <ChevronRight size={20} aria-hidden="true" />
              </Button>
            </ActionHint>
          </> : null}
        </div>
      </div>
      {status ? <p className="mb-4 text-sm text-muted" role="status">{status}</p> : null}
      {entries.length ? (
        <div id={trackId} ref={track} className="beach-carousel" tabIndex={0}
          role="region" aria-roledescription="carousel" aria-label={`${title} beaches`}
          onScroll={syncEdges} onKeyDown={event => {
            if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
            event.preventDefault()
            move(event.key === 'ArrowRight' ? 1 : -1)
          }}>
          {entries.map(({ camera, distanceKm }) => (
            <CameraCard key={camera.id} camera={camera} distanceKm={distanceKm}
              isSelected={selectedIds.has(camera.id)} isSaved={favoriteIds.has(camera.id)}
              onWatch={() => onWatch(camera.id)} onCompare={() => onCompare(camera.id)} onSave={() => onSave(camera.id)} />
          ))}
        </div>
      ) : <div className="py-5 text-sm text-muted">{empty}</div>}
    </section>
  )
}

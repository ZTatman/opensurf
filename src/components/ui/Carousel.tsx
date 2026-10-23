import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconButton } from './IconButton'
import { scrollBehavior } from '../../lib/motion'

type CarouselProps = {
  title: string
  description: string
  // Accessible name for the track, such as "Explore beaches".
  label: string
  children: ReactNode
  empty: ReactNode
  action?: ReactNode
  status?: string
}

// A horizontally scrolling row that never auto-advances. Each child is one snap item.
export default function Carousel({ title, description, label, children, empty, action, status }: CarouselProps) {
  const headingId = useId()
  const trackId = useId()
  const track = useRef<HTMLDivElement>(null)
  const items = Children.toArray(children)
  const count = items.length
  const itemKeys = items.map(item => isValidElement(item) ? item.key : '').join('|')
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
  }, [syncEdges, count])

  // Return to the first item whenever the set of items changes, such as after a filter or range change.
  useEffect(() => {
    track.current?.scrollTo({ left: 0 })
  }, [itemKeys])

  function move(direction: number) {
    const node = track.current
    if (!node) return
    node.scrollBy({
      left: direction * node.clientWidth * 0.85,
      behavior: scrollBehavior(),
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
          {count > 1 ? <>
            <IconButton label={`Previous ${label.toLocaleLowerCase()}`} isDisabled={!edges.previous}
              aria-controls={trackId} onPress={() => move(-1)}>
              <ChevronLeft size={20} aria-hidden="true" />
            </IconButton>
            <IconButton label={`Next ${label.toLocaleLowerCase()}`} isDisabled={!edges.next}
              aria-controls={trackId} onPress={() => move(1)}>
              <ChevronRight size={20} aria-hidden="true" />
            </IconButton>
          </> : null}
        </div>
      </div>
      {status ? <p className="mb-4 text-sm text-muted" role="status">{status}</p> : null}
      {count ? (
        <div id={trackId} ref={track} className="carousel-track" tabIndex={0}
          role="region" aria-roledescription="carousel" aria-label={label}
          onScroll={syncEdges} onKeyDown={event => {
            if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
            event.preventDefault()
            move(event.key === 'ArrowRight' ? 1 : -1)
          }}>
          {children}
        </div>
      ) : <div className="py-5 text-sm text-muted">{empty}</div>}
    </section>
  )
}

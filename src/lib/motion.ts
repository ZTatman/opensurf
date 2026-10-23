// Programmatic scrolling jumps instead of animating when the user prefers reduced motion.
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
}

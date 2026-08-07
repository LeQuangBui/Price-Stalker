import { useEffect, useRef } from 'react'

/**
 * Reveal-on-scroll. Attach the returned ref to an element; it gets `data-reveal`
 * (hidden by default per index.css) and `.is-visible` once it scrolls into view.
 * Reduced-motion users see it immediately (CSS short-circuits the transition).
 * Falls back to visible when IntersectionObserver is unavailable (e.g. jsdom).
 */
export function useReveal({ threshold = 0.12, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.setAttribute('data-reveal', '')
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin])
  return ref
}

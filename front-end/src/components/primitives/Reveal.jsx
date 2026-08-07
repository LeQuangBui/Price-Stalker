import { useReveal } from '../../hooks/useReveal'

/**
 * Reveal-on-scroll wrapper. `delay` (ms) staggers siblings. Reduced-motion users
 * see content immediately (the CSS short-circuits — see index.css [data-reveal]).
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className, style, children, ...rest }) {
  const ref = useReveal()
  return (
    <Tag
      ref={ref}
      className={className}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}

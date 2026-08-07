import Kicker from '../primitives/Kicker'
import Reveal from '../primitives/Reveal'

/**
 * Shared editorial shell for the auth screens: centered column, eyebrow kicker,
 * serif title, optional subtitle, the form, and a footer slot. Keeps all four
 * auth pages visually identical.
 */
export default function AuthLayout({ kicker, title, subtitle, children, footer }) {
  return (
    <div className="mx-auto flex min-h-[68vh] max-w-md flex-col justify-center px-6 py-12">
      <Reveal>
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-4 font-display text-display-sm font-semibold leading-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-3 text-ink-soft">{subtitle}</p> : null}
      </Reveal>
      <Reveal delay={100} className="mt-8">
        {children}
      </Reveal>
      {footer ? <p className="mt-6 text-sm text-ink-soft">{footer}</p> : null}
    </div>
  )
}

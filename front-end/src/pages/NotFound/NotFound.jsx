import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <Kicker className="justify-center">Error 404</Kicker>
      <h1 className="mt-4 font-display text-display font-semibold text-ink">Page not found</h1>
      <p className="mt-4 text-ink-soft">
        The page you were looking for has dropped off the radar.
      </p>
      <AppLink to="/" className="btn btn-primary btn-lg mt-8 inline-flex">
        Back to tracking
      </AppLink>
    </div>
  )
}

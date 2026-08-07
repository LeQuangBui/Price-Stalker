import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'
import Reveal from '../../components/primitives/Reveal'

const STEPS = [
  {
    n: '01',
    title: 'Paste a link',
    body: 'Drop in any product URL from hacom, GearVN, or Phong Vũ. We read the page and start tracking its price.',
  },
  {
    n: '02',
    title: 'Set your number',
    body: 'Tell us the price you would actually pay. That threshold is the only thing you have to decide.',
  },
  {
    n: '03',
    title: 'Get the alert',
    body: 'The moment the price falls to your number, a notification lands — email or web push. No app to babysit.',
  },
]

export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      {/* Poster hero */}
      <section className="border-b border-line py-20 sm:py-28">
        <Reveal>
          <Kicker>Vietnam · PC &amp; tech price intelligence</Kicker>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-6 font-display text-display-xl font-semibold leading-[0.96] tracking-tight text-ink">
            Stop watching prices.
            <br />
            Let the desk <em className="italic text-oxblood">watch</em> them.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft">
            Price Stalker follows any product you care about and pings you the instant it drops
            below the price you set. Track once, then get on with your day.
          </p>
        </Reveal>
        <Reveal delay={240} className="mt-9 flex flex-wrap gap-3">
          <AppLink to="/signup" className="btn btn-primary btn-lg">Create your watchlist</AppLink>
          <AppLink to="/browse" className="btn btn-secondary btn-lg">Browse products</AppLink>
        </Reveal>
        <Reveal delay={320}>
          <p className="mt-5 font-meta text-xs uppercase tracking-[0.16em] text-ink-mute">
            Free to start · no card required
          </p>
        </Reveal>
      </section>

      {/* Editorial three-step */}
      <section className="py-20" aria-label="How it works">
        <Reveal>
          <h2 className="font-display text-display-sm font-semibold text-ink">
            Three steps, then silence until it matters.
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 90} className="border-t-2 border-ink pt-5">
              <span className="font-display text-5xl font-semibold tabular-nums text-oxblood" aria-hidden="true">
                {step.n}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-ink-soft">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Closer */}
      <section className="border-t border-line py-24 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-display text-display font-semibold leading-tight text-ink">
            The next price drop is yours to catch.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <AppLink to="/signup" className="btn btn-primary btn-lg mt-9 inline-flex">Start tracking</AppLink>
        </Reveal>
      </section>
    </div>
  )
}

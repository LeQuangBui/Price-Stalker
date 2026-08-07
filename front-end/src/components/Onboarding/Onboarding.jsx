import Kicker from '../primitives/Kicker'

const STEPS = [
  { n: '01', title: 'Paste a link', body: 'Drop a product URL in the bar above.' },
  { n: '02', title: 'Set your number', body: 'Tell us the price you would actually pay.' },
  { n: '03', title: 'Get the alert', body: 'We ping you the moment it drops there.' },
]

/**
 * First-run guide, shown on Home when a signed-in user is tracking nothing yet
 * (state derived from data — no backend "has onboarded" flag). Points at the
 * paste-URL bar above it.
 */
export default function Onboarding() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center sm:p-12">
      <Kicker className="flex justify-center">First run</Kicker>
      <h3 className="mt-4 font-display text-display-sm font-semibold text-ink">Track your first product</h3>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        Paste a product link in the bar above. We start watching its price and notify you the moment
        it drops below your target.
      </p>
      <ol className="mx-auto mt-9 grid max-w-2xl gap-6 text-left sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="border-t-2 border-ink pt-4">
            <span className="font-display text-3xl font-semibold tabular-nums text-oxblood" aria-hidden="true">
              {step.n}
            </span>
            <h4 className="mt-2 font-display text-lg font-semibold text-ink">{step.title}</h4>
            <p className="mt-1 text-sm text-ink-soft">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

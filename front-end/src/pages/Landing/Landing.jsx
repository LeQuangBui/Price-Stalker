import { Link } from 'react-router-dom'
import './Landing.css'

const STEPS = [
  {
    n: '01',
    title: 'Paste a link',
    body: 'Drop in any product URL. We read the page and start tracking its price for you.'
  },
  {
    n: '02',
    title: 'Set your number',
    body: 'Tell us the price you would actually pay. That threshold is the only thing you have to decide.'
  },
  {
    n: '03',
    title: 'Get the alert',
    body: 'The moment the price falls to your number, an email lands in your inbox. No app to check.'
  }
]

export default function Landing() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1 className="landing-title">
            Stop watching prices.<br />
            Let the desk watch them.
          </h1>
          <p className="landing-lede">
            Price Stalker follows any product you care about and emails you the instant it
            drops below the price you set. Track once, then get on with your day.
          </p>
          <div className="landing-actions">
            <Link to="/signup" className="btn btn-primary btn-lg">Create your watchlist</Link>
            <Link to="/browse" className="btn btn-secondary btn-lg">Browse products</Link>
          </div>
          <p className="landing-note">Free to start. No card required.</p>
        </div>
      </section>

      <hr className="landing-rule" />

      <section className="landing-steps" aria-label="How it works">
        <h2 className="landing-steps-title">Three steps, then silence until it matters.</h2>
        <ol className="landing-steps-list">
          {STEPS.map((step) => (
            <li key={step.n} className="landing-step">
              <span className="landing-step-num" aria-hidden="true">{step.n}</span>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-closer">
        <h2 className="landing-closer-title">The next price drop is yours to catch.</h2>
        <Link to="/signup" className="btn btn-primary btn-lg">Start tracking</Link>
      </section>
    </div>
  )
}

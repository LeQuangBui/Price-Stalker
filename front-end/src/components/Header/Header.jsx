import AppLink from '../AppLink'
import NotificationBell from '../NotificationBell/NotificationBell'

// py-3 not py-2: text-sm is a 20px line box, so py-2 yields a 36px target. These links render
// from md up, which includes iPad portrait and other touch devices, so they need the full 44px.
const LINK = 'rounded-lg px-3 py-3 text-sm font-bold text-ink-soft transition-colors hover:bg-tertiary hover:text-oxblood'

export default function Header({ isSignedIn, theme, onToggleTheme }) {
  return (
    // z-50, not z-40: Home's `.search-layer` is `position: relative; z-index: 40` (Home.jsx:69)
    // and sits in the root stacking context, so at z-40 this sticky header lost the DOM-order tie
    // to it and the search card slid over the header on scroll. z-50 clears it. This also lifts
    // the header's stacking context above TabBar (z-40), which is what keeps NotificationBell's
    // z-50 dropdown — trapped inside this header — painting over the bar. CommandPalette is also
    // z-50 but renders after the header in RootLayout, so it still wins on DOM order and the
    // palette is not trapped behind the header. `.search-layer`'s 40 is load-bearing for all of
    // this; it has now caused two bugs. Do not treat these numbers as arbitrary.
    <header
      className="sticky top-4 z-50 mb-7 flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3 sm:px-5"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      {/* `transition`, not `transition-colors`: the hover lift is a transform, and
          transition-colors would snap it instantly. Same on the theme toggle below. */}
      <AppLink to="/" className="flex items-center gap-3 text-ink no-underline transition hover:-translate-y-px hover:text-oxblood">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-oxblood font-display text-xl font-bold text-white"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          P
        </span>
        <div>
          {/* A <p>, not an <h1>: the brand is chrome, and a heading here gave every page in the
              app two h1s — this one plus the page's own. The link already names it for a screen
              reader; the page keeps the one true h1. */}
          <p className="m-0 font-display text-[22px] font-extrabold leading-[1.05] text-ink">
            Price<span className="text-oxblood">Stalker</span>
          </p>
          <span className="hidden font-meta text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-mute sm:block">
            Track smarter
          </span>
        </div>
      </AppLink>

      <div className="flex items-center gap-2">
        {isSignedIn ? <NotificationBell /> : null}

        {/* Same label as TabBar deliberately. They are exact complements — this is `hidden md:flex`,
            TabBar is `md:hidden` — and `display: none` removes an element from the accessibility
            tree, so the two are never exposed at once. They are one navigation region rendered two
            ways, and naming the desktop one "Secondary" would imply a Primary that isn't there. */}
        <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <>
              <AppLink to="/profile" className={LINK}>Profile</AppLink>
              <AppLink to="/alerts" className={LINK}>Alerts</AppLink>
              <AppLink to="/bookmarks" className={LINK}>Bookmarks</AppLink>
            </>
          ) : (
            <>
              <AppLink to="/login" className={LINK}>Login</AppLink>
              <AppLink to="/signup" className={LINK}>Sign Up</AppLink>
            </>
          )}
        </nav>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-paper text-ink transition hover:-translate-y-px hover:border-oxblood hover:bg-tertiary"
          style={{ boxShadow: 'var(--shadow-sm)' }}
          onClick={onToggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span aria-hidden="true">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </header>
  )
}

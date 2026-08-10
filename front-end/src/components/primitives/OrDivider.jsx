import { cx } from '../../lib/cx'

// A centred label with a hairline rule running out to each side. Lifted from Bookmarks.css's
// `.or-divider`, which is the one rule in that file that does not translate cleanly to utilities:
// the rules have to fill whatever space the label leaves, which only a flexed pseudo-element does,
// and they have to stay symmetrical. Written once here rather than as eight before:/after:
// utilities repeated per call site, where writing one half and not the other is silent.
export default function OrDivider({ children, className }) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 text-xs font-bold uppercase text-ink-mute',
        'before:h-px before:flex-1 before:bg-line before:content-[""]',
        'after:h-px after:flex-1 after:bg-line after:content-[""]',
        className
      )}
    >
      <span>{children}</span>
    </div>
  )
}

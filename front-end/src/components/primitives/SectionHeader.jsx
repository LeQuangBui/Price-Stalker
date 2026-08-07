import { cx } from '../../lib/cx'

// Poster section divider: heavy 2px rule, serif title, optional mono meta.
export default function SectionHeader({ title, meta, className }) {
  return (
    <div className={cx('mb-6 flex items-baseline justify-between gap-4 border-b-2 border-ink pb-3', className)}>
      <h2 className="font-display text-display-sm font-semibold text-ink">{title}</h2>
      {meta ? (
        <span className="whitespace-nowrap font-meta text-xs uppercase tracking-[0.12em] text-ink-mute">
          {meta}
        </span>
      ) : null}
    </div>
  )
}

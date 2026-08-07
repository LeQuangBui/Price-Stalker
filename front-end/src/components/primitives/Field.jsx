import { cx } from '../../lib/cx'

// Labeled text input in the editorial style (mono label, token-themed input).
export default function Field({ id, label, hint, className, ...props }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="font-meta text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute"
      >
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-oxblood focus:ring-2 focus:ring-oxblood/20"
        {...props}
      />
      {hint ? <p className="text-xs text-ink-mute">{hint}</p> : null}
    </div>
  )
}

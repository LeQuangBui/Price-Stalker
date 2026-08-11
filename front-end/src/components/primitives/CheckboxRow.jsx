import { cx } from '../../lib/cx'

// A native checkbox and its label as one control, at the 44px touch floor.
//
// Lifted from two hand-rolled copies of the same thing: `.alert-checkbox` (Alerts.css:104,
// min-height 42px) and `.checkbox-row` (ProductDetail.css:259, no height at all — measured
// 190 x 25.59). Both wrap a bare 13x13 native checkbox, both declare the same colour and weight,
// and both were under the floor at two different heights. Built once, in the commit that retires
// the first of the two, so the second cannot copy inline utilities and diverge again.
//
// The floor lives on the LABEL, not on the box. A label wrapping a checkbox IS the checkbox's
// target — clicking the word toggles it — so 44px of label is 44px of target. Resizing the native
// control needs `appearance: none` and a hand-drawn tick, which is a component rather than a slice,
// and it would cost the platform focus ring: index.css:252-257 scopes :focus-visible to a, button
// and [role="button"], so a bare input has nothing else.
//
// Everything except checked/onChange/children lands on the label, which is what carries Alerts'
// `title` tooltip.
export default function CheckboxRow({ checked, onChange, children, className, ...props }) {
  return (
    <label
      className={cx(
        'inline-flex min-h-11 cursor-pointer items-center gap-2 font-medium text-ink',
        className,
      )}
      {...props}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="shrink-0 cursor-pointer"
      />
      {children}
    </label>
  )
}

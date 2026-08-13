// The gallery drag's arithmetic: what the track shows while a finger holds it, and which slide a
// release settles on. Pure and layout-free, the way scrub.js owns the chart's geometry — the
// component feeds it the delta, the timing samples and the frame's rendered width, and jsdom can
// sweep every decision without a layout.
//
// Deltas are px, rightward positive — the raw clientX travel since pointerdown. A negative delta
// pushes the deck left and asks for the NEXT slide.

// A drag commits once it crosses a fifth of the frame's rendered width. A fraction rather than a
// px constant because the same gesture has to feel the same on a 342px phone frame and a 480px
// desktop one.
export const SETTLE_FRACTION = 0.2

// px/ms at the lift past which a flick commits on its own. ~0.5 is the conventional carousel
// line: a deliberate push crosses it comfortably, a hesitant drift does not.
export const FLICK_VELOCITY = 0.5

// How far back from the lift the velocity reads, in ms. The release is the flick — a slow drag
// that ends in a push must not have the push averaged away by its own history.
export const FLICK_WINDOW = 100

// The divisor past either end. The arrows wrap by modulo; a drag does not, and a third of the
// finger's travel is the standard rubber-band that says "this is the end" without going dead.
export const EDGE_RESISTANCE = 3

/**
 * The offset the track shows for a raw finger delta. Inside the deck it is the delta itself;
 * where the drag is pulling past the deck's end — rightward on the first slide, leftward on the
 * last — the whole offset is divided, and the settle later snaps it back.
 */
export function dragOffset(delta, slide, count) {
  const past = (delta > 0 && slide === 0) || (delta < 0 && slide === count - 1)
  return past ? delta / EDGE_RESISTANCE : delta
}

/**
 * The finger's speed at the lift, in px/ms, read from the recorded moves — each `{ x, t }`, in
 * event order — but only those inside FLICK_WINDOW of the last one. Zero when there are not two
 * samples in the window or they share a timestamp; never NaN.
 */
export function releaseVelocity(samples) {
  if (samples.length < 2) return 0
  const last = samples[samples.length - 1]
  let first = last
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > FLICK_WINDOW) break
    first = samples[i]
  }
  const elapsed = last.t - first.t
  return elapsed > 0 ? (last.x - first.x) / elapsed : 0
}

/**
 * The slide a release settles on. The delta names the direction; the gesture commits strictly
 * past SETTLE_FRACTION of the width, or on a flick strictly past FLICK_VELOCITY that agrees with
 * that direction — a lift while moving back the other way is a change of mind, not a commit.
 * Never a wrap: where the direction has no slide, the answer is the slide it started on, which
 * is what snaps the rubber-band home.
 */
export function settleSlide(delta, velocity, slide, count, width) {
  if (delta === 0) return slide
  const target = slide + (delta < 0 ? 1 : -1)
  if (target < 0 || target > count - 1) return slide
  const past = Math.abs(delta) > width * SETTLE_FRACTION
  const flung = Math.abs(velocity) > FLICK_VELOCITY && velocity * delta > 0
  return past || flung ? target : slide
}

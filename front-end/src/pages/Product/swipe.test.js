import { describe, expect, it } from 'vitest'
import {
  EDGE_RESISTANCE,
  FLICK_VELOCITY,
  FLICK_WINDOW,
  SETTLE_FRACTION,
  dragOffset,
  releaseVelocity,
  settleSlide
} from './swipe'

// The gallery frame at the 390px reference viewport: the page keeps px-6 either side, so the
// aspect-square frame renders 342 wide. The 20% commit line is therefore 68.4px.
const WIDTH = 342
const LINE = WIDTH * SETTLE_FRACTION

describe('drag offset', () => {
  it('follows the finger exactly while there is a slide to reveal', () => {
    expect(dragOffset(-120, 0, 3)).toBe(-120)
    expect(dragOffset(-120, 1, 3)).toBe(-120)
    expect(dragOffset(120, 1, 3)).toBe(120)
    expect(dragOffset(120, 2, 3)).toBe(120)
  })

  it('divides the offset past either end instead of revealing a wrap', () => {
    // Rightward at the first slide and leftward at the last: there is nothing beyond, so the
    // track gives a third of the finger's travel — enough to move, obviously resisted.
    expect(dragOffset(120, 0, 3)).toBe(120 / EDGE_RESISTANCE)
    expect(dragOffset(-120, 2, 3)).toBe(-120 / EDGE_RESISTANCE)
  })

  it('resists both directions when there is only one slide', () => {
    expect(dragOffset(90, 0, 1)).toBe(90 / EDGE_RESISTANCE)
    expect(dragOffset(-90, 0, 1)).toBe(-90 / EDGE_RESISTANCE)
  })

  it('leaves a zero delta alone', () => {
    expect(dragOffset(0, 0, 3)).toBe(0)
  })
})

describe('release velocity', () => {
  it('reads px/ms across the recorded moves', () => {
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: -100, t: 100 }])).toBe(-1)
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 50, t: 100 }])).toBe(0.5)
  })

  it('measures only the moves inside the flick window', () => {
    // A slow half-second drag that ends in a fast push: the stale early samples would average
    // the flick away (-100px over 280ms is -0.36, under the commit line), and the window is
    // what keeps the release reading the release.
    const samples = [
      { x: 0, t: 0 },
      { x: 0, t: 200 },
      { x: -100, t: 280 }
    ]
    expect(releaseVelocity(samples)).toBe(-100 / 80)
  })

  it('answers zero when there is nothing to measure', () => {
    expect(releaseVelocity([])).toBe(0)
    expect(releaseVelocity([{ x: 40, t: 10 }])).toBe(0)
    // Two samples on the same timestamp: no time base, and 0/0 must not leak out as NaN.
    expect(releaseVelocity([{ x: 0, t: 5 }, { x: 30, t: 5 }])).toBe(0)
  })

  it('exposes the window it measures in', () => {
    expect(FLICK_WINDOW).toBeGreaterThan(0)
  })
})

describe('settle', () => {
  it('advances one slide past a fifth of the frame, either direction', () => {
    expect(settleSlide(-(LINE + 1), 0, 0, 3, WIDTH)).toBe(1)
    expect(settleSlide(LINE + 1, 0, 1, 3, WIDTH)).toBe(0)
  })

  it('snaps a short drag back to the slide it started on', () => {
    expect(settleSlide(-20, 0, 0, 3, WIDTH)).toBe(0)
    expect(settleSlide(20, 0, 1, 3, WIDTH)).toBe(1)
  })

  it('holds at exactly the line — the commit is strictly past it', () => {
    expect(settleSlide(-LINE, 0, 0, 3, WIDTH)).toBe(0)
    expect(settleSlide(-FLICK_VELOCITY * 40, -FLICK_VELOCITY, 0, 3, WIDTH)).toBe(0)
  })

  it('lets a flick commit a drag the distance alone would return', () => {
    // 50px is under the 68.4px line; 0.6 px/ms is over the flick line.
    expect(settleSlide(-50, -0.6, 0, 3, WIDTH)).toBe(1)
    expect(settleSlide(50, 0.6, 2, 3, WIDTH)).toBe(1)
  })

  it('ignores a flick that points against the drag', () => {
    // The finger travelled left but was moving right at the lift — a change of mind, not a
    // commit in either direction.
    expect(settleSlide(-50, 0.9, 0, 3, WIDTH)).toBe(0)
    expect(settleSlide(50, -0.9, 2, 3, WIDTH)).toBe(2)
  })

  it('never wraps: past either end every gesture settles back', () => {
    expect(settleSlide(200, 2, 0, 3, WIDTH)).toBe(0)
    expect(settleSlide(-200, -2, 2, 3, WIDTH)).toBe(2)
  })

  it('treats a motionless release as nothing', () => {
    expect(settleSlide(0, 0, 1, 3, WIDTH)).toBe(1)
  })
})

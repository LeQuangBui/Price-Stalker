// The frame, the arrows and the dot rail. The occlusion checks are the point of the file: a 44px
// box that measures perfectly and cannot be tapped looks identical to a correct one.
//
// Two things this probe learned the hard way in the 2b-iii gallery sweep, both of which it now
// records rather than silently folding into a number:
//
//  1. `elementFromPoint` returns null for a coordinate outside the viewport, and `el.contains(null)`
//     is false — so a control below the fold reads as 100% stolen. At 1280px/root 24 the frame is
//     1136px square in a 900px window, which put the whole rail at y 1209-1275 and reported every
//     dot as fully occluded when nothing was over any of them. Off-viewport samples are counted
//     separately now, and `sampled` says how many pixels the verdict actually rests on.
//  2. A stolen pixel is not one fact. A neighbouring DOT taking it is the overlap bug this rebuild
//     exists to remove; an ARROW taking it is the deliberate trade that keeps the arrows tappable
//     on a frame too small for both. `stolenBy` names the thief so the two cannot be confused.
function () {
  var vh = document.documentElement.clientHeight
  var vw = document.documentElement.clientWidth
  var frame = document.querySelector('[aria-label="Next image"]').parentElement
  var dots = [].slice.call(document.querySelectorAll('[aria-label^="Go to image"]'))
  var arrowEls = ['Previous image', 'Next image'].map(function (name) {
    return document.querySelector('[aria-label="' + name + '"]')
  })

  // What took this pixel, in the vocabulary that matters: itself, a sibling dot, an arrow, nothing
  // (off-viewport), or some other element entirely.
  var thief = function (own, x, y) {
    if (x < 0 || y < 0 || x >= vw || y >= vh) return 'offscreen'
    var hit = document.elementFromPoint(x, y)
    if (!hit) return 'offscreen'
    if (own.contains(hit)) return null
    for (var i = 0; i < arrowEls.length; i++) if (arrowEls[i].contains(hit)) return 'arrow'
    for (var j = 0; j < dots.length; j++) if (dots[j].contains(hit)) return 'dot'
    return 'other'
  }

  // Sweep a box at its vertical centre in 1px steps. `stolenPx` counts only pixels a real element
  // took; `offscreenPx` is the part of the box the window could not be asked about.
  var sweep = function (el) {
    var r = el.getBoundingClientRect()
    var y = Math.round(r.top + r.height / 2)
    var out = { stolenPx: 0, offscreenPx: 0, sampled: 0, stolenBy: [] }
    for (var x = Math.ceil(r.left); x < Math.floor(r.right); x++) {
      var who = thief(el, x, y)
      out.sampled++
      if (who === 'offscreen') { out.offscreenPx++; out.sampled-- } else if (who) {
        out.stolenPx++
        if (out.stolenBy.indexOf(who) === -1) out.stolenBy.push(who)
      }
    }
    return out
  }

  var arrows = arrowEls.map(function (el) {
    var r = el.getBoundingClientRect()
    var cx = r.left + r.width / 2
    var cy = r.top + r.height / 2
    var swept = sweep(el)
    return {
      name: el.getAttribute('aria-label'),
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100,
      // The rail is a full-bleed transparent band later in DOM order at z-index auto; without
      // pointer-events-none on it this returns the rail. Its DOTS are opaque and stay opaque, so
      // this also returns a dot unless the arrows are written after the rail in tree order.
      ownsItsCentre: cx >= 0 && cy >= 0 && cx < vw && cy < vh
        && el.contains(document.elementFromPoint(cx, cy)),
      centreInViewport: cx >= 0 && cy >= 0 && cx < vw && cy < vh,
      stolenPx: swept.stolenPx,
      offscreenPx: swept.offscreenPx,
      sampled: swept.sampled,
      stolenBy: swept.stolenBy.join(',')
    }
  })

  // Bring the rail into the window before sweeping it, AFTER the arrows are done, because on a
  // large frame it is simply below the fold: at 1280px/root 24 the frame is 1136px square in a
  // 900px window. `window.scrollBy` moves the document and nothing else — `scrollIntoView` would
  // also scroll the frame itself, which is an overflow:hidden box whose scroll offset would shift
  // the slide out from under the measurement.
  var scrolledForDots = 0
  if (dots.length) {
    var r0 = dots[0].getBoundingClientRect()
    var delta = Math.round(r0.top + r0.height / 2 - vh / 2)
    if (r0.bottom > vh || r0.top < 0) { window.scrollBy(0, delta); scrolledForDots = delta }
  }

  // Every dot must lose 0px to another DOT: the old rail's 30x30 boxes on an 18px pitch overlapped
  // by 12px and the later dot in DOM order took all of it, so the right 2px of the dot you were
  // aiming at opened the next slide. Losing pixels to an ARROW is the accepted trade above.
  var stolen = dots.map(function (dot) {
    var swept = sweep(dot)
    return {
      label: dot.getAttribute('aria-label'),
      stolenPx: swept.stolenPx,
      stolenByDot: swept.stolenBy.indexOf('dot') !== -1,
      stolenBy: swept.stolenBy.join(','),
      offscreenPx: swept.offscreenPx,
      sampled: swept.sampled,
      w: Math.round(dot.getBoundingClientRect().width)
    }
  })

  var frameRect = frame.getBoundingClientRect()
  var rail = dots.length ? dots[0].parentElement.getBoundingClientRect() : null
  return {
    frame: {
      w: Math.round(frameRect.width * 100) / 100,
      h: Math.round(frameRect.height * 100) / 100,
      radius: getComputedStyle(frame).borderRadius,
      background: getComputedStyle(frame).backgroundColor
    },
    arrows: arrows,
    dots: stolen,
    scrolledForDots: scrolledForDots,
    railLines: rail && dots.length ? Math.round(rail.height / dots[0].getBoundingClientRect().height) : 0,
    railFitsFrame: rail ? rail.bottom <= frameRect.bottom + 0.5 : true
  }
}

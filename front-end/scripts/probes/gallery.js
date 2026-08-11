// The frame, the arrows and the dot rail. The two occlusion checks are the point of the file: a
// 44px box that measures perfectly and cannot be tapped looks identical to a correct one.
function () {
  var frame = document.querySelector('[aria-label="Next image"]').parentElement
  var arrows = ['Previous image', 'Next image'].map(function (name) {
    var el = document.querySelector('[aria-label="' + name + '"]')
    var r = el.getBoundingClientRect()
    var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return {
      name: name,
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100,
      // C14. The rail is a full-bleed transparent band later in DOM order at z-index auto; without
      // pointer-events-none on it this returns the rail, not the arrow.
      ownsItsCentre: el.contains(hit)
    }
  })
  var dots = [].slice.call(document.querySelectorAll('[aria-label^="Go to image"]'))
  // Sweep the rail at its vertical centre in 1px steps and record, per dot, how many pixels of its
  // own box hand the tap to a different dot. Every entry must be 0: the old rail's 30x30 boxes on
  // an 18px pitch overlapped by 12px and the later dot in DOM order took all of it.
  var stolen = dots.map(function (dot) {
    var r = dot.getBoundingClientRect()
    var y = Math.round(r.top + r.height / 2)
    var bad = 0
    for (var x = Math.ceil(r.left); x < Math.floor(r.right); x++) {
      var hit = document.elementFromPoint(x, y)
      if (!dot.contains(hit)) bad++
    }
    return { label: dot.getAttribute('aria-label'), stolenPx: bad, w: Math.round(r.width) }
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
    railLines: rail && dots.length ? Math.round(rail.height / dots[0].getBoundingClientRect().height) : 0,
    railFitsFrame: rail ? rail.bottom <= frameRect.bottom + 0.5 : true
  }
}

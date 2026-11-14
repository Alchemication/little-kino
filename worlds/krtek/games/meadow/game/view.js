// The view onto the meadow: a screen's worth (1600 scene units) of the 4000
// wide meadow, following the mole where he is drawn, easing after him, never
// past either end. The sky stays put; the far trees scroll at half speed, for
// depth; everything on the ground scrolls with the view (#cam, and the
// fireflies over the night, #glow-view).
//
// It fits the screen (fit(), on load and on resize): a 16:9 screen shows the
// 1600 by 900 of it; a wider one (a phone on its side) shows a little more
// at each side (`pad`), cutting at most a little of the sky, so the church's
// cross stays in sight (Adam, 2026-11-03: on the phone it was cut off); a
// narrower one, less at the sides. The game's 1600 stays the middle of the
// view: `left` and `right` are its edges as the child sees them.
//
// While he stays down in his tunnels (underground.js), the view slides down
// into the earth (`dive`, 0 to 1), so the soil gets the screen and the grass
// and its molehills stay in sight at the top (Adam, 2026-11-14): the sky and
// the church's hill stay where they are on the screen, the far trees sink a
// little behind the meadow's far edge.
//
// The yard's painting.js does the same for Reksio, with its own painting.
// Once both scenes have settled, what is the same in the two (the camera, the
// fit to the screen) is the part to move into shared/ (CLAUDE.md, "Shared
// parts"); until then each world keeps its own.

/* global Clock, Layout */
/* exported View */
const View = (() => {
  const EASE = 0.12 // each frame the view goes this share of the way to where it should be
  const FAR_SPEED = 0.5 // the far trees scroll this much slower than the ground
  const DISTANT_SPEED = 0.1 // the church's hill, far off, barely moves: in sight wherever he is
  const MAX = Layout.WORLD_W - Layout.VIEW_W
  const H = 900 // the scene's height
  const TOP_CUT = 140 // a wide screen cuts at most this much of the sky: the church's cross stands at 156 (church.js)
  const MAX_W = 2000 // and shows at most this wide: the sky, the night and the iris reach 200 past each side (index.html); wider still, more sky is cut
  const GRASS_AT = 0.4 // slid down while he stays under, the grass's edge shows this far down the screen, whatever its shape: the earth below (the deep soil reaches 1300: tunnelart.js)
  const DIVE_EASE = 0.07 // each frame the slide goes this share of the way: about a second, gentler than following him
  const FAR_SINK = 0.6 // sliding down, the far trees go this share of the way down with the sky: they sink behind the meadow's far edge

  let camX = 0
  let pad = 0 // what a wide screen shows past the 1600 at each side
  let target = () => 0 // where to keep in the middle (the mole, as drawn)
  let down = () => false // whether to slide down into the earth (he stays under)
  let dive = 0 // how far slid down: 0 the meadow, 1 the earth
  let slid = 0 // how far down the viewBox and the sky were last set
  let fitted = { top: 0, w: Layout.VIEW_W, h: H } // the screen's view (viewFor), before any slide
  let svgEl, cam, glow, far, distant, sky, onMove
  const OFFSTAGE_MARGIN = 200 // a thing this far past the view's edge still animates: it is in sight before it gets there
  const culled = [] // {el, x0, x1, off}: animated things (OFFSTAGE) that stop while out of sight

  /** Start following `follow()` (a scene x), and sliding down while `under()`; `moved(camX)` hears each move. */
  function setup(follow, moved, under = () => false) {
    down = under
    sky = document.getElementById('sky')
    cam = document.getElementById('cam')
    glow = document.getElementById('glow-view')
    far = document.getElementById('far-view')
    distant = document.getElementById('distant-view')
    target = follow
    onMove = moved
    camX = clamp(target() - Layout.VIEW_W / 2)
    draw()
    const frame = () => {
      const to = clamp(target() - Layout.VIEW_W / 2)
      const deep = down() ? 1 : 0
      const next = Math.abs(deep - dive) > 0.002 ? dive + (deep - dive) * DIVE_EASE : deep // nearly there: there
      if (Math.abs(to - camX) > 0.5 || next !== dive) {
        camX += (to - camX) * EASE
        dive = next
        draw()
      } else if (onMove) onMove(camX) // he may move while the view stays (at either end): whoever follows him hears it
      Clock.after(0, frame)
    }
    Clock.after(0, frame)
  }

  const clamp = (x) => Math.max(pad, Math.min(MAX - pad, x))

  /** The view for a screen of w × h: how much sky it cuts (top), its size in scene units, and its pad. */
  function viewFor(w, h) {
    const shape = w / (h || 1)
    if (shape <= Layout.VIEW_W / H) return { top: 0, w: Layout.VIEW_W, h: H, pad: 0 } // as wide or narrower: the svg's slice cuts the sides
    const top = Math.min(TOP_CUT, H - Layout.VIEW_W / shape)
    const vw = Math.min(MAX_W, (H - top) * shape)
    return { top, w: vw, h: H - top, pad: (vw - Layout.VIEW_W) / 2 }
  }

  /** Fit the view to the svg's size on screen. */
  function fit(svg) {
    const { width, height } = svg.getBoundingClientRect()
    const v = viewFor(width, height)
    pad = v.pad
    fitted = v
    svgEl = svg
    slid = 0 // fitted afresh, not slid
    svg.setAttribute('viewBox', `${-v.pad} ${v.top} ${v.w} ${v.h}`)
    if (cam) {
      camX = clamp(camX)
      draw()
    }
  }

  function draw() {
    cull()
    const dy = dive * (Layout.GROUND - fitted.top - GRASS_AT * fitted.h) // a screen that cuts more sky slides less: the grass at the same height on it
    if (svgEl && dy !== slid) { // only while it slides: a new viewBox has the whole picture laid out again
      slid = dy
      svgEl.setAttribute('viewBox', `${-pad} ${(fitted.top + dy).toFixed(1)} ${fitted.w} ${fitted.h}`)
      sky.style.transform = dy ? `translateY(${dy.toFixed(1)}px)` : ''
    }
    cam.style.transform = `translateX(${-camX}px)`
    glow.style.transform = cam.style.transform
    far.style.transform = `translate(${-((camX - pad) * FAR_SPEED + pad)}px, ${(dy * FAR_SINK).toFixed(1)}px)` // its painting starts at the view's left edge, wherever the view
    distant.style.transform = `translate(${-camX * DISTANT_SPEED}px, ${dy.toFixed(1)}px)` // the church stays in sight
    if (onMove) onMove(camX)
  }

  /**
   * Things that animate on their own (plants swaying, the spring's falls) stop while out of sight: each
   * one animating costs a phone a style update, a layer and a repaint every frame, seen or not, and most of
   * the 4000-wide meadow is out of sight (about 6% of a phone's main thread, idle). `els` must scroll with
   * the ground (inside #cam); where each spans is measured once, here.
   */
  function offstage(els) {
    const inCam = cam.getCTM().inverse()
    for (const el of els) {
      const box = el.getBBox()
      const m = inCam.multiply(el.getCTM())
      const xs = [box.x, box.x + box.width].flatMap((x) => [box.y, box.y + box.height].map((y) => new DOMPoint(x, y).matrixTransform(m).x))
      culled.push({ el, x0: Math.min(...xs), x1: Math.max(...xs), off: false })
    }
    cull()
  }

  function cull() {
    const from = camX - pad - OFFSTAGE_MARGIN
    const to = camX + Layout.VIEW_W + pad + OFFSTAGE_MARGIN
    for (const c of culled) {
      const off = c.x1 < from || c.x0 > to
      if (off !== c.off) c.el.classList.toggle('offstage', (c.off = off))
    }
  }

  /** A point on the screen's scene (as svg coordinates give it) in the meadow's own: add the view's offset. */
  const toWorld = (x) => x + camX

  /** Where something at x in the distant layer shows, as a meadow x (for the mole to look at it). */
  const fromDistant = (x) => camX + x - camX * DISTANT_SPEED

  return {
    setup,
    fit,
    offstage,
    viewFor,
    toWorld,
    fromDistant,
    get x() { return camX },
    /** How far the view has slid down into the earth: 0 the meadow, 1 the earth (he stays under). */
    get dive() { return dive },
    /** The view's edges, as the child sees them (wider than the 1600 on a wide screen). */
    get left() { return camX - pad },
    get right() { return camX + Layout.VIEW_W + pad },
  }
})()

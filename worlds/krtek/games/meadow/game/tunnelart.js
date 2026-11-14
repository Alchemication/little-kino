// His tunnels, seen: when he is under the ground, the earth under the grass
// opens in a cutaway (its soil: soilart.js), and shows all he has dug this
// play (tunnels.js): each run, dug out of the earth, crumbs along its walls,
// and the shaft down from every molehill; what he digs now is dug through it
// as he goes, with him crawling at its front and whoever follows him behind
// (Adam, 2026-11-11: without it they went into the ground in one place and
// came out in another). Once he is up, it lingers a moment and closes.
//
// Only drawing here: underground.js says what to show and moves it.

/* global Clock, Layout, MoleArt, Motion, SoilArt, Tunnels */
/* exported TunnelArt */
const TunnelArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND
  const TOP = Y + 16 // the cutaway's top, just under the grass's edge
  const DEEP = 172 // how far down it shows: to the foot of the picture
  const RUN_Y = Y + 106 // the tunnel's middle, where it runs along
  const BORE = 104 // how wide the tunnel is: room for the hare on all fours
  const SIDE = 110 // the earth shown beyond each end of what is dug
  const FLOOR = RUN_Y + BORE / 2 - 8 // where feet go
  const WALL = '#6b4526' // the earth packed hard round the tunnel, darker than its inside
  const AIR = [['0', '#9c6535'], ['0.4', '#c48a4f'], ['1', '#dcae6e']] // the tunnel's inside, in the den's ochre: shaded under its roof, lightest on its floor
  const FOLLOW_GAP = 104 // each one behind the one ahead
  const CRAWLER = 1.3 // his small crawling figure, drawn up to fill the tunnel's height
  const OPEN_MS = 300 // the ground opening
  const LINGER_MS = 1500 // once he is up, it stays open this long (Adam, 2026-11-14: they vanished at once)…
  const SHUT_MS = 1200 // …then closes this slowly
  const FOOT = 1300 // the deep earth reaches down to here: past the foot of a view slid all the way down (view.js DOWN)

  let root, earthG, tunnelsG, crumbsG, digG, moversG, clipRect
  let deep = null // the earth all along the meadow, under the cutaway: shown while the view is slid down
  let shown = false // open, or opening: the child can see it
  let shutting = null // the timer before it closes

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Him crawling, small, facing left: on all fours, digging hands ahead. */
  function crawler(parent) {
    const g = el('g', { class: 'crawler', transform: `scale(${CRAWLER})` }, parent)
    const { BODY, PINK, NOSE } = MoleArt
    el('path', { d: 'M34 0 C40 -30 20 -52 -6 -52 C-30 -52 -44 -38 -44 -22 C-44 -8 -34 0 -22 0 Z', fill: BODY }, g)
    el('path', { d: 'M-44 -24 l-14 4 l13 6 Z', fill: BODY }, g) // his snout
    el('circle', { cx: -59, cy: -20, r: 5.5, fill: NOSE }, g)
    el('ellipse', { cx: -32, cy: -34, rx: 5, ry: 6.5, fill: '#fff' }, g)
    el('circle', { cx: -33.5, cy: -33, r: 2.6, fill: BODY }, g)
    el('path', { d: 'M-12 -52 q-4 -12 2 -14 M-6 -52 q2 -13 8 -12 M0 -51 q8 -10 13 -6', stroke: BODY, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, g)
    const hands = el('g', { class: 'digging' }, g)
    el('ellipse', { cx: -46, cy: -6, rx: 11, ry: 7, fill: PINK, stroke: '#b9705a', 'stroke-width': 1.2, transform: 'rotate(-20 -46 -6)' }, hands)
    for (const x of [-8, 20]) el('ellipse', { cx: x, cy: -2, rx: 10, ry: 5, fill: PINK, stroke: '#b9705a', 'stroke-width': 1.2 }, g)
    return g
  }

  /** Drawn into `layer`, shut; the earth all along into `deepLayer`, hidden. */
  function setup(layer, deepLayer) {
    deep = deepLayer
    deep.style.display = 'none'
    SoilArt.draw(deep, -200, Layout.WORLD_W + 200, TOP, FOOT - TOP)
    root = el('g', { class: 'cutaway' }, layer)
    root.style.display = 'none'
    const shade = el('linearGradient', { id: 'tunnel-air', gradientUnits: 'userSpaceOnUse', x1: 0, x2: 0, y1: RUN_Y - BORE / 2, y2: RUN_Y + BORE / 2 }, el('defs', {}, root))
    for (const [offset, colour] of AIR) el('stop', { offset, 'stop-color': colour }, shade)
    earthG = el('g', {}, root)
    tunnelsG = el('g', {}, root)
    digG = el('g', {}, root)
    crumbsG = el('g', {}, root)
    const clip = el('clipPath', { id: 'tunnel-movers' }, root)
    clipRect = el('rect', { y: TOP, height: DEEP }, clip)
    moversG = el('g', { 'clip-path': 'url(#tunnel-movers)' }, root)
  }

  const tube = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }
  const shaft = (x) => `M${x} ${TOP + 4} V${RUN_Y}`
  const along = (a, b) => `M${a} ${RUN_Y} H${b}`

  /** A tube along `d`: its wall, then its inside over it. */
  function bore(d, parent, more = {}) {
    return [el('path', { ...tube, ...more, d, stroke: WALL, 'stroke-width': BORE + 12 }, parent), el('path', { ...tube, ...more, d, stroke: 'url(#tunnel-air)', 'stroke-width': BORE }, parent)]
  }

  /**
   * Draw what is dug (`net`, tunnels.js) and the shafts down from the molehills at `shafts` (x's), with
   * earth round them all; `extra` ([a, b]): a stretch about to be dug, its earth shown already.
   */
  function draw(net, shafts, extra = null) {
    earthG.replaceChildren()
    tunnelsG.replaceChildren()
    crumbsG.replaceChildren()
    for (const [l, r] of Tunnels.earth(net, shafts, SIDE, extra)) SoilArt.draw(earthG, l, r, TOP, DEEP)
    const runs = Tunnels.runs(net)
    const ds = [...shafts.map(shaft), ...runs.map((r) => along(r.from, r.to))]
    if (ds.length) bore(ds.join(' '), tunnelsG)
    SoilArt.crumbs(crumbsG, runs, shafts, RUN_Y, BORE + 12, TOP)
  }

  /**
   * Tunnel being dug now, along from a to b (`up` true: the shaft up at b too), nothing of it shown yet:
   * its paths, each of length 1 (pathLength): show 0 to 1 of them (stroke-dashoffset 1 to 0) as he digs.
   */
  function digging(a, b, up = false) {
    return bore(`${along(a, b)}${up ? ` V${TOP + 4}` : ''}`, digG, { pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 })
  }

  /** The way up at x, being dug: as digging(), a shaft. */
  const diggingUp = (x) => bore(`M${x} ${RUN_Y} V${TOP + 4}`, digG, { pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 })

  /** What was being dug is drawn as dug now (draw() has it): its own paths go. */
  const dug = () => digG.replaceChildren()

  /**
   * Who moves along the tunnel, drawn at x, facing the way he goes (`dir`), only between `lo` and `hi`
   * (who follows him is out of sight until it passes the way down): him at the front, `followers`
   * ([{ draw(g), scale }]) behind him in turn. Translate the group it gives back by the distance gone.
   */
  function movers(x, dir, lo, hi, followers = []) {
    moversG.replaceChildren()
    clipRect.setAttribute('x', String(lo - BORE / 2))
    clipRect.setAttribute('width', String(hi - lo + BORE))
    const run = el('g', { class: 'tunnellers' }, moversG)
    const facing = el('g', { transform: `translate(${x} ${FLOOR}) scale(${-dir} 1)` }, run) // drawn facing left: turned the way they go
    followers.forEach(({ draw: drawOne, scale }, n) => {
      const f = el('g', { transform: `translate(${(n + 1) * FOLLOW_GAP} 0) scale(${scale})` }, facing)
      drawOne(f)
    })
    crawler(facing)
    return run
  }

  /** Nobody in the tunnel. */
  const empty = () => moversG.replaceChildren()

  /** Open the ground (it may be closing: it opens again). */
  function open() {
    if (shutting) Clock.cancel(shutting)
    shutting = null
    const from = root.style.display === 'none' ? 0 : Number(getComputedStyle(root).opacity) // closing: from as far as it got
    shown = true
    root.getAnimations().forEach((a) => a.cancel())
    root.style.display = ''
    if (from < 1) Motion.endAt(root, [{ opacity: from }, { opacity: 1 }], { duration: OPEN_MS * (1 - from) })
    else root.style.opacity = '1'
  }

  /** He is up: it lingers, then closes, and nobody is left in it. */
  function shut() {
    if (!shown) return
    if (shutting) Clock.cancel(shutting)
    const close = () => {
      shutting = null
      shown = false
      const gone = () => {
        if (shown) return // opened again meanwhile
        root.style.display = 'none'
        empty()
        dug()
        earthG.replaceChildren() // nothing drawn while shut: open() draws it again
        tunnelsG.replaceChildren()
        crumbsG.replaceChildren()
      }
      Motion.endAt(root, [{ opacity: 0 }], { duration: SHUT_MS, easing: 'ease-in' }).then(gone, () => 'opened again: open() cancelled the closing')
    }
    shutting = Clock.after(LINGER_MS, close)
  }

  /** Show the earth all along (the view sliding down into it), or hide it (the view back up). */
  function depth(on) {
    const display = on ? '' : 'none'
    if (deep && deep.style.display !== display) deep.style.display = display
  }

  return {
    setup, draw, depth, digging, diggingUp, dug, movers, empty, open, shut,
    /** Is it open (or opening, or lingering) for the child to see? */
    get shown() { return shown },
    /** The earth's top: a tap below it, he staying under, is a tap on the earth. */
    TOP,
  }
})()

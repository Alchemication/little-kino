// His tunnels, seen: when he is under the ground, the earth under the grass
// opens in a cutaway (its soil: soilart.js), and shows all he has dug this
// play (tunnels.js): each run, dug out of the earth, crumbs along its walls,
// and the shaft down from every molehill; what he digs now is dug through it
// as he goes, with him crawling at its front and whoever follows him behind;
// under his home molehill, his den, a room his tunnels lead into (den.js's
// room, small), where he lies down on his pillow to rest
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
  const DEN_SCALE = 0.42 // his den, as small as this in his tunnels (about 252 by 185): its pillow at the tunnel's floor, where he crawls in
  const DEN_TOP = TOP + 8 // its top, just under the grass, where his home shaft comes down into it
  /** How wide his den is in the tunnels: what he has dug round his home from the start (underground.js). */
  const DEN_HALF = 120

  let root, earthG, tunnelsG, crumbsG, denG, shelfG, digG, moversG, flyG, clipRect
  let carried = null // what he carries on his back, found while digging (drawn on him each time he is drawn)
  let deep = null // the earth all along the meadow, under the cutaway: shown while the view is slid down
  let shown = false // open, or opening: the child can see it
  let shutting = null // the timer before it closes

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /**
   * Him crawling, small, facing left: on all fours, digging hands ahead, in parts that move (game.css .crawler):
   * crawling, his hands paddle in turn, his feet kick and he bobs; digging, his hands scoop faster; sniffing,
   * his head lifts and his nose twitches.
   */
  function crawler(parent) {
    const g = el('g', { class: 'crawler', transform: `scale(${CRAWLER})` }, parent)
    const { BODY, PINK, NOSE } = MoleArt
    const skin = { stroke: '#b9705a', 'stroke-width': 1.2 }
    const whole = el('g', { class: 'cr-whole' }, g)
    el('ellipse', { class: 'cr-foot cr-foot-b', cx: -6, cy: -3, rx: 9, ry: 4.5, fill: '#d98f86', ...skin }, whole) // the far foot, behind
    el('ellipse', { class: 'cr-hand cr-hand-b', cx: -38, cy: -9, rx: 10, ry: 6, fill: '#d98f86', ...skin, transform: 'rotate(-20 -38 -9)' }, whole) // the far hand, behind
    el('path', { d: 'M34 0 C40 -30 20 -52 -6 -52 C-30 -52 -44 -38 -44 -22 C-44 -8 -34 0 -22 0 Z', fill: BODY }, whole)
    const head = el('g', { class: 'cr-head' }, whole)
    el('path', { d: 'M-44 -24 l-14 4 l13 6 Z', fill: BODY }, head) // his snout
    el('circle', { class: 'cr-nose', cx: -59, cy: -20, r: 5.5, fill: NOSE }, head)
    el('ellipse', { cx: -32, cy: -34, rx: 5, ry: 6.5, fill: '#fff' }, head)
    el('circle', { cx: -33.5, cy: -33, r: 2.6, fill: BODY }, head)
    el('path', { d: 'M-12 -52 q-4 -12 2 -14 M-6 -52 q2 -13 8 -12 M0 -51 q8 -10 13 -6', stroke: BODY, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, head)
    el('ellipse', { class: 'cr-hand cr-hand-a', cx: -46, cy: -6, rx: 11, ry: 7, fill: PINK, ...skin, transform: 'rotate(-20 -46 -6)' }, whole) // the near hand
    el('ellipse', { class: 'cr-foot cr-foot-a', cx: 20, cy: -2, rx: 10, ry: 5, fill: PINK, ...skin }, whole) // the near foot
    return g
  }

  /** Drawn into `layer`, shut, with `den` (den.js's room, in its own coordinates `room`) under the home molehill
   * at x `home`; the earth all along into `deepLayer`, hidden. */
  function setup(layer, deepLayer, den, room, home) {
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
    const cy = DEN_TOP + (room.h * DEN_SCALE) / 2
    denG = el('g', { class: 'den-room', transform: `translate(${home} ${cy}) scale(${DEN_SCALE}) translate(${-(room.x + room.w / 2)} ${-(room.y + room.h / 2)})` }, root)
    denG.appendChild(den)
    den.insertBefore(nest(room), den.children[1]) // under his pillow, a nest of dry grass and leaves, as a mole's (Adam, 2026-11-14: the bed looked strange)
    shelfG = el('g', { class: 'den-shelf' }, denG) // what he has found, kept in his den: in the den's own units
    el('path', { d: `M${room.x + 70} ${room.y + 150} H${room.x + room.w - 70}`, stroke: '#7a4a22', 'stroke-width': 12, 'stroke-linecap': 'round' }, shelfG) // a ledge dug in its back wall
    const clip = el('clipPath', { id: 'tunnel-movers' }, root)
    clipRect = el('rect', { y: TOP, height: DEEP }, clip)
    moversG = el('g', { 'clip-path': 'url(#tunnel-movers)' }, root)
    flyG = el('g', {}, root) // earth flung back as he digs
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
    const him = crawler(facing)
    if (carried) him.appendChild(findArt(carried, 'carried')).setAttribute('transform', 'translate(-2 -64) scale(1.6)') // on his back
    return run
  }

  /** Something found while digging, drawn round its middle, about his hand's size: 'stone', 'button', 'shell', 'carrot' or 'key'. */
  function findArt(kind, cls = '') {
    const g = el('g', { class: `find find-${kind} ${cls}` })
    const ink = { stroke: '#2f2a22', 'stroke-width': 2 }
    if (kind === 'stone') { // a pebble with a hole worn through it
      el('ellipse', { rx: 13, ry: 10, fill: '#a59a8a', ...ink }, g)
      el('circle', { cx: 2, cy: -1, r: 3.5, fill: '#4a301b' }, g)
    } else if (kind === 'button') {
      el('circle', { r: 11, fill: '#d4473b', ...ink }, g)
      for (const [x, y] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) el('circle', { cx: x, cy: y, r: 1.6, fill: '#2f2a22' }, g)
    } else if (kind === 'shell') { // an empty snail shell
      el('path', { d: 'M-12 6 C-14 -10 6 -14 12 -2 C16 8 2 12 -6 6 C-10 2 -6 -4 0 -2 C4 0 2 4 -2 3', fill: '#e6c48a', ...ink }, g)
    } else if (kind === 'carrot') {
      el('path', { d: 'M-14 -4 L12 -2 L-14 4 Z', fill: '#e8892c', ...ink }, g)
      el('path', { d: 'M-14 0 l-8 -6 M-14 0 l-9 1 M-14 0 l-7 6', stroke: '#4f8a2e', 'stroke-width': 2.5 }, g)
    } else { // an old key
      el('circle', { cx: -9, cy: 0, r: 6, fill: 'none', stroke: '#b8892e', 'stroke-width': 3.5 }, g)
      el('path', { d: 'M-3 0 H14 M10 0 v5 M14 0 v4', stroke: '#b8892e', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g)
    }
    return g
  }

  /**
   * A nest of dry grass and a few leaves, heaped on the floor of his den under his pillow (in the den's own units,
   * `room`), as a mole beds down: drawn from where each strand lies, the same every play.
   */
  function nest(room) {
    const g = el('g', { class: 'den-nest' })
    const [cx, floor] = [room.x + room.w / 2 - 10, room.y + room.h - 40]
    el('path', { d: `M${cx - 285} ${floor} C${cx - 250} ${floor - 110} ${cx + 250} ${floor - 110} ${cx + 285} ${floor} Z`, fill: '#c9a35a', stroke: '#8a6a30', 'stroke-width': 5 }, g) // a little wider than his pillow, inside the room: it shows round it
    const strands = []
    for (let i = 0; i < 30; i++) {
      const x = cx - 270 + (i * 540) / 29 + Math.sin(i * 7.3) * 8
      const lean = Math.sin(i * 3.1) * 40 + (x < cx ? -20 : 20) // fanning out, as hay does
      const tall = Math.abs(x - cx) > 215 ? 110 + Math.abs(Math.sin(i * 1.7)) * 40 : 60 // tallest at its ends, by the pillow's
      strands.push(`M${x.toFixed(0)} ${floor - 4} q${(lean / 2).toFixed(0)} -${(tall / 2).toFixed(0)} ${lean.toFixed(0)} -${tall.toFixed(0)}`)
    }
    el('path', { d: strands.join(' '), stroke: '#a8833a', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, g)
    for (const [dx, turn, colour] of [[-250, -30, '#c2672e'], [235, 25, '#b5852f'], [-215, 60, '#9c5a2a']]) {
      el('path', { d: 'M0 0 C14 -18 40 -18 52 0 C40 18 14 18 0 0 Z', fill: colour, stroke: '#5a3a1c', 'stroke-width': 3, transform: `translate(${cx + dx} ${floor - 30}) rotate(${turn}) scale(1.4)` }, g) // a dry leaf or two
    }
    return g
  }

  /** He carries `kind` on his back now (found while digging), or nothing (null). */
  function carry(kind) {
    carried = kind
    const him = moversG.querySelector('.crawler')
    him?.querySelector('.carried')?.remove()
    if (kind && him) him.appendChild(findArt(kind, 'carried')).setAttribute('transform', 'translate(-2 -64) scale(1.6)')
  }

  /** The finds kept in his den, in a row along its ledge (`kinds`, in the order he brought them). */
  function shelf(kinds) {
    for (const f of [...shelfG.querySelectorAll('.find')]) f.remove()
    kinds.forEach((kind, i) => {
      shelfG.appendChild(findArt(kind)).setAttribute('transform', `translate(${600 + i * 100} 352) scale(3.8)`) // on the ledge, in the den's units
    })
  }

  /** Something found, popping out of the earth at x (his hands) onto his back: drawn flying, for a moment. */
  function unearth(kind, x, dir) {
    const g = flyG.appendChild(findArt(kind))
    return Motion.endAt(g, [{ transform: `translate(${x + dir * 50}px, ${FLOOR - 30}px) scale(0.6)` }, { transform: `translate(${x + dir * 10}px, ${FLOOR - 140}px) scale(1.4)`, offset: 0.5 }, { transform: `translate(${x}px, ${FLOOR - 90}px) scale(1.2)` }], { duration: 700, easing: 'ease-out' }).finally(() => g.remove())
  }

  /** What he is doing, on his crawling figure: 'crawling', 'digging', 'sniff' (on or off). */
  function act(name, on) {
    moversG.querySelector('.crawler')?.classList.toggle(name, on)
  }

  /** A clod of earth flung back from his digging hands at x (`dir` the way he digs), arcing over him onto the floor behind. */
  function clod(x, dir, r) {
    const c = el('ellipse', { cx: 0, cy: 0, rx: 3 + r() * 3, ry: 2 + r() * 2, fill: r() < 0.5 ? '#3a2615' : '#6e4a24' }, flyG)
    const [x0, y0] = [x, FLOOR - 40]
    const back = -dir * (50 + r() * 70)
    Motion.endAt(c, [{ transform: `translate(${x0}px, ${y0}px)`, opacity: 1 }, { transform: `translate(${x0 + back * 0.5}px, ${y0 - 30 - r() * 25}px)`, offset: 0.45 }, { transform: `translate(${x0 + back}px, ${FLOOR}px)`, opacity: 0.7 }], { duration: 520, easing: 'ease-out' }).then(() => c.remove(), () => c.remove())
  }
  const empty = () => moversG.replaceChildren()

  /** Him lying asleep on his pillow in his den (true: the crawler gone, the z's drifting up), or up again. */
  const asleep = (on) => denG.classList.toggle('asleep', on)

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
    setup, draw, depth, asleep, act, clod, carry, shelf, unearth, DEN_HALF, digging, diggingUp, dug, movers, empty, open, shut,
    /** Is it open (or opening, or lingering) for the child to see? */
    get shown() { return shown },
    /** The earth's top: a tap below it, he staying under, is a tap on the earth. */
    TOP,
  }
})()

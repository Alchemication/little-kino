// The small life in the earth under the meadow (Adam, 2026-11-14), seen
// while the view is down in it (view.js, his stays under): earthworms in the
// topsoil, a beetle trundling along under his flower bed, an ants' nest with
// its ants going round and round, and the tulips' bulbs with their roots.
// Ours: the films show only dark earth with pale flecks.
//
// It answers him through the world model (docs/WORLD_MODEL.md): as he digs
// and crawls, his tunnel's bump makes a soft noise ('burrow', underground.js)
// and whatever hears it near minds it: a worm draws itself in, the beetle
// stops, the ants hurry; and up in the flower bed, the tulip over it
// wobbles. A tap on one does the same, and a tap on a bulb has its tulip
// nod.
//
// Drawn once into its own layer, over his tunnels' earth, and shown with the
// deep earth only while the view is down (show()); moved by CSS loops
// (game.css .soil-life), listening on the Clock.

/* global Clock, Layout, Motion, World */
/* exported SoilLife */
const SoilLife = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const TOP = Layout.GROUND + 16 // the earth's top, under the grass (tunnelart.js TOP)
  const { HOME, BED } = Layout
  // Where they live: clear of his tunnels' depth (TOP + 26 to + 154, tunnelart.js), which hides what is behind it
  const WORMS = [[HOME - 520, 178], [HOME + 470, 204], [HOME + 1320, 186], [HOME + 2240, 214], [HOME - 760, 230]] // where each lives: x, how far down
  const ANTS_AT = { x: HOME + 820, y: TOP + 300 } // the ants' nest, deep under the meadow
  const ANTS = 7
  const BEETLE = { from: BED.from - 40, to: BED.to + 40, y: TOP + 176 } // its run along the roots under the flower bed
  const BULBS = [0, 2, 4, 6, 8] // which tulips' bulbs show (index in the bed, left to right)
  const BULB_DOWN = 9 // a bulb this far down: in the topsoil just under the grass, above his tunnels
  const HEARS = 170 // a noise this near, it minds it
  const SHY_MS = 3200 // a worm stays drawn in this long; the beetle stops, the ants hurry, as long
  const LISTEN_MS = 120
  const UNDER_TULIP = 60 // his bump this near under a tulip, it wobbles
  const INK = '#2f2a22'
  const SIZE = 2 // drawn this much bigger than life: big enough for a small child to spot, and to tap
  const BULB_SIZE = 1.5

  let g = null
  let root = null // its layer: shown while the view is down in the earth
  let tulips = () => []
  const worms = [] // { x, y, el, until }
  let beetle = null // { el, until }
  let ants = null // { el, until }
  const bulbs = [] // { x, i, el }
  let since = 0

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Into `layer` (its own, hidden), the tulips' bulbs under `tulipsAt()` ({ x, base, bend } each, left to right). */
  function setup(layer, tulipsAt) {
    tulips = tulipsAt
    root = layer
    g = el('g', { class: 'soil-life' }, layer)
    for (const [i, [x, down]] of WORMS.entries()) worms.push(worm(x, TOP + down, i))
    drawBulbs()
    beetle = drawBeetle()
    ants = drawAnts()
    since = World.heardUpTo
    Clock.every(LISTEN_MS, listen)
  }

  /** An earthworm, curled in the earth: it stretches and draws in slowly, by itself (game.css). */
  function worm(x, y, i) {
    const w = el('g', { class: 'soil-worm', 'data-soil': `worm ${i}`, transform: `translate(${x} ${y}) scale(${(i % 2 ? -1 : 1) * SIZE} ${SIZE})` }, g)
    const body = el('g', { class: 'worm-body' }, w)
    body.style.animationDelay = `${-(i * 0.7).toFixed(1)}s`
    el('path', { d: 'M-26 2 c6 -12 14 6 22 -2 s14 -10 22 -2', stroke: '#c97a7a', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, body)
    el('path', { d: 'M-12 -3 l0 5 M-5 -3 l0 5 M10 -7 l0 5', stroke: '#9e5656', 'stroke-width': 1 }, body)
    el('circle', { cx: 0, cy: 0, r: 34, fill: 'transparent' }, w) // a bigger target than the worm: small fingers
    return { x, y, el: w, until: 0 }
  }

  /** The tulips' bulbs with their roots, under the bed, each under its tulip. */
  function drawBulbs() {
    const all = tulips()
    for (const i of BULBS) {
      const t = all[i]
      if (!t) continue
      const b = el('g', { class: 'soil-bulb', 'data-soil': `bulb ${i}`, transform: `translate(${t.x.toFixed(0)} ${TOP + BULB_DOWN}) scale(${BULB_SIZE})` }, g)
      el('path', { d: 'M0 -20 V-12', stroke: '#6f9a3a', 'stroke-width': 3 }, b) // its stem, up to the bed
      el('path', { d: 'M-4 12 q-6 14 -12 22 M0 13 q0 14 2 24 M4 12 q8 12 14 18', stroke: '#d9c7a2', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }, b) // its roots
      el('path', { d: 'M0 -14 C9 -9 12 0 10 5 C8 10 -8 10 -10 5 C-12 0 -9 -9 0 -14 Z', fill: '#e8d2b0', stroke: '#8a6a48', 'stroke-width': 1.6 }, b) // the bulb
      el('circle', { cx: 0, cy: 0, r: 26, fill: 'transparent' }, b)
      bulbs.push({ x: t.x, i, el: b })
    }
  }

  /** A beetle trundling to and fro along the roots under the flower bed (game.css .soil-beetle). */
  function drawBeetle() {
    const run = el('g', { class: 'soil-beetle', 'data-soil': 'beetle', transform: `translate(${BEETLE.from} ${BEETLE.y}) scale(${SIZE})` }, g)
    run.style.setProperty('--run', `${(BEETLE.to - BEETLE.from) / SIZE}px`) // in its own, bigger units
    const walk = el('g', { class: 'beetle-walk' }, run) // to and fro (game.css): its place on the run is this one's
    const b = el('g', { class: 'beetle-body' }, walk)
    for (const x of [-6, 0, 6]) el('path', { d: `M${x} 4 l-3 6 M${x} 4 l3 6`, stroke: INK, 'stroke-width': 1.4 }, b) // its legs
    el('ellipse', { cx: 0, cy: 0, rx: 13, ry: 8, fill: '#3d5a3a', stroke: INK, 'stroke-width': 1.6 }, b)
    el('path', { d: 'M0 -8 V8', stroke: INK, 'stroke-width': 1 }, b) // its wing cases
    el('circle', { cx: 14, cy: -1, r: 4.5, fill: '#2a3a28', stroke: INK, 'stroke-width': 1.2 }, b) // its head
    el('circle', { cx: 0, cy: 0, r: 26, fill: 'transparent' }, walk)
    return { el: run, walk, until: 0 }
  }

  /** The ants' nest: a little chamber, its ants going round it, each with a crumb now and then. */
  function drawAnts() {
    const nest = el('g', { class: 'soil-ants', 'data-soil': 'ants', transform: `translate(${ANTS_AT.x} ${ANTS_AT.y}) scale(${SIZE * 0.8})` }, g)
    el('ellipse', { cx: 0, cy: 0, rx: 58, ry: 26, fill: '#8a5a2c', stroke: '#5a3a1c', 'stroke-width': 2 }, nest)
    el('ellipse', { cx: 0, cy: 2, rx: 50, ry: 20, fill: '#b98345' }, nest)
    el('path', { d: 'M-40 -16 Q-62 -36 -52 -62 M44 -14 Q66 -40 58 -66', stroke: '#8a5a2c', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, nest) // their runs, up a little way: clear of his tunnels
    const round = el('g', { transform: 'scale(1 0.45)' }, nest) // round the chamber's floor, seen side on
    for (let i = 0; i < ANTS; i++) {
      const orbit = el('g', { class: 'ant-orbit' }, round)
      orbit.style.animationDelay = `${(-i * 0.9).toFixed(1)}s`
      const a = el('g', { transform: `translate(${38 - (i % 3) * 6} 0)` }, orbit)
      for (const dx of [-3.5, 0, 3.5]) el('circle', { cx: dx, cy: 0, r: dx ? 2 : 1.6, fill: INK }, a)
      if (i % 3 === 0) el('circle', { cx: 6, cy: -2, r: 2, fill: '#efe6c8' }, a) // a crumb
    }
    el('ellipse', { cx: 0, cy: 0, rx: 64, ry: 32, fill: 'transparent' }, nest)
    return { el: nest, until: 0 }
  }

  /** Where the beetle is now along its run. */
  function beetleX() {
    const t = getComputedStyle(beetle.walk).transform
    return BEETLE.from + (t && t !== 'none' ? new DOMMatrixReadOnly(t).e * SIZE : 0)
  }

  /** A tulip nodding, `deg` each way, about its foot (a wobble, as his bump goes under it; a nod, its bulb tapped). */
  function nod(t, deg) {
    if (t.bend.getAnimations().length) return // nodding already
    Motion.endAt(t.bend, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${-deg}deg)`, offset: 0.3 }, { transform: `rotate(${deg * 0.6}deg)`, offset: 0.65 }, { transform: 'rotate(0deg)' }], { duration: 1000 }).catch(() => 'cut short: it stands as it was')
  }

  /** It minds something (his bump going by, a tap): a worm draws in, the beetle stops, the ants hurry, for a while. */
  function mind(who) {
    who.until = Clock.now() + SHY_MS
    who.el.classList.add('minding')
  }

  /** Hearing his bump go by near: whatever is near minds it; and each settles again in its own time. */
  function listen() {
    const heard = (x) => World.heard(x, since).some((n) => n.kind === 'burrow' && Math.abs(n.x - x) <= HEARS)
    for (const w of worms) if (heard(w.x)) mind(w)
    for (const t of tulips()) if (World.heard(t.x, since).some((n) => n.kind === 'burrow' && Math.abs(n.x - t.x) <= UNDER_TULIP)) nod(t, 3)
    if (root.style.display !== 'none' && heard(beetleX())) mind(beetle) // only in sight: where it is is read from the page, a style recalculation each time
    if (heard(ANTS_AT.x)) mind(ants)
    since = World.heardUpTo
    for (const who of [...worms, beetle, ants]) if (who.until && Clock.now() > who.until) {
      who.until = 0
      who.el.classList.remove('minding')
    }
  }

  /** A tap on something in the earth ('worm', 'beetle', 'ants' or 'bulb', `n` which): it answers; where it is, for him to look. */
  function tap(what, n) {
    if (what === 'worm' && worms[n]) {
      mind(worms[n])
      return { x: worms[n].x }
    }
    if (what === 'beetle') {
      mind(beetle)
      return { x: beetleX() }
    }
    if (what === 'ants') {
      mind(ants)
      return { x: ANTS_AT.x }
    }
    const bulb = bulbs.find((b) => b.i === n)
    if (what === 'bulb' && bulb) {
      const t = tulips()[bulb.i]
      const at = `translate(${bulb.x.toFixed(0)}px, ${TOP + BULB_DOWN}px)`
      Motion.endAt(bulb.el, [{ transform: `${at} scale(${BULB_SIZE})` }, { transform: `${at} scale(${BULB_SIZE * 1.15}, ${BULB_SIZE * 0.9})`, offset: 0.3 }, { transform: `${at} scale(${BULB_SIZE})` }], { duration: 500 }).catch(() => 'cut short: as it is')
      if (t) nod(t, 7) // its tulip, up in the bed, nods
      return { x: bulb.x }
    }
    return null
  }

  /** Shown while the view is down in the earth (view.js dive), or hidden. */
  function show(on) {
    const display = on ? '' : 'none'
    if (root && root.style.display !== display) root.style.display = display
  }

  return {
    setup, tap, show,
    /** Who is minding something now, for the overlay and the tests. */
    get minding() { return [...worms, beetle, ants].filter((w) => w && w.until).length },
  }
})()

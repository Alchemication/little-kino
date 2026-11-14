// The earth under the meadow, as the cutaway shows it (tunnelart.js): soil in
// layers, as it lies in a meadow (Adam, 2026-11-14: closer to how it looks in
// nature): dark topsoil just under the grass, the grass's fine roots hanging
// into it, brown earth under that with a root or two reaching down, pebbles
// and pale flecks of stone, now and then an earthworm, and a band of paler
// clay at the foot. The films show only dark earth with pale flecks (Krtek a
// autíčko 0:50); the rest is ours.
//
// Drawn from where each thing lies, never from a random stream, so a redraw
// (the ground opening again, a molehill made) puts every stone back where it
// was. Only drawing here: the deeper underground to come paints its own
// layers here too.

/* exported SoilArt */
const SoilArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const SOIL = { top: '#2a1a0e', earth: '#4a301b', clay: '#6e5236' } // topsoil, earth, the clay at the foot
  const TOPSOIL = 34 // how deep the dark topsoil goes
  const CLAY_FROM = 132 // the clay starts about this far down
  const HAIR_EVERY = 11 // a tuft of the grass's root hairs about this often
  const ROOT_EVERY = 170 // a place for a bigger root about this often…
  const ROOT_CHANCE = 0.45 // …and this often there is one
  const STONE_EVERY = 48 // a place for a pebble about this often…
  const STONE_CHANCE = 0.55
  const STONES = ['#8d8074', '#a59a8a', '#6f655b', '#9a8a73']
  const FLECK_EVERY = 30
  const WORM_EVERY = 520 // a place for a worm about this often…
  const WORM_CHANCE = 0.6
  const CRUMB_EVERY = 9 // crumbs of earth along a tunnel's walls

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** A number 0-1 that is always the same for n (and a salt): where a thing lies. */
  const at = (n, salt = 0) => {
    const s = Math.sin(n * 127.1 + salt * 311.7 + 17.3) * 43758.5453
    return s - Math.floor(s)
  }
  const f = (v) => v.toFixed(1)

  /** A wavy line from l to r about y, `amp` up and down, the same every time. */
  function wavy(l, r, y, amp, salt) {
    const pts = []
    for (let x = l; x < r; x += 40) pts.push(`${f(x)} ${f(y + (at(Math.round(x / 40), salt) - 0.5) * amp)}`)
    pts.push(`${f(r)} ${f(y)}`)
    return pts
  }

  /** The soil between l and r, from `top` down `deep`, into `g`: its top corners rounded off. */
  function draw(g, l, r, top, deep) {
    const bottom = top + deep
    const outline = `M${l + 26} ${top} H${r - 26} Q${r} ${top} ${r} ${top + 26} V${bottom} H${l} V${top + 26} Q${l} ${top} ${l + 26} ${top} Z`
    el('path', { d: outline, fill: SOIL.earth }, g)
    const clay = wavy(l, r, top + CLAY_FROM, 16, 1)
    el('path', { d: `M${clay.join(' L')} L${r} ${bottom} L${l} ${bottom} Z`, fill: SOIL.clay, opacity: 0.85 }, g)
    const under = wavy(l, r, top + TOPSOIL, 12, 2).reverse()
    el('path', { d: `M${l + 26} ${top} H${r - 26} Q${r} ${top} ${r} ${top + 26} L${under.join(' L')} L${l} ${top + 26} Q${l} ${top} ${l + 26} ${top} Z`, fill: SOIL.top }, g)
    flecks(g, l, r, top, deep)
    stones(g, l, r, top, deep)
    hairs(g, l, r, top)
    roots(g, l, r, top)
    worms(g, l, r, top)
  }

  /** Pale flecks of stone all through it. */
  function flecks(g, l, r, top, deep) {
    for (let i = Math.ceil(l / FLECK_EVERY); i * FLECK_EVERY < r; i++) {
      const [x, y, s] = [i * FLECK_EVERY + at(i, 3) * FLECK_EVERY, top + 12 + at(i, 4) * (deep - 24), 2 + at(i, 5) * 3]
      if (x > l + 14 && x < r - 14) el('path', { d: `M${f(x)} ${f(y)} l${f(s)} ${f(-s * 0.6)} l${f(s * 0.4)} ${f(s)} Z`, fill: '#cbb894', opacity: 0.45 }, g)
    }
  }

  /** Pebbles and small stones, rounded, a light on their top. */
  function stones(g, l, r, top, deep) {
    for (let i = Math.ceil(l / STONE_EVERY); i * STONE_EVERY < r; i++) {
      if (at(i, 6) > STONE_CHANCE) continue
      const x = i * STONE_EVERY + at(i, 7) * STONE_EVERY
      const y = top + TOPSOIL + 6 + at(i, 8) * (deep - TOPSOIL - 16)
      const rx = 3 + at(i, 9) ** 2 * 11
      if (x < l + rx + 8 || x > r - rx - 8) continue
      const tilt = (at(i, 10) - 0.5) * 50
      const stone = el('g', { transform: `translate(${f(x)} ${f(y)}) rotate(${f(tilt)})` }, g)
      el('ellipse', { rx: f(rx), ry: f(rx * (0.55 + at(i, 11) * 0.25)), fill: STONES[Math.floor(at(i, 12) * STONES.length)], stroke: '#3b2f25', 'stroke-width': 1 }, stone)
      el('ellipse', { cx: f(-rx * 0.25), cy: f(-rx * 0.22), rx: f(rx * 0.4), ry: f(rx * 0.16), fill: '#fff', opacity: 0.22 }, stone)
    }
  }

  /** The grass's fine roots, hanging into the topsoil all along. */
  function hairs(g, l, r, top) {
    const d = []
    for (let i = Math.ceil(l / HAIR_EVERY); i * HAIR_EVERY < r; i++) {
      const x = i * HAIR_EVERY + at(i, 13) * HAIR_EVERY
      if (x < l + 20 || x > r - 20) continue
      const len = 10 + at(i, 14) * 26
      const bend = (at(i, 15) - 0.5) * 10
      d.push(`M${f(x)} ${top + 1} q${f(bend)} ${f(len / 2)} ${f(bend / 2)} ${f(len)}`)
    }
    if (d.length) el('path', { d: d.join(' '), stroke: '#c9b08a', 'stroke-width': 0.9, fill: 'none', opacity: 0.55, 'stroke-linecap': 'round' }, g)
  }

  /** Now and then a bigger root reaching down, forking as it goes, thinner at each fork. */
  function roots(g, l, r, top) {
    for (let i = Math.ceil(l / ROOT_EVERY); i * ROOT_EVERY < r; i++) {
      if (at(i, 16) > ROOT_CHANCE) continue
      const x = i * ROOT_EVERY + at(i, 17) * ROOT_EVERY
      if (x < l + 40 || x > r - 40) continue
      const len = 60 + at(i, 18) * 70
      const sway = (at(i, 19) - 0.5) * 40
      const main = `M${f(x)} ${top} c${f(sway / 3)} ${f(len / 3)} ${f(sway)} ${f(len / 2)} ${f(sway * 0.8)} ${f(len)}`
      const forks = [0.35, 0.6].map((k, n) => {
        const [fx, fy] = [x + sway * k, top + len * k]
        const dir = n ? 1 : -1
        return `M${f(fx)} ${f(fy)} q${f(dir * 14)} ${f(8)} ${f(dir * (18 + at(i, 20 + n) * 16))} ${f(22 + at(i, 22 + n) * 18)}`
      })
      el('path', { d: main, stroke: '#b89a72', 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round' }, g)
      el('path', { d: forks.join(' '), stroke: '#b89a72', 'stroke-width': 1.4, fill: 'none', 'stroke-linecap': 'round' }, g)
    }
  }

  /** Now and then an earthworm, curled in the earth, slowly stretching and drawing in (game.css .worm). */
  function worms(g, l, r, top) {
    for (let i = Math.ceil(l / WORM_EVERY); i * WORM_EVERY < r; i++) {
      if (at(i, 24) > WORM_CHANCE) continue
      const x = i * WORM_EVERY + at(i, 25) * WORM_EVERY
      if (x < l + 50 || x > r - 50) continue
      const y = top + TOPSOIL + 12 + at(i, 26) * 26
      const dir = at(i, 27) < 0.5 ? -1 : 1
      const worm = el('g', { class: 'worm', transform: `translate(${f(x)} ${f(y)}) scale(${dir} 1)` }, g)
      const body = el('g', { class: 'worm-body' }, worm)
      body.style.animationDelay = `${f(-at(i, 28) * 4)}s` // each its own moment
      el('path', { d: 'M-22 2 c6 -10 12 6 20 -2 s12 -8 18 -2', stroke: '#c97a7a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, body)
      el('path', { d: 'M-10 -2 l0 4 M-4 -2 l0 4 M8 -6 l0 4', stroke: '#9e5656', 'stroke-width': 0.8 }, body) // its rings
    }
  }

  /**
   * Crumbs of earth along a tunnel: on both walls of each run (from, to at `y`, `bore` wide), down both sides of
   * each shaft (at x, from `top` to `y`), and loose on the floor. Into `g`, over the tunnels.
   */
  function crumbs(g, runs, shafts, y, bore, top) {
    const d = []
    const dot = (x, cy, s) => d.push(`M${f(x - s)} ${f(cy)} a${f(s)} ${f(s)} 0 1 0 ${f(2 * s)} 0 a${f(s)} ${f(s)} 0 1 0 ${f(-2 * s)} 0`)
    for (const { from, to } of runs) {
      for (let i = Math.ceil(from / CRUMB_EVERY); i * CRUMB_EVERY < to; i++) {
        const x = i * CRUMB_EVERY + at(i, 30) * CRUMB_EVERY
        dot(x, y - bore / 2 - 4 - at(i, 31) * 5, 1.2 + at(i, 32) * 1.8) // the roof's edge
        dot(x, y + bore / 2 + 4 + at(i, 33) * 5, 1.2 + at(i, 34) * 1.8) // the floor's edge
        if (at(i, 35) < 0.3) dot(x, y + bore / 2 - 4 - at(i, 36) * 4, 1 + at(i, 37) * 1.6) // loose on the floor
      }
    }
    for (const x of shafts) {
      for (let k = 0; top + 30 + k * CRUMB_EVERY < y; k++) {
        const cy = top + 30 + k * CRUMB_EVERY
        for (const side of [-1, 1]) dot(x + side * (bore / 2 + 4 + at(x + k, 38 + side) * 5), cy, 1.2 + at(x + k, 40) * 1.6)
      }
    }
    if (d.length) el('path', { d: d.join(' '), fill: '#1e130a', opacity: 0.75 }, g)
  }

  return { draw, crumbs }
})()

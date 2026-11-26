// The sun drawn after Krtek a myška (1997, 1:01–1:09, 3:55–3:59; world.yaml
// aesthetics): a yellow-orange disc with a thin dark outline and a ring of
// pointed rays, a face (eyes as little arcs under small brows, round rosy
// cheeks, a small pink-red nose, a wide thin smile), and round it a halo of
// small red and orange dots that thickens and thins as if it twinkles. Its
// face changes with the moods sun.js picks (ours: the film's never
// changes), and a tap gets a wink or a beam back. It hears the
// encounters' music cues (heard()) and keeps the ones sun.js answers.
//
// Drawn once into #sun (meadow.js moves it across the sky); each face is
// drawn once and only shown or hidden, so a frame does no more than ask
// which face is due. The eclipse's moon (index.html) stays on top. The halo
// twinkles on the Clock, drawn from its own stream.

/* global Clock, Debug, Sun */
/* exported SunArt */
const SunArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const R = 58 // the disc's radius, as the eclipse's moon's (index.html)
  const RAYS = { n: 22, out: 80, half: 0.13 } // pointed rays from the disc's edge out to this far, each this wide (radians either side)
  const HALO = { n: 60, from: 92, to: 165, r: [1.6, 3.4] } // each of the halo's two sets of dots: this many, between these radii, this big
  const TWINKLE_MS = 450 // the halo thickens or thins this often
  const DISC = '#f6ae2d'
  const RAY = '#f3922a'
  const LINE = '#7a3f18' // its outline and its face's lines
  const CHEEK = '#e0503a'
  const NOSE = '#e5614e'
  const INSIDE = '#8e2c1c' // an open mouth
  const DOTS = ['#d8442e', '#ec7a35', '#e35a30']
  const twinkle = Debug.random('meadow-sun') // the halo's dots and its twinkling: its own stream

  let faces = {} // name -> its <g>
  let shown = null
  let thick = null // the halo's second set of dots, shown when it thickens
  let tappedAt = null
  let taps = 0
  let wasRaining = false
  let clearedAt = null
  let cue = null // the last of the music's cues it answers (Sun.answers), and when
  let cuedAt = null

  function el(name, attrs, parent) {
    const e = document.createElementNS(SVG, name)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = (d, g, w = 2.6) => el('path', { d, fill: 'none', stroke: LINE, 'stroke-width': w, 'stroke-linecap': 'round' }, g)
  const fill = (d, colour, g) => el('path', { d, fill: colour, stroke: LINE, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g)

  // the face's parts, in the disc's units (its centre at 0, 0)
  const EYES = { happy: (x) => `M${x - 6} -11 Q${x} -19 ${x + 6} -11`, squeezed: (x) => `M${x - 7} -10 Q${x} -21 ${x + 7} -10`, droopy: (x) => `M${x - 7} -12 Q${x} -8 ${x + 7} -12` }
  const BROWS = { calm: (x) => `M${x - 4} -24 Q${x} -27 ${x + 4} -24`, up: (x) => `M${x - 4} -29 Q${x} -32 ${x + 4} -29`, low: (x) => `M${x - 4} -21 Q${x} -23 ${x + 4} -21` }
  const worried = (x) => `M${x + 5 * Math.sign(x)} -23 L${x - 4 * Math.sign(x)} -27` // its inner end raised
  const MOUTHS = {
    smile: (g) => line('M-30 5 Q0 30 30 5', g), // the film's
    sleepy: (g) => line('M-17 11 Q0 21 17 11', g),
    glum: (g) => line('M-12 17 Q0 11 12 17', g),
    oh: (g) => fill('M0 8 C7 8 7 22 0 22 C-7 22 -7 8 0 8 Z', INSIDE, g),
    glad: (g) => fill('M-24 6 Q0 32 24 6 Q0 13 -24 6 Z', INSIDE, g),
    beam: (g) => fill('M-30 4 Q0 38 30 4 Q0 12 -30 4 Z', INSIDE, g),
    wink: (g) => line('M-30 7 Q2 32 32 2', g), // a lopsided smile, up on the shut eye's side
  }

  /** One face: its cheeks, eyes and brows, its nose and mouth. */
  function face(name, parent) {
    const g = el('g', { class: `sun-face ${name}`, visibility: 'hidden' }, parent)
    const cheeks = name === 'glum' ? 0.55 : 0.9
    for (const x of [-36, 36]) el('circle', { cx: x, cy: 3, r: name === 'beam' ? 14 : 12.5, fill: CHEEK, opacity: cheeks }, g)
    const eye = { smile: EYES.happy, sleepy: EYES.droopy, glum: EYES.happy, glad: EYES.squeezed, beam: EYES.squeezed, wink: EYES.squeezed }[name]
    const brow = { smile: BROWS.calm, sleepy: BROWS.low, glad: BROWS.up, beam: BROWS.up, wink: BROWS.calm, oh: BROWS.up }[name]
    for (const x of [-14, 14]) {
      const open = name === 'oh' || (name === 'wink' && x < 0) // eyes wide open: round
      if (open) el('circle', { cx: x, cy: -14, r: name === 'wink' ? 4.6 : 3.6, fill: LINE }, g)
      else line(eye(x), g)
      line(name === 'glum' ? worried(x) : open ? BROWS.up(x) : brow(x), g, 2)
    }
    el('ellipse', { cx: 0, cy: -3, rx: 6.5, ry: 4.8, fill: NOSE, stroke: LINE, 'stroke-width': 1.6 }, g)
    MOUTHS[name](g)
    return g
  }

  /** A set of the halo's dots, scattered between its radii. */
  function dots(parent) {
    const g = el('g', { class: 'sun-halo' }, parent)
    for (let i = 0; i < HALO.n; i++) {
      const a = ((i + twinkle()) / HALO.n) * Math.PI * 2 // spread evenly round it, as the film's, each a little off
      const d = HALO.from + twinkle() * (HALO.to - HALO.from)
      const r = HALO.r[0] + twinkle() * (HALO.r[1] - HALO.r[0]) * (1 - (d - HALO.from) / (HALO.to - HALO.from) / 2) // smaller further out
      el('circle', { cx: (Math.cos(a) * d).toFixed(1), cy: (Math.sin(a) * d).toFixed(1), r: r.toFixed(1), fill: DOTS[i % DOTS.length] }, g)
    }
    return g
  }

  /** Draw it into `sun` (#sun), under what is already there (the eclipse's moon). */
  function setup(sun) {
    const g = el('g', { class: 'sun-art' })
    sun.insertBefore(g, sun.firstChild)
    dots(g)
    thick = dots(g)
    let rays = ''
    for (let i = 0; i < RAYS.n; i++) {
      const a = (i / RAYS.n) * Math.PI * 2
      const at = (ang, r) => `${(Math.cos(ang) * r).toFixed(1)} ${(Math.sin(ang) * r).toFixed(1)}`
      rays += `M${at(a - RAYS.half, R - 4)} L${at(a, RAYS.out)} L${at(a + RAYS.half, R - 4)} Z `
    }
    el('path', { d: rays, fill: RAY, stroke: LINE, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g)
    el('circle', { r: R, fill: DISC, stroke: LINE, 'stroke-width': 2.4 }, g)
    faces = Object.fromEntries(['smile', 'sleepy', 'glum', 'oh', 'glad', 'wink', 'beam'].map((n) => [n, face(n, g)]))
    Clock.every(TWINKLE_MS, () => thick.setAttribute('visibility', twinkle() < 0.5 ? 'hidden' : 'visible'))
  }

  /** Show the face due now: called each frame the sky is drawn, with the hour, the storm's phase and where the
   * eclipse's moon is across it (null with none on). It changes the page only when the face changes. */
  function update(hour, storm, eclipse) {
    const raining = storm === 'gathering' || storm === 'raining'
    if (wasRaining && !raining) clearedAt = Clock.now()
    wasRaining = raining
    const now = Clock.now()
    const since = (at) => (at === null ? null : now - at)
    const name = Sun.mood({ hour, storm, eclipse, clearedMs: since(clearedAt), tappedMs: since(tappedAt), tapWay: Sun.way(taps - 1), cue, cuedMs: since(cuedAt) })
    if (name === shown) return
    if (shown) faces[shown].setAttribute('visibility', 'hidden')
    faces[name].setAttribute('visibility', 'visible')
    shown = name
    Debug.trace('sun face', { face: name })
  }

  /** A tap on it: a wink or a beam, in turn. Returns which. */
  function tap() {
    tappedAt = Clock.now()
    taps++
    return Sun.way(taps - 1)
  }

  /** An encounter's moment, as the music hears it (things.js): the ones it answers change its face a while. */
  function heard(part) {
    if (!Sun.answers(part)) return
    cue = part
    cuedAt = Clock.now()
  }

  return {
    setup, update, tap, heard,
    /** The face it shows now. */
    get face() { return shown },
  }
})()

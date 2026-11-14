// His watering, once a day, left alone (Adam, 2026-11-14), after Krtek a
// buldozer (0:28-0:40: he fills a watering can at the spring and waters his
// flower bed): down into his home molehill he goes and comes up with the can,
// held up in both hands as he carries things in the films; to the spring,
// where he dips it full; back to his tulips, which he waters one after
// another, each nodding as the water lands; and home with it, down into his
// molehill. Some days, the frog was in the water as he dipped the can, and
// out it pours with the water onto his tulips, and hops off back to its pool
// (spring.js lends it). The can's look is ours: the films' wasn't checked.
//
// A left-alone move (alone.js ACTS.water), so a tap cuts it short: he sets
// the can down where he is, and the next time he is left alone he picks it up
// and carries on from where he stopped (nothing vanishes).

/* global Clock, Day, Debug, Layout, Mole, Motion, Sound, Spring, World */
/* exported Watering */
const Watering = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const { HOME, BED, GROUND } = Layout
  const HOURS = [11, 17] // he waters in the middle of the day, once
  const OPEN = 0.8 // …while his tulips are open
  const DIP_MS = 1200 // the can filling at the pool's edge
  const POUR_MS = 1100 // watering one tulip
  const WATERS = 3 // how many tulips he waters, along the bed
  const BESIDE = 100 // he stands this far to the left of the tulip he waters: it beside him, not behind him
  const DROPS = 6 // drops falling on each
  const FROG_CHANCE = 0.6 // with the frog in the water as he dips, this often it ends up in the can
  const INK = '#2f2a22'
  const TIP = 32 // pouring, the can tips this far towards the flowers, degrees
  const WATER = '#5f8fe0' // the water falling from it
  const random = Debug.random('meadow-watering') // the frog's luck, the drops: its own stream

  let things = null // the layer a can set down lies in
  let drops = null // the layer drops fall in
  let tulips = () => [] // the meadow's tulips: { x, base, bend }
  let goTo = async () => {}
  const state = { watered: false, can: 'home', full: false, frog: false } // can: 'home' (in his den), 'held', or the x it lies at
  let lying = null // the can drawn lying on the grass, set down after a cut
  let held = null // the can he holds up, drawn: tipped as he pours

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** `meadow` lends the layers (things, drops), tulips() and goTo(x). */
  function setup(meadow) {
    ;({ things, drops, tulips, goTo } = meadow)
  }

  /** Is it time to water: the middle of the day, his tulips open, not yet done, and not raining? */
  const due = () => {
    const h = World.state.hour
    return !state.watered && h >= HOURS[0] && h < HOURS[1] && Day.tulips(h) > OPEN && !World.isWet(BED.from)
  }

  /** A watering can, side on, its spout to the right, drawn round its middle (held up over his head). */
  function can(full) {
    const g = el('g', { class: 'watering-can' })
    el('path', { d: 'M-26 -22 L26 -22 L22 22 L-22 22 Z', fill: '#7d9a8a', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g) // its body
    el('path', { d: 'M-26 -22 L26 -22', stroke: '#a8c2b4', 'stroke-width': 4 }, g) // the rim
    el('path', { d: 'M-14 -22 Q0 -46 14 -22', fill: 'none', stroke: INK, 'stroke-width': 4 }, g) // the handle over its top
    el('path', { d: 'M22 10 L52 -14', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, g) // the spout
    el('path', { d: 'M22 10 L52 -14', stroke: '#7d9a8a', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g)
    el('ellipse', { class: 'can-rose', cx: 55, cy: -17, rx: 6, ry: 9, fill: '#7d9a8a', stroke: INK, 'stroke-width': 2.5, transform: 'rotate(-38 55 -17)' }, g) // its rose
    if (full) el('ellipse', { class: 'can-water', cx: 0, cy: -20, rx: 22, ry: 4, fill: '#7a95dc' }, g)
    return g
  }

  /** Hold the can up, full or empty. */
  function hold(full) {
    held = can(full)
    Mole.carry(held)
  }

  /** The can lying on the grass at x, where he set it down. */
  function lay(x) {
    lying?.remove()
    lying = el('g', { class: 'can-lying', transform: `translate(${x} ${GROUND - 20}) rotate(-8)` }, things)
    lying.appendChild(can(state.full))
    state.can = x
  }

  /** Held up: from his den, or from the grass where he set it down. */
  async function fetch(alive) {
    if (state.can === 'held') return
    if (state.can === 'home') {
      await goTo(HOME)
      if (!alive()) return
      Sound.dig()
      await Mole.goDown()
      await Clock.wait(500) // rummaging in his den
      if (!alive()) return
      hold(false)
      state.can = 'held'
      Sound.pop()
      await Mole.comeUp('out')
      return
    }
    await goTo(state.can)
    if (!alive()) return
    lying?.remove()
    lying = null
    hold(state.full)
    state.can = 'held'
  }

  /** To the pool's edge and in with the can: it fills, with a gurgle and rings; the frog, if it is in the water, may get in too. */
  async function fill(alive) {
    if (state.full) return
    const edge = Spring.POOL.x - Spring.POOL.rx + 40
    await goTo(edge)
    if (!alive()) return
    Mole.show('three', 1)
    Sound.splash()
    Spring.rings(edge + 40)
    World.noise('splash', edge + 40, 120) // a small one, as the can goes in: the frog, on its pad near, plops in
    await Mole.lean(24, DIP_MS)
    if (!alive()) return
    const frogIn = Spring.underwater().includes('frog') && random() < FROG_CHANCE
    if (frogIn) Spring.ride(true) // it swam into the can
    state.frog = frogIn
    state.full = true
    hold(true)
    Debug.trace('can filled', { frog: frogIn })
  }

  /** Where the can's rose is drawn now, in the meadow's units (the drops' layer's), or over his head with no can. */
  function rose() {
    const r = held?.querySelector('.can-rose')?.getBoundingClientRect()
    const m = drops.getScreenCTM()
    if (!r || !m) return { x: Mole.state.x + 60, y: GROUND - 250 }
    return new DOMPoint(r.x + r.width / 2, r.y + r.height / 2).matrixTransform(m.inverse())
  }

  /** Drops falling from the can's rose onto a tulip's head. */
  function pour(t) {
    const from = rose()
    const head = t.base - 80
    for (let i = 0; i < DROPS; i++) {
      const d = el('circle', { cx: from.x, cy: from.y, r: 4 + random() * 3, fill: WATER, stroke: '#2f4a8a', 'stroke-width': 1 }, drops)
      d.style.opacity = '0' // till its turn comes
      Motion.endAt(d, [{ transform: 'translate(0px, 0px)', opacity: 1 }, { transform: `translate(${t.x - from.x + (random() - 0.5) * 30}px, ${head - from.y}px)`, opacity: 0.9 }], { duration: 500, delay: i * 120, easing: 'ease-in' }).then(() => d.remove(), () => d.remove())
    }
  }

  /** The frog pours out with the water onto his tulips, and hops off home to its pool. */
  async function frogOut(t) {
    const frog = el('g', { class: 'poured-frog' }, drops)
    el('ellipse', { cx: 0, cy: -10, rx: 18, ry: 12, fill: '#6fae4c', stroke: INK, 'stroke-width': 2 }, frog)
    for (const dx of [-8, 8]) {
      el('circle', { cx: dx, cy: -22, r: 6, fill: '#6fae4c', stroke: INK, 'stroke-width': 2 }, frog)
      el('circle', { cx: dx, cy: -22, r: 2.5, fill: INK }, frog)
    }
    const start = rose()
    const hops = [[t.x, t.base - 70], [t.x + 140, GROUND], [t.x + 380, GROUND], [t.x + 700, GROUND]]
    Debug.trace('frog poured out')
    Mole.perk(1.4)
    Sound.say('ooh')
    let at = start
    for (const [x, y] of hops) {
      await Motion.endAt(frog, [{ transform: `translate(${at.x}px, ${at.y}px)` }, { transform: `translate(${(at.x + x) / 2}px, ${Math.min(at.y, y) - 60}px)`, offset: 0.5 }, { transform: `translate(${x}px, ${y}px)` }], { duration: 480, easing: 'ease-in-out' })
      at = { x, y }
    }
    frog.remove()
    Spring.ride(false) // back in its pool, and onto its pad in a while
    state.frog = false
  }

  /** Along his bed, watering a tulip at a time: each one nods as the water lands. */
  async function water(alive) {
    const all = tulips()
    const which = [0, Math.floor(all.length / 2), all.length - 1].slice(0, WATERS).map((i) => all[i])
    for (const [n, t] of which.entries()) {
      await goTo(t.x - BESIDE)
      if (!alive()) return
      Mole.show('three', 1)
      if (held) Motion.endAt(held, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${TIP}deg)`, offset: 0.25 }, { transform: `rotate(${TIP}deg)`, offset: 0.8 }, { transform: 'rotate(0deg)' }], { duration: POUR_MS + 300 }).catch(() => 'cut short: set down as it is')
      await Clock.wait((POUR_MS + 300) * 0.25) // tipped: now it pours
      if (!alive()) return
      pour(t)
      Sound.splash()
      Motion.endAt(t.bend, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-6deg)', offset: 0.35 }, { transform: 'rotate(3deg)', offset: 0.7 }, { transform: 'rotate(0deg)' }], { duration: POUR_MS }).catch(() => 'cut short: it stands as it was')
      if (n === 0 && state.frog) await frogOut(t)
      await Mole.lean(10, POUR_MS)
      if (!alive()) return
    }
    state.full = false
    state.watered = true
    hold(false)
    Sound.say('giggle', true)
    Debug.trace('watered')
  }

  /** And home with it: down into his molehill, and up again without it. */
  async function home(alive) {
    await goTo(HOME)
    if (!alive()) return
    Sound.dig()
    await Mole.goDown()
    Mole.carry(null)
    held = null
    state.can = 'home'
    if (!alive()) return
    await Clock.wait(400)
    Sound.pop()
    await Mole.comeUp('hill')
  }

  /** The errand, from wherever it stopped: fetch the can, fill it, water, take it home. */
  async function run(alive) {
    Debug.trace('waters', { from: typeof state.can === 'number' ? 'lying' : 'den' }) // the can left out after a cut, or from his den
    await fetch(alive)
    if (!alive()) return
    if (!state.watered) {
      await fill(alive)
      if (!alive()) return
      await water(alive)
      if (!alive()) return
    }
    await home(alive)
  }

  /** Cut short: whatever he holds, he sets down where he stands (the frog in it hops out home). */
  function restore() {
    if (state.can !== 'held') return
    Mole.carry(null)
    held = null
    if (state.frog) {
      Spring.ride(false)
      state.frog = false
    }
    lay(Layout.clampX(Mole.state.x + 50))
  }

  /** Is there an errand to do or finish: due, or the can left lying out. */
  const wants = () => due() || typeof state.can === 'number'

  return { setup, run, restore, wants, due, state }
})()

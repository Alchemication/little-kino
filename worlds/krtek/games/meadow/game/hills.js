// The mole's molehills: his home's, and those he leaves about the meadow
// where he dug himself in or came up (the oldest sinks back once there are
// too many). A tap on one sends him to it under the grass (burrow): what he
// did stays, and can be used again (Adam, 2026-11-10: the world should
// answer a touch); a tap on the one he is in takes him down to stay
// (underground.js). meadow.js says what a tap means and runs burrow as his
// gesture, so a new tap cuts it short like any other. Every molehill has a
// shaft down to his tunnels (tunnels.js), drawn when the ground opens.

/* global Debug, Layout, Mole, Motion, Sound, Underground */
/* exported Hills */
const Hills = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const { GROUND, HOME } = Layout
  const MAX = 6 // molehills he has left about the meadow; the oldest sinks back
  const SIZE = { home: [240, 64], other: [180, 50] } // a molehill's width and height: his home's is bigger
  const STOOD = { half: 24, tall: 115 } // what stands in a molehill (his trowel) takes taps this far either side of it and up
  const REACH = 8 // a tap this far above or below a molehill (scene units) still means it: lower is the grass, to walk on
  const NEAR = 50 // within this of a molehill's middle, he is in it
  const BESIDE = 150 // out on the grass this near a molehill, a tap on it has him step onto it and go down
  const COVERS = 70 // a molehill this near x stands there: no second one beside it

  const hills = [] // those he has left about, oldest first: { x, g, h, stood }
  let home = null // his home's: { x, g, h, stood }
  let layer, grass, paint
  let dropHat = () => {}
  let changed = () => {} // a molehill made or sunk: its shaft too

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Drawn in `layer`, behind `grass` (the grass in front stays in front of every molehill), its clods from
   * `random`; `dropHat()` has whatever is on his head fall off as he dives; `changed()` hears a molehill made or sunk. */
  function setup(hooks) {
    ;({ layer, grass, random: paint, dropHat } = hooks)
    changed = hooks.changed || changed
  }

  const path = (w, h) => `M${-w / 2} 6 C${-w * 0.42} ${-h * 0.7} ${-w * 0.22} ${-h} 0 ${-h} C${w * 0.22} ${-h} ${w * 0.42} ${-h * 0.7} ${w / 2} 6 Z`

  /** A molehill at x: a heap of earth with clods (big: his home's), growing up out of the grass. */
  function make(x, big = false, grow = true) {
    const [w, h] = big ? SIZE.home : SIZE.other
    const g = el('g', { class: 'hill' })
    layer.insertBefore(g, grass)
    g.style.transform = `translate(${x}px, ${GROUND}px)`
    const inner = el('g', {}, g)
    el('path', { d: path(w, h), fill: '#6e4a24', stroke: '#2b1b0b', 'stroke-width': 3 }, inner)
    for (let i = 0; i < (big ? 16 : 10); i++) {
      el('circle', { cx: (paint() - 0.5) * w * 0.75, cy: -paint() * h * 0.8, r: 4 + paint() * 7, fill: paint() < 0.5 ? '#38250a' : '#8a5d2e' }, inner)
    }
    if (grow) Debug.ignoreCut(Motion.endAt(inner, [{ transform: 'scaleY(0.05)' }, { transform: 'scaleY(1)' }], { duration: 320, easing: 'cubic-bezier(.3,1.5,.5,1)' }), 'hill grows')
    if (big) home = { x, g, h }
    else {
      hills.push({ x, g, h })
      if (hills.length > MAX) {
        const old = hills.findIndex((o) => !o.stood) // the oldest with nothing standing in it (his trowel stays put)
        sink(hills.splice(old, 1)[0])
      }
    }
    changed()
  }

  function sink(h) {
    Motion.endAt(h.g, [{ transform: `translate(${h.x}px, ${GROUND + 80}px)` }], { duration: 900, easing: 'ease-in' }).then(() => h.g.remove(), () => h.g.remove())
  }

  /**
   * Something standing in the top of the molehill at x (his trowel: trowelart.js), drawn behind its earth so its
   * foot is in the ground: `draw(g)` draws it, its foot at 0, 0, into a group set on the molehill's slope. While
   * it stands there, that molehill never sinks. Null takes it out again. Returns the group, or null.
   */
  function stand(x, draw, only = null) {
    const hill = find(x)
    if (!hill || (only && hill.stood !== only)) return null // `only`: take it out only if it is still that one
    hill.stood?.remove()
    hill.stood = null
    if (!draw) return null
    const w = (hill === home ? SIZE.home : SIZE.other)[0]
    hill.stood = el('g', { class: 'hill-stood', transform: `translate(${(w * 0.32).toFixed(0)} ${(-hill.h * 0.62).toFixed(0)})` })
    hill.g.insertBefore(hill.stood, hill.g.firstChild)
    draw(hill.stood)
    return hill.stood
  }

  /** The molehill at x, his home's or one he left: { x, g, h, stood }, or undefined. */
  const find = (x) => (home && Math.abs(x - home.x) < COVERS ? home : hills.find((o) => Math.abs(o.x - x) < COVERS))

  /** What stands in the molehill at x (stand), or null. */
  const stood = (x) => find(x)?.stood ?? null

  /** Where the molehills stand: his home's, then those he left, oldest first. */
  const xs = () => [HOME, ...hills.map((h) => h.x)]

  /** Does a molehill stand at x (his home's, or one he left)? */
  const at = (x) => Math.abs(x - HOME) < COVERS || hills.some((h) => Math.abs(h.x - x) < COVERS)

  /** The molehill drawn at this point of the meadow (scene units), his home's among them, or what stands in it
   * (his trowel: a tap on it is a tap on its molehill): its x, or null. */
  function under(x, y) {
    const on = (hx, [w, tall]) => Math.abs(x - hx) < w / 2 && y > GROUND - tall - REACH && y < GROUND + REACH
    const onStood = (hill, [w, tall]) => !!hill?.stood && Math.abs(x - hill.x - w * 0.32) < STOOD.half && y > GROUND - tall * 0.62 - STOOD.tall && y < GROUND
    if (on(HOME, SIZE.home) || onStood(home, SIZE.home)) return HOME
    return hills.find((h) => on(h.x, SIZE.other) || onStood(h, SIZE.other))?.x ?? null
  }

  /**
   * A tap on a molehill. The one he is in (or stands beside, out on the grass): down he goes, and stays
   * (underground.js). Another: he tunnels to it. Down he goes where he is (out on the grass he digs himself
   * in, step by step, and leaves a molehill there: one more to tap), the bump of his tunnel runs under the
   * grass, and up he pops in it. Staying under already: along his tunnel to it, and up.
   */
  async function burrow(x, alive) {
    x = Layout.clampX(x)
    const m = Mole.state
    if (m.pose === 'under') return Underground.upAt(x)
    const kept = hills.findIndex((h) => Math.abs(h.x - x) < NEAR)
    if (kept >= 0) hills.push(...hills.splice(kept, 1)) // the one he is going to is the newest now: a new one never sinks it
    Mole.lookAt(x) // he looks first: the tap was heard
    if (Math.abs(x - m.x) < (m.pose === 'out' ? BESIDE : NEAR)) {
      if (m.pose === 'out') await Mole.walkTo(x)
      if (!alive()) return
      dropHat()
      return Underground.goUnder()
    }
    Debug.trace('burrows', { from: Math.round(m.x), to: Math.round(x) })
    dropHat()
    Sound.dig()
    if (m.pose === 'out') {
      if (m.x < Layout.UNDER.from) await Mole.walkTo(Layout.UNDER.from) // clear of the oak's roots first: no tunnel goes through them
      if (!alive()) return
      if (!at(m.x)) make(m.x)
      await Mole.digIn()
    } else await Mole.goDown()
    if (!alive()) return
    x = await Underground.tunnelTo(x) // as far as his tunnels go
    if (!alive()) return
    if (!at(x)) make(x)
    Sound.pop()
    await Mole.comeUp('hill')
    Mole.perk(0.7)
    Sound.say('giggle', true) // now and then: here I am
  }

  return { setup, make, at, xs, under, burrow, stand, stood, /** How many he has left about (not his home's). */ get count() { return hills.length } }
})()

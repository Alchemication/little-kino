// His trowel drawn, and its beats (trowel.js has the rules). Drawn after
// Krtek a buldozer (0:42, 0:55–0:57) and Krtek a myška (2:22–2:25): a blue
// blade, rounded at the shoulders and coming to a point, on a short dark
// handle with a crossbar grip, about half his height.
//
// Where it is (`state.at`): standing in the top of a molehill (its x), stuck
// in by the tip as in Buldozer 0:42; 'held', in his near hand under the
// ground (tunnelart.js draws it on him, and leaning by his pillow as he
// sleeps); 'up', held high as he comes up with it from his den; or null, not
// his this play (yet). Going down a molehill it stands in, he takes it with
// him (underground.js calls take); coming up anywhere with it, its tip pokes
// up through the earth first, and there it stands (put). A tap's cut leaves
// it standing in the molehill where he is (settle), never in the air.
//
// Its beats: the surprises as he digs with it (surprise), and, on a play
// without it, once, left alone at home, the fetch (alone.js ACTS.trowel):
// he scratches his head, has an idea, dives into his molehill and comes up
// holding it high, delighted, then sticks it in the molehill's top.

/* global Clock, Debug, Hills, Layout, Mole, Motion, Sound, Trowel, TunnelArt */
/* exported TrowelArt */
const TrowelArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const BLADE = '#4f74c9'
  const SHINE = '#86a3e3'
  const WOOD = '#4a2c17'
  const INK = '#1f1a14'
  const STAND = 'translate(0 -38) rotate(12) scale(1.1)' // in a molehill: just its tip in the earth, leaning out a little
  const HELD = 'rotate(45) translate(0 -24) rotate(180)' // in his raised hand, its handle in his palm, the blade up and out
  const RAISED = [110, -80] // his arms as he holds it up: the empty one flung up, the other high (Krtek a myška 2:23)
  const POKE_MS = 450 // coming up, its tip pokes up through the earth first, and it rises to stand
  const PULL_MS = 260 // going down, it goes down with him
  const PLANT = 40 // fetched, he sticks it in from this high…
  const PLANT_MS = 180 // …this quickly
  const SINK = 90 // how far down into the earth it goes as it is pulled in, or comes from
  const NEAR = 70 // a molehill this near stands where it stands (hills.js COVERS)
  const IDEA_MS = 350 // the idea: his hairs up, a moment before he dives
  const RUMMAGE_MS = 1000 // down in his den, looking for it
  const SHOW_MS = 1300 // up with it, held high
  const JOLT_MS = 560 // the clink's jolt (game.css .crawler.jolt)
  const TUG_MS = 360 // each tug at it, stuck (game.css .crawler.tug)…
  const TUGS = 3 // …this many
  const ON_HEAD_MS = 700 // the clod sits on his head this long before he shakes it off
  const random = Debug.random('meadow-trowel') // whether he has it, and its surprises: its own stream

  const state = { at: null, last: null } // last: the surprise before

  function el(name, attrs, parent) {
    const e = document.createElementNS(SVG, name)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /**
   * The trowel, handle up, in its own units: the blade's tip at 0, 40, the grip's crossbar at 0, -60, 100 long.
   * Its middle (0, 0) is where the blade meets the handle.
   */
  function draw(parent, cls = '') {
    const g = el('g', { class: `trowel ${cls}` }, parent)
    const line = { stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }
    el('rect', { x: -4.5, y: -58, width: 9, height: 54, rx: 3, fill: WOOD, ...line }, g) // the handle
    el('rect', { x: -15, y: -64, width: 30, height: 9, rx: 4, fill: WOOD, ...line }, g) // its crossbar grip
    el('rect', { x: -4, y: -6, width: 8, height: 8, fill: '#6f7d93', ...line }, g) // the neck
    el('path', { d: 'M-14 2 C-17 2 -18 8 -16 14 L-1.5 40 C-0.8 41.5 0.8 41.5 1.5 40 L16 14 C18 8 17 2 14 2 Z', fill: BLADE, ...line }, g) // the blade
    el('path', { d: 'M-9 8 L-1 30', stroke: SHINE, 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }, g) // a glint along it
    return g
  }

  /** This play's: from the start, standing in his home molehill, or not (`forced`: the page's ?trowel). */
  function setup(forced = null) {
    if (Trowel.plan(random, forced)) stand(Layout.HOME)
  }

  /** It stands in the molehill at x; `from` (scene units below where it stands, or above if less than 0): it comes
   * from there, up out of the earth tip first, or down as he sticks it in. */
  function stand(x, from = 0) {
    state.at = x
    const g = Hills.stand(x, (g) => draw(el('g', { class: 'trowel-rise' }, g)).setAttribute('transform', STAND))
    const rise = g?.querySelector('.trowel-rise')
    if (rise && from) Debug.ignoreCut(Motion.endAt(rise, [{ transform: `translateY(${from}px)` }, { transform: 'translateY(0px)' }], { duration: from > 0 ? POKE_MS : PLANT_MS, easing: from > 0 ? 'ease-out' : 'ease-in' }), 'trowel stands')
  }

  /** Going down the molehill at x: if it stands there, it goes down with him, into his hand. True if it did. */
  function take(x) {
    if (typeof state.at !== 'number' || Math.abs(state.at - x) >= NEAR) return false
    const at = state.at
    state.at = 'held'
    TunnelArt.holdTrowel(true)
    Debug.trace('trowel', { does: 'take', x: Math.round(at) })
    const rise = Hills.stood(at)?.querySelector('.trowel-rise')
    const gone = () => Hills.stand(at, null, rise?.parentNode)
    if (!rise) return true
    Motion.endAt(rise, [{ transform: `translateY(${SINK}px)` }], { duration: PULL_MS, easing: 'ease-in' }).then(gone, gone)
    return true
  }

  /** Coming up at x with it in hand: it pokes up through the earth first, and stands there (a molehill made if
   * there is none yet). */
  function put(x, from = SINK) {
    if (state.at !== 'held') return
    TunnelArt.holdTrowel(false)
    if (!Hills.at(x)) Hills.make(x)
    Debug.trace('trowel', { does: 'put', x: Math.round(x) })
    stand(x, from)
  }

  /** After a cut has settled him (meadow.js cutShort): it ends standing in the molehill he is in, unless he is
   * still down in his tunnels with it. */
  function settle() {
    if (state.at === 'up') {
      Mole.grip(null)
      state.at = 'held'
    }
    if (state.at === 'held' && !['under', 'down'].includes(Mole.state.pose)) put(Mole.state.x, 0)
  }

  // His trowel's surprises as he digs with it (trowel.js picks): each ends with him digging on.
  const SURPRISES = {
    /** It strikes a stone: a clink, and he shakes all over with the jolt. */
    async clink() {
      Sound.clink()
      TunnelArt.act('jolt', true)
      try {
        await Clock.wait(JOLT_MS)
      } finally {
        TunnelArt.act('jolt', false)
      }
    },
    /** It sticks fast in the earth: he tugs, and tugs, and it comes free. */
    async stuck(x, dir, alive) {
      TunnelArt.act('tug', true)
      try {
        for (let i = 0; i < TUGS && alive(); i++) {
          Sound.scrape()
          await Clock.wait(TUG_MS)
        }
      } finally {
        TunnelArt.act('tug', false)
      }
      if (alive()) Sound.pop()
    },
    /** A spadeful flung back over his shoulder lands on his own head; a moment, and he shakes it off. */
    async head(x, dir, alive) {
      Sound.scrape()
      const off = TunnelArt.clodOnHead(x, dir, ON_HEAD_MS) // cut short, it falls off by itself all the same
      await Clock.wait(TunnelArt.CLOD_LANDS_MS + ON_HEAD_MS * 0.4)
      if (!alive()) return
      TunnelArt.act('shake', true)
      Sound.say('giggle', true)
      try {
        await off
      } finally {
        TunnelArt.act('shake', false)
      }
    },
  }

  /** After a stretch of new earth dug with it (`len` long, he at x facing `dir`): now and then a surprise
   * (`forced`: that one, for trying it and the tests), each step ending once `alive()` is false (a cut). */
  async function surprise(len, x, dir, { forced = null, alive = () => true } = {}) {
    if (state.at !== 'held') return
    const drawn = Trowel.surprise(random, len, state.last)
    const kind = forced || drawn
    if (!kind) return
    state.last = kind
    Debug.trace('trowel', { does: kind })
    await SURPRISES[kind](x, dir, alive)
  }

  /** Would he fetch it now: not his yet this play, and he is in his home molehill. */
  const wants = () => state.at === null && Mole.state.pose === 'hill' && Math.abs(Mole.state.x - Layout.HOME) < NEAR

  /** The fetch (Krtek a myška 2:17–2:25): a scratch of his head, an idea, down he dives, and up he comes with it
   * held high, delighted; then he sticks it in the molehill's top. A cut before he is up leaves it in his den, for
   * another time; after, it stands in the molehill (settle). */
  async function fetch(alive) {
    Debug.trace('trowel', { does: 'fetch' })
    await Mole.scratchHead()
    if (!alive()) return
    Mole.perk(1.6)
    Sound.say('ooh', true)
    await Clock.wait(IDEA_MS)
    if (!alive()) return
    Sound.dig()
    await Mole.goDown()
    if (!alive()) return
    Clock.after(RUMMAGE_MS * 0.4, () => alive() && Sound.clunk()) // rummaging about in his den
    await Clock.wait(RUMMAGE_MS)
    if (!alive()) return
    state.at = 'up'
    Mole.grip((g) => draw(g).setAttribute('transform', HELD))
    Sound.pop()
    await Mole.comeUp('hill')
    if (!alive()) return
    Mole.laugh(true)
    await Mole.arms(...RAISED, 160)
    Sound.say('giggle', true)
    await Clock.wait(SHOW_MS)
    if (!alive()) return
    Mole.laugh(false)
    Mole.grip(null)
    state.at = 'held'
    put(Mole.state.x, -PLANT) // stuck in, from his hand
    await Mole.arms(60, -60, 160) // his hands back on the rim
  }

  /** What must always hold: in his hand only while he is down there or holding it up; standing only in a molehill. */
  function check() {
    const { at } = state
    if (at === 'held') return ['under', 'down'].includes(Mole.state.pose) || `held, but he is ${Mole.state.pose}`
    if (at === 'up') return !!Mole.state.holding || 'up, but not in his hand'
    if (typeof at === 'number') return Hills.at(at) || `standing at ${Math.round(at)}, where no molehill is`
    return true
  }

  return {
    draw, setup, take, put, settle, surprise, wants, fetch, check, state,
    /** Is it in his hand, down there? */
    get held() { return state.at === 'held' },
  }
})()

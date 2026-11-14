// The spring's pool, for him (Adam, 2026-11-14: he never got into the water,
// and the paint vanished at once): he wades in up to his middle, rings
// spreading round him as he moves, and comes out dripping. A tap on the
// spring has him paddle, a different way each time (rounds): kicking up
// splashes, one splash too many in his face, ducking under and blowing
// bubbles, standing under the waterfall with his eyes shut, or, with the frog
// on its pad, going in gently so as not to scare it. Now and then, ducked
// under, he comes up with someone on his head: the frog, if it has plopped
// in (his splashing makes it), or the fish, if this play has one; he rolls
// his eyes up at it, "ooh", and shakes it off back into the water (Adam,
// 2026-11-14: a rare surprise, never on the first duck). After the paint, he
// washes here: under he goes, the paint coming off him into the water in
// swirls, twice, and he comes up clean and shakes himself dry. Nothing in
// the films shows him in the water (the bullfinches bathe in Buldozer's
// pool): ours.
//
// Drawn in `layer` (#wade, in front of him and behind what stands on the
// grass): the pool's near edge round him while he is in it. Moves him with
// Motion.endAt on the Clock, so a tap cuts it short; the meadow's cut calls
// restore(), and he is settled out on the bank.

/* global Clock, Debug, Mole, Motion, Sound, Spring, World */
/* exported Water */
const Water = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const { POOL, FALL } = Spring
  const WADE_X = POOL.x - 70 // where he paddles: in the pool's near half, clear of the frog's pad and the falls
  const SHOWER_X = FALL.x - 18 // under the waterfall, its water on his head
  const FROG_HEARS_MS = 1500 // going in gently by the frog, he waits at most this long for it to plop in
  const RING_EVERY_MS = 1100 // standing in the water, a ring spreads from him this often
  const BUBBLES = 7 // ducked under, this many bubbles come up
  const SWIRLS = 5 // the paint coming off him in this many swirls each time he goes under
  const SWIRL_MS = 2600 // a swirl of paint spreading out and fading in the water
  const WASH_DIPS = 2 // under this many times, the paint less each time
  const BODY = '#15140f' // his own colour, under the paint (mole.js)
  const RIDER_AFTER = 3 // he has paddled at least this many times since the last (or since the day began)…
  const RIDER_CHANCE = 0.6 // …and ducked under, this often he comes up with someone on his head
  const RIDER_LOOK_MS = 900 // it sits there on him this long while he looks up at it
  const INK = '#2f2a22'
  const RIDER_SIZE = 1.5 // the frog or fish on his head, this much bigger than in the pool: clear at a glance
  const RIDER_UP = -12 // and sitting this far up, on the top of his head rather than in it
  const RIDER_JUMP = 150 // shaken off, it leaps this far off to his side, back into the water…
  const RIDER_LEAP = 70 // …this high over his head…
  const RIDER_JUMP_MS = 800 // …taking this long
  const splashes = Debug.random('meadow-splashes') // drops, bubbles and swirls: their own, so nothing else shifts
  const ways = Debug.random('meadow-paddles')
  const surprises = Debug.random('meadow-riders') // who comes up on his head, and when: its own, so the paddles' order stays put

  let layer = null
  let goTo = async () => {}
  let rounds = () => () => null
  let edge = null // the water's near edge round him, while he is in
  let pouring = null // the falls' water pouring on his head, drawn in front of him
  let ringing = null // stops the rings spreading from him
  let nextPaddle = null
  let lastPaddle = null
  let paddles = 0 // times he has paddled since someone last came up on his head
  let rider = null // who sits on his head now: { kind, node }

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Drawn into `layer`; `meadow` lends goTo and rounds. */
  function setup(into, meadow) {
    layer = into
    ;({ goTo, rounds } = meadow)
    nextPaddle = rounds(Object.keys(PADDLES), ways)
  }

  /** The pool's near edge in front of him at x: its water over his lower half, a pale line where it meets him. */
  function drawEdge(x) {
    edge?.remove()
    edge = el('g', { class: 'wading' }, layer)
    el('ellipse', { cx: x, cy: POOL.y + 6, rx: 74, ry: 13, fill: '#5d79c8' }, edge)
    el('ellipse', { cx: x, cy: POOL.y + 2, rx: 56, ry: 7, fill: '#7a95dc' }, edge)
    el('path', { d: `M${x - 46} ${POOL.y - 4} Q${x} ${POOL.y + 4} ${x + 46} ${POOL.y - 4}`, stroke: '#dde8ff', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }, edge)
  }

  /** Rings spreading from him on the water while he stands in it. */
  function keepRinging(x) {
    ringing?.()
    Spring.rings(x)
    ringing = Clock.every(RING_EVERY_MS, () => Spring.rings(x, POOL.y + 2))
  }

  /** Over to the pool's edge by x and in, up to his middle: a splash, rings, a wobble at the cold. */
  async function wadeIn(x, gently = false) {
    await goTo(x)
    Debug.trace('wades in', { x: Math.round(x) })
    if (!gently) {
      Sound.splash()
      World.noise('splash', x, 250)
      drops({ x, y: POOL.y - 40 }, 6)
    }
    drawEdge(x)
    await Mole.wade()
    keepRinging(x)
    if (!gently) await Mole.shakeOff(400) // brr
  }

  /** Out of the water onto the bank, dripping. */
  async function wadeOut() {
    ringing?.()
    ringing = null
    Spring.rings(Mole.state.x)
    edge?.remove()
    edge = null
    await Mole.comeUp('out')
    drops({ x: Mole.state.x, y: POOL.y - 20 }, 4, true)
  }

  /** Bubbles rising from under the water at x, popping at the top. */
  function bubbles(x) {
    for (let i = 0; i < BUBBLES; i++) {
      const b = el('circle', { cx: x + (splashes() - 0.5) * 50, cy: POOL.y - 2, r: 3 + splashes() * 4, fill: '#eef5ff', stroke: '#9cb7e6', 'stroke-width': 1.2 }, layer)
      Motion.endAt(b, [{ transform: 'translateY(0px)', opacity: 0 }, { transform: 'translateY(-6px)', opacity: 1, offset: 0.3 }, { transform: `translateY(${-14 - splashes() * 16}px)`, opacity: 0 }], { duration: 500 + splashes() * 500, delay: i * 140 }).then(() => b.remove(), () => b.remove())
    }
  }

  /** The paint coming off him into the water at x: swirls of `colour` spreading out, fading. */
  function swirls(x, colour) {
    for (let i = 0; i < SWIRLS; i++) {
      const dir = i % 2 ? 1 : -1
      const [dx, r] = [(splashes() - 0.5) * 70, 10 + splashes() * 10]
      const s = el('path', { d: `M${x + dx} ${POOL.y + 2} c${dir * r} ${-r * 0.4} ${dir * r * 2} ${r * 0.3} ${dir * r * 0.8} ${r * 0.5} s${-dir * r} ${-r * 0.2} ${-dir * r * 0.2} ${-r * 0.4}`, stroke: colour, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, layer)
      s.style.transformBox = 'fill-box'
      s.style.transformOrigin = 'center'
      Motion.endAt(s, [{ transform: 'scale(0.4)', opacity: 0.95 }, { transform: `scale(${2.2 + splashes()}) translateX(${dir * 12}px)`, opacity: 0 }], { duration: SWIRL_MS, delay: i * 160, easing: 'ease-out' }).then(() => s.remove(), () => s.remove())
    }
  }

  /** Drops of water flung up round a point (his head), falling away (`small`: dripping off him). */
  function drops(at, n, small = false) {
    for (let i = 0; i < n; i++) {
      const d = el('circle', { class: 'splash-drop', cx: at.x, cy: at.y + 20, r: (small ? 2 : 4) + splashes() * (small ? 2 : 4) }, layer)
      const dx = (splashes() - 0.5) * (small ? 50 : 120)
      const up = small ? 4 : 30 + splashes() * 50
      Motion.endAt(d, [{ transform: 'translate(0, 0)', opacity: 1 }, { transform: `translate(${dx / 2}px, ${-up}px)`, opacity: 1, offset: 0.4 }, { transform: `translate(${dx}px, 60px)`, opacity: 0 }], { duration: small ? 900 : 700, easing: 'ease-out' }).then(() => d.remove(), () => d.remove())
    }
  }

  /** `colour` mixed `k` of the way back to his own colour (0: all paint, 1: clean). */
  function fade(colour, k) {
    const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
    const [a, b] = [rgb(colour), rgb(BODY)]
    return `#${a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
  }

  /** The falls' water pouring on his head at x, drawn in front of him (the falls themselves are behind). */
  function pour(x) {
    pouring?.remove()
    const top = FALL.top + 40
    const head = Mole.head().y - 40
    pouring = el('g', { class: 'pouring' }, layer)
    el('path', { d: `M${x - 18} ${top} Q${x - 22} ${(top + head) / 2} ${x - 28} ${head} H${x + 28} Q${x + 22} ${(top + head) / 2} ${x + 18} ${top} Z`, fill: '#8fb6ea', opacity: 0.85, stroke: '#4f7fc6', 'stroke-width': 2 }, pouring)
    for (const dx of [-8, 4, 14]) el('path', { d: `M${x + dx} ${top + 10} v${head - top - 30}`, class: 'pour-streak', stroke: '#eef5ff', 'stroke-width': 3, 'stroke-dasharray': '14 18', 'stroke-linecap': 'round' }, pouring)
    for (const dx of [-30, -14, 2, 18, 32]) el('circle', { cx: x + dx, cy: head + 4, r: 6 + (dx % 3), fill: '#f4f8ff', stroke: '#9cb7e6', 'stroke-width': 1.2 }, pouring) // foam where it lands on him
  }

  /** The frog or the fish, drawn small for his head (in his hat slot: at its middle, its foot on his head). */
  function riderArt(kind) {
    const rider = el('g', { class: `rider ${kind}` })
    const g = el('g', { transform: `translate(0 ${RIDER_UP}) scale(${RIDER_SIZE})` }, rider)
    const line = { stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }
    if (kind === 'frog') {
      el('ellipse', { cx: 0, cy: -10, rx: 18, ry: 12, fill: '#6fae4c', ...line }, g)
      for (const dx of [-8, 8]) {
        el('circle', { cx: dx, cy: -22, r: 6, fill: '#6fae4c', ...line }, g)
        el('circle', { cx: dx, cy: -22, r: 2.5, fill: INK }, g)
      }
      el('path', { d: 'M-9 -8 q9 6 18 0', stroke: INK, 'stroke-width': 1.8, fill: 'none' }, g)
    } else {
      el('path', { d: 'M-22 -6 Q-4 -20 16 -6 Q-4 8 -22 -6 Z M16 -6 l12 -9 v18 z', fill: '#e2873a', ...line }, g)
      el('circle', { cx: -12, cy: -8, r: 2.4, fill: INK }, g)
    }
    return rider
  }

  /** Who comes up on his head after this duck, if anyone: not before he has paddled a few times, then now and
   * then; the frog if it is in the water (his splashing sent it in), else a fish. */
  function whoRides() {
    const roll = surprises() // drawn either way, so the stream stays put
    if (paddles < RIDER_AFTER || roll > RIDER_CHANCE) return null
    paddles = 0
    return Spring.underwater()[0]
  }

  /** `kind` climbs onto his head while he is under the water (once). */
  function climbOn(kind) {
    if (rider) return
    rider = { kind, node: riderArt(kind) }
    if (kind === 'frog') Spring.ride(true)
    Mole.wear(rider.node)
  }

  /** Up he comes with `kind` on his head: he rolls his eyes up at it, "ooh", shakes, and off it jumps into the water. */
  async function withRider(kind) {
    climbOn(kind)
    Debug.trace('comes up with', { who: kind }) // not `kind`: the trace's own name for the event
    Mole.perk(1.3)
    Sound.say('ooh')
    await Clock.wait(RIDER_LOOK_MS)
    await Mole.shakeOff(700)
    shakeOffRider()
    await Clock.wait(RIDER_JUMP_MS) // he watches it go back in
    Sound.say('giggle', true)
  }

  /** Whoever sits on his head jumps off into the water beside him, with a plop and rings. */
  function shakeOffRider() {
    if (!rider) return
    const { kind } = rider
    rider = null
    const node = Mole.wear(null)
    const { x, y } = Mole.head()
    const to = x + RIDER_JUMP
    if (kind === 'frog') Spring.ride(false, to)
    else Spring.rings(to)
    if (!node) return
    const g = el('g', {}, document.getElementById('drops')) // in front of him: it leaps off past his shoulder
    g.appendChild(node)
    const s = `scale(${Mole.SCALE})`
    const top = y - RIDER_LEAP
    Motion.endAt(g, [{ transform: `translate(${x}px, ${y}px) ${s}` }, { transform: `translate(${(x + to) / 2}px, ${top}px) rotate(30deg) ${s}`, offset: 0.45 }, { transform: `translate(${to}px, ${POOL.y}px) rotate(80deg) ${s}`, opacity: 0.6, offset: 0.95 }, { transform: `translate(${to}px, ${POOL.y + 10}px) rotate(80deg) ${s}`, opacity: 0 }], { duration: RIDER_JUMP_MS, easing: 'ease-in-out' }).then(() => g.remove(), () => g.remove())
    Clock.after(RIDER_JUMP_MS * 0.9, () => Sound.splash())
  }

  /** Shaking himself dry, drops flying off him. */
  async function shakeDry() {
    drops(Mole.head(), 12)
    await Mole.shakeOff(800)
  }

  // His paddles: in, a way, and out
  const PADDLES = {
    /** Kicking up splashes, leaning this way and that; a hop that splashes most of all, and a giggle. */
    async splash() {
      for (const lean of [-12, 12]) {
        Sound.splash()
        World.noise('splash', Mole.state.x, 250)
        drops({ x: Mole.state.x + lean * 3, y: POOL.y - 30 }, 5)
        await Mole.lean(lean, 500)
      }
      Sound.say('giggle', true)
      drops({ x: Mole.state.x, y: POOL.y - 30 }, 10)
      await Mole.hop(26, 520)
    },
    /** One splash too big: it goes all over his face. Eyes screwed shut, a shake, and a laugh. */
    async face() {
      Sound.splash()
      World.noise('splash', Mole.state.x, 250)
      await Mole.lean(-14, 450)
      Sound.splash()
      drops(Mole.head(), 14)
      await Mole.shakeOff(700)
      Sound.say('giggle', true)
      await Mole.handsToFace(600)
    },
    /** A deep breath, and under: bubbles come up; up he pops, and shakes his head. */
    async duck() {
      Mole.perk(1)
      await Clock.wait(300)
      const dip = Mole.dip(150, 1700)
      Clock.after(500, () => { if (edge) bubbles(Mole.state.x) }) // not if cut short meanwhile
      const who = whoRides()
      if (who) Clock.after(800, () => { if (edge) climbOn(who) }) // it climbs on while he is under (not if cut short meanwhile)
      await dip
      Sound.splash()
      Spring.rings(Mole.state.x)
      if (who) return withRider(who)
      await shakeDry()
      Sound.say('giggle', true)
    },
    /** Under the waterfall: its water on his head, eyes shut tight, and a giggle. */
    async shower() {
      pour(Mole.state.x)
      Sound.splash()
      Mole.feel('squeezed', 2400)
      for (let i = 0; i < 4; i++) {
        drops(Mole.head(), 6)
        await Clock.wait(500)
      }
      Sound.say('giggle', true)
      await Mole.handsToFace(600)
      pouring?.remove()
      pouring = null
      await shakeDry()
    },
  }
  const PLACE = { splash: WADE_X, face: WADE_X, duck: WADE_X, shower: SHOWER_X }

  /** With the frog on its pad (it joins in, never twice running): gently in, so as not to scare it; it
   * plops in anyway, right beside him, and splashes him; a start, and a jump of joy. */
  async function withFrog(alive) {
    Mole.show('three', 1)
    await Mole.lean(10, 700)
    World.noise('splash', POOL.x, 250) // the smallest splash: the frog hears it (spring.js) and plops in
    for (let i = 0; i < FROG_HEARS_MS / 100 && Spring.frog; i++) await Clock.wait(100)
    await Clock.wait(300)
    if (!alive()) return
    drops(Mole.head(), 8)
    Sound.say('fright', true)
    await Mole.shakeOff(500)
    Sound.say('giggle', true)
    await Mole.hop(26, 520)
  }

  /** A tap on the spring: in he goes, and paddles a different way each time, or with the frog. */
  async function paddle(alive) {
    let how = Spring.frog && lastPaddle !== 'frog' ? 'frog' : nextPaddle()
    lastPaddle = how
    paddles++
    Debug.trace('paddles', { how })
    await wadeIn(how === 'frog' ? WADE_X - 20 : PLACE[how], how === 'frog')
    if (!alive()) return
    if (how === 'frog' && !Spring.frog) how = 'splash' // in the water by the time he got there
    await (how === 'frog' ? withFrog(alive) : PADDLES[how]())
    if (!alive()) return
    await wadeOut()
  }

  /** After the paint: in at x, under twice, the paint coming off into the water, and out clean and shaken dry. */
  async function wash(alive, x) {
    const colour = Mole.state.painted
    await wadeIn(x)
    if (!alive()) return
    for (let i = 1; i <= WASH_DIPS; i++) {
      const dip = Mole.dip(140, 1500)
      Clock.after(450, () => {
        if (!alive()) return // cut short: he stays as painted as he is
        if (colour) swirls(x, colour)
        bubbles(x)
        if (colour) Mole.paint(i < WASH_DIPS ? fade(colour, i / WASH_DIPS) : null) // under the water, it comes off
      })
      await dip
      if (!alive()) return
      Sound.splash()
    }
    Mole.paint(null)
    await shakeDry()
    if (!alive()) return
    await wadeOut()
  }

  /** Cut short: the water's edge and its rings go (the meadow settles him on the bank). */
  function restore() {
    shakeOffRider() // cut short: whoever sat on his head jumps back into the water
    pouring?.remove()
    pouring = null
    ringing?.()
    ringing = null
    edge?.remove()
    edge = null
  }

  return { setup, paddle, wash, drops, restore, /** Is he in the water? */ get wading() { return !!edge } }
})()

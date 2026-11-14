// Under the meadow: his trips along his tunnels, and his stays down there
// (Adam, 2026-11-14). What he digs stays dug all day (tunnels.js), and the
// ground opens on all of it whenever he is under (tunnelart.js), so the
// child sees his tunnels grow through the day.
//
// A trip (tunnelTo): down where he is, along under the grass, and up where
// he is going: the bump of earth runs over him, and he crawls quickly along
// what is dug and slowly through earth, digging. A stay: a tap on the
// molehill he is in takes him down (goUnder) and he stays, seen crawling in
// the cutaway; a tap on the earth sends him crawling there (crawlTo), a tap
// on a molehill or on the grass above brings him up there (upAt), and left
// alone a while he comes up by himself in a molehill near him (upNear).
// While he stays, nothing new arrives on the meadow (meadow.js: the stage
// is elsewhere), and a waiting visitor waits.
//
// Under his home molehill his tunnels lead into his den, a room (den.js's,
// small: tunnelart.js), dug from the start. A tap on it, staying under, and
// he crawls in and rests on his pillow a different way each time (a snooze,
// plumping it first, turning round first), then wriggles up; left alone
// under at dusk, he goes there and lies down till a tap or bedtime; at
// bedtime under, he goes to bed there; in the morning he wakes there and
// climbs up his shaft (Adam, 2026-11-14).
//
// Digging new earth on his own crawls, now and then he finds something (a
// stone with a hole, a button, a snail shell, a carrot, an old key): he
// stops, "ooh", and it goes up on his back; the next time his crawl ends in
// his den, it goes on the ledge there with the rest (Adam's pick, 2026-11-14).
//
// Gestures here move him with Motion.endAt on the Clock; the meadow's cut
// calls halt(), which keeps what was dug as far as he got and leaves him
// where he is drawn.

/* global Acts, Clock, Debug, Den, Hills, Layout, Mole, Motion, Sound, TunnelArt, Tunnels, World */
/* exported Underground */
const Underground = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND
  const PACE = { crawl: 0.8, dig: 2.2 } // ms a scene unit: along what he has dug, and digging through earth (slow enough to watch him crawl along it, Adam 2026-11-11)
  const MIN_MS = 800 // the shortest trip takes this long
  const NEAR = 30 // a crawl shorter than this, he is there already: a wriggle instead
  const UP_NEAR = 500 // left alone under, he comes up in a molehill this near him, if there is one; else where he is
  const ALONE_MS = 15000 // left alone under this long, he comes up by himself (never stuck down there)
  const DROP_MS = 320 // down the shaft into the tunnel, or up it
  const DIG_UP_MS = 450 // digging the way up where there is no molehill yet
  const SHAFT_DROP = 90 // how far up the shaft he is seen as he drops in or climbs out
  const WRIGGLE_MS = 500 // a tap where he is: a happy wriggle
  const SNIFF_EVERY = 420 // staying under, a crawl longer than this may stop partway for a sniff…
  const SNIFF_CHANCE = 0.55 // …this often for each such stretch…
  const SNIFF_MS = [500, 900] // …stopping this long, nose up
  const CLOD_EVERY_MS = 170 // digging, a clod of earth flung back this often
  const FINDS = ['stone', 'button', 'shell', 'carrot', 'key'] // what turns up, each once, in an order each play draws
  const FIND_FROM = 150 // a stretch of new earth at least this long may turn something up…
  const FIND_CHANCE = 0.4 // …this often
  const IDLE_MS = [2500, 5500] // just there in his tunnel, now and then a sniff, a look back, a stretch
  const LOOK_BACK_MS = 800 // looking back over his shoulder, this long
  const IDLE_CHECK_MS = 300
  const BURROW_EVERY_MS = 250 // going along, his bump makes a soft noise this often…
  const BURROW_REACH = 170 // …heard this far: the earth's life and the meadow above mind it (soillife.js, spring.js, critters.js)
  const HOME = Layout.HOME
  const NAP_MS = 2600 // a snooze on his pillow in his den
  const TURN_MS = 350 // turning round before he lies down, each way
  const WAKE_MS = 700 // in the morning, seen a moment in his den before he climbs up
  const LONG_REST_STEP_MS = 500 // resting at dusk: he lies there until a tap or bedtime, checked this often
  const RESTS = ['snooze', 'plump', 'turn'] // how he rests in his den
  const rests = Debug.random('meadow-den-rests') // which way: its own, so nothing else shifts
  const ways = Debug.random('meadow-crawl') // where he stops to sniff, the clods, what he does just there: its own
  const luck = Debug.random('meadow-finds') // what he finds, and when: its own
  let lastRest = null

  const net = Tunnels.make()
  let bumpLayer = null
  let bump = null // the bump of earth over him as he goes along
  let movers = null // who is in the tunnel now (tunnelart.js movers): him, and whoever follows
  let going = null // the trip under way: { from, x, dir, followers, leg } (a cut keeps what was dug)
  let facing = -1 // which way he last went (1 right)
  let extra = null // a stretch being dug: its earth shown already
  let rustle = null // stops the bump's noise
  let free = () => false // the meadow's: nobody tapping, nothing under way
  let nextIdle = 0 // when he may next do something by himself, just there in his tunnel
  let idling = 0 // which of his little moves is under way (a new one, or a trip, ends it)
  let toFind = null // what is still to be found this play, in order (drawn at setup)
  let carrying = null // what he has found and carries on his back, to take home
  const kept = [] // what he has brought home, on his den's ledge

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const bumpAt = (x) => `translate(${x}px, ${Y + 14}px)`
  const under = () => Mole.state.pose === 'under'

  /** The cutaway into `layer`, the earth all along into `deep`, the bump over him into `ground`. */
  function setup(layer, deep, ground, hooks = {}) {
    free = hooks.free || free
    toFind = Acts.pool(FINDS, luck) // each once, in this play's order
    Clock.every(IDLE_CHECK_MS, idle)
    TunnelArt.setup(layer, deep, Den.room(), Den.ROOM, HOME)
    Tunnels.dig(net, HOME - TunnelArt.DEN_HALF, HOME + TunnelArt.DEN_HALF) // his den: there from the start
    bumpLayer = ground
  }

  /** Draw what is dug again (a molehill made or sunk changes the shafts): only while it shows. */
  function redraw() {
    if (bumpLayer && TunnelArt.shown) TunnelArt.draw(net, Hills.xs(), extra)
  }

  /** Open the ground on all that is dug. */
  function open() {
    TunnelArt.open()
    redraw()
  }

  /** Him alone in the tunnel at x, still, facing the way he last went. */
  function rest(x) {
    movers = TunnelArt.movers(x, facing, x - 200, x + 200)
  }

  /**
   * The way to x in pieces, each to be crawled in one go: the legs (dug or not), and, `natural` (staying under,
   * his own crawl), long stretches broken where he stops a moment to sniff. Each piece: { from, to, dug, pause }.
   */
  function pieces(legs, natural) {
    const out = []
    for (const leg of legs) {
      const len = Math.abs(leg.to - leg.from)
      const dir = Math.sign(leg.to - leg.from)
      let at = leg.from
      if (natural) {
        for (let left = len; left > SNIFF_EVERY; left -= SNIFF_EVERY) {
          const roll = ways()
          const stop = at + dir * SNIFF_EVERY * (0.4 + 0.5 * ways())
          if (roll < SNIFF_CHANCE) {
            out.push({ from: at, to: stop, dug: leg.dug, pause: true })
            at = stop
          }
        }
      }
      out.push({ from: at, to: leg.to, dug: leg.dug, pause: false })
    }
    return out
  }

  /**
   * Along under the grass from where he is to x: quickly through what is dug, slowly digging through earth
   * (tunnels.js legs), crawling as he goes, the bump over him and the view after him (his figure goes along too,
   * out of sight). He gets going and slows to a stop rather than gliding; digging, he flings earth back; `natural`
   * (his own crawl, staying under) he stops now and then for a sniff. `followers` ([{ draw(g), scale }]) come behind.
   */
  async function along(x, followers = [], natural = false) {
    const from = Mole.state.x
    if (Math.abs(x - from) < 1) return
    const dir = (facing = x < from ? -1 : 1)
    const legs = Tunnels.legs(net, from, x)
    const total = Tunnels.duration(net, from, x, PACE)
    const k = total < MIN_MS ? MIN_MS / total : 1
    const parts = pieces(legs, natural)
    extra = [from, x]
    open()
    movers = TunnelArt.movers(from, dir, Math.min(from, x), Math.max(from, x), followers)
    bump = el('ellipse', { cx: 0, cy: 0, rx: 30, ry: 12, fill: '#6e4a24' }, bumpLayer)
    bump.style.transform = bumpAt(from)
    rustle = Clock.every(BURROW_EVERY_MS, () => {
      const at = burrowX()
      if (at !== null) World.noise('burrow', at, BURROW_REACH)
    })
    const mine = (going = { from, x, dir, followers, leg: null })
    Debug.trace('digs along', { from: Math.round(from), to: Math.round(x), dug: legs.filter((l) => l.dug).length, new: legs.filter((l) => !l.dug).length, stops: parts.filter((p) => p.pause).length })
    try {
      for (const [i, part] of parts.entries()) {
        going.leg = part
        await crawl(part, from, dir, k, easeFor(i === 0 || parts[i - 1].pause, part.pause || i === parts.length - 1))
        await after(part, natural)
      }
      if (carrying && Math.abs(x - HOME) <= TunnelArt.DEN_HALF) keep() // home in his den with it: on the ledge
    } finally {
      if (going === mine) arrived() // cut short, halt() has seen to it already, and another trip may be under way
    }
  }

  /** How a piece of the way goes: he gets going where he `starts`, and slows to a stop where he `stops`. */
  const easeFor = (starts, stops) => (starts && stops ? 'ease-in-out' : starts ? 'ease-in' : stops ? 'ease-out' : 'linear')

  /** One piece of the way, crawled in one go (`from` where the trip began, `k` its pace): digging, earth flung back. */
  async function crawl(part, from, dir, k, easing) {
    const ms = Math.abs(part.to - part.from) * (part.dug ? PACE.crawl : PACE.dig) * k
    const opts = { duration: ms, easing }
    const paths = part.dug ? [] : TunnelArt.digging(part.from, part.to)
    TunnelArt.act('crawling', true)
    TunnelArt.act('digging', !part.dug)
    const flinging = part.dug ? null : Clock.every(CLOD_EVERY_MS, () => TunnelArt.clod(Mole.drawnX() + dir * 60, dir, ways))
    try {
      await Promise.all([
        Mole.glide(part.to, ms, 0, easing),
        Motion.endAt(bump, [{ transform: bumpAt(part.from) }, { transform: bumpAt(part.to) }], opts),
        Motion.endAt(movers, [{ transform: `translateX(${part.from - from}px)` }, { transform: `translateX(${part.to - from}px)` }], opts),
        ...paths.map((p) => Motion.endAt(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], opts)),
      ])
    } finally {
      flinging?.()
      TunnelArt.act('crawling', false)
      TunnelArt.act('digging', false)
    }
  }

  /**
   * Just there in his tunnel, staying under, nobody tapping: now and then a sniff, a look back over his shoulder,
   * or his hands paddling a moment where he is. Only how he is drawn (as his looking about up on the grass,
   * mole.js): a tap or a trip takes over at once. None in a still play.
   */
  function idle() {
    if (Debug.still || Mole.state.pose !== 'under' || going || !movers || !free() || Clock.now() < nextIdle) return
    nextIdle = Clock.now() + IDLE_MS[0] + ways() * (IDLE_MS[1] - IDLE_MS[0])
    const mine = ++idling
    const roll = ways()
    const still = () => mine === idling && !going && Mole.state.pose === 'under' && free()
    Debug.trace('in his tunnel', { does: roll < 0.45 ? 'sniff' : roll < 0.8 ? 'look back' : 'paddle' })
    if (roll < 0.45) return sniff(SNIFF_MS[0])
    if (roll < 0.8) return lookBack(still)
    TunnelArt.act('crawling', true) // paddling a moment where he is
    Clock.after(600, () => TunnelArt.act('crawling', false))
  }

  /** A look back over his shoulder, and round again (if nothing else has begun meanwhile). */
  function lookBack(still) {
    facing = -facing
    rest(Mole.state.x)
    Clock.after(LOOK_BACK_MS, () => {
      facing = -facing
      if (still()) rest(Mole.state.x)
    })
  }

  /** A piece of the way crawled: what was dug is kept; digging his own way, something may turn up; a stop for a sniff. */
  async function after(part, natural) {
    if (!part.dug) Tunnels.dig(net, part.from, part.to)
    if (natural && !part.dug) await find(part)
    if (part.pause) await sniff(SNIFF_MS[0] + ways() * (SNIFF_MS[1] - SNIFF_MS[0]))
  }

  /** After a stretch of new earth: now and then something turns up, and he takes it on his back (one at a time). */
  async function find(part) {
    const roll = luck() // drawn either way, so the stream stays put
    if (carrying || kept.length >= FINDS.length || Math.abs(part.to - part.from) < FIND_FROM || roll > FIND_CHANCE) return
    const kind = toFind()
    Debug.trace('finds', { find: kind }) // not `kind`: the trace's own name for the event
    TunnelArt.act('sniff', true)
    Sound.say('ooh', true)
    await TunnelArt.unearth(kind, Mole.state.x, facing)
    TunnelArt.act('sniff', false)
    carrying = kind
    TunnelArt.carry(kind)
  }

  /** What he carries, onto the ledge in his den. */
  function keep() {
    kept.push(carrying)
    Debug.trace('keeps', { find: carrying, kept: kept.length })
    carrying = null
    TunnelArt.carry(null)
    TunnelArt.shelf(kept)
    Sound.say('giggle', true)
  }

  /** A stop to sniff: his head up, his nose twitching, for `ms`. */
  async function sniff(ms) {
    TunnelArt.act('sniff', true)
    await Clock.wait(ms)
    TunnelArt.act('sniff', false)
  }

  /** The trip is over, or cut short: what was dug stays, the bump goes, he is where he is drawn. */
  function arrived() {
    const { leg } = going
    const x = Mole.state.x // a cut has put him where he is drawn (Mole.relax)
    if (leg && !leg.dug) Tunnels.dig(net, leg.from, x)
    going = null
    extra = null
    rustle?.()
    rustle = null
    bump?.getAnimations().forEach((a) => a.cancel())
    bump?.remove()
    bump = null
    TunnelArt.dug()
    redraw()
  }

  /** Up the shaft at x and out of sight, the movers `dx` along from where they were drawn: the way up dug
   * first if there is no molehill there yet. */
  async function climb(x, dx) {
    if (!Hills.at(x)) {
      const paths = TunnelArt.diggingUp(x)
      await Promise.all(paths.map((p) => Motion.endAt(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: DIG_UP_MS })))
    }
    if (movers) await Motion.endAt(movers, [{ transform: `translate(${dx}px, -${SHAFT_DROP}px)` }], { duration: DROP_MS, easing: 'ease-in' })
  }

  /**
   * A trip: from where he is (down already) along to x, and up the shaft there, out of sight; the ground
   * stays open a moment as he comes up (the caller brings him up: Mole.comeUp). `followers` come behind.
   */
  async function tunnelTo(x, followers = []) {
    const from = Mole.state.x
    await along(x, followers)
    await climb(x, x - from)
    TunnelArt.empty()
    TunnelArt.shut()
  }

  /** Down the molehill he is in, and he stays: the ground opens, and he drops into his tunnel. */
  async function goUnder() {
    const x = Mole.state.x
    Debug.trace('goes under', { x: Math.round(x) })
    Sound.dig()
    await Mole.goDown()
    Mole.put(x, 'under')
    open()
    rest(x)
    await Motion.endAt(movers, [{ transform: `translateY(-${SHAFT_DROP}px)` }, { transform: 'translateY(0px)' }], { duration: DROP_MS, easing: 'ease-out' })
  }

  /** Staying under: crawl to x along his tunnel (digging on where it ends); a tap where he is, a wriggle. */
  async function crawlTo(x) {
    const from = Mole.state.x
    if (Math.abs(x - from) < NEAR) return wriggle()
    await along(x, [], true)
    Mole.put(x, 'under')
    rest(x)
  }

  /** A tap on him down there: a wriggle of joy, and now and then a giggle. */
  async function wriggle() {
    Sound.say('giggle', true)
    rest(Mole.state.x)
    await Motion.endAt(movers, [{ transform: 'translateY(0px)' }, { transform: 'translateY(-14px)', offset: 0.3 }, { transform: 'translateY(0px)', offset: 0.6 }, { transform: 'translateY(-8px)', offset: 0.8 }, { transform: 'translateY(0px)' }], { duration: WRIGGLE_MS })
  }

  /** Staying under: along to x and up there, in its molehill (one made if there is none). */
  async function upAt(x) {
    await along(x, [], true)
    Mole.put(x, 'down') // on his way up: no longer staying
    rest(x)
    await climb(x, 0)
    TunnelArt.empty()
    TunnelArt.shut()
    if (!Hills.at(x)) Hills.make(x)
    Sound.pop()
    await Mole.comeUp('hill')
    Mole.perk(0.7)
  }

  /** Left alone under: up in a molehill near him, or, with none near, where he is. */
  const upNear = () => upAt(Tunnels.nearest(Hills.xs(), Mole.state.x, UP_NEAR) ?? Mole.state.x)

  /** Him lying asleep on his pillow in his den (the crawler gone), or up again, crawling, where he is. */
  function lieDown(on) {
    TunnelArt.asleep(on)
    if (on) {
      TunnelArt.empty()
      movers = null
    } else rest(Mole.state.x)
  }

  // How he rests in his den, a tap on it: each ends with him up and crawling again
  const WAYS = {
    /** On his pillow, asleep a moment, z's drifting up; up, and a wriggle. */
    async snooze() {
      lieDown(true)
      await Clock.wait(NAP_MS)
      lieDown(false)
      await wriggle()
    },
    /** Pillow first: he bumps it into shape, twice; then a short snooze, and a giggle. */
    async plump() {
      await wriggle()
      await wriggle()
      lieDown(true)
      await Clock.wait(NAP_MS * 0.6)
      lieDown(false)
      Sound.say('giggle', true)
    },
    /** Round he turns, and back, as an animal does before it lies down; then a snooze. */
    async turn() {
      for (let i = 0; i < 2; i++) {
        facing = -facing
        rest(Mole.state.x)
        await Clock.wait(TURN_MS)
      }
      lieDown(true)
      await Clock.wait(NAP_MS * 0.7)
      lieDown(false)
      Sound.say('giggle', true)
    },
  }

  /** A way to rest, never the same twice running. */
  function pickRest() {
    const left = RESTS.filter((w) => w !== lastRest)
    return (lastRest = left[Math.floor(rests() * left.length)])
  }

  /** Staying under: into his den and a rest on his pillow; `long` (left alone at dusk), lying there till cut short. */
  async function restInDen(alive, long = false) {
    if (Math.abs(Mole.state.x - HOME) >= NEAR) await crawlTo(HOME)
    if (!alive()) return
    const how = long ? 'long' : pickRest()
    Debug.trace('rests', { how })
    if (!long) return WAYS[how]()
    lieDown(true)
    while (alive()) await Clock.wait(LONG_REST_STEP_MS)
  }

  /** Bedtime, staying under: along to his den, and down on his pillow to sleep (the night's den is this room). */
  async function toBed() {
    if (Math.abs(Mole.state.x - HOME) >= NEAR) await crawlTo(HOME)
    lieDown(true)
    Mole.put(HOME, 'down') // asleep in his den: no longer about in his tunnels
  }

  /** Morning: the ground opens on him in his den, and he climbs up his shaft (Mole.comeUp brings him up). */
  async function wakeUp() {
    Debug.trace('wakes in his den')
    open()
    rest(HOME)
    await Clock.wait(WAKE_MS) // there he is, in his den
    await climb(HOME, 0)
    TunnelArt.empty()
    movers = null
    TunnelArt.shut()
  }

  /** Cut short (the meadow's cutShort, after Mole.relax): what was dug as far as he got stays; staying under,
   * he rests in his tunnel where he is drawn, else nobody is left in it and the ground closes. */
  function halt() {
    TunnelArt.asleep(false)
    if (going) arrived()
    movers?.getAnimations().forEach((a) => a.cancel())
    if (under()) {
      open()
      rest(Mole.state.x)
    } else {
      TunnelArt.empty()
      movers = null
      TunnelArt.shut()
    }
  }

  /** Where the bump of his tunnel is drawn now, or null when he isn't going along (for whoever it passes under). */
  function burrowX() {
    const b = bump
    const t = b && getComputedStyle(b).transform
    return t && t !== 'none' ? new DOMMatrixReadOnly(t).e : null
  }

  /** In his tunnel, at x? (down a molehill's shaft, or along a run he has dug) */
  const inTunnel = (x) => Tunnels.dug(net, x) || Hills.at(x)

  return {
    setup, redraw, tunnelTo, goUnder, crawlTo, upAt, upNear, restInDen, toBed, wakeUp, halt, burrowX, inTunnel, ALONE_MS,
    /** What he has dug (tunnels.js runs), for the overlay and the tests. */
    get runs() { return Tunnels.runs(net).map(({ from, to }) => [Math.round(from), Math.round(to)]) },
    /** What he carries, and what he has kept in his den, for the overlay and the tests. */
    get finds() { return { carrying, kept: [...kept] } },
  }
})()

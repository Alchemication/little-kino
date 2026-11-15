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

/* global Acts, Clock, Debug, Den, Hills, Layout, Mole, Motion, Sound, Things, TunnelArt, Tunnels, World */
/* exported Underground */
const Underground = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND
  // How he moves (Adam, 2026-11-15: he slid along too fast, "like slides"; make it a real mole's). One loop on the
  // Clock moves him, and draws him, his bump and what he digs from where he is each frame: a cut leaves all of it
  // where it is drawn (four animations side by side once jumped apart when cut).
  const SCURRY_MS = 2.4 // along what he has dug: ms a scene unit, a quick scurry, his paws a blur (was 0.8: a slide)
  const SCURRY_MIN_MS = 350 // the shortest scurry
  const BACK_SLOW = 1.8 // backing up is this much slower than scurrying on
  const BACK_UP = 200 // staying under, a way back shorter than this along what is dug: he backs up, not turns round (a
  // mole's fur lies either way, so it can reverse along its tunnel: Mammal Society, Wildlife Trusts)
  const STROKE = 26 // digging new earth, stroke by stroke, one forepaw then the other (a mole braces and shears the
  // earth with one, then the other): each stroke takes him this far…
  const STROKE_MS = 320 // …over this long (so about 80 units a second, a third of the old pace)…
  const REACH = 0.45 // …its first part his paw reaching into the earth, him still; then the pull that moves him on
  const NOSE_MS = 700 // staying under, at the face of new earth or at the oak's roots, his nose taps it first (a mole feels its way with its nose)
  const SHAFT_SNIFF = 0.5 // staying under, passing under a molehill, he stops this often to sniff up its shaft
  const SPOIL_FROM = 140 // after digging at least this much new earth, staying under…
  const SPOIL_CHANCE = 0.4 // …this often he pushes the loose earth back and up a shaft, and a molehill rises (molehills are a mole's spoil)
  const SPOIL_BACK = 150 // the shaft goes up this far back along what he has just dug
  const SPOIL_PUSH_MS = 1100 // pushing it there, slowly: it is heavy
  const SPOIL_UP_MS = 900 // up the shaft it goes
  const HILL_ROOM = 110 // no molehill pushed up nearer than this to another, his flowers, the spring, the wild flowers, the
  // painter's garden, or anything an encounter keeps there all day (Things.keeps)
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
  const spoils = Debug.random('meadow-spoil') // when he pushes earth up into a molehill: its own, so nothing else shifts
  const luck = Debug.random('meadow-finds') // what he finds, and when: its own
  let lastRest = null

  const net = Tunnels.make()
  let bumpLayer = null
  let bump = null // the bump of earth over him as he goes along
  let movers = null // who is in the tunnel now (tunnelart.js movers): him, and whoever follows…
  let moversAt = 0 // …drawn from here (they are moved by the distance from it)
  let heap = null // the loose earth he is pushing up into a molehill, while he does
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
    moversAt = x
  }

  /** As far as his tunnels go: the oak's roots at the left, the painter's garden at the right. */
  const reach = (x) => Math.max(Layout.UNDER.from, Math.min(Layout.UNDER.to, x))

  /**
   * The way to x in pieces, each moved in one go: the legs (dug or not), and, `natural` (staying under, his own
   * crawl), long stretches broken where he stops a moment to sniff, and under a molehill now and then to sniff up
   * its shaft. Each piece: { from, to, dug, pause: false | 'sniff' | 'shaft' }.
   */
  function pieces(legs, natural) {
    const out = []
    for (const leg of legs) {
      const len = Math.abs(leg.to - leg.from)
      const dir = Math.sign(leg.to - leg.from)
      const stops = natural ? stopsOn(leg, len, dir) : []
      let at = leg.from
      for (const [stop, pause] of stops.sort((a, b) => (a[0] - b[0]) * dir)) {
        if ((stop - at) * dir < NEAR) continue
        out.push({ from: at, to: stop, dug: leg.dug, pause })
        at = stop
      }
      out.push({ from: at, to: leg.to, dug: leg.dug, pause: false })
    }
    return out
  }

  /** Where he stops along a leg, staying under: now and then to sniff, and under a molehill to sniff up its shaft. */
  function stopsOn(leg, len, dir) {
    const stops = []
    let at = leg.from
    for (let left = len; left > SNIFF_EVERY; left -= SNIFF_EVERY) {
      const roll = ways()
      const stop = at + dir * SNIFF_EVERY * (0.4 + 0.5 * ways())
      if (roll < SNIFF_CHANCE) stops.push([stop, 'sniff'])
      at = stop
    }
    const under = (h) => (h - leg.from) * dir > NEAR && (leg.to - h) * dir > NEAR
    if (leg.dug) for (const h of Hills.xs().filter(under)) if (ways() < SHAFT_SNIFF) stops.push([h, 'shaft'])
    return stops
  }

  /** A short way back along what is dug: he backs up, not turns round. */
  const backsUp = (dir, len, legs) => dir !== facing && len < BACK_UP && legs.every((l) => l.dug)

  /** The trip begins: the ground open on it, him and who follows drawn at `from`, the bump over him, its noise. */
  function setOff(from, x, followers) {
    extra = [from, x]
    open()
    movers = TunnelArt.movers(from, facing, Math.min(from, x), Math.max(from, x), followers)
    moversAt = from
    bump = el('ellipse', { cx: 0, cy: 0, rx: 30, ry: 12, fill: '#6e4a24' }, bumpLayer)
    bump.style.transform = bumpAt(from)
    rustle = Clock.every(BURROW_EVERY_MS, () => {
      const at = burrowX()
      if (at !== null) World.noise('burrow', at, BURROW_REACH)
    })
  }

  /** Each piece of the way in turn, and what comes after it; staying under (`natural`), his nose taps the face of
   * new earth before he digs into it. */
  async function go(parts, mine, natural, backing) {
    for (const [i, part] of parts.entries()) {
      going.leg = part
      const before = parts[i - 1]
      if (natural && !part.dug && (!before || before.dug)) await noseTap() // the face of new earth: feel it first
      await move(part, mine, { backing, starts: !before || !!before.pause, stops: !!part.pause || i === parts.length - 1 })
      await after(part, natural, mine)
    }
  }

  /**
   * Along under the grass from where he is to x (as far as his tunnels go: reach): scurrying through what is dug,
   * digging stroke by stroke through earth, the bump over him and the view after him (his figure goes along
   * too, out of sight). `natural` (his own crawl, staying under): he backs up a short way rather than turn round,
   * his nose taps the face of new earth before he digs, he stops now and then to sniff, and he may push the
   * loose earth up into a molehill. `followers` ([{ draw(g), scale }]) come behind. Returns where he got to.
   */
  async function along(to, followers = [], natural = false) {
    const x = reach(to)
    const from = Mole.state.x
    if (Math.abs(x - from) < 1) return x
    const dir = x < from ? -1 : 1
    const legs = Tunnels.legs(net, from, x)
    const backing = natural && !followers.length && backsUp(dir, Math.abs(x - from), legs)
    if (!backing) facing = dir
    const parts = pieces(legs, natural)
    setOff(from, x, followers)
    const mine = (going = { from, x, dir, followers, leg: null })
    Debug.trace('digs along', { from: Math.round(from), to: Math.round(x), dug: legs.filter((l) => l.dug).length, new: legs.filter((l) => !l.dug).length, stops: parts.filter((p) => p.pause).length, backing })
    try {
      await go(parts, mine, natural, backing)
      if (natural && x !== to && x === Layout.UNDER.from) await roots()
      if (carrying && Math.abs(x - HOME) <= TunnelArt.DEN_HALF) keep() // home in his den with it: on the ledge
    } finally {
      if (going === mine) arrived() // cut short, halt() has seen to it already, and another trip may be under way
    }
    return x
  }

  const cutShort = () => Object.assign(new Error('cut short'), { name: 'AbortError' })

  /** Him, his bump and his crawling figure at x, and what he is digging this far dug (`p`, 0 to 1). */
  function place(x, paths = [], p = 0) {
    Mole.at(x)
    if (bump) bump.style.transform = bumpAt(x)
    if (movers) movers.style.transform = `translateX(${x - moversAt}px)`
    for (const path of paths) path.style.strokeDashoffset = String(1 - p)
  }

  /**
   * Moves him from a to b over `ms`, frame by frame on the Clock: `shape(t)` says how far along at t (0 to 1);
   * `each(t)` hears every frame; `paths`, what he digs as he goes. Ends with an AbortError if the trip is cut
   * short meanwhile (halt).
   */
  async function drive(a, b, ms, shape, mine, { paths = [], each = () => {} } = {}) {
    const start = Clock.now()
    for (;;) {
      if (going !== mine) throw cutShort()
      const t = Math.min(1, (Clock.now() - start) / ms)
      const p = shape(t)
      place(a + (b - a) * p, paths, p)
      each(t)
      if (t >= 1) return
      await Clock.frame()
    }
  }

  // how far along a scurry is at t: getting going where it `starts`, slowing to a stop where it `stops`
  const scurry = (starts, stops) => (t) => (starts && stops ? (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2) : starts ? t * t : stops ? 1 - (1 - t) ** 2 : t)
  // how far along n strokes of digging are at t: each a reach (still), then a pull that slows as it ends
  const strokes = (n) => (t) => {
    const s = Math.min(n, t * n)
    const i = Math.floor(s)
    const f = s - i
    return i >= n ? 1 : (i + (f < REACH ? 0 : 1 - (1 - (f - REACH) / (1 - REACH)) ** 2)) / n
  }

  /** One piece of the way: scurrying (or backing) along what is dug, or digging stroke by stroke, earth flung back each stroke. */
  async function move(part, mine, { backing, starts, stops }) {
    const len = Math.abs(part.to - part.from)
    if (part.dug) {
      const ms = Math.max(SCURRY_MIN_MS, len * SCURRY_MS * (backing ? BACK_SLOW : 1))
      TunnelArt.act(backing ? 'backing' : 'crawling', true)
      try {
        await drive(part.from, part.to, ms, scurry(starts, stops), mine, { each: () => Sound.scurry() })
      } finally {
        TunnelArt.act(backing ? 'backing' : 'crawling', false)
      }
      return
    }
    const n = Math.max(1, Math.round(len / STROKE))
    const paths = TunnelArt.digging(part.from, part.to)
    const dir = Math.sign(part.to - part.from)
    let stroke = 0 // the strokes whose pull has begun
    TunnelArt.pace(STROKE_MS)
    TunnelArt.act('digging', true)
    try {
      await drive(part.from, part.to, n * STROKE_MS, strokes(n), mine, { paths, each: (t) => {
        const now = Math.floor(t * n + 1 - REACH) // a stroke's pull begins: a clod flies back
        if (now > stroke && now <= n) {
          stroke = now
          TunnelArt.clod(Mole.state.x + dir * 60, dir, ways)
          Sound.scrape()
        }
      } })
    } finally {
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

  /** A piece of the way gone: what was dug is kept; digging his own way, something may turn up, or he pushes the
   * loose earth up into a molehill; a stop for a sniff, or a sniff up a molehill's shaft. */
  async function after(part, natural, mine) {
    if (!part.dug) Tunnels.dig(net, part.from, part.to)
    if (natural && !part.dug) {
      const found = await find(part)
      const roll = spoils() // drawn either way, so the stream stays put
      if (!found && Math.abs(part.to - part.from) >= SPOIL_FROM && roll < SPOIL_CHANCE) await spoil(mine)
    }
    if (part.pause === 'sniff') await sniff(SNIFF_MS[0] + ways() * (SNIFF_MS[1] - SNIFF_MS[0]))
    if (part.pause === 'shaft') await sniff(SNIFF_MS[1], 'sniff-up')
  }

  /** His nose taps the earth ahead, feeling it: at the face of new earth, before he digs. */
  async function noseTap() {
    Debug.trace('feels ahead', { x: Math.round(Mole.state.x) })
    TunnelArt.act('nose', true)
    try {
      await Clock.wait(NOSE_MS)
    } finally {
      TunnelArt.act('nose', false)
    }
  }

  /** The oak's roots, as far as he can go: his nose taps them, a sniff, and no further. */
  async function roots() {
    Debug.trace('at the roots')
    await noseTap()
    await sniff(SNIFF_MS[0])
  }

  /** The heap he was pushing, gone (pushed up, or a cut: halt). */
  function dropHeap() {
    heap?.getAnimations().forEach((a) => a.cancel())
    heap?.remove()
    heap = null
  }

  /** Whether a molehill can come up at x: free grass, clear of other molehills and of what stands there. */
  function room(x) {
    const { BED, SPRING, POOL, WILD, FENCE, UNDER } = Layout
    const clear = (a, b) => x + HILL_ROOM <= a || x - HILL_ROOM >= b
    return Hills.xs().every((h) => Math.abs(h - x) >= 2 * HILL_ROOM) && clear(BED.from, BED.to) && clear(SPRING - POOL, SPRING + POOL) &&
      clear(WILD.x - WILD.w / 2, WILD.x + WILD.w / 2) && x + HILL_ROOM < FENCE.from && x - HILL_ROOM > UNDER.from && !Things.keeps(x - HILL_ROOM, x + HILL_ROOM)
  }

  /**
   * The earth he has dug, pushed up out of his way, as a mole does (its molehills are this spoil): he turns round,
   * pushes the loose heap back along his tunnel to below free grass, and up the shaft it goes, and a molehill
   * rises on the meadow above. Then he turns back. Nothing if there is no room there.
   */
  async function spoil(mine) {
    const x = Mole.state.x
    const shaft = x - facing * SPOIL_BACK
    if (!room(shaft)) return
    Debug.trace('pushes up earth', { x: Math.round(shaft) })
    facing = -facing
    const stop = shaft - facing * TunnelArt.HANDS // where he stands, the heap at his hands under the shaft
    rest(x)
    heap = TunnelArt.spoil(x + facing * TunnelArt.HANDS)
    TunnelArt.act('pushing', true)
    try {
      await drive(x, stop, SPOIL_PUSH_MS, scurry(true, true), mine, { each: () => heap && TunnelArt.moveSpoil(heap, Mole.state.x + facing * TunnelArt.HANDS) })
      TunnelArt.act('pushing', false)
      Sound.trickle()
      await TunnelArt.raiseSpoil(heap, shaft, SPOIL_UP_MS)
      if (going !== mine) throw cutShort()
      Hills.make(shaft)
      Sound.pop()
      facing = -facing
      rest(stop)
    } finally {
      TunnelArt.act('pushing', false)
      dropHeap()
    }
    TunnelArt.act('crawling', true) // back to where he was digging, to dig on
    try {
      await drive(stop, x, Math.max(SCURRY_MIN_MS, Math.abs(x - stop) * SCURRY_MS), scurry(true, true), mine)
    } finally {
      TunnelArt.act('crawling', false)
    }
  }

  /** After a stretch of new earth: now and then something turns up, and he takes it on his back (one at a time).
   * True if something did. */
  async function find(part) {
    const roll = luck() // drawn either way, so the stream stays put
    if (carrying || kept.length >= FINDS.length || Math.abs(part.to - part.from) < FIND_FROM || roll > FIND_CHANCE) return false
    const kind = toFind()
    Debug.trace('finds', { find: kind }) // not `kind`: the trace's own name for the event
    TunnelArt.act('sniff', true)
    Sound.say('ooh', true)
    await TunnelArt.unearth(kind, Mole.state.x, facing)
    TunnelArt.act('sniff', false)
    carrying = kind
    TunnelArt.carry(kind)
    return true
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

  /** A stop to sniff: his head up (`how` 'sniff-up': right up a shaft), his nose twitching, for `ms`. */
  async function sniff(ms, how = 'sniff') {
    TunnelArt.act(how, true)
    try {
      await Clock.wait(ms)
    } finally {
      TunnelArt.act(how, false)
    }
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
  async function tunnelTo(to, followers = []) {
    const x = await along(to, followers)
    await climb(x, x - moversAt)
    TunnelArt.empty()
    TunnelArt.shut()
    return x
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
  async function crawlTo(to) {
    const from = Mole.state.x
    if (Math.abs(reach(to) - from) < NEAR) return reach(to) === to ? wriggle() : roots()
    const x = await along(to, [], true)
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
  async function upAt(to) {
    const x = await along(to, [], true)
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
    dropHeap()
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

  /** Where his crawling figure is drawn now (scene x), or null: it must never part from where he is (the tests). */
  function crawlerX() {
    const t = movers && getComputedStyle(movers).transform
    return movers ? moversAt + (t && t !== 'none' ? new DOMMatrixReadOnly(t).e : 0) : null
  }

  /** In his tunnel, at x? (down a molehill's shaft, or along a run he has dug) */
  const inTunnel = (x) => Tunnels.dug(net, x) || Hills.at(x)

  return {
    setup, redraw, tunnelTo, goUnder, crawlTo, upAt, upNear, restInDen, toBed, wakeUp, halt, burrowX, crawlerX, inTunnel, ALONE_MS,
    /** What he has dug (tunnels.js runs), for the overlay and the tests. */
    get runs() { return Tunnels.runs(net).map(({ from, to }) => [Math.round(from), Math.round(to)]) },
    /** What he carries, and what he has kept in his den, for the overlay and the tests. */
    get finds() { return { carrying, kept: [...kept] } },
  }
})()

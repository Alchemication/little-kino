// What the mole does left alone, pottering about his home (Adam, 2026-11-14:
// idle fun, as Reksio has in the yard), made from his habits in the films
// (worlds/krtek/world.yaml, gestures): he looks about, ponders with a hand to
// his chin, scratches his head, sways humming to himself, strolls a few steps
// and looks round, ducks down into his molehill and pops up again, pats a
// molehill tidy, sniffs a flower, waves out at the child, has a stretch, a
// little hop; and once a day, at midday, he waters his tulips (watering.js).
// Calmer and sparser than the yard's: a few seconds between.
//
// Which one comes is weighted by the hour (Adam's pick B): mornings more
// stretching, looking about and hopping; the day the strolls and the
// pottering; late afternoon swaying and stretching (yawns). At dusk he goes
// home to listen to the cricket (meadow.js), so nothing starts then. The
// choosing is shared (acts.js); each move here runs as his gesture, so a tap
// cuts it short like any other. Nothing in a ?still play, none in the rain,
// none while a threat is about, and none staying under (he comes up first by
// himself: underground.js).

/* global Acts, Clock, Day, Debug, Hills, Layout, Mole, Sound, Watering */
/* exported Alone */
const Alone = (() => {
  const FIRST_MS = 4000 // left alone this long, he starts pottering
  const GAP_MS = [4500, 9000] // then something new every 4.5–9 s: calm (the yard's is 1.5–3.5)
  const STROLL = [120, 280] // a stroll goes this far, scene units…
  const HOMEWARD = 600 // …and once he is this far from home, it is back towards it: left alone all day, he stays about his home
  const NEAR_BED = 120 // this near his flower bed, a sniff of a tulip
  const PARTS = [[10, 'morning'], [17, 'day'], [Infinity, 'evening']] // the day's parts, by the hour they end
  const random = Debug.random('meadow-alone') // which move and how: its own stream, so the rest of the play stays put

  /**
   * His moves: `weight`, `by` (how much more or less likely in each part of the day), `ok` (can it happen now,
   * from where he is), `run`, and `restore` (cut short: what it leaves put right).
   */
  const ACTS = {
    look: { weight: 3, by: { morning: 2 }, run: lookAbout },
    ponder: { weight: 2, by: { day: 1.5 }, run: ponder },
    scratch: { weight: 2, run: () => Mole.scratchHead() },
    hum: { weight: 2, by: { morning: 0.5, evening: 2.5 }, run: hum },
    stroll: { weight: 3, by: { day: 1.5, evening: 0.5 }, ok: () => ['out', 'hill'].includes(Mole.state.pose), run: stroll }, // out of his molehill first, if he is in it
    bob: { weight: 2, by: { day: 1.5 }, ok: () => Mole.state.pose === 'hill', run: bob },
    pat: { weight: 2, by: { day: 1.5 }, ok: () => Mole.state.pose === 'out' && Hills.at(Mole.state.x), run: pat },
    sniff: { weight: 4, ok: () => Mole.state.pose === 'out' && nearBed(), run: sniff },
    wave: { weight: 1, run: wave },
    stretch: { weight: 2, by: { morning: 2.5, day: 0.5, evening: 2 }, run: () => Mole.stretch() },
    hop: { weight: 2, by: { morning: 2, evening: 0.3 }, run: () => Mole.hop(30, 480) },
    // once a day at midday, or to finish it once cut short (the can left lying out): see watering.js
    water: { weight: 6, by: { morning: 0 }, ok: () => Watering.wants() && ['out', 'hill'].includes(Mole.state.pose), run: (alive) => Watering.run(alive), restore: () => Watering.restore() },
  }

  let hooks = null // the meadow's: run, free (up and nobody tapping), alone (ms since a tap), calm (no rain, no threat)
  let nextAt = 0
  let last = null

  /** The part of the day at this hour: 'morning', 'day' or 'evening'. */
  const part = (hour) => PARTS.find(([until]) => hour < until)[1]

  /** How likely a move is at this hour: its weight, times its `by` for the part of the day (pure: the unit tests call it). */
  const weightAt = (name, hour) => ACTS[name].weight * (ACTS[name].by?.[part(hour)] ?? 1)

  const nearBed = () => Mole.state.x > Layout.BED.from - NEAR_BED && Mole.state.x < Layout.BED.to + NEAR_BED

  /** `meadow` lends run(name, fn), free(), alone() and calm(). */
  function setup(meadow) {
    hooks = meadow
  }

  /** The meadow's tick: left alone long enough, and the pause since the last move over, a move by the hour. */
  function tick(hour) {
    if (Debug.still || hour >= Day.SUNSET || !hooks.free() || !hooks.calm() || hooks.alone() < FIRST_MS || Clock.now() < nextAt) return
    const roll = random()
    const name = Acts.pick(ACTS, { ok: (n) => !ACTS[n].ok || ACTS[n].ok(), last, random: () => roll, weight: (n) => weightAt(n, hour) })
    if (!name) return
    nextAt = Clock.now() + Acts.gap(0, random, GAP_MS)
    play(name)
  }

  /** One move by name, now, as his gesture (the tests run each alone, and cut short). */
  function play(name) {
    last = name
    Debug.trace('alone', { act: name })
    hooks.run(`alone ${name}`, (alive) => ACTS[name].run(alive), ACTS[name].restore)
  }

  // ------------------------------------------------------------ his moves

  /** Turned this way, held, then the other, then back to us. */
  async function lookAbout() {
    const out = Mole.state.pose === 'out'
    for (const dir of random() < 0.5 ? [1, -1] : [-1, 1]) {
      Mole.show(out ? 'three' : 'front', dir)
      Mole.lookAt(Mole.state.x + dir * 400)
      await Clock.wait(900)
    }
    Mole.lookAt(Mole.state.x)
  }

  /** A hand to his chin, thinking (Krtek a autíčko 11:36); now and then, an idea. */
  async function ponder() {
    Sound.say('hm', true)
    await Mole.ponder(1300)
    if (random() < 0.5) {
      Mole.perk(1)
      Sound.say('tam', true)
    }
  }

  /** Swaying to himself, eyes shut, content. */
  function hum() {
    return Mole.sway(2200)
  }

  /** A few steps along the grass (climbing out of his molehill first, if he is in it), and a look round. */
  async function stroll(alive) {
    if (Mole.state.pose === 'hill') await Mole.comeUp('out')
    if (!alive()) return
    const away = Mole.state.x - Layout.HOME
    const dir = Math.abs(away) > HOMEWARD ? -Math.sign(away) : random() < 0.5 ? -1 : 1
    const to = Layout.clampX(Mole.state.x + dir * (STROLL[0] + random() * (STROLL[1] - STROLL[0])))
    await Mole.walkTo(to)
    if (!alive()) return
    Mole.show('three', -dir)
    await Clock.wait(700)
  }

  /** Down into his molehill and straight up again: a mole's habit. */
  async function bob(alive) {
    Sound.dig()
    await Mole.goDown()
    if (!alive()) return
    await Clock.wait(500)
    Sound.pop()
    await Mole.comeUp('hill')
  }

  /** Patting the molehill he stands by tidy, twice. */
  async function pat() {
    await Mole.knock()
    await Mole.knock()
  }

  /** A sniff of a tulip, and an "ooh". */
  async function sniff() {
    Mole.show('three', Mole.state.x < (Layout.BED.from + Layout.BED.to) / 2 ? 1 : -1)
    await Mole.lean(16, 1000)
    Sound.say('ooh', true)
  }

  /** A wave out at the child (no word: a hello is the child's to start). */
  function wave() {
    return Mole.wave()
  }

  return { setup, tick, play, weightAt, part, ACTS, FIRST_MS, GAP_MS }
})()

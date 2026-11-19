// His trowel (Krtek a buldozer 0:42–5:48, Krtek a myška 2:17–4:10;
// world.yaml krtek moves `trowel`), as plain rules with no drawing and no
// clock of their own (trowelart.js draws it and plays its beats). On some
// plays he has it from the start, stuck upright in the top of his home
// molehill; on the others, once, left alone at home, he has an idea, dives
// into his molehill and comes up holding it high, as in Krtek a myška, and
// has it from then on (Adam, 2026-11-19). It stays where he stuck it: going
// down that molehill he takes it with him and digs with it underground, and
// coming up he sticks it in the molehill he comes up in. Digging new earth
// with it, now and then something happens: it clinks on a stone, it sticks
// and he tugs it free, or a spadeful lands on his own head (Adam's picks).

/* exported Trowel */
const Trowel = (() => {
  const HAS_CHANCE = 0.5 // of plays where he has it from the start; on the rest he may fetch it
  const SURPRISES = ['clink', 'stuck', 'head'] // what may happen as he digs with it
  const SURPRISE_CHANCE = 0.3 // after each stretch of new earth dug with it, something happens this often...
  const SURPRISE_FROM = 120 // ...if the stretch was at least this long (scene units)

  /** This play's: does he have it from the start? `forced` ('1' or '0', the page's ?trowel) overrides; drawn either way. */
  function plan(random, forced = null) {
    const has = random() < HAS_CHANCE
    return forced === '1' ? true : forced === '0' ? false : has
  }

  /**
   * What happens after a stretch of new earth dug with it, from `random`: null (nothing, mostly), or a surprise,
   * never the one before again. Draws twice every time, so the stream stays put.
   * @param {() => number} random
   * @param {number} len how long the stretch was
   * @param {string|null} last the surprise before, or null
   */
  function surprise(random, len, last) {
    const roll = random()
    const pick = random()
    if (len < SURPRISE_FROM || roll >= SURPRISE_CHANCE) return null
    const left = SURPRISES.filter((s) => s !== last)
    return left[Math.floor(pick * left.length)]
  }

  return { plan, surprise, SURPRISES, HAS_CHANCE, SURPRISE_CHANCE, SURPRISE_FROM }
})()

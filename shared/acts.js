// Shared by every game: how a hero picks what to do when nobody is tapping,
// as plain choices with no drawing, clock or randomness of its own (the game
// passes in what it knows and its own random stream). Each game keeps its own
// moves (Reksio's in the yard's yard.js, the mole's in the meadow's
// alone.js), and when to start one; this is only the choosing: a move that
// is due first, else one that can happen now by weight, never the same
// twice running; a pool of variations that gives each before any comes
// again; and the pause before the next move.

/* exported Acts */
const Acts = (() => {
  /**
   * Which move: one marked `due` happens as soon as it can, else any move that can happen now, weighted,
   * never the one just done. Draws one random number a pick, so seeded plays stay in step.
   * @param {Object<string, {weight: number, due?: boolean}>} acts
   * @param {{ok: (name: string) => boolean, last: string|null, random: () => number, weight?: (name: string) => number}} o
   *   `weight`: a move's weight now (the hour may change it); by default its `weight`
   * @returns {string|null}
   */
  function pick(acts, { ok, last, random, weight = (n) => acts[n].weight }) {
    const due = Object.keys(acts).find((n) => acts[n].due && ok(n))
    if (due) return due
    const names = Object.keys(acts).filter((n) => n !== last && ok(n) && weight(n) > 0)
    let r = random() * names.reduce((sum, n) => sum + weight(n), 0)
    for (const n of names) if ((r -= weight(n)) < 0) return n
    return names[0] ?? null
  }

  /**
   * A pool of variations (a thing's, a nap's): next() gives each before any comes again, and never the same
   * twice running (unless there is only one).
   * @param {string[]} names
   * @param {() => number} random the caller's stream
   */
  function pool(names, random) {
    let order = []
    let last = null
    return () => {
      if (!order.length) {
        order = [...names]
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1))
          ;[order[i], order[j]] = [order[j], order[i]]
        }
        if (order.length > 1 && order[0] === last) order.push(order.shift())
      }
      last = order.shift()
      return last
    }
  }

  /** How long until the next move after one that took `ms`, or, with none given, a pause drawn from `[lo, hi]`. */
  const gap = (ms, random, [lo, hi]) => ms || lo + random() * (hi - lo)

  return { pick, pool, gap }
})()

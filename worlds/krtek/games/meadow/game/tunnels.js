// What he has dug under the meadow this play: his runs, and where each one
// lies. A run is a stretch of tunnel at one depth; every molehill has a
// shaft down from it to the runs (hills.js has the molehills, so the
// shafts are theirs). What is dug stays dug all day (Adam, 2026-11-14:
// they seemed to vanish once dug), and a new day starts with none.
//
// Each run has a depth (a level: 0 is the one under the grass, the only
// one for now). It is there for a deeper underground with its own animals
// (docs/PROJECT_PLAN.md, Underground), so more levels and the ways
// between them join this file, not the drawing.
//
// Plain rules, no drawing and no clock: underground.js asks it and draws
// what it says (tunnelart.js).

/* exported Tunnels */
const Tunnels = (() => {
  const JOIN = 4 // runs this close end to end are one run (a cut leaves a crawler a hair short of the next)

  /** A network with nothing dug yet. */
  const make = () => ({ runs: [] })

  /** The runs at `depth`, left to right: [{ from, to, depth }] (from < to). */
  const runs = (net, depth = 0) => net.runs.filter((r) => r.depth === depth).sort((a, b) => a.from - b.from)

  /** Dig from a to b at `depth`: what was there and the new stretch become one run where they meet. */
  function dig(net, a, b, depth = 0) {
    let [from, to] = [Math.min(a, b), Math.max(a, b)]
    if (to - from < 1) return net
    const keep = []
    for (const r of net.runs) {
      if (r.depth === depth && r.from <= to + JOIN && r.to >= from - JOIN) {
        from = Math.min(from, r.from)
        to = Math.max(to, r.to)
      } else keep.push(r)
    }
    net.runs = [...keep, { from, to, depth }]
    return net
  }

  /** Is x in a run at `depth`? */
  const dug = (net, x, depth = 0) => net.runs.some((r) => r.depth === depth && x >= r.from - JOIN && x <= r.to + JOIN)

  /**
   * The way from `from` to `to` at `depth`, in legs: [{ from, to, dug }], each wholly through dug
   * tunnel or wholly through earth still to dig, in the order he goes. A leg too short to see is
   * dropped; none at all when from and to are the same.
   */
  function legs(net, from, to, depth = 0) {
    const dir = to < from ? -1 : 1
    const [lo, hi] = [Math.min(from, to), Math.max(from, to)]
    const cuts = [lo, hi]
    for (const r of runs(net, depth)) for (const x of [r.from, r.to]) if (x > lo && x < hi) cuts.push(x)
    cuts.sort((a, b) => a - b)
    const out = []
    for (let i = 0; i + 1 < cuts.length; i++) {
      const [a, b] = [cuts[i], cuts[i + 1]]
      if (b - a < 1) continue
      const isDug = dug(net, (a + b) / 2, depth)
      const last = out[out.length - 1]
      if (last && last.dug === isDug) last.to = b
      else out.push({ from: a, to: b, dug: isDug })
    }
    if (dir < 0) return out.reverse().map((l) => ({ from: l.to, to: l.from, dug: l.dug }))
    return out
  }

  /** How long the way from `from` to `to` takes: `crawl` ms a unit through dug tunnel, `dig` ms a unit through earth. */
  const duration = (net, from, to, { crawl, dig: digging }, depth = 0) =>
    legs(net, from, to, depth).reduce((ms, l) => ms + Math.abs(l.to - l.from) * (l.dug ? crawl : digging), 0)

  /**
   * The earth to show round what is dug: every run and every shaft (at the x's in `shafts`) with `side`
   * units of earth beyond it, those that meet joined, left to right: [[from, to]]. `extra` ([a, b]) is a
   * stretch being dug now, shown already so he digs into it.
   */
  function earth(net, shafts, side, extra = null) {
    const spans = net.runs.map((r) => [r.from - side, r.to + side])
    for (const x of shafts) spans.push([x - side, x + side])
    if (extra) spans.push([Math.min(...extra) - side, Math.max(...extra) + side])
    spans.sort((a, b) => a[0] - b[0])
    const out = []
    for (const [a, b] of spans) {
      const last = out[out.length - 1]
      if (last && a <= last[1]) last[1] = Math.max(last[1], b)
      else out.push([a, b])
    }
    return out
  }

  /** The molehill nearest x among `hills` (their x's) and within `reach`, or null. */
  function nearest(hills, x, reach) {
    const by = hills.filter((h) => Math.abs(h - x) <= reach).sort((a, b) => Math.abs(a - x) - Math.abs(b - x))
    return by.length ? by[0] : null
  }

  return { make, runs, dig, dug, legs, duration, earth, nearest, JOIN }
})()

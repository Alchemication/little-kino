// Left alone (game/alone.js) and the shared choosing it uses (game/acts.js, a copy of shared/acts.js):
// plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = { Debug: { random: () => () => 0.5, still: false }, Layout: { BED: { from: 1000, to: 1300 }, HOME: 900 }, Watering: { wants: () => false } }
vm.createContext(sandbox)
for (const f of ['acts.js', 'alone.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game', f), 'utf8'), sandbox)
vm.runInContext('this.Acts = Acts; this.Alone = Alone', sandbox)
const { Acts, Alone } = sandbox
const always = () => true
/** A fixed sequence of random numbers, then 0. */
const seq = (...xs) => () => (xs.length ? xs.shift() : 0)

test('a move that is due comes first, whatever the weights', () => {
  const acts = { a: { weight: 9 }, b: { weight: 1, due: true } }
  assert.equal(Acts.pick(acts, { ok: always, last: null, random: seq(0) }), 'b')
  assert.equal(Acts.pick(acts, { ok: (n) => n !== 'b', last: null, random: seq(0) }), 'a', 'not while it cannot happen')
})

test('by weight, never the one just done, and only what can happen now', () => {
  const acts = { a: { weight: 1 }, b: { weight: 3 } }
  assert.equal(Acts.pick(acts, { ok: always, last: null, random: seq(0.1) }), 'a')
  assert.equal(Acts.pick(acts, { ok: always, last: null, random: seq(0.5) }), 'b')
  for (const r of [0, 0.5, 0.99]) assert.equal(Acts.pick(acts, { ok: always, last: 'b', random: seq(r) }), 'a')
  assert.equal(Acts.pick(acts, { ok: () => false, last: null, random: seq(0.5) }), null)
})

test('a weight can change with the moment, and a move weighted nothing never comes', () => {
  const acts = { a: { weight: 1 }, b: { weight: 1 } }
  for (const r of [0, 0.5, 0.99]) assert.equal(Acts.pick(acts, { ok: always, last: null, random: seq(r), weight: (n) => (n === 'a' ? 0 : 1) }), 'b')
})

test('one random number a pick, so seeded plays stay in step', () => {
  let draws = 0
  Acts.pick({ a: { weight: 1 }, b: { weight: 2 } }, { ok: always, last: null, random: () => (draws++, 0.4) })
  assert.equal(draws, 1)
})

test('a pool gives each before any comes again, and never the same twice running', () => {
  const next = Acts.pool(['a', 'b', 'c'], seq(0.9, 0.1, 0.5, 0.3, 0.7, 0.2))
  const got = Array.from({ length: 9 }, next)
  for (let i = 0; i < 9; i += 3) assert.deepEqual([...got.slice(i, i + 3)].sort(), ['a', 'b', 'c'])
  for (let i = 1; i < got.length; i++) assert.notEqual(got[i], got[i - 1])
})

test('the pause after a move: its own length, or one drawn from the range', () => {
  assert.equal(Acts.gap(4600, () => 0.5, [1000, 2000]), 4600)
  assert.equal(Acts.gap(0, () => 0, [1000, 2000]), 1000)
  assert.equal(Acts.gap(0, () => 1, [1000, 2000]), 2000)
})

test('the mole left alone: the parts of his day', () => {
  assert.equal(Alone.part(8.5), 'morning')
  assert.equal(Alone.part(12), 'day')
  assert.equal(Alone.part(18), 'evening')
})

test('by the hour: mornings he stretches and hops more, evenings he sways and stretches, the day he strolls', () => {
  assert.ok(Alone.weightAt('stretch', 8.5) > Alone.weightAt('stretch', 12))
  assert.ok(Alone.weightAt('hop', 8.5) > Alone.weightAt('hop', 18))
  assert.ok(Alone.weightAt('hum', 18) > Alone.weightAt('hum', 8.5))
  assert.ok(Alone.weightAt('stroll', 12) > Alone.weightAt('stroll', 18))
  for (const name of Object.keys(Alone.ACTS)) for (const h of [8, 12, 18]) if (name !== 'water' || h !== 8) assert.ok(Alone.weightAt(name, h) > 0, `${name} at ${h}`)
  assert.equal(Alone.weightAt('water', 8.5), 0, 'he waters in the middle of the day, not the morning')
})

test('calm: he waits a while before pottering, and longer between moves than Reksio', () => {
  assert.ok(Alone.FIRST_MS >= 3000)
  assert.ok(Alone.GAP_MS[0] >= 3000)
})

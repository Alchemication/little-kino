// His trowel (game/trowel.js): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'trowel.js'), 'utf8')}\nthis.Trowel = Trowel`, sandbox)
const { Trowel } = sandbox

/** A seeded random stream (mulberry32), as Debug.random gives the game. */
function stream(seed = 1) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stream that counts its draws. */
function counted(next) {
  const r = () => {
    r.n++
    return next()
  }
  r.n = 0
  return r
}

test('about half the plays have it from the start; the page can say; one draw either way', () => {
  let had = 0
  for (let seed = 1; seed <= 400; seed++) {
    const r = counted(stream(seed))
    if (Trowel.plan(r)) had++
    assert.equal(r.n, 1)
    for (const forced of ['1', '0']) {
      const f = counted(stream(seed))
      assert.equal(Trowel.plan(f, forced), forced === '1')
      assert.equal(f.n, 1, 'the flag shifts nothing else')
    }
  }
  assert.ok(had > 150 && had < 250, had)
})

test('a surprise only now and then, after a long enough stretch, never the same twice running; two draws always', () => {
  const r = counted(stream(7))
  let last = null
  let some = 0
  const seen = new Set()
  for (let i = 0; i < 600; i++) {
    const before = r.n
    const s = Trowel.surprise(r, 200, last)
    assert.equal(r.n - before, 2)
    if (s) {
      assert.notEqual(s, last, 'not twice running')
      assert.ok(Trowel.SURPRISES.includes(s))
      seen.add(s)
      last = s
      some++
    }
  }
  assert.ok(some > 600 * Trowel.SURPRISE_CHANCE * 0.7 && some < 600 * Trowel.SURPRISE_CHANCE * 1.3, some)
  assert.deepEqual([...seen].sort(), [...Trowel.SURPRISES].sort())
  for (let i = 0; i < 100; i++) assert.equal(Trowel.surprise(r, Trowel.SURPRISE_FROM - 1, null), null, 'a short stretch: nothing')
})

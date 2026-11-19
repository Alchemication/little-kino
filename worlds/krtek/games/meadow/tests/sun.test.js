// The sun's face (game/sun.js): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'sun.js'), 'utf8')}\nthis.Sun = Sun`, sandbox)
const { Sun } = sandbox

const day = { hour: 12, storm: null, clearedMs: null, eclipse: null, tappedMs: null }
const mood = (over) => Sun.mood({ ...day, ...over })

test("by day it wears the film's smile", () => {
  for (const hour of [Sun.WAKING_TILL, 10, 12, 15, Sun.SLEEPY_FROM - 0.01]) assert.equal(mood({ hour }), 'smile', hour)
})

test('sleepy as it comes up and as it goes down', () => {
  assert.equal(mood({ hour: 8 }), 'sleepy')
  assert.equal(mood({ hour: Sun.WAKING_TILL - 0.01 }), 'sleepy')
  assert.equal(mood({ hour: Sun.SLEEPY_FROM }), 'sleepy')
  assert.equal(mood({ hour: 18.9 }), 'sleepy')
})

test('a little glum while the rain gathers and falls, glad a while after it clears, then its smile', () => {
  assert.equal(mood({ storm: 'gathering' }), 'glum')
  assert.equal(mood({ storm: 'raining' }), 'glum')
  assert.equal(mood({ storm: 'clearing', clearedMs: 0 }), 'glad')
  assert.equal(mood({ clearedMs: Sun.GLAD_AFTER_MS - 1 }), 'glad')
  assert.equal(mood({ clearedMs: Sun.GLAD_AFTER_MS }), 'smile')
})

test('in an eclipse: "oh" as the moon comes over, glad as it goes, whatever the weather', () => {
  assert.equal(mood({ eclipse: -0.5 }), 'oh')
  assert.equal(mood({ eclipse: 0.5 }), 'glad')
  assert.equal(mood({ eclipse: -0.5, storm: 'raining', hour: 8 }), 'oh')
})

test('a tap brings a wink, then a beam, in turn, for a while; it comes before anything else', () => {
  assert.deepEqual([0, 1, 2, 3].map(Sun.way), ['wink', 'beam', 'wink', 'beam'])
  assert.equal(mood({ tappedMs: 0, tapWay: 'beam', storm: 'raining', eclipse: -0.5 }), 'beam')
  assert.equal(mood({ tappedMs: Sun.TAPPED_MS - 1 }), 'wink')
  assert.equal(mood({ tappedMs: Sun.TAPPED_MS }), 'smile')
})

test('its moods are few, and every one of them is drawn (sunart.js)', () => {
  const art = fs.readFileSync(path.join(__dirname, '..', 'game', 'sunart.js'), 'utf8')
  const seen = new Set()
  for (const hour of [8, 12, 18.5]) {
    for (const storm of [null, 'gathering', 'raining', 'clearing']) {
      for (const eclipse of [null, -0.5, 0.5]) {
        for (const tappedMs of [null, 0]) {
          for (const tapWay of ['wink', 'beam']) seen.add(mood({ hour, storm, eclipse, tappedMs, tapWay, clearedMs: storm === 'clearing' ? 0 : null }))
        }
      }
    }
  }
  assert.deepEqual([...seen].sort(), ['beam', 'glad', 'glum', 'oh', 'sleepy', 'smile', 'wink'])
  for (const face of seen) assert.ok(art.includes(`'${face}'`), `${face} is drawn`)
})

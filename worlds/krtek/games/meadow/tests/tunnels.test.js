// What he has dug (game/tunnels.js): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'tunnels.js'), 'utf8')}\nthis.Tunnels = Tunnels`, sandbox)
const { Tunnels } = sandbox
const plain = (v) => JSON.parse(JSON.stringify(v)) // out of the sandbox's realm, for deepEqual

test('a new play has nothing dug', () => {
  const net = Tunnels.make()
  assert.deepEqual(plain(Tunnels.runs(net)), [])
  assert.equal(Tunnels.dug(net, 900), false)
})

test('what is dug stays, and runs that meet become one, whichever way he dug them', () => {
  const net = Tunnels.make()
  Tunnels.dig(net, 900, 1500)
  Tunnels.dig(net, 2400, 2000)
  assert.deepEqual(plain(Tunnels.runs(net)), [{ from: 900, to: 1500, depth: 0 }, { from: 2000, to: 2400, depth: 0 }])
  Tunnels.dig(net, 1500, 2000) // the gap between them
  assert.deepEqual(plain(Tunnels.runs(net)), [{ from: 900, to: 2400, depth: 0 }])
  Tunnels.dig(net, 1000, 1200) // inside what is dug: nothing new
  assert.deepEqual(plain(Tunnels.runs(net)), [{ from: 900, to: 2400, depth: 0 }])
})

test('a cut a hair short of the next run still joins it', () => {
  const net = Tunnels.make()
  Tunnels.dig(net, 900, 1500)
  Tunnels.dig(net, 1502, 1800)
  assert.equal(Tunnels.runs(net).length, 1)
})

test('another depth is another run: the deeper underground to come', () => {
  const net = Tunnels.make()
  Tunnels.dig(net, 900, 1500, 0)
  Tunnels.dig(net, 1000, 1400, 1)
  assert.equal(Tunnels.runs(net, 0).length, 1)
  assert.equal(Tunnels.runs(net, 1).length, 1)
  assert.equal(Tunnels.dug(net, 950, 1), false)
})

test('the way splits into dug and undug legs, in the order he goes', () => {
  const net = Tunnels.make()
  Tunnels.dig(net, 1000, 1400)
  assert.deepEqual(plain(Tunnels.legs(net, 800, 1600)), [
    { from: 800, to: 1000, dug: false },
    { from: 1000, to: 1400, dug: true },
    { from: 1400, to: 1600, dug: false },
  ])
  assert.deepEqual(plain(Tunnels.legs(net, 1600, 1200)), [
    { from: 1600, to: 1400, dug: false },
    { from: 1400, to: 1200, dug: true },
  ])
  assert.deepEqual(plain(Tunnels.legs(net, 1100, 1300)), [{ from: 1100, to: 1300, dug: true }])
  assert.deepEqual(plain(Tunnels.legs(net, 1200, 1200)), [])
})

test('dug tunnel is quicker to go along than earth to dig', () => {
  const net = Tunnels.make()
  const pace = { crawl: 1, dig: 3 }
  assert.equal(Tunnels.duration(net, 0, 100, pace), 300)
  Tunnels.dig(net, 0, 100)
  assert.equal(Tunnels.duration(net, 0, 100, pace), 100)
  assert.equal(Tunnels.duration(net, 100, 0, pace), 100)
  assert.equal(Tunnels.duration(net, 50, 150, pace), 50 + 150)
})

test('the earth shown spans every run and shaft with earth beyond, those that meet joined', () => {
  const net = Tunnels.make()
  Tunnels.dig(net, 900, 1200)
  assert.deepEqual(plain(Tunnels.earth(net, [900, 1200, 3000], 100)), [[800, 1300], [2900, 3100]])
  assert.deepEqual(plain(Tunnels.earth(net, [900], 100, [1200, 2000])), [[800, 2100]]) // what he is digging now, shown already
})

test('the nearest molehill within reach, or none', () => {
  assert.equal(Tunnels.nearest([900, 1500, 2600], 1400, 400), 1500)
  assert.equal(Tunnels.nearest([900, 2600], 1700, 400), null)
})

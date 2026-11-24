// Unit tests for takes.js: only the next take of each part is decoded, and a
// take played is let go when it ends.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

/** A pretend audio context: it notes what it decoded and what played. */
function fakeContext({ broken = [] } = {}) {
  const node = () => ({ connect: (n) => n, gain: { value: 1, setTargetAtTime() {} } })
  const ctx = {
    currentTime: 0,
    decoded: [],
    sources: [],
    createGain: node,
    createBufferSource() {
      const src = { ...node(), buffer: null, start() {}, stop() { src.onended?.() } }
      ctx.sources.push(src)
      return src
    },
    decodeAudioData(bytes) {
      const name = new globalThis.TextDecoder().decode(bytes)
      ctx.decoded.push(name)
      if (broken.includes(name)) return Promise.reject(new Error('not audio'))
      return Promise.resolve({ name, length: 48000, numberOfChannels: 1 })
    },
  }
  return ctx
}

const b64 = (s) => globalThis.btoa(s)
const TUNES = {
  morning: [b64('m1'), b64('m2')],
  phrase: [b64('p1'), b64('p2'), b64('p3')],
  lullaby: [b64('l1')],
}

/** A page with a player on a fake context, the tunes kept. */
function setup(options) {
  const page = load(['debug.js', 'takes.js'], { query: '?seed=4', globals: { atob: globalThis.atob } })
  const ctx = fakeContext(options)
  page.get('globalThis').ctx = ctx
  page.get('globalThis').tunes = TUNES
  page.get('globalThis.player = Takes.player(ctx, {}); player.load(tunes)')
  const held = () => {
    page.tick()
    return JSON.parse(page.store.get('little-kino:note:')).audio
  }
  return { page, ctx, player: page.get('player'), held }
}

const settle = () => new Promise((resolve) => setImmediate(resolve))
const always = (x) => () => x

describe('takes decoded as needed', () => {
  it('decodes only the first take of each part wanted', async () => {
    const { ctx, player, held } = setup()
    await player.want('morning', 'phrase')
    assert.equal(ctx.decoded.length, 2)
    assert.ok(player.ready('morning') && player.ready('phrase') && !player.ready('lullaby'))
    assert.deepEqual(held(), { clips: 2, mb: 0.4 }) // a second each, 32-bit
  })

  it('plays the ready take, and decodes another for next time', async () => {
    const { ctx, player } = setup()
    await player.want('phrase')
    const first = ctx.decoded[0]
    assert.equal(player.play('phrase', always(0), 0), true)
    assert.equal(ctx.sources[0].buffer.name, first)
    await settle()
    assert.equal(ctx.decoded.length, 2)
    assert.notEqual(ctx.decoded[1], first, 'never the same take twice running')
  })

  it('lets a take go when it ends, keeping only the next', async () => {
    const { ctx, player, held } = setup()
    await player.want('phrase')
    player.play('phrase', always(0), 0)
    await settle()
    assert.equal(held().clips, 2, 'the one playing and the next')
    ctx.sources[0].stop()
    assert.equal(held().clips, 1)
  })

  it('keeps a part with one take, decoded once', async () => {
    const { ctx, player, held } = setup()
    await player.want('lullaby')
    player.play('lullaby', always(0), 0)
    ctx.sources[0].stop()
    assert.equal(player.play('lullaby', always(0), 0), true)
    assert.deepEqual(ctx.decoded, ['l1'])
    assert.equal(held().clips, 1)
  })

  it('says no to a part not wanted yet, and has it ready the next time', async () => {
    const { player } = setup()
    assert.equal(player.play('morning', always(0), 0), false)
    await settle()
    assert.equal(player.play('morning', always(0), 0), true)
  })

  it('lets go of a dropped part', async () => {
    const { player, held } = setup()
    await player.want('morning', 'phrase')
    player.drop('morning')
    assert.equal(held().clips, 1)
    assert.equal(player.ready('morning'), false)
  })

  it('plays from the others when a take will not decode', async () => {
    const { player, ctx } = setup({ broken: ['p1', 'p2'] })
    await player.want('phrase')
    assert.equal(player.play('phrase', always(0), 0), true)
    assert.equal(ctx.sources[0].buffer.name, 'p3')
  })
})

// What is heard from above (game/sound.js, and the music, game/music.js): while
// he stays under, the music, the creatures and everything over the whole
// meadow go dull through one filter (`above`), and his own sounds don't. Run on a stand-in AudioContext
// that notes every connection, so each sound's path to the speakers can be
// followed.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

/** A stand-in AudioContext: every node keeps what it is connected to; the sources made are listed. */
function fakeAudio() {
  const sources = []
  const nodes = []
  const param = (value = 1) => {
    const p = { value, targets: [], setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime: (v) => p.targets.push(v), linearRampToValueAtTime() {}, cancelScheduledValues() {} }
    return p
  }
  const node = (extra = {}) => {
    const n = { outs: [], connect: (to) => { n.outs.push(to); return to }, disconnect() {}, ...extra }
    nodes.push(n)
    return n
  }
  const source = (extra) => {
    const s = node({ start() {}, stop() {}, ...extra })
    sources.push(s)
    return s
  }
  class AudioContext {
    static made = { sources }
    constructor() {
      this.state = 'running'
      this.sampleRate = 8000
      this.currentTime = 0
      this.destination = node()
    }
    createGain() { return node({ gain: param() }) }
    createStereoPanner() { return node({ pan: param(0) }) }
    createWaveShaper() { return node({ curve: null, oversample: '' }) }
    createDelay() { return node({ delayTime: param(0) }) }
    createBiquadFilter() { return node({ type: '', frequency: param(350), Q: param() }) }
    createBuffer(_ch, length) { return { getChannelData: () => new Float32Array(length) } }
    createBufferSource() { return source({ buffer: null, loop: false, playbackRate: param() }) }
    createOscillator() { return source({ type: '', frequency: param(), detune: param() }) }
    decodeAudioData() { return Promise.resolve({ duration: 1 }) }
    resume() {}
    suspend() {}
  }
  return { AudioContext, sources, nodes }
}

const MUSIC = ['bed.js', 'beds.js', 'ensemble.js', 'takes.js', 'music.js'] // the music and what it plays with

/** sound.js, and with `music` the music player too, on a stand-in context, after the first tap. */
function sound({ music = false, effects = false, tunes = null } = {}) {
  const audio = fakeAudio()
  const sandbox = {
    window: { AudioContext: audio.AudioContext },
    navigator: {},
    Clock: { onHold() {}, held: false, after() {}, every: () => () => {}, now: () => 0 },
    Layout: { season: 'spring' },
    Debug: { random: () => () => 0.5, trace() {} },
    Math,
    atob: globalThis.atob, // the takes' bytes
    TUNES: tunes ?? undefined, // the music's takes, stand-ins
  }
  vm.createContext(sandbox)
  if (effects) vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'effects.js'), 'utf8')}\nthis.EFFECTS = EFFECTS`, sandbox)
  vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'sound.js'), 'utf8')}\nthis.Sound = Sound`, sandbox)
  for (const f of music ? MUSIC : []) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game', f), 'utf8'), sandbox, { filename: f })
  const { Sound } = sandbox
  const { above, master } = Sound.bus() // the first tap
  /** Whether a node's way to the speakers passes `through`. */
  const passes = (n, through, seen = new Set()) => {
    if (n === through) return true
    if (seen.has(n)) return false
    seen.add(n)
    return (n.outs ?? []).some((o) => passes(o, through, seen)) // an AudioParam (a wobble's depth) leads nowhere
  }
  /** The sources a sound starts, and whether each is heard through the filter. */
  const heard = (play) => {
    const from = audio.sources.length
    play()
    const made = audio.sources.slice(from)
    assert.ok(made.length > 0, 'it made no sound')
    assert.ok(made.every((s) => passes(s, master)), 'a source not connected to the speakers')
    return made.map((s) => passes(s, above))
  }
  const Music = music ? vm.runInContext('Music', sandbox) : null
  return { Sound, Music, above, master, heard, passes, nodes: audio.nodes }
}

test('what is over the whole meadow is heard from above: the rain, the wind, the bulldozer, the bell, the geese, the wolf', () => {
  const { Sound, heard } = sound()
  const overhead = {
    rain: () => Sound.water(0.5),
    'the storm\'s rain': () => Sound.water(0.5, { soft: 1 }),
    wind: () => Sound.wind(),
    'thunder and the bulldozer': () => Sound.rumble(1),
    bell: () => Sound.bell(),
    geese: () => Sound.honk(),
    wolf: () => Sound.howl(),
  }
  for (const [name, play] of Object.entries(overhead)) assert.ok(heard(play).every(Boolean), `${name} is not heard from above`)
})

const NOT_SOUNDS = ['ensure', 'under', 'bus', 'hearFrom', 'from', 'listen', 'hushEchoes'] // the hooks, not sounds
const ARGS = { roll: [1], rumble: [1], water: [0.5] } // what a sound needs to be heard at all
const HIS = ['say', 'dig', 'pop', 'puddle', 'drips', 'scrape', 'scurry', 'trickle', 'clink'] // his own: clear (his trowel's clink too)

test('every sound but his own is heard from above, a new one too (the woodpecker\'s drum was not)', async () => {
  for (const effects of [false, true]) await everyAbove(effects) // made here, and the recorded takes
})

async function everyAbove(effects) {
  const { Sound, passes, above, master } = sound({ effects })
  await new Promise((resolve) => setImmediate(resolve)) // the takes decoded
  const all = Object.keys(Sound).filter((k) => typeof Sound[k] === 'function' && !NOT_SOUNDS.includes(k) && !HIS.includes(k))
  assert.ok(all.includes('drum') && all.includes('peck') && all.length > 30, all.join(' '))
  const { sources } = Sound.bus().ctx.constructor.made
  for (const name of all) {
    const from = sources.length
    Sound[name](...(ARGS[name] ?? []))
    const made = sources.slice(from)
    if (!made.length && !effects) continue // only recorded: the run with the takes hears it
    assert.ok(made.length > 0, `${name} made no sound`)
    assert.ok(made.every((n) => passes(n, master) && passes(n, above)), `${name} is not heard from above (${effects ? 'its take' : 'made here'})`)
  }
}

test('a creature heard from where it is is heard from above', () => {
  const { Sound, above, heard } = sound()
  assert.ok(heard(() => Sound.from(500, Sound.snuffle)).every(Boolean), 'the hedgehog')
  assert.equal(above.type, 'lowpass')
})

test('the music is heard from above: the takes and the bed', async () => {
  const { Music, master, above, passes, nodes } = sound({ music: true })
  const from = nodes.length
  await Music.morning() // the takes' player and the bed, made and started
  const heard = nodes.slice(from).filter((n) => passes(n, master))
  assert.ok(heard.length > 3, `only ${heard.length} of the music's nodes reach the speakers`)
  assert.ok(heard.every((n) => passes(n, above)), 'some of the music is not heard from above')
  assert.ok(Music.bed?.on, 'the bed did not start')
})

test('his own sounds stay clear: the view is down there with him', () => {
  const { Sound, heard } = sound()
  for (const [name, play] of Object.entries({ dig: Sound.dig, pop: Sound.pop, puddle: Sound.puddle, drips: Sound.drips, scrape: Sound.scrape, scurry: Sound.scurry, trickle: Sound.trickle })) {
    assert.ok(heard(play).every((through) => !through), `${name} goes dull with him under`)
  }
})

test('under, the filter closes to dull and quieter; up again, it opens; once each way', () => {
  const { Sound, above } = sound()
  assert.ok(above.frequency.value > 10000, 'dull before he went under')
  Sound.under(true)
  Sound.under(true)
  Sound.under(false)
  assert.equal(above.frequency.targets.length, 2)
  const [down, up] = above.frequency.targets
  assert.ok(down <= 600 && up > 10000, `${down}, ${up}`) // at 900 the harp and flute sounded the same: their notes are under it
  assert.equal(Sound.muffled, false)
})

test('the moment a threat has gone the glad theme comes, even over the menace still playing', async () => {
  const take = ['AAAA'] // a stand-in take: the stand-in context decodes anything
  const { Music } = sound({ music: true, tunes: { morning: take, menace: take, happy: take, curious: take } })
  await Music.morning()
  Music.cue('menace') // the bulldozer coming
  assert.equal(Music.part, 'menace')
  Music.cue('curious') // something milder while it is here: the menace holds
  assert.equal(Music.part, 'menace')
  Music.cue('happy') // gone (things.js relief)
  assert.equal(Music.part, 'happy')
})

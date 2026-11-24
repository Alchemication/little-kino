// Recorded music takes (a game's tunes.js), played one at a time: a random
// take of a part, never the one before if the part has others, faded out
// when cut short. Each game's music.js says when which part comes; this is
// only the player (the yard's music.js puts its bed and touches round it,
// the meadow's its moods and the cricket).
//
// Only the take each part plays next is decoded, ahead of time, so a part
// starts at once; as it starts, the one after is picked and decoded, and
// the one playing is let go when it ends. Decoded, a take is 32-bit samples
// at the device's rate (about 6 MB a half-minute); all of a game's takes at
// once were most of what crashed a phone (Adam's iPhone, 2026-11-24).
//
// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Debug */
/* exported Takes */
const Takes = (() => {
  const FADE_S = 0.5 // a take cut short fades over about this long

  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

  /** One of the takes `all` (their numbers) other than `not`, unless it is the only one, by `random`. */
  function choose(all, random, not) {
    const others = all.filter((i) => i !== not)
    const from = others.length ? others : all
    return from[Math.floor(random() * from.length)]
  }

  /**
   * A player on the audio context `ctx`, into the node `out`.
   * volume: each take's gain (the takes are levelled when packed);
   * onStart(t): a take begins at audio time t; onEnd(): it ended or was cut
   * (another may have started since: check `playing`).
   */
  function player(ctx, out, { volume = 0.8, onStart = () => {}, onEnd = () => {} } = {}) {
    const firsts = Debug.random('takes') // which take of a part comes first; after that, the caller's stream picks
    let table = {} // part -> [base64 mp3], as packed
    const next = {} // part -> the take it plays next: { i, buffer (null while decoding), ready }
    const bad = {} // part -> takes that wouldn't decode (left out: the part plays from the others)
    let current = null // { src, gain, part }

    const good = (part) => (table[part] || []).map((_, i) => i).filter((i) => !bad[part]?.has(i))

    /** Whether `part` has a take to play (in the table, one that decodes). */
    const has = (part) => good(part).length > 0

    const pick = (part, random, not) => choose(good(part), random, not)

    /** Decode take `i` of `part` as the one it plays next (`buffer`: already decoded, the same take again). */
    function prepare(part, i, buffer = null) {
      const take = { i, buffer, ready: null }
      next[part] = take
      take.ready = buffer
        ? Promise.resolve()
        : ctx.decodeAudioData(bytes(table[part][i])).then(
          (b) => {
            if (next[part] === take) take.buffer = Debug.decoded(b) // else dropped while decoding: let it go
          },
          () => {
            ;(bad[part] ??= new Set()).add(i)
            if (next[part] === take && has(part)) return prepare(part, pick(part, firsts, i)).ready
          },
        )
      return take
    }

    /** Keep the TUNES table ({part: [base64 mp3]}), undecoded. */
    function load(tunes) {
      table = tunes || {}
    }

    /** Decode the first take of each of `parts` (the ones this play will
     * use); resolves once they're ready to play. */
    function want(...parts) {
      return Promise.all(parts.filter(has).map((part) => (next[part] ?? prepare(part, pick(part, firsts, null))).ready))
    }

    /** Forget `parts`' next takes: this play won't use them again. */
    function drop(...parts) {
      for (const part of parts) {
        const take = next[part]
        delete next[part]
        if (take?.buffer && take.buffer !== current?.src.buffer) Debug.freed(take.buffer)
      }
    }

    /**
     * A random take of `part` from audio time t (random: the caller's
     * stream, which picks the take after it); then(), once it has played to
     * its end (not when cut). False if the part has no take ready: one is
     * decoded for next time.
     */
    function play(part, random, t, then = null) {
      const take = next[part]
      if (!take?.buffer) {
        if (!take && has(part)) prepare(part, pick(part, firsts, null))
        return false
      }
      const after = pick(part, random, take.i)
      const again = after === take.i // the part's only take: kept for next time
      prepare(part, after, again ? take.buffer : null)
      const src = ctx.createBufferSource()
      src.buffer = take.buffer
      const gain = ctx.createGain()
      gain.gain.value = volume
      src.connect(gain).connect(out)
      const playing = { src, gain, part }
      src.onended = () => {
        if (!again || next[part]?.buffer !== take.buffer) Debug.freed(take.buffer) // let go: nothing here holds it now
        const whole = current === playing // not cut short
        if (whole) current = null
        onEnd()
        if (whole && then) then()
      }
      current = playing
      onStart(t)
      src.start(Math.max(t, ctx.currentTime))
      return true
    }

    /** Fade out the take playing now, if any. */
    function fade() {
      if (!current) return
      const now = ctx.currentTime
      current.gain.gain.setTargetAtTime(0.0001, now, FADE_S / 3)
      current.src.stop(now + FADE_S * 2)
      current = null
    }

    return {
      load, want, play, fade, drop, has,
      FADE_S,
      /** Whether `part`'s next take is decoded, ready to play at once. */
      ready: (part) => !!next[part]?.buffer,
      get playing() { return !!current },
      /** The part playing now, or null. */
      get part() { return current?.part ?? null },
    }
  }

  return { player }
})()

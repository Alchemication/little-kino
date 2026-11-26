// The sun's face, as plain rules with no drawing and no clock of their own
// (sunart.js draws it; meadow.js tells it the hour and the weather). The
// face is the one in Krtek a myška (1997, 1:01–1:09, 3:55–3:59: world.yaml
// aesthetics), which smiles on whatever happens, even as a cloud covers
// it; its moods are ours (Adam, 2026-11-19), kept small: that smile is its
// face nearly all day. Sleepy as it comes up and as it goes down, a little
// glum while a storm or a shower is over the meadow (never crying), an
// "oh!" as the eclipse's moon comes over it and glad as it goes, glad a
// while after the rain clears, and, tapped, a wink or a beam back.

/* exported Sun */
const Sun = (() => {
  const WAKING_TILL = 8.4 // sleepy-eyed as it comes up over the meadow, until this hour (the day starts at 08:00)...
  const SLEEPY_FROM = 18.3 // ...and again as it goes down (it sets at 19:00)
  const GLAD_AFTER_MS = 12000 // glad this long after the rain has cleared
  const TAPPED_MS = 1800 // a tap's wink or beam lasts this long
  const TAPS = ['wink', 'beam'] // what a tap brings, in turn
  const CUES = { menace: 'oh', bulldozer: 'oh', happy: 'glad' } // the music's cues it answers (music.js): the bulldozer's uneasy turn, recorded or written; an encounter come right
  const CUED_MS = { oh: 3000, glad: 6000 } // how long each lasts: a start, not a worry it keeps; a shared smile, shorter than after the rain

  /**
   * The face to show now.
   * @param {object} now
   * @param {number} now.hour the play's hour
   * @param {string|null} now.storm the storm's or a shower's phase (storm.js): 'gathering', 'raining', 'clearing' or null
   * @param {number|null} now.clearedMs how long since the last rain cleared, or null if none has
   * @param {number|null} now.eclipse where the eclipse's moon is across it (eclipse.js across), or null with none on
   * @param {number|null} now.tappedMs how long since a tap on it, or null
   * @param {string} [now.tapWay] that tap's face (way())
   * @param {string|null} [now.cue] the last of the music's cues it answers (CUES), or null
   * @param {number|null} [now.cuedMs] how long since that cue
   * @returns {string} 'smile', 'sleepy', 'glum', 'oh', 'glad', 'wink' or 'beam'
   */
  function mood({ hour, storm, clearedMs, eclipse, tappedMs, tapWay = 'wink', cue = null, cuedMs = null }) {
    const moment = passing({ eclipse, tappedMs, tapWay, cue, cuedMs })
    if (moment) return moment
    if (storm === 'gathering' || storm === 'raining') return 'glum'
    if (clearedMs !== null && clearedMs < GLAD_AFTER_MS) return 'glad'
    if (hour < WAKING_TILL || hour >= SLEEPY_FROM) return 'sleepy'
    return 'smile'
  }

  /** What is happening to it just now, before the weather and the hour: a tap, the eclipse, an encounter's moment; or null. */
  function passing({ eclipse, tappedMs, tapWay, cue, cuedMs }) {
    if (tappedMs !== null && tappedMs < TAPPED_MS) return tapWay
    if (eclipse !== null) return eclipse < 0 ? 'oh' : 'glad'
    if (CUES[cue] && cuedMs !== null && cuedMs < CUED_MS[CUES[cue]]) return CUES[cue]
    return null
  }

  /** The face the `n`th tap (from 0) brings: a wink, then a beam, in turn. */
  const way = (n) => TAPS[n % TAPS.length]

  /** Whether it answers the music's cue `part` (meadow.js keeps only those). */
  const answers = (part) => part in CUES

  return { mood, way, answers, CUED_MS, TAPPED_MS, GLAD_AFTER_MS, WAKING_TILL, SLEEPY_FROM }
})()

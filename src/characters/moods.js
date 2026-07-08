// Mood loop + one-shot reaction recipes for the Companion rig.
// Pure config — Companion.js interprets these onto its shared values.
// Motion stays Monument-Valley calm: gentle amplitudes, slow tempos.

export const MOODS = {
  idle: {
    bob: { amp: 2.5, duration: 1700 },
    appendage: { from: -4, to: 4, duration: 2600 },
    cheeks: 0,
    hop: null,
    lean: 0,
  },
  celebrating: {
    bob: null,
    appendage: { from: -20, to: 6, duration: 480 },
    cheeks: 1,
    hop: { height: 9, duration: 620 },
    lean: 0,
  },
  hinting: {
    bob: null,
    appendage: null, // appendage points instead of looping
    appendagePoint: 34, // degrees, multiplied by hint direction
    cheeks: 0,
    hop: null,
    lean: 8, // degrees toward the hint target
  },
};

// One-shot reactions layered over the current mood. Each entry describes
// sequences per shared value; Companion applies them and restores mood
// baselines afterwards. Durations in ms, values additive-neutral (end at 0
// or at the mood baseline).
export const REACTIONS = {
  cheer: {
    hop: { up: -13, upDuration: 170, settleDamping: 11 },
    squash: [0.9, 1.06, 1],
    cheeksFlash: 900,
    appendageFlick: { deg: -26, duration: 160 },
  },
  ohno: {
    tiltShake: { deg: 6, count: 2, duration: 130 },
    squash: [0.97, 1],
  },
  nod: {
    nodDips: { dip: 4, count: 2, duration: 160 },
  },
  hop: {
    hop: { up: -8, upDuration: 150, settleDamping: 13 },
  },
};

// Blink cadence: precomputed jitter so worklets never call Math.random().
export const BLINK_INTERVALS = [2800, 3600, 2400, 4100, 3100, 2600, 3900, 3300];

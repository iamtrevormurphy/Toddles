// Lento — sloth, Path-Maker protagonist (the character the child steers
// along the path). Named for the musical tempo marking: everything about
// him is unhurried. Dominant fawn (honey-taupe), cocoa eye-patch mask —
// the classic sloth face and his identity carrier — with long front-layer
// arms whose slow sway is his signature (and which make the Path-Maker
// teeter/bonk theater legible). Per-def slow blink completes the tempo.
export default {
  id: 'lento',
  viewBox: [100, 120],
  feetY: 116,
  shadow: { cx: 50, cy: 116, rx: 33 },
  blink: { close: 160, open: 260 }, // the slowest blink in the cast
  masses: [
    { verts: [[26, 26], [74, 26], [74, 58], [26, 58]], color: 'fawn' },   // head (wider than tall)
    { verts: [[30, 58], [70, 58], [76, 108], [24, 108]], color: 'fawn' }, // squat pear torso
  ],
  details: [
    { type: 'poly', verts: [[30, 30], [70, 30], [70, 56], [30, 56]], color: 'white' },  // cream face patch
    { type: 'poly', verts: [[32, 37], [46, 41], [46, 49], [32, 47]], color: 'cocoa' },  // eye stripe L
    { type: 'poly', verts: [[54, 41], [68, 37], [68, 47], [54, 49]], color: 'cocoa' },  // eye stripe R
    { type: 'poly', verts: [[46, 51], [54, 51], [50, 56]], color: 'cocoa' },            // nose
    { type: 'poly', verts: [[38, 72], [62, 72], [64, 100], [36, 100]], color: 'amber' }, // belly patch
    { type: 'poly', verts: [[30, 108], [42, 108], [42, 116], [30, 116]], color: 'cocoa' }, // foot L
    { type: 'poly', verts: [[58, 108], [70, 108], [70, 116], [58, 116]], color: 'cocoa' }, // foot R
  ],
  appendages: [
    {
      id: 'armL',
      polys: [
        { verts: [[24, 60], [34, 62], [32, 98], [22, 96]], color: 'fawn' },
        { verts: [[22, 96], [32, 98], [31, 104], [21, 102]], color: 'cocoa' }, // claw
      ],
      origin: [29, 63],
      layer: 'front',
    },
    {
      id: 'armR',
      polys: [
        { verts: [[66, 62], [76, 60], [78, 96], [68, 98]], color: 'fawn' },
        { verts: [[68, 98], [78, 96], [79, 102], [69, 104]], color: 'cocoa' }, // claw
      ],
      origin: [71, 63],
      layer: 'front',
      mirror: true, // both arms sway outward together, like Juno's ears
    },
  ],
  eyes: { left: [40, 44], right: [60, 44], radius: 3.2, maxGaze: 3 },
  cheeks: { points: [[34, 52], [66, 52]], radius: 3.2 },
};

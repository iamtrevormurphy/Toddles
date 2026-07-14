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

  // Path-Maker facing views. Same bounding proportions as the front art
  // (head y26–58, torso y58–108, feet y108–116) so the mid-turn swap at
  // scaleX 0 reads as Lento rotating, not morphing. Keys omitted fall back
  // to the front def; eyes/cheeks are EXPLICITLY null on the back — the
  // back of a head has neither.
  views: {
    // Facing away (N): no face. The eye-stripe mass becomes a cocoa cap
    // across the back of the head, plus the dorsal stripe real sloths
    // carry — a quiet identity cue at glance distance.
    back: {
      masses: [
        { verts: [[26, 26], [74, 26], [74, 58], [26, 58]], color: 'fawn' },
        { verts: [[30, 58], [70, 58], [76, 108], [24, 108]], color: 'fawn' },
      ],
      details: [
        { type: 'poly', verts: [[30, 30], [70, 30], [70, 44], [30, 44]], color: 'cocoa' }, // head cap
        { type: 'poly', verts: [[46, 64], [54, 64], [54, 100], [46, 100]], color: 'cocoa' }, // dorsal stripe
        { type: 'poly', verts: [[30, 108], [42, 108], [42, 116], [30, 116]], color: 'cocoa' }, // heel L
        { type: 'poly', verts: [[58, 108], [70, 108], [70, 116], [58, 116]], color: 'cocoa' }, // heel R
      ],
      appendages: [
        // Same arm quads, but behind the torso (far side) and clawless —
        // claws face away from the viewer.
        {
          id: 'armLBack',
          polys: [{ verts: [[24, 60], [34, 62], [32, 98], [22, 96]], color: 'fawn' }],
          origin: [29, 63],
          layer: 'behind',
        },
        {
          id: 'armRBack',
          polys: [{ verts: [[66, 62], [76, 60], [78, 96], [68, 98]], color: 'fawn' }],
          origin: [71, 63],
          layer: 'behind',
          mirror: true,
        },
      ],
      eyes: null,
      cheeks: null,
    },
    // Profile, drawn facing EAST (screen right); West is scaleX −1 in the
    // consumer. One eye inside the stripe, nose at the snout tip, one near
    // arm across the torso so the signature sway survives in profile.
    side: {
      masses: [
        { verts: [[30, 26], [78, 26], [78, 58], [30, 58]], color: 'fawn' },  // head, snout-shifted
        { verts: [[34, 58], [70, 58], [74, 108], [26, 108]], color: 'fawn' }, // torso, slight lean
      ],
      details: [
        { type: 'poly', verts: [[52, 30], [74, 30], [74, 56], [52, 56]], color: 'white' },   // front-half cream patch
        { type: 'poly', verts: [[54, 40], [70, 37], [70, 47], [54, 50]], color: 'cocoa' },   // eye stripe toward snout
        { type: 'poly', verts: [[71, 49], [78, 49], [74.5, 55]], color: 'cocoa' },           // nose at snout tip
        { type: 'poly', verts: [[44, 72], [62, 72], [64, 100], [42, 100]], color: 'amber' }, // belly hint, biased forward
        { type: 'poly', verts: [[26, 108], [40, 108], [40, 116], [26, 116]], color: 'cocoa' }, // far foot
        { type: 'poly', verts: [[44, 108], [66, 108], [66, 116], [44, 116]], color: 'cocoa' }, // near foot
      ],
      appendages: [
        // ONE near arm (keeps the ≤6-animated-prop budget), claw visible.
        {
          id: 'armSide',
          polys: [
            { verts: [[46, 60], [56, 62], [54, 98], [44, 96]], color: 'fawn' },
            { verts: [[44, 96], [54, 98], [53, 104], [43, 102]], color: 'cocoa' }, // claw
          ],
          origin: [51, 63],
          layer: 'front',
        },
      ],
      eyes: { points: [[62, 44]], radius: 3.2, maxGaze: 3 },
      cheeks: { points: [[56, 52]], radius: 3.2 },
    },
  },
};

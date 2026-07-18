// Rumi — lion, Wayfinder protagonist (the child clears the way; Rumi
// bravely walks it). The amber mane ring is his identity carrier — it reads
// from every facing, the way Lento's cocoa eye-mask does. Fawn face and
// body, cocoa nose/ear-tips/paws/tail-tuft, cream muzzle. Brisk blink:
// where Lento is the cast's slowest, Rumi is bright-eyed and game.
//
// Same bounding bands as Lento (head ~y18–64, torso y58–108, feet y108–116)
// so the mid-turn view swap at scaleX 0 reads as rotation, not morphing.
export default {
  id: 'rumi',
  viewBox: [100, 120],
  feetY: 116,
  shadow: { cx: 50, cy: 116, rx: 33 },
  blink: { close: 90, open: 130 },
  masses: [
    // The mane: a chunky amber octagon ring, head-sized-plus.
    { verts: [[36, 18], [64, 18], [78, 30], [78, 52], [64, 64], [36, 64], [22, 52], [22, 30]], color: 'amber' },
    { verts: [[32, 58], [68, 58], [74, 108], [26, 108]], color: 'fawn' }, // squat torso
  ],
  details: [
    // Fawn face plate inset in the mane
    { type: 'poly', verts: [[38, 26], [62, 26], [70, 33], [70, 52], [62, 58], [38, 58], [30, 52], [30, 33]], color: 'fawn' },
    { type: 'poly', verts: [[32, 24], [38, 15], [44, 22]], color: 'cocoa' },  // ear tip L over the mane
    { type: 'poly', verts: [[56, 22], [62, 15], [68, 24]], color: 'cocoa' },  // ear tip R
    { type: 'poly', verts: [[42, 46], [58, 46], [58, 57], [42, 57]], color: 'white' }, // cream muzzle
    { type: 'poly', verts: [[46, 47], [54, 47], [50, 53]], color: 'cocoa' },  // nose
    { type: 'poly', verts: [[38, 72], [62, 72], [64, 100], [36, 100]], color: 'amber' }, // belly patch
    { type: 'poly', verts: [[30, 108], [42, 108], [42, 116], [30, 116]], color: 'cocoa' }, // paw L
    { type: 'poly', verts: [[58, 108], [70, 108], [70, 116], [58, 116]], color: 'cocoa' }, // paw R
  ],
  appendages: [
    // The signature: a slow proud tail-tip swish, peeking past the torso.
    {
      id: 'tail',
      polys: [
        { verts: [[74, 84], [80, 82], [84, 102], [78, 104]], color: 'fawn' },
        { verts: [[78, 104], [84, 102], [86, 110], [79, 112]], color: 'cocoa' }, // tuft
      ],
      origin: [77, 85],
      layer: 'behind',
    },
  ],
  eyes: { left: [41, 41], right: [59, 41], radius: 3.2, maxGaze: 3 },
  cheeks: { points: [[36, 50], [64, 50]], radius: 3.2 },

  // Wayfinder facing views — same contract as Lento's: keys omitted fall
  // back to the front def; eyes/cheeks explicitly null on the back.
  views: {
    // Facing away (N): from behind a lion is nearly ALL mane — the ring
    // stays the whole silhouette, amber spills onto the shoulders, and the
    // tail swishes on the viewer's side of the body.
    back: {
      masses: [
        { verts: [[36, 18], [64, 18], [78, 30], [78, 52], [64, 64], [36, 64], [22, 52], [22, 30]], color: 'amber' },
        { verts: [[32, 58], [68, 58], [74, 108], [26, 108]], color: 'fawn' },
      ],
      details: [
        { type: 'poly', verts: [[32, 24], [38, 15], [44, 22]], color: 'cocoa' },  // ear tip L
        { type: 'poly', verts: [[56, 22], [62, 15], [68, 24]], color: 'cocoa' },  // ear tip R
        { type: 'poly', verts: [[34, 58], [66, 58], [60, 74], [40, 74]], color: 'amber' }, // mane over shoulders
        { type: 'poly', verts: [[30, 108], [42, 108], [42, 116], [30, 116]], color: 'cocoa' }, // heel L
        { type: 'poly', verts: [[58, 108], [70, 108], [70, 116], [58, 116]], color: 'cocoa' }, // heel R
      ],
      appendages: [
        {
          id: 'tailBack',
          polys: [
            { verts: [[47, 88], [53, 88], [52, 106], [48, 106]], color: 'fawn' },
            { verts: [[48, 106], [52, 106], [54, 114], [46, 114]], color: 'cocoa' }, // tuft
          ],
          origin: [50, 89],
          layer: 'front', // the tail is on the viewer's side from behind
        },
      ],
      eyes: null,
      cheeks: null,
    },
    // Profile, drawn facing EAST; West is scaleX −1 in the consumer. The
    // mane becomes a crescent behind the head block, the snout leads.
    side: {
      masses: [
        // Mane crescent, set back
        { verts: [[24, 16], [58, 16], [66, 28], [66, 54], [58, 66], [24, 66], [16, 50], [16, 30]], color: 'amber' },
        { verts: [[38, 28], [80, 28], [80, 58], [38, 58]], color: 'fawn' },   // head, snout-shifted
        { verts: [[34, 58], [70, 58], [74, 108], [26, 108]], color: 'fawn' }, // torso
      ],
      details: [
        { type: 'poly', verts: [[52, 24], [58, 16], [63, 26]], color: 'cocoa' },  // ear tip
        { type: 'poly', verts: [[62, 44], [80, 44], [80, 58], [62, 58]], color: 'white' }, // muzzle
        { type: 'poly', verts: [[73, 47], [80, 47], [76.5, 53]], color: 'cocoa' },         // nose at snout tip
        { type: 'poly', verts: [[44, 72], [62, 72], [64, 100], [42, 100]], color: 'amber' }, // belly hint
        // Tail tucked low on the trailing side — static in profile
        { type: 'poly', verts: [[20, 84], [26, 82], [30, 100], [24, 102]], color: 'fawn' },
        { type: 'poly', verts: [[24, 102], [30, 100], [32, 108], [25, 110]], color: 'cocoa' },
        { type: 'poly', verts: [[28, 108], [42, 108], [42, 116], [28, 116]], color: 'cocoa' }, // far paw
        { type: 'poly', verts: [[46, 108], [68, 108], [68, 116], [46, 116]], color: 'cocoa' }, // near paw
      ],
      appendages: [
        // ONE near foreleg (the ≤6-animated-prop budget), pawed.
        {
          id: 'legSide',
          polys: [
            { verts: [[48, 60], [58, 62], [56, 98], [46, 96]], color: 'fawn' },
            { verts: [[46, 96], [56, 98], [55, 104], [45, 102]], color: 'cocoa' }, // paw
          ],
          origin: [53, 63],
          layer: 'front',
        },
      ],
      eyes: { points: [[66, 40]], radius: 3.2, maxGaze: 3 },
      cheeks: { points: [[60, 50]], radius: 3.2 },
    },
  },
};

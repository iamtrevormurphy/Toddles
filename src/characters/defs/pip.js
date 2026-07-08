// Pip — bird, Tangram companion and app brand mark. Built from the app's
// shape vocabulary (squares, right triangles, a parallelogram wing) like the
// `bird` tangram puzzle the child can build. Faces left.
// Dominant teal, cornflower wing/tail, amber beak/feet, terracotta crest.
export default {
  id: 'pip',
  viewBox: [100, 112],
  feetY: 102,
  shadow: { cx: 48, cy: 106, rx: 28 },
  // Main masses get 2.5D extrusion (sides drawn first, then faces)
  masses: [
    { verts: [[24, 54], [68, 54], [68, 94], [24, 94]], color: 'teal' }, // body
    { verts: [[24, 20], [58, 20], [58, 54], [24, 54]], color: 'teal' }, // head
  ],
  // Static details, drawn over the masses
  details: [
    { type: 'poly', verts: [[36, 20], [48, 20], [42, 10]], color: 'terracotta' }, // crest
    { type: 'poly', verts: [[24, 32], [24, 44], [12, 38]], color: 'amber' },      // beak
    { type: 'poly', verts: [[68, 76], [84, 84], [68, 92]], color: 'cornflower' }, // tail
    { type: 'poly', verts: [[36, 94], [44, 94], [44, 102], [36, 102]], color: 'amber' }, // foot L
    { type: 'poly', verts: [[52, 94], [60, 94], [60, 102], [52, 102]], color: 'amber' }, // foot R
  ],
  // Animated appendage layers (rotate about `origin`, degrees)
  appendages: [
    {
      id: 'wing',
      polys: [{ verts: [[34, 62], [60, 62], [50, 78], [24, 78]], color: 'cornflower' }],
      origin: [34, 66],
      layer: 'front',
    },
  ],
  eyes: { left: [34, 34], right: [48, 34], radius: 3, maxGaze: 2.6 },
  cheeks: { points: [[30, 44], [52, 44]], radius: 3.2 },
};

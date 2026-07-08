// Miso — cat, Home-screen greeter (reserved as companion for game #3).
// Descends from the `cat` tangram puzzle. Dominant terracotta, amber inner
// ears, moss collar. Signature: the slow parallelogram tail metronome.
export default {
  id: 'miso',
  viewBox: [100, 118],
  feetY: 118,
  shadow: { cx: 52, cy: 115, rx: 32 },
  masses: [
    { verts: [[30, 28], [66, 28], [66, 64], [30, 64]], color: 'terracotta' }, // head
    { verts: [[30, 64], [78, 110], [30, 110]], color: 'terracotta' },         // body
  ],
  details: [
    { type: 'poly', verts: [[30, 28], [42, 28], [32, 13]], color: 'terracotta' }, // ear L
    { type: 'poly', verts: [[54, 28], [66, 28], [64, 13]], color: 'terracotta' }, // ear R
    { type: 'poly', verts: [[33, 27], [40, 27], [34.5, 18]], color: 'amber' },    // inner ear L
    { type: 'poly', verts: [[56, 27], [63, 27], [61.5, 18]], color: 'amber' },    // inner ear R
    { type: 'poly', verts: [[32, 64], [60, 64], [58, 70], [32, 70]], color: 'moss' }, // collar
    { type: 'poly', verts: [[46, 52], [54, 52], [50, 57]], color: 'rose' },       // nose
  ],
  appendages: [
    {
      id: 'tail',
      polys: [{ verts: [[74, 104], [88, 90], [94, 96], [80, 110]], color: 'terracotta' }],
      origin: [77, 107],
      layer: 'behind',
    },
  ],
  eyes: { left: [42, 44], right: [56, 44], radius: 3, maxGaze: 2.6 },
  cheeks: { points: [[37, 53], [61, 53]], radius: 3 },
};

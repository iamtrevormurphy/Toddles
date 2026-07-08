// Juno — rabbit, NumberMarble companion. Descends from the `rabbit` tangram
// puzzle; the tall parallelogram ears are her expressive signature (perk,
// droop, sway). Dominant lavender, rose chest/inner-ear/nose, amber tail.
export default {
  id: 'juno',
  viewBox: [100, 132],
  feetY: 128,
  shadow: { cx: 56, cy: 128, rx: 33 },
  masses: [
    { verts: [[32, 44], [68, 44], [68, 80], [32, 80]], color: 'lavender' },  // head
    { verts: [[32, 80], [68, 80], [68, 124], [32, 124]], color: 'lavender' }, // body
    { verts: [[68, 124], [68, 96], [88, 124]], color: 'lavender' },           // haunch
  ],
  details: [
    { type: 'poly', verts: [[32, 104], [32, 124], [52, 124]], color: 'rose' },   // chest
    { type: 'circle', cx: 78, cy: 114, r: 6, color: 'amber' },                    // tail
    { type: 'poly', verts: [[46, 68], [54, 68], [50, 73]], color: 'rose' },       // nose
  ],
  appendages: [
    {
      id: 'earL',
      polys: [
        { verts: [[32, 8], [42, 14], [42, 48], [32, 42]], color: 'lavender' },
        { verts: [[35, 15], [39, 17.5], [39, 42], [35, 39.5]], color: 'rose' },
      ],
      origin: [37, 45],
      layer: 'behind',
    },
    {
      id: 'earR',
      polys: [
        { verts: [[58, 14], [68, 8], [68, 42], [58, 48]], color: 'lavender' },
        { verts: [[61, 17.5], [65, 15], [65, 39.5], [61, 42]], color: 'rose' },
      ],
      origin: [63, 45],
      layer: 'behind',
      mirror: true, // rotation direction flips so both ears sway outward together
    },
  ],
  eyes: { left: [42, 60], right: [58, 60], radius: 3.2, maxGaze: 2.8 },
  cheeks: { points: [[37, 70], [63, 70]], radius: 3.2 },
};

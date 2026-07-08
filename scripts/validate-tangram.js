#!/usr/bin/env node
// Authoring check for Tangram puzzle data. Run with: node scripts/validate-tangram.js
//
// Loads the real game source (geometry, shapes, transforms, puzzles) by
// stripping ES module syntax, then verifies for every puzzle:
//   - slot shapes exist, rotations are 45° steps, centers are on the 10px grid
//   - no two slot polygons overlap (shared edges are allowed)
//   - everything fits inside the 320x320 puzzle space
// and reports each puzzle's extent so pictures can be centered.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function loadModule(relPath, context) {
  let src = fs.readFileSync(path.join(root, relPath), 'utf8');
  src = src
    .replace(/^import[^;]*;$/gm, '')
    .replace(/^export default[^;]*;$/gm, '')
    .replace(/^export /gm, '');
  vm.runInContext(src, context, { filename: relPath });
}

const context = vm.createContext({ console });
// Stub the theme imports used by shapes.js (colors are irrelevant to geometry).
vm.runInContext(
  `const TANGRAM_COLORS = new Proxy({}, { get: () => "#000000" });
   const DEPTH = { extrude: { dx: 0, dy: 8 }, sideShade: 0.22 };
   const shade = () => "#000000";`,
  context
);
loadModule('src/utils/geometry.js', context);
loadModule('src/games/Tangram/shapes.js', context);
loadModule('src/games/Tangram/transforms.js', context);
loadModule('src/games/Tangram/puzzles.js', context);

const { PUZZLES, SHAPES, getSlotPolygon, polygonsOverlap, polygonBounds } =
  vm.runInContext(
    '({ PUZZLES, SHAPES, getSlotPolygon, polygonsOverlap, polygonBounds })',
    context
  );

let failures = 0;

for (const puzzle of PUZZLES) {
  const problems = [];
  const polygons = puzzle.slots.map((slot, i) => {
    if (!SHAPES[slot.shape]) problems.push(`slot ${i}: unknown shape "${slot.shape}"`);
    if ((slot.rotation || 0) % 45 !== 0) problems.push(`slot ${i}: rotation ${slot.rotation} not a 45° step`);
    if (slot.cx % 10 !== 0 || slot.cy % 10 !== 0) problems.push(`slot ${i}: center (${slot.cx},${slot.cy}) off the 10px grid`);
    if (slot.flip && slot.shape !== 'parallelogram') problems.push(`slot ${i}: flip on non-parallelogram`);
    return getSlotPolygon(slot);
  });

  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      // tolerance 1 ignores shared edges/corners; only real overlaps fail
      if (polygonsOverlap(polygons[i], polygons[j], 1)) {
        problems.push(`slots ${i} (${puzzle.slots[i].shape}) and ${j} (${puzzle.slots[j].shape}) overlap`);
      }
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygons) {
    const b = polygonBounds(poly);
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
  }
  if (minX < 0 || minY < 0 || maxX > 320 || maxY > 320) {
    problems.push(`extends outside puzzle space: x ${minX}..${maxX}, y ${minY}..${maxY}`);
  }

  const cx = ((minX + maxX) / 2).toFixed(0);
  const cy = ((minY + maxY) / 2).toFixed(0);
  const status = problems.length ? 'FAIL' : 'ok';
  console.log(
    `${status.padEnd(4)} ${puzzle.id.padEnd(10)} pieces=${String(puzzle.slots.length).padEnd(2)} ` +
    `extent x ${minX}..${maxX}, y ${minY}..${maxY} (center ${cx},${cy})`
  );
  for (const p of problems) console.log(`       - ${p}`);
  if (problems.length) failures++;
}

console.log(failures ? `\n${failures} puzzle(s) failed` : '\nAll puzzles valid');
process.exit(failures ? 1 : 0);

#!/usr/bin/env node
// Authoring/logic check for the Path-Maker engine. Run with:
//   node scripts/validate-pathmaker.js
//
// Loads the real game source (grid + executeProgram + levels) by stripping
// ES module syntax, then runs one case per outcome type plus level-data
// sanity checks. The engine has zero UI dependencies, so no stubbing is
// needed (unlike validate-tangram.js, which stubs theme colors).

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

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
loadModule('src/games/PathMaker/grid.js', context);
loadModule('src/games/PathMaker/executeProgram.js', context);
loadModule('src/games/PathMaker/levels.js', context);
loadModule('src/games/PathMaker/trackLayout.js', context);

const { TILE_TYPES, executeProgram, PATHMAKER_LEVELS, computeSlotCenters, nearestInsertionIndex, layoutPositions } =
  vm.runInContext(
    '({ TILE_TYPES, executeProgram, PATHMAKER_LEVELS, computeSlotCenters, nearestInsertionIndex, layoutPositions })',
    context
  );

const { PATH, GAP, RAISED, GOAL } = TILE_TYPES;

function board(width, height, tiles) {
  return { width, height, tiles };
}

let failures = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL ${name}`);
    console.log(`     - ${err.message}`);
  }
}

run('success: reaches goal in a straight corridor', () => {
  const b = board(1, 3, [GOAL, PATH, PATH]); // y=0 goal, y=2 start
  const result = executeProgram(b, { x: 0, y: 2, facing: 'N' }, ['step', 'step']);
  assert.strictEqual(result.outcome, 'success');
  assert.strictEqual(result.failIndex, null);
  assert.strictEqual(result.steps.length, 2);
});

run('gap: stepping into a gap bugs out, net displacement zero', () => {
  const b = board(1, 2, [GAP, PATH]); // y=0 gap, y=1 start
  const result = executeProgram(b, { x: 0, y: 1, facing: 'N' }, ['step']);
  assert.strictEqual(result.outcome, 'gap');
  assert.strictEqual(result.failIndex, 0);
  assert.deepStrictEqual(result.steps[0].to, result.steps[0].from);
});

run('edge: stepping off the island bugs out', () => {
  const b = board(1, 1, [PATH]);
  const result = executeProgram(b, { x: 0, y: 0, facing: 'N' }, ['step']);
  assert.strictEqual(result.outcome, 'edge');
  assert.strictEqual(result.failIndex, 0);
});

run('blocked: stepping onto a raised tile without hop bugs out', () => {
  const b = board(1, 2, [RAISED, PATH]); // y=0 raised, y=1 start
  const result = executeProgram(b, { x: 0, y: 1, facing: 'N' }, ['step']);
  assert.strictEqual(result.outcome, 'blocked');
  assert.strictEqual(result.failIndex, 0);
});

run('incomplete: program runs out before reaching the goal', () => {
  const b = board(1, 3, [GOAL, PATH, PATH]);
  const tiles = ['step'];
  const result = executeProgram(b, { x: 0, y: 2, facing: 'N' }, tiles);
  assert.strictEqual(result.outcome, 'incomplete');
  assert.strictEqual(result.failIndex, tiles.length);
});

run('turns compose: four right turns is a full circle', () => {
  const b = board(1, 1, [PATH]);
  const start = { x: 0, y: 0, facing: 'N' };
  const result = executeProgram(b, start, ['turnRight', 'turnRight', 'turnRight', 'turnRight']);
  assert.strictEqual(result.steps[result.steps.length - 1].to.facing, start.facing);
});

run('turns compose: left then right cancel', () => {
  const b = board(1, 1, [PATH]);
  const result = executeProgram(b, { x: 0, y: 0, facing: 'N' }, ['turnLeft', 'turnRight']);
  assert.strictEqual(result.steps[result.steps.length - 1].to.facing, 'N');
});

run('hop: mounts a raised tile and changes height', () => {
  const b = board(1, 2, [RAISED, PATH]); // y=0 raised, y=1 start
  const result = executeProgram(b, { x: 0, y: 1, facing: 'N' }, ['hop']);
  assert.strictEqual(result.steps[0].result, 'ok');
  assert.strictEqual(result.steps[0].to.height, 1);
});

run('start already on goal: zero-instruction success', () => {
  const b = board(1, 1, [GOAL]);
  const result = executeProgram(b, { x: 0, y: 0, facing: 'N' }, []);
  assert.strictEqual(result.outcome, 'success');
  assert.strictEqual(result.steps.length, 0);
});

run('level data sanity: PATHMAKER_LEVELS entries are well-formed', () => {
  for (const level of PATHMAKER_LEVELS) {
    const { board: b, start, solution, slotCount } = level;
    assert.strictEqual(b.tiles.length, b.width * b.height, `level ${level.id}: tile count mismatch`);

    const goalCount = b.tiles.filter((t) => t === GOAL).length;
    assert.strictEqual(goalCount, 1, `level ${level.id}: expected exactly one goal tile, found ${goalCount}`);

    assert.ok(
      start.x >= 0 && start.x < b.width && start.y >= 0 && start.y < b.height,
      `level ${level.id}: start position out of bounds`
    );
    const startTile = b.tiles[start.y * b.width + start.x];
    assert.notStrictEqual(startTile, GAP, `level ${level.id}: start position is a gap`);

    assert.ok(Array.isArray(solution) && solution.length > 0, `level ${level.id}: solution must be a non-empty array`);
    const validTypes = new Set(['step', 'turnLeft', 'turnRight', 'hop']);
    for (const type of solution) {
      assert.ok(validTypes.has(type), `level ${level.id}: invalid instruction "${type}"`);
    }

    assert.ok(Number.isInteger(slotCount) && slotCount > 0, `level ${level.id}: slotCount must be a positive integer`);
    assert.ok(
      solution.length <= slotCount,
      `level ${level.id}: solution (${solution.length}) doesn't fit in the visible track (${slotCount} slots)`
    );
  }
});

run('every level\'s solution actually solves that level', () => {
  for (const level of PATHMAKER_LEVELS) {
    const result = executeProgram(level.board, level.start, level.solution);
    assert.strictEqual(
      result.outcome,
      'success',
      `level ${level.id}: authored solution does not reach the goal (outcome: ${result.outcome}, failIndex: ${result.failIndex})`
    );
  }
});

run('trackLayout: nearestInsertionIndex resolves start/middle/end/empty', () => {
  const centers = computeSlotCenters(5);
  const track = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  assert.strictEqual(nearestInsertionIndex(centers[0] - 100, centers, null, track), 0, 'before everything');
  assert.strictEqual(nearestInsertionIndex(centers[1] + 1, centers, null, track), 2, 'just past the middle tile');
  assert.strictEqual(nearestInsertionIndex(centers[2] + 100, centers, null, track), 3, 'after everything');
  assert.strictEqual(nearestInsertionIndex(centers[0], centers, null, []), 0, 'empty track always resolves to 0');
});

run('trackLayout: reordering excludes the dragged tile\'s own slot', () => {
  const centers = computeSlotCenters(5);
  const track = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  // With "b" excluded, the remaining tiles ("a", "c") compact down to
  // centers[0]/centers[1] — dropping "b" back between them should
  // resolve to index 1, its original slot, even though "b" itself no
  // longer occupies any center in this excluded view.
  const dragX = (centers[0] + centers[1]) / 2 + 1;
  const index = nearestInsertionIndex(dragX, centers, 'b', track);
  assert.strictEqual(index, 1);
});

run('trackLayout: layoutPositions matches plain compacted order when idle', () => {
  const centers = computeSlotCenters(5);
  const track = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const positions = layoutPositions(track, centers, {});
  assert.strictEqual(positions.a, centers[0]);
  assert.strictEqual(positions.b, centers[1]);
  assert.strictEqual(positions.c, centers[2]);
});

run('trackLayout: layoutPositions opens a gap at previewIndex', () => {
  const centers = computeSlotCenters(5);
  const track = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const positions = layoutPositions(track, centers, { previewIndex: 1 });
  assert.strictEqual(positions.a, centers[0], 'before the gap: unchanged');
  assert.strictEqual(positions.b, centers[2], 'at/after the gap: shifted right one slot');
  assert.strictEqual(positions.c, centers[3], 'at/after the gap: shifted right one slot');
});

console.log(failures ? `\n${failures} case(s) failed` : '\nAll Path-Maker engine cases passed');
process.exit(failures ? 1 : 0);

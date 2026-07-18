#!/usr/bin/env node
// Authoring/logic check for the Wayfinder engine. Run with:
//   node scripts/validate-wayfinder.js
//
// Loads the real game source (journey + executeJourney + levels + iso) by
// stripping ES module syntax — same harness as validate-pathmaker.js. The
// engine and the projection have zero UI dependencies, so no stubbing.

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
loadModule('src/games/Wayfinder/journey.js', context);
loadModule('src/games/Wayfinder/executeJourney.js', context);
loadModule('src/games/Wayfinder/levels.js', context);
loadModule('src/games/Wayfinder/iso.js', context);

const {
  TOOL_FOR_KIND,
  facingAt,
  startFacing,
  obstacleSpan,
  evaluateAction,
  applyAction,
  initialState,
  solveJourney,
  WAYFINDER_LEVELS,
  isoProject,
  ISO_W,
  ISO_H,
  PIER_DROP,
  CHAR_W,
  CHAR_H,
} = vm.runInContext(
  `({ TOOL_FOR_KIND, facingAt, startFacing, obstacleSpan, evaluateAction,
      applyAction, initialState, solveJourney, WAYFINDER_LEVELS,
      isoProject, ISO_W, ISO_H, PIER_DROP, CHAR_W, CHAR_H })`,
  context
);

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

// A synthetic level exercising all three obstacle kinds in order:
// gap → rise up → wall(2 span, height 2) → goal.
const FIXTURE = {
  id: 999,
  path: [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 2, y: 0, z: 0 }, // gap
    { x: 3, y: 0, z: 0 },
    { x: 4, y: 0, z: 1 }, // rise seam
    { x: 5, y: 0, z: 1 },
    { x: 6, y: 0, z: 1 }, // wall
    { x: 7, y: 0, z: 1 }, // wall
    { x: 8, y: 0, z: 1 }, // goal
  ],
  obstacles: [
    { kind: 'gap', enter: 2, span: 1 },
    { kind: 'rise', enter: 4 },
    { kind: 'wall', enter: 6, span: 2, height: 2 },
  ],
  decor: [],
};

// vm-context Sets are fine to construct host-side; only prototypes differ,
// and the engine never does instanceof checks.
function state(index, built = []) {
  return { index, built: new Set(built) };
}

run('walk: move stops on the cell before the first unbuilt obstacle', () => {
  const result = evaluateAction(FIXTURE, state(0), 'move');
  assert.strictEqual(result.kind, 'walk');
  assert.strictEqual(result.cells.length, 1);
  assert.strictEqual(result.cells[0].index, 1);
  assert.strictEqual(result.stoppedBy, 0);
  assert.strictEqual(result.reachedGoal, false);
});

run('walk: built obstacles are walked straight through', () => {
  const result = evaluateAction(FIXTURE, state(1, [0]), 'move');
  assert.strictEqual(result.kind, 'walk');
  // From index 1 through the bridged gap up to index 3 (before the rise).
  // JSON-compare: vm-context arrays fail deepStrictEqual's prototype check.
  assert.strictEqual(JSON.stringify(result.cells.map((c) => c.index)), '[2,3]');
  assert.strictEqual(result.stoppedBy, 1);
});

run('walk: tunnel cells carry throughWall for the doorway fade', () => {
  const result = evaluateAction(FIXTURE, state(5, [0, 1, 2]), 'move');
  assert.strictEqual(result.kind, 'walk');
  assert.strictEqual(result.reachedGoal, true);
  const walls = result.cells.map((c) => c.throughWall);
  assert.strictEqual(JSON.stringify(walls), '[2,2,null]'); // cells 6,7 inside, 8 out
});

run('build: correct tool at the seam', () => {
  const result = evaluateAction(FIXTURE, state(1), 'bridge');
  assert.strictEqual(result.kind, 'build');
  assert.strictEqual(result.obIndex, 0);
});

run('mismatch: each wrong tool at the seam names the obstacle', () => {
  for (const tool of ['stairs', 'tunnel']) {
    const result = evaluateAction(FIXTURE, state(1), tool);
    assert.strictEqual(result.kind, 'mismatch');
    assert.strictEqual(result.obIndex, 0);
    assert.strictEqual(result.tool, tool);
  }
});

run('noop blocked: move with an unbuilt obstacle directly ahead', () => {
  const result = evaluateAction(FIXTURE, state(1), 'move');
  assert.strictEqual(result.kind, 'noop');
  assert.strictEqual(result.reason, 'blocked');
  assert.strictEqual(result.obIndex, 0);
});

run('noop nothing-to-build: tool tapped away from any seam', () => {
  const result = evaluateAction(FIXTURE, state(0), 'bridge');
  assert.strictEqual(result.kind, 'noop');
  assert.strictEqual(result.reason, 'nothing-to-build');
});

run('noop at-goal: move after arrival', () => {
  const result = evaluateAction(FIXTURE, state(8, [0, 1, 2]), 'move');
  assert.strictEqual(result.kind, 'noop');
  assert.strictEqual(result.reason, 'at-goal');
});

run('applyAction: walk advances index, build grows the set, others no-op', () => {
  const walk = evaluateAction(FIXTURE, state(0), 'move');
  assert.strictEqual(applyAction(state(0), walk).index, 1);
  const build = evaluateAction(FIXTURE, state(1), 'bridge');
  const next = applyAction(state(1), build);
  assert.strictEqual(next.index, 1);
  assert.ok(next.built.has(0));
  const mismatch = evaluateAction(FIXTURE, state(1), 'stairs');
  const before = state(1);
  assert.strictEqual(applyAction(before, mismatch), before);
});

run('stairs down: a negative rise seam types the same way', () => {
  const down = {
    id: 998,
    path: [
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 2, y: 0, z: 0 }, // rise seam (down)
      { x: 3, y: 0, z: 0 },
    ],
    obstacles: [{ kind: 'rise', enter: 2 }],
    decor: [],
  };
  const result = evaluateAction(down, state(1), 'stairs');
  assert.strictEqual(result.kind, 'build');
});

run('solveJourney: fixture solves in strict move/tool alternation', () => {
  const { taps, reachedGoal } = solveJourney(FIXTURE);
  assert.strictEqual(reachedGoal, true);
  assert.strictEqual(
    JSON.stringify(taps),
    JSON.stringify(['move', 'bridge', 'move', 'stairs', 'move', 'tunnel', 'move'])
  );
});

run('facing: startFacing and corner facings derive from path deltas', () => {
  assert.strictEqual(startFacing(FIXTURE), 'E');
  const corner = {
    id: 997,
    path: [
      { x: 0, y: 2, z: 0 },
      { x: 1, y: 2, z: 0 },
      { x: 1, y: 1, z: 0 },
    ],
    obstacles: [],
    decor: [],
  };
  assert.strictEqual(facingAt(corner, 1), 'E');
  assert.strictEqual(facingAt(corner, 2), 'N');
});

// ---------------------------------------------------------------------------
// Level-data sanity for every authored level
// ---------------------------------------------------------------------------

function obstacleLastIndex(ob) {
  return ob.kind === 'rise' ? ob.enter : ob.enter + ob.span - 1;
}

run('levels: path integrity (4-connected, unique cells, z only at rises)', () => {
  for (const level of WAYFINDER_LEVELS) {
    const { path: p, obstacles } = level;
    assert.ok(p.length >= 2, `level ${level.id}: path too short`);
    const seen = new Set();
    for (const cell of p) {
      const key = `${cell.x},${cell.y}`;
      assert.ok(!seen.has(key), `level ${level.id}: repeated cell ${key}`);
      seen.add(key);
    }
    for (let i = 1; i < p.length; i++) {
      const dx = Math.abs(p[i].x - p[i - 1].x);
      const dy = Math.abs(p[i].y - p[i - 1].y);
      assert.strictEqual(dx + dy, 1, `level ${level.id}: path[${i - 1}]→[${i}] not 4-connected`);
      const dz = p[i].z - p[i - 1].z;
      const rise = obstacles.find((ob) => ob.kind === 'rise' && ob.enter === i);
      if (rise) {
        assert.strictEqual(Math.abs(dz), 1, `level ${level.id}: rise at ${i} has |dz|=${Math.abs(dz)}`);
      } else {
        assert.strictEqual(dz, 0, `level ${level.id}: undeclared z change at path[${i}]`);
      }
    }
  }
});

run('levels: obstacle typing, ordering, spans, and standable stop cells', () => {
  for (const level of WAYFINDER_LEVELS) {
    const lastPathIndex = level.path.length - 1;
    let minEnter = 1;
    for (const ob of level.obstacles) {
      assert.ok(['gap', 'rise', 'wall'].includes(ob.kind), `level ${level.id}: unknown kind "${ob.kind}"`);
      assert.ok(ob.enter >= minEnter, `level ${level.id}: obstacle at ${ob.enter} overlaps/precedes the previous one`);
      if (ob.kind !== 'rise') {
        assert.ok(Number.isInteger(ob.span) && ob.span >= 1, `level ${level.id}: bad span at ${ob.enter}`);
        assert.ok(ob.enter + ob.span - 1 < lastPathIndex, `level ${level.id}: obstacle at ${ob.enter} swallows the goal`);
        // Bridges and tunnels are level: same z across approach + span + landing.
        const z = level.path[ob.enter - 1].z;
        for (let i = ob.enter; i <= ob.enter + ob.span; i++) {
          assert.strictEqual(level.path[i].z, z, `level ${level.id}: ${ob.kind} at ${ob.enter} is not level`);
        }
      }
      if (ob.kind === 'wall') {
        assert.ok(Number.isInteger(ob.height) && ob.height >= 2, `level ${level.id}: wall at ${ob.enter} must be ≥2 tall (small rises are stairs)`);
      }
      minEnter = obstacleLastIndex(ob) + 1;
    }
  }
});

run('levels: curriculum floor — ≥3 obstacles and ≥7 taps, goal reached', () => {
  for (const level of WAYFINDER_LEVELS) {
    assert.ok(level.obstacles.length >= 3, `level ${level.id}: only ${level.obstacles.length} obstacles (min 3)`);
    const { taps, reachedGoal } = solveJourney(level);
    assert.strictEqual(reachedGoal, true, `level ${level.id}: solution never reaches the goal`);
    assert.ok(taps.length >= 7, `level ${level.id}: solvable in ${taps.length} taps (min 7)`);
    for (let i = 0; i < taps.length; i++) {
      const expectMove = i % 2 === 0;
      assert.strictEqual(taps[i] === 'move', expectMove, `level ${level.id}: taps don't alternate move/tool`);
    }
  }
});

run('levels: decor stays off the walkway', () => {
  for (const level of WAYFINDER_LEVELS) {
    const pathCells = new Set(level.path.map((c) => `${c.x},${c.y}`));
    for (const d of level.decor ?? []) {
      assert.ok(!pathCells.has(`${d.x},${d.y}`), `level ${level.id}: decor on path at (${d.x},${d.y})`);
      assert.ok(Number.isInteger(d.height) && d.height >= 1, `level ${level.id}: decor height must be ≥1`);
      assert.ok(['flat', 'dome', 'finial'].includes(d.cap), `level ${level.id}: unknown decor cap "${d.cap}"`);
    }
  }
});

// ---------------------------------------------------------------------------
// Occlusion safety — the authoring rule that keeps the renderer simple.
// The character always paints ABOVE the board; therefore nothing that is
// screen-in-front of a path cell (greater x+y) may overlap the character box
// standing there, or the missing occlusion would read as a layering lie.
// Tall things are decor columns and wall masses; walkway slabs/piers hang
// below the deck line and can never reach a body box, so they're exempt.
// ---------------------------------------------------------------------------

function occlusionViolations(level) {
  const violations = [];
  const talls = [];
  for (const d of level.decor ?? []) {
    talls.push({ x: d.x, y: d.y, zTop: d.zBase + d.height, what: `decor (${d.x},${d.y})` });
  }
  level.obstacles.forEach((ob, obIndex) => {
    if (ob.kind !== 'wall') return;
    for (const i of obstacleSpan(ob)) {
      const cell = level.path[i];
      talls.push({ x: cell.x, y: cell.y, zTop: cell.z + ob.height, obIndex, what: `wall (${cell.x},${cell.y})` });
    }
  });

  level.path.forEach((cell, i) => {
    // Cells inside a wall span are exempt — Rumi is faded out in there.
    const insideWall = level.obstacles.some(
      (ob) => ob.kind === 'wall' && obstacleSpan(ob).includes(i)
    );
    if (insideWall) return;
    const c = isoProject(cell.x, cell.y, cell.z);
    const charRect = {
      left: c.x - CHAR_W / 2,
      right: c.x + CHAR_W / 2,
      top: c.y - CHAR_H,
      bottom: c.y - 2,
    };
    for (const tall of talls) {
      if (tall.x + tall.y <= cell.x + cell.y) continue; // not in front
      // Rumi's own wall while he stands at its seams: the doorway fade owns
      // that moment, so the cells adjacent to the span are exempt for it.
      if (tall.obIndex !== undefined) {
        const ob = level.obstacles[tall.obIndex];
        const span = obstacleSpan(ob);
        if (i >= span[0] - 1 && i <= span[span.length - 1] + 1) continue;
      }
      const top = isoProject(tall.x, tall.y, tall.zTop);
      const base = isoProject(tall.x, tall.y, 0);
      const tallRect = {
        left: top.x - ISO_W / 2,
        right: top.x + ISO_W / 2,
        top: top.y - ISO_H / 2,
        bottom: base.y + ISO_H / 2 + PIER_DROP,
      };
      const overlaps =
        charRect.left < tallRect.right &&
        charRect.right > tallRect.left &&
        charRect.top < tallRect.bottom &&
        charRect.bottom > tallRect.top;
      if (overlaps) {
        violations.push(`path[${i}] at (${cell.x},${cell.y}) is occluded by ${tall.what}`);
      }
    }
  });
  return violations;
}

run('occlusion: the checker itself catches a bad level', () => {
  const bad = {
    id: 996,
    path: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ],
    obstacles: [],
    decor: [{ x: 1, y: 1, zBase: 0, height: 3, cap: 'flat' }], // right in front of path[1]
  };
  assert.ok(occlusionViolations(bad).length > 0, 'expected the planted violation to be caught');
});

run('occlusion: every authored level is occlusion-safe', () => {
  for (const level of WAYFINDER_LEVELS) {
    const violations = occlusionViolations(level);
    assert.strictEqual(
      violations.length,
      0,
      `level ${level.id}: ${violations.join('; ')}`
    );
  }
});

console.log(failures ? `\n${failures} case(s) failed` : '\nAll Wayfinder engine cases passed');
process.exit(failures ? 1 : 0);

import { pointInPolygon, polygonBounds } from '../../utils/geometry';
import { shade } from '../../constants/theme';
import { getShape } from './shapes';
import { getSlotPolygon } from './transforms';

// The monument plan: which Monument-Valley ornament grows on each slot once
// its piece settles. Pure puzzle-space geometry — rendering lives in
// Ornaments.js. Everything is deterministic (no RNG) so a puzzle always
// builds into the same little monument.
//
// Restraint rules (design direction): at most ONE ornament per piece, at
// most MAX_ORNAMENTS per puzzle, assigned in priority order:
//   flag (summit) → doorway (base) → stairs (one long diagonal) →
//   domes (≤2 flat roofs) → pool (one wide roof) → windows (leftovers).
// Ornaments are paint on the puzzle picture; slot data, snap geometry and
// hitboxes are untouched.

const EPS = 0.01;
const MAX_ORNAMENTS = 6;
const MAX_DOMES = 2;
const MAX_WINDOWS = 3;

// ---------------------------------------------------------------------------
// Polygon probes

function edges(polygon) {
  return polygon.map((p, i) => [p, polygon[(i + 1) % polygon.length]]);
}

function flatEdgeAtY(polygon, y) {
  for (const [[x1, y1], [x2, y2]] of edges(polygon)) {
    if (Math.abs(y1 - y2) < EPS && Math.abs(y1 - y) < EPS && Math.abs(x2 - x1) > EPS) {
      return { x1: Math.min(x1, x2), x2: Math.max(x1, x2), y: y1, width: Math.abs(x2 - x1) };
    }
  }
  return null;
}

// Where something can stand on this polygon: the midpoint of a flat roof
// edge, or the apex vertex when the top is a peak.
export function topPoint(polygon) {
  const b = polygonBounds(polygon);
  const roof = flatEdgeAtY(polygon, b.minY);
  if (roof) {
    return { x: (roof.x1 + roof.x2) / 2, y: roof.y, flat: true, width: roof.width };
  }
  const apex = polygon.find(([, py]) => Math.abs(py - b.minY) < EPS);
  return { x: apex[0], y: apex[1], flat: false, width: 0 };
}

function bottomEdge(polygon) {
  const b = polygonBounds(polygon);
  return flatEdgeAtY(polygon, b.maxY);
}

// Longest slanted (non-axis-aligned) edge — stairs live here.
function longestSlant(polygon) {
  let best = null;
  let bestLen = 0;
  for (const [[x1, y1], [x2, y2]] of edges(polygon)) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (Math.abs(dx) < EPS || Math.abs(dy) < EPS) continue;
    const len = Math.hypot(dx, dy);
    if (len > bestLen) {
      bestLen = len;
      best = y1 <= y2 ? { top: [x1, y1], bottom: [x2, y2], len } : { top: [x2, y2], bottom: [x1, y1], len };
    }
  }
  return best;
}

function centroid(polygon) {
  const n = polygon.length;
  const sx = polygon.reduce((a, [x]) => a + x, 0);
  const sy = polygon.reduce((a, [, y]) => a + y, 0);
  return { x: sx / n, y: sy / n };
}

// ---------------------------------------------------------------------------
// Stairs: replace the middle stretch of a slanted edge with 4 square steps;
// the teeth between the staircase and the edge chord are the filled shape.

function stairsPolygon(slant, polygon) {
  const STEPS = 4;
  const INSET = 0.18;
  const [ax, ay] = slant.top;
  const [bx, by] = slant.bottom;
  const a = [ax + (bx - ax) * INSET, ay + (by - ay) * INSET];
  const b = [ax + (bx - ax) * (1 - INSET), ay + (by - ay) * (1 - INSET)];

  const build = (horizontalFirst) => {
    const pts = [a];
    for (let i = 1; i <= STEPS; i++) {
      const tx = a[0] + ((b[0] - a[0]) * i) / STEPS;
      const ty = a[1] + ((b[1] - a[1]) * i) / STEPS;
      const [px, py] = pts[pts.length - 1];
      if (horizontalFirst) pts.push([tx, py], [tx, ty]);
      else pts.push([px, ty], [tx, ty]);
    }
    return pts;
  };

  // Pick the tracing order whose teeth fall inside the piece.
  for (const order of [true, false]) {
    const pts = build(order);
    const c = centroid(pts);
    if (pointInPolygon(c, polygon)) return pts;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plan assembly

export function getMonumentPlan(puzzle) {
  const slots = puzzle.slots.map((slot, id) => {
    const polygon = getSlotPolygon(slot);
    return {
      id,
      polygon,
      bounds: polygonBounds(polygon),
      top: topPoint(polygon),
      color: getShape(slot.shape).color,
    };
  });

  const ornaments = new Array(slots.length).fill(null);
  const used = new Set();
  let count = 0;
  const claim = (slotId, ornament) => {
    ornaments[slotId] = ornament;
    used.add(slotId);
    count += 1;
  };

  const puzzleBounds = polygonBounds(slots.flatMap((s) => s.polygon));
  const centerX = (puzzleBounds.minX + puzzleBounds.maxX) / 2;

  // 'above' ornaments need open sky: nothing may sit on top of the roof
  // (a dome under another piece would poke through it).
  const clearAbove = (s) =>
    ![5, 14].some((dy) =>
      slots.some(
        (o) => o.id !== s.id && pointInPolygon({ x: s.top.x, y: s.top.y - dy }, o.polygon)
      )
    );

  // Where Pip can stand: his full standing height (~46 puzzle units above
  // the top point) must be open. Shared with GameScreen via the plan so the
  // planner and the perch logic never disagree.
  const standable = slots.map(
    (s) =>
      ![6, 20, 34, 46].some((dy) =>
        slots.some(
          (o) => o.id !== s.id && pointInPolygon({ x: s.top.x, y: s.top.y - dy }, o.polygon)
        )
      )
  );

  // --- Flag on the summit piece --------------------------------------------
  const summit = [...slots].sort(
    (p, q) => p.top.y - q.top.y || Math.abs(p.top.x - centerX) - Math.abs(q.top.x - centerX)
  )[0];
  claim(summit.id, {
    kind: 'flag',
    anchor: 'above',
    w: 30,
    h: 33,
    x: summit.top.x - 15,
    y: summit.top.y - 33,
  });

  // --- Doorway on the base piece (needs a flat bottom edge) ----------------
  const baseCandidates = [...slots]
    .filter((s) => !used.has(s.id))
    .sort(
      (p, q) =>
        q.bounds.maxY - p.bounds.maxY ||
        Math.abs(centroid(p.polygon).x - centerX) - Math.abs(centroid(q.polygon).x - centerX)
    );
  for (const s of baseCandidates) {
    const floor = bottomEdge(s.polygon);
    if (!floor || floor.width < 24) continue;
    const doorX = Math.min(Math.max((floor.x1 + floor.x2) / 2, floor.x1 + 10), floor.x2 - 10);
    claim(s.id, {
      kind: 'door',
      anchor: 'inset',
      w: 18,
      h: 20,
      x: doorX - 9,
      y: floor.y - 21,
    });
    break;
  }

  // --- Stairs down one long diagonal ---------------------------------------
  for (const s of slots) {
    if (used.has(s.id)) continue;
    if (!['largeTriangle', 'parallelogram'].includes(puzzle.slots[s.id].shape)) continue;
    const slant = longestSlant(s.polygon);
    if (!slant || slant.len < 50) continue;
    const pts = stairsPolygon(slant, s.polygon);
    if (!pts) continue;
    const b = polygonBounds(pts);
    claim(s.id, {
      kind: 'stairs',
      anchor: 'inset',
      w: b.maxX - b.minX,
      h: b.maxY - b.minY,
      x: b.minX,
      y: b.minY,
      points: pts.map(([px, py]) => [px - b.minX, py - b.minY]),
    });
    break;
  }

  // --- One rooftop pool on a wide flat roof (before domes, or the domes
  // claim every roof and the water never appears) ---------------------------
  if (count < MAX_ORNAMENTS) {
    const wide = [...slots]
      .filter((s) => !used.has(s.id) && s.top.flat && s.top.width >= 56)
      .sort((p, q) => q.top.width - p.top.width)[0];
    if (wide) {
      const w = Math.min(wide.top.width * 0.62, 54);
      claim(wide.id, {
        kind: 'pool',
        anchor: 'inset',
        w,
        h: 13,
        x: wide.top.x - w / 2,
        y: wide.top.y + 2,
      });
    }
  }

  // --- Domes on remaining open-sky flat roofs ------------------------------
  // Prefer roofs too cramped for Pip, and always leave him at least one
  // standable roof: the child placing a piece and Pip hopping onto it is
  // the point of the whole system — domes must not squat every perch.
  const roofs = [...slots].filter(
    (s) => !used.has(s.id) && s.top.flat && s.top.width >= 30 && clearAbove(s)
  );
  const domeOrder = [...roofs].sort(
    (p, q) =>
      (standable[p.id] ? 1 : 0) - (standable[q.id] ? 1 : 0) || p.top.y - q.top.y
  );
  let domes = domeOrder.slice(0, MAX_DOMES);
  const openPerches = roofs.filter((s) => standable[s.id]);
  if (
    openPerches.length > 0 &&
    domes.filter((s) => standable[s.id]).length === openPerches.length
  ) {
    domes = domes.filter((s, i) => i !== domes.length - 1 || !standable[s.id]);
  }
  for (const s of domes) {
    if (count >= MAX_ORNAMENTS) break;
    claim(s.id, {
      kind: 'dome',
      anchor: 'above',
      w: 26,
      h: 16,
      x: s.top.x - 13,
      y: s.top.y - 16,
    });
  }

  // --- Windows on every other leftover piece -------------------------------
  let windows = 0;
  slots.forEach((s, i) => {
    if (used.has(s.id) || count >= MAX_ORNAMENTS || windows >= MAX_WINDOWS) return;
    if (i % 2 !== 0) return;
    const c = centroid(s.polygon);
    claim(s.id, {
      kind: 'window',
      anchor: 'inset',
      w: 11,
      h: 14,
      x: c.x - 5.5,
      y: c.y - 7,
      fill: shade(s.color, 0.4),
    });
    windows += 1;
  });

  return { ornaments, slots, standable };
}

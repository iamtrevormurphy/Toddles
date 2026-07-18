import React, { useMemo } from 'react';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { MONUMENT_COLORS, WAYFINDER_COLORS } from '../../constants/theme';
import { OBSTACLE_KINDS, obstacleSpan } from './journey';
import {
  ISO_W,
  ISO_H,
  Z_STEP,
  SLAB,
  PIER_DROP,
  boardBounds,
  cellScreen,
  diamondPath,
  isoArchPath,
  sePath,
  swPath,
} from './iso';

const HW = ISO_W / 2;
const HH = ISO_H / 2;

// Dumb static painter for the dimetric causeway. Column-based painter's
// algorithm: one render column per occupied (x, y) — walkway slab (+ pier),
// wall prism, or decor tower — sorted by (x + y) ascending (screen back →
// front) and painted bottom-up within a column. For axis-aligned prisms in
// 2:1 dimetric this ordering is exact, so there is no per-polygon depth
// math anywhere. The character NEVER joins this sort: he always renders
// above the whole Svg, and the validator's occlusion-safety rule keeps
// levels from putting tall geometry in front of him (see
// scripts/validate-wayfinder.js).
//
// The whole board is decoration — the game is button-only — so the entire
// Svg is pointerEvents="none" and there is no hit-testing concern here.
export default function IsoBoard({ level, built }) {
  const columns = useMemo(() => buildColumns(level, built), [level, built]);
  const bounds = useMemo(() => boardBounds(level), [level]);

  return (
    <Svg
      pointerEvents="none"
      width={bounds.width}
      height={bounds.height}
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
    >
      {columns.map((col) => (
        <Column key={col.key} col={col} bounds={bounds} level={level} />
      ))}
    </Svg>
  );
}

// Every solid thing at one (x, y), pre-sorted for painting.
function buildColumns(level, built) {
  const builtSet = built instanceof Set ? built : new Set(built ?? []);
  const lastIndex = level.path.length - 1;

  // Path index → wall obstacle (if any) covering it.
  const wallAt = new Map();
  const gapAt = new Map();
  level.obstacles.forEach((ob, obIndex) => {
    for (const i of obstacleSpan(ob)) {
      if (ob.kind === OBSTACLE_KINDS.WALL) wallAt.set(i, { ob, obIndex });
      if (ob.kind === OBSTACLE_KINDS.GAP) gapAt.set(i, { ob, obIndex });
    }
  });

  const columns = level.path.map((cell, i) => {
    const gap = gapAt.get(i);
    const wall = wallAt.get(i);
    return {
      key: `p${i}`,
      sum: cell.x + cell.y,
      cell,
      pathIndex: i,
      isGoal: i === lastIndex,
      isGap: Boolean(gap),
      gapBuilt: gap ? builtSet.has(gap.obIndex) : false,
      wall: wall ? wall.ob : null,
      wallBuilt: wall ? builtSet.has(wall.obIndex) : false,
      // Travel axis through this cell, for tunnel-mouth placement.
      axis:
        i > 0 && level.path[i].x !== level.path[i - 1].x ? 'x' : 'y',
      // Deterministic pier scatter: ends of the walkway, corners, and
      // every third straight cell — enough support to read as aqueduct,
      // enough air for the arches between piers to breathe.
      hasPier:
        !gap &&
        (i === 0 ||
          i === lastIndex ||
          i % 3 === 0 ||
          (i > 0 && i < lastIndex && isCorner(level.path, i))),
    };
  });

  for (const d of level.decor ?? []) {
    columns.push({
      key: `d${d.x},${d.y}`,
      sum: d.x + d.y,
      decor: d,
    });
  }

  return columns.sort((a, b) => a.sum - b.sum);
}

function isCorner(path, i) {
  const dx1 = path[i].x - path[i - 1].x;
  const dx2 = path[i + 1].x - path[i].x;
  return dx1 !== dx2;
}

function Column({ col, bounds, level }) {
  if (col.decor) return <DecorColumn decor={col.decor} bounds={bounds} />;

  const { cell } = col;
  const top = cellScreen(bounds, cell);
  const deckY = cellScreen(bounds, { ...cell, z: 0 }).y;

  if (col.isGap && !col.gapBuilt) {
    // Missing decking: the dashed empty-slot affordance floating where the
    // slab belongs. (Once bridged, the Builds overlay owns this cell.)
    return (
      <Path
        d={diamondPath(top.x, top.y)}
        fill="none"
        stroke={WAYFINDER_COLORS.gapRim}
        strokeWidth={2}
        strokeDasharray="7 6"
        opacity={0.9}
      />
    );
  }
  if (col.isGap) return null; // bridged — the timber deck overlay covers it

  const pierTopY = top.y + SLAB;
  const pierBottomY = deckY + PIER_DROP;
  const pierDepth = pierBottomY - pierTopY;
  const f = 0.55; // pier footprint, narrowed inside the slab

  return (
    <>
      {/* Pier first (deepest), then slab sides, then the top face. */}
      {col.hasPier && pierDepth > 8 && (
        <>
          <Path
            d={quad(
              [top.x - HW * f, pierTopY + HH * 0],
              [top.x, pierTopY + HH * f],
              [top.x, pierTopY + HH * f + pierDepth],
              [top.x - HW * f, pierTopY + pierDepth]
            )}
            fill={WAYFINDER_COLORS.pierSW}
          />
          <Path
            d={quad(
              [top.x + HW * f, pierTopY],
              [top.x, pierTopY + HH * f],
              [top.x, pierTopY + HH * f + pierDepth],
              [top.x + HW * f, pierTopY + pierDepth]
            )}
            fill={WAYFINDER_COLORS.pierSE}
          />
          {/* Recessed arch near the pier foot — translucent ink, per the
              no-blur depth recipe. */}
          <Path
            d={isoArchPath(top.x, pierBottomY - 4, HW * 0.6, 30)}
            fill={MONUMENT_COLORS.doorway}
            opacity={0.28}
          />
        </>
      )}

      <Path d={swPath(top.x, top.y, SLAB)} fill={WAYFINDER_COLORS.stoneSW} />
      <Path d={sePath(top.x, top.y, SLAB)} fill={WAYFINDER_COLORS.stoneSE} />
      <Path
        d={diamondPath(top.x, top.y)}
        fill={col.isGoal ? WAYFINDER_COLORS.goalPad : WAYFINDER_COLORS.stoneTop}
        stroke={WAYFINDER_COLORS.stoneSE}
        strokeWidth={1}
        strokeOpacity={0.5}
      />

      {col.wall && <WallMass col={col} top={top} />}
      {col.isGoal && <GoalGate cx={top.x} cy={top.y} />}
    </>
  );
}

// The tunnel-able monument mass sitting on the deck of this cell. Drawn
// after the slab so it stacks on top; the tunnel mouth appears once built.
function WallMass({ col, top }) {
  const h = col.wall.height * Z_STEP;
  const wallTopY = top.y - h;
  return (
    <>
      <Path d={swPath(top.x, wallTopY, h)} fill={WAYFINDER_COLORS.wallSW} />
      <Path d={sePath(top.x, wallTopY, h)} fill={WAYFINDER_COLORS.wallSE} />
      <Path
        d={diamondPath(top.x, wallTopY)}
        fill={WAYFINDER_COLORS.wallTop}
        stroke={WAYFINDER_COLORS.wallSE}
        strokeWidth={1}
        strokeOpacity={0.5}
      />
      {col.wallBuilt && (
        // The carved mouth, centered on the face the walkway pierces:
        // the SE face for E/W travel, the SW face for N/S travel.
        <Path
          d={isoArchPath(
            col.axis === 'x' ? top.x + HW / 2 : top.x - HW / 2,
            top.y + HH,
            HW * 0.62,
            Math.min(h - 6, 44)
          )}
          fill={WAYFINDER_COLORS.doorway}
        />
      )}
    </>
  );
}

// A quiet domed shrine on the goal pad — the same monument vocabulary as
// PathMaker's GoalGate, redrawn for the dimetric world.
function GoalGate({ cx, cy }) {
  const baseY = cy - 4;
  return (
    <>
      <Path
        d={`M ${cx - 15} ${baseY} L ${cx - 15} ${baseY - 26} L ${cx - 9} ${baseY - 26} L ${cx - 9} ${baseY} Z`}
        fill={MONUMENT_COLORS.trim}
      />
      <Path
        d={`M ${cx + 9} ${baseY} L ${cx + 9} ${baseY - 26} L ${cx + 15} ${baseY - 26} L ${cx + 15} ${baseY} Z`}
        fill={MONUMENT_COLORS.trim}
      />
      <Path
        d={`M ${cx - 18} ${baseY - 26} L ${cx + 18} ${baseY - 26} L ${cx + 18} ${baseY - 31} L ${cx - 18} ${baseY - 31} Z`}
        fill={MONUMENT_COLORS.domeShade}
      />
      <Path
        d={`M ${cx - 12} ${baseY - 31} A 12 12 0 0 1 ${cx + 12} ${baseY - 31} Z`}
        fill={MONUMENT_COLORS.dome}
      />
      <Ellipse cx={cx} cy={baseY - 43} rx={2.6} ry={2.6} fill={MONUMENT_COLORS.trim} />
    </>
  );
}

// Non-path Monument Valley flavor: a stone tower with a flat, domed, or
// finial cap. Pure decoration; the validator keeps these out of Rumi's way.
function DecorColumn({ decor, bounds }) {
  const top = cellScreen(bounds, { x: decor.x, y: decor.y, z: decor.zBase + decor.height });
  const depth = decor.height * Z_STEP + (decor.zBase === 0 ? PIER_DROP * 0.6 : 0);
  return (
    <>
      <Path d={swPath(top.x, top.y, depth)} fill={WAYFINDER_COLORS.pierSW} />
      <Path d={sePath(top.x, top.y, depth)} fill={WAYFINDER_COLORS.pierSE} />
      <Path
        d={diamondPath(top.x, top.y)}
        fill={WAYFINDER_COLORS.pier}
        stroke={WAYFINDER_COLORS.pierSE}
        strokeWidth={1}
        strokeOpacity={0.5}
      />
      {decor.cap === 'dome' && (
        <>
          <Path
            d={`M ${top.x - 13} ${top.y - 2} A 13 13 0 0 1 ${top.x + 13} ${top.y - 2} Z`}
            fill={MONUMENT_COLORS.dome}
          />
          <Ellipse cx={top.x} cy={top.y - 16} rx={2.4} ry={2.4} fill={MONUMENT_COLORS.trim} />
        </>
      )}
      {decor.cap === 'finial' && (
        <>
          <Path
            d={`M ${top.x} ${top.y - 22} L ${top.x + 1.6} ${top.y - 2} L ${top.x - 1.6} ${top.y - 2} Z`}
            fill={MONUMENT_COLORS.trim}
          />
          <Ellipse cx={top.x} cy={top.y - 23} rx={3} ry={3} fill={MONUMENT_COLORS.pennant} />
        </>
      )}
    </>
  );
}

function quad(a, b, c, d) {
  return `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]} L ${d[0]} ${d[1]} Z`;
}

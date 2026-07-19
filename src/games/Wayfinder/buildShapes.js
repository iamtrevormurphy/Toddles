import React from 'react';
import { Line, Path } from 'react-native-svg';
import { WAYFINDER_COLORS } from '../../constants/theme';
import { obstacleSpan } from './journey';
import { ISO_W, ISO_H, Z_STEP, cellScreen, isoArchPath } from './iso';

const HW = ISO_W / 2;
const HH = ISO_H / 2;

// The built pieces' GEOMETRY, shared by two consumers so they can never
// disagree:
//   - IsoBoard paints settled builds statically INSIDE its painter's-sort
//     (so nearer board columns correctly occlude them — line of sight),
//   - Builds.js wraps the same fragments in an Animated overlay for the
//     one build currently springing in (nothing moves during 'building',
//     so the overlay's brief moment above the board can't lie).

// In 2:1 dimetric, vertical lines stay vertical and horizontal lines run
// at atan(1/2) ≈ 26.565° — so anything drawn onto a side face must be
// skewed by that angle to lie IN the face plane instead of pasted over it.
export const FACE_SKEW_DEG = 26.565;

export function faceSkewTransform(cx, skew) {
  return `translate(${cx} 0) skewY(${skew}) translate(${-cx} 0)`;
}

// Screen vector for one grid step (dx, dy): grid +x runs screen down-right,
// grid +y down-left. `u` (along travel) and `p` (perpendicular, always
// pointing down-screen: p.y > 0) span a local frame; pt() maps (t in grid
// steps, w in tiles, zPx up) to screen space.
function screenDir(dx, dy) {
  return { x: (dx - dy) * HW, y: (dx + dy) * HH };
}

function makeFrame(origin, dx, dy) {
  const u = screenDir(dx, dy);
  const p = screenDir(Math.abs(dy), Math.abs(dx));
  return {
    u,
    p,
    pt: (t, w, zPx = 0) => ({
      x: origin.x + u.x * t + p.x * w,
      y: origin.y + u.y * t + p.y * w - zPx,
    }),
  };
}

function quad(a, b, c, d) {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${d.x} ${d.y} Z`;
}

// Where a built piece slots into the board's back-to-front column sort.
export function buildSortSum(level, ob) {
  if (ob.kind === 'gap') {
    // A bridge is level and rests on BOTH banks' tops, so both banks must
    // paint first: just after the nearer bank.
    const a = level.path[ob.enter - 1];
    const b = level.path[ob.enter + ob.span];
    return Math.max(a.x + a.y, b.x + b.y) + 0.4;
  }
  if (ob.kind === 'rise') {
    // A stair flight lives entirely in the LOWER cell's half-tile, leaning
    // against the upper ledge — so it paints just after the lower deck it
    // rests on, and the ledge itself paints over it whenever the ledge is
    // nearer the camera (climbing toward the viewer), exactly like real
    // line of sight. Keying off max() here was the ledge-conflict bug: it
    // forced the flight in front of a nearer ledge.
    const a = level.path[ob.enter - 1];
    const b = level.path[ob.enter];
    const lower = a.z <= b.z ? a : b;
    return lower.x + lower.y + 0.4;
  }
  // Walls paint their own mass (and mouth) in their cells' columns.
  const cell = level.path[ob.enter];
  return cell.x + cell.y + 0.4;
}

// --- Bridge ----------------------------------------------------------------
// One continuous timber deck from bank to bank: its ends lie ON the two
// platform tops, plank joints run across it, and side/end skirts give it
// slab thickness.
export function BridgeShape({ level, bounds, ob }) {
  const A = level.path[ob.enter - 1];
  const B = level.path[ob.enter + ob.span];
  const steps = ob.span + 1;
  const { u, pt } = makeFrame(
    cellScreen(bounds, A),
    (B.x - A.x) / steps,
    (B.y - A.y) / steps
  );
  const t0 = 0.28; // starts well inside bank A's top face…
  const t1 = steps - 0.28; // …and ends inside bank B's — resting on both
  const wHalf = 0.34;
  const depth = 10;
  // The +w edge follows the board's lighting: SW face on east/west runs,
  // SE face on north/south runs.
  const alongX = B.x !== A.x;
  const sideFill = alongX ? WAYFINDER_COLORS.bridgeSW : WAYFINDER_COLORS.bridgeSE;
  const endFill = alongX ? WAYFINDER_COLORS.bridgeSE : WAYFINDER_COLORS.bridgeSW;
  const endT = u.y > 0 ? t1 : t0; // the down-screen end shows its cut face

  const joints = [];
  const jointCount = steps * 2;
  for (let k = 1; k < jointCount; k++) {
    const tj = t0 + ((t1 - t0) * k) / jointCount;
    joints.push([pt(tj, -wHalf), pt(tj, wHalf)]);
  }

  const down = { x: 0, y: depth };
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });

  return (
    <>
      <Path
        d={quad(pt(t0, wHalf), pt(t1, wHalf), add(pt(t1, wHalf), down), add(pt(t0, wHalf), down))}
        fill={sideFill}
      />
      <Path
        d={quad(
          pt(endT, -wHalf),
          pt(endT, wHalf),
          add(pt(endT, wHalf), down),
          add(pt(endT, -wHalf), down)
        )}
        fill={endFill}
      />
      <Path
        d={quad(pt(t0, -wHalf), pt(t0, wHalf), pt(t1, wHalf), pt(t1, -wHalf))}
        fill={WAYFINDER_COLORS.bridge}
      />
      {joints.map(([a, b], i) => (
        <Line
          key={i}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={WAYFINDER_COLORS.bridgeSE}
          strokeWidth={1.4}
          strokeOpacity={0.8}
        />
      ))}
    </>
  );
}

// --- Stairs ----------------------------------------------------------------
// A real flight: three full-width treads with risers landing flush on the
// upper deck, fronted by a solid wall whose top edge is the classic
// stepped staircase silhouette — the readability cue that survives
// ~8px-per-step scale from every travel direction.
export function StairShape({ level, bounds, ob }) {
  const before = level.path[ob.enter - 1];
  const after = level.path[ob.enter];
  const L = before.z <= after.z ? before : after;
  const H = before.z <= after.z ? after : before;
  const { u, pt } = makeFrame(cellScreen(bounds, L), H.x - L.x, H.y - L.y);
  const alongX = H.x !== L.x;

  // Extent tuning: the flight lives ENTIRELY in the lower cell's half-tile
  // (far end stops at t=0.5, the shared cell boundary) — real stairs lean
  // against the ledge face, they don't penetrate its stone. Together with
  // buildSortSum keying off the lower deck, a nearer ledge paints over the
  // flight correctly. wHalf is the FULL tile width on purpose: the stepped
  // silhouette wall then sits exactly on the row boundary, coplanar with
  // the ledge's own side face — so even when the ledge hides the tread
  // tops (climbing toward the viewer), the stair profile stays fully
  // visible beside the ledge's corner, the way MV shows side-on stairs.
  const t0 = 0.05;
  const dt = 0.15; // treads end exactly at the cell boundary (0.05 + 3·0.15)
  const wHalf = 0.5;
  const stepRise = Z_STEP / 3; // three treads: 10 / 20 / 30 — the top one
  //                              lands exactly at the upper deck's level

  const sideFill = alongX ? WAYFINDER_COLORS.stairsSW : WAYFINDER_COLORS.stairsSE;
  const riserFill = alongX ? WAYFINDER_COLORS.stairsSE : WAYFINDER_COLORS.stairsSW;
  // Which travel-side face of each tread the viewer sees: climbing away
  // up-screen (u.y < 0) shows the downhill risers at tA; climbing toward
  // the viewer shows the face under each tread's near edge at tB.
  const climbsAway = u.y < 0;
  const order = climbsAway ? [2, 1, 0] : [0, 1, 2];

  // The stepped-silhouette wall along the down-screen edge, grounded on
  // the lower deck.
  const base = -3;
  const profile = [];
  profile.push(pt(t0, wHalf, base));
  for (let k = 0; k < 3; k++) {
    const tA = t0 + k * dt;
    const zTop = (k + 1) * stepRise;
    profile.push(pt(tA, wHalf, zTop)); // riser: straight up…
    profile.push(pt(tA + dt, wHalf, zTop)); // …then the tread run
  }
  profile.push(pt(t0 + 3 * dt, wHalf, base));
  const wallPath = `M ${profile.map((p2) => `${p2.x} ${p2.y}`).join(' L ')} Z`;

  return (
    <>
      <Path d={wallPath} fill={sideFill} />
      {order.map((k) => {
        const tA = t0 + k * dt;
        const tB = tA + dt;
        const zTop = (k + 1) * stepRise;
        const faceT = climbsAway ? tA : tB; // the tread's viewer-side edge
        const faceDepth = stepRise + 3; // laps the tread below → stacked stone
        return (
          <React.Fragment key={k}>
            <Path
              d={quad(
                pt(faceT, -wHalf, zTop),
                pt(faceT, wHalf, zTop),
                pt(faceT, wHalf, zTop - faceDepth),
                pt(faceT, -wHalf, zTop - faceDepth)
              )}
              fill={riserFill}
            />
            <Path
              d={quad(pt(tA, -wHalf, zTop), pt(tA, wHalf, zTop), pt(tB, wHalf, zTop), pt(tB, -wHalf, zTop))}
              fill={WAYFINDER_COLORS.stairs}
              stroke={WAYFINDER_COLORS.stairsSE}
              strokeWidth={1.2}
              strokeOpacity={0.75}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

// --- Tunnel mouth ----------------------------------------------------------
// The one visible mouth, on the end face Rumi walks through on the visible
// side: the SE face for east/west travel, the SW face for north/south —
// sized so Rumi (58px) plausibly fits, sill exactly on the walking surface.
export function wallMouthGeometry(level, bounds, ob) {
  const span = obstacleSpan(ob);
  const prev = level.path[ob.enter - 1];
  const first = level.path[span[0]];
  const axis = first.x !== prev.x ? 'x' : 'y';
  const forward = axis === 'x' ? first.x - prev.x : first.y - prev.y;
  const cellIndex = forward > 0 ? span[span.length - 1] : span[0];
  const top = cellScreen(bounds, level.path[cellIndex]);
  return {
    cellIndex,
    cx: axis === 'x' ? top.x + HW / 2 : top.x - HW / 2,
    baseY: top.y + HH / 2,
    w: HW * 0.72,
    h: Math.min(ob.height * Z_STEP - 8, 52),
    skew: axis === 'x' ? -FACE_SKEW_DEG : FACE_SKEW_DEG,
  };
}

// The lavender trim ring and dark opening, both skewed into the face plane.
export function TunnelMouthShape({ mouth }) {
  return (
    <>
      <Path
        d={isoArchPath(mouth.cx, mouth.baseY, mouth.w + 9, mouth.h + 5)}
        fill={WAYFINDER_COLORS.tunnelTrim}
        transform={faceSkewTransform(mouth.cx, mouth.skew)}
      />
      <Path
        d={isoArchPath(mouth.cx, mouth.baseY, mouth.w, mouth.h)}
        fill={WAYFINDER_COLORS.doorway}
        transform={faceSkewTransform(mouth.cx, mouth.skew)}
      />
    </>
  );
}

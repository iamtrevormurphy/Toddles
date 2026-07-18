// Wayfinder's 2:1 dimetric projection — pure math, no React, no RN.
// THE single geometry source for this game (the tileCenter/boardPixelSize
// analogue): the board painter, the built pieces, the character, and the
// validator's occlusion check all position through here, so they can never
// drift apart. Per the design skill, this file is the ONLY place in the app
// where isometric projection exists.

export const ISO_W = 72; // top-diamond width  (PathMaker's TILE_SIZE=76 precedent)
export const ISO_H = 36; // top-diamond height — 2:1 dimetric
export const Z_STEP = 30; // one z unit of climb ≈ one stair flight
export const SLAB = 16; // walkway slab thickness (the extruded side band)
export const PIER_DROP = 64; // how far pier skirts fall below deck level

// Character body box in screen px, anchored at a cell's top-face center —
// used by boardBounds headroom and the validator's occlusion-safety check.
export const CHAR_W = 52;
export const CHAR_H = 64;

// Center of the TOP face of the block at grid (x, y, z), in un-offset iso
// space. Screen-right-down is grid +x (E), screen-left-down is grid +y (S).
export function isoProject(x, y, z) {
  return {
    x: (x - y) * (ISO_W / 2),
    y: (x + y) * (ISO_H / 2) - z * Z_STEP,
  };
}

// SVG path for a top diamond centered at (cx, cy).
export function diamondPath(cx, cy) {
  const hw = ISO_W / 2;
  const hh = ISO_H / 2;
  return `M ${cx} ${cy - hh} L ${cx + hw} ${cy} L ${cx} ${cy + hh} L ${cx - hw} ${cy} Z`;
}

// The lit south-east side face, extruded `depth` straight down from the
// diamond's right edge.
export function sePath(cx, cy, depth) {
  const hw = ISO_W / 2;
  const hh = ISO_H / 2;
  return `M ${cx + hw} ${cy} L ${cx} ${cy + hh} L ${cx} ${cy + hh + depth} L ${cx + hw} ${cy + depth} Z`;
}

// The shaded south-west side face.
export function swPath(cx, cy, depth) {
  const hw = ISO_W / 2;
  const hh = ISO_H / 2;
  return `M ${cx - hw} ${cy} L ${cx} ${cy + hh} L ${cx} ${cy + hh + depth} L ${cx - hw} ${cy + depth} Z`;
}

// A semicircle-topped arch void, drawn in screen space onto a side face —
// the same silhouette PathMaker's archPath gives its aqueduct piers.
export function isoArchPath(cx, bottomY, w, h) {
  const r = w / 2;
  const springY = bottomY - Math.max(h - r, 0);
  return `M ${cx - r} ${bottomY} L ${cx - r} ${springY} A ${r} ${r} 0 0 1 ${cx + r} ${springY} L ${cx + r} ${bottomY} Z`;
}

// Every solid column a level renders: walkway slabs, wall masses, decor
// towers. Shared by boardBounds here and the painter's sort in IsoBoard.
export function levelColumns(level) {
  const columns = [];
  for (const cell of level.path) {
    columns.push({ x: cell.x, y: cell.y, zTop: cell.z, zBase: 0, kind: 'walkway' });
  }
  for (const ob of level.obstacles) {
    if (ob.kind !== 'wall') continue;
    for (let i = 0; i < ob.span; i++) {
      const cell = level.path[ob.enter + i];
      columns.push({ x: cell.x, y: cell.y, zTop: cell.z + ob.height, zBase: cell.z, kind: 'wall' });
    }
  }
  for (const d of level.decor ?? []) {
    columns.push({ x: d.x, y: d.y, zTop: d.zBase + d.height, zBase: d.zBase, kind: 'decor' });
  }
  return columns;
}

// Bounding box of everything the level draws (including pier skirts and
// character headroom above the walkway) → { width, height, offsetX, offsetY }.
// cellScreen() adds the offset; nothing else ever re-derives geometry.
export function boardBounds(level) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const col of levelColumns(level)) {
    const top = isoProject(col.x, col.y, col.zTop);
    const deck = isoProject(col.x, col.y, 0);
    minX = Math.min(minX, top.x - ISO_W / 2);
    maxX = Math.max(maxX, top.x + ISO_W / 2);
    const headroom = col.kind === 'walkway' ? CHAR_H + 16 : 12;
    minY = Math.min(minY, top.y - ISO_H / 2 - headroom);
    maxY = Math.max(maxY, deck.y + ISO_H / 2 + PIER_DROP);
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    offsetX: -minX,
    offsetY: -minY,
  };
}

// Screen position (offset iso space) of a cell's top-face center. `bounds`
// is a precomputed boardBounds(level) — compute it once per level.
export function cellScreen(bounds, cell) {
  const p = isoProject(cell.x, cell.y, cell.z);
  return { x: p.x + bounds.offsetX, y: p.y + bounds.offsetY };
}

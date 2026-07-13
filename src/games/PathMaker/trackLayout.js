// Pure track-layout math — no React, no gestures. Mirrors the split in
// grid.js/executeProgram.js: this file decides positions and indices,
// components just render whatever it returns.

export const TILE_SIZE = 64; // matches TOUCH.minTargetSize
export const TILE_GAP = 10;

// Pixel center of slot i, relative to the track container's own left edge.
export function computeSlotCenters(slotCount) {
  const centers = [];
  for (let i = 0; i < slotCount; i++) {
    centers.push(i * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2);
  }
  return centers;
}

export function trackPixelWidth(slotCount) {
  return slotCount * (TILE_SIZE + TILE_GAP) - TILE_GAP;
}

// Where would a tile land if dropped at dragX right now? Counts how many
// of the OTHER tiles' own compacted centers dragX has passed — the tile
// currently under the finger (excludeId) never counts as its own
// obstacle, which is what makes a mid-reorder able to resolve back to its
// own original index instead of always detecting itself as a foreign gap.
export function nearestInsertionIndex(dragX, slotCenters, excludeId, track) {
  const effective = track.filter((t) => t.id !== excludeId);
  let index = 0;
  for (let i = 0; i < effective.length; i++) {
    if (dragX > slotCenters[i]) index++;
  }
  return index;
}

// Which slot index each NON-dragged tile currently occupies, given an
// optional preview insertion point. Tiles before previewIndex keep their
// compacted slot; tiles from previewIndex onward shift one slot right,
// leaving a visual gap open for wherever the dragged/ghost tile currently
// sits. With no previewIndex, this is just the plain compacted order (the
// idle layout). Returns {[id]: slotIndex}.
export function assignSlots(track, { previewIndex = null, draggingId = null } = {}) {
  const effective = track.filter((t) => t.id !== draggingId);
  const assignment = {};
  effective.forEach((tile, i) => {
    assignment[tile.id] = previewIndex != null && i >= previewIndex ? i + 1 : i;
  });
  return assignment;
}

// Target x for every NON-dragged tile — assignSlots resolved to pixels.
export function layoutPositions(track, slotCenters, opts = {}) {
  const assignment = assignSlots(track, opts);
  const positions = {};
  for (const id in assignment) positions[id] = slotCenters[assignment[id]];
  return positions;
}

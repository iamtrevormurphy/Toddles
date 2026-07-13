// Pure track-layout math — no React, no gestures. Mirrors the split in
// grid.js/executeProgram.js: this file decides positions and indices,
// components just render whatever it returns.

export const TILE_SIZE = 64; // matches TOUCH.minTargetSize
export const TILE_GAP = 10;

// Live-follow shows the track as a rolling window over the program's tail
// (the program itself is unbounded — the track is a history, not a plan a
// child must fit into). 4 slots: fits every screen next to the palette,
// and a 4-year-old only ever acts on the last move anyway.
export const TRACK_WINDOW = 4;

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

// The track is append-only (live-follow: each dropped tile executes
// immediately, and only the LAST tile can be pulled back out), so tile i
// always sits at slotCenters[i] — no insertion-index or reorder math.

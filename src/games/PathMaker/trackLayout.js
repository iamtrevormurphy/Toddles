// Pure layout math for the palette row and the history trail — no React,
// no gestures. Mirrors the split in grid.js/executeProgram.js: this file
// decides positions and indices, components just render what it returns.

export const TILE_SIZE = 64; // palette buttons match TOUCH.minTargetSize
export const TILE_GAP = 10;

// The history trail is deliberately small and quiet: it's a read-only
// record of what Lento has done (live-follow executes every action the
// moment it's tapped), not slots a child fills in. Chips are NOT touch
// targets — undo is a real button — so they may sit below 64pt.
export const CHIP_SIZE = 32;
export const CHIP_GAP = 8;

// Rolling window over the (unbounded) program's tail. Chips are half the
// old tile size, so the window widens to 6 and still fits every screen.
export const HISTORY_WINDOW = 6;

// Pixel center of chip slot i, relative to the trail container's left edge.
export function chipSlotCenters(slotCount) {
  const centers = [];
  for (let i = 0; i < slotCount; i++) {
    centers.push(i * (CHIP_SIZE + CHIP_GAP) + CHIP_SIZE / 2);
  }
  return centers;
}

export function trailPixelWidth(slotCount) {
  return slotCount * (CHIP_SIZE + CHIP_GAP) - CHIP_GAP;
}

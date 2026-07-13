import React from 'react';
import DraggableTile from './DraggableTile';
import { TILE_GAP, TILE_SIZE } from './trackLayout';

// Only the mechanics the current curriculum can use. Hop has no
// functional purpose until Phase 5 introduces raised tiles — an inert
// palette tile would be confusing dead weight, not a preview.
export const PALETTE_TYPES = ['step', 'turnLeft', 'turnRight'];

export function palettePixelWidth() {
  return PALETTE_TYPES.length * (TILE_SIZE + TILE_GAP) - TILE_GAP;
}

// The fixed row of instruction "stamps." Masters never move or deplete —
// dragging one spawns a ghost that GameScreen tracks separately via
// ghostSV/onSpawnStart, so the master itself never needs to re-render.
export default function Palette({ rowY, disabled, ghostSV, onSpawnStart, onGhostMove, onGhostEnd }) {
  return (
    <>
      {PALETTE_TYPES.map((type, i) => (
        <DraggableTile
          key={type}
          mode="palette"
          type={type}
          x={i * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2}
          y={rowY}
          disabled={disabled}
          ghostSV={ghostSV}
          onSpawnStart={onSpawnStart}
          onGhostMove={onGhostMove}
          onGhostEnd={onGhostEnd}
        />
      ))}
    </>
  );
}

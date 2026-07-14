import React from 'react';
import { StyleSheet, View } from 'react-native';
import PaletteButton from './PaletteButton';
import { TILE_GAP, TILE_SIZE } from './trackLayout';

// Only the mechanics the current curriculum can use. Hop has no
// functional purpose until Phase 5 introduces raised tiles — an inert
// palette tile would be confusing dead weight, not a preview.
export const PALETTE_TYPES = ['step', 'turnLeft', 'turnRight'];

export function palettePixelWidth() {
  return PALETTE_TYPES.length * (TILE_SIZE + TILE_GAP) - TILE_GAP;
}

// The row of instruction buttons. Tap-only: live-follow executes each
// press immediately, so the old drag-a-ghost-to-the-track machinery is
// gone along with the track slots it dropped into.
export default function Palette({ disabled, onTap }) {
  return (
    <View style={styles.row}>
      {PALETTE_TYPES.map((type) => (
        <PaletteButton key={type} type={type} disabled={disabled} onTap={onTap} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: TILE_GAP,
  },
});

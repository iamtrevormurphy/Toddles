import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS } from '../../constants/theme';
import InstructionIcon from './InstructionIcon';
import { TILE_SIZE } from './trackLayout';

// The floating tile that follows the finger while dragging a new
// instruction out of the palette. Presentational only — no gesture — so
// it can be positioned purely by shared values (ghostSV) without ever
// touching React state at drag frame-rate, the same idiom Piece.js's
// gazeSV uses for a gesture-driven sibling visual.
export default function GhostTile({ type, ghostSV }) {
  const style = useAnimatedStyle(() => ({
    opacity: ghostSV.opacity.value,
    transform: [
      { translateX: ghostSV.x.value - TILE_SIZE / 2 },
      { translateY: ghostSV.y.value - TILE_SIZE / 2 },
      { scale: 1.1 },
    ],
  }));

  if (!type) return null;

  return (
    <Animated.View style={[styles.tile, style]} pointerEvents="none">
      <InstructionIcon type={type} color={COLORS.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADII.md,
    backgroundColor: COLORS.bubbleOrange,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    ...SHADOWS.floating,
  },
});

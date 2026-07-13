import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/theme';

const SIZE = 22; // chevron glyph box
// Distance from tile center toward the facing: lands just inside the
// NEIGHBORING tile ("next stop: here"), clear of Lento's silhouette in
// all four directions — at the current tile's edge his tall body masks
// the glyph whenever he faces north.
const EDGE_OFFSET = 56;

// The exact facing cue: a small terracotta chevron hovering over the tile
// Lento faces, pointing where the next `step` will go.
// It inherits the rotation shared value the old teardrop body used — the
// same turn-accumulation math in GameScreen now sweeps this glyph 90°
// instead of rotating the character. Rotate-then-translate pushes the
// glyph outward along the ROTATED axis, so one translateY covers all four
// facings. Terracotta (the app's single action accent) because this glyph
// is exactly "what will the action do."
export default function FacingChevron({ cx, cy, rotation, opacity }) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: cx.value - SIZE / 2 },
      { translateY: cy.value - SIZE / 2 },
      { rotate: `${rotation.value}deg` },
      { translateY: -EDGE_OFFSET },
    ],
  }));

  return (
    <Animated.View style={[styles.wrapper, style]} pointerEvents="none">
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Path
          d="M 5 14.5 L 11 7.5 L 17 14.5"
          stroke={COLORS.bubbleOrange}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
  },
});

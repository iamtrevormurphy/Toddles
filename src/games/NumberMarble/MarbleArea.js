import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Ellipse, Rect } from 'react-native-svg';
import { MARBLE_COLORS, RADII, shade } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Play area dimensions — marble position math depends on these; the platform
// styling below is paint only.
export const PLAY_AREA = {
  x: 20,
  y: height * 0.35,
  width: width - 40,
  height: height * 0.35,
};

// Calculate initial positions for marbles in the play area
export function getMarblePositions(count) {
  const positions = [];
  const spacing = PLAY_AREA.width / (count + 1);

  for (let i = 0; i < count; i++) {
    positions.push({
      x: PLAY_AREA.x + spacing * (i + 1),
      y: PLAY_AREA.y + PLAY_AREA.height / 2,
    });
  }

  return positions;
}

// Get a random position within the play area
export function getRandomPosition() {
  const padding = 50;
  return {
    x: PLAY_AREA.x + padding + Math.random() * (PLAY_AREA.width - padding * 2),
    y: PLAY_AREA.y + padding + Math.random() * (PLAY_AREA.height - padding * 2),
  };
}

// Get split positions (two marbles side by side)
export function getSplitPositions(originalX, originalY) {
  const offset = 50;
  return [
    { x: originalX - offset, y: originalY },
    { x: originalX + offset, y: originalY },
  ];
}

const PLATFORM_DEPTH = 10;

// The play area as a raised 2.5D platform floating on the sky.
export default function MarbleArea({ children }) {
  const top = MARBLE_COLORS.playArea;
  const bottom = shade(top, 0.22);
  const w = PLAY_AREA.width;
  const h = PLAY_AREA.height;

  return (
    <View style={styles.area} pointerEvents="none">
      <Svg
        width={w}
        height={h + PLATFORM_DEPTH + 20}
        viewBox={`0 0 ${w} ${h + PLATFORM_DEPTH + 20}`}
      >
        <Ellipse cx={w / 2} cy={h + PLATFORM_DEPTH + 6} rx={w * 0.46} ry={8} fill="#3E3A5E" opacity={0.1} />
        <Ellipse cx={w / 2} cy={h + PLATFORM_DEPTH + 6} rx={w * 0.55} ry={11} fill="#3E3A5E" opacity={0.05} />
        <Rect x={0} y={PLATFORM_DEPTH} width={w} height={h} rx={RADII.lg} fill={bottom} />
        <Rect x={0} y={0} width={w} height={h} rx={RADII.lg} fill={top} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    position: 'absolute',
    left: PLAY_AREA.x,
    top: PLAY_AREA.y,
    width: PLAY_AREA.width,
    height: PLAY_AREA.height + PLATFORM_DEPTH + 20,
  },
});

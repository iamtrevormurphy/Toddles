import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MARBLE_COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Play area dimensions
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

export default function MarbleArea({ children }) {
  return (
    <View style={styles.area}>
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
    height: PLAY_AREA.height,
    backgroundColor: MARBLE_COLORS.playArea,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
});

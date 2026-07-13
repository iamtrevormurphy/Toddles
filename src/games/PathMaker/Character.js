import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS } from '../../constants/theme';

const SIZE = 48;

// N points up on screen since board y grows south (down) and facing 'N'
// is dy:-1 in grid.js — so this mapping stays consistent with the grid.
export const FACING_DEGREES = { N: 0, E: 90, S: 180, W: 270 };

// Placeholder protagonist: a plain colored disc with a triangular nose
// wedge for an obvious facing cue. cx/cy/rotation/lift are shared values
// driven by GameScreen's step-by-step trace playback — this component
// only ever plays back a pose, it never computes game rules itself.
export default function Character({ cx, cy, rotation, lift }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx.value - SIZE / 2 },
      { translateY: cy.value - SIZE / 2 + lift.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]} pointerEvents="none">
      <Svg width={SIZE} height={SIZE} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={19} fill={COLORS.bubblePurple} />
        <Path d="M24 3 L33 19 L15 19 Z" fill={COLORS.bubbleOrange} />
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

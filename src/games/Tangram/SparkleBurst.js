import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/theme';

const STAR_COUNT = 8;
const STAR_COLORS = [
  COLORS.bubbleYellow,
  COLORS.bubblePink,
  COLORS.bubbleBlue,
  COLORS.bubbleGreen,
];

function Star({ index }) {
  const progress = useSharedValue(0);
  const angle = (index / STAR_COUNT) * Math.PI * 2;
  const dist = 34;

  useEffect(() => {
    progress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle) * dist * progress.value },
      { translateY: Math.sin(angle) * dist * progress.value },
      { scale: progress.value < 0.5 ? progress.value * 2 : 2 - progress.value * 2 },
    ],
    opacity: 1 - progress.value * progress.value,
  }));

  return (
    <Animated.View style={[styles.star, animatedStyle]}>
      <Text style={[styles.starText, { color: STAR_COLORS[index % STAR_COLORS.length] }]}>✦</Text>
    </Animated.View>
  );
}

// Small one-shot burst at a snap point. Remount (via key) to replay.
export default function SparkleBurst({ x, y }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.container, { left: x, top: y }]}>
      {Array.from({ length: STAR_COUNT }).map((_, i) => (
        <Star key={i} index={i} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 500,
  },
  star: {
    position: 'absolute',
    left: -10,
    top: -12,
  },
  starText: {
    fontSize: 20,
  },
});

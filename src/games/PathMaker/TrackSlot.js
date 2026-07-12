import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { RADII } from '../../constants/theme';
import { TILE_SIZE } from './trackLayout';

// An empty program-track slot: a dashed-outline placeholder (dashed =
// empty affordance, per the design system). `isPulsing` drives the same
// gentle repeat pulse as NumberMarble's TargetSlot, reused here for the
// "first empty slot" bug cue when a program runs out before the goal.
export default function TrackSlot({ x, y = 0, isPulsing = false }) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (isPulsing) {
      scale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1,
        true
      );
      borderOpacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.5, { duration: 400 })),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      borderOpacity.value = withTiming(0.5, { duration: 200 });
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(borderOpacity);
    };
  }, [isPulsing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: `rgba(227, 148, 115, ${borderOpacity.value})`, // COLORS.bubbleOrange
  }));

  return (
    <Animated.View style={[styles.slot, { left: x - TILE_SIZE / 2, top: y - TILE_SIZE / 2 }, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADII.md,
    borderWidth: 3,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 253, 249, 0.4)',
  },
});

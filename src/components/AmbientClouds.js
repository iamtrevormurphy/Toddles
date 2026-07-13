import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../utils/motion';

// Soft, slow-drifting sky decoration — shared across any gradient-sky
// screen (Home, Tangram, NumberMarble, Path-Maker), not game-specific.
// Plain filled ovals at low opacity, no blur filters (same "no blur,
// cross-platform risk" reasoning as the app's ground-shadow convention).
// Respects reduced motion by rendering statically rather than looping —
// a perpetual background loop is exactly the kind of motion that
// preference exists to suppress, so "shorten" doesn't map onto it the
// way it does a one-shot execution animation.
const CLOUDS = [
  { size: 150, top: '10%', duration: 46000, opacity: 0.2 },
  { size: 95, top: '26%', duration: 58000, opacity: 0.15 },
  { size: 115, top: '6%', duration: 64000, opacity: 0.17 },
];

function Cloud({ size, top, duration, opacity, screenWidth, reducedMotion }) {
  const x = useSharedValue(-size);

  useEffect(() => {
    if (reducedMotion) {
      x.value = screenWidth * 0.5 - size / 2;
      return;
    }
    x.value = -size;
    x.value = withRepeat(withTiming(screenWidth + size, { duration, easing: Easing.linear }), -1, false);
  }, [reducedMotion, screenWidth, size, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.cloud, { width: size, height: size * 0.6, borderRadius: size / 2, top, opacity }, style]}
    />
  );
}

export default function AmbientClouds() {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  return (
    <>
      {CLOUDS.map((cloud, i) => (
        <Cloud key={i} {...cloud} screenWidth={width} reducedMotion={reducedMotion} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    backgroundColor: '#FFFDF9',
  },
});

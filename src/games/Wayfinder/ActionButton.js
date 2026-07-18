import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS, DEPTH, RADII, WAYFINDER_COLORS, shade } from '../../constants/theme';
import { selectionHaptic } from '../../utils/haptics';
import ActionIcon from './ActionIcon';

export const BUTTON_SIZE = 68;

const TOP_COLORS = {
  move: WAYFINDER_COLORS.buttonMove,
  bridge: WAYFINDER_COLORS.buttonBridge,
  stairs: WAYFINDER_COLORS.buttonStairs,
  tunnel: WAYFINDER_COLORS.buttonTunnel,
};

// One action button — the PaletteButton toy-block pattern (colored top face
// over a darker extrude band, scale on an inner view, no resting shadow).
// Per-verb press feel: Move dips forward, Bridge slides across, Stairs
// steps up, Tunnel punches in.
export default function ActionButton({ type, disabled, onTap }) {
  const scl = useSharedValue(1);
  const dip = useSharedValue(0);
  const slide = useSharedValue(0);

  const handlePressIn = () => {
    scl.value = withTiming(type === 'tunnel' ? 0.88 : 0.92, { duration: 80 });
    if (type === 'move') dip.value = withTiming(3, { duration: 90 });
    if (type === 'bridge') slide.value = withTiming(3, { duration: 90 });
    if (type === 'stairs') dip.value = withTiming(-3, { duration: 90 });
  };

  const handlePressOut = () => {
    scl.value = withTiming(1, { duration: 120 });
    dip.value = withSpring(0, { damping: 16, stiffness: 220 });
    slide.value = withSpring(0, { damping: 16, stiffness: 220 });
  };

  const handlePress = () => {
    selectionHaptic();
    onTap(type);
  };

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scl.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dip.value }, { translateX: slide.value }],
  }));

  const topColor = TOP_COLORS[type] ?? COLORS.white;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.hitBox, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.scaler, scaleStyle]}>
        <View style={[styles.band, { backgroundColor: shade(topColor, DEPTH.sideShade) }]} />
        <View style={[styles.tile, { backgroundColor: topColor }]}>
          <Animated.View style={iconStyle}>
            <ActionIcon type={type} size={40} color={COLORS.textDark} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitBox: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  disabled: {
    opacity: 0.55,
  },
  scaler: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  tile: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    top: DEPTH.extrude.dy,
    left: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADII.md,
  },
});

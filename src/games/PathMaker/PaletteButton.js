import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS, DEPTH, PATHMAKER_COLORS, RADII, shade } from '../../constants/theme';
import { selectionHaptic } from '../../utils/haptics';
import InstructionIcon from './InstructionIcon';
import { TILE_SIZE } from './trackLayout';

const TILE_TOP_COLORS = {
  step: PATHMAKER_COLORS.tileStep,
  turnLeft: PATHMAKER_COLORS.tileTurnLeft,
  turnRight: PATHMAKER_COLORS.tileTurnRight,
  hop: PATHMAKER_COLORS.tileStep,
};

// One instruction button. Tap-only — live-follow executes the action the
// moment it's pressed, so there is nothing to drag anywhere anymore. The
// toy-block look (colored top face over a darker extrude band, no resting
// shadow) carries over from the old draggable tiles; per-type color stays
// the non-reader's second cue alongside the icon.
export default function PaletteButton({ type, disabled, onTap }) {
  const scl = useSharedValue(1);
  // Press feel: turn icons crank in their turn direction, step dips — the
  // button "turns Lento" rather than just clicking. Scale lives on an
  // inner view, never on the pressable target itself.
  const crank = useSharedValue(0);
  const dip = useSharedValue(0);

  const handlePressIn = () => {
    scl.value = withTiming(0.92, { duration: 80 });
    if (type === 'turnLeft' || type === 'turnRight') {
      crank.value = withTiming(type === 'turnRight' ? 14 : -14, { duration: 90 });
    } else {
      dip.value = withTiming(3, { duration: 90 });
    }
  };

  const handlePressOut = () => {
    scl.value = withTiming(1, { duration: 120 });
    crank.value = withSpring(0, { damping: 16, stiffness: 220 });
    dip.value = withSpring(0, { damping: 16, stiffness: 220 });
  };

  const handlePress = () => {
    selectionHaptic();
    onTap(type);
  };

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scl.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${crank.value}deg` }, { translateY: dip.value }],
  }));

  const topColor = TILE_TOP_COLORS[type] ?? COLORS.white;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8}
      style={styles.hitBox}
    >
      <Animated.View style={[styles.scaler, scaleStyle]}>
        <View style={[styles.band, { backgroundColor: shade(topColor, DEPTH.sideShade) }]} />
        <View style={[styles.tile, { backgroundColor: topColor }]}>
          <Animated.View style={iconStyle}>
            <InstructionIcon type={type} color={COLORS.textDark} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitBox: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  scaler: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tile: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    top: DEPTH.extrude.dy,
    left: 0,
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADII.md,
  },
});

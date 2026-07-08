import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MARBLE_COLORS, COLORS } from '../../constants/theme';
import { MARBLE_SIZE } from './Marble';

const SLOT_SIZE = MARBLE_SIZE + 20;

export default function TargetSlot({ isHighlighted = false, x, y }) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.5);

  // Pulse animation when highlighted
  useEffect(() => {
    if (isHighlighted) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.5, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      borderOpacity.value = withTiming(0.5, { duration: 200 });
    }
  }, [isHighlighted]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: `rgba(124, 217, 87, ${borderOpacity.value})`,
  }));

  return (
    <Animated.View
      style={[
        styles.slot,
        {
          left: x - SLOT_SIZE / 2,
          top: y - SLOT_SIZE / 2,
        },
        isHighlighted && styles.slotHighlighted,
        animatedStyle,
      ]}
    >
      <View style={styles.slotInner}>
        <Text style={styles.arrowText}>↓</Text>
      </View>
    </Animated.View>
  );
}

export function getSlotBounds(x, y) {
  return {
    x: x - SLOT_SIZE / 2,
    y: y - SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    centerX: x,
    centerY: y,
  };
}

export { SLOT_SIZE };

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    backgroundColor: MARBLE_COLORS.targetSlot,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(124, 217, 87, 0.5)',
    borderStyle: 'dashed',
  },
  slotHighlighted: {
    backgroundColor: MARBLE_COLORS.targetSlotActive,
  },
  slotInner: {
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 32,
    color: COLORS.textLight,
    opacity: 0.5,
  },
});

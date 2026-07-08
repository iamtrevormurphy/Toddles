import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MARBLE_COLORS, TOUCH } from '../../constants/theme';
import { selectionHaptic, tapHaptic } from '../../utils/haptics';

const MARBLE_SIZE = 80;
const MARBLE_RADIUS = MARBLE_SIZE / 2;
// Circumference for realistic rolling: rotation = distance * (360 / circumference)
const ROTATION_FACTOR = 360 / (2 * Math.PI * MARBLE_RADIUS);

export default function Marble({
  id,
  value,
  x,
  y,
  onTap,
  onDragEnd,
  onDragStart,
  onDragMove,
  isActive = false,
}) {
  const translateX = useSharedValue(x);
  const translateY = useSharedValue(y);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const rotation = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const prevX = useRef(x);

  // Update position when props change (split/combine animations)
  useEffect(() => {
    // Calculate rolling rotation based on horizontal distance
    const deltaX = x - prevX.current;
    const rollRotation = rotation.value + (deltaX * ROTATION_FACTOR);

    translateX.value = withSpring(x);
    translateY.value = withSpring(y);
    rotation.value = withSpring(rollRotation, { damping: 12, stiffness: 100 });

    prevX.current = x;
  }, [x, y]);

  // Tap gesture to split
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (value > 1) {
        scale.value = withSequence(
          withSpring(0.8),
          withSpring(1)
        );
        runOnJS(tapHaptic)();
        if (onTap) {
          runOnJS(onTap)(id);
        }
      }
    });

  // Pan gesture to drag
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      scale.value = withSpring(1.15);
      zIndex.value = 100;
      runOnJS(selectionHaptic)();
      if (onDragStart) {
        runOnJS(onDragStart)(id);
      }
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;
      // Rolling animation during drag
      rotation.value = event.translationX * ROTATION_FACTOR;
      translateX.value = newX;
      translateY.value = startY.value + event.translationY;
      if (onDragMove) {
        runOnJS(onDragMove)(id, {
          x: translateX.value,
          y: translateY.value,
        });
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      zIndex.value = 1;

      const currentPos = {
        x: translateX.value,
        y: translateY.value,
      };

      if (onDragEnd) {
        runOnJS(onDragEnd)(id, currentPos, (snapPos) => {
          if (snapPos) {
            // Calculate roll to snap position
            const deltaX = snapPos.x - translateX.value;
            const rollRotation = rotation.value + (deltaX * ROTATION_FACTOR);
            translateX.value = withSpring(snapPos.x);
            translateY.value = withSpring(snapPos.y);
            rotation.value = withSpring(rollRotation, { damping: 12, stiffness: 100 });
          } else {
            // Roll back to original position
            const deltaX = x - translateX.value;
            const rollRotation = rotation.value + (deltaX * ROTATION_FACTOR);
            translateX.value = withSpring(x);
            translateY.value = withSpring(y);
            rotation.value = withSpring(rollRotation, { damping: 12, stiffness: 100 });
          }
        });
      }
    });

  // Combine both gestures - tap takes priority over pan
  const composedGesture = Gesture.Exclusive(
    tapGesture,
    panGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - MARBLE_SIZE / 2 },
      { translateY: translateY.value - MARBLE_SIZE / 2 },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  // Separate rotation style for the inner content (stripe rotates, outer shadow stays fixed)
  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Pulse animation when active (being dragged over)
  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withSpring(1.1),
        withSpring(1)
      );
    }
  }, [isActive]);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.marble, animatedStyle]}>
        {/* Rotating inner content for rolling effect */}
        <Animated.View style={[styles.marbleInner, rotationStyle]}>
          {/* Stripe that shows rolling motion */}
          <View style={styles.stripeContainer}>
            <View style={styles.stripe} />
          </View>
          <Animated.View style={styles.marbleHighlight} />
        </Animated.View>
        {/* Number stays upright (not rotating) */}
        <View style={styles.numberContainer}>
          <Text style={styles.marbleText}>{value}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// Shake animation helper
export function shakeMarble(translateX, originalX) {
  'worklet';
  translateX.value = withSequence(
    withTiming(originalX - 10, { duration: 50 }),
    withTiming(originalX + 10, { duration: 50 }),
    withTiming(originalX - 10, { duration: 50 }),
    withTiming(originalX, { duration: 50 })
  );
}

export { MARBLE_SIZE };

const styles = StyleSheet.create({
  marble: {
    position: 'absolute',
    width: MARBLE_SIZE,
    height: MARBLE_SIZE,
    borderRadius: MARBLE_SIZE / 2,
    backgroundColor: MARBLE_COLORS.marble,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  marbleInner: {
    width: MARBLE_SIZE - 8,
    height: MARBLE_SIZE - 8,
    borderRadius: (MARBLE_SIZE - 8) / 2,
    backgroundColor: MARBLE_COLORS.marble,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stripeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripe: {
    position: 'absolute',
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
  },
  marbleHighlight: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 20,
    height: 12,
    borderRadius: 10,
    backgroundColor: MARBLE_COLORS.marbleShine,
    opacity: 0.6,
  },
  numberContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  marbleText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: MARBLE_COLORS.marbleShine,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

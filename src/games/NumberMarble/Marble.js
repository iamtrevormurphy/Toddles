import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, ClipPath, Defs, Ellipse, Path } from 'react-native-svg';
import { MARBLE_COLORS, shade } from '../../constants/theme';
import { selectionHaptic, tapHaptic } from '../../utils/haptics';

const MARBLE_SIZE = 80;
const MARBLE_RADIUS = MARBLE_SIZE / 2;
// Circumference for realistic rolling: rotation = distance * (360 / circumference)
const ROTATION_FACTOR = 360 / (2 * Math.PI * MARBLE_RADIUS);

const SPOT_COLOR = MARBLE_COLORS.marbleHighlight;
const COUNTER_SPOT_COLOR = shade(MARBLE_COLORS.marble, 0.1);

const circlePath = (cx, cy, r) =>
  `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
// Bottom crescent = marble circle minus the same circle nudged up (evenodd),
// clipped to the marble so the offset circle's top lobe never shows.
const CRESCENT_PATH = `${circlePath(40, 40, 40)} ${circlePath(40, 33, 40)}`;

export default function Marble({
  id,
  value,
  x,
  y,
  fromX = null, // optional spawn origin: marble mounts there and ROLLS to x/y
  fromY = null,
  restScale = 1, // resting size multiplier (slot marble grows toward the ring)
  onTap,
  onDragEnd,
  onDragStart,
  onDragMove,
  isActive = false,
  gazeSV = null, // optional {x, y, active} shared values — Juno watches
}) {
  const translateX = useSharedValue(fromX ?? x);
  const translateY = useSharedValue(fromY ?? y);
  const scale = useSharedValue(1);
  const restScaleSV = useSharedValue(restScale);
  const zIndex = useSharedValue(1);
  const rotation = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const lastTX = useSharedValue(0);
  const prevX = useRef(fromX ?? x);

  // Update position when props change (split/combine/bump animations).
  // Because shared values start at fromX/fromY, the mount run of this effect
  // rolls a freshly split marble outward from its parent's position.
  useEffect(() => {
    // Calculate rolling rotation based on horizontal distance
    const deltaX = x - prevX.current;
    const rollRotation = rotation.value + (deltaX * ROTATION_FACTOR);

    translateX.value = withSpring(x);
    translateY.value = withSpring(y);
    rotation.value = withSpring(rollRotation, { damping: 12, stiffness: 100 });

    prevX.current = x;
  }, [x, y]);

  useEffect(() => {
    restScaleSV.value = withSpring(restScale, { damping: 16 });
  }, [restScale]);

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
      lastTX.value = 0;
      scale.value = withSpring(1.15);
      zIndex.value = 100;
      if (gazeSV) {
        gazeSV.x.value = translateX.value;
        gazeSV.y.value = translateY.value;
        gazeSV.active.value = 1;
      }
      runOnJS(selectionHaptic)();
      if (onDragStart) {
        runOnJS(onDragStart)(id);
      }
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;
      // Rolling during drag: delta-based so rotation ACCUMULATES — no
      // jarring reset when a new drag starts
      rotation.value += (event.translationX - lastTX.value) * ROTATION_FACTOR;
      lastTX.value = event.translationX;
      translateX.value = newX;
      translateY.value = startY.value + event.translationY;
      if (gazeSV) {
        gazeSV.x.value = translateX.value;
        gazeSV.y.value = translateY.value;
      }
      if (onDragMove) {
        runOnJS(onDragMove)(id, {
          x: translateX.value,
          y: translateY.value,
        });
      }
    })
    .onEnd(() => {
      if (gazeSV) {
        gazeSV.active.value = 0;
      }
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
      { scale: scale.value * restScaleSV.value },
    ],
    zIndex: zIndex.value,
  }));

  // Rotation only affects the inner disc (shading and numeral stay put)
  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Contact ground shadow (depth policy): tight and full at rest, it
  // shrinks/fades/separates as the marble lifts (scale springs to 1.15).
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [1, 1.15], [1, 0.35]),
    transform: [
      { translateY: interpolate(scale.value, [1, 1.15], [0, 9]) },
      { scaleX: interpolate(scale.value, [1, 1.15], [1, 0.72]) },
    ],
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
        {/* Contact ground shadow — belongs to the ground, never rotates */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shadowStyle]}>
          <Svg width={120} height={100} viewBox="0 0 120 100" style={styles.shadowSvg}>
            <Ellipse cx={60} cy={84} rx={30} ry={5} fill="#3E3A5E" opacity={0.14} />
            <Ellipse cx={60} cy={84} rx={40} ry={7} fill="#3E3A5E" opacity={0.07} />
          </Svg>
        </Animated.View>

        {/* Rotating disc with a ball-roll spot pair */}
        <Animated.View style={[styles.marbleInner, rotationStyle]}>
          <View style={styles.spot} />
          <View style={styles.counterSpot} />
        </Animated.View>

        {/* Static shading: light is environmental, it never spins */}
        <Svg width={MARBLE_SIZE} height={MARBLE_SIZE} viewBox="0 0 80 80" style={styles.shading} pointerEvents="none">
          <Defs>
            <ClipPath id="marbleClip">
              <Circle cx={40} cy={40} r={40} />
            </ClipPath>
          </Defs>
          <Path
            d={CRESCENT_PATH}
            fill="#3E3A5E"
            fillRule="evenodd"
            opacity={0.16}
            clipPath="url(#marbleClip)"
          />
          <Ellipse cx={28} cy={22} rx={12} ry={8} fill={MARBLE_COLORS.marbleShine} opacity={0.5} />
        </Svg>

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
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowSvg: {
    position: 'absolute',
    left: -20,
    top: 0,
  },
  marbleInner: {
    width: MARBLE_SIZE,
    height: MARBLE_SIZE,
    borderRadius: MARBLE_RADIUS,
    backgroundColor: MARBLE_COLORS.marble,
    overflow: 'hidden',
  },
  spot: {
    position: 'absolute',
    left: MARBLE_RADIUS - 11,
    top: MARBLE_RADIUS - 15 - 11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SPOT_COLOR,
    opacity: 0.55,
  },
  counterSpot: {
    position: 'absolute',
    left: MARBLE_RADIUS - 6,
    top: MARBLE_RADIUS + 15 - 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COUNTER_SPOT_COLOR,
  },
  shading: {
    position: 'absolute',
  },
  numberContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  marbleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 32,
    color: MARBLE_COLORS.marbleShine,
    textShadowColor: 'rgba(62, 58, 94, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

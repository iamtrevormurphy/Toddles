import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useSharedValue,
  useAnimatedStyle,
  withDecay,
  withRepeat,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, ClipPath, Defs, Ellipse, Path } from 'react-native-svg';
import { MARBLE_COLORS, MARBLE_SPECIAL_COLOR, shade } from '../../constants/theme';
import { StarIcon } from '../../components/icons';
import { selectionHaptic, tapHaptic } from '../../utils/haptics';

const MARBLE_SIZE = 80;
const MARBLE_RADIUS = MARBLE_SIZE / 2;
// Circumference for realistic rolling: rotation = distance * (360 / circumference)
const ROTATION_FACTOR = 360 / (2 * Math.PI * MARBLE_RADIUS);

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
  color = MARBLE_COLORS.marble,
  special = false, // rare honey marble: glow + star, extra fun
  onTap,
  onDragEnd,
  onDragStart,
  onDragMove,
  onRollEnd, // (id, {x, y}) — a momentum roll came to rest
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
  const glow = useSharedValue(0.25);
  const rollRunId = useSharedValue(0);
  const rollFinishedAxes = useSharedValue(0);

  const bodyColor = special ? MARBLE_SPECIAL_COLOR : color;
  const spotColor = shade(bodyColor, -0.3);
  const counterSpotColor = shade(bodyColor, 0.14);
  const numeralColor = special ? '#3E3A5E' : MARBLE_COLORS.marbleShine;

  // ONE source of truth for rolling: any movement of the marble — drag,
  // spring, momentum decay — spins the disc. Horizontal motion dominates the
  // read; vertical motion contributes at half rate so the marble never
  // slides lifelessly.
  useAnimatedReaction(
    () => ({ x: translateX.value, y: translateY.value }),
    (curr, prev) => {
      if (!prev) return;
      rotation.value += ((curr.x - prev.x) + (curr.y - prev.y) * 0.5) * ROTATION_FACTOR;
    }
  );

  // Update position when props change (split/combine/bump animations).
  // Because shared values start at fromX/fromY, the mount run of this effect
  // rolls a freshly split marble outward from its parent's position.
  useEffect(() => {
    translateX.value = withSpring(x);
    translateY.value = withSpring(y);
  }, [x, y]);

  useEffect(() => {
    restScaleSV.value = withSpring(restScale, { damping: 16 });
  }, [restScale]);

  // Special marbles breathe a soft honey glow
  useEffect(() => {
    if (special) {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 900 }),
          withTiming(0.25, { duration: 900 })
        ),
        -1,
        true
      );
    }
    return () => cancelAnimation(glow);
  }, [special]);

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

  // JS-side drop resolution. The callback supports three outcomes:
  //   null            → spring back to the prop position
  //   {x, y}          → spring to a point (slot, merge midpoint)
  //   {roll: {...}}   → momentum: decay along the release velocity, clamped
  //                     to the play area; index is told where it came to rest
  const finishDrag = (posX, posY, vx, vy) => {
    if (!onDragEnd) return;
    onDragEnd(id, { x: posX, y: posY }, { vx, vy }, (result) => {
      if (result && result.roll) {
        const { vx: rvx, vy: rvy, clampX, clampY } = result.roll;
        rollRunId.value += 1;
        rollFinishedAxes.value = 0;
        const currentRoll = rollRunId.value;
        const finishAxis = (finished) => {
          'worklet';
          if (!finished || currentRoll !== rollRunId.value) return;
          rollFinishedAxes.value += 1;
          if (rollFinishedAxes.value === 2 && onRollEnd) {
            runOnJS(onRollEnd)(id, { x: translateX.value, y: translateY.value });
          }
        };
        translateX.value = withDecay(
          { velocity: rvx, clamp: clampX, deceleration: 0.995 },
          finishAxis
        );
        translateY.value = withDecay(
          { velocity: rvy, clamp: clampY, deceleration: 0.995 },
          finishAxis
        );
      } else if (result) {
        translateX.value = withSpring(result.x);
        translateY.value = withSpring(result.y);
      } else {
        translateX.value = withSpring(x);
        translateY.value = withSpring(y);
      }
    });
  };

  // Pan gesture to drag
  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Grabbing a rolling marble stops its momentum
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      startX.value = translateX.value;
      startY.value = translateY.value;
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
      translateX.value = startX.value + event.translationX;
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
    .onEnd((event) => {
      if (gazeSV) {
        gazeSV.active.value = 0;
      }
      scale.value = withSpring(1);
      zIndex.value = 1;
      runOnJS(finishDrag)(
        translateX.value,
        translateY.value,
        event.velocityX,
        event.velocityY
      );
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

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

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

        {/* Special: soft breathing honey halo */}
        {special && (
          <Animated.View pointerEvents="none" style={[styles.halo, glowStyle]} />
        )}

        {/* Rotating disc with a ball-roll spot pair */}
        <Animated.View style={[styles.marbleInner, rotationStyle, { backgroundColor: bodyColor }]}>
          <View style={[styles.spot, { backgroundColor: spotColor }]} />
          {special ? (
            <View style={styles.starDecal}>
              <StarIcon size={18} color="#FFFDF9" />
            </View>
          ) : (
            <View style={[styles.counterSpot, { backgroundColor: counterSpotColor }]} />
          )}
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
          <Text style={[styles.marbleText, { color: numeralColor }]}>{value}</Text>
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
  halo: {
    position: 'absolute',
    left: -10,
    top: -10,
    width: MARBLE_SIZE + 20,
    height: MARBLE_SIZE + 20,
    borderRadius: (MARBLE_SIZE + 20) / 2,
    backgroundColor: MARBLE_SPECIAL_COLOR,
  },
  marbleInner: {
    width: MARBLE_SIZE,
    height: MARBLE_SIZE,
    borderRadius: MARBLE_RADIUS,
    overflow: 'hidden',
  },
  spot: {
    position: 'absolute',
    left: MARBLE_RADIUS - 11,
    top: MARBLE_RADIUS - 15 - 11,
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.55,
  },
  counterSpot: {
    position: 'absolute',
    left: MARBLE_RADIUS - 6,
    top: MARBLE_RADIUS + 15 - 6,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  starDecal: {
    position: 'absolute',
    left: MARBLE_RADIUS - 9,
    top: MARBLE_RADIUS + 15 - 9,
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
    textShadowColor: 'rgba(62, 58, 94, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

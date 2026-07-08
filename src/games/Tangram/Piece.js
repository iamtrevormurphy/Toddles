import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { getShape, getShapePath } from './shapes';
import { selectionHaptic } from '../../utils/haptics';
import { playPopSound } from '../../utils/sound';

const SNAP_SPRING = { damping: 18, stiffness: 220 };

// A draggable tangram piece. (cx, cy) shared values are the piece's CENTER in
// game-root coordinates; centering happens inside the transform (never via
// margins). The child never rotates anything — on an accepted drop the piece
// auto-rotates/flips into its slot; on a miss it springs back to its tray home.
export default function Piece({
  id,
  shapeType,
  homeX,
  homeY,
  boardScale,
  trayScale,
  disabled,
  onDrop,
}) {
  const shape = getShape(shapeType);
  const W = shape.w * boardScale;
  const H = shape.h * boardScale;

  const cx = useSharedValue(homeX);
  const cy = useSharedValue(homeY);
  const rot = useSharedValue(0);
  const scl = useSharedValue(trayScale);
  const flip = useSharedValue(1);
  const z = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const handleDropAt = (x, y) => {
    onDrop(id, { x, y }, (snap) => {
      if (snap) {
        cx.value = withSpring(snap.x, SNAP_SPRING);
        cy.value = withSpring(snap.y, SNAP_SPRING);
        rot.value = withTiming(snap.rotation, { duration: 200 });
        flip.value = withTiming(snap.flip ? -1 : 1, { duration: 200 });
        scl.value = withTiming(1, { duration: 200 });
        z.value = 10;
      } else {
        cx.value = withSpring(homeX);
        cy.value = withSpring(homeY);
        rot.value = withTiming(0, { duration: 150 });
        flip.value = withTiming(1, { duration: 150 });
        scl.value = withSpring(trayScale);
        z.value = 1;
      }
    });
  };

  // Track the pointer via absoluteX/Y (window coordinates) rather than
  // translationX/Y: translations get distorted on web when the touched
  // element sits under a scale transform. startX/Y hold the grab offset so
  // the piece doesn't jump to center under the finger.
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .hitSlop(20)
    .onStart((e) => {
      startX.value = cx.value - e.absoluteX;
      startY.value = cy.value - e.absoluteY;
      scl.value = withSpring(1.08);
      z.value = 100;
      runOnJS(selectionHaptic)();
      runOnJS(playPopSound)();
    })
    .onUpdate((e) => {
      cx.value = startX.value + e.absoluteX;
      cy.value = startY.value + e.absoluteY;
    })
    .onEnd(() => {
      runOnJS(handleDropAt)(cx.value, cy.value);
    });

  // The gesture target only ever translates. Scale/rotate/flip live on an
  // inner view: gesture-handler's web implementation maps pointer deltas
  // through the target's transform, so a scaled target corrupts translation.
  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx.value - W / 2 },
      { translateY: cy.value - H / 2 },
    ],
    zIndex: z.value,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rot.value}deg` },
      { scaleX: scl.value * flip.value },
      { scaleY: scl.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.piece, { width: W, height: H }, outerStyle]}>
        <Animated.View style={[styles.inner, innerStyle]}>
          <Svg width={W} height={H} viewBox={`0 0 ${shape.w} ${shape.h}`}>
            <Path
              d={getShapePath(shapeType)}
              fill={shape.color}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  inner: {
    width: '100%',
    height: '100%',
  },
});

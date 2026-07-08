import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { DEPTH, shade } from '../../constants/theme';
import { getShape, getShapePath, getShapeSideColor, getShapeVertices } from './shapes';
import { extrusionPath } from './extrusion';
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
  gazeSV = null, // optional {x, y, active} shared values — the companion watches
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
      if (gazeSV) {
        gazeSV.x.value = cx.value;
        gazeSV.y.value = cy.value;
        gazeSV.active.value = 1;
      }
      runOnJS(selectionHaptic)();
      runOnJS(playPopSound)();
    })
    .onUpdate((e) => {
      cx.value = startX.value + e.absoluteX;
      cy.value = startY.value + e.absoluteY;
      if (gazeSV) {
        gazeSV.x.value = cx.value;
        gazeSV.y.value = cy.value;
      }
    })
    .onEnd(() => {
      if (gazeSV) {
        gazeSV.active.value = 0;
      }
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

  // 2.5D paint: the Svg is padded symmetrically by P on every side (viewBox
  // AND absolute offset), so the shape's visual center stays the view center —
  // the layout box, centering math, gesture target, and hitbox are unchanged;
  // the extrusion just overflows visually.
  const P = DEPTH.extrude.dy;
  const PS = P * boardScale;
  const sideColor = getShapeSideColor(shapeType);

  // Ground shadow only while LIFTED (depth policy): a translate-only sibling
  // layer (never rotates/flips with the piece), driven by the existing scl
  // shared value — hidden at tray rest (0.6), visible while dragged (1.08),
  // gone again as the piece lands (1.0). Zero gesture changes.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scl.value, [1.0, 1.08], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scl.value, [1.0, 1.08], [0, 6], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.piece, { width: W, height: H }, outerStyle]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shadowStyle]}>
          <Svg
            width={W + 2 * PS}
            height={H + 2 * PS}
            viewBox={`${-P} ${-P} ${shape.w + 2 * P} ${shape.h + 2 * P}`}
            style={{ position: 'absolute', left: -PS, top: -PS }}
          >
            {DEPTH.groundShadow.slice(0, 2).map((s, i) => (
              <Ellipse
                key={i}
                cx={shape.w / 2}
                cy={shape.h + P * 0.6}
                rx={shape.w * 0.42 * s.spread}
                ry={2.6 * s.spread}
                fill="#3E3A5E"
                opacity={s.opacity}
              />
            ))}
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.inner, innerStyle]}>
          <Svg
            width={W + 2 * PS}
            height={H + 2 * PS}
            viewBox={`${-P} ${-P} ${shape.w + 2 * P} ${shape.h + 2 * P}`}
            style={{ position: 'absolute', left: -PS, top: -PS }}
          >
            <Path
              d={extrusionPath(getShapeVertices(shapeType))}
              fill={sideColor}
              stroke={sideColor}
              strokeWidth={1}
            />
            <Path
              d={getShapePath(shapeType)}
              fill={shape.color}
              stroke={shade(shape.color, -0.15)}
              strokeWidth={1.5}
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

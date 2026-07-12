import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { COLORS, RADII, SHADOWS } from '../../constants/theme';
import { selectionHaptic } from '../../utils/haptics';
import InstructionIcon from './InstructionIcon';
import { TILE_SIZE } from './trackLayout';

// One reusable draggable tile, two modes:
//   "track"   — an existing {id,type} in the program track. Owns its own
//               position, drags with translationX/Y (Marble.js's
//               convention). Nothing in the track/palette area sits under
//               a scaled ancestor, so Piece.js's absoluteX/Y workaround
//               isn't needed here — if a future responsive-scaling pass
//               wraps the board/track in a scale transform, retrofit that
//               workaround here too.
//   "palette" — an infinite "stamp": its own position never changes.
//               Dragging it spawns a ghost (rendered separately by
//               GhostTile) that this component positions via ghostSV
//               shared values, so 60fps drag motion never touches React
//               state (the same idiom Piece.js/Marble.js use for a
//               gesture-driven visual owned by a sibling component).
export default function DraggableTile({
  mode,
  type,
  id,
  x,
  y = 0,
  disabled = false,
  isActive = false,
  isPulsing = false,
  ghostSV = null,
  onSpawnStart,
  onGhostMove,
  onGhostEnd,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRemoved,
}) {
  const isTrack = mode === 'track';

  const cx = useSharedValue(x);
  const cy = useSharedValue(y);
  const scl = useSharedValue(1);
  const highlightScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    if (isTrack) cx.value = withSpring(x);
  }, [x, isTrack]);

  useEffect(() => {
    if (isPulsing) {
      highlightScale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1,
        true
      );
    } else if (isActive) {
      highlightScale.value = withTiming(1.08, { duration: 150 });
    } else {
      highlightScale.value = withTiming(1, { duration: 150 });
    }
    return () => cancelAnimation(highlightScale);
  }, [isPulsing, isActive]);

  const finishTrackDrag = (posX, posY) => {
    onDragEnd(id, { x: posX, y: posY }, (result) => {
      if (result?.snap) {
        cx.value = withSpring(result.snap.x);
        cy.value = withSpring(y);
      } else if (result?.remove) {
        // Resolve now, commit state after the settle animation — the
        // same two-phase pattern Tangram's placements/settled split uses.
        scl.value = withTiming(0, { duration: 150 }, (finished) => {
          if (finished && onRemoved) runOnJS(onRemoved)(id);
        });
      } else {
        cx.value = withSpring(x);
        cy.value = withSpring(y);
      }
    });
  };

  const finishGhostDrag = (posX, posY) => {
    onGhostEnd({ x: posX, y: posY }, (result) => {
      if (result?.snap) {
        ghostSV.x.value = withTiming(result.snap.x, { duration: 120 });
        ghostSV.y.value = withTiming(result.snap.y, { duration: 120 });
      } else {
        ghostSV.opacity.value = withTiming(0, { duration: 150 });
      }
    });
  };

  const trackPan = Gesture.Pan()
    .enabled(!disabled)
    .hitSlop(20)
    .onStart(() => {
      startX.value = cx.value;
      startY.value = cy.value;
      scl.value = withSpring(1.1);
      runOnJS(selectionHaptic)();
      if (onDragStart) runOnJS(onDragStart)(id);
    })
    .onUpdate((e) => {
      cx.value = startX.value + e.translationX;
      cy.value = startY.value + e.translationY;
      if (onDragMove) runOnJS(onDragMove)(id, { x: cx.value, y: cy.value });
    })
    .onEnd(() => {
      scl.value = withSpring(1);
      runOnJS(finishTrackDrag)(cx.value, cy.value);
    });

  const palettePan = Gesture.Pan()
    .enabled(!disabled)
    .hitSlop(20)
    .onStart(() => {
      scl.value = withSequence(withTiming(0.92, { duration: 80 }), withTiming(1, { duration: 120 }));
      ghostSV.x.value = x;
      ghostSV.y.value = y;
      ghostSV.opacity.value = withTiming(1, { duration: 100 });
      runOnJS(selectionHaptic)();
      runOnJS(onSpawnStart)(type);
    })
    .onUpdate((e) => {
      ghostSV.x.value = x + e.translationX;
      ghostSV.y.value = y + e.translationY;
      if (onGhostMove) runOnJS(onGhostMove)({ x: ghostSV.x.value, y: ghostSV.y.value });
    })
    .onEnd(() => {
      runOnJS(finishGhostDrag)(ghostSV.x.value, ghostSV.y.value);
    });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx.value - TILE_SIZE / 2 },
      { translateY: cy.value - TILE_SIZE / 2 },
      { scale: scl.value * highlightScale.value },
    ],
  }));

  const paletteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scl.value }],
  }));

  const highlighted = isActive || isPulsing;

  return (
    <GestureDetector gesture={isTrack ? trackPan : palettePan}>
      <Animated.View
        style={[
          styles.tile,
          highlighted && styles.tileHighlighted,
          isTrack ? styles.trackPosition : { left: x - TILE_SIZE / 2, top: y - TILE_SIZE / 2 },
          isTrack ? trackStyle : paletteStyle,
        ]}
      >
        <InstructionIcon type={type} color={highlighted ? COLORS.white : COLORS.textDark} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADII.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  tileHighlighted: {
    backgroundColor: COLORS.bubbleOrange,
  },
  trackPosition: {
    left: 0,
    top: 0,
  },
});

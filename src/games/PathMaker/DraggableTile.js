import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Ellipse } from 'react-native-svg';
import { COLORS, DEPTH, PATHMAKER_COLORS, RADII, shade } from '../../constants/theme';
import { selectionHaptic } from '../../utils/haptics';
import { playTileDropSound, playTilePickupSound } from '../../utils/sound';
import InstructionIcon from './InstructionIcon';
import { TILE_SIZE } from './trackLayout';

// Toy-block resting colors, one per instruction type — a non-reading
// child parsing a sequence gets color as a second cue alongside the icon.
// Chosen to avoid clashing with the board's goal (sage)/raised (honey)/
// active-highlight (terracotta) on the same screen.
const TILE_TOP_COLORS = {
  step: PATHMAKER_COLORS.tileStep,
  turnLeft: PATHMAKER_COLORS.tileTurnLeft,
  turnRight: PATHMAKER_COLORS.tileTurnRight,
  hop: PATHMAKER_COLORS.tileStep,
};

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
//
// Tiles are physical "toy blocks" now (slab depth + per-type color), so
// they follow Tangram's Piece.js shadow convention, not UI-chrome
// shadows: no SHADOWS.card at rest (grounded by the slab's own bottom-
// band contact instead), a ground-shadow ellipse only while a track tile
// is actively being dragged (driven off the existing pickup-scale `scl`,
// same as Marble.js drives its shadow off `scale`).
export default function DraggableTile({
  mode,
  type,
  id,
  x,
  y = 0,
  disabled = false,
  isActive = false,
  isPulsing = false,
  isEjecting = false,
  ghostSV = null,
  onSpawnStart,
  onGhostMove,
  onGhostEnd,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRemoved,
  onTap = null,
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

  // Theater auto-eject: the offending tile hops up out of its slot and
  // shrinks away, then reports itself removed — the same onRemoved path
  // the drag-off and tap removals resolve through.
  useEffect(() => {
    if (!isEjecting || !isTrack) return;
    cy.value = withTiming(y - 34, { duration: 300 });
    scl.value = withSequence(
      withTiming(1.15, { duration: 120 }),
      withTiming(0, { duration: 180 }, (finished) => {
        if (finished && onRemoved) runOnJS(onRemoved)(id);
      })
    );
  }, [isEjecting]);

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
        playTileDropSound();
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
        runOnJS(playTileDropSound)();
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
      runOnJS(playTilePickupSound)();
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
      runOnJS(playTilePickupSound)();
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

  // Tap = the toddler-grade shortcut. A palette tap appends the
  // instruction (no aiming required); a track tap on the last tile pulls
  // it back out. Exclusive() lets the pan win whenever the finger
  // actually travels, so dragging is unchanged.
  const paletteTap = Gesture.Tap()
    .enabled(!disabled)
    .maxDuration(300)
    .onEnd((_e, success) => {
      if (!success || !onTap) return;
      scl.value = withSequence(withTiming(0.92, { duration: 80 }), withTiming(1, { duration: 120 }));
      runOnJS(selectionHaptic)();
      runOnJS(onTap)(type);
    });

  const trackTap = Gesture.Tap()
    .enabled(!disabled)
    .maxDuration(300)
    .onEnd((_e, success) => {
      if (!success || !onRemoved) return;
      runOnJS(selectionHaptic)();
      // Commit first (onTap lets GameScreen start the moonwalk now), then
      // shrink; onRemoved prunes the track state when the shrink lands.
      if (onTap) runOnJS(onTap)(id);
      scl.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) runOnJS(onRemoved)(id);
      });
    });

  const trackGesture = Gesture.Exclusive(trackPan, trackTap);
  const paletteGesture = Gesture.Exclusive(palettePan, paletteTap);

  // Gesture target = translate only. The scale lives on an inner view —
  // scaling the RNGH target itself breaks pointer math on web (the
  // documented Piece.js gotcha), and the target must keep an explicit
  // TILE_SIZE box or it collapses to 0×0 once every child is absolute.
  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx.value - TILE_SIZE / 2 },
      { translateY: cy.value - TILE_SIZE / 2 },
    ],
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scl.value * highlightScale.value }],
  }));

  // Ground shadow: only while an existing track tile is actively lifted
  // by a drag (scl climbs from 1 toward 1.1) — zero at rest, per the
  // depth policy. Palette masters never lift, so they never show one.
  const shadowStyle = useAnimatedStyle(() => {
    const lifted = interpolate(scl.value, [1, 1.1], [0, 1], 'clamp');
    return { opacity: lifted };
  });

  const highlighted = isActive || isPulsing;
  const topColor = highlighted ? COLORS.bubbleOrange : TILE_TOP_COLORS[type] ?? COLORS.white;
  const bandColor = shade(topColor, DEPTH.sideShade);

  return (
    <GestureDetector gesture={isTrack ? trackGesture : paletteGesture}>
      <Animated.View
        style={[
          styles.hitBox,
          isTrack ? null : { left: x - TILE_SIZE / 2, top: y - TILE_SIZE / 2 },
          isTrack ? wrapperStyle : null,
        ]}
      >
        <Animated.View style={[styles.scaler, scaleStyle]}>
          {isTrack && (
            <Animated.View pointerEvents="none" style={[styles.dragShadow, shadowStyle]}>
              <Svg width={TILE_SIZE} height={TILE_SIZE / 2} viewBox={`0 0 ${TILE_SIZE} ${TILE_SIZE / 2}`}>
                <Ellipse cx={TILE_SIZE / 2} cy={10} rx={TILE_SIZE / 3} ry={6} fill="#3E3A5E" opacity={0.14} />
              </Svg>
            </Animated.View>
          )}
          <View style={[styles.band, { backgroundColor: bandColor }]} />
          <View style={[styles.tile, { backgroundColor: topColor }]}>
            <InstructionIcon type={type} color={highlighted ? COLORS.white : COLORS.textDark} />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // The RNGH gesture target: a real TILE_SIZE box (all visual children
  // are position:absolute, so without explicit dimensions this collapses
  // to 0×0 and only hitSlop remains tappable). Track tiles are placed by
  // wrapperStyle's translate; palette masters by left/top.
  hitBox: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  // Pickup/highlight scale lives here, one level below the gesture target.
  scaler: {
    position: 'absolute',
    top: 0,
    left: 0,
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
  dragShadow: {
    position: 'absolute',
    top: TILE_SIZE + 6,
    left: 0,
    width: TILE_SIZE,
  },
});

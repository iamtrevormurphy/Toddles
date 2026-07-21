import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  COLORS,
  MONUMENT_COLORS,
  RADII,
  SHADOWS,
  TANGRAM_COLORS,
  TOUCH,
  TYPE,
  shade,
} from '../../constants/theme';
import { findClosestSlot } from '../../utils/collision';
import { pointInPolygon } from '../../utils/geometry';
import { snapHaptic, successHaptic, tapHaptic } from '../../utils/haptics';
import { playCelebrationSound, playSnapSound } from '../../utils/sound';
import AmbientClouds from '../../components/AmbientClouds';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import GradientBackground from '../../components/GradientBackground';
import SuccessBar from '../../components/SuccessBar';
import { Companion } from '../../characters';
import Board from './Board';
import MonumentLayer from './Ornaments';
import { getMonumentPlan, topPoint } from './monuments';
import Piece from './Piece';
import PuzzlePreview from './PuzzlePreview';
import SparkleBurst from './SparkleBurst';
import { getShape, getShapePath } from './shapes';
import { getBoardFrame, getSlotPolygon, puzzleToScreen, screenToPuzzle } from './transforms';

const HEADER_H = 124;
const TRAY_SCALE = 0.6;
const SETTLE_MS = 260;
const PLATFORM_DEPTH = 12;
const HINT_DELAY_MS = 12000;
const HINT_DURATION_MS = 2500;

// Pip's box metrics (from his def: viewBox [100, 112], feetY 102) so his
// FEET — not his box corner — can be pinned to a perch point.
const PIP_SIZE = 68;
const PIP_W = (100 / 112) * PIP_SIZE;
const PIP_FEET_Y = (102 / 112) * PIP_SIZE;

export default function GameScreen({ puzzle, onBack, onNext, onPickMore, renderMode = 'basic' }) {
  const { width, height } = useWindowDimensions();

  // Placements is set the moment a drop is accepted (drives snapping logic and
  // disables the piece); settled follows after the landing animation (drives
  // the solid board fill, piece hiding, and completion).
  const [placements, setPlacements] = useState({});
  const [settled, setSettled] = useState({});
  const [sparkle, setSparkle] = useState(null);
  const [complete, setComplete] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [pipMood, setPipMood] = useState('idle');
  const [perchSlotId, setPerchSlotId] = useState(null);
  const timersRef = useRef([]);
  const hintTimerRef = useRef(null);
  const pipRef = useRef(null);
  const lastSettledRef = useRef(null);

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  // On completion the tray is empty (all pieces are on the board), so fade
  // its panel + home-ghosts out — otherwise the faint shelf sits behind the
  // bottom success bar. Gentle single settle, per the depth/motion policy.
  const trayFade = useSharedValue(1);
  useEffect(() => {
    trayFade.value = withTiming(complete ? 0 : 1, { duration: 300 });
  }, [complete]);
  const trayFadeStyle = useAnimatedStyle(() => ({ opacity: trayFade.value }));
  // Ghosts rest at 0.12; fold the fade in so completion doesn't flash them opaque.
  const ghostFadeStyle = useAnimatedStyle(() => ({ opacity: 0.12 * trayFade.value }));

  const pieceCount = puzzle.slots.length;
  const trayRows = pieceCount > 4 ? 2 : 1;
  const trayH = trayRows === 1 ? 132 : 204;
  const boardSize = Math.min(width - 16, height - HEADER_H - trayH - 8);
  // Center board + tray in the space below the header when the screen is
  // tall. The tray attaches flush under the slab's bottom band — a shelf,
  // not a second floating panel (depth policy).
  const contentH = boardSize + PLATFORM_DEPTH + trayH;
  const boardTop = HEADER_H + Math.max(0, (height - HEADER_H - contentH) / 2);
  const trayTop = boardTop + boardSize + PLATFORM_DEPTH;
  const frame = getBoardFrame(puzzle, boardSize);
  const layout = {
    boardLeft: (width - boardSize) / 2,
    boardTop,
    scale: frame.scale,
    originX: frame.originX,
    originY: frame.originY,
  };
  const snapRadius = Math.max(56, boardSize * 0.16);

  // Pip watches the dragged piece through these shared values (written inside
  // the existing pan worklets in Piece.js — zero React renders during drags).
  const gaze = {
    x: useSharedValue(0),
    y: useSharedValue(0),
    active: useSharedValue(0),
  };
  // Pip's home perch is the board's top-left corner; on short screens (where
  // the board rides high) he steps down onto the board so he never hides
  // behind the back button. Header chrome bottoms out at y≈114. Once pieces
  // start settling he abandons this spot and lives on the build itself.
  const pipLeft = layout.boardLeft + 14;
  const pipTop = Math.max(boardTop - 60, 118);
  const homeFeet = { x: pipLeft + PIP_W / 2, y: pipTop + PIP_FEET_Y };
  const hintTarget = { x: width / 2, y: trayTop + trayH / 2 };

  const slots = useMemo(
    () =>
      puzzle.slots.map((slot, i) => ({
        id: i,
        shape: slot.shape,
        rotation: slot.rotation || 0,
        flip: !!slot.flip,
        polygon: getSlotPolygon(slot),
        ...puzzleToScreen({ x: slot.cx, y: slot.cy }, layout),
      })),
    [puzzle, width, height]
  );

  // Which Monument Valley ornament grows on each slot once it settles.
  const plan = useMemo(() => getMonumentPlan(puzzle), [puzzle]);

  const settledSlotIds = Object.values(settled);

  // --- Pip lives on the build ---------------------------------------------
  // After each piece settles, Pip hops onto its roof — preferring the piece
  // just placed, falling back to the build's summit. A perch is skipped when
  // an ornament grows there (never trample the flag) or when ANY slot sits
  // directly above it: a filled one means he'd clip through the wall, an
  // empty one means he'd cover the very hole the child must fill. On
  // completion he claims the highest standable roof.
  useEffect(() => {
    const filled = new Set(settledSlotIds);
    const standable = (slotId) =>
      plan.standable[slotId] && plan.ornaments[slotId]?.anchor !== 'above';
    const byHeight = [...settledSlotIds].sort(
      (a, b) => topPoint(slots[a].polygon).y - topPoint(slots[b].polygon).y
    );
    const preferred = complete
      ? byHeight
      : [lastSettledRef.current, ...byHeight].filter((id) => id != null && filled.has(id));
    setPerchSlotId(preferred.find(standable) ?? null);
  }, [settledSlotIds.length, complete]);

  const perchFeet =
    perchSlotId != null && slots[perchSlotId]
      ? puzzleToScreen(topPoint(slots[perchSlotId].polygon), layout)
      : homeFeet;
  const pipAnchor = { x: perchFeet.x, y: perchFeet.y - 30 };

  // Flight to a new perch: a horizontal glide plus a two-half hop arc.
  // Explicit halves chained on later(), NOT withSequence — a React commit
  // mid-flight (sparkles, moods) kills in-flight withSequence on web.
  const pipX = useSharedValue(homeFeet.x);
  const pipY = useSharedValue(homeFeet.y);
  const pipStartedRef = useRef(false);
  useEffect(() => {
    if (!pipStartedRef.current) {
      pipStartedRef.current = true;
      pipX.value = perchFeet.x;
      pipY.value = perchFeet.y;
      return;
    }
    pipX.value = withTiming(perchFeet.x, { duration: 430, easing: Easing.inOut(Easing.quad) });
    pipY.value = withTiming(Math.min(pipY.value, perchFeet.y) - 34, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
    later(() => {
      pipY.value = withTiming(perchFeet.y, { duration: 230, easing: Easing.in(Easing.quad) });
    }, 210);
  }, [perchFeet.x, perchFeet.y]);

  const pipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pipX.value - PIP_W / 2 },
      { translateY: pipY.value - PIP_FEET_Y },
    ],
  }));

  // One tray piece per slot, laid out in centered rows of up to 4.
  const pieces = useMemo(() => {
    const perRow = Math.min(4, Math.ceil(pieceCount / trayRows));
    const rowH = (trayH - 12) / trayRows;
    return puzzle.slots.map((slot, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, pieceCount - row * perRow);
      const cellW = Math.min(88, (width - 16) / perRow);
      return {
        id: i,
        shape: slot.shape,
        homeX: width / 2 + (col - (inRow - 1) / 2) * cellW,
        homeY: trayTop + 6 + row * rowH + rowH / 2,
      };
    });
  }, [puzzle, width, trayTop, trayH, trayRows, pieceCount]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      clearTimeout(hintTimerRef.current);
    },
    []
  );

  // Gentle nudge after inactivity: Pip leans toward the tray for a moment.
  const scheduleHint = () => {
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      setPipMood('hinting');
      hintTimerRef.current = setTimeout(() => {
        setPipMood('idle');
        scheduleHint();
      }, HINT_DURATION_MS);
    }, HINT_DELAY_MS);
  };
  useEffect(() => {
    if (!complete) scheduleHint();
    return () => clearTimeout(hintTimerRef.current);
  }, [complete]);

  const handleDrop = (pieceId, pos, callback) => {
    scheduleHint();
    const shapeType = pieces[pieceId].shape;
    const occupied = Object.values(placements);
    const candidates = slots.filter(
      (s) => s.shape === shapeType && !occupied.includes(s.id)
    );

    // Prefer the slot the finger is actually inside; otherwise the nearest
    // empty matching slot within the (generous) snap radius.
    const puzzlePos = screenToPuzzle(pos, layout);
    let target = candidates.find((s) => pointInPolygon(puzzlePos, s.polygon)) || null;
    if (!target) {
      const hit = findClosestSlot(pos, candidates);
      if (hit && hit.distance < snapRadius) target = hit.slot;
    }

    if (!target) {
      callback(null);
      tapHaptic();
      pipRef.current?.react('ohno');
      return;
    }

    callback({ x: target.x, y: target.y, rotation: target.rotation, flip: target.flip });
    setPlacements((prev) => ({ ...prev, [pieceId]: target.id }));
    snapHaptic();
    playSnapSound();
    pipRef.current?.react('cheer');
    timersRef.current.push(
      setTimeout(() => {
        lastSettledRef.current = target.id;
        setSettled((prev) => ({ ...prev, [pieceId]: target.id }));
        setSparkle({ x: target.x, y: target.y, key: `${pieceId}-${target.id}` });
      }, SETTLE_MS)
    );
  };

  // Calm completion: board settles, a honey glow breathes in, confetti drifts.
  const boardScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  useEffect(() => {
    if (settledSlotIds.length === pieceCount && !complete) {
      setComplete(true);
      setPipMood('celebrating');
      clearTimeout(hintTimerRef.current);
      successHaptic();
      playCelebrationSound();
      boardScale.value = withSequence(
        withTiming(1.03, { duration: 260 }),
        withSpring(1, { damping: 18, stiffness: 180 })
      );
      glowOpacity.value = withTiming(1, { duration: 700 });
      timersRef.current.push(setTimeout(() => setShowOverlay(true), 1400));
    }
  }, [settledSlotIds.length, pieceCount, complete]);

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={styles.container}>
      <GradientBackground name="dawn" />
      <AmbientClouds />
      <BackButton onPress={onBack} />
      <Text style={styles.title}>{puzzle.name}</Text>
      <View style={styles.goalCard}>
        <PuzzlePreview puzzle={puzzle} size={56} />
      </View>

      {/* Honey glow behind the board on completion */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            left: layout.boardLeft - 40,
            top: boardTop - 40,
            width: boardSize + 80,
            height: boardSize + 80,
          },
          glowStyle,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={COLORS.celebration} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={COLORS.celebration} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#glow)" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.board,
          {
            left: layout.boardLeft,
            top: boardTop,
            width: boardSize,
            height: boardSize + PLATFORM_DEPTH,
          },
          boardAnimatedStyle,
        ]}
      >
        <BoardPlatform size={boardSize} depth={PLATFORM_DEPTH} />
        <View style={StyleSheet.absoluteFill}>
          <Board
            puzzle={puzzle}
            filledSlotIds={settledSlotIds}
            size={boardSize}
            viewBox={`${frame.originX} ${frame.originY} ${frame.span} ${frame.span}`}
            renderMode={renderMode}
          />
        </View>
        {/* Monument architecture grows on settled pieces */}
        <MonumentLayer
          plan={plan}
          frame={frame}
          size={boardSize}
          settledSlotIds={settledSlotIds}
          complete={complete}
        />
      </Animated.View>

      {/* Pip lives on the build: he hops from roof to roof as pieces settle */}
      <Animated.View pointerEvents="none" style={[styles.pip, pipStyle]}>
        <Companion
          ref={pipRef}
          character="pip"
          size={PIP_SIZE}
          mood={pipMood}
          gazeTarget={gaze}
          anchor={pipAnchor}
          hintTarget={hintTarget}
        />
      </Animated.View>

      <Animated.View style={[styles.tray, { top: trayTop, height: trayH }, trayFadeStyle]} pointerEvents="none" />

      {/* Faint ghosts marking each piece's tray home */}
      {pieces.map((piece) => {
        const shape = getShape(piece.shape);
        const w = shape.w * layout.scale * TRAY_SCALE;
        const h = shape.h * layout.scale * TRAY_SCALE;
        return (
          <Animated.View
            key={`ghost-${piece.id}`}
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: piece.homeX - w / 2,
                top: piece.homeY - h / 2,
              },
              ghostFadeStyle,
            ]}
          >
            <Svg width={w} height={h} viewBox={`0 0 ${shape.w} ${shape.h}`}>
              <Path d={getShapePath(piece.shape)} fill={shape.color} />
            </Svg>
          </Animated.View>
        );
      })}

      {pieces.map(
        (piece) =>
          settled[piece.id] === undefined && (
            <Piece
              // Remount on viewport changes so tray homes and shared values stay in sync
              key={`${piece.id}-${width}x${height}`}
              id={piece.id}
              shapeType={piece.shape}
              homeX={piece.homeX}
              homeY={piece.homeY}
              boardScale={layout.scale}
              trayScale={TRAY_SCALE}
              disabled={placements[piece.id] !== undefined || complete}
              onDrop={handleDrop}
              gazeSV={gaze}
            />
          )
      )}

      {sparkle && <SparkleBurst key={sparkle.key} x={sparkle.x} y={sparkle.y} />}

      {complete && (
        <Confetti
          visible
          originX={layout.boardLeft + boardSize / 2}
          originY={boardTop + boardSize / 2}
        />
      )}

      <SuccessBar
        visible={showOverlay}
        message={`${puzzle.name}!`}
        onNext={onNext}
        secondaryLabel="More pictures"
        onSecondary={onPickMore}
        accessory={<PuzzlePreview puzzle={puzzle} size={96} extruded />}
      />
    </View>
  );
}

// The board as a raised stone slab: darker bottom band grounds it (depth
// policy — the tray attaches flush below, so no ground ellipses here).
// Paint only — board geometry unchanged.
function BoardPlatform({ size, depth }) {
  const top = TANGRAM_COLORS.boardBackground;
  const bottom = shade(top, 0.25);
  return (
    <Svg
      width={size}
      height={size + depth}
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${size} ${size + depth}`}
    >
      <Rect x={0} y={depth} width={size} height={size} rx={RADII.lg} fill={bottom} />
      <Rect x={0} y={0} width={size} height={size} rx={RADII.lg} fill={top} />
      {/* Gilded rim — the Monument Valley gold-trim signature */}
      <Rect
        x={1.25}
        y={1.25}
        width={size - 2.5}
        height={size - 2.5}
        rx={RADII.lg - 1}
        fill="none"
        stroke={MONUMENT_COLORS.trim}
        strokeWidth={2.5}
        opacity={0.55}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    position: 'absolute',
    top: 62,
    alignSelf: 'center',
    ...TYPE.title,
    fontSize: 34,
    color: COLORS.textDark,
  },
  goalCard: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: RADII.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  board: {
    position: 'absolute',
  },
  pip: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 50,
  },
  glow: {
    position: 'absolute',
  },
  tray: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: RADII.lg,
    backgroundColor: 'rgba(62, 58, 94, 0.06)',
  },
});

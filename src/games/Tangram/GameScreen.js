import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { COLORS, RADII, SHADOWS, TANGRAM_COLORS, TOUCH, TYPE, shade } from '../../constants/theme';
import { findClosestSlot } from '../../utils/collision';
import { pointInPolygon } from '../../utils/geometry';
import { snapHaptic, successHaptic, tapHaptic } from '../../utils/haptics';
import { playCelebrationSound, playSnapSound } from '../../utils/sound';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import GradientBackground from '../../components/GradientBackground';
import PrimaryButton from '../../components/PrimaryButton';
import { ChevronRightIcon } from '../../components/icons';
import { Companion } from '../../characters';
import Board from './Board';
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
  const timersRef = useRef([]);
  const hintTimerRef = useRef(null);
  const pipRef = useRef(null);

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
  // Pip perches on the board's top-left corner; on short screens (where the
  // board rides high) he steps down onto the board so he never hides behind
  // the back button. Header chrome bottoms out at y≈114.
  const pipLeft = layout.boardLeft + 14;
  const pipTop = Math.max(boardTop - 60, 118);
  const pipAnchor = { x: pipLeft + 34, y: pipTop + 34 };
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
        setSettled((prev) => ({ ...prev, [pieceId]: target.id }));
        setSparkle({ x: target.x, y: target.y, key: `${pieceId}-${target.id}` });
      }, SETTLE_MS)
    );
  };

  const settledSlotIds = Object.values(settled);

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
      </Animated.View>

      {/* Pip perches on the board's top-left corner, watching */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: pipLeft,
          top: pipTop,
          zIndex: 50,
        }}
      >
        <Companion
          ref={pipRef}
          character="pip"
          size={68}
          mood={pipMood}
          gazeTarget={gaze}
          anchor={pipAnchor}
          hintTarget={hintTarget}
        />
      </View>

      <View style={[styles.tray, { top: trayTop, height: trayH }]} pointerEvents="none" />

      {/* Faint ghosts marking each piece's tray home */}
      {pieces.map((piece) => {
        const shape = getShape(piece.shape);
        const w = shape.w * layout.scale * TRAY_SCALE;
        const h = shape.h * layout.scale * TRAY_SCALE;
        return (
          <View
            key={`ghost-${piece.id}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: piece.homeX - w / 2,
              top: piece.homeY - h / 2,
              opacity: 0.12,
            }}
          >
            <Svg width={w} height={h} viewBox={`0 0 ${shape.w} ${shape.h}`}>
              <Path d={getShapePath(piece.shape)} fill={shape.color} />
            </Svg>
          </View>
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

      {showOverlay && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <PuzzlePreview puzzle={puzzle} size={120} extruded />
            <Text style={styles.overlayTitle}>{puzzle.name}!</Text>
            <PrimaryButton label="Next" icon={<ChevronRightIcon size={26} />} onPress={onNext} />
            <TouchableOpacity style={styles.moreButton} onPress={onPickMore}>
              <Text style={styles.moreButtonText}>More pictures</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(62, 58, 94, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.xl,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 16,
    ...SHADOWS.floating,
  },
  overlayTitle: {
    ...TYPE.title,
    fontSize: 32,
    color: COLORS.textDark,
  },
  moreButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  moreButtonText: {
    ...TYPE.body,
    fontSize: 19,
    color: COLORS.textLight,
  },
});

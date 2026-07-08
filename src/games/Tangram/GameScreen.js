import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, TANGRAM_COLORS, TOUCH } from '../../constants/theme';
import { findClosestSlot } from '../../utils/collision';
import { pointInPolygon } from '../../utils/geometry';
import { snapHaptic, successHaptic, tapHaptic } from '../../utils/haptics';
import { playCelebrationSound, playSnapSound } from '../../utils/sound';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import Board from './Board';
import Piece from './Piece';
import PuzzlePreview from './PuzzlePreview';
import SparkleBurst from './SparkleBurst';
import Svg, { Path } from 'react-native-svg';
import { getShape, getShapePath } from './shapes';
import { getBoardFrame, getSlotPolygon, puzzleToScreen, screenToPuzzle } from './transforms';

const HEADER_H = 124;
const TRAY_SCALE = 0.6;
const SETTLE_MS = 260;

export default function GameScreen({ puzzle, onBack, onNext, onPickMore }) {
  const { width, height } = useWindowDimensions();

  // Placements is set the moment a drop is accepted (drives snapping logic and
  // disables the piece); settled follows after the landing animation (drives
  // the solid board fill, piece hiding, and completion).
  const [placements, setPlacements] = useState({});
  const [settled, setSettled] = useState({});
  const [sparkle, setSparkle] = useState(null);
  const [complete, setComplete] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const timersRef = useRef([]);

  const pieceCount = puzzle.slots.length;
  const trayRows = pieceCount > 4 ? 2 : 1;
  const trayH = trayRows === 1 ? 132 : 204;
  const boardSize = Math.min(width - 16, height - HEADER_H - trayH - 8);
  // Center board + tray in the space below the header when the screen is tall.
  const contentH = boardSize + 8 + trayH;
  const boardTop = HEADER_H + Math.max(0, (height - HEADER_H - contentH) / 2);
  const trayTop = boardTop + boardSize + 8;
  const frame = getBoardFrame(puzzle, boardSize);
  const layout = {
    boardLeft: (width - boardSize) / 2,
    boardTop,
    scale: frame.scale,
    originX: frame.originX,
    originY: frame.originY,
  };
  const snapRadius = Math.max(56, boardSize * 0.16);

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

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const handleDrop = (pieceId, pos, callback) => {
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
      return;
    }

    callback({ x: target.x, y: target.y, rotation: target.rotation, flip: target.flip });
    setPlacements((prev) => ({ ...prev, [pieceId]: target.id }));
    snapHaptic();
    playSnapSound();
    timersRef.current.push(
      setTimeout(() => {
        setSettled((prev) => ({ ...prev, [pieceId]: target.id }));
        setSparkle({ x: target.x, y: target.y, key: `${pieceId}-${target.id}` });
      }, SETTLE_MS)
    );
  };

  const settledSlotIds = Object.values(settled);
  useEffect(() => {
    if (settledSlotIds.length === pieceCount && !complete) {
      setComplete(true);
      successHaptic();
      playCelebrationSound();
      timersRef.current.push(setTimeout(() => setShowOverlay(true), 1300));
    }
  }, [settledSlotIds.length, pieceCount, complete]);

  return (
    <View style={styles.container}>
      <BackButton onPress={onBack} />
      <Text style={styles.title}>{puzzle.name}</Text>
      <View style={styles.goalCard}>
        <PuzzlePreview puzzle={puzzle} size={56} />
      </View>

      <View
        style={[
          styles.board,
          {
            left: layout.boardLeft,
            top: layout.boardTop,
            width: boardSize,
            height: boardSize,
          },
        ]}
      >
        <Board
          puzzle={puzzle}
          filledSlotIds={settledSlotIds}
          size={boardSize}
          viewBox={`${frame.originX} ${frame.originY} ${frame.span} ${frame.span}`}
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
            />
          )
      )}

      {sparkle && <SparkleBurst key={sparkle.key} x={sparkle.x} y={sparkle.y} />}

      {complete && (
        <>
          <Confetti
            visible
            originX={layout.boardLeft + boardSize / 2}
            originY={layout.boardTop + boardSize / 2}
          />
          <BouncingEmoji
            emoji={puzzle.emoji}
            x={layout.boardLeft + boardSize / 2}
            y={layout.boardTop + boardSize / 2}
          />
        </>
      )}

      {showOverlay && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>
              {puzzle.emoji} {puzzle.name}!
            </Text>
            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextButtonText}>Next ➡️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton} onPress={onPickMore}>
              <Text style={styles.moreButtonText}>More pictures</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function BouncingEmoji({ emoji, x, y }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.2, { duration: 250 }),
      withRepeat(
        withSequence(withTiming(0.9, { duration: 350 }), withTiming(1.15, { duration: 350 })),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.bounceEmoji, { left: x - 48, top: y - 48 }, animatedStyle]}>
      <Text style={styles.bounceEmojiText}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  title: {
    position: 'absolute',
    top: 62,
    alignSelf: 'center',
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  goalCard: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  board: {
    position: 'absolute',
    backgroundColor: TANGRAM_COLORS.boardBackground,
    borderRadius: 20,
  },
  tray: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 16,
  },
  overlayTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  nextButton: {
    backgroundColor: COLORS.success,
    height: TOUCH.buttonHeight,
    minWidth: 220,
    borderRadius: TOUCH.buttonHeight / 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: TOUCH.buttonPadding,
  },
  nextButtonText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  moreButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  moreButtonText: {
    fontSize: 20,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  bounceEmoji: {
    position: 'absolute',
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 900,
  },
  bounceEmojiText: {
    fontSize: 72,
  },
});

import React, { useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS, SPACING, TYPE } from '../../constants/theme';
import { BroomIcon, ChevronRightIcon } from '../../components/icons';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import GradientBackground from '../../components/GradientBackground';
import PrimaryButton from '../../components/PrimaryButton';
import { executeProgram } from './executeProgram';
import { findGoal } from './grid';
import Board, { tileCenter } from './Board';
import Character, { FACING_DEGREES } from './Character';
import Palette, { palettePixelWidth } from './Palette';
import Track from './Track';
import GhostTile from './GhostTile';
import { getTotalLevels } from './levels';
import { computeSlotCenters, nearestInsertionIndex, trackPixelWidth, TILE_SIZE } from './trackLayout';

// Deliberate, unhurried pacing so a 4-year-old can map each tile to the
// character's action in real time — the single most important mechanic
// in the whole game.
const STEP_DURATION = 900;

// Layout constants for the track/palette area — one shared coordinate
// origin for slot centers, palette master positions, and the ghost tile,
// so a spawned tile can snap from one row into the other without any
// coordinate-space translation.
const ROW_GAP = SPACING[4];
const TRACK_ROW_Y = TILE_SIZE / 2;
const PALETTE_ROW_Y = TILE_SIZE + ROW_GAP + TILE_SIZE / 2;
const OFF_TRACK_PADDING = 60;

export default function GameScreen({ level, navigation, onNext }) {
  const [phase, setPhase] = useState('editing'); // editing | running | success | bug
  const [activeIndex, setActiveIndex] = useState(null);
  const [confettiVisible, setConfettiVisible] = useState(false);

  const [track, setTrack] = useState([]); // [{id, type}]
  const [ghostType, setGhostType] = useState(null);
  const [draggingTrackId, setDraggingTrackId] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);

  const timersRef = useRef([]);
  const rotationTarget = useRef(FACING_DEGREES[level.start.facing]);
  const nextTileId = useRef(0);
  const makeId = () => `t${nextTileId.current++}`;

  const startCenter = tileCenter(level.start.x, level.start.y);
  const goalTile = findGoal(level.board);
  const goalCenter = tileCenter(goalTile.x, goalTile.y);
  const cx = useSharedValue(startCenter.x);
  const cy = useSharedValue(startCenter.y);
  const rotation = useSharedValue(rotationTarget.current);
  const lift = useSharedValue(0);

  const ghostSV = { x: useSharedValue(0), y: useSharedValue(0), opacity: useSharedValue(0) };

  const slotCenters = computeSlotCenters(level.slotCount);
  const interactive = phase === 'editing' || phase === 'success';

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const isOnTrackY = (y) => y >= TRACK_ROW_Y - OFF_TRACK_PADDING && y <= TRACK_ROW_Y + OFF_TRACK_PADDING;

  // --- Palette-origin drag (spawning a new tile) ---

  const handleSpawnStart = (type) => {
    setGhostType(type);
    // No preview gap until the first move event reports a real position —
    // avoids flashing a gap at an arbitrary index before the finger moves.
    setPreviewIndex(null);
  };

  const handleGhostMove = ({ x }) => {
    const idx = nearestInsertionIndex(x, slotCenters, null, track);
    setPreviewIndex((prev) => (prev === idx ? prev : idx));
  };

  const handleGhostEnd = ({ x, y }, callback) => {
    const idx = nearestInsertionIndex(x, slotCenters, null, track);
    const hasRoom = track.length < level.slotCount;

    if (isOnTrackY(y) && hasRoom) {
      callback({ snap: { x: slotCenters[idx], y: TRACK_ROW_Y } });
      const newTile = { id: makeId(), type: ghostType };
      setTrack((prev) => {
        const next = [...prev];
        next.splice(idx, 0, newTile);
        return next;
      });
      later(() => setGhostType(null), 120);
    } else {
      callback(null); // no snap → DraggableTile fades the ghost out
      setGhostType(null);
    }
    setPreviewIndex(null);
  };

  // --- Track-origin drag (reorder / remove) ---

  const handleDragStart = (id) => {
    setDraggingTrackId(id);
  };

  const handleDragMove = (id, { x }) => {
    const idx = nearestInsertionIndex(x, slotCenters, id, track);
    setPreviewIndex((prev) => (prev === idx ? prev : idx));
  };

  const handleDragEnd = (id, { x, y }, callback) => {
    if (isOnTrackY(y)) {
      const idx = nearestInsertionIndex(x, slotCenters, id, track);
      callback({ snap: { x: slotCenters[idx] } });
      setTrack((prev) => {
        const tile = prev.find((t) => t.id === id);
        const rest = prev.filter((t) => t.id !== id);
        const next = [...rest];
        next.splice(idx, 0, tile);
        return next;
      });
    } else {
      callback({ remove: true });
      // track isn't mutated yet — handleTileRemoved does that once the
      // tile's own shrink/fade animation finishes.
    }
    setDraggingTrackId(null);
    setPreviewIndex(null);
  };

  const handleTileRemoved = (id) => {
    setTrack((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClear = () => {
    if (!interactive) return;
    setTrack([]);
  };

  // --- Execution (unchanged from Phase 1 except reading `track`) ---

  const goToPose = (pose, duration = STEP_DURATION) => {
    const center = tileCenter(pose.x, pose.y);
    cx.value = withTiming(center.x, { duration });
    cy.value = withTiming(center.y, { duration });
    rotationTarget.current = FACING_DEGREES[pose.facing];
    rotation.value = withTiming(rotationTarget.current, { duration });
  };

  const animateStep = (step) => {
    if (step.type === 'turnLeft' || step.type === 'turnRight') {
      rotationTarget.current += step.type === 'turnRight' ? 90 : -90;
      rotation.value = withTiming(rotationTarget.current, { duration: STEP_DURATION });
      return;
    }

    if (step.result === 'ok') {
      const center = tileCenter(step.to.x, step.to.y);
      cx.value = withTiming(center.x, { duration: STEP_DURATION });
      cy.value = withTiming(center.y, { duration: STEP_DURATION });
      if (step.type === 'hop') {
        lift.value = withSequence(
          withTiming(-16, { duration: STEP_DURATION / 2 }),
          withTiming(0, { duration: STEP_DURATION / 2 })
        );
      }
      return;
    }

    // Failed step: lean toward the attempted cell, then retreat — the
    // "teeter at the edge and step back" bug feedback. Never a punishment
    // cue, just a gentle physical reaction.
    const from = tileCenter(step.from.x, step.from.y);
    const attempted = tileCenter(step.attempted.x, step.attempted.y);
    const leanX = from.x + (attempted.x - from.x) * 0.35;
    const leanY = from.y + (attempted.y - from.y) * 0.35;
    cx.value = withSequence(
      withTiming(leanX, { duration: STEP_DURATION * 0.4 }),
      withTiming(from.x, { duration: STEP_DURATION * 0.6 })
    );
    cy.value = withSequence(
      withTiming(leanY, { duration: STEP_DURATION * 0.4 }),
      withTiming(from.y, { duration: STEP_DURATION * 0.6 })
    );
  };

  const handlePlay = () => {
    if (phase === 'running') return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('running');
    setActiveIndex(null);
    setConfettiVisible(false);

    const tiles = track.map((t) => t.type);
    const { steps, outcome, failIndex } = executeProgram(level.board, level.start, tiles);

    // Every Play press starts fresh from the level's start pose — snap
    // instantly (no tween) so replays don't glide from wherever the last
    // run ended, and so rotationTarget's running total can't compound
    // across runs (it must match the start facing exactly, not
    // accumulate additional turns from a previous play).
    const start = tileCenter(level.start.x, level.start.y);
    cx.value = start.x;
    cy.value = start.y;
    rotationTarget.current = FACING_DEGREES[level.start.facing];
    rotation.value = rotationTarget.current;
    lift.value = 0;

    steps.forEach((step, i) => {
      later(() => {
        setActiveIndex(step.instructionIndex);
        animateStep(step);
      }, i * STEP_DURATION);
    });

    later(() => {
      if (outcome === 'success') {
        setActiveIndex(null);
        setPhase('success');
        setConfettiVisible(true);
        return;
      }

      setActiveIndex(failIndex);
      setPhase('bug');

      later(() => {
        goToPose(level.start);
        later(() => {
          setPhase('editing');
          setActiveIndex(null);
        }, STEP_DURATION);
      }, 700);
    }, steps.length * STEP_DURATION + 100);
  };

  const highlightIndex = phase === 'running' ? activeIndex : null;
  const pulseIndex = phase === 'bug' && activeIndex != null && activeIndex < level.slotCount ? activeIndex : null;

  const trackAreaWidth = Math.max(trackPixelWidth(level.slotCount), palettePixelWidth());
  const trackAreaHeight = PALETTE_ROW_Y + TILE_SIZE / 2;

  return (
    <SafeAreaView style={styles.container}>
      <GradientBackground name="dusk" />
      <BackButton onPress={() => navigation.goBack()} />

      <View style={styles.levelIndicator}>
        <Text style={styles.levelText}>
          Level {level.id}/{getTotalLevels()}
        </Text>
      </View>

      <View style={styles.center}>
        <View style={styles.boardWrap}>
          <Board board={level.board} />
          <Character cx={cx} cy={cy} rotation={rotation} lift={lift} />
          <Confetti
            visible={confettiVisible}
            originX={goalCenter.x}
            originY={goalCenter.y}
            onComplete={() => setConfettiVisible(false)}
          />
        </View>

        <View style={[styles.trackArea, { width: trackAreaWidth, height: trackAreaHeight }]}>
          <Track
            slotCenters={slotCenters}
            rowY={TRACK_ROW_Y}
            track={track}
            previewIndex={previewIndex}
            draggingId={draggingTrackId}
            disabled={!interactive}
            highlightIndex={highlightIndex}
            pulseIndex={pulseIndex}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onRemoved={handleTileRemoved}
          />
          <Palette
            rowY={PALETTE_ROW_Y}
            disabled={!interactive}
            ghostSV={ghostSV}
            onSpawnStart={handleSpawnStart}
            onGhostMove={handleGhostMove}
            onGhostEnd={handleGhostEnd}
          />
          <GhostTile type={ghostType} ghostSV={ghostSV} />
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.broomButton, !interactive && styles.buttonDisabled]}
            onPress={handleClear}
            disabled={!interactive}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BroomIcon size={26} color={COLORS.textDark} />
          </TouchableOpacity>

          <PrimaryButton
            label={phase === 'running' ? 'Running…' : 'Play'}
            onPress={handlePlay}
            style={phase === 'running' && styles.buttonDisabled}
          />
        </View>
      </View>

      {phase === 'success' && (
        <View style={styles.completeOverlay}>
          <View style={styles.completeCard}>
            <Text style={styles.completeText}>Goal reached!</Text>
            <PrimaryButton label="Next" icon={<ChevronRightIcon size={26} />} onPress={onNext} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
  },
  boardWrap: {
    position: 'relative',
  },
  levelIndicator: {
    position: 'absolute',
    top: 55,
    right: 20,
    zIndex: 100,
  },
  levelText: {
    ...TYPE.body,
    fontSize: 18,
    color: COLORS.textLight,
  },
  trackArea: {
    position: 'relative',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  broomButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(62, 58, 94, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  completeCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.xl,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 20,
    ...SHADOWS.floating,
  },
  completeText: {
    ...TYPE.display,
    fontSize: 40,
    color: COLORS.success,
  },
});

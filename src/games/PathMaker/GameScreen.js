import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS, SPACING, TYPE } from '../../constants/theme';
import { BroomIcon, ChevronRightIcon } from '../../components/icons';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import PrimaryButton from '../../components/PrimaryButton';
import { evaluateStep } from './executeProgram';
import { findGoal, tileAt, TILE_TYPES } from './grid';
import Board, { boardPixelSize, tileCenter } from './Board';
import SlothWalker, { FACING_DEGREES } from './Character';
import FacingChevron from './FacingChevron';
import Palette, { palettePixelWidth } from './Palette';
import Track from './Track';
import GhostTile from './GhostTile';
import { getTotalLevels } from './levels';
import { computeSlotCenters, trackPixelWidth, TILE_SIZE, TRACK_WINDOW } from './trackLayout';
import DizzyStars from './DizzyStars';
import { SnackGlyph } from './Snack';
import { useReducedMotion } from '../../utils/motion';
import { successHaptic } from '../../utils/haptics';
import {
  playBonkSound,
  playCelebrationSound,
  playChompSound,
  playFootstepSound,
  playMoonwalkSound,
  playOverflowSound,
  playTeeterSound,
  playTileDropSound,
} from '../../utils/sound';

// Deliberate, unhurried pacing so a 4-year-old can map each tile to
// Lento's action in real time — and slow IS the sloth's whole personality.
const STEP_DURATION = 900;

// Layout constants for the track/palette area — one shared coordinate
// origin for slot centers, palette master positions, and the ghost tile,
// so a spawned tile can snap from one row into the other without any
// coordinate-space translation.
const ROW_GAP = SPACING[4];
const TRACK_ROW_Y = TILE_SIZE / 2;
const PALETTE_ROW_Y = TILE_SIZE + ROW_GAP + TILE_SIZE / 2;
const OFF_TRACK_PADDING = 60;

// Unit direction per facing, fed to Lento's gazeTarget (with a zero
// anchor the rig reads these as a pure direction) so his pupils look one
// tile ahead — the soft half of the facing cue; FacingChevron is the
// exact half.
const FACING_VECTORS = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

// Live-follow: there is no Play button. Every tile the child adds makes
// Lento walk that step IMMEDIATELY (queued if he's mid-stride); pulling
// the last tile back out makes him moonwalk the step back. The program
// track is a live record of where he's been, not a plan to submit.
//
//   phase 'ready'    — Lento idle on his tile, chevron showing his facing;
//                      tiles can be added (tap or drag) and the last one
//                      removed (tap or drag off).
//   phase 'walking'  — a step (or moonwalk) is animating; more tiles can
//                      be added (they queue), nothing can be removed.
//   phase 'theater'  — a step failed; Lento performs the failure bit and
//                      the offending tile pops back out on its own.
//   phase 'victory'  — goal reached: slow dance, confetti, success card.
//
// All sequencing runs on later()/setTimeout, never animation-completion
// callbacks, so game state always advances even if rendering stalls.
export default function GameScreen({ level, navigation, onNext }) {
  const [phase, setPhase] = useState('ready');
  const phaseRef = useRef('ready');
  const setPhaseBoth = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Track state has a ref twin: gesture callbacks and the runner need the
  // CURRENT program synchronously (two palette taps can land in one React
  // frame — closure state would let the second overshoot slotCount).
  // Every mutation goes through updateTrack so the two can't drift.
  const [track, setTrack] = useState([]); // [{id, type}]
  const trackRef = useRef([]);
  const updateTrack = (updater) => {
    trackRef.current = updater(trackRef.current);
    setTrack(trackRef.current);
  };

  const [activeIndex, setActiveIndex] = useState(null); // slot being executed / at fault
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [ghostType, setGhostType] = useState(null);
  const [previewSlot, setPreviewSlot] = useState(null); // next empty slot, lit while a ghost hovers the track
  const [walkerMood, setWalkerMood] = useState('idle');
  const [ejectingId, setEjectingId] = useState(null);
  const [dizzyAt, setDizzyAt] = useState(null); // {x, y, key} over Lento's head after a bonk

  // Snacks Lento has munched, in munching order. Ref twin for the runner
  // (same reasoning as trackRef).
  const [eatenIds, setEatenIds] = useState([]);
  const eatenRef = useRef([]);
  const setEaten = (ids) => {
    eatenRef.current = ids;
    setEatenIds(ids);
  };
  const levelSnacks = level.snacks || [];
  const uneatenSnacks = levelSnacks.filter((s) => !eatenIds.includes(s.id));

  const timersRef = useRef([]);
  const rotationTarget = useRef(FACING_DEGREES[level.start.facing]);
  const nextTileId = useRef(0);
  const makeId = () => `t${nextTileId.current++}`;

  // The runner's world state — refs, not React state, so queued jobs never
  // read a stale closure.
  const poseRef = useRef({ ...level.start, height: level.start.height ?? 0 });
  const historyRef = useRef([]); // [{ pose: <before>, type }] per executed step
  const queueRef = useRef([]); // [{ kind:'step', tileId, type } | { kind:'undo' }]
  const busyRef = useRef(false);

  const startCenter = tileCenter(level.start.x, level.start.y);
  const goalTile = findGoal(level.board);
  const goalCenter = tileCenter(goalTile.x, goalTile.y);
  const cx = useSharedValue(startCenter.x);
  const cy = useSharedValue(startCenter.y);
  const rotation = useSharedValue(rotationTarget.current);
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  const flip = useSharedValue(level.start.facing === 'E' ? -1 : 1);
  const chevronOpacity = useSharedValue(1);
  const gazeSV = {
    x: useSharedValue(FACING_VECTORS[level.start.facing].x),
    y: useSharedValue(FACING_VECTORS[level.start.facing].y),
    active: useSharedValue(1),
  };
  const walkerRef = useRef(null);

  const ghostSV = { x: useSharedValue(0), y: useSharedValue(0), opacity: useSharedValue(0) };

  const slotCenters = computeSlotCenters(TRACK_WINDOW);

  // Shorten execution timings under reduced motion — never skip the
  // animation outright, per the design doc.
  const reducedMotion = useReducedMotion();
  const effectiveStepDuration = reducedMotion ? Math.round(STEP_DURATION * 0.45) : STEP_DURATION;

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const isOnTrackY = (y) => y >= TRACK_ROW_Y - OFF_TRACK_PADDING && y <= TRACK_ROW_Y + OFF_TRACK_PADDING;

  // Point the pupils (and the E/W body flip) at the new facing. The flip
  // tweens through scaleX 0 — a calm little "turn in place."
  const faceDirection = (facing) => {
    gazeSV.x.value = FACING_VECTORS[facing].x;
    gazeSV.y.value = FACING_VECTORS[facing].y;
    if (facing === 'E') flip.value = withTiming(-1, { duration: 250 });
    else if (facing === 'W') flip.value = withTiming(1, { duration: 250 });
  };

  // The chevron belongs to planning, not motion: visible while Lento
  // waits for the next tile, hidden while he walks/performs/celebrates.
  useEffect(() => {
    chevronOpacity.value = withTiming(phase === 'ready' ? 1 : 0, { duration: 250 });
  }, [phase]);

  // --- Adding instructions (tap or drag from the palette) -----------------
  // Append-only: a drop anywhere on the track row lands in the next empty
  // slot. No insertion-index math — a 4-year-old aims at "the row," not
  // at a slot. Adding stays enabled while Lento walks (jobs queue up);
  // only theater and victory pause the palette.

  // The program is unbounded — the rolling track window means there's no
  // capacity to run out of, so the only gate is the phase.
  const canAdd = () => phaseRef.current === 'ready' || phaseRef.current === 'walking';

  // Where the NEXT tile lands / the LAST tile sits, in window coordinates.
  const nextSlotX = () => slotCenters[Math.min(trackRef.current.length, TRACK_WINDOW - 1)];
  const lastSlotX = () => slotCenters[Math.min(trackRef.current.length, TRACK_WINDOW) - 1];

  const appendTile = (type) => {
    if (!canAdd()) return;
    const newTile = { id: makeId(), type };
    updateTrack((prev) => [...prev, newTile]);
    queueRef.current.push({ kind: 'step', tileId: newTile.id, type });
    processQueue();
  };

  const handlePaletteTap = (type) => {
    if (!canAdd()) return;
    playTileDropSound();
    appendTile(type);
  };

  const handleSpawnStart = (type) => {
    setGhostType(type);
    setPreviewSlot(null);
  };

  const handleGhostMove = ({ y }) => {
    const idx =
      isOnTrackY(y) && canAdd() ? Math.min(trackRef.current.length, TRACK_WINDOW - 1) : null;
    setPreviewSlot((prev) => (prev === idx ? prev : idx));
  };

  const handleGhostEnd = ({ y }, callback) => {
    if (isOnTrackY(y) && canAdd()) {
      callback({ snap: { x: nextSlotX(), y: TRACK_ROW_Y } });
      const type = ghostType;
      later(() => {
        setGhostType(null);
        appendTile(type);
      }, 120);
    } else {
      callback(null); // no snap → DraggableTile fades the ghost out
      setGhostType(null);
    }
    setPreviewSlot(null);
  };

  // --- Removing the last instruction (tap it, or drag it off the row) -----
  // Only allowed while 'ready', which keeps undo and execution strictly
  // serialized — a removed tile is always a fully-executed one. The undo
  // job is enqueued the moment the gesture COMMITS (not when the tile's
  // shrink animation ends) so a lightning-fast palette tap right after a
  // removal can never jump the queue ahead of the moonwalk.

  const commitUndo = () => {
    queueRef.current.push({ kind: 'undo' });
    processQueue();
  };

  const handleTrackTap = () => {
    // The tile shrinks itself and calls onRemoved when done; the undo
    // starts moonwalking immediately underneath it.
    commitUndo();
  };

  const handleDragEnd = (id, { y }, callback) => {
    if (isOnTrackY(y)) {
      callback({ snap: { x: lastSlotX() } });
    } else {
      callback({ remove: true });
      commitUndo();
      // track isn't mutated yet — handleTileRemoved does that once the
      // tile's own shrink/fade animation finishes.
    }
  };

  const handleTileRemoved = (id) => {
    updateTrack((prev) => prev.filter((t) => t.id !== id));
    setEjectingId((prev) => (prev === id ? null : prev));
  };

  const handleClear = () => {
    if (phaseRef.current !== 'ready' || trackRef.current.length === 0) return;
    updateTrack(() => []);
    historyRef.current = [];
    queueRef.current = [];
    setEaten([]);
    poseRef.current = { ...level.start, height: level.start.height ?? 0 };
    // Hold the runner while Lento pads back to the start tile, so a tap
    // during the walk-home queues instead of animating from mid-glide.
    busyRef.current = true;
    setPhaseBoth('walking');
    goToPose(level.start, 500);
    later(finishJob, 520);
  };

  // --- The runner ----------------------------------------------------------

  const processQueue = () => {
    if (busyRef.current) return;
    const job = queueRef.current.shift();
    if (!job) {
      setPhaseBoth('ready');
      setActiveIndex(null);
      return;
    }
    busyRef.current = true;
    if (job.kind === 'step') runStep(job);
    else runUndo();
  };

  const finishJob = () => {
    busyRef.current = false;
    processQueue();
  };

  const runStep = (job) => {
    const step = evaluateStep(level.board, poseRef.current, job.type);
    setActiveIndex(historyRef.current.length);

    if (step.result === 'ok') {
      setPhaseBoth('walking');
      animateStep(step);
      later(() => {
        // Munch any snack on the landing tile; the history entry records
        // it so a moonwalk can sprout it back.
        const snack = levelSnacks.find(
          (s) => s.x === step.to.x && s.y === step.to.y && !eatenRef.current.includes(s.id)
        );
        if (snack) {
          setEaten([...eatenRef.current, snack.id]);
          playChompSound();
          walkerRef.current?.react('munch');
        }
        historyRef.current.push({ pose: step.from, type: job.type, ateSnackId: snack?.id ?? null });
        poseRef.current = step.to;
        if (tileAt(level.board, step.to.x, step.to.y) === TILE_TYPES.GOAL) {
          celebrate();
          return;
        }
        setActiveIndex(null);
        finishJob();
      }, effectiveStepDuration);
      return;
    }

    // Failed step: failure theater, then the offending tile pops back out
    // on its own — the program in the track always stays a truthful record
    // of what Lento has done. Never sad, always comic.
    setPhaseBoth('theater');
    if (step.result === 'blocked') {
      runBonkTheater(step, job.tileId);
    } else {
      runTeeterTheater(step, job.tileId);
    }
  };

  // Gap/edge: lean out over the brink, windmill the long arms, pull back,
  // and a relieved "phew" with a cheek flash before the tile hops out.
  const runTeeterTheater = (step, tileId) => {
    const d = effectiveStepDuration;
    animateFailedStep(step, 0.35);
    playTeeterSound();
    later(() => walkerRef.current?.react('teeter'), Math.round(d * 0.25));
    later(() => walkerRef.current?.react('phew'), d + 100);
    later(() => beginEject(tileId), d + 700);
  };

  // Blocked (raised tile ahead): a soft bonk on impact, dizzy stars over
  // the head, then a sheepish head-rub. Dormant until raised-tile levels
  // ship, but fully wired.
  const runBonkTheater = (step, tileId) => {
    const d = effectiveStepDuration;
    animateFailedStep(step, 0.45);
    later(() => {
      playBonkSound();
      walkerRef.current?.react('bonk');
      const head = tileCenter(step.from.x, step.from.y);
      setDizzyAt({ x: head.x, y: head.y - 46, key: Date.now() });
    }, Math.round(d * 0.4));
    later(() => walkerRef.current?.react('headRub'), d + 200);
    later(() => setDizzyAt(null), d + 1300);
    later(() => beginEject(tileId), d + 900);
  };

  // The tile's own pop-out animation runs via isEjecting; onRemoved prunes
  // the track when it finishes. The runner only waits long enough for the
  // pop to read before moving on.
  const beginEject = (tileId) => {
    playOverflowSound();
    setEjectingId(tileId);
    later(() => {
      setActiveIndex(null);
      finishJob();
    }, 340);
  };

  const runUndo = () => {
    const last = historyRef.current.pop();
    if (!last) {
      finishJob();
      return;
    }
    setPhaseBoth('walking');
    const undoDuration = Math.round(effectiveStepDuration * 0.8);
    playMoonwalkSound();

    if (last.type === 'turnLeft' || last.type === 'turnRight') {
      rotationTarget.current += last.type === 'turnRight' ? -90 : 90;
      rotation.value = withTiming(rotationTarget.current, { duration: undoDuration });
    } else {
      const back = tileCenter(last.pose.x, last.pose.y);
      cx.value = withTiming(back.x, { duration: undoDuration });
      cy.value = withTiming(back.y, { duration: undoDuration });
      // A slight crouch on the slide back — reads as a careful reverse.
      squash.value = withSequence(
        withTiming(1.08, { duration: undoDuration * 0.3 }),
        withTiming(1, { duration: undoDuration * 0.7 })
      );
    }
    faceDirection(last.pose.facing);
    poseRef.current = last.pose;
    // Un-eat: the snack sprouts back on its tile (BoardSnack's mount
    // spring is the sprout).
    if (last.ateSnackId) {
      setEaten(eatenRef.current.filter((id) => id !== last.ateSnackId));
    }
    later(finishJob, undoDuration);
  };

  const celebrate = () => {
    queueRef.current = [];
    busyRef.current = false;
    setPhaseBoth('victory');
    setActiveIndex(null);
    // Tiles the child queued past the goal never execute — let them go.
    updateTrack((prev) => prev.slice(0, historyRef.current.length));
    setWalkerMood('celebrating');
    setConfettiVisible(true);
    playCelebrationSound();
    successHaptic();
    // Let the slow dance breathe before the card slides over it.
    later(() => setShowCard(true), 1400);
  };

  // --- Choreography ---------------------------------------------------------

  const goToPose = (pose, duration = effectiveStepDuration) => {
    const center = tileCenter(pose.x, pose.y);
    cx.value = withTiming(center.x, { duration });
    cy.value = withTiming(center.y, { duration });
    // Shortest-path back to the canonical facing angle — rotationTarget
    // accumulates ±90s, so the raw difference could spin the long way.
    const target = FACING_DEGREES[pose.facing];
    const delta = ((((target - rotationTarget.current) % 360) + 540) % 360) - 180;
    rotationTarget.current += delta;
    rotation.value = withTiming(rotationTarget.current, { duration });
    faceDirection(pose.facing);
  };

  const animateStep = (step) => {
    faceDirection(step.to.facing);

    if (step.type === 'turnLeft' || step.type === 'turnRight') {
      rotationTarget.current += step.type === 'turnRight' ? 90 : -90;
      rotation.value = withTiming(rotationTarget.current, { duration: effectiveStepDuration });
      return;
    }

    // A brief anticipation squash right as a movement step begins — a
    // quick coil-then-release, not a separate schedule of its own.
    squash.value = withSequence(
      withTiming(1.18, { duration: effectiveStepDuration * 0.15 }),
      withTiming(1, { duration: effectiveStepDuration * 0.35 })
    );
    playFootstepSound(historyRef.current.length);

    const center = tileCenter(step.to.x, step.to.y);
    cx.value = withTiming(center.x, { duration: effectiveStepDuration });
    cy.value = withTiming(center.y, { duration: effectiveStepDuration });
    if (step.type === 'hop') {
      lift.value = withSequence(
        withTiming(-16, { duration: effectiveStepDuration / 2 }),
        withTiming(0, { duration: effectiveStepDuration / 2 })
      );
    }
  };

  // Failed step: lean toward the attempted cell, then retreat — teetering
  // at a brink or bouncing off a block, depending on how far `reach` goes.
  // Never a punishment cue, just a physical reaction the reactions above
  // decorate.
  const animateFailedStep = (step, reach) => {
    squash.value = withSequence(
      withTiming(1.18, { duration: effectiveStepDuration * 0.15 }),
      withTiming(1, { duration: effectiveStepDuration * 0.35 })
    );
    const from = tileCenter(step.from.x, step.from.y);
    const attempted = tileCenter(step.attempted.x, step.attempted.y);
    const leanX = from.x + (attempted.x - from.x) * reach;
    const leanY = from.y + (attempted.y - from.y) * reach;
    cx.value = withSequence(
      withTiming(leanX, { duration: effectiveStepDuration * 0.4 }),
      withTiming(from.x, { duration: effectiveStepDuration * 0.6 })
    );
    cy.value = withSequence(
      withTiming(leanY, { duration: effectiveStepDuration * 0.4 }),
      withTiming(from.y, { duration: effectiveStepDuration * 0.6 })
    );
  };

  const highlightIndex = phase === 'walking' ? activeIndex : null;
  const pulseIndex = phase === 'theater' ? activeIndex : null;

  const trackAreaWidth = Math.max(trackPixelWidth(TRACK_WINDOW), palettePixelWidth());
  const trackAreaHeight = PALETTE_ROW_Y + TILE_SIZE / 2;

  // Tall boards on short phones: shrink the board VISUALLY (a transform on
  // boardWrap is safe — no gesture target lives inside it; tiles and
  // palette sit in the separate track area). The outer box reserves the
  // scaled height so flex layout stays honest.
  const { height: windowHeight } = useWindowDimensions();
  const boardSize = boardPixelSize(level.board);
  const boardFullHeight = boardSize.height + 66; // island margins + band + goal halo breathing room
  const availableForBoard = windowHeight - trackAreaHeight - 236; // chrome + controls + gaps
  const boardScale = Math.min(1, Math.max(0.6, availableForBoard / boardFullHeight));

  const paletteDisabled = phase === 'theater' || phase === 'victory';
  const trackDisabled = phase !== 'ready';

  return (
    <SafeAreaView style={styles.container}>
      <BackButton onPress={() => navigation.goBack()} />

      <View style={styles.levelIndicator}>
        <Text style={styles.levelText}>
          Level {level.id}/{getTotalLevels()}
        </Text>
      </View>

      <View style={styles.center}>
        <View
          style={{
            width: boardSize.width,
            height: boardFullHeight * boardScale,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
        <View style={[styles.boardWrap, { transform: [{ scale: boardScale }] }]}>
          <Board board={level.board} snacks={uneatenSnacks} />
          <FacingChevron cx={cx} cy={cy} rotation={rotation} opacity={chevronOpacity} />
          <SlothWalker
            ref={walkerRef}
            cx={cx}
            cy={cy}
            lift={lift}
            squash={squash}
            flip={flip}
            gazeTarget={gazeSV}
            mood={walkerMood}
          />
          {dizzyAt && <DizzyStars key={dizzyAt.key} x={dizzyAt.x} y={dizzyAt.y} />}
          <Confetti
            visible={confettiVisible}
            originX={goalCenter.x}
            originY={goalCenter.y}
            onComplete={() => setConfettiVisible(false)}
          />
        </View>
        </View>

        <View style={[styles.trackArea, { width: trackAreaWidth, height: trackAreaHeight }]}>
          <Track
            slotCenters={slotCenters}
            rowY={TRACK_ROW_Y}
            track={track}
            previewSlot={previewSlot}
            disabled={trackDisabled}
            highlightIndex={highlightIndex}
            pulseIndex={pulseIndex}
            ejectingId={ejectingId}
            onDragEnd={handleDragEnd}
            onRemoved={handleTileRemoved}
            onTap={handleTrackTap}
          />
          <Palette
            rowY={PALETTE_ROW_Y}
            disabled={paletteDisabled}
            ghostSV={ghostSV}
            onSpawnStart={handleSpawnStart}
            onGhostMove={handleGhostMove}
            onGhostEnd={handleGhostEnd}
            onTap={handlePaletteTap}
          />
          <GhostTile type={ghostType} ghostSV={ghostSV} />
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.broomButton, phase !== 'ready' && styles.buttonDisabled]}
            onPress={handleClear}
            disabled={phase !== 'ready'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BroomIcon size={26} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      {showCard && (
        <View style={styles.completeOverlay}>
          <View style={styles.completeCard}>
            <Text style={styles.completeText}>Goal reached!</Text>
            {eatenIds.length > 0 && (
              <View style={styles.snackRow}>
                {eatenIds.map((id) => {
                  const snack = levelSnacks.find((s) => s.id === id);
                  return snack ? <SnackGlyph key={id} kind={snack.kind} size={28} /> : null;
                })}
              </View>
            )}
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
  snackRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
});

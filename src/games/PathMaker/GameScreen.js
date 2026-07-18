import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS, SPACING, TYPE } from '../../constants/theme';
import { BroomIcon, ChevronRightIcon, UndoIcon } from '../../components/icons';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import PrimaryButton from '../../components/PrimaryButton';
import { evaluateStep } from './executeProgram';
import { findGoal, tileAt, TILE_TYPES } from './grid';
import Board, { boardPixelSize, tileCenter } from './Board';
import SlothWalker, { FACING_DEGREES } from './Character';
import FacingChevron from './FacingChevron';
import Palette from './Palette';
import HistoryTrail from './HistoryTrail';
import { getTotalLevels } from './levels';
import { CHIP_SIZE, TILE_SIZE } from './trackLayout';
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

// Controls-area vertical budget, used by the board-scale math: history
// trail + gap + palette row (buttons plus their extrude band).
const CONTROLS_HEIGHT = CHIP_SIZE + 6 + SPACING[3] + TILE_SIZE + 8;

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

// Lento's body shows his facing: the Companion rig's per-facing views
// (back of head for N, profile for E/W, face for S). The side art is
// drawn facing East, so West is the mirrored profile — note this flips
// the old convention where the symmetric FRONT art mirrored for E.
// A 90° turn always crosses adjacent views (front↔side↔back), so the
// turn choreography in faceDirection needs at most one view swap.
const VIEW_FOR_FACING = { N: 'back', S: 'front', E: 'side', W: 'side' };
const FLIP_FOR_FACING = { N: 1, S: 1, E: 1, W: -1 };

// Live-follow: there is no Play button. Every palette button the child
// taps makes Lento walk that step IMMEDIATELY (queued if he's
// mid-stride); the undo button makes him moonwalk the last step back.
// The history trail is a read-only record of where he's been, not a plan
// to submit — chips are never touch targets.
//
//   phase 'ready'    — Lento idle on his tile, chevron showing his facing;
//                      actions can be added (palette tap) and the last one
//                      undone (undo button).
//   phase 'walking'  — a step (or moonwalk) is animating; more actions can
//                      be added (they queue), nothing can be undone.
//   phase 'theater'  — a step failed; Lento performs the failure bit and
//                      the offending chip pops back out on its own.
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

  // Track state has a ref twin: button handlers and the runner need the
  // CURRENT program synchronously (two palette taps can land in one React
  // frame — closure state would go stale). Every mutation goes through
  // updateTrack so the two can't drift.
  const [track, setTrack] = useState([]); // [{id, type}]
  const trackRef = useRef([]);
  const updateTrack = (updater) => {
    trackRef.current = updater(trackRef.current);
    setTrack(trackRef.current);
  };

  const [activeIndex, setActiveIndex] = useState(null); // program index being executed / at fault
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [walkerMood, setWalkerMood] = useState('idle');
  const [ejectingId, setEjectingId] = useState(null); // chip popping out after failure theater
  const [removingId, setRemovingId] = useState(null); // chip shrinking away for an undo

  // Which body view Lento shows (see VIEW_FOR_FACING). Ref twin for the
  // same reason as track/phase: queued turn jobs run back-to-back and
  // faceDirection must read the CURRENT view synchronously.
  const [walkerView, setWalkerView] = useState(VIEW_FOR_FACING[level.start.facing]);
  const walkerViewRef = useRef(VIEW_FOR_FACING[level.start.facing]);
  const setWalkerViewBoth = (v) => {
    walkerViewRef.current = v;
    setWalkerView(v);
  };
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
  const flip = useSharedValue(FLIP_FOR_FACING[level.start.facing]);
  const chevronOpacity = useSharedValue(1);
  const gazeSV = {
    x: useSharedValue(FACING_VECTORS[level.start.facing].x),
    y: useSharedValue(FACING_VECTORS[level.start.facing].y),
    active: useSharedValue(1),
  };
  const walkerRef = useRef(null);

  // Shorten execution timings under reduced motion — never skip the
  // animation outright, per the design doc.
  const reducedMotion = useReducedMotion();
  const effectiveStepDuration = reducedMotion ? Math.round(STEP_DURATION * 0.45) : STEP_DURATION;

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  // Turn Lento's body to the new facing. The whole turn is a scaleX tween
  // through 0 — a calm "turn in place" — with the body VIEW swapped at the
  // invisible midpoint when the facing crosses into different art
  // (front↔side↔back). E↔W shares the side art, so a plain −1↔+1 tween
  // already passes through 0 and needs no swap. Pupils lead the way.
  //
  // Two explicit halves, NOT one withSequence: on web, a React commit that
  // re-renders the walker mid-animation kills an in-flight withSequence
  // (plain withTiming and withRepeat survive) — and the view swap itself
  // is such a commit. Parking at 0, swapping, then starting a fresh tween
  // on the next tick keeps the second half clear of the commit.
  const faceDirection = (facing, duration = 500) => {
    gazeSV.x.value = FACING_VECTORS[facing].x;
    gazeSV.y.value = FACING_VECTORS[facing].y;
    const targetView = VIEW_FOR_FACING[facing];
    const targetFlip = FLIP_FOR_FACING[facing];
    if (targetView === walkerViewRef.current) {
      flip.value = withTiming(targetFlip, { duration });
      return;
    }
    const half = Math.round(duration / 2);
    flip.value = withTiming(0, { duration: half });
    later(() => {
      setWalkerViewBoth(targetView);
      later(() => {
        flip.value = withTiming(targetFlip, { duration: half });
      }, 32);
    }, half);
  };

  // The chevron belongs to planning, not motion: visible while Lento
  // waits for the next tile, hidden while he walks/performs/celebrates.
  useEffect(() => {
    chevronOpacity.value = withTiming(phase === 'ready' ? 1 : 0, { duration: 250 });
  }, [phase]);

  // --- Adding instructions (tapping the palette) ---------------------------
  // Live-follow: every tap executes immediately (queued if Lento is
  // mid-stride). Adding stays enabled while he walks; only theater and
  // victory pause the palette.

  // The program is unbounded — the rolling history window means there's no
  // capacity to run out of, so the only gate is the phase.
  const canAdd = () => phaseRef.current === 'ready' || phaseRef.current === 'walking';

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

  // --- Undoing the last instruction (the undo button) ----------------------
  // Only allowed while 'ready', which keeps undo and execution strictly
  // serialized — an undone action is always a fully-executed one. The undo
  // job is enqueued the moment the button is pressed (not when the chip's
  // shrink animation ends) so a lightning-fast palette tap right after a
  // removal can never jump the queue ahead of the moonwalk.

  const commitUndo = () => {
    queueRef.current.push({ kind: 'undo' });
    processQueue();
  };

  const handleUndoPress = () => {
    if (phaseRef.current !== 'ready' || trackRef.current.length === 0) return;
    const last = trackRef.current[trackRef.current.length - 1];
    setRemovingId(last.id); // the chip shrinks while Lento moonwalks under it
    commitUndo();
    // Prune on the runner's own clock, not an animation-completion
    // callback (the file-wide sequencing rule): the chip's 150ms shrink
    // has read by then.
    later(() => removeChip(last.id), 200);
  };

  const removeChip = (id) => {
    updateTrack((prev) => prev.filter((t) => t.id !== id));
    setEjectingId((prev) => (prev === id ? null : prev));
    setRemovingId((prev) => (prev === id ? null : prev));
  };

  const handleClear = () => {
    if (phaseRef.current !== 'ready' || trackRef.current.length === 0) return;
    updateTrack(() => []);
    historyRef.current = [];
    queueRef.current = [];
    setEjectingId(null);
    setRemovingId(null);
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

  // The chip's pop-out animation runs via its `leaving` prop; the runner
  // prunes the track on its own clock (never an animation-completion
  // callback) and only waits long enough for the pop to read.
  const beginEject = (tileId) => {
    playOverflowSound();
    setEjectingId(tileId);
    later(() => {
      removeChip(tileId);
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
      // Chained timings, not withSequence (web kill-on-commit hazard).
      const crouch = Math.round(undoDuration * 0.3);
      squash.value = withTiming(1.08, { duration: crouch });
      later(() => {
        squash.value = withTiming(1, { duration: Math.round(undoDuration * 0.7) });
      }, crouch);
    }
    faceDirection(last.pose.facing, undoDuration);
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
    // Lento turns to face the child for his victory dance (cosmetic —
    // poseRef keeps the real facing; the level is over anyway).
    faceDirection('S', 500);
    // The mood flips only AFTER the turn-to-camera fully settles (turn
    // ends at ~530ms) — its re-render commit must not land mid-tween.
    later(() => setWalkerMood('celebrating'), 600);
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
    faceDirection(pose.facing, duration);
  };

  const animateStep = (step) => {
    if (step.type === 'turnLeft' || step.type === 'turnRight') {
      // The body turn resolves at ~70% of the step so the pose gets a beat
      // of settle before the next queued tile fires.
      faceDirection(step.to.facing, Math.round(effectiveStepDuration * 0.7));
      rotationTarget.current += step.type === 'turnRight' ? 90 : -90;
      rotation.value = withTiming(rotationTarget.current, { duration: effectiveStepDuration });
      return;
    }
    faceDirection(step.to.facing, 250); // forward: facing unchanged, keeps gaze honest

    // A brief anticipation squash right as a movement step begins. Two
    // chained timings instead of withSequence — the step-start setState
    // batch commits mid-coil and would kill a sequence on web (see
    // faceDirection); the release starts after that commit has landed.
    const coil = Math.round(effectiveStepDuration * 0.15);
    squash.value = withTiming(1.18, { duration: coil });
    later(() => {
      squash.value = withTiming(1, { duration: Math.round(effectiveStepDuration * 0.35) });
    }, coil);
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
    // Chained timings, not withSequence — same web kill-on-commit hazard
    // as animateStep, and the theater setStates land mid-lean.
    const coil = Math.round(effectiveStepDuration * 0.15);
    squash.value = withTiming(1.18, { duration: coil });
    later(() => {
      squash.value = withTiming(1, { duration: Math.round(effectiveStepDuration * 0.35) });
    }, coil);
    const from = tileCenter(step.from.x, step.from.y);
    const attempted = tileCenter(step.attempted.x, step.attempted.y);
    const leanX = from.x + (attempted.x - from.x) * reach;
    const leanY = from.y + (attempted.y - from.y) * reach;
    const lean = Math.round(effectiveStepDuration * 0.4);
    cx.value = withTiming(leanX, { duration: lean });
    cy.value = withTiming(leanY, { duration: lean });
    later(() => {
      cx.value = withTiming(from.x, { duration: Math.round(effectiveStepDuration * 0.6) });
      cy.value = withTiming(from.y, { duration: Math.round(effectiveStepDuration * 0.6) });
    }, lean);
  };

  const highlightIndex = phase === 'walking' ? activeIndex : null;
  const pulseIndex = phase === 'theater' ? activeIndex : null;

  // Tall boards on short phones: shrink the board VISUALLY (a transform on
  // boardWrap is safe — no gesture target lives inside it; the trail and
  // palette sit in the separate controls column). The outer box reserves
  // the scaled height so flex layout stays honest.
  const { height: windowHeight } = useWindowDimensions();
  const boardSize = boardPixelSize(level.board);
  const boardFullHeight = boardSize.height + 82; // island margins (20×2) + island band (34) + breathing room
  const availableForBoard = windowHeight - CONTROLS_HEIGHT - 236; // chrome + buttons + gaps
  const boardScale = Math.min(1, Math.max(0.6, availableForBoard / boardFullHeight));

  const paletteDisabled = phase === 'theater' || phase === 'victory';
  const undoDisabled = phase !== 'ready' || track.length === 0;

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
            view={walkerView}
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

        <View style={styles.controlsColumn}>
          <HistoryTrail
            track={track}
            highlightIndex={highlightIndex}
            pulseIndex={pulseIndex}
            ejectingId={ejectingId}
            removingId={removingId}
          />
          <Palette disabled={paletteDisabled} onTap={handlePaletteTap} />
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.roundButton, undoDisabled && styles.buttonDisabled]}
            onPress={handleUndoPress}
            disabled={undoDisabled}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <UndoIcon size={26} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roundButton, phase !== 'ready' && styles.buttonDisabled]}
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
  controlsColumn: {
    alignItems: 'center',
    gap: SPACING[3],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  roundButton: {
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

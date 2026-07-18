import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS, SPACING, TYPE } from '../../constants/theme';
import { ChevronRightIcon } from '../../components/icons';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import PrimaryButton from '../../components/PrimaryButton';
import { evaluateAction, applyAction, initialState } from './executeJourney';
import { startFacing } from './journey';
import { boardBounds, cellScreen } from './iso';
import IsoBoard from './IsoBoard';
import LionWalker, { VIEW_FOR_FACING, FLIP_FOR_FACING } from './Character';
import ActionBar, { ACTION_BAR_HEIGHT } from './ActionBar';
import { BuildsLayer, ToolGhost } from './Builds';
import { getTotalLevels } from './levels';
import { useReducedMotion } from '../../utils/motion';
import { successHaptic } from '../../utils/haptics';
import {
  playCelebrationSound,
  playCombineSound,
  playFootstepSound,
  playHmmSound,
  playMoonwalkSound,
  playSnapSound,
  playTeeterSound,
  playTileDropSound,
} from '../../utils/sound';

// Rumi walks with purpose — quicker than Lento's 900ms sloth stride, still
// calm enough for a 4-year-old to count cells as he goes.
const CELL_MS = 550;
const STAIR_STRETCH = 1.4; // a climb cell takes longer than a stride
const BUILD_MS = 750;
const THEATER_MS = 1400;

// Unit direction per facing for Rumi's gaze (zero anchor = pure direction).
const FACING_VECTORS = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

// Wayfinder's four-phase loop, simplified from PathMaker's live-follow:
// taps are GATED, not queued — a tap does nothing unless Rumi is ready.
// Walk-until-blocked makes every action a complete sentence, so there is
// nothing sensible to queue mid-walk and no undo (builds are always
// correct by definition; wrong tools never change state).
//
//   phase 'ready'    — Rumi idle at his cell; all four buttons live.
//   phase 'walking'  — a multi-cell walk is animating.
//   phase 'building' — a correct build is springing in.
//   phase 'theater'  — a wrong/no-op tool is performing its comic retract.
//   phase 'victory'  — goal reached: celebration, confetti, success card.
//
// All sequencing runs on later()/setTimeout, never animation-completion
// callbacks; and never withSequence across a React commit (web kill rule) —
// every multi-beat motion is chained plain withTimings.
export default function GameScreen({ level, navigation, onNext }) {
  const [phase, setPhase] = useState('ready');
  const phaseRef = useRef('ready');
  const setPhaseBoth = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Engine state ref (taps must read it synchronously) + a built-list state
  // twin so IsoBoard/BuildsLayer re-render when something is built.
  const stateRef = useRef(initialState());
  const [builtList, setBuiltList] = useState([]);

  const [walkerMood, setWalkerMood] = useState('idle');
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [ghost, setGhost] = useState(null); // {tool, x, y, mode, key}

  const initialFacing = startFacing(level);
  const facingRef = useRef(initialFacing);
  const [walkerView, setWalkerView] = useState(VIEW_FOR_FACING[initialFacing]);
  const walkerViewRef = useRef(VIEW_FOR_FACING[initialFacing]);
  const setWalkerViewBoth = (v) => {
    walkerViewRef.current = v;
    setWalkerView(v);
  };

  const bounds = boardBounds(level);
  const startPos = cellScreen(bounds, level.path[0]);
  const goalPos = cellScreen(bounds, level.path[level.path.length - 1]);

  const cx = useSharedValue(startPos.x);
  const cy = useSharedValue(startPos.y);
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  const flip = useSharedValue(FLIP_FOR_FACING[initialFacing]);
  const walkerOpacity = useSharedValue(1);
  const gazeSV = {
    x: useSharedValue(FACING_VECTORS[initialFacing].x),
    y: useSharedValue(FACING_VECTORS[initialFacing].y),
    active: useSharedValue(1),
  };
  const walkerRef = useRef(null);
  const stepCountRef = useRef(0); // rising footstep pitch across the level

  const reducedMotion = useReducedMotion();
  const cellMs = reducedMotion ? Math.round(CELL_MS * 0.45) : CELL_MS;

  const timersRef = useRef([]);
  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  // Turn Rumi's body: scaleX through 0 with the view swapped at the
  // invisible midpoint. Two explicit halves, NOT withSequence — the swap
  // itself is a React commit, which kills an in-flight sequence on web.
  const faceDirection = (facing, duration = 320) => {
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

  // --- Action dispatch ------------------------------------------------------

  const handleAction = (type) => {
    if (phaseRef.current !== 'ready') return;
    const evaluation = evaluateAction(level, stateRef.current, type);
    if (evaluation.kind === 'walk') runWalk(evaluation);
    else if (evaluation.kind === 'build') runBuild(evaluation);
    else if (evaluation.kind === 'mismatch') runMismatch(evaluation);
    else runNoop(evaluation, type);
  };

  // --- Walking: the whole clear stretch in one tap --------------------------
  // Per-cell choreography scheduled up-front on later(): stride tweens,
  // footsteps, auto-turns at corner boundaries, a longer climb beat over
  // built stairs, and the doorway fade through built tunnels.
  const runWalk = (evaluation) => {
    setPhaseBoth('walking');

    // A brief anticipation coil as the walk begins (chained timings).
    squash.value = withTiming(1.14, { duration: 90 });
    later(() => {
      squash.value = withTiming(1, { duration: 200 });
    }, 90);

    let t = 120; // let the coil read before the first stride
    let prevFacing = facingRef.current;
    let prevZ = level.path[stateRef.current.index].z;
    let prevInWall = false;

    for (const cell of evaluation.cells) {
      const stair = cell.z !== prevZ;
      const climbingUp = cell.z > prevZ;
      const dur = Math.round(cellMs * (stair ? STAIR_STRETCH : 1));
      const turnTo = cell.facing !== prevFacing ? cell.facing : null;
      const enterWall = cell.throughWall != null && !prevInWall;
      const exitWall = cell.throughWall == null && prevInWall;
      const inWall = cell.throughWall != null;
      const target = cellScreen(bounds, cell);

      later(() => {
        if (turnTo) faceDirection(turnTo, Math.min(300, dur));
        if (enterWall) walkerOpacity.value = withTiming(0, { duration: 200 });
        if (exitWall) walkerOpacity.value = withTiming(1, { duration: 240 });
        if (inWall && !enterWall) playMoonwalkSound();
        else playFootstepSound(stepCountRef.current++);

        cx.value = withTiming(target.x, { duration: dur });
        cy.value = withTiming(target.y, { duration: dur });

        // Stride lift: a small hop per cell; a taller slower arc on a
        // climb cell. Chained timings, never withSequence.
        const up = stair ? (climbingUp ? -16 : -10) : -5;
        const rise = Math.round(dur * 0.42);
        lift.value = withTiming(up, { duration: rise });
        later(() => {
          lift.value = withTiming(0, { duration: dur - rise });
        }, rise);
      }, t);

      t += dur;
      prevFacing = cell.facing;
      prevZ = cell.z;
      prevInWall = inWall;
    }

    later(() => {
      stateRef.current = applyAction(stateRef.current, evaluation);
      facingRef.current = prevFacing;
      if (evaluation.reachedGoal) {
        celebrate();
        return;
      }
      // Stopped at an obstacle: a neutral beat — Rumi just looks at it
      // (gaze already points down-path) and waits for the right tool.
      setPhaseBoth('ready');
    }, t + 60);
  };

  // --- Building: the correct tool ------------------------------------------
  const runBuild = (evaluation) => {
    setPhaseBoth('building');
    const kind = evaluation.obstacle.kind;
    if (kind === 'gap') playSnapSound();
    else if (kind === 'rise') playTileDropSound();
    else playCombineSound();

    stateRef.current = applyAction(stateRef.current, evaluation);
    setBuiltList([...stateRef.current.built]); // mounts the piece → build-in animation
    later(() => walkerRef.current?.react('nod'), 250);
    later(() => setPhaseBoth('ready'), BUILD_MS);
  };

  // --- Wrong tool: comic theater, nothing changes ---------------------------
  const runMismatch = (evaluation) => {
    setPhaseBoth('theater');
    const seamA = cellScreen(bounds, level.path[evaluation.obstacle.enter - 1]);
    const seamB = cellScreen(bounds, level.path[evaluation.obstacle.enter]);
    setGhost({
      tool: evaluation.tool,
      x: (seamA.x + seamB.x) / 2,
      y: (seamA.y + seamB.y) / 2 - 34,
      mode: 'mismatch',
      key: Date.now(),
    });
    if (evaluation.tool === 'bridge') playTeeterSound();
    else playHmmSound();

    later(() => {
      walkerRef.current?.react(evaluation.tool === 'tunnel' ? 'shrug' : 'ohno');
    }, 350);
    later(() => {
      setGhost(null);
      setPhaseBoth('ready');
    }, THEATER_MS);
  };

  // --- No-ops: the gentlest beats ------------------------------------------
  const runNoop = (evaluation, type) => {
    if (evaluation.reason === 'at-goal') return; // victory owns the screen

    if (evaluation.reason === 'blocked') {
      // Move with an unbuilt obstacle ahead: lean at it, come back, hmm.
      setPhaseBoth('theater');
      playHmmSound();
      const from = cellScreen(bounds, level.path[stateRef.current.index]);
      const ahead = cellScreen(bounds, level.path[stateRef.current.index + 1]);
      cx.value = withTiming(from.x + (ahead.x - from.x) * 0.28, { duration: 220 });
      cy.value = withTiming(from.y + (ahead.y - from.y) * 0.28, { duration: 220 });
      later(() => {
        cx.value = withTiming(from.x, { duration: 260 });
        cy.value = withTiming(from.y, { duration: 260 });
        walkerRef.current?.react('ohno');
      }, 240);
      later(() => setPhaseBoth('ready'), 900);
      return;
    }

    // A build tool with no obstacle ahead: the ghost looks around, finds
    // nothing to do, and retracts.
    setPhaseBoth('theater');
    playHmmSound();
    const here = cellScreen(bounds, level.path[stateRef.current.index]);
    setGhost({ tool: type, x: here.x, y: here.y - 58, mode: 'nothing', key: Date.now() });
    later(() => walkerRef.current?.react('shrug'), 400);
    later(() => {
      setGhost(null);
      setPhaseBoth('ready');
    }, 1200);
  };

  // --- Victory --------------------------------------------------------------
  const celebrate = () => {
    setPhaseBoth('victory');
    // Rumi turns to face the child for the dance (PathMaker precedent);
    // the mood flips only after the turn's re-render window has passed.
    faceDirection('S', 500);
    later(() => setWalkerMood('celebrating'), 600);
    setConfettiVisible(true);
    playCelebrationSound();
    successHaptic();
    later(() => setShowCard(true), 1400);
  };

  // --- Layout ---------------------------------------------------------------
  // Iso boards are wide as well as tall, so the visual scale honors both
  // axes (PathMaker's transform-scale trick — safe, the board has no touch
  // targets at all).
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const availableH = windowHeight - ACTION_BAR_HEIGHT - 236;
  const availableW = windowWidth - 24;
  const boardScale = Math.min(
    1,
    Math.max(0.5, Math.min(availableH / bounds.height, availableW / bounds.width))
  );

  const barDisabled = phase !== 'ready';

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
            width: bounds.width * boardScale,
            height: bounds.height * boardScale,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={[styles.boardWrap, { width: bounds.width, height: bounds.height, transform: [{ scale: boardScale }] }]}>
            <IsoBoard level={level} built={builtList} />
            <BuildsLayer level={level} bounds={bounds} built={builtList} />
            <LionWalker
              ref={walkerRef}
              cx={cx}
              cy={cy}
              lift={lift}
              squash={squash}
              flip={flip}
              opacity={walkerOpacity}
              view={walkerView}
              gazeTarget={gazeSV}
              mood={walkerMood}
            />
            {ghost && <ToolGhost key={ghost.key} tool={ghost.tool} x={ghost.x} y={ghost.y} mode={ghost.mode} />}
            <Confetti
              visible={confettiVisible}
              originX={goalPos.x}
              originY={goalPos.y}
              onComplete={() => setConfettiVisible(false)}
            />
          </View>
        </View>

        <ActionBar disabled={barDisabled} onTap={handleAction} />
      </View>

      {showCard && (
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

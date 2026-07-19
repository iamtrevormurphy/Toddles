import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import { COLORS, RADII, SHADOWS, WAYFINDER_COLORS } from '../../constants/theme';
import { OBSTACLE_KINDS } from './journey';
import { Z_STEP, ISO_W, ISO_H, cellScreen, isoArchPath } from './iso';
import { faceSkewTransform, wallMouthGeometry } from './IsoBoard';
import ActionIcon from './ActionIcon';

const HW = ISO_W / 2;
const HH = ISO_H / 2;

// Built pieces, one absolutely-positioned overlay per obstacle at zIndex 5:
// above the board Svg, below Rumi (who is zIndex 10). Every piece here is
// drawn as architecture that JOINS the existing geometry — a bridge rests
// on both banks, a stair flight rises tread-by-tread from the lower deck
// and lands flush on the upper one, a tunnel's arch grows in the wall's own
// face plane — rather than as a shape hovering at the obstacle's cell.
//
// Each piece mounts when its obstacle is built, so its mount animation IS
// the build-in. Sequencing inside uses plain withTiming/withSpring chained
// on setTimeout — never withSequence across a commit (the web-kill rule).
export function BuildsLayer({ level, bounds, built }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none">
      {[...built].map((obIndex) => {
        const ob = level.obstacles[obIndex];
        if (ob.kind === OBSTACLE_KINDS.GAP) {
          return <BridgeDeck key={obIndex} level={level} bounds={bounds} ob={ob} />;
        }
        if (ob.kind === OBSTACLE_KINDS.RISE) {
          return <StairFlight key={obIndex} level={level} bounds={bounds} ob={ob} />;
        }
        return <TunnelPop key={obIndex} level={level} bounds={bounds} ob={ob} />;
      })}
    </View>
  );
}

// --- Shared dimetric strip math -------------------------------------------
// Screen vector for one grid step (dx, dy): grid +x runs screen down-right,
// grid +y down-left. For any straight run, `u` (along travel) and `p`
// (perpendicular, always pointing down-screen: p.y > 0) span a local frame;
// pt() maps (t in grid steps, w in tiles, zPx up) to screen space.
function screenDir(dx, dy) {
  return { x: (dx - dy) * HW, y: (dx + dy) * HH };
}

function makeFrame(origin, dx, dy) {
  const u = screenDir(dx, dy);
  const p = screenDir(Math.abs(dy), Math.abs(dx));
  return {
    u,
    p,
    pt: (t, w, zPx = 0) => ({
      x: origin.x + u.x * t + p.x * w,
      y: origin.y + u.y * t + p.y * w - zPx,
    }),
  };
}

function quad(a, b, c, d) {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${d.x} ${d.y} Z`;
}

// --- Bridge ----------------------------------------------------------------
// One continuous timber deck from bank to bank: its ends lie ON the two
// platform tops (overlapping their stone), plank joints run across it so
// the span stays countable, and a side skirt gives it slab thickness.
function BridgeDeck({ level, bounds, ob }) {
  const A = level.path[ob.enter - 1];
  const B = level.path[ob.enter + ob.span];
  const steps = ob.span + 1;
  const frame = makeFrame(
    cellScreen(bounds, A),
    (B.x - A.x) / steps,
    (B.y - A.y) / steps
  );
  const { u, pt } = frame;
  const t0 = 0.28; // starts well inside bank A's top face…
  const t1 = steps - 0.28; // …and ends inside bank B's — resting on both
  const wHalf = 0.34;
  const depth = 10;
  // Which side faces are lit follows the board's convention: the +w edge is
  // the SW face on east/west runs, the SE face on north/south runs.
  const alongX = B.x !== A.x;
  const sideFill = alongX ? WAYFINDER_COLORS.bridgeSW : WAYFINDER_COLORS.bridgeSE;
  const endFill = alongX ? WAYFINDER_COLORS.bridgeSE : WAYFINDER_COLORS.bridgeSW;
  const endT = u.y > 0 ? t1 : t0; // the down-screen end shows its cut face

  const joints = [];
  const jointCount = steps * 2;
  for (let k = 1; k < jointCount; k++) {
    const tj = t0 + ((t1 - t0) * k) / jointCount;
    joints.push([pt(tj, -wHalf), pt(tj, wHalf)]);
  }

  // Drop-and-settle as two chained timings, not a spring: the phase→ready
  // commit at ~750ms kills in-flight springs on web (see TunnelPop).
  const drop = useSharedValue(-44);
  const fade = useSharedValue(0);
  useEffect(() => {
    drop.value = withTiming(3, { duration: 200 });
    fade.value = withTiming(1, { duration: 140 });
    const settle = setTimeout(() => {
      drop.value = withTiming(0, { duration: 150 });
    }, 210);
    return () => {
      clearTimeout(settle);
      cancelAnimation(drop);
      cancelAnimation(fade);
    };
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
    opacity: fade.value,
  }));

  const down = { x: 0, y: depth };
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={bounds.width} height={bounds.height} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
        {/* side skirt along the down-screen edge */}
        <Path
          d={quad(pt(t0, wHalf), pt(t1, wHalf), add(pt(t1, wHalf), down), add(pt(t0, wHalf), down))}
          fill={sideFill}
        />
        {/* cut face at the down-screen end */}
        <Path
          d={quad(
            pt(endT, -wHalf),
            pt(endT, wHalf),
            add(pt(endT, wHalf), down),
            add(pt(endT, -wHalf), down)
          )}
          fill={endFill}
        />
        {/* the deck itself */}
        <Path
          d={quad(pt(t0, -wHalf), pt(t0, wHalf), pt(t1, wHalf), pt(t1, -wHalf))}
          fill={WAYFINDER_COLORS.bridge}
        />
        {joints.map(([a, b], i) => (
          <Line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={WAYFINDER_COLORS.bridgeSE}
            strokeWidth={1.4}
            strokeOpacity={0.8}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

// --- Stairs ----------------------------------------------------------------
// A real flight: three full-width treads climbing the seam, each with a
// riser, starting on the lower deck and landing flush with the upper one.
// Drawn low-to-high or high-to-low so nearer treads paint over farther
// ones, exactly like the board's column sort.
function StairFlight({ level, bounds, ob }) {
  const before = level.path[ob.enter - 1];
  const after = level.path[ob.enter];
  const L = before.z <= after.z ? before : after;
  const H = before.z <= after.z ? after : before;
  const frame = makeFrame(cellScreen(bounds, L), H.x - L.x, H.y - L.y);
  const { u, pt } = frame;
  const alongX = H.x !== L.x;

  const t0 = 0.25;
  const dt = 0.23; // deep chunky treads — Monument Valley stairs, not a ramp
  const wHalf = 0.42;
  const stepRise = Z_STEP / 3; // three treads: 10 / 20 / 30 — the top one
  //                              lands exactly at the upper deck's level

  const sideFill = alongX ? WAYFINDER_COLORS.stairsSW : WAYFINDER_COLORS.stairsSE;
  const riserFill = alongX ? WAYFINDER_COLORS.stairsSE : WAYFINDER_COLORS.stairsSW;
  // Which travel-side face of each tread the viewer sees: climbing away
  // up-screen (u.y < 0) shows the downhill risers at tA; climbing toward
  // the viewer shows the face under each tread's near edge at tB. Either
  // way it's one vertical face per tread — that repetition is what makes
  // the flight read as steps from every camera-relative direction.
  const climbsAway = u.y < 0;
  const order = climbsAway ? [2, 1, 0] : [0, 1, 2];

  // Chained timings for the same web spring-kill reason as BridgeDeck.
  const drop = useSharedValue(-30);
  const fade = useSharedValue(0);
  useEffect(() => {
    drop.value = withTiming(2, { duration: 190 });
    fade.value = withTiming(1, { duration: 160 });
    const settle = setTimeout(() => {
      drop.value = withTiming(0, { duration: 140 });
    }, 200);
    return () => {
      clearTimeout(settle);
      cancelAnimation(drop);
      cancelAnimation(fade);
    };
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
    opacity: fade.value,
  }));

  // The load-bearing readability cue: the flight's down-screen side is ONE
  // solid wall whose top edge is the classic stepped staircase profile
  // (same silhouette as the Stairs button icon). It grounds the flight on
  // the lower deck and reads as stairs from every travel direction — the
  // per-tread faces alone go mushy at ~8px per step.
  const base = -3; // wall foot laps just below the lower deck's surface
  const profile = [];
  profile.push(pt(t0, wHalf, base));
  for (let k = 0; k < 3; k++) {
    const tA = t0 + k * dt;
    const zTop = (k + 1) * stepRise;
    profile.push(pt(tA, wHalf, zTop)); // riser: straight up…
    profile.push(pt(tA + dt, wHalf, zTop)); // …then the tread run
  }
  profile.push(pt(t0 + 3 * dt, wHalf, base));
  const wallPath = `M ${profile.map((p2) => `${p2.x} ${p2.y}`).join(' L ')} Z`;

  const treads = order.map((k) => {
    const tA = t0 + k * dt;
    const tB = tA + dt;
    const zTop = (k + 1) * stepRise;
    const faceT = climbsAway ? tA : tB; // the tread's viewer-side edge
    const faceDepth = stepRise + 3; // laps the tread below → stacked stone
    return (
      <React.Fragment key={k}>
        <Path
          d={quad(
            pt(faceT, -wHalf, zTop),
            pt(faceT, wHalf, zTop),
            pt(faceT, wHalf, zTop - faceDepth),
            pt(faceT, -wHalf, zTop - faceDepth)
          )}
          fill={riserFill}
        />
        <Path
          d={quad(pt(tA, -wHalf, zTop), pt(tA, wHalf, zTop), pt(tB, wHalf, zTop), pt(tB, -wHalf, zTop))}
          fill={WAYFINDER_COLORS.stairs}
          stroke={WAYFINDER_COLORS.stairsSE}
          strokeWidth={1.2}
          strokeOpacity={0.75}
        />
      </React.Fragment>
    );
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={bounds.width} height={bounds.height} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
        <Path d={wallPath} fill={sideFill} />
        {treads}
      </Svg>
    </Animated.View>
  );
}

// --- Tunnel ----------------------------------------------------------------
// The carved-arch reveal: the trim ring and dark mouth grow up out of the
// walking surface IN the wall's face plane (same geometry the board paints
// once built — wallMouthGeometry keeps the two identical).
function TunnelPop({ level, bounds, ob }) {
  const m = wallMouthGeometry(level, bounds, ob);

  // Plain timings, chained on setTimeout: GameScreen's phase→ready commit
  // lands at ~750ms, and on web a commit kills an in-flight withSpring the
  // same way it kills withSequence (observed here: the arch froze at
  // scaleY 0.63) — withTiming survives, and both halves finish before the
  // commit anyway.
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(1.05, { duration: 220 });
    const settle = setTimeout(() => {
      grow.value = withTiming(1, { duration: 140 });
    }, 230);
    return () => {
      clearTimeout(settle);
      cancelAnimation(grow);
    };
  }, []);
  // Transform-origin at the arch sill via translate sandwich.
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: m.baseY },
      { scaleY: grow.value },
      { translateY: -m.baseY },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={bounds.width} height={bounds.height} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
        <Path
          d={isoArchPath(m.cx, m.baseY, m.w + 9, m.h + 5)}
          fill={WAYFINDER_COLORS.tunnelTrim}
          transform={faceSkewTransform(m.cx, m.skew)}
        />
        <Path
          d={isoArchPath(m.cx, m.baseY, m.w, m.h)}
          fill={WAYFINDER_COLORS.doorway}
          transform={faceSkewTransform(m.cx, m.skew)}
        />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Wrong-tool theater: a ghost of the tapped tool appears near Rumi, tries
// to fit, comically fails, and retracts. Pure decoration — no state changes,
// the child just tries another button. All keyframes are plain withTimings
// chained on setTimeout.
// ---------------------------------------------------------------------------

export function ToolGhost({ tool, x, y, mode = 'mismatch' }) {
  const scale = useSharedValue(0);
  const scaleY = useSharedValue(1);
  const rot = useSharedValue(0);
  const shiftX = useSharedValue(0);
  const sink = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    scale.value = withSpring(1, { damping: 15, stiffness: 260 });

    if (mode === 'nothing') {
      // Looks around, finds nothing to build, retracts.
      at(260, () => (shiftX.value = withTiming(-5, { duration: 140 })));
      at(420, () => (shiftX.value = withTiming(5, { duration: 160 })));
      at(600, () => (shiftX.value = withTiming(0, { duration: 140 })));
      at(800, () => {
        fade.value = withTiming(0, { duration: 240 });
        scale.value = withTiming(0.6, { duration: 240 });
      });
    } else if (tool === 'bridge') {
      // Tips up against the obstacle, slides back.
      at(240, () => (rot.value = withTiming(14, { duration: 180 })));
      at(560, () => (rot.value = withTiming(-4, { duration: 160 })));
      at(740, () => (rot.value = withTiming(0, { duration: 120 })));
      at(900, () => {
        fade.value = withTiming(0, { duration: 260 });
        sink.value = withTiming(8, { duration: 260 });
      });
    } else if (tool === 'stairs') {
      // Wobbles, then sinks — no ground to stand on.
      at(240, () => (rot.value = withTiming(-8, { duration: 130 })));
      at(390, () => (rot.value = withTiming(8, { duration: 150 })));
      at(560, () => (rot.value = withTiming(0, { duration: 130 })));
      at(700, () => {
        sink.value = withTiming(14, { duration: 300 });
        fade.value = withTiming(0, { duration: 320 });
      });
    } else {
      // Tunnel: finds nothing thick enough and deflates.
      at(320, () => (scaleY.value = withTiming(0.55, { duration: 200 })));
      at(560, () => (scaleY.value = withTiming(0.7, { duration: 120 })));
      at(700, () => {
        scaleY.value = withTiming(0.12, { duration: 260 });
        fade.value = withTiming(0, { duration: 300 });
      });
    }

    return () => {
      timers.forEach(clearTimeout);
      [scale, scaleY, rot, shiftX, sink, fade].forEach(cancelAnimation);
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: shiftX.value },
      { translateY: sink.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
      { scaleY: scaleY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.ghost, { left: x - 24, top: y - 24 }, style]} pointerEvents="none">
      <ActionIcon type={tool} size={32} color={COLORS.textDark} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 5,
  },
  ghost: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...SHADOWS.card,
  },
});

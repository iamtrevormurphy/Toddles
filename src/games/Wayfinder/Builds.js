import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { COLORS, MONUMENT_COLORS, RADII, SHADOWS, WAYFINDER_COLORS } from '../../constants/theme';
import { OBSTACLE_KINDS, obstacleSpan } from './journey';
import { SLAB, Z_STEP, ISO_W, ISO_H, cellScreen, diamondPath, isoArchPath, sePath, swPath } from './iso';
import ActionIcon from './ActionIcon';

const HW = ISO_W / 2;
const HH = ISO_H / 2;

// Built pieces, one absolutely-positioned overlay per obstacle at zIndex 5:
// above the board Svg, below Rumi (who is zIndex 10) — safe because the
// validator's occlusion rule keeps anything tall away from his box, and
// built pieces all live AT deck level under his feet.
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

// Timber deck spanning the gap cells — drops in from above with one spring.
function BridgeDeck({ level, bounds, ob }) {
  const drop = useSharedValue(-44);
  const fade = useSharedValue(0);
  useEffect(() => {
    drop.value = withSpring(0, { damping: 18, stiffness: 190 });
    fade.value = withTiming(1, { duration: 140 });
    return () => {
      cancelAnimation(drop);
      cancelAnimation(fade);
    };
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
    opacity: fade.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={bounds.width} height={bounds.height} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
        {obstacleSpan(ob).map((i) => {
          const p = cellScreen(bounds, level.path[i]);
          return (
            <React.Fragment key={i}>
              <Path d={swPath(p.x, p.y, SLAB * 0.75)} fill={WAYFINDER_COLORS.bridgeSW} />
              <Path d={sePath(p.x, p.y, SLAB * 0.75)} fill={WAYFINDER_COLORS.bridgeSE} />
              <Path
                d={diamondPath(p.x, p.y)}
                fill={WAYFINDER_COLORS.bridge}
                stroke={WAYFINDER_COLORS.bridgeSE}
                strokeWidth={1.4}
                strokeOpacity={0.7}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </Animated.View>
  );
}

// Three treads interpolating the rise seam, cascading in bottom-to-top.
function StairFlight({ level, bounds, ob }) {
  const low = level.path[ob.enter - 1];
  const high = level.path[ob.enter];
  const a = cellScreen(bounds, low);
  const b = cellScreen(bounds, high);
  // Treads climb from the lower cell toward the higher one regardless of
  // travel direction — stairs look the same walked up or down.
  const [from, to] = low.z <= high.z ? [a, b] : [b, a];

  return (
    <>
      {[0.3, 0.5, 0.7].map((t, k) => (
        <Tread
          key={k}
          delay={k * 90}
          x={from.x + (to.x - from.x) * t}
          y={from.y + (to.y - from.y) * t}
          scale={0.42}
        />
      ))}
    </>
  );
}

function Tread({ x, y, scale, delay }) {
  const pop = useSharedValue(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      pop.value = withSpring(1, { damping: 17, stiffness: 210 });
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimation(pop);
    };
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.6 + pop.value * 0.4 }],
  }));
  const hw = HW * scale;
  const hh = HH * scale;
  const depth = 9;
  return (
    <Animated.View style={[styles.tread, { left: x - hw, top: y - hh - depth }, style]}>
      <Svg width={hw * 2} height={hh * 2 + depth * 2} viewBox={`${-hw} ${-hh - depth} ${hw * 2} ${hh * 2 + depth * 2}`}>
        <Path d={swPath(0, 0, depth)} fill={MONUMENT_COLORS.stairsShade} />
        <Path d={sePath(0, 0, depth)} fill={MONUMENT_COLORS.stairsShade} />
        <Path d={diamondPath(0, 0)} fill={MONUMENT_COLORS.stairs} />
      </Svg>
    </Animated.View>
  );
}

// The carved-arch reveal: a doorway-colored arch grows up from the wall
// base at the entry cell, then the identical static mouth painted by
// IsoBoard (same built state) simply remains beneath it.
function TunnelPop({ level, bounds, ob }) {
  const span = obstacleSpan(ob);
  const cell = level.path[span[0]];
  const prev = level.path[ob.enter - 1];
  const axis = cell.x !== prev.x ? 'x' : 'y';
  const p = cellScreen(bounds, cell);
  const mouthX = axis === 'x' ? p.x + HW / 2 : p.x - HW / 2;
  const mouthBottom = p.y + HH;
  const h = Math.min(ob.height * Z_STEP - 6, 44);

  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withSpring(1, { damping: 19, stiffness: 170 });
    return () => cancelAnimation(grow);
  }, []);
  // Transform-origin at the arch base via translate sandwich.
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: mouthBottom },
      { scaleY: grow.value },
      { translateY: -mouthBottom },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={bounds.width} height={bounds.height} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
        <Path d={isoArchPath(mouthX, mouthBottom, HW * 0.62, h)} fill={WAYFINDER_COLORS.doorway} />
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
  tread: {
    position: 'absolute',
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

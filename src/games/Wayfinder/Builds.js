import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { COLORS, RADII, SHADOWS } from '../../constants/theme';
import { OBSTACLE_KINDS } from './journey';
import { BridgeShape, StairShape, TunnelMouthShape, wallMouthGeometry } from './buildShapes';
import ActionIcon from './ActionIcon';

// The transient build-in layer. Once a build SETTLES, IsoBoard paints it
// statically inside its painter's-sort (correct line of sight — nearer
// board geometry occludes it); this overlay exists only for the moment a
// fresh build springs in, while Rumi stands still and the action bar is
// gated, so its brief stint above the board can't contradict depth.
//
// All sequencing is plain withTiming chained on setTimeout — a React
// commit kills an in-flight withSpring/withSequence on web (observed: the
// tunnel arch froze at scaleY 0.63 when the phase→ready commit landed).
export function BuildsLayer({ level, bounds, fresh }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none">
      {(fresh ?? []).map((obIndex) => {
        const ob = level.obstacles[obIndex];
        if (ob.kind === OBSTACLE_KINDS.GAP) {
          return <BridgeDrop key={obIndex} level={level} bounds={bounds} ob={ob} />;
        }
        if (ob.kind === OBSTACLE_KINDS.RISE) {
          return <StairDrop key={obIndex} level={level} bounds={bounds} ob={ob} />;
        }
        return <TunnelGrow key={obIndex} level={level} bounds={bounds} ob={ob} />;
      })}
    </View>
  );
}

// Shared drop-and-settle: fall in from above, one gentle overshoot, rest at
// exactly the static paint's position so the settle handoff is seamless.
function useDropIn(from) {
  const drop = useSharedValue(from);
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
  return useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
    opacity: fade.value,
  }));
}

function BridgeDrop({ level, bounds, ob }) {
  const style = useDropIn(-44);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={bounds.width} height={bounds.height} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
        <BridgeShape level={level} bounds={bounds} ob={ob} />
      </Svg>
    </Animated.View>
  );
}

function StairDrop({ level, bounds, ob }) {
  const style = useDropIn(-30);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={bounds.width} height={bounds.height} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
        <StairShape level={level} bounds={bounds} ob={ob} />
      </Svg>
    </Animated.View>
  );
}

// The carved-arch reveal: trim ring and dark mouth grow up out of the
// walking surface in the wall's face plane. The static mouth (IsoBoard
// paints it from the same wallMouthGeometry) sits beneath, so the finished
// overlay is pixel-identical to what remains after it unmounts.
function TunnelGrow({ level, bounds, ob }) {
  const m = wallMouthGeometry(level, bounds, ob);
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
        <TunnelMouthShape mouth={m} />
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

    // The ghost unmounts before any phase commit lands, so its pop-in
    // spring is safe from the web spring-kill.
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

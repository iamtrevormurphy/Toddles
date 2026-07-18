import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { MONUMENT_COLORS } from '../../constants/theme';
import { useReducedMotion } from '../../utils/motion';

// Renders a puzzle's monument plan (monuments.js) over the board: each
// settled piece's ornament springs up a beat after the piece lands, and
// windows/doorways light up honey on completion. Pure decoration — the
// whole layer ignores pointer events and never touches game state.

const GROW_DELAY_MS = 160;

export default function MonumentLayer({ plan, frame, size, settledSlotIds, complete }) {
  const reducedMotion = useReducedMotion();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: size, height: size }]}>
      {plan.ornaments.map((orn, slotId) => {
        if (!orn || !settledSlotIds.includes(slotId)) return null;
        return (
          <OrnamentSprite
            key={`orn-${slotId}`}
            orn={orn}
            frame={frame}
            complete={complete}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </View>
  );
}

function OrnamentSprite({ orn, frame, complete, reducedMotion }) {
  const W = orn.w * frame.scale;
  const H = orn.h * frame.scale;
  const left = (orn.x - frame.originX) * frame.scale;
  const top = (orn.y - frame.originY) * frame.scale;

  const grow = useSharedValue(reducedMotion ? 1 : 0);
  const glow = useSharedValue(0);
  const timerRef = useRef(null);

  // Grow out of the piece a beat after it settles. Plain spring/timing only
  // — never withSequence (web commits kill it mid-flight).
  useEffect(() => {
    if (reducedMotion) return undefined;
    timerRef.current = setTimeout(() => {
      grow.value = withSpring(1, { damping: 16, stiffness: 190 });
    }, GROW_DELAY_MS);
    return () => {
      clearTimeout(timerRef.current);
      cancelAnimation(grow);
    };
  }, []);

  useEffect(() => {
    if (complete && (orn.kind === 'window' || orn.kind === 'door')) {
      glow.value = withTiming(0.95, { duration: reducedMotion ? 250 : 700 });
    }
  }, [complete]);

  // 'above' ornaments grow up out of the roof (origin bottom-center);
  // 'inset' ornaments bloom in place (origin center).
  const originShift = orn.anchor === 'above' ? H / 2 : 0;
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, grow.value * 1.6),
    transform: [
      { translateY: originShift },
      { scale: grow.value },
      { translateY: -originShift },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left, top, width: W, height: H }, style]}
    >
      <Svg width={W} height={H} viewBox={`0 0 ${orn.w} ${orn.h}`}>
        <OrnamentArt orn={orn} />
      </Svg>
      {orn.kind === 'flag' && <Pennant orn={orn} W={W} H={H} reducedMotion={reducedMotion} />}
      {(orn.kind === 'window' || orn.kind === 'door') && (
        <GlowOverlay orn={orn} W={W} H={H} glow={glow} />
      )}
    </Animated.View>
  );
}

// Static geometry per kind, in ornament-local puzzle units.
function OrnamentArt({ orn }) {
  const M = MONUMENT_COLORS;
  switch (orn.kind) {
    case 'flag':
      return (
        <>
          <Rect x={13.9} y={7} width={2.2} height={26} rx={1.1} fill={M.trim} />
          <Circle cx={15} cy={5.2} r={2.3} fill={M.trim} />
        </>
      );
    case 'dome':
      return (
        <>
          <Path d="M3 13 A10 10 0 0 1 23 13 Z" fill={M.dome} />
          <Path d="M13 3 A10 10 0 0 1 23 13 L19 13 A8 8 0 0 0 13 5.5 Z" fill={M.domeShade} opacity={0.5} />
          <Rect x={2} y={12.4} width={22} height={3.6} rx={1.4} fill={M.trim} />
          <Circle cx={13} cy={2.2} r={1.8} fill={M.trim} />
        </>
      );
    case 'door':
      return (
        <Path
          d="M2 20 L2 10 A7 7 0 0 1 16 10 L16 20 Z"
          fill={M.doorway}
          stroke={M.trim}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      );
    case 'window':
      return (
        <>
          <Path d="M1.2 14 L1.2 6.4 A4.3 4.3 0 0 1 9.8 6.4 L9.8 14 Z" fill={orn.fill} />
          <Rect x={0} y={13} width={11} height={1.6} rx={0.8} fill={M.trim} opacity={0.9} />
        </>
      );
    case 'pool':
      return (
        <>
          <Rect x={0} y={0} width={orn.w} height={13} rx={6.5} fill={M.poolRim} />
          <Rect x={1.8} y={1.8} width={orn.w - 3.6} height={9.4} rx={4.7} fill={M.pool} />
          <Circle cx={orn.w * 0.3} cy={5.4} r={1.5} fill="#FFFDF9" opacity={0.65} />
          <Circle cx={orn.w * 0.62} cy={7.4} r={1.1} fill="#FFFDF9" opacity={0.5} />
        </>
      );
    case 'stairs':
      return (
        <Polygon
          points={orn.points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill={MONUMENT_COLORS.stairs}
          stroke={MONUMENT_COLORS.stairsShade}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

// The rose pennant waves gently about the pole top — its own layer so the
// loop never re-renders the sprite. withRepeat survives web commits.
function Pennant({ orn, W, H, reducedMotion }) {
  const wave = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return undefined;
    wave.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(wave);
  }, [reducedMotion]);

  // Joint at the pole top, in sprite-local px.
  const jx = (16.1 / orn.w) * W - W / 2;
  const jy = (8 / orn.h) * H - H / 2;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: jx },
      { translateY: jy },
      { rotate: `${-6 + wave.value * 12}deg` },
      { translateX: -jx },
      { translateY: -jy },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={W} height={H} viewBox={`0 0 ${orn.w} ${orn.h}`}>
        <Polygon points="16.1,7.5 29,11.5 16.1,15.5" fill={MONUMENT_COLORS.pennant} />
      </Svg>
    </Animated.View>
  );
}

// Honey light inside windows and doorways once the puzzle completes.
function GlowOverlay({ orn, W, H, glow }) {
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  const d =
    orn.kind === 'door'
      ? 'M2 20 L2 10 A7 7 0 0 1 16 10 L16 20 Z'
      : 'M1.2 14 L1.2 6.4 A4.3 4.3 0 0 1 9.8 6.4 L9.8 14 Z';
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={W} height={H} viewBox={`0 0 ${orn.w} ${orn.h}`}>
        <Path d={d} fill={MONUMENT_COLORS.lit} />
      </Svg>
    </Animated.View>
  );
}

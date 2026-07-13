import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, DEPTH, PATHMAKER_COLORS, RADII, shade } from '../../constants/theme';
import { TILE_TYPES } from './grid';
import BoardSnack from './Snack';

// 2.5D board: many small axis-aligned slabs, two-pass rendered (every
// bottom band, then every top face, both in the same row-major order).
// This is NOT Tangram's arbitrary-polygon extrusion.js (built for
// irregular tangram-piece shapes Path-Maker doesn't have) and not
// literally its single-board "slab" trick either (built for exactly one
// rectangle) — it's the same occlusion reasoning applied to a grid of
// simple rects. DEPTH.extrude is purely vertical (dx:0), so only
// vertically-adjacent tiles (same column) can ever overlap; drawing every
// bottom band before every top face guarantees correct occlusion with no
// sorting, the same reason Tangram's two-pass board render works.

export const TILE_SIZE = 76;
export const TILE_GAP = 6;

const RAISED_DEPTH = DEPTH.extrude.dy * 2.5; // visibly taller — foreshadows Hop (Phase 5)
const MAX_DEPTH = RAISED_DEPTH;

// The Monument Valley read: the whole tile grid sits on one chunky stone
// island floating in the sky. A generous margin around the tiles and a
// thick bottom band (extrusion, not shadow — the track area sits directly
// below, so per the depth policy the island is grounded by its own band,
// never by sky ellipses).
const ISLAND_MARGIN = 14;
const ISLAND_DEPTH = 26;
const ISLAND_RADIUS = 22;

const TILE_TOP_COLORS = {
  [TILE_TYPES.PATH]: '#F3EBDD',
  [TILE_TYPES.RAISED]: COLORS.bubbleYellow,
  [TILE_TYPES.GOAL]: COLORS.bubbleGreen,
};

// Pixel center of a board cell, relative to the board container's own
// top-left corner. Shared by Board (tile layout) and Character (pose ->
// screen position) so the two can never drift out of sync — and it works
// unmodified for out-of-bounds coordinates, which is exactly what the
// "lean off the edge" bug animation needs.
export function tileCenter(x, y) {
  return {
    x: x * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
    y: y * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
  };
}

export function boardPixelSize(board) {
  return {
    width: board.width * (TILE_SIZE + TILE_GAP) - TILE_GAP,
    height: board.height * (TILE_SIZE + TILE_GAP) - TILE_GAP,
  };
}

// The goal tile's top face breathes gently so it "reads as the
// objective." Animating a single SVG primitive inside the shared
// multi-shape board <Svg> (via Animated.createAnimatedComponent) isn't
// used here — it's untested in this codebase and adds risk for no
// benefit — so this wraps a small SEPARATE <Svg> in a plain Animated.View
// instead, the same proven idiom every other Reanimated+SVG combo in the
// app already uses (Character's shadow, Marble's shadow, Confetti).
// Rendered as a floating overlay above the main board <Svg> rather than
// inside its two-pass system — harmless today since no level has a
// raised goal tile, but worth a revisit if one ever does (the overlay
// wouldn't participate in the occlusion-by-paint-order the rest of the
// board relies on).
function GoalTop({ x, y }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withTiming(0.9, { duration: 1000 }), -1, true);
    return () => cancelAnimation(scale);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const color = TILE_TOP_COLORS[TILE_TYPES.GOAL];

  return (
    <View style={[styles.goalOverlay, { left: x, top: y }]}>
      <Animated.View style={style}>
        <Svg width={TILE_SIZE} height={TILE_SIZE}>
          <Rect
            x={0}
            y={0}
            width={TILE_SIZE}
            height={TILE_SIZE}
            rx={RADII.sm}
            fill={color}
            stroke={shade(color, -0.15)}
            strokeWidth={1.5}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default function Board({ board, snacks = [] }) {
  const { width, height } = boardPixelSize(board);

  const tiles = board.tiles.map((type, i) => ({
    i,
    type,
    x: i % board.width,
    y: Math.floor(i / board.width),
  }));

  const solid = tiles.filter((t) => t.type !== TILE_TYPES.GAP);
  const gaps = tiles.filter((t) => t.type === TILE_TYPES.GAP);
  const goals = solid.filter((t) => t.type === TILE_TYPES.GOAL);

  const islandW = width + ISLAND_MARGIN * 2;
  const islandH = height + ISLAND_MARGIN * 2;

  return (
    <>
      {/* Floating stone island under everything. An absolute underlay
          with negative insets, so tileCenter math and every sibling
          positioned off boardWrap are untouched. */}
      <View pointerEvents="none" style={[styles.islandWrap, { left: -ISLAND_MARGIN, top: -ISLAND_MARGIN }]}>
        <Svg width={islandW} height={islandH + ISLAND_DEPTH}>
          <Rect
            x={0}
            y={ISLAND_DEPTH}
            width={islandW}
            height={islandH}
            rx={ISLAND_RADIUS}
            fill={shade(PATHMAKER_COLORS.island, DEPTH.sideShade)}
          />
          <Rect
            x={0}
            y={0}
            width={islandW}
            height={islandH}
            rx={ISLAND_RADIUS}
            fill={PATHMAKER_COLORS.island}
          />
          {/* A static soft halo behind the goal tile — the ground-shadow
              stacking recipe inverted into a glow, no animation loops.
              Lives in THIS Svg (not the board's) so its widest ring isn't
              clipped when the goal sits on the board's rim. */}
          {goals.map((t) => {
            const gx = t.x * (TILE_SIZE + TILE_GAP) + ISLAND_MARGIN;
            const gy = t.y * (TILE_SIZE + TILE_GAP) + ISLAND_MARGIN;
            return [18, 12, 6].map((grow, gi) => (
              <Rect
                key={`halo-${t.i}-${gi}`}
                x={gx - grow}
                y={gy - grow}
                width={TILE_SIZE + grow * 2}
                height={TILE_SIZE + grow * 2}
                rx={RADII.sm + grow}
                fill={COLORS.bubbleGreen}
                opacity={[0.05, 0.08, 0.13][gi]}
              />
            ));
          })}
        </Svg>
      </View>

      {/* The tile Svg must itself be positioned: the island underlay is a
          positioned element, and CSS paints positioned elements above all
          in-flow content — an unpositioned board Svg would render UNDER
          the slab no matter the DOM order. */}
      <Svg width={width} height={height + MAX_DEPTH} style={styles.boardSvg}>
      {/* Gaps aren't objects, they're absences — now that the island slab
          sits underneath, a gap reads as a recessed HOLE in the stone
          (darker inset fill) with the app's dashed "empty" affordance on
          its rim, so the child can anticipate a gap before stepping into
          it. */}
      {gaps.map((t) => (
        <Rect
          key={`gap-${t.i}`}
          x={t.x * (TILE_SIZE + TILE_GAP)}
          y={t.y * (TILE_SIZE + TILE_GAP)}
          width={TILE_SIZE}
          height={TILE_SIZE}
          rx={RADII.sm}
          fill={shade(PATHMAKER_COLORS.island, 0.14)}
          stroke="rgba(62, 58, 94, 0.22)"
          strokeWidth={2}
          strokeDasharray="6,5"
        />
      ))}

      {/* Pass 1: every bottom band first */}
      {solid.map((t) => {
        const topColor = TILE_TOP_COLORS[t.type] ?? TILE_TOP_COLORS[TILE_TYPES.PATH];
        const depth = t.type === TILE_TYPES.RAISED ? RAISED_DEPTH : DEPTH.extrude.dy;
        return (
          <Rect
            key={`band-${t.i}`}
            x={t.x * (TILE_SIZE + TILE_GAP)}
            y={t.y * (TILE_SIZE + TILE_GAP) + depth}
            width={TILE_SIZE}
            height={TILE_SIZE}
            rx={RADII.sm}
            fill={shade(topColor, DEPTH.sideShade)}
          />
        );
      })}

      {/* Pass 2: every top face second, so a lower tile's top always
          occludes its neighbor's downward band without sorting. GOAL is
          skipped here — GoalTop renders it as a separate animated
          overlay, below, since it's the one tile with its own motion. */}
      {solid
        .filter((t) => t.type !== TILE_TYPES.GOAL)
        .map((t) => {
          const left = t.x * (TILE_SIZE + TILE_GAP);
          const top = t.y * (TILE_SIZE + TILE_GAP);
          const topColor = TILE_TOP_COLORS[t.type] ?? TILE_TOP_COLORS[TILE_TYPES.PATH];
          return (
            <Rect
              key={`top-${t.i}`}
              x={left}
              y={top}
              width={TILE_SIZE}
              height={TILE_SIZE}
              rx={RADII.sm}
              fill={topColor}
              stroke={shade(topColor, -0.15)}
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>

      {goals.map((t) => (
        <GoalTop
          key={`goaltop-${t.i}`}
          x={t.x * (TILE_SIZE + TILE_GAP)}
          y={t.y * (TILE_SIZE + TILE_GAP)}
        />
      ))}

      {/* Uneaten snacks, tucked toward the tile's top-right corner so
          they read before Lento arrives to munch them. */}
      {snacks.map((s) => (
        <BoardSnack
          key={s.id}
          left={s.x * (TILE_SIZE + TILE_GAP) + TILE_SIZE - 28}
          top={s.y * (TILE_SIZE + TILE_GAP) + 7}
          kind={s.kind}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  goalOverlay: {
    position: 'absolute',
  },
  islandWrap: {
    position: 'absolute',
  },
  boardSvg: {
    position: 'relative',
    zIndex: 0,
  },
});

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, DEPTH, MONUMENT_COLORS, PATHMAKER_COLORS, RADII, shade } from '../../constants/theme';
import { TILE_TYPES } from './grid';
import BoardSnack from './Snack';

// 2.5D board, Monument-Valley aqueduct edition. The walkway is no longer a
// grid of separate flat buttons: path tiles carry a deep stone band with
// arch voids carved into it (an arcade), adjacent same-type tiles merge
// across the grid gap into one continuous elevated causeway, and the goal
// earns a small domed gate. Two-pass rendering (every bottom band, then
// every top face, row-major) is unchanged — DEPTH extrusion is purely
// vertical, so paint order alone guarantees occlusion, the same reasoning
// as Tangram's board. All geometry math (tileCenter, boardPixelSize) is
// untouched: everything here is paint.

export const TILE_SIZE = 76;
export const TILE_GAP = 6;

const TRACK_DEPTH = 20; // path/goal tiles read as an elevated stone beam
const RAISED_DEPTH = 30; // visibly taller still — foreshadows Hop (Phase 5)
const MAX_DEPTH = RAISED_DEPTH;

// The whole grid sits on one chunky floating stone island. Margin is
// generous enough that a bottom-row tile's band lands flush on the
// island's rim, and the island's own band is deep enough for big arch
// voids — the aqueduct-pier read from Monument Valley.
const ISLAND_MARGIN = 20;
const ISLAND_DEPTH = 34;
const ISLAND_RADIUS = 22;

const TILE_TOP_COLORS = {
  [TILE_TYPES.PATH]: '#F3EBDD',
  [TILE_TYPES.RAISED]: COLORS.bubbleYellow,
  [TILE_TYPES.GOAL]: COLORS.bubbleGreen,
};

const tileDepth = (type) => (type === TILE_TYPES.RAISED ? RAISED_DEPTH : TRACK_DEPTH);

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

// Semicircle-topped arch void, anchored to a band's bottom edge.
function archPath(cx, bottom, w, h) {
  const r = w / 2;
  return `M ${cx - r} ${bottom} L ${cx - r} ${bottom - h + r} A ${r} ${r} 0 0 1 ${
    cx + r
  } ${bottom - h + r} L ${cx + r} ${bottom} Z`;
}

// The goal tile's top face breathes gently so it "reads as the
// objective." Same proven separate-Svg-in-Animated.View idiom as every
// other Reanimated+SVG combo in the app.
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

// A little domed gate standing at the back of the goal tile — the shrine
// Lento walks into. Drawn only when the tile above the goal is open sky
// (a gap or off-board), so it never stands in front of walkable track.
// Static art: the tile beneath it breathes, the gate holds still.
const GATE_W = 46;
const GATE_H = 52;
function GoalGate({ x, y }) {
  const M = MONUMENT_COLORS;
  return (
    <View
      pointerEvents="none"
      style={[styles.goalOverlay, { left: x + (TILE_SIZE - GATE_W) / 2, top: y + 16 - GATE_H }]}
    >
      <Svg width={GATE_W} height={GATE_H} viewBox={`0 0 ${GATE_W} ${GATE_H}`}>
        {/* pillars */}
        <Rect x={6} y={22} width={7} height={30} fill={M.dome} />
        <Rect x={33} y={22} width={7} height={30} fill={M.dome} />
        <Rect x={11.5} y={22} width={1.5} height={30} fill={M.domeShade} opacity={0.6} />
        <Rect x={38.5} y={22} width={1.5} height={30} fill={M.domeShade} opacity={0.6} />
        {/* archway opening */}
        <Path d={`M 13 ${GATE_H} L 13 33 A 10 10 0 0 1 33 33 L 33 ${GATE_H} Z`} fill={M.doorway} />
        {/* lintel + dome + finial */}
        <Rect x={4} y={18} width={38} height={4.5} rx={1.8} fill={M.trim} />
        <Path d="M 10 18 A 13 13 0 0 1 36 18 Z" fill={M.dome} />
        <Path d="M 23 5 A 13 13 0 0 1 36 18 L 31.5 18 A 8.5 8.5 0 0 0 23 9.7 Z" fill={M.domeShade} opacity={0.5} />
        <Circle cx={23} cy={3.6} r={2.4} fill={M.trim} />
      </Svg>
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

  const isSolid = (x, y) => {
    if (x < 0 || y < 0 || x >= board.width || y >= board.height) return false;
    return board.tiles[y * board.width + x] !== TILE_TYPES.GAP;
  };
  const typeAt = (x, y) =>
    x >= 0 && y >= 0 && x < board.width && y < board.height
      ? board.tiles[y * board.width + x]
      : undefined;

  const solid = tiles.filter((t) => t.type !== TILE_TYPES.GAP);
  const gaps = tiles.filter((t) => t.type === TILE_TYPES.GAP);
  const goals = solid.filter((t) => t.type === TILE_TYPES.GOAL);

  const islandW = width + ISLAND_MARGIN * 2;
  const islandH = height + ISLAND_MARGIN * 2;

  // Island arcade: big arch voids in the slab's band, evenly spread.
  const archCount = Math.max(1, Math.floor((islandW - 52) / 55));
  const islandArches = Array.from({ length: archCount }, (_, i) => {
    const usable = islandW - 52;
    return 26 + usable * ((i + 0.5) / archCount);
  });

  // Causeway seams: same-type neighbors merge across the grid gap.
  const bridgesH = solid.filter((t) => typeAt(t.x + 1, t.y) === t.type && t.type !== TILE_TYPES.GOAL);
  const bridgesV = solid.filter((t) => typeAt(t.x, t.y + 1) === t.type && t.type !== TILE_TYPES.GOAL);
  // Where a full 2×2 block shares one type, the little square at the
  // four-corner meeting point needs filling too or it shows through.
  const corners = solid.filter(
    (t) =>
      t.type !== TILE_TYPES.GOAL &&
      typeAt(t.x + 1, t.y) === t.type &&
      typeAt(t.x, t.y + 1) === t.type &&
      typeAt(t.x + 1, t.y + 1) === t.type
  );

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
          {/* Aqueduct piers: arch voids in the island's own band */}
          {islandArches.map((cx, i) => (
            <Path
              key={`iarch-${i}`}
              d={archPath(cx, islandH + ISLAND_DEPTH, 34, 22)}
              fill={shade(PATHMAKER_COLORS.island, 0.5)}
            />
          ))}
          {/* A static soft halo behind the goal tile — the ground-shadow
              stacking recipe inverted into a glow, no animation loops. */}
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
      {/* Gaps aren't objects, they're absences: recessed holes in the
          stone with the app's dashed "empty" affordance on the rim. */}
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

      {/* Pass 1: every bottom band first, plus band bridges across seams
          so the causeway's side face is continuous. */}
      {solid.map((t) => {
        const topColor = TILE_TOP_COLORS[t.type] ?? TILE_TOP_COLORS[TILE_TYPES.PATH];
        return (
          <Rect
            key={`band-${t.i}`}
            x={t.x * (TILE_SIZE + TILE_GAP)}
            y={t.y * (TILE_SIZE + TILE_GAP) + tileDepth(t.type)}
            width={TILE_SIZE}
            height={TILE_SIZE}
            rx={RADII.sm}
            fill={shade(topColor, DEPTH.sideShade)}
          />
        );
      })}
      {bridgesH.map((t) => {
        const topColor = TILE_TOP_COLORS[t.type] ?? TILE_TOP_COLORS[TILE_TYPES.PATH];
        return (
          <Rect
            key={`bandbridge-${t.i}`}
            x={t.x * (TILE_SIZE + TILE_GAP) + TILE_SIZE - 1}
            y={t.y * (TILE_SIZE + TILE_GAP) + tileDepth(t.type)}
            width={TILE_GAP + 2}
            height={TILE_SIZE}
            fill={shade(topColor, DEPTH.sideShade)}
          />
        );
      })}

      {/* Pass 1.5: arch voids carved into every visible band (skipped when
          a solid tile below occludes the band anyway) — the walkway reads
          as an arcade of little aqueduct arches. */}
      {solid
        .filter((t) => !isSolid(t.x, t.y + 1))
        .map((t) => {
          const topColor = TILE_TOP_COLORS[t.type] ?? TILE_TOP_COLORS[TILE_TYPES.PATH];
          const bottom = t.y * (TILE_SIZE + TILE_GAP) + TILE_SIZE + tileDepth(t.type);
          const left = t.x * (TILE_SIZE + TILE_GAP);
          return [0.3, 0.7].map((f, ai) => (
            <Path
              key={`arch-${t.i}-${ai}`}
              d={archPath(left + TILE_SIZE * f, bottom, 20, 14)}
              fill={shade(topColor, 0.52)}
            />
          ));
        })}

      {/* Pass 2: every top face second, so a lower tile's top always
          occludes its neighbor's downward band without sorting. GOAL is
          skipped — GoalTop renders it as a separate animated overlay. */}
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

      {/* Pass 2.5: deck bridges — merge same-type neighbors into one
          continuous walkway, then draw a light paving JOINT across each
          seam. The joint keeps individual tiles countable (the child
          plans steps by tiles) while the deck still reads as one stone
          causeway, like the paving lines on a Monument Valley walkway. */}
      {bridgesH.map((t) => {
        const topColor = TILE_TOP_COLORS[t.type] ?? TILE_TOP_COLORS[TILE_TYPES.PATH];
        const joint = shade(topColor, -0.15);
        const x = t.x * (TILE_SIZE + TILE_GAP) + TILE_SIZE - 8;
        const y = t.y * (TILE_SIZE + TILE_GAP);
        const seamX = t.x * (TILE_SIZE + TILE_GAP) + TILE_SIZE + TILE_GAP / 2;
        return (
          <React.Fragment key={`bridge-h-${t.i}`}>
            <Rect x={x} y={y} width={TILE_GAP + 16} height={TILE_SIZE} fill={topColor} />
            <Rect x={x} y={y - 0.75} width={TILE_GAP + 16} height={1.5} fill={joint} />
            <Rect x={x} y={y + TILE_SIZE - 0.75} width={TILE_GAP + 16} height={1.5} fill={joint} />
            <Rect x={seamX - 1} y={y + 3} width={2} height={TILE_SIZE - 6} rx={1} fill={joint} />
          </React.Fragment>
        );
      })}
      {bridgesV.map((t) => {
        const topColor = TILE_TOP_COLORS[t.type] ?? TILE_TOP_COLORS[TILE_TYPES.PATH];
        const joint = shade(topColor, -0.15);
        const x = t.x * (TILE_SIZE + TILE_GAP);
        const y = t.y * (TILE_SIZE + TILE_GAP) + TILE_SIZE - 8;
        const seamY = t.y * (TILE_SIZE + TILE_GAP) + TILE_SIZE + TILE_GAP / 2;
        return (
          <React.Fragment key={`bridge-v-${t.i}`}>
            <Rect x={x} y={y} width={TILE_SIZE} height={TILE_GAP + 16} fill={topColor} />
            <Rect x={x - 0.75} y={y} width={1.5} height={TILE_GAP + 16} fill={joint} />
            <Rect x={x + TILE_SIZE - 0.75} y={y} width={1.5} height={TILE_GAP + 16} fill={joint} />
            <Rect x={x + 3} y={seamY - 1} width={TILE_SIZE - 6} height={2} rx={1} fill={joint} />
          </React.Fragment>
        );
      })}
      {corners.map((t) => {
        const topColor = TILE_TOP_COLORS[t.type] ?? TILE_TOP_COLORS[TILE_TYPES.PATH];
        const cx = t.x * (TILE_SIZE + TILE_GAP) + TILE_SIZE;
        const cy = t.y * (TILE_SIZE + TILE_GAP) + TILE_SIZE;
        return (
          <Rect
            key={`corner-${t.i}`}
            x={cx - 2}
            y={cy - 2}
            width={TILE_GAP + 4}
            height={TILE_GAP + 4}
            fill={topColor}
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
      {goals
        .filter((t) => !isSolid(t.x, t.y - 1))
        .map((t) => (
          <GoalGate
            key={`gate-${t.i}`}
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

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADII } from '../../constants/theme';
import { TILE_TYPES } from './grid';

// Placeholder board rendering — a plain flat top-down grid, no isometric
// projection or 2.5D extrusion yet. The design doc calls for an isometric
// island, but the app's actual visual language (see Tangram's
// extrusion.js) is suggested 2.5D, never true isometric — that direction
// gets resolved during the visual polish phase, not here.

export const TILE_SIZE = 76;
export const TILE_GAP = 6;

const TILE_COLORS = {
  [TILE_TYPES.PATH]: '#F3EBDD',
  [TILE_TYPES.GAP]: 'rgba(62, 58, 94, 0.15)',
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

export default function Board({ board }) {
  const { width, height } = boardPixelSize(board);

  return (
    <View style={[styles.board, { width, height }]}>
      {board.tiles.map((type, i) => {
        const x = i % board.width;
        const y = Math.floor(i / board.width);
        return (
          <View
            key={i}
            style={[
              styles.tile,
              {
                left: x * (TILE_SIZE + TILE_GAP),
                top: y * (TILE_SIZE + TILE_GAP),
                backgroundColor: TILE_COLORS[type] ?? TILE_COLORS[TILE_TYPES.PATH],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADII.sm,
  },
});

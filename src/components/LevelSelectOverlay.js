import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS, RADII, SHADOWS, SPACING, TOUCH, TYPE } from '../constants/theme';
import { tapHaptic } from '../utils/haptics';

// In-game level picker: a full-screen dimmed overlay with a grid of big
// numbered tiles, opened by tapping the "Level X/Y" indicator. Every level
// is unlocked (the app has no progress persistence). Modeled on Tangram's
// PuzzlePicker grid, but rendered as an overlay inside the game rather than
// a separate route, so picking a level just calls back to index.js's
// setLevelId and the keyed GameScreen remounts fresh.
//
// Props:
//   visible      gate
//   levelIds     array of level ids to list (in play order)
//   currentId    the level being played (tile highlighted)
//   onSelect(id) jump to a level
//   onClose      dismiss without changing level
//   accentColor  the game's action accent (fills the current tile)
//   title        heading, defaults to "Levels"
export default function LevelSelectOverlay({
  visible,
  levelIds,
  currentId,
  onSelect,
  onClose,
  accentColor = COLORS.bubbleOrange,
  title = 'Levels',
}) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop tap closes; the panel below stops propagation. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={10} activeOpacity={0.7}>
            <Svg width={20} height={20} viewBox="0 0 20 20">
              <Line x1={5} y1={5} x2={15} y2={15} stroke={COLORS.textDark} strokeWidth={2.5} strokeLinecap="round" />
              <Line x1={15} y1={5} x2={5} y2={15} stroke={COLORS.textDark} strokeWidth={2.5} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {levelIds.map((id) => {
            const active = id === currentId;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.tile, active && { backgroundColor: accentColor }]}
                activeOpacity={0.7}
                onPress={() => {
                  tapHaptic();
                  onSelect(id);
                }}
              >
                <Text style={[styles.tileNum, active && styles.tileNumActive]}>{id}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const TILE = 72;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(62, 58, 94, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 400,
  },
  panel: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.xl,
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    maxWidth: 420,
    maxHeight: '76%',
    ...SHADOWS.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    ...TYPE.title,
    color: COLORS.textDark,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
    justifyContent: 'center',
  },
  tile: {
    width: TILE,
    height: TILE,
    minWidth: TOUCH.minTargetSize,
    minHeight: TOUCH.minTargetSize,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  tileNum: {
    ...TYPE.title,
    color: COLORS.textDark,
  },
  tileNumActive: {
    color: COLORS.white,
  },
});

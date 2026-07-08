import React, { forwardRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { COLORS, MARBLE_COLORS, RADII, SHADOWS, TYPE } from '../../constants/theme';
import { Companion } from '../../characters';

// Thin adapter: Juno the rabbit (Shapefolk rig) replaces the old robot,
// keeping this component's external contract — targetNumber, isDancing,
// size — plus the target-number card below the character.
const Character = forwardRef(function Character(
  { targetNumber, isDancing = false, size = 120, gazeTarget = null, anchor = null },
  ref
) {
  return (
    <View style={styles.container}>
      <Companion
        ref={ref}
        character="juno"
        size={size}
        mood={isDancing ? 'celebrating' : 'idle'}
        gazeTarget={gazeTarget}
        anchor={anchor}
      />
      <View style={styles.targetCard}>
        <Text style={styles.targetNumber}>{targetNumber}</Text>
      </View>
    </View>
  );
});

export default Character;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
  },
  targetCard: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderRadius: RADII.md,
    paddingHorizontal: 22,
    paddingVertical: 6,
    borderWidth: 3,
    borderColor: MARBLE_COLORS.marble,
    ...SHADOWS.card,
  },
  targetNumber: {
    ...TYPE.title,
    fontSize: 30,
    color: MARBLE_COLORS.marble,
  },
});

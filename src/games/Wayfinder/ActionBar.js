import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SPACING } from '../../constants/theme';
import ActionButton, { BUTTON_SIZE } from './ActionButton';
import { ACTIONS } from './executeJourney';

export const ACTION_BAR_HEIGHT = BUTTON_SIZE + 8; // button + extrude band

// The four verbs, in the order the game teaches them. Move sits first and
// wears the terracotta action accent; the three build tools follow.
export default function ActionBar({ disabled, onTap }) {
  return (
    <View style={styles.row}>
      {ACTIONS.map((type) => (
        <ActionButton key={type} type={type} disabled={disabled} onTap={onTap} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING[3],
    alignItems: 'flex-start',
  },
});

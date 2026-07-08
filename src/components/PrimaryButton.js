import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADII, SHADOWS, TOUCH, TYPE } from '../constants/theme';

// The one action button: terracotta pill, warm-white Nunito label,
// 80pt tall for toddler fingers. Optional icon renders after the label.
export default function PrimaryButton({ label, onPress, icon = null, style }) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.label}>{label}</Text>
      {icon && <View style={styles.icon}>{icon}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    backgroundColor: COLORS.bubbleOrange,
    height: TOUCH.buttonHeight,
    minWidth: 220,
    borderRadius: RADII.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: TOUCH.buttonPadding + 8,
    ...SHADOWS.card,
  },
  label: {
    ...TYPE.title,
    color: COLORS.white,
  },
  icon: {
    marginLeft: 10,
  },
});

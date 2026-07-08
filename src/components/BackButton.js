import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SHADOWS, TOUCH } from '../constants/theme';
import { ChevronLeftIcon } from './icons';

export default function BackButton({ onPress, style }) {
  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <ChevronLeftIcon size={30} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: TOUCH.minTargetSize,
    height: TOUCH.minTargetSize,
    borderRadius: TOUCH.minTargetSize / 2,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    ...SHADOWS.card,
  },
});

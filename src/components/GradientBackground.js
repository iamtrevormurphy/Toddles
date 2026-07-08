import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../constants/theme';

// Every screen sits on one of the sky gradients (design-direction skill).
// name: 'dawn' | 'dusk' | 'mist'
export default function GradientBackground({ name = 'dawn' }) {
  return (
    <LinearGradient
      colors={GRADIENTS[name]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

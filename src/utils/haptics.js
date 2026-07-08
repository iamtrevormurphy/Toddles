import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Centralized haptic patterns for consistent feedback

/**
 * Light tap - for button presses, small interactions
 */
export async function tapHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {
    // Fail silently
  }
}

/**
 * Medium impact - for snapping, placing pieces
 */
export async function snapHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    // Fail silently
  }
}

/**
 * Heavy impact - for combining marbles, important actions
 */
export async function heavyHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (e) {
    // Fail silently
  }
}

/**
 * Success notification - for correct answers, puzzle completion
 */
export async function successHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {
    // Fail silently
  }
}

/**
 * Error notification - for wrong answers
 */
export async function errorHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (e) {
    // Fail silently
  }
}

/**
 * Selection - for picking up pieces
 */
export async function selectionHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch (e) {
    // Fail silently
  }
}

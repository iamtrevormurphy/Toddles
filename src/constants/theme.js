// Toddler-friendly design constants
// Based on early childhood development research

export const COLORS = {
  // Primary palette - bright, saturated colors that toddlers respond to
  bubblePink: '#FF6B9D',
  bubbleBlue: '#4ECDC4',
  bubbleYellow: '#FFE66D',
  bubbleGreen: '#7ED957',
  bubblePurple: '#A28BFE',
  bubbleOrange: '#FF9F43',

  // Background colors
  backgroundLight: '#FFF8E7',
  backgroundSky: '#E8F4FD',

  // UI colors
  white: '#FFFFFF',
  textDark: '#2D3436',
  textLight: '#636E72',

  // Feedback colors
  success: '#00B894',
  celebration: '#FDCB6E',
};

// All bubble colors for random selection
export const BUBBLE_COLORS = [
  COLORS.bubblePink,
  COLORS.bubbleBlue,
  COLORS.bubbleYellow,
  COLORS.bubbleGreen,
  COLORS.bubblePurple,
  COLORS.bubbleOrange,
];

// Touch targets - minimum 64px for toddler fingers
export const TOUCH = {
  minTargetSize: 64,
  bubbleMinSize: 60,
  bubbleMaxSize: 100,
  buttonHeight: 80,
  buttonPadding: 24,
};

// Animation timings
export const TIMING = {
  bubbleRiseDuration: 8000, // 8 seconds to float up
  popDuration: 200,
  celebrationDuration: 1500,
  spawnInterval: 800, // New bubble every 800ms
};

// Game settings
export const GAME = {
  maxBubbles: 12,
  celebrationThreshold: 10, // Celebrate every 10 pops
};

// Tangram game colors - bright rainbow colors like classic tangram sets
export const TANGRAM_COLORS = {
  largeTriangle1: '#FF3B30', // Bright red
  largeTriangle2: '#FFCC00', // Golden yellow
  mediumTriangle: '#34C759', // Bright green
  smallTriangle1: '#007AFF', // Bright blue
  smallTriangle2: '#5856D6', // Purple
  square: '#FF9500',         // Orange
  parallelogram: '#00C7BE',  // Cyan/Teal
  boardBackground: '#F5F0E8',
  targetOutline: '#D4C8B8',
  snapHighlight: '#34C759',
};

// Number Marble game colors
export const MARBLE_COLORS = {
  marble: '#5C7AEA',         // Blue marble base
  marbleHighlight: '#8FA4F0',
  marbleShine: '#FFFFFF',
  targetSlot: '#E8E8E8',
  targetSlotActive: '#C7F5C7',
  characterBody: '#FFB347',  // Orange bear
  characterFace: '#FFFFFF',
  playArea: '#F0F7FF',
};

// Extended animation timings
export const ANIMATION = {
  snapDuration: 200,
  splitDuration: 300,
  combineDuration: 250,
  danceDuration: 1000,
  confettiDuration: 800,
  hintPulseDuration: 600,
  shakeWrongDuration: 400,
};

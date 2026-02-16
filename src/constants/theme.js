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

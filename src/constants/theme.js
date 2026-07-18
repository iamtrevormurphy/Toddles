// Toddles design tokens — the single source of truth for the visual identity.
// Direction: Monument Valley calm (pastel gradient skies, 2.5D thickness,
// long soft shadows) with Linear/Notion restraint and Duolingo friendliness.
// Full brand rules: .claude/skills/design-direction/SKILL.md

// Ink is the only dark in the app — deep plum-navy, never pure black.
const INK = '#3E3A5E';

// Mix a hex color toward the ink plum. amount 0..1 (0.22 = standard 2.5D
// side-face shade). Negative amounts lighten toward warm white instead.
export function shade(hex, amount = 0.22) {
  const target = amount < 0 ? [255, 253, 249] : [62, 58, 94]; // #FFFDF9 / INK
  const t = Math.abs(amount);
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c, i) =>
    Math.round(c + (target[i] - c) * t)
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export const COLORS = {
  // Accent palette — muted, warm, hue-distinct
  bubblePink: '#D98BA3',   // dusty rose
  bubbleBlue: '#7FB5B5',   // muted teal
  bubbleYellow: '#F0C987', // honey / celebration gold
  bubbleGreen: '#A3C39E',  // sage
  bubblePurple: '#A99BD1', // lavender
  bubbleOrange: '#E39473', // terracotta — THE action accent

  // Background colors
  backgroundLight: '#F7F1E8', // warm sand
  backgroundSky: '#EDE7F4',   // pale lavender wash

  // UI colors
  white: '#FFFDF9', // warm white surface (never pure #FFFFFF for surfaces)
  textDark: INK,
  textLight: '#7A7396',

  // Feedback colors
  success: '#7FA98C', // calm sage-green
  celebration: '#F0C987',
};

// All accent colors for random selection (confetti etc.)
export const BUBBLE_COLORS = [
  COLORS.bubblePink,
  COLORS.bubbleYellow,
  COLORS.bubbleGreen,
  COLORS.bubblePurple,
];

// Sky gradient pairs, top → bottom. Every screen sits on one of these.
export const GRADIENTS = {
  dawn: ['#E8DFF5', '#FBE7D6'], // lavender → peach: Home, Tangram play
  dusk: ['#DDE7F0', '#F3E3E9'], // pale blue → rose: puzzle picker
  mist: ['#E3EDF1', '#EFE6F0'], // pale teal → lilac: NumberMarble
};

// Touch targets - minimum 64px for toddler fingers
export const TOUCH = {
  minTargetSize: 64,
  bubbleMinSize: 60,
  bubbleMaxSize: 100,
  buttonHeight: 80,
  buttonPadding: 24,
};

export const RADII = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const SPACING = [4, 8, 12, 16, 24, 32, 48];

// Shadows are always plum-tinted, never black.
export const SHADOWS = {
  card: {
    shadowColor: INK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  floating: {
    shadowColor: INK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
};

// Type scale. RN custom fonts bind weight into the family name — always use
// fontFamily from here, never fontWeight alongside a Nunito family.
export const TYPE = {
  display: { fontFamily: 'Nunito_800ExtraBold', fontSize: 40 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 22 },
  body: { fontFamily: 'Nunito_600SemiBold', fontSize: 17 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
};

// The 2.5D recipe: extrusion straight down (flip-invariant — snapped tangram
// pieces animate scaleX(-1)), side faces shaded toward ink, ground shadows
// as stacked soft ellipses (never blur filters).
export const DEPTH = {
  extrude: { dx: 0, dy: 8 }, // puzzle units
  sideShade: 0.22,
  groundShadow: [
    { opacity: 0.1, spread: 1.0 },
    { opacity: 0.06, spread: 1.35 },
    { opacity: 0.04, spread: 1.7 },
  ],
};

// Animation timings
export const TIMING = {
  bubbleRiseDuration: 8000,
  popDuration: 200,
  celebrationDuration: 1500,
  spawnInterval: 800,
};

// Game settings
export const GAME = {
  maxBubbles: 12,
  celebrationThreshold: 10,
};

// Tangram piece colors — pastel but hue-distinct: the 4-year-old plays by
// matching piece color to slot color, so shape-type hues must never converge.
export const TANGRAM_COLORS = {
  largeTriangle1: '#E2795B', // terracotta
  largeTriangle2: '#E8A87C', // peach (kept for compatibility, unused by shapes)
  mediumTriangle: '#8FB26E', // moss green
  smallTriangle1: '#6C8FD4', // cornflower blue
  smallTriangle2: '#8E7CC3', // lavender (kept for compatibility)
  square: '#EDB95F',         // amber
  parallelogram: '#5FA8A0',  // muted teal
  boardBackground: '#F3EBDD', // pale stone platform top
  targetOutline: '#C9BBA8',
  snapHighlight: '#7FA98C',
  // Advanced-mode whole-picture hint — light lavender (~shade(bubblePurple, -0.5)),
  // hue-distant from every piece color so it hints no shape. Must stay an opaque
  // hex: seamless silhouette rendering relies on same-color stroke overdraw.
  silhouette: '#D4CCE8',
};

// Precomputed 2.5D side-face colors so render code never computes per frame.
export const TANGRAM_SIDE_COLORS = Object.fromEntries(
  Object.entries(TANGRAM_COLORS).map(([key, color]) => [
    key,
    shade(color, DEPTH.sideShade),
  ])
);

// Marble body colors — variety from the accent palette (hue-distinct,
// all read well under the ink crescent + white numeral)
export const MARBLE_PALETTE = [
  '#6B5B95', // dusty indigo
  '#5FA8A0', // muted teal
  '#E2795B', // terracotta
  '#6C8FD4', // cornflower
  '#D98BA3', // dusty rose
  '#8FB26E', // moss
];

// The rare "special" marble: honey gold with a gentle glow
export const MARBLE_SPECIAL_COLOR = '#F0C987';

// Number Marble game colors — dusty indigo world
export const MARBLE_COLORS = {
  marble: '#6B5B95',
  marbleHighlight: '#9385BC',
  marbleShine: '#FFFDF9',
  targetSlot: '#E6DFEE',
  targetSlotActive: '#D5E5D3',
  characterBody: '#A99BD1',
  characterFace: '#FFFDF9',
  playArea: '#EFEAF6',
};

// Path-Maker colors — scoped like TANGRAM_COLORS/MARBLE_COLORS rather than
// hand-picked from the shared bubble set, which is nearly exhausted once
// the board claims bubbleGreen (goal), bubbleYellow (raised), and
// bubbleOrange (active-highlight/CTA). The protagonist is now Lento the
// sloth (a real Shapefolk — see src/characters/defs/lento.js; his fawn/
// cocoa palette lives in CHARACTER_COLORS). characterBody remains only
// for reference/history: it was the pre-Lento teardrop's hue.
export const PATHMAKER_COLORS = {
  characterBody: '#D98BA3', // dusty rose (legacy teardrop walker)
  tileStep: '#6FA8D4',      // soft sky blue
  tileTurnLeft: '#C98FD1',  // soft orchid
  tileTurnRight: '#8FBFA8', // soft mint
  island: '#E4D5BD',        // warm stone slab the whole board floats on (a full step deeper than the cream tiles so the walkway pops)
};

// Monument ornaments — the tiny Monument Valley architecture that grows on
// settled tangram pieces (flags, domes, doorways, stairs, pools, windows).
// Scoped like TANGRAM_COLORS; ornaments are world objects, so these stay
// pastel-plus-gilding and never introduce a new saturated hue.
export const MONUMENT_COLORS = {
  trim: '#F0C987',                      // gilded edges, frames, poles (honey)
  dome: '#FFFDF9',                      // cream cupola
  domeShade: shade('#FFFDF9', 0.22),    // cupola side per the 2.5D recipe
  pennant: '#D98BA3',                   // rose flag
  doorway: '#514C73',                   // lifted-ink door opening
  stairs: '#F3EBDD',                    // pale stone treads (board stone)
  stairsShade: shade('#F3EBDD', 0.3),
  pool: '#7FB5B5',                      // rooftop water (muted teal)
  poolRim: shade('#7FB5B5', -0.55),
  lit: '#FFF4DC',                       // windows/doorway glow on completion
  //   ^ near-white warm gold: honey itself vanishes on amber piece faces
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

---
name: design-direction
description: >
  Toddles visual identity and brand system. Use whenever changing ANY visual
  aspect of this app: styling, colors, components, screens, game visuals,
  characters, animations, layout, typography, icons, or celebration effects.
  Read BEFORE writing any StyleSheet, SVG, theme change, or new UI. Also read
  characters.md in this skill for the Shapefolk character system.
---

# Toddles Design Direction

Toddles is a quiet pastel world of floating stone platforms under gradient
skies, where everything — puzzles, buttons, characters — is built from the
same geometric vocabulary and has gentle thickness and long soft shadows.
The player is a 4-year-old; the parent is the buyer. Calm, cozy, confident.

## Pillars (steal this / not this)

- **Linear — restraint.** Few colors per screen, crisp hierarchy, nothing
  decorative that isn't doing a job. *Not:* gradients on text, badges
  everywhere.
- **Notion — calm.** Warm neutrals, generous whitespace, soft shadows.
  *Not:* visual shouting, dense chrome.
- **Duolingo — friendly.** Chunky rounded shapes, big touch targets, bold
  clear feedback, at most ONE mascot-level playful element per screen.
  *Not:* streak-pressure energy, saturated neon.
- **Monument Valley — quiet magic.** Pastel gradient skies, dimensional
  geometry (things have thickness and cast long soft shadows), serene motion.
  Depth is *suggested* with 2.5D extrusion, never simulated with full 3D or
  isometric projection. **Sole exception: Wayfinder**
  (`src/games/Wayfinder/`) renders in deliberate 2:1 dimetric
  ("pseudo-isometric") projection — the one game allowed to, because its
  whole premise is a single winding MV causeway. The projection math lives
  ONLY in `src/games/Wayfinder/iso.js`; everything else (tokens, ink-only
  dark, `shade()` side faces, ground-shadow recipe, motion tempos) still
  applies there. No other game may adopt iso.

## Tokens — the source of truth

All values live in `src/constants/theme.js`. Any new color MUST come from
there. Key values (if theme.js and this file disagree, theme.js wins —
update this file):

- **Ink** `#3E3A5E` (deep plum-navy) — the ONLY dark. Text, eyes, shadows.
- Secondary text `#7A7396` · sand bg `#F7F1E8` · lavender wash `#EDE7F4` ·
  warm white surface `#FFFDF9` (never pure #FFFFFF for large surfaces).
- Accents: dusty rose `#D98BA3`, muted teal `#7FB5B5`, honey `#F0C987`,
  sage `#A3C39E`, lavender `#A99BD1`, **terracotta `#E39473` = the one
  action accent** (primary buttons, active states).
- `GRADIENTS` sky pairs (top→bottom): `dawn` #E8DFF5→#FBE7D6 (Home, Tangram),
  `dusk` #DDE7F0→#F3E3E9 (picker), `mist` #E3EDF1→#EFE6F0 (NumberMarble).
  Every screen background is a `GradientBackground` (src/components/).
- `TANGRAM_COLORS` are pastel but hue-distinct — color-matching pieces to
  slots is how the 4-year-old plays. Never converge two shape-type hues.
- **DEPTH (the 2.5D recipe):** extrusion vector `(0, 8)` puzzle units,
  straight down (flip-invariant — snapped pieces animate scaleX(-1)).
  Side faces = `shade(faceColor, 0.22)` (mix 22% toward ink; use the
  exported `shade()` / precomputed `TANGRAM_SIDE_COLORS`). Ground shadows =
  2–3 stacked ink ellipses at opacity 0.10/0.06/0.04, widening — NEVER blur
  filters (cross-platform risk). Extrude main masses only, not detail parts.
- `RADII` 8/16/24/32/pill · `SPACING` 4..48 · `SHADOWS`: always plum
  (`shadowColor: '#3E3A5E'`), never black; card = offset (0,6), opacity
  0.12, radius 12; floating object = (0,10)/0.14/14.
- **Type = Nunito** (600/700/800 via @expo-google-fonts/nunito). Custom RN
  fonts need `fontFamily: 'Nunito_800ExtraBold'` per weight — never pair
  `fontWeight` with the family. Scale: display 40/800, title 28/800,
  heading 22/700, body 17/600, label 14/700.
- **Motion:** 200–400ms; springs damping 18–22, stiffness 180–220. Calm,
  not zippy: one gentle settle, no infinite bouncing on interactive
  elements; celebrations scale-settle and fade, never strobe.

## Depth policy — depth earns its keep

Never use depth for depth's sake. The rules:

1. **Two shadow systems, never both on one object.** World objects (pieces,
   marbles, characters, platforms) use ink-ellipse ground shadows; UI chrome
   (cards, buttons, overlays) uses `SHADOWS.card`/`SHADOWS.floating`.
2. **Ground shadows appear only under LIFTED things** — a dragged
   piece/marble, a hopping character. Shadow opacity/offset/scale animates
   with the lift and is **zero at rest**. `Companion.js` is the reference
   implementation; Tangram pieces drive theirs off the existing `scl`
   shared value.
3. **Resting world objects are grounded by contact, not shadow**: the 2.5D
   darker bottom band for slabs; at most one tight contact ellipse for
   marbles (which shrinks/fades/separates on pickup).
4. **Platforms cast ellipses only onto empty sky.** If a panel or
   interactive zone sits directly below a slab (tangram tray, marble slot
   zone), drop the ellipses and attach the panel flush to the slab's bottom
   band — a shelf, not a second floating object.
5. **Shadows never overlap** each other or double with a panel's tint.
6. **One shadow per object, at its base, straight down** (matches the (0,8)
   extrusion light). Shadows belong to the ground — they never rotate or
   flip with the body.

## Tangram monuments

Settled tangram pieces grow Monument-Valley micro-architecture: summit
flag, base doorway, domes, carved stairs, one rooftop pool, arched
windows (colors: `MONUMENT_COLORS` in theme.js). The plan is computed
deterministically per puzzle in `src/games/Tangram/monuments.js`
(geometry only) and rendered by `Ornaments.js` (paint only — slot data,
snap geometry and hitboxes stay untouched). Planner invariants: ≤1
ornament per piece, ≤6 per puzzle, 'above' ornaments (flag/dome) only
under open sky, and domes always leave Pip at least one standable roof —
Pip hopping onto the piece the child just placed is the point of the
system. On completion, windows/doorways light warm-white (`lit`) and Pip
claims the highest open roof; his flight chains two plain withTiming
halves via later(), never withSequence (web-kill rule).

Path-Maker shares the vocabulary: the tile grid renders as an elevated
stone causeway (deep bands, arch voids, same-type tiles merged with
light paving joints so steps stay countable) over an island slab with
aqueduct-pier arches, and the goal tile earns a small domed gate
(`MONUMENT_COLORS`) when the tile above it is open sky — all paint in
`src/games/PathMaker/Board.js`; tileCenter/boardPixelSize math is
untouched.

Wayfinder extends the vocabulary into its dimetric world (see the pillar
carve-out above): pale stone walkway slabs (`WAYFINDER_COLORS`, with
precomputed SE-lit / SW-shaded side faces) on tall aqueduct piers with
arch voids, dusty rose-stone tunnel masses whose mouths are lifted-ink
`doorway`, dashed-rim gaps (the empty-slot affordance), and a sage goal
pad under an iso `GoalGate` shrine — all under the app's darkest sky,
`GRADIENTS.night` (deep lavender → warm rose; still nowhere near black).
Rumi the lion (see characters.md) walks the causeway; his facing uses
the standard front/back/side view swap, never body rotation.

## Completion & navigation chrome (shared)

- **Success is a bottom bar, never a dimming modal.** Every game signals
  "level complete" with the shared `src/components/SuccessBar.js`: a rounded
  warm-white card (`SHADOWS.floating`) that springs up along the bottom of
  the screen — no full-screen scrim. The point is that the character
  (Pip/Juno/Lento/Rumi) keeps celebrating on the board, fully lit and
  unobscured; a dim overlay covering the dance was the anti-pattern this
  replaced. It reveals ~1400ms after the win so the dance + confetti read
  first, carries the win line + the single terracotta `PrimaryButton`
  "Next" (plus an optional text-only secondary like Tangram's "More
  pictures"), and the game hides its now-moot bottom controls (palette /
  action bar / tray) while it's up. Do not reintroduce per-game
  `completeOverlay`/`completeCard` modals.
- **Level select is a full-screen tile grid.** PathMaker and Wayfinder make
  the top-right "Level X/Y" indicator a tappable pill that opens the shared
  `src/components/LevelSelectOverlay.js` — a dimmed overlay of big numbered
  tiles (≥`TOUCH.minTargetSize`), current level filled with the game's
  accent. Every level is unlocked (the app has no progress persistence).
  Selecting calls back to the game `index.js` `setLevelId`, and the keyed
  `GameScreen` remounts fresh.

## Do / Don't

- DON'T use pure black anywhere, or saturated iOS-class primaries
  (#FF3B30-class).
- DON'T render emoji anywhere in UI or content — SVG only. (The
  `puzzle.emoji` data field may persist unrendered.)
- DON'T use dashed borders except for "empty slot" affordances.
- DON'T shrink touch targets below `TOUCH.minTargetSize` (64pt) or remove
  hitSlops. Child-facing text ≥ 17pt, contrast ≥ 4.5:1.
- DO give lifted objects the ground-shadow recipe (see Depth policy —
  never always-on).
- DO keep chrome to neutrals + at most one accent; game pieces are exempt.
- DO keep one companion character max per screen (see characters.md).

## Protected invariants (style work must never touch these)

- `src/games/Tangram/Piece.js`: the outer-translate / inner-transform split
  and the absoluteX/Y gesture math are load-bearing web workarounds.
- `src/games/Tangram/transforms.js` math, `puzzles.js` slot data,
  `shapes.js` vertices, snap constants — geometry, not style.
- `src/games/NumberMarble/Marble.js` gesture code and `PLAY_AREA` constants.
- theme.js export keys are additive-only (screens import them all).

## Verification protocol

1. `npx expo start` via the preview server in `.claude/launch.json`.
2. Check at 375×812 AND 375×667; screenshot every touched screen.
3. If anything near Tangram changed: `node scripts/validate-tangram.js`
   and one full puzzle playthrough (drag, snap accuracy, completion).
4. Characters: exercise moods/reactions on the CompanionPreview dev screen.

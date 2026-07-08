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
  isometric projection.

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

# The Shapefolk — Toddles character system

Original cast of "geometric folk": creatures literally assembled from the
app's own shape vocabulary (tangram triangles, squares, parallelograms,
plus circles). They live in the 2.5D world as **living companions** — they
idle, blink, watch the child's moves, celebrate, and gently gesture toward
what's next. No text dialogue, no tutorials. Implementation lives in
`src/characters/` (defs are pure data; `Companion.js` is the rig).

## Cast

| | Pip 🐦* | Juno 🐰* | Miso 🐱* | Lento 🦥* | Rumi 🦁* |
|---|---|---|---|---|---|
| Species | bird | rabbit | cat | sloth | lion |
| Home | Tangram companion + **app brand mark** | NumberMarble companion | Home-screen greeter (reserved for game #3) | Path-Maker **protagonist** (the child steers him — not a sidelines companion) | Wayfinder **protagonist** (walks the dimetric causeway) |
| Dominant hue | teal `#5FA8A0` | lavender `#A99BD1` | terracotta `#E2795B` | fawn `#C7A97F` | amber `#EDB95F` (mane) |
| Accents | cornflower `#6C8FD4` wing/tail, amber `#EDB95F` beak, terracotta crest | rose `#D98BA3` chest/inner-ear/nose, amber tail | amber inner ears, moss `#8FB26E` collar | cocoa `#8A6E58` eye-patch mask/nose/claws, cream face, amber belly | fawn `#C7A97F` face/body, cocoa `#8A6E58` nose/ear-tips/tail-tuft, cream muzzle |
| Signature motion | wing flap / wing point | ear perk & droop | slow tail metronome | lazy long-arm sway + the cast's slowest blink (per-def `blink` override) | proud slow tail-tip swish + brisk blink; mane "fluff" on celebrate |
| Origin | the `bird` tangram puzzle IS his silhouette — the child can build Pip | descends from the `rabbit` puzzle | descends from the `cat` puzzle | born for Path-Maker: unhurried tempo *is* the game's pacing | born for Wayfinder: the brave walker who trusts the child to clear the way |

Amber was accent-only before Rumi claimed it as a dominant hue, so the
one-dominant-hue-per-character rule still holds cast-wide.

*emoji here are documentation shorthand only — never rendered in the app.

Construction rules: ~14–17 SVG primitives per character; eyes are ink
`#3E3A5E` circles with white glints; rose cheek dots appear when happy.
Extrude ONLY the 2–3 main body masses per the DEPTH recipe (side face =
`shade(color, 0.22)`, offset (0,8) down); never extrude eyes, beaks, ears,
tails. Each character owns one dominant hue so silhouettes stay
distinguishable against sand/lavender skies.

## Behavior vocabulary

- Moods (prop-driven loops): `idle` (soft bob, autonomous blink, occasional
  glance), `celebrating` (continuous small hops + appendage flap + cheeks —
  calm tempo), `hinting` (lean + appendage points toward `hintTarget`,
  pupils look there, ~2.5s).
- Watching is NOT a mood — it derives on the UI thread from a
  `{x, y, active}` shared-value gaze target (pupils + ±3° lean follow the
  dragged piece with zero React renders).
- One-shot reactions via `ref.react(...)`: `cheer` (pinned hop + cheek
  flash + appendage flick, ~600ms), `ohno` (gentle ±6° head shake —
  sympathetic, NEVER sad), `nod`, `hop`.

## Usage rules

- Max ONE companion per screen; always `pointerEvents="none"`.
- Never cover touch targets, slots, tray, marbles, buttons, or overlays;
  keep zIndex below dragged game objects (pieces use z=100).
- Failure feedback stays warm: `ohno` is a soft wobble, no sad faces, and
  progress is never gated on the companion.
- Perf: ≤6 animated SVG props per character (2 pupil ellipses, cheek
  opacity, 1–2 AnimatedG appendages); whole-body motion on wrapper
  Animated.Views; `cancelAnimation` on every value on mood change/unmount;
  no `Math.random()` in worklets (precompute jitter); no per-frame
  `runOnJS`.
- New characters: write a def in `src/characters/defs/`, verify on the
  CompanionPreview dev screen (web + native) before shipping.

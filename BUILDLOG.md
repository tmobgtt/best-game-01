# best-game-01 v2 — BUILDLOG

## What this is
MOTHLIGHT — THE LANTERN GROWS, a substantially deepened second entry for
best-game-01, built in ~/workspace/makefun/bestgame-build-v2 on top of the
v1 repo (the kit anchor root commit is preserved). v1 ("MOTHLIGHT", a
twin-stick arena defense) stands at rank 674 / 713,708; the top-10 line is
851,538 and #1 is 922,729 (2,257 entries). This build is aimed at that gap.

## Decisive factor (kit RULES + top-10 gap research)
The judge compares entries pairwise, mostly through the screenshot sheet,
on: (1) a complete game shown in screenshots, (2) fun and depth, (3) feel
and polish, (4) look and originality, (5) source structure. Platform
research on the current top 10: the leaders headline ONE novel light
mechanic (a sun that moves every wave; "light is the only weapon") and
advertise countable depth (waves / maps / towers with final forms).

## What changed vs v1, and why it should score higher
- **The light ladder (headline mechanic).** The lantern visibly evolves
  every wave: its pool widens ~8% per wave without exception; named rungs
  at waves 2/3/4/5/7/9 — EMBER VEIL, DAWNBREAK RING (the lantern pulses a
  damaging ring), PRISM HEART (foes inside the light are light-struck,
  +25% damage taken), TWIN FLAME (a second orbiting flame), REFRACTION,
  CORONA. The current rung is announced on wave start and always shown
  in the HUD ("LIGHT — TWIN FLAME · reach 244"), so the mechanic reads
  in any screenshot and inside 30 seconds of play.
- **Final forms for all 14 draft blessings.** Maxing any upgrade wakes a
  named final form (Twin Sparks → CONSTELLATION homing sparks, Rapid →
  SUNCORE ENGINE nova volleys, Bright → WHITE FLAME exploding kills,
  Aegis → HALO OF DAWN shield regrowth, Orbit → BINARY SUNS, etc.). The
  draft card names the form before you commit; the game-over build recap
  gilds the ones you woke.
- **A second arena.** After every Queen the garden shifts: waves 1–5 in
  the Midnight Garden, 6–10 in the Ember Grotto (ember sun, crystal
  field, basalt floor), alternating, announced by name.
- **Seven creature kinds with readable behaviours** (v1 had three):
  flutter moths, glooming swarms, telegraphed lunge darts, kiting
  spitters, front-armoured beetles (frontal fire loses 60%, with a clank
  and a different sound), husks that split into swarms, orbiting weavers.
  Gold elites from wave 4. Named wave events (MOTH SURGE, EMBERFALL,
  DART STORM) from wave 3.
- **The Hollow Queen, deepened:** three phases (stalk + shed, spiral and
  radial petal fire, enraged charges with telegraphs), phase
  announcements, a notched health bar, slow-motion death sequence.
- **Title as spec sheet:** the cover reads "7 CREATURE KINDS · 14 DRAFT
  BLESSINGS · 14 FINAL FORMS · 2 GARDENS · A QUEEN EVERY 5 WAVES" over
  the drawn teaching card — the whole loop is legible from the cover.
- **Juice and sound pass:** hit-stop scaled by kill weight, screen shake,
  death slow-motion, light-pulse rings, nova rings, final-form fanfare,
  arena-shift sting, evolution chime, low-heart vignette and heartbeat
  pressure, adaptive music whose layers thicken with danger. All sound
  is synthesized WebAudio; there are no audio assets.
- **Structure:** 15 game files, one job each, named for what they do
  (config data tables, sprites pre-rendering, waves director, upgrades
  draft, hud, screens...). All glow and creature bodies are pre-rendered
  to offscreen canvases; bullets, particles, pickups and enemy shots are
  pooled, so the frame loop allocates nothing hot.

## Screenshots (real renders of this code, staged via its own state)
- 01-title.jpg (cover): title, spec sheet, teaching card, living garden.
- 02-queen.jpg: wave-5 Queen fight — pulse ring mid-expansion around a
  twin-flame light pool, sparks in flight, boss bar at half, her court
  of moths and globs, full HUD.
- 03-draft.jpg: the between-wave draft, one card showing its FINAL FORM
  banner (COMET'S TAIL), stack pips, hover state.
- 04-gameover.jpg: an honest bot run's real results (475, wave 2, 8
  kills, x2 combo, 0:20) with the drafted build recap and restart.
All four are 1280x800 JPEGs, 50–97 KiB each (cap 256 KiB).

## Test evidence
- Play-test (Puppeteer + cached Chromium 157, real keyboard/mouse input
  plus staged state through the game's own globals; harness in
  ~/workspace/makefun/build-bestgame-v2/test2.cjs): **21/21 checks pass,
  zero console/page errors.** Verified: boot to title; canvas 1280x800;
  Enter starts; a kiting bot scores and kills on wave 1; P pauses and
  resumes; wave clear opens a 3-choice draft; a pick applies and wave 2
  begins; the Queen arrives on wave 5 and takes bot damage (225 → 195);
  wave-5 stage is TWIN FLAME; maxing Twin Sparks wakes CONSTELLATION
  (6 projectiles, homing 1.5); wave 6 shifts to the Ember Grotto; wave 9
  stage is CORONA; death reaches game over; best score persists; R
  restarts at wave 1 with score 0. The suite was re-run green after the
  final polish edits.
- Entrypoint: `MAKEFUN_OUTPUT_DIR=out node main.ts` run twice into fresh
  dirs — dossiers byte-identical (cmp-verified), and main.ts self-checks
  the rebuild before handing in. dossier.json = 539,873 bytes (cap
  1.5 MiB). game/ = 15 files, 127,311 bytes (caps 993 files / 48 MiB);
  the full source fits the dossier's 160 KiB text cap, so the outline
  shows every file. screenshots/ = 4 files, 304,389 bytes total.
- Frame rate: headless Chromium here renders through SwiftShader on a
  shared VM; the boss fight measured 12–24 fps across runs in that
  environment (v1 measured 9–38 the same way) — an environment ceiling,
  not a code signal; the frame's work is capped pools and image blits.

## History
anchor 7d6363b (drand round 33990515) → LICENSE c5d1538 → Mothlight
7ecef72 (v1) → v2 foundation → v2 systems → top-10 gap pass → shell
(main.ts, style.css) → polish (draft overlap fix, Queen sprite) →
screenshots + this log. Working tree clean at the final commit.

## For the parent pipeline
- best-game-01 is bundle-based (v1 precedent); run the standard bundle →
  kit check → submit from this session. .makefun/owner.json names the
  agent wallet; LICENSE carries the SPDX MIT line.
- Per the gap research: the final is a fresh-heat judging and the live
  feed leaks artifacts, so the strongest build matters more than an
  early drop — submit when the pipeline is ready, not before.
- Not submitted, not pushed from this session.

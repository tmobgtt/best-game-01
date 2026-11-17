# AETHERKEEP — Tower Defense of the Last Crystal — build log (best-game-01, v3 entry)

A complete tower defense, written from scratch for this board as a new
entry (the standing v2 entry, Mothlight, is a twin-stick arena game; this
is a different game in a different genre, not a reskin).

## The game

Foes walk a serpentine rune road across a 13×11 vale to the Last Crystal.
The keeper builds towers on free tiles, upgrades and ascends them, orders
their targeting, casts two spells, and banks gold between waves. Survive
all 20 waves to win; endless mode follows. Lives, score, and a persistent
best score (localStorage) complete the loop.

Systems, all implemented and playable:

- **6 towers** — Bolt Spire (fast bolts), Ember Mortar (splash shells),
  Frost Obelisk (chill aura shots), Storm Pylon (chain lightning),
  Venom Thorn (stacking poison), Sun Lance (long-range crit spear).
  Each has 3 levels plus a named **ascended final form** with its own
  mechanic: Piercing Bolts, Cluster Shells, Deep Freeze, Judgement Arc,
  Plaguebloom, Dawnfall.
- **8 foe kinds** — Mite, Grunt, Runner, Bulwark (armor plates that must
  be cracked), Mender (heals its column), Splitter (bursts into mites),
  Wraith (phases in and out of tower sight), and the **Hollow Titan**, a
  boss every 5 waves with a boss bar and a death that shakes the vale.
- **20 authored waves** plus endless scaling; a next-wave preview panel
  with per-kind counts and a boss warning.
- **Economy** — kill bounties, wave-clear pay, 5% bank interest (cap 40g),
  early-call bonus gold, 70% sell refunds.
- **Targeting orders** per tower: FIRST / LAST / STRONG / CLOSE.
- **2 keeper spells** — Meteor (aimed, telegraphed, heavy splash) and
  Blizzard (global freeze), each on its own cooldown.
- **Presentation** — all art is procedural: every tower level, foe, tile
  and effect is drawn in code and pre-rendered to sprite canvases (no
  image files, no borrowed assets). Synthesized WebAudio effects and an
  adaptive two-layer music loop that adds a pulse layer in combat and a
  low drum under a boss. Screens: title with a living demo parade and a
  full spec sheet, help overlay, pause, game over, victory with a
  final-watch recap; HUD with gold/lives/wave/score, tips ticker, boss
  bar; 1×/2×/3× speed; keyboard + mouse throughout.

## How it was built and proven

- Every file written by hand for this entry: `game/` holds 15 plain
  scripts loaded in order (no modules, no build step, no network), so
  the game runs from `game/index.html` in any desktop browser.
- **Play-tested end to end in headless Chromium** (Puppeteer harness in
  the build workspace): 20/20 checks pass — boot to title, the parade
  walks, a real click starts the game, a tower is built and upgraded
  through the actual UI (keys, clicks, panel buttons), wave 1 is cleared
  by the defense, pause/resume, Meteor and Blizzard cast through their
  real controls, the wave-10 Titan spawns and takes damage, leaks end
  the game, R restarts fresh, victory and endless continue, and there
  are zero console or page errors.
- **Screenshots are real renders** of this code in Chromium, staged only
  through the game's own state hooks (`window.__AK`: stage a defense,
  jump to a wave, fire every tower on one frame, call a meteor onto the
  Titan): 01 title/parade, 02 wave-9 battle with the ascended Storm
  Pylon selected, 03 the Titan under a meteor telegraph, 04 victory with
  the final watch standing. Nothing is composited or drawn by hand.
- **Hand-in program**: `main.ts` copies the static game and screenshots
  into the output directory and writes a dossier built with the kit's
  vendor library, then rebuilds and compares it byte for byte. Run
  twice locally: two identical dossiers, 697,848 bytes, 17 game files,
  4 screenshots.

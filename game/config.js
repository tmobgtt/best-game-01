// config.js — every balance table and the board layout live here, so the
// rest of the code is logic only. AETHERKEEP: defend the Aether Crystal at
// the end of the rune road through 20 waves.
"use strict";

AK.CFG = {
  W: 1280, H: 800,
  TILE: 64, COLS: 13, ROWS: 11,
  MAP_X: 14, MAP_Y: 66,           // pixel origin of the grid
  HEAD_H: 54,                     // header bar height
  SIDE_X: 862,                    // sidebar left edge
  START_GOLD: 230,
  START_LIVES: 20,
  MAX_WAVE: 20,
  SELL_RATE: 0.7,                 // refund fraction of gold invested
  INTEREST: 0.05, INTEREST_CAP: 40,
  EARLY_BONUS_PER_SEC: 2,         // gold per second of intermission skipped
  LEAK_FLASH: 0.55,
};

// The rune road, in tile coordinates. Enemies enter at the left of row 2,
// serpentine down the vale, and strike the crystal gate at the right of
// row 10. The crystal itself stands on tile (12, 10).
AK.PATH_TILES = [
  [-1, 2], [10, 2], [10, 5], [2, 5], [2, 8], [11, 8], [11, 10], [14, 10],
];
// Tiles nobody may build on: ponds and rubble off the road.
AK.BLOCKED = { "5,0": "pond", "6,0": "pond", "12,0": "rubble", "0,7": "pond", "6,10": "rubble", "12,4": "pond" };
AK.CRYSTAL_TILE = [12, 10];

// Tower kinds. dmg/rate/range are level 1; growth applies per level.
// ascend: the final form a level-3 tower can wake into.
AK.TOWERS = {
  bolt: {
    name: "Bolt Spire", key: "1", cost: 50, range: 152, dmg: 9, rate: 3.4,
    projSpeed: 560, color: "#ffd75e", desc: "Fast bolts, honest work.",
    growth: { dmg: 1.75, range: 10, rate: 1.12 },
    ascend: { name: "TEMPEST CROWN", cost: 150, note: "Strikes 3 targets at once." },
  },
  mortar: {
    name: "Ember Mortar", key: "2", cost: 80, range: 196, dmg: 27, rate: 0.55,
    projSpeed: 330, splash: 58, color: "#ff8a4d", desc: "Lobbed shells, wide splash.",
    growth: { dmg: 1.8, range: 12, rate: 1.08 },
    ascend: { name: "SUNFALL", cost: 220, note: "Huge splash; shells leave burning ground." },
  },
  frost: {
    name: "Frost Obelisk", key: "3", cost: 60, range: 134, dmg: 4, rate: 2.1,
    projSpeed: 430, slowPct: 0.45, slowDur: 1.6, color: "#7fe3ff", desc: "Chills everything it touches.",
    growth: { dmg: 1.7, range: 10, rate: 1.1 },
    ascend: { name: "ABSOLUTE ZERO", cost: 170, note: "Deeper chill, a chance to freeze solid, slowing aura." },
  },
  storm: {
    name: "Storm Pylon", key: "4", cost: 100, range: 164, dmg: 15, rate: 1.05,
    projSpeed: 0, chain: 3, color: "#b78cff", desc: "Lightning that leaps between foes.",
    growth: { dmg: 1.75, range: 10, rate: 1.1 },
    ascend: { name: "JUDGEMENT ARC", cost: 240, note: "Chains to 6 foes, barely weaker per leap." },
  },
  venom: {
    name: "Venom Thorn", key: "5", cost: 55, range: 138, dmg: 3, rate: 1.7,
    projSpeed: 460, poison: 7, poisonDur: 3, color: "#8dff6e", desc: "Weak sting, cruel poison.",
    growth: { dmg: 1.6, range: 10, rate: 1.1 },
    ascend: { name: "PLAGUE HEART", cost: 160, note: "Poison stacks higher and spreads on death." },
  },
  lance: {
    name: "Sun Lance", key: "6", cost: 120, range: 268, dmg: 58, rate: 0.5,
    projSpeed: 900, critC: 0.2, critM: 2, color: "#fff3a0", desc: "A slow spear of dawn. Crits.",
    growth: { dmg: 1.85, range: 14, rate: 1.06 },
    ascend: { name: "DAWN SPEAR", cost: 260, note: "Crits often and threefold." },
  },
};
AK.TOWER_ORDER = ["bolt", "mortar", "frost", "storm", "venom", "lance"];
// cost to go from level n to n+1, as a multiple of base cost; ascend separate.
AK.UPGRADE_MULT = { 1: 0.8, 2: 1.25 };

// Enemy kinds. armor is flat reduction per hit (min 1 damage through).
AK.ENEMIES = {
  mite:    { name: "Mite",     hp: 16,  speed: 47, bounty: 4,  leak: 1, r: 11, armor: 0, color: "#c9a2ff" },
  grunt:   { name: "Grunt",    hp: 44,  speed: 34, bounty: 6,  leak: 1, r: 14, armor: 0, color: "#ff9d6e" },
  runner:  { name: "Runner",   hp: 24,  speed: 82, bounty: 6,  leak: 1, r: 11, armor: 0, color: "#ffe066" },
  bulwark: { name: "Bulwark",  hp: 150, speed: 26, bounty: 11, leak: 2, r: 17, armor: 4, color: "#9fb4d8" },
  mender:  { name: "Mender",   hp: 60,  speed: 32, bounty: 13, leak: 1, r: 14, armor: 0, color: "#7dffb0", heal: 9, healRange: 96 },
  splitter:{ name: "Splitter", hp: 70,  speed: 36, bounty: 8,  leak: 1, r: 15, armor: 0, color: "#ff7dd1", splits: 2 },
  wraith:  { name: "Wraith",   hp: 52,  speed: 54, bounty: 12, leak: 1, r: 13, armor: 0, color: "#aef4ff", evade: 0.28 },
  titan:   { name: "Hollow Titan", hp: 2600, speed: 15, bounty: 160, leak: 10, r: 30, armor: 2, color: "#ff5d7a", boss: true },
};

// Wave compositions: [kind, count, gapSeconds]. HP scales per wave in waves.js.
AK.WAVES = [
  [["mite", 8, 0.9]],
  [["mite", 10, 0.8], ["grunt", 3, 1.2]],
  [["grunt", 8, 0.9], ["mite", 6, 0.6]],
  [["runner", 8, 0.55], ["grunt", 5, 1.0]],
  [["grunt", 8, 0.8], ["titan", 1, 1.0], ["mite", 8, 0.7]],
  [["splitter", 7, 0.9], ["runner", 6, 0.5]],
  [["mender", 3, 1.4], ["grunt", 10, 0.7], ["mite", 8, 0.6]],
  [["bulwark", 6, 1.1], ["runner", 8, 0.5]],
  [["wraith", 9, 0.8], ["splitter", 5, 0.9]],
  [["bulwark", 5, 1.2], ["titan", 1, 1.0], ["wraith", 6, 0.8]],
  [["runner", 16, 0.38], ["mender", 2, 1.6]],
  [["splitter", 10, 0.7], ["bulwark", 5, 1.1]],
  [["wraith", 12, 0.65], ["grunt", 10, 0.6]],
  [["mender", 4, 1.2], ["bulwark", 7, 1.0], ["runner", 8, 0.45]],
  [["titan", 1, 1.0], ["splitter", 8, 0.8], ["wraith", 6, 0.7]],
  [["runner", 20, 0.3], ["wraith", 8, 0.6]],
  [["bulwark", 10, 0.9], ["mender", 3, 1.3]],
  [["splitter", 14, 0.55], ["wraith", 10, 0.55]],
  [["grunt", 18, 0.45], ["bulwark", 8, 0.9], ["mender", 3, 1.2]],
  [["titan", 1, 1.0], ["wraith", 10, 0.6], ["runner", 14, 0.35], ["bulwark", 6, 1.0]],
];
AK.HP_GROWTH = 0.16; // +16% enemy hp per wave after the first

AK.ABILITIES = {
  meteor:   { name: "Meteor", key: "Q", cd: 40, dmg: 330, radius: 96, color: "#ffb04d", desc: "Call down a burning rock. Click to aim, then click the field." },
  blizzard: { name: "Blizzard", key: "W", cd: 55, freeze: 2.6, color: "#9fe8ff", desc: "Freeze every foe on the road solid." },
};

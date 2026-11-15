// config.js — every balance number, enemy definition, upgrade and blessing
// for MOTHLIGHT: The Hollow Queen lives in this one file, so the game's
// tuning can be read (and rebalanced) without touching any system code.

const CFG = {
  width: 1280,
  height: 800,
  playerRadius: 14,
  playerSpeed: 268,
  playerFireRate: 5.5,        // sparks per second before upgrades
  playerDamage: 1,
  bulletSpeed: 640,
  bulletLife: 0.9,            // seconds before a spark fades
  dashTime: 0.16,             // seconds of dash
  dashSpeed: 980,
  dashCooldown: 1.5,
  hurtInvulnTime: 1.25,       // mercy invulnerability after losing a heart
  startHearts: 3,
  heartEveryWaves: 0,         // hearts come from drafts and drops, not a timer
  comboWindow: 2.6,           // seconds to keep a kill chain alive
  comboPerStep: 6,            // kills per multiplier step
  comboMax: 8,
  shardChance: 0.34,          // chance a kill drops a star shard
  blessingTime: 12,           // seconds a picked blessing lasts
  bossEvery: 5,               // a boss guards every fifth wave
  intermissionTime: 2.2,      // banner pause before a wave pours in
  eliteChanceBase: 0.07,      // from wave 4, scaled gently by wave
  spawnEdgeMargin: 36,
};

// Enemy definitions. cost is the wave-budget price; score is the base value
// before the combo multiplier; unlock is the first wave the type may appear.
const ENEMY_TYPES = {
  mini: {
    name: "Glooming", radius: 9, hp: 1, speed: 148, cost: 1, score: 25,
    unlock: 1, color: "#8f7bd8", dark: "#4b3a7a",
  },
  moth: {
    name: "Shadow Moth", radius: 14, hp: 3, speed: 104, cost: 2, score: 50,
    unlock: 1, color: "#a78bfa", dark: "#5b439e",
  },
  dart: {
    name: "Thorn Dart", radius: 11, hp: 2, speed: 92, cost: 3, score: 80,
    unlock: 2, color: "#f472b6", dark: "#9d2f66",
  },
  spitter: {
    name: "Gloom Spitter", radius: 15, hp: 4, speed: 62, cost: 4, score: 100,
    unlock: 3, color: "#34d399", dark: "#166b4d",
  },
  beetle: {
    name: "Ember Beetle", radius: 19, hp: 14, speed: 46, cost: 6, score: 150,
    unlock: 3, color: "#fb923c", dark: "#8a3c12",
  },
  splitter: {
    name: "Puffball Husk", radius: 16, hp: 6, speed: 70, cost: 5, score: 110,
    unlock: 4, color: "#facc15", dark: "#8a6d0d",
  },
  weaver: {
    name: "Night Weaver", radius: 13, hp: 5, speed: 118, cost: 4, score: 120,
    unlock: 6, color: "#38bdf8", dark: "#155e80",
  },
};

// The Hollow Queen. hp is computed per boss wave in waves.js.
const BOSS_DEF = {
  name: "THE HOLLOW QUEEN",
  radius: 46,
  baseHp: 120,
  hpPerWave: 21,              // wave 5 -> 225, wave 10 -> 330, wave 15 -> 435
  speed: 58,
  score: 1500,
  color: "#e9d5ff",
  dark: "#7e22ce",
};

// Timed blessings granted by star shards, granted in rotation so a player
// who keeps diving for shards cycles through all four.
const BLESSINGS = [
  { id: "spread", name: "SPREAD", color: "#facc15", desc: "+2 fan sparks" },
  { id: "rapid", name: "RAPID", color: "#fb923c", desc: "+65% fire rate" },
  { id: "aegis", name: "AEGIS", color: "#38bdf8", desc: "a shield that eats one hit" },
  { id: "blaze", name: "BLAZE", color: "#f87171", desc: "sparks ignite what they touch" },
];

// The between-wave draft pool. apply() lives in upgrades.js; this table is
// pure data: what the card says, how many stacks may be taken, and the
// weight the roll gives it.
const UPGRADE_POOL = [
  { id: "twin",    name: "Twin Sparks",   icon: "twin",    max: 4, weight: 10,
    desc: "+1 spark per volley, fanned wide." },
  { id: "rapid",   name: "Rapid Lantern", icon: "rapid",   max: 4, weight: 10,
    desc: "+22% fire rate." },
  { id: "bright",  name: "Bright Sparks", icon: "bright",  max: 4, weight: 10,
    desc: "+1 spark damage." },
  { id: "pierce",  name: "Piercing Light", icon: "pierce", max: 3, weight: 7,
    desc: "Sparks pass through +1 enemy." },
  { id: "bounce",  name: "Ricochet",      icon: "bounce",  max: 2, weight: 6,
    desc: "A spent spark leaps to the nearest foe." },
  { id: "ember",   name: "Ember Rounds",  icon: "ember",   max: 2, weight: 7,
    desc: "Hits set enemies burning." },
  { id: "frost",   name: "Frost Rounds",  icon: "frost",   max: 2, weight: 7,
    desc: "Hits chill enemies, slowing them." },
  { id: "swift",   name: "Swift Wick",    icon: "swift",   max: 3, weight: 8,
    desc: "+11% keeper speed." },
  { id: "longdash", name: "Long Dash",    icon: "dash",    max: 3, weight: 8,
    desc: "Dash recharges 25% faster, reaches further." },
  { id: "magnet",  name: "Magnet Bloom",  icon: "magnet",  max: 3, weight: 8,
    desc: "+70% shard pull radius." },
  { id: "heart",   name: "Heart of the Garden", icon: "heart", max: 3, weight: 6,
    desc: "+1 max heart, and mend one now." },
  { id: "aegis",   name: "Aegis Ring",    icon: "aegis",   max: 2, weight: 6,
    desc: "A shield that eats one hit, regrown each wave." },
  { id: "orbit",   name: "Orbit Wisp",    icon: "orbit",   max: 2, weight: 6,
    desc: "A guardian spark circles you, burning foes." },
  { id: "charm",   name: "Combo Charm",   icon: "charm",   max: 2, weight: 7,
    desc: "Combo chains last 60% longer." },
];

// Named wave events. The director picks at most one per non-boss wave from
// wave 3 on; the banner announces it so the player can brace.
const WAVE_EVENTS = [
  { id: "surge", name: "MOTH SURGE", only: "mini", note: "a swarm pours in" },
  { id: "emberfall", name: "EMBERFALL", only: "beetle", note: "armor on the march" },
  { id: "dartstorm", name: "DART STORM", only: "dart", note: "they lunge together" },
];

// THE LIGHT LADDER — the game's headline mechanic. The lantern does not
// stay what it was: at each named wave it visibly grows. The pool of
// light widens every single wave; at wave 3 it learns to pulse, at wave 4
// creatures standing in it are light-struck and take bonus damage, at
// wave 5 a second flame joins it, and the pulses keep quickening.
// lightStageFor(wave) resolves the current rung.
const LIGHT_STAGES = [
  { wave: 1, name: "KINDLED", note: "a bare flame against the dark", pulse: 0, pulseDmg: 0, struck: false, twin: false },
  { wave: 2, name: "EMBER VEIL", note: "the light widens, the dark thins", pulse: 0, pulseDmg: 0, struck: false, twin: false },
  { wave: 3, name: "DAWNBREAK RING", note: "the lantern learns to pulse", pulse: 6, pulseDmg: 1, struck: false, twin: false },
  { wave: 4, name: "PRISM HEART", note: "foes in the light are light-struck", pulse: 6, pulseDmg: 1, struck: true, twin: false },
  { wave: 5, name: "TWIN FLAME", note: "a second flame keeps the vigil", pulse: 5.4, pulseDmg: 1, struck: true, twin: true },
  { wave: 7, name: "REFRACTION", note: "the pulses bite deeper", pulse: 5, pulseDmg: 2, struck: true, twin: true },
  { wave: 9, name: "CORONA", note: "a small sun, and still growing", pulse: 4.2, pulseDmg: 2, struck: true, twin: true },
];

function lightStageFor(wave) {
  let stage = LIGHT_STAGES[0];
  for (const s of LIGHT_STAGES) if (wave >= s.wave) stage = s;
  return stage;
}

// FINAL FORMS — every draft blessing, maxed out, wakes into a stronger
// named shape. The card shows the form before you commit to it, the
// game-over screen gilds the ones you woke, and player.js implements
// each effect from the stack counts.
const FINAL_FORMS = {
  twin:     { name: "CONSTELLATION", desc: "+1 spark, and sparks bend toward foes." },
  rapid:    { name: "SUNCORE ENGINE", desc: "every 4th volley burns twice as bright." },
  bright:   { name: "WHITE FLAME", desc: "kills burst in a ring of fire." },
  pierce:   { name: "THE LONG DAWN", desc: "sparks pierce +1 more enemy." },
  bounce:   { name: "ECHO LANTERN", desc: "sparks ricochet +1 more time." },
  ember:    { name: "WILDFIRE HEART", desc: "burns bite twice as fast." },
  frost:    { name: "FIRST SNOW", desc: "chills bite deeper and last longer." },
  swift:    { name: "GALELIGHT", desc: "faster still, and the dash returns sooner." },
  longdash: { name: "COMET'S TAIL", desc: "the dash sears what it crosses." },
  magnet:   { name: "EVENTIDE PULL", desc: "shards answer from anywhere in the dark." },
  heart:    { name: "EVERGREEN", desc: "each new wave mends one heart." },
  aegis:    { name: "HALO OF DAWN", desc: "the shield regrows, even mid-wave." },
  orbit:    { name: "BINARY SUNS", desc: "a third guardian joins the circle." },
  charm:    { name: "PERFECT CHAIN", desc: "the combo can climb to x10." },
};

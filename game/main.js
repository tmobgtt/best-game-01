// Mothlight: the orchestrator. Owns the canvas, the midnight garden, the
// game states (title, playing, paused, dying, game over), the fixed-feel
// loop, collisions, combo scoring, star shards and the render order.
// The other modules each do one job; this file conducts them.

import { createAudioEngine } from "./audio.js";
import { createInput } from "./input.js";
import { createParticles } from "./particles.js";
import {
  makeEnemy, updateEnemy, drawEnemy, drawOrb,
  createWaveDirector, pickSpawnPoint,
} from "./enemies.js";
import {
  BLESSINGS, BLESSING_CYCLE, createPlayer, updatePlayer,
  isInvulnerable, grantBlessing, tryFire, drawBullets, drawPlayer,
} from "./player.js";
import { drawHud, drawTouchControls, createAnnouncer } from "./hud.js";
import { drawTitleScreen, drawPauseOverlay, drawGameOverScreen } from "./screens.js";

const W = 1280;
const H = 800;
const COMBO_WINDOW = 2.5;
const SHARD_DROP_CHANCE = 0.13;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const audio = createAudioEngine();
const input = createInput(canvas, W, H);
const fx = createParticles();
const announcer = createAnnouncer();
let director = createWaveDirector();

let state = "title"; // title | playing | paused | dying | gameover
let player = createPlayer(W / 2, H / 2 + 60);
let enemies = [];
let bullets = [];
let orbs = [];
let shards = [];
let ambientMoths = [];
let score = 0;
let kills = 0;
let combo = 0;
let comboTimer = 0;
let bestMultiplier = 1;
let shardDrops = 0;
let phase = "active"; // active | rest
let restTimer = 0;
let shake = 0;
let hitStop = 0;
let hurtFlash = 0;
let deathTimer = 0;
let gameOverAt = 0;
let time = 0;
let best = loadBest();

function loadBest() {
  try {
    return Number(window.localStorage.getItem("mothlight-best")) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    window.localStorage.setItem("mothlight-best", String(best));
  } catch {
    // private modes may refuse storage; the in-memory best still stands
  }
}

function multiplier() {
  return Math.min(8, 1 + Math.floor(combo / 8));
}

// ---------- the garden, painted once onto an offscreen canvas ----------

function paintGarden() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0b0e22");
  sky.addColorStop(0.6, "#080a18");
  sky.addColorStop(1, "#05060f");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  for (let i = 0; i < 150; i++) {
    g.globalAlpha = 0.25 + Math.random() * 0.6;
    g.fillStyle = "#dfe6ff";
    g.fillRect(Math.random() * W, Math.random() * H * 0.55, 1.6, 1.6);
  }
  g.globalAlpha = 1;

  // the moon and its halo
  const moon = g.createRadialGradient(1090, 110, 10, 1090, 110, 150);
  moon.addColorStop(0, "rgba(240,240,255,0.5)");
  moon.addColorStop(0.25, "rgba(210,215,255,0.12)");
  moon.addColorStop(1, "rgba(200,205,255,0)");
  g.fillStyle = moon;
  g.fillRect(920, -60, 340, 340);
  g.fillStyle = "#e8eaf6";
  g.beginPath();
  g.arc(1090, 110, 34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(170,175,205,0.35)";
  g.beginPath();
  g.arc(1078, 100, 7, 0, Math.PI * 2);
  g.arc(1102, 122, 5, 0, Math.PI * 2);
  g.arc(1096, 96, 4, 0, Math.PI * 2);
  g.fill();

  // layered hills
  for (const [baseY, amp, color] of [[560, 26, "#0d1128"], [640, 34, "#090c1c"]]) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) {
      g.lineTo(x, baseY + Math.sin(x * 0.006 + baseY) * amp + Math.sin(x * 0.017) * 8);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();
  }

  // glowing blooms scattered over the field
  const bloomColors = ["#ffd166", "#ff9ecf", "#8affd1", "#b388ff", "#ffb35c"];
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * W;
    const y = 470 + Math.random() * 310;
    const color = bloomColors[Math.floor(Math.random() * bloomColors.length)];
    g.strokeStyle = "rgba(30,60,44,0.8)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x, y + 8);
    g.lineTo(x, y);
    g.stroke();
    const glow = g.createRadialGradient(x, y, 0, x, y, 9);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 0.5 + Math.random() * 0.4;
    g.fillStyle = glow;
    g.beginPath();
    g.arc(x, y, 9, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // grass along the bottom edge
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * W;
    const tall = 14 + Math.random() * 30;
    g.strokeStyle = `rgba(${14 + Math.random() * 16},${44 + Math.random() * 26},${30 + Math.random() * 14},0.9)`;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x, H);
    g.quadraticCurveTo(x + (Math.random() - 0.5) * 8, H - tall * 0.6, x + (Math.random() - 0.5) * 14, H - tall);
    g.stroke();
  }

  // vignette
  const vig = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.42)");
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);

  return c;
}

const garden = paintGarden();
fx.seedMotes(W, H, 26);

// ---------- run lifecycle ----------

function startRun() {
  player = createPlayer(W / 2, H / 2 + 60);
  enemies = [];
  bullets = [];
  orbs = [];
  shards = [];
  score = 0;
  kills = 0;
  combo = 0;
  comboTimer = 0;
  bestMultiplier = 1;
  shardDrops = 0;
  phase = "active";
  shake = 0;
  hitStop = 0;
  hurtFlash = 0;
  fx.clear();
  fx.seedMotes(W, H, 26);
  director = createWaveDirector();
  state = "playing";
  beginWave();
  audio.uiClick();
}

function beginWave() {
  const n = director.startNextWave();
  phase = "active";
  announcer.show(`WAVE ${n}`, n === 1 ? "the moths are coming" : waveFlavor(n), 1.6);
  audio.waveHorn();
}

function waveFlavor(n) {
  if (n === 2) return "something armoured stirs…";
  if (n === 3) return "spitters in the dark…";
  if (n === 4) return "golden wings among them";
  if (n % 4 === 0) return "hold, keeper, hold";
  return ["they hunger for the light", "the garden believes in you", "brighter, keeper"][n % 3];
}

function endRun() {
  state = "gameover";
  gameOverAt = time;
  if (score > best) {
    best = score;
    saveBest();
  }
  audio.gameOver();
}

// ---------- combat ----------

function killEnemy(e) {
  kills++;
  const mult = multiplier();
  const points = e.score * mult;
  score += points;
  combo++;
  comboTimer = COMBO_WINDOW;
  const newMult = multiplier();
  if (newMult > mult) {
    bestMultiplier = Math.max(bestMultiplier, newMult);
    audio.comboUp(newMult);
    fx.floatText(player.x, player.y - 34, `COMBO ×${newMult}`, { color: "#ffb35c", size: 24 });
  }
  fx.floatText(e.x, e.y - 10, `+${points}`, {
    color: e.kind === "beetle" ? "#ffb35c" : "#ffe9b0",
    size: e.kind === "moth" ? 16 : 20,
  });

  if (e.kind === "beetle") {
    fx.burst(e.x, e.y, { count: 26, color: "#ff8a5c", speed: 300, life: 0.55, size: 3.6 });
    fx.burst(e.x, e.y, { count: 12, color: "#ffd166", speed: 170, life: 0.4, size: 2.6 });
    fx.ring(e.x, e.y, { color: "#ff8a5c", maxRadius: 74, life: 0.35 });
    audio.beetleCrack();
    hitStop = Math.max(hitStop, 0.045);
    shake = Math.max(shake, 6);
  } else if (e.kind === "spitter") {
    fx.burst(e.x, e.y, { count: 16, color: "#b388ff", speed: 230, life: 0.45, size: 3 });
    fx.petals(e.x, e.y, 7, "#7a5cff");
    audio.spitterPop();
  } else {
    fx.burst(e.x, e.y, { count: 12, color: e.kind === "elite" ? "#ffd166" : "#cdbcf5", speed: 210, life: 0.4, size: 2.8 });
    fx.petals(e.x, e.y, 6, e.kind === "elite" ? "#ffd166" : "#8a7bd8");
    audio.mothPop();
  }

  if (Math.random() < SHARD_DROP_CHANCE) {
    const kind = BLESSING_CYCLE[shardDrops % BLESSING_CYCLE.length];
    shardDrops++;
    shards.push({ x: e.x, y: e.y, kind, t: 0, life: 9 });
    fx.ring(e.x, e.y, { color: BLESSINGS[kind].color, maxRadius: 40, life: 0.4, width: 2 });
  }
}

function hurtPlayer(fromX, fromY) {
  if (player.blessing === "aegis") {
    player.blessing = null;
    player.invulnTime = 1.3;
    fx.ring(player.x, player.y, { color: "#b388ff", maxRadius: 66, life: 0.4 });
    fx.burst(player.x, player.y, { count: 14, color: "#b388ff", speed: 200, life: 0.4, size: 3 });
    fx.floatText(player.x, player.y - 30, "AEGIS SPENT", { color: "#d9b8ff", size: 17 });
    audio.dash();
    return;
  }
  player.hearts--;
  player.invulnTime = 1.3;
  hurtFlash = 0.4;
  hitStop = Math.max(hitStop, 0.05);
  shake = Math.max(shake, 13);
  audio.playerHurt();
  fx.burst(player.x, player.y, { count: 20, color: "#ff8a75", speed: 260, life: 0.5, size: 3.2 });
  const dx = player.x - fromX;
  const dy = player.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  player.vx += (dx / len) * 320;
  player.vy += (dy / len) * 320;
  if (player.hearts <= 0) {
    state = "dying";
    deathTimer = 0.95;
    fx.burst(player.x, player.y, { count: 46, color: "#ffd98a", speed: 380, life: 0.8, size: 3.6 });
    fx.burst(player.x, player.y, { count: 24, color: "#fff3d6", speed: 200, life: 0.9, size: 2.6 });
    fx.ring(player.x, player.y, { color: "#ffd98a", maxRadius: 150, life: 0.6, width: 4 });
    shake = 18;
  }
}

function updateCombat(dt) {
  // bullets fly
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
      bullets.splice(i, 1);
    }
  }
  // orbs drift
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (o.life <= 0) orbs.splice(i, 1);
  }
  // bullets meet enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.spawnIn > 0) continue;
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const rr = e.radius + b.radius;
      if (Math.abs(b.x - e.x) < rr && Math.abs(b.y - e.y) < rr &&
          Math.hypot(b.x - e.x, b.y - e.y) < rr) {
        bullets.splice(j, 1);
        e.hp--;
        e.flash = 1;
        const kb = e.kind === "beetle" ? 26 : 74;
        const bl = Math.hypot(b.vx, b.vy) || 1;
        e.x += (b.vx / bl) * kb * 0.14;
        e.y += (b.vy / bl) * kb * 0.14;
        fx.burst(b.x, b.y, { count: 3, color: "#ffe9b0", speed: 130, life: 0.22, size: 2 });
        if (e.hp <= 0) {
          enemies.splice(i, 1);
          killEnemy(e);
        } else {
          audio.enemyHit();
        }
        break;
      }
    }
  }
  // gentle separation so the swarm reads as individuals
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rr = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < rr * rr) {
        const d = Math.sqrt(d2);
        const push = ((rr - d) / d) * 14 * dt;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
    }
  }
  // enemies and orbs meet the wisp
  if (state === "playing" && !isInvulnerable(player)) {
    for (const e of enemies) {
      if (e.spawnIn > 0) continue;
      const rr = e.radius + player.radius - 2;
      if (Math.hypot(e.x - player.x, e.y - player.y) < rr) {
        hurtPlayer(e.x, e.y);
        break;
      }
    }
    if (state === "playing" && !isInvulnerable(player)) {
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        if (Math.hypot(o.x - player.x, o.y - player.y) < o.radius + player.radius - 2) {
          orbs.splice(i, 1);
          hurtPlayer(o.x, o.y);
          break;
        }
      }
    }
  }
  // shards drift toward a nearby keeper, then grant their blessing
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.t += dt;
    s.life -= dt;
    if (s.life <= 0) {
      shards.splice(i, 1);
      continue;
    }
    const d = Math.hypot(player.x - s.x, player.y - s.y);
    if (d < 130 && state === "playing") {
      s.x += ((player.x - s.x) / d) * 260 * dt;
      s.y += ((player.y - s.y) / d) * 260 * dt;
    }
    if (d < player.radius + 17 && state === "playing") {
      shards.splice(i, 1);
      grantBlessing(player, s.kind);
      audio.pickup();
      announcer.show(`BLESSING — ${BLESSINGS[s.kind].name}`, blessingFlavor(s.kind), 1.15);
      fx.burst(player.x, player.y, { count: 16, color: BLESSINGS[s.kind].color, speed: 190, life: 0.45, size: 3 });
    }
  }
}

function blessingFlavor(kind) {
  if (kind === "spread") return "sparks fan three ways";
  if (kind === "rapid") return "the lantern burns quicker";
  return "a shield of pale light";
}

// ---------- per-state updates ----------

function updatePlaying(dt) {
  updatePlayer(player, dt, input, W, H, fx, audio);
  tryFire(player, input.isFiring(), bullets, audio);

  director.update(dt, (kind) => {
    const p = pickSpawnPoint(W, H, player);
    enemies.push(makeEnemy(kind, p.x, p.y, director.speedScale()));
  });
  for (const e of enemies) updateEnemy(e, dt, player, orbs, audio);
  updateCombat(dt);

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  if (phase === "active" && director.pending === 0 && enemies.length === 0) {
    phase = "rest";
    restTimer = 2.3;
    if (director.wave % 4 === 0 && player.hearts < player.maxHearts) {
      player.hearts++;
      audio.heartGain();
      announcer.show("THE GARDEN BREATHES", "+1 heart, keeper", 1.5);
    }
  } else if (phase === "rest") {
    restTimer -= dt;
    if (restTimer <= 0) beginWave();
  }

  if (input.wasPressed("pause")) {
    state = "paused";
    audio.uiClick();
  }
}

function updateTitle(dt) {
  if (ambientMoths.length < 6 && Math.random() < dt * 1.4) {
    const kinds = ["moth", "moth", "beetle", "spitter"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    ambientMoths.push(makeEnemy(kind, Math.random() * W, -30, 0.55));
  }
  const wander = {
    x: W / 2 + Math.sin(time * 0.23) * 330,
    y: H / 2 + Math.cos(time * 0.31) * 190,
  };
  for (let i = ambientMoths.length - 1; i >= 0; i--) {
    const e = ambientMoths[i];
    updateEnemy(e, dt, wander, [], null);
    if (e.y > H + 50 || e.x < -60 || e.x > W + 60) ambientMoths.splice(i, 1);
  }
  player.bobPhase += dt * 2.4;
  if (Math.random() < dt * 2) {
    fx.burst(player.x + (Math.random() - 0.5) * 60, player.y - 10, {
      count: 2, color: "#ffd98a", speed: 40, life: 0.7, size: 2,
    });
  }
  if (input.wasPressed("start")) startRun();
}

function updateGameOver() {
  if (time - gameOverAt < 0.6) return;
  if (input.wasPressed("restart") || input.wasPressed("start")) startRun();
}

// ---------- drawing ----------

function drawShard(ctx, s) {
  const bob = Math.sin(s.t * 3.4) * 4;
  const blink = s.life < 2 ? (Math.floor(s.t * 9) % 2 === 0 ? 0.25 : 1) : 1;
  const color = BLESSINGS[s.kind].color;
  ctx.save();
  ctx.translate(s.x, s.y + bob);
  ctx.globalAlpha = blink;
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.3 * blink;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = blink;
  ctx.rotate(s.t * 1.8);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const a2 = a + Math.PI / 4;
    ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
    ctx.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWorld() {
  ctx.drawImage(garden, 0, 0, W, H);
  for (const s of shards) drawShard(ctx, s);
  for (const o of orbs) drawOrb(ctx, o);
  const shown = state === "title" ? ambientMoths : enemies;
  for (const e of shown) drawEnemy(ctx, e, time);
  drawBullets(ctx, bullets);
  if (state !== "dying" && state !== "gameover") drawPlayer(ctx, player, time);
  fx.draw(ctx, time);
}

function hudView() {
  return {
    w: W,
    h: H,
    score,
    best,
    wave: Math.max(1, director.wave),
    hearts: player.hearts,
    maxHearts: player.maxHearts,
    combo,
    comboFrac: combo > 0 ? comboTimer / COMBO_WINDOW : 0,
    multiplier: multiplier(),
    blessing: player.blessing,
    blessingFrac: player.blessing && player.blessingTime !== Infinity
      ? player.blessingTime / BLESSINGS[player.blessing].duration
      : null,
    dashFrac: 1 - player.dashCooldown / 1.5,
    enemiesLeft: director.pending + enemies.length,
    usingTouch: input.isUsingTouch(),
  };
}

function render() {
  ctx.save();
  if (shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }
  drawWorld();
  ctx.restore();

  if (hurtFlash > 0) {
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    grad.addColorStop(0, "rgba(255,60,40,0)");
    grad.addColorStop(1, `rgba(255,60,40,${0.4 * (hurtFlash / 0.4)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  if (state === "playing" || state === "paused" || state === "dying") {
    drawHud(ctx, hudView());
    drawTouchControls(ctx, input, hudView());
  }
  announcer.draw(ctx, W, H);

  if (state === "title") {
    drawTitleScreen(ctx, W, H, time, { best, usingTouch: input.isUsingTouch() });
  } else if (state === "paused") {
    drawPauseOverlay(ctx, W, H);
  } else if (state === "gameover") {
    drawGameOverScreen(ctx, W, H, time, {
      score,
      best,
      wave: director.wave,
      kills,
      bestMultiplier,
      isNewBest: score >= best && score > 0,
      usingTouch: input.isUsingTouch(),
    });
  }
}

// ---------- the loop ----------

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", fitCanvas);
fitCanvas();

window.addEventListener("pointerdown", () => audio.unlock());
window.addEventListener("keydown", () => audio.unlock());

let lastNow = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.033, (now - lastNow) / 1000);
  lastNow = now;

  if (hitStop > 0) {
    hitStop -= dt;
    dt *= 0.06;
  }
  if (state === "dying") dt *= 0.35;

  time += dt;
  shake *= Math.pow(0.001, dt);
  if (shake < 0.15) shake = 0;
  hurtFlash = Math.max(0, hurtFlash - dt * 1.6);
  announcer.update(dt);
  audio.updateMusic(dt, state === "playing");

  if (input.wasPressed("mute")) {
    audio.setMuted(!audio.isMuted());
  }

  if (state === "playing") updatePlaying(dt);
  else if (state === "title") updateTitle(dt);
  else if (state === "paused") {
    if (input.wasPressed("pause")) {
      state = "playing";
      audio.uiClick();
    }
  } else if (state === "dying") {
    for (const e of enemies) updateEnemy(e, dt, player, orbs, audio);
    updateCombat(dt);
    deathTimer -= dt / 0.35;
    if (deathTimer <= 0) endRun();
  } else if (state === "gameover") {
    updateGameOver();
  }

  fx.update(dt, W, H, time);
  render();
  input.clearPresses();
}

requestAnimationFrame(frame);

// a small handle so the maker's own tests can drive and verify the game
window.__mothlight = {
  state: () => state,
  score: () => score,
  wave: () => director.wave,
  hearts: () => player.hearts,
  enemies: () => enemies.length,
  combo: () => combo,
  start: () => startRun(),
  playerPos: () => ({ x: Math.round(player.x), y: Math.round(player.y) }),
  nearestEnemy: () => {
    let found = null;
    let bestD = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) {
        bestD = d;
        found = e;
      }
    }
    return found ? { x: Math.round(found.x), y: Math.round(found.y), kind: found.kind } : null;
  },
  snapshot: () => ({
    state, score, wave: director.wave, hearts: player.hearts,
    enemies: enemies.length, bullets: bullets.length, combo,
    onScreen: enemies.filter((e) => e.x > -20 && e.x < W + 20 && e.y > -20 && e.y < H + 20).length,
  }),
};

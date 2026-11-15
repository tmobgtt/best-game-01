// Mothlight enemies: three shadow creatures that hunt the lantern light,
// plus the wave director that composes each wave and paces the spawns.
//   moth    — fast, fragile, flutters in with a wobbling flight path
//   beetle  — slow armoured tank, four hits, ember core shows through cracks
//   spitter — keeps its distance and lobs slow shadow orbs at the wisp
// Elites (from wave 4) are larger golden moths worth more and harder to kill.

export const ENEMY_STATS = {
  moth: { radius: 13, hp: 1, speed: 108, score: 50, color: "#5d5470" },
  elite: { radius: 17, hp: 2, speed: 96, score: 150, color: "#8a6d3b" },
  beetle: { radius: 20, hp: 4, speed: 54, score: 200, color: "#4a3b47" },
  spitter: { radius: 15, hp: 2, speed: 74, score: 120, color: "#3d4a5c" },
};

let nextEnemyId = 1;

export function makeEnemy(kind, x, y, speedScale) {
  const stats = ENEMY_STATS[kind];
  return {
    id: nextEnemyId++,
    kind,
    x, y,
    vx: 0, vy: 0,
    hp: stats.hp,
    maxHp: stats.hp,
    radius: stats.radius,
    speed: stats.speed * speedScale * (0.88 + Math.random() * 0.24),
    score: stats.score,
    seed: Math.random() * Math.PI * 2,
    fireTimer: 1.4 + Math.random() * 1.6,
    telegraph: 0,
    flash: 0,
    spawnIn: 0.35,
    wobblePhase: Math.random() * Math.PI * 2,
  };
}

export function updateEnemy(e, dt, player, orbs, sfx) {
  e.flash = Math.max(0, e.flash - dt * 6);
  if (e.spawnIn > 0) {
    e.spawnIn -= dt;
    return;
  }
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  if (e.kind === "moth" || e.kind === "elite") {
    e.wobblePhase += dt * 6;
    const wob = Math.sin(e.wobblePhase + e.seed) * 0.55;
    const px = -uy * wob;
    const py = ux * wob;
    e.vx = (ux + px) * e.speed;
    e.vy = (uy + py) * e.speed;
  } else if (e.kind === "beetle") {
    e.vx += (ux * e.speed - e.vx) * Math.min(1, dt * 2.2);
    e.vy += (uy * e.speed - e.vy) * Math.min(1, dt * 2.2);
  } else if (e.kind === "spitter") {
    const want = 300;
    let radial = 0;
    if (dist > want + 50) radial = 1;
    else if (dist < want - 50) radial = -1;
    const strafe = Math.sin(e.seed + performance.now() * 0.0004) * 0.6;
    e.vx = (ux * radial - uy * strafe) * e.speed;
    e.vy = (uy * radial + ux * strafe) * e.speed;
    e.fireTimer -= dt;
    e.telegraph = e.fireTimer < 0.45 && e.fireTimer > 0 ? 1 - e.fireTimer / 0.45 : 0;
    if (e.fireTimer <= 0) {
      e.fireTimer = 2.3 + Math.random() * 0.9;
      orbs.push({
        x: e.x, y: e.y,
        vx: ux * 245, vy: uy * 245,
        radius: 7, life: 3.6,
      });
      if (sfx) sfx.orbFire();
    }
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
}

let orbGlowSprite = null;

function getOrbGlowSprite() {
  if (orbGlowSprite) return orbGlowSprite;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(190,140,255,0.85)");
  grad.addColorStop(0.4, "rgba(120,70,200,0.45)");
  grad.addColorStop(1, "rgba(80,40,160,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  orbGlowSprite = c;
  return c;
}

export function drawOrb(ctx, orb) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const size = orb.radius * 4.8;
  ctx.drawImage(getOrbGlowSprite(), orb.x - size / 2, orb.y - size / 2, size, size);
  ctx.restore();
  ctx.fillStyle = "#2a1745";
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9a2ff";
  ctx.beginPath();
  ctx.arc(orb.x - 2, orb.y - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoth(ctx, e, time) {
  const flap = Math.sin(time * 26 + e.seed * 7) * 0.65;
  const angle = Math.atan2(e.vy, e.vx);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(angle + Math.PI / 2);
  const scale = e.spawnIn > 0 ? 1 - e.spawnIn / 0.35 : 1;
  ctx.scale(scale, scale);
  const body = e.flash > 0 ? "#e8e2f5" : ENEMY_STATS[e.kind].color;
  ctx.fillStyle = body;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(flap * side * 0.9);
    ctx.beginPath();
    ctx.ellipse(e.radius * 0.72, -e.radius * 0.1, e.radius * 0.78, e.radius * 0.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, e.radius * 0.42, e.radius * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = e.kind === "elite" ? "#ffd166" : "#ff5d73";
  ctx.beginPath();
  ctx.arc(-e.radius * 0.18, -e.radius * 0.32, 1.9, 0, Math.PI * 2);
  ctx.arc(e.radius * 0.18, -e.radius * 0.32, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBeetle(ctx, e, time) {
  const angle = Math.atan2(e.vy, e.vx);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(angle + Math.PI / 2);
  const scale = e.spawnIn > 0 ? 1 - e.spawnIn / 0.35 : 1;
  ctx.scale(scale, scale);
  const shell = e.flash > 0 ? "#efe6ee" : ENEMY_STATS.beetle.color;
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -e.radius);
  ctx.lineTo(0, e.radius);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, e.radius * 0.62, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  const crackGlow = 0.35 + 0.65 * (1 - e.hp / e.maxHp);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(255,120,60,${0.5 * crackGlow})`;
  ctx.beginPath();
  ctx.arc(0, 0, e.radius * 0.3 * crackGlow + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffb35c";
  ctx.beginPath();
  ctx.arc(-e.radius * 0.3, -e.radius * 0.72, 2.2, 0, Math.PI * 2);
  ctx.arc(e.radius * 0.3, -e.radius * 0.72, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpitter(ctx, e, time) {
  const bob = Math.sin(time * 3 + e.seed) * 2;
  ctx.save();
  ctx.translate(e.x, e.y + bob);
  const scale = e.spawnIn > 0 ? 1 - e.spawnIn / 0.35 : 1;
  ctx.scale(scale, scale);
  const body = e.flash > 0 ? "#e6edf7" : ENEMY_STATS.spitter.color;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -e.radius - 4);
  ctx.quadraticCurveTo(e.radius, -e.radius * 0.2, e.radius * 0.8, e.radius);
  ctx.quadraticCurveTo(0, e.radius * 0.6, -e.radius * 0.8, e.radius);
  ctx.quadraticCurveTo(-e.radius, -e.radius * 0.2, 0, -e.radius - 4);
  ctx.fill();
  const throat = 0.25 + e.telegraph * 0.75;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createRadialGradient(0, 2, 0, 0, 2, 12 + e.telegraph * 8);
  grad.addColorStop(0, `rgba(200,150,255,${0.75 * throat})`);
  grad.addColorStop(1, "rgba(140,80,220,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 2, 12 + e.telegraph * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#d9b8ff";
  ctx.beginPath();
  ctx.arc(-4, -6, 1.8, 0, Math.PI * 2);
  ctx.arc(4, -6, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawEnemy(ctx, e, time) {
  if (e.kind === "beetle") drawBeetle(ctx, e, time);
  else if (e.kind === "spitter") drawSpitter(ctx, e, time);
  else drawMoth(ctx, e, time);
  if (e.spawnIn > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(160,120,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 10 * (e.spawnIn / 0.35), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// The wave director: composes each wave, then releases its enemies a few at
// a time from the garden edges. Difficulty grows through count, composition,
// spawn pace and a gentle speed scale — never through unfair stats.
export function createWaveDirector() {
  let wave = 0;
  let queue = [];
  let spawnTimer = 0;
  let spawnInterval = 1;

  function compose(n) {
    const list = [];
    const moths = 6 + n * 4;
    const beetles = n >= 2 ? Math.floor((n - 1) * 1.6) : 0;
    const spitters = n >= 3 ? Math.floor((n - 2) * 1.3) : 0;
    for (let i = 0; i < moths; i++) list.push(n >= 4 && Math.random() < 0.08 ? "elite" : "moth");
    for (let i = 0; i < beetles; i++) list.push("beetle");
    for (let i = 0; i < spitters; i++) list.push("spitter");
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  return {
    get wave() { return wave; },
    get pending() { return queue.length; },
    speedScale() { return Math.min(1.5, 1 + (wave - 1) * 0.045); },
    startNextWave() {
      wave++;
      queue = compose(wave);
      spawnInterval = Math.max(0.34, 0.92 - wave * 0.05);
      spawnTimer = 0.2;
      return wave;
    },
    update(dt, spawn) {
      if (queue.length === 0) return;
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = spawnInterval * (0.7 + Math.random() * 0.6);
        // small bursts, growing with the wave, so the swarm presses in
        // packs instead of trickling one by one
        let burst = 1;
        if (wave >= 2 && Math.random() < 0.45) burst++;
        if (wave >= 5 && Math.random() < 0.3) burst++;
        while (burst-- > 0 && queue.length > 0) spawn(queue.shift());
      }
    },
  };
}

export function pickSpawnPoint(w, h, player) {
  for (let tries = 0; tries < 12; tries++) {
    const edge = Math.floor(Math.random() * 4);
    const margin = 30;
    let x, y;
    if (edge === 0) { x = Math.random() * w; y = -margin; }
    else if (edge === 1) { x = w + margin; y = Math.random() * h; }
    else if (edge === 2) { x = Math.random() * w; y = h + margin; }
    else { x = -margin; y = Math.random() * h; }
    if (Math.hypot(x - player.x, y - player.y) > 260) return { x, y };
  }
  return { x: -30, y: -30 };
}

// main.js — the orchestrator. It owns the canvas, the state machine
// (title, playing, draft, paused, dying, gameover), the garden backdrop,
// collisions, combo and score, pickups, and the juice budget: hit-stop,
// slow motion and screen shake are all spent here, where every system
// can ask for them. Everything else lives in its own file.

const Pickups = {
  pool: new Pool(90, () => ({ kind: "shard", x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 0 })),
  drop(kind, x, y) {
    const p = this.pool.obtain();
    if (!p) return;
    p.kind = kind; p.x = x; p.y = y;
    const a = rand(0, Math.PI * 2), sp = rand(30, 120);
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
    p.t = rand(0, 6); p.life = 14;
  },
  update(dt, game) {
    const player = game.player;
    this.pool.forEachAlive((p) => {
      p.t += dt; p.life -= dt;
      if (p.life <= 0) { p.alive = false; return; }
      p.vx *= Math.max(0, 1 - 3 * dt); p.vy *= Math.max(0, 1 - 3 * dt);
      const d2 = dist2(p.x, p.y, player.x, player.y);
      const magnetR = player.stats.globalMagnet ? 2400 : player.stats.magnetR;
      if (d2 < magnetR * magnetR) {
        const d = Math.sqrt(d2) || 1;
        const pull = 620 * (1 - d / (magnetR * 1.6));
        p.vx += ((player.x - p.x) / d) * pull * dt * 4;
        p.vy += ((player.y - p.y) / d) * pull * dt * 4;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (d2 < 30 * 30 && game.state === "playing") {
        p.alive = false;
        game.collectPickup(p);
      }
    });
  },
  draw(ctx) {
    this.pool.forEachAlive((p) => {
      if (p.life < 3 && Math.floor(p.t * 6) % 2) return;   // expiring blink
      const bobY = Math.sin(p.t * 3.2) * 3;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const gs = p.kind === "heart" ? 54 : 44;
      ctx.drawImage(Sprites.glow(p.kind === "heart" ? "#f87171" : "#facc15"),
        p.x - gs / 2, p.y + bobY - gs / 2, gs, gs);
      ctx.restore();
      if (p.kind === "heart") ctx.drawImage(Sprites.heartLit, p.x - 13, p.y + bobY - 13, 26, 26);
      else ctx.drawImage(Sprites.shardImg, p.x - 11, p.y + bobY - 11, 22, 22);
    });
  },
  clear() { this.pool.releaseAll(); },
};

const Game = {
  canvas: null,
  ctx: null,
  state: "title",
  time: 0,
  player: new Player(),
  score: 0,
  best: 0,
  newBest: false,
  kills: 0,
  combo: 0,
  comboT: 0,
  mult: 1,
  bestMult: 1,
  runTime: 0,
  shake: 0,
  hitStopT: 0,
  hurtFlash: 0,
  dyingT: 0,
  pendingDraftT: 0,
  lightPulseT: 3,
  explosionDepth: 0,
  gardenImg: null,
  grottoImg: null,
  arenaIdx: 0,
  ambient: [],
  lastHitSfx: 0,
  lastKillSfx: 0,
  intensityTarget: 0.15,

  timeString() {
    const s = Math.floor(this.runTime);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  },

  start() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");
    try { this.best = parseInt(localStorage.getItem("mothlight-hollow-queen-best") || "0", 10) || 0; }
    catch (e) { this.best = 0; }
    Sprites.init();
    Particles.init();
    Input.init(this.canvas);
    this.gardenImg = this.paintGarden(0);
    this.grottoImg = this.paintGarden(1);
    for (let i = 0; i < 6; i++) {
      this.ambient.push({ x: rand(80, CFG.width - 80), y: rand(80, CFG.height - 80), a: rand(0, 6.3), sp: rand(18, 40), seed: rand(0, 9) });
    }
    Director.hooks.onStart = (wave, isBoss, event) => this.onWaveStart(wave, isBoss, event);
    Director.hooks.onClear = (wave) => this.onWaveClear(wave);
    Director.hooks.onBossArrive = () => {
      HUD.announce(BOSS_DEF.name, "guardian of the garden's dark", 2.6);
      this.shake = Math.max(this.shake, 7);
    };
    window.addEventListener("blur", () => { if (this.state === "playing") this.state = "paused"; });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    let last = performance.now();
    const loop = (now) => {
      const rawDt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(rawDt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  // Two arenas, painted once each: the Midnight Garden (indigo, moonlit,
  // flower field) and the Ember Grotto (smouldering red dark, crystal
  // shards, a low ember sun). The garden shifts after every Queen.
  paintGarden(variant) {
    const grotto = variant === 1;
    const c = makeCanvas(CFG.width, CFG.height);
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, CFG.height);
    if (grotto) {
      grad.addColorStop(0, "#1d0810");
      grad.addColorStop(0.55, "#2a0f16");
      grad.addColorStop(1, "#170b06");
    } else {
      grad.addColorStop(0, "#0d0724");
      grad.addColorStop(0.55, "#151038");
      grad.addColorStop(1, "#0a2027");
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, CFG.width, CFG.height);
    // Sky body: the moon, or the grotto's low ember sun.
    const sx = grotto ? 250 : 1030, sy = grotto ? 128 : 110;
    const sky = g.createRadialGradient(sx, sy, 8, sx, sy, 340);
    if (grotto) {
      sky.addColorStop(0, "rgba(253,186,116,0.32)");
      sky.addColorStop(0.25, "rgba(248,113,113,0.12)");
      sky.addColorStop(1, "rgba(248,113,113,0)");
    } else {
      sky.addColorStop(0, "rgba(221,214,254,0.34)");
      sky.addColorStop(0.25, "rgba(167,139,250,0.13)");
      sky.addColorStop(1, "rgba(167,139,250,0)");
    }
    g.fillStyle = sky;
    g.fillRect(0, 0, CFG.width, CFG.height);
    g.fillStyle = grotto ? "#fdba74" : "#e9d5ff";
    g.beginPath(); g.arc(sx, sy, 27, 0, Math.PI * 2); g.fill();
    g.fillStyle = grotto ? "rgba(69,10,10,0.3)" : "rgba(13,7,36,0.35)";
    g.beginPath(); g.arc(sx - 12, sy - 8, 23, 0, Math.PI * 2); g.fill();
    if (grotto) {
      // Crystal field: lit shards jutting from the floor.
      const palette = ["#fda4af", "#fdba74", "#facc15", "#5eead4", "#f8fafc"];
      for (let i = 0; i < 120; i++) {
        const x = rand(0, CFG.width), y = 200 + Math.pow(Math.random(), 0.6) * (CFG.height - 220);
        const h = rand(6, 20), w = rand(2.5, 5);
        g.globalAlpha = rand(0.3, 0.9);
        g.fillStyle = pick(palette);
        g.beginPath();
        g.moveTo(x - w, y); g.lineTo(x, y - h); g.lineTo(x + w, y);
        g.closePath(); g.fill();
      }
      // Ember cracks in the rock floor.
      g.globalAlpha = 1;
      g.strokeStyle = "rgba(249,115,22,0.4)";
      g.lineWidth = 1.6;
      for (let i = 0; i < 16; i++) {
        let x = rand(0, CFG.width), y = rand(CFG.height * 0.55, CFG.height - 12);
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += rand(-46, 46); y += rand(-8, 14); g.lineTo(x, y); }
        g.stroke();
      }
    } else {
      // Flower field: hundreds of tiny lit dots, denser toward the floor.
      const palette = ["#f472b6", "#a78bfa", "#38bdf8", "#facc15", "#34d399", "#f8fafc"];
      for (let i = 0; i < 300; i++) {
        const y = 120 + Math.pow(Math.random(), 0.6) * (CFG.height - 140);
        g.globalAlpha = rand(0.25, 0.85);
        g.fillStyle = pick(palette);
        g.beginPath(); g.arc(rand(0, CFG.width), y, rand(0.8, 2.6), 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    }
    // Floor growth: grass blades, or basalt teeth in the grotto.
    if (grotto) {
      g.fillStyle = "#20090a";
      for (let i = 0; i < 130; i++) {
        const x = rand(0, CFG.width), h = rand(10, 34), w = rand(4, 9);
        g.beginPath();
        g.moveTo(x - w, CFG.height); g.lineTo(x, CFG.height - h); g.lineTo(x + w, CFG.height);
        g.closePath(); g.fill();
      }
    } else {
      g.strokeStyle = "#0f3d33";
      g.lineWidth = 2.4;
      for (let i = 0; i < 150; i++) {
        const x = rand(0, CFG.width), h = rand(14, 44), lean = rand(-9, 9);
        g.beginPath();
        g.moveTo(x, CFG.height);
        g.quadraticCurveTo(x + lean * 0.4, CFG.height - h * 0.6, x + lean, CFG.height - h);
        g.stroke();
      }
    }
    // Hanging growth from the top corners: vines, or ember chains.
    g.strokeStyle = grotto ? "#33160d" : "#1d1440";
    g.lineWidth = 3;
    for (const cornerX of [30, 190, CFG.width - 40, CFG.width - 210]) {
      const len = rand(70, 150), sway = rand(-16, 16);
      g.beginPath();
      g.moveTo(cornerX, -4);
      g.quadraticCurveTo(cornerX + sway, len * 0.55, cornerX + sway * 0.5, len);
      g.stroke();
      g.fillStyle = grotto ? "#b45309" : "#173d2c";
      for (let k = 0; k < 4; k++) {
        const t = 0.25 + k * 0.22;
        g.beginPath();
        g.ellipse(cornerX + sway * t + rand(-5, 5), len * t, 6, 3.4, rand(0, 3), 0, Math.PI * 2);
        g.fill();
      }
    }
    return c;
  },

  arenaName(idx) { return idx === 1 ? "THE EMBER GROTTO" : "THE MIDNIGHT GARDEN"; },

  startRun() {
    this.score = 0; this.kills = 0;
    this.combo = 0; this.comboT = 0; this.mult = 1; this.bestMult = 1;
    this.runTime = 0; this.newBest = false;
    this.shake = 0; this.hitStopT = 0; this.hurtFlash = 0; this.pendingDraftT = 0;
    this.lightPulseT = 3; this.arenaIdx = 0; this.explosionDepth = 0;
    this.player.reset();
    Upgrades.reset();
    Enemies.clear(); Boss.clear();
    EnemyShots.clear(); Bullets.clear();
    Particles.clear(); Pickups.clear();
    Director.reset();
    this.state = "playing";
    Sound.init();
    Director.nextWave();
  },

  onWaveStart(wave, isBoss, event) {
    this.player.onWaveStart();
    // The garden shifts arena after every Queen: waves 1-5 in the
    // Midnight Garden, 6-10 in the Ember Grotto, and so on.
    const idx = Math.floor((wave - 1) / CFG.bossEvery) % 2;
    const shifted = idx !== this.arenaIdx && wave > 1;
    if (shifted) { this.arenaIdx = idx; Sound.sfx("shift"); }
    const stage = lightStageFor(wave);
    const newStage = wave > 1 && LIGHT_STAGES.some((s) => s.wave === wave);
    if (isBoss) HUD.announce("WAVE " + wave, "something vast stirs in the dark", 2.2);
    else if (newStage) {
      HUD.announce("THE LIGHT GROWS", stage.name + " — " + stage.note, 2.4);
      Sound.sfx("kindle");
    } else if (shifted) HUD.announce(this.arenaName(idx), "the garden shifts — wave " + wave, 2.2);
    else if (event) HUD.announce("WAVE " + wave + "  -  " + event.name, event.note, 2.2);
    else HUD.announce("WAVE " + wave, "", 1.6);
  },

  // DAWNBREAK RING and beyond: the lantern itself fights, pulsing a
  // ring of light that bites everything standing inside its reach.
  doLightPulse() {
    const player = this.player;
    const stage = lightStageFor(Math.max(1, Director.wave));
    const radius = player.lightRadius();
    Particles.ring(player.x, player.y, "#fef9c3", radius, 0.55, 4);
    Particles.ring(player.x, player.y, "#fcd34d", radius * 0.6, 0.4, 2);
    Sound.sfx("pulse");
    for (const e of Enemies.list) {
      if (!e.alive || e.dying) continue;
      const rr = radius + e.radius;
      if (dist2(e.x, e.y, player.x, player.y) < rr * rr) {
        const res = e.takeHit(stage.pulseDmg, Math.atan2(e.y - player.y, e.x - player.x), null);
        Particles.burst(e.x, e.y, { n: 4, color: "#fef9c3", speed: 120, size: 2.4, life: 0.3 });
        if (res === "dead") this.killEnemy(e);
      }
    }
    if (Boss.active && !Boss.dying) {
      const rr = radius + Boss.radius;
      if (dist2(Boss.x, Boss.y, player.x, player.y) < rr * rr) {
        if (Boss.takeHit(stage.pulseDmg, 0, null) === "dead") this.killBoss();
      }
    }
  },

  onWaveClear(wave) {
    const bonus = 100 * wave;
    this.score += bonus;
    Sound.sfx("waveClear");
    Particles.text(this.player.x, this.player.y - 34, "WAVE CLEAR  +" + bonus, "#fde68a", 19);
    this.pendingDraftT = 0.95;
  },

  onBossPhase(phase) {
    if (phase === 2) HUD.announce("THE QUEEN UNFURLS HER WINGS", "", 1.8);
    if (phase === 3) {
      HUD.announce("THE QUEEN ENRAGES", "", 1.8);
      this.shake = Math.max(this.shake, 9);
    }
  },

  openDraft() {
    this.state = "draft";
    Upgrades.openDraft(() => {
      if (this.state !== "draft") return;
      this.state = "playing";
      Director.nextWave();
    });
  },

  collectPickup(p) {
    const player = this.player;
    if (p.kind === "heart") {
      player.heal(1);
      Sound.sfx("heal");
      Particles.text(player.x, player.y - 26, "+1 HEART", "#fda4af", 16);
      Particles.burst(player.x, player.y, { n: 8, color: "#fda4af", speed: 120, size: 2.6, life: 0.4 });
    } else {
      this.score += 15;
      const b = player.grantBlessing();
      Sound.sfx("shard");
      if (b.id === "aegis") Sound.sfx("shieldUp");
      Particles.text(player.x, player.y - 26, b.name, b.color, 17);
      Particles.burst(player.x, player.y, { n: 8, color: b.color, speed: 130, size: 2.6, life: 0.4 });
    }
  },

  addKillScore(e) {
    this.combo++;
    this.comboT = this.player.stats.comboWindow;
    this.mult = Math.min(this.player.stats.comboMax, 1 + Math.floor(this.combo / CFG.comboPerStep));
    if (this.mult > this.bestMult) this.bestMult = this.mult;
    const value = e.def.score * (e.elite ? 3 : 1) * this.mult;
    this.score += value;
    if (value >= 100) Particles.text(e.x, e.y - 10, "+" + value, e.elite ? "#ffd75e" : "#fde68a", e.elite ? 19 : 15);
  },

  killEnemy(e) {
    if (e.counted) return;
    e.counted = true;
    e.alive = false;
    this.kills++;
    this.addKillScore(e);
    const color = e.def.color;
    Particles.burst(e.x, e.y, { n: e.elite ? 22 : 12, color, speed: e.elite ? 300 : 220, size: 3.2, life: 0.5 });
    Particles.burst(e.x, e.y, { n: 6, color, speed: 130, size: 3, life: 0.6, petal: true, grav: 160 });
    if (e.elite) {
      Particles.ring(e.x, e.y, "#ffd75e", 76, 0.4, 3);
      this.hitStopT = Math.max(this.hitStopT, 0.085);
      this.shake = Math.max(this.shake, 6);
      Sound.sfx("eliteKill");
    } else {
      this.hitStopT = Math.max(this.hitStopT, 0.024);
      if (this.time - this.lastKillSfx > 0.05) { Sound.sfx("kill"); this.lastKillSfx = this.time; }
    }
    if (e.type === "splitter") {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + rand(0, 1);
        Enemies.spawn("mini", e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18, Director.wave, false);
      }
    }
    // WHITE FLAME, the bright blessing's final form: kills burst and
    // carry the fire to whatever stands too close (chains are capped).
    if (this.player.stats.explodeKills && this.explosionDepth < 2) {
      this.explosionDepth++;
      Particles.ring(e.x, e.y, "#fdba74", 52, 0.3, 3);
      Particles.burst(e.x, e.y, { n: 8, color: "#fdba74", speed: 240, size: 2.8, life: 0.35 });
      for (const other of Enemies.list) {
        if (other === e || !other.alive || other.dying) continue;
        if (dist2(other.x, other.y, e.x, e.y) < 52 * 52) {
          if (other.takeHit(1, Math.atan2(other.y - e.y, other.x - e.x), null) === "dead") this.killEnemy(other);
        }
      }
      if (Boss.active && !Boss.dying && dist2(Boss.x, Boss.y, e.x, e.y) < 60 * 60) {
        if (Boss.takeHit(1, 0, null) === "dead") this.killBoss();
      }
      this.explosionDepth--;
    }
    // Drops.
    if (e.elite) {
      Pickups.drop("shard", e.x, e.y);
      if (Math.random() < 0.3) Pickups.drop("heart", e.x, e.y);
    } else if (Math.random() < CFG.shardChance) {
      Pickups.drop("shard", e.x, e.y);
    }
  },

  killBoss() {
    if (Boss.counted) return;
    Boss.counted = true;
    Boss.active = false;
    this.kills++;
    this.combo++;
    this.comboT = this.player.stats.comboWindow;
    this.mult = Math.min(this.player.stats.comboMax, 1 + Math.floor(this.combo / CFG.comboPerStep));
    const value = BOSS_DEF.score * this.mult;
    this.score += value;
    Particles.text(Boss.x, Boss.y - 60, "+" + value, "#f0abfc", 26);
    for (const color of ["#e9d5ff", "#c084fc", "#facc15", "#f472b6"]) {
      Particles.burst(Boss.x, Boss.y, { n: 26, color, speed: 380, size: 3.8, life: 0.8 });
    }
    Particles.burst(Boss.x, Boss.y, { n: 18, color: "#e9d5ff", speed: 170, size: 3.4, life: 0.9, petal: true, grav: 150 });
    Particles.ring(Boss.x, Boss.y, "#e9d5ff", 240, 0.7, 5);
    Particles.ring(Boss.x, Boss.y, "#facc15", 150, 0.55, 4);
    this.hitStopT = Math.max(this.hitStopT, 0.22);
    this.shake = 16;
    Sound.sfx("bossDie");
    HUD.announce("THE QUEEN FALLS", "the garden breathes again", 2.4);
    Pickups.drop("heart", Boss.x, Boss.y);
    Pickups.drop("shard", Boss.x - 24, Boss.y);
    Pickups.drop("shard", Boss.x + 24, Boss.y);
  },

  reapDeaths() {
    for (const e of Enemies.list) {
      if (e.alive && e.dying && !e.counted) this.killEnemy(e);
    }
    if (Boss.dying && !Boss.counted) this.killBoss();
  },

  playerStruck() {
    const res = this.player.hurt();
    if (res === "shield") return res;
    if (res === "hit" || res === "dead") {
      this.combo = Math.floor(this.combo / 2);
      this.hurtFlash = 0.55;
      this.shake = Math.max(this.shake, 11);
      this.hitStopT = Math.max(this.hitStopT, 0.05);
    }
    if (res === "dead") {
      this.state = "dying";
      this.dyingT = 1.15;
      Particles.burst(this.player.x, this.player.y, { n: 40, color: "#fbbf24", speed: 330, size: 3.6, life: 0.9 });
      Particles.burst(this.player.x, this.player.y, { n: 20, color: "#fef3c7", speed: 180, size: 3, life: 1.1, petal: true, grav: 120 });
      Particles.ring(this.player.x, this.player.y, "#fbbf24", 170, 0.6, 4);
    }
    return res;
  },

  nearestEnemy(x, y, maxDist, exclude) {
    let bestE = null, bestD = maxDist * maxDist;
    for (const e of Enemies.list) {
      if (!e.alive || e.dying || exclude.includes(e)) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bestD) { bestD = d; bestE = e; }
    }
    if (Boss.active && !Boss.dying && !exclude.includes(Boss)) {
      const d = dist2(x, y, Boss.x, Boss.y);
      if (d < bestD) { bestE = Boss; }
    }
    return bestE;
  },

  bulletHit(b, target, isBoss) {
    const angle = Math.atan2(b.vy, b.vx);
    const stats = this.player.stats;
    const opts = {
      burn: stats.burn || this.player.blessingId === "blaze",
      burnRate: stats.burnRate,
      chill: stats.chill,
      chillFactor: stats.chillFactor,
      chillDur: stats.chillDur,
    };
    // PRISM HEART: a foe standing in the lantern's light is light-struck
    // and takes a quarter more from every spark that finds it.
    let dmg = b.dmg;
    const stage = lightStageFor(Math.max(1, Director.wave));
    if (stage.struck) {
      const rr = this.player.lightRadius() + target.radius;
      if (dist2(target.x, target.y, this.player.x, this.player.y) < rr * rr) dmg *= 1.25;
    }
    const res = target.takeHit(dmg, angle, opts);
    b.hits.push(target);
    Particles.burst(b.x, b.y, { n: 3, color: isBoss ? "#e9d5ff" : target.def.color, speed: 130, size: 2.2, life: 0.25 });
    if (res === "clank") {
      Sound.sfx("clank");
      Particles.burst(b.x, b.y, { n: 4, color: "#d6d3d1", speed: 170, size: 2, life: 0.22 });
    } else if (this.time - this.lastHitSfx > 0.035) {
      Sound.sfx("hit");
      this.lastHitSfx = this.time;
    }
    if (res === "dead") {
      if (isBoss) this.killBoss(); else this.killEnemy(target);
    }
    if (b.pierce > 0) { b.pierce--; return; }
    if (b.bounces > 0) {
      const next = this.nearestEnemy(b.x, b.y, 265, b.hits);
      if (next) {
        const a = Math.atan2(next.y - b.y, next.x - b.x);
        b.vx = Math.cos(a) * CFG.bulletSpeed;
        b.vy = Math.sin(a) * CFG.bulletSpeed;
        b.bounces--;
        b.life = Math.max(b.life, 0.32);
        return;
      }
    }
    b.alive = false;
  },

  collisions(dt) {
    const player = this.player;
    // Sparks against the swarm and the Queen.
    Bullets.pool.forEachAlive((b) => {
      if (Boss.active && !Boss.dying && !b.hits.includes(Boss)) {
        const rr = Boss.radius + 5;
        if (dist2(b.x, b.y, Boss.x, Boss.y) < rr * rr) {
          this.bulletHit(b, Boss, true);
          if (!b.alive) return;
        }
      }
      for (const e of Enemies.list) {
        if (!b.alive) break;
        if (!e.alive || e.dying || b.hits.includes(e)) continue;
        const rr = e.radius + 5;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) this.bulletHit(b, e, false);
      }
    });
    // Orbit wisps burn what they touch, on a per-creature cooldown.
    if (player.orbitPositions.length) {
      for (const e of Enemies.list) {
        if (e.orbitT > 0) e.orbitT -= dt;
        if (!e.alive || e.dying) continue;
        for (const o of player.orbitPositions) {
          if (e.orbitT > 0) break;
          const rr = e.radius + 13;
          if (dist2(o.x, o.y, e.x, e.y) < rr * rr) {
            e.orbitT = 0.45;
            const res = e.takeHit(1, Math.atan2(e.y - player.y, e.x - player.x), null);
            Particles.burst(o.x, o.y, { n: 4, color: "#7dd3fc", speed: 120, size: 2.2, life: 0.25 });
            if (res === "dead") this.killEnemy(e);
          }
        }
      }
      if (Boss.active && !Boss.dying) {
        if (Boss.orbitT > 0) Boss.orbitT -= dt;
        for (const o of player.orbitPositions) {
          if (Boss.orbitT > 0) break;
          const rr = Boss.radius + 13;
          if (dist2(o.x, o.y, Boss.x, Boss.y) < rr * rr) {
            Boss.orbitT = 0.45;
            if (Boss.takeHit(1, 0, null) === "dead") this.killBoss();
          }
        }
      }
    }
    // COMET'S TAIL: a searing dash wounds what it crosses, once per dash.
    if (player.dashT > 0 && player.stats.dashDamage > 0 && this.state === "playing") {
      for (const e of Enemies.list) {
        if (!e.alive || e.dying || e.lastDashId === player.dashId) continue;
        const rr = e.radius + player.radius + 8;
        if (dist2(e.x, e.y, player.x, player.y) < rr * rr) {
          e.lastDashId = player.dashId;
          const res = e.takeHit(player.stats.dashDamage, Math.atan2(e.y - player.y, e.x - player.x), null);
          Particles.burst(e.x, e.y, { n: 5, color: "#fcd34d", speed: 150, size: 2.6, life: 0.3 });
          if (res === "dead") this.killEnemy(e);
        }
      }
      if (Boss.active && !Boss.dying && Boss.lastDashId !== player.dashId) {
        const rr = Boss.radius + player.radius + 8;
        if (dist2(Boss.x, Boss.y, player.x, player.y) < rr * rr) {
          Boss.lastDashId = player.dashId;
          if (Boss.takeHit(player.stats.dashDamage, 0, null) === "dead") this.killBoss();
        }
      }
    }
    // Creature contact.
    if (!player.invulnerable && this.state === "playing") {
      for (const e of Enemies.list) {
        if (!e.alive || e.dying || e.spawnT < 0.25) continue;
        const rr = e.radius + player.radius - 2;
        if (dist2(e.x, e.y, player.x, player.y) < rr * rr) {
          const struck = this.playerStruck();
          if (struck === "shield") {
            // The shield ate it; the creature bounces off.
            e.kx += (e.x - player.x) * 6; e.ky += (e.y - player.y) * 6;
          } else if (e.type === "beetle") {
            e.takeHit(3, Math.atan2(e.y - player.y, e.x - player.x), null);
            e.kx += (e.x - player.x) * 10; e.ky += (e.y - player.y) * 10;
          } else {
            e.counted = true; e.alive = false;
            Particles.burst(e.x, e.y, { n: 10, color: e.def.color, speed: 200, size: 3, life: 0.45 });
          }
          break;
        }
      }
      if (this.state === "playing" && Boss.active && !Boss.dying && !player.invulnerable) {
        const rr = Boss.radius + player.radius - 4;
        if (dist2(Boss.x, Boss.y, player.x, player.y) < rr * rr) this.playerStruck();
      }
      // Gloom globs.
      if (this.state === "playing") {
        EnemyShots.pool.forEachAlive((s) => {
          if (player.invulnerable) return;
          const rr = s.r + player.radius - 3;
          if (dist2(s.x, s.y, player.x, player.y) < rr * rr) {
            s.alive = false;
            this.playerStruck();
          }
        });
      }
    }
  },

  frame(rawDt) {
    this.time += rawDt;
    let scale = 1;
    if (this.hitStopT > 0) { this.hitStopT -= rawDt; scale = 0.07; }
    else if (this.state === "dying") scale = 0.3;
    const dt = rawDt * scale;
    this.update(dt, rawDt);
    this.draw();
    Input.endFrame();
  },

  update(dt, rawDt) {
    HUD.update(rawDt);
    if (this.hurtFlash > 0) this.hurtFlash -= rawDt * 1.8;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - rawDt * 34);
    // Ambient title moths wander in every state; the garden is alive.
    for (const m of this.ambient) {
      m.a += rand(-1, 1) * dt * 1.4;
      m.x += Math.cos(m.a) * m.sp * dt;
      m.y += Math.sin(m.a) * m.sp * dt;
      if (m.x < 40 || m.x > CFG.width - 40) m.a = Math.PI - m.a;
      if (m.y < 40 || m.y > CFG.height - 40) m.a = -m.a;
      m.x = clamp(m.x, 30, CFG.width - 30);
      m.y = clamp(m.y, 30, CFG.height - 30);
    }

    if (Input.wasPressed("KeyM")) Sound.toggleMute();

    switch (this.state) {
      case "title": {
        this.intensityTarget = 0.15;
        Particles.update(dt);
        if (Input.wasPressed("Enter") || Input.clicked) { Sound.init(); this.startRun(); }
        break;
      }
      case "playing": {
        this.runTime += dt;
        if (Input.wasPressed("KeyP") || Input.wasPressed("Escape")) { this.state = "paused"; break; }
        if (this.comboT > 0) {
          this.comboT -= dt;
          if (this.comboT <= 0) { this.combo = 0; this.mult = 1; }
        }
        Director.update(dt, this);
        this.player.update(dt, this);
        // The light ladder's pulse, once the lantern has learned it.
        const stageNow = lightStageFor(Math.max(1, Director.wave));
        if (stageNow.pulse > 0 && Director.phase === "active") {
          this.lightPulseT -= dt;
          if (this.lightPulseT <= 0) {
            this.lightPulseT = stageNow.pulse;
            this.doLightPulse();
          }
        }
        Enemies.update(dt, this.player);
        if (Boss.active) Boss.update(dt, this.player, this);
        Bullets.update(dt);
        EnemyShots.update(dt);
        Pickups.update(dt, this);
        this.collisions(dt);
        this.reapDeaths();
        Particles.update(dt);
        if (this.pendingDraftT > 0) {
          this.pendingDraftT -= dt;
          if (this.pendingDraftT <= 0 && this.state === "playing") this.openDraft();
        }
        this.intensityTarget = clamp(
          0.3 + Enemies.activeCount() * 0.016 + (Boss.active ? (Boss.phase === 3 ? 0.42 : 0.28) : 0) +
          (this.player.hearts === 1 ? 0.1 : 0), 0, 1);
        break;
      }
      case "draft": {
        this.intensityTarget = 0.22;
        Particles.update(dt);
        Upgrades.handleInput(this.player);
        break;
      }
      case "paused": {
        if (Input.wasPressed("KeyP") || Input.wasPressed("Escape")) this.state = "playing";
        else if (Input.wasPressed("KeyR")) this.startRun();
        break;
      }
      case "dying": {
        this.dyingT -= rawDt;
        Enemies.update(dt, this.player);
        Particles.update(dt);
        if (this.dyingT <= 0) {
          this.state = "gameover";
          if (this.score > this.best) {
            this.best = this.score;
            this.newBest = true;
            try { localStorage.setItem("mothlight-hollow-queen-best", String(this.best)); } catch (e) { /* private mode */ }
          }
          Sound.sfx("gameOver");
        }
        break;
      }
      case "gameover": {
        this.intensityTarget = 0.1;
        Particles.update(dt);
        Enemies.update(dt, { x: -9999, y: -9999 });
        if (Input.wasPressed("Enter") || Input.wasPressed("KeyR") || Input.clicked) this.startRun();
        break;
      }
    }
    Sound.intensity += (this.intensityTarget - Sound.intensity) * Math.min(1, rawDt * 2.5);
  },

  draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0.2) ctx.translate(rand(-this.shake, this.shake) * 0.5, rand(-this.shake, this.shake) * 0.5);
    ctx.drawImage(this.arenaIdx === 1 ? this.grottoImg : this.gardenImg, 0, 0);
    Particles.drawMotes(ctx, this.time);
    if (this.state === "title") {
      for (const m of this.ambient) {
        const img = Sprites.body("moth", false, Math.floor(this.time * 6 + m.seed) % 2);
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.translate(m.x, m.y);
        ctx.rotate(m.a + Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      }
      Screens.drawTitle(ctx, this, this.time);
    } else {
      Pickups.draw(ctx);
      EnemyShots.draw(ctx);
      Enemies.draw(ctx, this.time);
      Boss.draw(ctx, this.time);
      Bullets.draw(ctx);
      if (this.state !== "dying" && this.state !== "gameover") this.player.draw(ctx, this.time);
      Particles.draw(ctx);
      if (this.state !== "gameover") HUD.draw(ctx, this, this.time);
      HUD.drawVignette(ctx, this, this.time);
      if (this.state === "draft") Upgrades.draw(ctx, this.time);
      if (this.state === "paused") Screens.drawPause(ctx, this);
      if (this.state === "gameover") Screens.drawGameOver(ctx, this, this.time);
    }
    ctx.restore();
  },
};

window.Mothlight = Game;
Game.start();

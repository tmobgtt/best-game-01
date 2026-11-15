// player.js — the Lantern Wisp and its sparks. The keeper moves with a
// soft acceleration, dashes through danger with a pocket of invulnerable
// time, and fires fanned volleys whose shape is built from the draft
// upgrades it owns (see upgrades.js) plus any timed blessing it carries.

const Bullets = {
  pool: new Pool(430, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, dmg: 1, pierce: 0, bounces: 0, hits: [] })),
  fire(x, y, angle, dmg, pierce, bounces) {
    const b = this.pool.obtain();
    if (!b) return;
    b.x = x; b.y = y;
    b.vx = Math.cos(angle) * CFG.bulletSpeed;
    b.vy = Math.sin(angle) * CFG.bulletSpeed;
    b.life = CFG.bulletLife;
    b.dmg = dmg; b.pierce = pierce; b.bounces = bounces;
    b.hits.length = 0;
  },
  update(dt) {
    const stats = Game.player.stats;
    const trailColors = ["#fde68a", "#fcd34d", "#fbbf24", "#f0abfc", "#93c5fd", "#a5f3fc", "#fef9c3"];
    const trail = trailColors[Math.min(trailColors.length - 1, Game.player.lightStageIdx)];
    this.pool.forEachAlive((b) => {
      b.life -= dt;
      if (b.life <= 0) { b.alive = false; return; }
      // CONSTELLATION homing: sparks bend toward the nearest foe.
      if (stats.homing > 0) {
        const t = Game.nearestEnemy(b.x, b.y, 320, b.hits);
        if (t) {
          const cur = Math.atan2(b.vy, b.vx);
          const want = Math.atan2(t.y - b.y, t.x - b.x);
          const turn = clamp(angleDelta(cur, want), -stats.homing * dt, stats.homing * dt);
          const na = cur + turn, sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -16 || b.x > CFG.width + 16 || b.y < -16 || b.y > CFG.height + 16) b.alive = false;
      if (Math.random() < dt * 22) Particles.trailDot(b.x, b.y, trail, 2.4, 0.22);
    });
  },
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    this.pool.forEachAlive((b) => {
      const s = 21;
      ctx.drawImage(Sprites.glow("#fbbf24"), b.x - s / 2, b.y - s / 2, s, s);
    });
    ctx.restore();
  },
  clear() { this.pool.releaseAll(); },
};

class Player {
  constructor() { this.reset(); }

  reset() {
    this.x = CFG.width / 2; this.y = CFG.height / 2;
    this.vx = 0; this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = CFG.playerRadius;
    this.maxHearts = CFG.startHearts;
    this.hearts = this.maxHearts;
    this.invulnT = 0; this.fireT = 0;
    this.dashT = 0; this.dashCdT = 0; this.dashDirX = 1; this.dashDirY = 0;
    this.prevDashDown = false;
    this.blessingId = null; this.blessingT = 0; this.blessingIdx = -1;
    this.shieldReady = false;
    this.shieldBrokenT = 0;
    this.volley = 0;
    this.dashId = 0;
    this.lightStageIdx = 0;
    this.orbitAngle = 0;
    this.orbitPositions = [];
    this.stats = {};
    this.recomputeStats();
    this.hearts = this.maxHearts;
  }

  // All draft-derived numbers are recomputed from the stack counts, so
  // upgrades.js never has to know the formulas and save order is safe.
  // Maxing a blessing wakes its FINAL FORM (config.js): fin(id) is 1
  // when the stack is full, and each form bends one line below.
  recomputeStats() {
    const s = Upgrades.stacks;
    const get = (id) => s[id] || 0;
    const fin = (id) => {
      const def = UPGRADE_POOL.find((d) => d.id === id);
      return def && get(id) >= def.max ? 1 : 0;
    };
    this.stats = {
      damage: CFG.playerDamage + get("bright"),
      fireRate: CFG.playerFireRate * Math.pow(1.22, get("rapid")),
      projectiles: 1 + get("twin") + fin("twin"),
      homing: fin("twin") ? 1.5 : 0,
      novaEvery: fin("rapid") ? 4 : 0,
      explodeKills: fin("bright") > 0,
      pierce: get("pierce") + fin("pierce"),
      bounces: get("bounce") + fin("bounce"),
      burn: get("ember") > 0,
      burnRate: fin("ember") ? 0.4 : 0.8,
      chill: get("frost") > 0,
      chillFactor: fin("frost") ? 0.4 : 0.55,
      chillDur: fin("frost") ? 2.4 : 1.6,
      speed: CFG.playerSpeed * Math.pow(1.11, get("swift")) * (fin("swift") ? 1.06 : 1),
      dashCooldown: CFG.dashCooldown * Math.pow(0.75, get("longdash")) * (fin("swift") ? 0.85 : 1),
      dashTime: CFG.dashTime * (1 + 0.18 * get("longdash")),
      dashDamage: fin("longdash") ? 2 : 0,
      magnetR: 74 * Math.pow(1.7, get("magnet")),
      globalMagnet: fin("magnet") > 0,
      waveHeal: fin("heart"),
      shieldRegrowTime: fin("aegis") ? 14 : 0,
      orbits: get("orbit") + fin("orbit"),
      comboWindow: CFG.comboWindow * Math.pow(1.6, get("charm")),
      comboMax: CFG.comboMax + (fin("charm") ? 2 : 0),
    };
    const newMax = CFG.startHearts + get("heart");
    if (newMax !== this.maxHearts) {
      this.maxHearts = newMax;
      if (this.hearts > this.maxHearts) this.hearts = this.maxHearts;
    }
    if (get("aegis") > 0 && !this.shieldReady && this.shieldRegrow) {
      this.shieldReady = true;
    }
  }

  onWaveStart() {
    if ((Upgrades.stacks["aegis"] || 0) > 0) this.shieldReady = true;
    this.shieldRegrow = false;
    this.shieldBrokenT = 0;
    // EVERGREEN, the heart's final form: a new wave mends one heart.
    if (this.stats.waveHeal && this.hearts < this.maxHearts) {
      this.heal(1);
      Sound.sfx("heal");
    }
  }

  // The lantern's reach: it widens every wave, without exception.
  lightRadius() {
    return Math.min(400, 185 * (1 + 0.08 * Math.max(0, Director.wave - 1)));
  }

  grantBlessing() {
    this.blessingIdx = (this.blessingIdx + 1) % BLESSINGS.length;
    const b = BLESSINGS[this.blessingIdx];
    this.blessingId = b.id;
    this.blessingT = CFG.blessingTime;
    if (b.id === "aegis") this.shieldReady = true;
    return b;
  }

  update(dt, game) {
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.blessingT > 0) {
      this.blessingT -= dt;
      if (this.blessingT <= 0) this.blessingId = null;
    }
    const stage = lightStageFor(Math.max(1, Director.wave));
    this.lightStageIdx = LIGHT_STAGES.indexOf(stage);
    // HALO OF DAWN: a broken shield regrows after a while, mid-wave.
    if (!this.shieldReady && this.stats.shieldRegrowTime > 0) {
      this.shieldBrokenT += dt;
      if (this.shieldBrokenT >= this.stats.shieldRegrowTime) {
        this.shieldReady = true;
        this.shieldBrokenT = 0;
        Sound.sfx("shieldUp");
        Particles.ring(this.x, this.y, "#38bdf8", 50, 0.35, 3);
      }
    }
    const mv = Input.moveVector();
    const aim = Input.aimPoint(this.x, this.y);
    this.angle = Math.atan2(aim.y - this.y, aim.x - this.x);

    // Dash: edge-triggered, carries its own invulnerability.
    const dashDown = Input.dashDown();
    if (dashDown && !this.prevDashDown && this.dashCdT <= 0 && this.dashT <= 0) {
      const dx = mv.x !== 0 || mv.y !== 0 ? mv.x : Math.cos(this.angle);
      const dy = mv.x !== 0 || mv.y !== 0 ? mv.y : Math.sin(this.angle);
      const len = Math.hypot(dx, dy) || 1;
      this.dashDirX = dx / len; this.dashDirY = dy / len;
      this.dashT = this.stats.dashTime;
      this.dashCdT = this.stats.dashCooldown;
      this.dashId++;
      Sound.sfx("dash");
      Particles.burst(this.x, this.y, { n: 8, color: "#fde68a", speed: 120, size: 2.6, life: 0.3 });
    }
    this.prevDashDown = dashDown;
    if (this.dashCdT > 0) this.dashCdT -= dt;

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDirX * CFG.dashSpeed;
      this.vy = this.dashDirY * CFG.dashSpeed;
      Particles.trailDot(this.x, this.y, "#fbbf24", 7, 0.3);
    } else {
      const accel = 2400;
      this.vx += mv.x * accel * dt;
      this.vy += mv.y * accel * dt;
      const damp = Math.max(0, 1 - 10 * dt);
      if (mv.x === 0) this.vx *= damp;
      if (mv.y === 0) this.vy *= damp;
      const sp = Math.hypot(this.vx, this.vy);
      const max = this.stats.speed;
      if (sp > max) { this.vx = (this.vx / sp) * max; this.vy = (this.vy / sp) * max; }
    }
    this.x = clamp(this.x + this.vx * dt, this.radius, CFG.width - this.radius);
    this.y = clamp(this.y + this.vy * dt, this.radius, CFG.height - this.radius);

    // Firing: volleys fan around the aim; blessings bend the shape.
    if (this.fireT > 0) this.fireT -= dt;
    if (Input.firing(this.x, this.y) && this.fireT <= 0) {
      let rate = this.stats.fireRate;
      let projectiles = this.stats.projectiles;
      if (this.blessingId === "rapid") rate *= 1.65;
      if (this.blessingId === "spread") projectiles += 2;
      this.fireT = 1 / rate;
      this.volley++;
      // SUNCORE ENGINE: every fourth volley burns twice as bright.
      const nova = this.stats.novaEvery > 0 && this.volley % this.stats.novaEvery === 0;
      const dmg = this.stats.damage * (nova ? 2 : 1);
      const fan = Math.min(0.55, (projectiles - 1) * 0.1);
      for (let i = 0; i < projectiles; i++) {
        const t = projectiles === 1 ? 0 : (i / (projectiles - 1) - 0.5) * 2;
        Bullets.fire(
          this.x + Math.cos(this.angle) * 16, this.y + Math.sin(this.angle) * 16,
          this.angle + t * fan,
          dmg, this.stats.pierce, this.stats.bounces,
        );
      }
      if (nova) {
        Particles.ring(this.x, this.y, "#fdba74", 40, 0.28, 2);
        Sound.sfx("pick");
      }
      Sound.sfx("shoot");
      Particles.burst(this.x + Math.cos(this.angle) * 20, this.y + Math.sin(this.angle) * 20,
        { n: 2, color: "#fde68a", speed: 90, size: 2, life: 0.16, dir: this.angle, spread: 0.5 });
    }

    // Orbit wisps circle at a fixed radius; main.js tests their contact.
    this.orbitAngle += dt * 2.6;
    this.orbitPositions.length = 0;
    for (let i = 0; i < this.stats.orbits; i++) {
      const a = this.orbitAngle + (i / this.stats.orbits) * Math.PI * 2;
      this.orbitPositions.push({ x: this.x + Math.cos(a) * 52, y: this.y + Math.sin(a) * 52 });
    }
  }

  get invulnerable() { return this.invulnT > 0 || this.dashT > 0; }

  // Returns "shield", "hit" or "dead".
  hurt() {
    if (this.invulnerable) return "hit";
    if (this.shieldReady) {
      this.shieldReady = false;
      this.shieldRegrow = true;
      this.invulnT = 0.9;
      Sound.sfx("shieldBreak");
      Particles.ring(this.x, this.y, "#38bdf8", 54, 0.35, 3);
      return "shield";
    }
    this.hearts -= 1;
    this.invulnT = CFG.hurtInvulnTime;
    Sound.sfx("hurt");
    Particles.burst(this.x, this.y, { n: 16, color: "#f87171", speed: 260, size: 3.4, life: 0.5 });
    Particles.ring(this.x, this.y, "#f87171", 60, 0.35, 3);
    return this.hearts <= 0 ? "dead" : "hit";
  }

  heal(n) {
    this.hearts = Math.min(this.maxHearts, this.hearts + n);
  }

  draw(ctx, time) {
    const flicker = 1 + Math.sin(time * 11) * 0.05 + Math.sin(time * 23) * 0.03;
    // Lantern light pool: its size IS the light ladder, visible at a glance.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glowS = this.lightRadius() * 1.18 * flicker;
    ctx.globalAlpha = this.invulnT > 0 && Math.floor(time * 14) % 2 ? 0.35 : 0.75;
    ctx.drawImage(Sprites.glow("#f59e0b"), this.x - glowS / 2, this.y - glowS / 2, glowS, glowS);
    ctx.restore();
    // Orbit wisps.
    for (const o of this.orbitPositions) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const s = 34;
      ctx.drawImage(Sprites.glow("#7dd3fc"), o.x - s / 2, o.y - s / 2, s, s);
      ctx.restore();
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath(); ctx.arc(o.x, o.y, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    // Aegis ring.
    if (this.shieldReady) {
      ctx.save();
      ctx.strokeStyle = "rgba(56,189,248,0.75)";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -time * 24;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 9, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // TWIN FLAME: from wave 5 a second, smaller flame keeps the vigil,
    // circling the keeper and doubling the light the eye can see.
    if (lightStageFor(Math.max(1, Director.wave)).twin) {
      const ta = time * 0.85;
      const tx = this.x + Math.cos(ta) * 76, ty = this.y + Math.sin(ta) * 76;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const ts = 74 * flicker;
      ctx.globalAlpha = 0.65;
      ctx.drawImage(Sprites.glow("#fcd34d"), tx - ts / 2, ty - ts / 2, ts, ts);
      ctx.restore();
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath(); ctx.arc(tx, ty, 3.6, 0, Math.PI * 2); ctx.fill();
    }
    // The keeper: a small hooded robe, a bright flame where the face is.
    ctx.save();
    ctx.translate(this.x, this.y);
    const blink = this.invulnT > 0 && Math.floor(time * 14) % 2;
    ctx.globalAlpha = blink ? 0.45 : 1;
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.bezierCurveTo(10, -12, 12, 2, 9, 13);
    ctx.bezierCurveTo(4, 16, -4, 16, -9, 13);
    ctx.bezierCurveTo(-12, 2, -10, -12, 0, -13);
    ctx.fill();
    ctx.fillStyle = "#92400e";
    ctx.beginPath(); ctx.ellipse(0, 9, 8.4, 4.6, 0, 0, Math.PI * 2); ctx.fill();
    const flameS = 26 * flicker;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(Sprites.glow("#fcd34d"), -flameS / 2, -flameS / 2 - 3, flameS, flameS);
    ctx.restore();
    // Aim tick.
    ctx.save();
    ctx.strokeStyle = "rgba(254,243,199,0.8)";
    ctx.lineWidth = 2;
    const ax = this.x + Math.cos(this.angle) * 24, ay = this.y + Math.sin(this.angle) * 24;
    ctx.beginPath(); ctx.moveTo(ax - 4, ay); ctx.lineTo(ax + 4, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax, ay - 4); ctx.lineTo(ax, ay + 4); ctx.stroke();
    ctx.restore();
  }
}

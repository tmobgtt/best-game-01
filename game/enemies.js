// enemies.js — the swarm. Seven creature types, each with a behaviour
// you can read from across the arena: moths flutter straight at you,
// thorn darts telegraph and lunge, spitters keep their distance and lob
// gloom, beetles shrug off frontal fire, husks burst into glooms, and
// weavers circle while they shoot. Elites wear gold and hit harder.
// The Hollow Queen lives here too: one boss object, three phases.

const EnemyShots = {
  pool: new Pool(260, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 6, life: 0 })),
  fire(x, y, angle, speed, r) {
    const s = this.pool.obtain();
    if (!s) return;
    s.x = x; s.y = y;
    s.vx = Math.cos(angle) * speed; s.vy = Math.sin(angle) * speed;
    s.r = r || 6; s.life = 4;
  },
  update(dt) {
    this.pool.forEachAlive((s) => {
      s.life -= dt;
      if (s.life <= 0) { s.alive = false; return; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x < -20 || s.x > CFG.width + 20 || s.y < -20 || s.y > CFG.height + 20) s.alive = false;
    });
  },
  draw(ctx) {
    this.pool.forEachAlive((s) => {
      const sz = s.r * 5;
      ctx.drawImage(Sprites.glow("#a3e635"), s.x - sz / 2, s.y - sz / 2, sz, sz);
      ctx.fillStyle = "#365314";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.62, 0, Math.PI * 2); ctx.fill();
    });
  },
  clear() { this.pool.releaseAll(); },
};

class Enemy {
  constructor() {
    this.alive = false; this.dying = false; this.counted = false;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0;
    this.hp = 1; this.maxHp = 1; this.radius = 10; this.angle = 0;
    this.type = "moth"; this.def = ENEMY_TYPES.moth; this.elite = false;
    this.state = "chase"; this.tState = 0; this.seed = 0; this.spawnT = 0;
    this.flash = 0; this.burnT = 0; this.burnTick = 0; this.chillT = 0;
    this.fireT = 0; this.lockAngle = 0; this.orbitDir = 1;
  }

  init(type, x, y, wave, elite) {
    const def = ENEMY_TYPES[type];
    this.type = type; this.def = def;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0;
    const hpScale = 1 + 0.055 * (wave - 1);
    this.maxHp = Math.max(1, Math.round(def.hp * hpScale * (elite ? 3 : 1)));
    this.hp = this.maxHp;
    this.radius = def.radius * (elite ? 1.3 : 1);
    this.speed = def.speed * Math.min(1.3, 1 + 0.016 * (wave - 1)) * rand(0.92, 1.08);
    this.elite = elite;
    this.alive = true; this.dying = false; this.counted = false;
    this.state = "chase"; this.tState = rand(0, 0.4); this.seed = rand(0, Math.PI * 2);
    this.spawnT = 0; this.flash = 0; this.burnT = 0; this.burnTick = 0; this.chillT = 0;
    this.fireT = rand(0.8, 2);
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    this.angle = 0;
  }

  speedNow() { return this.speed * (this.chillT > 0 ? 0.55 : 1); }

  // Returns "dead", "clank" (armour ate it) or "hit". Death itself is
  // reaped by main.js so score, drops and splitter children happen once.
  takeHit(dmg, angle, opts) {
    if (this.dying) return "hit";
    let dealt = dmg;
    let clanked = false;
    if (this.type === "beetle") {
      // Frontal armour: shots arriving against the facing lose 60%.
      const incoming = angleDelta(angle, this.angle + Math.PI);
      if (Math.abs(incoming) < 1.05) { dealt = Math.max(1, Math.round(dmg * 0.4)); clanked = dmg > 1 || dealt < dmg; }
    }
    this.hp -= dealt;
    this.flash = 0.09;
    const kb = this.type === "beetle" ? 26 : 62;
    this.kx += Math.cos(angle) * kb; this.ky += Math.sin(angle) * kb;
    if (opts) {
      if (opts.burn) this.burnT = 2;
      if (opts.chill) this.chillT = 1.6;
    }
    if (this.hp <= 0) { this.dying = true; return "dead"; }
    return clanked ? "clank" : "hit";
  }

  update(dt, player) {
    if (this.dying) return;
    this.spawnT += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.chillT > 0) this.chillT -= dt;
    if (this.burnT > 0) {
      this.burnT -= dt; this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.8; this.hp -= 1; this.flash = 0.06;
        Particles.trailDot(this.x + rand(-6, 6), this.y - 6, "#fb923c", 5, 0.4);
        if (this.hp <= 0) { this.dying = true; return; }
      }
    }
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const sp = this.speedNow();
    this.tState -= dt;
    switch (this.type) {
      case "mini":
      case "moth": {
        const wob = Math.sin(this.spawnT * 5 + this.seed) * 0.45;
        const a = Math.atan2(uy, ux) + wob * 0.5;
        this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
        this.angle = Math.atan2(this.vy, this.vx);
        break;
      }
      case "splitter": {
        const wob = Math.sin(this.spawnT * 3 + this.seed) * 0.3;
        const a = Math.atan2(uy, ux) + wob;
        this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
        this.angle = Math.atan2(this.vy, this.vx);
        break;
      }
      case "beetle": {
        this.vx = ux * sp; this.vy = uy * sp;
        this.angle = Math.atan2(uy, ux);
        break;
      }
      case "dart": {
        if (this.state === "chase") {
          this.vx = ux * sp; this.vy = uy * sp;
          this.angle = Math.atan2(uy, ux);
          if (d < 210 && this.tState <= 0) { this.state = "aim"; this.tState = 0.45; Sound.sfx("charge"); }
        } else if (this.state === "aim") {
          this.vx *= 0.8; this.vy *= 0.8;
          this.lockAngle = Math.atan2(uy, ux);
          this.angle = this.lockAngle;
          if (this.tState <= 0) {
            this.state = "lunge"; this.tState = 0.36;
            this.vx = Math.cos(this.lockAngle) * 560; this.vy = Math.sin(this.lockAngle) * 560;
          }
        } else if (this.state === "lunge") {
          if (this.tState <= 0) { this.state = "rest"; this.tState = 0.8; }
        } else { // rest
          this.vx *= 0.86; this.vy *= 0.86;
          if (this.tState <= 0) { this.state = "chase"; this.tState = rand(0.3, 0.9); }
        }
        break;
      }
      case "spitter": {
        let mx = 0, my = 0;
        if (d > 320) { mx = ux; my = uy; }
        else if (d < 235) { mx = -ux; my = -uy; }
        else { mx = -uy * 0.45; my = ux * 0.45; }
        this.vx = mx * sp; this.vy = my * sp;
        this.angle = Math.atan2(uy, ux);
        this.fireT -= dt;
        if (this.fireT <= 0 && d < 430 && this.spawnT > 0.6) {
          this.fireT = rand(1.9, 2.5);
          EnemyShots.fire(this.x, this.y, Math.atan2(uy, ux), 245, 7);
          Sound.sfx("spit");
        }
        break;
      }
      case "weaver": {
        const orbitR = 235;
        const radial = clamp((d - orbitR) / 90, -1, 1);
        const tx = -uy * this.orbitDir, ty = ux * this.orbitDir;
        this.vx = (tx * 0.9 + ux * radial) * sp;
        this.vy = (ty * 0.9 + uy * radial) * sp;
        this.angle = Math.atan2(this.vy, this.vx);
        if (Math.random() < dt * 0.25) this.orbitDir *= -1;
        this.fireT -= dt;
        if (this.fireT <= 0 && d < 460 && this.spawnT > 0.6) {
          this.fireT = rand(2.3, 3);
          EnemyShots.fire(this.x, this.y, Math.atan2(uy, ux), 305, 5);
          Sound.sfx("spit");
        }
        break;
      }
    }
    this.x += (this.vx + this.kx) * dt;
    this.y += (this.vy + this.ky) * dt;
    this.kx *= Math.max(0, 1 - 9 * dt);
    this.ky *= Math.max(0, 1 - 9 * dt);
    this.x = clamp(this.x, this.radius, CFG.width - this.radius);
    this.y = clamp(this.y, this.radius, CFG.height - this.radius);
  }

  draw(ctx, time) {
    const frame = Math.floor(time * 7 + this.seed) % 2;
    const img = Sprites.body(this.type, this.elite, frame);
    const scaleIn = clamp(this.spawnT / 0.35, 0.2, 1);
    const w = img.width * scaleIn, h = img.height * scaleIn;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    if (this.type === "dart" && this.state === "aim") {
      ctx.save();
      ctx.strokeStyle = "rgba(244,114,182,0.5)";
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.lockAngle) * 240, this.y + Math.sin(this.lockAngle) * 240);
      ctx.stroke();
      ctx.restore();
    }
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.flash / 0.09, 0, 1) * 0.55;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (this.chillT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3; ctx.fillStyle = "#7dd3fc";
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 1.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (this.elite && this.hp < this.maxHp) {
      const wbar = this.radius * 2;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(this.x - wbar / 2, this.y - this.radius - 12, wbar, 4);
      ctx.fillStyle = "#ffd75e";
      ctx.fillRect(this.x - wbar / 2, this.y - this.radius - 12, wbar * (this.hp / this.maxHp), 4);
    }
  }
}

const Enemies = {
  list: [],
  spawn(type, x, y, wave, elite) {
    let e = null;
    for (const cand of this.list) if (!cand.alive && !cand.dying) { e = cand; break; }
    if (!e) {
      if (this.list.length >= 90) return null;
      e = new Enemy();
      this.list.push(e);
    }
    e.init(type, x, y, wave, elite);
    return e;
  },
  activeCount() {
    let n = 0;
    for (const e of this.list) if (e.alive && !e.dying) n++;
    return n;
  },
  update(dt, player) {
    for (const e of this.list) if (e.alive) e.update(dt, player);
    // Gentle separation so the swarm reads as creatures, not a blob.
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      if (!a.alive || a.dying) continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j];
        if (!b.alive || b.dying) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < rr * rr) {
          const d = Math.sqrt(d2), push = (rr - d) * 0.5;
          const px = (dx / d) * push, py = (dy / d) * push;
          a.x -= px; a.y -= py; b.x += px; b.y += py;
        }
      }
    }
  },
  draw(ctx, time) {
    for (const e of this.list) if (e.alive) e.draw(ctx, time);
  },
  clear() {
    for (const e of this.list) { e.alive = false; e.dying = false; }
  },
};

// The Hollow Queen: a singleton boss with three phases. Phase 1 stalks
// and sheds glooms; phase 2 adds spiral and radial petal fire; phase 3
// enrages, charging across the garden between denser spirals.
const Boss = {
  active: false, dying: false, counted: false,
  x: 0, y: 0, vx: 0, vy: 0, kx: 0, ky: 0,
  hp: 1, maxHp: 1, radius: BOSS_DEF.radius, angle: 0,
  phase: 1, t: 0, burstT: 3, spiralT: 0, spiralA: 0, spawnT: 2.5,
  chargeState: "stalk", chargeT: 4, lockAngle: 0, flash: 0, spawnAnim: 0,

  start(wave, x, y) {
    this.maxHp = BOSS_DEF.baseHp + BOSS_DEF.hpPerWave * wave;
    this.hp = this.maxHp;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0;
    this.active = true; this.dying = false; this.counted = false;
    this.phase = 1; this.t = 0; this.spawnAnim = 0;
    this.burstT = 2.6; this.spiralT = 0; this.spiralA = rand(0, 6);
    this.spawnT = 2.2; this.chargeState = "stalk"; this.chargeT = 3.6; this.flash = 0;
  },

  takeHit(dmg, angle, opts) {
    if (!this.active || this.dying) return "hit";
    this.hp -= dmg;
    this.flash = 0.07;
    this.kx += Math.cos(angle) * 7; this.ky += Math.sin(angle) * 7;
    if (this.hp <= 0) { this.dying = true; return "dead"; }
    return "hit";
  },

  update(dt, player, game) {
    if (!this.active || this.dying) return;
    this.t += dt; this.spawnAnim += dt;
    if (this.flash > 0) this.flash -= dt;
    const frac = this.hp / this.maxHp;
    const newPhase = frac > 0.66 ? 1 : (frac > 0.33 ? 2 : 3);
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      Particles.ring(this.x, this.y, "#e9d5ff", 190, 0.6, 5);
      Sound.sfx("bossRoar");
      game.onBossPhase(newPhase);
    }
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const speed = BOSS_DEF.speed * (this.phase === 3 ? 1.5 : 1);

    if (this.chargeState === "charge") {
      this.chargeT -= dt;
      if (this.chargeT <= 0) {
        this.chargeState = "stalk"; this.chargeT = rand(3.2, 4.2);
        for (let i = 0; i < 12; i++) {
          EnemyShots.fire(this.x, this.y, (i / 12) * Math.PI * 2, 215, 6);
        }
      }
    } else if (this.chargeState === "aim") {
      this.chargeT -= dt;
      this.lockAngle = Math.atan2(uy, ux);
      this.vx *= 0.85; this.vy *= 0.85;
      if (this.chargeT <= 0) {
        this.chargeState = "charge"; this.chargeT = 0.55;
        this.vx = Math.cos(this.lockAngle) * 445; this.vy = Math.sin(this.lockAngle) * 445;
        Sound.sfx("charge");
      }
    } else {
      // Stalk: phase 2 arcs around the keeper, phase 1 and 3 close in.
      const arc = this.phase === 2 ? Math.sin(this.t * 0.9) * 0.7 : 0;
      const a = Math.atan2(uy, ux) + arc * 0.6;
      this.vx = Math.cos(a) * speed; this.vy = Math.sin(a) * speed;
      if (this.phase === 3) {
        this.chargeT -= dt;
        if (this.chargeT <= 0) { this.chargeState = "aim"; this.chargeT = 0.6; }
      }
    }
    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += (this.vx + this.kx) * dt;
    this.y += (this.vy + this.ky) * dt;
    this.kx *= Math.max(0, 1 - 6 * dt); this.ky *= Math.max(0, 1 - 6 * dt);
    this.x = clamp(this.x, this.radius, CFG.width - this.radius);
    this.y = clamp(this.y, this.radius, CFG.height - this.radius);

    // Shed glooms in every phase, capped so the arena stays fair.
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = this.phase === 3 ? 2.4 : 3.2;
      if (Enemies.activeCount() < 7) {
        Enemies.spawn("mini", this.x + rand(-30, 30), this.y + rand(-30, 30), game.wave, false);
        Particles.burst(this.x, this.y, { n: 6, color: "#a78bfa", speed: 130, size: 3 });
      }
    }
    // Radial bursts.
    this.burstT -= dt;
    if (this.burstT <= 0) {
      this.burstT = this.phase === 1 ? 3.4 : 2.5;
      const n = this.phase === 1 ? 8 : 10;
      const off = rand(0, Math.PI * 2);
      for (let i = 0; i < n; i++) EnemyShots.fire(this.x, this.y, off + (i / n) * Math.PI * 2, 195, 6);
      Sound.sfx("spit");
    }
    // Spiral streams in phases 2 and 3.
    if (this.phase >= 2) {
      this.spiralT -= dt;
      if (this.spiralT <= 0) {
        this.spiralT = this.phase === 3 ? 0.13 : 0.17;
        this.spiralA += 0.62;
        EnemyShots.fire(this.x, this.y, this.spiralA, 225, 5);
        EnemyShots.fire(this.x, this.y, this.spiralA + Math.PI, 225, 5);
      }
    }
  },

  draw(ctx, time) {
    if (!this.active) return;
    const enraged = this.phase === 3;
    const frame = Math.floor(time * 5) % 2;
    const img = Sprites.bossBody(frame, enraged);
    const scaleIn = clamp(this.spawnAnim / 0.6, 0.3, 1);
    ctx.save();
    ctx.translate(this.x, this.y);
    const glowS = 300 * scaleIn;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(Sprites.glow(enraged ? "#f87171" : "#c084fc"), -glowS / 2, -glowS / 2, glowS, glowS);
    ctx.globalAlpha = 1;
    ctx.rotate(Math.sin(this.t * 1.3) * 0.08);
    const s = img.width * scaleIn;
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
    ctx.restore();
    if (this.chargeState === "aim") {
      ctx.save();
      ctx.strokeStyle = "rgba(248,113,113,0.55)";
      ctx.setLineDash([8, 8]); ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.lockAngle) * 460, this.y + Math.sin(this.lockAngle) * 460);
      ctx.stroke();
      ctx.restore();
    }
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.flash / 0.07, 0, 1) * 0.5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  clear() { this.active = false; this.dying = false; },
};

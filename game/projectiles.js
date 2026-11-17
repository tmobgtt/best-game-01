// projectiles.js — pooled projectiles for the five shooting towers (the
// Storm Pylon is instant and lives in towers.js). Shells fly a visible arc
// and splash; shards chill; stings poison; spears can crit.
"use strict";

AK.Projectiles = {
  list: [],
  pool: new AK.Pool(() => ({}), 700),
  init() { for (const p of this.list) this.pool.put(p); this.list.length = 0; },
  spawn(kind, x, y, target, o) {
    const p = this.pool.get();
    p.kind = kind; p.x = x; p.y = y; p.target = target;
    p.tx = target ? target.x : x; p.ty = target ? target.y : y;
    p.speed = o.speed; p.dmg = o.dmg; p.towerKind = o.towerKind;
    p.splash = o.splash || 0; p.slowPct = o.slowPct || 0; p.slowDur = o.slowDur || 0;
    p.freezeC = o.freezeC || 0; p.poison = o.poison || 0; p.poisonDur = o.poisonDur || 0;
    p.crit = !!o.crit; p.critM = o.critM || 2; p.burn = !!o.burn;
    p.t = 0; p.flyTime = 0; p.sx = x; p.sy = y; p.dead = false;
    if (kind === "shell") {
      const d = AK.dist(x, y, p.tx, p.ty);
      p.flyTime = Math.max(0.25, d / o.speed);
    }
    this.list.push(p);
    return p;
  },
  hitEnemy(p, e) {
    // wraiths phase through physical shots (not frost, not storm)
    if (e.def.evade && (p.kind === "bolt" || p.kind === "sting" || p.kind === "spear")) {
      if (Math.random() < e.def.evade) { AK.FX.text(e.x, e.y - 14, "PHASED", "#aef4ff", 11); return; }
    }
    let dmg = p.dmg;
    if (p.kind === "spear" && p.crit) {
      dmg *= p.critM;
      AK.FX.text(e.x, e.y - 18, "CRIT " + Math.round(dmg), "#fff3a0", 15);
    }
    e.damage(dmg, p.towerKind);
    AK.FX.burst(e.x, e.y, AK.TOWERS[p.towerKind].color, 3, 90, 0.25, 2.2);
    if (p.slowPct) {
      e.applySlow(p.slowPct, p.slowDur);
      if (p.freezeC && Math.random() < p.freezeC) { e.freezeUntil = AK.G.time + 0.7; AK.Audio.freeze(); AK.FX.ring(e.x, e.y, "#9fe8ff", 120, 2); }
    }
    if (p.poison) e.applyPoison(p.poison, p.poisonDur);
    AK.Audio.hit();
  },
  landShell(p) {
    const G = AK.G;
    AK.FX.burst(p.tx, p.ty, "#ff8a4d", 16, 190, 0.45, 3.4);
    AK.FX.ring(p.tx, p.ty, "#ffb04d", 300, 3);
    AK.Audio.noise(0.18, 0.1, 800);
    for (const e of [...G.enemies]) {
      if (!e.alive) continue;
      const d = AK.dist(e.x, e.y, p.tx, p.ty);
      if (d <= p.splash + e.def.r) {
        const fall = 1 - 0.45 * Math.min(1, d / p.splash);
        e.damage(p.dmg * fall, p.towerKind);
      }
    }
    if (p.burn) G.burns.push({ x: p.tx, y: p.ty, r: p.splash * 0.8, until: G.time + 2.2, dps: 26 });
  },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      if (p.kind === "shell") {
        p.t += dt;
        const k = Math.min(1, p.t / p.flyTime);
        p.x = AK.lerp(p.sx, p.tx, k); p.y = AK.lerp(p.sy, p.ty, k);
        p.z = Math.sin(k * Math.PI) * 54;
        if (k >= 1) { this.landShell(p); p.dead = true; }
      } else {
        const t = p.target;
        if (t && t.alive) { p.tx = t.x; p.ty = t.y; }
        const d = AK.dist(p.x, p.y, p.tx, p.ty);
        const step = p.speed * dt;
        if (t && t.alive && d <= Math.max(step, t.def.r + 4)) { this.hitEnemy(p, t); p.dead = true; }
        else if (d <= step) { p.dead = true; } // target gone: fizzle at last point
        else { p.x += (p.tx - p.x) / d * step; p.y += (p.ty - p.y) / d * step; }
        if (Math.random() < 0.5) AK.FX.trail(p.x, p.y, AK.TOWERS[p.towerKind].color, 2.4);
      }
      if (p.dead) { L.splice(i, 1); this.pool.put(p); }
    }
  },
  draw(ctx) {
    for (const p of this.list) {
      const col = AK.TOWERS[p.towerKind].color;
      if (p.kind === "shell") {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 7, 3, 0, 0, 7); ctx.fill();
        ctx.drawImage(AK.SPR.orb.mortar, p.x - 8, p.y - (p.z || 0) - 8);
      } else if (p.kind === "spear") {
        const a = Math.atan2(p.ty - p.y, p.tx - p.x);
        ctx.strokeStyle = col; ctx.lineWidth = p.crit ? 4 : 3;
        ctx.beginPath(); ctx.moveTo(p.x - Math.cos(a) * 12, p.y - Math.sin(a) * 12); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.drawImage(AK.SPR.glowWhite, p.x - 20, p.y - 20);
      } else {
        const img = AK.SPR.orb[p.towerKind];
        ctx.drawImage(img, p.x - img.width / 2, p.y - img.height / 2);
      }
      void col;
    }
  },
};

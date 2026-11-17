// enemies.js — one Enemy per foe on the road. Movement is distance along
// the rune road; status effects (slow, freeze, poison) live here; the
// Mender heals, the Splitter splits, the Titan sheds Mites as it breaks.
"use strict";

let enemySeq = 1;
AK.Enemy = class {
  constructor(kind, hpScale, distOffset = 0) {
    this.id = enemySeq++;
    this.kind = kind;
    this.def = AK.ENEMIES[kind];
    this.maxHp = Math.round(this.def.hp * hpScale);
    this.hp = this.maxHp;
    this.dist = distOffset; // distance along the road (px)
    this.x = -80; this.y = 0; this.ang = 0;
    this.slowPct = 0; this.slowUntil = 0; this.freezeUntil = 0;
    this.poisons = []; // {dps, until}
    this.alive = true; this.leaked = false;
    this.healAt = 0; this.shedAt = this.def.boss ? 0.8 : 0; // titan sheds at 80/60/40/20%
    this.flash = 0; this.wob = Math.random() * 7;
    const p = AK.Map.posAt(Math.max(0, this.dist));
    this.x = p.x; this.y = p.y;
  }
  get frozen() { return AK.G.time < this.freezeUntil; }
  get slowed() { return AK.G.time < this.slowUntil; }
  speedNow() {
    if (this.frozen) return 0;
    let s = this.def.speed;
    if (this.slowed) s *= (1 - this.slowPct);
    return s;
  }
  applySlow(pct, dur) {
    const now = AK.G.time;
    if (pct >= this.slowPct || now >= this.slowUntil) { this.slowPct = pct; this.slowUntil = now + dur; }
    else this.slowUntil = Math.max(this.slowUntil, now + dur * 0.5);
  }
  applyPoison(dps, dur) {
    const now = AK.G.time;
    const cap = AK.G.poisonCap || 3;
    const live = this.poisons.filter((p) => p.until > now);
    if (live.length < cap) live.push({ dps, until: now + dur });
    else { const weakest = live.reduce((a, b) => a.dps < b.dps ? a : b); if (dps > weakest.dps) { weakest.dps = dps; weakest.until = now + dur; } }
    this.poisons = live;
  }
  // direct hit. srcKind: tower kind or 'meteor'/'poison'. Returns damage dealt.
  damage(amount, srcKind) {
    if (!this.alive) return 0;
    let dmg = amount;
    if (srcKind !== "poison") dmg = Math.max(1, amount - this.def.armor);
    this.hp -= dmg;
    this.flash = 0.08;
    if (this.hp <= 0) this.die(srcKind);
    return dmg;
  }
  die(srcKind) {
    if (!this.alive) return;
    this.alive = false;
    const G = AK.G;
    G.gold += this.def.bounty; G.score += this.def.bounty * 10; G.kills++;
    G.goldEarned += this.def.bounty;
    AK.FX.burst(this.x, this.y, this.def.color, this.def.boss ? 46 : 12, this.def.boss ? 260 : 150, 0.6, this.def.boss ? 4.5 : 3);
    AK.FX.coin(this.x, this.y);
    if (this.def.boss) { AK.FX.ring(this.x, this.y, "#ff5d7a", 420, 5); G.shake = Math.max(G.shake, 13); AK.Audio.meteor(); }
    if (Math.random() < 0.35) AK.Audio.coin();
    if (this.def.splits) {
      for (let i = 0; i < this.def.splits; i++) {
        const m = new AK.Enemy("mite", G.hpScale, this.dist - i * 14);
        m.hp = m.maxHp; G.enemies.push(m);
      }
    }
    if (srcKind === "venom" && G.plagueSpread) {
      for (const e of G.enemies) {
        if (e !== this && e.alive && AK.dist2(e.x, e.y, this.x, this.y) < 80 * 80) e.applyPoison(7, 2.5);
      }
    }
  }
  update(dt) {
    const G = AK.G, now = G.time;
    // poison ticks
    if (this.poisons.length) {
      let dps = 0;
      this.poisons = this.poisons.filter((p) => p.until > now);
      for (const p of this.poisons) dps += p.dps;
      if (dps > 0) { this.hp -= dps * dt; if (this.hp <= 0) { this.die("poison"); return; } }
    }
    // mender heals nearby allies (not itself, not bosses)
    if (this.def.heal && now >= this.healAt && !this.frozen) {
      this.healAt = now + 0.9;
      for (const e of G.enemies) {
        if (e !== this && e.alive && !e.def.boss && e.hp < e.maxHp && AK.dist2(e.x, e.y, this.x, this.y) < this.def.healRange ** 2) {
          e.hp = Math.min(e.maxHp, e.hp + this.def.heal);
          AK.FX.trail(e.x, e.y - 8, "#7dffb0", 3);
        }
      }
    }
    // titan sheds mites as its shell breaks
    if (this.def.boss && this.hp < this.maxHp * this.shedAt) {
      this.shedAt -= 0.2;
      for (let i = 0; i < 3; i++) G.enemies.push(new AK.Enemy("mite", G.hpScale, this.dist - 10 - i * 16));
      AK.FX.text(this.x, this.y - 40, "IT SHEDS", "#ff8fa5", 13);
    }
    this.dist += this.speedNow() * dt;
    const p = AK.Map.posAt(this.dist);
    this.x = p.x; this.y = p.y; this.ang = p.ang;
    if (this.flash > 0) this.flash -= dt;
    if (this.dist >= AK.Map.totalLen - 4) { this.alive = false; this.leaked = true; }
  }
  draw(ctx) {
    const img = AK.SPR.enemy[this.kind], R = this.def.r;
    const wob = Math.sin(AK.G.time * 6 + this.wob) * (this.frozen ? 0 : 1.6);
    ctx.save(); ctx.translate(this.x, this.y + wob * 0.3);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    if (this.flash > 0) { ctx.globalAlpha = this.flash * 6; ctx.globalCompositeOperation = "lighter"; ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.globalCompositeOperation = "source-over"; }
    ctx.restore();
    if (this.frozen) {
      ctx.fillStyle = "rgba(170,235,255,0.4)";
      ctx.beginPath(); ctx.arc(this.x, this.y, R + 4, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(220,250,255,0.8)"; ctx.stroke();
    } else if (this.poisons.length) {
      ctx.fillStyle = "rgba(141,255,110,0.20)";
      ctx.beginPath(); ctx.arc(this.x, this.y, R + 3, 0, 7); ctx.fill();
    }
    // hp bar when hurt
    if (this.hp < this.maxHp) {
      const w = Math.max(26, R * 2), pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = "rgba(6,8,14,0.75)"; ctx.fillRect(this.x - w / 2, this.y - R - 13, w, 5);
      ctx.fillStyle = pct > 0.45 ? "#6fe08a" : pct > 0.2 ? "#ffd75e" : "#ff5d7a";
      ctx.fillRect(this.x - w / 2 + 1, this.y - R - 12, (w - 2) * pct, 3);
    }
    void wob;
  }
};

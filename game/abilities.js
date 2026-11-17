// abilities.js — the two keeper spells: Meteor (aimed, telegraphed) and
// Blizzard (a global freeze). Cooldowns and pending strikes live here.
"use strict";

AK.Abilities = {
  meteorCd: 0, blizzardCd: 0, aiming: false, pending: [], // {x,y,t}
  init() { this.meteorCd = 0; this.blizzardCd = 0; this.aiming = false; this.pending.length = 0; },
  ready(kind) { return kind === "meteor" ? this.meteorCd <= 0 : this.blizzardCd <= 0; },
  aimMeteor() {
    if (this.meteorCd > 0) { AK.Audio.denied(); return; }
    this.aiming = true;
  },
  castMeteorAt(x, y) {
    const def = AK.ABILITIES.meteor;
    this.pending.push({ x, y, t: 0.85 });
    this.meteorCd = def.cd; this.aiming = false;
    AK.Audio.tone(1200, 0.5, "sine", 0.05, 300);
  },
  castBlizzard() {
    if (this.blizzardCd > 0) { AK.Audio.denied(); return false; }
    const G = AK.G, def = AK.ABILITIES.blizzard;
    this.blizzardCd = def.cd;
    for (const e of G.enemies) if (e.alive) { e.freezeUntil = G.time + def.freeze; e.applySlow(0.5, def.freeze + 1.5); }
    AK.FX.ring(480, 420, "#9fe8ff", 900, 6);
    AK.Audio.blizzard();
    G.banner = { text: "BLIZZARD", sub: "the road holds its breath", until: G.time + 1.4 };
    return true;
  },
  update(dt) {
    this.meteorCd = Math.max(0, this.meteorCd - dt);
    this.blizzardCd = Math.max(0, this.blizzardCd - dt);
    const def = AK.ABILITIES.meteor, G = AK.G;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i]; p.t -= dt;
      if (p.t <= 0) {
        this.pending.splice(i, 1);
        AK.Audio.meteor(); G.shake = Math.max(G.shake, 10);
        AK.FX.burst(p.x, p.y, "#ffb04d", 30, 300, 0.6, 4);
        AK.FX.ring(p.x, p.y, "#ffb04d", 430, 4);
        for (const e of [...G.enemies]) {
          if (e.alive && AK.dist(e.x, e.y, p.x, p.y) <= def.radius + e.def.r) e.damage(def.dmg, "meteor");
        }
        G.burns.push({ x: p.x, y: p.y, r: def.radius * 0.7, until: G.time + 2.4, dps: 30 });
      }
    }
  },
  draw(ctx) {
    const def = AK.ABILITIES.meteor;
    for (const p of this.pending) {
      const k = 1 - Math.max(0, p.t) / 0.85;
      ctx.strokeStyle = "rgba(255,120,60,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, def.radius * (1 - k * 0.55), 0, 7); ctx.stroke();
      ctx.fillStyle = "rgba(255,120,60,0.16)";
      ctx.beginPath(); ctx.arc(p.x, p.y, def.radius, 0, 7); ctx.fill();
      const mx = p.x + 130 * (p.t / 0.85), my = p.y - 190 * (p.t / 0.85);
      ctx.drawImage(AK.SPR.orb.mortar, mx - 12, my - 12);
      ctx.strokeStyle = "rgba(255,176,77,0.5)";
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    if (this.aiming) {
      const { x, y } = AK.Input;
      ctx.strokeStyle = "rgba(255,176,77,0.95)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, def.radius, 0, 7); ctx.stroke();
      ctx.fillStyle = "rgba(255,176,77,0.13)";
      ctx.beginPath(); ctx.arc(x, y, def.radius, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffd9a0"; ctx.font = "700 13px 'Segoe UI'"; ctx.textAlign = "center";
      ctx.fillText("click to strike — right-click or Q to cancel", x, y - def.radius - 10);
    }
  },
};

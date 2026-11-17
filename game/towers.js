// towers.js — the six tower kinds: stats by level, targeting modes, firing
// (projectiles for five kinds, instant chaining arcs for the Storm Pylon),
// and the ascended final forms.
"use strict";

AK.Tower = class {
  constructor(kind, c, r) {
    this.kind = kind; this.def = AK.TOWERS[kind];
    this.c = c; this.r = r;
    const p = AK.Map.tileCenter(c, r);
    this.x = p.x; this.y = p.y;
    this.level = 1; this.ascended = false;
    this.invested = this.def.cost;
    this.cd = 0.3; this.mode = "first"; this.kills = 0;
    this.flashT = 0;
  }
  get lv() { return this.ascended ? 3 : this.level; }
  dmg() { let d = this.def.dmg * Math.pow(this.def.growth.dmg, this.lv - 1); return this.ascended ? d * 1.35 : d; }
  range() { return this.def.range + this.def.growth.range * (this.lv - 1) + (this.ascended ? 12 : 0); }
  rate() { let r = this.def.rate * Math.pow(this.def.growth.rate, this.lv - 1); return this.ascended ? r * 1.15 : r; }
  splash() { return this.def.splash ? this.def.splash + 8 * (this.lv - 1) + (this.ascended ? 30 : 0) : 0; }
  chain() { return this.ascended ? 6 : (this.def.chain || 0); }
  slowPct() { return this.ascended ? 0.65 : (this.def.slowPct || 0) + 0.05 * (this.lv - 1); }
  poisonDps() { let p = (this.def.poison || 0) * Math.pow(1.5, this.lv - 1); return this.ascended ? p * 1.4 : p; }
  upgradeCost() { return this.level < 3 ? Math.round(this.def.cost * AK.UPGRADE_MULT[this.level]) : null; }
  sellValue() { return Math.floor(this.invested * AK.CFG.SELL_RATE); }
  targets() {
    const G = AK.G, range = this.range(), out = [];
    for (const e of G.enemies) {
      if (!e.alive) continue;
      if (AK.dist2(e.x, e.y, this.x, this.y) <= (range + e.def.r) * (range + e.def.r)) out.push(e);
    }
    const by = {
      first: (a, b) => b.dist - a.dist,
      last: (a, b) => a.dist - b.dist,
      strong: (a, b) => b.hp - a.hp,
      close: (a, b) => AK.dist2(a.x, a.y, this.x, this.y) - AK.dist2(b.x, b.y, this.x, this.y),
    };
    out.sort(by[this.mode]);
    return out;
  }
  update(dt) {
    this.cd -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    // frost ascended aura: a standing chill inside range
    if (this.kind === "frost" && this.ascended) {
      for (const e of AK.G.enemies) {
        if (e.alive && AK.dist2(e.x, e.y, this.x, this.y) < this.range() ** 2) e.applySlow(0.18, 0.25);
      }
    }
    if (this.cd > 0) return;
    const ts = this.targets();
    if (!ts.length) { this.cd = 0.05; return; }
    this.fire(ts);
    this.cd = 1 / this.rate();
    this.flashT = 0.07;
  }
  fire(ts) {
    const G = AK.G, t = ts[0], d = this.def;
    AK.Audio.shoot(this.kind);
    const base = { speed: d.projSpeed, dmg: this.dmg(), towerKind: this.kind };
    if (this.kind === "bolt") {
      const n = this.ascended ? 3 : 1;
      for (let i = 0; i < Math.min(n, ts.length); i++) AK.Projectiles.spawn("bolt", this.x, this.y - 14, ts[i], base);
    } else if (this.kind === "mortar") {
      // lead the target a little along its heading
      const fly = AK.dist(this.x, this.y, t.x, t.y) / d.projSpeed;
      const lead = { x: t.x + Math.cos(t.ang) * t.speedNow() * fly * 0.55, y: t.y + Math.sin(t.ang) * t.speedNow() * fly * 0.55 };
      AK.Projectiles.spawn("shell", this.x, this.y - 10, null, { ...base, splash: this.splash(), burn: this.ascended });
      const p = AK.Projectiles.list[AK.Projectiles.list.length - 1];
      p.tx = lead.x; p.ty = lead.y;
      p.flyTime = Math.max(0.25, AK.dist(this.x, this.y, lead.x, lead.y) / d.projSpeed);
    } else if (this.kind === "frost") {
      AK.Projectiles.spawn("shard", this.x, this.y - 16, t, { ...base, slowPct: this.slowPct(), slowDur: d.slowDur, freezeC: this.ascended ? 0.12 : 0 });
    } else if (this.kind === "venom") {
      AK.Projectiles.spawn("sting", this.x, this.y - 12, t, { ...base, poison: this.poisonDps(), poisonDur: d.poisonDur });
    } else if (this.kind === "lance") {
      const crit = Math.random() < (this.ascended ? 0.4 : d.critC);
      AK.Projectiles.spawn("spear", this.x, this.y - 20, t, { ...base, crit, critM: this.ascended ? 3 : d.critM });
    } else if (this.kind === "storm") {
      // instant chain lightning
      let cur = t, from = { x: this.x, y: this.y - 16 }, dmg = this.dmg();
      const hitSet = new Set(), fall = this.ascended ? 0.88 : 0.78;
      for (let leap = 0; leap < this.chain() && cur; leap++) {
        AK.FX.arc([[from.x, from.y], [cur.x, cur.y]], "#cdb2ff", leap === 0 ? 3 : 2);
        if (cur.def.evade && Math.random() < cur.def.evade) AK.FX.text(cur.x, cur.y - 14, "PHASED", "#aef4ff", 11);
        else { cur.damage(dmg, "storm"); AK.FX.burst(cur.x, cur.y, "#b78cff", 4, 100, 0.22, 2.4); }
        hitSet.add(cur.id); from = cur;
        dmg *= fall;
        let best = null, bd = 118 * 118;
        for (const e of G.enemies) {
          if (!e.alive || hitSet.has(e.id)) continue;
          const dd = AK.dist2(e.x, e.y, from.x, from.y);
          if (dd < bd) { bd = dd; best = e; }
        }
        cur = best;
      }
    }
    void G;
  }
  draw(ctx) {
    const idx = this.ascended ? 3 : this.level - 1;
    const img = AK.SPR.tower[this.kind][idx];
    const s = AK.CFG.TILE;
    // a soft pool of the tower's own colour under it, always — reads as
    // presence on the dark vale and makes each kind legible at a glance
    const gl = AK.SPR.glow[this.kind];
    ctx.globalAlpha = this.ascended ? 0.55 + Math.sin(AK.G.time * 3 + this.x) * 0.15 : 0.34;
    ctx.drawImage(gl, this.x - 44, this.y - 44);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 22, 24, 8, 0, 0, 7); ctx.fill();
    ctx.drawImage(img, this.x - s / 2 - 3, this.y - s / 2 - 3, s + 6, s + 6);
    if (this.flashT > 0) {
      ctx.drawImage(AK.SPR.glow[this.kind], this.x - 26, this.y - 40);
    }
    // level pips
    ctx.fillStyle = "#ffe98a";
    for (let i = 0; i < this.level; i++) ctx.fillRect(this.x - 12 + i * 9, this.y + s / 2 - 8, 6, 3.4);
    if (this.ascended) { ctx.fillStyle = "#fff3a0"; ctx.font = "700 10px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText("ASC", this.x, this.y + s / 2 - 12); }
  }
};
AK.TOWER_MODES = ["first", "last", "strong", "close"];

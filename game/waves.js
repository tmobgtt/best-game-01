// waves.js — the wave director: builds each wave's spawn queue from the
// composition tables, runs the intermission clock, pays completion and
// interest, and calls the next wave early for a bonus when the keeper dares.
"use strict";

AK.Waves = {
  phase: "intermission", // 'intermission' | 'active'
  timer: 6,               // seconds to the next wave (intermission) 
  queue: [],              // pending spawns {kind, at}
  clock: 0,               // time inside the active wave
  init() { this.phase = "intermission"; this.timer = 6; this.queue = []; this.clock = 0; },
  hpScaleFor(wave) { return Math.pow(1 + AK.HP_GROWTH, wave - 1); },
  compFor(wave) {
    if (wave <= AK.WAVES.length) return AK.WAVES[wave - 1];
    // endless: recycle late comps with more of everything
    const base = AK.WAVES[(wave - 1) % AK.WAVES.length];
    return base.map(([k, n, g]) => [k, Math.ceil(n * 1.3), Math.max(0.25, g * 0.9)]);
  },
  preview(wave) {
    const counts = {};
    for (const [k, n] of this.compFor(wave)) counts[k] = (counts[k] || 0) + n;
    return counts;
  },
  hasBoss(wave) { return this.compFor(wave).some(([k]) => k === "titan"); },
  startWave(early) {
    const G = AK.G;
    if (this.phase !== "intermission") return;
    if (early && this.timer > 0.5) {
      const bonus = Math.ceil(this.timer) * AK.CFG.EARLY_BONUS_PER_SEC;
      G.gold += bonus; G.score += bonus * 5;
      AK.FX.text(480, 120, `EARLY CALL +${bonus}g`, "#ffd75e", 15);
    }
    G.wave++;
    G.hpScale = this.hpScaleFor(G.wave);
    this.queue = [];
    let at = 0.4;
    for (const [kind, count, gap] of this.compFor(G.wave)) {
      for (let i = 0; i < count; i++) { this.queue.push({ kind, at }); at += gap; }
      at += 0.8;
    }
    this.clock = 0; this.phase = "active";
    AK.Audio.horn();
    const boss = this.hasBoss(G.wave);
    if (boss) AK.Audio.bossAlarm();
    G.banner = {
      text: `WAVE ${G.wave}`,
      sub: boss ? "the Hollow Titan walks the road" : AK.pick(["they come for the crystal", "hold the vale", "the runes flare awake", "steel yourselves", "the road darkens"]),
      until: G.time + 2.0,
    };
  },
  update(dt) {
    const G = AK.G;
    if (this.phase === "intermission") {
      this.timer -= dt;
      if (this.timer <= 0) this.startWave(false);
      return;
    }
    this.clock += dt;
    while (this.queue.length && this.queue[0].at <= this.clock) {
      const s = this.queue.shift();
      G.enemies.push(new AK.Enemy(s.kind, G.hpScale));
    }
    if (!this.queue.length && !G.enemies.some((e) => e.alive)) {
      // wave cleared
      const interest = Math.min(AK.CFG.INTEREST_CAP, Math.floor(G.gold * AK.CFG.INTEREST));
      const bonus = 20 + G.wave * 2 + interest;
      G.gold += bonus; G.score += 100 + G.wave * 25;
      AK.FX.text(480, 120, `WAVE CLEAR +${bonus}g`, "#8dff6e", 16);
      AK.Audio.upgrade();
      if (G.wave >= AK.CFG.MAX_WAVE && !G.endless) { G.winGame(); return; }
      this.phase = "intermission"; this.timer = 10;
    }
  },
};

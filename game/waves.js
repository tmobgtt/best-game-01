// waves.js — the wave director. It spends a growing budget on creature
// types as they unlock, deals named events (a surge, an emberfall, a dart
// storm) from wave 3, and every fifth wave it clears the arena and sends
// the Hollow Queen instead. main.js owns the game states; the director
// only decides what arrives and calls back when a wave is spent.

const Director = {
  wave: 0,
  phase: "idle",            // idle | intermission | active | clear
  queue: [],
  spawnT: 0,
  phaseT: 0,
  event: null,
  isBossWave: false,
  hooks: { onStart: null, onClear: null, onBossArrive: null },

  reset() {
    this.wave = 0;
    this.phase = "idle";
    this.queue.length = 0;
    this.event = null;
    this.isBossWave = false;
  },

  budgetFor(wave) { return Math.round(9 + wave * 3.4); },

  nextWave() {
    this.wave++;
    this.isBossWave = this.wave % CFG.bossEvery === 0;
    this.event = null;
    this.queue.length = 0;
    if (!this.isBossWave) {
      if (this.wave >= 3 && Math.random() < 0.34) {
        const ev = pick(WAVE_EVENTS);
        if (ENEMY_TYPES[ev.only].unlock <= this.wave) this.event = ev;
      }
      let budget = this.budgetFor(this.wave);
      const unlocked = Object.keys(ENEMY_TYPES).filter((t) => ENEMY_TYPES[t].unlock <= this.wave);
      let guard = 0;
      while (budget > 0 && guard++ < 90) {
        let type;
        if (this.event && Math.random() < 0.68) type = this.event.only;
        else type = pick(unlocked);
        const cost = ENEMY_TYPES[type].cost;
        if (cost > budget) {
          const cheaper = unlocked.filter((t) => ENEMY_TYPES[t].cost <= budget);
          if (!cheaper.length) break;
          type = pick(cheaper);
        }
        this.queue.push(type);
        budget -= ENEMY_TYPES[type].cost;
      }
      // Shuffle so expensive creatures are not all first or all last.
      for (let i = this.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = this.queue[i]; this.queue[i] = this.queue[j]; this.queue[j] = tmp;
      }
    }
    this.phase = "intermission";
    this.phaseT = CFG.intermissionTime;
    this.spawnT = 0;
    if (this.hooks.onStart) this.hooks.onStart(this.wave, this.isBossWave, this.event);
  },

  spawnInterval() { return clamp(1.05 - this.wave * 0.045, 0.34, 1.05); },

  spawnPoint() {
    const m = CFG.spawnEdgeMargin;
    const edge = randInt(0, 3);
    if (edge === 0) return { x: rand(m, CFG.width - m), y: m };
    if (edge === 1) return { x: rand(m, CFG.width - m), y: CFG.height - m };
    if (edge === 2) return { x: m, y: rand(m, CFG.height - m) };
    return { x: CFG.width - m, y: rand(m, CFG.height - m) };
  },

  update(dt, game) {
    if (this.phase === "intermission") {
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        this.phase = "active";
        if (this.isBossWave) {
          Boss.start(this.wave, CFG.width / 2, 130);
          Sound.sfx("bossRoar");
          if (this.hooks.onBossArrive) this.hooks.onBossArrive(this.wave);
        }
      }
      return;
    }
    if (this.phase !== "active") return;
    if (this.queue.length > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = this.spawnInterval() * rand(0.7, 1.25);
        const type = this.queue.shift();
        const p = this.spawnPoint();
        const elite = this.wave >= 4 && ENEMY_TYPES[type].cost >= 2 &&
          Math.random() < CFG.eliteChanceBase + this.wave * 0.004;
        Enemies.spawn(type, p.x, p.y, this.wave, elite);
      }
    }
    const bossAlive = Boss.active && !Boss.dying;
    if (this.queue.length === 0 && Enemies.activeCount() === 0 && !bossAlive) {
      this.phase = "clear";
      if (this.hooks.onClear) this.hooks.onClear(this.wave);
    }
  },
};

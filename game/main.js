// main.js — AETHERKEEP's state machine and glue: boot, the frame loop,
// economy actions (build / upgrade / ascend / sell), click and key routing,
// leaks and endings, and the __AK hooks the play-test stages screenshots
// through (the game's own state, never a mock-up).
"use strict";

const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
AK.buildSprites();
AK.Map.init();
AK.Input.init(cv);

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

const G = {
  state: "title", prevState: "title",
  time: 0, playTime: 0,
  gold: 0, lives: 0, score: 0, kills: 0, goldEarned: 0,
  wave: 0, hpScale: 1,
  enemies: [], towers: new Map(),
  selected: null, buildKind: null,
  speed: 1, shake: 0, leakFlash: 0,
  banner: null, tickerText: null, tickerUntil: 0,
  burns: [], poisonCap: 3, plagueSpread: false,
  endless: false, demoAt: 0,
  best: store.get("aetherkeep-best", 0), bestWave: store.get("aetherkeep-bestwave", 0),
};
AK.G = G;

function say(text, secs = 4) { G.tickerText = text; G.tickerUntil = G.time + secs; }
function towerKey(c, r) { return c + "," + r; }

function newGame() {
  G.gold = AK.CFG.START_GOLD; G.lives = AK.CFG.START_LIVES;
  G.score = 0; G.kills = 0; G.goldEarned = 0; G.playTime = 0;
  G.wave = 0; G.hpScale = 1; G.enemies = []; G.towers = new Map();
  G.selected = null; G.buildKind = null; G.speed = 1; G.shake = 0;
  G.banner = null; G.burns = []; G.endless = false;
  AK.Waves.init(); AK.Abilities.init(); AK.FX.init(); AK.Projectiles.init();
  G.state = "play";
  say("Build your first towers — the road wakes soon. Space calls the wave early.");
}
function saveBest() {
  if (G.score > G.best) { G.best = G.score; store.set("aetherkeep-best", G.best); }
  if (G.wave > G.bestWave) { G.bestWave = G.wave; store.set("aetherkeep-bestwave", G.bestWave); }
}
G.winGame = function () {
  G.score += G.lives * 50; saveBest();
  G.state = "win"; AK.Audio.win();
  AK.FX.ring(790, 434, "#a8ffc4", 500, 5);
};
function loseGame() {
  saveBest(); G.state = "over"; AK.Audio.lose(); G.shake = 14;
}

// ---- economy actions -------------------------------------------------
function placeTower(kind, c, r) {
  const def = AK.TOWERS[kind];
  if (G.gold < def.cost) { AK.Audio.denied(); say(`Not enough gold for the ${def.name} (${def.cost}g).`); return false; }
  if (!AK.Map.buildable(c, r) || G.towers.has(towerKey(c, r))) { AK.Audio.denied(); return false; }
  const t = new AK.Tower(kind, c, r);
  G.towers.set(towerKey(c, r), t);
  G.gold -= def.cost;
  AK.Audio.place();
  AK.FX.ring(t.x, t.y, def.color, 190, 3);
  AK.FX.burst(t.x, t.y, "#cfe4ff", 8, 90, 0.35, 2.4);
  refreshVenomFlags();
  return true;
}
function refreshVenomFlags() {
  let asc = false;
  for (const t of G.towers.values()) if (t.kind === "venom" && t.ascended) asc = true;
  G.plagueSpread = asc; G.poisonCap = asc ? 5 : 3;
}
function upgradeSelected() {
  const t = G.selected; if (!t) return;
  if (t.ascended) return;
  if (t.level < 3) {
    const cost = t.upgradeCost();
    if (G.gold < cost) { AK.Audio.denied(); return; }
    G.gold -= cost; t.invested += cost; t.level++;
    AK.Audio.upgrade(); AK.FX.ring(t.x, t.y, "#ffe98a", 220, 3);
    AK.FX.text(t.x, t.y - 30, `LV${t.level}`, "#ffe98a", 14);
  } else {
    const cost = t.def.ascend.cost;
    if (G.gold < cost) { AK.Audio.denied(); return; }
    G.gold -= cost; t.invested += cost; t.ascended = true;
    AK.Audio.ascend(); AK.FX.ring(t.x, t.y, "#fff3a0", 340, 4);
    AK.FX.text(t.x, t.y - 34, t.def.ascend.name, "#fff3a0", 15);
    G.banner = { text: t.def.ascend.name, sub: `${t.def.name} wakes its final form`, until: G.time + 1.6 };
    refreshVenomFlags();
  }
}
function sellSelected() {
  const t = G.selected; if (!t) return;
  G.gold += t.sellValue();
  G.towers.delete(towerKey(t.c, t.r));
  G.selected = null;
  AK.Audio.sell(); AK.FX.burst(t.x, t.y, "#ffd75e", 10, 110, 0.4, 2.6);
  refreshVenomFlags();
}

// ---- routing -----------------------------------------------------------
function hudAction(a) {
  if (!a) return false;
  AK.Audio.click();
  if (a.startsWith("build:")) {
    const kind = a.slice(6);
    G.buildKind = G.buildKind === kind ? null : kind;
    G.selected = null;
  } else if (a === "upgrade" || a === "ascend") upgradeSelected();
  else if (a === "sell") sellSelected();
  else if (a === "mode") {
    const t = G.selected;
    if (t) { const i = AK.TOWER_MODES.indexOf(t.mode); t.mode = AK.TOWER_MODES[(i + 1) % AK.TOWER_MODES.length]; }
  }
  else if (a === "meteor") AK.Abilities.aimMeteor();
  else if (a === "blizzard") AK.Abilities.castBlizzard();
  else if (a === "startwave") AK.Waves.startWave(true);
  else if (a === "speed") G.speed = G.speed === 1 ? 2 : 1;
  else if (a === "pause") G.state = G.state === "pause" ? "play" : "pause";
  else if (a === "mute") AK.Audio.muted = !AK.Audio.muted;
  else if (a === "help") { G.prevState = G.state; G.state = "help"; }
  return true;
}
function screenHit(x, y) {
  for (const b of AK.Screens.buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
  }
  return null;
}
function onClick() {
  const { x, y } = AK.Input;
  if (G.state === "title") { newGame(); return; }
  if (G.state === "help") { G.state = G.prevState; return; }
  if (G.state === "over") { if (screenHit(x, y) === "restart") newGame(); return; }
  if (G.state === "win") {
    const a = screenHit(x, y);
    if (a === "restart") newGame();
    else if (a === "endless") {
      G.endless = true; G.state = "play";
      AK.Waves.phase = "intermission"; AK.Waves.timer = 8;
      say("Endless: the road keeps coming. How long can the crystal hold?");
    }
    return;
  }
  if (G.state === "pause") { hudAction(AK.HUD.hit(x, y)); return; }
  // play
  if (AK.Abilities.aiming) {
    const tile = AK.Map.tileAt(x, y);
    if (tile) { AK.Abilities.castMeteorAt(x, y); return; }
    AK.Abilities.aiming = false; return;
  }
  if (hudAction(AK.HUD.hit(x, y))) return;
  const tile = AK.Map.tileAt(x, y);
  if (G.buildKind) {
    if (tile && placeTower(G.buildKind, tile.c, tile.r)) {
      if (!AK.Input.keys["ShiftLeft"] && !AK.Input.keys["ShiftRight"]) G.buildKind = null;
    } else if (!tile) G.buildKind = null;
    return;
  }
  if (tile && G.towers.has(towerKey(tile.c, tile.r))) {
    G.selected = G.towers.get(towerKey(tile.c, tile.r));
    AK.Audio.click();
  } else G.selected = null;
}
function onRightClick() {
  if (G.state !== "play") return;
  if (AK.Abilities.aiming) AK.Abilities.aiming = false;
  else if (G.buildKind) G.buildKind = null;
  else G.selected = null;
}
function onKeys() {
  const P = (c) => AK.Input.wasPressed(c);
  if (G.state === "title" && (P("Enter") || P("Space"))) { newGame(); return; }
  if ((G.state === "over" || G.state === "win") && P("KeyR")) { newGame(); return; }
  if (G.state === "win" && P("KeyE")) { G.endless = true; G.state = "play"; AK.Waves.phase = "intermission"; AK.Waves.timer = 8; return; }
  if (P("KeyH")) { if (G.state === "help") G.state = G.prevState; else if (G.state === "play" || G.state === "title" || G.state === "pause") { G.prevState = G.state; G.state = "help"; } return; }
  if (G.state === "help") { if (P("Escape")) G.state = G.prevState; return; }
  if (G.state !== "play" && G.state !== "pause") return;
  if (P("KeyP") || P("Escape")) {
    if (G.state === "play" && P("Escape") && (G.buildKind || G.selected || AK.Abilities.aiming)) { onRightClick(); return; }
    G.state = G.state === "pause" ? "play" : "pause"; return;
  }
  if (G.state !== "play") return;
  if (P("Space")) AK.Waves.startWave(true);
  if (P("KeyF")) G.speed = G.speed === 1 ? 2 : 1;
  if (P("KeyM")) AK.Audio.muted = !AK.Audio.muted;
  if (P("KeyQ")) { if (AK.Abilities.aiming) AK.Abilities.aiming = false; else AK.Abilities.aimMeteor(); }
  if (P("KeyW")) AK.Abilities.castBlizzard();
  for (const kind of AK.TOWER_ORDER) {
    if (P("Digit" + AK.TOWERS[kind].key)) { G.buildKind = G.buildKind === kind ? null : kind; G.selected = null; }
  }
}

// ---- simulation --------------------------------------------------------
function updatePlay(dt) {
  G.playTime += dt;
  AK.Waves.update(dt);
  for (const t of G.towers.values()) t.update(dt);
  AK.Projectiles.update(dt);
  AK.Abilities.update(dt);
  // burning ground
  for (let i = G.burns.length - 1; i >= 0; i--) {
    const b = G.burns[i];
    if (G.time > b.until) { G.burns.splice(i, 1); continue; }
    for (const e of G.enemies) {
      if (e.alive && AK.dist2(e.x, e.y, b.x, b.y) < b.r * b.r) e.damage(b.dps * dt, "poison");
    }
  }
  for (const e of G.enemies) if (e.alive) e.update(dt);
  // leaks and cleanup
  let lost = false;
  G.enemies = G.enemies.filter((e) => {
    if (e.leaked) {
      G.lives -= e.def.leak; G.leakFlash = AK.CFG.LEAK_FLASH; G.shake = Math.max(G.shake, 8);
      AK.Audio.leak();
      AK.FX.text(810, 434, `-${e.def.leak} ♥`, "#ff5d7a", 17);
      lost = true;
      return false;
    }
    return e.alive;
  });
  if (lost && G.lives <= 0) { G.lives = 0; loseGame(); }
  const threat = AK.clamp(G.enemies.length / 16, 0, 1);
  AK.Audio.music(threat);
}
function updateTitle(dt) {
  // a quiet parade walks the road behind the title
  G.demoAt -= dt;
  if (G.demoAt <= 0 && G.enemies.length < 9) {
    G.demoAt = 1.1;
    G.enemies.push(new AK.Enemy(AK.pick(["mite", "grunt", "runner", "wraith", "bulwark", "mender", "splitter"]), 1));
  }
  for (const e of G.enemies) if (e.alive) e.update(dt);
  G.enemies = G.enemies.filter((e) => e.alive && !e.leaked);
}
function update(dt) {
  G.time += dt;
  if (G.tickerText && G.time > G.tickerUntil) G.tickerText = null;
  if (G.leakFlash > 0) G.leakFlash -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);
  if (AK.Input.clicked) onClick();
  if (AK.Input.rightClicked) onRightClick();
  onKeys();
  if (G.state === "play") updatePlay(dt * G.speed);
  else if (G.state === "title") updateTitle(dt);
  AK.FX.update(dt);
  AK.Input.flush();
}

// ---- render --------------------------------------------------------------
function drawPlacement(ctx) {
  const { x, y } = AK.Input;
  if (G.buildKind) {
    const def = AK.TOWERS[G.buildKind], tile = AK.Map.tileAt(x, y);
    if (tile) {
      const c = AK.Map.tileCenter(tile.c, tile.r);
      const ok = AK.Map.buildable(tile.c, tile.r) && !G.towers.has(towerKey(tile.c, tile.r)) && G.gold >= def.cost;
      ctx.strokeStyle = ok ? "rgba(140,255,170,0.9)" : "rgba(255,93,122,0.9)";
      ctx.lineWidth = 2; ctx.strokeRect(tile.c * 64 + AK.CFG.MAP_X + 2, tile.r * 64 + AK.CFG.MAP_Y + 2, 60, 60);
      ctx.fillStyle = ok ? "rgba(140,255,170,0.10)" : "rgba(255,93,122,0.10)";
      ctx.beginPath(); ctx.arc(c.x, c.y, def.range, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(220,240,255,0.35)";
      ctx.beginPath(); ctx.arc(c.x, c.y, def.range, 0, 7); ctx.stroke();
      ctx.globalAlpha = 0.65;
      const img = AK.SPR.tower[G.buildKind][0];
      ctx.drawImage(img, c.x - 32, c.y - 32, 64, 64);
      ctx.globalAlpha = 1;
    }
  }
  if (G.selected) {
    const t = G.selected;
    ctx.fillStyle = "rgba(159,192,255,0.08)";
    ctx.beginPath(); ctx.arc(t.x, t.y, t.range(), 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(159,192,255,0.55)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.range(), 0, 7); ctx.stroke();
    ctx.strokeStyle = "#ffe98a"; ctx.lineWidth = 2;
    ctx.strokeRect(t.c * 64 + AK.CFG.MAP_X + 2, t.r * 64 + AK.CFG.MAP_Y + 2, 60, 60);
  }
}
function drawBurns(ctx) {
  for (const b of G.burns) {
    const a = AK.clamp((b.until - G.time) / 2.2, 0, 1);
    ctx.fillStyle = `rgba(255,110,40,${0.16 * a + 0.05})`;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    if (Math.random() < 0.3) AK.FX.trail(b.x + AK.rand(-b.r, b.r) * 0.6, b.y + AK.rand(-b.r, b.r) * 0.6, "#ff8a4d", 3.4);
  }
}
function render() {
  ctx.clearRect(0, 0, AK.CFG.W, AK.CFG.H);
  ctx.save();
  if (G.shake > 0.2) ctx.translate(AK.rand(-G.shake, G.shake) * 0.5, AK.rand(-G.shake, G.shake) * 0.5);
  AK.Map.draw(ctx, G.time);
  drawBurns(ctx);
  for (const t of G.towers.values()) t.draw(ctx);
  const sorted = [...G.enemies].sort((a, b) => a.y - b.y);
  for (const e of sorted) if (e.alive) e.draw(ctx);
  AK.Projectiles.draw(ctx);
  AK.Abilities.draw(ctx);
  AK.FX.draw(ctx);
  ctx.restore();
  if (G.state === "title") { AK.Screens.drawTitle(ctx, G); return; }
  if (G.state === "help") { AK.Screens.drawHelp(ctx, G); return; }
  AK.HUD.draw(ctx);
  AK.Screens.bossBar(ctx, G);
  if (G.state === "play") drawPlacement(ctx);
  if (G.state === "pause") AK.Screens.drawPause(ctx);
  if (G.state === "over") AK.Screens.drawOver(ctx, G);
  if (G.state === "win") AK.Screens.drawWin(ctx, G);
  if (G.leakFlash > 0) {
    ctx.fillStyle = `rgba(255,40,70,${G.leakFlash * 0.16})`;
    ctx.fillRect(0, 0, AK.CFG.W, AK.CFG.H);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- staging hooks for the play-test and screenshots ---------------------
function stageTower(kind, c, r, level = 1, ascended = false) {
  const t = new AK.Tower(kind, c, r);
  t.level = level; t.ascended = ascended;
  t.invested = t.def.cost * (1 + level);
  G.towers.set(towerKey(c, r), t);
  refreshVenomFlags();
  return t;
}
function stageDefense() {
  stageTower("bolt", 5, 1, 2);
  stageTower("frost", 9, 3, 3);
  stageTower("storm", 4, 4, 3, true);
  stageTower("mortar", 8, 6, 2);
  stageTower("venom", 3, 7, 2);
  stageTower("lance", 10, 9, 3);
  stageTower("bolt", 6, 9, 1);
  stageTower("frost", 5, 6, 1);
}
window.__AK = {
  G, newGame,
  setGold(n) { G.gold = n; },
  place: stageTower,
  stageDefense,
  startWave() { AK.Waves.startWave(false); },
  jumpToWave(n) { G.wave = n - 1; AK.Waves.phase = "intermission"; AK.Waves.timer = 0.05; },
  meteorAt(x, y) { AK.Abilities.pending.push({ x, y, t: 0.5 }); },
  fireAll() { for (const t of G.towers.values()) { t.cd = 0; t.update(0.001); } },
  spawnTitan(dist) { const b = new AK.Enemy("titan", G.hpScale, dist); G.enemies.push(b); return b; },
  win() { G.kills = 612; G.goldEarned = 4210; G.playTime = 1085; G.score = 9840; G.wave = 20; G.winGame(); },
  state() { return { state: G.state, gold: G.gold, lives: G.lives, wave: G.wave, foes: G.enemies.length, towers: G.towers.size, score: G.score }; },
};

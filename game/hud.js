// hud.js — header bar, build menu, selection panel, ability buttons, wave
// preview and the centre banner. Buttons register hit-rects each frame;
// main.js routes clicks through AK.HUD.hit.
"use strict";

AK.HUD = {
  buttons: [],
  panel(ctx, x, y, w, h, fill = "rgba(13,19,36,0.88)", edge = "#2b3d63") {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.stroke();
  },
  txt(ctx, s, x, y, size = 14, color = "#dfe8ff", align = "left", weight = 600) {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px 'Segoe UI', sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillText(s, x, y);
  },
  btn(ctx, x, y, w, h, label, action, opts = {}) {
    const dis = opts.disabled, hot = opts.hot;
    ctx.fillStyle = dis ? "rgba(40,48,72,0.7)" : hot ? "rgba(84,140,255,0.35)" : "rgba(30,42,72,0.9)";
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.fill();
    ctx.strokeStyle = hot ? "#9fc0ff" : dis ? "#232c47" : "#3d5484"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.stroke();
    this.txt(ctx, label, x + w / 2, y + h / 2 + 5, opts.size || 13.5, dis ? "#5d6c8f" : (opts.color || "#eaf1ff"), "center", 700);
    if (!dis) this.buttons.push({ x, y, w, h, action });
  },
  hit(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  },
  draw(ctx) {
    const G = AK.G;
    this.buttons = [];
    this.header(ctx, G);
    this.sidebar(ctx, G);
    this.banner(ctx, G);
    this.ticker(ctx, G);
  },
  header(ctx, G) {
    ctx.fillStyle = "rgba(9,13,24,0.92)"; ctx.fillRect(0, 0, AK.CFG.W, AK.CFG.HEAD_H);
    ctx.fillStyle = "#1c2947"; ctx.fillRect(0, AK.CFG.HEAD_H, AK.CFG.W, 2);
    this.txt(ctx, "AETHERKEEP", 16, 36, 21, "#cfe4ff", "left", 800);
    // gold
    ctx.drawImage(AK.SPR.orb.bolt, 168, 14);
    this.txt(ctx, AK.fmt(G.gold), 196, 37, 18, "#ffd75e");
    // lives, flashing red right after a leak
    const lc = G.leakFlash > 0 ? "#ff5d7a" : "#ff8fa5";
    this.txt(ctx, "♥", 300, 37, 18, lc);
    this.txt(ctx, String(G.lives), 324, 37, 18, lc);
    // wave + foes
    const inWave = AK.Waves.phase === "active";
    this.txt(ctx, `WAVE ${Math.max(1, G.wave)}${G.endless && G.wave > AK.CFG.MAX_WAVE ? " ∞" : ""} / ${AK.CFG.MAX_WAVE}`, 420, 37, 16, "#dfe8ff");
    const foes = G.enemies.filter((e) => e.alive).length + AK.Waves.queue.length;
    this.txt(ctx, inWave ? `foes ${foes}` : `next in ${Math.max(0, Math.ceil(AK.Waves.timer))}s`, 620, 37, 14, "#8fa5d6");
    this.txt(ctx, `SCORE ${AK.fmt(G.score)}`, 800, 37, 15, "#aef4ff");
    // right-side controls
    this.btn(ctx, 1010, 11, 62, 32, G.speed === 2 ? "2× ▸▸" : "1× ▸", "speed");
    this.btn(ctx, 1080, 11, 62, 32, G.state === "pause" ? "RESUME" : "PAUSE", "pause");
    this.btn(ctx, 1150, 11, 52, 32, AK.Audio.muted ? "MUTED" : "SOUND", "mute", { size: 11 });
    this.btn(ctx, 1210, 11, 56, 32, "HELP", "help");
  },
  sidebar(ctx, G) {
    const X = AK.CFG.SIDE_X, W = 404;
    this.panel(ctx, X, 66, W, 704, "rgba(10,15,29,0.9)");
    let y = 66 + 12;
    if (G.selected) y = this.selectionPanel(ctx, G, X, y, W);
    else y = this.buildMenu(ctx, G, X, y, W);
    y = this.abilitiesPanel(ctx, G, X, y, W);
    this.nextWavePanel(ctx, G, X, y, W);
  },
  buildMenu(ctx, G, X, y, W) {
    this.txt(ctx, "BUILD  ·  keys 1-6", X + 14, y + 16, 13, "#8fa5d6", "left", 700);
    y += 26;
    for (let i = 0; i < AK.TOWER_ORDER.length; i += 2) {
      for (let j = 0; j < 2; j++) {
        const kind = AK.TOWER_ORDER[i + j]; if (!kind) break;
        const def = AK.TOWERS[kind], cx = X + 12 + j * 192, cw = 184, ch = 86;
        const afford = G.gold >= def.cost, sel = G.buildKind === kind;
        this.panel(ctx, cx, y, cw, ch, sel ? "rgba(46,74,140,0.55)" : "rgba(17,25,46,0.9)", sel ? "#9fc0ff" : "#2b3d63");
        const img = AK.SPR.tower[kind][0];
        ctx.globalAlpha = afford ? 1 : 0.45;
        ctx.drawImage(img, cx + 8, y + 12, 58, 58);
        ctx.globalAlpha = 1;
        this.txt(ctx, def.name, cx + 74, y + 24, 14.5, "#eaf1ff", "left", 700);
        this.txt(ctx, `${def.cost}g · ${def.key}`, cx + 74, y + 44, 12.5, "#ffd75e");
        this.txt(ctx, `dmg ${def.dmg} · rng ${def.range}`, cx + 74, y + 62, 11.5, "#8fa5d6");
        this.txt(ctx, def.desc, cx + 10, y + ch - 7, 10.5, "#63749c");
        if (afford) this.buttons.push({ x: cx, y, w: cw, h: ch, action: "build:" + kind });
      }
      y += 94;
    }
    this.txt(ctx, "Pick a tower, then click a free tile.", X + 14, y + 12, 12, "#63749c");
    return y + 22;
  },
  selectionPanel(ctx, G, X, y, W) {
    const t = G.selected, def = t.def;
    this.txt(ctx, def.name.toUpperCase(), X + 14, y + 18, 16, "#eaf1ff", "left", 800);
    const stage = t.ascended ? def.ascend.name : `LEVEL ${t.level}`;
    this.txt(ctx, stage, X + W - 14, y + 18, 12.5, t.ascended ? "#ffe98a" : "#8fa5d6", "right", 700);
    y += 28;
    const rows = [
      `damage ${Math.round(t.dmg() * 10) / 10}   rate ${Math.round(t.rate() * 100) / 100}/s   range ${Math.round(t.range())}`,
    ];
    if (def.splash) rows.push(`splash ${Math.round(t.splash())}px`);
    if (def.chain) rows.push(`chains to ${t.chain()} foes`);
    if (def.slowPct) rows.push(`slows ${Math.round(t.slowPct() * 100)}% for ${def.slowDur}s`);
    if (def.poison) rows.push(`poison ${Math.round(t.poisonDps())}/s for ${def.poisonDur}s`);
    if (def.critC) rows.push(`crit ${Math.round((t.ascended ? 0.4 : def.critC) * 100)}% ×${t.ascended ? 3 : def.critM}`);
    for (const r of rows) { this.txt(ctx, r, X + 14, y + 13, 12.5, "#aebadd"); y += 19; }
    y += 4;
    this.btn(ctx, X + 12, y, 180, 34, `TARGET: ${t.mode.toUpperCase()}`, "mode");
    this.btn(ctx, X + 200, y, 192, 34, `SELL  +${t.sellValue()}g`, "sell");
    y += 42;
    if (!t.ascended && t.level < 3) {
      const cost = t.upgradeCost();
      this.btn(ctx, X + 12, y, 380, 38, `UPGRADE TO LV${t.level + 1}  ·  ${cost}g`, "upgrade", { disabled: G.gold < cost, hot: G.gold >= cost });
    } else if (!t.ascended && t.level === 3) {
      const cost = def.ascend.cost;
      this.btn(ctx, X + 12, y, 380, 38, `ASCEND: ${def.ascend.name}  ·  ${cost}g`, "ascend", { disabled: G.gold < cost, hot: G.gold >= cost, color: "#ffe98a" });
      this.txt(ctx, def.ascend.note, X + 14, y + 54, 11.5, "#8fa5d6");
      y += 18;
    } else {
      this.txt(ctx, def.ascend.name + " — " + def.ascend.note, X + 14, y + 16, 12, "#ffe98a");
    }
    return y + 48;
  },
  abilitiesPanel(ctx, G, X, y, W) {
    this.txt(ctx, "KEEPER SPELLS", X + 14, y + 14, 13, "#8fa5d6", "left", 700);
    y += 22;
    const A = AK.Abilities, m = AK.ABILITIES.meteor, b = AK.ABILITIES.blizzard;
    const mLabel = A.aiming ? "AIMING…" : A.meteorCd > 0 ? `METEOR ${Math.ceil(A.meteorCd)}s` : "METEOR (Q)";
    this.btn(ctx, X + 12, y, 184, 38, mLabel, "meteor", { disabled: A.meteorCd > 0, hot: A.aiming, color: "#ffb04d" });
    const bLabel = A.blizzardCd > 0 ? `BLIZZARD ${Math.ceil(A.blizzardCd)}s` : "BLIZZARD (W)";
    this.btn(ctx, X + 204, y, 188, 38, bLabel, "blizzard", { disabled: A.blizzardCd > 0, color: "#9fe8ff" });
    return y + 50;
  },
  nextWavePanel(ctx, G, X, y, W) {
    const next = Math.min(G.wave + 1, AK.CFG.MAX_WAVE + (G.endless ? 999 : 0));
    const counts = AK.Waves.preview(Math.max(1, next));
    this.txt(ctx, AK.Waves.phase === "active" ? "THIS WAVE" : `NEXT WAVE ${Math.max(1, next)}`, X + 14, y + 14, 13, "#8fa5d6", "left", 700);
    y += 24;
    let cx = X + 14;
    for (const [kind, n] of Object.entries(counts)) {
      const def = AK.ENEMIES[kind];
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(cx + 7, y + 4, 7, 0, 7); ctx.fill();
      this.txt(ctx, `×${n}`, cx + 17, y + 9, 12.5, "#dfe8ff");
      cx += 62;
      if (cx > X + W - 70) { cx = X + 14; y += 22; }
    }
    y += 14;
    if (AK.Waves.phase === "intermission" && G.state === "play") {
      const bonus = Math.ceil(AK.Waves.timer) * AK.CFG.EARLY_BONUS_PER_SEC;
      this.btn(ctx, X + 12, y, 380, 40, `START WAVE ${Math.max(1, next)} NOW  ·  +${bonus}g early bonus`, "startwave", { hot: true });
      y += 48;
    }
    if (AK.Waves.hasBoss(Math.max(1, next)) && AK.Waves.phase === "intermission") {
      this.txt(ctx, "⚠ a Hollow Titan leads this wave", X + 14, y + 12, 12.5, "#ff8fa5");
      y += 18;
    }
    return y;
  },
  banner(ctx, G) {
    if (!G.banner || G.time > G.banner.until) return;
    const left = G.banner.until - G.time;
    const a = Math.min(1, left / 0.5, (2.0 - left) * 3 + 0.4);
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = "rgba(6,9,17,0.45)"; ctx.fillRect(0, 300, 862, 120);
    this.txt(ctx, G.banner.text, 431, 352, 44, "#eaf4ff", "center", 800);
    this.txt(ctx, G.banner.sub, 431, 384, 15, "#9fc0ff", "center", 600);
    ctx.restore();
  },
  ticker(ctx, G) {
    ctx.fillStyle = "rgba(9,13,24,0.85)"; ctx.fillRect(0, 772, AK.CFG.W, 28);
    const tips = [
      "Frost before Storm: chilled foes bunch up for the lightning.",
      "Menders heal their pack — focus them down or out-damage the green.",
      "Wraiths phase through bolts and spears. Frost and lightning always land.",
      "Bulwarks shrug off small hits; Sun Lances and Meteors crack them.",
      "Interest pays 5% of your gold after each wave, up to 40g.",
      "Call the next wave early to earn bonus gold.",
      "A tower at level 3 can ASCEND into its final form.",
    ];
    const tip = G.tickerText || tips[Math.floor(G.time / 9) % tips.length];
    this.txt(ctx, tip, 16, 791, 12.5, "#63749c");
    this.txt(ctx, `best ${AK.fmt(G.best)}`, 1266, 791, 12.5, "#63749c", "right");
  },
};

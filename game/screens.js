// screens.js — title, help, pause, game over and victory screens, plus the
// boss health bar. The title doubles as the entry's cover screenshot, so
// it carries the whole spec sheet over the living vale.
"use strict";

AK.Screens = {
  buttons: [],
  centerPanel(ctx, w, h) {
    const x = (AK.CFG.W - w) / 2, y = (AK.CFG.H - h) / 2;
    AK.HUD.panel(ctx, x, y, w, h, "rgba(9,13,26,0.9)", "#3d5484");
    return { x, y };
  },
  bossBar(ctx, G) {
    const boss = G.enemies.find((e) => e.alive && e.def.boss);
    if (!boss) return;
    const w = 460, x = 200, y = 60;
    ctx.fillStyle = "rgba(6,8,14,0.8)"; ctx.fillRect(x - 4, y - 4, w + 8, 20);
    ctx.fillStyle = "#3d1420"; ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = "#ff5d7a"; ctx.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 12);
    AK.HUD.txt(ctx, `THE HOLLOW TITAN  ${Math.ceil(boss.hp)} / ${boss.maxHp}`, x + w / 2, y + 32, 12, "#ff8fa5", "center", 700);
  },
  drawTitle(ctx, G) {
    ctx.fillStyle = "rgba(5,8,16,0.45)"; ctx.fillRect(0, 0, AK.CFG.W, AK.CFG.H);
    const t = G.time;
    AK.HUD.txt(ctx, "AETHERKEEP", 640, 168, 84, "#eaf4ff", "center", 800);
    AK.HUD.txt(ctx, "TOWER DEFENSE OF THE LAST CRYSTAL", 640, 208, 19, "#9fc0ff", "center", 700);
    AK.HUD.txt(ctx, "6 TOWERS WITH ASCENDED FINAL FORMS · 8 FOE KINDS · 20 WAVES · A TITAN EVERY 5 WAVES", 640, 248, 15.5, "#ffd75e", "center", 700);
    AK.HUD.txt(ctx, "2 KEEPER SPELLS · INTEREST ECONOMY · TARGETING ORDERS · ENDLESS MODE", 640, 274, 15.5, "#ffd75e", "center", 700);
    // teaching card
    const { x, y } = this.centerPanelAt(ctx, 640, 470, 660, 218);
    AK.HUD.txt(ctx, "HOW TO KEEP THE CRYSTAL", x + 330, y + 36, 16, "#cfe4ff", "center", 800);
    const lines = [
      "Foes walk the rune road to your crystal. Towers on free tiles stop them.",
      "Build with gold (keys 1-6). Kills pay bounties; banked gold earns interest.",
      "Upgrade towers to level 3, then ASCEND them into their final form.",
      "Order each tower: FIRST · LAST · STRONG · CLOSE. Sell at 70% back.",
      "Cast Meteor (Q) and Blizzard (W). Survive wave 20 to win.",
    ];
    lines.forEach((s, i) => AK.HUD.txt(ctx, s, x + 330, y + 68 + i * 27, 14.5, "#c3d2f2", "center", 500));
    const pulse = 0.75 + Math.sin(t * 3.2) * 0.25;
    ctx.save(); ctx.globalAlpha = pulse;
    AK.HUD.txt(ctx, "CLICK TO BEGIN", 640, 640, 24, "#ffffff", "center", 800);
    ctx.restore();
    if (G.best > 0) AK.HUD.txt(ctx, `best score ${AK.fmt(G.best)} · best wave ${G.bestWave}`, 640, 690, 14, "#8fa5d6", "center", 600);
    AK.HUD.txt(ctx, "an original game of towers and titans — no foe, name or note is borrowed", 640, 752, 12, "#63749c", "center", 500);
  },
  centerPanelAt(ctx, cx, cy, w, h) {
    const x = cx - w / 2, y = cy - h / 2;
    AK.HUD.panel(ctx, x, y, w, h, "rgba(9,13,26,0.88)", "#3d5484");
    return { x, y };
  },
  drawHelp(ctx, G) {
    ctx.fillStyle = "rgba(4,6,12,0.72)"; ctx.fillRect(0, 0, AK.CFG.W, AK.CFG.H);
    const { x, y } = this.centerPanelAt(ctx, 640, 400, 760, 560);
    AK.HUD.txt(ctx, "KEEPER'S HANDBOOK", x + 380, y + 44, 22, "#eaf4ff", "center", 800);
    const rows = [
      ["Build", "Click a tower card (or press 1-6), then click a free tile. Right-click cancels."],
      ["Upgrade", "Click a standing tower: upgrade to Lv3, then ASCEND into its final form."],
      ["Orders", "Each tower aims by its order: FIRST (furthest), LAST, STRONG (most hp), CLOSE."],
      ["Spells", "Q aims a Meteor, click the field to strike. W freezes the whole road."],
      ["Waves", "Space or the START button calls the next wave; calling early pays bonus gold."],
      ["Economy", "Kills pay bounties. After each wave you earn 5% interest on banked gold (max 40g)."],
      ["Foes", "Bulwarks are armoured. Wraiths phase through bolts, stings and spears."],
      ["", "Menders heal their pack. Splitters burst into Mites. The Titan sheds as it breaks."],
      ["Win / lose", "Survive all 20 waves to win — then Endless if you dare. 20 leaks end the keep."],
      ["Keys", "Space wave · P pause · F speed · M mute · Esc deselect / close · H help"],
    ];
    rows.forEach(([k, v], i) => {
      const ry = y + 82 + i * 42;
      AK.HUD.txt(ctx, k, x + 28, ry, 14, "#ffd75e", "left", 700);
      AK.HUD.txt(ctx, v, x + 118, ry, 13.5, "#c3d2f2", "left", 500);
    });
    AK.HUD.txt(ctx, "click anywhere to return", x + 380, y + 532, 13.5, "#8fa5d6", "center", 600);
    void G;
  },
  drawPause(ctx) {
    ctx.fillStyle = "rgba(4,6,12,0.6)"; ctx.fillRect(0, 0, AK.CFG.W, AK.CFG.H);
    AK.HUD.txt(ctx, "PAUSED", 640, 380, 52, "#eaf4ff", "center", 800);
    AK.HUD.txt(ctx, "P or the PAUSE button to resume · H for the handbook", 640, 424, 15, "#9fc0ff", "center", 600);
  },
  recap(ctx, G, x, y, w) {
    // towers standing, by kind, with levels
    const byKind = {};
    for (const t of G.towers.values()) {
      byKind[t.kind] = byKind[t.kind] || [];
      byKind[t.kind].push(t.ascended ? "ASC" : "Lv" + t.level);
    }
    AK.HUD.txt(ctx, "THE FINAL WATCH", x + w / 2, y, 13, "#8fa5d6", "center", 700);
    let cy = y + 24;
    const kinds = Object.keys(byKind);
    if (!kinds.length) AK.HUD.txt(ctx, "no towers stood at the end", x + w / 2, cy, 13, "#c3d2f2", "center", 500);
    for (const k of kinds) {
      AK.HUD.txt(ctx, `${AK.TOWERS[k].name}: ${byKind[k].join(" · ")}`, x + w / 2, cy, 13.5, "#eaf1ff", "center", 600);
      cy += 21;
    }
    return cy;
  },
  stats(ctx, G, cx, y) {
    const rows = [
      ["SCORE", AK.fmt(G.score)],
      ["WAVES HELD", `${Math.min(G.wave, AK.CFG.MAX_WAVE)} / ${AK.CFG.MAX_WAVE}`],
      ["FOES FELLED", AK.fmt(G.kills)],
      ["GOLD EARNED", AK.fmt(G.goldEarned)],
      ["TIME", `${Math.floor(G.playTime / 60)}:${String(Math.floor(G.playTime % 60)).padStart(2, "0")}`],
    ];
    rows.forEach(([k, v], i) => {
      AK.HUD.txt(ctx, k, cx - 130, y + i * 25, 13, "#8fa5d6", "left", 700);
      AK.HUD.txt(ctx, v, cx + 130, y + i * 25, 14, "#eaf1ff", "right", 700);
    });
    return y + rows.length * 25;
  },
  drawOver(ctx, G) {
    ctx.fillStyle = "rgba(10,4,8,0.66)"; ctx.fillRect(0, 0, AK.CFG.W, AK.CFG.H);
    AK.HUD.buttons = []; this.buttons = [];
    AK.HUD.txt(ctx, "THE CRYSTAL FALLS", 640, 190, 54, "#ff8fa5", "center", 800);
    AK.HUD.txt(ctx, `the road ran dark on wave ${G.wave}`, 640, 232, 16, "#c3d2f2", "center", 600);
    let y = this.stats(ctx, G, 640, 286);
    y = this.recap(ctx, G, 440, y + 26, 400) + 30;
    AK.HUD.btn(ctx, 540, y, 200, 44, "DEFEND AGAIN (R)", "restart", { hot: true });
    this.buttons = AK.HUD.buttons.slice();
  },
  drawWin(ctx, G) {
    ctx.fillStyle = "rgba(4,10,6,0.6)"; ctx.fillRect(0, 0, AK.CFG.W, AK.CFG.H);
    AK.HUD.buttons = []; this.buttons = [];
    AK.HUD.txt(ctx, "THE CRYSTAL HOLDS", 640, 182, 54, "#a8ffc4", "center", 800);
    AK.HUD.txt(ctx, "twenty waves broken against your towers — the vale is safe", 640, 224, 16, "#c3d2f2", "center", 600);
    let y = this.stats(ctx, G, 640, 278);
    y = this.recap(ctx, G, 440, y + 26, 400) + 30;
    AK.HUD.btn(ctx, 436, y, 200, 44, "ENDLESS MODE", "endless", { hot: true });
    AK.HUD.btn(ctx, 644, y, 200, 44, "NEW GAME (R)", "restart");
    this.buttons = AK.HUD.buttons.slice();
  },
};

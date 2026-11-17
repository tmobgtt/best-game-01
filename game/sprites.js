// sprites.js — every creature, tower and glow is drawn once to an offscreen
// canvas at boot; the frame loop only blits images and never pays for
// gradients or shadowBlur in the hot path.
"use strict";

function cnv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function glowDisc(color, r) {
  const c = cnv(r * 2, r * 2), x = c.getContext("2d");
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, color); g.addColorStop(0.35, color + "aa"); g.addColorStop(1, color + "00");
  x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2);
  return c;
}
function orb(color, r) {
  const c = cnv(r * 2 + 4, r * 2 + 4), x = c.getContext("2d"), cx = r + 2;
  const g = x.createRadialGradient(cx - r * 0.35, cx - r * 0.4, 1, cx, cx, r);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, color); g.addColorStop(1, "#1a2138");
  x.fillStyle = g; x.beginPath(); x.arc(cx, cx, r, 0, 7); x.fill();
  return c;
}

function towerSprite(kind, def, level, ascended) {
  const S = 128, c = cnv(S, S), x = c.getContext("2d"), cx = S / 2;
  // stone base
  x.fillStyle = "#2a3350"; x.beginPath(); x.arc(cx, cx, 40, 0, 7); x.fill();
  x.fillStyle = "#39466b"; x.beginPath(); x.arc(cx, cx, 34, 0, 7); x.fill();
  x.strokeStyle = ascended ? "#ffe98a" : "#55648c"; x.lineWidth = ascended ? 4 : 2;
  x.beginPath(); x.arc(cx, cx, 34, 0, 7); x.stroke();
  if (level >= 2) { x.strokeStyle = "#8fa5d6"; x.lineWidth = 2; x.beginPath(); x.arc(cx, cx, 27, 0, 7); x.stroke(); }
  const col = def.color;
  x.fillStyle = col; x.strokeStyle = col;
  if (kind === "bolt") {
    x.beginPath(); x.moveTo(cx, 18); x.lineTo(cx + 13, 74); x.lineTo(cx - 13, 74); x.closePath();
    x.fillStyle = "#46538a"; x.fill(); x.drawImage(orb(col, 11), cx - 13, 8);
  } else if (kind === "mortar") {
    x.fillStyle = "#5a3b33"; x.beginPath(); x.arc(cx, 74, 24, Math.PI, 0); x.fill();
    x.save(); x.translate(cx, 62); x.rotate(-0.6); x.fillStyle = "#2c3247"; x.fillRect(-6, -34, 13, 36); x.restore();
    x.drawImage(orb(col, 9), cx - 11, 22);
  } else if (kind === "frost") {
    x.fillStyle = "#3d5a7a";
    for (const [dx, h] of [[-16, 34], [0, 52], [16, 38]]) {
      x.beginPath(); x.moveTo(cx + dx - 8, 78); x.lineTo(cx + dx, 78 - h); x.lineTo(cx + dx + 8, 78); x.closePath(); x.fill();
    }
    x.drawImage(orb(col, 10), cx - 12, 14);
  } else if (kind === "storm") {
    x.fillStyle = "#413a63"; x.fillRect(cx - 6, 30, 12, 48);
    for (let i = 0; i < 3; i++) { x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.arc(cx, 34 + i * 13, 10 + i * 4, 0, 7); x.stroke(); }
    x.drawImage(orb(col, 8), cx - 10, 12);
  } else if (kind === "venom") {
    x.strokeStyle = "#3f7a3a"; x.lineWidth = 5;
    for (const a of [-0.7, 0, 0.7]) {
      x.beginPath(); x.moveTo(cx, 80); x.quadraticCurveTo(cx + Math.sin(a) * 22, 55, cx + Math.sin(a) * 30, 34 + Math.abs(a) * 16); x.stroke();
    }
    x.drawImage(orb(col, 10), cx - 12, 26);
  } else if (kind === "lance") {
    x.fillStyle = "#6b5a2e"; x.beginPath(); x.moveTo(cx, 8); x.lineTo(cx + 7, 78); x.lineTo(cx - 7, 78); x.closePath(); x.fill();
    x.drawImage(orb(col, 9), cx - 11, 4);
  }
  if (level >= 3) { // crown pips
    x.fillStyle = "#ffe98a";
    for (const dx of [-22, 0, 22]) { x.beginPath(); x.moveTo(cx + dx, 96); x.lineTo(cx + dx + 5, 106); x.lineTo(cx + dx - 5, 106); x.closePath(); x.fill(); }
  }
  if (ascended) { // halo
    x.strokeStyle = "#ffe98acc"; x.lineWidth = 3;
    x.beginPath(); x.ellipse(cx, 20, 26, 8, 0, 0, 7); x.stroke();
  }
  return c;
}

function enemySprite(kind, def) {
  const R = def.r, S = (R + 10) * 2, c = cnv(S, S), x = c.getContext("2d"), cx = S / 2;
  x.fillStyle = def.color;
  x.beginPath(); x.arc(cx, cx, R, 0, 7); x.fill();
  const g = x.createRadialGradient(cx - R * 0.3, cx - R * 0.35, 2, cx, cx, R);
  g.addColorStop(0, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(0,0,0,0.28)");
  x.fillStyle = g; x.beginPath(); x.arc(cx, cx, R, 0, 7); x.fill();
  x.fillStyle = "#131828";
  const eo = R * 0.36, er = Math.max(2, R * 0.16);
  x.beginPath(); x.arc(cx - eo, cx - R * 0.12, er, 0, 7); x.arc(cx + eo, cx - R * 0.12, er, 0, 7); x.fill();
  if (kind === "bulwark") {
    x.fillStyle = "#d7e4f7"; x.fillRect(cx - R - 3, cx - R * 0.55, 9, R * 1.1);
    x.fillStyle = "#8ea6c9"; x.fillRect(cx - R - 3, cx - 3, 9, 5);
  } else if (kind === "mender") {
    x.fillStyle = "#eafff1"; const s = R * 0.16;
    x.fillRect(cx - s, cx - R * 0.62, s * 2, R * 0.5); x.fillRect(cx - R * 0.31, cx - s * 1.6, R * 0.62, s * 2);
  } else if (kind === "splitter") {
    x.strokeStyle = "#ffd7f2"; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(cx, cx - R); x.lineTo(cx, cx + R); x.stroke();
  } else if (kind === "wraith") {
    x.fillStyle = "rgba(230,255,255,0.75)";
    x.beginPath(); x.moveTo(cx - R * 0.6, cx + R); x.lineTo(cx - R * 0.2, cx + R * 0.45); x.lineTo(cx + R * 0.2, cx + R); x.lineTo(cx + R * 0.6, cx + R * 0.45); x.lineTo(cx + R * 0.9, cx + R); x.lineTo(cx, cx - R * 1.05); x.closePath(); x.fill();
  } else if (kind === "titan") {
    x.fillStyle = "#2b0f18";
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * R * 0.55, cx - R * 0.6); x.lineTo(cx + s * R * 1.15, cx - R * 1.25); x.lineTo(cx + s * R * 0.95, cx - R * 0.25); x.closePath(); x.fill(); }
    x.drawImage(orb("#ff5d7a", 11), cx - 13, cx - 13);
    x.strokeStyle = "#ffb3c2"; x.lineWidth = 3; x.beginPath(); x.arc(cx, cx, R - 3, 0, 7); x.stroke();
  } else if (kind === "runner") {
    x.strokeStyle = "#fff3b0"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx - R, cx + R * 0.5); x.lineTo(cx - R * 1.5, cx + R * 0.2); x.stroke();
  }
  return c;
}

function tileSprite(kind, seed) {
  const S = AK.CFG.TILE, c = cnv(S, S), x = c.getContext("2d");
  let rnd = seed * 7919 + 13;
  const next = () => { rnd = (rnd * 48271) % 2147483647; return rnd / 2147483647; };
  if (kind === "path") {
    x.fillStyle = "#49536f"; x.fillRect(0, 0, S, S);
    x.fillStyle = "#556186"; x.fillRect(3, 3, S - 6, S - 6);
    x.strokeStyle = "rgba(170,205,255,0.38)"; x.lineWidth = 2; x.strokeRect(4, 4, S - 8, S - 8);
    x.fillStyle = "rgba(180,215,255,0.65)";
    x.beginPath(); x.arc(S / 2, S / 2, 3.4, 0, 7); x.fill();
  } else if (kind === "pond") {
    x.fillStyle = "#1d3a5f"; x.fillRect(0, 0, S, S);
    x.fillStyle = "#26507f"; x.beginPath(); x.ellipse(S / 2, S / 2, 24, 17, 0.4, 0, 7); x.fill();
    x.strokeStyle = "rgba(160,220,255,0.5)"; x.beginPath(); x.ellipse(S / 2, S / 2, 15, 9, 0.4, 0, 7); x.stroke();
  } else if (kind === "rubble") {
    x.fillStyle = "#232c47"; x.fillRect(0, 0, S, S);
    x.fillStyle = "#39466b";
    for (let i = 0; i < 5; i++) { const px = 8 + next() * 42, py = 8 + next() * 42; x.fillRect(px, py, 6 + next() * 9, 5 + next() * 7); }
  } else { // grass / vale floor
    x.fillStyle = "#16233d"; x.fillRect(0, 0, S, S);
    x.fillStyle = "#1b2c4c";
    for (let i = 0; i < 7; i++) x.fillRect(next() * S, next() * S, 3, 3);
    x.fillStyle = "rgba(96,180,220,0.13)";
    for (let i = 0; i < 3; i++) { const px = next() * S, py = next() * S; x.beginPath(); x.arc(px, py, 5 + next() * 6, 0, 7); x.fill(); }
    x.strokeStyle = "rgba(120,220,160,0.30)"; x.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { const px = 8 + next() * 46, py = 44 + next() * 14; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 3, py - 8); x.stroke(); }
  }
  return c;
}

function crystalSprite() {
  const S = 128, c = cnv(S, S), x = c.getContext("2d"), cx = S / 2;
  x.drawImage(glowDisc("#57b6ff", 60), 4, 4);
  const g = x.createLinearGradient(cx, 8, cx, 116);
  g.addColorStop(0, "#cfeeff"); g.addColorStop(0.5, "#57b6ff"); g.addColorStop(1, "#2050c8");
  x.fillStyle = g;
  x.beginPath(); x.moveTo(cx, 6); x.lineTo(cx + 22, 52); x.lineTo(cx + 13, 116); x.lineTo(cx - 13, 116); x.lineTo(cx - 22, 52); x.closePath(); x.fill();
  x.fillStyle = "rgba(255,255,255,0.55)";
  x.beginPath(); x.moveTo(cx, 6); x.lineTo(cx + 8, 52); x.lineTo(cx, 96); x.lineTo(cx - 8, 52); x.closePath(); x.fill();
  x.fillStyle = "#31456f"; x.fillRect(cx - 30, 112, 60, 10);
  return c;
}

AK.buildSprites = function () {
  const spr = { tower: {}, enemy: {}, glow: {}, orb: {}, tile: { grass: [], path: null, pond: null, rubble: null } };
  for (const [kind, def] of Object.entries(AK.TOWERS)) {
    spr.tower[kind] = [1, 2, 3].map((lv) => towerSprite(kind, def, lv, false));
    spr.tower[kind].push(towerSprite(kind, def, 3, true)); // index 3 = ascended
    spr.glow[kind] = glowDisc(def.color, 44);
    spr.orb[kind] = orb(def.color, 6);
  }
  for (const [kind, def] of Object.entries(AK.ENEMIES)) spr.enemy[kind] = enemySprite(kind, def);
  for (let i = 0; i < 4; i++) spr.tile.grass.push(tileSprite("grass", i + 1));
  spr.tile.path = tileSprite("path", 3); spr.tile.pond = tileSprite("pond", 5); spr.tile.rubble = tileSprite("rubble", 7);
  spr.crystal = crystalSprite();
  spr.glowWhite = glowDisc("#cfe4ff", 40);
  AK.SPR = spr;
};

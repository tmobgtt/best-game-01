// Mothlight screens: the title (which teaches the game by showing its
// controls as drawn keycaps over the living garden), the pause veil and the
// game-over results panel with its instant-restart invitation.

function keycap(ctx, x, y, w, label) {
  ctx.save();
  ctx.fillStyle = "rgba(20,24,48,0.9)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 30, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,217,138,0.5)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "700 13px 'Trebuchet MS', Verdana, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + 20);
  ctx.restore();
}

function controlRow(ctx, cx, y, keys, action) {
  const gap = 6;
  const widths = keys.map((k) => Math.max(34, k.length * 9 + 16));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (keys.length - 1);
  let x = cx - total / 2 - 118;
  keys.forEach((k, i) => {
    keycap(ctx, x, y, widths[i], k);
    x += widths[i] + gap;
  });
  ctx.save();
  ctx.fillStyle = "rgba(230,225,255,0.92)";
  ctx.font = "14px 'Trebuchet MS', Verdana, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(action, cx - total / 2 - 118 + total + 16, y + 20);
  ctx.restore();
}

let titleArt = null;

function getTitleArt(w) {
  if (titleArt) return titleArt;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = 170;
  const g = c.getContext("2d");
  g.textAlign = "center";
  g.shadowColor = "rgba(255,183,77,0.8)";
  g.shadowBlur = 34;
  g.fillStyle = "#ffe9b0";
  g.font = "800 92px Georgia, 'Times New Roman', serif";
  g.fillText("MOTHLIGHT", w / 2, 95);
  g.shadowBlur = 0;
  g.fillStyle = "rgba(230,225,255,0.92)";
  g.font = "italic 19px Georgia, 'Times New Roman', serif";
  g.fillText("keeper of the midnight garden", w / 2, 133);
  titleArt = c;
  return c;
}

export function drawTitleScreen(ctx, w, h, time, view) {
  // a soft veil so the text reads over the living garden
  const veil = ctx.createLinearGradient(0, 0, 0, h);
  veil.addColorStop(0, "rgba(5,6,16,0.55)");
  veil.addColorStop(0.55, "rgba(5,6,16,0.28)");
  veil.addColorStop(1, "rgba(5,6,16,0.6)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";
  const titleY = 168 + Math.sin(time * 1.3) * 4;
  ctx.drawImage(getTitleArt(w), 0, titleY - 95);

  ctx.font = "15px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillStyle = "rgba(230,225,255,0.85)";
  ctx.fillText("Shadow moths are coming to snuff your lantern. Hold the garden until dawn —", w / 2, titleY + 76);
  ctx.fillText("chain your sparks into combos, and dive for the star shards they drop.", w / 2, titleY + 98);

  const cardY = 356;
  ctx.save();
  ctx.fillStyle = "rgba(8,10,24,0.66)";
  ctx.beginPath();
  ctx.roundRect(w / 2 - 265, cardY - 16, 530, 184, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,217,138,0.22)";
  ctx.stroke();
  ctx.restore();
  if (view.usingTouch) {
    controlRow(ctx, w / 2, cardY + 4, ["LEFT PAD"], "drift through the garden");
    controlRow(ctx, w / 2, cardY + 46, ["RIGHT PAD"], "aim — and sparks fly");
    controlRow(ctx, w / 2, cardY + 88, ["DASH"], "burst through danger");
  } else {
    controlRow(ctx, w / 2, cardY + 4, ["W", "A", "S", "D"], "drift through the garden");
    controlRow(ctx, w / 2, cardY + 46, ["MOUSE", "HOLD CLICK"], "aim — and sparks fly");
    controlRow(ctx, w / 2, cardY + 88, ["SHIFT"], "dash through danger");
    controlRow(ctx, w / 2, cardY + 130, ["P"], "pause");
  }

  const pulse = 0.72 + 0.28 * Math.sin(time * 3.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = "#ffd166";
  ctx.font = "800 22px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillText(view.usingTouch ? "TAP TO BEGIN" : "PRESS ENTER OR CLICK TO BEGIN", w / 2, 616);
  ctx.restore();

  if (view.best > 0) {
    ctx.fillStyle = "rgba(255,217,138,0.8)";
    ctx.font = "14px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText(`best so far — ${view.best}`, w / 2, 648);
  }

  ctx.fillStyle = "rgba(230,225,255,0.45)";
  ctx.font = "12px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillText("a tiny game of light against the dark · sound on, if you can", w / 2, h - 22);
}

export function drawPauseOverlay(ctx, w, h) {
  ctx.fillStyle = "rgba(4,5,12,0.62)";
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "800 46px Georgia, 'Times New Roman', serif";
  ctx.fillText("PAUSED", w / 2, h / 2 - 8);
  ctx.font = "15px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillStyle = "rgba(230,225,255,0.85)";
  ctx.fillText("the garden holds its breath — P to resume", w / 2, h / 2 + 28);
}

export function drawGameOverScreen(ctx, w, h, time, view) {
  ctx.fillStyle = "rgba(4,5,12,0.55)";
  ctx.fillRect(0, 0, w, h);

  const pw = 430;
  const ph = 356;
  const px = w / 2 - pw / 2;
  const py = h / 2 - ph / 2 - 10;
  ctx.save();
  ctx.fillStyle = "rgba(9,11,26,0.88)";
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,217,138,0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#ff9d8a";
  ctx.font = "800 42px Georgia, 'Times New Roman', serif";
  ctx.fillText("THE LIGHT FADES", w / 2, py + 62);

  ctx.fillStyle = "rgba(230,225,255,0.85)";
  ctx.font = "italic 15px Georgia, 'Times New Roman', serif";
  ctx.fillText("the moths settle. the garden sleeps.", w / 2, py + 90);

  ctx.fillStyle = "#ffd98a";
  ctx.font = "800 54px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillText(String(view.score), w / 2, py + 152);

  ctx.font = "13px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillStyle = "rgba(230,225,255,0.75)";
  ctx.fillText("FINAL SCORE", w / 2, py + 174);

  if (view.isNewBest) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd166";
    ctx.font = "800 16px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText("★ A NEW BEST ★", w / 2, py + 198);
  }

  const rows = [
    ["waves held", String(view.wave)],
    ["shadows scattered", String(view.kills)],
    ["best combo", `×${view.bestMultiplier}`],
    ["best score", String(Math.max(view.best, view.score))],
  ];
  ctx.font = "15px 'Trebuchet MS', Verdana, sans-serif";
  rows.forEach(([label, value], i) => {
    const y = py + 226 + i * 25;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(230,225,255,0.8)";
    ctx.fillText(label, px + 70, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffe9b0";
    ctx.font = "700 15px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText(value, px + pw - 70, y);
    ctx.font = "15px 'Trebuchet MS', Verdana, sans-serif";
  });

  const pulse = 0.72 + 0.28 * Math.sin(time * 3.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd166";
  ctx.font = "800 19px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillText(view.usingTouch ? "TAP TO RELIGHT" : "PRESS R OR CLICK TO RELIGHT", w / 2, py + ph + 42);
  ctx.restore();
}

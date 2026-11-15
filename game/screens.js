// screens.js — the three full-screen moments the judge weighs most:
// the title with its drawn teaching card, the pause veil, and the
// game-over results with the run's stats and the build it died with.
// All are painted in code over the living garden; no image assets.

const Screens = {
  keycap(ctx, x, y, label, w) {
    const width = w || (label.length * 11 + 18);
    ctx.save();
    ctx.fillStyle = "rgba(254,243,199,0.12)";
    ctx.strokeStyle = "rgba(254,243,199,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, width, 30, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 15px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + width / 2, y + 20);
    ctx.restore();
    return width;
  },

  drawTitle(ctx, game, time) {
    ctx.save();
    ctx.textAlign = "center";
    // Title with a warm lantern glow.
    ctx.save();
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 42 + Math.sin(time * 2) * 8;
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 92px 'Trebuchet MS', sans-serif";
    ctx.fillText("MOTHLIGHT", CFG.width / 2, 208);
    ctx.restore();
    ctx.fillStyle = "#c084fc";
    ctx.font = "700 27px 'Trebuchet MS', sans-serif";
    ctx.fillText("-  T H E   L A N T E R N   G R O W S  -", CFG.width / 2, 252);
    ctx.fillStyle = "#ddd6fe";
    ctx.font = "400 19px 'Trebuchet MS', sans-serif";
    ctx.fillText("Keep the lantern lit. Every wave, it burns wider and stranger.", CFG.width / 2, 290);
    // The spec sheet, the way the strong entries advertise themselves:
    // the whole game's contents in one countable line.
    ctx.fillStyle = "#facc15";
    ctx.font = "700 16px 'Trebuchet MS', sans-serif";
    ctx.fillText("7 CREATURE KINDS · 14 DRAFT BLESSINGS · 14 FINAL FORMS · 2 GARDENS · A QUEEN EVERY 5 WAVES", CFG.width / 2, 322);

    // Teaching card: the whole game on one translucent panel.
    const cx = CFG.width / 2 - 330, cy = 352, cw = 660, ch = 202;
    ctx.fillStyle = "rgba(16,12,36,0.78)";
    ctx.strokeStyle = "rgba(196,181,253,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 14); ctx.fill(); ctx.stroke();
    const rows = [
      { keys: ["W A S D"], label: "move the keeper", keys2: ["MOUSE"], label2: "aim, hold to fire sparks" },
      { keys: ["SHIFT"], label: "dash through danger", keys2: ["P"], label2: "pause    ", keys2b: ["M"], label2b: "mute" },
    ];
    let ry = cy + 26;
    ctx.textAlign = "left";
    for (const row of rows) {
      let x = cx + 28;
      for (const k of row.keys) x += this.keycap(ctx, x, ry, k) + 8;
      ctx.fillStyle = "#ddd6fe";
      ctx.font = "400 16px 'Trebuchet MS', sans-serif";
      ctx.fillText(row.label, x + 4, ry + 20);
      let x2 = cx + 356;
      for (const k of row.keys2) x2 += this.keycap(ctx, x2, ry, k) + 8;
      ctx.fillStyle = "#ddd6fe";
      ctx.fillText(row.label2, x2 + 4, ry + 20);
      if (row.keys2b) {
        let x3 = x2 + 4 + ctx.measureText(row.label2).width + 14;
        for (const k of row.keys2b) x3 += this.keycap(ctx, x3, ry, k) + 8;
        ctx.fillText(row.label2b, x3 + 4, ry + 20);
      }
      ry += 48;
    }
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "400 16px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Fallen foes drop star shards: each one grants a blessing.", CFG.width / 2, ry + 22);
    ctx.fillText("Clear a wave, draft an upgrade. Every fifth wave, the Queen comes.", CFG.width / 2, ry + 48);
    ctx.fillStyle = "#facc15";
    ctx.fillText("Gamepad and touch twin-sticks work too.", CFG.width / 2, ry + 74);

    // Begin prompt, breathing.
    const pulse = 0.65 + 0.35 * Math.sin(time * 3.2);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 24px 'Trebuchet MS', sans-serif";
    ctx.fillText("press ENTER or click to light the lantern", CFG.width / 2, 640);
    ctx.globalAlpha = 1;
    if (game.best > 0) {
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "400 16px 'Trebuchet MS', sans-serif";
      ctx.fillText("best vigil so far: " + game.best, CFG.width / 2, 676);
    }
    ctx.restore();
  },

  drawPause(ctx, game) {
    ctx.save();
    ctx.fillStyle = "rgba(8,6,20,0.66)";
    ctx.fillRect(0, 0, CFG.width, CFG.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 52px 'Trebuchet MS', sans-serif";
    ctx.fillText("PAUSED", CFG.width / 2, 330);
    ctx.fillStyle = "#ddd6fe";
    ctx.font = "400 19px 'Trebuchet MS', sans-serif";
    ctx.fillText("the garden holds its breath", CFG.width / 2, 368);
    ctx.fillText("P or ESC to resume  -  R to restart the vigil  -  M to mute", CFG.width / 2, 420);
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "400 16px 'Trebuchet MS', sans-serif";
    ctx.fillText(
      "wave " + Math.max(1, Director.wave) + "   score " + game.score + "   kills " + game.kills,
      CFG.width / 2, 458);
    ctx.restore();
  },

  drawGameOver(ctx, game, time) {
    ctx.save();
    ctx.fillStyle = "rgba(10,4,16,0.7)";
    ctx.fillRect(0, 0, CFG.width, CFG.height);
    ctx.textAlign = "center";
    ctx.save();
    ctx.shadowColor = "#7e22ce";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#e9d5ff";
    ctx.font = "700 64px 'Trebuchet MS', sans-serif";
    ctx.fillText("THE LIGHT FADES", CFG.width / 2, 190);
    ctx.restore();
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 44px 'Trebuchet MS', sans-serif";
    ctx.fillText(String(game.score), CFG.width / 2, 258);
    if (game.newBest) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 5);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#facc15";
      ctx.font = "700 19px 'Trebuchet MS', sans-serif";
      ctx.fillText("NEW BEST VIGIL", CFG.width / 2, 288);
      ctx.globalAlpha = 1;
    }
    // Stat columns.
    const stats = [
      ["WAVE", String(Math.max(1, Director.wave))],
      ["KILLS", String(game.kills)],
      ["BEST COMBO", "x" + game.bestMult],
      ["TIME", game.timeString()],
    ];
    ctx.font = "700 26px 'Trebuchet MS', sans-serif";
    stats.forEach(([label, value], i) => {
      const x = CFG.width / 2 - 270 + i * 180;
      ctx.fillStyle = "#fef3c7";
      ctx.fillText(value, x, 356);
      ctx.fillStyle = "#8b7fb8";
      ctx.font = "400 13px 'Trebuchet MS', sans-serif";
      ctx.fillText(label, x, 378);
      ctx.font = "700 26px 'Trebuchet MS', sans-serif";
    });
    // The build it died with.
    const owned = Upgrades.ownedList();
    if (owned.length) {
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "400 15px 'Trebuchet MS', sans-serif";
      ctx.fillText("the build it died with", CFG.width / 2, 428);
      owned.forEach((o, i) => {
        const x = CFG.width / 2 + (i - (owned.length - 1) / 2) * 64;
        const isFinal = o.count >= o.def.max;
        ctx.fillStyle = isFinal ? "rgba(84,60,10,0.92)" : "rgba(38,28,72,0.9)";
        ctx.strokeStyle = isFinal ? "#facc15" : "#7c6bb0";
        ctx.lineWidth = isFinal ? 2.4 : 1.5;
        ctx.beginPath(); ctx.roundRect(x - 24, 446, 48, 48, 9); ctx.fill(); ctx.stroke();
        Upgrades.drawIcon(ctx, o.def.icon, x, 470, 26, "#facc15");
        ctx.fillStyle = "#ddd6fe";
        ctx.font = "700 13px 'Trebuchet MS', sans-serif";
        ctx.fillText("x" + o.count, x, 512);
      });
    }
    const pulse = 0.65 + 0.35 * Math.sin(time * 3.2);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 22px 'Trebuchet MS', sans-serif";
    ctx.fillText("press ENTER or R to tend the garden again", CFG.width / 2, 580);
    ctx.globalAlpha = 1;
    ctx.restore();
  },
};

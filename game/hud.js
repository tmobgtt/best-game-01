// hud.js — everything the keeper needs at a glance, drawn over the
// garden: lantern hearts, score and best, the combo chain with its
// draining timer, the wave banner, blessing and dash readouts, the
// Queen's health bar, and the announcer that calls waves and warnings.

const HUD = {
  announceMain: "",
  announceSub: "",
  announceT: 0,
  announceMax: 1,

  announce(main, sub, dur) {
    this.announceMain = main;
    this.announceSub = sub || "";
    this.announceMax = dur || 2.2;
    this.announceT = this.announceMax;
  },

  update(dt) {
    if (this.announceT > 0) this.announceT -= dt;
  },

  drawHearts(ctx, game) {
    const p = game.player;
    for (let i = 0; i < p.maxHearts; i++) {
      const img = i < p.hearts ? Sprites.heartLit : Sprites.heartDark;
      ctx.drawImage(img, 18 + i * 34, 16, 30, 30);
    }
    if (p.shieldReady) {
      ctx.save();
      ctx.strokeStyle = "rgba(56,189,248,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(33 + p.maxHearts * 34, 31, 11, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#7dd3fc";
      ctx.font = "700 12px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("S", 33 + p.maxHearts * 34, 35);
      ctx.restore();
    }
  },

  drawScore(ctx, game) {
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 30px 'Trebuchet MS', sans-serif";
    ctx.fillText(String(game.score).padStart(6, "0"), CFG.width - 20, 44);
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "400 14px 'Trebuchet MS', sans-serif";
    ctx.fillText("BEST " + String(Math.max(game.best, game.score)).padStart(6, "0"), CFG.width - 20, 66);
    ctx.restore();
  },

  drawCombo(ctx, game) {
    if (game.combo < 2) return;
    const p = game.player;
    const frac = clamp(game.comboT / p.stats.comboWindow, 0, 1);
    ctx.save();
    ctx.textAlign = "left";
    ctx.fillStyle = game.mult >= game.player.stats.comboMax ? "#facc15" : "#fde68a";
    ctx.font = "700 24px 'Trebuchet MS', sans-serif";
    ctx.fillText("COMBO x" + game.mult, 20, 84);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(20, 92, 118, 6);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(20, 92, 118 * frac, 6);
    ctx.fillStyle = "#c4b5fd";
    ctx.font = "400 13px 'Trebuchet MS', sans-serif";
    ctx.fillText(game.combo + " chained", 20, 114);
    ctx.restore();
  },

  drawWave(ctx, game) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ddd6fe";
    ctx.font = "700 17px 'Trebuchet MS', sans-serif";
    let label = "WAVE " + Math.max(1, Director.wave);
    if (Director.event && Director.phase === "active") label += "  -  " + Director.event.name;
    ctx.fillText(label, CFG.width / 2, 30);
    if (Director.phase === "active" && !Director.isBossWave) {
      const left = Director.queue.length + Enemies.activeCount();
      ctx.fillStyle = "#8b7fb8";
      ctx.font = "400 13px 'Trebuchet MS', sans-serif";
      ctx.fillText(left + " in the dark", CFG.width / 2, 50);
    }
    ctx.restore();
  },

  drawBossBar(ctx) {
    if (!Boss.active) return;
    const w = 520, x = (CFG.width - w) / 2, y = 56;
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#e9d5ff";
    ctx.font = "700 15px 'Trebuchet MS', sans-serif";
    ctx.fillText(BOSS_DEF.name + (Boss.phase === 3 ? "  -  ENRAGED" : ""), CFG.width / 2, y - 6);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, w, 12);
    const frac = clamp(Boss.hp / Boss.maxHp, 0, 1);
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, "#a855f7"); grad.addColorStop(1, "#f0abfc");
    ctx.fillStyle = Boss.phase === 3 ? "#ef4444" : grad;
    ctx.fillRect(x, y, w * frac, 12);
    ctx.strokeStyle = "rgba(233,213,255,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 12);
    // Phase notches at 66% and 33%.
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(x + w * 0.34, y, 2, 12);
    ctx.fillRect(x + w * 0.67, y, 2, 12);
    ctx.restore();
  },

  drawBlessing(ctx, game) {
    const p = game.player;
    ctx.save();
    ctx.textAlign = "left";
    let y = CFG.height - 20;
    if (p.blessingId) {
      const b = BLESSINGS.find((bb) => bb.id === p.blessingId);
      if (b) {
        ctx.fillStyle = b.color;
        ctx.font = "700 16px 'Trebuchet MS', sans-serif";
        ctx.fillText(b.name, 20, y);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(20, y + 6, 110, 5);
        ctx.fillStyle = b.color;
        ctx.fillRect(20, y + 6, 110 * clamp(p.blessingT / CFG.blessingTime, 0, 1), 5);
        ctx.fillStyle = "#ddd6fe";
        ctx.font = "400 13px 'Trebuchet MS', sans-serif";
        ctx.fillText(b.desc, 140, y);
        y -= 30;
      }
    }
    // Dash readout: a small lantern that refills.
    ctx.fillStyle = "#8b7fb8";
    ctx.font = "400 13px 'Trebuchet MS', sans-serif";
    ctx.fillText("DASH", 20, y);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(58, y - 10, 74, 7);
    ctx.fillStyle = p.dashCdT <= 0 ? "#fde68a" : "#78716c";
    const frac = p.dashCdT <= 0 ? 1 : 1 - p.dashCdT / p.stats.dashCooldown;
    ctx.fillRect(58, y - 10, 74 * clamp(frac, 0, 1), 7);
    ctx.restore();
  },

  drawAnnouncer(ctx) {
    if (this.announceT <= 0) return;
    const t = this.announceT / this.announceMax;
    const alpha = t > 0.82 ? (1 - t) / 0.18 : (t < 0.25 ? t / 0.25 : 1);
    const scale = 1 + (1 - Math.min(1, (1 - t) * 3)) * 0.06;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(CFG.width / 2, 168);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 44px 'Trebuchet MS', sans-serif";
    ctx.fillText(this.announceMain, 0, 0);
    if (this.announceSub) {
      ctx.fillStyle = "#c4b5fd";
      ctx.font = "400 19px 'Trebuchet MS', sans-serif";
      ctx.fillText(this.announceSub, 0, 30);
    }
    ctx.restore();
  },

  drawVignette(ctx, game, time) {
    const p = game.player;
    ctx.save();
    if (game.hurtFlash > 0) {
      ctx.fillStyle = "rgba(190,30,40," + (game.hurtFlash * 0.32) + ")";
      ctx.fillRect(0, 0, CFG.width, CFG.height);
    }
    if (p.hearts === 1 && game.state === "playing") {
      const pulse = 0.1 + 0.07 * Math.sin(time * 5);
      const grad = ctx.createRadialGradient(
        CFG.width / 2, CFG.height / 2, CFG.height * 0.42,
        CFG.width / 2, CFG.height / 2, CFG.height * 0.78);
      grad.addColorStop(0, "rgba(120,0,10,0)");
      grad.addColorStop(1, "rgba(120,0,10," + pulse + ")");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CFG.width, CFG.height);
    }
    ctx.restore();
  },

  drawTouchSticks(ctx) {
    if (!Input.touchMode) return;
    ctx.save();
    for (const stick of [Input.moveStick, Input.aimStick]) {
      if (stick.id === -1) continue;
      ctx.strokeStyle = "rgba(254,243,199,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 46, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(254,243,199,0.5)";
      ctx.beginPath();
      ctx.arc(stick.ox + stick.dx * 34, stick.oy + stick.dy * 34, 17, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // The light ladder, always on screen: which rung the lantern has
  // reached, so the growth is readable in any screenshot.
  drawLightStage(ctx, game) {
    const stage = lightStageFor(Math.max(1, Director.wave));
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = "#fcd34d";
    ctx.font = "700 14px 'Trebuchet MS', sans-serif";
    ctx.fillText("LIGHT — " + stage.name, CFG.width - 20, CFG.height - 34);
    ctx.fillStyle = "#8b7fb8";
    ctx.font = "400 12px 'Trebuchet MS', sans-serif";
    ctx.fillText(game.arenaName(game.arenaIdx) + " · reach " + Math.round(game.player.lightRadius()), CFG.width - 20, CFG.height - 16);
    ctx.restore();
  },

  draw(ctx, game, time) {
    this.drawHearts(ctx, game);
    this.drawScore(ctx, game);
    this.drawCombo(ctx, game);
    this.drawWave(ctx, game);
    this.drawBossBar(ctx);
    this.drawBlessing(ctx, game);
    this.drawLightStage(ctx, game);
    this.drawAnnouncer(ctx);
    this.drawTouchSticks(ctx);
  },
};

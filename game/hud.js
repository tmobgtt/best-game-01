// Mothlight HUD: everything the player reads at a glance — lantern hearts,
// score and best, the wave banner line, the combo meter with its draining
// timer, the active blessing chip, the dash pip, and centre announcements
// ("WAVE 3", "BLESSING — SPREAD!"). Touch controls draw here too.

import { BLESSINGS } from "./player.js";

export function drawHeart(ctx, x, y, size, filled, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-13, -3, -8, -12, 0, -5);
  ctx.bezierCurveTo(8, -12, 13, -3, 0, 7);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color || "#ff7d6b";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(-3.4, -4.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(255,150,140,0.4)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h, r = 12) {
  ctx.fillStyle = "rgba(10,12,28,0.55)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,217,138,0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawHud(ctx, v) {
  const { w } = v;

  // hearts, top-left
  panel(ctx, 16, 14, 118, 40);
  for (let i = 0; i < v.maxHearts; i++) {
    drawHeart(ctx, 38 + i * 36, 36, 24, i < v.hearts);
  }

  // wave, top-centre
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "700 21px Georgia, 'Times New Roman', serif";
  ctx.fillText(`WAVE ${v.wave}`, w / 2, 40);
  ctx.font = "12px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillStyle = "rgba(230,225,255,0.75)";
  const left = v.enemiesLeft;
  ctx.fillText(left === 1 ? "1 shadow remains" : `${left} shadows remain`, w / 2, 58);

  // score, top-right
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd98a";
  ctx.font = "700 26px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillText(String(v.score).padStart(6, "0"), w - 20, 42);
  ctx.font = "12px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillStyle = "rgba(230,225,255,0.7)";
  ctx.fillText(`BEST ${Math.max(v.best, v.score)}`, w - 20, 60);

  // combo meter, under the wave line
  if (v.combo >= 2) {
    const bw = 210;
    const bx = w / 2 - bw / 2;
    const by = 70;
    ctx.textAlign = "center";
    ctx.fillStyle = v.multiplier >= 5 ? "#ffb35c" : "#ffe9b0";
    ctx.font = "800 19px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText(`COMBO ×${v.multiplier}`, w / 2, by + 16);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.roundRect(bx, by + 22, bw, 5, 3);
    ctx.fill();
    ctx.fillStyle = v.multiplier >= 5 ? "#ffb35c" : "#ffd166";
    ctx.beginPath();
    ctx.roundRect(bx, by + 22, bw * Math.max(0, Math.min(1, v.comboFrac)), 5, 3);
    ctx.fill();
  }

  // blessing chip, bottom-left
  if (v.blessing) {
    const b = BLESSINGS[v.blessing];
    panel(ctx, 16, v.h - 54, 168, 40);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(38, v.h - 34, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.font = "700 15px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText(b.name, 56, v.h - 28);
    if (v.blessingFrac !== null) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(56, v.h - 24, 116, 4, 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(56, v.h - 24, 116 * Math.max(0, v.blessingFrac), 4, 2);
      ctx.fill();
    }
  }

  // hints, bottom-right (desktop only — touch has its own controls)
  if (!v.usingTouch) {
    ctx.textAlign = "right";
    ctx.font = "12px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillStyle = "rgba(230,225,255,0.55)";
    const dashReady = v.dashFrac >= 1;
    ctx.fillText(dashReady ? "SHIFT — dash ready" : "dash charging…", w - 20, v.h - 36);
    ctx.fillText("P pause · M mute", w - 20, v.h - 18);
  }
}

export function drawTouchControls(ctx, input, v) {
  if (!v.usingTouch) return;
  const sticks = input.sticks();
  ctx.save();
  for (const [stick, label] of [[sticks.move, "MOVE"], [sticks.aim, "AIM"]]) {
    if (!stick) continue;
    ctx.strokeStyle = "rgba(255,233,176,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(stick.ox, stick.oy, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,217,138,0.55)";
    ctx.beginPath();
    ctx.arc(stick.ox + stick.dx * 34, stick.oy + stick.dy * 34, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(230,225,255,0.6)";
    ctx.font = "10px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, stick.ox, stick.oy + 62);
  }
  // dash button, bottom-right
  const bx = v.w - 75;
  const by = v.h - 75;
  ctx.strokeStyle = v.dashFrac >= 1 ? "rgba(255,217,138,0.85)" : "rgba(255,217,138,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx, by, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(10,12,28,0.5)";
  ctx.fill();
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "700 12px 'Trebuchet MS', Verdana, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DASH", bx, by + 4);
  ctx.restore();
}

// Centre announcements with a soft scale-and-fade life.
export function createAnnouncer() {
  let current = null;
  return {
    show(text, sub = "", dur = 1.7) {
      current = { text, sub, life: dur, maxLife: dur };
    },
    update(dt) {
      if (current) {
        current.life -= dt;
        if (current.life <= 0) current = null;
      }
    },
    draw(ctx, w, h) {
      if (!current) return;
      const frac = current.life / current.maxLife;
      const alpha = Math.min(1, frac * 3, (1 - frac) * 6 + 0.2);
      const scale = 1 + Math.max(0, frac - 0.85) * 1.4;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.translate(w / 2, h * 0.3);
      ctx.scale(scale, scale);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe9b0";
      ctx.font = "800 44px Georgia, 'Times New Roman', serif";
      ctx.shadowColor = "rgba(255,183,77,0.65)";
      ctx.shadowBlur = 22;
      ctx.fillText(current.text, 0, 0);
      ctx.shadowBlur = 0;
      if (current.sub) {
        ctx.font = "15px 'Trebuchet MS', Verdana, sans-serif";
        ctx.fillStyle = "rgba(230,225,255,0.9)";
        ctx.fillText(current.sub, 0, 30);
      }
      ctx.restore();
    },
    get active() { return current !== null; },
  };
}

// sprites.js — every glow and creature body is painted ONCE onto an
// offscreen canvas here, so the frame loop only ever blits images.
// Per-frame gradients and shadowBlur are what made the first Mothlight
// dip on weak machines; this file is the fix, kept separate so the
// painters can grow without touching the systems that use them.

const Sprites = {
  glowCache: new Map(),
  bodyCache: new Map(),
  heartLit: null,
  heartDark: null,
  shardImg: null,

  init() {
    this.heartLit = this.paintHeart(true);
    this.heartDark = this.paintHeart(false);
    this.shardImg = this.paintShard();
  },

  // A soft radial glow dot: white heart, coloured halo, transparent rim.
  glow(color) {
    let img = this.glowCache.get(color);
    if (img) return img;
    const S = 64, c = makeCanvas(S, S), g = c.getContext("2d");
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    this.glowCache.set(color, c);
    return c;
  },

  // Creature bodies are painted facing UP (head toward -y); callers
  // rotate the blit to the heading. frame 0/1 is the wing beat.
  body(type, elite, frame) {
    const key = type + "|" + (elite ? "e" : "p") + "|" + frame;
    let img = this.bodyCache.get(key);
    if (img) return img;
    const def = ENEMY_TYPES[type];
    const r = def.radius * (elite ? 1.3 : 1);
    const S = Math.ceil(r * 4.6);
    const c = makeCanvas(S, S), g = c.getContext("2d");
    const cx = S / 2, cy = S / 2;
    this.paintWings(g, cx, cy, r, def, frame);
    this.paintBody(g, cx, cy, r, def, type);
    if (elite) {
      g.strokeStyle = "#ffd75e";
      g.lineWidth = 2.5;
      g.beginPath(); g.arc(cx, cy, r * 1.18, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#ffd75e";
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.arc(cx + i * r * 0.5, cy - r * 1.28, 2.6, 0, Math.PI * 2); g.fill();
      }
    }
    this.bodyCache.set(key, c);
    return c;
  },

  paintWings(g, cx, cy, r, def, frame) {
    const lift = frame === 0 ? r * 0.34 : r * 0.05;   // wing-beat offset
    g.fillStyle = def.dark;
    g.globalAlpha = 0.85;
    for (const side of [-1, 1]) {
      g.save();
      g.translate(cx + side * r * 0.55, cy - r * 0.1);
      g.rotate(side * (0.5 + (frame === 0 ? -0.22 : 0.16)));
      g.beginPath();
      g.ellipse(side * r * 0.72, -lift * 0.4, r * 0.95, r * 0.5, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.globalAlpha = 1;
  },

  paintBody(g, cx, cy, r, def, type) {
    g.fillStyle = def.color;
    g.beginPath();
    g.ellipse(cx, cy, r * 0.74, r * 0.98, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = def.dark;
    g.beginPath();
    g.ellipse(cx, cy + r * 0.34, r * 0.5, r * 0.6, 0, 0, Math.PI * 2);
    g.fill();
    if (type === "beetle") {
      g.strokeStyle = "#ffd9a0"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx, cy - r * 0.9); g.lineTo(cx, cy + r * 0.85); g.stroke();
      g.strokeStyle = def.dark;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const ly = cy - r * 0.5 + i * r * 0.5;
        g.beginPath(); g.moveTo(cx + s * r * 0.6, ly); g.lineTo(cx + s * r * 1.05, ly + r * 0.22); g.stroke();
      }
    } else if (type === "spitter") {
      g.fillStyle = "#d1fae5";
      g.beginPath(); g.arc(cx, cy - r * 0.62, r * 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = def.dark;
      g.beginPath(); g.arc(cx, cy - r * 0.62, r * 0.15, 0, Math.PI * 2); g.fill();
    } else if (type === "splitter") {
      g.fillStyle = def.color;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.beginPath();
        g.arc(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72, r * 0.34, 0, Math.PI * 2);
        g.fill();
      }
    } else if (type === "dart") {
      g.fillStyle = def.color;
      g.beginPath();
      g.moveTo(cx, cy - r * 1.35); g.lineTo(cx + r * 0.55, cy + r * 0.7); g.lineTo(cx - r * 0.55, cy + r * 0.7);
      g.closePath(); g.fill();
    }
    // Eyes: two lit dots near the head, every creature reads at a glance.
    g.fillStyle = "#fff7d6";
    g.beginPath(); g.arc(cx - r * 0.28, cy - r * 0.42, r * 0.13, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + r * 0.28, cy - r * 0.42, r * 0.13, 0, Math.PI * 2); g.fill();
  },

  // The Hollow Queen: three wing pairs, a petal crown, burning eyes.
  // Painted at 260px; enrage tints the crown red in phase 3.
  bossBody(frame, enraged) {
    const key = "boss|" + frame + "|" + (enraged ? "e" : "p");
    let img = this.bodyCache.get(key);
    if (img) return img;
    const S = 260, c = makeCanvas(S, S), g = c.getContext("2d");
    const cx = S / 2, cy = S / 2, r = BOSS_DEF.radius;
    g.fillStyle = BOSS_DEF.dark;
    g.globalAlpha = 0.9;
    for (let pair = 0; pair < 3; pair++) {
      const wr = r * (1.5 - pair * 0.28), wy = cy - r * 0.5 + pair * r * 0.55;
      const flap = frame === 0 ? -0.14 : 0.12;
      for (const side of [-1, 1]) {
        g.save();
        g.translate(cx + side * r * 0.4, wy);
        g.rotate(side * (0.65 + flap - pair * 0.12));
        g.beginPath(); g.ellipse(side * wr * 0.55, 0, wr * 0.62, wr * 0.3, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
    g.globalAlpha = 1;
    g.fillStyle = BOSS_DEF.color;
    g.beginPath(); g.ellipse(cx, cy, r * 0.78, r * 1.02, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,255,255,0.4)";
    g.beginPath(); g.ellipse(cx, cy - r * 0.12, r * 0.34, r * 0.42, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = BOSS_DEF.dark;
    g.beginPath(); g.ellipse(cx, cy + r * 0.44, r * 0.4, r * 0.48, 0, 0, Math.PI * 2); g.fill();
    const crown = enraged ? "#f87171" : "#facc15";
    g.fillStyle = crown;
    for (let i = -2; i <= 2; i++) {
      const px = cx + i * r * 0.34, py = cy - r * 1.08 - Math.abs(i) * -r * 0.06;
      g.save(); g.translate(px, py); g.rotate(i * 0.3);
      g.beginPath(); g.ellipse(0, 0, r * 0.16, r * 0.3, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.fillStyle = enraged ? "#fecaca" : "#fff7d6";
    g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.4, r * 0.15, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + r * 0.3, cy - r * 0.4, r * 0.15, 0, Math.PI * 2); g.fill();
    this.bodyCache.set(key, c);
    return c;
  },

  paintHeart(lit) {
    const S = 30, c = makeCanvas(S, S), g = c.getContext("2d");
    g.translate(S / 2, S / 2);
    g.fillStyle = lit ? "#fbbf24" : "rgba(120,110,150,0.5)";
    g.beginPath();
    g.moveTo(0, 9);
    g.bezierCurveTo(-11, 0, -8, -9, -3.5, -9);
    g.bezierCurveTo(-1, -9, 0, -7.5, 0, -5.5);
    g.bezierCurveTo(0, -7.5, 1, -9, 3.5, -9);
    g.bezierCurveTo(8, -9, 11, 0, 0, 9);
    g.fill();
    if (lit) {
      g.fillStyle = "#fff7d6";
      g.beginPath(); g.arc(0, -2, 2.4, 0, Math.PI * 2); g.fill();
    }
    return c;
  },

  paintShard() {
    const S = 26, c = makeCanvas(S, S), g = c.getContext("2d");
    g.translate(S / 2, S / 2);
    g.fillStyle = "#fef08a";
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? 10 : 4.2;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(0, 0, 2.6, 0, Math.PI * 2); g.fill();
    return c;
  },
};

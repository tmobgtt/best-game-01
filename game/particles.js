// particles.js — the juice layer: spark bursts, petal scatters, shockwave
// rings, floating score text and the garden's ambient motes. Everything
// is pooled, so a boss death at a crowded moment costs no allocation.

const Particles = {
  sparks: new Pool(760, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: "#fff", grav: 0, drag: 0, petal: false, spin: 0, rot: 0 })),
  rings: new Pool(48, () => ({ x: 0, y: 0, r: 0, maxR: 60, life: 0, maxLife: 0.4, color: "#fff", width: 3 })),
  texts: new Pool(56, () => ({ x: 0, y: 0, life: 0, maxLife: 1, str: "", color: "#fff", size: 16 })),
  motes: [],

  init() {
    this.motes = [];
    for (let i = 0; i < 70; i++) {
      this.motes.push({
        x: rand(0, CFG.width), y: rand(0, CFG.height),
        s: rand(1, 2.6), drift: rand(4, 14), phase: rand(0, Math.PI * 2),
      });
    }
  },

  burst(x, y, opts) {
    const n = opts.n || 10;
    for (let i = 0; i < n; i++) {
      const p = this.sparks.obtain();
      if (!p) return;
      const a = opts.dir !== undefined ? opts.dir + rand(-(opts.spread || 0.6), (opts.spread || 0.6)) : rand(0, Math.PI * 2);
      const sp = rand(0.3, 1) * (opts.speed || 220);
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.maxLife = rand(0.6, 1) * (opts.life || 0.5);
      p.life = p.maxLife;
      p.size = rand(0.6, 1.3) * (opts.size || 3.4);
      p.color = opts.color || "#ffffff";
      p.grav = opts.grav || 0;
      p.drag = opts.drag || 2.2;
      p.petal = !!opts.petal;
      p.spin = rand(-6, 6); p.rot = rand(0, Math.PI * 2);
    }
  },

  trailDot(x, y, color, size, life) {
    const p = this.sparks.obtain();
    if (!p) return;
    p.x = x; p.y = y; p.vx = 0; p.vy = 0;
    p.maxLife = life; p.life = life;
    p.size = size; p.color = color;
    p.grav = 0; p.drag = 0; p.petal = false; p.spin = 0; p.rot = 0;
  },

  ring(x, y, color, maxR, life, width) {
    const r = this.rings.obtain();
    if (!r) return;
    r.x = x; r.y = y; r.r = 4; r.maxR = maxR || 60;
    r.maxLife = life || 0.4; r.life = r.maxLife;
    r.color = color; r.width = width || 3;
  },

  text(x, y, str, color, size) {
    const t = this.texts.obtain();
    if (!t) return;
    t.x = x + rand(-6, 6); t.y = y; t.str = str;
    t.color = color || "#fff7d6"; t.size = size || 16;
    t.maxLife = 0.95; t.life = t.maxLife;
  },

  update(dt) {
    this.sparks.forEachAlive((p) => {
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; return; }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
    });
    this.rings.forEachAlive((r) => {
      r.life -= dt;
      if (r.life <= 0) { r.alive = false; return; }
      const t = 1 - r.life / r.maxLife;
      r.r = 4 + (r.maxR - 4) * (1 - (1 - t) * (1 - t));
    });
    this.texts.forEachAlive((t) => {
      t.life -= dt;
      if (t.life <= 0) { t.alive = false; return; }
      t.y -= 44 * dt;
    });
  },

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    this.sparks.forEachAlive((p) => {
      const t = p.life / p.maxLife;
      if (p.petal) {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, t * 1.6);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.7, p.size * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        const s = p.size * 4 * t + 2;
        ctx.globalAlpha = Math.min(1, t * 1.4);
        ctx.drawImage(Sprites.glow(p.color), p.x - s / 2, p.y - s / 2, s, s);
      }
    });
    ctx.restore();
    this.rings.forEachAlive((r) => {
      ctx.save();
      ctx.globalAlpha = (r.life / r.maxLife) * 0.8;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
    ctx.save();
    ctx.textAlign = "center";
    this.texts.forEachAlive((t) => {
      ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 2);
      ctx.font = "700 " + t.size + "px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    });
    ctx.restore();
  },

  // Ambient fireflies drifting over the garden, drawn under everything.
  drawMotes(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const m of this.motes) {
      const x = m.x + Math.sin(time * 0.3 + m.phase) * 18;
      const y = (m.y - time * m.drift) % CFG.height;
      const yy = y < 0 ? y + CFG.height : y;
      const tw = 0.35 + 0.3 * Math.sin(time * 1.7 + m.phase * 3);
      ctx.globalAlpha = tw;
      const s = m.s * 5;
      ctx.drawImage(Sprites.glow("#b7f7c8"), x - s / 2, yy - s / 2, s, s);
    }
    ctx.restore();
  },

  clear() {
    this.sparks.releaseAll();
    this.rings.releaseAll();
    this.texts.releaseAll();
  },
};

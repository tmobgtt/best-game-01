// particles.js — pooled particles, floating texts, shockwave rings and
// lightning arcs. Everything is pre-allocated and recycled; the frame loop
// allocates nothing here.
"use strict";

AK.FX = {
  parts: [], texts: [], rings: [], arcs: [],
  partPool: new AK.Pool(() => ({}), 1200),
  textPool: new AK.Pool(() => ({}), 120),
  init() { this.parts.length = 0; this.texts.length = 0; this.rings.length = 0; this.arcs.length = 0; },
  burst(x, y, color, n = 10, speed = 130, life = 0.5, size = 3) {
    for (let i = 0; i < n; i++) {
      const p = this.partPool.get(), a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.9);
      p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - 30;
      p.life = p.max = life * (0.6 + Math.random() * 0.7);
      p.size = size * (0.6 + Math.random() * 0.8); p.color = color; p.grav = 160; p.img = null;
      this.parts.push(p);
    }
  },
  trail(x, y, color, size = 4) {
    const p = this.partPool.get();
    p.x = x; p.y = y; p.vx = AK.rand(-14, 14); p.vy = AK.rand(-24, -6);
    p.life = p.max = 0.32; p.size = size; p.color = color; p.grav = -30; p.img = null;
    this.parts.push(p);
  },
  coin(x, y) {
    const p = this.partPool.get();
    p.x = x; p.y = y; p.vx = AK.rand(-26, 26); p.vy = AK.rand(-120, -70);
    p.life = p.max = 0.55; p.size = 3.4; p.color = "#ffd75e"; p.grav = 300; p.img = null;
    this.parts.push(p);
  },
  text(x, y, str, color = "#ffffff", size = 13) {
    const t = this.textPool.get();
    t.x = x + AK.rand(-5, 5); t.y = y - 8; t.vy = -44; t.life = t.max = 0.85;
    t.str = str; t.color = color; t.size = size;
    this.texts.push(t);
  },
  ring(x, y, color, vr = 260, width = 3) {
    this.rings.push({ x, y, r: 6, vr, life: 0.38, max: 0.38, color, width });
  },
  arc(points, color, width = 2.5) {
    // jitter the polyline so the bolt looks electric
    const pts = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1], [bx, by] = points[i];
      const segs = 3;
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        pts.push([AK.lerp(ax, bx, t) + AK.rand(-7, 7), AK.lerp(ay, by, t) + AK.rand(-7, 7)]);
      }
      pts.push(points[i]);
    }
    this.arcs.push({ pts, life: 0.16, max: 0.16, color, width });
  },
  update(dt) {
    const P = this.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life -= dt;
      if (p.life <= 0) { P.splice(i, 1); this.partPool.put(p); continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    const T = this.texts;
    for (let i = T.length - 1; i >= 0; i--) {
      const t = T[i]; t.life -= dt; t.y += t.vy * dt;
      if (t.life <= 0) { T.splice(i, 1); this.textPool.put(t); }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.life -= dt; r.r += r.vr * dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].life -= dt;
      if (this.arcs[i].life <= 0) this.arcs.splice(i, 1);
    }
  },
  draw(ctx) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    for (const r of this.rings) {
      ctx.globalAlpha = Math.max(0, r.life / r.max) * 0.8;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
    }
    for (const a of this.arcs) {
      ctx.globalAlpha = Math.max(0, a.life / a.max);
      ctx.strokeStyle = a.color; ctx.lineWidth = a.width; ctx.beginPath();
      a.pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.textAlign = "center"; ctx.font = "700 13px 'Segoe UI', sans-serif";
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.max);
      ctx.font = `700 ${t.size}px 'Segoe UI', sans-serif`;
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.restore();
  },
};

// Mothlight particles: the juice layer. Spark bursts on every kill, expanding
// rings on big events, floating score text, dash trails and slow ambient
// motes that keep the garden alive even between waves. One pooled system,
// additive blending, hard caps so the frame rate never dips.

const MAX_PARTICLES = 420;
const MAX_TEXTS = 24;

export function createParticles() {
  const parts = [];
  const rings = [];
  const texts = [];
  const motes = [];

  function spawn(part) {
    if (parts.length >= MAX_PARTICLES) parts.shift();
    parts.push(part);
  }

  function burst(x, y, { count = 12, color = "#ffd98a", speed = 220, life = 0.45, size = 3, spread = Math.PI * 2, dir = 0, gravity = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.3 + Math.random() * 0.9);
      const ttl = life * (0.5 + Math.random() * 0.8);
      spawn({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: ttl, maxLife: ttl,
        size: size * (0.6 + Math.random() * 0.8),
        color, gravity,
        drag: 2.6,
        kind: "spark",
      });
    }
  }

  function petals(x, y, count = 8, color = "#8a7bd8") {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 90;
      const ttl = 0.7 + Math.random() * 0.6;
      spawn({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 30,
        life: ttl, maxLife: ttl,
        size: 3 + Math.random() * 3,
        color, gravity: -18,
        drag: 1.4,
        kind: "petal",
        spin: (Math.random() - 0.5) * 9,
        rot: Math.random() * Math.PI,
      });
    }
  }

  function trail(x, y, color = "#ffca66", size = 9) {
    const ttl = 0.3 + Math.random() * 0.12;
    spawn({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: 0, vy: -12,
      life: ttl, maxLife: ttl,
      size, color, gravity: 0, drag: 0,
      kind: "glow",
    });
  }

  function ring(x, y, { color = "#ffd98a", maxRadius = 90, life = 0.4, width = 3 } = {}) {
    rings.push({ x, y, radius: 6, maxRadius, life, maxLife: life, color, width });
  }

  function floatText(x, y, text, { color = "#ffe9b0", size = 20 } = {}) {
    if (texts.length >= MAX_TEXTS) texts.shift();
    texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
  }

  function seedMotes(w, h, count = 26) {
    motes.length = 0;
    for (let i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        speed: 6 + Math.random() * 12,
      });
    }
  }

  function update(dt, w, h, time) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      const dragK = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragK;
      p.vy = p.vy * dragK + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.rot !== undefined) p.rot += p.spin * dt;
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        rings.splice(i, 1);
        continue;
      }
      const frac = 1 - r.life / r.maxLife;
      r.radius = 6 + (r.maxRadius - 6) * (1 - Math.pow(1 - frac, 3));
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      t.y -= 44 * dt;
      if (t.life <= 0) texts.splice(i, 1);
    }
    for (const m of motes) {
      m.y -= m.speed * dt * 0.4;
      m.x += Math.sin(time * 0.6 + m.phase) * 8 * dt;
      if (m.y < -6) {
        m.y = h + 6;
        m.x = Math.random() * w;
      }
    }
  }

  function draw(ctx, time) {
    ctx.save();
    for (const m of motes) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 1.7 + m.phase));
      ctx.globalAlpha = 0.35 * tw;
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      const frac = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, frac * 1.6);
      ctx.fillStyle = p.color;
      if (p.kind === "petal") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === "glow") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * frac + 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * frac + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const r of rings) {
      const frac = r.life / r.maxLife;
      ctx.globalAlpha = frac * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * frac + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = "center";
    for (const t of texts) {
      const frac = t.life / t.maxLife;
      ctx.globalAlpha = Math.min(1, frac * 2);
      ctx.font = `700 ${t.size}px "Trebuchet MS", Verdana, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  function clear() {
    parts.length = 0;
    rings.length = 0;
    texts.length = 0;
  }

  return { burst, petals, trail, ring, floatText, seedMotes, update, draw, clear };
}

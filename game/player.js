// Mothlight player: the Lantern Wisp. A small spirit of light with a bobbing
// lantern glow, a dash with i-frames and afterimages, and a spark shot that
// blessings can reshape — Spread fans three ways, Rapid doubles the rate,
// Aegis carries a shield that eats one hit.

export const BLESSINGS = {
  spread: { name: "SPREAD", color: "#ffd166", duration: 12 },
  rapid: { name: "RAPID", color: "#6ee7ff", duration: 12 },
  aegis: { name: "AEGIS", color: "#b388ff", duration: Infinity },
};
export const BLESSING_CYCLE = ["spread", "rapid", "aegis"];

export function createPlayer(x, y) {
  return {
    x, y,
    vx: 0, vy: 0,
    radius: 13,
    speed: 268,
    hearts: 3,
    maxHearts: 3,
    aimAngle: 0,
    fireTimer: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashDirX: 1, dashDirY: 0,
    invulnTime: 0,
    blessing: null,
    blessingTime: 0,
    bobPhase: Math.random() * Math.PI * 2,
    tilt: 0,
  };
}

export function updatePlayer(p, dt, input, w, h, fx, sfx) {
  const move = input.moveVector();
  const dashing = p.dashTime > 0;

  if (input.wasPressed("dash") && p.dashCooldown <= 0 && !dashing) {
    const len = Math.hypot(move.x, move.y);
    if (len > 0.1) {
      p.dashDirX = move.x / len;
      p.dashDirY = move.y / len;
    } else {
      p.dashDirX = Math.cos(p.aimAngle);
      p.dashDirY = Math.sin(p.aimAngle);
    }
    p.dashTime = 0.16;
    p.dashCooldown = 1.5;
    if (sfx) sfx.dash();
  }

  if (dashing) {
    p.vx = p.dashDirX * 790;
    p.vy = p.dashDirY * 790;
    p.dashTime -= dt;
    fx.trail(p.x, p.y, p.blessing ? BLESSINGS[p.blessing].color : "#ffca66", 10);
  } else {
    const accel = 2400;
    p.vx += move.x * accel * dt;
    p.vy += move.y * accel * dt;
    const friction = Math.pow(0.0001, dt);
    if (Math.hypot(move.x, move.y) < 0.05) {
      p.vx *= friction;
      p.vy *= friction;
    }
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > p.speed) {
      p.vx = (p.vx / speed) * p.speed;
      p.vy = (p.vy / speed) * p.speed;
    }
  }

  p.x = Math.max(p.radius, Math.min(w - p.radius, p.x + p.vx * dt));
  p.y = Math.max(p.radius, Math.min(h - p.radius, p.y + p.vy * dt));
  p.tilt += ((Math.max(-0.35, Math.min(0.35, p.vx * 0.0011))) - p.tilt) * Math.min(1, dt * 10);
  p.bobPhase += dt * 2.4;

  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invulnTime = Math.max(0, p.invulnTime - dt);
  p.fireTimer = Math.max(0, p.fireTimer - dt);

  if (p.blessing && p.blessingTime !== Infinity) {
    p.blessingTime -= dt;
    if (p.blessingTime <= 0) p.blessing = null;
  }

  const aim = input.aimVector(p.x, p.y);
  if (aim.active) p.aimAngle = Math.atan2(aim.y, aim.x);
}

export function isInvulnerable(p) {
  return p.invulnTime > 0 || p.dashTime > 0;
}

export function grantBlessing(p, kind) {
  p.blessing = kind;
  p.blessingTime = BLESSINGS[kind].duration;
}

export function tryFire(p, firing, bullets, sfx) {
  if (!firing || p.fireTimer > 0) return;
  const rapid = p.blessing === "rapid";
  p.fireTimer = rapid ? 0.085 : 0.16;
  const speed = 740;
  const spreadAngles = p.blessing === "spread" ? [-0.17, 0, 0.17] : [0];
  for (const offset of spreadAngles) {
    const angle = p.aimAngle + offset + (Math.random() - 0.5) * 0.02;
    bullets.push({
      x: p.x + Math.cos(p.aimAngle) * 16,
      y: p.y + Math.sin(p.aimAngle) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4,
      life: 0.85,
    });
  }
  if (sfx) sfx.shoot();
}

let bulletSprite = null;

function getBulletSprite() {
  if (bulletSprite) return bulletSprite;
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,240,200,0.95)");
  grad.addColorStop(0.35, "rgba(255,190,90,0.55)");
  grad.addColorStop(1, "rgba(255,160,60,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  bulletSprite = c;
  return c;
}

export function drawBullets(ctx, bullets) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const sprite = getBulletSprite();
  for (const b of bullets) {
    ctx.drawImage(sprite, b.x - 11, b.y - 11, 22, 22);
  }
  ctx.restore();
}

let glowSprite = null;

function getGlowSprite() {
  if (glowSprite) return glowSprite;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,214,130,0.55)");
  grad.addColorStop(0.35, "rgba(255,183,77,0.20)");
  grad.addColorStop(1, "rgba(255,160,60,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  glowSprite = c;
  return c;
}

export function drawPlayer(ctx, p, time) {
  const bob = Math.sin(p.bobPhase) * 3;
  const flicker = 1 + Math.sin(time * 11) * 0.03 + Math.sin(time * 23.7) * 0.02;
  const glowR = 150 * flicker;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(getGlowSprite(), p.x - glowR, p.y - glowR + bob, glowR * 2, glowR * 2);
  ctx.restore();

  if (p.invulnTime > 0 && p.dashTime <= 0 && Math.floor(time * 14) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(p.tilt);

  // trailing scarf of light
  ctx.fillStyle = "rgba(255,170,80,0.5)";
  ctx.beginPath();
  ctx.moveTo(-6, 6);
  ctx.quadraticCurveTo(-16 - Math.sin(time * 6) * 3, 16, -10, 26 + Math.sin(time * 8) * 3);
  ctx.quadraticCurveTo(-2, 18, 2, 8);
  ctx.closePath();
  ctx.fill();

  // hooded body: a warm teardrop
  const bodyGrad = ctx.createLinearGradient(0, -16, 0, 14);
  bodyGrad.addColorStop(0, "#fff3d6");
  bodyGrad.addColorStop(0.55, "#ffd98a");
  bodyGrad.addColorStop(1, "#f5a94b");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.quadraticCurveTo(13, -6, 11, 6);
  ctx.quadraticCurveTo(9, 15, 0, 15);
  ctx.quadraticCurveTo(-9, 15, -11, 6);
  ctx.quadraticCurveTo(-13, -6, 0, -17);
  ctx.fill();

  // eyes look toward the aim
  const ex = Math.cos(p.aimAngle) * 2.6;
  const ey = Math.sin(p.aimAngle) * 1.8;
  ctx.fillStyle = "#4a2c14";
  ctx.beginPath();
  ctx.arc(-4 + ex, -4 + ey, 1.9, 0, Math.PI * 2);
  ctx.arc(4 + ex, -4 + ey, 1.9, 0, Math.PI * 2);
  ctx.fill();

  // the little lantern, swung toward the aim side
  const lx = Math.cos(p.aimAngle) * 13;
  const ly = 6 + Math.sin(time * 5) * 1.5;
  ctx.strokeStyle = "rgba(120,72,20,0.9)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(6, 2);
  ctx.lineTo(6 + lx * 0.5, ly - 4);
  ctx.stroke();
  ctx.fillStyle = "#ffca66";
  ctx.beginPath();
  ctx.arc(6 + lx * 0.5, ly, 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (p.blessing === "aegis") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(179,136,255,${0.55 + 0.25 * Math.sin(time * 4)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

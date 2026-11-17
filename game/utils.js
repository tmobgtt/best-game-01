// utils.js — small math and pooling helpers shared by every system.
"use strict";
window.AK = window.AK || {};

AK.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
AK.lerp = (a, b, t) => a + (b - a) * t;
AK.dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
AK.dist = (ax, ay, bx, by) => Math.sqrt(AK.dist2(ax, ay, bx, by));
AK.angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
AK.rand = (a, b) => a + Math.random() * (b - a);
AK.randInt = (a, b) => Math.floor(AK.rand(a, b + 1));
AK.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
AK.fmt = (n) => Math.floor(n).toLocaleString("en-US");
// ease curves for UI and effects
AK.easeOut = (t) => 1 - Math.pow(1 - t, 3);
AK.easeIn = (t) => t * t * t;
// A tiny free-list pool: objects are plain, reset by the owner's spawn fn.
AK.Pool = class {
  constructor(factory, max = 900) { this.factory = factory; this.free = []; this.max = max; }
  get() { return this.free.pop() || this.factory(); }
  put(o) { if (this.free.length < this.max) this.free.push(o); }
};
// Rotating hue helper for crystal / arcane effects.
AK.hueLerp = (h1, h2, t) => h1 + (h2 - h1) * t;

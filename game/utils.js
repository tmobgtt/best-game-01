// utils.js — small math and allocation helpers shared by every system.
// The hot loops lean on these to avoid garbage: pools hand back dead
// objects instead of letting the collector stall a frame.

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function lerp(a, b, t) { return a + (b - a) * t; }

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function dist2(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
}

// Shortest signed turn from angle a to angle b, in radians.
function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// A fixed-capacity pool of plain objects. obtain() returns a live object
// (reset by the caller's init function) or null when the pool is dry, so
// effects degrade gracefully instead of allocating under pressure.
class Pool {
  constructor(capacity, factory) {
    this.items = [];
    for (let i = 0; i < capacity; i++) {
      const o = factory();
      o.alive = false;
      this.items.push(o);
    }
  }
  obtain() {
    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i].alive) { this.items[i].alive = true; return this.items[i]; }
    }
    return null;
  }
  releaseAll() {
    for (let i = 0; i < this.items.length; i++) this.items[i].alive = false;
  }
  forEachAlive(fn) {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].alive) fn(this.items[i]);
    }
  }
}

// An offscreen canvas of the given size, used by sprites.js to pre-render
// anything the frame loop would otherwise repaint with gradients.
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

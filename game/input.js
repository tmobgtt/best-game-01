// input.js — one place that turns keyboard, mouse, gamepad and touch
// into the four questions the game asks each frame: which way are we
// moving, where are we aiming, are we firing, and what was just pressed.

const Input = {
  keys: new Set(),
  pressed: new Set(),       // key codes that went down since last endFrame()
  mouseX: CFG.width / 2,
  mouseY: CFG.height / 2,
  mouseDown: false,
  clicked: false,           // mouse went down since last endFrame()
  clickX: 0,
  clickY: 0,
  touchMode: false,
  moveStick: { id: -1, ox: 0, oy: 0, dx: 0, dy: 0 },
  aimStick: { id: -1, ox: 0, oy: 0, dx: 0, dy: 0 },
  canvas: null,

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.keys.add(e.code); this.pressed.add(e.code); }
      Sound.init();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => { this.keys.clear(); this.mouseDown = false; });

    const toGame = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (clientX - r.left) * (CFG.width / r.width),
        y: (clientY - r.top) * (CFG.height / r.height),
      };
    };
    canvas.addEventListener("mousemove", (e) => {
      const p = toGame(e.clientX, e.clientY);
      this.mouseX = p.x; this.mouseY = p.y;
    });
    canvas.addEventListener("mousedown", (e) => {
      Sound.init();
      const p = toGame(e.clientX, e.clientY);
      this.mouseDown = true; this.clicked = true;
      this.clickX = p.x; this.clickY = p.y;
      this.mouseX = p.x; this.mouseY = p.y;
    });
    window.addEventListener("mouseup", () => { this.mouseDown = false; });

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault(); Sound.init(); this.touchMode = true;
      for (const t of e.changedTouches) {
        const p = toGame(t.clientX, t.clientY);
        const stick = p.x < CFG.width / 2 ? this.moveStick : this.aimStick;
        if (stick.id === -1) { stick.id = t.identifier; stick.ox = p.x; stick.oy = p.y; stick.dx = 0; stick.dy = 0; }
      }
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const p = toGame(t.clientX, t.clientY);
        for (const stick of [this.moveStick, this.aimStick]) {
          if (stick.id === t.identifier) {
            stick.dx = clamp((p.x - stick.ox) / 52, -1, 1);
            stick.dy = clamp((p.y - stick.oy) / 52, -1, 1);
          }
        }
      }
    }, { passive: false });
    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        for (const stick of [this.moveStick, this.aimStick]) {
          if (stick.id === t.identifier) { stick.id = -1; stick.dx = 0; stick.dy = 0; }
        }
      }
    };
    canvas.addEventListener("touchend", endTouch);
    canvas.addEventListener("touchcancel", endTouch);
  },

  pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  },

  moveVector() {
    let x = 0, y = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    if (x === 0 && y === 0) {
      const p = this.pad();
      if (p) {
        const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
        if (Math.hypot(ax, ay) > 0.18) { x = ax; y = ay; }
      }
    }
    if (x === 0 && y === 0 && this.moveStick.id !== -1) { x = this.moveStick.dx; y = this.moveStick.dy; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  },

  // Where the keeper is aiming, in world coordinates.
  aimPoint(px, py) {
    const p = this.pad();
    if (p) {
      const ax = p.axes[2] || 0, ay = p.axes[3] || 0;
      if (Math.hypot(ax, ay) > 0.25) return { x: px + ax * 120, y: py + ay * 120, stick: true };
    }
    if (this.touchMode && this.aimStick.id !== -1) {
      return { x: px + this.aimStick.dx * 120, y: py + this.aimStick.dy * 120, stick: true };
    }
    return { x: this.mouseX, y: this.mouseY, stick: false };
  },

  firing(px, py) {
    if (this.mouseDown) return true;
    if (this.touchMode && this.aimStick.id !== -1 && Math.hypot(this.aimStick.dx, this.aimStick.dy) > 0.3) return true;
    const p = this.pad();
    if (p) {
      const ax = p.axes[2] || 0, ay = p.axes[3] || 0;
      if (Math.hypot(ax, ay) > 0.35) return true;
      if (p.buttons[7] && p.buttons[7].pressed) return true;
    }
    return false;
  },

  dashDown() {
    return this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.keys.has("Space");
  },

  wasPressed(code) { return this.pressed.has(code); },

  anyConfirm() {
    return this.pressed.has("Enter") || this.pressed.has("Space") || this.clicked;
  },

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  },
};

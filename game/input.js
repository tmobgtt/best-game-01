// input.js — mouse position, clicks, and keys, normalised to canvas pixels.
// main.js polls this each frame and routes events by game state.
"use strict";

AK.Input = {
  x: 0, y: 0, down: false, clicked: false, rightClicked: false,
  keys: {}, pressed: {},
  init(canvas) {
    const toGame = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (AK.CFG.W / r.width),
        y: (e.clientY - r.top) * (AK.CFG.H / r.height),
      };
    };
    canvas.addEventListener("mousemove", (e) => { const p = toGame(e); this.x = p.x; this.y = p.y; });
    canvas.addEventListener("mousedown", (e) => {
      AK.Audio.init(); AK.Audio.resume();
      const p = toGame(e); this.x = p.x; this.y = p.y;
      if (e.button === 0) { this.down = true; this.clicked = true; }
      if (e.button === 2) this.rightClicked = true;
    });
    window.addEventListener("mouseup", (e) => { if (e.button === 0) this.down = false; });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", (e) => {
      AK.Audio.init(); AK.Audio.resume();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });
  },
  // end-of-frame: clear one-shot flags
  flush() { this.clicked = false; this.rightClicked = false; this.pressed = {}; },
  wasPressed(code) { return !!this.pressed[code]; },
};

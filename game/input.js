// Mothlight input: one state object fed by keyboard, mouse and touch.
// Desktop plays as a twin-stick (WASD/arrows to move, mouse to aim, hold to
// fire); touch gets two virtual sticks and an on-screen dash button. Actions
// such as dash, start and pause are edge-triggered and consumed by the game.

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas, viewW, viewH) {
  const keysDown = new Set();
  const pressedActions = new Set();
  const pointer = { x: viewW / 2, y: viewH / 2 - 120, down: false, seen: false };
  let usingTouch = false;
  let moveStick = null; // {id, ox, oy, dx, dy}
  let aimStick = null;
  let dashTouchId = null;

  function toGameCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * viewW,
      y: ((clientY - rect.top) / rect.height) * viewH,
    };
  }

  function press(action) {
    pressedActions.add(action);
  }

  window.addEventListener("keydown", (event) => {
    if (MOVE_KEYS[event.code] || event.code === "Space") event.preventDefault();
    if (event.repeat) return;
    keysDown.add(event.code);
    if (MOVE_KEYS[event.code]) return;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") press("dash");
    if (event.code === "Space") press("fireStart");
    if (event.code === "Enter") press("start");
    if (event.code === "KeyR") press("restart");
    if (event.code === "KeyP" || event.code === "Escape") press("pause");
    if (event.code === "KeyM") press("mute");
  });

  window.addEventListener("keyup", (event) => {
    keysDown.delete(event.code);
  });

  window.addEventListener("blur", () => {
    keysDown.clear();
    pointer.down = false;
  });

  canvas.addEventListener("mousemove", (event) => {
    const p = toGameCoords(event.clientX, event.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.seen = true;
  });

  canvas.addEventListener("mousedown", (event) => {
    const p = toGameCoords(event.clientX, event.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.seen = true;
    pointer.down = true;
    press("start");
    press("fireStart");
  });

  window.addEventListener("mouseup", () => {
    pointer.down = false;
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  function dashButtonHit(p) {
    return p.x > viewW - 150 && p.y > viewH - 150;
  }

  canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    usingTouch = true;
    press("start");
    for (const touch of event.changedTouches) {
      const p = toGameCoords(touch.clientX, touch.clientY);
      if (dashButtonHit(p) && dashTouchId === null) {
        dashTouchId = touch.identifier;
        press("dash");
      } else if (p.x < viewW / 2 && moveStick === null) {
        moveStick = { id: touch.identifier, ox: p.x, oy: p.y, dx: 0, dy: 0 };
      } else if (aimStick === null) {
        aimStick = { id: touch.identifier, ox: p.x, oy: p.y, dx: 0, dy: 0 };
        pointer.x = p.x;
        pointer.y = p.y;
        pointer.seen = true;
      }
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      const p = toGameCoords(touch.clientX, touch.clientY);
      for (const stick of [moveStick, aimStick]) {
        if (stick && stick.id === touch.identifier) {
          const range = 60;
          stick.dx = Math.max(-range, Math.min(range, p.x - stick.ox)) / range;
          stick.dy = Math.max(-range, Math.min(range, p.y - stick.oy)) / range;
        }
      }
    }
  }, { passive: false });

  function endTouch(event) {
    for (const touch of event.changedTouches) {
      if (moveStick && moveStick.id === touch.identifier) moveStick = null;
      if (aimStick && aimStick.id === touch.identifier) aimStick = null;
      if (dashTouchId === touch.identifier) dashTouchId = null;
    }
  }

  canvas.addEventListener("touchend", endTouch);
  canvas.addEventListener("touchcancel", endTouch);

  function moveVector() {
    let x = 0;
    let y = 0;
    for (const code of keysDown) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        x += dir[0];
        y += dir[1];
      }
    }
    if (moveStick) {
      x += moveStick.dx;
      y += moveStick.dy;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  function aimVector(playerX, playerY) {
    if (aimStick && Math.hypot(aimStick.dx, aimStick.dy) > 0.3) {
      const len = Math.hypot(aimStick.dx, aimStick.dy);
      return { x: aimStick.dx / len, y: aimStick.dy / len, active: true };
    }
    const dx = pointer.x - playerX;
    const dy = pointer.y - playerY;
    const len = Math.hypot(dx, dy);
    if (len < 4) return { x: 1, y: 0, active: false };
    return { x: dx / len, y: dy / len, active: true };
  }

  function isFiring() {
    if (pointer.down) return true;
    if (keysDown.has("Space")) return true;
    if (aimStick && Math.hypot(aimStick.dx, aimStick.dy) > 0.35) return true;
    return false;
  }

  function wasPressed(action) {
    if (!pressedActions.has(action)) return false;
    pressedActions.delete(action);
    return true;
  }

  function clearPresses() {
    pressedActions.clear();
  }

  return {
    moveVector,
    aimVector,
    isFiring,
    wasPressed,
    clearPresses,
    pointer,
    isUsingTouch: () => usingTouch,
    sticks: () => ({ move: moveStick, aim: aimStick }),
  };
}

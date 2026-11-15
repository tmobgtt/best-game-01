// upgrades.js — the between-wave draft, where a run is really decided.
// Clearing a wave offers three cards from the pool in config.js; the
// keeper picks one (keys 1-3 or a click) and the stack it grants bends
// the build: fan volleys, piercing light, orbiting guardians, a regrown
// shield. player.js reads the stacks; this file owns choosing them.

const Upgrades = {
  stacks: {},
  choices: [],
  cards: [],
  onPick: null,

  reset() {
    this.stacks = {};
    this.choices = [];
    this.onPick = null;
  },

  count(id) { return this.stacks[id] || 0; },

  ownedList() {
    return UPGRADE_POOL
      .filter((d) => this.count(d.id) > 0)
      .map((d) => ({ def: d, count: this.count(d.id) }));
  },

  rollChoices() {
    const open = UPGRADE_POOL.filter((d) => this.count(d.id) < d.max);
    const chosen = [];
    const bag = open.slice();
    while (chosen.length < 3 && bag.length > 0) {
      let total = 0;
      for (const d of bag) total += d.weight;
      let roll = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < bag.length; i++) { roll -= bag[i].weight; if (roll <= 0) { idx = i; break; } }
      chosen.push(bag[idx]);
      bag.splice(idx, 1);
    }
    return chosen;
  },

  openDraft(onPick) {
    this.choices = this.rollChoices();
    this.onPick = onPick;
    if (this.choices.length === 0) { if (onPick) onPick(null); return false; }
    Sound.sfx("draft");
    return true;
  },

  applyChoice(i, player) {
    const def = this.choices[i];
    if (!def) return;
    this.stacks[def.id] = this.count(def.id) + 1;
    player.recomputeStats();
    if (def.id === "heart") player.heal(1);
    if (def.id === "aegis") player.shieldReady = true;
    const wokeFinalForm = this.count(def.id) >= def.max && FINAL_FORMS[def.id];
    if (wokeFinalForm) {
      Sound.sfx("finalForm");
      Particles.text(player.x, player.y - 44, "FINAL FORM — " + FINAL_FORMS[def.id].name, "#facc15", 21);
      Particles.burst(player.x, player.y, { n: 34, color: "#facc15", speed: 260, size: 3.4, life: 0.7 });
      Particles.ring(player.x, player.y, "#facc15", 120, 0.55, 4);
    } else {
      Sound.sfx("pick");
      Particles.burst(player.x, player.y, { n: 22, color: "#fde68a", speed: 200, size: 3.2, life: 0.6 });
      Particles.ring(player.x, player.y, "#fde68a", 84, 0.45, 3);
    }
    const cb = this.onPick;
    this.choices = [];
    this.onPick = null;
    if (cb) cb(def);
  },

  handleInput(player) {
    for (let i = 0; i < this.choices.length; i++) {
      if (Input.wasPressed("Digit" + (i + 1)) || Input.wasPressed("Numpad" + (i + 1))) {
        this.applyChoice(i, player);
        return;
      }
    }
    if (Input.clicked) {
      for (let i = 0; i < this.cards.length; i++) {
        const c = this.cards[i];
        if (Input.clickX >= c.x && Input.clickX <= c.x + c.w && Input.clickY >= c.y && Input.clickY <= c.y + c.h) {
          this.applyChoice(i, player);
          return;
        }
      }
    }
  },

  drawIcon(ctx, icon, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const u = s / 2;
    switch (icon) {
      case "twin":
        for (const dx of [-u * 0.45, u * 0.45]) {
          ctx.beginPath(); ctx.arc(dx, 0, u * 0.3, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case "rapid":
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * u * 0.55 - u * 0.25, -u * 0.6);
          ctx.lineTo(i * u * 0.55 + u * 0.3, 0);
          ctx.lineTo(i * u * 0.55 - u * 0.25, u * 0.6);
          ctx.stroke();
        }
        break;
      case "bright":
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const rr = i % 2 === 0 ? u : u * 0.45;
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        break;
      case "pierce":
        ctx.beginPath(); ctx.arc(0, 0, u * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-u, 0); ctx.lineTo(u * 0.7, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(u * 0.35, -u * 0.35); ctx.lineTo(u * 0.75, 0); ctx.lineTo(u * 0.35, u * 0.35); ctx.stroke();
        break;
      case "bounce":
        ctx.beginPath();
        ctx.moveTo(-u, u * 0.6); ctx.lineTo(-u * 0.2, -u * 0.5); ctx.lineTo(u * 0.3, u * 0.4); ctx.lineTo(u, -u * 0.6);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(u, -u * 0.6, 3, 0, Math.PI * 2); ctx.fill();
        break;
      case "ember":
        ctx.beginPath();
        ctx.moveTo(0, -u);
        ctx.bezierCurveTo(u * 0.8, -u * 0.1, u * 0.55, u * 0.7, 0, u * 0.85);
        ctx.bezierCurveTo(-u * 0.55, u * 0.7, -u * 0.8, -u * 0.1, 0, -u);
        ctx.fill();
        break;
      case "frost":
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * -u, Math.sin(a) * -u);
          ctx.lineTo(Math.cos(a) * u, Math.sin(a) * u);
          ctx.stroke();
        }
        break;
      case "swift":
        for (const yy of [-u * 0.5, 0, u * 0.5]) {
          ctx.beginPath(); ctx.moveTo(-u, yy); ctx.lineTo(u * 0.4, yy); ctx.stroke();
          ctx.beginPath(); ctx.arc(u * 0.55, yy, u * 0.22, -1.2, 1.2); ctx.stroke();
        }
        break;
      case "dash":
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(-u, 0); ctx.lineTo(u * 0.5, 0); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(u * 0.2, -u * 0.4); ctx.lineTo(u, 0); ctx.lineTo(u * 0.2, u * 0.4); ctx.stroke();
        break;
      case "magnet":
        ctx.beginPath(); ctx.arc(0, -u * 0.1, u * 0.62, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-u * 0.6, -u * 0.12); ctx.lineTo(-u * 0.6, u * 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(u * 0.6, -u * 0.12); ctx.lineTo(u * 0.6, u * 0.6); ctx.stroke();
        break;
      case "heart":
        ctx.beginPath();
        ctx.moveTo(0, u * 0.8);
        ctx.bezierCurveTo(-u * 1.05, 0, -u * 0.7, -u * 0.85, 0, -u * 0.25);
        ctx.bezierCurveTo(u * 0.7, -u * 0.85, u * 1.05, 0, 0, u * 0.8);
        ctx.fill();
        break;
      case "aegis":
        ctx.beginPath();
        ctx.moveTo(0, -u);
        ctx.lineTo(u * 0.75, -u * 0.55);
        ctx.lineTo(u * 0.75, u * 0.2);
        ctx.bezierCurveTo(u * 0.7, u * 0.75, 0, u, 0, u);
        ctx.bezierCurveTo(0, u, -u * 0.7, u * 0.75, -u * 0.75, u * 0.2);
        ctx.lineTo(-u * 0.75, -u * 0.55);
        ctx.closePath(); ctx.stroke();
        break;
      case "orbit":
        ctx.beginPath(); ctx.arc(0, 0, u * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, u * 0.8, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(u * 0.8, 0, u * 0.18, 0, Math.PI * 2); ctx.fill();
        break;
      case "charm":
        ctx.beginPath();
        ctx.moveTo(-u * 0.55, -u); ctx.lineTo(u * 0.55, -u);
        ctx.lineTo(-u * 0.55, u); ctx.lineTo(u * 0.55, u);
        ctx.closePath(); ctx.stroke();
        break;
      default:
        ctx.beginPath(); ctx.arc(0, 0, u * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  wrap(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const trial = line ? line + " " + w : w;
      if (ctx.measureText(trial).width > maxWidth && line) { lines.push(line); line = w; }
      else line = trial;
    }
    if (line) lines.push(line);
    return lines;
  },

  draw(ctx, time) {
    ctx.save();
    ctx.fillStyle = "rgba(8,6,20,0.72)";
    ctx.fillRect(0, 0, CFG.width, CFG.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 40px 'Trebuchet MS', sans-serif";
    ctx.fillText("THE GARDEN PROVIDES", CFG.width / 2, 168);
    ctx.fillStyle = "#c4b5fd";
    ctx.font = "400 19px 'Trebuchet MS', sans-serif";
    ctx.fillText("Wave cleared. Choose one blessing to carry into the next.", CFG.width / 2, 202);

    const cw = 300, ch = 336, gap = 28;
    const totalW = cw * this.choices.length + gap * (this.choices.length - 1);
    const startX = (CFG.width - totalW) / 2, y = 248;
    this.cards = [];
    for (let i = 0; i < this.choices.length; i++) {
      const def = this.choices[i];
      const x = startX + i * (cw + gap);
      this.cards.push({ x, y, w: cw, h: ch });
      const hover = Input.mouseX >= x && Input.mouseX <= x + cw && Input.mouseY >= y && Input.mouseY <= y + ch;
      const bob = Math.sin(time * 2 + i * 1.3) * 3;
      ctx.save();
      ctx.translate(0, bob);
      ctx.fillStyle = hover ? "rgba(64,44,110,0.97)" : "rgba(38,28,72,0.97)";
      ctx.strokeStyle = hover ? "#facc15" : "#7c6bb0";
      ctx.lineWidth = hover ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(x, y, cw, ch, 14);
      ctx.fill(); ctx.stroke();
      const owned = this.count(def.id);
      ctx.fillStyle = "rgba(250,204,21,0.14)";
      ctx.beginPath(); ctx.arc(x + cw / 2, y + 88, 46, 0, Math.PI * 2); ctx.fill();
      this.drawIcon(ctx, def.icon, x + cw / 2, y + 88, 62, "#facc15");
      ctx.fillStyle = "#fef3c7";
      ctx.font = "700 24px 'Trebuchet MS', sans-serif";
      ctx.fillText(def.name, x + cw / 2, y + 178);
      ctx.fillStyle = "#ddd6fe";
      ctx.font = "400 17px 'Trebuchet MS', sans-serif";
      const lines = this.wrap(ctx, def.desc, cw - 44);
      lines.forEach((ln, li) => ctx.fillText(ln, x + cw / 2, y + 214 + li * 23));
      // One stack from full: the gold line replaces the owned count and
      // names the final form this pick would wake.
      if (owned === def.max - 1 && FINAL_FORMS[def.id]) {
        ctx.fillStyle = "#facc15";
        ctx.font = "700 14px 'Trebuchet MS', sans-serif";
        ctx.fillText("FINAL FORM: " + FINAL_FORMS[def.id].name, x + cw / 2, y + 268);
      }
      // Stack pips: filled for owned, hollow for remaining.
      for (let p = 0; p < def.max; p++) {
        const px = x + cw / 2 + (p - (def.max - 1) / 2) * 20;
        ctx.beginPath(); ctx.arc(px, y + 292, 6, 0, Math.PI * 2);
        if (p < owned) { ctx.fillStyle = "#facc15"; ctx.fill(); }
        else { ctx.strokeStyle = "#8b7fb8"; ctx.lineWidth = 1.6; ctx.stroke(); }
      }
      if (owned > 0 && owned !== def.max - 1) {
        ctx.fillStyle = "#a5b4fc";
        ctx.font = "400 14px 'Trebuchet MS', sans-serif";
        ctx.fillText("owned x" + owned, x + cw / 2, y + 268);
      }
      ctx.fillStyle = hover ? "#facc15" : "#8b7fb8";
      ctx.font = "700 16px 'Trebuchet MS', sans-serif";
      ctx.fillText("press " + (i + 1) + " or click", x + cw / 2, y + ch - 14);
      ctx.restore();
    }
    ctx.restore();
  },
};

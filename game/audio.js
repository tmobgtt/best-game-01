// audio.js — all sound is synthesized WebAudio: per-tower shots, hits,
// coins, horns, and a small adaptive score whose layers thicken with the
// number of foes on the road. No audio assets.
"use strict";

AK.Audio = {
  ctx: null, master: null, muted: false, musicOn: false, nextNote: 0, step: 0,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
  tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, freq, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t0);
  },
  shoot(kind) {
    if (kind === "bolt") this.tone(880, 0.07, "square", 0.05, 320);
    else if (kind === "mortar") this.tone(160, 0.16, "sine", 0.12, 60);
    else if (kind === "frost") this.tone(1250, 0.1, "sine", 0.05, 1900);
    else if (kind === "storm") { this.noise(0.08, 0.07, 3800); this.tone(190, 0.06, "sawtooth", 0.04, 90); }
    else if (kind === "venom") this.tone(420, 0.09, "triangle", 0.06, 180);
    else if (kind === "lance") this.tone(240, 0.2, "sawtooth", 0.08, 1400);
  },
  hit() { this.noise(0.04, 0.035, 2200); },
  coin() { this.tone(1320, 0.06, "sine", 0.045); this.tone(1760, 0.09, "sine", 0.04, null, 0.05); },
  place() { this.tone(220, 0.12, "triangle", 0.12, 330); this.noise(0.08, 0.05, 700); },
  upgrade() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.07, null, i * 0.06)); },
  ascend() { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.08, null, i * 0.07)); },
  sell() { this.tone(660, 0.1, "sine", 0.06, 330); },
  horn() { this.tone(196, 0.4, "sawtooth", 0.09, 196); this.tone(294, 0.4, "sawtooth", 0.07, 294, 0.02); },
  bossAlarm() { for (let i = 0; i < 3; i++) this.tone(146, 0.22, "square", 0.1, 110, i * 0.26); },
  leak() { this.tone(320, 0.25, "sawtooth", 0.1, 70); this.noise(0.2, 0.08, 500); },
  meteor() { this.noise(0.5, 0.22, 300); this.tone(90, 0.5, "sine", 0.2, 34); },
  blizzard() { this.noise(0.7, 0.1, 5200); this.tone(1560, 0.6, "sine", 0.05, 2400); },
  freeze() { this.tone(1800, 0.14, "sine", 0.05, 900); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.34, "triangle", 0.09, null, i * 0.11)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, "triangle", 0.09, null, i * 0.15)); },
  click() { this.tone(740, 0.05, "sine", 0.05); },
  denied() { this.tone(180, 0.12, "square", 0.06, 140); },
  // Adaptive score: a slow minor arpeggio + bass; extra layers join as the
  // road fills. Called every frame with the current threat 0..1.
  music(threat) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now < this.nextNote) return;
    this.nextNote = now + 0.21;
    const scale = [0, 3, 5, 7, 10, 12, 15, 12, 7, 5];
    const root = 110; // A2
    const s = this.step++;
    const semi = scale[s % scale.length];
    const f = root * Math.pow(2, semi / 12) * 2;
    this.tone(f, 0.19, "triangle", 0.028 + threat * 0.02);
    if (s % 4 === 0) this.tone(root / 2, 0.8, "sine", 0.06);
    if (threat > 0.35 && s % 2 === 0) this.tone(f * 1.5, 0.12, "sine", 0.02);
    if (threat > 0.7) this.noise(0.05, 0.012, 6000);
  },
};

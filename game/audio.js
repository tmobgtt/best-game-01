// audio.js — all sound is synthesized live with WebAudio: no audio files,
// no downloads. One-shot voices are built from oscillators and filtered
// noise; the music is a small lookahead scheduler playing a minor-key
// garden loop whose layers thicken as the danger (intensity) rises.

const Sound = {
  ctx: null,
  master: null,
  musicBus: null,
  muted: false,
  intensity: 0,          // 0 calm title .. 1 boss enrage, set by main.js
  step: 0,
  nextStepTime: 0,
  musicTimer: null,

  // Must be called from a user gesture at least once.
  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 6;
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(comp);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.master);
      this.nextStepTime = this.ctx.currentTime + 0.1;
      this.musicTimer = setInterval(() => this.scheduleMusic(), 90);
    } catch (e) { /* a silent game is better than a crashed one */ }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  },

  midi(m) { return 440 * Math.pow(2, (m - 69) / 12); },

  tone(freq, freqEnd, dur, type, gain, dest, delay) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },

  noise(dur, cutoff, gain, delay, q) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = cutoff; f.Q.value = q || 0.8;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  },

  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case "shoot":  this.tone(rand(880, 990), 320, 0.07, "square", 0.045); break;
      case "hit":    this.tone(rand(300, 360), 140, 0.05, "triangle", 0.07); break;
      case "clank":  this.tone(rand(1200, 1500), 900, 0.06, "square", 0.05); this.noise(0.04, 4000, 0.03); break;
      case "kill":   this.noise(0.16, 900, 0.13); this.tone(520, 60, 0.16, "sawtooth", 0.06); break;
      case "eliteKill": this.noise(0.3, 700, 0.18); this.tone(392, 0, 0.28, "triangle", 0.12); this.tone(587, 0, 0.3, "triangle", 0.1, null, 0.05); break;
      case "hurt":   this.tone(220, 55, 0.28, "sawtooth", 0.16); this.noise(0.2, 500, 0.12); break;
      case "dash":   this.noise(0.14, 1800, 0.07); break;
      case "shard":  this.tone(1318, 0, 0.09, "sine", 0.09); this.tone(1760, 0, 0.12, "sine", 0.07, null, 0.05); break;
      case "heal":   this.tone(523, 0, 0.12, "sine", 0.09); this.tone(784, 0, 0.16, "sine", 0.09, null, 0.08); break;
      case "shieldUp": this.tone(660, 990, 0.14, "triangle", 0.09); break;
      case "shieldBreak": this.noise(0.18, 2600, 0.12); this.tone(880, 220, 0.15, "square", 0.07); break;
      case "spit":   this.tone(300, 90, 0.12, "sine", 0.08); break;
      case "charge": this.tone(180, 420, 0.22, "sawtooth", 0.05); break;
      case "draft":  [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0, 0.16, "triangle", 0.1, null, i * 0.07)); break;
      case "pick":   this.tone(784, 0, 0.1, "triangle", 0.1); this.tone(1175, 0, 0.14, "triangle", 0.09, null, 0.06); break;
      case "waveClear": [392, 523, 659].forEach((f, i) => this.tone(f, 0, 0.18, "triangle", 0.09, null, i * 0.08)); break;
      case "bossRoar": this.tone(98, 49, 0.7, "sawtooth", 0.2); this.noise(0.6, 300, 0.14); this.tone(147, 73, 0.7, "square", 0.08, null, 0.05); break;
      case "bossDie": this.noise(0.7, 500, 0.22); [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone(f, 0, 0.3, "triangle", 0.1, null, i * 0.06)); break;
      case "gameOver": [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0, 0.34, "triangle", 0.11, null, i * 0.17)); break;
      case "ui":     this.tone(700, 0, 0.05, "triangle", 0.06); break;
    }
  },

  // --- adaptive music ---------------------------------------------------
  // Progression Am - F - C - G, one chord per bar, eighth-note steps.
  CHORDS: [
    { root: 33, notes: [57, 60, 64] },   // A minor
    { root: 29, notes: [53, 57, 60] },   // F
    { root: 36, notes: [55, 60, 64] },   // C with G colour
    { root: 31, notes: [55, 59, 62] },   // G
  ],

  scheduleMusic() {
    if (!this.ctx) return;
    const stepDur = 60 / 116 / 2;        // 116 BPM eighth notes
    while (this.nextStepTime < this.ctx.currentTime + 0.28) {
      this.playStep(this.step, this.nextStepTime);
      this.step++;
      this.nextStepTime += stepDur;
    }
  },

  playStep(step, t0) {
    const delay = Math.max(0, t0 - this.ctx.currentTime);
    const bar = Math.floor(step / 8) % 4;
    const chord = this.CHORDS[bar];
    const inBar = step % 8;
    const inten = this.intensity;
    // Bass pulse: every step at high intensity, half notes when calm.
    if (inten > 0.55 || inBar % 2 === 0) {
      this.tone(this.midi(chord.root + 12), 0, 0.16, "triangle", 0.11, this.musicBus, delay);
    }
    // Arpeggio: sparse when calm, full eighth pattern in a fight.
    if (inten > 0.2 && (inten > 0.6 || inBar % 2 === 1)) {
      const seq = [0, 1, 2, 1, 0, 2, 1, 2];
      const note = chord.notes[seq[inBar]] + 12;
      this.tone(this.midi(note), 0, 0.14, "sine", 0.045 + inten * 0.03, this.musicBus, delay);
    }
    // Pad: the whole chord at the top of each bar, quiet and slow.
    if (inBar === 0) {
      for (const n of chord.notes) {
        this.tone(this.midi(n), 0, 1.6, "triangle", 0.016, this.musicBus, delay);
      }
    }
    // Hat ticks once the fight is real.
    if (inten > 0.45 && inBar % 2 === 0) {
      this.noise(0.03, 7000, 0.012);
    }
  },
};

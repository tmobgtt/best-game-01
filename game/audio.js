// Mothlight audio: every sound is synthesized with WebAudio — no audio files.
// A small engine owns the context, a master gain, a shared noise buffer and a
// quiet procedural music loop (soft pads and pentatonic plucks in A minor).

const MUSIC_ROOT = 110; // A2
const PENTA = [0, 3, 5, 7, 10, 12, 15, 19, 22, 24];
const CHORDS = [
  [0, 7, 12, 16], // A minor add9 colour
  [-4, 3, 8, 15], // F major colour
  [-9, -2, 5, 12], // C major colour
  [-2, 5, 10, 17], // G major colour
];

export function createAudioEngine() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let noiseBuffer = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  let nextNoteTime = 0;

  function unlock() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.6;
    musicGain.connect(master);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    nextNoteTime = ctx.currentTime + 0.1;
  }

  function setMuted(value) {
    muted = value;
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
  }

  function tone({ freq = 440, freqEnd = null, type = "sine", dur = 0.15, vol = 0.2, attack = 0.004, dest = null, delay = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(dest || master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.12, vol = 0.2, freq = 1200, q = 0.8, delay = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + dur + 0.05);
  }

  function shoot() {
    tone({ freq: 840 + Math.random() * 160, freqEnd: 340, type: "square", dur: 0.07, vol: 0.055 });
  }

  function enemyHit() {
    noise({ dur: 0.05, vol: 0.07, freq: 2400, q: 1.4 });
  }

  function mothPop() {
    tone({ freq: 620, freqEnd: 130, type: "sine", dur: 0.13, vol: 0.16 });
    noise({ dur: 0.08, vol: 0.06, freq: 900, q: 0.7 });
  }

  function beetleCrack() {
    noise({ dur: 0.2, vol: 0.22, freq: 480, q: 0.6 });
    tone({ freq: 190, freqEnd: 55, type: "triangle", dur: 0.24, vol: 0.24 });
  }

  function spitterPop() {
    tone({ freq: 340, freqEnd: 90, type: "sawtooth", dur: 0.16, vol: 0.12 });
    noise({ dur: 0.1, vol: 0.08, freq: 1500, q: 1 });
  }

  function orbFire() {
    tone({ freq: 220, freqEnd: 420, type: "sine", dur: 0.14, vol: 0.07 });
  }

  function playerHurt() {
    tone({ freq: 300, freqEnd: 70, type: "sawtooth", dur: 0.3, vol: 0.22 });
    noise({ dur: 0.22, vol: 0.16, freq: 700, q: 0.6 });
  }

  function dash() {
    noise({ dur: 0.16, vol: 0.1, freq: 2600, q: 0.5 });
    tone({ freq: 500, freqEnd: 980, type: "sine", dur: 0.12, vol: 0.05 });
  }

  function pickup() {
    const base = 660;
    [0, 4, 7, 12].forEach((step, i) => {
      tone({ freq: base * Math.pow(2, step / 12), type: "triangle", dur: 0.16, vol: 0.12, delay: i * 0.045 });
    });
  }

  function comboUp(tier) {
    const base = 520 * Math.pow(2, Math.min(tier, 7) / 12);
    tone({ freq: base, type: "triangle", dur: 0.1, vol: 0.13 });
    tone({ freq: base * 1.5, type: "triangle", dur: 0.16, vol: 0.13, delay: 0.06 });
  }

  function waveHorn() {
    tone({ freq: 196, type: "triangle", dur: 0.5, vol: 0.14, attack: 0.05 });
    tone({ freq: 294, type: "triangle", dur: 0.55, vol: 0.12, attack: 0.05, delay: 0.08 });
  }

  function heartGain() {
    [523, 659, 784].forEach((f, i) => tone({ freq: f, type: "sine", dur: 0.22, vol: 0.11, delay: i * 0.07 }));
  }

  function gameOver() {
    [392, 330, 262, 196].forEach((f, i) => {
      tone({ freq: f, type: "triangle", dur: 0.42, vol: 0.16, attack: 0.02, delay: i * 0.19 });
    });
    noise({ dur: 0.7, vol: 0.05, freq: 300, q: 0.4, delay: 0.1 });
  }

  function uiClick() {
    tone({ freq: 740, freqEnd: 990, type: "sine", dur: 0.06, vol: 0.09 });
  }

  function padChord(semiOffsets, when) {
    if (!ctx) return;
    for (const semi of semiOffsets) {
      const freq = MUSIC_ROOT * Math.pow(2, semi / 12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(0.028, when + 0.6);
      gain.gain.setValueAtTime(0.028, when + 2.6);
      gain.gain.linearRampToValueAtTime(0, when + 3.4);
      osc.connect(gain).connect(musicGain);
      osc.start(when);
      osc.stop(when + 3.5);
    }
  }

  function pluck(semi, when) {
    if (!ctx) return;
    const freq = MUSIC_ROOT * 2 * Math.pow(2, semi / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
    osc.connect(gain).connect(musicGain);
    osc.start(when);
    osc.stop(when + 0.75);
  }

  function updateMusic(dt, playing) {
    if (!ctx || muted) return;
    if (nextNoteTime < ctx.currentTime - 0.25) {
      // the scheduler fell behind (muted, suspended or a long frame): resync
      nextNoteTime = ctx.currentTime + 0.06;
    }
    musicTimer -= dt;
    if (musicTimer > 0) return;
    musicTimer = 0.05;
    while (nextNoteTime < ctx.currentTime + 0.18) {
      const step = musicStep;
      if (step % 8 === 0) padChord(CHORDS[(step / 8) % CHORDS.length], nextNoteTime);
      if (playing && step % 2 === 0 && Math.random() < 0.55) {
        pluck(PENTA[Math.floor(Math.random() * PENTA.length)], nextNoteTime);
      }
      nextNoteTime += 0.42;
      musicStep++;
    }
  }

  return {
    unlock,
    setMuted,
    isMuted: () => muted,
    shoot,
    enemyHit,
    mothPop,
    beetleCrack,
    spitterPop,
    orbFire,
    playerHurt,
    dash,
    pickup,
    comboUp,
    waveHorn,
    heartGain,
    gameOver,
    uiClick,
    updateMusic,
  };
}

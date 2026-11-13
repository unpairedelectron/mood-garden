// Fully synthesised audio: an adaptive score that gains one instrument for
// every grove awakened, plus wind, sea, rain, birdsong, crickets and SFX.
// Nothing is loaded from disk – every sound is built with Web Audio nodes.

import type { MoodId } from './moods';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// D major: D – Bm7 – Gmaj7 – Asus
const CHORDS = [
  [50, 57, 62, 66, 69],
  [47, 54, 59, 62, 66],
  [43, 50, 55, 59, 66],
  [45, 52, 57, 62, 64],
];
const PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86];
const FLUTE = [
  [[0, 81, 3], [4, 78, 2], [6, 76, 2]],
  [[0, 78, 4], [5, 74, 3]],
  [[1, 79, 2], [3, 78, 2], [5, 74, 3]],
  [[0, 76, 3], [4, 81, 4]],
];
const CELLO = [54, 50, 47, 52];
const BEAT = 60 / 66;
const STEP = BEAT / 2;

type Layer = MoodId | 'pad';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private layers = {} as Record<Layer, GainNode>;
  private layerTarget: Record<Layer, number> = { pad: 1, joy: 0, calm: 0, love: 0, hope: 0, courage: 0, sorrow: 0 };
  private noise!: AudioBuffer;
  private wind!: { gain: GainNode; filter: BiquadFilterNode };
  private sea!: GainNode;
  private rain!: GainNode;
  private nextStep = 0;
  private step = 0;
  private timer = 0;
  private volMaster = 0.8;
  private volMusic = 0.8;
  private chirpIn = 2;
  private cricketIn = 1;
  private collectIdx = 0;
  private collectAt = 0;
  private intensity = 0;

  get ready() {
    return !!this.ctx;
  }

  /** Must be called from a user gesture. */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.volMaster;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.volMusic * 0.9;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);

    // Noise source shared by wind, sea, rain and footsteps.
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < nd.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.04 * w) / 1.04;
      nd[i] = w * 0.5 + last * 6;
    }
    // Algorithmic hall: decaying stereo noise as the impulse response.
    const len = Math.floor(ctx.sampleRate * 3.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.reverb.connect(wet).connect(this.musicBus);

    (Object.keys(this.layerTarget) as Layer[]).forEach((k) => {
      const g = ctx.createGain();
      g.gain.value = k === 'pad' ? 1 : 0;
      g.connect(this.musicBus);
      g.connect(this.reverb);
      this.layers[k] = g;
    });

    const loop = (filterType: BiquadFilterType, freq: number, q: number) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.master);
      src.start(0, Math.random() * 2);
      return { gain, filter };
    };
    this.wind = loop('bandpass', 420, 0.5);
    this.sea = loop('lowpass', 520, 0.3).gain;
    this.rain = loop('highpass', 2400, 0.4).gain;

    this.nextStep = ctx.currentTime + 0.3;
    this.timer = window.setInterval(() => this.schedule(), 90);
  }

  setVolumes(master: number, music: number) {
    this.volMaster = master;
    this.volMusic = music;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(master, this.ctx.currentTime, 0.1);
    this.musicBus.gain.setTargetAtTime(music * 0.9, this.ctx.currentTime, 0.1);
  }

  /** Which instruments are playing: one per awakened grove. */
  setAwakened(ids: MoodId[], instant = false) {
    (Object.keys(this.layerTarget) as Layer[]).forEach((k) => {
      if (k === 'pad') return;
      this.layerTarget[k] = ids.includes(k) ? 1 : 0;
      if (this.ctx) this.layers[k].gain.setTargetAtTime(this.layerTarget[k], this.ctx.currentTime, instant ? 0.3 : 2.5);
    });
    this.intensity = ids.length / 6;
  }

  suspend(on: boolean) {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? this.volMaster * 0.25 : this.volMaster, this.ctx.currentTime, 0.2);
  }

  // ----------------------------------------------------------------- voices
  private tone(
    out: AudioNode,
    type: OscillatorType,
    freq: number,
    t: number,
    dur: number,
    vol: number,
    attack = 0.01,
    release = 0.3,
    opts: { detune?: number; lp?: number; vibrato?: number; glide?: number } = {},
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.glide) o.frequency.exponentialRampToValueAtTime(opts.glide, t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setTargetAtTime(0, t + Math.max(attack, dur), release / 3);
    let node: AudioNode = o;
    if (opts.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lp;
      node = o.connect(f);
    }
    if (opts.vibrato) {
      const l = ctx.createOscillator();
      l.frequency.value = 5.2;
      const lg = ctx.createGain();
      lg.gain.value = opts.vibrato;
      l.connect(lg).connect(o.frequency);
      l.start(t);
      l.stop(t + dur + release * 2);
    }
    node.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + release * 2 + 0.1);
  }

  private noiseHit(out: AudioNode, t: number, dur: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.05);
  }

  private bell(out: AudioNode, midi: number, t: number, vol: number, len = 2.2) {
    const f = mtof(midi);
    this.tone(out, 'sine', f, t, 0.02, vol, 0.004, len);
    this.tone(out, 'sine', f * 2.76, t, 0.02, vol * 0.25, 0.004, len * 0.4);
    this.tone(out, 'sine', f * 5.4, t, 0.01, vol * 0.08, 0.002, len * 0.15);
  }

  // -------------------------------------------------------------- sequencer
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.nextStep < ctx.currentTime - 0.5) this.nextStep = ctx.currentTime + 0.05;
    while (this.nextStep < ctx.currentTime + 0.35) {
      this.playStep(this.step, this.nextStep);
      this.step++;
      this.nextStep += STEP;
    }
  }

  private playStep(step: number, t: number) {
    const s = step % 8;
    const bar = Math.floor(step / 8);
    const chord = CHORDS[bar % 4];
    const L = this.layers;
    const on = (k: Layer) => this.layerTarget[k] > 0.5;
    const barLen = BEAT * 4;

    if (s === 0) {
      // Pad: always present, a bare drone in the Quiet that fills out with life.
      const voices = this.intensity > 0 ? chord : [chord[0], chord[1]];
      const v = 0.035 + this.intensity * 0.02;
      for (const n of voices) {
        this.tone(L.pad, 'sine', mtof(n), t, barLen * 0.9, v, 1.6, 2.6);
        this.tone(L.pad, 'triangle', mtof(n), t, barLen * 0.9, v * 0.5, 1.9, 2.6, { detune: 7, lp: 900 });
      }
      if (on('love')) {
        for (const n of [chord[2] + 12, chord[3] + 12]) {
          this.tone(L.love, 'sawtooth', mtof(n), t, barLen * 0.92, 0.022, 1.1, 2.2, { lp: 1300, detune: -6, vibrato: 2 });
          this.tone(L.love, 'sawtooth', mtof(n), t, barLen * 0.92, 0.022, 1.3, 2.2, { lp: 1300, detune: 8 });
        }
      }
      if (on('sorrow')) {
        this.tone(L.sorrow, 'sawtooth', mtof(CELLO[bar % 4]), t + 0.1, barLen * 0.85, 0.06, 0.7, 1.8, { lp: 520, vibrato: 2.5 });
      }
      if (on('courage')) this.tone(L.courage, 'triangle', mtof(chord[0] - 12), t, barLen * 0.8, 0.09, 0.05, 1.2, { lp: 300 });
      if (on('hope') && bar % 2 === 0) {
        for (const [st, n, len] of FLUTE[(bar >> 1) % 4]) {
          const tt = t + st * STEP;
          this.tone(L.hope, 'sine', mtof(n), tt, len * STEP * 0.85, 0.05, 0.09, 0.5, { vibrato: 5 });
          this.noiseHit(L.hope, tt, 0.12, 0.012, 'bandpass', mtof(n) * 2, mtof(n) * 2, 4);
        }
      }
    }
    if (on('joy')) {
      const arp = [0, 2, 4, 2, 3, 4, 2, 1];
      const n = chord[arp[(s + bar * 3) % 8]] + 12;
      this.tone(L.joy, 'triangle', mtof(n), t, 0.03, 0.05, 0.004, 0.55);
      if (s % 4 === 2) this.tone(L.joy, 'sine', mtof(n + 12), t + STEP * 0.5, 0.02, 0.02, 0.004, 0.4);
    }
    if (on('calm') && (s === 0 || s === 5) && (bar + s) % 3 !== 2) {
      const n = chord[2 + ((bar + s) % 3)] + 24;
      this.bell(L.calm, n, t, 0.045, 3);
    }
    if (on('courage') && (s === 0 || s === 3 || s === 6)) {
      this.tone(L.courage, 'sine', 95, t, 0.16, s === 0 ? 0.3 : 0.17, 0.004, 0.25, { glide: 42 });
      this.noiseHit(L.courage, t, 0.05, 0.03, 'lowpass', 500);
    }
  }

  // --------------------------------------------------------------- ambience
  /** Per-frame world state -> ambience levels. */
  update(dt: number, w: { day: number; vitality: number; shore: number; rain: number; speed: number; gliding: boolean; life: number }) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const gust = 0.5 + 0.5 * Math.sin(t * 0.23) * Math.sin(t * 0.071 + 1.3);
    const windLvl = 0.035 + gust * 0.03 + (1 - w.life) * 0.03 + (w.gliding ? 0.09 : 0) + Math.min(w.speed, 10) * 0.002;
    this.wind.gain.gain.setTargetAtTime(windLvl, t, 0.4);
    this.wind.filter.frequency.setTargetAtTime(340 + gust * 380 + (w.gliding ? 500 : 0), t, 0.5);
    const lap = 0.6 + 0.4 * Math.sin(t * 0.75);
    this.sea.gain.setTargetAtTime(w.shore * 0.14 * lap, t, 0.3);
    this.rain.gain.setTargetAtTime(w.rain * 0.05, t, 0.6);

    // Birdsong returns with the colour.
    this.chirpIn -= dt;
    if (this.chirpIn <= 0) {
      this.chirpIn = 1.2 + Math.random() * 5;
      if (w.day > 0.4 && w.vitality > 0.45 && w.rain < 0.3) this.chirp(t);
    }
    this.cricketIn -= dt;
    if (this.cricketIn <= 0) {
      this.cricketIn = 0.5 + Math.random() * 0.9;
      if (w.day < 0.25 && w.vitality > 0.3) {
        const f = 3900 + Math.random() * 600;
        for (let i = 0; i < 4; i++) this.tone(this.sfxBus, 'sine', f, t + i * 0.055, 0.025, 0.006, 0.005, 0.03);
      }
    }
  }

  private chirp(t: number) {
    const base = 2400 + Math.random() * 1800;
    const n = 2 + Math.floor(Math.random() * 4);
    const out = this.reverb;
    for (let i = 0; i < n; i++) {
      const tt = t + i * (0.09 + Math.random() * 0.06);
      const f = base * (1 + (Math.random() - 0.5) * 0.25);
      this.tone(out, 'sine', f, tt, 0.06, 0.03, 0.008, 0.05, { glide: f * (Math.random() < 0.5 ? 1.35 : 0.75) });
    }
  }

  // -------------------------------------------------------------------- sfx
  footstep(surface: 'grass' | 'sand' | 'stone' | 'water', run: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = (run ? 0.085 : 0.055) * (0.8 + Math.random() * 0.4);
    if (surface === 'water') {
      this.noiseHit(this.sfxBus, t, 0.26, v * 1.5, 'bandpass', 900 + Math.random() * 300, 380, 0.9);
    } else if (surface === 'sand') {
      this.noiseHit(this.sfxBus, t, 0.12, v, 'bandpass', 700 + Math.random() * 200, 500, 0.7);
    } else if (surface === 'stone') {
      this.noiseHit(this.sfxBus, t, 0.05, v * 1.2, 'bandpass', 1500 + Math.random() * 400, 900, 2);
      this.tone(this.sfxBus, 'sine', 140, t, 0.03, v * 0.7, 0.003, 0.06, { glide: 70 });
    } else {
      this.noiseHit(this.sfxBus, t, 0.11, v, 'bandpass', 2300 + Math.random() * 900, 1300, 0.8);
      this.tone(this.sfxBus, 'sine', 110, t, 0.03, v * 0.5, 0.003, 0.06, { glide: 60 });
    }
  }
  jump() {
    if (!this.ctx) return;
    this.noiseHit(this.sfxBus, this.ctx.currentTime, 0.24, 0.06, 'bandpass', 500, 1700, 1.2);
  }
  land(strength: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfxBus, 'sine', 120, t, 0.06, 0.1 + strength * 0.25, 0.003, 0.12, { glide: 45 });
    this.noiseHit(this.sfxBus, t, 0.16, 0.05 + strength * 0.08, 'lowpass', 1400, 300);
  }
  /** Each mote in quick succession climbs the scale. */
  collect() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.collectAt > 9) this.collectIdx = 0;
    this.collectAt = t;
    const n = PENTA[Math.min(PENTA.length - 1, this.collectIdx++ + 2)];
    this.bell(this.reverb, n, t, 0.16, 2.2);
    this.bell(this.sfxBus, n, t, 0.08, 1.2);
    this.bell(this.reverb, n + 7, t + 0.09, 0.07, 1.8);
    this.noiseHit(this.reverb, t, 0.5, 0.02, 'highpass', 6000);
  }
  deliver(i: number) {
    if (!this.ctx) return;
    this.bell(this.reverb, PENTA[Math.min(PENTA.length - 1, i + 3)] + 12, this.ctx.currentTime, 0.12, 2.5);
  }
  /** The swell when a grove wakes: a rising chord, shimmer and sub. */
  awaken(finale = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this.reverb;
    const notes = finale ? [38, 50, 57, 62, 66, 69, 74, 78, 81] : [38, 50, 57, 62, 66, 69, 74];
    notes.forEach((n, i) => {
      this.tone(out, 'sawtooth', mtof(n), t + i * 0.35, 6.5 - i * 0.2, 0.035, 2.6, 3.5, { lp: 1600, detune: i % 2 ? 6 : -6 });
      this.tone(out, 'sine', mtof(n), t + i * 0.35, 6.5, 0.05, 2.2, 3.5);
    });
    this.tone(this.sfxBus, 'sine', 55, t, 6, 0.2, 2.5, 2.5, { glide: 73.4 });
    for (let i = 0; i < (finale ? 32 : 20); i++) {
      this.bell(out, PENTA[(i * 3) % PENTA.length] + 12, t + 1.6 + i * 0.26 + Math.random() * 0.08, 0.05, 2.4);
    }
    this.noiseHit(out, t + 0.2, 5.5, 0.05, 'bandpass', 300, 5200, 0.7);
  }
  plantFeeling() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 2, 3, 5, 7].forEach((k, i) => this.bell(this.reverb, PENTA[k], t + i * 0.11, 0.09, 2.4));
  }
  ui(kind: 'hover' | 'click' | 'open' | 'close') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'hover') this.tone(this.sfxBus, 'sine', 1320, t, 0.01, 0.02, 0.002, 0.07);
    else if (kind === 'click') this.bell(this.sfxBus, 86, t, 0.06, 0.5);
    else if (kind === 'open') this.noiseHit(this.sfxBus, t, 0.2, 0.03, 'bandpass', 800, 2600, 1.5);
    else this.noiseHit(this.sfxBus, t, 0.18, 0.03, 'bandpass', 2400, 700, 1.5);
  }
  touchHeart() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [50, 57, 62, 69, 74, 81].forEach((n, i) => this.bell(this.reverb, n, t + i * 0.22, 0.12, 3.5));
    this.tone(this.reverb, 'sine', 73.4, t, 4, 0.15, 1.2, 2.5);
  }

  dispose() {
    window.clearInterval(this.timer);
    void this.ctx?.close();
    this.ctx = null;
  }
}

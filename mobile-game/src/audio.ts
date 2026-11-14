// Sound for the grove.
//
// Built to be carried by recordings: ambient beds for each time of day, wind in
// the canopy, rain on leaves, the stream, birdsong by species and hour,
// footsteps by surface and a composed score in stems (see samples.ts and
// public/assets/audio/README.md). Whatever is not installed is synthesised
// here instead, so the game always has a full soundscape: an adaptive score
// that gains an instrument for each feeling grown, positional songbirds, a
// dawn chorus and a night owl, rain ticking on leaves, a babbling stream and
// footsteps that know what you are walking on.

import type { MoodId } from './moods';
import { Samples, type BedId, type Surface } from './samples';

export interface Ambience {
  hour: number;
  day: number;
  dawn: number;
  dusk: number;
  vitality: number;
  rain: number;
  snow: number;
  wind: number;
  /** 0..1 how close the stream is; pond likewise. */
  stream: number;
  pond: number;
  /** 0..1 how much canopy is overhead and around. */
  canopy: number;
  speed: number;
  life: number;
  season: string;
}

type Song = 'robin' | 'bluetit' | 'goldfinch' | 'blackbird' | 'woodpigeon' | 'owl';

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
  samples: Samples | null = null;
  private beds = new Map<BedId, { gain: GainNode; src: AudioBufferSourceNode | null }>();
  private stemsOn = false;
  private canopy!: { gain: GainNode; filter: BiquadFilterNode };
  private brook: { gain: GainNode; bands: BiquadFilterNode[] } | null = null;
  private pondLap!: GainNode;
  private dripIn = 0;
  private owlIn = 30;

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

    // Leaves rustling overhead: a bright hiss that swells with the gusts.
    this.canopy = loop('highpass', 2600, 0.6);
    this.pondLap = loop('lowpass', 380, 0.5).gain;
    // The stream: bands of noise whose centres wander, which the ear hears as babbling water.
    {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const bands = [480, 1150, 2300, 3900].map((f) => {
        const b = ctx.createBiquadFilter();
        b.type = 'bandpass';
        b.frequency.value = f;
        b.Q.value = 6;
        src.connect(b).connect(gain);
        return b;
      });
      gain.connect(this.master);
      src.start(0, Math.random() * 2);
      this.brook = { gain, bands };
    }

    this.nextStep = ctx.currentTime + 0.3;
    this.timer = window.setInterval(() => this.schedule(), 90);

    // Recordings, where installed, take over from the synthesis.
    this.samples = new Samples(ctx);
    void this.samples.load().then(() => this.startRecordings());
  }

  /** Start looping beds and score stems that are installed. */
  private async startRecordings() {
    const ctx = this.ctx!;
    const sm = this.samples!;
    const m = sm.manifest;
    for (const [id, files] of Object.entries(m.beds ?? {}) as [BedId, string[]][]) {
      if (!files?.length) continue;
      const buf = await sm.prime(files[Math.floor(Math.random() * files.length)]);
      if (!buf) continue;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(gain).connect(this.master);
      src.start(0, Math.random() * buf.duration);
      this.beds.set(id, { gain, src });
    }
    for (const files of Object.values(m.steps ?? {})) files?.forEach((f) => void sm.prime(f));
    // Score stems all start together so they stay in time.
    const stems = Object.entries(m.score?.stems ?? {}) as [keyof typeof this.layers, string][];
    if (stems.length) {
      const bufs = await Promise.all(stems.map(([, f]) => sm.prime(f)));
      if (bufs.every(Boolean)) {
        const at = ctx.currentTime + 0.2;
        stems.forEach(([layer, ], i) => {
          const src = ctx.createBufferSource();
          src.buffer = bufs[i]!;
          src.loop = true;
          const g = ctx.createGain();
          g.gain.value = m.score?.gain ?? 0.8;
          src.connect(g).connect(this.layers[layer]);
          src.start(at);
        });
        this.stemsOn = true;
      }
    }
  }

  /** Where the listener is, so birds and water sound from where they are. */
  listen(pos: { x: number; y: number; z: number }, fwd: { x: number; y: number; z: number }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const l = ctx.listener;
    const t = ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(pos.x, t, 0.05);
      l.positionY.setTargetAtTime(pos.y, t, 0.05);
      l.positionZ.setTargetAtTime(pos.z, t, 0.05);
      l.forwardX.setTargetAtTime(fwd.x, t, 0.05);
      l.forwardY.setTargetAtTime(fwd.y, t, 0.05);
      l.forwardZ.setTargetAtTime(fwd.z, t, 0.05);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      (l as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(pos.x, pos.y, pos.z);
      (l as unknown as { setOrientation: (...a: number[]) => void }).setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }

  /** A sound source out in the world. */
  private at(x: number, y: number, z: number, gain = 1): AudioNode {
    const ctx = this.ctx!;
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 4;
    p.rolloffFactor = 1.1;
    p.maxDistance = 120;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    } else (p as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(x, y, z);
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(p);
    p.connect(this.sfxBus);
    // A touch of the hall so distant birds sit in the space.
    const send = ctx.createGain();
    send.gain.value = 0.12;
    p.connect(send).connect(this.reverb);
    window.setTimeout(() => {
      g.disconnect();
      p.disconnect();
      send.disconnect();
    }, 6000);
    return g;
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

  /** Backgrounded: stop the audio clock entirely (saves battery); resume on return. */
  suspend(on: boolean) {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
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
    // A composed score, when installed, plays instead.
    if (this.stemsOn) return;
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
  private bedLevel(id: BedId, level: number, t: number, tc = 1.2) {
    const b = this.beds.get(id);
    if (b) b.gain.gain.setTargetAtTime(level, t, tc);
    return !!b;
  }

  /** Per-frame world state -> ambience levels. */
  update(dt: number, w: Ambience) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const gust = 0.5 + 0.5 * Math.sin(t * 0.23) * Math.sin(t * 0.071 + 1.3);
    const windAmt = 0.25 + w.wind * 0.9;
    const night = 1 - w.day;

    // Recorded beds by time of day, crossfaded; synthesis fills any gaps.
    const tod = { dawn: w.dawn, dusk: w.dusk, night: night * (1 - w.dusk), day: w.day * (1 - w.dawn) * (1 - w.dusk) };
    const dry = 1 - w.rain * 0.6;
    for (const [id, v] of Object.entries(tod) as [BedId, number][]) this.bedLevel(id, v * 0.7 * dry, t, 3);
    const hasWindBed = this.bedLevel('wind_canopy', (0.15 + gust * 0.5) * windAmt * (0.4 + w.canopy * 0.6), t, 0.8);
    const hasRain = this.bedLevel('rain_light', w.rain * (1 - w.canopy * 0.5) * 0.7, t, 2);
    const hasRainLeaves = this.bedLevel('rain_leaves', w.rain * w.canopy * 0.9, t, 1.5);
    const hasStream = this.bedLevel('stream', w.stream * 0.9, t, 0.5);
    const hasPond = this.bedLevel('pond', w.pond * 0.6, t, 0.8);
    this.bedLevel('snow', w.snow * 0.5, t, 3);

    // Synthesised wind, canopy rustle, rain, stream and pond where no recording is installed.
    const windLvl = hasWindBed ? 0.01 : (0.03 + gust * 0.035) * windAmt + (1 - w.life) * 0.02 + Math.min(w.speed, 10) * 0.002;
    this.wind.gain.gain.setTargetAtTime(windLvl, t, 0.4);
    this.wind.filter.frequency.setTargetAtTime(300 + gust * 420 * windAmt, t, 0.5);
    const rustle = hasWindBed ? 0 : w.canopy * (0.004 + gust * gust * 0.03) * windAmt * (w.season === 'winter' ? 0.4 : 1);
    this.canopy.gain.gain.setTargetAtTime(rustle, t, 0.25);
    this.canopy.filter.frequency.setTargetAtTime(2200 + gust * 1800, t, 0.3);
    this.rain.gain.setTargetAtTime(hasRain ? 0 : w.rain * 0.05, t, 0.6);
    this.sea.gain.setTargetAtTime(0, t, 0.5);
    if (this.brook) {
      this.brook.gain.gain.setTargetAtTime(hasStream ? 0 : w.stream * 0.22, t, 0.3);
      // Bubbling: each band's centre jumps about a little many times a second.
      for (const [i, b] of this.brook.bands.entries()) {
        const base = [480, 1150, 2300, 3900][i];
        b.frequency.setTargetAtTime(base * (0.75 + Math.random() * 0.6), t, 0.03 + Math.random() * 0.05);
      }
    }
    const lap = 0.5 + 0.5 * Math.sin(t * 0.9) * Math.sin(t * 0.37);
    this.pondLap.gain.setTargetAtTime(hasPond ? 0 : w.pond * (0.02 + w.wind * 0.05) * lap, t, 0.3);

    // Rain ticking on leaves around you.
    if (!hasRainLeaves && w.rain > 0.05) {
      this.dripIn -= dt;
      while (this.dripIn <= 0) {
        this.dripIn += 1 / (4 + w.rain * w.canopy * 45);
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random() * 2 - 1;
        pan.connect(this.sfxBus);
        this.noiseHit(pan, t + Math.random() * 0.05, 0.02 + Math.random() * 0.03, 0.012 + Math.random() * 0.02 * w.canopy, 'bandpass', 2500 + Math.random() * 4000, 1800, 3);
        window.setTimeout(() => pan.disconnect(), 400);
      }
    }

    // Birds in the distance: a dawn chorus, quieter by day, an owl at night.
    this.chirpIn -= dt;
    if (this.chirpIn <= 0) {
      const chorus = w.dawn * 0.85 + w.day * 0.25 + w.dusk * 0.3;
      this.chirpIn = 0.35 + (1 - chorus) * 5 + Math.random() * 2;
      if (w.day > 0.2 && w.vitality > 0.3 && w.rain < 0.4 && Math.random() < 0.3 + chorus) this.distantBird(w);
    }
    this.owlIn -= dt;
    if (this.owlIn <= 0) {
      this.owlIn = 25 + Math.random() * 40;
      if (night > 0.7 && w.vitality > 0.3 && w.rain < 0.3) {
        const a = Math.random() * Math.PI * 2;
        this.sing('owl', this.at(Math.cos(a) * 60, 12, Math.sin(a) * 60, 0.9), t);
      }
    }
    this.cricketIn -= dt;
    if (this.cricketIn <= 0) {
      this.cricketIn = 0.5 + Math.random() * 0.9;
      if (night > 0.75 && w.vitality > 0.3 && w.season !== 'winter' && w.rain < 0.3) {
        const f = 3900 + Math.random() * 600;
        for (let i = 0; i < 4; i++) this.tone(this.sfxBus, 'sine', f, t + i * 0.055, 0.025, 0.006, 0.005, 0.03);
      }
    }
  }

  /** A bird somewhere around the grove: a recording for the hour if installed, else synthesised. */
  private distantBird(w: Ambience) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 45;
    const out = this.at(Math.cos(a) * d, 6 + Math.random() * 8, Math.sin(a) * d, 0.8);
    const sm = this.samples;
    const options = sm?.birdsAt(w.hour, w.season) ?? [];
    if (options.length) {
      const [, e] = options[Math.floor(Math.random() * options.length)];
      if (this.playSample(sm!.pick(e.files), out, e.gain ?? 0.8, 0.95 + Math.random() * 0.1)) return;
    }
    const dawnSet: Song[] = ['robin', 'blackbird', 'bluetit', 'goldfinch', 'robin', 'blackbird'];
    const daySet: Song[] = ['goldfinch', 'bluetit', 'woodpigeon', 'robin', 'goldfinch'];
    const pool = w.dawn > 0.3 || w.dusk > 0.4 ? dawnSet : daySet;
    this.sing(pool[Math.floor(Math.random() * pool.length)], out, t);
  }

  private playSample(buf: AudioBuffer | null, out: AudioNode, gain: number, rate = 1): boolean {
    if (!buf || !this.ctx) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(out);
    src.start();
    return true;
  }

  /** A perched bird sings from exactly where it sits. */
  song(species: string, at: { x: number; y: number; z: number }, _listener?: unknown) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const out = this.at(at.x, at.y, at.z, 1);
    const e = this.samples?.manifest.birds?.[species];
    if (e && this.playSample(this.samples!.pick(e.files), out, e.gain ?? 0.9, 0.96 + Math.random() * 0.08)) return;
    this.sing(species as Song, out, this.ctx.currentTime);
  }

  /** Synthesised songs, each shaped after the real bird's phrasing. */
  private sing(sp: Song, out: AudioNode, t: number) {
    const r = Math.random;
    const note = (f: number, at: number, dur: number, vol: number, glide?: number, vib = 0) =>
      this.tone(out, 'sine', f, t + at, dur, vol, Math.min(0.01, dur * 0.3), dur * 0.6, { glide, vibrato: vib });
    switch (sp) {
      case 'robin': {
        // Thin, liquid, changeable: runs of quick notes that rise and fall.
        let at = 0;
        const n = 6 + Math.floor(r() * 6);
        let f = 3000 + r() * 2500;
        for (let i = 0; i < n; i++) {
          const d = 0.04 + r() * 0.09;
          f = Math.min(7500, Math.max(2200, f * (0.82 + r() * 0.4)));
          note(f, at, d, 0.03, f * (0.8 + r() * 0.5));
          at += d + 0.015 + r() * 0.05;
        }
        break;
      }
      case 'bluetit': {
        // "tsee-tsee-tsu-hu-hu": two high notes then a lower trill.
        note(7200, 0, 0.09, 0.022);
        note(7000, 0.16, 0.09, 0.022);
        for (let i = 0; i < 5; i++) note(4300 - i * 60, 0.32 + i * 0.07, 0.04, 0.02, 3900);
        break;
      }
      case 'goldfinch': {
        // A tinkling, twittering spray of very short notes.
        let at = 0;
        for (let i = 0; i < 14 + Math.floor(r() * 10); i++) {
          const f = 3200 + r() * 3600;
          note(f, at, 0.025 + r() * 0.03, 0.018, f * (r() < 0.5 ? 1.25 : 0.8));
          at += 0.04 + r() * 0.05;
        }
        break;
      }
      case 'blackbird': {
        // Mellow, fluted, unhurried, ending in a squeaky flourish.
        let at = 0;
        for (let i = 0; i < 4 + Math.floor(r() * 3); i++) {
          const f = 1500 + r() * 1300;
          const d = 0.14 + r() * 0.18;
          note(f, at, d, 0.04, f * (0.9 + r() * 0.25), 18);
          at += d + 0.04;
        }
        for (let i = 0; i < 3; i++) note(5200 + r() * 1500, at + i * 0.05, 0.03, 0.012, 6800);
        break;
      }
      case 'woodpigeon': {
        // "coo-COO-coo, coo-coo": soft, low, five beats.
        const beats = [[0, 0.22, 0.5], [0.32, 0.38, 1], [0.8, 0.22, 0.6], [1.15, 0.2, 0.55], [1.45, 0.25, 0.5]];
        for (const [at, d, v] of beats) {
          this.tone(out, 'sine', 470, t + at, d, 0.06 * v, 0.06, 0.12, { glide: 430 });
          this.tone(out, 'triangle', 470, t + at, d, 0.015 * v, 0.06, 0.12, { glide: 430, lp: 700 });
        }
        break;
      }
      case 'owl': {
        // Tawny owl: "hoo...  hu-hu-hoooo" with a wavering tail.
        this.tone(out, 'sine', 440, t, 0.5, 0.07, 0.08, 0.2, { glide: 400 });
        this.tone(out, 'sine', 420, t + 1.4, 0.12, 0.05, 0.03, 0.1);
        this.tone(out, 'sine', 430, t + 1.6, 0.12, 0.05, 0.03, 0.1);
        this.tone(out, 'sine', 445, t + 1.85, 1.0, 0.07, 0.06, 0.3, { glide: 380, vibrato: 9 });
        break;
      }
    }
  }

  // -------------------------------------------------------------------- sfx
  footstep(surface: Surface | 'sand', run: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = (run ? 0.085 : 0.055) * (0.8 + Math.random() * 0.4);
    const rec = this.samples?.manifest.steps?.[surface as Surface];
    if (rec && this.playSample(this.samples!.pick(rec), this.sfxBus, (run ? 1 : 0.7) * (0.85 + Math.random() * 0.3), 0.92 + Math.random() * 0.16)) return;
    switch (surface) {
      case 'water':
        this.noiseHit(this.sfxBus, t, 0.26, v * 1.5, 'bandpass', 900 + Math.random() * 300, 380, 0.9);
        this.noiseHit(this.sfxBus, t + 0.05, 0.18, v * 0.6, 'highpass', 3000, 5000, 0.7);
        break;
      case 'leaves':
        // Dry leaves crackle: a few bright crunches in quick succession.
        for (let i = 0; i < 4; i++) this.noiseHit(this.sfxBus, t + i * 0.022 + Math.random() * 0.01, 0.035, v * (0.8 - i * 0.12), 'bandpass', 2600 + Math.random() * 2500, 1500, 1.4);
        this.tone(this.sfxBus, 'sine', 100, t, 0.03, v * 0.4, 0.003, 0.06, { glide: 55 });
        break;
      case 'path':
      case 'sand':
        // Packed earth: a dull thud with a little grit.
        this.tone(this.sfxBus, 'sine', 85, t, 0.04, v * 0.9, 0.003, 0.08, { glide: 50 });
        this.noiseHit(this.sfxBus, t, 0.09, v * 0.6, 'lowpass', 900, 400, 0.7);
        this.noiseHit(this.sfxBus, t + 0.02, 0.05, v * 0.25, 'bandpass', 3500, 2500, 2);
        break;
      case 'snow':
        // A soft compressed squeak-crunch.
        for (let i = 0; i < 6; i++) this.noiseHit(this.sfxBus, t + i * 0.018, 0.02, v * 0.5, 'bandpass', 1300 + Math.random() * 900, 1100, 4);
        break;
      case 'stone':
        this.noiseHit(this.sfxBus, t, 0.05, v * 1.2, 'bandpass', 1500 + Math.random() * 400, 900, 2);
        this.tone(this.sfxBus, 'sine', 140, t, 0.03, v * 0.7, 0.003, 0.06, { glide: 70 });
        break;
      default:
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

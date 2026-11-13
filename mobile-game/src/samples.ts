// Recorded sound. The game is built to be carried by real field recordings
// and a composed score; they are listed in public/assets/audio/manifest.json
// (see the README there for what each slot wants). Anything missing falls
// back to the synthesised sound in audio.ts, so the game always has sound.

const ASSETS = `${import.meta.env.BASE_URL}assets/audio/`;

export type BedId = 'dawn' | 'day' | 'dusk' | 'night' | 'wind_canopy' | 'rain_light' | 'rain_leaves' | 'stream' | 'pond' | 'snow';
export type Surface = 'grass' | 'leaves' | 'path' | 'water' | 'snow' | 'stone';

export interface BirdEntry {
  /** One or more recordings of this species' song or calls. */
  files: string[];
  /** Hours of the day it sings, e.g. [[4.5, 10], [16, 21]]; wraps past midnight. */
  hours: [number, number][];
  gain?: number;
  /** Optional: sings mostly in these seasons. */
  seasons?: ('spring' | 'summer' | 'autumn' | 'winter')[];
}

export interface Manifest {
  beds?: Partial<Record<BedId, string[]>>;
  birds?: Record<string, BirdEntry>;
  steps?: Partial<Record<Surface, string[]>>;
  /** A composed score in stems that loop in sync: one bed plus one layer per feeling. */
  score?: { stems: Partial<Record<'pad' | 'joy' | 'calm' | 'love' | 'hope' | 'courage' | 'sorrow', string>>; gain?: number };
  /** One-shot cues: planting, a tree coming of age, UI. */
  cues?: Partial<Record<'plant' | 'grown' | 'open' | 'close' | 'click' | 'shutter', string>>;
}

export class Samples {
  manifest: Manifest = {};
  private ctx: AudioContext;
  private cache = new Map<string, Promise<AudioBuffer | null>>();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  async load() {
    try {
      const r = await fetch(`${ASSETS}manifest.json`);
      if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) this.manifest = (await r.json()) as Manifest;
    } catch {
      /* no recordings installed */
    }
    // Warm the things needed straight away.
    for (const list of Object.values(this.manifest.beds ?? {})) list?.forEach((f) => void this.get(f));
    for (const list of Object.values(this.manifest.steps ?? {})) list?.forEach((f) => void this.get(f));
    for (const f of Object.values(this.manifest.score?.stems ?? {})) if (f) void this.get(f);
  }

  /** Decoded buffer, or null while loading or if it fails. */
  get(file: string): Promise<AudioBuffer | null> {
    let p = this.cache.get(file);
    if (!p) {
      p = fetch(ASSETS + file)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
        .then((b) => this.ctx.decodeAudioData(b))
        .catch(() => null);
      this.cache.set(file, p);
    }
    return p;
  }

  /** A buffer that is already decoded, without waiting. */
  ready = new Map<string, AudioBuffer>();
  async prime(file: string) {
    const b = await this.get(file);
    if (b) this.ready.set(file, b);
    return b;
  }

  pick(list: string[] | undefined): AudioBuffer | null {
    if (!list?.length) return null;
    const f = list[Math.floor(Math.random() * list.length)];
    const b = this.ready.get(f);
    if (!b) void this.prime(f);
    return b ?? null;
  }

  has(list: string[] | undefined) {
    return !!list?.length;
  }

  /** Bird species singing at this hour (and season), with their weights. */
  birdsAt(hour: number, season: string): [string, BirdEntry][] {
    const inRange = (h: number, [a, b]: [number, number]) => (a <= b ? h >= a && h < b : h >= a || h < b);
    return Object.entries(this.manifest.birds ?? {}).filter(
      ([, e]) => e.hours.some((r) => inRange(hour, r)) && (!e.seasons || e.seasons.includes(season as 'spring')),
    );
  }
}

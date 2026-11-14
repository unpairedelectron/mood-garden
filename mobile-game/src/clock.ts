// The grove's sense of time: hour of day, season and weather.
//
// The hour starts at your phone's real clock each time you open the app, then
// runs a little faster than real time (TIME_LAPSE) so the light visibly moves
// while you walk. Seasons follow the real calendar, so the forest changes over
// real weeks. Weather is deterministic for a given date and place in the day,
// so it is the same weather if you close the app and open it again.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherKind = 'clear' | 'cloudy' | 'mist' | 'rain' | 'wind' | 'snow';

/** One real minute moves the grove's clock on this many minutes. */
export const TIME_LAPSE = 6;

export interface Weather {
  kind: WeatherKind;
  /** 0..1 amounts, smoothed between weather spells. */
  cloud: number;
  rain: number;
  snow: number;
  mist: number;
  wind: number;
  /** Wetness of the ground: rises in rain, dries slowly after. */
  wet: number;
}

export interface SeasonState {
  name: Season;
  /** 0..1 through the year, 0 = start of spring (in your hemisphere). */
  phase: number;
  /** Smooth weights that sum to ~1, for blending looks between seasons. */
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
  /** Deciduous leaf cover: 1 in summer, thin in late autumn, sparse in winter. */
  leaf: number;
  /** Jacaranda / flowering trees in blossom. */
  bloom: number;
  /** Day length in hours. */
  daylight: number;
}

const SOUTH_ZONES = /^(Australia|Antarctica|Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Noumea)|America\/(Argentina|Sao_Paulo|Santiago|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Maseru|Mbabane|Lusaka)|Indian\/(Mauritius|Reunion|Antananarivo))/;

export function southernHemisphere(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (SOUTH_ZONES.test(tz)) return true;
  } catch {
    /* no Intl */
  }
  // Daylight saving in January means summer is in January.
  const y = new Date().getFullYear();
  return new Date(y, 0, 1).getTimezoneOffset() < new Date(y, 6, 1).getTimezoneOffset();
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Distance on a 0..1 loop. */
const loopDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};

export function dayOfYear(d: Date): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);
}

/** Local calendar day as an integer, for one-tree-a-day and weather seeds. */
export function dayNumber(d: Date | number = new Date()): number {
  const x = typeof d === 'number' ? new Date(d) : d;
  return Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 864e5);
}

export function seasonAt(date: Date, south: boolean, override?: string | null): SeasonState {
  // Spring starts ~March 20 (day 79) in the north.
  let phase = ((dayOfYear(date) - 79) / 365.25 + (south ? 0.5 : 0) + 2) % 1;
  const forced: Record<string, number> = { spring: 0.12, summer: 0.37, autumn: 0.62, winter: 0.87 };
  if (override && override in forced) phase = forced[override];
  else if (override && !isNaN(parseFloat(override))) phase = ((parseFloat(override) % 1) + 1) % 1;
  // Each season peaks mid-quarter and blends a few weeks either side.
  const w = (c: number) => Math.max(0, 1 - loopDist(phase, c) / 0.25);
  let sp = w(0.125), su = w(0.375), au = w(0.625), wi = w(0.875);
  const sum = sp + su + au + wi || 1;
  sp /= sum;
  su /= sum;
  au /= sum;
  wi /= sum;
  const names: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const name = names[Math.floor(phase * 4) % 4];
  // Leaves: full from late spring to early autumn, fall through autumn, bud in early spring.
  const leaf =
    phase < 0.08 ? 0.35 + (phase / 0.08) * 0.45 :
    phase < 0.2 ? 0.8 + ((phase - 0.08) / 0.12) * 0.2 :
    phase < 0.6 ? 1 :
    phase < 0.78 ? 1 - ((phase - 0.6) / 0.18) * 0.75 :
    phase < 0.95 ? 0.25 :
    0.25 + ((phase - 0.95) / 0.05) * 0.1;
  const bloom = Math.max(0, 1 - loopDist(phase, 0.2) / 0.1);
  // Longest day at midsummer (phase 0.25), shortest at midwinter.
  const daylight = 12.4 + 2.6 * Math.sin(phase * Math.PI * 2);
  return { name, phase, spring: sp, summer: su, autumn: au, winter: wi, leaf, bloom, daylight };
}

const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** The spell of weather for a given day and four-hour block. */
function spell(day: number, block: number, season: SeasonState): WeatherKind {
  const r = hash(day * 7.13 + block * 1.917);
  const r2 = hash(day * 3.71 + block * 5.3 + 11);
  // Spells tend to last: half the time a block repeats the one before.
  if (block > 0 && r2 < 0.45) return spell(day, block - 1, season);
  const p = {
    // probabilities shift with the season
    rain: 0.14 + season.spring * 0.08 + season.autumn * 0.1,
    mist: 0.08 + season.autumn * 0.1 + season.winter * 0.06 + (block === 1 ? 0.18 : 0),
    wind: 0.08 + season.autumn * 0.06 + season.winter * 0.04,
    cloudy: 0.18 + season.winter * 0.1,
    snow: season.winter > 0.6 ? 0.14 : 0,
  };
  let acc = 0;
  for (const [k, v] of Object.entries(p)) {
    acc += v;
    if (r < acc) return k as WeatherKind;
  }
  return 'clear';
}

const TARGETS: Record<WeatherKind, Omit<Weather, 'kind' | 'wet'>> = {
  clear: { cloud: 0, rain: 0, snow: 0, mist: 0, wind: 0.25 },
  cloudy: { cloud: 0.75, rain: 0, snow: 0, mist: 0.1, wind: 0.4 },
  mist: { cloud: 0.5, rain: 0, snow: 0, mist: 1, wind: 0.05 },
  rain: { cloud: 1, rain: 1, snow: 0, mist: 0.35, wind: 0.6 },
  wind: { cloud: 0.35, rain: 0, snow: 0, mist: 0, wind: 1 },
  snow: { cloud: 0.9, rain: 0, snow: 1, mist: 0.3, wind: 0.3 },
};

export class Clock {
  /** Hours, 0..24, as the grove sees it. */
  hour: number;
  readonly south = southernHemisphere();
  season: SeasonState;
  weather: Weather = { kind: 'clear', cloud: 0, rain: 0, snow: 0, mist: 0, wind: 0.25, wet: 0 };
  private start: Date;
  private elapsed = 0;
  private forcedWeather: WeatherKind | null = null;
  private seasonOverride: string | null;
  private frozen = false;
  /** Seconds of grove time that have passed since opening. */
  get groveSeconds() {
    return this.elapsed * TIME_LAPSE;
  }

  constructor() {
    const qs = new URLSearchParams(location.search);
    const now = qs.has('date') ? new Date(qs.get('date')!) : new Date();
    this.start = isNaN(now.getTime()) ? new Date() : now;
    this.hour = qs.has('hour') ? parseFloat(qs.get('hour')!) : this.start.getHours() + this.start.getMinutes() / 60;
    this.frozen = qs.has('hour') && !qs.has('lapse');
    this.seasonOverride = qs.get('season');
    this.season = seasonAt(this.start, this.south, this.seasonOverride);
    const w = qs.get('weather') as WeatherKind | null;
    if (w && w in TARGETS) this.forcedWeather = w;
    this.snapWeather();
  }

  /** The date the grove believes it is, including time-lapse. */
  get date(): Date {
    const d = new Date(this.start);
    d.setHours(0, 0, 0, 0);
    return new Date(d.getTime() + this.hour * 3600e3);
  }

  get daylightHours(): [number, number] {
    const half = this.season.daylight / 2;
    return [12.6 - half, 12.6 + half];
  }

  /** 1 in full day, 0 at night, smooth through dawn and dusk. */
  get day(): number {
    const [rise, set] = this.daylightHours;
    return smooth(rise - 0.6, rise + 0.9, this.hour) * (1 - smooth(set - 0.9, set + 0.7, this.hour));
  }

  private target(): WeatherKind {
    if (this.forcedWeather) return this.forcedWeather;
    let k = spell(dayNumber(this.start), Math.floor(this.hour / 4), this.season);
    // Snow needs cold; rain falls instead out of deep winter.
    if (k === 'snow' && this.season.winter < 0.6) k = 'rain';
    return k;
  }

  private snapWeather() {
    const k = this.target();
    Object.assign(this.weather, TARGETS[k], { kind: k, wet: k === 'rain' ? 0.8 : 0 });
  }

  setWeather(k: WeatherKind | null) {
    this.forcedWeather = k;
  }

  /** Photo mode: hold the sky at a chosen hour (null lets time run again). */
  private held: number | null = null;
  hold(h: number | null) {
    if (h === null) {
      if (this.held !== null) this.hour = this.held;
      this.held = null;
      return;
    }
    if (this.held === null) this.held = this.hour;
    this.hour = ((h % 24) + 24) % 24;
  }
  /** The hour time would be at if photo mode were not holding it. */
  get realHour() {
    return this.held ?? this.hour;
  }

  setHour(h: number) {
    this.hour = ((h % 24) + 24) % 24;
  }

  /** Extra speed for the sky, e.g. while you sit and watch (1 = normal time-lapse). */
  boost = 1;
  /** 0..1: a rainbow, for a while after rain stops in daylight. */
  rainbow = 0;
  private rainedFor = 0;
  /** 0..1: fog lying in the valleys, on some mornings around dawn. */
  get valleyFog(): number {
    const [rise] = this.daylightHours;
    const day = dayNumber(this.start);
    // About one morning in three, more in autumn.
    const chance = 0.3 + this.season.autumn * 0.25;
    if (!this.forcedFog && hash(day * 2.31 + 0.7) > chance) return 0;
    const h = this.hour;
    return Math.max(0, Math.min(1, (h - (rise - 1.5)) / 1.2, (rise + 2.6 - h) / 1.4)) * (1 - this.weather.rain);
  }
  private forcedFog = new URLSearchParams(location.search).has('fog');

  update(dt: number) {
    this.elapsed += dt;
    const step = (dt * TIME_LAPSE * this.boost) / 3600;
    if (this.held !== null) this.held = (this.held + step) % 24;
    else if (!this.frozen) this.hour = (this.hour + step) % 24;
    const k = this.target();
    const w = this.weather;
    w.kind = k;
    const to = TARGETS[k];
    // Spells change over a few grove-minutes.
    const a = 1 - Math.exp(-dt * 0.06 * TIME_LAPSE);
    w.cloud += (to.cloud - w.cloud) * a;
    w.rain += (to.rain - w.rain) * a;
    w.snow += (to.snow - w.snow) * a;
    w.mist += (to.mist - w.mist) * a;
    w.wind += (to.wind - w.wind) * a;
    w.wet = Math.min(1, Math.max(0, w.wet + dt * (w.rain > 0.3 ? 0.03 * w.rain : -0.002 * TIME_LAPSE * (0.3 + this.day))));
    // A rainbow when real rain has just eased off and the sun is out.
    if (w.rain > 0.5) this.rainedFor += dt;
    else if (w.rain < 0.15 && this.rainedFor > 20 && this.day > 0.6) {
      this.rainbow = 1;
      this.rainedFor = 0;
    }
    this.rainbow = Math.max(0, this.rainbow - (dt * TIME_LAPSE * this.boost) / (25 * 60));
    if (this.forcedRainbow) this.rainbow = 1;
  }
  private forcedRainbow = new URLSearchParams(location.search).has('rainbow');

  /** Words for the HUD: "Late afternoon · light rain". */
  describe(): string {
    const h = this.hour;
    const part =
      h < 4.5 ? 'Night' : h < 7 ? 'Dawn' : h < 10 ? 'Morning' : h < 12.5 ? 'Late morning' : h < 15 ? 'Afternoon' : h < 17.5 ? 'Late afternoon' : h < 19.5 ? 'Evening' : h < 21.5 ? 'Dusk' : 'Night';
    const w = this.weather;
    const words: Record<WeatherKind, string> = {
      clear: '',
      cloudy: 'overcast',
      mist: 'mist',
      rain: w.rain > 0.7 ? 'rain' : 'light rain',
      wind: 'windy',
      snow: 'snow',
    };
    const extra = words[w.kind];
    return extra ? `${part} · ${extra}` : part;
  }
}

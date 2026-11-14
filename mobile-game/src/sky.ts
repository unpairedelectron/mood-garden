// The sky over the grove. Four photographed skies (misty dawn, day, sunset,
// moonlit night) are blended through the day. Each photo is turned so its own
// sun sits where the moving sun is, which also makes the clouds drift. A thin
// procedural cloud layer moves with the wind, and weather can draw an overcast
// or misty veil over the photo.
//
// Lighting for the whole scene (sun direction and colour, sky and ground
// ambient, fog) is measured from each photo's HDR and interpolated, so the
// light always matches the sky you see.

import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import type { Clock } from './clock';
import { LIGHT } from './forest';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

interface SkyKey {
  file: string;
  sun: number;
  exposure: number;
  fog: number;
  night: number;
  bg: number;
}
const KEYS: SkyKey[] = [
  { file: 'qwantani_moon_noon_puresky', sun: 1.8, exposure: 1.5, fog: 0.008, night: 1, bg: 0.5 },
  { file: 'kloofendal_misty_morning_puresky', sun: 4.2, exposure: 0.95, fog: 0.011, night: 0, bg: 1 },
  { file: 'qwantani_mid_morning_puresky', sun: 6.0, exposure: 0.8, fog: 0.005, night: 0, bg: 1 },
  { file: 'belfast_sunset_puresky', sun: 5.2, exposure: 1.0, fog: 0.006, night: 0, bg: 1 },
];
const NIGHT = 0, DAWN = 1, DAY = 2, DUSK = 3;

/** What each photographed sky tells us about its light. */
interface Measured {
  az: number;
  el: number;
  sunColor: THREE.Color;
  sky: THREE.Color;
  ground: THREE.Color;
  fog: THREE.Color;
  env: THREE.Texture;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  gl_Position = p.xyww;
}`;

const SKY_FRAG = /* glsl */ `
uniform sampler2D uA, uB;
uniform float uMix, uRotA, uRotB, uIntA, uIntB, uCloud, uMist, uNight, uTime, uWind, uRain;
uniform vec3 uFogColor, uSunDir, uSunColor, uSkyAmb, uTrueSun;
uniform float uRainbow;
vec3 hue(float h) { return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
varying vec3 vDir;
vec2 equi(vec3 d, float rot) {
  float c = cos(-rot), s = sin(-rot);
  d = vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
  return vec2(atan(d.z, d.x) / 6.2831853 + .5, asin(clamp(d.y, -1., 1.)) / 3.1415927 + .5);
}
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0., a = .5;
  for (int i = 0; i < 5; i++) { v += n2(p) * a; p = p * 2.03 + 17.1; a *= .5; }
  return v;
}
void main() {
  vec3 d = normalize(vDir);
  vec3 a = texture2D(uA, equi(d, uRotA)).rgb * uIntA;
  vec3 b = texture2D(uB, equi(d, uRotB)).rgb * uIntB;
  vec3 col = mix(a, b, uMix);
  float up = max(d.y, 0.);

  // Stars on clear nights.
  if (uNight > .01) {
    vec2 sp = equi(d, uTime * .0006) * vec2(1400., 700.);
    float st = step(.9965, h2(floor(sp))) * smoothstep(.05, .3, up);
    float tw = .6 + .4 * sin(uTime * 2. + h2(floor(sp) + 3.) * 40.);
    col += vec3(.75, .82, 1.) * st * tw * uNight * (1. - uCloud) * .9;
  }

  // A drifting cloud layer projected onto a dome.
  vec2 cp = d.xz / (up + .12) * 1.6 + vec2(uTime * .006, uTime * .0035) * (.4 + uWind);
  float cov = mix(.2, .9, uCloud);
  float c = smoothstep(1. - cov, 1.18 - cov * .55, fbm(cp));
  c *= smoothstep(.0, .22, up);
  float toward = pow(max(dot(d, uSunDir), 0.), 6.);
  vec3 lit = uSkyAmb * 2.6 + uSunColor * (.9 + toward * 2.2) * (1. - uCloud * .7);
  vec3 shade = mix(uFogColor * .8, lit, .55 - uCloud * .25);
  col = mix(col, shade, c * mix(.55, .92, uCloud));

  // A rainbow after rain: 42 degrees from the point opposite the sun, red on the outside.
  if (uRainbow > .01) {
    float ang = degrees(acos(clamp(dot(d, -uTrueSun), -1., 1.)));
    float t = (ang - 40.4) / 2.6;
    if (t > 0. && t < 1.) {
      float lum = dot(col, vec3(.3, .55, .15));
      col += hue((1. - t) * .78) * sin(t * 3.1416) * uRainbow * (.13 + lum * .2) * smoothstep(0., .06, d.y) * (1. - uCloud * .6);
    }
  }
  // Overcast: the photo greys out under a uniform cloud deck.
  vec3 deck = uFogColor * (1.05 - up * .35) * (1. - uRain * .3);
  col = mix(col, deck, uCloud * .8);
  // Mist and rain close in at the horizon.
  float low = 1. - smoothstep(-.02, .3 + uMist * .3, d.y);
  col = mix(col, uFogColor, clamp(low * (uMist * .95 + uRain * .6), 0., 1.));
  if (d.y < 0.) col = mix(col, uFogColor, smoothstep(0., -.08, d.y));
  gl_FragColor = vec4(col, 1.);
}`;

const lerpColor = (out: THREE.Color, a: THREE.Color, b: THREE.Color, t: number) => out.copy(a).lerp(b, t);

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly uniforms = {
    uA: { value: null as THREE.Texture | null },
    uB: { value: null as THREE.Texture | null },
    uMix: { value: 0 },
    uRotA: { value: 0 },
    uRotB: { value: 0 },
    uIntA: { value: 1 },
    uIntB: { value: 1 },
    uCloud: { value: 0 },
    uMist: { value: 0 },
    uRain: { value: 0 },
    uNight: { value: 0 },
    uTime: LIGHT.uTime,
    uWind: LIGHT.uWind,
    uFogColor: LIGHT.uFogColor,
    uSunDir: LIGHT.uSunDir,
    uSunColor: LIGHT.uSunColor,
    uSkyAmb: LIGHT.uSky,
    uTrueSun: { value: new THREE.Vector3(0, 1, 0) },
    uRainbow: { value: 0 },
  };
  private measured: Measured[] = [];
  private photos = new Map<number, THREE.Texture>();
  private loading = new Map<number, Promise<THREE.Texture>>();
  private tl = new THREE.TextureLoader();
  /** Exposure the renderer should use this frame. */
  exposure = 1;
  /** How much of the light is moonlight, 0..1. */
  night = 0;
  /** Sun (or moon) intensity for the directional light. */
  sunIntensity = 3;
  fogDensity = 0.008;
  readonly sunColor = new THREE.Color();
  /** True sun direction before clamping, for shafts and the sky. */
  readonly trueSun = new THREE.Vector3();
  /** Which key's environment map lights the scene now. */
  envIndex = -1;
  private tmp = new THREE.Color();

  constructor() {
    const geo = new THREE.SphereGeometry(300, 48, 24);
    const mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  async load(renderer: THREE.WebGLRenderer, clock: Clock, progress: (p: number) => void) {
    const pm = new THREE.PMREMGenerator(renderer);
    let done = 0;
    this.measured = await Promise.all(
      KEYS.map(async (k) => {
        const hdr = await new HDRLoader().loadAsync(`${ASSETS}sky/${k.file}.hdr`);
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        const m = measure(hdr, k);
        m.env = pm.fromEquirectangular(hdr).texture;
        hdr.dispose();
        progress(++done / (KEYS.length + 2));
        return m;
      }),
    );
    pm.dispose();
    // Only the photos needed now are uploaded; others load as the day turns.
    const { a, b } = this.keysAt(clock);
    await Promise.all([this.photo(a), this.photo(b)]);
    progress(1);
  }

  private photo(i: number): Promise<THREE.Texture> {
    const have = this.photos.get(i);
    if (have) return Promise.resolve(have);
    let p = this.loading.get(i);
    if (!p) {
      p = this.tl.loadAsync(`${ASSETS}sky/${KEYS[i].file}.jpg`).then((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.generateMipmaps = false;
        t.minFilter = THREE.LinearFilter;
        this.photos.set(i, t);
        this.loading.delete(i);
        return t;
      });
      this.loading.set(i, p);
    }
    return p;
  }

  /** Which two skies are showing at this hour, and the blend between them. */
  keysAt(clock: Clock): { a: number; b: number; t: number } {
    const h = clock.hour;
    const [rise, set] = clock.daylightHours;
    // Holds and crossfades through the day, as [hour, key] stops.
    const stops: [number, number][] = [
      [rise - 1.3, NIGHT],
      [rise + 0.2, DAWN],
      [rise + 2.0, DAWN],
      [rise + 3.6, DAY],
      [set - 2.4, DAY],
      [set - 1.0, DUSK],
      [set + 0.3, DUSK],
      [set + 1.5, NIGHT],
    ];
    for (let i = 0; i < stops.length; i++) {
      const [h0, k0] = stops[i];
      const [h1raw, k1] = stops[(i + 1) % stops.length];
      const h1 = i === stops.length - 1 ? h1raw + 24 : h1raw;
      let x = h;
      if (i === stops.length - 1 && x < h0) x += 24;
      if (x >= h0 && x < h1) {
        const t = k0 === k1 ? 0 : (x - h0) / (h1 - h0);
        const s = t * t * (3 - 2 * t);
        return { a: k0, b: k1, t: s };
      }
    }
    return { a: NIGHT, b: NIGHT, t: 0 };
  }

  /** Sun or moon position for this hour: east to west through the south. */
  private sunAt(clock: Clock, out: THREE.Vector3) {
    const [rise, set] = clock.daylightHours;
    const h = clock.hour;
    const s = clock.season;
    const maxEl = (0.62 + s.summer * 0.35 - s.winter * 0.3) * (clock.south ? 1 : 1);
    let t: number, el: number;
    if (h >= rise - 0.5 && h <= set + 0.5) {
      t = (h - rise) / (set - rise);
      el = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * maxEl + (t < 0 || t > 1 ? -0.05 : 0);
    } else {
      // The moon: up through the night.
      const len = 24 - (set - rise);
      t = (((h - set + 24) % 24) / len);
      el = Math.sin(Math.PI * t) * 0.7;
    }
    // East (+x) at t=0, through the equator side, west (-x) at t=1.
    const az = Math.PI * Math.min(1.1, Math.max(-0.1, t)) * (clock.south ? -1 : 1);
    out.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    return Math.atan2(out.z, out.x);
  }

  update(clock: Clock, scene: THREE.Scene) {
    const { a, b, t } = this.keysAt(clock);
    // Keep the photos for the next stop warm; release the rest.
    for (const i of [a, b]) if (!this.photos.has(i)) void this.photo(i);
    const ahead = this.keysAt({ ...clock, hour: (clock.hour + 1.2) % 24, daylightHours: clock.daylightHours } as Clock);
    for (const i of [ahead.a, ahead.b]) if (!this.photos.has(i)) void this.photo(i);
    for (const [i, tex] of this.photos) {
      if (i !== a && i !== b && i !== ahead.a && i !== ahead.b) {
        tex.dispose();
        this.photos.delete(i);
      }
    }
    // If the next photo is still on its way, hold on the one we have.
    const ta = this.photos.get(a), tb = this.photos.get(b);
    const u = this.uniforms;
    u.uA.value = ta ?? tb ?? null;
    u.uB.value = tb ?? ta ?? null;
    u.uMix.value = ta && tb ? t : 0;

    const sunAz = this.sunAt(clock, this.trueSun);
    const ma = this.measured[a], mb = this.measured[b];
    const ka = KEYS[a], kb = KEYS[b];
    // Turn each photo so its sun is where ours is.
    u.uRotA.value = sunAz - ma.az;
    u.uRotB.value = sunAz - mb.az;
    u.uIntA.value = ka.bg;
    u.uIntB.value = kb.bg;

    const w = clock.weather;
    this.night = ka.night + (kb.night - ka.night) * t;
    u.uNight.value = this.night;
    u.uCloud.value = w.cloud;
    u.uMist.value = w.mist;
    u.uRain.value = w.rain;
    u.uRainbow.value = clock.rainbow * (1 - this.night);
    u.uTrueSun.value.copy(this.trueSun);

    // Light: interpolate what the photos measured, then let weather dim it.
    const dir = LIGHT.uSunDir.value.copy(this.trueSun);
    // Keep shadows a sensible length near the horizon.
    if (dir.y < 0.28) {
      dir.y = 0.28;
      dir.normalize();
    }
    lerpColor(LIGHT.uSky.value, ma.sky, mb.sky, t);
    lerpColor(LIGHT.uGround.value, ma.ground, mb.ground, t);
    const fog = lerpColor(LIGHT.uFogColor.value, ma.fog, mb.fog, t);
    // Overcast and rain flatten the light toward a soft grey.
    const lum = fog.r * 0.3 + fog.g * 0.55 + fog.b * 0.15;
    this.tmp.setRGB(lum, lum * 1.01, lum * 1.04);
    fog.lerp(this.tmp, w.cloud * 0.6).multiplyScalar(1 - w.rain * 0.25);
    LIGHT.uSky.value.lerp(fog, w.cloud * 0.4).multiplyScalar(1 + w.cloud * 0.25);

    lerpColor(this.sunColor, ma.sunColor, mb.sunColor, t);
    const sunUp = Math.min(1, Math.max(0, this.trueSun.y * 6 + 0.25));
    this.sunIntensity = (ka.sun + (kb.sun - ka.sun) * t) * (1 - w.cloud * 0.82) * (this.night > 0.5 ? 1 : 0.35 + 0.65 * sunUp);
    LIGHT.uSunColor.value.copy(this.sunColor).multiplyScalar(this.sunIntensity / Math.PI);
    this.exposure = (ka.exposure + (kb.exposure - ka.exposure) * t) * (1 + w.cloud * 0.18);
    this.fogDensity = (ka.fog + (kb.fog - ka.fog) * t) * (1 + w.mist * 1.5 + w.rain * 0.9 + w.snow * 1.1);
    LIGHT.uFogDensity.value = this.fogDensity;
    LIGHT.uWind.value = 0.5 + w.wind * 2.2;

    const fogObj = scene.fog as THREE.FogExp2 | null;
    if (fogObj) {
      fogObj.color.copy(fog);
      fogObj.density = this.fogDensity;
    }
    const envI = t < 0.5 ? a : b;
    if (envI !== this.envIndex) {
      this.envIndex = envI;
      scene.environment = this.measured[envI].env;
    }
    scene.environmentRotation.y = -(t < 0.5 ? u.uRotA.value : u.uRotB.value);
    scene.environmentIntensity = 0.24 * (1 - this.night * 0.5);
  }
}

/** Derive sun direction, fog and ambient colour from a photographed sky. */
function measure(hdr: THREE.DataTexture, key: SkyKey): Measured {
  const img = hdr.image as unknown as { data: Uint16Array | Float32Array; width: number; height: number };
  const { data, width: w, height: h } = img;
  const half = data instanceof Uint16Array;
  const px = (k: number) => (half ? THREE.DataUtils.fromHalfFloat(data[k]) : data[k]);
  let best = -1, bi = 0, bj = 0;
  const up = [0, 0, 0], horizon = [0, 0, 0], down = [0, 0, 0];
  let nu = 0, nh = 0, nd = 0;
  for (let j = 0; j < h; j += 2) {
    const el = (0.5 - (j + 0.5) / h) * Math.PI;
    for (let i = 0; i < w; i += 2) {
      const k = (j * w + i) * 4;
      const r = px(k), g = px(k + 1), b = px(k + 2);
      const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
      if (lum > best) {
        best = lum;
        bi = i;
        bj = j;
      }
      const into = el > 0.2 ? up : el > 0 ? horizon : down;
      into[0] += Math.min(r, 3);
      into[1] += Math.min(g, 3);
      into[2] += Math.min(b, 3);
      if (el > 0.2) nu++;
      else if (el > 0) nh++;
      else nd++;
    }
  }
  // Note: rows run top (+y) to bottom; our shader uses v = asin(y)/pi + .5 with flipY textures,
  // which matches three's equirect convention, so the same azimuth formula applies.
  const el = (0.5 - (bj + 0.5) / h) * Math.PI;
  const az = ((bi + 0.5) / w - 0.5) * Math.PI * 2;
  const sky = new THREE.Color(up[0] / nu, up[1] / nu, up[2] / nu).multiplyScalar(0.3);
  const ground = new THREE.Color(down[0] / nd, down[1] / nd, down[2] / nd).multiplyScalar(0.16).add(new THREE.Color(0.02, 0.025, 0.012));
  const fog = new THREE.Color(horizon[0] / nh, horizon[1] / nh, horizon[2] / nh);
  const peak = Math.max(fog.r, fog.g, fog.b);
  if (peak > 0.9) fog.multiplyScalar(0.9 / peak);
  // Fog must match the horizon as drawn, which is dimmed for night skies.
  fog.multiplyScalar(key.bg);
  const warm = new THREE.Color().copy(fog).lerp(new THREE.Color(1, 0.96, 0.9), key.night ? 0 : 0.55);
  warm.multiplyScalar(1 / (Math.max(warm.r, warm.g, warm.b) || 1));
  if (key.night) warm.setRGB(0.62, 0.74, 1);
  return { az, el, sunColor: warm, sky, ground, fog, env: null as unknown as THREE.Texture };
}

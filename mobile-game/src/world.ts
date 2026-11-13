// The grove: renderer, real-sky lighting, ground, first-person walking and
// the frame loop that grows the forest.

import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import type { AudioEngine } from './audio';
import { Forest, LIGHT } from './forest';
import { Wildlife } from './life';
import { MOOD_BY_ID, type MoodId } from './moods';
import { GARDEN_RADIUS, GROW_SECONDS, MAX_TREES, writeSave, type Save, type TreeSave } from './state';
import { WORLD, heightAt, heightTexture, terrainGeometry } from './terrain';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

interface SkyDef {
  file: string;
  from: number;
  sun: number;
  exposure: number;
  fog: number;
  night: number;
  bg: number;
}
// Which photographed sky is overhead at each (real, local) hour.
const SKIES: SkyDef[] = [
  { file: 'kloofendal_misty_morning_puresky', from: 5, sun: 4.2, exposure: 0.95, fog: 0.011, night: 0, bg: 1 },
  { file: 'qwantani_mid_morning_puresky', from: 9, sun: 6.0, exposure: 0.8, fog: 0.005, night: 0, bg: 1 },
  { file: 'belfast_sunset_puresky', from: 16.75, sun: 5.2, exposure: 1.0, fog: 0.006, night: 0, bg: 1 },
  { file: 'qwantani_moon_noon_puresky', from: 19.75, sun: 1.8, exposure: 1.5, fog: 0.008, night: 1, bg: 0.55 },
];
function skyFor(hour: number): SkyDef {
  let s = SKIES[SKIES.length - 1];
  for (const k of SKIES) if (hour >= k.from) s = k;
  return s;
}

export interface WorldEvents {
  toast: (text: string) => void;
  change: () => void;
  caption: (tree: TreeSave | null) => void;
  met: (creature: string) => void;
}

export class World {
  readonly forest = new Forest();
  readonly life: Wildlife;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.08, 400);
  private canvas: HTMLCanvasElement;
  private save: Save;
  private audio: AudioEngine;
  private ev: WorldEvents;
  private sun = new THREE.DirectionalLight(0xffffff, 3);
  private sky!: SkyDef;
  private mask!: THREE.CanvasTexture;
  private maskCtx!: CanvasRenderingContext2D;
  private pos = new THREE.Vector3();
  private yaw = Math.PI;
  private pitch = 0;
  private moveX = 0;
  private moveY = 0;
  private keys = new Set<string>();
  private vel = new THREE.Vector2();
  private bob = 0;
  private stepPhase = 0;
  private time = 0;
  private last = 0;
  private syncIn = 0;
  private saveIn = 6;
  private captionIn = 0;
  private lastCaption: TreeSave | null = null;
  private resScale = 1;
  private frameAcc = 0;
  private frames = 0;
  private v = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private pulse: THREE.Mesh;
  private pulseT = 9;
  private hour: number;
  /** False while the title card is up: the camera drifts and nothing grows. */
  active = false;
  persist = true;

  constructor(canvas: HTMLCanvasElement, save: Save, audio: AudioEngine, ev: WorldEvents) {
    this.canvas = canvas;
    this.save = save;
    this.audio = audio;
    this.ev = ev;
    const qs = new URLSearchParams(location.search);
    const now = new Date();
    this.hour = qs.has('hour') ? parseFloat(qs.get('hour')!) : now.getHours() + now.getMinutes() / 60;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.life = new Wildlife();
    this.pos.set(save.px, 0, save.pz);
    this.yaw = save.yaw;
    this.pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.62, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    );
    this.pulse.visible = false;
    this.scene.add(this.pulse);
  }

  // ----------------------------------------------------------------- load
  async load(progress: (p: number, label: string) => void) {
    const tl = new THREE.TextureLoader();
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    this.sky = skyFor(this.hour);

    progress(0.05, 'Opening the sky');
    const [hdr, bg] = await Promise.all([
      new HDRLoader().loadAsync(`${ASSETS}sky/${this.sky.file}.hdr`),
      tl.loadAsync(`${ASSETS}sky/${this.sky.file}.jpg`),
    ]);
    this.applySky(hdr, bg);

    progress(0.2, 'Laying the ground');
    const tex = async (name: string, srgb: boolean) => {
      const t = await tl.loadAsync(`${ASSETS}ground/${name}.webp`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = Math.min(8, aniso);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const [gd, gn, ga, ld] = await Promise.all([
      tex('forrest_ground_01_diffuse', true),
      tex('forrest_ground_01_nor_gl', false),
      tex('forrest_ground_01_arm', false),
      tex('leaves_forest_ground_diffuse', true),
    ]);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    this.maskCtx = cv.getContext('2d')!;
    this.mask = new THREE.CanvasTexture(cv);
    const ground = new THREE.MeshStandardMaterial({ map: gd, normalMap: gn, roughnessMap: ga, roughness: 1, metalness: 0 });
    for (const t of [gd, gn, ga]) t.repeat.set(WORLD / 3.5, WORLD / 3.5);
    ground.onBeforeCompile = (s) => {
      s.uniforms.uLitter = { value: ld };
      s.uniforms.uMask = { value: this.mask };
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWuv;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\nvWuv = position.xz / ${WORLD.toFixed(1)} + .5;`);
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWuv;\nuniform sampler2D uLitter, uMask;')
        .replace(
          '#include <map_fragment>',
          `// Two scales of each photo-texture hide the repeat; leaf litter takes over under trees.
           vec4 g1 = texture2D(map, vMapUv);
           vec4 g2 = texture2D(map, vMapUv * .19 + .37);
           float macro = dot(g2.rgb, vec3(.33));
           vec4 grassC = vec4(g1.rgb * (.55 + macro * 1.6), 1.);
           vec4 l1 = texture2D(uLitter, vMapUv * 1.25);
           vec4 l2 = texture2D(uLitter, vMapUv * .27 + .11);
           vec4 litterC = mix(l1, l2, .4);
           float m = texture2D(uMask, vWuv).r;
           m = smoothstep(.2, .7, m + (g1.g - .25) * .9 * m);
           diffuseColor *= mix(grassC, litterC * vec4(.8, .78, .7, 1.), m * .8);`,
        );
    };
    const terrain = new THREE.Mesh(terrainGeometry(), ground);
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    await this.forest.load(heightTexture(), aniso, (p) => progress(0.25 + p * 0.65, 'Growing the forest'));
    this.scene.add(this.forest.group, this.life.group);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -30;
    sc.right = sc.top = 30;
    sc.near = 1;
    sc.far = 220;
    sc.updateProjectionMatrix();
    this.scene.add(this.sun, this.sun.target);

    this.refresh();
    this.bindInput();
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', () => document.hidden && this.persist && this.store());
    window.addEventListener('pagehide', () => this.persist && this.store());
    this.resize();
    progress(0.95, 'Almost there');
    this.place(0);
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      /* compile lazily */
    }
    progress(1, 'Ready');
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  /** Derive sun direction, fog and ambient colour from the photographed sky itself. */
  private applySky(hdr: THREE.DataTexture, bg: THREE.Texture) {
    const sky = this.sky;
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    bg.mapping = THREE.EquirectangularReflectionMapping;
    bg.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromEquirectangular(hdr).texture;
    pm.dispose();
    this.scene.background = bg;
    this.scene.backgroundIntensity = sky.bg;
    this.scene.environmentIntensity = 0.24;
    this.renderer.toneMappingExposure = sky.exposure;

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
        const c = [Math.min(r, 3), Math.min(g, 3), Math.min(b, 3)];
        const into = el > 0.2 ? up : el > 0 ? horizon : down;
        into[0] += c[0];
        into[1] += c[1];
        into[2] += c[2];
        if (el > 0.2) nu++;
        else if (el > 0) nh++;
        else nd++;
      }
    }
    const el = (0.5 - (bj + 0.5) / h) * Math.PI;
    const az = ((bi + 0.5) / w - 0.5) * Math.PI * 2;
    const dir = LIGHT.uSunDir.value.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    // Keep shadows a sensible length even at dawn and dusk.
    if (dir.y < 0.28) {
      dir.y = 0.28;
      dir.normalize();
    }
    LIGHT.uSky.value.setRGB(up[0] / nu, up[1] / nu, up[2] / nu).multiplyScalar(0.3);
    LIGHT.uGround.value.setRGB(down[0] / nd, down[1] / nd, down[2] / nd).multiplyScalar(0.16).add(new THREE.Color(0.02, 0.025, 0.012));
    const fog = LIGHT.uFogColor.value.setRGB(horizon[0] / nh, horizon[1] / nh, horizon[2] / nh);
    const peak = Math.max(fog.r, fog.g, fog.b);
    if (peak > 0.9) fog.multiplyScalar(0.9 / peak);
    LIGHT.uFogDensity.value = sky.fog;
    this.scene.fog = new THREE.FogExp2(fog.getHex(), sky.fog);
    (this.scene.fog as THREE.FogExp2).color.copy(fog);

    // Sun colour: warm when the horizon is warm, cool under the moon.
    const warm = new THREE.Color().copy(fog).lerp(new THREE.Color(1, 0.96, 0.9), sky.night ? 0 : 0.55);
    const wp = Math.max(warm.r, warm.g, warm.b) || 1;
    warm.multiplyScalar(1 / wp);
    if (sky.night) warm.setRGB(0.62, 0.74, 1);
    this.sun.color.copy(warm);
    this.sun.intensity = sky.sun;
    LIGHT.uSunColor.value.copy(warm).multiplyScalar(sky.sun / Math.PI);
  }

  // ------------------------------------------------------------- gardening
  get grown() {
    return this.save.trees.filter((t) => t.growth >= 0.6).length;
  }

  /** Paint the leaf-litter mask and rebuild instances after the forest changes. */
  refresh() {
    const g = this.maskCtx;
    g.fillStyle = '#000';
    g.fillRect(0, 0, 256, 256);
    for (const t of this.save.trees) {
      const def = MOOD_BY_ID[t.mood];
      const r = (1.2 + def.height * 0.42) * Math.min(1, t.growth * 1.3);
      if (r < 0.3) continue;
      const x = (t.x / WORLD + 0.5) * 256;
      const y = (t.z / WORLD + 0.5) * 256;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.95)');
      grd.addColorStop(0.55, 'rgba(255,255,255,0.6)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    this.mask.needsUpdate = true;
    this.forest.sync(this.save.trees);
    this.life.setForest(this.save.trees, this.forest, this.sky.night > 0.5);
    this.audio.setAwakened([...new Set(this.save.trees.filter((t) => t.growth >= 0.6).map((t) => t.mood))]);
  }

  /** Plant a tree a few paces ahead of where the walker is looking. */
  plant(mood: MoodId, note: string): boolean {
    if (this.save.trees.length >= MAX_TREES) {
      this.ev.toast('Your grove is full. Let a tree go to make room.');
      return false;
    }
    // Try straight ahead first, then fan out for a free spot.
    for (const [da, dist] of [[0, 4], [0.5, 4.5], [-0.5, 4.5], [1, 5], [-1, 5], [0, 7], [1.6, 5], [-1.6, 5]]) {
      const a = this.yaw + da;
      const x = this.pos.x - Math.sin(a) * dist;
      const z = this.pos.z - Math.cos(a) * dist;
      if (Math.hypot(x, z) > GARDEN_RADIUS) continue;
      if (this.save.trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
      const tree: TreeSave = { id: this.save.nextId++, mood, note: note.trim().slice(0, 120), planted: Date.now(), x, z, rot: Math.random() * 6.28, growth: 0 };
      this.save.trees.push(tree);
      this.refresh();
      this.pulse.position.set(x, heightAt(x, z) + 0.05, z);
      this.pulseT = 0;
      this.audio.plantFeeling();
      navigator.vibrate?.(14);
      this.save.tutorial = Math.max(this.save.tutorial, 2);
      this.ev.change();
      this.store();
      return true;
    }
    this.ev.toast('No room right here. Walk to a clearer spot and try again.');
    return false;
  }

  remove(id: number) {
    this.save.trees = this.save.trees.filter((t) => t.id !== id);
    this.refresh();
    this.ev.change();
    this.store();
  }

  private store() {
    this.save.px = this.pos.x;
    this.save.pz = this.pos.z;
    this.save.yaw = this.yaw;
    writeSave(this.save);
  }

  // ---------------------------------------------------------------- input
  setMove(x: number, y: number) {
    this.moveX = x;
    this.moveY = y;
  }

  private bindInput() {
    const el = this.canvas;
    const pts = new Map<number, [number, number]>();
    el.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
    });
    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      this.yaw -= (e.clientX - p[0]) * 0.0042;
      this.pitch = Math.min(0.75, Math.max(-0.9, this.pitch - (e.clientY - p[1]) * 0.0034));
      p[0] = e.clientX;
      p[1] = e.clientY;
    });
    const up = (e: PointerEvent) => pts.delete(e.pointerId);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => (e.target as HTMLElement).tagName !== 'INPUT' && this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * this.resScale);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait screens get a taller field of view so the forest does not feel like a keyhole.
    this.camera.fov = w < h ? 74 : 60;
    this.camera.updateProjectionMatrix();
    this.life.setPixelScale((h * this.renderer.getPixelRatio() * 0.5) / Math.tan((this.camera.fov * Math.PI) / 360));
  };

  // ----------------------------------------------------------------- loop
  private place(dt: number) {
    const cam = this.camera;
    if (!this.active) {
      // Title: a slow turn on the spot.
      this.yaw += dt * 0.05;
    }
    const gy = heightAt(this.pos.x, this.pos.z);
    this.pos.y = gy;
    cam.position.set(this.pos.x, gy + 1.62 + Math.sin(this.bob) * 0.028, this.pos.z);
    cam.rotation.set(this.pitch, this.yaw, Math.cos(this.bob * 0.5) * 0.004, 'YXZ');
    cam.updateMatrixWorld();
  }

  private walk(dt: number) {
    let x = this.moveX;
    let y = this.moveY;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    const mag = Math.min(1, Math.hypot(x, y));
    // An unhurried stroll; pushing the stick to its edge breaks into a jog.
    const speed = mag > 0.92 ? 4.2 : 2.1 * mag;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const l = Math.hypot(x, y) || 1;
    const tx = ((-s * y + c * x) / l) * speed;
    const tz = ((-c * y - s * x) / l) * speed;
    const k = 1 - Math.exp(-7 * dt);
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.y += (tz - this.vel.y) * k;
    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.y * dt;
    for (const t of this.save.trees) {
      const r = 0.25 + 0.3 * Math.min(1, t.growth);
      const dx = nx - t.x, dz = nz - t.z;
      const d = Math.hypot(dx, dz);
      if (d < r && d > 1e-4) {
        nx = t.x + (dx / d) * r;
        nz = t.z + (dz / d) * r;
      }
    }
    // The mist thickens at the edge of the land and turns you gently back.
    const R = Math.hypot(nx, nz);
    const limit = GARDEN_RADIUS + 14;
    if (R > limit) {
      nx *= limit / R;
      nz *= limit / R;
    }
    this.pos.x = nx;
    this.pos.z = nz;
    const v = this.vel.length();
    if (v > 0.3) {
      this.bob += dt * v * 3.4;
      const before = Math.floor(this.stepPhase);
      this.stepPhase += dt * v * 0.72;
      if (Math.floor(this.stepPhase) !== before) this.audio.footstep('grass', v > 3);
      if (this.save.tutorial < 1 && this.stepPhase > 6) {
        this.save.tutorial = 1;
        this.ev.change();
      }
    }
  }

  private frame = (now: number) => {
    requestAnimationFrame(this.frame);
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, raw);
    this.last = now;
    this.time += dt;
    LIGHT.uTime.value = this.time;

    // Hold a steady frame rate on slower phones by trading resolution.
    this.frameAcc += raw;
    if (++this.frames >= 45) {
      const avg = this.frameAcc / this.frames;
      const prev = this.resScale;
      if (avg > 1 / 38) this.resScale = Math.max(0.55, this.resScale - 0.1);
      else if (avg < 1 / 56) this.resScale = Math.min(1, this.resScale + 0.05);
      if (prev !== this.resScale && !new URLSearchParams(location.search).has('fixedres')) this.resize();
      this.frameAcc = this.frames = 0;
    }

    if (this.active) {
      this.walk(dt);
      let changed = false;
      for (const t of this.save.trees) {
        if (t.growth >= 1) continue;
        const before = t.growth;
        t.growth = Math.min(1, t.growth + dt / GROW_SECONDS);
        if (before < 0.6 && t.growth >= 0.6) {
          changed = true;
          this.audio.deliver(t.id % 6);
        }
      }
      this.syncIn -= dt;
      if (changed || this.syncIn <= 0) {
        this.syncIn = 1.5;
        if (this.save.trees.some((t) => t.growth < 1) || changed) this.refresh();
        if (changed) this.ev.change();
      }
    }
    this.place(dt);

    // Shadows follow the walker in texel-sized steps so they never swim.
    const texel = 60 / this.sun.shadow.mapSize.x;
    this.sun.target.position.set(Math.round(this.pos.x / texel) * texel, this.pos.y, Math.round(this.pos.z / texel) * texel);
    this.sun.position.copy(this.sun.target.position).addScaledVector(LIGHT.uSunDir.value, 110);
    this.sun.target.updateMatrixWorld();

    this.forest.setFocus(this.pos);
    const arrivals = this.life.update(dt, this.time, this.camera, this.pos);
    for (const a of arrivals) this.ev.met(a);

    const grown = this.grown;
    this.audio.update(dt, {
      day: 1 - this.sky.night,
      vitality: grown >= 4 ? 1 : grown >= 2 ? 0.4 : 0,
      shore: 0,
      rain: 0,
      speed: this.vel.length(),
      gliding: false,
      life: Math.min(1, grown / 6),
    });

    // Name the tree you are standing in front of.
    this.captionIn -= dt;
    if (this.captionIn <= 0 && this.active) {
      this.captionIn = 0.3;
      this.camera.getWorldDirection(this.fwd);
      let best: TreeSave | null = null;
      let bs = 0.9;
      for (const t of this.save.trees) {
        this.v.set(t.x - this.pos.x, 0, t.z - this.pos.z);
        const d = this.v.length();
        if (d > 8 || d < 0.2) continue;
        const dot = (this.v.x * this.fwd.x + this.v.z * this.fwd.z) / d;
        const score = dot - d * 0.006;
        if (score > bs) {
          bs = score;
          best = t;
        }
      }
      if (best !== this.lastCaption) {
        this.lastCaption = best;
        this.ev.caption(best);
      }
    }

    if (this.pulseT < 2.5) {
      this.pulseT += dt;
      const k = this.pulseT / 2.5;
      this.pulse.visible = true;
      this.pulse.scale.setScalar(0.4 + k * 3);
      (this.pulse.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8;
    } else this.pulse.visible = false;

    this.renderer.render(this.scene, this.camera);

    this.saveIn -= dt;
    if (this.saveIn <= 0) {
      this.saveIn = 6;
      if (this.active && this.persist) this.store();
    }
  };
}

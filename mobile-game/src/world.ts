// The grove: renderer, real-sky lighting, ground, first-person walking and
// the frame loop that grows the forest.

import * as THREE from 'three';
import type { AudioEngine } from './audio';
import type { Clock } from './clock';
import { Precipitation } from './precip';
import { Post, detectQuality, type Quality } from './post';
import { Sky } from './sky';
import { Forest, LIGHT } from './forest';
import { Wildlife } from './life';
import { MOOD_BY_ID, type MoodId } from './moods';
import { GARDEN_RADIUS, GROW_SECONDS, MAX_TREES, writeSave, type Save, type TreeSave } from './state';
import { WORLD, heightAt, heightTexture, terrainGeometry } from './terrain';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

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
  readonly sky = new Sky();
  readonly quality: Quality;
  readonly post: Post;
  readonly clock: Clock;
  private precip = new Precipitation();
  private snowCover = 0;
  private seasonIn = 0;
  private wasNight = false;
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
  private fixedRes = /[?&](fixedres|still)\b/.test(location.search);
  private frameAcc = 0;
  private frames = 0;
  private v = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private pulse: THREE.Mesh;
  private pulseT = 9;
  /** False while the title card is up: the camera drifts and nothing grows. */
  active = false;
  persist = true;

  constructor(canvas: HTMLCanvasElement, save: Save, audio: AudioEngine, clock: Clock, ev: WorldEvents) {
    this.canvas = canvas;
    this.save = save;
    this.audio = audio;
    this.clock = clock;
    this.ev = ev;
    // Anti-aliasing happens in the HDR target, so the canvas itself needs none.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.quality = detectQuality(this.renderer);
    this.post = new Post(this.quality);
    if (this.quality === 'low') this.resScale = 0.8;
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

    progress(0.02, 'Opening the sky');
    this.scene.fog = new THREE.FogExp2(0xbfc8d0, 0.008);
    await this.sky.load(this.renderer, this.clock, (p) => progress(0.02 + p * 0.18, 'Opening the sky'));
    this.scene.add(this.sky.mesh, this.precip.group);
    // Snow already lying if it has been snowing.
    this.snowCover = this.clock.weather.snow > 0.5 ? 0.7 : 0;

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
      s.uniforms.uSeason = LIGHT.uSeason;
      s.uniforms.uSnow = LIGHT.uSnow;
      s.uniforms.uWet = LIGHT.uWet;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWuv;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\nvWuv = position.xz / ${WORLD.toFixed(1)} + .5;`);
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWuv;\nuniform sampler2D uLitter, uMask;\nuniform vec4 uSeason;\nuniform float uSnow, uWet;')
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
           // Autumn spreads leaf litter beyond the trees; seasons tint the meadow.
           float fall = uSeason.z * .45 + uSeason.w * .25;
           m = max(m, fall * smoothstep(.35, .75, macro + g1.r * .4));
           vec3 tint = uSeason.x * vec3(.95, 1.06, .85) + uSeason.y * vec3(1.06, 1.0, .8) + uSeason.z * vec3(1.1, .92, .7) + uSeason.w * vec3(.9, .88, .84);
           diffuseColor *= mix(grassC * vec4(tint, 1.), litterC * vec4(.8, .78, .7, 1.), m * .8);
           // Rain darkens the ground; snow lies in drifts, thinner under trees.
           diffuseColor.rgb *= 1. - uWet * .32;
           float drift = smoothstep(.25, .6, uSnow * (1.15 - m * .5) + (macro - .45) * .6);
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .9, .96), drift);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           roughnessFactor = mix(roughnessFactor, .62, uWet * .6);`,
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
    this.forest.setSeason(this.clock.season);
    this.atmosphere(0);
    this.last = performance.now();
    requestAnimationFrame(this.frame);
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
    this.wasNight = this.sky.night > 0.5;
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
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.post.setSize(size.x, size.y);
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

  /** Dev: stop the real-time loop so frames can be stepped and captured by tests. */
  private still = import.meta.env.DEV && new URLSearchParams(location.search).has('still');

  /** Dev: advance n frames of dt seconds without drawing, then draw once. */
  step(n: number, dt = 1 / 30) {
    for (let i = 0; i < n; i++) this.tick(dt, dt, i === n - 1);
  }
  /** Dev: draw a frame and return it as a data URL. */
  snap(): string {
    this.draw();
    return this.canvas.toDataURL('image/png');
  }

  private frame = (now: number) => {
    if (this.still) return;
    requestAnimationFrame(this.frame);
    const raw = (now - this.last) / 1000;
    this.last = now;
    this.tick(Math.min(0.05, raw), raw, true);
  };

  /** Atmosphere: sky, sun, weather and season for this moment. */
  private atmosphere(dt: number) {
    const c = this.clock;
    c.update(dt);
    this.sky.update(c, this.scene);
    const w = c.weather;
    this.sun.color.copy(this.sky.sunColor);
    this.sun.intensity = this.sky.sunIntensity;
    this.renderer.toneMappingExposure = this.sky.exposure;
    const s = c.season;
    LIGHT.uSeason.value.set(s.spring, s.summer, s.autumn, s.winter);
    LIGHT.uWet.value = w.wet;
    // Snow builds up while it falls and melts away slowly after.
    this.snowCover = Math.min(1, Math.max(0, this.snowCover + dt * (w.snow > 0.3 ? 0.012 * w.snow : -0.0025 * (1 + c.day))));
    LIGHT.uSnow.value = this.snowCover;
    this.precip.update(this.pos, w.rain, w.snow, w.wind, s.autumn * (s.leaf < 0.95 ? 1 : 0.3));
    this.seasonIn -= dt;
    if (this.seasonIn <= 0) {
      this.seasonIn = 30;
      this.forest.setSeason(s);
    }
    const night = this.sky.night > 0.5;
    if (night !== this.wasNight) this.refresh();
  }

  private tick(dt: number, raw: number, render: boolean) {
    this.time += dt;
    LIGHT.uTime.value = this.time;
    this.atmosphere(dt);

    // Hold a steady frame rate on slower phones by trading resolution.
    this.frameAcc += raw;
    if (++this.frames >= 45) {
      const avg = this.frameAcc / this.frames;
      const prev = this.resScale;
      if (avg > 1 / 38) this.resScale = Math.max(0.55, this.resScale - 0.1);
      else if (avg < 1 / 56) this.resScale = Math.min(1, this.resScale + 0.05);
      if (prev !== this.resScale && !this.fixedRes) this.resize();
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
      day: this.clock.day,
      vitality: grown >= 4 ? 1 : grown >= 2 ? 0.4 : 0,
      shore: 0,
      rain: this.clock.weather.rain,
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

    if (render) this.draw();

    this.saveIn -= dt;
    if (this.saveIn <= 0) {
      this.saveIn = 6;
      if (this.active && this.persist) this.store();
    }
  }

  private draw() {
    const c = this.clock;
    const w = c.weather;
    const sun = this.sky.trueSun;
    const night = this.sky.night;
    // Golden hour: the sun low but up.
    const golden = (1 - night) * Math.max(0, 1 - Math.abs(sun.y - 0.08) / 0.2) * (1 - w.cloud * 0.7);
    const dawn = Math.max(0, 1 - Math.abs(c.hour - (c.daylightHours[0] + 1)) / 2);
    this.post.render(this.renderer, this.scene, this.camera, {
      exposure: this.sky.exposure,
      sunDir: sun.y > -0.05 || night > 0.5 ? sun : LIGHT.uSunDir.value,
      sunColor: LIGHT.uSunColor.value,
      fogColor: LIGHT.uFogColor.value,
      // Mist lies low at dawn, after rain, and when the weather brings it.
      mist: 0.0012 + dawn * 0.005 + w.mist * 0.022 + w.rain * 0.006 + w.wet * 0.002 + night * 0.0015,
      cloudShadow: (1 - night) * Math.min(1, sun.y * 4) * (0.12 + Math.max(0, 0.3 - Math.abs(w.cloud - 0.4) * 0.6)) * (1 - w.rain),
      shafts: (1 - w.cloud * 0.85) * (night > 0.5 ? 0.15 : 0.55 + golden * 0.6) * (1 + w.mist * 0.8),
      night,
      golden,
      wet: w.wet,
      wind: w.wind,
      time: this.time,
    });
  }
}

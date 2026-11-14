// The grove: renderer, real-sky lighting, ground, first-person walking and
// the frame loop that grows the forest.

import * as THREE from 'three';
import type { AudioEngine } from './audio';
import type { Clock } from './clock';
import { Precipitation } from './precip';
import { Post, detectQuality, type Quality } from './post';
import { Sky } from './sky';
import { Forest, LIGHT } from './forest';
import { NearTrees } from './neartrees';
import { Fauna } from './fauna';
import { Wildlife } from './life';
import { MOOD_BY_ID, type MoodId } from './moods';
import { GARDEN_RADIUS, GROW_SECONDS, MAX_TREES, writeSave, type Save, type TreeSave } from './state';
import { HILL, LAND, LAND_LIMIT, LocalHeight, WORLD, forestTexture, heightAt, heightTexture, pondShape, streamNearest, waterAt, waterDepth } from './terrain';
import { Land } from './land';
import { Paths } from './paths';
import { Water } from './water';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

export interface WorldEvents {
  toast: (text: string) => void;
  change: () => void;
  caption: (tree: TreeSave | null) => void;
  met: (creature: string) => void;
}

export class World {
  readonly forest = new Forest();
  readonly nearTrees = new NearTrees();
  readonly fauna = new Fauna(this.nearTrees);
  readonly life: Wildlife;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  // Far enough for the land beyond the fog; the sky dome travels with the camera.
  private camera = new THREE.PerspectiveCamera(62, 1, 0.08, 900);
  private land!: Land;
  private landAt = new THREE.Vector2(Infinity, Infinity);
  private localHeight = new LocalHeight();
  private forestTex = forestTexture();
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
  readonly paths = new Paths();
  private pathIn = 0;
  private syncedAt = new THREE.Vector2();
  private hearIn = 0;
  private hear = { stream: 0, pond: 0, canopy: 0 };
  /** What is underfoot, for footsteps. */
  surface: 'grass' | 'leaves' | 'path' | 'water' | 'snow' | 'stone' = 'grass';
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
  private v2 = new THREE.Vector2();
  private fwd = new THREE.Vector3();
  private pulse: THREE.Mesh;
  private pulseT = 9;
  /** ?stats: a small overlay for tuning on real devices. */
  private stats = new URLSearchParams(location.search).has('stats') ? this.makeStats() : null;
  private makeStats() {
    const el = document.createElement('pre');
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;margin:0;padding:6px 8px;font:11px/1.35 ui-monospace,monospace;color:#cfe;background:rgba(0,0,0,.55);border-radius:6px;pointer-events:none';
    document.body.appendChild(el);
    let acc = 0, n = 0, worst = 0;
    return (raw: number) => {
      acc += raw;
      n++;
      worst = Math.max(worst, raw);
      if (acc < 0.5) return;
      const info = this.renderer.info.render;
      const gl = this.renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      el.textContent = [
        `${(n / acc).toFixed(0)} fps · avg ${((acc / n) * 1000).toFixed(1)} ms · worst ${(worst * 1000).toFixed(0)} ms`,
        `${info.calls} draws · ${(info.triangles / 1000).toFixed(0)}k tris `,
        `quality ${this.quality} · res ×${this.resScale.toFixed(2)} · ${this.renderer.getPixelRatio().toFixed(2)} dpr`,
        dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).slice(0, 48) : '',
      ].join('\n');
      acc = n = worst = 0;
    };
  }

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
    // Count a whole frame (scene, shafts, composite) for the stats overlay.
    this.renderer.info.autoReset = false;
    this.quality = detectQuality(this.renderer);
    this.post = new Post(this.quality);
    LIGHT.uA2C.value = this.quality === 'low' ? 0 : 1;
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
    const [gd, gn, ga, ld, dd, pd] = await Promise.all([
      tex('forrest_ground_01_diffuse', true),
      tex('forrest_ground_01_nor_gl', false),
      tex('forrest_ground_01_arm', false),
      tex('leaves_forest_ground_diffuse', true),
      tex('dirt_floor_diffuse', true),
      tex('dry_river_pebbles_diffuse', true),
    ]);
    const daysAway = Math.max(0, (Date.now() - this.save.lastSeen) / 864e5);
    this.paths.load(this.save.paths, daysAway);
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
      s.uniforms.uWorldMask = { value: this.paths.texture };
      s.uniforms.uDirt = { value: dd };
      s.uniforms.uPebble = { value: pd };
      s.uniforms.uForest = { value: this.forestTex };
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWuv;')
        .replace('#include <common>', '#include <common>\nvarying vec2 vLuv;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\nvWuv = position.xz / ${WORLD.toFixed(1)} + .5;\nvLuv = position.xz / ${LAND.toFixed(1)} + .5;`);
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWuv, vLuv;\nuniform sampler2D uLitter, uMask, uWorldMask, uDirt, uPebble, uForest;\nuniform vec4 uSeason;\nuniform float uSnow, uWet;')
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
           // In the wild woods the floor is leaf litter, and the canopy keeps it in shade.
           float wood = texture2D(uForest, vLuv).r;
           m = max(m, smoothstep(.25, .7, wood + (g1.g - .25) * .5));
           // Autumn spreads leaf litter beyond the trees; seasons tint the meadow.
           float fall = uSeason.z * .45 + uSeason.w * .25;
           m = max(m, fall * smoothstep(.35, .75, macro + g1.r * .4));
           vec3 tint = uSeason.x * vec3(.95, 1.06, .85) + uSeason.y * vec3(1.06, 1.0, .8) + uSeason.z * vec3(1.1, .92, .7) + uSeason.w * vec3(.9, .88, .84);
           diffuseColor *= mix(grassC * vec4(tint, 1.), litterC * vec4(.8, .78, .7, 1.), m * .8);
           // Trodden paths: bare earth with a ragged edge where you walk most.
           vec4 wm = texture2D(uWorldMask, vWuv);
           float worn = smoothstep(.2, .55, wm.r + (macro - .5) * .35 + (g1.g - .3) * .3);
           vec3 dirt = mix(texture2D(uDirt, vMapUv * .9).rgb, texture2D(uDirt, vMapUv * .21 + .3).rgb, .35);
           diffuseColor.rgb = mix(diffuseColor.rgb, dirt * vec3(.74, .7, .66), worn * .9);
           // Stream and pond beds: pebbles and dark wet mud, wet banks around them.
           float bed = smoothstep(.15, .6, wm.g);
           vec3 peb = texture2D(uPebble, vMapUv * 1.4).rgb;
           diffuseColor.rgb = mix(diffuseColor.rgb, peb * vec3(.55, .52, .45), bed);
           float bank = smoothstep(.0, .2, wm.g) * (1. - bed);
           diffuseColor.rgb *= 1. - bank * .35;
           // Rain darkens the ground; snow lies in drifts, thinner under trees.
           diffuseColor.rgb *= 1. - uWet * .32;
           float drift = smoothstep(.25, .6, uSnow * (1.15 - m * .5) + (macro - .45) * .6);
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .9, .96), drift);
           diffuseColor.rgb *= 1. - smoothstep(.3, .95, wood) * .38;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           roughnessFactor = mix(roughnessFactor, .62, max(uWet * .6, smoothstep(.0, .3, texture2D(uWorldMask, vWuv).g) * .5));`,
        );
    };
    this.land = new Land(ground);
    this.scene.add(this.land.group);
    this.localHeight.follow(this.pos.x, this.pos.z);

    const hTex = heightTexture();
    await this.forest.load(this.localHeight, this.forestTex, aniso, (p) => progress(0.25 + p * 0.65, 'Growing the forest'));
    this.forest.setWorldMask(this.paths.texture);
    this.forest.setGrassDensity(this.quality === 'low' ? 0.4 : this.quality === 'medium' ? 0.7 : 1);
    this.scene.add(new Water(this.sky, hTex).group);
    await this.nearTrees.load(this.forest.speciesList, aniso);
    await this.fauna.load();
    this.fauna.onSing = (sp, at) => this.audio.song(sp, at, this.camera);
    this.scene.add(this.forest.group, this.nearTrees.group, this.life.group, this.fauna.group);

    this.sun.castShadow = true;
    // Shadow detail and how many trees are drawn in full scale with the device.
    const shadow = this.quality === 'low' ? 1024 : 2048;
    this.sun.shadow.mapSize.set(shadow, shadow);
    this.nearTrees.range = this.quality === 'low' ? 0.65 : this.quality === 'medium' ? 0.85 : 1;
    this.nearTrees.cap = this.quality === 'low' ? 10 : this.quality === 'medium' ? 16 : 24;
    // How far the land and its woods are drawn; the fog hides what lies beyond.
    this.land.radius = this.quality === 'low' ? 340 : this.quality === 'medium' ? 420 : 500;
    this.forest.wildRadius = this.quality === 'low' ? 210 : this.quality === 'medium' ? 270 : 330;
    progress(0.92, 'Laying out the land');
    this.land.plan(this.pos.x, this.pos.z);
    this.landAt.set(this.pos.x, this.pos.z);
    this.land.build(Infinity);
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
    this.forest.sync(this.save.trees, this.pos);
    this.syncedAt.set(this.pos.x, this.pos.z);
    this.life.setForest(this.save.trees, this.forest, this.sky.night > 0.5);
    this.wasNight = this.sky.night > 0.5;
    this.fauna.setForest(this.save.trees);
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
      // Not in the water, nor on its very edge.
      if (waterAt(x, z) !== null || waterAt(x + 1.2, z) !== null || waterAt(x - 1.2, z) !== null || waterAt(x, z + 1.2) !== null || waterAt(x, z - 1.2) !== null) continue;
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
    this.ev.toast(Math.hypot(this.pos.x, this.pos.z) > GARDEN_RADIUS - 2 ? 'Your trees grow in the home clearing. Walk back toward it to plant.' : 'No room right here. Walk to a clearer spot and try again.');
    return false;
  }

  remove(id: number) {
    this.save.trees = this.save.trees.filter((t) => t.id !== id);
    this.refresh();
    this.ev.change();
    this.store();
  }

  private store() {
    this.save.paths = this.paths.encode();
    this.save.px = this.pos.x;
    this.save.pz = this.pos.z;
    this.save.yaw = this.yaw;
    writeSave(this.save);
  }

  // ---------------------------------------------------------------- input
  setMove(x: number, y: number) {
    this.moveX = x;
    this.moveY = y;
    // Taking the stick hands control back from a guided walk.
    if (this.tour && Math.hypot(x, y) > 0.25) this.endTour(true);
  }

  // ---------------------------------------------------------- guided walks
  private tour: {
    stops: TreeSave[];
    i: number;
    dwell: number;
    arrived: boolean;
    stuck: number;
    detour: number;
    from: THREE.Vector2;
    arrive: (t: TreeSave, i: number, n: number) => void;
    done: (interrupted: boolean) => void;
  } | null = null;

  /** Walk the player past each tree in turn, pausing at each one. */
  startTour(stops: TreeSave[], arrive: (t: TreeSave, i: number, n: number) => void, done: (interrupted: boolean) => void) {
    this.endTour(true);
    if (!stops.length) return;
    this.tour = { stops, i: 0, dwell: 0, arrived: false, stuck: 0, detour: 0, from: new THREE.Vector2(this.pos.x, this.pos.z), arrive, done };
  }
  /** Walking right now (for the HUD to step aside). */
  get moving() {
    return this.vel.length() > 0.35;
  }
  /** Within the home clearing, where trees can be planted. */
  get inClearing() {
    return Math.hypot(this.pos.x, this.pos.z) < GARDEN_RADIUS + 2;
  }
  /** Metres from the middle of the clearing. */
  get fromHome() {
    return Math.hypot(this.pos.x, this.pos.z);
  }

  get touring() {
    return !!this.tour;
  }
  /** Skip to the next stop of a guided walk. */
  nextStop() {
    if (this.tour) this.tour.dwell = 0.01;
  }
  endTour(interrupted = false) {
    const t = this.tour;
    this.tour = null;
    if (t) t.done(interrupted);
  }

  /** Steer the walk toward the current stop; returns stick input. */
  private steer(dt: number): [number, number] {
    const t = this.tour!;
    const tree = t.stops[t.i];
    const dx = tree.x - this.pos.x, dz = tree.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const turnTo = (target: number, rate: number) => {
      let a = target - this.yaw;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      this.yaw += a * Math.min(1, dt * rate);
    };
    const stand = 2.4 + MOOD_BY_ID[tree.mood].height * 0.12;
    if (t.arrived) {
      // Stand and look up into the tree.
      turnTo(Math.atan2(-dx, -dz), 2.5);
      this.pitch += (0.22 - this.pitch) * Math.min(1, dt * 1.5);
      t.dwell -= dt;
      if (t.dwell <= 0) {
        t.i++;
        t.arrived = false;
        if (t.i >= t.stops.length) this.endTour(false);
      }
      return [0, 0];
    }
    if (d < stand) {
      t.arrived = true;
      t.dwell = 9;
      t.arrive(tree, t.i, t.stops.length);
      return [0, 0];
    }
    // Every second and a half, check we are getting somewhere; if not, step around.
    t.stuck += dt;
    if (t.stuck > 1.5) {
      const moved = t.from.distanceTo(new THREE.Vector2(this.pos.x, this.pos.z));
      if (moved < 0.6) t.detour = 1.4;
      t.from.set(this.pos.x, this.pos.z);
      t.stuck = 0;
    }
    let want = Math.atan2(-dx, -dz);
    if (t.detour > 0) {
      t.detour -= dt;
      want += 1.1;
    }
    turnTo(want, 2.2);
    this.pitch += (-0.04 - this.pitch) * Math.min(1, dt * 1.2);
    // A long way home is taken at a jog.
    return [0, d < stand + 3 ? 0.45 : d > 40 ? 1 : 0.8];
  }

  // ----------------------------------------------------------------- photo
  /** Render a clean frame and return it as a JPEG data URL. */
  capture(): string {
    this.draw();
    return this.canvas.toDataURL('image/jpeg', 0.92);
  }
  /** Where the walker is and which way they face, for the map. */
  get whereabouts() {
    return { x: this.pos.x, z: this.pos.z, yaw: this.yaw };
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
    const cap = this.quality === 'low' ? 1.5 : this.quality === 'medium' ? 1.75 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap) * this.resScale);
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
    if (this.tour) [x, y] = this.steer(dt);
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
    const bump = (t: TreeSave, r: number) => {
      const dx = nx - t.x, dz = nz - t.z;
      const d = Math.hypot(dx, dz);
      if (d < r && d > 1e-4) {
        nx = t.x + (dx / d) * r;
        nz = t.z + (dz / d) * r;
      }
    };
    for (const t of this.save.trees) bump(t, 0.25 + 0.3 * Math.min(1, t.growth));
    // Wild trunks too: you weave between them rather than through them.
    for (const t of this.forest.nearWild) bump(t, (t.mood === 'hope' ? 0.3 : t.mood === 'sorrow' ? 0.8 : 0.45) * Math.min(1.8, t.size ?? 1));
    // The land rises into mountains at its edge: slopes too steep to climb stop you there.
    const step = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    if (step > 1e-4) {
      const rise = (heightAt(nx, nz) - heightAt(this.pos.x, this.pos.z)) / step;
      if (rise > 0.85) {
        nx = this.pos.x;
        nz = this.pos.z;
      }
    }
    // Wade the stream and the pond's shallows; deeper water turns you back.
    if (waterDepth(nx, nz) > 0.55) {
      if (waterDepth(nx, this.pos.z) <= 0.55) nz = this.pos.z;
      else if (waterDepth(this.pos.x, nz) <= 0.55) nx = this.pos.x;
      else {
        nx = this.pos.x;
        nz = this.pos.z;
      }
    }
    // A last guard behind the mountains, which should already have turned you.
    const R = Math.hypot(nx, nz);
    const limit = LAND_LIMIT;
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
      if (Math.floor(this.stepPhase) !== before) {
        this.surface = this.surfaceAt(nx, nz);
        this.audio.footstep(this.surface, v > 3);
        if (this.surface !== 'water') this.paths.step(nx, nz);
      }
      if (this.save.tutorial < 1 && this.stepPhase > 6) {
        this.save.tutorial = 1;
        this.ev.change();
      }
    }
  }

  faunaContext() {
    const c = this.clock;
    const [rise, set] = c.daylightHours;
    const bell = (h: number, centre: number, w: number) => Math.max(0, 1 - Math.abs(((h - centre + 36) % 24) - 12) / w);
    return {
      walker: this.pos,
      walkerSpeed: this.vel.length(),
      hour: c.hour,
      day: c.day,
      dawn: bell(c.hour, rise + 0.6, 1.6),
      dusk: bell(c.hour, set + 0.2, 1.6),
      rain: c.weather.rain,
      trees: this.save.trees,
    };
  }

  /** What the ground is like here, for footsteps. */
  private surfaceAt(x: number, z: number): World['surface'] {
    if (waterDepth(x, z) > 0.03) return 'water';
    if (this.snowCover > 0.45) return 'snow';
    if (this.paths.at(x, z) > 0.35) return 'path';
    if (Math.hypot(x - HILL.x, z - HILL.z) < 2.2) return 'stone';
    for (const t of this.save.trees) {
      const reach = 1.2 + MOOD_BY_ID[t.mood].height * 0.35 * Math.min(1, t.growth);
      if (Math.hypot(t.x - x, t.z - z) < reach) return 'leaves';
    }
    return this.clock.season.autumn > 0.5 ? 'leaves' : 'grass';
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
    this.renderer.info.reset();
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
    this.sky.mesh.position.copy(this.camera.position);
    // Ground streams in around you; grass follows on its own little height map.
    if (this.landAt.distanceTo(this.v2.set(this.pos.x, this.pos.z)) > 24) {
      this.landAt.set(this.pos.x, this.pos.z);
      this.land.plan(this.pos.x, this.pos.z);
    }
    this.land.build(2);
    this.localHeight.follow(this.pos.x, this.pos.z);

    // Shadows follow the walker in texel-sized steps so they never swim.
    const texel = 60 / this.sun.shadow.mapSize.x;
    this.sun.target.position.set(Math.round(this.pos.x / texel) * texel, this.pos.y, Math.round(this.pos.z / texel) * texel);
    this.sun.position.copy(this.sun.target.position).addScaledVector(LIGHT.uSunDir.value, 110);
    this.sun.target.updateMatrixWorld();

    this.forest.setFocus(this.pos);
    // The understory follows you round a big grove.
    if (this.syncedAt.distanceTo(this.v2.set(this.pos.x, this.pos.z)) > 12) this.refresh();
    this.pathIn -= dt;
    if (this.pathIn <= 0) {
      this.pathIn = 2;
      this.paths.flush();
    }
    this.nearTrees.update(this.forest.speciesList, this.camera.position);
    this.fauna.update(dt, this.time, this.faunaContext());
    // Big animals appear in the menu only once their models are installed, and count once seen.
    for (const c of this.life.creatures) {
      if (c.id === 'perching') c.here = this.fauna.welcome.perching;
      if (c.id === 'deer' || c.id === 'fox') {
        c.hidden = !this.fauna.available[c.id];
        c.here = this.fauna.seen[c.id];
      }
    }
    const arrivals = this.life.update(dt, this.time, this.camera, this.pos);
    for (const a of arrivals) this.ev.met(a);

    const grown = this.grown;
    // Where sound comes from: water nearby, canopy overhead. Sampled a few times a second.
    this.hearIn -= dt;
    if (this.hearIn <= 0) {
      this.hearIn = 0.25;
      const sn = streamNearest(this.pos.x, this.pos.z);
      this.hear.stream = Math.max(0, 1 - Math.max(0, sn.d - 1.5) / 22);
      this.hear.pond = Math.min(1, Math.max(0, pondShape(this.pos.x, this.pos.z) + 0.9));
      let cover = 0;
      for (const t of this.forest.nearWild) {
        const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
        if (d < 14) cover += (1 - d / 14) * 0.5;
      }
      for (const t of this.save.trees) {
        const reach = 2 + MOOD_BY_ID[t.mood].height * 0.45 * Math.min(1, t.growth);
        const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
        if (d < reach * 2) cover += (1 - d / (reach * 2)) * Math.min(1, t.growth);
      }
      this.hear.canopy = Math.min(1, cover / 3);
    }
    this.camera.getWorldDirection(this.fwd);
    this.audio.listen(this.camera.position, this.fwd);
    const fc = this.faunaContext();
    const w = this.clock.weather;
    this.audio.update(dt, {
      hour: this.clock.hour,
      day: this.clock.day,
      dawn: fc.dawn,
      dusk: fc.dusk,
      vitality: grown >= 4 ? 1 : grown >= 2 ? 0.4 : 0,
      rain: w.rain,
      snow: w.snow,
      wind: w.wind,
      stream: this.hear.stream,
      pond: this.hear.pond,
      canopy: this.hear.canopy,
      speed: this.vel.length(),
      life: Math.min(1, grown / 6),
      season: this.clock.season.name,
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
    this.stats?.(raw);

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

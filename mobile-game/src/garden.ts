// The floating garden: scene, touch gestures, growth simulation and effects.

import * as THREE from 'three';
import type { AudioEngine } from './audio';
import { MOODS, MOOD_BY_ID, type MoodId } from './moods';
import { buildPlants, buildTile, type PlantLibrary } from './plants';
import {
  GROW_SECONDS, HEX_DIRS, MAX_RADIUS, MOTE_CAP, MOTE_SECONDS, WATER_BOOST, WATER_COOLDOWN, WATER_SECONDS,
  hexDist, key, tileCost, writeSave, type Save, type TileSave,
} from './state';

export interface GardenEvents {
  /** Light was collected at a screen position (CSS pixels). */
  light: (amount: number, x: number, y: number, css: string) => void;
  toast: (text: string) => void;
  /** Something the HUD shows has changed. */
  change: () => void;
  emptyTile: (t: Tile) => void;
  plantCard: (t: Tile) => void;
}

export interface Tile {
  save: TileSave;
  group: THREE.Group;
  mesh: THREE.Mesh;
  plant: THREE.Mesh | null;
  motes: THREE.Sprite[];
  restY: number;
  phase: number;
  rise: number;
  pop: number;
  popVel: number;
  waterT: number;
  waterCd: number;
}

const SQ3 = Math.sqrt(3);
const hexPos = (q: number, r: number, out: THREE.Vector3) => out.set(SQ3 * (q + r / 2), 0, 1.5 * r);
const hash = (q: number, r: number) => {
  const x = Math.sin(q * 127.1 + r * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const easeOutBack = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Sky keyframes through the (real, local) day.
interface Pal { h: number; top: number; mid: number; bot: number; sun: number; si: number; hi: number; night: number }
const PALS: Pal[] = [
  { h: 0, top: 0x1a2764, mid: 0x3d4f93, bot: 0x1e2a50, sun: 0xa9bcff, si: 2.3, hi: 2.6, night: 1 },
  { h: 5, top: 0x1d2b6a, mid: 0x44569b, bot: 0x222e58, sun: 0xa9bcff, si: 2.3, hi: 2.6, night: 1 },
  { h: 6.6, top: 0x3a4f8a, mid: 0xf7a97f, bot: 0x7d7aa3, sun: 0xffb27a, si: 2.6, hi: 1.7, night: 0.25 },
  { h: 9, top: 0x3c8be0, mid: 0xa9d8f5, bot: 0xdaeefb, sun: 0xfff3dc, si: 3.6, hi: 2.4, night: 0 },
  { h: 16, top: 0x3a86dc, mid: 0xaedaf5, bot: 0xdff0fb, sun: 0xfff0d2, si: 3.6, hi: 2.4, night: 0 },
  { h: 18.6, top: 0x2c3a78, mid: 0xff8f62, bot: 0x8a6490, sun: 0xff9a5c, si: 2.6, hi: 1.7, night: 0.3 },
  { h: 20.4, top: 0x1d2b6a, mid: 0x44569b, bot: 0x222e58, sun: 0xa9bcff, si: 2.3, hi: 2.6, night: 1 },
  { h: 24, top: 0x1a2764, mid: 0x3d4f93, bot: 0x1e2a50, sun: 0xa9bcff, si: 2.3, hi: 2.6, night: 1 },
];

function glowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

/** Tiny CPU particle pool for droplets, sparks, dust and fireflies. */
class Fx {
  readonly points: THREE.Points;
  private n = 360;
  private pos = new Float32Array(this.n * 3);
  private col = new Float32Array(this.n * 4);
  private size = new Float32Array(this.n);
  private vel = new Float32Array(this.n * 3);
  private life = new Float32Array(this.n);
  private max = new Float32Array(this.n).fill(1);
  private base = new Float32Array(this.n);
  private grav = new Float32Array(this.n);
  private cursor = 0;
  readonly px = { value: 600 };
  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPx: this.px },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aColor; attribute float aSize; uniform float uPx; varying vec4 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPx / max(-mv.z, .1); vC = aColor; }`,
      fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord - .5) * 2.;
        float a = pow(max(1. - d, 0.), 2.); gl_FragColor = vec4(vC.rgb * a * vC.a, a * vC.a); }`,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
  }
  emit(p: THREE.Vector3, color: THREE.Color, o: { count?: number; speed?: number; up?: number; life?: number; size?: number; gravity?: number; spread?: number } = {}) {
    const { count = 10, speed = 1.5, up = 1, life = 1, size = 0.2, gravity = -3, spread = 0.2 } = o;
    for (let i = 0; i < count; i++) {
      const k = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.7);
      this.pos[k * 3] = p.x + (Math.random() - 0.5) * spread;
      this.pos[k * 3 + 1] = p.y + (Math.random() - 0.5) * spread * 0.5;
      this.pos[k * 3 + 2] = p.z + (Math.random() - 0.5) * spread;
      this.vel[k * 3] = Math.cos(a) * sp;
      this.vel[k * 3 + 1] = up * (0.5 + Math.random() * 0.7);
      this.vel[k * 3 + 2] = Math.sin(a) * sp;
      this.life[k] = this.max[k] = life * (0.6 + Math.random() * 0.6);
      this.base[k] = size * (0.6 + Math.random() * 0.7);
      this.grav[k] = gravity;
      this.col[k * 4] = color.r;
      this.col[k * 4 + 1] = color.g;
      this.col[k * 4 + 2] = color.b;
    }
  }
  update(dt: number) {
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) {
        this.size[k] = 0;
        continue;
      }
      this.life[k] -= dt;
      const t = Math.max(0, this.life[k] / this.max[k]);
      this.vel[k * 3 + 1] += this.grav[k] * dt;
      this.pos[k * 3] += this.vel[k * 3] * dt;
      this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt;
      this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      this.col[k * 4 + 3] = Math.min(1, t * 3) * Math.min(1, (1 - t) * 8);
      this.size[k] = this.base[k];
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.aColor.needsUpdate = a.aSize.needsUpdate = true;
  }
}

export class Garden {
  readonly tiles = new Map<string, Tile>();
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.5, 400);
  private canvas: HTMLCanvasElement;
  private save: Save;
  private audio: AudioEngine;
  private ev: GardenEvents;
  private lib: PlantLibrary = buildPlants();
  private mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.86, metalness: 0 });
  private glowTex = glowTexture();
  private fx = new Fx();
  private sun = new THREE.DirectionalLight(0xffffff, 3);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 2);
  private sky: THREE.Mesh;
  private skyU = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() } };
  private stars: THREE.Points;
  private clouds: THREE.Mesh[] = [];
  private ghosts = new Map<string, THREE.Mesh>();
  private ghostFill = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false });
  private ghostGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.08, 6);
  private rainbow = new THREE.Group();
  private rainbowAmt = 0;
  private pickables: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private v = new THREE.Vector3();
  private c = new THREE.Color();
  private yaw = 0.6;
  private yawVel = 0;
  private pitch = 0.6;
  private zoom = 1;
  private fit = 12;
  private fitNow = 12;
  private idle = 0;
  private time = 0;
  private last = 0;
  private night = 0;
  private saveIn = 5;
  private raining = 0;
  private running = false;
  private fixedHour: number | null;
  /** Pauses growth and input while the title card is up. */
  active = false;
  /** Turned off when the player wipes their garden, so nothing writes it back. */
  persist = true;

  constructor(canvas: HTMLCanvasElement, save: Save, audio: AudioEngine, ev: GardenEvents) {
    this.canvas = canvas;
    this.save = save;
    this.audio = audio;
    this.ev = ev;
    const qs = new URLSearchParams(location.search);
    this.fixedHour = qs.has('hour') ? parseFloat(qs.get('hour')!) : null;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Sky dome with a three-stop gradient and a soft sun glow.
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(180, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyU,
        vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `varying vec3 vD; uniform vec3 uTop, uMid, uBot, uSun, uSunCol;
          void main(){ vec3 d = normalize(vD);
            vec3 c = d.y > 0. ? mix(uMid, uTop, pow(d.y, .55)) : mix(uMid, uBot, pow(-d.y, .5));
            float s = max(dot(d, uSun), 0.);
            c += uSunCol * (pow(s, 24.) * .35 + pow(s, 400.) * 2.5);
            gl_FragColor = vec4(c, 1.); }`,
      }),
    );
    const sp = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = Math.random() * 0.9 + 0.05;
      const r = Math.sqrt(1 - y * y);
      sp.set([Math.cos(a) * r * 170, y * 170, Math.sin(a) * r * 170], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -9;
    sc.right = sc.top = 9;
    sc.near = 1;
    sc.far = 60;
    this.scene.fog = new THREE.Fog(0xffffff, 40, 150);
    this.scene.add(this.sky, this.stars, this.sun, this.sun.target, this.hemi, this.fx.points, this.rainbow);

    // Drifting clouds around and below the island.
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, flatShading: true, roughness: 1, fog: false });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.IcosahedronGeometry(1, 1);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const s = 1 + Math.sin(p.getX(k) * 3.1 + i) * 0.18 + Math.cos(p.getZ(k) * 2.7 + i * 2) * 0.18;
        p.setXYZ(k, p.getX(k) * s * 1.7, p.getY(k) * s * 0.55, p.getZ(k) * s * 1.1);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, cloudMat);
      m.userData = { a: (i / 9) * Math.PI * 2 + i, r: 20 + (i % 3) * 9, y: -7 + (i % 4) * 2.4 - (i % 2) * 2, s: 0.9 + (i % 3) * 0.5 };
      m.scale.setScalar(m.userData.s);
      this.clouds.push(m);
      this.scene.add(m);
    }

    // Rainbow: six nested arcs, earned by growing every feeling at once.
    MOODS.forEach((m, i) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(8.4 - i * 0.2, 0.1, 6, 48, Math.PI),
        new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0, depthWrite: false, fog: false }),
      );
      this.rainbow.add(arc);
    });
    this.rainbow.position.set(0, -2, -3);
    this.rainbow.visible = false;

    for (const t of save.tiles) this.addTile(t, false);
    this.refreshGhosts();
    this.refreshMusic();
    this.fitNow = this.fit;

    this.bindInput();
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.persist) writeSave(this.save);
    });
    window.addEventListener('pagehide', () => {
      if (this.persist) writeSave(this.save);
    });
    this.resize();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  // ---------------------------------------------------------------- tiles
  private addTile(save: TileSave, animate: boolean): Tile {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(buildTile(save.q * 31 + save.r * 17 + 5), this.mat);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    hexPos(save.q, save.r, group.position);
    const restY = (hash(save.q, save.r) - 0.5) * 0.36 - hexDist(save.q, save.r) * 0.06;
    const t: Tile = { save, group, mesh, plant: null, motes: [], restY, phase: hash(save.r, save.q) * 6.28, rise: animate ? 0 : 1, pop: 0, popVel: 0, waterT: 0, waterCd: 0 };
    mesh.userData.tile = t;
    this.tiles.set(key(save.q, save.r), t);
    this.scene.add(group);
    this.pickables.push(mesh);
    if (save.plant) this.rebuildPlant(t);
    return t;
  }

  /** Empty frontier slots the player can raise land into. */
  private refreshGhosts() {
    const want = new Set<string>();
    for (const t of this.tiles.values()) {
      for (const [dq, dr] of HEX_DIRS) {
        const q = t.save.q + dq;
        const r = t.save.r + dr;
        if (hexDist(q, r) <= MAX_RADIUS && !this.tiles.has(key(q, r))) want.add(key(q, r));
      }
    }
    for (const [k, g] of this.ghosts) {
      if (!want.has(k)) {
        this.scene.remove(g);
        this.pickables.splice(this.pickables.indexOf(g), 1);
        this.ghosts.delete(k);
      }
    }
    for (const k of want) {
      if (this.ghosts.has(k)) continue;
      const [q, r] = k.split(',').map(Number);
      const g = new THREE.Mesh(this.ghostGeo, this.ghostFill);
      hexPos(q, r, g.position);
      g.position.y = -0.25;
      g.userData.ghost = { q, r };
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(this.ghostGeo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })));
      this.ghosts.set(k, g);
      this.scene.add(g);
      this.pickables.push(g);
    }
    let far = 1;
    for (const t of this.tiles.values()) far = Math.max(far, hexDist(t.save.q, t.save.r));
    this.fit = (Math.min(MAX_RADIUS, far + 1) * 1.75 + 1.6) * 1.0;
  }

  get nextCost() {
    return tileCost(this.tiles.size);
  }
  get canGrowIsland() {
    return this.ghosts.size > 0;
  }
  get firstEmpty(): Tile | null {
    let best: Tile | null = null;
    for (const t of this.tiles.values()) {
      if (!t.save.plant && (!best || hexDist(t.save.q, t.save.r) < hexDist(best.save.q, best.save.r))) best = t;
    }
    return best;
  }

  private tryRaise(q: number, r: number, sx: number, sy: number) {
    const cost = this.nextCost;
    if (this.save.light < cost) {
      this.ev.toast(`New land needs ${cost} light — you have ${this.save.light}.`);
      this.audio.ui('close');
      return;
    }
    this.save.light -= cost;
    const ts: TileSave = { q, r };
    this.save.tiles.push(ts);
    const t = this.addTile(ts, true);
    this.refreshGhosts();
    this.audio.land(0.9);
    this.audio.deliver(this.tiles.size % 6);
    navigator.vibrate?.([12, 40, 18]);
    this.save.coach = Math.max(this.save.coach, 4);
    this.ev.light(-cost, sx, sy, '#f3d9a4');
    this.ev.change();
    hexPos(q, r, this.v);
    this.fx.emit(this.v, this.c.set(0xfff1c9), { count: 26, speed: 2.4, up: 2.5, life: 1.2, size: 0.26, gravity: -2, spread: 1.2 });
    if (this.tiles.size === 19) this.ev.toast('A whole island, grown from feelings.');
    void t;
    writeSave(this.save);
  }

  // --------------------------------------------------------------- plants
  private rebuildPlant(t: Tile) {
    if (t.plant) {
      t.group.remove(t.plant);
      this.pickables.splice(this.pickables.indexOf(t.plant), 1);
      t.plant = null;
    }
    const p = t.save.plant;
    if (!p) return;
    const mature = p.growth >= 0.2;
    const mesh = new THREE.Mesh(mature ? this.lib.species[p.mood] : this.lib.sprout, this.mat);
    mesh.castShadow = true;
    mesh.rotation.y = hash(t.save.q + 3, t.save.r - 2) * 6.28;
    mesh.userData.tile = t;
    mesh.userData.species = mature;
    t.plant = mesh;
    t.group.add(mesh);
    this.pickables.push(mesh);
  }

  plant(t: Tile, mood: MoodId, note: string) {
    if (t.save.plant) return;
    t.save.plant = { mood, note: note.trim().slice(0, 120), planted: Date.now(), growth: 0, motes: 0, moteClock: 0 };
    this.rebuildPlant(t);
    t.popVel = 7;
    const def = MOOD_BY_ID[mood];
    this.v.copy(t.group.position).y += 0.3;
    this.fx.emit(this.v, this.c.set(def.soft), { count: 22, speed: 1.6, up: 2.4, life: 1.1, size: 0.22, gravity: -2.5 });
    this.audio.plantFeeling();
    navigator.vibrate?.(14);
    if (this.save.coach < 1) this.save.coach = 1;
    this.ev.change();
    writeSave(this.save);
  }

  water(t: Tile): boolean {
    const p = t.save.plant;
    if (!p || p.growth >= 1 || t.waterCd > 0) return false;
    t.waterT = WATER_SECONDS;
    t.waterCd = WATER_COOLDOWN;
    t.popVel = 4;
    this.v.copy(t.group.position).y += 2.4;
    this.fx.emit(this.v, this.c.set(0x9fd4ff), { count: 28, speed: 0.5, up: -1.5, life: 0.8, size: 0.16, gravity: -9, spread: 0.9 });
    this.audio.footstep('water', true);
    navigator.vibrate?.(8);
    if (this.save.coach < 2) this.save.coach = 2;
    this.ev.change();
    return true;
  }

  remove(t: Tile) {
    if (!t.save.plant) return;
    const def = MOOD_BY_ID[t.save.plant.mood];
    this.v.copy(t.group.position).y += 0.8;
    this.fx.emit(this.v, this.c.set(def.soft), { count: 30, speed: 1.2, up: 2.2, life: 1.6, size: 0.2, gravity: 0.6 });
    t.save.plant = undefined;
    this.rebuildPlant(t);
    for (const s of t.motes) s.visible = false;
    this.audio.ui('close');
    this.refreshMusic();
    this.ev.change();
    writeSave(this.save);
  }

  /** How many different feelings grow next to this one (boosts its light). */
  harmony(t: Tile): number {
    const mine = t.save.plant?.mood;
    const seen = new Set<MoodId>();
    for (const [dq, dr] of HEX_DIRS) {
      const n = this.tiles.get(key(t.save.q + dq, t.save.r + dr))?.save.plant;
      if (n && n.mood !== mine) seen.add(n.mood);
    }
    return seen.size;
  }

  private matureMoods(): MoodId[] {
    const set = new Set<MoodId>();
    for (const t of this.tiles.values()) if (t.save.plant && t.save.plant.growth >= 1) set.add(t.save.plant.mood);
    return [...set];
  }
  private refreshMusic() {
    this.audio.setAwakened(this.matureMoods());
  }

  private collect(t: Tile) {
    const p = t.save.plant;
    if (!p || p.motes <= 0) return false;
    const def = MOOD_BY_ID[p.mood];
    for (let i = 0; i < p.motes; i++) {
      const s = t.motes[i];
      if (s) {
        s.getWorldPosition(this.v);
        this.fx.emit(this.v, this.c.set(def.soft), { count: 8, speed: 1.4, up: 1, life: 0.6, size: 0.2, gravity: 0 });
        const sp = this.toScreen(this.v);
        window.setTimeout(() => this.ev.light(1, sp.x, sp.y, def.css), i * 90);
      }
      window.setTimeout(() => this.audio.collect(), i * 90);
    }
    this.save.light += p.motes;
    p.motes = 0;
    navigator.vibrate?.(10);
    if (this.save.coach < 3) this.save.coach = 3;
    this.ev.change();
    return true;
  }

  private toScreen(p: THREE.Vector3) {
    const v = p.clone().project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  }

  // ---------------------------------------------------------------- input
  private bindInput() {
    const el = this.canvas;
    const pts = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>();
    let pinch = 0;
    let moved = false;
    let longTimer = 0;
    const clear = () => window.clearTimeout(longTimer);
    el.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
      this.idle = 0;
      this.yawVel = 0;
      if (pts.size === 1) {
        moved = false;
        clear();
        longTimer = window.setTimeout(() => {
          if (!moved && pts.size === 1) {
            moved = true; // consume: no tap on release
            this.longPress(e.clientX, e.clientY);
          }
        }, 480);
      } else {
        clear();
        moved = true;
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (Math.hypot(p.x - p.sx, p.y - p.sy) > 9) {
        moved = true;
        clear();
      }
      if (pts.size === 1 && moved) {
        this.yaw -= dx * 0.0075;
        this.yawVel = -dx * 0.0075 * 60;
        this.pitch = Math.min(1.15, Math.max(0.28, this.pitch + dy * 0.004));
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) this.zoom = Math.min(1.5, Math.max(0.62, this.zoom * (pinch / d)));
        pinch = d;
      }
    });
    const up = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      clear();
      if (p && !moved && performance.now() - p.t < 400) this.tap(e.clientX, e.clientY);
      if (pts.size < 2) pinch = 0;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', (e) => {
      pts.delete(e.pointerId);
      clear();
    });
    el.addEventListener('wheel', (e) => {
      this.zoom = Math.min(1.5, Math.max(0.62, this.zoom * (1 + Math.sign(e.deltaY) * 0.08)));
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private pick(x: number, y: number): THREE.Object3D | null {
    const r = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), this.camera);
    const hit = this.ray.intersectObjects(this.pickables, false)[0];
    return hit ? hit.object : null;
  }

  private tap(x: number, y: number) {
    // Motes first, with a generous finger-sized radius.
    let best: Tile | null = null;
    let bd = 52;
    for (const t of this.tiles.values()) {
      const n = t.save.plant?.motes ?? 0;
      for (let i = 0; i < n; i++) {
        const s = t.motes[i];
        if (!s || !s.visible) continue;
        const sp = this.toScreen(s.getWorldPosition(this.v));
        const d = Math.hypot(sp.x - x, sp.y - y);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
    }
    if (best) {
      this.collect(best);
      return;
    }
    const o = this.pick(x, y);
    if (!o) return;
    if (o.userData.ghost) {
      this.tryRaise(o.userData.ghost.q, o.userData.ghost.r, x, y);
      return;
    }
    const t = o.userData.tile as Tile | undefined;
    if (!t) return;
    if (!t.save.plant) {
      this.audio.ui('open');
      this.ev.emptyTile(t);
    } else if (this.collect(t)) {
      /* gathered */
    } else if (!this.water(t)) {
      this.audio.ui('click');
      this.ev.plantCard(t);
    }
  }

  private longPress(x: number, y: number) {
    const t = this.pick(x, y)?.userData.tile as Tile | undefined;
    if (t?.save.plant) {
      navigator.vibrate?.(16);
      this.audio.ui('click');
      this.ev.plantCard(t);
    }
  }

  // ----------------------------------------------------------------- loop
  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fx.px.value = (h * pr * 0.5) / Math.tan((this.camera.fov * Math.PI) / 360);
  };

  private atmosphere(dt: number) {
    const now = new Date();
    const hour = this.fixedHour ?? now.getHours() + now.getMinutes() / 60;
    let i = 0;
    while (i < PALS.length - 2 && PALS[i + 1].h <= hour) i++;
    const a = PALS[i];
    const b = PALS[i + 1];
    const k = smooth(a.h, b.h, hour);
    const mix = (x: number, y: number, into: THREE.Color) => into.set(x).lerp(this.c.set(y), k);
    mix(a.top, b.top, this.skyU.uTop.value);
    mix(a.mid, b.mid, this.skyU.uMid.value);
    mix(a.bot, b.bot, this.skyU.uBot.value);
    mix(a.sun, b.sun, this.sun.color);
    this.night = a.night + (b.night - a.night) * k;
    // Sorrow brings soft rain and a greyer sky; it is part of the garden, not a flaw in it.
    let sorrow = 0;
    let total = 0;
    for (const t of this.tiles.values()) {
      if (t.save.plant) {
        total++;
        if (t.save.plant.mood === 'sorrow') sorrow++;
      }
    }
    const wantRain = sorrow >= 2 && sorrow / total >= 0.34 ? 1 : 0;
    this.raining += (wantRain - this.raining) * Math.min(1, dt * 0.5);
    const grey = this.c.set(0x8d97a8);
    this.skyU.uTop.value.lerp(grey, this.raining * 0.45);
    this.skyU.uMid.value.lerp(grey, this.raining * 0.35);

    this.sun.intensity = (a.si + (b.si - a.si) * k) * (1 - this.raining * 0.35);
    this.hemi.intensity = a.hi + (b.hi - a.hi) * k;
    this.hemi.color.copy(this.skyU.uTop.value).lerp(this.skyU.uMid.value, 0.5);
    this.hemi.groundColor.copy(this.skyU.uBot.value).multiplyScalar(0.55);
    const ang = ((hour - 6) / 12) * Math.PI;
    const el = this.night > 0.5 ? 0.75 : Math.max(0.42, Math.sin(ang));
    const az = this.night > 0.5 ? 2.4 : ang;
    this.sun.position.set(Math.cos(az) * 14, el * 22, 9 - Math.cos(az) * 3);
    this.skyU.uSun.value.copy(this.sun.position).normalize();
    this.skyU.uSunCol.value.copy(this.sun.color).multiplyScalar(1 - this.raining * 0.7);
    (this.scene.fog as THREE.Fog).color.copy(this.skyU.uMid.value);
    (this.stars.material as THREE.PointsMaterial).opacity = this.night * 0.9 * (1 - this.raining);
    this.audio.update(dt, { day: 1 - this.night, vitality: Math.min(1, total / 5), shore: 0, rain: this.raining, speed: 0, gliding: false, life: Math.min(1, total / 8) });
  }

  private frame = (now: number) => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    const save = this.save;
    this.atmosphere(dt);

    // Camera: drag to orbit with inertia, slow auto-turn when left alone.
    this.idle += dt;
    this.yawVel *= Math.exp(-3 * dt);
    this.yaw += this.yawVel * dt * (this.idle > 0.05 ? 1 : 0) + (this.idle > 4 || !this.active ? 0.05 * dt : 0);
    this.fitNow += (this.fit - this.fitNow) * Math.min(1, dt * 1.5);
    const half = (this.camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(half) * this.camera.aspect);
    const dist = (this.fitNow / Math.sin(Math.min(half, hHalf))) * 0.6 * this.zoom;
    const cp = Math.cos(this.pitch);
    this.camera.position.set(Math.sin(this.yaw) * cp * dist, Math.sin(this.pitch) * dist + 0.4, Math.cos(this.yaw) * cp * dist);
    this.camera.lookAt(0, -0.2, 0);

    let allSix = 0;
    const affordable = save.light >= this.nextCost;
    for (const t of this.tiles.values()) {
      // Rise from below when new, then bob gently.
      if (t.rise < 1) t.rise = Math.min(1, t.rise + dt / 1.2);
      const rise = t.rise < 1 ? easeOutBack(t.rise) : 1;
      t.group.position.y = t.restY - (1 - rise) * 9 + Math.sin(this.time * 0.7 + t.phase) * 0.05;
      t.popVel += (-t.pop * 160 - t.popVel * 11) * dt;
      t.pop += t.popVel * dt;
      t.waterT = Math.max(0, t.waterT - dt);
      t.waterCd = Math.max(0, t.waterCd - dt);

      const p = t.save.plant;
      if (!p || !t.plant) continue;
      const def = MOOD_BY_ID[p.mood];
      if (this.active && p.growth < 1) {
        const before = p.growth;
        p.growth = Math.min(1, p.growth + (dt * (t.waterT > 0 ? WATER_BOOST : 1)) / GROW_SECONDS);
        if (before < 0.2 && p.growth >= 0.2) {
          this.rebuildPlant(t);
          t.popVel = 6;
          this.audio.ui('click');
        }
        if (p.growth >= 1) {
          save.matured++;
          t.popVel = 8;
          this.v.copy(t.group.position).y += 1;
          this.fx.emit(this.v, this.c.set(def.soft), { count: 36, speed: 2.2, up: 2.6, life: 1.4, size: 0.26, gravity: -1.5 });
          this.audio.deliver(save.matured % 6);
          this.refreshMusic();
          if (save.matured === 1) this.ev.toast(`Your ${def.plant} is fully grown. It will gather light for you.`);
          this.ev.change();
        }
        if (t.waterT > 0 && Math.random() < dt * 14) {
          this.v.copy(t.group.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 2.2, (Math.random() - 0.5) * 0.8));
          this.fx.emit(this.v, this.c.set(0x9fd4ff), { count: 1, speed: 0, up: -2, life: 0.5, size: 0.12, gravity: -9 });
        }
      } else if (this.active && p.motes < MOTE_CAP) {
        p.moteClock += dt * (1 + 0.25 * this.harmony(t));
        if (p.moteClock >= MOTE_SECONDS) {
          p.moteClock = 0;
          p.motes++;
          this.ev.change();
        }
      }
      if (p.growth >= 1) allSix |= 1 << MOODS.indexOf(def);

      const species = !!t.plant.userData.species;
      const g = species ? (p.growth - 0.2) / 0.8 : p.growth / 0.2;
      const s = (species ? 0.32 + 0.68 * (1 - Math.pow(1 - g, 2)) : 0.7 + 0.6 * g) * (1 + t.pop * 0.25);
      t.plant.scale.set(s * (1 - t.pop * 0.12), s, s * (1 - t.pop * 0.12));
      t.plant.rotation.z = Math.sin(this.time * 1.3 + t.phase) * 0.035;
      t.plant.rotation.x = Math.cos(this.time * 1.1 + t.phase) * 0.03;

      // Light waiting to be gathered hovers above the plant.
      const top = this.lib.height[p.mood] * s + 0.35;
      for (let i = 0; i < MOTE_CAP; i++) {
        let sp = t.motes[i];
        if (i >= p.motes) {
          if (sp) sp.visible = false;
          continue;
        }
        if (!sp) {
          sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
          t.motes[i] = sp;
          t.group.add(sp);
        }
        sp.visible = true;
        sp.material.color.set(def.color).lerp(this.c.set(0xffffff), 0.25);
        const a = this.time * 1.2 + i * 2.1 + t.phase;
        sp.position.set(Math.cos(a) * 0.32, top + i * 0.12 + Math.sin(a * 1.7) * 0.08, Math.sin(a) * 0.32);
        sp.scale.setScalar(0.62 + Math.sin(this.time * 4 + i) * 0.06);
      }
      // Fireflies after dark.
      if (this.night > 0.5 && p.growth >= 1 && Math.random() < dt * 0.5) {
        this.v.copy(t.group.position).add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.4 + Math.random() * 1.4, (Math.random() - 0.5) * 1.4));
        this.fx.emit(this.v, this.c.set(0xd8ff7a), { count: 1, speed: 0.25, up: 0.15, life: 3.2, size: 0.13, gravity: 0 });
      }
    }

    if (this.raining > 0.05) {
      for (let i = 0; i < 3; i++) {
        if (Math.random() > this.raining) continue;
        this.v.set((Math.random() - 0.5) * 12, 6, (Math.random() - 0.5) * 12);
        this.fx.emit(this.v, this.c.set(0x9fb8e8), { count: 1, speed: 0, up: -7, life: 0.9, size: 0.09, gravity: -6 });
      }
    }

    // Rainbow once every feeling is fully grown at the same time.
    if (allSix === 63 && !save.rainbow) {
      save.rainbow = true;
      this.audio.awaken(true);
      this.ev.toast('All six feelings, growing side by side. A rainbow settles over your garden.');
      this.ev.change();
    }
    this.rainbowAmt += ((save.rainbow ? 1 : 0) - this.rainbowAmt) * Math.min(1, dt * 0.4);
    this.rainbow.visible = this.rainbowAmt > 0.01;
    this.rainbow.children.forEach((m) => (((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = this.rainbowAmt * (0.62 - this.night * 0.3)));

    for (const g of this.ghosts.values()) {
      g.position.y = -0.25 + Math.sin(this.time * 1.4 + g.position.x) * 0.05;
      g.visible = this.active;
    }
    this.ghostFill.opacity = affordable ? 0.2 + Math.sin(this.time * 3) * 0.1 : 0.06;
    this.ghostFill.color.set(affordable ? 0xfff1c9 : 0xffffff);

    for (const c of this.clouds) {
      const u = c.userData;
      u.a += dt * 0.012 * (1 + u.s * 0.2);
      c.position.set(Math.cos(u.a) * u.r, u.y, Math.sin(u.a) * u.r);
    }
    this.fx.update(dt);
    this.renderer.render(this.scene, this.camera);

    this.saveIn -= dt;
    if (this.saveIn <= 0) {
      this.saveIn = 5;
      if (this.active && this.persist) writeSave(save);
    }
  };
}

// The conductor: owns the renderer and world, runs the frame loop, the
// third-person camera, cinematics, quest flow, saving and HUD messaging.

import * as THREE from 'three';
import { AudioEngine } from './core/audio';
import { Input } from './core/input';
import { clamp, clamp01, damp, easeInOutCubic, lerp, smoothstep } from './core/math';
import { DEFAULT_SETTINGS, commands, frameBus, ui, type Command, type JournalEntry, type Marker, type Quality, type Settings } from './core/store';
import { HEART_POS, MOODS, MOOD_BY_ID, MOTES_PER_GROVE, type MoodId } from './data/moods';
import { Creatures } from './entities/creatures';
import { FeelingGarden, Groves, type Grove } from './entities/groves';
import { Player } from './entities/player';
import { PostFX } from './render/post';
import { G } from './render/shared';
import { Flora, HeartTree, PIXEL_SCALE } from './world/flora';
import { Grass } from './world/grass';
import { Atmosphere, Bursts, GlowField } from './world/particles';
import { Sky } from './world/sky';
import { Terrain } from './world/terrain';
import { Water } from './world/water';

const SAVE_KEY = 'moodgarden.save.v2';
const SETTINGS_KEY = 'moodgarden.settings.v2';

interface SaveData {
  awakened: MoodId[];
  collected: string[];
  heartTouched: boolean;
  finale: boolean;
  hour: number;
  px: number;
  pz: number;
  journal: JournalEntry[];
}

interface QualityPreset {
  pixelRatio: number;
  shadow: number;
  shadowExtent: number;
  near: number;
  nearTile: number;
  far: number;
  farTile: number;
  flowers: number;
  samples: number;
  shafts: boolean;
}
const QUALITY: Record<Quality, QualityPreset> = {
  low: { pixelRatio: 0.8, shadow: 1024, shadowExtent: 42, near: 22000, nearTile: 24, far: 18000, farTile: 90, flowers: 2500, samples: 0, shafts: false },
  medium: { pixelRatio: 1, shadow: 2048, shadowExtent: 52, near: 50000, nearTile: 30, far: 36000, farTile: 110, flowers: 5000, samples: 2, shafts: true },
  high: { pixelRatio: 1.5, shadow: 2048, shadowExtent: 60, near: 90000, nearTile: 34, far: 60000, farTile: 124, flowers: 8000, samples: 4, shafts: true },
  ultra: { pixelRatio: 2, shadow: 4096, shadowExtent: 72, near: 150000, nearTile: 38, far: 90000, farTile: 136, flowers: 12000, samples: 4, shafts: true },
};

interface Shot {
  t: number;
  dur: number;
  update: (k: number, t: number) => void;
  done?: () => void;
  skippable?: boolean;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

const registry: { game: Game | null } = { game: null };
/** The running game, for HUD widgets that talk to input and audio directly. */
export const getGame = () => registry.game;

export class Game {
  readonly input: Input;
  readonly audio = new AudioEngine();
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.15, 4000);
  private post!: PostFX;
  private terrain!: Terrain;
  private sky!: Sky;
  private water!: Water;
  private grass!: Grass;
  private flora!: Flora;
  private heart!: HeartTree;
  private groves!: Groves;
  private feelings!: FeelingGarden;
  private player!: Player;
  private atmosphere!: Atmosphere;
  private bursts!: Bursts;
  private glow!: GlowField;
  private creatures!: Creatures;
  private groveLight = new THREE.PointLight(0xffffff, 0, 46, 1.4);

  private settings: Settings = { ...DEFAULT_SETTINGS };
  private preset: QualityPreset = QUALITY.high;
  private resScale = 1;
  private frameAcc = 0;
  private frameCount = 0;
  private raf = 0;
  private last = 0;
  private time = 0;
  private disposed = false;
  private offCommands: () => void = () => {};

  // quest state
  private awakened: MoodId[] = [];
  private heartTouched = false;
  private finale = false;
  private journal: JournalEntry[] = [];
  private heartPos = new THREE.Vector3();
  private lifeTarget = 0;
  private senseT = 0;
  private saveIn = 20;
  private regionId = '';
  private hints: { at: number; text: string }[] = [];
  private wave = { t: 0, dur: 0, radius: 0 };
  private fade = 1;
  private fadeTarget = 0;
  private aurora = 0;
  private treeColliders = new Set<string>();
  private timeScale = 1;
  private slowWindows = 0;
  private fixedRes = new URLSearchParams(location.search).has('fixedres');

  // camera rig
  private camYaw = 0;
  private camPitch = 0.24;
  private camDist = 7.5;
  private camTarget = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  private lookIdle = 0;
  private shot: Shot | null = null;
  private blend = 1;
  private blendFromPos = new THREE.Vector3();
  private blendFromLook = new THREE.Vector3();
  private fov = 55;
  private photoYaw = 0;
  private photoPitch = 0;
  private wantSnapshot = false;

  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private col = new THREE.Color();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    registry.game = this;
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = this;
  }

  // ================================================================= boot
  async init() {
    const step = async (p: number, text: string) => {
      ui.set({ loading: p, loadingText: text });
      await nextFrame();
      await nextFrame();
    };
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    } catch {
      ui.set({ loadingText: 'This game needs WebGL 2. Please try a recent desktop browser.' });
      return;
    }
    this.loadSettings();
    const r = this.renderer;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.info.autoReset = false;

    await step(0.08, 'Raising the island from the sea');
    this.terrain = new Terrain();
    this.heartPos.set(HEART_POS[0], this.terrain.heightAt(HEART_POS[0], HEART_POS[1]), HEART_POS[1]);
    await step(0.3, 'Painting the sky');
    this.sky = new Sky();
    this.scene.fog = this.sky.fog;
    this.water = new Water(this.sky);
    this.grass = new Grass();
    await step(0.45, 'Growing the forest');
    this.flora = new Flora(this.terrain);
    this.heart = new HeartTree(this.flora.textures);
    this.heart.group.position.copy(this.heartPos);
    this.flora.colliders.push({ x: HEART_POS[0], z: HEART_POS[1], r: 3.4 });
    await step(0.7, 'Setting the standing stones');
    const extra: { x: number; z: number; r: number }[] = [];
    this.groves = new Groves(this.terrain, this.flora, (c) => extra.push(c));
    this.feelings = new FeelingGarden(this.terrain);
    this.player = new Player(this.terrain, [...this.flora.colliders, ...extra]);
    this.atmosphere = new Atmosphere(1400);
    this.bursts = new Bursts(1000);
    this.glow = new GlowField(320);
    this.creatures = new Creatures();
    this.scene.add(
      this.terrain.mesh, this.sky.dome, this.sky.sun, this.sky.sun.target, this.sky.hemi, this.water.mesh,
      this.grass.group, this.flora.group, this.heart.group, this.groves.group, this.feelings.group,
      this.player.group, ...this.player.extras, this.atmosphere.group, this.bursts.points, this.glow.points,
      this.creatures.group, this.groveLight,
    );
    await step(0.82, 'Listening for what you feel');
    this.applyQuality(this.settings.quality, true);
    this.restore(this.readSave());
    this.player.group.visible = false;
    this.player.extras.forEach((o) => (o.visible = false));
    ui.set({ touch: window.matchMedia('(pointer: coarse)').matches });

    this.offCommands = commands.on((c) => this.onCommand(c));
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pagehide', this.onHide);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('pointerlockchange', this.onLockChange);
    this.onResize();

    // Compile every shader up front so the first frame of play never hitches.
    this.updateTitleCamera(0);
    this.updateWorld(0.016, false);
    // Hidden things (unborn trees, rain, birds) are revealed for the compile pass
    // so waking a grove later costs nothing.
    const hidden: THREE.Object3D[] = [];
    this.scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    try {
      await r.compileAsync(this.scene, this.camera);
    } catch {
      /* fall back to lazy compilation */
    }
    hidden.forEach((o) => (o.visible = false));
    await step(1, 'Ready');
    if (this.disposed) return;
    ui.set({ phase: 'title', hasSave: !!this.readSave() });
    this.fade = 1;
    this.fadeTarget = 0;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.offCommands();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pagehide', this.onHide);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    this.input.dispose();
    this.audio.dispose();
    this.post?.dispose();
    this.renderer?.dispose();
    if (registry.game === this) registry.game = null;
  }

  /** Development helpers for automated play-throughs (not used by the game itself). */
  debug = {
    warp: (x: number, z: number, yaw?: number) => {
      this.player.teleport(x, z, yaw);
      this.camYaw = this.player.yaw + Math.PI;
      this.snapCamera();
    },
    look: (yaw: number, pitch: number, dist = this.camDist) => {
      this.camYaw = yaw;
      this.camPitch = pitch;
      this.camDist = dist;
      this.snapCamera();
    },
    /** Stand at (x, z) looking toward (tx, tz) with the camera behind. */
    face: (x: number, z: number, tx: number, tz: number, pitch = 0.16, dist = 9) => {
      this.player.teleport(x, z, Math.atan2(tx - x, tz - z));
      this.camYaw = this.player.yaw + Math.PI;
      this.camPitch = pitch;
      this.camDist = dist;
      this.snapCamera();
    },
    hour: (h: number) => (this.sky.hour = h),
    speed: (k: number) => (this.timeScale = Math.max(1, Math.round(k))),
    touchHeart: () => this.touchHeart(),
    gather: (id: MoodId) => {
      for (const m of this.groves.byId(id).motes) if (m.state === 'idle') m.state = 'follow';
    },
    awaken: (id: MoodId) => this.awaken(this.groves.byId(id)),
    finale: () => this.playFinale(),
    grove: (id: MoodId) => this.groves.byId(id).center,
    state: () => ({ pos: this.player.pos.toArray(), awakened: this.awakened, hour: this.sky.hour, phase: ui.get().phase, fps: ui.get().fps, calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles }),
  };

  // ============================================================= settings
  private loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      else if (window.matchMedia('(pointer: coarse)').matches) this.settings.quality = 'medium';
    } catch {
      /* storage unavailable */
    }
    const q = new URLSearchParams(location.search).get('quality') as Quality | null;
    if (q && QUALITY[q]) this.settings.quality = q;
    ui.set({ settings: this.settings });
    this.audio.setVolumes(this.settings.master, this.settings.music);
  }

  private applyQuality(q: Quality, first = false) {
    this.preset = QUALITY[q];
    const p = this.preset;
    this.resScale = 1;
    this.sky.setShadowQuality(p.shadow, p.shadowExtent);
    this.grass.configure(p.near, p.nearTile, p.far, p.farTile, p.flowers);
    if (!first) this.post.dispose();
    this.post = new PostFX(this.renderer, this.scene, this.camera, p.samples);
    this.post.shafts.enabled = p.shafts;
    this.onResize();
  }

  private onResize = () => {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, this.preset.pixelRatio) * this.resScale;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.post?.setSize(w, h, pr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };
  private onHide = () => this.save();
  private wasLocked = false;
  // Browsers swallow the Escape key that releases pointer lock, so treat the
  // loss of lock itself as "pause".
  private onLockChange = () => {
    const locked = document.pointerLockElement === this.canvas;
    const st = ui.get();
    if (this.wasLocked && !locked && st.phase === 'play' && !st.wheelOpen && !st.journalOpen) this.setPhase('paused');
    this.wasLocked = locked;
  };
  private onVisibility = () => {
    if (document.hidden && ui.get().phase === 'play') this.setPhase('paused');
  };

  // ================================================================ saves
  private readSave(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? (JSON.parse(raw) as SaveData) : null;
    } catch {
      return null;
    }
  }
  private save() {
    if (!this.player || ui.get().phase === 'title' || ui.get().phase === 'loading' || ui.get().phase === 'intro') return;
    const collected: string[] = [];
    for (const g of this.groves.list) for (const m of g.motes) if (m.state === 'follow') collected.push(m.id);
    const data: SaveData = {
      awakened: this.awakened,
      collected,
      heartTouched: this.heartTouched,
      finale: this.finale,
      hour: this.sky.hour,
      px: this.player.pos.x,
      pz: this.player.pos.z,
      journal: this.journal,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable */
    }
  }

  /** Rebuild the world state from a save (or a blank slate). */
  private restore(s: SaveData | null) {
    const t = this.terrain;
    this.awakened = s ? [...s.awakened] : [];
    this.heartTouched = s?.heartTouched ?? false;
    this.finale = s?.finale ?? false;
    this.journal = s ? [...s.journal] : [];
    t.resetVitality();
    if (this.heartTouched) t.addBloom(this.heartPos.x, this.heartPos.z, 24, 0xffffff);
    for (const g of this.groves.list) {
      const awake = this.awakened.includes(g.def.id);
      g.restore(awake, s?.collected ?? []);
      if (awake) {
        t.addBloom(g.center.x, g.center.z, 96, g.def.color);
        this.addTreeCollider(g);
      }
    }
    for (const e of this.journal) t.addBloom(e.x, e.z, 9, MOOD_BY_ID[e.mood].color);
    if (this.finale) t.addBloom(0, 0, 340, 0xffffff);
    this.feelings.set(this.journal);
    this.heart.setAwake(this.finale ? MOODS.map((m) => m.id) : this.awakened, true);
    this.sky.hour = s?.hour ?? 7.6;
    this.lifeTarget = this.computeLife();
    this.sky.life = this.lifeTarget;
    this.aurora = this.finale ? 1 : 0;
    const sx = s?.px ?? t.start.x;
    const sz = s?.pz ?? t.start.z;
    this.player.teleport(sx, sz, Math.atan2(HEART_POS[0] - sx, HEART_POS[1] - sz));
    this.player.setAwakened(this.awakened, 1);
    this.camYaw = this.player.yaw + Math.PI;
    this.camPitch = 0.24;
    this.audio.setAwakened(this.awakened, true);
    this.regionId = '';
    ui.set({ awakened: [...this.awakened], heartTouched: this.heartTouched, finale: this.finale, journal: [...this.journal], carrying: this.groves.carrying });
    this.refreshObjective();
  }

  private addTreeCollider(g: Grove) {
    if (this.treeColliders.has(g.def.id)) return;
    this.treeColliders.add(g.def.id);
    this.player.addCollider({ x: g.center.x, z: g.center.z, r: 1.5 });
  }

  private computeLife() {
    return clamp01(this.awakened.length / 6 * 0.86 + (this.heartTouched ? 0.04 : 0) + (this.finale ? 0.1 : 0));
  }

  // ============================================================= commands
  private onCommand(c: Command) {
    switch (c.type) {
      case 'start':
        this.audio.start();
        this.audio.ui('click');
        this.begin(c.fresh);
        break;
      case 'resume':
        this.audio.ui('close');
        this.setPhase('play');
        break;
      case 'pause':
        if (ui.get().phase === 'play') this.setPhase('paused');
        break;
      case 'skip':
        if (this.shot?.skippable) this.shot.t = this.shot.dur;
        break;
      case 'wheel':
        this.toggleWheel(c.open);
        break;
      case 'journal':
        ui.set({ journalOpen: c.open, wheelOpen: false });
        this.audio.ui(c.open ? 'open' : 'close');
        if (c.open) this.input.releaseLock();
        break;
      case 'feel':
        this.feel(c.mood, c.note);
        break;
      case 'settings': {
        const before = this.settings.quality;
        this.settings = { ...this.settings, ...c.patch };
        ui.set({ settings: this.settings });
        this.audio.setVolumes(this.settings.master, this.settings.music);
        if (this.settings.quality !== before) this.applyQuality(this.settings.quality);
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch {
          /* storage unavailable */
        }
        break;
      }
      case 'photo':
        if (c.on) {
          this.photoYaw = Math.atan2(this.camera.position.x - this.lookAt.x, this.camera.position.z - this.lookAt.z);
          this.photoPitch = -Math.asin(clamp((this.camera.position.y - this.lookAt.y) / Math.max(0.01, this.camera.position.distanceTo(this.lookAt)), -1, 1));
          ui.set({ photoTime: this.sky.hour });
          this.setPhase('photo');
        } else {
          this.sky.paused = false;
          this.setPhase('paused');
        }
        break;
      case 'photoTime':
        this.sky.hour = c.hour;
        ui.set({ photoTime: c.hour });
        break;
      case 'snapshot':
        this.wantSnapshot = true;
        break;
      case 'toTitle':
        this.save();
        this.shot = null;
        this.player.group.visible = false;
        this.player.extras.forEach((o) => (o.visible = false));
        this.fade = 1;
        ui.set({ phase: 'title', hasSave: !!this.readSave(), wheelOpen: false, journalOpen: false, card: null, prompt: null });
        this.input.enabled = false;
        this.input.releaseLock();
        this.audio.suspend(false);
        break;
    }
  }

  private setPhase(phase: 'play' | 'paused' | 'photo' | 'cinematic' | 'intro') {
    ui.set({ phase, wheelOpen: false, journalOpen: false });
    this.input.enabled = phase === 'play' || phase === 'photo';
    if (phase !== 'play') this.input.releaseLock();
    this.audio.suspend(phase === 'paused');
    if (phase === 'paused') {
      this.audio.ui('open');
      this.save();
    }
  }

  private begin(fresh: boolean) {
    if (fresh) {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        /* storage unavailable */
      }
      this.restore(null);
    } else {
      this.restore(this.readSave());
    }
    this.player.group.visible = true;
    this.player.extras.forEach((o) => (o.visible = true));
    this.fade = 1;
    this.fadeTarget = 0;
    this.hints = [];
    if (fresh) this.playIntro();
    else {
      this.snapCamera();
      this.setPhase('play');
      this.queueHint(1.5, 'Welcome back, Keeper.');
    }
  }

  // ============================================================ cinematics
  private startShot(shot: Shot) {
    this.shot = shot;
    shot.update(0, 0);
  }

  private endShot() {
    const s = this.shot;
    this.shot = null;
    this.blendFromPos.copy(this.camera.position);
    this.blendFromLook.copy(this.lookAt);
    this.blend = 0;
    s?.done?.();
  }

  private playIntro() {
    this.setPhase('intro');
    const p = this.player.pos;
    const A = new THREE.Vector3(p.x + 70, 16, p.z + 150);
    const B = new THREE.Vector3(p.x - 26, 7, p.z + 44);
    this.snapCamera();
    const C = this.camPos.clone();
    const lookA = this.heartPos.clone().setY(30);
    const lookC = this.camTarget.clone();
    const lines = ['The island has gone quiet.', 'Its colours sleep beneath the grey.', 'But you can still feel — and feeling is how gardens grow.'];
    this.startShot({
      t: 0,
      dur: 17,
      skippable: true,
      update: (k, t) => {
        const e = easeInOutCubic(k);
        // Quadratic Bezier from the open sea to the keeper's shoulder.
        this.v1.copy(A).lerp(B, e);
        this.v2.copy(B).lerp(C, e);
        this.camera.position.copy(this.v1).lerp(this.v2, e);
        this.lookAt.copy(lookA).lerp(lookC, easeInOutCubic(clamp01(k * 1.25 - 0.2)));
        const i = Math.min(lines.length - 1, Math.floor(t / 5.2));
        const local = t - i * 5.2;
        ui.set({ subtitle: local > 0.6 && local < 4.7 && t < 16 ? lines[i] : null });
      },
      done: () => {
        ui.set({ subtitle: null });
        this.setPhase('play');
        this.announceRegion('shore', 'The Quiet Shore');
        this.queueHint(2.5, ui.get().touch ? 'Left stick to walk · Drag to look around' : 'WASD to walk · Mouse to look · Shift to run');
        this.queueHint(11, ui.get().touch ? 'Tap Jump — hold it in the air to glide' : 'Space to jump — hold it in the air to glide');
      },
    });
  }

  private touchHeart() {
    this.heartTouched = true;
    this.audio.touchHeart();
    this.terrain.addBloom(this.heartPos.x, this.heartPos.z, 24, 0xffffff, 6);
    this.startWave(this.heartPos, 24, 6, new THREE.Color(0xfff1c9));
    this.setPhase('cinematic');
    const start = this.camera.position.clone();
    const a0 = Math.atan2(start.x - this.heartPos.x, start.z - this.heartPos.z);
    ui.set({ heartTouched: true, prompt: null, card: { kicker: 'The Heart Tree', title: 'Six feelings sleep in six groves', verse: 'Gather their motes. Plant them where the light rises.', color: '#fff1c9' } });
    this.startShot({
      t: 0,
      dur: 8,
      skippable: true,
      update: (k) => {
        const e = easeInOutCubic(k);
        const a = a0 + e * 1.1;
        const r = lerp(16, 34, e);
        this.camera.position.set(this.heartPos.x + Math.sin(a) * r, this.heartPos.y + lerp(3, 16, e), this.heartPos.z + Math.cos(a) * r);
        this.lookAt.copy(this.heartPos).y += lerp(6, 13, e);
        if (Math.random() < 0.5) {
          this.v1.set(this.heartPos.x + (Math.random() - 0.5) * 12, this.heartPos.y + Math.random() * 14, this.heartPos.z + (Math.random() - 0.5) * 12);
          this.bursts.emit(this.v1, this.col.set(MOODS[Math.floor(Math.random() * 6)].soft), { count: 1, speed: 1, up: 1.5, life: 2, size: 0.3, gravity: 0.4 });
        }
      },
      done: () => {
        this.setPhase('play');
        this.lifeTarget = this.computeLife();
        this.refreshObjective();
        this.save();
        this.queueHint(3, 'Pillars of light mark the groves. Follow any of them.');
        this.queueHint(14, ui.get().touch ? 'Tap Feel at any time to name how you feel' : 'Press F at any time to name how you feel');
        window.setTimeout(() => ui.set({ card: null }), 2500);
      },
    });
  }

  private awaken(g: Grove) {
    this.setPhase('cinematic');
    ui.set({ prompt: null });
    g.beginAwaken();
    this.audio.awaken();
    this.terrain.addBloom(g.center.x, g.center.z, 96, g.def.color, 11);
    this.startWave(g.center, 96, 11, g.color);
    const a0 = Math.atan2(this.player.pos.x - g.center.x, this.player.pos.z - g.center.z);
    let carded = false;
    this.startShot({
      t: 0,
      dur: 12.5,
      update: (k, t) => {
        const e = easeInOutCubic(k);
        const a = a0 + 0.5 + e * 1.9;
        const r = lerp(13, 27, e);
        const h = g.tree.height * easeInOutCubic(clamp01(g.grow));
        this.camera.position.set(g.center.x + Math.sin(a) * r, 0, g.center.z + Math.cos(a) * r);
        this.camera.position.y = Math.max(this.terrain.heightAt(this.camera.position.x, this.camera.position.z) + 1.2, g.center.y + lerp(2.2, 9, e));
        this.lookAt.copy(g.center).y += 1.5 + h * 0.5;
        if (!carded && t > 4.2) {
          carded = true;
          ui.set({ card: { kicker: g.def.region, title: `${g.def.name} — the ${g.def.tree}`, verse: g.def.verse, color: g.def.css } });
        }
      },
      done: () => {
        if (!this.awakened.includes(g.def.id)) this.awakened.push(g.def.id);
        this.lifeTarget = this.computeLife();
        this.heart.setAwake(this.awakened);
        this.audio.setAwakened(this.awakened);
        this.addTreeCollider(g);
        ui.set({ awakened: [...this.awakened], carrying: this.groves.carrying });
        this.setPhase('play');
        this.refreshObjective();
        this.save();
        window.setTimeout(() => ui.set({ card: null }), 3200);
        if (this.awakened.length === 1) this.queueHint(5, 'The Heart Tree has grown a new branch of colour.');
        if (this.awakened.length === 6) this.queueHint(5, 'All six groves are awake. Return to the Heart Tree.');
      },
    });
  }

  private playFinale() {
    this.finale = true;
    this.setPhase('cinematic');
    this.audio.awaken(true);
    this.terrain.addBloom(0, 0, 340, 0xffffff, 16);
    this.startWave(this.heartPos, 340, 16, new THREE.Color(0xfff1c9));
    this.heart.setAwake(MOODS.map((m) => m.id));
    const a0 = Math.atan2(this.player.pos.x - this.heartPos.x, this.player.pos.z - this.heartPos.z);
    let carded = false;
    ui.set({ prompt: null, finale: true });
    this.startShot({
      t: 0,
      dur: 20,
      update: (k, t) => {
        const e = easeInOutCubic(k);
        const a = a0 + e * 3.2;
        const r = lerp(20, 120, e * e);
        this.camera.position.set(this.heartPos.x + Math.sin(a) * r, this.heartPos.y + lerp(4, 70, e * e), this.heartPos.z + Math.cos(a) * r);
        this.lookAt.copy(this.heartPos).y += 12;
        if (!carded && t > 7) {
          carded = true;
          ui.set({ card: { kicker: 'The Mood Garden', title: 'The island remembers', verse: 'Every feeling you carried here made this place more alive. Stay as long as you like.', color: '#fff1c9' } });
        }
        for (let i = 0; i < 2; i++) {
          this.v1.set(this.heartPos.x + (Math.random() - 0.5) * 30, this.heartPos.y + Math.random() * 26, this.heartPos.z + (Math.random() - 0.5) * 30);
          this.bursts.emit(this.v1, this.col.set(MOODS[Math.floor(Math.random() * 6)].soft), { count: 1, speed: 1.5, up: 2, life: 2.6, size: 0.4, gravity: 0.5, bright: 2.5 });
        }
      },
      done: () => {
        this.lifeTarget = this.computeLife();
        this.setPhase('play');
        this.refreshObjective();
        this.save();
        window.setTimeout(() => ui.set({ card: null }), 5000);
      },
    });
  }

  private startWave(center: THREE.Vector3, radius: number, dur: number, color: THREE.Color) {
    this.wave = { t: 0, dur, radius };
    G.uWave.value.set(center.x, center.z, 1, 0);
    G.uWaveColor.value.copy(color);
  }

  // ============================================================== gameplay
  private queueHint(delay: number, text: string) {
    this.hints.push({ at: this.time + delay, text });
  }
  private toast(text: string) {
    ui.set({ toast: text, toastKey: ui.get().toastKey + 1 });
  }
  private announceRegion(id: string, name: string) {
    if (this.regionId === id) return;
    this.regionId = id;
    ui.set({ region: name, regionKey: ui.get().regionKey + 1 });
  }

  private refreshObjective() {
    let objective = '';
    let detail = '';
    if (!this.heartTouched) {
      objective = 'Follow the path to the Heart Tree';
      detail = 'It stands on the hill at the centre of the island.';
    } else if (this.awakened.length < 6) {
      objective = `Awaken the six groves`;
      detail = `${this.awakened.length} of 6 awake — follow a pillar of light.`;
    } else if (!this.finale) {
      objective = 'Return to the Heart Tree';
      detail = 'It is ready to wake.';
    } else {
      objective = 'The island is yours';
      detail = 'Wander. Name what you feel. Plant it.';
    }
    ui.set({ objective, objectiveDetail: detail });
  }

  private toggleWheel(open: boolean) {
    if (ui.get().phase !== 'play') return;
    ui.set({ wheelOpen: open, journalOpen: false });
    this.audio.ui(open ? 'open' : 'close');
    if (open) this.input.releaseLock();
  }

  private feel(mood: MoodId, note: string) {
    const p = this.player.pos;
    ui.set({ wheelOpen: false });
    if (this.terrain.heightAt(p.x, p.z) < 0.6 || !this.player.grounded) {
      this.toast('Find solid, open ground to plant a feeling.');
      return;
    }
    const near = this.groves.nearest(p);
    if (near.dist < 7.5 || Math.hypot(p.x - this.heartPos.x, p.z - this.heartPos.z) < 8) {
      this.toast('Step away from the stones — feelings need room to grow.');
      return;
    }
    const def = MOOD_BY_ID[mood];
    // Plant a pace in front of the keeper.
    const x = p.x + Math.sin(this.player.yaw) * 1.6;
    const z = p.z + Math.cos(this.player.yaw) * 1.6;
    const entry: JournalEntry = { id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, mood, note: note.trim().slice(0, 140), time: Date.now(), x, z };
    this.journal.push(entry);
    if (this.journal.length > 64) this.journal.shift();
    this.feelings.plant(entry);
    this.terrain.addBloom(x, z, 9, def.color, 4);
    this.v1.set(x, this.terrain.heightAt(x, z) + 0.4, z);
    this.bursts.emit(this.v1, this.col.set(def.soft), { count: 46, speed: 2.6, up: 2.6, life: 1.8, size: 0.3, gravity: -0.6, bright: 2.4 });
    this.audio.plantFeeling();
    this.toast(`A bloom of ${def.name.toLowerCase()} takes root.`);
    ui.set({ journal: [...this.journal] });
    this.save();
  }

  private updatePlay(dt: number) {
    const inp = this.input;
    const st = ui.get();
    const modal = st.wheelOpen || st.journalOpen;
    const p = this.player.pos;

    if (inp.hit('Escape', 'KeyP')) {
      if (modal) ui.set({ wheelOpen: false, journalOpen: false });
      else {
        this.setPhase('paused');
        return;
      }
    }
    if (inp.hit('KeyF', 'TouchFeel')) this.toggleWheel(!st.wheelOpen);
    if (inp.hit('KeyJ', 'TouchJournal')) commands.send({ type: 'journal', open: !st.journalOpen });
    if (!modal && inp.hit('KeyQ', 'TouchSense')) {
      this.senseT = 12;
      this.audio.ui('open');
      this.v1.copy(p).y += 1;
      this.bursts.emit(this.v1, this.col.set(0xfff1c9), { count: 40, speed: 7, up: 0.2, life: 0.9, size: 0.22, gravity: 0 });
    }
    this.senseT = Math.max(0, this.senseT - dt);

    // Camera look
    if (!modal) {
      const sens = 0.0026 * this.settings.sensitivity;
      if (inp.lookX !== 0 || inp.lookY !== 0) this.lookIdle = 0;
      this.camYaw -= inp.lookX * sens;
      this.camPitch = clamp(this.camPitch + inp.lookY * sens * (this.settings.invertY ? -1 : 1), -0.45, 1.3);
      this.camDist = clamp(this.camDist + inp.zoom * 0.9, 3.2, 14);
    }
    this.lookIdle += dt;

    this.player.update(
      dt,
      {
        moveX: modal ? 0 : inp.moveX,
        moveY: modal ? 0 : inp.moveY,
        sprint: inp.sprint,
        jump: !modal && inp.hit('Space', 'TouchJump'),
        jumpHeld: !modal && inp.jumpHeld,
      },
      this.camYaw,
      1 - this.sky.day,
    );
    // With no mouse input for a while, the camera eases round behind the keeper.
    if (this.lookIdle > 2.5 && this.player.speed > 1.5) {
      const want = this.player.yaw + Math.PI;
      let d = (want - this.camYaw) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 2.4) this.camYaw += d * Math.min(1, dt * 0.7);
    }

    const ev = this.player.events;
    const gh = this.terrain.heightAt(p.x, p.z);
    const surface = this.player.wading ? 'water' : this.terrain.pathAt(p.x, p.z) > 0.5 || gh < 2.3 ? 'sand' : this.terrain.slopeAt(p.x, p.z) > 0.25 ? 'stone' : 'grass';
    if (ev.step) {
      this.audio.footstep(surface, inp.sprint);
      if (surface !== 'grass' && this.player.speed > 6) {
        this.v1.copy(p).y += 0.1;
        this.bursts.emit(this.v1, this.col.setRGB(0.5, 0.45, 0.36), { count: 3, speed: 0.8, up: 0.6, life: 0.6, size: 0.3, gravity: -1, bright: 0.25 });
      }
    }
    if (ev.splash) {
      this.v1.set(p.x, 0.1, p.z);
      this.bursts.emit(this.v1, this.col.setRGB(0.7, 0.85, 1), { count: 8, speed: 2, up: 2.4, life: 0.6, size: 0.18, gravity: -9, bright: 0.6 });
    }
    if (ev.jumped) this.audio.jump();
    if (ev.landed > 0.15) {
      this.audio.land(ev.landed);
      this.v1.copy(p).y += 0.1;
      this.bursts.emit(this.v1, this.col.setRGB(0.55, 0.5, 0.4), { count: 8, speed: 2.2, up: 0.5, life: 0.5, size: 0.3, gravity: -2, bright: 0.25 });
    }

    // Interaction prompts
    let prompt: string | null = null;
    let action: (() => void) | null = null;
    const dHeart = Math.hypot(p.x - this.heartPos.x, p.z - this.heartPos.z);
    const near = this.groves.nearest(p);
    if (dHeart < 12 && !this.heartTouched) {
      prompt = 'Touch the Heart Tree';
      action = () => this.touchHeart();
    } else if (dHeart < 12 && this.awakened.length === 6 && !this.finale) {
      prompt = 'Wake the Heart Tree';
      action = () => this.playFinale();
    } else if (near.dist < 8 && !near.grove.awake && this.heartTouched) {
      const g = near.grove;
      if (g.carried >= MOTES_PER_GROVE) {
        prompt = `Plant the seed of ${g.def.name}`;
        action = () => this.awaken(g);
      }
    }
    ui.set({ prompt: modal ? null : prompt, promptKey: st.touch ? 'Tap' : 'E' });
    if (action && !modal && inp.hit('KeyE', 'Enter', 'TouchAct')) action();

    // Region banners + local grove progress
    if (near.dist < 62) {
      this.announceRegion(near.grove.def.id, near.grove.def.region);
      ui.set({ grove: near.grove.awake ? null : { id: near.grove.def.id, have: near.grove.carried, need: MOTES_PER_GROVE } });
    } else {
      ui.set({ grove: null });
      if (dHeart < 30) this.announceRegion('heart', 'Heart Hill');
      else if (gh < 2.4 && near.dist > 75) this.announceRegion('shore', 'The Quiet Shore');
    }

    this.saveIn -= dt;
    if (this.saveIn <= 0) {
      this.saveIn = 20;
      this.save();
    }
  }

  // ================================================================ camera
  private followCamera(out: THREE.Vector3, target: THREE.Vector3) {
    const cp = Math.cos(this.camPitch);
    let dist = this.camDist;
    // Pull in if terrain blocks the line of sight.
    for (let i = 1; i <= 7; i++) {
      const f = (i / 7) * this.camDist;
      const x = target.x + Math.sin(this.camYaw) * cp * f;
      const z = target.z + Math.cos(this.camYaw) * cp * f;
      const y = target.y + Math.sin(this.camPitch) * f;
      if (y < this.terrain.heightAt(x, z) + 0.35) {
        dist = Math.max(1.6, f - this.camDist / 7);
        break;
      }
    }
    // ...or if a rock or standing stone does.
    const hit = this.player.segmentHit(target.x, target.z, target.x + Math.sin(this.camYaw) * cp * dist, target.z + Math.cos(this.camYaw) * cp * dist);
    if (hit < 1) dist = Math.max(1.4, dist * hit);
    out.set(target.x + Math.sin(this.camYaw) * cp * dist, target.y + Math.sin(this.camPitch) * dist, target.z + Math.cos(this.camYaw) * cp * dist);
    const floor = Math.max(this.terrain.heightAt(out.x, out.z), 0) + 0.95;
    if (out.y < floor) out.y = floor;
  }

  private snapCamera() {
    this.camTarget.copy(this.player.pos).y += 1.45;
    this.followCamera(this.camPos, this.camTarget);
    this.camera.position.copy(this.camPos);
    this.lookAt.copy(this.camTarget);
    this.blend = 1;
  }

  private updateTitleCamera(dt: number) {
    void dt;
    const a = this.time * 0.035 + 2.4;
    this.camera.position.set(Math.sin(a) * 175, 46 + Math.sin(this.time * 0.05) * 8, Math.cos(a) * 175);
    this.lookAt.set(0, 20, 0);
    this.camera.fov = 48;
  }

  private updateCamera(dt: number, phase: string) {
    const cam = this.camera;
    if (phase === 'title') {
      this.updateTitleCamera(dt);
    } else if (phase === 'photo') {
      const inp = this.input;
      this.photoYaw -= inp.lookX * 0.0025;
      this.photoPitch = clamp(this.photoPitch - inp.lookY * 0.0025, -1.5, 1.5);
      const sp = (inp.sprint ? 26 : 8) * dt;
      const fx = -Math.sin(this.photoYaw) * Math.cos(this.photoPitch);
      const fy = Math.sin(this.photoPitch);
      const fz = -Math.cos(this.photoYaw) * Math.cos(this.photoPitch);
      cam.position.x += (fx * inp.moveY + Math.cos(this.photoYaw) * inp.moveX) * sp;
      cam.position.y += fy * inp.moveY * sp + ((inp.down('KeyE') ? 1 : 0) - (inp.down('KeyQ') ? 1 : 0)) * sp;
      cam.position.z += (fz * inp.moveY - Math.sin(this.photoYaw) * inp.moveX) * sp;
      cam.position.y = Math.max(cam.position.y, Math.max(0, this.terrain.heightAt(cam.position.x, cam.position.z)) + 0.3);
      this.lookAt.set(cam.position.x + fx, cam.position.y + fy, cam.position.z + fz);
      this.fov = clamp(this.fov + inp.zoom * 3, 20, 90);
      cam.fov = this.fov;
    } else if (this.shot) {
      cam.fov = damp(cam.fov, 50, 2, dt);
    } else {
      this.v1.copy(this.player.pos).y += 1.45;
      this.camTarget.x = damp(this.camTarget.x, this.v1.x, 14, dt);
      this.camTarget.z = damp(this.camTarget.z, this.v1.z, 14, dt);
      this.camTarget.y = damp(this.camTarget.y, this.v1.y, 7, dt);
      this.followCamera(this.v2, this.camTarget);
      this.camPos.x = damp(this.camPos.x, this.v2.x, 16, dt);
      this.camPos.y = damp(this.camPos.y, this.v2.y, 10, dt);
      this.camPos.z = damp(this.camPos.z, this.v2.z, 16, dt);
      if (this.blend < 1) {
        // Ease out of a cinematic back to the shoulder camera.
        this.blend = Math.min(1, this.blend + dt / 1.8);
        const e = easeInOutCubic(this.blend);
        cam.position.copy(this.blendFromPos).lerp(this.camPos, e);
        this.lookAt.copy(this.blendFromLook).lerp(this.camTarget, e);
      } else {
        cam.position.copy(this.camPos);
        this.lookAt.copy(this.camTarget);
      }
      const want = this.player.gliding ? 66 : 55 + clamp01((this.player.speed - 5.6) / 4) * 7;
      this.fov = damp(this.fov, want, 4, dt);
      cam.fov = this.fov;
    }
    cam.lookAt(this.lookAt);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    PIXEL_SCALE.value = (this.renderer.domElement.height * 0.5) / Math.tan((cam.fov * Math.PI) / 360);
  }

  // ================================================================= world
  private updateWorld(dt: number, simulate: boolean) {
    const phase = ui.get().phase;
    const sky = this.sky;
    const p = this.player.pos;
    const focus = phase === 'photo' || phase === 'title' || this.shot ? this.v3.copy(this.lookAt) : p;
    if (phase === 'photo') focus.copy(this.camera.position);
    G.uTime.value = this.time;
    G.uPlayerPos.value.copy(p);

    if (simulate) {
      this.terrain.update(dt);
      this.bursts.update(dt);
      // Expanding ring of light across the land.
      if (this.wave.dur > 0) {
        this.wave.t += dt;
        const k = this.wave.t / this.wave.dur;
        if (k >= 1) {
          this.wave.dur = 0;
          G.uWave.value.w = -1;
        } else {
          G.uWave.value.w = this.wave.radius * (1 - Math.pow(1 - k, 3)) * 0.92;
          G.uWave.value.z = (1 - k) * (1 - k) * smoothstep(0, 0.05, k);
        }
      }
    }

    // Mood of the sky: overall life plus what the nearby land feels like.
    sky.life = damp(sky.life, this.lifeTarget, 0.25, dt);
    const sorrow = this.groves.byId('sorrow');
    const love = this.groves.byId('love');
    const dS = Math.hypot(focus.x - sorrow.center.x, focus.z - sorrow.center.z);
    const dL = Math.hypot(focus.x - love.center.x, focus.z - love.center.z);
    const nearS = 1 - smoothstep(26, 62, dS);
    const rain = sorrow.awake ? nearS : 0;
    sky.gloom = damp(sky.gloom, nearS * (sorrow.awake ? 0.75 : 0.4), 0.8, dt);
    this.atmosphere.rain = damp(this.atmosphere.rain, rain, 1, dt);
    this.atmosphere.petals = damp(this.atmosphere.petals, Math.max(love.awake ? 1 - smoothstep(30, 70, dL) : 0, this.finale ? 0.3 : 0), 1, dt);
    this.aurora = damp(this.aurora, this.finale ? 1 : 0, 0.2, dt);
    sky.aurora = this.aurora;
    sky.paused = phase === 'photo' || phase === 'paused';
    sky.update(dt, focus);
    const night = 1 - sky.day;

    this.glow.begin();
    if (simulate) {
      this.groves.update(dt, this.player, this.glow, this.bursts, night, this.heartTouched, this.time);
      for (const m of this.groves.events.collected) {
        this.audio.collect();
        const g = this.groves.byId(m.mood);
        ui.set({ carrying: this.groves.carrying });
        if (g.carried === MOTES_PER_GROVE) this.toast(`All ${g.def.name} motes gathered — carry them to the seedbed.`);
        else if (this.groves.carrying === 1 && this.awakened.length === 0) this.queueHint(0.5, 'Motes follow you. Gather five of one colour for its grove.');
      }
      this.groves.events.delivered.forEach((_, i) => this.audio.deliver(i));
    }
    this.feelings.update(simulate ? dt : 0, this.glow, this.time, night);
    this.glow.end();
    this.heart.update(dt, night);
    this.player.setAwakened(this.awakened, 0.25 + sky.day * 0.75);

    // One coloured light for the nearest living grove.
    const ng = this.groves.nearest(focus).grove;
    const lit = ng.awake || ng.growing ? clamp01(ng.grow) : 0;
    this.groveLight.position.copy(ng.center).y += ng.tree.height * 0.55;
    this.groveLight.color.copy(ng.soft);
    this.groveLight.intensity = lit * (6 + night * 70);

    this.water.update(this.camera);
    this.grass.update(focus);
    this.atmosphere.update(this.camera, sky.day);
    this.creatures.update(dt, focus, this.awakened.length, sky.day, sky.fog.color);

    const vit = this.terrain.vitalityAt(focus.x, focus.z);
    const gh = this.terrain.heightAt(p.x, p.z);
    this.audio.update(dt, {
      day: sky.day,
      vitality: vit,
      shore: phase === 'title' ? 0.6 : clamp01(1 - (gh - 0.5) / 6),
      rain: this.atmosphere.rain,
      speed: this.player.speed,
      gliding: this.player.gliding,
      life: sky.life,
    });

    // Grade: the world gains saturation as it comes alive.
    const u = this.post.grade.uniforms;
    u.uSat.value = damp(u.uSat.value, lerp(0.74, 1.02, Math.max(sky.life, vit * 0.85)), 1.2, dt);
    u.uWarm.value = clamp01(1 - Math.abs(sky.sunDir.y - 0.12) / 0.3) * 0.35 * sky.day;
    u.uVignette.value = phase === 'title' || this.shot ? 0.5 : 0.34;
    u.uFocus.value = damp(u.uFocus.value, this.player.gliding ? 0.6 : 0, 4, dt);
    this.fade = damp(this.fade, this.fadeTarget, 1.4, dt);
    u.uFade.value = this.fade;
    // Light shafts when the sun is in frame.
    this.v1.copy(sky.sunDir).multiplyScalar(1000).add(this.camera.position).project(this.camera);
    this.post.shafts.sun.set(this.v1.x * 0.5 + 0.5, this.v1.y * 0.5 + 0.5);
    const onScreen = this.v1.z < 1 ? clamp01(1.6 - Math.max(Math.abs(this.v1.x), Math.abs(this.v1.y))) : 0;
    this.post.shafts.strength = 0.34 * onScreen * smoothstep(-0.05, 0.15, sky.sunDir.y) * (0.45 + 0.55 * sky.life);
    this.post.bloom.strength = lerp(0.3, 0.55, night);
  }

  private emitFrame() {
    const p = this.player.pos;
    const s = Math.sin(this.camYaw);
    const c = Math.cos(this.camYaw);
    const markers: Marker[] = [];
    const add = (id: string, x: number, z: number, color: string, kind: Marker['kind'], done: boolean) => {
      const dx = x - p.x;
      const dz = z - p.z;
      markers.push({ id, bearing: Math.atan2(dx * c - dz * s, -dx * s - dz * c), dist: Math.hypot(dx, dz), color, kind, done });
    };
    add('heart', this.heartPos.x, this.heartPos.z, '#fff1c9', 'heart', this.finale);
    if (this.heartTouched) {
      for (const g of this.groves.list) add(g.def.id, g.center.x, g.center.z, g.def.css, 'grove', g.awake);
    }
    if (this.senseT > 0) {
      const near = this.groves.nearest(p).grove;
      const pool = near.awake ? this.groves.list.filter((g) => !g.awake) : [near];
      for (const g of pool) for (const m of g.motes) if (m.state === 'idle') add(m.id, m.pos.x, m.pos.z, g.def.css, 'mote', false);
    }
    frameBus.emit({ yaw: this.camYaw, markers });
  }

  // ================================================================== loop
  /** One simulation step (run several times per frame only when fast-forwarding in tests). */
  private tick(dt: number) {
    const inp = this.input;
    const phase = ui.get().phase;
    const simulate = phase !== 'paused' && phase !== 'photo';
    this.time += dt;
    if (this.shot) {
      const s = this.shot;
      if (s.skippable && inp.hit('Space', 'Enter', 'Escape', 'TouchJump', 'TouchAct')) s.t = s.dur;
      s.t = Math.min(s.dur, s.t + dt);
      s.update(s.t / s.dur, s.t);
      // Keep the keeper settled on the ground while the camera is away.
      this.player.update(dt, { moveX: 0, moveY: 0, sprint: false, jump: false, jumpHeld: false }, this.camYaw, 1 - this.sky.day);
      if (s.t >= s.dur) this.endShot();
    } else if (phase === 'play') {
      this.updatePlay(dt);
    } else if (phase === 'paused') {
      if (inp.hit('Escape', 'KeyP')) commands.send({ type: 'resume' });
    } else if (phase === 'photo') {
      if (inp.hit('Escape')) commands.send({ type: 'photo', on: false });
    }

    for (let i = this.hints.length - 1; i >= 0; i--) {
      if (this.time >= this.hints[i].at && ui.get().phase === 'play') {
        this.toast(this.hints[i].text);
        this.hints.splice(i, 1);
      }
    }

    this.updateCamera(dt, ui.get().phase);
    this.updateWorld(dt, simulate);
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const raw = (now - this.last) / 1000;
    this.last = now;
    const dt = Math.min(raw, 0.05);
    const inp = this.input;
    inp.poll();

    // Dynamic resolution keeps the frame rate steady on weaker GPUs.
    this.frameAcc += raw;
    this.frameCount++;
    if (this.frameAcc >= 1.5) {
      const avg = this.frameAcc / this.frameCount;
      const prev = this.resScale;
      if (this.fixedRes) this.resScale = 1;
      else if (avg > 1 / 40) this.resScale = Math.max(0.55, this.resScale - 0.1);
      else if (avg < 1 / 57 && this.resScale < 1) this.resScale = Math.min(1, this.resScale + 0.05);
      if (prev !== this.resScale) this.onResize();
      // Still struggling at the lowest resolution scale? Step the preset down once.
      this.slowWindows = !this.fixedRes && this.resScale <= 0.56 && avg > 1 / 30 ? this.slowWindows + 1 : 0;
      if (this.slowWindows >= 3 && this.settings.quality !== 'low' && ui.get().phase === 'play') {
        this.slowWindows = 0;
        const order: Quality[] = ['low', 'medium', 'high', 'ultra'];
        commands.send({ type: 'settings', patch: { quality: order[order.indexOf(this.settings.quality) - 1] } });
        this.toast('Graphics quality lowered to keep things smooth. Change it any time in Settings.');
      }
      ui.set({ fps: Math.round(1 / avg), timeLabel: this.sky.timeLabel() });
      this.frameAcc = 0;
      this.frameCount = 0;
    }

    for (let i = 0; i < this.timeScale; i++) {
      this.tick(dt);
      inp.consume();
    }
    this.renderer.info.reset();
    this.post.render(dt);
    if (this.wantSnapshot) {
      this.wantSnapshot = false;
      this.canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `mood-garden-${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, 'image/png');
    }
    if (ui.get().phase === 'play') this.emitFrame();
    inp.endFrame();
  };
}

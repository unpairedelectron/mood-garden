// Animals with somewhere to be.
//
// Perching birds are built here: small songbirds that fly in, settle on the
// outer canopy of the trees you have grown, hop about, sing, and take off
// when you come close.
//
// Deer and a fox have full behaviour (grazing, alert, bolting; a dusk fox that
// trots, sniffs, sits and slips away) but need rigged, animated models to be
// shown. Photoreal animals cannot be made procedurally, so they load from
// public/assets/animals/manifest.json (see README there). Without the pack
// they simply do not appear. `?proxyanimals` draws stand-in bodies so the
// behaviour can be tested.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { treeHeight } from './forest';
import { speciesOf } from './moods';
import type { NearTrees } from './neartrees';
import type { TreeSave } from './state';
import { GARDEN_RADIUS } from './state';
import { heightAt, placeById, waterAt } from './terrain';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

export type BirdSpecies = 'robin' | 'bluetit' | 'goldfinch' | 'blackbird';

export interface FaunaContext {
  walker: THREE.Vector3;
  walkerSpeed: number;
  hour: number;
  /** 1 by day, 0 at night. */
  day: number;
  dawn: number;
  dusk: number;
  rain: number;
  trees: TreeSave[];
}

// ------------------------------------------------------------------- birds

const BIRD_COLORS: Record<BirdSpecies, { back: number; belly: number; head: number; beak: number; wing: number }> = {
  robin: { back: 0x6b5233, belly: 0xd8642a, head: 0x6b5233, beak: 0x2a221a, wing: 0x5a452c },
  bluetit: { back: 0x6f8f52, belly: 0xe8cf45, head: 0x3a6fc4, beak: 0x222222, wing: 0x4c74b8 },
  goldfinch: { back: 0x9b7b52, belly: 0xe9dcc4, head: 0xc8352b, beak: 0xd8c39a, wing: 0x1f1a17 },
  blackbird: { back: 0x1a1816, belly: 0x231f1c, head: 0x1a1816, beak: 0xe39b1c, wing: 0x151311 },
};

function part(geo: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const g = geo.toNonIndexed();
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g;
}

/** A 12 cm songbird: body, breast, head, beak, tail; wings are separate so they can flap. */
function birdBody(sp: BirdSpecies) {
  const c = BIRD_COLORS[sp];
  const s = sp === 'blackbird' ? 1.25 : sp === 'bluetit' ? 0.85 : 1;
  const body = part(new THREE.SphereGeometry(0.035, 10, 8).scale(1, 0.9, 1.6), c.back);
  const belly = part(new THREE.SphereGeometry(0.031, 10, 8).scale(1, 0.95, 1.3).translate(0, -0.008, 0.012), c.belly);
  const head = part(new THREE.SphereGeometry(0.024, 10, 8).translate(0, 0.03, 0.045), c.head);
  const beak = part(new THREE.ConeGeometry(0.006, 0.018, 6).rotateX(Math.PI / 2).translate(0, 0.028, 0.075), c.beak);
  const tail = part(new THREE.BoxGeometry(0.03, 0.004, 0.05).translate(0, 0.006, -0.07).rotateX(-0.25), c.back);
  const eyeL = part(new THREE.SphereGeometry(0.004, 6, 4).translate(0.016, 0.037, 0.058), 0x050505);
  const eyeR = part(new THREE.SphereGeometry(0.004, 6, 4).translate(-0.016, 0.037, 0.058), 0x050505);
  const g = mergeGeometries([body, belly, head, beak, tail, eyeL, eyeR])!;
  g.scale(s, s, s);
  const wing = part(new THREE.PlaneGeometry(0.075, 0.05).translate(0.0375, 0, -0.01).rotateX(-Math.PI / 2), c.wing);
  wing.scale(s, s, s);
  return { g, wing };
}

type BirdState = 'away' | 'flying' | 'perched' | 'leaving';
interface Bird {
  sp: BirdSpecies;
  root: THREE.Group;
  body: THREE.Mesh;
  left: THREE.Mesh;
  right: THREE.Mesh;
  state: BirdState;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  dur: number;
  wait: number;
  sing: number;
  look: number;
  seed: number;
}

// ------------------------------------------------------------- big animals

type Clip = 'idle' | 'graze' | 'walk' | 'trot' | 'run' | 'alert' | 'sit' | 'sniff';
interface AnimalDef {
  file: string;
  /** Uniform scale to bring the model to real size (metres). */
  scale: number;
  /** Rotation (radians about Y) so the model faces +Z. */
  yaw?: number;
  /** Clip names in the file for each behaviour; missing ones fall back sensibly. */
  clips: Partial<Record<Clip, string>>;
  /** Ground speed (m/s) at which each moving clip looks right. */
  speeds?: Partial<Record<'walk' | 'trot' | 'run', number>>;
}
interface Manifest {
  deer?: AnimalDef;
  fox?: AnimalDef;
}

type Mood = 'enter' | 'graze' | 'wander' | 'alert' | 'bolt' | 'leave' | 'trot' | 'sniff' | 'sit';
interface Animal {
  kind: 'deer' | 'fox';
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  actions: Partial<Record<Clip, THREE.AnimationAction>>;
  current: Clip | null;
  state: Mood;
  timer: number;
  target: THREE.Vector3;
  heading: number;
  speed: number;
  /** Seconds left in the current pose (grazing, alert, sitting). */
  wait: number;
  /** Proxy only: legs to swing. */
  legs?: THREE.Object3D[];
  head?: THREE.Object3D;
  phase: number;
}

const ANIMAL_SPEED = { deer: { walk: 1.1, trot: 2.6, run: 9 }, fox: { walk: 1.2, trot: 2.8, run: 7.5 } };

export class Fauna {
  readonly group = new THREE.Group();
  /** Called when a perched bird sings, with where it is. */
  onSing: (species: BirdSpecies, at: THREE.Vector3) => void = () => {};
  /** Which large animals can be shown (their models are present). */
  readonly available = { deer: false, fox: false };
  private birds: Bird[] = [];
  private perchSpots: THREE.Vector3[] = [];
  private nearTrees: NearTrees;
  private models: { deer?: { scene: THREE.Object3D; clips: THREE.AnimationClip[]; def: AnimalDef }; fox?: { scene: THREE.Object3D; clips: THREE.AnimationClip[]; def: AnimalDef } } = {};
  private proxy = new URLSearchParams(location.search).has('proxyanimals');
  private herd: Animal[] = [];
  private fox: Animal | null = null;
  private deerIn = 20;
  private foxIn = 15;
  private v = new THREE.Vector3();
  private stats = { grown: 0, broadleaf: 0, thicket: 0 };
  /** Whether conditions bring each kind to the grove now (for the menu). */
  readonly welcome = { perching: false, deer: false, fox: false };
  /** Set once each kind has actually been seen. */
  readonly seen = { perching: false, deer: false, fox: false };

  constructor(nearTrees: NearTrees) {
    this.nearTrees = nearTrees;
    const species: BirdSpecies[] = ['robin', 'bluetit', 'goldfinch', 'blackbird'];
    const mats = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const wingMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const sp = species[i % species.length];
      const { g, wing } = birdBody(sp);
      const root = new THREE.Group();
      const body = new THREE.Mesh(g, mats);
      const left = new THREE.Mesh(wing, wingMat);
      const right = new THREE.Mesh(wing, wingMat);
      left.position.set(0.012, 0.012, 0.01);
      right.position.set(-0.012, 0.012, 0.01);
      right.scale.x = -1;
      body.castShadow = true;
      root.add(body, left, right);
      root.visible = false;
      this.group.add(root);
      this.birds.push({ sp, root, body, left, right, state: 'away', from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, dur: 1, wait: 2 + i * 3, sing: 2, look: 0, seed: Math.random() * 100 });
    }
  }

  /** Load the animal pack if it is there. Never fails the game. */
  async load() {
    let manifest: Manifest | null = null;
    try {
      const r = await fetch(`${ASSETS}animals/manifest.json`);
      if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) manifest = (await r.json()) as Manifest;
    } catch {
      /* no pack */
    }
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    for (const kind of ['deer', 'fox'] as const) {
      const def = manifest?.[kind];
      if (def) {
        try {
          const g = await loader.loadAsync(`${ASSETS}animals/${def.file}`);
          g.scene.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          this.models[kind] = { scene: g.scene, clips: g.animations, def };
          this.available[kind] = true;
        } catch (e) {
          console.warn(`Animal model for ${kind} failed to load`, e);
        }
      }
      if (!this.available[kind] && this.proxy) this.available[kind] = true;
    }
  }

  setForest(trees: TreeSave[]) {
    const grown = trees.filter((t) => t.growth >= 0.6);
    this.stats = {
      grown: grown.length,
      broadleaf: grown.filter((t) => t.mood === 'joy' || t.mood === 'calm' || t.mood === 'love').length,
      thicket: grown.filter((t) => t.mood === 'sorrow' || t.mood === 'hope').length,
    };
    this.welcome.perching = this.stats.grown >= 5;
    this.welcome.deer = this.stats.grown >= 8 && this.stats.broadleaf >= 2;
    this.welcome.fox = this.stats.grown >= 10 && this.stats.thicket >= 1;
  }

  // ------------------------------------------------------------- birds
  private refreshPerches(ctx: FaunaContext) {
    this.perchSpots.length = 0;
    const near = ctx.trees
      .filter((t) => t.growth >= 0.6 && Math.hypot(t.x - ctx.walker.x, t.z - ctx.walker.z) < 45)
      .sort((a, b) => Math.hypot(a.x - ctx.walker.x, a.z - ctx.walker.z) - Math.hypot(b.x - ctx.walker.x, b.z - ctx.walker.z))
      .slice(0, 12);
    for (const t of near) {
      const H = treeHeight(t);
      const n = speciesOf(t).height > 6 ? 4 : 2;
      this.perchSpots.push(...this.nearTrees.perches(t, H, heightAt(t.x, t.z), n, t.id * 31 + 7));
    }
  }

  private updateBirds(dt: number, time: number, ctx: FaunaContext) {
    const active = this.welcome.perching && ctx.day > 0.3 && ctx.rain < 0.6;
    const want = active ? Math.min(this.birds.length, 2 + Math.floor(this.stats.grown / 3)) : 0;
    if (this.perchSpots.length === 0) return;
    let live = 0;
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      const p = b.root.position;
      if (b.state === 'away') {
        b.root.visible = false;
        if (i >= want) continue;
        b.wait -= dt;
        if (b.wait > 0) continue;
        // Fly in from somewhere out of sight.
        const a = Math.random() * Math.PI * 2;
        b.from.set(ctx.walker.x + Math.cos(a) * 35, ctx.walker.y + 12 + Math.random() * 6, ctx.walker.z + Math.sin(a) * 35);
        b.to.copy(this.perchSpots[Math.floor(Math.random() * this.perchSpots.length)]);
        b.state = 'flying';
        b.t = 0;
        b.dur = b.from.distanceTo(b.to) / 7;
        p.copy(b.from);
        b.root.visible = true;
      }
      live++;
      if (b.state === 'flying' || b.state === 'leaving') {
        b.t += dt / b.dur;
        const k = Math.min(1, b.t);
        // An arc: up and over, swooping down to land.
        p.lerpVectors(b.from, b.to, k);
        p.y += Math.sin(k * Math.PI) * Math.min(4, b.dur * 1.5) - (b.state === 'flying' ? 0 : 0);
        this.v.subVectors(b.to, b.from);
        b.root.rotation.set(0, Math.atan2(this.v.x, this.v.z), 0);
        const flap = Math.sin(time * 38 + b.seed) * 1.1;
        b.left.rotation.set(0, 0, flap);
        b.right.rotation.set(0, 0, -flap);
        if (k >= 1) {
          if (b.state === 'leaving') {
            b.state = 'away';
            b.wait = 6 + Math.random() * 14;
          } else {
            b.state = 'perched';
            b.wait = 8 + Math.random() * 25;
            b.sing = 0.5 + Math.random() * 3;
            this.seen.perching = true;
          }
        }
        continue;
      }
      // Perched: wings folded, a glance this way and that, a song now and then.
      // Wings folded down along the flanks.
      b.left.rotation.set(0, -0.15, -1.35);
      b.right.rotation.set(0, 0.15, 1.35);
      b.look -= dt;
      if (b.look <= 0) {
        b.look = 0.4 + Math.random() * 1.6;
        b.root.rotation.y += (Math.random() - 0.5) * 1.6;
      }
      b.root.position.y = b.to.y + Math.max(0, Math.sin(time * 9 + b.seed)) * 0.004;
      b.sing -= dt;
      if (b.sing <= 0) {
        b.sing = 3 + Math.random() * 9;
        this.onSing(b.sp, p);
      }
      b.wait -= dt;
      const close = p.distanceTo(ctx.walker) < 3.5 + ctx.walkerSpeed;
      if (b.wait <= 0 || close) {
        b.from.copy(p);
        if (close || Math.random() < 0.4) {
          // Off and away.
          const a = Math.atan2(p.z - ctx.walker.z, p.x - ctx.walker.x) + (Math.random() - 0.5);
          b.to.set(p.x + Math.cos(a) * 40, p.y + 14, p.z + Math.sin(a) * 40);
          b.state = 'leaving';
        } else {
          // Hop to another branch.
          b.to.copy(this.perchSpots[Math.floor(Math.random() * this.perchSpots.length)]);
          b.state = 'flying';
        }
        b.t = 0;
        b.dur = Math.max(0.6, b.from.distanceTo(b.to) / 7);
      }
    }
    void live;
  }

  // -------------------------------------------------------- large animals
  private spawn(kind: 'deer' | 'fox', at: THREE.Vector3): Animal {
    const m = this.models[kind];
    let root: THREE.Object3D;
    let mixer: THREE.AnimationMixer | null = null;
    const actions: Animal['actions'] = {};
    let legs: THREE.Object3D[] | undefined, head: THREE.Object3D | undefined;
    if (m) {
      root = new THREE.Group();
      const inst = cloneSkinned(m.scene);
      inst.scale.setScalar(m.def.scale);
      inst.rotation.y = m.def.yaw ?? 0;
      root.add(inst);
      mixer = new THREE.AnimationMixer(inst);
      for (const [clip, name] of Object.entries(m.def.clips) as [Clip, string][]) {
        const c = m.clips.find((x) => x.name === name);
        if (c) actions[clip] = mixer.clipAction(c);
      }
    } else {
      ({ root, legs, head } = proxyBody(kind));
    }
    root.position.copy(at);
    this.group.add(root);
    return { kind, root, mixer, actions, current: null, state: kind === 'deer' ? 'enter' : 'trot', timer: 0, target: new THREE.Vector3(), heading: 0, speed: 0, wait: 0, legs, head, phase: Math.random() * 6 };
  }

  private despawn(a: Animal) {
    this.group.remove(a.root);
    a.mixer?.stopAllAction();
  }

  private play(a: Animal, clip: Clip) {
    if (a.current === clip) return;
    const fallback: Record<Clip, Clip[]> = {
      idle: ['idle'], graze: ['graze', 'idle'], walk: ['walk'], trot: ['trot', 'walk'], run: ['run', 'trot'], alert: ['alert', 'idle'], sit: ['sit', 'idle'], sniff: ['sniff', 'graze', 'idle'],
    };
    const pick = fallback[clip].find((c) => a.actions[c]);
    const next = pick ? a.actions[pick]! : null;
    const prev = a.current ? a.actions[a.current] : null;
    if (next) {
      next.reset().setEffectiveWeight(1).fadeIn(0.35).play();
      if (prev && prev !== next) prev.fadeOut(0.35);
    }
    a.current = clip;
  }

  /** A point at the edge of the grove, away from the walker, on dry land. */
  private edgePoint(walker: THREE.Vector3, r = GARDEN_RADIUS + 10): THREE.Vector3 {
    for (let i = 0; i < 20; i++) {
      const a = Math.atan2(-walker.z, -walker.x) + (Math.random() - 0.5) * 2.2;
      const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      if (waterAt(p.x, p.z) === null) {
        p.y = heightAt(p.x, p.z);
        return p;
      }
    }
    return new THREE.Vector3(r, heightAt(r, 0), 0);
  }

  /** Somewhere a deer would like: open ground near broadleaf trees. */
  private grazingSpot(ctx: FaunaContext): THREE.Vector3 {
    const broad = ctx.trees.filter((t) => t.growth >= 0.6 && (t.mood === 'joy' || t.mood === 'calm' || t.mood === 'love'));
    for (let i = 0; i < 16; i++) {
      const t = broad[Math.floor(Math.random() * broad.length)];
      if (!t) break;
      const a = Math.random() * Math.PI * 2, d = 5 + Math.random() * 6;
      const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
      if (waterAt(x, z) === null && Math.hypot(x - ctx.walker.x, z - ctx.walker.z) > 14) return new THREE.Vector3(x, heightAt(x, z), z);
    }
    return this.edgePoint(ctx.walker, GARDEN_RADIUS * 0.7);
  }

  private move(a: Animal, dt: number, speed: number, turn = 3) {
    const p = a.root.position;
    this.v.subVectors(a.target, p);
    this.v.y = 0;
    const d = this.v.length();
    const want = Math.atan2(this.v.x, this.v.z);
    let da = want - a.heading;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    a.heading += da * Math.min(1, dt * turn);
    a.speed += (speed - a.speed) * Math.min(1, dt * 3);
    p.x += Math.sin(a.heading) * a.speed * dt;
    p.z += Math.cos(a.heading) * a.speed * dt;
    p.y = heightAt(p.x, p.z);
    a.root.rotation.y = a.heading;
    return d;
  }

  private animate(a: Animal, dt: number) {
    if (a.mixer) {
      // Keep feet planted: play moving clips at the rate the animal travels.
      const sp = this.models[a.kind]?.def.speeds ?? ANIMAL_SPEED[a.kind];
      const c = a.current;
      if (c && (c === 'walk' || c === 'trot' || c === 'run')) {
        const act = a.actions[c] ?? a.actions.walk;
        if (act) act.timeScale = Math.max(0.3, a.speed / (sp[c] ?? 1));
      }
      a.mixer.update(dt);
      return;
    }
    // Stand-in: swing legs with speed, lower the head to graze.
    a.phase += dt * (2 + a.speed * 3.2);
    a.legs?.forEach((l, i) => (l.rotation.x = Math.sin(a.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * Math.min(0.7, a.speed * 0.25)));
    if (a.head) {
      const down = a.current === 'graze' || a.current === 'sniff' ? 1 : 0;
      a.head.rotation.x += (down * 1.1 - a.head.rotation.x) * Math.min(1, dt * 3);
    }
  }

  private updateDeer(dt: number, ctx: FaunaContext) {
    const timeOk = ctx.dawn > 0.2 || ctx.dusk > 0.2 || (ctx.day > 0.5 && Math.random() < 0.3);
    if (this.available.deer && this.welcome.deer && !this.herd.length && ctx.rain < 0.7) {
      this.deerIn -= dt;
      if (this.deerIn <= 0 && timeOk) {
        const start = this.edgePoint(ctx.walker);
        const spot = this.grazingSpot(ctx);
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const a = this.spawn('deer', start.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4)));
          a.target.copy(spot).add(new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5));
          a.timer = 120 + Math.random() * 120;
          this.herd.push(a);
        }
      }
    }
    if (!this.herd.length) return;
    const near = Math.min(...this.herd.map((a) => a.root.position.distanceTo(ctx.walker)));
    for (const a of this.herd) {
      const dWalker = a.root.position.distanceTo(ctx.walker);
      a.timer -= dt;
      // Startle: too close, or someone running nearby. One bolts, they all bolt.
      if (a.state !== 'bolt' && (near < 9 || (near < 16 && ctx.walkerSpeed > 3))) {
        a.state = 'bolt';
        this.v.subVectors(a.root.position, ctx.walker).setY(0).normalize();
        a.target.copy(a.root.position).addScaledVector(this.v, 80);
      } else if ((a.state === 'graze' || a.state === 'wander') && near < 18 && ctx.walkerSpeed > 0.3) {
        a.state = 'alert';
        a.timer = Math.max(a.timer, 0);
        a.wait = 1.5 + Math.random() * 2;
      }
      switch (a.state) {
        case 'enter': {
          this.play(a, 'walk');
          if (this.move(a, dt, ANIMAL_SPEED.deer.walk) < 1) {
            a.state = 'graze';
            a.wait = 6 + Math.random() * 10;
          }
          break;
        }
        case 'graze':
          this.play(a, 'graze');
          a.speed = 0;
          a.wait -= dt;
          if (a.wait <= 0) {
            a.state = 'wander';
            const r = a.root.position;
            a.target.set(r.x + (Math.random() - 0.5) * 6, 0, r.z + (Math.random() - 0.5) * 6);
          }
          if (a.timer <= 0) {
            a.state = 'leave';
            a.target.copy(this.edgePoint(ctx.walker, GARDEN_RADIUS + 22));
          }
          break;
        case 'wander':
          this.play(a, 'walk');
          if (this.move(a, dt, ANIMAL_SPEED.deer.walk * 0.7, 2) < 0.6 || waterAt(a.root.position.x, a.root.position.z) !== null) {
            a.state = 'graze';
            a.wait = 5 + Math.random() * 12;
          }
          break;
        case 'alert': {
          // Head up, turned toward you, very still.
          this.play(a, 'alert');
          a.speed = 0;
          const want = Math.atan2(ctx.walker.x - a.root.position.x, ctx.walker.z - a.root.position.z);
          let da = want - a.heading;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          a.heading += da * Math.min(1, dt * 1.5);
          a.root.rotation.y = a.heading;
          if (ctx.walkerSpeed < 0.2) a.wait -= dt;
          if (a.wait <= 0 && dWalker > 14) {
            a.state = 'graze';
            a.wait = 4 + Math.random() * 6;
          }
          break;
        }
        case 'bolt':
          this.play(a, 'run');
          this.move(a, dt, ANIMAL_SPEED.deer.run, 5);
          break;
        case 'leave':
          this.play(a, 'walk');
          this.move(a, dt, ANIMAL_SPEED.deer.walk);
          break;
      }
      if (dWalker < 40) this.seen.deer = true;
      this.animate(a, dt);
    }
    // Gone once out of the grove.
    const keep = this.herd.filter((a) => Math.hypot(a.root.position.x, a.root.position.z) < GARDEN_RADIUS + 26);
    if (keep.length < this.herd.length) {
      for (const a of this.herd) if (!keep.includes(a)) this.despawn(a);
      this.herd = keep;
      if (!keep.length) this.deerIn = 240 + Math.random() * 360;
    }
  }

  private updateFox(dt: number, ctx: FaunaContext) {
    if (this.available.fox && this.welcome.fox && !this.fox && ctx.dusk > 0.3 && ctx.rain < 0.5) {
      this.foxIn -= dt;
      if (this.foxIn <= 0) {
        this.fox = this.spawn('fox', this.edgePoint(ctx.walker));
        this.fox.target.copy(this.grazingSpot(ctx));
        this.fox.timer = 90 + Math.random() * 60;
      }
    }
    const a = this.fox;
    if (!a) return;
    const dWalker = a.root.position.distanceTo(ctx.walker);
    a.timer -= dt;
    if (dWalker < 7 && a.state !== 'leave') {
      a.state = 'leave';
      this.v.subVectors(a.root.position, ctx.walker).setY(0).normalize();
      a.target.copy(a.root.position).addScaledVector(this.v, 90);
    }
    switch (a.state) {
      case 'trot':
        this.play(a, 'trot');
        if (this.move(a, dt, ANIMAL_SPEED.fox.trot, 4) < 1.2) {
          a.state = Math.random() < 0.5 ? 'sniff' : 'sit';
          a.wait = 3 + Math.random() * 6;
        }
        break;
      case 'sniff':
      case 'sit':
        this.play(a, a.state);
        a.speed = 0;
        a.wait -= dt;
        if (a.wait <= 0) {
          if (a.timer <= 0) {
            a.state = 'leave';
            a.target.copy(this.edgePoint(ctx.walker, GARDEN_RADIUS + 22));
          } else {
            a.state = 'trot';
            const r = a.root.position;
            const ang = Math.random() * Math.PI * 2;
            a.target.set(r.x + Math.cos(ang) * 12, 0, r.z + Math.sin(ang) * 12);
            if (waterAt(a.target.x, a.target.z) !== null || Math.hypot(a.target.x, a.target.z) > GARDEN_RADIUS) a.target.multiplyScalar(0.6);
          }
        }
        break;
      case 'leave':
        this.play(a, dWalker < 12 ? 'run' : 'trot');
        this.move(a, dt, dWalker < 12 ? ANIMAL_SPEED.fox.run : ANIMAL_SPEED.fox.trot, 5);
        break;
    }
    if (dWalker < 40) this.seen.fox = true;
    this.animate(a, dt);
    if (Math.hypot(a.root.position.x, a.root.position.z) > GARDEN_RADIUS + 26) {
      this.despawn(a);
      this.fox = null;
      this.foxIn = 300 + Math.random() * 400;
    }
  }

  /** A stag stands on Sunset Ridge at dawn, once a day, if you are anywhere near. */
  private stag: Animal | null = null;
  private stagDay = -1;
  private updateStag(dt: number, ctx: FaunaContext) {
    const ridge = placeById('ridge');
    const today = Math.floor(Date.now() / 864e5);
    const near = Math.hypot(ctx.walker.x - ridge.x, ctx.walker.z - ridge.z);
    if (!this.stag) {
      if (this.available.deer && ctx.dawn > 0.5 && near < 380 && near > 40 && this.stagDay !== today) {
        this.stagDay = today;
        const x = ridge.x + 9, z = ridge.z + 5;
        this.stag = this.spawn('deer', new THREE.Vector3(x, heightAt(x, z), z));
        this.stag.root.scale.multiplyScalar(1.15);
        // Facing east, toward the grove and the rising sun.
        this.stag.heading = Math.PI / 2;
        this.stag.root.rotation.y = this.stag.heading;
        this.stag.state = 'alert';
      }
      return;
    }
    const a = this.stag;
    const d = a.root.position.distanceTo(ctx.walker);
    if (d < 60) this.seen.deer = true;
    if (a.state === 'alert') {
      this.play(a, 'alert');
      a.speed = 0;
      if (d < 30 || ctx.dawn < 0.05) {
        // Gone over the far side of the ridge.
        a.state = 'bolt';
        a.target.set(ridge.x - 160, 0, ridge.z + (Math.random() - 0.5) * 60);
      }
    } else {
      this.play(a, 'run');
      this.move(a, dt, ANIMAL_SPEED.deer.run, 4);
      if (Math.hypot(a.root.position.x - ridge.x, a.root.position.z - ridge.z) > 130) {
        this.despawn(a);
        this.stag = null;
        return;
      }
    }
    this.animate(a, dt);
  }

  private perchIn = 0;
  update(dt: number, time: number, ctx: FaunaContext) {
    this.updateStag(dt, ctx);
    this.perchIn -= dt;
    if (this.perchIn <= 0) {
      this.perchIn = 4;
      this.refreshPerches(ctx);
    }
    this.updateBirds(dt, time, ctx);
    this.updateDeer(dt, ctx);
    this.updateFox(dt, ctx);
  }

  /** Dev: bring the animals in now. */
  summon(ctx: FaunaContext) {
    this.deerIn = 0;
    this.foxIn = 0;
    for (const b of this.birds) b.wait = Math.random() * 0.5;
    this.refreshPerches(ctx);
  }
}

/** Stand-in bodies for testing behaviour without the model pack. */
function proxyBody(kind: 'deer' | 'fox') {
  const deer = kind === 'deer';
  const col = deer ? 0x8a6040 : 0xc0602a;
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 });
  const root = new THREE.Group();
  const L = deer ? 1.3 : 0.7, H = deer ? 0.85 : 0.32, W = deer ? 0.32 : 0.2;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(W, L * 0.7, 4, 8).rotateX(Math.PI / 2), mat);
  body.position.y = H + W * 0.2;
  const neck = new THREE.Group();
  neck.position.set(0, H + W * 0.6, L * 0.48);
  const head = new THREE.Mesh(new THREE.ConeGeometry(W * 0.55, W * 2, 8).rotateX(Math.PI / 2), mat);
  head.position.set(0, deer ? 0.45 : 0.1, W * 0.9);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.3, W * 0.4, deer ? 0.55 : 0.18), mat);
  neckMesh.position.y = deer ? 0.22 : 0.05;
  neckMesh.rotation.x = 0.4;
  neck.add(neckMesh, head);
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[W * 0.6, L * 0.38], [-W * 0.6, L * 0.38], [W * 0.6, -L * 0.38], [-W * 0.6, -L * 0.38]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, H, z);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.12, W * 0.08, H), mat);
    leg.position.y = -H / 2;
    pivot.add(leg);
    legs.push(pivot);
    root.add(pivot);
  }
  if (!deer) {
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.35, 4, 6).rotateX(Math.PI / 2 + 0.6), new THREE.MeshStandardMaterial({ color: 0xd0702e }));
    tail.position.set(0, H + 0.05, -L * 0.6);
    root.add(tail);
  }
  root.add(body, neck);
  root.traverse((o) => (o.castShadow = true));
  return { root, legs, head: neck };
}

// Groves: a ring of standing stones around a seedbed, the motes of feeling
// scattered nearby, the beacon that guides you there and the great tree that
// grows when the seed is planted. Also the personal "feeling blooms".

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Noise2D, clamp01, easeInOutCubic, mulberry32 } from '../core/math';
import { HEART_POS, MOODS, MOOD_BY_ID, MOTES_PER_GROVE, type MoodDef, type MoodId } from '../data/moods';
import type { JournalEntry } from '../core/store';
import { G, patchMaterial, replace } from '../render/shared';
import { MoodTree, type Collider, type Flora } from '../world/flora';
import type { Bursts, GlowField } from '../world/particles';
import type { Terrain } from '../world/terrain';

export interface Mote {
  id: string;
  mood: MoodId;
  home: THREE.Vector3;
  pos: THREE.Vector3;
  state: 'idle' | 'follow' | 'deliver' | 'gone';
  phase: number;
  t: number;
  delay: number;
}

function stoneGeometry(seed: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 2.9, 0.6, 3, 7, 2);
  const noise = new Noise2D(seed);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    const y = p.getY(i) + 1.45;
    let z = p.getZ(i);
    const k = 1 - (y / 2.9) * 0.38;
    x *= k;
    z *= k;
    x += noise.get(y * 0.9 + seed, z * 2) * 0.09;
    z += noise.get(x * 2, y * 0.9 - seed) * 0.07;
    p.setXYZ(i, x, y - 0.35 + noise.get(x * 3, z * 3) * 0.05 * (y > 2.8 ? 3 : 0), z);
  }
  g.computeVertexNormals();
  return g;
}

const BEACON_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vDist;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  vDist = length((modelViewMatrix * vec4(0., 0., 0., 1.)).xyz);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BEACON_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uAlpha, uTime;
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vDist;
void main() {
  float rim = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
  // Fade the base so the pillar never reads as a solid tube up close.
  float h = pow(1. - vUv.y, 1.6) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(6., 40., vDist);
  float flow = 0.75 + 0.25 * sin(vUv.y * 60. - uTime * 2.5);
  gl_FragColor = vec4(uColor * rim * h * flow * uAlpha, 0.);
}`;

export class Grove {
  readonly def: MoodDef;
  readonly index: number;
  readonly center = new THREE.Vector3();
  readonly group = new THREE.Group();
  readonly motes: Mote[] = [];
  readonly tree: MoodTree;
  readonly color: THREE.Color;
  readonly soft: THREE.Color;
  awake = false;
  /** 0..1 while the tree grows; drives runes, lanterns and the camera. */
  grow = 0;
  growing = false;
  private runes: THREE.MeshBasicMaterial;
  private beaconMat: THREE.ShaderMaterial;
  private beacon: THREE.Mesh;
  private sprout: THREE.Group;
  private beaconAlpha = 0;

  constructor(def: MoodDef, index: number, terrain: Terrain, flora: Flora, colliders: (c: Collider) => void) {
    this.def = def;
    this.index = index;
    this.color = new THREE.Color(def.color);
    this.soft = new THREE.Color(def.soft);
    const [x, z] = def.pos;
    this.center.set(x, terrain.heightAt(x, z), z);
    this.group.position.copy(this.center);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8d8a86, roughness: 0.9, flatShading: true });
    this.runes = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const toHeart = Math.atan2(HEART_POS[1] - z, HEART_POS[0] - x);
    const stones = 6;
    for (let i = 1; i < stones; i++) {
      // Leave the gap facing the Heart Tree so the path walks straight in.
      const a = toHeart + (i / stones) * Math.PI * 2;
      const r = 5.6;
      const sx = Math.cos(a) * r;
      const sz = Math.sin(a) * r;
      const st = new THREE.Mesh(stoneGeometry(index * 10 + i), stoneMat);
      st.position.set(sx, terrain.heightAt(x + sx, z + sz) - this.center.y, sz);
      st.rotation.y = -a + Math.PI / 2;
      st.rotation.z = (((i * 37) % 7) - 3) * 0.02;
      st.scale.setScalar(0.9 + ((i * 53) % 5) * 0.06);
      st.castShadow = st.receiveShadow = true;
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 1.25), this.runes);
      rune.position.set(0, 1.25, -0.27);
      rune.rotation.y = Math.PI;
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.11, 6), this.runes);
      dot.position.set(0, 2.15, -0.25);
      dot.rotation.y = Math.PI;
      st.add(rune, dot);
      this.group.add(st);
      colliders({ x: x + sx, z: z + sz, r: 0.62 });
    }
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 0.5, 9), stoneMat);
    dais.position.y = 0.05;
    dais.receiveShadow = true;
    const soil = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 1 }),
    );
    soil.scale.y = 0.3;
    soil.position.y = 0.28;
    soil.receiveShadow = true;
    // A sleeping seedling waits on the mound until the grove is woken.
    this.sprout = new THREE.Group();
    const leafGeo = new THREE.SphereGeometry(0.16, 8, 6);
    leafGeo.scale(1, 0.25, 0.55);
    leafGeo.translate(0.16, 0, 0);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x8a9a80, roughness: 0.8 });
    for (let i = 0; i < 2; i++) {
      const lf = new THREE.Mesh(leafGeo, leafMat);
      lf.rotation.set(0, i * Math.PI, 0.5);
      lf.position.y = 0.32;
      this.sprout.add(lf);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.34, 6), leafMat);
    stem.position.y = 0.17;
    this.sprout.add(stem);
    this.sprout.position.y = 0.7;
    this.group.add(dais, soil, this.sprout);

    this.beaconMat = new THREE.ShaderMaterial({
      vertexShader: BEACON_VERT,
      fragmentShader: BEACON_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      uniforms: { uColor: { value: this.color.clone() }, uAlpha: { value: 0 }, uTime: G.uTime },
    });
    const bg = new THREE.CylinderGeometry(0.4, 1.1, 170, 20, 1, true);
    bg.translate(0, 85, 0);
    this.beacon = new THREE.Mesh(bg, this.beaconMat);
    this.beacon.frustumCulled = false;
    this.beacon.renderOrder = 4;
    this.group.add(this.beacon);

    this.tree = new MoodTree(def.id, flora.textures);
    this.tree.group.position.y = 0.3;
    this.group.add(this.tree.group);

    // Scatter this grove's motes through the surrounding land.
    const rng = mulberry32(1000 + index * 97);
    for (let i = 0; i < MOTES_PER_GROVE; i++) {
      let mx = x;
      let mz = z;
      for (let tries = 0; tries < 60; tries++) {
        const a = (i / MOTES_PER_GROVE) * Math.PI * 2 + rng() * 1.1;
        const r = 17 + rng() * 30;
        mx = x + Math.cos(a) * r;
        mz = z + Math.sin(a) * r;
        if (terrain.heightAt(mx, mz) < 1.3 || terrain.slopeAt(mx, mz) > 0.32) continue;
        if (Math.hypot(mx - HEART_POS[0], mz - HEART_POS[1]) < 14) continue;
        let clear = true;
        for (const c of flora.colliders) {
          if (Math.abs(c.x - mx) < 3 && Math.abs(c.z - mz) < 3 && Math.hypot(c.x - mx, c.z - mz) < c.r + 1.4) {
            clear = false;
            break;
          }
        }
        if (clear) break;
      }
      // One mote in each grove floats high: jump, or glide down onto it.
      const lift = i === MOTES_PER_GROVE - 1 ? 3.3 : 1.15;
      const home = new THREE.Vector3(mx, terrain.heightAt(mx, mz) + lift, mz);
      this.motes.push({ id: `${def.id}-${i}`, mood: def.id, home, pos: home.clone(), state: 'idle', phase: rng() * 10, t: 0, delay: 0 });
    }
    this.apply();
  }

  get carried() {
    return this.motes.filter((m) => m.state === 'follow').length;
  }
  get remaining() {
    return this.motes.filter((m) => m.state === 'idle').length;
  }

  /** Jump straight to a saved state. */
  restore(awake: boolean, collected: string[]) {
    this.awake = awake;
    this.grow = awake ? 1 : 0;
    this.growing = false;
    for (const m of this.motes) {
      m.pos.copy(m.home);
      m.state = awake ? 'gone' : collected.includes(m.id) ? 'follow' : 'idle';
    }
    this.apply();
  }

  beginAwaken() {
    this.growing = true;
    this.grow = 0;
    let i = 0;
    for (const m of this.motes) {
      if (m.state === 'follow') {
        m.state = 'deliver';
        m.t = 0;
        m.delay = i++ * 0.28;
      }
    }
  }

  private apply() {
    const g = this.grow;
    this.tree.setGrow(easeInOutCubic(clamp01(g)));
    this.sprout.visible = g < 0.05;
    this.runes.color.copy(this.color).multiplyScalar(0.12 + clamp01(g * 2) * 2.6);
  }

  update(dt: number, showBeacon: boolean, night: number) {
    if (this.growing) {
      this.grow += dt / 8.5;
      if (this.grow >= 1) {
        this.grow = 1;
        this.growing = false;
        this.awake = true;
      }
      this.apply();
    }
    this.tree.setNight(night);
    if (this.awake && !this.growing) {
      this.runes.color.copy(this.color).multiplyScalar(1.3 + night * 1.6 + Math.sin(G.uTime.value * 1.5 + this.index) * 0.25);
    }
    const want = showBeacon && !this.awake && !this.growing ? 1 : 0;
    this.beaconAlpha += (want - this.beaconAlpha) * Math.min(1, dt * 1.5);
    this.beacon.visible = this.beaconAlpha > 0.01;
    this.beaconMat.uniforms.uAlpha.value = this.beaconAlpha * (0.5 + night * 0.5 + 0.12 * Math.sin(G.uTime.value * 1.3));
    this.sprout.rotation.y += dt * 0.4;
  }
}

export interface MoteEvents {
  collected: Mote[];
  delivered: Mote[];
}

export class Groves {
  readonly group = new THREE.Group();
  readonly list: Grove[] = [];
  readonly heartStones: THREE.MeshBasicMaterial[] = [];
  readonly events: MoteEvents = { collected: [], delivered: [] };
  private tmp = new THREE.Vector3();
  private col = new THREE.Color();

  constructor(terrain: Terrain, flora: Flora, colliders: (c: Collider) => void) {
    MOODS.forEach((m, i) => {
      const g = new Grove(m, i, terrain, flora, colliders);
      this.list.push(g);
      this.group.add(g.group);
    });
    // Six small marker stones ring the Heart Tree, one per feeling.
    const hy = terrain.heightAt(HEART_POS[0], HEART_POS[1]);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8d8a86, roughness: 0.9, flatShading: true });
    MOODS.forEach((m, i) => {
      const a = Math.atan2(m.pos[1], m.pos[0]);
      const x = HEART_POS[0] + Math.cos(a) * 9.5;
      const z = HEART_POS[1] + Math.sin(a) * 9.5;
      const st = new THREE.Mesh(stoneGeometry(200 + i), stoneMat);
      st.scale.setScalar(0.5);
      st.position.set(x, terrain.heightAt(x, z), z);
      st.rotation.y = -a + Math.PI / 2;
      st.castShadow = st.receiveShadow = true;
      const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.3), mat);
      rune.position.set(0, 1.3, -0.3);
      rune.rotation.y = Math.PI;
      st.add(rune);
      this.heartStones.push(mat);
      this.group.add(st);
      colliders({ x, z, r: 0.4 });
      void hy;
    });
  }

  byId(id: MoodId) {
    return this.list.find((g) => g.def.id === id)!;
  }
  get carrying() {
    let n = 0;
    for (const g of this.list) n += g.carried;
    return n;
  }
  nearest(p: THREE.Vector3): { grove: Grove; dist: number } {
    let best = this.list[0];
    let bd = 1e9;
    for (const g of this.list) {
      const d = Math.hypot(p.x - g.center.x, p.z - g.center.z);
      if (d < bd) {
        bd = d;
        best = g;
      }
    }
    return { grove: best, dist: bd };
  }

  update(dt: number, player: { pos: THREE.Vector3; wisp: THREE.Vector3; yaw: number }, glow: GlowField, bursts: Bursts, night: number, showBeacons: boolean, time: number) {
    const ev = this.events;
    ev.collected.length = 0;
    ev.delivered.length = 0;
    let follower = 0;
    const total = Math.max(1, this.carrying);
    this.list.forEach((g, gi) => {
      g.update(dt, showBeacons, night);
      this.heartStones[gi].color.copy(g.color).multiplyScalar(g.awake ? 1.6 + night * 1.5 : showBeacons ? 0.25 : 0.05);
      for (const m of g.motes) {
        if (m.state === 'gone') continue;
        m.phase += dt;
        if (m.state === 'idle') {
          const bob = Math.sin(m.phase * 1.4) * 0.22;
          this.tmp.set(player.pos.x, player.pos.y + 1.0, player.pos.z);
          const dx = this.tmp.x - m.pos.x;
          const dy = this.tmp.y - m.pos.y;
          const dz = this.tmp.z - m.pos.z;
          const dh = Math.hypot(dx, dz);
          if (dh < 5.5 && Math.abs(dy) < 3.2) {
            // Drawn toward the keeper once close.
            const pull = (1 - dh / 5.5) * 9 * dt;
            m.pos.x += (dx / (dh || 1)) * pull;
            m.pos.z += (dz / (dh || 1)) * pull;
            m.pos.y += Math.sign(dy) * Math.min(Math.abs(dy), pull * 0.8);
          } else {
            m.pos.x += (m.home.x - m.pos.x) * dt;
            m.pos.z += (m.home.z - m.pos.z) * dt;
            m.pos.y += (m.home.y + bob - m.pos.y) * dt * 3;
          }
          if (dh < 1.5 && Math.abs(dy) < 2.1) {
            m.state = 'follow';
            ev.collected.push(m);
            bursts.emit(m.pos, g.soft, { count: 26, speed: 3.2, life: 1.1, size: 0.3, bright: 2.5 });
          }
          const pulse = 0.85 + 0.15 * Math.sin(m.phase * 3);
          glow.add(m.pos, g.soft, 1.7 * pulse, 1.9);
          glow.add(m.pos, g.color, 0.5, 4);
          if (Math.random() < dt * 5) bursts.emit(m.pos, g.color, { count: 1, speed: 0.4, up: 0.5, life: 1.4, size: 0.12, gravity: 0.2 });
        } else if (m.state === 'follow') {
          // Collected motes trail behind in a slow orbit.
          const a = time * 1.5 + (follower / total) * Math.PI * 2;
          const back = 0.9 + (follower % 3) * 0.25;
          this.tmp.set(
            player.pos.x - Math.sin(player.yaw) * back + Math.cos(a) * 0.55,
            player.pos.y + 1.25 + Math.sin(a * 1.3) * 0.3 + (follower % 2) * 0.25,
            player.pos.z - Math.cos(player.yaw) * back + Math.sin(a) * 0.55,
          );
          m.pos.lerp(this.tmp, 1 - Math.exp(-(5 - Math.min(3, follower * 0.35)) * dt));
          follower++;
          glow.add(m.pos, g.soft, 0.75, 1.6);
          glow.add(m.pos, g.color, 0.28, 3.5);
        } else if (m.state === 'deliver') {
          m.delay -= dt;
          if (m.delay <= 0) {
            m.t += dt;
            this.tmp.copy(g.center).y += 1.0;
            m.pos.lerp(this.tmp, 1 - Math.exp(-4.5 * dt));
            m.pos.y += Math.sin(Math.min(1, m.t) * Math.PI) * dt * 3;
            if (m.pos.distanceTo(this.tmp) < 0.35 || m.t > 2.2) {
              m.state = 'gone';
              ev.delivered.push(m);
              bursts.emit(this.tmp, g.soft, { count: 30, speed: 4, up: 2, life: 1.3, size: 0.32, bright: 3 });
            }
          } else {
            follower++;
          }
          glow.add(m.pos, g.soft, 0.9, 2);
        }
      }
      if (g.growing) {
        // Sparks spiral up the trunk as it rises.
        const h = g.tree.height * g.grow;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 0.6 + Math.random() * 3.2 * g.grow;
          this.tmp.set(g.center.x + Math.cos(a) * r, g.center.y + Math.random() * h, g.center.z + Math.sin(a) * r);
          bursts.emit(this.tmp, Math.random() < 0.5 ? g.soft : g.color, { count: 1, speed: 1.2, up: 2.2, life: 1.8, size: 0.26, gravity: 0.6, bright: 2.4 });
        }
      } else if (!g.awake) {
        // Dormant seedbed breathes faintly.
        this.tmp.copy(g.center).y += 1.25;
        this.col.copy(g.color);
        glow.add(this.tmp, this.col, 1.2 + Math.sin(time * 1.6 + gi) * 0.3, 0.5 + (showBeacons ? 0.6 : 0));
      }
    });
  }
}

// ------------------------------------------------------- feeling blooms
const PER = 6;
const CAP = 64;

/** Flowers the player plants by naming how they feel. They persist with the journal. */
export class FeelingGarden {
  readonly group = new THREE.Group();
  private stems: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private items: { e: JournalEntry; y: number; grow: number; seed: number }[] = [];
  private terrain: Terrain;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();
  private c = new THREE.Color();
  private dirty = true;

  constructor(terrain: Terrain) {
    this.terrain = terrain;
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.02, 1, 5);
    stemGeo.translate(0, 0.5, 0);
    const leaf = new THREE.SphereGeometry(0.1, 6, 4);
    leaf.scale(1, 0.15, 0.45);
    leaf.translate(0.1, 0.35, 0);
    const stemAll = mergeGeometries([stemGeo, leaf])!;
    const bell = new THREE.LatheGeometry(
      [[0.0, 0.0], [0.07, 0.02], [0.115, 0.1], [0.1, 0.2], [0.13, 0.27], [0.1, 0.25], [0.075, 0.18], [0.0, 0.08]].map((v) => new THREE.Vector2(v[0], v[1])),
      10,
    );
    this.stems = new THREE.InstancedMesh(stemAll, new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.8 }), CAP * PER);
    const headMat = patchMaterial(
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide }),
      'feelhead',
      (s) => {
        s.fragmentShader = replace(s.fragmentShader, '#include <common>', '#include <common>\nuniform float uNight;');
        s.fragmentShader = replace(
          s.fragmentShader,
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance += vColor.rgb * (0.35 + 2.2 * uNight);\n#endif',
        );
      },
    );
    this.heads = new THREE.InstancedMesh(bell, headMat, CAP * PER);
    for (const m of [this.stems, this.heads]) {
      m.count = 0;
      m.castShadow = true;
      m.frustumCulled = false;
      this.group.add(m);
    }
  }

  set(entries: JournalEntry[]) {
    this.items = entries.slice(-CAP).map((e, i) => ({ e, y: this.terrain.heightAt(e.x, e.z), grow: 1, seed: i * 13 + Math.floor(e.time % 997) }));
    this.dirty = true;
  }
  plant(e: JournalEntry) {
    if (this.items.length >= CAP) this.items.shift();
    this.items.push({ e, y: this.terrain.heightAt(e.x, e.z), grow: 0, seed: Math.floor(e.time % 99991) });
    this.dirty = true;
  }

  update(dt: number, glow: GlowField, time: number, night: number) {
    let n = 0;
    let animating = false;
    for (const it of this.items) {
      if (it.grow < 1) {
        it.grow = Math.min(1, it.grow + dt / 3.2);
        animating = true;
      }
    }
    for (const it of this.items) {
      const def = MOOD_BY_ID[it.e.mood];
      this.c.set(def.color);
      this.p.set(it.e.x, it.y + 0.9, it.e.z);
      glow.add(this.p, this.c, 1.6 * it.grow, (0.25 + night * 0.8) * (0.85 + 0.15 * Math.sin(time * 2 + it.seed)));
      if (!this.dirty && !animating) continue;
      const rng = mulberry32(it.seed + 1);
      for (let k = 0; k < PER; k++) {
        const a = (k / PER) * Math.PI * 2 + rng() * 1.2;
        const r = k === 0 ? 0 : 0.25 + rng() * 0.55;
        const x = it.e.x + Math.cos(a) * r;
        const z = it.e.z + Math.sin(a) * r;
        const h = (k === 0 ? 1.05 : 0.45 + rng() * 0.5) * easeInOutCubic(clamp01(it.grow * 1.4 - k * 0.07));
        const y = this.terrain.heightAt(x, z);
        this.e.set((rng() - 0.5) * 0.35, rng() * 6.28, (rng() - 0.5) * 0.35);
        this.q.setFromEuler(this.e);
        this.m4.compose(this.p.set(x, y - 0.02, z), this.q, this.s.set(1, Math.max(h, 0.001), 1));
        this.stems.setMatrixAt(n, this.m4);
        const hs = (k === 0 ? 1.5 : 0.9 + rng() * 0.5) * clamp01(it.grow * 2.2 - 0.9 - k * 0.05);
        this.p.set(0, h, 0).applyQuaternion(this.q).add(this.s.set(x, y - 0.02, z));
        this.m4.compose(this.p, this.q, this.s.set(hs, hs, hs).addScalar(0.0001));
        this.heads.setMatrixAt(n, this.m4);
        this.c.set(k % 3 === 2 ? def.soft : def.color);
        this.heads.setColorAt(n, this.c);
        n++;
      }
    }
    if (this.dirty || animating) {
      this.stems.count = this.heads.count = this.items.length * PER;
      this.stems.instanceMatrix.needsUpdate = true;
      this.heads.instanceMatrix.needsUpdate = true;
      if (this.heads.instanceColor) this.heads.instanceColor.needsUpdate = true;
      this.dirty = false;
    }
  }
}

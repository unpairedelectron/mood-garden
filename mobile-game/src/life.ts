// Wildlife that moves in on its own as the forest grows. Nothing is placed by
// the player: each creature has a condition, and arrives once the grove meets it.

import * as THREE from 'three';
import type { Forest } from './forest';
import { LIGHT } from './forest';
import { MOOD_BY_ID } from './moods';
import type { TreeSave } from './state';
import { heightAt } from './terrain';

export interface Creature {
  id: string;
  name: string;
  needs: string;
  here: boolean;
}

interface Stats {
  grown: number;
  flowering: number;
  conifers: number;
  kinds: number;
}

function wingTexture(kind: number): THREE.CanvasTexture {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const palettes = [
    ['#e8791c', '#f6b24a', '#1b120c'],
    ['#f4f0dc', '#ffffff', '#3a3a34'],
    ['#2b62c9', '#7fc2ff', '#0c1220'],
    ['#f2d53a', '#fff3a0', '#3b2c10'],
  ];
  const [a, b, edge] = palettes[kind % palettes.length];
  // One wing, hinge on the left edge: fore-wing and hind-wing lobes.
  const lobe = (pts: number[][]) => {
    g.beginPath();
    g.moveTo(pts[0][0] * S, pts[0][1] * S);
    for (let i = 1; i < pts.length; i += 3) g.bezierCurveTo(pts[i][0] * S, pts[i][1] * S, pts[i + 1][0] * S, pts[i + 1][1] * S, pts[i + 2][0] * S, pts[i + 2][1] * S);
    g.closePath();
  };
  const fore = [[0.02, 0.5], [0.2, 0.05], [0.8, 0.0], [0.97, 0.2], [0.95, 0.42], [0.6, 0.5], [0.02, 0.54]];
  const hind = [[0.02, 0.52], [0.5, 0.52], [0.86, 0.62], [0.78, 0.84], [0.6, 1.0], [0.2, 0.9], [0.02, 0.58]];
  for (const shape of [fore, hind]) {
    lobe(shape);
    const grd = g.createRadialGradient(0, S * 0.52, 2, 0, S * 0.52, S);
    grd.addColorStop(0, b);
    grd.addColorStop(0.55, a);
    grd.addColorStop(0.86, edge);
    g.fillStyle = grd;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = edge;
    g.globalAlpha = 0.55;
    g.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(0, S * 0.52);
      const ang = -1.1 + i * 0.27;
      g.lineTo(Math.cos(ang) * S * 1.1, S * 0.52 + Math.sin(ang) * S * 1.1);
      g.stroke();
    }
    g.globalAlpha = 0.9;
    g.fillStyle = '#fffdf2';
    for (let i = 0; i < 7; i++) {
      const ang = -0.9 + i * 0.3;
      g.beginPath();
      g.arc(Math.cos(ang) * S * 0.86, S * 0.52 + Math.sin(ang) * S * 0.86 * 0.55, 2.2, 0, 7);
      g.fill();
    }
    g.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Butterfly {
  root: THREE.Group;
  left: THREE.Mesh;
  right: THREE.Mesh;
  target: THREE.Vector3;
  vel: THREE.Vector3;
  rest: number;
  seed: number;
}

const POINT_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uCenter; uniform float uTime, uPx, uShow, uMode;
varying float vA;
void main() {
  vec3 p = position;
  float t = uTime;
  if (uMode < .5) {
    // fireflies: slow wander, wrapped around the walker
    p += vec3(sin(t * .4 + aSeed.x * 30.), sin(t * .6 + aSeed.y * 30.) * .35, cos(t * .37 + aSeed.z * 30.)) * 1.4;
    vec3 box = vec3(36., 3., 36.);
    vec3 rel = mod(p - uCenter + box * .5, box) - box * .5;
    p = uCenter + rel;
    p.y = uCenter.y - 1.3 + aSeed.y * 2.6 + sin(t * .6 + aSeed.z * 9.) * .3;
    vA = smoothstep(.15, 1., sin(t * (1. + aSeed.x * 1.4) + aSeed.z * 50.)) * (1. - smoothstep(13., 18., length(rel.xz)));
  } else {
    // bees: tight, jittery loops around a flower
    p += vec3(sin(t * (5. + aSeed.x * 4.) + aSeed.y * 9.), sin(t * 7.3 + aSeed.z * 20.) * .4, cos(t * (4.4 + aSeed.y * 4.) + aSeed.x * 9.)) * (.18 + aSeed.w * .3);
    vA = 1.;
  }
  vec4 mv = viewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (uMode < .5 ? .12 : .022) * uPx / max(-mv.z, .1);
  vA *= uShow;
}`;
const POINT_FRAG = /* glsl */ `
uniform float uMode; varying float vA;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  if (uMode < .5) {
    float a = pow(max(1. - d, 0.), 2.2) * vA;
    gl_FragColor = vec4(vec3(.82, 1., .35) * a * 2.4, 0.);
  } else {
    if (d > 1.) discard;
    gl_FragColor = vec4(mix(vec3(.5, .36, .05), vec3(.05, .04, .03), step(.45, fract(gl_PointCoord.x * 2.5))) * vA, vA);
  }
  #include <colorspace_fragment>
}`;

export class Wildlife {
  readonly group = new THREE.Group();
  readonly creatures: Creature[] = [
    { id: 'butterflies', name: 'Butterflies', needs: 'Two grown trees, or one that flowers', here: false },
    { id: 'bees', name: 'Bees', needs: 'A flowering tree (Love or Sorrow), grown', here: false },
    { id: 'crickets', name: 'Crickets', needs: 'Two grown trees — listen after dark', here: false },
    { id: 'fireflies', name: 'Fireflies', needs: 'Three grown trees — visit at night', here: false },
    { id: 'songbirds', name: 'Songbirds', needs: 'Four grown trees', here: false },
    { id: 'flock', name: 'A passing flock', needs: 'Six grown trees of at least three kinds', here: false },
  ];
  private butterflies: Butterfly[] = [];
  private wingMats: THREE.MeshStandardMaterial[] = [];
  private wingGeo: THREE.BufferGeometry;
  private spots: THREE.Vector3[] = [];
  private stats: Stats = { grown: 0, flowering: 0, conifers: 0, kinds: 0 };
  private night = false;
  private fire: THREE.Points;
  private bees: THREE.Points;
  private fireU = { uCenter: { value: new THREE.Vector3() }, uTime: LIGHT.uTime, uPx: { value: 800 }, uShow: { value: 0 }, uMode: { value: 0 } };
  private beeU = { uCenter: this.fireU.uCenter, uTime: LIGHT.uTime, uPx: this.fireU.uPx, uShow: { value: 0 }, uMode: { value: 1 } };
  private beeCount = 0;
  private flock = new THREE.Group();
  private flockT = 20;
  private flockDir = new THREE.Vector3();
  private v = new THREE.Vector3();
  private told = new Set<string>();

  constructor() {
    for (let i = 0; i < 4; i++) {
      this.wingMats.push(new THREE.MeshStandardMaterial({ map: wingTexture(i), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }));
    }
    // Wing plane hinged along its inner edge.
    this.wingGeo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0).rotateX(-Math.PI / 2);

    const mkPoints = (n: number, u: Record<string, THREE.IUniform>, additive: boolean) => {
      const g = new THREE.BufferGeometry();
      const p = new Float32Array(n * 3);
      const s = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        p.set([Math.random() * 36, 0, Math.random() * 36], i * 3);
        s.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      }
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
      const pts = new THREE.Points(
        g,
        new THREE.ShaderMaterial({
          vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, uniforms: u, transparent: true, depthWrite: false,
          blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
        }),
      );
      pts.frustumCulled = false;
      return pts;
    };
    this.fire = mkPoints(46, this.fireU, true);
    this.bees = mkPoints(36, this.beeU, false);
    this.group.add(this.fire, this.bees, this.flock);

    // Distant birds read as silhouettes, so simple swept wings are enough.
    const birdGeo = new THREE.BufferGeometry();
    birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.2, 0.75, 0.06, -0.12, 0, 0, 0.25, -0.75, 0.06, -0.12, 0, 0, -0.2], 3));
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x15161a, side: THREE.DoubleSide, fog: true });
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(birdGeo, birdMat);
      b.position.set((i % 2 ? 1 : -1) * Math.ceil(i / 2) * 2.2, Math.sin(i) * 0.8, -Math.ceil(i / 2) * 1.8);
      b.userData.phase = i * 1.7;
      this.flock.add(b);
    }
    this.flock.visible = false;
  }

  setPixelScale(px: number) {
    this.fireU.uPx.value = px;
  }

  /** Re-read the forest: decides which creatures live here now. */
  setForest(trees: TreeSave[], forest: Forest, night: boolean) {
    this.night = night;
    const grown = trees.filter((t) => t.growth >= 0.6);
    this.stats = {
      grown: grown.length,
      flowering: grown.filter((t) => MOOD_BY_ID[t.mood].flowering).length,
      conifers: grown.filter((t) => MOOD_BY_ID[t.mood].conifer).length,
      kinds: new Set(grown.map((t) => t.mood)).size,
    };
    forest.flowerSpots(trees, this.spots);
    const s = this.stats;
    const here: Record<string, boolean> = {
      butterflies: s.grown >= 2 || s.flowering >= 1,
      bees: s.flowering >= 1,
      crickets: s.grown >= 2,
      fireflies: s.grown >= 3,
      songbirds: s.grown >= 4,
      flock: s.grown >= 6 && s.kinds >= 3,
    };
    for (const c of this.creatures) c.here = here[c.id];

    // Butterflies: more with every flowering tree.
    const want = here.butterflies && !night ? Math.min(12, 2 + s.flowering * 2 + Math.floor(s.grown / 2)) : 0;
    while (this.butterflies.length < want) this.addButterfly();
    while (this.butterflies.length > want) this.group.remove(this.butterflies.pop()!.root);

    // Bees hover at flower spots.
    const pos = this.bees.geometry.attributes.position as THREE.BufferAttribute;
    this.beeCount = here.bees && !night ? Math.min(pos.count, this.spots.length * 3) : 0;
    for (let i = 0; i < this.beeCount; i++) {
      const sp = this.spots[i % this.spots.length];
      pos.setXYZ(i, sp.x, sp.y + 0.1, sp.z);
    }
    pos.needsUpdate = true;
    this.bees.geometry.setDrawRange(0, this.beeCount);
    this.beeU.uShow.value = this.beeCount > 0 ? 1 : 0;
  }

  private addButterfly() {
    const root = new THREE.Group();
    const mat = this.wingMats[this.butterflies.length % this.wingMats.length];
    const left = new THREE.Mesh(this.wingGeo, mat);
    const right = new THREE.Mesh(this.wingGeo, mat);
    right.scale.x = -1;
    const size = 0.07 + Math.random() * 0.03;
    root.scale.setScalar(size);
    root.add(left, right);
    const start = this.spots.length ? this.spots[Math.floor(Math.random() * this.spots.length)] : new THREE.Vector3();
    root.position.copy(start).add(new THREE.Vector3(Math.random() * 2 - 1, 0.6 + Math.random(), Math.random() * 2 - 1));
    this.group.add(root);
    this.butterflies.push({ root, left, right, target: start.clone(), vel: new THREE.Vector3(), rest: 0, seed: Math.random() * 100 });
  }

  /** Returns ids of creatures seen for the first time this frame. */
  update(dt: number, time: number, camera: THREE.Camera, walker: THREE.Vector3): string[] {
    const arrivals: string[] = [];
    for (const c of this.creatures) {
      if (c.here && !this.told.has(c.id)) {
        this.told.add(c.id);
        arrivals.push(c.id);
      }
    }
    this.fireU.uCenter.value.copy(walker).y += 1.4;
    const wantFire = this.night && this.stats.grown >= 3 ? 1 : 0;
    this.fireU.uShow.value += (wantFire - this.fireU.uShow.value) * Math.min(1, dt);
    this.fire.visible = this.fireU.uShow.value > 0.01;

    for (const b of this.butterflies) {
      const p = b.root.position;
      if (b.rest > 0) {
        // Settled on a flower, wings opening and closing slowly.
        b.rest -= dt;
        const fold = 0.5 + Math.sin(time * 2.2 + b.seed) * 0.45;
        b.left.rotation.z = fold;
        b.right.rotation.z = -fold;
        if (b.rest <= 0 || p.distanceTo(walker) < 1.2) {
          b.rest = 0;
          b.target.copy(this.spots[Math.floor(Math.random() * Math.max(1, this.spots.length))] ?? walker);
        }
        continue;
      }
      this.v.copy(b.target).sub(p);
      const d = this.v.length();
      if (d < 0.12) {
        b.rest = 3 + Math.random() * 6;
        p.copy(b.target);
        b.vel.set(0, 0, 0);
        continue;
      }
      // Fluttering flight: head for the flower, but bob and weave on the way.
      this.v.multiplyScalar(1 / d);
      const speed = Math.min(1.5, 0.5 + d * 0.5);
      this.v.x += Math.sin(time * 2.3 + b.seed) * 0.9;
      this.v.z += Math.cos(time * 1.9 + b.seed * 1.7) * 0.9;
      this.v.y += Math.sin(time * 5.1 + b.seed * 3) * 0.9 + (d > 2 ? 0.35 : -0.1);
      b.vel.lerp(this.v.multiplyScalar(speed), Math.min(1, dt * 3));
      p.addScaledVector(b.vel, dt);
      p.y = Math.max(p.y, heightAt(p.x, p.z) + 0.15);
      b.root.rotation.y = Math.atan2(b.vel.x, b.vel.z);
      const flap = Math.sin(time * 26 + b.seed) * 1.0 + 0.35;
      b.left.rotation.z = flap;
      b.right.rotation.z = -flap;
    }

    // Now and then a flock crosses high overhead.
    const hasFlock = this.creatures[5].here && !this.night;
    this.flockT -= dt;
    if (hasFlock && this.flockT <= 0 && !this.flock.visible) {
      const a = Math.random() * Math.PI * 2;
      this.flockDir.set(Math.cos(a), 0, Math.sin(a));
      this.flock.position.copy(walker).addScaledVector(this.flockDir, -130);
      this.flock.position.y = walker.y + 38 + Math.random() * 14;
      this.flock.rotation.y = Math.atan2(this.flockDir.x, this.flockDir.z);
      this.flock.visible = true;
    }
    if (this.flock.visible) {
      this.flock.position.addScaledVector(this.flockDir, dt * 11);
      for (const b of this.flock.children) b.scale.y = 1 + Math.sin(time * 7 + b.userData.phase) * 6;
      if (this.flock.position.distanceTo(walker) > 190) {
        this.flock.visible = false;
        this.flockT = 35 + Math.random() * 50;
      }
    }
    void camera;
    return arrivals;
  }
}

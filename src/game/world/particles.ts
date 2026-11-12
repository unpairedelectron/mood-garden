// Atmosphere particles: drifting pollen and ash, fireflies, rain, petals,
// plus a CPU pool for one-shot bursts and a dynamic field of glow sprites.

import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { COMMON_GLSL, G } from '../render/shared';
import { PIXEL_SCALE } from './flora';

const BOX = new THREE.Vector3(46, 16, 46);

const AMBIENT_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uCenter, uBox;
uniform float uPx, uPetals, uPetalHue;
uniform vec3 uPetalColor;
varying vec4 vCol;
varying float vKind;
varying float vRot;
${COMMON_GLSL}
void main() {
  float kind = aSeed.w;
  vec3 p = position;
  float t = uTime;
  // Each kind drifts differently before being wrapped around the camera.
  if (kind < 0.5) {          // pollen / ash
    p += vec3(t * 0.35, sin(t * 0.3 + aSeed.x * 20.) * 0.6 - t * 0.04, t * 0.2);
  } else if (kind < 1.5) {   // fireflies
    p += vec3(sin(t * 0.5 + aSeed.x * 30.), sin(t * 0.7 + aSeed.y * 30.) * 0.5, cos(t * 0.45 + aSeed.z * 30.)) * 1.6;
  } else {                   // petals
    p += vec3(t * 0.9 + sin(t + aSeed.x * 20.) * 0.8, -t * (0.7 + aSeed.y * 0.5), t * 0.5 + cos(t * 0.8 + aSeed.z * 20.) * 0.8);
  }
  vec3 rel = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 wp = uCenter + rel;
  vec4 wd = texture2D(uWorldTex, wuv(wp.xz));
  vec3 tint;
  float vit = vitality(wp.xz, tint);
  float ground = max(wd.r, 0.);
  float edge = 1. - smoothstep(0.75, 1., length(rel.xz) / (uBox.x * 0.5));
  float size = 0.; vec3 col = vec3(0.); float a = 0.;
  if (kind < 0.5) {
    wp.y = ground + 0.3 + mod(rel.y + uBox.y * 0.5, uBox.y) * 0.8;
    vec3 pollen = mix(vec3(1.0, 0.92, 0.6), s2l(tint), 0.35) * (0.5 + 1.3 * uSunColor);
    vec3 ash = vec3(0.55, 0.56, 0.6) * (0.25 + 0.6 * (1. - uNight));
    col = mix(ash, pollen, vit);
    a = mix(0.35, 0.8, vit) * (1. - uNight * 0.7) * (0.4 + 0.6 * sin(t * 0.9 + aSeed.y * 40.) * 0.5 + 0.3);
    size = 0.05 + 0.05 * aSeed.z;
  } else if (kind < 1.5) {
    wp.y = ground + 0.4 + aSeed.y * 2.6 + sin(t * 0.6 + aSeed.z * 9.) * 0.4;
    float blink = smoothstep(0.2, 1., sin(t * (1.2 + aSeed.x * 1.5) + aSeed.z * 50.));
    col = mix(vec3(0.75, 1.0, 0.3), s2l(tint), 0.3) * 5.;
    a = blink * uNight * smoothstep(0.25, 0.7, vit);
    size = 0.11;
  } else {
    wp.y = ground + mod(rel.y + uBox.y * 0.5, uBox.y);
    col = uPetalColor * (0.25 + 0.9 * (1. - uNight)) * (0.8 + 0.4 * aSeed.z);
    a = uPetals;
    size = 0.1 + 0.07 * aSeed.x;
  }
  vec4 mv = viewMatrix * vec4(wp, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(size * uPx / max(-mv.z, 0.1), 0., 40.);
  vCol = vec4(col, a * edge);
  vKind = kind;
  vRot = t * (1. + aSeed.y * 2.) + aSeed.x * 30.;
}`;

const AMBIENT_FRAG = /* glsl */ `
varying vec4 vCol; varying float vKind; varying float vRot;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a;
  if (vKind > 1.5) {
    // tumbling petal: a rotating, squashing ellipse
    float s = sin(vRot), k = cos(vRot);
    vec2 r = mat2(k, -s, s, k) * c;
    r.y /= 0.25 + 0.75 * abs(sin(vRot * 0.7));
    a = smoothstep(0.5, 0.38, length(r * vec2(1., 1.6)));
  } else {
    float d = length(c) * 2.;
    a = pow(max(1. - d, 0.), 1.8);
  }
  if (a * vCol.a < 0.004) discard;
  gl_FragColor = vec4(vCol.rgb * a * vCol.a, vKind > 1.5 ? a * vCol.a : 0.);
}`;

const RAIN_VERT = /* glsl */ `
attribute vec3 aSeed;
uniform vec3 uCenter; uniform float uTime, uRain;
varying float vA;
void main() {
  vec3 box = vec3(34., 22., 34.);
  vec3 p = position;
  float fall = uTime * (17. + aSeed.x * 6.);
  p.y -= fall;
  p.x += aSeed.z * 0.0;
  vec3 rel = mod(p - uCenter + box * 0.5, box) - box * 0.5;
  // The second vertex of each segment trails upward to make a streak.
  rel.y += aSeed.y * 0.55;
  rel.x += aSeed.y * 0.06;
  vec3 wp = uCenter + rel;
  vA = uRain * (0.45 + 0.7 * aSeed.x) * (1. - smoothstep(0.7, 1., length(rel.xz) / 17.));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
}`;
const RAIN_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main() { gl_FragColor = vec4(uColor * vA, 0.); }`;

export class Atmosphere {
  readonly group = new THREE.Group();
  petals = 0;
  rain = 0;
  private ambient: THREE.ShaderMaterial;
  private rainMat: THREE.ShaderMaterial;
  private center = new THREE.Vector3();

  constructor(count: number) {
    const rng = mulberry32(555);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng() * BOX.x;
      pos[i * 3 + 1] = rng() * BOX.y;
      pos[i * 3 + 2] = rng() * BOX.z;
      seed[i * 4] = rng();
      seed[i * 4 + 1] = rng();
      seed[i * 4 + 2] = rng();
      const r = i / count;
      seed[i * 4 + 3] = r < 0.5 ? 0 : r < 0.72 ? 1 : 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    // Premultiplied "add + over" blend lets glowing motes and opaque petals share a draw call.
    this.ambient = new THREE.ShaderMaterial({
      vertexShader: AMBIENT_VERT,
      fragmentShader: AMBIENT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: {
        ...G,
        uCenter: { value: this.center },
        uBox: { value: BOX },
        uPx: PIXEL_SCALE,
        uPetals: { value: 0 },
        uPetalHue: { value: 0 },
        uPetalColor: { value: new THREE.Color(0xffb3d1) },
      },
    });
    const pts = new THREE.Points(g, this.ambient);
    pts.frustumCulled = false;
    pts.renderOrder = 5;

    const drops = 1400;
    const rp = new Float32Array(drops * 6);
    const rs = new Float32Array(drops * 6);
    for (let i = 0; i < drops; i++) {
      const x = rng() * 34;
      const y = rng() * 22;
      const z = rng() * 34;
      const s = rng();
      for (let k = 0; k < 2; k++) {
        rp.set([x, y, z], i * 6 + k * 3);
        rs.set([s, k, 0], i * 6 + k * 3);
      }
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rg.setAttribute('aSeed', new THREE.BufferAttribute(rs, 3));
    this.rainMat = new THREE.ShaderMaterial({
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uTime: G.uTime, uCenter: { value: this.center }, uRain: { value: 0 }, uColor: { value: new THREE.Color(0.55, 0.65, 0.9) } },
    });
    const rain = new THREE.LineSegments(rg, this.rainMat);
    rain.frustumCulled = false;
    rain.renderOrder = 5;
    this.group.add(pts, rain);
  }

  update(camera: THREE.Camera, light: number) {
    this.center.copy(camera.position);
    this.ambient.uniforms.uPetals.value = this.petals;
    this.rainMat.uniforms.uRain.value = this.rain;
    (this.rainMat.uniforms.uColor.value as THREE.Color).setRGB(0.5, 0.6, 0.85).multiplyScalar(0.25 + light * 0.9);
    this.group.children[1].visible = this.rain > 0.01;
  }
}

// ------------------------------------------------------------------ bursts
const SPRITE_VERT = /* glsl */ `
attribute vec4 aColor; attribute float aSize;
uniform float uPx;
varying vec4 vCol;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPx / max(-mv.z, 0.1), 0., 220.);
  vCol = aColor;
}`;
const SPRITE_FRAG = /* glsl */ `
varying vec4 vCol;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.;
  float a = pow(max(1. - d, 0.), 2.4) + smoothstep(0.3, 0., d) * 1.4;
  gl_FragColor = vec4(vCol.rgb * a * vCol.a, 0.);
}`;

function spriteMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: SPRITE_VERT,
    fragmentShader: SPRITE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    uniforms: { uPx: PIXEL_SCALE },
  });
}

/** Fixed pool of short-lived glowing particles. */
export class Bursts {
  readonly points: THREE.Points;
  private n: number;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private base: Float32Array;
  private grav: Float32Array;
  private cursor = 0;
  constructor(n = 900) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 4);
    this.size = new Float32Array(n);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.max = new Float32Array(n).fill(1);
    this.base = new Float32Array(n * 2);
    this.grav = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.points = new THREE.Points(g, spriteMaterial());
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
  }
  emit(p: THREE.Vector3, color: THREE.Color, opts: { count?: number; speed?: number; up?: number; life?: number; size?: number; gravity?: number; spread?: number; bright?: number } = {}) {
    const { count = 12, speed = 2, up = 1, life = 1.2, size = 0.25, gravity = -1, spread = 0.2, bright = 2 } = opts;
    for (let i = 0; i < count; i++) {
      const k = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      const sp = speed * (0.35 + Math.random() * 0.65);
      this.pos[k * 3] = p.x + (Math.random() - 0.5) * spread;
      this.pos[k * 3 + 1] = p.y + (Math.random() - 0.5) * spread;
      this.pos[k * 3 + 2] = p.z + (Math.random() - 0.5) * spread;
      this.vel[k * 3] = Math.sin(ph) * Math.cos(th) * sp;
      this.vel[k * 3 + 1] = Math.cos(ph) * sp * 0.6 + up;
      this.vel[k * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      this.life[k] = this.max[k] = life * (0.6 + Math.random() * 0.6);
      this.base[k * 2] = size * (0.6 + Math.random() * 0.8);
      this.base[k * 2 + 1] = bright;
      this.grav[k] = gravity;
      this.col[k * 4] = color.r;
      this.col[k * 4 + 1] = color.g;
      this.col[k * 4 + 2] = color.b;
    }
  }
  update(dt: number) {
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) {
        this.col[k * 4 + 3] = 0;
        this.size[k] = 0;
        continue;
      }
      this.life[k] -= dt;
      const t = Math.max(0, this.life[k] / this.max[k]);
      const drag = Math.exp(-1.6 * dt);
      this.vel[k * 3] *= drag;
      this.vel[k * 3 + 1] = this.vel[k * 3 + 1] * drag + this.grav[k] * dt;
      this.vel[k * 3 + 2] *= drag;
      this.pos[k * 3] += this.vel[k * 3] * dt;
      this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt;
      this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      this.col[k * 4 + 3] = Math.min(1, t * 2.5) * this.base[k * 2 + 1];
      this.size[k] = this.base[k * 2] * (0.4 + 0.6 * t);
    }
    const a = this.points.geometry.attributes;
    (a.position as THREE.BufferAttribute).needsUpdate = true;
    (a.aColor as THREE.BufferAttribute).needsUpdate = true;
    (a.aSize as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** Persistent glow sprites whose position, colour and size are set every frame. */
export class GlowField {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private count = 0;
  private cap: number;
  constructor(cap = 256) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 4);
    this.size = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.points = new THREE.Points(g, spriteMaterial());
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
  }
  begin() {
    this.count = 0;
  }
  add(p: THREE.Vector3, c: THREE.Color, size: number, alpha = 1) {
    if (this.count >= this.cap) return;
    const k = this.count++;
    this.pos[k * 3] = p.x;
    this.pos[k * 3 + 1] = p.y;
    this.pos[k * 3 + 2] = p.z;
    this.col[k * 4] = c.r;
    this.col[k * 4 + 1] = c.g;
    this.col[k * 4 + 2] = c.b;
    this.col[k * 4 + 3] = alpha;
    this.size[k] = size;
  }
  end() {
    const g = this.points.geometry;
    g.setDrawRange(0, this.count);
    (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }
}

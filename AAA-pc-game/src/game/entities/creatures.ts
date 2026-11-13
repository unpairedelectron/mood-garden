// Wildlife that returns as the island wakes: butterflies over living meadow
// by day and a flock of birds wheeling overhead. Both are fully GPU-animated.

import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { COMMON_GLSL, G } from '../render/shared';

const BUTTERFLY_VERT = /* glsl */ `
attribute vec4 aOffset;   // xz in tile, rand, rand
attribute vec2 aWing;     // x: side (-1/1), y: 0 body edge, 1 wing tip
uniform vec3 uCenter; uniform float uTile;
varying vec3 vCol; varying float vA; varying vec2 vWing;
${COMMON_GLSL}
void main() {
  float r1 = aOffset.z, r2 = aOffset.w;
  float t = uTime * (0.5 + r1 * 0.4);
  vec2 base = aOffset.xy + vec2(sin(t + r1 * 40.), cos(t * 0.8 + r2 * 40.)) * 3.5;
  float HALF = uTile * 0.5;
  vec2 rel = mod(base - uCenter.xz + HALF, uTile) - HALF;
  vec2 xz = uCenter.xz + rel;
  vec4 wd = texture2D(uWorldTex, wuv(xz));
  vec3 tint; float vit = vitality(xz, tint);
  float y = max(wd.r, 0.) + 0.7 + r2 * 1.4 + sin(uTime * 2.2 + r1 * 30.) * 0.25;
  // heading follows the derivative of the wander path
  vec2 dir = normalize(vec2(cos(t + r1 * 40.), -0.8 * sin(t * 0.8 + r2 * 40.)));
  float flap = sin(uTime * (16. + r1 * 8.) + r2 * 50.) * 1.05;
  vec3 lp = position;
  float side = aWing.x;
  lp.y += abs(lp.x) * sin(flap) * 1.0;
  lp.x *= cos(flap * 0.75);
  float s = 0.16 + r2 * 0.1;
  vec3 wp = vec3(xz.x, y, xz.y) + (vec3(dir.y, 0., -dir.x) * lp.x + vec3(0., 1., 0.) * lp.y + vec3(dir.x, 0., dir.y) * lp.z) * s;
  float edge = 1. - smoothstep(0.7, 1., length(rel) / HALF);
  vA = smoothstep(0.55, 0.85, vit) * (1. - uNight) * edge * step(0.5, wd.g + 0.3);
  vA *= smoothstep(1.5, 4., distance(wp, cameraPosition));
  vec3 a = mix(vec3(1.0, 0.75, 0.2), s2l(tint), 0.6);
  vCol = mix(a, a.brg, step(0.7, r1) * 0.5) * (0.6 + uSunColor * 0.9);
  vWing = vec2(side, aWing.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
  if (vA < 0.02) gl_Position = vec4(2., 2., 2., 1.);
}`;
const BUTTERFLY_FRAG = /* glsl */ `
varying vec3 vCol; varying float vA; varying vec2 vWing;
void main() {
  float rim = smoothstep(0.75, 1., vWing.y);
  vec3 c = mix(vCol, vCol * 0.12, rim);
  gl_FragColor = vec4(c, 1.);
}`;

const BIRD_VERT = /* glsl */ `
attribute vec3 aSeed;
attribute float aTip;
uniform vec3 uFlock; uniform float uShow, uTime;
varying float vShade;
void main() {
  float t = uTime * (0.16 + aSeed.x * 0.05) + aSeed.y * 6.283;
  float R = 26. + aSeed.z * 30.;
  vec3 c = uFlock + vec3(cos(t) * R, sin(t * 2.3 + aSeed.x * 9.) * 4. + aSeed.z * 10., sin(t) * R * 0.8);
  vec3 fwd = normalize(vec3(-sin(t), 0., cos(t) * 0.8));
  vec3 right = vec3(fwd.z, 0., -fwd.x);
  float flap = sin(uTime * (7. + aSeed.x * 3.) + aSeed.y * 30.);
  vec3 lp = position * (0.55 + aSeed.z * 0.3) * uShow;
  lp.y += aTip * flap * 0.55;
  vec3 wp = c + right * lp.x + vec3(0., 1., 0.) * lp.y + fwd * lp.z;
  vShade = 0.5 + 0.5 * aTip;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
}`;
const BIRD_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vShade;
void main() { gl_FragColor = vec4(uColor * vShade, 1.); }`;

export class Creatures {
  readonly group = new THREE.Group();
  private center = new THREE.Vector3();
  private flock = new THREE.Vector3(0, 40, 0);
  private birdMat: THREE.ShaderMaterial;
  private show = 0;

  constructor(butterflies = 70, birds = 16) {
    const rng = mulberry32(31337);
    // Butterfly: two wing triangles sharing the body edge.
    const pos = new Float32Array([0, 0, -0.5, 0, 0, 0.5, 1, 0, 0.15, 0, 0, -0.5, -1, 0, 0.15, 0, 0, 0.5]);
    const wing = new Float32Array([1, 0, 1, 0, 1, 1, -1, 0, -1, 1, -1, 0]);
    const bg = new THREE.InstancedBufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    bg.setAttribute('aWing', new THREE.BufferAttribute(wing, 2));
    const off = new Float32Array(butterflies * 4);
    for (let i = 0; i < butterflies; i++) off.set([rng() * 70, rng() * 70, rng(), rng()], i * 4);
    bg.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 4));
    bg.instanceCount = butterflies;
    const bm = new THREE.ShaderMaterial({
      vertexShader: BUTTERFLY_VERT,
      fragmentShader: BUTTERFLY_FRAG,
      side: THREE.DoubleSide,
      uniforms: { ...G, uCenter: { value: this.center }, uTile: { value: 70 } },
    });
    const b = new THREE.Mesh(bg, bm);
    b.frustumCulled = false;

    // Bird: a simple swept-wing silhouette.
    const bp = new Float32Array([0, 0, 0.5, 0, 0, -0.35, 1.3, 0, -0.25, 0, 0, 0.5, -1.3, 0, -0.25, 0, 0, -0.35]);
    const tip = new Float32Array([0, 0, 1, 0, 1, 0]);
    const g2 = new THREE.InstancedBufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    g2.setAttribute('aTip', new THREE.BufferAttribute(tip, 1));
    const seeds = new Float32Array(birds * 3);
    for (let i = 0; i < birds; i++) seeds.set([rng(), rng(), rng()], i * 3);
    g2.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 3));
    g2.instanceCount = birds;
    this.birdMat = new THREE.ShaderMaterial({
      vertexShader: BIRD_VERT,
      fragmentShader: BIRD_FRAG,
      side: THREE.DoubleSide,
      uniforms: { uTime: G.uTime, uFlock: { value: this.flock }, uShow: { value: 0 }, uColor: { value: new THREE.Color(0.05, 0.05, 0.07) } },
    });
    const birdMesh = new THREE.Mesh(g2, this.birdMat);
    birdMesh.frustumCulled = false;
    this.group.add(b, birdMesh);
  }

  update(dt: number, focus: THREE.Vector3, awakened: number, day: number, fog: THREE.Color) {
    this.center.copy(focus);
    // The flock drifts lazily after the player and only exists once a grove is awake.
    this.flock.x += (focus.x - this.flock.x) * dt * 0.05;
    this.flock.z += (focus.z - this.flock.z) * dt * 0.05;
    this.flock.y = focus.y + 34;
    const want = awakened > 0 && day > 0.3 ? 1 : 0;
    this.show += (want - this.show) * Math.min(1, dt * 0.5);
    this.birdMat.uniforms.uShow.value = this.show;
    (this.birdMat.uniforms.uColor.value as THREE.Color).copy(fog).multiplyScalar(0.16);
    this.group.children[1].visible = this.show > 0.01;
  }
}

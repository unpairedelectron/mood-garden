// Things that happen only sometimes, so that walking at a different hour or in
// different weather finds something different: shooting stars on clear
// nights, and the fungi of Glow Hollow lighting up after dark. (The rainbow is
// drawn in the sky and the valley fog in the camera pass; the stag is in fauna.)

import * as THREE from 'three';
import { LIGHT } from './forest';
import { heightAt, placeById } from './terrain';

const STAR_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const STAR_FRAG = /* glsl */ `
uniform float uLife;
varying vec2 vUv;
void main() {
  // Bright head, fading tail; brief.
  float tail = pow(vUv.x, 2.2) * (1. - abs(vUv.y - .5) * 2.);
  float a = tail * sin(uLife * 3.1416);
  gl_FragColor = vec4(vec3(.9, .95, 1.) * a * 2.2, a);
  #include <colorspace_fragment>
}`;

const FUNGI_VERT = /* glsl */ `
attribute vec2 aSeed;
uniform float uTime, uPx, uGlow;
varying float vA;
void main() {
  vec4 mv = viewMatrix * vec4(position, 1.);
  // Each cap breathes slowly, out of step with its neighbours.
  vA = uGlow * (.55 + .45 * sin(uTime * (.4 + aSeed.x * .5) + aSeed.y * 30.));
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (.07 + aSeed.x * .08) * uPx / max(-mv.z, .3);
}`;
const FUNGI_FRAG = /* glsl */ `
varying float vA;
void main() {
  vec2 q = gl_PointCoord - .5;
  float a = exp(-dot(q, q) * 14.) * vA;
  gl_FragColor = vec4(vec3(.35, 1., .8) * a * 2.6, a);
  #include <colorspace_fragment>
}`;

export class Moments {
  readonly group = new THREE.Group();
  private star: THREE.Mesh;
  private starU = { uLife: { value: 0 } };
  private starIn = 8;
  private starT = -1;
  private starFrom = new THREE.Vector3();
  private starDir = new THREE.Vector3();
  private fungiU = { uTime: LIGHT.uTime, uPx: { value: 800 }, uGlow: { value: 0 } };
  private fungi: THREE.Points;

  constructor() {
    this.star = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: this.starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    this.star.visible = false;
    this.star.frustumCulled = false;
    this.star.renderOrder = -5;
    this.group.add(this.star);

    // Fungi in the hollow: clusters at the feet of stumps and roots.
    const h = placeById('hollow');
    const n = 240;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n * 2);
    let k = 0;
    for (let c = 0; c < 14 && k < n; c++) {
      const a = c * 2.4 + 0.3, d = 1.5 + (c % 5) * 1.6;
      const cx = h.x + Math.cos(a) * d, cz = h.z + Math.sin(a) * d;
      for (let i = 0; i < 17 && k < n; i++, k++) {
        const x = cx + (Math.random() - 0.5) * 1.4, z = cz + (Math.random() - 0.5) * 1.4;
        pos.set([x, heightAt(x, z) + 0.03 + Math.random() * 0.12, z], k * 3);
        seed.set([Math.random(), Math.random()], k * 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, k * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed.subarray(0, k * 2), 2));
    this.fungi = new THREE.Points(
      g,
      new THREE.ShaderMaterial({ vertexShader: FUNGI_VERT, fragmentShader: FUNGI_FRAG, uniforms: this.fungiU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.fungi.frustumCulled = false;
    this.group.add(this.fungi);
  }

  setPixelScale(px: number) {
    this.fungiU.uPx.value = px;
  }

  update(dt: number, camera: THREE.Camera, night: number, clear: number) {
    // Glow Hollow lights up as night falls.
    this.fungiU.uGlow.value = Math.max(0, night * 1.2 - 0.2);
    this.fungi.visible = this.fungiU.uGlow.value > 0.01;

    // A shooting star now and then on a clear night.
    if (this.starT < 0) {
      this.starIn -= dt;
      if (this.starIn <= 0) {
        this.starIn = 18 + Math.random() * 50;
        if (night > 0.8 && clear > 0.6) {
          const a = Math.random() * Math.PI * 2, el = 0.45 + Math.random() * 0.5;
          this.starFrom.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
          this.starDir.set(-Math.sin(a), -0.35 - Math.random() * 0.3, Math.cos(a)).normalize();
          this.starT = 0;
        }
      }
      this.star.visible = false;
      return;
    }
    this.starT += dt / 0.9;
    if (this.starT >= 1) {
      this.starT = -1;
      this.star.visible = false;
      return;
    }
    // A thin streak far out on the sky, travelling as it fades.
    const R = 250;
    const head = this.starFrom.clone().addScaledVector(this.starDir, this.starT * 0.35).normalize().multiplyScalar(R).add(camera.position);
    const tail = this.starFrom.clone().addScaledVector(this.starDir, this.starT * 0.35 - 0.12).normalize().multiplyScalar(R).add(camera.position);
    const mid = head.clone().add(tail).multiplyScalar(0.5);
    this.star.position.copy(mid);
    this.star.lookAt(camera.position);
    // Align the plane's x axis with the streak.
    const along = head.clone().sub(tail);
    const len = along.length();
    const viewX = new THREE.Vector3(1, 0, 0).applyQuaternion(this.star.quaternion);
    const viewY = new THREE.Vector3(0, 1, 0).applyQuaternion(this.star.quaternion);
    this.star.rotateZ(Math.atan2(along.dot(viewY), along.dot(viewX)));
    this.star.scale.set(len, 0.35, 1);
    this.starU.uLife.value = this.starT;
    this.star.visible = true;
  }
}

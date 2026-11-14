// Rain, snow and falling leaves. Each is one instanced draw whose particles
// live in a box that wraps around the walker, animated entirely on the GPU.

import * as THREE from 'three';
import { LIGHT } from './forest';

const VERT = /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uCenter;
uniform float uTime, uMode, uAmount, uWind, uBox, uHeight;
varying vec2 vUv;
varying float vA;
varying vec3 vTint;
void main() {
  vUv = position.xy + .5;
  float speed = uMode < .5 ? 11. + aSeed.w * 4. : uMode < 1.5 ? .9 + aSeed.w * .5 : 1.1 + aSeed.w * .6;
  float fall = uTime * speed + aSeed.y * uHeight;
  vec3 drift = vec3(uWind * (uMode < .5 ? .25 : 1.2), 0., uWind * (uMode < .5 ? .1 : .5));
  vec3 p = vec3(aSeed.x * uBox, uHeight - mod(fall, uHeight), aSeed.z * uBox);
  p.xz += drift.xz * mod(fall, uHeight) / speed;
  if (uMode > .5) {
    // Flakes and leaves wander as they fall.
    p.x += sin(uTime * (.8 + aSeed.w) + aSeed.x * 40.) * .5;
    p.z += cos(uTime * (.7 + aSeed.y) + aSeed.z * 40.) * .5;
  }
  vec2 rel = mod(p.xz - uCenter.xz + uBox * .5, uBox) - uBox * .5;
  vec3 world = vec3(uCenter.x + rel.x, uCenter.y - 2. + p.y, uCenter.z + rel.y);
  // Only a share of particles are live, so amount fades rain in and out.
  vA = step(aSeed.w, uAmount) * (1. - smoothstep(uBox * .3, uBox * .5, length(rel)));
  // Nothing smears across the lens.
  vA *= smoothstep(1.2, 2.6, distance(world, cameraPosition));
  vec3 toCam = normalize(cameraPosition - world);
  vec3 right = normalize(cross(vec3(0., 1., 0.), toCam));
  vec3 upv;
  vec2 size;
  if (uMode < .5) {
    // Streaks aligned with the fall direction.
    vec3 vel = normalize(vec3(drift.x, -speed, drift.z));
    upv = vel;
    right = normalize(cross(vel, toCam));
    size = vec2(.012, .5 + aSeed.w * .3);
  } else if (uMode < 1.5) {
    upv = cross(toCam, right);
    size = vec2(.035 + aSeed.x * .02);
  } else {
    float a = uTime * (2. + aSeed.x * 3.) + aSeed.z * 20.;
    upv = cross(toCam, right);
    vec3 r2 = right * cos(a) + upv * sin(a);
    upv = upv * cos(a) - right * sin(a);
    right = r2;
    size = vec2(.06, .045) * (1. + aSeed.y);
  }
  vTint = uMode < 2.5 ? vec3(1.) : vec3(1.);
  world += right * position.x * size.x + upv * position.y * size.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
}`;

const FRAG = /* glsl */ `
uniform float uMode;
uniform vec3 uSky, uSunColor, uFogColor, uLeafA, uLeafB;
varying vec2 vUv;
varying float vA;
varying vec3 vTint;
void main() {
  if (vA < .01) discard;
  vec3 light = uSky * 2.2 + uSunColor * 1.4;
  vec4 c;
  if (uMode < .5) {
    float edge = 1. - abs(vUv.x - .5) * 2.;
    float a = edge * smoothstep(0., .3, vUv.y) * .32;
    c = vec4(mix(uFogColor, light, .5) * 1.3, a);
  } else if (uMode < 1.5) {
    float d = length(vUv - .5) * 2.;
    c = vec4(light * 1.25 + .15, smoothstep(1., .4, d) * .9);
  } else {
    vec2 q = (vUv - .5) * vec2(2., 2.6);
    float leaf = 1. - smoothstep(.85, 1., length(q));
    vec3 col = mix(uLeafA, uLeafB, vUv.x);
    c = vec4(col * light, leaf);
    if (leaf < .5) discard;
  }
  gl_FragColor = vec4(c.rgb, c.a * vA);
  #include <colorspace_fragment>
}`;

export class Precipitation {
  readonly group = new THREE.Group();
  private rain: THREE.Mesh;
  private snow: THREE.Mesh;
  private leaves: THREE.Mesh;
  private center = new THREE.Vector3();

  constructor() {
    const make = (n: number, mode: number, box: number, height: number, blend: THREE.Blending) => {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
      g.setIndex([0, 1, 2, 1, 3, 2]);
      const seed = new Float32Array(n * 4);
      for (let i = 0; i < n * 4; i++) seed[i] = Math.random();
      g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
      g.instanceCount = n;
      const m = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uCenter: { value: this.center },
          uTime: LIGHT.uTime,
          uMode: { value: mode },
          uAmount: { value: 0 },
          uWind: { value: 0 },
          uBox: { value: box },
          uHeight: { value: height },
          uSky: LIGHT.uSky,
          uSunColor: LIGHT.uSunColor,
          uFogColor: LIGHT.uFogColor,
          uLeafA: { value: new THREE.Color(0.62, 0.32, 0.06) },
          uLeafB: { value: new THREE.Color(0.75, 0.55, 0.12) },
        },
        transparent: mode < 2,
        depthWrite: mode >= 2,
        side: THREE.DoubleSide,
        blending: blend,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.group.add(mesh);
      return mesh;
    };
    this.rain = make(2200, 0, 24, 12, THREE.NormalBlending);
    this.snow = make(1600, 1, 22, 10, THREE.NormalBlending);
    this.leaves = make(70, 2, 26, 9, THREE.NoBlending);
  }

  update(walker: THREE.Vector3, rain: number, snow: number, wind: number, autumn: number) {
    this.center.copy(walker);
    const set = (m: THREE.Mesh, amount: number) => {
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      u.uAmount.value = amount;
      u.uWind.value = wind * 3;
      m.visible = amount > 0.01;
    };
    set(this.rain, rain);
    set(this.snow, snow);
    // Leaves fall in autumn, more in wind.
    set(this.leaves, autumn * (0.25 + wind * 0.75));
  }
}

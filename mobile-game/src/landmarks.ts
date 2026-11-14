// What makes a place recognisable from a distance: here, the falls where the
// stream rises. A curved curtain of water pours from the lip of the rock face
// into the plunge pool, streaked and quickening as it falls, with spray drifting
// up where it lands. Lit by the same sky and sun as everything else.

import * as THREE from 'three';
import { LIGHT } from './forest';
import { FALLS } from './terrain';

const CURTAIN_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const CURTAIN_FRAG = /* glsl */ `
uniform float uTime, uFogDensity;
uniform vec3 uSky, uSunColor, uSunDir, uFogColor;
varying vec2 vUv;
varying vec3 vWorld;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  // Water speeds up as it falls, so its streaks stretch toward the bottom.
  float fall = vUv.y * vUv.y * 2.2 + vUv.y;
  vec2 q = vec2(vUv.x * 26., fall * 3. - uTime * 2.4);
  float streak = n(q) * .6 + n(q * vec2(2.3, 1.7) + 4.1) * .4;
  float edge = smoothstep(0., .14, vUv.x) * smoothstep(1., .86, vUv.x);
  // Thin and glassy at the lip, white and broken at the bottom.
  float foam = smoothstep(.55, 1., vUv.y);
  float a = edge * mix(.6 + streak * .35, .85 + streak * .15, foam);
  a *= smoothstep(0., .04, vUv.y);
  if (a < .02) discard;
  vec3 lit = uSky * 2.2 + uSunColor * (.6 + max(uSunDir.y, 0.) * .8);
  vec3 col = mix(vec3(.78, .86, .9), vec3(1.), foam * .6 + streak * .4) * lit * 1.15;
  float d = distance(cameraPosition, vWorld);
  col = mix(col, uFogColor, 1. - exp(-uFogDensity * uFogDensity * d * d));
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

const SPRAY_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime, uPx;
varying float vA;
void main() {
  float life = fract(uTime * (.25 + aSeed.w * .2) + aSeed.x);
  vec3 p = position;
  p.x += (aSeed.y - .5) * 3.2 * (.3 + life);
  p.z += (aSeed.z - .5) * 2.4 * (.3 + life) + life * 1.6;
  p.y += life * (1.2 + aSeed.w * 1.8);
  vA = (1. - life) * smoothstep(0., .1, life);
  vec4 mv = viewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (.55 + life * 1.4) * uPx / max(-mv.z, .5);
}`;

const SPRAY_FRAG = /* glsl */ `
uniform vec3 uSky, uSunColor;
varying float vA;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  float a = pow(max(1. - d, 0.), 2.) * vA * .22;
  gl_FragColor = vec4((uSky * 2. + uSunColor) * a, a);
  #include <colorspace_fragment>
}`;

export class Falls {
  readonly group = new THREE.Group();
  /** Where the sound of the falls comes from. */
  readonly sound = new THREE.Vector3();
  private sprayU: { uPx: { value: number } };

  constructor() {
    const d = new THREE.Vector2(FALLS.dx, FALLS.dz);
    const side = new THREE.Vector2(-d.y, d.x);
    // From just over the lip (2.9 m upstream of the pool's centre) to the pool, clear of the rock face,
    // which leans out about 2.4 m over its height.
    const top = new THREE.Vector3(FALLS.sx - d.x * 2.9, FALLS.lipY + 0.15, FALLS.sz - d.y * 2.9);
    const reach = 3.5;
    const drop = top.y - FALLS.waterY;
    // The curtain: a ribbon that bows outward as it falls.
    const rows = 16, cols = 6;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= rows; j++) {
      const t = j / rows;
      const out = Math.sin(t * Math.PI * 0.5) * reach;
      const w = 3.2 + t * 1.3;
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const s = (u - 0.5) * w;
        pos.push(top.x + d.x * out + side.x * s, top.y - t * drop, top.z + d.y * out + side.y * s);
        uv.push(u, t);
      }
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, e = c + 1;
        idx.push(a, c, b, b, c, e);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const curtain = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        vertexShader: CURTAIN_VERT,
        fragmentShader: CURTAIN_FRAG,
        uniforms: { uTime: LIGHT.uTime, uFogDensity: LIGHT.uFogDensity, uSky: LIGHT.uSky, uSunColor: LIGHT.uSunColor, uSunDir: LIGHT.uSunDir, uFogColor: LIGHT.uFogColor },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    curtain.renderOrder = 3;
    this.group.add(curtain);

    // Spray where it lands.
    const n = 160;
    const base = new THREE.Vector3(top.x + d.x * reach, FALLS.waterY + 0.1, top.z + d.y * reach);
    const sp = new Float32Array(n * 3), seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      sp.set([base.x + (Math.random() - 0.5) * 2.4 * side.x, base.y, base.z + (Math.random() - 0.5) * 2.4 * side.y], i * 3);
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    this.sprayU = { uPx: { value: 800 } };
    const spray = new THREE.Points(
      sg,
      new THREE.ShaderMaterial({
        vertexShader: SPRAY_VERT,
        fragmentShader: SPRAY_FRAG,
        uniforms: { uTime: LIGHT.uTime, uSky: LIGHT.uSky, uSunColor: LIGHT.uSunColor, ...this.sprayU },
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      }),
    );
    spray.frustumCulled = false;
    spray.renderOrder = 4;
    this.group.add(spray);
    this.sound.set(base.x, FALLS.waterY + drop * 0.5, base.z);
  }

  setPixelScale(px: number) {
    this.sprayU.uPx.value = px;
  }
}

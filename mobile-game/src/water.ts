// The pond and the stream. Water reflects the same photographed sky that is
// overhead (blended and turned exactly as the sky is), shows the bed through
// the shallows, ripples in the wind, runs downstream, and rings with rain.

import * as THREE from 'three';
import { LIGHT } from './forest';
import type { Sky } from './sky';
import { POND, WORLD, stream, STREAM_WIDTH } from './terrain';

const VERT = /* glsl */ `
attribute vec2 aFlow;
attribute float aEdge;
varying vec3 vWorld;
varying vec2 vFlow;
varying float vEdge;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWorld = wp.xyz;
  vFlow = aFlow;
  vEdge = aEdge;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uA, uB, uHeight;
uniform float uMix, uRotA, uRotB, uIntA, uIntB, uTime, uWind, uRain, uFogDensity, uCloud, uStream, uSnow;
uniform vec3 uSunDir, uSunColor, uSky, uGround, uFogColor;
varying vec3 vWorld;
varying vec2 vFlow;
varying float vEdge;
vec2 equi(vec3 d, float rot) {
  float c = cos(-rot), s = sin(-rot);
  d = vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
  return vec2(atan(d.z, d.x) / 6.2831853 + .5, asin(clamp(d.y, -1., 1.)) / 3.1415927 + .5);
}
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
float waves(vec2 p) {
  float t = uTime;
  vec2 flow = vFlow * uStream * 1.4;
  float w = n2(p * .9 - flow * t + vec2(t * .07, t * .05) * (.3 + uWind)) * .5;
  w += n2(p * 2.3 - flow * t * 1.3 - vec2(t * .11, -t * .09) * (.3 + uWind)) * .3;
  w += n2(p * 6.1 - flow * t * 1.7 + vec2(-t * .2, t * .17)) * .2;
  return w * (.25 + uWind * .5 + uStream * .9);
}
/** Expanding rings where drops land. */
float rings(vec2 p) {
  float acc = 0.;
  for (int k = 0; k < 2; k++) {
    vec2 q = p * (1.7 + float(k) * .9) + float(k) * 7.3;
    vec2 cell = floor(q);
    vec2 f = fract(q) - .5;
    float ph = fract(uTime * (.8 + h2(cell) * .6) + h2(cell + 3.1));
    vec2 o = vec2(h2(cell + 1.7), h2(cell + 5.3)) - .5;
    float d = length(f - o * .5);
    acc += sin(clamp((d - ph * .45) * 40., -3.1416, 3.1416)) * (1. - ph) * smoothstep(.45, .3, d);
  }
  return acc;
}
void main() {
  vec2 uv = vWorld.xz / ${WORLD.toFixed(1)} + .5;
  float bed = texture2D(uHeight, uv).r;
  float depth = vWorld.y - bed;
  if (depth < -.02) discard;

  // Surface normal from the height of the waves.
  vec2 p = vWorld.xz;
  float e = .08;
  float h0 = waves(p);
  vec2 g = vec2(waves(p + vec2(e, 0.)) - h0, waves(p + vec2(0., e)) - h0) / e;
  if (uRain > .01) {
    float r0 = rings(p);
    g += vec2(rings(p + vec2(e, 0.)) - r0, rings(p + vec2(0., e)) - r0) / e * .02 * uRain;
  }
  vec3 n = normalize(vec3(-g.x * .12, 1., -g.y * .12));

  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, n);
  R.y = abs(R.y);
  vec3 sky = mix(texture2D(uA, equi(R, uRotA)).rgb * uIntA, texture2D(uB, equi(R, uRotB)).rgb * uIntB, uMix);
  sky = mix(sky, uFogColor, uCloud * .7);
  // The far shore's trees darken the reflection just above the horizon.
  vec3 shore = (uGround * 1.6 + uSky * .5) * vec3(.55, .7, .5);
  vec3 refl = mix(shore, sky, smoothstep(.02, .2, R.y));
  float fres = .02 + .98 * pow(1. - max(dot(n, V), 0.), 5.);
  // Water body: tea-green in the depths, the bed showing through the shallows.
  vec3 amb = uSky * 1.4 + uSunColor * max(uSunDir.y, 0.) * .6;
  vec3 body = mix(vec3(.11, .1, .07), vec3(.015, .045, .04), smoothstep(0., 1.2, depth)) * amb;
  vec3 col = mix(body, refl, fres);
  col += uSunColor * pow(max(dot(R, uSunDir), 0.), 220.) * 7. * (1. - uCloud);
  // Foam where the stream rubs its banks.
  float foam = uStream * smoothstep(.75, 1., vEdge) * smoothstep(.45, .8, n2(p * 3. - vFlow * uTime * 1.6));
  col = mix(col, amb * .9, foam * .6);
  col = mix(col, vec3(.88, .92, .96) * amb * 1.2, uSnow * smoothstep(.05, .0, depth) * .5);
  float alpha = clamp(smoothstep(-.02, .5, depth) * .85 + fres * .6, 0., 1.);
  alpha *= 1. - smoothstep(.85, 1., vEdge) * .6;
  float d = distance(cameraPosition, vWorld);
  col = mix(col, uFogColor, 1. - exp(-uFogDensity * uFogDensity * d * d));
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

export class Water {
  readonly group = new THREE.Group();

  constructor(sky: Sky, heightTex: THREE.Texture) {
    const base = {
      uA: sky.uniforms.uA,
      uB: sky.uniforms.uB,
      uMix: sky.uniforms.uMix,
      uRotA: sky.uniforms.uRotA,
      uRotB: sky.uniforms.uRotB,
      uIntA: sky.uniforms.uIntA,
      uIntB: sky.uniforms.uIntB,
      uCloud: sky.uniforms.uCloud,
      uRain: sky.uniforms.uRain,
      uHeight: { value: heightTex },
      uTime: LIGHT.uTime,
      uWind: LIGHT.uWind,
      uSunDir: LIGHT.uSunDir,
      uSunColor: LIGHT.uSunColor,
      uSky: LIGHT.uSky,
      uGround: LIGHT.uGround,
      uFogColor: LIGHT.uFogColor,
      uFogDensity: LIGHT.uFogDensity,
      uSnow: LIGHT.uSnow,
    };
    const mat = (isStream: boolean) =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { ...base, uStream: { value: isStream ? 1 : 0 } },
        transparent: true,
        depthWrite: false,
      });

    // Pond: an ellipse a little larger than the basin; the shader trims it to the shore.
    const pg = new THREE.CircleGeometry(1, 96);
    pg.rotateX(-Math.PI / 2);
    pg.scale(POND.rx * 1.3, 1, POND.rz * 1.3);
    const n = pg.attributes.position.count;
    pg.setAttribute('aFlow', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    pg.setAttribute('aEdge', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    const pond = new THREE.Mesh(pg, mat(false));
    pond.position.set(POND.x, POND.level, POND.z);
    pond.renderOrder = 2;
    this.group.add(pond);

    // Stream: a ribbon along its course, carrying the flow direction.
    const pos: number[] = [], flow: number[] = [], edge: number[] = [], idx: number[] = [];
    const half = STREAM_WIDTH * 0.5 + 0.5;
    for (let i = 0; i < stream.length; i++) {
      const a = stream[Math.max(0, i - 1)], b = stream[Math.min(stream.length - 1, i + 1)];
      let dx = b.x - a.x, dz = b.z - a.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const p = stream[i];
      for (const side of [-1, -0.5, 0, 0.5, 1]) {
        pos.push(p.x - dz * half * side, p.y, p.z + dx * half * side);
        flow.push(dx, dz);
        edge.push(Math.abs(side));
      }
      if (i > 0) {
        const r0 = (i - 1) * 5, r1 = i * 5;
        // Wound so the face points up.
        for (let k = 0; k < 4; k++) idx.push(r0 + k, r0 + k + 1, r1 + k, r1 + k, r0 + k + 1, r1 + k + 1);
      }
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
    sg.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
    sg.setIndex(idx);
    sg.computeBoundingSphere();
    const st = new THREE.Mesh(sg, mat(true));
    st.renderOrder = 2;
    this.group.add(st);
  }
}

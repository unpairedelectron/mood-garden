// Ocean and lagoon: one large plane shaded with depth-tinted colour, fresnel
// sky reflection, sun glitter and animated shoreline foam.

import * as THREE from 'three';
import { COMMON_GLSL, G } from '../render/shared';
import { SUN_MAX, type Sky } from './sky';

const VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec3 vW;
uniform vec3 uZenith, uHorizon, uFogColor;
uniform float uFogDensity, uLight, uSunI;
${COMMON_GLSL}

float waveH(vec2 p) {
  float t = uTime;
  float h = vnoise(p * 0.35 + vec2(t * 0.28, t * 0.17)) * 0.6;
  h += vnoise(p * 0.9 - vec2(t * 0.35, -t * 0.22)) * 0.28;
  h += vnoise(p * 2.6 + vec2(-t * 0.5, t * 0.45)) * 0.12;
  return h;
}
void main() {
  vec2 p = vW.xz;
  vec3 V = normalize(cameraPosition - vW);
  float dist = distance(cameraPosition, vW);

  float e = 0.18;
  float h0 = waveH(p);
  vec3 n = normalize(vec3(h0 - waveH(p + vec2(e, 0.)), e * 1.5, h0 - waveH(p + vec2(0., e))));
  n = normalize(mix(n, vec3(0., 1., 0.), smoothstep(60., 420., dist)));

  vec2 uv = wuv(p);
  float inside = step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
  float th = mix(-14., texture2D(uWorldTex, uv).r, inside);
  float depth = max(-th, 0.);

  vec3 tint;
  float vit = vitality(p, tint);
  vec3 shallow = mix(s2l(vec3(0.30, 0.52, 0.52)), s2l(vec3(0.16, 0.78, 0.72)), vit);
  vec3 deep = mix(s2l(vec3(0.06, 0.16, 0.24)), s2l(vec3(0.02, 0.20, 0.36)), 0.5 + 0.5 * vit);
  vec3 body = mix(shallow, deep, 1. - exp(-depth * 0.32)) * uLight;

  vec3 R = reflect(-V, n);
  R.y = abs(R.y);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(R.y, 0., 1.), 0.5));
  float fres = 0.03 + 0.97 * pow(1. - max(dot(n, V), 0.), 5.);
  float spec = pow(max(dot(R, uSunDir), 0.), 420.) * 7. + pow(max(dot(R, uSunDir), 0.), 48.) * 0.3;
  vec3 col = mix(body, sky, clamp(fres, 0., 1.) * 0.9) + uSunColor * spec * uSunI;

  // Foam: a lapping band at the shore plus drifting crests.
  float lap = sin(depth * 5.5 - uTime * 1.4 + vnoise(p * 0.4) * 6.) * 0.5 + 0.5;
  float foamN = vnoise(p * 1.7 + uTime * 0.12) * 0.6 + vnoise(p * 5.0 - uTime * 0.2) * 0.4;
  float shore = (1. - smoothstep(0.0, 0.5, depth)) * smoothstep(0.45, 0.8, foamN + lap * 0.4) * 0.8;
  shore += (1. - smoothstep(0.0, 0.1, depth)) * 0.7;
  float foam = clamp(shore, 0., 1.) * inside;
  col = mix(col, vec3(0.95, 0.98, 1.0) * (uLight * 0.85 + 0.05), foam * 0.7);
  col += uWaveColor * waveGlow(vW) * 0.8;

  float alpha = clamp(smoothstep(0.0, 0.9, depth) * 0.82 + 0.16 + fres * 0.5 + foam, 0., 1.);
  alpha = mix(1., alpha, inside);
  float fog = 1. - exp(-uFogDensity * uFogDensity * dist * dist);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, alpha);
}`;

export class Water {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private sky: Sky;
  constructor(sky: Sky) {
    this.sky = sky;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        ...G,
        uZenith: { value: sky.zenith },
        uHorizon: { value: sky.horizon },
        uFogColor: { value: sky.fog.color },
        uFogDensity: { value: 0.004 },
        uLight: { value: 1 },
        uSunI: { value: 1 },
      },
    });
    const geo = new THREE.PlaneGeometry(6000, 6000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }
  update(camera: THREE.Camera) {
    const u = this.mat.uniforms;
    u.uFogDensity.value = this.sky.fog.density;
    u.uLight.value = 0.1 + 0.9 * this.sky.day;
    u.uSunI.value = this.sky.sun.intensity / SUN_MAX;
    this.mesh.position.set(camera.position.x, 0, camera.position.z);
  }
}

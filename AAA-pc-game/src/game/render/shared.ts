// Uniforms and GLSL shared by every world material so terrain, grass, trees
// and water all agree about wind, vitality and time.

import * as THREE from 'three';

export const G = {
  uTime: { value: 0 },
  uWorldTex: { value: null as THREE.Texture | null },
  uVitTex: { value: null as THREE.Texture | null },
  uPlayerPos: { value: new THREE.Vector3() },
  uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
  uSunColor: { value: new THREE.Color(1, 1, 1) },
  uNight: { value: 0 },
  uWind: { value: 1 },
  /** Expanding ring of light when a grove awakens: x, y = centre (world xz), z = strength, w = radius. */
  uWave: { value: new THREE.Vector4(0, 0, 0, -1) },
  uWaveColor: { value: new THREE.Color(1, 1, 1) },
};

export const COMMON_GLSL = /* glsl */ `
uniform float uTime;
uniform sampler2D uWorldTex;
uniform sampler2D uVitTex;
uniform vec3 uPlayerPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uNight;
uniform float uWind;
uniform vec4 uWave;
uniform vec3 uWaveColor;

vec3 s2l(vec3 c) { return pow(c, vec3(2.2)); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm2(vec2 p) {
  float a = .5, s = 0.;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + 17.; a *= .5; }
  return s / .875;
}
vec2 wuv(vec2 xz) { return xz / 512.0 + 0.5; }

// How alive the land is here (0 = the Quiet, 1 = restored), with a ragged edge.
float vitality(vec2 xz, out vec3 tint) {
  vec4 v = texture2D(uVitTex, wuv(xz));
  tint = v.rgb;
  float n = fbm2(xz * 0.13);
  return smoothstep(0.30, 0.62, v.a + (n - 0.5) * 0.34);
}
vec3 grassLush(vec2 xz, vec3 tint) {
  float n = fbm2(xz * 0.045 + 31.);
  vec3 c = mix(s2l(vec3(0.16, 0.38, 0.14)), s2l(vec3(0.40, 0.56, 0.18)), n);
  return mix(c, c * (0.45 + tint * 1.25), 0.22);
}
vec3 grassDorm(vec2 xz) {
  float n = fbm2(xz * 0.045 + 31.);
  return mix(s2l(vec3(0.44, 0.44, 0.42)), s2l(vec3(0.60, 0.58, 0.53)), n);
}
float waveGlow(vec3 wp) {
  if (uWave.w < 0.) return 0.;
  float d = distance(wp.xz, uWave.xy);
  float ring = 1. - smoothstep(0., 3.5, abs(d - uWave.w));
  return ring * uWave.z;
}
// Layered gusts travelling across the island.
float windAt(vec2 xz) {
  float t = uTime;
  float g = vnoise(xz * 0.035 + vec2(t * 0.55, t * 0.21));
  float f = sin(xz.x * 0.6 + t * 2.1) * sin(xz.y * 0.5 + t * 1.7);
  return (g * 1.4 - 0.35 + f * 0.22) * uWind;
}
`;

type ShaderLike = { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string };

/**
 * Patch a built-in material's shader. `key` must be unique per distinct patch
 * so three's program cache never confuses two variants.
 */
export function patchMaterial<T extends THREE.Material>(
  mat: T,
  key: string,
  fn: (shader: ShaderLike) => void,
  extraUniforms: Record<string, THREE.IUniform> = {},
): T {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, G, extraUniforms);
    fn(shader as ShaderLike);
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

export const replace = (src: string, token: string, code: string) => {
  if (!src.includes(token)) console.warn('[shader] token not found:', token);
  return src.replace(token, code);
};

/** Replacement for <normal_fragment_begin> that never flips on back faces. */
export const FLAT_NORMAL = /* glsl */ `
float faceDirection = 1.0;
vec3 normal = normalize(vNormal);
vec3 nonPerturbedNormal = normal;
`;

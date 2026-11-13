// Atmosphere: procedural sky dome, day/night cycle, sun + moon lighting and
// the fog that ties the scene to the horizon.

import * as THREE from 'three';
import { clamp01, lerp, smoothstep } from '../core/math';
import { G } from '../render/shared';

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uZenith, uHorizon, uGround, uSunCol, uMoonCol, uCloudLit, uCloudDark;
uniform vec3 uSun, uMoon;
uniform float uTime, uCover, uStars, uAurora, uSunVis;

float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = .5, s = 0.;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; }
  return s;
}
float cloudDensity(vec2 uv) {
  float c = fbm(uv);
  return smoothstep(1. - uCover, 1. - uCover + 0.38, c + 0.12);
}
void main() {
  vec3 d = normalize(vDir);
  float up = max(d.y, 0.);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0., 1., up), 0.42));
  col = mix(col, uGround, smoothstep(0., -0.22, d.y));

  // Sun: wide warm scatter, tight halo, HDR disc.
  float sd = max(dot(d, uSun), 0.);
  vec3 sun = uSunCol * (pow(sd, 6.) * 0.22 + pow(sd, 48.) * 0.5 + pow(sd, 700.) * 3.);
  float disc = smoothstep(0.99955, 0.99975, sd) * 36.;

  // Moon
  float md = max(dot(d, uMoon), 0.);
  vec3 moon = uMoonCol * (pow(md, 80.) * 0.35 + smoothstep(0.9992, 0.9995, md) * 5.);

  // Stars
  vec3 sp = d * 190.;
  vec3 ip = floor(sp);
  float rnd = hash13(ip);
  float star = step(0.992, rnd) * smoothstep(0.42, 0.0, length(fract(sp) - .5));
  star *= 0.6 + 0.4 * sin(uTime * (1.5 + rnd * 4.) + rnd * 90.);
  vec3 stars = vec3(0.8, 0.9, 1.2) * star * 3.5 * uStars * smoothstep(0.02, 0.25, d.y);

  // Aurora curtains for the finale.
  vec3 aur = vec3(0.);
  if (uAurora > 0.001 && d.y > 0.05) {
    vec2 auv = d.xz / (d.y + 0.25);
    float band = sin(auv.x * 2.2 + fbm(auv * 1.3 + uTime * 0.03) * 5. + uTime * 0.12);
    float curtain = pow(smoothstep(0.25, 1., band), 2.) * smoothstep(0.05, 0.4, d.y) * (1. - smoothstep(0.55, 0.95, d.y));
    float ray = 0.6 + 0.4 * vnoise(vec2(auv.x * 26., uTime * 0.4));
    vec3 ac = mix(vec3(0.15, 1.0, 0.55), vec3(0.75, 0.3, 1.0), smoothstep(0.1, 0.7, d.y + band * 0.1));
    aur = ac * curtain * ray * uAurora * 1.3;
  }

  // Clouds on a virtual plane, lit from the sun side.
  float cl = 0.;
  vec3 cc = vec3(0.);
  if (d.y > 0.01) {
    vec2 uv = d.xz / (d.y + 0.16) * 1.15 + vec2(uTime * 0.006, uTime * 0.0025);
    cl = cloudDensity(uv);
    float toward = cloudDensity(uv + normalize(uSun.xz + 1e-4) * 0.16);
    float lit = clamp(1. - toward * 0.9 + (1. - cl) * 0.35, 0., 1.);
    cc = mix(uCloudDark, uCloudLit, lit);
    cc += uSunCol * pow(sd, 10.) * 0.35 * (1. - cl * 0.6);
    cl *= smoothstep(0.01, 0.16, d.y);
  }

  col += stars * (1. - cl) + aur * (1. - cl * 0.7) + moon * (1. - cl * 0.85);
  col += (sun + uSunCol * disc * (1. - cl)) * uSunVis * (1. - cl * 0.55);
  col = mix(col, cc, cl * 0.92);
  gl_FragColor = vec4(col, 1.);
}`;

const c = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

const KEY = {
  zenithNight: c(0.035, 0.05, 0.14),
  zenithDay: c(0.16, 0.42, 0.86),
  zenithTwi: c(0.2, 0.24, 0.52),
  horizonNight: c(0.09, 0.12, 0.24),
  horizonDay: c(0.66, 0.82, 0.96),
  horizonTwi: c(1.0, 0.56, 0.3),
  sunDay: c(1.0, 0.95, 0.86),
  sunLow: c(1.0, 0.5, 0.22),
  moon: c(0.62, 0.74, 1.0),
  grey: c(0.52, 0.55, 0.6),
};

/** Peak directional intensity at midday. */
export const SUN_MAX = 7.5;

export class Sky {
  readonly dome: THREE.Mesh;
  readonly sun = new THREE.DirectionalLight(0xffffff, 3);
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  readonly fog = new THREE.FogExp2(0xaabbcc, 0.004);
  readonly sunDir = new THREE.Vector3();
  readonly moonDir = new THREE.Vector3();
  readonly lightDir = new THREE.Vector3();
  readonly zenith = new THREE.Color();
  readonly horizon = new THREE.Color();
  readonly sunColor = new THREE.Color();
  /** Hour of day, 0..24. */
  hour = 7.4;
  /** 0 = the Quiet (grey, overcast), 1 = fully restored. */
  life = 0;
  aurora = 0;
  /** Extra overcast, e.g. inside the Weeping Hollow. */
  gloom = 0;
  /** 0 = night, 1 = full day. */
  day = 1;
  paused = false;
  private mat: THREE.ShaderMaterial;
  private tmp = new THREE.Color();
  private shadowExtent = 60;

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      uniforms: {
        uZenith: { value: this.zenith },
        uHorizon: { value: this.horizon },
        uGround: { value: new THREE.Color() },
        uSunCol: { value: new THREE.Color() },
        uMoonCol: { value: KEY.moon.clone() },
        uCloudLit: { value: new THREE.Color() },
        uCloudDark: { value: new THREE.Color() },
        uSun: { value: this.sunDir },
        uMoon: { value: this.moonDir },
        uTime: G.uTime,
        uCover: { value: 0.5 },
        uStars: { value: 0 },
        uAurora: { value: 0 },
        uSunVis: { value: 1 },
      },
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;

    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.06;
    this.setShadowQuality(2048, 60);
  }

  setShadowQuality(size: number, extent: number) {
    const s = this.sun.shadow;
    this.shadowExtent = extent;
    s.mapSize.set(size, size);
    const cam = s.camera;
    cam.left = cam.bottom = -extent;
    cam.right = cam.top = extent;
    cam.near = 1;
    cam.far = 420;
    cam.updateProjectionMatrix();
    if (s.map) {
      s.map.dispose();
      s.map = null;
    }
  }

  update(dt: number, focus: THREE.Vector3) {
    const u = this.mat.uniforms;
    if (!this.paused) {
      const night = this.sunDir.y < -0.08;
      this.hour = (this.hour + dt * (24 / (15 * 60)) * (night ? 2.4 : 1)) % 24;
    }
    const a = ((this.hour - 6) / 24) * Math.PI * 2;
    this.sunDir.set(Math.cos(a) * 0.82, Math.sin(a) * 0.92, -0.42).normalize();
    this.moonDir.set(-Math.cos(a) * 0.7, -Math.sin(a) * 0.85 + 0.12, 0.5).normalize();
    const e = this.sunDir.y;
    const day = smoothstep(-0.08, 0.3, e);
    const twi = smoothstep(-0.32, -0.02, e) * (1 - smoothstep(0.02, 0.42, e));
    this.day = day;
    const life = this.life;
    const grey = (1 - life) * 0.55 + this.gloom * 0.35;

    this.zenith.copy(KEY.zenithNight).lerp(KEY.zenithDay, day).lerp(KEY.zenithTwi, twi * 0.55);
    this.horizon.copy(KEY.horizonNight).lerp(KEY.horizonDay, day).lerp(KEY.horizonTwi, twi * 0.8);
    // The Quiet: colour drains toward a soft overcast grey.
    const lum = (col: THREE.Color) => col.r * 0.25 + col.g * 0.6 + col.b * 0.15;
    this.tmp.copy(KEY.grey).multiplyScalar(lum(this.zenith) * 1.9 + 0.01);
    this.zenith.lerp(this.tmp, grey);
    this.tmp.copy(KEY.grey).multiplyScalar(lum(this.horizon) * 1.7 + 0.01);
    this.horizon.lerp(this.tmp, grey * 0.8);

    this.sunColor.copy(KEY.sunLow).lerp(KEY.sunDay, smoothstep(0.02, 0.5, e));
    (u.uSunCol.value as THREE.Color).copy(this.sunColor);
    (u.uGround.value as THREE.Color).copy(this.horizon).multiplyScalar(0.55);
    (u.uCloudLit.value as THREE.Color)
      .setRGB(1, 1, 1)
      .lerp(this.sunColor, 0.5 + twi * 0.5)
      .multiplyScalar(lerp(0.07, 1.25, day) + twi * 0.25);
    (u.uCloudDark.value as THREE.Color)
      .copy(this.zenith)
      .lerp(this.horizon, 0.5)
      .multiplyScalar(lerp(0.75, 0.62, day));
    u.uCover.value = clamp01(lerp(0.66, 0.4, life) + this.gloom * 0.25);
    u.uStars.value = (1 - day) * (1 - grey * 0.6);
    u.uAurora.value = this.aurora * (1 - day * 0.75);
    u.uSunVis.value = smoothstep(-0.12, 0.0, e) * (1 - grey * 0.5);

    // One shadow-casting light: the sun by day, the moon by night, cross-faded
    // through zero so the swap is invisible.
    const sunI = smoothstep(-0.03, 0.22, e) * SUN_MAX * (1 - grey * 0.3) * (1 - this.gloom * 0.45);
    const moonI = smoothstep(0.03, -0.14, e) * 1.5;
    if (sunI >= moonI) {
      this.lightDir.copy(this.sunDir);
      this.sun.color.copy(this.sunColor);
      this.sun.intensity = sunI;
    } else {
      this.lightDir.copy(this.moonDir);
      this.sun.color.copy(KEY.moon);
      this.sun.intensity = moonI;
    }
    // Keep the light comfortably above the horizon to avoid endless shadows.
    if (this.lightDir.y < 0.14) {
      this.lightDir.y = 0.14;
      this.lightDir.normalize();
    }
    // Snap the shadow frustum to texel steps so shadows do not shimmer.
    const texel = (this.shadowExtent * 2) / this.sun.shadow.mapSize.x;
    const fx = Math.round(focus.x / texel) * texel;
    const fz = Math.round(focus.z / texel) * texel;
    this.sun.target.position.set(fx, focus.y, fz);
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.lightDir, 200);
    this.sun.target.updateMatrixWorld();

    this.hemi.color.copy(this.zenith).lerp(this.horizon, 0.45);
    this.hemi.groundColor.copy(this.horizon).multiplyScalar(0.3).lerp(c(0.25, 0.22, 0.14), 0.4 * day);
    this.hemi.intensity = lerp(3.4, 5.4, day) + grey * 0.4;

    this.fog.color.copy(this.horizon).lerp(this.zenith, 0.25);
    this.fog.density = lerp(0.0062, 0.0026, life) + this.gloom * 0.004 + twi * 0.0008;

    G.uSunDir.value.copy(this.lightDir);
    G.uSunColor.value.copy(this.sun.color).multiplyScalar(this.sun.intensity / SUN_MAX);
    G.uNight.value = 1 - day;
    this.dome.scale.setScalar(1);
  }

  timeLabel(): string {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

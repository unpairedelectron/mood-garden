// The island: heightfield, world data textures and the "vitality" map that
// tracks which parts of the land have been brought back to life.

import * as THREE from 'three';
import { Noise2D, clamp, clamp01, easeOutCubic, gauss, lerp, smoothstep } from '../core/math';
import { HEART_POS, MOODS, WORLD_HALF, WORLD_SIZE } from '../data/moods';
import { COMMON_GLSL, G, patchMaterial, replace } from '../render/shared';

const N = 513; // height samples per side (1 m spacing)
const VIT_N = 256;

interface Bloom {
  x: number;
  z: number;
  radius: number;
  t: number;
  dur: number;
  r: number;
  g: number;
  b: number;
}

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export class Terrain {
  readonly heights = new Float32Array(N * N);
  readonly grassMask = new Float32Array(N * N);
  readonly pathMask = new Float32Array(N * N);
  readonly slope = new Float32Array(N * N);
  readonly mesh: THREE.Mesh;
  readonly worldTex: THREE.DataTexture;
  readonly vitTex: THREE.DataTexture;
  readonly start = new THREE.Vector3();

  private vitData = new Uint8Array(VIT_N * VIT_N * 4);
  private vitBase = new Uint8Array(VIT_N * VIT_N * 4);
  private blooms: Bloom[] = [];
  private noise = new Noise2D(20240611);

  constructor() {
    this.buildHeights();
    this.buildMasks();
    this.worldTex = this.buildWorldTexture();
    for (let i = 0; i < VIT_N * VIT_N; i++) {
      this.vitBase[i * 4] = this.vitBase[i * 4 + 1] = this.vitBase[i * 4 + 2] = 255;
    }
    this.vitData.set(this.vitBase);
    this.vitTex = new THREE.DataTexture(this.vitData, VIT_N, VIT_N, THREE.RGBAFormat);
    this.vitTex.magFilter = this.vitTex.minFilter = THREE.LinearFilter;
    this.vitTex.needsUpdate = true;
    G.uWorldTex.value = this.worldTex;
    G.uVitTex.value = this.vitTex;
    this.mesh = this.buildMesh();
  }

  // ------------------------------------------------------------ generation
  private rawHeight(x: number, z: number): number {
    const n = this.noise;
    const r = Math.hypot(x, z);
    let h = 7 + n.fbm(x * 0.006, z * 0.006, 5) * 6.5 + n.get(x * 0.03, z * 0.03) * 0.8;
    h = Math.max(h, 3.2 + n.get(x * 0.02 + 9, z * 0.02) * 0.6);
    h += 11 * gauss(x, z, 42); // the heart hill
    h += (30 + 14 * n.ridged(x * 0.012, z * 0.012)) * gauss(x + 24, z + 112, 58); // ember heights
    h += 13 * gauss(x - 74, z + 84, 34); // dawnwatch cliff
    h -= 21 * gauss(x - 120, z - 44, 27); // stillwater lagoon
    h -= 5 * gauss(x - 58, z - 108, 26); // weeping hollow
    h -= 8 * gauss(x - 72, z - 124, 8); // ...and its pond
    const edge = 225 + n.get(x * 0.007, z * 0.007) * 16 + n.get(x * 0.025, z * 0.025) * 4;
    let m = 1 - smoothstep(edge - 70, edge, r);
    // A bite out of the north-east coast gives Dawnwatch its sea cliff.
    m *= 1 - smoothstep(0.26, 0.6, gauss(x - 132, z + 138, 46));
    return -14 + (h + 14) * m;
  }

  private buildHeights() {
    const H = this.heights;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        H[j * N + i] = this.rawHeight(i - WORLD_HALF, j - WORLD_HALF);
      }
    }
    // Level the ground where shrines stand.
    const sites: { x: number; z: number; inner: number; outer: number }[] = MOODS.map((m) => ({
      x: m.pos[0],
      z: m.pos[1],
      inner: 8,
      outer: 20,
    }));
    sites.push({ x: HEART_POS[0], z: HEART_POS[1], inner: 12, outer: 28 });
    for (const s of sites) {
      const sh = Math.max(3.4, this.rawHeight(s.x, s.z));
      const x0 = Math.max(0, Math.floor(s.x - s.outer + WORLD_HALF));
      const x1 = Math.min(N - 1, Math.ceil(s.x + s.outer + WORLD_HALF));
      const z0 = Math.max(0, Math.floor(s.z - s.outer + WORLD_HALF));
      const z1 = Math.min(N - 1, Math.ceil(s.z + s.outer + WORLD_HALF));
      for (let j = z0; j <= z1; j++) {
        for (let i = x0; i <= x1; i++) {
          const d = Math.hypot(i - WORLD_HALF - s.x, j - WORLD_HALF - s.z);
          const w = 1 - smoothstep(s.inner, s.outer, d);
          if (w > 0) H[j * N + i] = lerp(H[j * N + i], sh, w);
        }
      }
    }
    // The keeper wakes on the southern beach: find where the land meets the sea.
    let sz = 120;
    for (let z = 120; z < 240; z += 0.5) {
      if (this.heightAt(6, z) < 1.7) break;
      sz = z;
    }
    this.start.set(6, 0, sz - 4);
    this.start.y = this.heightAt(this.start.x, this.start.z);
  }

  private buildMasks() {
    const n = this.noise;
    const H = this.heights;
    // Footpaths: shore -> heart -> each grove.
    const segs: number[][] = [
      [this.start.x, this.start.z, 2, 110],
      [2, 110, -4, 60],
      [-4, 60, 0, 16],
    ];
    for (const m of MOODS) {
      const a = Math.atan2(m.pos[1], m.pos[0]);
      segs.push([Math.cos(a) * 14, Math.sin(a) * 14, m.pos[0], m.pos[1]]);
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = j * N + i;
        const x = i - WORLD_HALF;
        const z = j - WORLD_HALF;
        const i0 = Math.max(1, Math.min(N - 2, i));
        const j0 = Math.max(1, Math.min(N - 2, j));
        const dx = (H[j0 * N + i0 + 1] - H[j0 * N + i0 - 1]) * 0.5;
        const dz = (H[(j0 + 1) * N + i0] - H[(j0 - 1) * N + i0]) * 0.5;
        const sl = 1 - 1 / Math.sqrt(1 + dx * dx + dz * dz);
        this.slope[k] = sl;

        const wx = x + n.get(x * 0.021, z * 0.021) * 5;
        const wz = z + n.get(x * 0.021 + 40, z * 0.021 - 12) * 5;
        let d = 1e9;
        for (const s of segs) d = Math.min(d, distToSegment(wx, wz, s[0], s[1], s[2], s[3]));
        const path = 1 - smoothstep(0.9, 2.3, d + n.get(x * 0.3, z * 0.3) * 0.5);
        this.pathMask[k] = path;

        let site = 0;
        for (const m of MOODS) {
          site = Math.max(site, 1 - smoothstep(4.5, 7.5, Math.hypot(x - m.pos[0], z - m.pos[1])));
        }
        site = Math.max(site, 1 - smoothstep(5, 9, Math.hypot(x - HEART_POS[0], z - HEART_POS[1])));

        const h = H[k];
        let g = smoothstep(1.5, 2.6, h) * (1 - smoothstep(0.2, 0.34, sl));
        g *= 1 - path;
        g *= 1 - site;
        this.grassMask[k] = g;
      }
    }
  }

  private buildWorldTexture() {
    const S = WORLD_SIZE;
    const data = new Uint16Array(S * S * 4);
    const th = THREE.DataUtils.toHalfFloat;
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        const x = i + 0.5 - WORLD_HALF;
        const z = j + 0.5 - WORLD_HALF;
        const k = (j * S + i) * 4;
        data[k] = th(this.heightAt(x, z));
        data[k + 1] = th(this.sample(this.grassMask, x, z));
        data[k + 2] = th(this.sample(this.pathMask, x, z));
        data[k + 3] = th(this.sample(this.slope, x, z));
      }
    }
    const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  private buildMesh() {
    const SEG = 256;
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const nor = geo.attributes.normal as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.heightAt(x, z));
      this.normalAt(x, z, v, 1.5);
      nor.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeBoundingSphere();
    geo.computeBoundingBox();

    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    patchMaterial(mat, 'terrain', (s) => {
      s.vertexShader = replace(
        s.vertexShader,
        '#include <common>',
        `#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;`,
      );
      s.vertexShader = replace(
        s.vertexShader,
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvWPos = position;\nvWNor = normal;`,
      );
      s.fragmentShader = replace(
        s.fragmentShader,
        '#include <common>',
        `#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;\n${COMMON_GLSL}`,
      );
      s.fragmentShader = replace(
        s.fragmentShader,
        '#include <color_fragment>',
        /* glsl */ `
        vec2 xz = vWPos.xz;
        vec4 wd = texture2D(uWorldTex, wuv(xz));
        vec3 tint;
        float vit = vitality(xz, tint);
        float n1 = fbm2(xz * 0.21);
        float n2 = vnoise(xz * 2.3);
        float n3 = vnoise(xz * 9.0);
        vec3 grass = mix(grassDorm(xz), grassLush(xz, tint), vit) * (0.55 + 0.25 * n2 + 0.1 * n3);
        vec3 dirt = mix(s2l(vec3(0.42, 0.34, 0.25)), s2l(vec3(0.56, 0.45, 0.31)), n2) * (0.85 + 0.3 * n3);
        dirt = mix(dirt * vec3(0.8, 0.8, 0.84), dirt, 0.4 + 0.6 * vit);
        vec3 sand = mix(s2l(vec3(0.80, 0.72, 0.56)), s2l(vec3(0.93, 0.87, 0.70)), n1) * (0.92 + 0.16 * n3);
        float wet = 1. - smoothstep(0.05, 0.75, vWPos.y);
        sand *= mix(1., 0.55, wet);
        float strata = vnoise(vec2(vWPos.y * 1.6 + n1 * 3., dot(xz, vec2(0.05, 0.03))));
        vec3 rock = mix(s2l(vec3(0.34, 0.33, 0.34)), s2l(vec3(0.58, 0.54, 0.49)), strata) * (0.8 + 0.4 * n2);
        rock = mix(rock, rock * s2l(vec3(0.78, 0.86, 0.6)), vit * 0.35 * n1);
        float slope = 1. - normalize(vWNor).y;
        float rockW = smoothstep(0.17, 0.33, slope + (n2 - 0.5) * 0.09);
        float sandW = 1. - smoothstep(1.0, 2.5, vWPos.y + (n1 - 0.5) * 1.3);
        vec3 col = mix(grass, dirt, wd.b * 0.9);
        col = mix(col, sand, sandW);
        col = mix(col, rock, rockW * (1. - sandW * 0.6));
        // Sea floor falls away into blue.
        col = mix(col, s2l(vec3(0.07, 0.2, 0.26)), smoothstep(0., -7., vWPos.y) * 0.9);
        diffuseColor.rgb = col;
        `,
      );
      s.fragmentShader = replace(
        s.fragmentShader,
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\ntotalEmissiveRadiance += uWaveColor * waveGlow(vWPos) * 1.6;`,
      );
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }

  // --------------------------------------------------------------- queries
  private sample(arr: Float32Array, x: number, z: number): number {
    const fx = clamp(x + WORLD_HALF, 0, N - 1.001);
    const fz = clamp(z + WORLD_HALF, 0, N - 1.001);
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const k = j * N + i;
    return lerp(lerp(arr[k], arr[k + 1], tx), lerp(arr[k + N], arr[k + N + 1], tx), tz);
  }

  heightAt(x: number, z: number): number {
    if (Math.abs(x) >= WORLD_HALF || Math.abs(z) >= WORLD_HALF) return -14;
    return this.sample(this.heights, x, z);
  }
  slopeAt(x: number, z: number) {
    return this.sample(this.slope, x, z);
  }
  grassAt(x: number, z: number) {
    return this.sample(this.grassMask, x, z);
  }
  pathAt(x: number, z: number) {
    return this.sample(this.pathMask, x, z);
  }
  normalAt(x: number, z: number, out: THREE.Vector3, e = 0.8) {
    const dx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const dz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return out.set(-dx, 2 * e, -dz).normalize();
  }

  // -------------------------------------------------------------- vitality
  vitalityAt(x: number, z: number): number {
    const i = clamp(Math.floor(((x + WORLD_HALF) / WORLD_SIZE) * VIT_N), 0, VIT_N - 1);
    const j = clamp(Math.floor(((z + WORLD_HALF) / WORLD_SIZE) * VIT_N), 0, VIT_N - 1);
    return this.vitData[(j * VIT_N + i) * 4 + 3] / 255;
  }

  /** Bring a circle of land back to life. `dur` = 0 applies instantly. */
  addBloom(x: number, z: number, radius: number, color: THREE.Color | number, dur = 0) {
    const c = new THREE.Color(color as THREE.ColorRepresentation);
    // Stored as display-referred bytes; the shaders treat them as tint weights.
    const b: Bloom = { x, z, radius, t: 0, dur, r: c.r * 255, g: c.g * 255, b: c.b * 255 };
    if (dur <= 0) {
      this.raster(b, radius, this.vitBase);
      this.vitData.set(this.vitBase);
      this.vitTex.needsUpdate = true;
    } else {
      this.blooms.push(b);
    }
  }

  resetVitality() {
    this.blooms.length = 0;
    for (let i = 0; i < VIT_N * VIT_N; i++) {
      this.vitBase[i * 4] = this.vitBase[i * 4 + 1] = this.vitBase[i * 4 + 2] = 255;
      this.vitBase[i * 4 + 3] = 0;
    }
    this.vitData.set(this.vitBase);
    this.vitTex.needsUpdate = true;
  }

  private raster(b: Bloom, radius: number, target: Uint8Array) {
    const base = this.vitBase;
    const s = VIT_N / WORLD_SIZE;
    const cx = (b.x + WORLD_HALF) * s;
    const cz = (b.z + WORLD_HALF) * s;
    const pr = radius * s;
    const x0 = Math.max(0, Math.floor(cx - pr - 1));
    const x1 = Math.min(VIT_N - 1, Math.ceil(cx + pr + 1));
    const z0 = Math.max(0, Math.floor(cz - pr - 1));
    const z1 = Math.min(VIT_N - 1, Math.ceil(cz + pr + 1));
    for (let j = z0; j <= z1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cz) / Math.max(pr, 0.001);
        const v = 1 - smoothstep(0.55, 1, d);
        const k = (j * VIT_N + i) * 4;
        const a0 = base[k + 3] / 255;
        const a = Math.max(a0, v);
        const w = clamp01(v * 0.9) * (a0 > 0.6 ? 0.5 : 1);
        target[k] = lerp(base[k], b.r, w);
        target[k + 1] = lerp(base[k + 1], b.g, w);
        target[k + 2] = lerp(base[k + 2], b.b, w);
        target[k + 3] = a * 255;
      }
    }
  }

  get blooming() {
    return this.blooms.length > 0;
  }

  update(dt: number) {
    if (!this.blooms.length) return;
    this.vitData.set(this.vitBase);
    for (let i = this.blooms.length - 1; i >= 0; i--) {
      const b = this.blooms[i];
      b.t += dt;
      const p = clamp01(b.t / b.dur);
      if (p >= 1) {
        this.raster(b, b.radius, this.vitBase);
        this.blooms.splice(i, 1);
      }
    }
    this.vitData.set(this.vitBase);
    for (const b of this.blooms) {
      // Write the in-flight bloom over a scratch copy of the settled state.
      this.raster(b, b.radius * easeOutCubic(b.t / b.dur), this.vitData);
    }
    this.vitTex.needsUpdate = true;
  }
}

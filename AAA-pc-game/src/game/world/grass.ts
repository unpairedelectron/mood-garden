// Grass and wildflowers. A fixed pool of instances wraps around the camera
// (toroidal tiling in the vertex shader), so the meadow is endless but the
// cost is constant. Height, colour and flowers all follow the vitality map.

import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { COMMON_GLSL, FLAT_NORMAL, patchMaterial, replace } from '../render/shared';

const WRAP = /* glsl */ `
  float HALF = uTile * 0.5;
  vec2 rel = mod(aOffset.xy - uCenter.xz + HALF, uTile) - HALF;
  vec2 xz = uCenter.xz + rel;
  vec4 wd = texture2D(uWorldTex, wuv(xz));
  vec3 tint;
  float vit = vitality(xz, tint);
  float edge = 1. - smoothstep(HALF * 0.72, HALF * 0.98, length(rel));
  float r1 = aOffset.z, r2 = aOffset.w;
`;

function makeBlade(): THREE.BufferGeometry {
  const rows = 4;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    pos.push(-0.5, t, 0, 0.5, t, 0);
  }
  for (let r = 0; r < rows - 1; r++) {
    const a = r * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function makeFlower(): THREE.BufferGeometry {
  // x,z in unit space; y: 0..1 stem. `uv.x` = part (0 stem, 1 petal, 2 core).
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  // stem: two crossed quads
  for (let q = 0; q < 2; q++) {
    const b = pos.length / 3;
    const dx = q === 0 ? 1 : 0;
    const dz = q === 0 ? 0 : 1;
    pos.push(-dx, 0, -dz, dx, 0, dz, -dx, 1, -dz, dx, 1, dz);
    uv.push(0, 0, 0, 0, 0, 1, 0, 1);
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  }
  // head: cupped fan of 6 petals with a notch between each
  const c = pos.length / 3;
  pos.push(0, 1, 0);
  uv.push(2, 1);
  const P = 6;
  for (let i = 0; i < P * 2; i++) {
    const a = (i / (P * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.55;
    pos.push(Math.cos(a) * r, 1.0 + (i % 2 === 0 ? 0.32 : 0.12), Math.sin(a) * r);
    uv.push(1, 1);
  }
  for (let i = 0; i < P * 2; i++) idx.push(c, c + 1 + ((i + 1) % (P * 2)), c + 1 + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function instanced(base: THREE.BufferGeometry, count: number, tile: number, seed: number) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const k in base.attributes) g.setAttribute(k, base.attributes[k]);
  // A normal attribute must exist or three switches the material to flat shading.
  const count0 = base.attributes.position.count;
  const up = new Float32Array(count0 * 3);
  for (let i = 0; i < count0; i++) up[i * 3 + 1] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(up, 3));
  const rng = mulberry32(seed);
  const off = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    off[i * 4] = rng() * tile;
    off[i * 4 + 1] = rng() * tile;
    off[i * 4 + 2] = rng();
    off[i * 4 + 3] = rng();
  }
  g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 4));
  g.instanceCount = count;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

export class Grass {
  readonly group = new THREE.Group();
  private center = { value: new THREE.Vector3() };
  private tile = { value: 90 };
  private flowerTile = { value: 80 };
  private farTile = { value: 120 };
  private meshes: THREE.Mesh[] = [];
  private nearMat: THREE.Material;
  private farMat: THREE.Material;
  private flowerMat: THREE.MeshLambertMaterial;

  constructor() {
    this.nearMat = this.makeBladeMaterial(this.tile, 1);
    this.farMat = this.makeBladeMaterial(this.farTile, 2.6);


    this.flowerMat = patchMaterial(
      new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
      'flowers',
      (s) => {
        s.vertexShader = replace(
          s.vertexShader,
          '#include <common>',
          `#include <common>
          attribute vec4 aOffset;
          uniform vec3 uCenter; uniform float uTile;
          varying vec3 vCol; varying float vGlow; varying vec3 vWP;
          ${COMMON_GLSL}`,
        );
        s.vertexShader = replace(
          s.vertexShader,
          '#include <beginnormal_vertex>',
          /* glsl */ `
          ${WRAP}
          float cluster = fbm2(xz * 0.07 + 80.);
          float keep = step(0.5, wd.g) * smoothstep(0.55, 0.9, vit) * step(0.48 + r2 * 0.2, cluster);
          keep *= smoothstep(1.2, 4.5, distance(vec3(xz.x, wd.r + 0.5, xz.y), cameraPosition));
          float part = uv.x;
          float stem = (0.45 + 0.5 * r1) * keep * edge;
          float head = (0.11 + 0.09 * r2) * keep * edge;
          float wind = windAt(xz);
          vec2 lean = vec2(0.85, 0.5) * wind * 0.22;
          vec2 away = xz - uPlayerPos.xz;
          float pd = length(away);
          lean += away / max(pd, 0.001) * (1. - smoothstep(0.35, 1.5, pd)) * 0.7;
          float ang = r1 * 31.4;
          mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
          vec3 lp = position;
          float isHead = step(0.5, part);
          float t = min(lp.y, 1.0);
          vec3 fp;
          fp.xz = rot * lp.xz * mix(0.012, head, isHead) + lean * t * t * stem;
          fp.y = t * stem + (lp.y - t) * head * 1.6;
          vec3 gpos = vec3(xz.x, wd.r, xz.y) + fp;
          vec3 objectNormal = normalize(vec3(lean.x, 1., lean.y));
          vWP = gpos;
          vec3 mood = s2l(tint);
          float hueShift = r2 - 0.5;
          vec3 petal = mix(vec3(1.0, 0.96, 0.9), mood, 0.72 + 0.28 * r1);
          petal = mix(petal, petal.gbr, clamp(hueShift * 0.35, 0., 1.) * step(0.8, r1));
          vec3 core = s2l(vec3(1.0, 0.8, 0.25));
          vec3 stemC = s2l(vec3(0.25, 0.42, 0.14));
          vCol = part < 0.5 ? stemC : (part < 1.5 ? petal : core);
          vGlow = isHead * (0.25 + 0.75 * uNight) * (0.5 + 0.5 * r1);
          `,
        );
        s.vertexShader = replace(s.vertexShader, '#include <begin_vertex>', 'vec3 transformed = gpos;');
        s.fragmentShader = replace(
          s.fragmentShader,
          '#include <common>',
          `#include <common>\nvarying vec3 vCol; varying float vGlow; varying vec3 vWP;`,
        );
        s.fragmentShader = replace(s.fragmentShader, '#include <normal_fragment_begin>', FLAT_NORMAL);
        s.fragmentShader = replace(s.fragmentShader, '#include <color_fragment>', 'diffuseColor.rgb = vCol;');
        s.fragmentShader = replace(
          s.fragmentShader,
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vCol * vGlow * 0.9;`,
        );
      },
      { uCenter: this.center, uTile: this.flowerTile },
    );
  }

  private makeBladeMaterial(tile: { value: number }, width: number) {
    return patchMaterial(
      new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
      'grass',
      (s) => {
        s.vertexShader = replace(
          s.vertexShader,
          '#include <common>',
          `#include <common>
          attribute vec4 aOffset;
          uniform vec3 uCenter; uniform float uTile; uniform float uWidth;
          varying float vT; varying vec3 vCol; varying vec3 vWP;
          ${COMMON_GLSL}`,
        );
        s.vertexShader = replace(
          s.vertexShader,
          '#include <beginnormal_vertex>',
          /* glsl */ `
          ${WRAP}
          float patchN = vnoise(xz * 0.09 + 5.);
          float keep = step(0.3 + r2 * 0.35, wd.g);
          float hgt = mix(0.2 + 0.14 * r1, 0.34 + 0.36 * r1 + 0.34 * patchN, vit) * (0.75 + 0.5 * r2) * keep * edge * (0.85 + 0.15 * uWidth);
          hgt *= smoothstep(0.9, 3.6, distance(vec3(xz.x, wd.r + 0.4, xz.y), cameraPosition));
          float ang = r1 * 6.2831;
          vec2 bdir = vec2(cos(ang), sin(ang));
          float t = position.y;
          float wScale = mix(1., uWidth, smoothstep(5., 20., length(rel)));
          float halfW = (0.016 + 0.014 * r2) * wScale * (1. - pow(t, 1.6) * 0.94) * mix(0.8, 1., vit);
          vec3 bp = vec3(bdir.x * position.x * halfW * 2., t * hgt, bdir.y * position.x * halfW * 2.);
          float wind = windAt(xz);
          vec2 lean = vec2(0.85, 0.5) * wind * 0.42 + bdir.yx * (r2 - 0.5) * 0.3;
          vec2 away = xz - uPlayerPos.xz;
          float pd = length(away);
          float push = (1. - smoothstep(0.35, 1.7, pd)) * step(abs(uPlayerPos.y - wd.r), 2.2);
          lean += away / max(pd, 0.001) * push * 1.1;
          float bend = t * t;
          bp.xz += lean * bend * hgt * 1.25;
          bp.y -= dot(lean, lean) * bend * hgt * 0.45;
          vec3 gpos = vec3(xz.x, wd.r, xz.y) + bp;
          vec3 objectNormal = normalize(vec3(lean.x * 0.6 + bdir.y * 0.18, 1., lean.y * 0.6 - bdir.x * 0.18));
          vT = t;
          vWP = gpos;
          float shade = 0.55 + 0.25 * vnoise(xz * 2.3) + 0.1 * vnoise(xz * 9.0);
          vec3 baseC = mix(grassDorm(xz), grassLush(xz, tint), vit);
          vec3 tipC = mix(baseC * 1.2, baseC * vec3(1.4, 1.32, 0.95) + s2l(vec3(0.06, 0.08, 0.0)), vit);
          tipC *= 0.85 + 0.4 * r2 + wind * 0.12;
          vCol = mix(baseC * shade, tipC, smoothstep(0.0, 0.9, t));
          `,
        );
        s.vertexShader = replace(s.vertexShader, '#include <begin_vertex>', 'vec3 transformed = gpos;');
        s.fragmentShader = replace(
          s.fragmentShader,
          '#include <common>',
          `#include <common>
          varying float vT; varying vec3 vCol; varying vec3 vWP;
          ${COMMON_GLSL}`,
        );
        s.fragmentShader = replace(s.fragmentShader, '#include <normal_fragment_begin>', FLAT_NORMAL);
        s.fragmentShader = replace(s.fragmentShader, '#include <color_fragment>', 'diffuseColor.rgb = vCol;');
        s.fragmentShader = replace(
          s.fragmentShader,
          '#include <opaque_fragment>',
          /* glsl */ `
          vec3 Vw = normalize(cameraPosition - vWP);
          float back = pow(max(dot(Vw, -uSunDir), 0.), 3.);
          outgoingLight += vCol * uSunColor * back * vT * 1.3;
          outgoingLight += uWaveColor * waveGlow(vWP) * (0.6 + vT);
          #include <opaque_fragment>`,
        );
      },
      { uCenter: this.center, uTile: tile, uWidth: { value: width } },
    );
  }

  /** (Re)build instance pools for a quality tier. */
  configure(near: number, nearTile: number, far: number, farTile: number, flowers: number) {
    for (const m of this.meshes) {
      this.group.remove(m);
      m.geometry.dispose();
    }
    this.tile.value = nearTile;
    this.farTile.value = farTile;
    this.flowerTile.value = Math.min(farTile, 84);
    // Dense fine blades close to the camera, broader sparse ones out to the horizon.
    this.meshes = [
      new THREE.Mesh(instanced(makeBlade(), near, nearTile, 11), this.nearMat),
      new THREE.Mesh(instanced(makeBlade(), far, farTile, 17), this.farMat),
      new THREE.Mesh(instanced(makeFlower(), flowers, this.flowerTile.value, 23), this.flowerMat),
    ];
    for (const m of this.meshes) {
      m.frustumCulled = false;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      this.group.add(m);
    }
  }

  update(focus: THREE.Vector3) {
    this.center.value.copy(focus);
  }
}

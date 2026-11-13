// Low-poly plant species, one per feeling, built from primitives with baked
// vertex colours so the whole garden shares a single material.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MoodId } from './moods';

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const c = new THREE.Color();
const c2 = new THREE.Color();

/** Place a primitive and paint it (optionally with a bottom-to-top gradient). */
function part(
  geo: THREE.BufferGeometry,
  color: number,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] | number = 1,
  top?: number,
): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  c.set(color);
  c2.set(top ?? color);
  for (let i = 0; i < p.count; i++) {
    const k = (p.getY(i) - bb.min.y) / Math.max(1e-5, bb.max.y - bb.min.y);
    col[i * 3] = c.r + (c2.r - c.r) * k;
    col[i * 3 + 1] = c.g + (c2.g - c.g) * k;
    col[i * 3 + 2] = c.b + (c2.b - c.b) * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
  q.setFromEuler(e.set(rot[0], rot[1], rot[2]));
  m4.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(s[0], s[1], s[2]));
  g.applyMatrix4(m4);
  return g;
}

const merge = (parts: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
};

const cyl = (rt: number, rb: number, h: number, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0);
const ico = (r: number, d = 0) => new THREE.IcosahedronGeometry(r, d);
const cone = (r: number, h: number, seg = 5) => new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0);
const STEM = 0x4f8f3c;
const LEAF = 0x6fbf4a;

function sprout() {
  return merge([
    part(cyl(0.025, 0.035, 0.22), STEM, [0, 0, 0]),
    part(ico(0.1), LEAF, [0.08, 0.24, 0], [0, 0, 0.5], [1, 0.3, 0.6], 0xa8e06a),
    part(ico(0.1), LEAF, [-0.08, 0.24, 0], [0, 0, -0.5], [1, 0.3, 0.6], 0xa8e06a),
  ]);
}

function joy() {
  const parts = [
    part(cyl(0.04, 0.06, 1.25), STEM, [0, 0, 0]),
    part(ico(0.2), LEAF, [0.2, 0.5, 0], [0, 0, 0.5], [1, 0.22, 0.55]),
    part(ico(0.2), LEAF, [-0.2, 0.75, 0.04], [0, 0.4, -0.5], [1, 0.22, 0.55]),
  ];
  const head = [part(cyl(0.2, 0.2, 0.09, 10), 0x6b3f1c, [0, -0.045, 0], [0, 0, 0], 1, 0x8a5524)];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    head.push(part(ico(0.16), 0xffb11f, [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3], [0, -a, 0], [1, 0.18, 0.42], 0xffe45c));
  }
  const h = mergeGeometries(head)!;
  h.rotateX(-1.05);
  h.translate(0, 1.3, 0.08);
  parts.push(h);
  return merge(parts);
}

function calm() {
  return merge([
    part(cyl(0.06, 0.1, 0.55), 0x6e675c, [0, 0, 0], [0, 0, 0.18]),
    part(cyl(0.045, 0.06, 0.6), 0x6e675c, [-0.1, 0.52, 0], [0, 0, -0.3]),
    part(ico(0.5, 1), 0x1c8f93, [0.1, 1.15, 0], [0, 0.3, 0], [1.1, 0.34, 1.0], 0x7ff0df),
    part(ico(0.38, 1), 0x1c8f93, [-0.32, 0.82, 0.12], [0, 1, 0], [1, 0.34, 1], 0x66dccf),
    part(ico(0.3, 1), 0x24a3a3, [0.3, 0.7, -0.18], [0, 2, 0], [1, 0.34, 1], 0x8ff5e6),
    part(ico(0.26, 1), 0x24a3a3, [0.02, 1.42, 0.05], [0, 0.6, 0], [1, 0.4, 1], 0xa5fbee),
  ]);
}

function love() {
  const parts = [
    part(cyl(0.07, 0.11, 0.6), 0x5a3b33, [0, 0, 0], [0, 0, -0.12]),
    part(cyl(0.04, 0.06, 0.4), 0x5a3b33, [0.06, 0.5, 0], [0, 0, -0.7]),
    part(cyl(0.04, 0.06, 0.4), 0x5a3b33, [0.04, 0.5, 0], [0, 0, 0.6]),
  ];
  const blobs: [number, number, number, number][] = [
    [0, 1.12, 0, 0.42], [0.34, 0.92, 0.1, 0.32], [-0.34, 0.95, -0.06, 0.34], [0.05, 0.9, 0.34, 0.28], [-0.02, 0.92, -0.34, 0.28], [0.2, 1.3, -0.1, 0.24],
  ];
  blobs.forEach(([x, y, z, r], i) => parts.push(part(ico(r, 1), i % 2 ? 0xf0508f : 0xe2488a, [x, y, z], [i, i * 2, 0], 1, 0xffd3e4)));
  return merge(parts);
}

function hope() {
  const parts = [part(cyl(0.03, 0.055, 1.5), 0x8fb86a, [0, 0, 0], [0, 0, 0], 1, 0xcfe9a0)];
  for (let i = 0; i < 5; i++) {
    const y = 0.3 + i * 0.25;
    const s = 0.24 - i * 0.025;
    const a = i * 1.9;
    for (const side of [1, -1]) {
      parts.push(part(ico(s), 0x58b02c, [Math.cos(a) * 0.17 * side, y, Math.sin(a) * 0.17 * side], [0, -a + (side < 0 ? Math.PI : 0), 0.55], [1, 0.2, 0.5], 0xdcff7a));
    }
  }
  parts.push(part(new THREE.OctahedronGeometry(0.13), 0xcfff6a, [0, 1.6, 0], [0, 0.4, 0], [1, 1.5, 1], 0xffffc8));
  return merge(parts);
}

function courage() {
  const parts: THREE.BufferGeometry[] = [part(ico(0.3, 0), 0x6a3a22, [0, 0.1, 0], [0, 0, 0], [1.2, 0.5, 1.2])];
  const spires: [number, number, number, number][] = [[0, 0, 1.5, 0.24], [0.26, 0.1, 1.05, 0.2], [-0.26, -0.08, 1.15, 0.2], [0.05, 0.28, 0.9, 0.18], [-0.08, -0.28, 0.95, 0.18], [0.3, -0.2, 0.7, 0.15]];
  spires.forEach(([x, z, h, r], i) => parts.push(part(cone(r, h, 5), 0xb3301a, [x, 0.12, z], [z * 0.5, i, -x * 0.5], 1, 0xffc24a)));
  return merge(parts);
}

function sorrow() {
  const parts = [
    part(cyl(0.06, 0.1, 0.95), 0x45424f, [0, 0, 0], [0, 0, 0.1]),
    part(ico(0.44, 1), 0x3a4fc4, [-0.08, 1.12, 0], [0, 0, 0], [1.15, 0.5, 1.15], 0x9fb6ff),
  ];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const r = 0.42 + (i % 3) * 0.05;
    const len = 0.55 + ((i * 7) % 5) * 0.09;
    const g = new THREE.ConeGeometry(0.055, len, 4).rotateX(Math.PI).translate(0, -len / 2, 0);
    parts.push(part(g, 0xa9c0ff, [-0.08 + Math.cos(a) * r, 1.08, Math.sin(a) * r], [0, 0, 0], 1, 0x4a62d8));
  }
  return merge(parts);
}

export interface PlantLibrary {
  sprout: THREE.BufferGeometry;
  species: Record<MoodId, THREE.BufferGeometry>;
  height: Record<MoodId, number>;
}

export function buildPlants(): PlantLibrary {
  return {
    sprout: sprout(),
    species: { joy: joy(), calm: calm(), love: love(), hope: hope(), courage: courage(), sorrow: sorrow() },
    height: { joy: 1.55, calm: 1.6, love: 1.5, hope: 1.75, courage: 1.6, sorrow: 1.45 },
  };
}

/** A floating hex column: grass cap, earth sides, a rocky point underneath. */
export function buildTile(seed: number): THREE.BufferGeometry {
  const rnd = (n: number) => {
    const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const drop = 1.3 + rnd(1) * 1.5;
  const parts = [
    part(new THREE.CylinderGeometry(0.97, 0.97, 0.16, 6).translate(0, -0.08, 0), 0x5fae45, [0, 0, 0], [0, 0, 0], 1, rnd(2) > 0.5 ? 0x86cf5a : 0x79c452),
    part(new THREE.CylinderGeometry(0.95, 0.8, 0.5, 6).translate(0, -0.41, 0), 0x7d6a5c, [0, 0, 0], [0, 0, 0], 1, 0x9a7656),
    part(new THREE.ConeGeometry(0.8, drop, 6).rotateX(Math.PI).translate(0, -0.66 - drop / 2, 0), 0xa39a90, [0, 0, 0], [0, 0, 0], 1, 0x7d6a5c),
  ];
  // A few tufts and pebbles so no two tiles look alike.
  for (let i = 0; i < 6; i++) {
    const a = rnd(10 + i) * Math.PI * 2;
    const r = 0.45 + rnd(20 + i) * 0.4;
    if (i < 4) parts.push(part(cone(0.05, 0.16 + rnd(30 + i) * 0.14, 4), 0x4f9a3a, [Math.cos(a) * r, 0, Math.sin(a) * r], [0, a, 0], 1, 0xa5e06c));
    else parts.push(part(ico(0.07 + rnd(40 + i) * 0.05), 0x8d8a86, [Math.cos(a) * r, 0.02, Math.sin(a) * r], [a, a, 0], [1, 0.6, 1]));
  }
  return merge(parts);
}

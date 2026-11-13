// The land: gentle rolling ground with a few places shaped into it — a hill
// with a view, a pond and a stream that runs down into it. Shared by the CPU
// (walking, placement) and the GPU (grass sits on the height texture).

import * as THREE from 'three';

export const WORLD = 256;
const N = 256;

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** The rolling land before anything is shaped into it. */
function baseHeight(x: number, z: number): number {
  let h = 0, amp = 1, f = 0.018;
  for (let o = 0; o < 4; o++) {
    h += (vnoise(x * f + 31, z * f + 17) - 0.5) * amp;
    amp *= 0.45;
    f *= 2.1;
  }
  // The clearing in the middle stays nearly level; the land rolls more toward the edges.
  const r = Math.hypot(x, z);
  return h * (1.2 + Math.min(1, r / 70) * 3.2);
}

// ------------------------------------------------------------------ places

export const HILL = { x: 40, z: -38, radius: 26, height: 10 };
export const POND = { x: -26, z: 20, rx: 11, rz: 8, depth: 1.7, level: 0 };
/** Where the stream rises (outside the clearing) and how it winds down to the pond. */
const STREAM_PTS: [number, number][] = [
  [-112, -58], [-96, -50], [-84, -34], [-70, -30], [-60, -16], [-50, -8], [-44, 4], [-36, 10], [-30, 15],
];
export const STREAM_WIDTH = 2.6;

export interface StreamPoint {
  x: number;
  z: number;
  /** Water surface height. */
  y: number;
  /** Distance from the source, metres. */
  s: number;
}
export const stream: StreamPoint[] = [];

{
  // A smooth curve through the points, sampled every metre.
  const curve = new THREE.CatmullRomCurve3(STREAM_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const len = curve.getLength();
  const n = Math.ceil(len);
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n);
    stream.push({ x: p.x, z: p.z, y: 0, s: (i / n) * len });
  }
  // The pond's surface sits a little under the lowest point of its rim.
  let rim = Infinity;
  for (let a = 0; a < 32; a++) {
    const t = (a / 32) * Math.PI * 2;
    rim = Math.min(rim, baseHeight(POND.x + Math.cos(t) * POND.rx * 1.15, POND.z + Math.sin(t) * POND.rz * 1.15));
  }
  POND.level = rim - 0.35;
  // Water only runs downhill: the surface is the lowest ground seen so far upstream.
  let lvl = Infinity;
  for (const p of stream) {
    lvl = Math.min(lvl, baseHeight(p.x, p.z) - 0.35);
    p.y = lvl;
  }
  // Ease the last stretch into the pond.
  const k0 = Math.max(0, stream.length - 12);
  for (let i = k0; i < stream.length; i++) {
    const t = (i - k0) / (stream.length - 1 - k0);
    stream[i].y = stream[i].y * (1 - t) + Math.min(stream[i].y, POND.level) * t;
  }
}

/** Nearest point on the stream: distance, surface height and distance along it. */
export function streamNearest(x: number, z: number): { d: number; y: number; s: number } {
  let best = Infinity, by = 0, bs = 0;
  for (let i = 0; i < stream.length - 1; i++) {
    const a = stream[i], b = stream[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / l2));
    const px = a.x + dx * t, pz = a.z + dz * t;
    const d = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d < best) {
      best = d;
      by = a.y + (b.y - a.y) * t;
      bs = a.s + (b.s - a.s) * t;
    }
  }
  return { d: Math.sqrt(best), y: by, s: bs };
}

/** 0 outside the pond, 1 at its middle (an ellipse with a wobbly shore). */
export function pondShape(x: number, z: number): number {
  const dx = (x - POND.x) / POND.rx, dz = (z - POND.z) / POND.rz;
  const a = Math.atan2(dz, dx);
  const wob = 1 + Math.sin(a * 3 + 1) * 0.08 + Math.sin(a * 5 + 2) * 0.05;
  const r = Math.hypot(dx, dz) / wob;
  return 1 - r;
}

/** The shaped land, computed exactly (slow); heightAt reads a cached grid. */
function shapedHeight(x: number, z: number): number {
  let h = baseHeight(x, z);
  // Hill: a broad dome with a flatter top to stand on.
  const hd = Math.hypot(x - HILL.x, z - HILL.z) / HILL.radius;
  if (hd < 1) {
    const dome = Math.pow(Math.cos(Math.min(1, hd) * Math.PI * 0.5), 1.6);
    h += HILL.height * dome * (1 - 0.15 * smooth(0.25, 0, hd));
  }
  // Stream: a channel with soft banks, its bed below the running water.
  if (Math.abs(x - -70) < 60 && Math.abs(z - -20) < 52) {
    const sn = streamNearest(x, z);
    const half = STREAM_WIDTH * 0.5;
    if (sn.d < half + 6) {
      const bed = sn.y - 0.45 * (1 - smooth(0, half, sn.d) * 0.7);
      const bank = smooth(half * 0.6, half + 5, sn.d);
      h = Math.min(h, bed * (1 - bank) + h * bank);
    }
  }
  // Pond: a basin under the water, with a shelving shore.
  const ps = pondShape(x, z);
  if (ps > -0.35) {
    const shoreH = POND.level + 0.15;
    const inner = smooth(-0.35, 0.05, ps);
    const bed = POND.level - POND.depth * smooth(0, 0.7, ps) - 0.08;
    const target = ps > 0 ? bed : shoreH;
    h = h * (1 - inner) + Math.min(h, target) * inner;
    if (ps > 0) h = Math.min(h, bed);
  }
  return h;
}

// Cached height grid for fast lookups (0.5 m spacing).
const G = 512;
const grid = new Float32Array((G + 1) * (G + 1));
for (let j = 0; j <= G; j++) {
  for (let i = 0; i <= G; i++) {
    grid[j * (G + 1) + i] = shapedHeight((i / G - 0.5) * WORLD, (j / G - 0.5) * WORLD);
  }
}

export function heightAt(x: number, z: number): number {
  const fx = Math.min(G - 1e-4, Math.max(0, (x / WORLD + 0.5) * G));
  const fz = Math.min(G - 1e-4, Math.max(0, (z / WORLD + 0.5) * G));
  const i = Math.floor(fx), j = Math.floor(fz);
  const tx = fx - i, tz = fz - j;
  const k = j * (G + 1) + i;
  const a = grid[k], b = grid[k + 1], c = grid[k + G + 1], d = grid[k + G + 2];
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}

/** Height of open water here, or null if this is dry land. */
export function waterAt(x: number, z: number): number | null {
  if (pondShape(x, z) > -0.05) return POND.level;
  if (Math.abs(x - -70) < 60 && Math.abs(z - -20) < 52) {
    const sn = streamNearest(x, z);
    if (sn.d < STREAM_WIDTH * 0.5 + 0.3) return sn.y;
  }
  return null;
}

/** How deep the water is underfoot (0 on dry land). */
export function waterDepth(x: number, z: number): number {
  const w = waterAt(x, z);
  return w === null ? 0 : Math.max(0, w - heightAt(x, z));
}

/** Half-float height map so vertex shaders can sit grass on the ground. */
export function heightTexture(): THREE.DataTexture {
  const data = new Uint16Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = ((i + 0.5) / N - 0.5) * WORLD;
      const z = ((j + 0.5) / N - 0.5) * WORLD;
      data[(j * N + i) * 4] = THREE.DataUtils.toHalfFloat(heightAt(x, z));
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export function terrainGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(WORLD, WORLD, 256, 256);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}

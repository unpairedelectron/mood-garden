// Gentle rolling ground shared by CPU (walking, placement) and GPU (grass).

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
export function heightAt(x: number, z: number): number {
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
  const g = new THREE.PlaneGeometry(WORLD, WORLD, 160, 160);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}

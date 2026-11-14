// Streams the ground around the walker as square chunks: fine (1 m) underfoot,
// coarser further off, and none beyond the fog. Chunks are built a few per
// frame so walking never stalls while new land appears.

import * as THREE from 'three';
import { LAND, chunkGeometry } from './terrain';

const SIZE = 96;

interface Chunk {
  mesh: THREE.Mesh;
  segs: number;
}

export class Land {
  readonly group = new THREE.Group();
  private chunks = new Map<string, Chunk>();
  private material: THREE.Material;
  /** How far ground is drawn (metres); set from the quality tier. */
  radius = 480;
  private wanted: { key: string; cx: number; cz: number; segs: number; d: number }[] = [];

  constructor(material: THREE.Material) {
    this.material = material;
  }

  /** Level of detail for a chunk this far away. */
  private segsAt(d: number) {
    return d < 110 ? SIZE : d < 250 ? SIZE / 4 : SIZE / 8;
  }

  /** Work out which chunks should exist; call when the walker has moved a little. */
  plan(x: number, z: number) {
    this.wanted.length = 0;
    const half = LAND / 2;
    const r = this.radius;
    const i0 = Math.floor((x - r + half) / SIZE), i1 = Math.floor((x + r + half) / SIZE);
    const j0 = Math.floor((z - r + half) / SIZE), j1 = Math.floor((z + r + half) / SIZE);
    const keep = new Set<string>();
    for (let j = Math.max(0, j0); j <= Math.min(LAND / SIZE - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(LAND / SIZE - 1, i1); i++) {
        const cx = -half + (i + 0.5) * SIZE, cz = -half + (j + 0.5) * SIZE;
        // Distance to the chunk's nearest point decides its detail.
        const dx = Math.max(0, Math.abs(cx - x) - SIZE / 2), dz = Math.max(0, Math.abs(cz - z) - SIZE / 2);
        const d = Math.hypot(dx, dz);
        if (d > r) continue;
        const key = `${i},${j}`;
        keep.add(key);
        const segs = this.segsAt(d);
        const have = this.chunks.get(key);
        if (!have || have.segs !== segs) this.wanted.push({ key, cx, cz, segs, d });
      }
    }
    for (const [key, c] of this.chunks) {
      if (!keep.has(key)) {
        this.group.remove(c.mesh);
        c.mesh.geometry.dispose();
        this.chunks.delete(key);
      }
    }
    // Nearest first, so the ground under your feet is never missing.
    this.wanted.sort((a, b) => a.d - b.d);
  }

  /** Build up to `budget` chunks now. Returns how many are still waiting. */
  build(budget: number): number {
    while (budget-- > 0 && this.wanted.length) {
      const w = this.wanted.shift()!;
      const old = this.chunks.get(w.key);
      const mesh = new THREE.Mesh(chunkGeometry(w.cx, w.cz, SIZE, w.segs), this.material);
      mesh.receiveShadow = true;
      this.group.add(mesh);
      if (old) {
        this.group.remove(old.mesh);
        old.mesh.geometry.dispose();
      }
      this.chunks.set(w.key, { mesh, segs: w.segs });
    }
    return this.wanted.length;
  }
}

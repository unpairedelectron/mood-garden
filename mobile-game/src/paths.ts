// Desire paths: wherever you walk most, the grass wears away into a trodden
// path. Wear is kept in the save as a coarse grid and fades if a route is
// left alone for a few weeks.
//
// The same texture carries water (green channel) so grass and ground can
// give way to it.

import * as THREE from 'three';
import { WORLD, pondShape, streamHalf, streamNearest } from './terrain';

/** Path grid cells across the world (2 m each). */
const P = 128;
/** Mask texture resolution (1 m texels). */
const M = 256;
/** Wear lost per real day a cell is not walked on. */
const DECAY_PER_DAY = 2.2;

export class Paths {
  readonly texture: THREE.DataTexture;
  private wear = new Uint8Array(P * P);
  private data = new Uint8Array(M * M * 4);
  private dirty = false;
  private lastStep = new THREE.Vector2(Infinity, Infinity);

  constructor() {
    // Water: ponds and the stream, softened at the edges.
    for (let j = 0; j < M; j++) {
      for (let i = 0; i < M; i++) {
        const x = ((i + 0.5) / M - 0.5) * WORLD, z = ((j + 0.5) / M - 0.5) * WORLD;
        let w = Math.min(1, Math.max(0, pondShape(x, z) * 8 + 0.4));
        if (x < -8 && x > -130 && z > -75 && z < 35) {
          const sn = streamNearest(x, z);
          w = Math.max(w, Math.min(1, Math.max(0, (streamHalf(sn.s) + 0.6 - sn.d) / 1.2)));
        }
        this.data[(j * M + i) * 4 + 1] = Math.round(w * 255);
      }
    }
    this.texture = new THREE.DataTexture(this.data, M, M, THREE.RGBAFormat);
    this.texture.magFilter = this.texture.minFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;
  }

  /** Restore saved wear and let it fade for the days since the last visit. */
  load(encoded: string | undefined, daysAway: number) {
    if (encoded) {
      try {
        const bin = atob(encoded);
        if (bin.length === P * P) for (let i = 0; i < bin.length; i++) this.wear[i] = bin.charCodeAt(i);
      } catch {
        /* corrupt: start fresh */
      }
    }
    const fade = Math.round(daysAway * DECAY_PER_DAY);
    if (fade > 0) for (let i = 0; i < this.wear.length; i++) this.wear[i] = Math.max(0, this.wear[i] - fade);
    this.paint();
  }

  encode(): string {
    let s = '';
    for (let i = 0; i < this.wear.length; i += 4096) s += String.fromCharCode(...this.wear.subarray(i, i + 4096));
    return btoa(s);
  }

  /** How worn the ground is here, 0..1. */
  at(x: number, z: number): number {
    const i = Math.floor((x / WORLD + 0.5) * P), j = Math.floor((z / WORLD + 0.5) * P);
    if (i < 0 || j < 0 || i >= P || j >= P) return 0;
    return Math.min(1, Math.max(0, (this.wear[j * P + i] - 30) / 120));
  }

  /** A footfall. Wear builds slowly, so only routes you keep taking show. */
  step(x: number, z: number) {
    if (this.lastStep.distanceTo(new THREE.Vector2(x, z)) < 0.5) return;
    this.lastStep.set(x, z);
    const fx = (x / WORLD + 0.5) * P - 0.5, fz = (z / WORLD + 0.5) * P - 0.5;
    const i0 = Math.floor(fx), j0 = Math.floor(fz);
    // Spread the step over the four nearest cells.
    for (let dj = 0; dj <= 1; dj++) {
      for (let di = 0; di <= 1; di++) {
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= P || j >= P) continue;
        const w = (di ? fx - i0 : 1 - (fx - i0)) * (dj ? fz - j0 : 1 - (fz - j0));
        const k = j * P + i;
        // Fast at first so a route shows within a week of daily walks, then saturates.
        this.wear[k] = Math.min(255, this.wear[k] + Math.round(w * 3));
      }
    }
    this.dirty = true;
  }

  /** Push wear into the mask texture (cheap; call a few times a second). */
  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    this.paint();
  }

  private paint() {
    const d = this.data;
    for (let j = 0; j < M; j++) {
      for (let i = 0; i < M; i++) {
        // Bilinear from the coarse grid so paths have soft edges.
        const fx = ((i + 0.5) / M) * P - 0.5, fz = ((j + 0.5) / M) * P - 0.5;
        const i0 = Math.max(0, Math.min(P - 2, Math.floor(fx))), j0 = Math.max(0, Math.min(P - 2, Math.floor(fz)));
        const tx = Math.min(1, Math.max(0, fx - i0)), tz = Math.min(1, Math.max(0, fz - j0));
        const a = this.wear[j0 * P + i0], b = this.wear[j0 * P + i0 + 1], c = this.wear[(j0 + 1) * P + i0], e = this.wear[(j0 + 1) * P + i0 + 1];
        const v = a + (b - a) * tx + (c - a) * tz + (a - b - c + e) * tx * tz;
        d[(j * M + i) * 4] = Math.min(255, Math.max(0, (v - 30) * 2.1));
      }
    }
    this.texture.needsUpdate = true;
  }
}

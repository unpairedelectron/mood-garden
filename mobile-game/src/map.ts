// The field map: there is no "you are here" in Mood Garden. Instead your map
// fills in only where you have walked, with the places you have found and the
// trees you have planted on it, so you learn the land by its shape: the
// stream, the hill, the ridge, your own trees.

import { speciesOf, MOOD_BY_ID } from './moods';
import type { TreeSave } from './state';
import { HILL, LAND, PLACES, POND, RIDGE, forestDensity, stream } from './terrain';

const CELL = 16;
const N = LAND / CELL;

export class Explored {
  private bits = new Uint8Array(Math.ceil((N * N) / 8));
  dirty = false;

  load(encoded?: string) {
    if (!encoded) return;
    try {
      const bin = atob(encoded);
      if (bin.length === this.bits.length) for (let i = 0; i < bin.length; i++) this.bits[i] = bin.charCodeAt(i);
    } catch {
      /* corrupt: start fresh */
    }
  }
  encode(): string {
    let s = '';
    for (let i = 0; i < this.bits.length; i += 4096) s += String.fromCharCode(...this.bits.subarray(i, i + 4096));
    return btoa(s);
  }
  private idx(i: number, j: number) {
    return j * N + i;
  }
  has(i: number, j: number) {
    if (i < 0 || j < 0 || i >= N || j >= N) return false;
    const k = this.idx(i, j);
    return (this.bits[k >> 3] & (1 << (k & 7))) !== 0;
  }
  /** Mark what you can see around you as known (about 30 m). */
  see(x: number, z: number, radius = 30) {
    const ci = (x + LAND / 2) / CELL, cj = (z + LAND / 2) / CELL;
    const r = radius / CELL;
    for (let j = Math.floor(cj - r); j <= Math.ceil(cj + r); j++) {
      for (let i = Math.floor(ci - r); i <= Math.ceil(ci + r); i++) {
        if (i < 0 || j < 0 || i >= N || j >= N) continue;
        if (Math.hypot(i + 0.5 - ci, j + 0.5 - cj) > r) continue;
        const k = this.idx(i, j);
        if (!(this.bits[k >> 3] & (1 << (k & 7)))) {
          this.bits[k >> 3] |= 1 << (k & 7);
          this.dirty = true;
        }
      }
    }
  }
  /** Bounds of everything known, in metres. */
  bounds() {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        if (!this.has(i, j)) continue;
        const x = i * CELL - LAND / 2, z = j * CELL - LAND / 2;
        x0 = Math.min(x0, x);
        z0 = Math.min(z0, z);
        x1 = Math.max(x1, x + CELL);
        z1 = Math.max(z1, z + CELL);
      }
    }
    return { x0, z0, x1, z1 };
  }
}

/**
 * Draw the land you know. Unknown land is blank paper. Returns a hit-test for
 * tapping trees. `highlight` dims trees not in the set (for the year view).
 */
export function drawFieldMap(cv: HTMLCanvasElement, trees: TreeSave[], explored: Explored, found: string[], highlight?: Set<number>) {
  const g = cv.getContext('2d')!;
  const S = cv.width;
  // Frame what you know (and every tree), with a margin; never tighter than 160 m.
  const b = explored.bounds();
  for (const t of trees) {
    b.x0 = Math.min(b.x0, t.x - 10);
    b.z0 = Math.min(b.z0, t.z - 10);
    b.x1 = Math.max(b.x1, t.x + 10);
    b.z1 = Math.max(b.z1, t.z + 10);
  }
  if (!isFinite(b.x0)) Object.assign(b, { x0: -80, z0: -80, x1: 80, z1: 80 });
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const span = Math.max(160, b.x1 - b.x0, b.z1 - b.z0) * 1.12;
  const k = S / span;
  const px = (x: number) => S / 2 + (x - cx) * k;
  const pz = (z: number) => S / 2 + (z - cz) * k;

  // Paper.
  g.fillStyle = '#e9e1cf';
  g.fillRect(0, 0, S, S);
  // Known land, shaded by how wooded it is.
  const img = g.getImageData(0, 0, S, S);
  const step = 2;
  for (let y = 0; y < S; y += step) {
    for (let x = 0; x < S; x += step) {
      const wx = cx + (x - S / 2) / k, wz = cz + (y - S / 2) / k;
      const i = Math.floor((wx + LAND / 2) / CELL), j = Math.floor((wz + LAND / 2) / CELL);
      if (!explored.has(i, j)) continue;
      const d = forestDensity(wx, wz);
      const r = 205 - d * 95, gg = 205 - d * 65, bb = 160 - d * 75;
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          const o = ((y + dy) * S + x + dx) * 4;
          img.data[o] = r;
          img.data[o + 1] = gg;
          img.data[o + 2] = bb;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  const known = (x: number, z: number) => explored.has(Math.floor((x + LAND / 2) / CELL), Math.floor((z + LAND / 2) / CELL));
  // Water, drawn where you have seen it.
  g.strokeStyle = 'rgba(70,120,160,0.85)';
  g.lineWidth = Math.max(2, 2.6 * k);
  g.beginPath();
  let pen = false;
  for (const p of stream) {
    if (!known(p.x, p.z)) {
      pen = false;
      continue;
    }
    if (pen) g.lineTo(px(p.x), pz(p.z));
    else g.moveTo(px(p.x), pz(p.z));
    pen = true;
  }
  g.stroke();
  if (known(POND.x, POND.z)) {
    g.fillStyle = 'rgba(80,130,170,0.85)';
    g.beginPath();
    g.ellipse(px(POND.x), pz(POND.z), POND.rx * k, POND.rz * k, 0, 0, 7);
    g.fill();
  }
  // High ground as hatched contours.
  g.strokeStyle = 'rgba(110,80,50,0.35)';
  g.lineWidth = 1;
  if (known(HILL.x, HILL.z)) for (const f of [0.4, 0.7, 0.95]) {
    g.beginPath();
    g.arc(px(HILL.x), pz(HILL.z), HILL.radius * f * k, 0, 7);
    g.stroke();
  }
  if (known(RIDGE.x, RIDGE.z)) for (const f of [0.35, 0.65, 0.95]) {
    g.beginPath();
    g.ellipse(px(RIDGE.x), pz(RIDGE.z), (RIDGE.width / 2) * f * k, (RIDGE.length / 2) * f * k, 0, 0, 7);
    g.stroke();
  }
  // Your trees.
  const hits: { t: TreeSave; x: number; y: number }[] = [];
  for (const t of trees) {
    const x = px(t.x), y = pz(t.z);
    const r = Math.max(2.5, (0.6 + Math.min(1, t.growth) * speciesOf(t).height * 0.08) * k * 3);
    g.beginPath();
    g.arc(x, y, Math.min(r, 9), 0, 7);
    g.fillStyle = MOOD_BY_ID[t.mood].css;
    g.globalAlpha = highlight && highlight.size && !highlight.has(t.id) ? 0.35 : 1;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(40,30,20,0.6)';
    g.lineWidth = 1;
    g.stroke();
    hits.push({ t, x, y });
  }
  // The places you have found, by name.
  g.fillStyle = '#3d2f22';
  g.textAlign = 'center';
  g.font = `italic ${Math.round(S / 30)}px "Cormorant Garamond", Georgia, serif`;
  for (const p of PLACES) {
    if (!found.includes(p.id)) continue;
    g.fillText(p.name, px(p.x), pz(p.z) - 8);
    g.beginPath();
    g.arc(px(p.x), pz(p.z), 3, 0, 7);
    g.fill();
  }
  // Home.
  g.font = `${Math.round(S / 36)}px "Inter Variable", system-ui, sans-serif`;
  g.fillText('home', px(0), pz(4) + 4);
  return (x: number, y: number): TreeSave | null => {
    let best: TreeSave | null = null, bd = 22 * (S / 640) * 1.4;
    for (const h of hits) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < bd) {
        bd = d;
        best = h.t;
      }
    }
    return best;
  };
}

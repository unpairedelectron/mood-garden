// Save data and the small economy that drives the garden.

import type { MoodId } from './moods';

export interface PlantSave {
  mood: MoodId;
  note: string;
  planted: number;
  /** 0 = seed, 1 = fully grown. */
  growth: number;
  /** Light waiting to be collected. */
  motes: number;
  moteClock: number;
}
export interface TileSave {
  q: number;
  r: number;
  plant?: PlantSave;
}
export interface Save {
  v: 1;
  light: number;
  tiles: TileSave[];
  lastSeen: number;
  matured: number;
  sound: boolean;
  coach: number;
  rainbow: boolean;
}

const KEY = 'moodgarden.pocket.v1';
export const MAX_RADIUS = 3;
export const GROW_SECONDS = 80;
export const MOTE_SECONDS = 13;
export const MOTE_CAP = 3;
export const WATER_BOOST = 3.2;
export const WATER_SECONDS = 14;
export const WATER_COOLDOWN = 22;

export const HEX_DIRS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const hexDist = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
export const key = (q: number, r: number) => `${q},${r}`;

/** Light needed to raise the next tile. */
export function tileCost(count: number) {
  const n = Math.max(0, count - 7);
  return Math.round(5 + 2.5 * n + 0.22 * n * n);
}

export function freshSave(): Save {
  const tiles: TileSave[] = [{ q: 0, r: 0 }];
  for (const [q, r] of HEX_DIRS) tiles.push({ q, r });
  return { v: 1, light: 0, tiles, lastSeen: Date.now(), matured: 0, sound: true, coach: 0, rainbow: false };
}

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Save;
      if (s.v === 1 && Array.isArray(s.tiles) && s.tiles.length) return s;
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return freshSave();
}

export function writeSave(s: Save) {
  s.lastSeen = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/** The garden keeps growing while the app is closed (up to 12 hours). */
export function applyAway(s: Save): number {
  const away = Math.min(12 * 3600, Math.max(0, (Date.now() - s.lastSeen) / 1000));
  let gathered = 0;
  for (const t of s.tiles) {
    const p = t.plant;
    if (!p) continue;
    const toMature = (1 - p.growth) * GROW_SECONDS;
    if (away >= toMature) {
      if (p.growth < 1) s.matured++;
      p.growth = 1;
      const made = Math.min(MOTE_CAP - p.motes, Math.floor((away - toMature + p.moteClock) / MOTE_SECONDS));
      if (made > 0) {
        p.motes += made;
        gathered += made;
      }
    } else {
      p.growth += away / GROW_SECONDS;
    }
  }
  return gathered;
}

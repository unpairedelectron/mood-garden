// Save data for the grove.

import type { MoodId } from './moods';

export interface TreeSave {
  id: number;
  mood: MoodId;
  note: string;
  planted: number;
  x: number;
  z: number;
  rot: number;
  /** 0 = just planted, 1 = full grown. */
  growth: number;
  /** Wild trees only: size relative to a typical tree (old giants are 2×+). */
  size?: number;
  /** Wild trees only: cached ground height. */
  y?: number;
}
export interface Save {
  v: 2;
  trees: TreeSave[];
  nextId: number;
  px: number;
  pz: number;
  yaw: number;
  lastSeen: number;
  sound: boolean;
  /** Creatures the player has already been told about. */
  met: string[];
  tutorial: number;
  /** Desire-path wear, base64 (see paths.ts). */
  paths?: string;
  /** Calendar day (see clock.dayNumber) of the last planting: one feeling, one tree a day. */
  lastPlantDay?: number;
  /** Calendar days the grove was opened, newest last (kept for a couple of years). */
  visits?: number[];
  /** Anniversary days already pointed out, so each is only offered once. */
  remembered?: number[];
  /** Daily reminder hour (local), or null for none. */
  remindAt?: number | null;
}

const KEY = 'moodgarden.grove.v1';
/** Seconds of play (or away time) for a tree to reach full size. */
export const GROW_SECONDS = 300;
export const GARDEN_RADIUS = 56;
/** Room for more than a year of one-tree-a-day. */
export const MAX_TREES = 420;

export function freshSave(): Save {
  return { v: 2, trees: [], nextId: 1, px: 0, pz: 6, yaw: Math.PI, lastSeen: Date.now(), sound: true, met: [], tutorial: 0 };
}
export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Save;
      if (s.v === 2 && Array.isArray(s.trees)) return s;
    }
  } catch {
    /* storage unavailable or corrupt */
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
/** Trees keep growing while the app is closed (capped at a day). Returns how many matured. */
export function applyAway(s: Save): number {
  const away = Math.min(24 * 3600, Math.max(0, (Date.now() - s.lastSeen) / 1000));
  let grown = 0;
  for (const t of s.trees) {
    const before = t.growth;
    t.growth = Math.min(1, t.growth + away / GROW_SECONDS);
    if (before < 1 && t.growth >= 1) grown++;
  }
  return grown;
}

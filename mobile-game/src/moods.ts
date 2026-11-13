export type MoodId = 'joy' | 'calm' | 'love' | 'hope' | 'courage' | 'sorrow';

export interface MoodDef {
  id: MoodId;
  name: string;
  css: string;
  feeling: string;
  /** The tree this feeling grows into. */
  tree: string;
  /** Baked impostor asset (see tools/bake.ts). */
  asset: string;
  /** Full-grown height in metres. */
  height: number;
  flowering: boolean;
  conifer: boolean;
}

export const MOODS: MoodDef[] = [
  { id: 'joy', name: 'Joy', css: '#ffc533', feeling: 'Bright, playful, glad', tree: 'Broadleaf', asset: 'island_tree_02', height: 11, flowering: false, conifer: false },
  { id: 'calm', name: 'Calm', css: '#3fd6c8', feeling: 'Settled, quiet, at ease', tree: 'Shade tree', asset: 'tree_small_02', height: 8, flowering: false, conifer: false },
  { id: 'love', name: 'Love', css: '#ff5c9a', feeling: 'Warm, close, grateful', tree: 'Jacaranda', asset: 'jacaranda_tree', height: 10, flowering: true, conifer: false },
  { id: 'hope', name: 'Hope', css: '#9be84a', feeling: 'Looking ahead, opening up', tree: 'Young fir', asset: 'fir_sapling', height: 3.2, flowering: false, conifer: true },
  { id: 'courage', name: 'Courage', css: '#ff7a2e', feeling: 'Steady, determined, bold', tree: 'Quiver tree', asset: 'quiver_tree_02', height: 5.5, flowering: false, conifer: false },
  { id: 'sorrow', name: 'Sorrow', css: '#6f86ff', feeling: 'Heavy, tender, missing something', tree: 'Evergreen thicket', asset: 'searsia_lucida', height: 4.5, flowering: true, conifer: false },
];

export const MOOD_BY_ID = Object.fromEntries(MOODS.map((m) => [m.id, m])) as Record<MoodId, MoodDef>;

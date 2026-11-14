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
  /** Drops its leaves in winter and turns in autumn. */
  deciduous: boolean;
  /** Autumn leaf colour (linear RGB multipliers on leaf luminance). */
  autumn: [number, number, number];
  /** Blossom colour in its flowering season, if any. */
  blossom: [number, number, number] | null;
}

export const MOODS: MoodDef[] = [
  { id: 'joy', name: 'Joy', css: '#ffc533', feeling: 'Bright, playful, glad', tree: 'Broadleaf', asset: 'island_tree_02', height: 11, flowering: false, conifer: false, deciduous: true, autumn: [1.9, 1.15, 0.22], blossom: null },
  { id: 'calm', name: 'Calm', css: '#3fd6c8', feeling: 'Settled, quiet, at ease', tree: 'Shade tree', asset: 'tree_small_02', height: 8, flowering: false, conifer: false, deciduous: true, autumn: [2.1, 0.62, 0.18], blossom: null },
  { id: 'love', name: 'Love', css: '#ff5c9a', feeling: 'Warm, close, grateful', tree: 'Jacaranda', asset: 'jacaranda_tree', height: 10, flowering: true, conifer: false, deciduous: true, autumn: [1.7, 1.3, 0.3], blossom: [0.95, 0.55, 1.6] },
  { id: 'hope', name: 'Hope', css: '#9be84a', feeling: 'Looking ahead, opening up', tree: 'Young fir', asset: 'fir_sapling', height: 3.2, flowering: false, conifer: true, deciduous: false, autumn: [1, 1, 1], blossom: null },
  { id: 'courage', name: 'Courage', css: '#ff7a2e', feeling: 'Steady, determined, bold', tree: 'Quiver tree', asset: 'quiver_tree_02', height: 5.5, flowering: false, conifer: false, deciduous: false, autumn: [1, 1, 1], blossom: [2.2, 0.9, 0.25] },
  { id: 'sorrow', name: 'Sorrow', css: '#6f86ff', feeling: 'Heavy, tender, missing something', tree: 'Evergreen thicket', asset: 'searsia_lucida', height: 4.5, flowering: true, conifer: false, deciduous: false, autumn: [1.3, 0.9, 0.5], blossom: [1.6, 1.6, 1.5] },
];

export const MOOD_BY_ID = Object.fromEntries(MOODS.map((m) => [m.id, m])) as Record<MoodId, MoodDef>;

/**
 * A kind of tree. Each feeling has its own tree, and seeds found out in the
 * land unlock a second kind for one feeling, which you can then choose to
 * plant instead.
 */
export interface SpeciesDef extends Omit<MoodDef, 'id' | 'name' | 'css' | 'feeling'> {
  /** Species id: the feeling's id for its own tree, otherwise the seed's id. */
  id: string;
  /** The feeling this tree expresses. */
  mood: MoodId;
  /** For trees grown from a found seed. */
  seed?: { place: string; name: string; line: string };
}

const own: SpeciesDef[] = MOODS.map(({ id, tree, asset, height, flowering, conifer, deciduous, autumn, blossom }) => ({ id, mood: id, tree, asset, height, flowering, conifer, deciduous, autumn, blossom }));

/** Trees grown from seeds found at the land's places (assets baked from Poly Haven scans). */
export const SEED_SPECIES: SpeciesDef[] = [
  {
    id: 'pine', mood: 'hope', tree: 'Young pine', asset: 'pine_sapling_small', height: 3.6, flowering: false, conifer: true, deciduous: false, autumn: [1, 1, 1], blossom: null,
    seed: { place: 'falls', name: 'A pine cone', line: 'Wedged in the rocks beside the falls.' },
  },
  {
    id: 'islandtree', mood: 'calm', tree: 'Island tree', asset: 'island_tree_01', height: 9.5, flowering: false, conifer: false, deciduous: true, autumn: [2, 1.05, 0.3], blossom: null,
    seed: { place: 'oldone', name: 'A seed from the Old One', line: 'Fallen from far above, still in its husk.' },
  },
  {
    id: 'karee', mood: 'sorrow', tree: 'Mountain karee', asset: 'searsia_burchellii', height: 4.8, flowering: false, conifer: false, deciduous: false, autumn: [1.25, 0.95, 0.55], blossom: null,
    seed: { place: 'ruin', name: 'Karee seeds', line: 'Gathered in a crack of the old hearth stone.' },
  },
  {
    id: 'othonna', mood: 'joy', tree: 'Othonna', asset: 'othonna_cerarioides', height: 2.6, flowering: true, conifer: false, deciduous: false, autumn: [1, 1, 1], blossom: [2.4, 1.9, 0.3],
    seed: { place: 'meadow', name: 'A seed head', line: 'Dry and light, from the far side of the meadow.' },
  },
  {
    id: 'oldquiver', mood: 'courage', tree: 'Old quiver tree', asset: 'quiver_tree_01', height: 6.5, flowering: false, conifer: false, deciduous: false, autumn: [1, 1, 1], blossom: [2.2, 0.9, 0.25],
    seed: { place: 'ridge', name: 'A quiver tree pod', line: 'Blown up onto the ridge, by the stone seat.' },
  },
];

export const SPECIES: SpeciesDef[] = [...own, ...SEED_SPECIES];
export const SPECIES_BY_ID: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

/** The kind of tree this is (its feeling's own tree unless grown from a seed). */
export function speciesOf(t: { mood: MoodId; kind?: string }): SpeciesDef {
  return SPECIES_BY_ID[t.kind ?? t.mood] ?? SPECIES_BY_ID[t.mood];
}

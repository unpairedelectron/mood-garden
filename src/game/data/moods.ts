// The six feelings the island is built from. Each owns a grove, a great tree,
// a region of the map and a voice in the adaptive score.

export type MoodId = 'joy' | 'calm' | 'love' | 'hope' | 'courage' | 'sorrow';

export interface MoodDef {
  id: MoodId;
  name: string;
  /** Saturated signature colour (sRGB hex). */
  color: number;
  /** Lighter companion used for glows and UI. */
  soft: number;
  css: string;
  region: string;
  tree: string;
  /** Shown when the grove awakens. */
  verse: string;
  /** Prompt in the feeling wheel. */
  feeling: string;
  /** Grove position on the island (x, z). */
  pos: [number, number];
}

export const MOODS: MoodDef[] = [
  {
    id: 'joy',
    name: 'Joy',
    color: 0xffc533,
    soft: 0xffe9a3,
    css: '#ffc533',
    region: 'The Golden Meadow',
    tree: 'Sunburst Tree',
    verse: 'Light does not ask permission to arrive.',
    feeling: 'Bright, playful, glad',
    pos: [-72, 78],
  },
  {
    id: 'calm',
    name: 'Calm',
    color: 0x3fd6c8,
    soft: 0xb5f4ee,
    css: '#3fd6c8',
    region: 'Stillwater Lagoon',
    tree: 'Stillwater Tree',
    verse: 'The water holds the sky without gripping it.',
    feeling: 'Settled, quiet, at ease',
    pos: [84, 28],
  },
  {
    id: 'love',
    name: 'Love',
    color: 0xff5c9a,
    soft: 0xffc2da,
    css: '#ff5c9a',
    region: 'The Blossom Wood',
    tree: 'Heartblossom',
    verse: 'What you tend, tends you in return.',
    feeling: 'Warm, close, grateful',
    pos: [-108, -18],
  },
  {
    id: 'hope',
    name: 'Hope',
    color: 0x9be84a,
    soft: 0xdcf8b4,
    css: '#9be84a',
    region: 'Dawnwatch Cliff',
    tree: 'Dawn Spire',
    verse: 'Every seed is a small argument for tomorrow.',
    feeling: 'Looking ahead, opening up',
    pos: [74, -84],
  },
  {
    id: 'courage',
    name: 'Courage',
    color: 0xff7a2e,
    soft: 0xffc79f,
    css: '#ff7a2e',
    region: 'The Ember Heights',
    tree: 'Ember Oak',
    verse: 'Roots grow deepest where the wind is strongest.',
    feeling: 'Steady, determined, bold',
    pos: [-24, -112],
  },
  {
    id: 'sorrow',
    name: 'Sorrow',
    color: 0x6f86ff,
    soft: 0xc3ccff,
    css: '#6f86ff',
    region: 'The Weeping Hollow',
    tree: 'Rain Willow',
    verse: 'Rain is not the garden’s enemy. It is how the garden drinks.',
    feeling: 'Heavy, tender, missing something',
    pos: [58, 108],
  },
];

export const MOOD_BY_ID: Record<MoodId, MoodDef> = Object.fromEntries(
  MOODS.map((m) => [m.id, m]),
) as Record<MoodId, MoodDef>;

export const MOOD_INDEX: Record<MoodId, number> = Object.fromEntries(
  MOODS.map((m, i) => [m.id, i]),
) as Record<MoodId, number>;

export const MOTES_PER_GROVE = 5;

/** World-space constants shared by CPU and GPU code. */
export const WORLD_SIZE = 512;
export const WORLD_HALF = WORLD_SIZE / 2;
export const HEART_POS: [number, number] = [0, 0];
export const START_POS: [number, number] = [6, 168];

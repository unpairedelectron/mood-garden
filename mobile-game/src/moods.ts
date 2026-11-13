export type MoodId = 'joy' | 'calm' | 'love' | 'hope' | 'courage' | 'sorrow';

export interface MoodDef {
  id: MoodId;
  name: string;
  color: number;
  soft: number;
  css: string;
  plant: string;
  feeling: string;
}

export const MOODS: MoodDef[] = [
  { id: 'joy', name: 'Joy', color: 0xffc533, soft: 0xffe9a3, css: '#ffc533', plant: 'Sunburst', feeling: 'Bright, playful, glad' },
  { id: 'calm', name: 'Calm', color: 0x3fd6c8, soft: 0xb5f4ee, css: '#3fd6c8', plant: 'Stillwater Pine', feeling: 'Settled, quiet, at ease' },
  { id: 'love', name: 'Love', color: 0xff5c9a, soft: 0xffc2da, css: '#ff5c9a', plant: 'Heartblossom', feeling: 'Warm, close, grateful' },
  { id: 'hope', name: 'Hope', color: 0x9be84a, soft: 0xdcf8b4, css: '#9be84a', plant: 'Dawn Sprig', feeling: 'Looking ahead, opening up' },
  { id: 'courage', name: 'Courage', color: 0xff7a2e, soft: 0xffc79f, css: '#ff7a2e', plant: 'Emberthorn', feeling: 'Steady, determined, bold' },
  { id: 'sorrow', name: 'Sorrow', color: 0x6f86ff, soft: 0xc3ccff, css: '#6f86ff', plant: 'Rain Willow', feeling: 'Heavy, tender, missing something' },
];

export const MOOD_BY_ID = Object.fromEntries(MOODS.map((m) => [m.id, m])) as Record<MoodId, MoodDef>;

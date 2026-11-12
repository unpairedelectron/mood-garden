// Every feeling grows something. Even the hard ones.
// Feelings map to species; mixing two feelings in one day can grow a rare hybrid.

export type FeelingId =
  | 'joyful' | 'grateful' | 'calm' | 'excited' | 'loved' | 'proud'
  | 'tired' | 'sad' | 'anxious' | 'angry' | 'lonely' | 'overwhelmed';

export interface Feeling {
  id: FeelingId;
  label: string;
  emoji: string;
  color: string;
  /** -1 (heavy) .. +1 (light). Used for garden weather, never for judgement. */
  valence: number;
  species: string; // species id
  /** A short, warm line shown after planting. */
  whisper: string;
}

export type Rarity = 'common' | 'rare' | 'legendary';

export interface Species {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  color: string;
  lore: string;
  /** How to discover it (shown for undiscovered rares as a hint). */
  hint: string;
}

export const FEELINGS: Feeling[] = [
  { id: 'joyful', label: 'Joyful', emoji: '😄', color: '#FFD23F', valence: 1, species: 'sunburst', whisper: 'Joy planted. It will turn toward the light, just like you did today.' },
  { id: 'grateful', label: 'Grateful', emoji: '🙏', color: '#9BE564', valence: 0.9, species: 'tulip', whisper: 'Gratitude roots deep. This one will come back every spring.' },
  { id: 'calm', label: 'Calm', emoji: '😌', color: '#7FD1E8', valence: 0.7, species: 'lotus', whisper: 'Still water, steady bloom. Nice to sit here a moment.' },
  { id: 'excited', label: 'Excited', emoji: '🤩', color: '#FF8C42', valence: 0.9, species: 'poppy', whisper: 'Something fizzing in the soil! This one grows fast.' },
  { id: 'loved', label: 'Loved', emoji: '🥰', color: '#FF6B9A', valence: 1, species: 'rose', whisper: 'Being loved is good fertiliser. Look at those petals.' },
  { id: 'proud', label: 'Proud', emoji: '😎', color: '#F9A825', valence: 0.8, species: 'sunflower', whisper: 'Stand tall, little sunflower. You earned this one.' },
  { id: 'tired', label: 'Tired', emoji: '🥱', color: '#B8A1D9', valence: -0.3, species: 'mushroom', whisper: 'Dream caps grow best while you rest. Go easy tonight.' },
  { id: 'sad', label: 'Sad', emoji: '😢', color: '#6C9BD2', valence: -0.8, species: 'raindrop', whisper: 'Rain lilies only grow from rain. Your sadness made something rare-looking.' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', color: '#A0C4B8', valence: -0.6, species: 'fern', whisper: 'Whisper ferns curl tight, then slowly open. No rush.' },
  { id: 'angry', label: 'Angry', emoji: '😤', color: '#E4572E', valence: -0.7, species: 'cactus', whisper: 'Ember cactus: spiky, tough, and secretly flowering. Fair enough.' },
  { id: 'lonely', label: 'Lonely', emoji: '🥺', color: '#8E7DBE', valence: -0.7, species: 'orchid', whisper: 'Moon orchids bloom alone at night, and they are stunning. You are not forgotten.' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '🤯', color: '#5E8C61', valence: -0.8, species: 'bamboo', whisper: 'Storm bamboo bends so it never breaks. One small thing at a time.' },
];

export const SPECIES: Species[] = [
  // Commons: one per feeling
  { id: 'sunburst', name: 'Sunburst Daisy', emoji: '🌼', rarity: 'common', color: '#FFD23F', lore: 'Opens a little wider every time someone laughs nearby.', hint: 'Feel joyful' },
  { id: 'tulip', name: 'Thankful Tulip', emoji: '🌷', rarity: 'common', color: '#9BE564', lore: 'Bows slightly to whoever waters it. Very polite.', hint: 'Feel grateful' },
  { id: 'lotus', name: 'Still Lotus', emoji: '🪷', rarity: 'common', color: '#7FD1E8', lore: 'Floats on a pond that only appears when you breathe slowly.', hint: 'Feel calm' },
  { id: 'poppy', name: 'Firework Poppy', emoji: '🌺', rarity: 'common', color: '#FF8C42', lore: 'Has been known to pop. Mostly harmless.', hint: 'Feel excited' },
  { id: 'rose', name: 'Heart Rose', emoji: '🌹', rarity: 'common', color: '#FF6B9A', lore: 'Thorns are just for show. It is a big softie.', hint: 'Feel loved' },
  { id: 'sunflower', name: 'Crown Sunflower', emoji: '🌻', rarity: 'common', color: '#F9A825', lore: 'Always faces whoever planted it.', hint: 'Feel proud' },
  { id: 'mushroom', name: 'Dream Cap', emoji: '🍄', rarity: 'common', color: '#B8A1D9', lore: 'Glows faintly at night. Snores, allegedly.', hint: 'Feel tired' },
  { id: 'raindrop', name: 'Rain Lily', emoji: '🪻', rarity: 'common', color: '#6C9BD2', lore: 'Only sprouts after rain. The deepest blue in the garden.', hint: 'Feel sad' },
  { id: 'fern', name: 'Whisper Fern', emoji: '🌿', rarity: 'common', color: '#A0C4B8', lore: 'Unfurls one frond per deep breath.', hint: 'Feel anxious' },
  { id: 'cactus', name: 'Ember Cactus', emoji: '🌵', rarity: 'common', color: '#E4572E', lore: 'Warm to the touch. Blooms red once a year, out of spite.', hint: 'Feel angry' },
  { id: 'orchid', name: 'Moon Orchid', emoji: '🌸', rarity: 'common', color: '#8E7DBE', lore: 'Blooms in moonlight and smells like a letter from an old friend.', hint: 'Feel lonely' },
  { id: 'bamboo', name: 'Storm Bamboo', emoji: '🎋', rarity: 'common', color: '#5E8C61', lore: 'Bends in every storm. Has never once snapped.', hint: 'Feel overwhelmed' },

  // Rares: hybrids from mixed feelings
  { id: 'clover', name: 'Eye-of-Storm Clover', emoji: '🍀', rarity: 'rare', color: '#3FA34D', lore: 'Four leaves: worry, breath, pause, okay.', hint: 'Anxious + Calm' },
  { id: 'bouquet', name: 'Bittersweet Bouquet', emoji: '💐', rarity: 'rare', color: '#D98BB0', lore: 'Grows where missing something and being thankful for it overlap.', hint: 'Sad + Grateful' },
  { id: 'maple', name: 'Cooling Maple', emoji: '🍁', rarity: 'rare', color: '#D35400', lore: 'Red leaves that slowly turn gold as the heat leaves.', hint: 'Angry + Calm' },
  { id: 'twin', name: 'Twin Oak', emoji: '🌳', rarity: 'rare', color: '#2E7D32', lore: 'Two trunks, one canopy. Proof you were never fully alone.', hint: 'Lonely + Loved' },
  { id: 'wheat', name: 'Harvest Wheat', emoji: '🌾', rarity: 'rare', color: '#E1B12C', lore: 'Tired from the work. Proud of the field.', hint: 'Tired + Proud' },
  { id: 'pine', name: 'Ancient Pine', emoji: '🌲', rarity: 'rare', color: '#1B5E20', lore: 'Has stood through a thousand overwhelming winters, calmly.', hint: 'Overwhelmed + Calm' },
  { id: 'palm', name: 'Flutter Palm', emoji: '🌴', rarity: 'rare', color: '#26A69A', lore: 'Butterflies in the stomach, butterflies in the leaves.', hint: 'Excited + Anxious' },
  { id: 'coral', name: 'Rainbow Coral', emoji: '🪸', rarity: 'rare', color: '#FF7F7F', lore: 'Happens when sun and rain arrive on the same day.', hint: 'Joyful + Sad' },
  { id: 'potted', name: 'Homebody Fig', emoji: '🪴', rarity: 'rare', color: '#6D8B3A', lore: 'Prefers blankets, tea, and people who get it.', hint: 'Tired + Loved' },
  { id: 'leafy', name: 'Second-Wind Ivy', emoji: '🍃', rarity: 'rare', color: '#7CB342', lore: 'Climbs anything. Especially bad days.', hint: 'Overwhelmed + Proud' },

  // Legendaries: milestones
  { id: 'starlight', name: 'Starlight Tree', emoji: '🎄', rarity: 'legendary', color: '#FFE066', lore: 'Strung with tiny lights, one for each day you showed up.', hint: 'Check in 7 days in a row' },
  { id: 'evergreen', name: 'Elder Evergreen', emoji: '🏔️', rarity: 'legendary', color: '#90A4AE', lore: 'A whole mountain grew in your garden. It took 30 feelings.', hint: 'Plant 30 seeds' },
  { id: 'moonbloom', name: 'Moonbloom', emoji: '🌙', rarity: 'legendary', color: '#C5CAE9', lore: 'Only planted by night owls who still checked in.', hint: 'Check in after 10pm' },
  { id: 'rainbow', name: 'Rainbow Willow', emoji: '🌈', rarity: 'legendary', color: '#FF9AA2', lore: 'Needs every kind of weather to exist.', hint: 'Feel all 12 feelings' },
];

export const HYBRIDS: Array<{ a: FeelingId; b: FeelingId; species: string }> = [
  { a: 'anxious', b: 'calm', species: 'clover' },
  { a: 'sad', b: 'grateful', species: 'bouquet' },
  { a: 'angry', b: 'calm', species: 'maple' },
  { a: 'lonely', b: 'loved', species: 'twin' },
  { a: 'tired', b: 'proud', species: 'wheat' },
  { a: 'overwhelmed', b: 'calm', species: 'pine' },
  { a: 'excited', b: 'anxious', species: 'palm' },
  { a: 'joyful', b: 'sad', species: 'coral' },
  { a: 'tired', b: 'loved', species: 'potted' },
  { a: 'overwhelmed', b: 'proud', species: 'leafy' },
];

export const feelingById = (id: FeelingId) => FEELINGS.find(f => f.id === id)!;
export const speciesById = (id: string) => SPECIES.find(s => s.id === id)!;

export function hybridFor(feelings: FeelingId[]): string | null {
  for (const h of HYBRIDS) {
    if (feelings.includes(h.a) && feelings.includes(h.b)) return h.species;
  }
  return null;
}

export interface Decoration {
  id: string;
  name: string;
  emoji: string;
  cost: number; // dew drops
  plus?: boolean; // Garden+ only
}

export const DECORATIONS: Decoration[] = [
  { id: 'stone', name: 'Wishing Stone', emoji: '🪨', cost: 20 },
  { id: 'bench', name: 'Sitting Bench', emoji: '🪑', cost: 40 },
  { id: 'lantern', name: 'Paper Lantern', emoji: '🏮', cost: 60 },
  { id: 'pond', name: 'Tiny Fountain', emoji: '⛲', cost: 90 },
  { id: 'house', name: 'Cozy Cottage', emoji: '🏡', cost: 150 },
  { id: 'gnome', name: 'Frog Friend', emoji: '🐸', cost: 50 },
  { id: 'teapot', name: 'Tea Corner', emoji: '🫖', cost: 70, plus: true },
  { id: 'tent', name: 'Stargazing Tent', emoji: '⛺', cost: 120, plus: true },
  { id: 'torii', name: 'Garden Gate', emoji: '⛩️', cost: 180, plus: true },
  { id: 'castle', name: 'Daydream Castle', emoji: '🏰', cost: 300, plus: true },
];

export interface Biome {
  id: string;
  name: string;
  ground: [string, string];
  plus?: boolean;
}

export const BIOMES: Biome[] = [
  { id: 'meadow', name: 'Meadow', ground: ['#A8E063', '#56AB2F'] },
  { id: 'sakura', name: 'Sakura Hill', ground: ['#FBD3E9', '#E8A0BF'], plus: true },
  { id: 'desert', name: 'Desert Bloom', ground: ['#F6D186', '#E2A963'], plus: true },
  { id: 'moon', name: 'Moon Garden', ground: ['#6A67CE', '#2E2A6E'], plus: true },
];

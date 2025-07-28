export interface MoodEntry {
  id: string;
  userId: string;
  text?: string;
  emoji?: string;
  audioUrl?: string;
  imageUrl?: string;
  sentiment: string;
  confidence: number;
  timestamp: Date;
  context?: string;
}

export interface Plant {
  id: string;
  type: string;
  moodType: string;
  position: { x: number; y: number };
  stage: 'seed' | 'sprout' | 'growing' | 'blooming' | 'mature';
  plantedAt: Date;
  lore: string;
}

export interface Pet {
  id: string;
  type: 'butterfly' | 'firefly' | 'bird' | 'bee';
  position: { x: number; y: number };
  animation: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: string;
  type: 'weekly' | 'daily' | 'monthly';
}

export interface GardenState {
  plants: Plant[];
  weather: 'sunny' | 'rainy' | 'cloudy' | 'misty' | 'sunset';
  pets: Pet[];
  challenges: Challenge[];
  unlockedFeatures: string[];
}

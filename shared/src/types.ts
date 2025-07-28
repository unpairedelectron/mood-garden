// Shared types between web, mobile, and backend
export interface MoodEntry {
  id: string;
  userId: string;
  timestamp: Date;
  inputType: 'text' | 'emoji' | 'voice';
  rawInput: string;
  processedMood: {
    primary: MoodType;
    secondary?: MoodType;
    intensity: number; // 1-10 scale
    confidence: number; // AI confidence 0-1
  };
  context?: {
    triggers?: string[];
    location?: string;
    weather?: string;
    activities?: string[];
  };
  aiAnalysis: {
    sentiment: number; // -1 to 1
    emotions: EmotionScore[];
    suggestedPlants: PlantSuggestion[];
    wellnessTips: string[];
  };
}

export interface EmotionScore {
  emotion: string;
  score: number; // 0-1
}

export interface PlantSuggestion {
  plantType: PlantType;
  reason: string;
  growthStage: 'seed' | 'sprout' | 'bloom';
}

export type MoodType = 
  | 'happy' | 'sad' | 'anxious' | 'calm' | 'angry' 
  | 'excited' | 'tired' | 'stressed' | 'content' | 'lonely'
  | 'grateful' | 'frustrated' | 'peaceful' | 'overwhelmed';

export type PlantType = 
  | 'sunflower' | 'daisy' | 'rose' | 'fern' | 'aloe' 
  | 'bamboo' | 'lavender' | 'oak' | 'willow' | 'cactus'
  | 'lily' | 'moss' | 'vine' | 'cherry-blossom';

export interface GardenState {
  id: string;
  userId: string;
  plants: PlantInstance[];
  environment: {
    weather: 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'stormy';
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
  };
  lastUpdated: Date;
}

export interface PlantInstance {
  id: string;
  type: PlantType;
  position: { x: number; y: number };
  growthStage: 'seed' | 'sprout' | 'bloom' | 'flourish';
  health: number; // 0-100
  moodEntryId: string;
  plantedAt: Date;
  lastWatered?: Date;
}

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  preferences: {
    gardenTheme: 'default' | 'zen' | 'tropical' | 'desert' | 'forest';
    notifications: boolean;
    privacy: 'private' | 'anonymous' | 'public';
  };
  streak: {
    current: number;
    longest: number;
    lastEntry: Date;
  };
}

export interface AICoachResponse {
  message: string;
  type: 'encouragement' | 'suggestion' | 'insight' | 'celebration';
  metaphor?: string;
  actionItems?: string[];
  priority: 'low' | 'medium' | 'high';
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface MoodAnalyticsResponse {
  period: string;
  totalEntries: number;
  moodDistribution: Record<string, number>;
  averageIntensity: number;
  averageSentiment: number;
  streak: { current: number; longest: number };
}

export interface GardenStatsResponse {
  totalPlants: number;
  plantsByType: Record<string, number>;
  plantsByStage: Record<string, number>;
  averageHealth: number;
  environment: GardenState['environment'];
  gardenAge: number;
}

// Mobile-specific types
export interface VoiceRecording {
  uri: string;
  duration: number;
  size: number;
  mimeType: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
}

export interface CameraPhoto {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

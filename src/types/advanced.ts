// Advanced Types for MoodGarden 2.0 AI System

export interface MoodAnalysis {
  // Primary emotions (Plutchik's Wheel)
  emotions: {
    joy: number;          // 0-1
    sadness: number;      // 0-1
    anger: number;        // 0-1
    fear: number;         // 0-1
    trust: number;        // 0-1
    disgust: number;      // 0-1
    surprise: number;     // 0-1
    anticipation: number; // 0-1
  };
  
  // Derived metrics
  arousal: number;      // Energy level (0-1)
  valence: number;      // Positivity (-1 to 1)
  dominance: number;    // Control feeling (0-1)
  stress: number;       // Overall stress level (0-1)
  anxiety: number;      // Anxiety level (0-1)
  
  // Analysis metadata
  confidence: number;   // Analysis confidence (0-1)
  timestamp: string;
  sources: string[];    // ['voice', 'text', 'biometric']
  
  // Therapeutic insights
  therapeuticInsights: string[];
  interventionSuggestions: string[];
  plantGrowthParameters: PlantGrowthParameters;
}

export interface BiometricData {
  // Heart metrics
  heartRate: number;
  heartRateVariability: number;
  
  // Breathing
  breathingRate: number;
  breathingPattern: 'regular' | 'irregular' | 'shallow' | 'deep';
  
  // Stress indicators
  skinConductance?: number;
  bodyTemperature?: number;
  stressScore: number;
  sleepQuality: number;
  skinTemperature: number;
  timestamp: Date;
  deviceSource: string;
  reliability: number;
  
  // Sleep data
  sleepData?: {
    quality: number;      // 0-1
    duration: number;     // Hours
    deepSleepTime: number; // Hours
    remSleepTime: number;  // Hours
    sleepLatency: number;  // Minutes to fall asleep
  };
  
  // Activity
  activityLevel?: number; // 0-1
  stepCount?: number;
  
  // Context
  timeOfDay: string;
  location?: 'home' | 'work' | 'public' | 'nature' | 'other';
}

export interface VoiceAnalysis {
  transcript: string;
  vocalFeatures: {
    pitch: number;        // Hz
    pitchVariability: number;
    tempo: number;        // Words per minute
    volume: number;       // dB
    pauseFrequency: number;
    voiceQuality: 'clear' | 'strained' | 'shaky' | 'monotone';
  };
  emotions: {
    [emotion: string]: number;
  };
  confidence: number;
  timestamp: string;
  type: 'voice';
}

export interface TextAnalysis {
  text: string;
  emotions: {
    [emotion: string]: number;
  };
  cognitivePatterns: {
    negativeThinking: number;
    catastrophizing: number;
    personalizing: number;
    allOrNothing: number;
    mindReading: number;
  };
  therapeuticOpportunities: string[];
  confidence: number;
  timestamp: string;
  type: 'text';
}

export interface PlantGrowthParameters {
  // Physical characteristics
  species: string;
  height: number;         // 0-1
  branchiness: number;    // 0-1 (social connections)
  leafDensity: number;    // 0-1 (mental clarity)
  rootSystem: number;     // 0-1 (emotional stability)
  bloomFrequency: number; // 0-1 (joy moments)
  
  // Visual appearance
  colorProfile: {
    primary: [number, number, number];   // HSL
    secondary: [number, number, number]; // HSL
    accent: [number, number, number];    // HSL
  };
  
  // Behavioral traits
  weatherResponse: {
    windSensitivity: number;  // Anxiety levels
    lightSeeking: number;     // Optimism
    waterRetention: number;   // Resilience
    seasonalAdaptation: number; // Flexibility
  };
  
  // Therapeutic properties
  healingProperties: {
    oxygenProduction: number; // Stress relief provided
    nectarQuality: number;    // Joy shared with others
    rootStabilization: number; // Grounding effect
    seedProduction: number;   // Growth potential
  };
}

export interface TherapeuticMetaphor {
  plantSpecies: string;
  growthStage: 'seed' | 'sprout' | 'sapling' | 'mature' | 'flowering';
  symbolicMeaning: string;
  interventionSuggestion: string;
  visualElements: PlantGrowthParameters;
  therapeuticFramework: 'CBT' | 'DBT' | 'ACT' | 'Mindfulness' | 'Somatic';
}

export interface BiomeState {
  // Environmental conditions
  lighting: {
    sunIntensity: number;     // 0-1
    shadowLength: number;     // 0-1
    colorTemperature: number; // Kelvin (2700-6500)
    dynamicRange: number;     // 0-1
  };
  
  weather: {
    type: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'misty' | 'snowy';
    intensity: number;        // 0-1
    windSpeed: number;        // 0-1
    humidity: number;         // 0-1
    pressure: number;         // 0-1
  };
  
  // Seasonal progression
  season: {
    current: 'spring' | 'summer' | 'autumn' | 'winter';
    progression: number;      // 0-1 through season
    cycleLength: number;      // Days per cycle
  };
  
  // Living elements
  fauna: {
    butterflies: number;      // Joy moments
    birds: number;           // Social connections
    fireflies: number;       // Hope in darkness
    bees: number;            // Productivity/purpose
  };
}

export interface SoundscapeParameters {
  baseFrequency: number;    // Hz
  rhythm: number;          // BPM
  natureSounds: string[];  // ['rain', 'birds', 'wind', 'water']
  volume: number;          // 0-1
  therapeuticTones: {
    binauralBeats?: number; // Hz for brainwave entrainment
    somaticFrequencies?: number[]; // For nervous system regulation
  };
  duration: number;        // Minutes
  adaptiveFeatures: {
    respondsToBreathing: boolean;
    adjustsToHeartRate: boolean;
    evolvesWithMood: boolean;
  };
}

export interface CrisisDetection {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  recommendedActions: string[];
  emergencyContacts?: string[];
  professionalResourcesNeeded: boolean;
  timestamp: string;
}

export interface UserProgress {
  // Quantitative metrics
  moodStability: number;    // 0-1 over time
  resilenceScore: number;   // 0-1 based on recovery patterns
  socialConnection: number; // 0-1 based on sharing/community engagement
  selfAwareness: number;    // 0-1 based on insight development
  
  // Qualitative milestones
  therapeuticMilestones: {
    name: string;
    description: string;
    achievedDate: string;
    plantSpeciesUnlocked?: string;
  }[];
  
  // Growth patterns
  personalGrowthTrends: {
    period: 'week' | 'month' | 'quarter';
    improvements: string[];
    challenges: string[];
    insights: string[];
  }[];
}

export interface PrivacyControls {
  dataSharing: {
    therapistAccess: boolean;
    anonymousResearch: boolean;
    communitySharing: boolean;
  };
  
  biometricCollection: {
    heartRate: boolean;
    breathingPattern: boolean;
    sleepData: boolean;
    locationTracking: boolean;
  };
  
  aiProcessing: {
    localOnly: boolean;
    cloudAnalytics: boolean;
    personalizedContent: boolean;
  };
  
  emergencyProtocols: {
    crisisDetection: boolean;
    emergencyContacts: string[];
    professionalNotification: boolean;
  };
}

// Plant DNA System
export interface PlantDNA {
  id: string;
  species: string;
  
  // Visual characteristics
  visualTraits: {
    stemColor: string;
    leafShape: 'round' | 'oval' | 'serrated' | 'pointed' | 'heart';
    leafSize: 'small' | 'medium' | 'large';
    flowerColor: string;
    flowerShape: 'bell' | 'star' | 'cup' | 'tube' | 'cluster';
    height: number; // 0-1 scale
    width: number;  // 0-1 scale
  };
  
  // Growth characteristics
  growthTraits: {
    speed: number;        // 0-1, how fast it grows
    resilience: number;   // 0-1, resistance to stress
    photosensitivity: number; // 0-1, light requirements
    waterNeeds: number;   // 0-1, hydration requirements
    seasonalBehavior: 'evergreen' | 'deciduous' | 'blooming';
  };
  
  // Behavioral traits
  behaviorTraits: {
    windResponse: number;     // 0-1, how much it sways
    interactivity: number;    // 0-1, response to touch/presence
    socialBehavior: 'solitary' | 'clustering' | 'competitive';
    circadianRhythm: number;  // 0-1, day/night cycle response
  };
  
  // Therapeutic properties
  therapeuticMetaphor?: TherapeuticMetaphor;
  moodAssociation: {
    primaryEmotion: string;
    secondaryEmotions: string[];
    therapeuticBenefit: string;
  };
  
  // Generation metadata
  generatedFrom: {
    moodAnalysis: string; // ID reference
    timestamp: string;
    aiModel: string;
    confidence: number;
  };
}

// Garden Biome Types
export type GardenBiome = 
  | 'enchanted_forest' 
  | 'desert_oasis' 
  | 'ocean_depths' 
  | 'mountain_peak' 
  | 'arctic_tundra' 
  | 'tropical_savanna' 
  | 'mystic_realm';

// Voice Analysis Request
export interface VoiceAnalysisRequest {
  audioBlob: Blob;
  sampleRate: number;
  duration: number;
  format: string;
}

// Multimodal Analysis Request
export interface MultimodalAnalysisRequest {
  textInput?: string;
  voiceAnalysis?: VoiceAnalysisRequest;
  biometricData?: BiometricData;
  contextHistory?: MoodAnalysis[];
  privacySettings: PrivacyControls;
}

// Extended Mood Analysis Result
export interface MoodAnalysisResult extends MoodAnalysis {
  primaryEmotion: string;
  emotionSpectrum: Record<string, number>;
  therapeuticPriority: 'low' | 'medium' | 'high' | 'urgent';
  recommendedInterventions: string[];
}

// Plant Evolution Stage
export interface PlantEvolutionStage {
  stage: number;
  name: string;
  description: string;
  unlockConditions: {
    timeElapsed: number;        // days
    interactionCount: number;   // user interactions
    moodImprovement: number;    // mood score improvement
    consistencyBonus: number;   // daily usage streak
  };
  visualChanges: {
    sizeMultiplier: number;
    colorIntensity: number;
    newFeatures: string[];      // ['flowers', 'fruits', 'glow', etc.]
  };
  therapeuticUnlocks: string[]; // new metaphors or insights
}

// Biome Evolution Parameters
export interface BiomeEvolutionParams {
  currentBiome: GardenBiome;
  userMoodHistory: MoodAnalysis[];
  seasonalFactor: number;
  plantDiversity: number;
  userPreferences: {
    preferredColors: string[];
    preferredPlantTypes: string[];
    ambientSoundPreference: 'nature' | 'minimal' | 'musical';
  };
}

export * from './types';
export * from './api';

// Utility constants and functions
export const MOOD_TYPES = [
  'happy', 'sad', 'anxious', 'calm', 'angry', 
  'excited', 'tired', 'stressed', 'content', 'lonely',
  'grateful', 'frustrated', 'peaceful', 'overwhelmed'
] as const;

export const PLANT_TYPES = [
  'sunflower', 'daisy', 'rose', 'fern', 'aloe', 
  'bamboo', 'lavender', 'oak', 'willow', 'cactus',
  'lily', 'moss', 'vine', 'cherry-blossom'
] as const;

export const MOOD_EMOJI_MAP = {
  happy: '😊',
  sad: '😢',
  anxious: '😰',
  calm: '😌',
  angry: '😠',
  excited: '🤩',
  tired: '😴',
  stressed: '😵',
  content: '😊',
  lonely: '😔',
  grateful: '🙏',
  frustrated: '😤',
  peaceful: '☮️',
  overwhelmed: '🤯'
};

export const PLANT_MOOD_ASSOCIATIONS = {
  happy: ['sunflower', 'daisy', 'cherry-blossom'],
  sad: ['fern', 'willow', 'moss'],
  anxious: ['bamboo', 'lavender', 'aloe'],
  calm: ['lily', 'oak', 'moss'],
  angry: ['cactus', 'oak'],
  excited: ['sunflower', 'daisy'],
  tired: ['aloe', 'moss'],
  stressed: ['bamboo', 'lavender'],
  content: ['lily', 'rose'],
  lonely: ['willow', 'moss'],
  grateful: ['cherry-blossom', 'rose'],
  frustrated: ['cactus', 'bamboo'],
  peaceful: ['lily', 'lavender'],
  overwhelmed: ['aloe', 'fern']
};

// Utility functions
export function getMoodEmoji(mood: string): string {
  return MOOD_EMOJI_MAP[mood as keyof typeof MOOD_EMOJI_MAP] || '😐';
}

export function getSuggestedPlants(mood: string): string[] {
  return PLANT_MOOD_ASSOCIATIONS[mood as keyof typeof PLANT_MOOD_ASSOCIATIONS] || ['daisy'];
}

export function formatMoodIntensity(intensity: number): string {
  if (intensity <= 3) return 'Low';
  if (intensity <= 6) return 'Medium';
  return 'High';
}

export function formatSentiment(sentiment: number): string {
  if (sentiment > 0.3) return 'Positive';
  if (sentiment < -0.3) return 'Negative';
  return 'Neutral';
}

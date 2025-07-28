import { SentimentResult } from './AIService';

export interface Plant {
  id: string;
  type: 'flower' | 'tree' | 'herb' | 'crystal' | 'mushroom';
  species: string;
  emoji: string;
  position: { x: number; y: number };
  size: number; // 0-1
  health: number; // 0-1
  happiness: number; // 0-1
  age: number; // days
  lastWatered: Date;
  growthStage: 'seed' | 'sprout' | 'young' | 'mature' | 'flowering' | 'ancient';
  color: string;
  moodHistory: SentimentResult['mood'][];
  createdAt: Date;
}

export interface GardenState {
  plants: Plant[];
  weather: 'sunny' | 'cloudy' | 'rainy' | 'misty' | 'rainbow' | 'starry' | 'snowy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  magicLevel: number; // 0-100
  totalMoods: number;
  gardenLevel: number;
  experience: number;
}

class GardenService {
  private static instance: GardenService;
  
  private plantSpecies = {
    flower: [
      { name: 'Rose of Joy', emoji: '🌹', color: '#EC4899' },
      { name: 'Sunflower of Hope', emoji: '🌻', color: '#F59E0B' },
      { name: 'Lily of Peace', emoji: '🪷', color: '#8B5CF6' },
      { name: 'Tulip of Love', emoji: '🌷', color: '#EF4444' },
      { name: 'Daisy of Calm', emoji: '🌼', color: '#FBBF24' },
      { name: 'Lavender of Serenity', emoji: '🪻', color: '#A855F7' }
    ],
    tree: [
      { name: 'Wisdom Oak', emoji: '🌳', color: '#059669' },
      { name: 'Cherry Blossom', emoji: '🌸', color: '#F472B6' },
      { name: 'Pine of Strength', emoji: '🌲', color: '#047857' },
      { name: 'Willow of Grace', emoji: '🌿', color: '#10B981' }
    ],
    herb: [
      { name: 'Healing Mint', emoji: '🌱', color: '#22C55E' },
      { name: 'Sage of Wisdom', emoji: '🌿', color: '#16A34A' },
      { name: 'Basil of Energy', emoji: '🌾', color: '#65A30D' }
    ],
    crystal: [
      { name: 'Amethyst of Calm', emoji: '💎', color: '#A855F7' },
      { name: 'Rose Quartz of Love', emoji: '💖', color: '#F472B6' },
      { name: 'Citrine of Joy', emoji: '✨', color: '#FBBF24' }
    ],
    mushroom: [
      { name: 'Fairy Ring', emoji: '🍄', color: '#DC2626' },
      { name: 'Glow Fungus', emoji: '🟫', color: '#7C3AED' }
    ]
  };

  static getInstance(): GardenService {
    if (!GardenService.instance) {
      GardenService.instance = new GardenService();
    }
    return GardenService.instance;
  }

  createNewPlant(mood: SentimentResult['mood'], position?: { x: number; y: number }): Plant {
    const plantType = this.selectPlantType(mood);
    const species = this.plantSpecies[plantType][
      Math.floor(Math.random() * this.plantSpecies[plantType].length)
    ];

    const plant: Plant = {
      id: `plant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: plantType,
      species: species.name,
      emoji: species.emoji,
      position: position || {
        x: Math.random() * 0.8 + 0.1, // 10-90% of screen width
        y: Math.random() * 0.6 + 0.3, // 30-90% of screen height
      },
      size: 0.1, // Start small
      health: 1.0,
      happiness: this.getMoodHappiness(mood),
      age: 0,
      lastWatered: new Date(),
      growthStage: 'seed',
      color: species.color,
      moodHistory: [mood],
      createdAt: new Date(),
    };

    return plant;
  }

  private selectPlantType(mood: SentimentResult['mood']): Plant['type'] {
    switch (mood) {
      case 'very_positive': return Math.random() > 0.5 ? 'flower' : 'crystal';
      case 'positive': return 'flower';
      case 'neutral': return Math.random() > 0.5 ? 'herb' : 'tree';
      case 'negative': return 'herb';
      case 'very_negative': return 'mushroom';
    }
  }

  private getMoodHappiness(mood: SentimentResult['mood']): number {
    switch (mood) {
      case 'very_positive': return 1.0;
      case 'positive': return 0.8;
      case 'neutral': return 0.6;
      case 'negative': return 0.4;
      case 'very_negative': return 0.2;
    }
  }

  growPlant(plant: Plant, moodEntry: SentimentResult): Plant {
    const moodGrowthFactor = this.getMoodHappiness(moodEntry.mood);
    const timeFactor = this.calculateTimeFactor(plant);
    
    // Update mood history
    const updatedMoodHistory = [...plant.moodHistory, moodEntry.mood].slice(-10); // Keep last 10 moods
    
    // Calculate growth
    const baseGrowth = 0.05; // Base growth per mood entry
    const moodBonus = moodGrowthFactor * 0.1;
    const timeBonus = timeFactor * 0.02;
    
    const totalGrowth = (baseGrowth + moodBonus + timeBonus) * moodEntry.intensity;
    
    // Update plant properties
    const newSize = Math.min(plant.size + totalGrowth, 1.0);
    const newHappiness = Math.min(
      (plant.happiness * 0.7) + (moodGrowthFactor * 0.3),
      1.0
    );
    
    // Update growth stage based on size
    let newGrowthStage = plant.growthStage;
    if (newSize > 0.8) newGrowthStage = 'ancient';
    else if (newSize > 0.6) newGrowthStage = 'flowering';
    else if (newSize > 0.4) newGrowthStage = 'mature';
    else if (newSize > 0.2) newGrowthStage = 'young';
    else if (newSize > 0.05) newGrowthStage = 'sprout';

    // Update age
    const newAge = plant.age + 1;

    return {
      ...plant,
      size: newSize,
      happiness: newHappiness,
      age: newAge,
      growthStage: newGrowthStage,
      moodHistory: updatedMoodHistory,
      lastWatered: new Date(),
    };
  }

  private calculateTimeFactor(plant: Plant): number {
    const daysSinceWatered = (Date.now() - plant.lastWatered.getTime()) / (1000 * 60 * 60 * 24);
    
    // Optimal watering is every 1-3 days
    if (daysSinceWatered < 1) return 0.5; // Too soon
    if (daysSinceWatered <= 3) return 1.0; // Perfect
    if (daysSinceWatered <= 7) return 0.7; // Okay
    return 0.3; // Needs water
  }

  generateGardenEffects(garden: GardenState): {
    particles: Array<{ type: string; position: { x: number; y: number }; color: string }>;
    weather: GardenState['weather'];
    ambiance: string;
  } {
    const particles = [];
    const avgHappiness = garden.plants.reduce((sum, plant) => sum + plant.happiness, 0) / garden.plants.length || 0;
    
    // Generate particles based on plant happiness
    if (avgHappiness > 0.8) {
      // Sparkles for very happy garden
      for (let i = 0; i < 5; i++) {
        particles.push({
          type: 'sparkle',
          position: { x: Math.random(), y: Math.random() },
          color: '#FBBF24'
        });
      }
    }
    
    if (avgHappiness > 0.6) {
      // Floating flowers for happy garden
      for (let i = 0; i < 3; i++) {
        particles.push({
          type: 'flower',
          position: { x: Math.random(), y: Math.random() },
          color: '#F472B6'
        });
      }
    }

    // Determine weather based on garden mood
    let weather: GardenState['weather'] = 'sunny';
    if (avgHappiness > 0.9) weather = 'rainbow';
    else if (avgHappiness > 0.7) weather = 'sunny';
    else if (avgHappiness > 0.4) weather = 'cloudy';
    else if (avgHappiness > 0.2) weather = 'misty';
    else weather = 'rainy';

    // Determine ambiance
    let ambiance = 'peaceful';
    if (avgHappiness > 0.8) ambiance = 'magical';
    else if (avgHappiness > 0.6) ambiance = 'cheerful';
    else if (avgHappiness > 0.4) ambiance = 'calm';
    else ambiance = 'somber';

    return { particles, weather, ambiance };
  }

  calculateGardenLevel(totalMoods: number, avgPlantSize: number): number {
    const baseLevel = Math.floor(totalMoods / 10) + 1;
    const sizeBonus = Math.floor(avgPlantSize * 5);
    return baseLevel + sizeBonus;
  }

  getPlantEmoji(plant: Plant): string {
    // Return emoji based on growth stage
    switch (plant.growthStage) {
      case 'seed': return '🌰';
      case 'sprout': return '🌱';
      case 'young': return plant.emoji;
      case 'mature': return plant.emoji;
      case 'flowering': return plant.emoji + '✨';
      case 'ancient': return '🌟' + plant.emoji + '🌟';
      default: return plant.emoji;
    }
  }

  getPlantSize(plant: Plant): number {
    // Return visual size multiplier
    const baseSize = {
      'seed': 0.3,
      'sprout': 0.5,
      'young': 0.7,
      'mature': 1.0,
      'flowering': 1.2,
      'ancient': 1.5
    }[plant.growthStage];

    return baseSize * (0.5 + plant.size * 0.5); // Scale with plant size
  }
}

export default GardenService;

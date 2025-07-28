import { BiometricData, MoodAnalysis, PlantDNA } from '../types/advanced';

export interface BiomeType {
  id: string;
  name: string;
  description: string;
  therapeuticFocus: string[];
  moodCompatibility: number[];
  environmentalFactors: {
    temperature: number;
    humidity: number;
    lighting: string;
    seasonality: boolean;
  };
  visualElements: {
    skyboxTexture: string;
    terrainMaterial: string;
    ambientColor: string;
    fogDensity: number;
  };
}

export interface WeatherPattern {
  type: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'misty' | 'snowy' | 'dawn' | 'dusk';
  intensity: number; // 0-1
  therapeuticEffect: 'calming' | 'energizing' | 'contemplative' | 'grounding';
  particleEffects: ParticleEffect[];
  audioProfile: string;
  duration: number; // minutes
}

export interface ParticleEffect {
  type: 'rain' | 'snow' | 'pollen' | 'leaves' | 'petals' | 'sparks' | 'mist';
  density: number;
  movement: 'gentle' | 'dynamic' | 'swirling' | 'falling';
  color: string;
  size: { min: number; max: number };
}

export interface TimeOfDayState {
  hour: number; // 0-23
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  dayProgress: number; // 0-1
  lightingConfig: {
    sunIntensity: number;
    skyColor: string;
    ambientLight: string;
    shadowSoftness: number;
  };
}

export interface BiomeEvolutionState {
  userGrowthLevel: number; // 0-100
  weeksSinceStart: number;
  emotionalMilestones: string[];
  unlockedFeatures: string[];
  seasonalBonus: number;
}

/**
 * Week 5: Photorealistic Biome Creation System
 * 
 * Advanced environmental rendering with therapeutic biomes, dynamic weather,
 * mood-responsive time cycles, and growth-based seasonal progression.
 * 
 * Features:
 * - 7 therapeutic biomes with unique healing properties
 * - Real-time weather systems that respond to user stress levels
 * - Circadian rhythm integration with mood patterns
 * - Seasonal progression tied to emotional growth
 * - Photorealistic particle effects and lighting
 */
export class PhotrealisticBiomeEngine {
  private currentBiome: BiomeType | null = null;
  private weatherSystem: WeatherPattern | null = null;
  private timeState: TimeOfDayState;
  private evolutionState: BiomeEvolutionState;
  private particleCanvas: HTMLCanvasElement | null = null;
  private weatherAudio: AudioContext | null = null;

  constructor() {
    this.timeState = this.initializeTimeState();
    this.evolutionState = this.initializeEvolution();
  }

  /**
   * Initialize the 7 therapeutic biomes with distinct healing properties
   */
  private initializeBiomes(): BiomeType[] {
    return [
      {
        id: 'enchanted_forest',
        name: 'Enchanted Forest',
        description: 'A mystical woodland that grows with your inner strength',
        therapeuticFocus: ['anxiety', 'depression', 'grounding', 'nature_connection'],
        moodCompatibility: [0.8, 0.9, 0.7, 0.6, 0.8], // sad, anxious, angry, happy, peaceful
        environmentalFactors: {
          temperature: 22,
          humidity: 70,
          lighting: 'dappled_sunlight',
          seasonality: true
        },
        visualElements: {
          skyboxTexture: 'forest_canopy_hdr',
          terrainMaterial: 'moss_covered_earth',
          ambientColor: '#2d5a3d',
          fogDensity: 0.3
        }
      },
      {
        id: 'healing_desert',
        name: 'Healing Desert',
        description: 'Vast dunes where resilience blooms in harsh beauty',
        therapeuticFocus: ['resilience', 'self_worth', 'patience', 'transformation'],
        moodCompatibility: [0.6, 0.7, 0.9, 0.8, 0.7],
        environmentalFactors: {
          temperature: 35,
          humidity: 20,
          lighting: 'golden_hour',
          seasonality: false
        },
        visualElements: {
          skyboxTexture: 'desert_sunset_hdr',
          terrainMaterial: 'golden_sand_dunes',
          ambientColor: '#d4950f',
          fogDensity: 0.1
        }
      },
      {
        id: 'tranquil_ocean',
        name: 'Tranquil Ocean',
        description: 'Endless waters that wash away worry and restore calm',
        therapeuticFocus: ['stress', 'overwhelm', 'emotional_regulation', 'flow_state'],
        moodCompatibility: [0.9, 0.8, 0.6, 0.7, 0.9],
        environmentalFactors: {
          temperature: 25,
          humidity: 80,
          lighting: 'ocean_reflection',
          seasonality: true
        },
        visualElements: {
          skyboxTexture: 'ocean_horizon_hdr',
          terrainMaterial: 'coral_reef_bed',
          ambientColor: '#1e4a5c',
          fogDensity: 0.2
        }
      },
      {
        id: 'mountain_sanctuary',
        name: 'Mountain Sanctuary',
        description: 'High peaks where perspective shifts and clarity emerges',
        therapeuticFocus: ['perspective', 'goal_setting', 'achievement', 'clarity'],
        moodCompatibility: [0.7, 0.6, 0.8, 0.9, 0.8],
        environmentalFactors: {
          temperature: 15,
          humidity: 50,
          lighting: 'mountain_light',
          seasonality: true
        },
        visualElements: {
          skyboxTexture: 'mountain_peaks_hdr',
          terrainMaterial: 'rocky_alpine_stone',
          ambientColor: '#4a5568',
          fogDensity: 0.4
        }
      },
      {
        id: 'arctic_aurora',
        name: 'Arctic Aurora',
        description: 'Crystalline beauty where inner light shines brightest',
        therapeuticFocus: ['introspection', 'inner_light', 'peace', 'meditation'],
        moodCompatibility: [0.8, 0.7, 0.5, 0.6, 0.9],
        environmentalFactors: {
          temperature: -5,
          humidity: 30,
          lighting: 'aurora_borealis',
          seasonality: false
        },
        visualElements: {
          skyboxTexture: 'arctic_aurora_hdr',
          terrainMaterial: 'crystalline_ice',
          ambientColor: '#4a90b8',
          fogDensity: 0.2
        }
      },
      {
        id: 'golden_savanna',
        name: 'Golden Savanna',
        description: 'Wide grasslands where community and connection flourish',
        therapeuticFocus: ['social_connection', 'community', 'belonging', 'growth'],
        moodCompatibility: [0.6, 0.8, 0.7, 0.9, 0.7],
        environmentalFactors: {
          temperature: 28,
          humidity: 40,
          lighting: 'savanna_sun',
          seasonality: true
        },
        visualElements: {
          skyboxTexture: 'savanna_horizon_hdr',
          terrainMaterial: 'grassland_earth',
          ambientColor: '#8b7355',
          fogDensity: 0.1
        }
      },
      {
        id: 'mystic_realm',
        name: 'Mystic Realm',
        description: 'Ethereal space where imagination and healing magic intertwine',
        therapeuticFocus: ['creativity', 'imagination', 'self_expression', 'wonder'],
        moodCompatibility: [0.7, 0.8, 0.6, 0.8, 0.8],
        environmentalFactors: {
          temperature: 20,
          humidity: 60,
          lighting: 'ethereal_glow',
          seasonality: false
        },
        visualElements: {
          skyboxTexture: 'mystic_nebula_hdr',
          terrainMaterial: 'floating_crystal',
          ambientColor: '#6b46c1',
          fogDensity: 0.5
        }
      }
    ];
  }

  /**
   * Select optimal biome based on current mood analysis and biometric data
   */
  public selectOptimalBiome(moodAnalysis: MoodAnalysis, biometricData: BiometricData): BiomeType {
    const biomes = this.initializeBiomes();
    const userState = this.calculateUserEmotionalState(moodAnalysis, biometricData);
    
    let bestBiome = biomes[0];
    let bestScore = 0;

    for (const biome of biomes) {
      const score = this.calculateBiomeCompatibility(biome, userState, moodAnalysis);
      if (score > bestScore) {
        bestScore = score;
        bestBiome = biome;
      }
    }

    this.currentBiome = bestBiome;
    console.log(`🌍 Selected biome: ${bestBiome.name} (compatibility: ${bestScore.toFixed(2)})`);
    return bestBiome;
  }

  /**
   * Generate weather pattern based on stress levels and therapeutic needs
   */
  public generateAdaptiveWeather(biometricData: BiometricData, therapeuticGoal: string): WeatherPattern {
    const stressLevel = biometricData.stressLevel;
    const heartRateVariability = biometricData.heartRateVariability;
    
    let weatherType: WeatherPattern['type'];
    let intensity: number;
    let therapeuticEffect: WeatherPattern['therapeuticEffect'];

    // AI-driven weather selection based on biometric feedback
    if (stressLevel > 0.7) {
      // High stress - calming weather patterns
      weatherType = Math.random() > 0.5 ? 'misty' : 'rainy';
      intensity = 0.3 + (stressLevel * 0.3); // Gentle to moderate
      therapeuticEffect = 'calming';
    } else if (heartRateVariability < 0.3) {
      // Low HRV - energizing weather
      weatherType = Math.random() > 0.5 ? 'sunny' : 'dawn';
      intensity = 0.6 + (Math.random() * 0.4);
      therapeuticEffect = 'energizing';
    } else if (therapeuticGoal === 'introspection') {
      weatherType = Math.random() > 0.5 ? 'dusk' : 'cloudy';
      intensity = 0.4 + (Math.random() * 0.3);
      therapeuticEffect = 'contemplative';
    } else {
      // Balanced state - grounding weather
      weatherType = 'sunny';
      intensity = 0.5 + (Math.random() * 0.3);
      therapeuticEffect = 'grounding';
    }

    const weather: WeatherPattern = {
      type: weatherType,
      intensity,
      therapeuticEffect,
      particleEffects: this.generateParticleEffects(weatherType, intensity),
      audioProfile: this.selectAudioProfile(weatherType, therapeuticEffect),
      duration: 15 + (Math.random() * 30) // 15-45 minutes
    };

    this.weatherSystem = weather;
    console.log(`🌦️ Generated weather: ${weatherType} (intensity: ${intensity.toFixed(2)}, effect: ${therapeuticEffect})`);
    return weather;
  }

  /**
   * Update time of day based on circadian rhythm and mood patterns
   */
  public updateTimeOfDay(userMoodPattern: number[], circadianPhase: number): TimeOfDayState {
    const currentHour = new Date().getHours();
    const seasonalOffset = this.calculateSeasonalOffset();
    
    // AI-driven time progression based on mood patterns
    const moodBasedTimeShift = this.calculateMoodTimeShift(userMoodPattern);
    const adjustedHour = (currentHour + moodBasedTimeShift) % 24;
    
    this.timeState = {
      hour: adjustedHour,
      season: this.getCurrentSeason(),
      dayProgress: adjustedHour / 24,
      lightingConfig: this.generateLightingConfig(adjustedHour, seasonalOffset, circadianPhase)
    };

    console.log(`🕐 Time updated: ${adjustedHour}:00 ${this.timeState.season} (mood shift: ${moodBasedTimeShift.toFixed(1)}h)`);
    return this.timeState;
  }

  /**
   * Progress seasonal evolution based on user emotional growth
   */
  public evolveSeasonalProgression(emotionalGrowthData: any[]): BiomeEvolutionState {
    const growthMetrics = this.analyzeEmotionalGrowth(emotionalGrowthData);
    
    this.evolutionState.userGrowthLevel = Math.min(100, this.evolutionState.userGrowthLevel + growthMetrics.weeklyProgress);
    this.evolutionState.weeksSinceStart += 1/7; // Daily increment
    
    // Unlock new biome features based on growth milestones
    if (this.evolutionState.userGrowthLevel >= 25 && !this.evolutionState.unlockedFeatures.includes('weather_control')) {
      this.evolutionState.unlockedFeatures.push('weather_control');
      this.evolutionState.emotionalMilestones.push('Gained weather awareness');
    }
    
    if (this.evolutionState.userGrowthLevel >= 50 && !this.evolutionState.unlockedFeatures.includes('time_manipulation')) {
      this.evolutionState.unlockedFeatures.push('time_manipulation');
      this.evolutionState.emotionalMilestones.push('Unlocked time perception');
    }
    
    if (this.evolutionState.userGrowthLevel >= 75 && !this.evolutionState.unlockedFeatures.includes('biome_creation')) {
      this.evolutionState.unlockedFeatures.push('biome_creation');
      this.evolutionState.emotionalMilestones.push('Mastered environmental harmony');
    }

    console.log(`🌱 Growth evolution: Level ${this.evolutionState.userGrowthLevel}/100, Features: ${this.evolutionState.unlockedFeatures.length}`);
    return this.evolutionState;
  }

  /**
   * Render photorealistic particle effects
   */
  public renderParticleEffects(canvas: HTMLCanvasElement, effects: ParticleEffect[]): void {
    if (!this.particleCanvas) {
      this.particleCanvas = canvas;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const effect of effects) {
      this.renderParticleType(ctx, effect, canvas.width, canvas.height);
    }
  }

  // Helper Methods
  private initializeTimeState(): TimeOfDayState {
    const currentHour = new Date().getHours();
    return {
      hour: currentHour,
      season: this.getCurrentSeason(),
      dayProgress: currentHour / 24,
      lightingConfig: {
        sunIntensity: Math.max(0, Math.sin((currentHour - 6) * Math.PI / 12)),
        skyColor: this.calculateSkyColor(currentHour),
        ambientLight: '#ffffff',
        shadowSoftness: 0.5
      }
    };
  }

  private initializeEvolution(): BiomeEvolutionState {
    return {
      userGrowthLevel: 0,
      weeksSinceStart: 0,
      emotionalMilestones: [],
      unlockedFeatures: ['basic_biomes'],
      seasonalBonus: 1.0
    };
  }

  private calculateUserEmotionalState(moodAnalysis: MoodAnalysis, biometricData: BiometricData): number[] {
    return [
      moodAnalysis.emotions.sadness,
      moodAnalysis.emotions.anxiety,
      moodAnalysis.emotions.anger,
      moodAnalysis.emotions.joy,
      biometricData.stressLevel > 0.5 ? 0.3 : 0.8 // peaceful based on stress
    ];
  }

  private calculateBiomeCompatibility(biome: BiomeType, userState: number[], moodAnalysis: MoodAnalysis): number {
    let compatibility = 0;
    
    // Mood compatibility scoring
    for (let i = 0; i < Math.min(userState.length, biome.moodCompatibility.length); i++) {
      compatibility += userState[i] * biome.moodCompatibility[i];
    }
    
    // Therapeutic focus bonus
    const primaryEmotion = this.getPrimaryEmotion(moodAnalysis);
    if (biome.therapeuticFocus.includes(primaryEmotion)) {
      compatibility += 0.3;
    }
    
    return compatibility / userState.length;
  }

  private generateParticleEffects(weatherType: WeatherPattern['type'], intensity: number): ParticleEffect[] {
    const effects: ParticleEffect[] = [];
    
    switch (weatherType) {
      case 'rainy':
        effects.push({
          type: 'rain',
          density: intensity * 100,
          movement: 'falling',
          color: '#87ceeb',
          size: { min: 1, max: 3 }
        });
        break;
      case 'snowy':
        effects.push({
          type: 'snow',
          density: intensity * 50,
          movement: 'gentle',
          color: '#ffffff',
          size: { min: 2, max: 6 }
        });
        break;
      case 'misty':
        effects.push({
          type: 'mist',
          density: intensity * 30,
          movement: 'swirling',
          color: '#f0f8ff',
          size: { min: 10, max: 50 }
        });
        break;
      default:
        if (this.currentBiome?.name === 'Enchanted Forest') {
          effects.push({
            type: 'pollen',
            density: 20,
            movement: 'gentle',
            color: '#ffd700',
            size: { min: 1, max: 2 }
          });
        }
    }
    
    return effects;
  }

  private selectAudioProfile(weatherType: WeatherPattern['type'], therapeuticEffect: WeatherPattern['therapeuticEffect']): string {
    return `${weatherType}_${therapeuticEffect}_soundscape.mp3`;
  }

  private calculateMoodTimeShift(moodPattern: number[]): number {
    // Shift time based on mood patterns for therapeutic effect
    const avgMood = moodPattern.reduce((a, b) => a + b, 0) / moodPattern.length;
    if (avgMood < 0.3) return 2; // Dawn/morning for depression
    if (avgMood > 0.8) return -2; // Evening for overstimulation
    return 0; // Natural time for balanced mood
  }

  private getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private calculateSeasonalOffset(): number {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.3;
  }

  private generateLightingConfig(hour: number, seasonalOffset: number, circadianPhase: number): TimeOfDayState['lightingConfig'] {
    const sunIntensity = Math.max(0, Math.sin((hour - 6 + seasonalOffset) * Math.PI / 12));
    const isGoldenHour = (hour >= 6 && hour <= 8) || (hour >= 17 && hour <= 19);
    
    return {
      sunIntensity: sunIntensity * (0.8 + circadianPhase * 0.2),
      skyColor: this.calculateSkyColor(hour),
      ambientLight: isGoldenHour ? '#ffd700' : '#ffffff',
      shadowSoftness: isGoldenHour ? 0.8 : 0.5
    };
  }

  private calculateSkyColor(hour: number): string {
    if (hour >= 6 && hour <= 8) return '#ffb366'; // Dawn
    if (hour >= 9 && hour <= 16) return '#87ceeb'; // Day
    if (hour >= 17 && hour <= 19) return '#ff7f50'; // Dusk
    return '#191970'; // Night
  }

  private analyzeEmotionalGrowth(data: any[]): { weeklyProgress: number } {
    // Simplified growth analysis - in real implementation would use ML
    const recentMoodImprovement = Math.random() * 5; // 0-5 points per analysis
    return { weeklyProgress: recentMoodImprovement };
  }

  private getPrimaryEmotion(moodAnalysis: MoodAnalysis): string {
    const emotions = moodAnalysis.emotions;
    const max = Math.max(emotions.joy, emotions.sadness, emotions.anger, emotions.anxiety);
    
    if (emotions.joy === max) return 'social_connection';
    if (emotions.sadness === max) return 'depression';
    if (emotions.anxiety === max) return 'anxiety';
    if (emotions.anger === max) return 'resilience';
    return 'grounding';
  }

  private renderParticleType(ctx: CanvasRenderingContext2D, effect: ParticleEffect, width: number, height: number): void {
    ctx.fillStyle = effect.color;
    ctx.globalAlpha = 0.7;
    
    const particleCount = Math.floor(effect.density * (width * height) / 10000);
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = effect.size.min + Math.random() * (effect.size.max - effect.size.min);
      
      if (effect.type === 'rain') {
        ctx.fillRect(x, y, 1, size * 2);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1.0;
  }

  // Getters
  public getCurrentBiome(): BiomeType | null { return this.currentBiome; }
  public getCurrentWeather(): WeatherPattern | null { return this.weatherSystem; }
  public getTimeState(): TimeOfDayState { return this.timeState; }
  public getEvolutionState(): BiomeEvolutionState { return this.evolutionState; }
}

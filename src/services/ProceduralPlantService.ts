// Advanced Procedural Plant Generation Service
import type { 
  MoodAnalysis, 
  PlantGrowthParameters, 
  TherapeuticMetaphor, 
  BiomeState,
  PlantDNA 
} from '../types/advanced';

export class ProceduralPlantService {
  private plantSpeciesDatabase: Map<string, any>;
  private therapeuticMetaphors: Map<string, TherapeuticMetaphor[]>;

  constructor() {
    this.initializePlantDatabase();
    this.initializeTherapeuticMetaphors();
  }

  /**
   * Generate a unique plant based on mood analysis and user history
   */
  generateAdaptivePlant(
    moodAnalysis: MoodAnalysis,
    userHistory: any[] = [],
    biomeState: BiomeState
  ): PlantGrowthParameters {
    // Select base species based on dominant emotions
    const baseSpecies = this.selectBaseSpecies(moodAnalysis.emotions);
    
    // Apply mood-driven mutations
    const moodMutations = this.calculateMoodMutations(moodAnalysis);
    
    // Factor in user's growth history
    const evolutionaryTraits = this.calculateEvolutionaryTraits(userHistory);
    
    // Environmental adaptations for current biome
    const environmentalAdaptations = this.calculateEnvironmentalAdaptations(biomeState);
    
    // Therapeutic alignment
    const therapeuticProperties = this.calculateTherapeuticProperties(moodAnalysis);

    return this.synthesizePlantDNA({
      baseSpecies,
      moodMutations,
      evolutionaryTraits,
      environmentalAdaptations,
      therapeuticProperties,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate therapeutic metaphor for current plant and mood
   */
  generateTherapeuticMetaphor(
    plant: PlantGrowthParameters,
    moodAnalysis: MoodAnalysis,
    userContext: any
  ): TherapeuticMetaphor {
    const therapeuticFramework = this.selectTherapeuticFramework(moodAnalysis);
    const growthStage = this.determineGrowthStage(plant, userContext);
    const symbolicMeaning = this.generateSymbolicMeaning(plant, moodAnalysis);
    const intervention = this.generateInterventionSuggestion(
      plant,
      moodAnalysis,
      therapeuticFramework
    );

    return {
      plantSpecies: plant.species,
      growthStage,
      symbolicMeaning,
      interventionSuggestion: intervention,
      visualElements: plant,
      therapeuticFramework
    };
  }

  /**
   * Evolve existing plant based on new mood input
   */
  evolvePlant(
    existingPlant: PlantGrowthParameters,
    newMoodAnalysis: MoodAnalysis,
    growthHistory: any[]
  ): PlantGrowthParameters {
    // Calculate growth rate based on emotional consistency
    const growthRate = this.calculateGrowthRate(newMoodAnalysis, growthHistory);
    
    // Apply positive emotion boosts
    const positiveGrowth = this.applyPositiveGrowth(existingPlant, newMoodAnalysis);
    
    // Handle stress responses (pruning, dormancy, resilience building)
    const stressAdaptations = this.applyStressAdaptations(existingPlant, newMoodAnalysis);
    
    // Seasonal changes and maturation
    const maturationChanges = this.applyMaturation(existingPlant, growthHistory);

    return this.mergeGrowthFactors(existingPlant, {
      growthRate,
      positiveGrowth,
      stressAdaptations,
      maturationChanges
    });
  }

  /**
   * Generate biome-wide environmental changes based on collective mood
   */
  updateBiomeFromCollectiveMood(
    currentBiome: BiomeState,
    collectiveMoodData: MoodAnalysis[]
  ): BiomeState {
    const averageMood = this.calculateAverageMood(collectiveMoodData);
    const moodVariability = this.calculateMoodVariability(collectiveMoodData);
    
    return {
      lighting: this.updateLighting(currentBiome.lighting, averageMood),
      weather: this.updateWeather(currentBiome.weather, averageMood, moodVariability),
      season: this.updateSeason(currentBiome.season, averageMood),
      fauna: this.updateFauna(currentBiome.fauna, averageMood, collectiveMoodData.length)
    };
  }

  // Private helper methods

  private initializePlantDatabase(): void {
    this.plantSpeciesDatabase = new Map([
      ['resilience_tree', {
        baseHeight: 0.8,
        branchiness: 0.7,
        stressResistance: 0.9,
        symbolicMeaning: 'Strength through adversity',
        therapeuticFocus: 'stress_management'
      }],
      ['empathy_flower', {
        baseHeight: 0.3,
        branchiness: 0.9,
        socialBonus: 0.8,
        symbolicMeaning: 'Connection and understanding',
        therapeuticFocus: 'social_anxiety'
      }],
      ['mindfulness_moss', {
        baseHeight: 0.1,
        spreading: 0.9,
        grounding: 0.9,
        symbolicMeaning: 'Present moment awareness',
        therapeuticFocus: 'anxiety_grounding'
      }],
      ['growth_vine', {
        baseHeight: 0.6,
        adaptability: 0.9,
        climbing: 0.8,
        symbolicMeaning: 'Continuous personal development',
        therapeuticFocus: 'self_improvement'
      }],
      ['calm_lotus', {
        baseHeight: 0.4,
        waterElement: 0.9,
        tranquility: 0.9,
        symbolicMeaning: 'Peace rising from turbulence',
        therapeuticFocus: 'emotional_regulation'
      }]
    ]);
  }

  private initializeTherapeuticMetaphors(): void {
    this.therapeuticMetaphors = new Map([
      ['anxiety', [
        {
          plantSpecies: 'grounding_root',
          growthStage: 'sprout',
          symbolicMeaning: 'Your anxiety is like a plant that needs stable soil - let\'s strengthen your roots',
          interventionSuggestion: 'Practice the 5-4-3-2-1 grounding technique while tending to your plant',
          visualElements: {} as PlantGrowthParameters,
          therapeuticFramework: 'CBT'
        }
      ]],
      ['depression', [
        {
          plantSpecies: 'sunrise_bloom',
          growthStage: 'seed',
          symbolicMeaning: 'Even in winter, seeds hold the promise of spring',
          interventionSuggestion: 'Small daily care actions, like watering, mirror self-care practices',
          visualElements: {} as PlantGrowthParameters,
          therapeuticFramework: 'ACT'
        }
      ]]
    ]);
  }

  private selectBaseSpecies(emotions: any): string {
    const dominantEmotion = Object.entries(emotions)
      .reduce((max, [emotion, value]) => 
        (value as number) > max.value ? { emotion, value: value as number } : max,
        { emotion: '', value: 0 }
      );

    // Map emotions to plant archetypes
    const emotionToSpecies: { [key: string]: string } = {
      joy: 'sunflower_hybrid',
      sadness: 'weeping_willow',
      anger: 'thorned_rose',
      fear: 'protective_pine',
      trust: 'faithful_oak',
      disgust: 'cleansing_sage',
      surprise: 'bursting_poppy',
      anticipation: 'reaching_vine'
    };

    return emotionToSpecies[dominantEmotion.emotion] || 'adaptive_fern';
  }

  private calculateMoodMutations(moodAnalysis: MoodAnalysis): any {
    return {
      heightModifier: (moodAnalysis.emotions.joy + moodAnalysis.emotions.trust) / 2,
      branchinessModifier: moodAnalysis.emotions.anticipation,
      leafDensityModifier: 1 - moodAnalysis.stress,
      rootSystemModifier: moodAnalysis.emotions.trust,
      bloomModifier: moodAnalysis.emotions.joy,
      colorShift: this.calculateColorShift(moodAnalysis.emotions),
      weatherSensitivity: moodAnalysis.anxiety || 0
    };
  }

  private calculateColorShift(emotions: any): [number, number, number] {
    // Emotional color psychology
    const hue = (emotions.joy * 60) + (emotions.sadness * 240) + (emotions.anger * 15);
    const saturation = emotions.trust * 0.8 + 0.2;
    const lightness = 0.3 + (emotions.joy * 0.4) - (emotions.sadness * 0.2);
    
    return [hue % 360, Math.max(0, Math.min(1, saturation)), Math.max(0, Math.min(1, lightness))];
  }

  private calculateEvolutionaryTraits(userHistory: any[]): any {
    if (userHistory.length === 0) return { maturity: 0, resilience: 0, complexity: 0 };

    const totalMoods = userHistory.length;
    const positiveRatio = userHistory.filter(h => h.valence > 0).length / totalMoods;
    const stressRecovery = this.calculateStressRecoveryRate(userHistory);

    return {
      maturity: Math.min(1, totalMoods / 100), // Mature after 100 mood entries
      resilience: stressRecovery,
      complexity: Math.min(1, totalMoods / 50), // More complex features unlock over time
      adaptability: positiveRatio
    };
  }

  private calculateStressRecoveryRate(history: any[]): number {
    let recoverySum = 0;
    let stressEvents = 0;

    for (let i = 1; i < history.length; i++) {
      if (history[i - 1].stress > 0.7 && history[i].stress < 0.5) {
        recoverySum += 1;
        stressEvents += 1;
      } else if (history[i - 1].stress > 0.7) {
        stressEvents += 1;
      }
    }

    return stressEvents > 0 ? recoverySum / stressEvents : 0.5;
  }

  private calculateEnvironmentalAdaptations(biome: BiomeState): any {
    return {
      lightAdaptation: biome.lighting.sunIntensity,
      weatherResistance: biome.weather.intensity,
      seasonalAlignment: biome.season.progression,
      faunaInteraction: Object.values(biome.fauna).reduce((sum, count) => sum + count, 0) / 4
    };
  }

  private calculateTherapeuticProperties(moodAnalysis: MoodAnalysis): any {
    return {
      stressRelief: 1 - moodAnalysis.stress,
      joyAmplification: moodAnalysis.emotions.joy,
      groundingStrength: moodAnalysis.emotions.trust,
      resilienceBuilding: moodAnalysis.dominance,
      socialConnection: moodAnalysis.emotions.trust + moodAnalysis.emotions.anticipation
    };
  }

  private synthesizePlantDNA(components: any): PlantGrowthParameters {
    const base = this.plantSpeciesDatabase.get(components.baseSpecies) || {};
    
    return {
      species: components.baseSpecies,
      height: this.blendValues([
        base.baseHeight || 0.5,
        components.moodMutations.heightModifier,
        components.evolutionaryTraits.maturity
      ]),
      branchiness: this.blendValues([
        base.branchiness || 0.5,
        components.moodMutations.branchinessModifier,
        components.therapeuticProperties.socialConnection
      ]),
      leafDensity: this.blendValues([
        0.5,
        components.moodMutations.leafDensityModifier,
        components.environmentalAdaptations.lightAdaptation
      ]),
      rootSystem: this.blendValues([
        0.5,
        components.moodMutations.rootSystemModifier,
        components.therapeuticProperties.groundingStrength
      ]),
      bloomFrequency: this.blendValues([
        0.3,
        components.moodMutations.bloomModifier,
        components.therapeuticProperties.joyAmplification
      ]),
      colorProfile: {
        primary: components.moodMutations.colorShift,
        secondary: this.generateSecondaryColor(components.moodMutations.colorShift),
        accent: this.generateAccentColor(components.moodMutations.colorShift)
      },
      weatherResponse: {
        windSensitivity: components.moodMutations.weatherSensitivity,
        lightSeeking: components.therapeuticProperties.joyAmplification,
        waterRetention: components.evolutionaryTraits.resilience,
        seasonalAdaptation: components.evolutionaryTraits.adaptability
      },
      healingProperties: {
        oxygenProduction: components.therapeuticProperties.stressRelief,
        nectarQuality: components.therapeuticProperties.joyAmplification,
        rootStabilization: components.therapeuticProperties.groundingStrength,
        seedProduction: components.therapeuticProperties.resilienceBuilding
      }
    };
  }

  private blendValues(values: number[], weights?: number[]): number {
    if (!weights) weights = new Array(values.length).fill(1 / values.length);
    
    const sum = values.reduce((acc, val, i) => acc + (val * weights![i]), 0);
    return Math.max(0, Math.min(1, sum));
  }

  private generateSecondaryColor(primary: [number, number, number]): [number, number, number] {
    return [
      (primary[0] + 120) % 360, // Complementary hue
      primary[1] * 0.7,         // Lower saturation
      primary[2] * 1.2          // Higher lightness
    ];
  }

  private generateAccentColor(primary: [number, number, number]): [number, number, number] {
    return [
      (primary[0] + 180) % 360, // Opposite hue
      primary[1] * 1.2,         // Higher saturation
      primary[2] * 0.8          // Lower lightness
    ];
  }

  private selectTherapeuticFramework(moodAnalysis: MoodAnalysis): 'CBT' | 'DBT' | 'ACT' | 'Mindfulness' | 'Somatic' {
    if (moodAnalysis.anxiety > 0.7) return 'CBT';
    if (moodAnalysis.stress > 0.8) return 'DBT';
    if (moodAnalysis.emotions.sadness > 0.6) return 'ACT';
    if (moodAnalysis.arousal > 0.8) return 'Somatic';
    return 'Mindfulness';
  }

  private determineGrowthStage(plant: PlantGrowthParameters, userContext: any): 'seed' | 'sprout' | 'sapling' | 'mature' | 'flowering' {
    const maturityScore = plant.height + plant.rootSystem + (userContext.totalMoods || 0) / 100;
    
    if (maturityScore < 0.2) return 'seed';
    if (maturityScore < 0.4) return 'sprout';
    if (maturityScore < 0.7) return 'sapling';
    if (maturityScore < 0.9) return 'mature';
    return 'flowering';
  }

  private generateSymbolicMeaning(plant: PlantGrowthParameters, moodAnalysis: MoodAnalysis): string {
    const meanings = [
      `Your ${plant.species} represents your journey through ${this.getDominantEmotion(moodAnalysis.emotions)}.`,
      `Like this plant, you're growing stronger roots of ${this.getTherapeuticFocus(moodAnalysis)}.`,
      `The ${plant.colorProfile.primary[0] > 180 ? 'cool' : 'warm'} colors reflect your current emotional landscape.`
    ];
    
    return meanings[Math.floor(Math.random() * meanings.length)];
  }

  private generateInterventionSuggestion(
    plant: PlantGrowthParameters,
    moodAnalysis: MoodAnalysis,
    framework: string
  ): string {
    const suggestions = {
      CBT: `Notice how your plant's growth mirrors your thought patterns. When you tend to negative thoughts like pruning dead leaves, new growth emerges.`,
      DBT: `Practice distress tolerance by weathering the storm with your plant - both of you can bend without breaking.`,
      ACT: `Accept your plant's current state while working toward its growth, just as you can accept your current emotions while moving toward your values.`,
      Mindfulness: `Focus on the present moment by observing your plant's details - the texture of leaves, the color variations, the subtle movements.`,
      Somatic: `Feel the grounding energy of your plant's roots extending deep into the earth, and let that stability flow through your own body.`
    };
    
    return suggestions[framework as keyof typeof suggestions] || suggestions.Mindfulness;
  }

  private getDominantEmotion(emotions: any): string {
    return Object.entries(emotions)
      .reduce((max, [emotion, value]) => 
        (value as number) > max.value ? { emotion, value: value as number } : max,
        { emotion: 'balance', value: 0 }
      ).emotion;
  }

  private getTherapeuticFocus(moodAnalysis: MoodAnalysis): string {
    if (moodAnalysis.anxiety > 0.6) return 'calm and stability';
    if (moodAnalysis.emotions.sadness > 0.6) return 'hope and renewal';
    if (moodAnalysis.stress > 0.7) return 'resilience and recovery';
    if (moodAnalysis.emotions.anger > 0.6) return 'peace and understanding';
    return 'growth and flourishing';
  }

  /**
   * Missing Helper Methods for Plant Evolution
   */
  private calculateGrowthRate(newMoodAnalysis: MoodAnalysis, growthHistory: any[]): number {
    // Growth rate based on emotional consistency and positive trends
    const recentMoods = growthHistory.slice(-7); // Last 7 entries
    const consistency = this.calculateMoodConsistency(recentMoods);
    const positiveRatio = recentMoods.filter(m => m.valence > 0).length / Math.max(1, recentMoods.length);
    const currentPositivity = Math.max(0, newMoodAnalysis.valence);
    
    return Math.min(1, (consistency * 0.3) + (positiveRatio * 0.4) + (currentPositivity * 0.3));
  }

  private calculateMoodConsistency(moods: any[]): number {
    if (moods.length < 2) return 0.5;
    
    const valences = moods.map(m => m.valence || 0);
    const mean = valences.reduce((a, b) => a + b, 0) / valences.length;
    const variance = valences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / valences.length;
    
    return Math.max(0, 1 - Math.sqrt(variance)); // Lower variance = higher consistency
  }

  private applyPositiveGrowth(existingPlant: PlantGrowthParameters, newMoodAnalysis: MoodAnalysis): any {
    const positiveBoost = Math.max(0, newMoodAnalysis.valence);
    const joyBoost = newMoodAnalysis.emotions.joy;
    
    return {
      heightIncrease: positiveBoost * 0.05,
      leafDensityIncrease: joyBoost * 0.03,
      bloomBoost: newMoodAnalysis.emotions.joy * 0.1,
      colorBrightening: positiveBoost * 0.02,
      healingPropertyBoost: (positiveBoost + joyBoost) / 2 * 0.05
    };
  }

  private applyStressAdaptations(existingPlant: PlantGrowthParameters, newMoodAnalysis: MoodAnalysis): any {
    const stressLevel = newMoodAnalysis.stress;
    const anxietyLevel = newMoodAnalysis.anxiety;
    
    if (stressLevel > 0.7) {
      // High stress: plant enters protective mode
      return {
        rootStrengthening: stressLevel * 0.1, // Strengthen foundations
        leafThickening: stressLevel * 0.05,   // Protection mechanism
        bloomReduction: stressLevel * -0.03,  // Conservation of energy
        colorMuting: stressLevel * -0.02,     // Less vibrant when stressed
        resilienceBuilding: stressLevel * 0.08 // Long-term adaptation
      };
    } else if (anxietyLevel > 0.6) {
      // Anxiety: plant becomes more sensitive but adaptive
      return {
        windSensitivityIncrease: anxietyLevel * 0.05,
        branchFlexibilityIncrease: anxietyLevel * 0.03,
        lightSeekingIncrease: anxietyLevel * 0.04,
        rootStabilization: anxietyLevel * 0.06
      };
    } else {
      // Normal stress response: gentle strengthening
      return {
        generalResilience: stressLevel * 0.02,
        weatherAdaptation: stressLevel * 0.03
      };
    }
  }

  private applyMaturation(existingPlant: PlantGrowthParameters, growthHistory: any[]): any {
    const ageInDays = growthHistory.length;
    const maturityLevel = Math.min(1, ageInDays / 100); // Mature after 100 days
    
    return {
      structuralComplexity: maturityLevel * 0.1,
      wisdomTraits: maturityLevel * 0.05, // Older plants have healing wisdom
      seasonalAdaptation: maturityLevel * 0.08,
      seedProductionCapacity: maturityLevel * 0.12,
      communityInfluence: maturityLevel * 0.06 // Mature plants help others
    };
  }

  private mergeGrowthFactors(existingPlant: PlantGrowthParameters, growthFactors: any): PlantGrowthParameters {
    const { growthRate, positiveGrowth, stressAdaptations, maturationChanges } = growthFactors;
    
    return {
      ...existingPlant,
      height: Math.min(1, existingPlant.height + (positiveGrowth.heightIncrease || 0) * growthRate),
      branchiness: Math.min(1, existingPlant.branchiness + (stressAdaptations.branchFlexibilityIncrease || 0)),
      leafDensity: Math.min(1, existingPlant.leafDensity + (positiveGrowth.leafDensityIncrease || 0)),
      rootSystem: Math.min(1, existingPlant.rootSystem + (stressAdaptations.rootStrengthening || 0)),
      bloomFrequency: Math.max(0, Math.min(1, existingPlant.bloomFrequency + (positiveGrowth.bloomBoost || 0) + (stressAdaptations.bloomReduction || 0))),
      
      // Update color profile
      colorProfile: {
        ...existingPlant.colorProfile,
        primary: this.adjustColor(existingPlant.colorProfile.primary, positiveGrowth.colorBrightening || 0, stressAdaptations.colorMuting || 0)
      },
      
      // Update weather response
      weatherResponse: {
        ...existingPlant.weatherResponse,
        windSensitivity: Math.min(1, existingPlant.weatherResponse.windSensitivity + (stressAdaptations.windSensitivityIncrease || 0)),
        seasonalAdaptation: Math.min(1, existingPlant.weatherResponse.seasonalAdaptation + (maturationChanges.seasonalAdaptation || 0))
      },
      
      // Update healing properties
      healingProperties: {
        ...existingPlant.healingProperties,
        oxygenProduction: Math.min(1, existingPlant.healingProperties.oxygenProduction + (positiveGrowth.healingPropertyBoost || 0)),
        seedProduction: Math.min(1, existingPlant.healingProperties.seedProduction + (maturationChanges.seedProductionCapacity || 0))
      }
    };
  }

  private adjustColor(baseColor: [number, number, number], brighten: number, mute: number): [number, number, number] {
    const [hue, saturation, lightness] = baseColor;
    
    return [
      hue, // Hue stays the same
      Math.max(0, Math.min(1, saturation + brighten - mute)),
      Math.max(0, Math.min(1, lightness + brighten - mute))
    ];
  }

  /**
   * Synthesize a PlantDNA object directly from mood analysis
   * This is a higher-level method that returns a complete PlantDNA structure
   */
  async synthesizePlantFromMood(moodAnalysis: MoodAnalysis): Promise<PlantDNA> {
    // Generate base plant growth parameters
    const mockBiomeState: BiomeState = {
      biomeType: 'enchanted_forest',
      temperature: 22,
      humidity: 0.6,
      lightLevel: 0.8,
      soilNutrients: {
        nitrogen: 0.7,
        phosphorus: 0.6,
        potassium: 0.8,
        organic: 0.5
      },
      seasonalFactor: 0.7,
      biodiversityIndex: 0.8
    };

    const plantParams = this.generateAdaptivePlant(moodAnalysis, [], mockBiomeState);
    
    // Determine primary emotion for plant generation
    const emotions = moodAnalysis.emotions;
    const primaryEmotion = Object.entries(emotions)
      .reduce((a, b) => emotions[a[0]] > emotions[b[0]] ? a : b)[0];

    // Generate PlantDNA based on mood
    const plantDNA: PlantDNA = {
      id: `plant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      species: this.selectSpeciesFromEmotion(primaryEmotion),
      
      visualTraits: {
        stemColor: this.selectColorFromMood(moodAnalysis, 'stem'),
        leafShape: this.selectLeafShapeFromMood(moodAnalysis),
        leafSize: emotions.joy > 0.6 ? 'large' : emotions.sadness > 0.6 ? 'small' : 'medium',
        flowerColor: this.selectColorFromMood(moodAnalysis, 'flower'),
        flowerShape: this.selectFlowerShapeFromMood(moodAnalysis),
        height: Math.max(0.3, moodAnalysis.arousal),
        width: Math.max(0.3, moodAnalysis.dominance)
      },
      
      growthTraits: {
        speed: Math.max(0.1, moodAnalysis.arousal * 0.8),
        resilience: Math.max(0.2, 1 - moodAnalysis.stress),
        photosensitivity: moodAnalysis.arousal,
        waterNeeds: Math.max(0.3, emotions.sadness + emotions.fear),
        seasonalBehavior: emotions.joy > 0.6 ? 'blooming' : emotions.sadness > 0.5 ? 'deciduous' : 'evergreen'
      },
      
      behaviorTraits: {
        windResponse: Math.max(0.2, emotions.fear + emotions.surprise),
        interactivity: Math.max(0.3, emotions.trust + emotions.joy),
        socialBehavior: emotions.trust > 0.6 ? 'clustering' : emotions.anger > 0.5 ? 'competitive' : 'solitary',
        circadianRhythm: moodAnalysis.arousal
      },
      
      therapeuticMetaphor: await this.generateTherapeuticMetaphor(plantParams, moodAnalysis, {}),
      
      moodAssociation: {
        primaryEmotion,
        secondaryEmotions: Object.entries(emotions)
          .filter(([_, value]) => value > 0.3)
          .sort(([,a], [,b]) => b - a)
          .slice(1, 4)
          .map(([emotion, _]) => emotion),
        therapeuticBenefit: this.getTherapeuticBenefit(primaryEmotion)
      },
      
      generatedFrom: {
        moodAnalysis: 'current_session',
        timestamp: new Date().toISOString(),
        aiModel: 'procedural-v1.0',
        confidence: moodAnalysis.confidence
      }
    };

    return plantDNA;
  }
}

export default new ProceduralPlantService();

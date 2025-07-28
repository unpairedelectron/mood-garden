import type { MoodAnalysis, BiometricData, PlantDNA } from '../types/advanced';
import type { BiomeType } from './PhotorealisticBiomeEngine';

export interface PlantPhysicsProperties {
  id: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  flexibility: number; // 0-1, how much plant bends
  rootStrength: number; // 0-1, resistance to being uprooted
  leafResponsiveness: number; // 0-1, how much leaves react to touch
  growthRate: number; // units per second when touched
  healingRadius: number; // area of therapeutic effect
  
  // Physics simulation properties
  mass: number;
  drag: number;
  elasticity: number;
  collisionLayers: string[];
}

export interface PlantInteraction {
  type: 'touch' | 'water' | 'prune' | 'harvest' | 'plant_seed' | 'whisper';
  location: { x: number; y: number; z: number };
  intensity: number; // 0-1
  duration: number; // seconds
  tools?: string[]; // 'watering_can', 'pruning_shears', 'seeds', etc.
  therapeuticIntent: string; // 'stress_relief', 'growth_encouragement', etc.
}

export interface PlantResponse {
  visualEffect: PlantVisualEffect[];
  audioEffect: PlantAudioEffect[];
  therapeuticFeedback: TherapeuticFeedback;
  growthChange: number; // -1 to 1
  healthChange: number; // -1 to 1
  userBenefit: UserBenefit;
}

export interface PlantVisualEffect {
  type: 'growth_spurt' | 'leaf_shimmer' | 'flower_bloom' | 'color_change' | 'particle_emission' | 'gentle_sway';
  intensity: number;
  duration: number;
  particleSystem?: {
    type: 'healing_sparkles' | 'pollen_release' | 'energy_waves' | 'growth_particles';
    count: number;
    color: string;
    movement: 'upward' | 'outward' | 'spiral' | 'gentle_float';
  };
}

export interface PlantAudioEffect {
  type: 'gentle_rustle' | 'growth_chime' | 'healing_hum' | 'nature_whisper' | 'bloom_bell';
  volume: number; // 0-1
  pitch: number; // Hz
  duration: number;
  spatialPosition: { x: number; y: number; z: number };
}

export interface TherapeuticFeedback {
  message: string;
  affirmation: string;
  insight: string;
  progressUpdate: string;
  moodImpact: { [emotion: string]: number }; // How this interaction affects user emotions
}

export interface UserBenefit {
  stressReduction: number; // 0-1
  moodImprovement: number; // -1 to 1
  connectionStrength: number; // 0-1, bond with plant
  therapeuticProgress: number; // 0-1, progress toward healing goals
  experiencePoints: number; // for gamification
}

export interface HapticFeedback {
  type: 'gentle_pulse' | 'warm_vibration' | 'rhythmic_tap' | 'soothing_wave' | 'growth_pulse';
  intensity: number; // 0-1
  duration: number; // milliseconds
  pattern: number[]; // array of intensity values over time
  synchronizeWith: 'plant_growth' | 'breathing' | 'heartbeat' | 'ambient_sound';
}

/**
 * Week 6: Physics-Based Plant Interaction System
 * 
 * Therapeutic plant interactions with realistic physics, haptic feedback,
 * and biometric-responsive plant behaviors for healing through nature connection.
 * 
 * Features:
 * - Realistic plant physics simulation
 * - Touch-responsive therapeutic interactions
 * - Biometric-driven plant responses
 * - Haptic feedback for emotional regulation
 * - Growth-based therapeutic feedback
 * - Multi-sensory healing experiences
 */
export class PhysicsPlantInteractionEngine {
  private activePlants: Map<string, PlantPhysicsProperties> = new Map();
  private interactionHistory: PlantInteraction[] = [];
  private userBiometrics: BiometricData | null = null;
  private currentMood: MoodAnalysis | null = null;
  private hapticEngine: any = null; // Web Vibration API
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initializePhysicsEngine();
    this.setupHapticSupport();
    this.initializeAudioContext();
  }

  /**
   * Create interactive plants within a biome with physics properties
   */
  public createInteractivePlants(
    biome: BiomeType,
    plantDNAs: PlantDNA[],
    biometricData: BiometricData
  ): PlantPhysicsProperties[] {
    const plants: PlantPhysicsProperties[] = [];
    
    for (let i = 0; i < plantDNAs.length; i++) {
      const plant = this.createPhysicsPlant(plantDNAs[i], biome, i);
      plants.push(plant);
      this.activePlants.set(plant.id, plant);
    }

    console.log(`🌱 Created ${plants.length} interactive plants in ${biome.name}`);
    return plants;
  }

  /**
   * Handle user interaction with plants (touch, water, prune, etc.)
   */
  public async handlePlantInteraction(
    plantId: string,
    interaction: PlantInteraction,
    userMood: MoodAnalysis,
    biometrics: BiometricData
  ): Promise<PlantResponse> {
    const plant = this.activePlants.get(plantId);
    if (!plant) throw new Error(`Plant ${plantId} not found`);

    this.currentMood = userMood;
    this.userBiometrics = biometrics;

    // Calculate plant response based on interaction type and user state
    const response = await this.calculatePlantResponse(plant, interaction, userMood, biometrics);

    // Update plant physics properties
    this.updatePlantPhysics(plant, interaction, response);

    // Trigger visual effects
    this.triggerVisualEffects(plant, response.visualEffect);

    // Play audio feedback
    this.playAudioEffects(response.audioEffect);

    // Provide haptic feedback
    this.triggerHapticFeedback(plant, interaction, response);

    // Update interaction history
    this.interactionHistory.push(interaction);

    console.log(`🤝 Plant interaction: ${interaction.type} with ${plant.id} - therapeutic benefit: ${response.userBenefit.therapeuticProgress.toFixed(2)}`);
    return response;
  }

  /**
   * Generate biometric-responsive plant behaviors
   */
  public updatePlantsBasedOnBiometrics(biometrics: BiometricData): PlantResponse[] {
    const responses: PlantResponse[] = [];

    for (const [plantId, plant] of this.activePlants) {
      const response = this.generateBiometricResponse(plant, biometrics);
      if (response) {
        responses.push(response);
        this.triggerSubtleEffects(plant, response);
      }
    }

    console.log(`💓 ${responses.length} plants responding to biometric changes`);
    return responses;
  }

  /**
   * Create therapeutic micro-interactions (breathing synchronization, heartbeat mirroring)
   */
  public synchronizePlantWithBiometrics(
    plantId: string,
    biometrics: BiometricData,
    syncType: 'breathing' | 'heartbeat' | 'stress_waves'
  ): void {
    const plant = this.activePlants.get(plantId);
    if (!plant) return;

    switch (syncType) {
      case 'breathing':
        this.synchronizeWithBreathing(plant, biometrics.breathingRate);
        break;
      case 'heartbeat':
        this.synchronizeWithHeartbeat(plant, biometrics.heartRate);
        break;
      case 'stress_waves':
        this.synchronizeWithStress(plant, biometrics.stressScore);
        break;
    }

    console.log(`🌊 Plant ${plantId} synchronized with ${syncType}`);
  }

  /**
   * Generate haptic feedback patterns for emotional regulation
   */
  public createEmotionalRegulationHaptics(
    emotion: string,
    intensity: number,
    duration: number
  ): HapticFeedback {
    const patterns: { [key: string]: HapticFeedback } = {
      anxiety: {
        type: 'gentle_pulse',
        intensity: Math.max(0.3, 1 - intensity), // Inverse - gentler for higher anxiety
        duration: duration * 1000,
        pattern: this.generateBreathingPattern(4, 7, 8), // 4-7-8 breathing
        synchronizeWith: 'breathing'
      },
      sadness: {
        type: 'warm_vibration',
        intensity: 0.4,
        duration: duration * 1000,
        pattern: this.generateComfortingPattern(),
        synchronizeWith: 'heartbeat'
      },
      anger: {
        type: 'soothing_wave',
        intensity: 0.6,
        duration: duration * 1000,
        pattern: this.generateCalmingPattern(),
        synchronizeWith: 'breathing'
      },
      joy: {
        type: 'growth_pulse',
        intensity: 0.7,
        duration: duration * 1000,
        pattern: this.generateCelebrationPattern(),
        synchronizeWith: 'plant_growth'
      }
    };

    return patterns[emotion] || patterns.anxiety;
  }

  /**
   * Handle advanced plant interactions (plant whispering, energy transfer)
   */
  public handleAdvancedInteraction(
    plantId: string,
    interactionType: 'energy_transfer' | 'plant_whisper' | 'healing_touch' | 'growth_meditation',
    userState: { mood: MoodAnalysis; biometrics: BiometricData }
  ): PlantResponse {
    const plant = this.activePlants.get(plantId);
    if (!plant) throw new Error(`Plant ${plantId} not found`);

    let response: PlantResponse;

    switch (interactionType) {
      case 'energy_transfer':
        response = this.handleEnergyTransfer(plant, userState);
        break;
      case 'plant_whisper':
        response = this.handlePlantWhisper(plant, userState);
        break;
      case 'healing_touch':
        response = this.handleHealingTouch(plant, userState);
        break;
      case 'growth_meditation':
        response = this.handleGrowthMeditation(plant, userState);
        break;
      default:
        throw new Error(`Unknown interaction type: ${interactionType}`);
    }

    console.log(`✨ Advanced interaction: ${interactionType} completed with therapeutic score: ${response.userBenefit.therapeuticProgress.toFixed(2)}`);
    return response;
  }

  // Helper Methods
  private initializePhysicsEngine(): void {
    // In a real implementation, this would initialize a physics engine like Matter.js or Cannon.js
    console.log('🔧 Physics engine initialized for plant interactions');
  }

  private setupHapticSupport(): void {
    if ('vibrate' in navigator) {
      this.hapticEngine = navigator;
      console.log('📳 Haptic feedback support detected');
    } else {
      console.log('❌ Haptic feedback not supported on this device');
    }
  }

  private initializeAudioContext(): void {
    // Lazy initialization to avoid autoplay restrictions
    document.addEventListener('click', () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 Audio context initialized for plant interactions');
      }
    }, { once: true });
  }

  private createPhysicsPlant(plantDNA: PlantDNA, biome: BiomeType, index: number): PlantPhysicsProperties {
    return {
      id: `${biome.id}_plant_${index}`,
      position: {
        x: (index % 4) * 200 + 100, // Grid layout
        y: 0,
        z: Math.floor(index / 4) * 200 + 100
      },
      dimensions: {
        width: 20 + (plantDNA.growthTraits.maturityLevel * 30),
        height: 30 + (plantDNA.growthTraits.maturityLevel * 50),
        depth: 20 + (plantDNA.growthTraits.maturityLevel * 30)
      },
      flexibility: plantDNA.environmentalAdaptation.windResistance,
      rootStrength: plantDNA.environmentalAdaptation.soilPreference === 'rich' ? 0.8 : 0.6,
      leafResponsiveness: plantDNA.aestheticTraits.leafShape === 'broad' ? 0.9 : 0.7,
      growthRate: plantDNA.growthTraits.bloomCycle / 10,
      healingRadius: 50 + (plantDNA.growthTraits.maturityLevel * 50),
      mass: 1 + plantDNA.growthTraits.maturityLevel,
      drag: 0.95 - (plantDNA.environmentalAdaptation.windResistance * 0.2),
      elasticity: plantDNA.environmentalAdaptation.windResistance * 0.8,
      collisionLayers: ['plants', 'user_interaction', 'environment']
    };
  }

  private async calculatePlantResponse(
    plant: PlantPhysicsProperties,
    interaction: PlantInteraction,
    mood: MoodAnalysis,
    biometrics: BiometricData
  ): Promise<PlantResponse> {
    // Calculate therapeutic effectiveness based on user state and interaction type
    const stressLevel = biometrics.stressScore;
    const moodIntensity = Math.max(...Object.values(mood.emotions));

    let therapeuticMultiplier = 1.0;
    if (interaction.type === 'touch' && stressLevel > 0.7) therapeuticMultiplier = 1.5;
    if (interaction.type === 'water' && mood.emotions.sadness > 0.6) therapeuticMultiplier = 1.3;
    if (interaction.type === 'prune' && mood.emotions.anger > 0.6) therapeuticMultiplier = 1.4;

    const baseTherapeuticValue = interaction.intensity * therapeuticMultiplier;

    return {
      visualEffect: this.generateVisualEffects(plant, interaction, baseTherapeuticValue),
      audioEffect: this.generateAudioEffects(plant, interaction),
      therapeuticFeedback: this.generateTherapeuticFeedback(interaction, mood, baseTherapeuticValue),
      growthChange: Math.min(0.1, baseTherapeuticValue * 0.05),
      healthChange: Math.min(0.1, baseTherapeuticValue * 0.03),
      userBenefit: {
        stressReduction: Math.min(0.2, baseTherapeuticValue * 0.1),
        moodImprovement: Math.min(0.15, baseTherapeuticValue * 0.08),
        connectionStrength: Math.min(0.1, baseTherapeuticValue * 0.05),
        therapeuticProgress: baseTherapeuticValue * 0.02,
        experiencePoints: Math.floor(baseTherapeuticValue * 10)
      }
    };
  }

  private generateVisualEffects(
    plant: PlantPhysicsProperties,
    interaction: PlantInteraction,
    therapeuticValue: number
  ): PlantVisualEffect[] {
    const effects: PlantVisualEffect[] = [];

    // Base interaction effect
    effects.push({
      type: 'gentle_sway',
      intensity: interaction.intensity * 0.8,
      duration: 2 + interaction.duration
    });

    // Therapeutic particle effects
    if (therapeuticValue > 0.5) {
      effects.push({
        type: 'particle_emission',
        intensity: therapeuticValue,
        duration: 3,
        particleSystem: {
          type: 'healing_sparkles',
          count: Math.floor(therapeuticValue * 20),
          color: '#90EE90',
          movement: 'gentle_float'
        }
      });
    }

    // Special effects for high-value interactions
    if (therapeuticValue > 0.8) {
      effects.push({
        type: 'flower_bloom',
        intensity: 1.0,
        duration: 5
      });
    }

    return effects;
  }

  private generateAudioEffects(plant: PlantPhysicsProperties, interaction: PlantInteraction): PlantAudioEffect[] {
    return [{
      type: 'gentle_rustle',
      volume: interaction.intensity * 0.6,
      pitch: 220 + (Math.random() * 110), // Random gentle tones
      duration: interaction.duration,
      spatialPosition: plant.position
    }];
  }

  private generateTherapeuticFeedback(
    interaction: PlantInteraction,
    mood: MoodAnalysis,
    therapeuticValue: number
  ): TherapeuticFeedback {
    const messages: { [key: string]: string[] } = {
      touch: [
        "Your gentle touch helps this plant feel your caring energy.",
        "The plant responds to your compassionate presence.",
        "You're creating a healing connection through touch."
      ],
      water: [
        "Like you, this plant needs nourishment to thrive.",
        "Your care flows through the roots, creating new growth.",
        "Watering is an act of hope and nurturing."
      ],
      prune: [
        "Sometimes we must let go to allow new growth.",
        "Pruning teaches us about healthy boundaries.",
        "You're helping this plant reach its potential."
      ]
    };

    const affirmations = [
      "You are a natural healer.",
      "Your compassion creates positive change.",
      "You have the power to nurture growth.",
      "Your presence makes a difference."
    ];

    const typeMessages = messages[interaction.type] || messages.touch;
    
    return {
      message: typeMessages[Math.floor(Math.random() * typeMessages.length)],
      affirmation: affirmations[Math.floor(Math.random() * affirmations.length)],
      insight: `This interaction generated ${therapeuticValue.toFixed(2)} healing energy.`,
      progressUpdate: therapeuticValue > 0.7 ? "Significant therapeutic progress!" : "Gentle healing progress.",
      moodImpact: {
        joy: Math.min(0.1, therapeuticValue * 0.05),
        stress: -Math.min(0.1, therapeuticValue * 0.08),
        connection: Math.min(0.15, therapeuticValue * 0.1)
      }
    };
  }

  private updatePlantPhysics(plant: PlantPhysicsProperties, interaction: PlantInteraction, response: PlantResponse): void {
    // Update plant growth
    plant.dimensions.height += response.growthChange * 10;
    plant.dimensions.width += response.growthChange * 5;
    
    // Update responsiveness based on interaction history
    plant.leafResponsiveness = Math.min(1, plant.leafResponsiveness + (response.growthChange * 0.1));
  }

  private triggerVisualEffects(plant: PlantPhysicsProperties, effects: PlantVisualEffect[]): void {
    // In a real implementation, this would trigger 3D visual effects
    effects.forEach(effect => {
      console.log(`✨ Visual effect: ${effect.type} on plant ${plant.id} (intensity: ${effect.intensity.toFixed(2)})`);
    });
  }

  private playAudioEffects(effects: PlantAudioEffect[]): void {
    if (!this.audioContext) return;
    
    effects.forEach(effect => {
      // Create simple tone for plant interaction
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.setValueAtTime(effect.pitch, this.audioContext!.currentTime);
      gainNode.gain.setValueAtTime(effect.volume * 0.1, this.audioContext!.currentTime);
      
      oscillator.start();
      oscillator.stop(this.audioContext!.currentTime + effect.duration);
    });
  }

  private triggerHapticFeedback(plant: PlantPhysicsProperties, interaction: PlantInteraction, response: PlantResponse): void {
    if (!this.hapticEngine) return;

    const intensity = Math.floor(response.userBenefit.therapeuticProgress * 300 + 100);
    const duration = Math.floor(interaction.duration * 1000);
    
    this.hapticEngine.vibrate([100, 50, intensity, 50, 100]);
    console.log(`📳 Haptic feedback: intensity ${intensity}, duration ${duration}ms`);
  }

  private generateBiometricResponse(plant: PlantPhysicsProperties, biometrics: BiometricData): PlantResponse | null {
    // Only respond to significant biometric changes
    if (biometrics.stressScore > 0.8) {
      return {
        visualEffect: [{
          type: 'gentle_sway',
          intensity: 0.3,
          duration: 5
        }],
        audioEffect: [],
        therapeuticFeedback: {
          message: "The plants sense your stress and offer their calming presence.",
          affirmation: "You are supported by the natural world around you.",
          insight: "Nature responds to your emotional state.",
          progressUpdate: "Passive therapeutic support activated.",
          moodImpact: { stress: -0.05 }
        },
        growthChange: 0,
        healthChange: 0,
        userBenefit: {
          stressReduction: 0.05,
          moodImprovement: 0.02,
          connectionStrength: 0.01,
          therapeuticProgress: 0.01,
          experiencePoints: 2
        }
      };
    }
    return null;
  }

  private triggerSubtleEffects(plant: PlantPhysicsProperties, response: PlantResponse): void {
    console.log(`🌿 Subtle biometric response from plant ${plant.id}`);
  }

  private synchronizeWithBreathing(plant: PlantPhysicsProperties, breathingRate: number): void {
    const breathingPeriod = 60 / breathingRate; // seconds per breath
    console.log(`🌬️ Plant ${plant.id} synchronized with breathing (${breathingRate} breaths/min)`);
  }

  private synchronizeWithHeartbeat(plant: PlantPhysicsProperties, heartRate: number): void {
    const heartPeriod = 60 / heartRate; // seconds per beat
    console.log(`💓 Plant ${plant.id} synchronized with heartbeat (${heartRate} BPM)`);
  }

  private synchronizeWithStress(plant: PlantPhysicsProperties, stressLevel: number): void {
    console.log(`🌊 Plant ${plant.id} synchronized with stress waves (level: ${stressLevel.toFixed(2)})`);
  }

  private generateBreathingPattern(inhale: number, hold: number, exhale: number): number[] {
    const pattern = [];
    const totalDuration = inhale + hold + exhale;
    
    // Inhale phase
    for (let i = 0; i < inhale; i++) {
      pattern.push(0.1 + (i / inhale) * 0.3);
    }
    // Hold phase
    for (let i = 0; i < hold; i++) {
      pattern.push(0.4);
    }
    // Exhale phase
    for (let i = 0; i < exhale; i++) {
      pattern.push(0.4 - (i / exhale) * 0.3);
    }
    
    return pattern;
  }

  private generateComfortingPattern(): number[] {
    return [0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2, 0.1];
  }

  private generateCalmingPattern(): number[] {
    return [0.6, 0.4, 0.2, 0.1, 0.1, 0.2, 0.4, 0.6];
  }

  private generateCelebrationPattern(): number[] {
    return [0.8, 0.6, 0.8, 0.4, 0.8, 0.6, 0.8];
  }

  // Advanced interaction handlers
  private handleEnergyTransfer(plant: PlantPhysicsProperties, userState: any): PlantResponse {
    return {
      visualEffect: [{
        type: 'particle_emission',
        intensity: 0.9,
        duration: 8,
        particleSystem: {
          type: 'energy_waves',
          count: 30,
          color: '#FFD700',
          movement: 'spiral'
        }
      }],
      audioEffect: [{
        type: 'healing_hum',
        volume: 0.5,
        pitch: 432, // Healing frequency
        duration: 8,
        spatialPosition: plant.position
      }],
      therapeuticFeedback: {
        message: "You've shared your life energy with this plant, creating a powerful healing bond.",
        affirmation: "Your energy has the power to heal and transform.",
        insight: "Energy transfer deepens your connection with nature.",
        progressUpdate: "Advanced therapeutic milestone achieved!",
        moodImpact: { connection: 0.2, peace: 0.15 }
      },
      growthChange: 0.15,
      healthChange: 0.1,
      userBenefit: {
        stressReduction: 0.3,
        moodImprovement: 0.2,
        connectionStrength: 0.25,
        therapeuticProgress: 0.1,
        experiencePoints: 50
      }
    };
  }

  private handlePlantWhisper(plant: PlantPhysicsProperties, userState: any): PlantResponse {
    return {
      visualEffect: [{
        type: 'leaf_shimmer',
        intensity: 0.7,
        duration: 6
      }],
      audioEffect: [{
        type: 'nature_whisper',
        volume: 0.3,
        pitch: 220,
        duration: 6,
        spatialPosition: plant.position
      }],
      therapeuticFeedback: {
        message: "Your words of encouragement help this plant grow stronger and more beautiful.",
        affirmation: "Your voice carries healing power.",
        insight: "Plants respond to positive intentions and loving words.",
        progressUpdate: "Communication bond strengthened.",
        moodImpact: { connection: 0.15, joy: 0.1 }
      },
      growthChange: 0.08,
      healthChange: 0.05,
      userBenefit: {
        stressReduction: 0.15,
        moodImprovement: 0.12,
        connectionStrength: 0.18,
        therapeuticProgress: 0.06,
        experiencePoints: 30
      }
    };
  }

  private handleHealingTouch(plant: PlantPhysicsProperties, userState: any): PlantResponse {
    return {
      visualEffect: [{
        type: 'growth_spurt',
        intensity: 0.8,
        duration: 10
      }],
      audioEffect: [{
        type: 'growth_chime',
        volume: 0.4,
        pitch: 528, // Love frequency
        duration: 10,
        spatialPosition: plant.position
      }],
      therapeuticFeedback: {
        message: "Your healing touch accelerates growth and strengthens this plant's life force.",
        affirmation: "You are a natural healer with powerful hands.",
        insight: "Touch is a fundamental form of therapeutic communication.",
        progressUpdate: "Healing mastery developing.",
        moodImpact: { healing: 0.25, connection: 0.2 }
      },
      growthChange: 0.2,
      healthChange: 0.15,
      userBenefit: {
        stressReduction: 0.25,
        moodImprovement: 0.18,
        connectionStrength: 0.22,
        therapeuticProgress: 0.08,
        experiencePoints: 40
      }
    };
  }

  private handleGrowthMeditation(plant: PlantPhysicsProperties, userState: any): PlantResponse {
    return {
      visualEffect: [
        {
          type: 'color_change',
          intensity: 0.6,
          duration: 15
        },
        {
          type: 'particle_emission',
          intensity: 0.5,
          duration: 15,
          particleSystem: {
            type: 'growth_particles',
            count: 25,
            color: '#98FB98',
            movement: 'upward'
          }
        }
      ],
      audioEffect: [{
        type: 'healing_hum',
        volume: 0.2,
        pitch: 396, // Liberation frequency
        duration: 15,
        spatialPosition: plant.position
      }],
      therapeuticFeedback: {
        message: "Together in meditation, you and this plant reach a state of harmonious growth.",
        affirmation: "Your mindful presence creates transformation.",
        insight: "Meditation amplifies the healing power of nature connection.",
        progressUpdate: "Deep therapeutic state achieved.",
        moodImpact: { peace: 0.3, mindfulness: 0.25, connection: 0.2 }
      },
      growthChange: 0.12,
      healthChange: 0.1,
      userBenefit: {
        stressReduction: 0.4,
        moodImprovement: 0.25,
        connectionStrength: 0.3,
        therapeuticProgress: 0.12,
        experiencePoints: 60
      }
    };
  }

  // Getters
  public getActivePlants(): Map<string, PlantPhysicsProperties> { return this.activePlants; }
  public getInteractionHistory(): PlantInteraction[] { return this.interactionHistory; }
}

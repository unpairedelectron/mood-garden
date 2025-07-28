import type { MoodAnalysis, BiometricData } from '../types/advanced';
import type { BiomeType } from './PhotorealisticBiomeEngine';

export interface MetaHumanPersonality {
  id: string;
  name: string;
  archetype: 'wise_guide' | 'nurturing_healer' | 'playful_spirit' | 'calm_guardian' | 'creative_muse';
  appearance: {
    age: 'young_adult' | 'middle_aged' | 'elder';
    ethnicity: string;
    style: 'ethereal' | 'natural' | 'mystical' | 'modern' | 'timeless';
    clothing: string;
    accessories: string[];
  };
  voice: {
    tone: 'soothing' | 'encouraging' | 'gentle' | 'wise' | 'playful';
    pace: 'slow' | 'moderate' | 'varied';
    accent: string;
  };
  therapeuticSpecialty: string[];
  preferredBiomes: string[];
}

export interface CompanionInteraction {
  type: 'greeting' | 'mood_response' | 'guidance' | 'encouragement' | 'activity_suggestion' | 'farewell';
  content: string;
  emotionalTone: 'supportive' | 'empathetic' | 'inspiring' | 'calming' | 'playful';
  triggers: string[];
  animations: CompanionAnimation[];
  duration: number; // seconds
}

export interface CompanionAnimation {
  type: 'gesture' | 'facial_expression' | 'movement' | 'plant_interaction' | 'environmental';
  name: string;
  intensity: number; // 0-1
  duration: number;
  synchronized_with_speech: boolean;
}

export interface CompanionState {
  currentMood: 'calm' | 'concerned' | 'encouraging' | 'joyful' | 'contemplative';
  attentionLevel: number; // 0-1, how focused on user
  interactionHistory: CompanionInteraction[];
  relationshipLevel: number; // 0-100, trust/connection with user
  adaptationScore: number; // How well adapted to user's needs
}

/**
 * Week 6: MetaHuman Therapeutic Companion System
 * 
 * AI-driven virtual companions that provide personalized therapeutic support,
 * emotional guidance, and interactive healing experiences within biomes.
 * 
 * Features:
 * - 5 distinct therapeutic companion archetypes
 * - Real-time emotional response to user mood
 * - Biome-specific interactions and guidance
 * - Adaptive personality based on user preferences
 * - Progressive relationship building
 * - Therapeutic intervention delivery
 */
export class MetaHumanCompanionService {
  private companions: MetaHumanPersonality[];
  private currentCompanion: MetaHumanPersonality | null = null;
  private companionState: CompanionState;
  private userPreferences: any = {};
  private interactionEngine: any = null;

  constructor() {
    this.companions = this.initializeCompanions();
    this.companionState = this.initializeState();
  }

  /**
   * Initialize the 5 therapeutic companion archetypes
   */
  private initializeCompanions(): MetaHumanPersonality[] {
    return [
      {
        id: 'sage_elena',
        name: 'Elena',
        archetype: 'wise_guide',
        appearance: {
          age: 'middle_aged',
          ethnicity: 'Mediterranean',
          style: 'timeless',
          clothing: 'Flowing earth-toned robes with natural textures',
          accessories: ['wooden staff with crystal', 'herb pouch', 'meditation beads']
        },
        voice: {
          tone: 'wise',
          pace: 'slow',
          accent: 'soft_mediterranean'
        },
        therapeuticSpecialty: ['anxiety', 'life_transitions', 'spiritual_guidance', 'perspective_shifting'],
        preferredBiomes: ['mountain_sanctuary', 'enchanted_forest', 'arctic_aurora']
      },
      {
        id: 'healer_amara',
        name: 'Amara',
        archetype: 'nurturing_healer',
        appearance: {
          age: 'young_adult',
          ethnicity: 'African',
          style: 'natural',
          clothing: 'Soft botanical prints with healing symbols',
          accessories: ['flower crown', 'healing crystals', 'herbal sachets']
        },
        voice: {
          tone: 'soothing',
          pace: 'moderate',
          accent: 'warm_african'
        },
        therapeuticSpecialty: ['depression', 'self_care', 'emotional_healing', 'trauma_recovery'],
        preferredBiomes: ['tranquil_ocean', 'enchanted_forest', 'golden_savanna']
      },
      {
        id: 'spirit_kai',
        name: 'Kai',
        archetype: 'playful_spirit',
        appearance: {
          age: 'young_adult',
          ethnicity: 'East_Asian',
          style: 'modern',
          clothing: 'Vibrant colors with nature-inspired patterns',
          accessories: ['butterfly clips', 'wind chimes', 'colorful scarves']
        },
        voice: {
          tone: 'playful',
          pace: 'varied',
          accent: 'gentle_asian'
        },
        therapeuticSpecialty: ['joy_cultivation', 'creativity', 'social_anxiety', 'inner_child_healing'],
        preferredBiomes: ['mystic_realm', 'golden_savanna', 'enchanted_forest']
      },
      {
        id: 'guardian_thor',
        name: 'Thor',
        archetype: 'calm_guardian',
        appearance: {
          age: 'middle_aged',
          ethnicity: 'Nordic',
          style: 'natural',
          clothing: 'Sturdy outdoor wear with protective symbols',
          accessories: ['carved wooden amulets', 'leather bracers', 'compass']
        },
        voice: {
          tone: 'gentle',
          pace: 'slow',
          accent: 'gentle_nordic'
        },
        therapeuticSpecialty: ['grounding', 'resilience', 'fear_management', 'emotional_stability'],
        preferredBiomes: ['mountain_sanctuary', 'healing_desert', 'arctic_aurora']
      },
      {
        id: 'muse_aria',
        name: 'Aria',
        archetype: 'creative_muse',
        appearance: {
          age: 'young_adult',
          ethnicity: 'Latin_American',
          style: 'ethereal',
          clothing: 'Flowing fabrics that shimmer with creative energy',
          accessories: ['artist brushes', 'musical notes tattoos', 'prism pendant']
        },
        voice: {
          tone: 'encouraging',
          pace: 'varied',
          accent: 'melodic_latin'
        },
        therapeuticSpecialty: ['creative_expression', 'self_discovery', 'inspiration', 'artistic_healing'],
        preferredBiomes: ['mystic_realm', 'golden_savanna', 'tranquil_ocean']
      }
    ];
  }

  /**
   * Select optimal companion based on user mood and therapeutic needs
   */
  public selectOptimalCompanion(
    moodAnalysis: MoodAnalysis, 
    biometricData: BiometricData, 
    currentBiome: BiomeType
  ): MetaHumanPersonality {
    let bestCompanion = this.companions[0];
    let bestScore = 0;

    for (const companion of this.companions) {
      const score = this.calculateCompanionFit(companion, moodAnalysis, biometricData, currentBiome);
      if (score > bestScore) {
        bestScore = score;
        bestCompanion = companion;
      }
    }

    this.currentCompanion = bestCompanion;
    console.log(`👤 Selected companion: ${bestCompanion.name} (${bestCompanion.archetype}) - fit score: ${bestScore.toFixed(2)}`);
    
    return bestCompanion;
  }

  /**
   * Generate contextual interaction based on user state and environment
   */
  public generateCompanionInteraction(
    type: CompanionInteraction['type'],
    moodAnalysis: MoodAnalysis,
    biometricData: BiometricData,
    currentBiome: BiomeType
  ): CompanionInteraction {
    if (!this.currentCompanion) {
      this.currentCompanion = this.selectOptimalCompanion(moodAnalysis, biometricData, currentBiome);
    }

    const interaction = this.createContextualInteraction(
      type, 
      this.currentCompanion, 
      moodAnalysis, 
      biometricData, 
      currentBiome
    );

    // Update companion state based on interaction
    this.updateCompanionState(interaction, moodAnalysis);

    console.log(`💬 ${this.currentCompanion.name}: "${interaction.content.substring(0, 50)}..."`);
    return interaction;
  }

  /**
   * Update companion animations based on user interaction
   */
  public updateCompanionAnimations(
    userAction: 'plant_touch' | 'mood_input' | 'biome_change' | 'time_cycle' | 'weather_change',
    intensity: number
  ): CompanionAnimation[] {
    if (!this.currentCompanion) return [];

    const animations: CompanionAnimation[] = [];

    switch (userAction) {
      case 'plant_touch':
        animations.push({
          type: 'gesture',
          name: 'encouraging_nod',
          intensity: 0.7,
          duration: 2,
          synchronized_with_speech: false
        });
        animations.push({
          type: 'plant_interaction',
          name: 'gentle_plant_blessing',
          intensity,
          duration: 3,
          synchronized_with_speech: true
        });
        break;

      case 'mood_input':
        animations.push({
          type: 'facial_expression',
          name: intensity > 0.7 ? 'concerned_listening' : 'empathetic_understanding',
          intensity: Math.max(0.5, intensity),
          duration: 4,
          synchronized_with_speech: true
        });
        break;

      case 'biome_change':
        animations.push({
          type: 'environmental',
          name: 'biome_appreciation_gesture',
          intensity: 0.8,
          duration: 5,
          synchronized_with_speech: false
        });
        break;

      case 'weather_change':
        animations.push({
          type: 'movement',
          name: 'weather_interaction',
          intensity: intensity * 0.8,
          duration: 3,
          synchronized_with_speech: false
        });
        break;
    }

    console.log(`🎭 ${this.currentCompanion.name} animations: ${animations.length} sequences`);
    return animations;
  }

  /**
   * Provide therapeutic guidance based on current user state
   */
  public provideTherapeuticGuidance(
    moodAnalysis: MoodAnalysis,
    biometricData: BiometricData,
    currentBiome: BiomeType
  ): CompanionInteraction {
    if (!this.currentCompanion) {
      this.currentCompanion = this.selectOptimalCompanion(moodAnalysis, biometricData, currentBiome);
    }

    const guidanceType = this.determineGuidanceType(moodAnalysis, biometricData);
    const guidance = this.createTherapeuticGuidance(guidanceType, this.currentCompanion, currentBiome);

    console.log(`🧭 ${this.currentCompanion.name} providing ${guidanceType} guidance`);
    return guidance;
  }

  /**
   * Build relationship level through continued interactions
   */
  public updateRelationship(interactionQuality: number, userEngagement: number): void {
    const relationshipGain = (interactionQuality * userEngagement) * 2;
    this.companionState.relationshipLevel = Math.min(100, this.companionState.relationshipLevel + relationshipGain);
    
    // Unlock new interaction types at higher relationship levels
    if (this.companionState.relationshipLevel >= 25 && !this.hasUnlockedFeature('deep_conversations')) {
      this.unlockFeature('deep_conversations');
    }
    if (this.companionState.relationshipLevel >= 50 && !this.hasUnlockedFeature('personal_stories')) {
      this.unlockFeature('personal_stories');
    }
    if (this.companionState.relationshipLevel >= 75 && !this.hasUnlockedFeature('advanced_guidance')) {
      this.unlockFeature('advanced_guidance');
    }

    console.log(`❤️ Relationship with ${this.currentCompanion?.name}: ${this.companionState.relationshipLevel.toFixed(1)}/100`);
  }

  // Helper Methods
  private initializeState(): CompanionState {
    return {
      currentMood: 'calm',
      attentionLevel: 0.8,
      interactionHistory: [],
      relationshipLevel: 0,
      adaptationScore: 0.5
    };
  }

  private calculateCompanionFit(
    companion: MetaHumanPersonality,
    moodAnalysis: MoodAnalysis,
    biometricData: BiometricData,
    currentBiome: BiomeType
  ): number {
    let score = 0;

    // Biome compatibility
    if (companion.preferredBiomes.includes(currentBiome.id)) {
      score += 0.3;
    }

    // Therapeutic specialty match
    const primaryEmotion = this.getPrimaryEmotion(moodAnalysis);
    if (companion.therapeuticSpecialty.includes(primaryEmotion)) {
      score += 0.4;
    }

    // Stress level compatibility
    const stressLevel = biometricData.stressScore;
    if (companion.archetype === 'calm_guardian' && stressLevel > 0.7) score += 0.2;
    if (companion.archetype === 'nurturing_healer' && moodAnalysis.emotions.sadness > 0.6) score += 0.2;
    if (companion.archetype === 'playful_spirit' && moodAnalysis.emotions.joy < 0.3) score += 0.2;

    // User preference bonus (simplified)
    if (this.userPreferences.preferredArchetype === companion.archetype) {
      score += 0.1;
    }

    return score;
  }

  private createContextualInteraction(
    type: CompanionInteraction['type'],
    companion: MetaHumanPersonality,
    moodAnalysis: MoodAnalysis,
    biometricData: BiometricData,
    currentBiome: BiomeType
  ): CompanionInteraction {
    const templates = this.getInteractionTemplates(companion, type, currentBiome);
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Personalize based on user state
    const personalizedContent = this.personalizeContent(selectedTemplate, moodAnalysis, biometricData);

    return {
      type,
      content: personalizedContent,
      emotionalTone: this.determineEmotionalTone(companion, moodAnalysis),
      triggers: [type, companion.archetype, currentBiome.id],
      animations: this.generateContextualAnimations(type, companion),
      duration: this.calculateInteractionDuration(personalizedContent)
    };
  }

  private getInteractionTemplates(
    companion: MetaHumanPersonality,
    type: CompanionInteraction['type'],
    biome: BiomeType
  ): string[] {
    const templates: { [key: string]: { [key: string]: string[] } } = {
      wise_guide: {
        greeting: [
          `Welcome to the ${biome.name}, dear one. I sense you carry both wisdom and worry today.`,
          `The ${biome.name} has been waiting for you. Let us explore what it wishes to teach.`,
          `I am Elena, your guide in this sacred space. What brings you to seek solace here?`
        ],
        mood_response: [
          `I hear the depth of your experience. The ${biome.name} mirrors your inner landscape.`,
          `Your emotions are like the weather - they pass through, but they do not define you.`,
          `In this moment of feeling, remember: you are both the observer and the observed.`
        ],
        guidance: [
          `Consider this: what if your current challenge is actually your path to growth?`,
          `The ancient wisdom of this place suggests we breathe deeply and listen within.`,
          `Let the energy of the ${biome.name} remind you of your own natural resilience.`
        ]
      },
      nurturing_healer: {
        greeting: [
          `Hello, beautiful soul. I'm Amara, and I'm here to hold space for whatever you're feeling.`,
          `This ${biome.name} is a place of healing, just like your heart. You are so welcome here.`,
          `I see you, I feel your presence, and I want you to know that you are enough, exactly as you are.`
        ],
        mood_response: [
          `Your feelings are so valid, and I'm honored that you're sharing this space with me.`,
          `The ${biome.name} wraps around us like a gentle embrace, holding us both in healing.`,
          `I feel the tenderness in your heart. Let's give it the love and attention it deserves.`
        ],
        guidance: [
          `What if we started with one small act of kindness toward yourself today?`,
          `The plants here grow slowly, with patience. Your healing can unfold the same way.`,
          `Remember: healing isn't linear. Some days we rest, some days we grow.`
        ]
      }
    };

    const archetypeTemplates = templates[companion.archetype] || templates.wise_guide;
    return archetypeTemplates[type] || archetypeTemplates.greeting;
  }

  private personalizeContent(
    template: string,
    moodAnalysis: MoodAnalysis,
    biometricData: BiometricData
  ): string {
    // Simple personalization based on mood intensity
    const moodIntensity = Math.max(...Object.values(moodAnalysis.emotions));
    
    if (moodIntensity > 0.8) {
      return template + " I can sense the intensity of what you're experiencing right now.";
    } else if (moodIntensity < 0.3) {
      return template + " There's a gentle quality to your energy today.";
    }
    
    return template;
  }

  private updateCompanionState(interaction: CompanionInteraction, moodAnalysis: MoodAnalysis): void {
    // Update companion mood based on user interaction
    if (moodAnalysis.emotions.sadness > 0.7) {
      this.companionState.currentMood = 'concerned';
    } else if (moodAnalysis.emotions.joy > 0.6) {
      this.companionState.currentMood = 'joyful';
    } else {
      this.companionState.currentMood = 'calm';
    }

    // Add to interaction history
    this.companionState.interactionHistory.push(interaction);
    if (this.companionState.interactionHistory.length > 10) {
      this.companionState.interactionHistory.shift();
    }

    // Update attention level
    this.companionState.attentionLevel = Math.min(1, this.companionState.attentionLevel + 0.1);
  }

  private determineGuidanceType(moodAnalysis: MoodAnalysis, biometricData: BiometricData): string {
    if (biometricData.stressScore > 0.7) return 'stress_relief';
    if (moodAnalysis.emotions.sadness > 0.6) return 'emotional_support';
    if (moodAnalysis.emotions.fear > 0.6) return 'grounding';
    if (moodAnalysis.emotions.anger > 0.6) return 'perspective_shift';
    return 'general_wellness';
  }

  private createTherapeuticGuidance(
    guidanceType: string,
    companion: MetaHumanPersonality,
    biome: BiomeType
  ): CompanionInteraction {
    const guidanceTemplates: { [key: string]: string[] } = {
      stress_relief: [
        `Let's try something together. Feel the ground beneath you in this ${biome.name}, and take three deep breaths with me.`,
        `The ${biome.name} teaches us about natural rhythms. What if we slowed down to match its pace?`,
        `I notice tension in your energy. Would you like to explore a gentle releasing technique?`
      ],
      emotional_support: [
        `Your emotions are like the weather in our ${biome.name} - they're real, they matter, and they will shift.`,
        `I want to remind you that feeling deeply is a sign of your beautiful humanity.`,
        `In this safe space of the ${biome.name}, all of your feelings are welcome.`
      ],
      grounding: [
        `Let's anchor together in this moment. What are three things you can see in our ${biome.name}?`,
        `Feel the stability of this earth beneath us. You are held, you are safe, you are here.`,
        `The ${biome.name} has weathered many storms and still stands strong. So do you.`
      ]
    };

    const templates = guidanceTemplates[guidanceType] || guidanceTemplates.emotional_support;
    const content = templates[Math.floor(Math.random() * templates.length)];

    return {
      type: 'guidance',
      content,
      emotionalTone: 'supportive',
      triggers: [guidanceType, companion.archetype],
      animations: [{
        type: 'gesture',
        name: 'supportive_gesture',
        intensity: 0.7,
        duration: 4,
        synchronized_with_speech: true
      }],
      duration: content.length / 15 // Approximate reading time
    };
  }

  private generateContextualAnimations(
    type: CompanionInteraction['type'],
    companion: MetaHumanPersonality
  ): CompanionAnimation[] {
    const baseAnimations: { [key: string]: CompanionAnimation } = {
      greeting: {
        type: 'gesture',
        name: 'welcoming_gesture',
        intensity: 0.8,
        duration: 3,
        synchronized_with_speech: true
      },
      guidance: {
        type: 'facial_expression',
        name: 'compassionate_expression',
        intensity: 0.9,
        duration: 5,
        synchronized_with_speech: true
      }
    };

    return [baseAnimations[type] || baseAnimations.greeting];
  }

  private determineEmotionalTone(
    companion: MetaHumanPersonality,
    moodAnalysis: MoodAnalysis
  ): CompanionInteraction['emotionalTone'] {
    if (companion.archetype === 'playful_spirit') return 'playful';
    if (moodAnalysis.emotions.sadness > 0.6) return 'empathetic';
    if (moodAnalysis.emotions.fear > 0.6) return 'calming';
    if (moodAnalysis.emotions.joy > 0.6) return 'inspiring';
    return 'supportive';
  }

  private calculateInteractionDuration(content: string): number {
    return Math.max(3, content.length / 20); // Minimum 3 seconds, then based on reading time
  }

  private getPrimaryEmotion(moodAnalysis: MoodAnalysis): string {
    const emotions = moodAnalysis.emotions;
    const maxEmotion = Math.max(...Object.values(emotions));
    
    for (const [emotion, value] of Object.entries(emotions)) {
      if (value === maxEmotion) {
        return emotion === 'sadness' ? 'depression' : 
               emotion === 'fear' ? 'anxiety' :
               emotion === 'anger' ? 'resilience' : 'joy_cultivation';
      }
    }
    return 'general_wellness';
  }

  private hasUnlockedFeature(feature: string): boolean {
    // Simplified feature tracking
    return this.companionState.relationshipLevel >= this.getFeatureUnlockLevel(feature);
  }

  private unlockFeature(feature: string): void {
    console.log(`🔓 Unlocked companion feature: ${feature}`);
  }

  private getFeatureUnlockLevel(feature: string): number {
    const levels: { [key: string]: number } = {
      deep_conversations: 25,
      personal_stories: 50,
      advanced_guidance: 75
    };
    return levels[feature] || 100;
  }

  // Getters
  public getCurrentCompanion(): MetaHumanPersonality | null { return this.currentCompanion; }
  public getCompanionState(): CompanionState { return this.companionState; }
  public getAllCompanions(): MetaHumanPersonality[] { return this.companions; }
}

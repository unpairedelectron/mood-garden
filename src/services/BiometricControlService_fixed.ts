import { AdvancedAIService } from './AdvancedAIService';
import { 
  BiometricData, 
  MoodAnalysis, 
  PrivacyControls,
  TherapeuticMetaphor 
} from '../types/advanced';

export interface BiometricThreshold {
  parameter: string;
  normal_range: [number, number];
  warning_level: number;
  critical_level: number;
  intervention_required: boolean;
}

export interface EmotionRecognitionResult {
  primary_emotion: string;
  confidence: number;
  emotion_spectrum: Record<string, number>;
  stress_indicators: string[];
  therapeutic_priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface BiometricSafetyProtocol {
  trigger_conditions: string[];
  immediate_actions: string[];
  monitoring_duration: number;
  escalation_path: string[];
  recovery_indicators: string[];
}

export interface AdaptiveResponse {
  garden_adjustments: {
    biome_transition: string;
    lighting_intensity: number;
    particle_density: number;
    companion_activation: string[];
    plant_responsiveness: number;
    audio_therapy_mode: string;
  };
  companion_behavior: {
    interaction_style: string;
    response_timing: number;
    emotional_support_level: number;
    therapeutic_intervention: string;
    voice_modulation: {
      tone: string;
      pace: string;
      volume: string;
    };
  };
  therapeutic_exercises: {
    breathing_guidance: {
      pattern: string;
      duration: number;
      visual_cues: boolean;
      haptic_guidance: boolean;
    } | null;
    grounding_techniques: string[];
    mindfulness_prompts: string[];
    movement_suggestions: string[];
    cognitive_reframing: string[];
  };
}

export class BiometricControlService {
  private eventEmitter: EventTarget;
  private biometricThresholds: Map<string, BiometricThreshold>;
  private safetyProtocols: Map<string, BiometricSafetyProtocol>;
  private aiService: AdvancedAIService;
  private sensors: Map<string, any> = new Map();
  private emotionModel: any = null;
  private adaptationEngine: any = null;
  private biometricHistory: BiometricData[] = [];
  private emergencyThresholds: Record<string, number> = {};
  private calibrationData: Record<string, any> = {};

  constructor() {
    this.eventEmitter = new EventTarget();
    this.biometricThresholds = new Map();
    this.safetyProtocols = new Map();
    this.aiService = new AdvancedAIService();
    this.initializeEmergencyThresholds();
    this.initializeBiometricMonitoring();
    this.initializeSafetyProtocols();
  }

  private initializeEmergencyThresholds(): void {
    this.emergencyThresholds = {
      heart_rate_max: 180,
      heart_rate_min: 40,
      stress_level_critical: 0.9,
      panic_indicators_threshold: 3,
      depression_risk_threshold: 0.8
    };
  }

  private initializeBiometricMonitoring(): void {
    // Initialize biometric monitoring with realistic thresholds
    this.biometricThresholds.set('heart_rate', {
      parameter: 'heart_rate',
      normal_range: [60, 100],
      warning_level: 120,
      critical_level: 150,
      intervention_required: true
    });

    this.biometricThresholds.set('stress_level', {
      parameter: 'stress_level',
      normal_range: [0, 0.3],
      warning_level: 0.6,
      critical_level: 0.8,
      intervention_required: true
    });
  }

  private initializeSafetyProtocols(): void {
    this.safetyProtocols.set('panic_attack', {
      trigger_conditions: ['elevated_heart_rate', 'rapid_breathing', 'high_stress'],
      immediate_actions: ['breathing_exercise', 'grounding_technique', 'companion_support'],
      monitoring_duration: 300000, // 5 minutes
      escalation_path: ['crisis_resources', 'emergency_contacts'],
      recovery_indicators: ['stabilized_breathing', 'reduced_heart_rate']
    });
  }

  // Main biometric analysis method
  async analyzeBiometricInput(inputData: {
    text?: string;
    voice?: Blob;
    biometric?: BiometricData;
    privacy: PrivacyControls;
  }): Promise<EmotionRecognitionResult> {
    
    const emotions: Record<string, number> = {
      joy: 0,
      sadness: 0,
      anxiety: 0,
      anger: 0,
      fear: 0,
      calm: 0
    };

    // Process text input
    if (inputData.text && inputData.privacy.allow_sentiment_analysis) {
      const textAnalysis = await this.aiService.analyzeMood(inputData.text);
      Object.assign(emotions, textAnalysis.emotions);
    }

    // Process voice input and calculate weighted emotions
    if (inputData.voice && inputData.privacy.allow_voice_analysis) {
      const weights = this.calculateEmotionWeights(inputData);
      console.log('Emotion weights calculated:', weights);
      // Apply weights to emotion detection
      Object.keys(emotions).forEach(emotion => {
        if (weights[emotion]) {
          emotions[emotion] *= weights[emotion];
        }
      });
    }

    // Process biometric data
    if (inputData.biometric && inputData.privacy.allow_biometric_analysis) {
      this.processBiometricData(inputData.biometric);
    }

    // Determine primary emotion and confidence
    const primaryEmotion = Object.entries(emotions)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    const confidence = emotions[primaryEmotion];
    
    // Detect stress indicators
    const stressIndicators = this.detectStressIndicators(inputData);
    
    // Determine therapeutic priority
    const therapeuticPriority = this.calculateTherapeuticPriority(emotions, stressIndicators);

    return {
      primary_emotion: primaryEmotion,
      confidence,
      emotion_spectrum: emotions,
      stress_indicators: stressIndicators,
      therapeutic_priority: therapeuticPriority
    };
  }

  private processBiometricData(data: BiometricData): void {
    // Store in history
    this.biometricHistory.push(data);
    
    // Keep only last 100 entries
    if (this.biometricHistory.length > 100) {
      this.biometricHistory.shift();
    }

    // Check for emergency conditions
    this.checkEmergencyConditions(data);
    
    // Trigger adaptive responses
    this.triggerAdaptiveResponses(data);
  }

  private checkEmergencyConditions(data: BiometricData): void {
    const emergencyConditions: string[] = [];

    // Check heart rate
    if (data.heart_rate > this.emergencyThresholds.heart_rate_max ||
        data.heart_rate < this.emergencyThresholds.heart_rate_min) {
      emergencyConditions.push('critical_heart_rate');
    }

    // Check stress level
    if (data.stress_level > this.emergencyThresholds.stress_level_critical) {
      emergencyConditions.push('extreme_stress');
    }

    // Check for panic indicators
    if (data.stress_indicators.length >= this.emergencyThresholds.panic_indicators_threshold) {
      emergencyConditions.push('panic_attack_detected');
    }

    if (emergencyConditions.length > 0) {
      this.handleEmergencyConditions(emergencyConditions, data);
    }
  }

  private handleEmergencyConditions(conditions: string[], data: BiometricData): void {
    conditions.forEach(condition => {
      switch (condition) {
        case 'panic_attack_detected':
          this.handlePanicAttackProtocol(data);
          break;
        case 'extreme_stress':
          this.handleSevereAnxietyProtocol(data);
          break;
        case 'critical_heart_rate':
          this.handleCriticalVitalsProtocol(data);
          break;
      }
    });
  }

  private handlePanicAttackProtocol(data: BiometricData): AdaptiveResponse {
    // Use biometric data to customize the response
    const severity = data.stress_indicators.includes('elevated_heart_rate') ? 'high' : 'medium';
    
    return {
      garden_adjustments: {
        biome_transition: 'tranquil_ocean',
        lighting_intensity: 0.3,
        particle_density: 0.1,
        companion_activation: ['sage_elena', 'guardian_thor'],
        plant_responsiveness: 1.5,
        audio_therapy_mode: 'panic_relief'
      },
      companion_behavior: {
        interaction_style: 'immediate_grounding',
        response_timing: 0.5,
        emotional_support_level: 1.0,
        therapeutic_intervention: 'breathing_guidance',
        voice_modulation: { tone: 'calm', pace: 'slow', volume: 'soft' }
      },
      therapeutic_exercises: {
        breathing_guidance: {
          pattern: '4-7-8',
          duration: severity === 'high' ? 600 : 300, // 5-10 minutes
          visual_cues: true,
          haptic_guidance: true
        },
        grounding_techniques: ['5-4-3-2-1_sensory', 'feet_on_ground', 'name_objects'],
        mindfulness_prompts: ['focus_on_breath', 'notice_safety', 'present_moment'],
        movement_suggestions: ['gentle_stretching', 'progressive_relaxation'],
        cognitive_reframing: this.generateCognitiveFrames(data)
      }
    };
  }

  private handleSevereAnxietyProtocol(data: BiometricData): AdaptiveResponse {
    // Customize based on anxiety level from biometric data
    return {
      garden_adjustments: {
        biome_transition: 'serene_forest',
        lighting_intensity: 0.5,
        particle_density: 0.2,
        companion_activation: ['wise_owl', 'gentle_deer'],
        plant_responsiveness: 1.2,
        audio_therapy_mode: 'anxiety_relief'
      },
      companion_behavior: {
        interaction_style: 'supportive_presence',
        response_timing: 1.0,
        emotional_support_level: 0.8,
        therapeutic_intervention: 'mindfulness_guidance',
        voice_modulation: { tone: 'warm', pace: 'steady', volume: 'moderate' }
      },
      therapeutic_exercises: {
        breathing_guidance: {
          pattern: 'box_breathing',
          duration: 300,
          visual_cues: true,
          haptic_guidance: false
        },
        grounding_techniques: ['body_scan', 'progressive_muscle_relaxation'],
        mindfulness_prompts: ['observe_thoughts', 'accept_feelings', 'focus_present'],
        movement_suggestions: ['gentle_yoga', 'walking_meditation'],
        cognitive_reframing: ['challenge_thoughts', 'find_evidence', 'reframe_positive']
      }
    };
  }

  private handleDepressionProtocol(data: BiometricData): AdaptiveResponse {
    // Adjust based on depression indicators in biometric data
    return {
      garden_adjustments: {
        biome_transition: 'sunrise_meadow',
        lighting_intensity: 0.7,
        particle_density: 0.4,
        companion_activation: ['energetic_butterfly', 'playful_rabbit'],
        plant_responsiveness: 0.8,
        audio_therapy_mode: 'mood_lifting'
      },
      companion_behavior: {
        interaction_style: 'gentle_encouragement',
        response_timing: 2.0,
        emotional_support_level: 0.9,
        therapeutic_intervention: 'behavioral_activation',
        voice_modulation: { tone: 'encouraging', pace: 'upbeat', volume: 'warm' }
      },
      therapeutic_exercises: {
        breathing_guidance: {
          pattern: 'energizing_breath',
          duration: 180,
          visual_cues: true,
          haptic_guidance: true
        },
        grounding_techniques: ['gratitude_practice', 'strength_identification'],
        mindfulness_prompts: ['notice_beauty', 'acknowledge_progress', 'value_self'],
        movement_suggestions: ['energizing_stretches', 'light_dance', 'nature_walk'],
        cognitive_reframing: ['positive_affirmations', 'achievement_recognition', 'hope_building']
      }
    };
  }

  private handleTraumaTriggerProtocol(data: BiometricData): AdaptiveResponse {
    // Trauma-informed response based on trigger indicators
    return {
      garden_adjustments: {
        biome_transition: 'safe_sanctuary',
        lighting_intensity: 0.4,
        particle_density: 0.05,
        companion_activation: ['protective_guardian', 'healing_sage'],
        plant_responsiveness: 2.0,
        audio_therapy_mode: 'trauma_safety'
      },
      companion_behavior: {
        interaction_style: 'trauma_informed',
        response_timing: 0.3,
        emotional_support_level: 1.0,
        therapeutic_intervention: 'safety_grounding',
        voice_modulation: { tone: 'gentle', pace: 'very_slow', volume: 'quiet' }
      },
      therapeutic_exercises: {
        breathing_guidance: {
          pattern: 'trauma_safe_breathing',
          duration: 420,
          visual_cues: true,
          haptic_guidance: true
        },
        grounding_techniques: ['safety_affirmations', 'body_awareness', 'environmental_grounding'],
        mindfulness_prompts: ['notice_safety', 'present_moment', 'self_compassion'],
        movement_suggestions: ['gentle_movement', 'self_soothing', 'containment_exercises'],
        cognitive_reframing: ['trauma_reframes', 'safety_reminders', 'strength_acknowledgment']
      }
    };
  }

  private handleCriticalVitalsProtocol(data: BiometricData): void {
    // Handle critical vital signs
    console.warn('Critical vitals detected:', data);
    
    // Emit emergency event
    this.eventEmitter.dispatchEvent(new CustomEvent('critical_vitals', {
      detail: { data, timestamp: new Date() }
    }));
  }

  private triggerAdaptiveResponses(data: BiometricData): void {
    const adaptations = this.calculateAdaptiveResponses(data);
    this.implementAdaptations(adaptations);
    this.emitAdaptationUpdate(adaptations);
  }

  private calculateAdaptiveResponses(data: BiometricData): AdaptiveResponse {
    // Determine appropriate therapeutic intervention based on biometric data
    if (data.stress_indicators.includes('panic_attack')) {
      return this.handlePanicAttackProtocol(data);
    } else if (data.stress_level > 0.7) {
      return this.handleSevereAnxietyProtocol(data);
    } else if (data.stress_indicators.includes('depression_indicators')) {
      return this.handleDepressionProtocol(data);
    } else if (data.stress_indicators.includes('trauma_trigger')) {
      return this.handleTraumaTriggerProtocol(data);
    }

    // Default calming response
    return {
      garden_adjustments: {
        biome_transition: 'peaceful_garden',
        lighting_intensity: 0.6,
        particle_density: 0.3,
        companion_activation: ['friendly_bird', 'calm_cat'],
        plant_responsiveness: 1.0,
        audio_therapy_mode: 'general_wellness'
      },
      companion_behavior: {
        interaction_style: 'supportive',
        response_timing: 1.5,
        emotional_support_level: 0.6,
        therapeutic_intervention: 'general_support',
        voice_modulation: { tone: 'neutral', pace: 'normal', volume: 'comfortable' }
      },
      therapeutic_exercises: {
        breathing_guidance: null,
        grounding_techniques: ['simple_breathing', 'mindful_observation'],
        mindfulness_prompts: ['present_awareness', 'gentle_focus'],
        movement_suggestions: ['light_stretching'],
        cognitive_reframing: ['positive_thoughts', 'self_care_reminders']
      }
    };
  }

  private implementAdaptations(adaptations: AdaptiveResponse): void {
    // Implement the adaptive changes in the garden environment
    console.log('Implementing biometric adaptations:', adaptations);
    
    // This would integrate with the garden rendering engine
    // For now, we'll just log the adaptations
  }

  private emitAdaptationUpdate(adaptations: AdaptiveResponse): void {
    this.eventEmitter.dispatchEvent(new CustomEvent('adaptation_update', {
      detail: adaptations
    }));
  }

  private processMotionData(magnitude: number, event: DeviceMotionEvent): void {
    // Process motion sensor data for stress/anxiety detection
    const motionData = {
      magnitude,
      acceleration: event.acceleration,
      rotationRate: event.rotationRate,
      timestamp: Date.now()
    };

    // Analyze motion patterns for stress indicators
    if (magnitude > 2.0) {
      console.log('High motion detected, possible agitation');
    }
  }

  private calculateEmotionWeights(inputData: any): Record<string, number> {
    // Calculate emotion weights based on input data
    const weights: Record<string, number> = {
      joy: 1.0,
      sadness: 1.0,
      anxiety: 1.0,
      anger: 1.0,
      fear: 1.0,
      calm: 1.0
    };

    // Adjust weights based on voice tone, text sentiment, etc.
    if (inputData.voice) {
      // Voice analysis would adjust weights
      weights.anxiety *= 1.2; // Example adjustment
    }

    return weights;
  }

  private detectStressIndicators(inputData: any): string[] {
    const indicators: string[] = [];
    
    // Analyze various input types for stress indicators
    if (inputData.biometric) {
      const bio = inputData.biometric;
      if (bio.heart_rate > 100) indicators.push('elevated_heart_rate');
      if (bio.stress_level > 0.6) indicators.push('high_stress_level');
    }

    return indicators;
  }

  private generateTherapeuticRecommendations(inputData: any): string[] {
    const recommendations: string[] = [];
    
    // Generate personalized therapeutic recommendations
    if (inputData.biometric?.stress_level > 0.5) {
      recommendations.push('breathing_exercise', 'mindfulness_practice');
    }
    
    return recommendations;
  }

  private generateCognitiveFrames(data: BiometricData): string[] {
    // Generate cognitive reframing suggestions based on biometric data
    const frames: string[] = [];
    
    if (data.stress_indicators.includes('panic_attack')) {
      frames.push('this_feeling_will_pass', 'i_am_safe_right_now', 'my_body_is_protecting_me');
    } else if (data.stress_level > 0.7) {
      frames.push('i_can_handle_this', 'one_step_at_a_time', 'breathing_helps_me_calm');
    }
    
    return frames.length > 0 ? frames : ['i_am_doing_my_best', 'progress_not_perfection'];
  }

  private calculateTherapeuticPriority(emotions: Record<string, number>, stressIndicators: string[]): 'low' | 'medium' | 'high' | 'urgent' {
    // Calculate therapeutic priority based on emotions and stress indicators
    if (stressIndicators.includes('panic_attack') || emotions.fear > 0.8) {
      return 'urgent';
    } else if (emotions.anxiety > 0.6 || emotions.sadness > 0.7) {
      return 'high';
    } else if (emotions.anger > 0.5 || stressIndicators.length > 1) {
      return 'medium';
    }
    return 'low';
  }

  // Public API methods
  public async startBiometricMonitoring(): Promise<void> {
    console.log('Starting biometric monitoring...');
    // Initialize device sensors, camera, microphone access
  }

  public async stopBiometricMonitoring(): Promise<void> {
    console.log('Stopping biometric monitoring...');
    // Clean up sensor access
  }

  public getBiometricHistory(): BiometricData[] {
    return [...this.biometricHistory];
  }

  public addEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(type, listener);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(type, listener);
  }
}

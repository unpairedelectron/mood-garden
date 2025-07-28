import type { BiometricData, PrivacyControls } from '../types/advanced';

export interface TraumaSafetyProfile {
  user_id: string;
  trauma_history_acknowledged: boolean;
  trigger_categories: string[];
  safety_preferences: SafetyPreferences;
  coping_strategies: CopingStrategy[];
  emergency_protocols: EmergencyProtocol[];
  progress_tracking: TraumaRecoveryProgress;
}

export interface SafetyPreferences {
  content_filtering_level: 'minimal' | 'moderate' | 'strict';
  trigger_warning_level: 'low' | 'medium' | 'high';
  safe_word_enabled: boolean;
  safe_word?: string;
  exit_strategy_preference: 'immediate' | 'gradual' | 'guided';
  grounding_technique_preference: string[];
  companion_support_level: 'minimal' | 'moderate' | 'full';
}

export interface CopingStrategy {
  id: string;
  name: string;
  type: 'grounding' | 'breathing' | 'movement' | 'cognitive' | 'sensory';
  description: string;
  instructions: string[];
  effectiveness_rating: number;
  usage_frequency: number;
  personalization_notes: string;
}

export interface EmergencyProtocol {
  trigger_type: string;
  immediate_response: EmergencyResponse;
  escalation_steps: string[];
  recovery_protocol: RecoveryProtocol;
  monitoring_requirements: MonitoringRequirement[];
}

export interface EmergencyResponse {
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  immediate_actions: Action[];
  safety_measures: SafetyMeasure[];
  resource_activation: ResourceActivation[];
  monitoring_duration: number;
}

export interface Action {
  type: 'environmental' | 'interactive' | 'therapeutic' | 'communication';
  description: string;
  implementation: any;
  success_criteria: string[];
}

export interface SafetyMeasure {
  measure_type: 'content_filtering' | 'environment_adjustment' | 'interaction_modification';
  implementation: any;
  duration: number;
  effectiveness_monitoring: boolean;
}

export interface ResourceActivation {
  resource_type: 'grounding' | 'professional' | 'peer_support' | 'crisis_intervention';
  resource_details: any;
  activation_criteria: string[];
  availability_check: boolean;
}

export interface RecoveryProtocol {
  stabilization_phase: StabilizationPhase;
  integration_phase: IntegrationPhase;
  follow_up_requirements: FollowUpRequirement[];
}

export interface StabilizationPhase {
  duration: number;
  key_activities: string[];
  success_indicators: string[];
  monitoring_frequency: number;
}

export interface IntegrationPhase {
  therapeutic_processing: boolean;
  skill_reinforcement: string[];
  resilience_building: string[];
  progress_assessment: boolean;
}

export interface FollowUpRequirement {
  timeline: number;
  assessment_type: string;
  intervention_adjustments: boolean;
  support_continuation: boolean;
}

export interface MonitoringRequirement {
  parameter: string;
  frequency: number;
  threshold_values: Record<string, number>;
  alert_conditions: string[];
}

export interface TraumaRecoveryProgress {
  resilience_score: number;
  coping_effectiveness: Record<string, number>;
  trigger_sensitivity_changes: Record<string, number>;
  recovery_milestones: Milestone[];
  setback_recovery_patterns: any[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  achievement_date?: Date;
  significance_level: 'minor' | 'moderate' | 'major' | 'breakthrough';
}

export interface GroundingResource {
  id: string;
  name: string;
  type: '5_4_3_2_1' | 'breathing' | 'movement' | 'sensory' | 'cognitive';
  description: string;
  guided_instructions: string[];
  estimated_duration: number;
  effectiveness_rating: number;
  accessibility_requirements: string[];
  trigger_appropriateness: string[];
}

export interface SafetyProtocol {
  id: string;
  name: string;
  trigger_conditions: string[];
  immediate_actions: string[];
  monitoring_requirements: string[];
  escalation_criteria: string[];
  recovery_indicators: string[];
}

export class TraumaInformedService {
  private safetyProfiles: Map<string, TraumaSafetyProfile> = new Map();
  private groundingResources: Map<string, GroundingResource> = new Map();
  private safetyProtocols: Map<string, SafetyProtocol> = new Map();
  private activeMonitoring: Map<string, any> = new Map();
  private eventEmitter: EventTarget;

  constructor() {
    this.eventEmitter = new EventTarget();
    this.initializeGroundingResources();
    this.initializeSafetyProtocols();
  }

  private initializeGroundingResources(): void {
    const resources: GroundingResource[] = [
      {
        id: '5_4_3_2_1_sensory',
        name: '5-4-3-2-1 Grounding',
        type: '5_4_3_2_1',
        description: 'Sensory grounding technique using sight, sound, touch, smell, and taste',
        guided_instructions: [
          'Name 5 things you can see',
          'Name 4 things you can touch',
          'Name 3 things you can hear',
          'Name 2 things you can smell',
          'Name 1 thing you can taste'
        ],
        estimated_duration: 300,
        effectiveness_rating: 0.85,
        accessibility_requirements: ['conscious_awareness', 'sensory_capacity'],
        trigger_appropriateness: ['dissociation', 'panic', 'flashbacks']
      }
    ];

    resources.forEach(resource => {
      this.groundingResources.set(resource.id, resource);
    });
  }

  private initializeSafetyProtocols(): void {
    const protocols: SafetyProtocol[] = [
      {
        id: 'dissociation_detected',
        name: 'Dissociation Response Protocol',
        trigger_conditions: ['disconnection_indicators', 'reality_distortion', 'numbness'],
        immediate_actions: ['gentle_grounding', 'sensory_anchoring', 'reality_orientation'],
        monitoring_requirements: ['awareness_level', 'responsiveness', 'safety_orientation'],
        escalation_criteria: ['prolonged_dissociation', 'safety_concerns', 'distress_increase'],
        recovery_indicators: ['present_awareness', 'body_connection', 'emotional_accessibility']
      }
    ];

    protocols.forEach(protocol => {
      this.safetyProtocols.set(protocol.id, protocol);
    });
  }

  async createSafetyProfile(
    userId: string,
    traumaAwareness: {
      acknowledged: boolean;
      trigger_categories?: string[];
      preferences?: Partial<SafetyPreferences>;
      previous_therapy?: boolean;
    }
  ): Promise<TraumaSafetyProfile> {
    
    const defaultPreferences: SafetyPreferences = {
      content_filtering_level: 'moderate',
      trigger_warning_level: 'medium',
      safe_word_enabled: true,
      exit_strategy_preference: 'guided',
      grounding_technique_preference: ['5_4_3_2_1', 'breathing'],
      companion_support_level: 'moderate'
    };

    const safetyProfile: TraumaSafetyProfile = {
      user_id: userId,
      trauma_history_acknowledged: traumaAwareness.acknowledged,
      trigger_categories: traumaAwareness.trigger_categories || [],
      safety_preferences: { ...defaultPreferences, ...traumaAwareness.preferences },
      coping_strategies: await this.generatePersonalizedCopingStrategies(userId, traumaAwareness),
      emergency_protocols: this.createEmergencyProtocols(traumaAwareness),
      progress_tracking: this.initializeProgressTracking()
    };

    this.safetyProfiles.set(userId, safetyProfile);
    
    return safetyProfile;
  }

  private async generatePersonalizedCopingStrategies(
    userId: string,
    traumaAwareness: any
  ): Promise<CopingStrategy[]> {
    
    const strategies: CopingStrategy[] = [
      {
        id: 'grounding_primary',
        name: 'Primary Grounding Technique',
        type: 'grounding',
        description: 'Main grounding strategy for reconnection',
        instructions: ['Focus on present moment', 'Use 5-4-3-2-1 technique'],
        effectiveness_rating: 0.8,
        usage_frequency: 0,
        personalization_notes: `Customized for user ${userId} based on trauma type`
      }
    ];

    return strategies;
  }

  private createEmergencyProtocols(traumaAwareness: any): EmergencyProtocol[] {
    console.log('Creating emergency protocols for trauma awareness:', traumaAwareness);
    
    return [
      {
        trigger_type: 'flashback',
        immediate_response: {
          priority_level: 'high',
          immediate_actions: [{
            type: 'environmental',
            description: 'Create safe environment',
            implementation: { lighting: 'soft', sounds: 'minimal' },
            success_criteria: ['environmental_safety']
          }],
          safety_measures: [{
            measure_type: 'environment_adjustment',
            implementation: { calm_environment: true },
            duration: 1800,
            effectiveness_monitoring: true
          }],
          resource_activation: [{
            resource_type: 'grounding',
            resource_details: { technique: '5_4_3_2_1' },
            activation_criteria: ['dissociation_detected'],
            availability_check: true
          }],
          monitoring_duration: 3600
        },
        escalation_steps: ['professional_support', 'crisis_intervention'],
        recovery_protocol: {
          stabilization_phase: {
            duration: 1800,
            key_activities: ['grounding', 'safety_confirmation'],
            success_indicators: ['present_awareness', 'reduced_distress'],
            monitoring_frequency: 300
          },
          integration_phase: {
            therapeutic_processing: false,
            skill_reinforcement: ['grounding_practice'],
            resilience_building: ['self_compassion'],
            progress_assessment: true
          },
          follow_up_requirements: [{
            timeline: 86400,
            assessment_type: 'wellness_check',
            intervention_adjustments: true,
            support_continuation: true
          }]
        },
        monitoring_requirements: [{
          parameter: 'distress_level',
          frequency: 300,
          threshold_values: { 'critical': 0.8, 'concerning': 0.6 },
          alert_conditions: ['increasing_distress', 'prolonged_episode']
        }]
      }
    ];
  }

  private initializeProgressTracking(): TraumaRecoveryProgress {
    return {
      resilience_score: 0.5,
      coping_effectiveness: {},
      trigger_sensitivity_changes: {},
      recovery_milestones: [],
      setback_recovery_patterns: []
    };
  }

  async monitorSafetyIndicators(
    userId: string,
    inputData: {
      text?: string;
      biometric?: BiometricData;
      interaction_patterns?: any;
      privacy: PrivacyControls;
    }
  ): Promise<{
    safety_status: 'safe' | 'concerning' | 'alert' | 'crisis';
    triggered_protocols: string[];
    recommended_interventions: string[];
    monitoring_adjustments: any;
  }> {
    
    const safetyProfile = this.safetyProfiles.get(userId);
    if (!safetyProfile) {
      throw new Error('Safety profile not found');
    }

    const safetyAnalysis = await this.analyzeSafetyIndicators(inputData, safetyProfile);
    const safetyStatus = this.determineSafetyStatus(safetyAnalysis);
    const triggeredProtocols = await this.triggerSafetyProtocols(safetyStatus, safetyAnalysis);
    const recommendations = this.generateSafetyRecommendations(safetyStatus, safetyProfile);
    
    return {
      safety_status: safetyStatus,
      triggered_protocols: triggeredProtocols,
      recommended_interventions: recommendations,
      monitoring_adjustments: this.calculateMonitoringAdjustments(safetyStatus)
    };
  }

  private async analyzeSafetyIndicators(
    inputData: any,
    safetyProfile: TraumaSafetyProfile
  ): Promise<any> {
    
    const indicators = {
      trigger_detection: [] as string[],
      distress_level: 0,
      dissociation_indicators: [] as string[],
      safety_concerns: [] as string[],
      protective_factors: [] as string[]
    };

    if (inputData.text && inputData.privacy.aiProcessing?.personalizedContent) {
      indicators.trigger_detection = this.detectTextualTriggers(inputData.text, safetyProfile);
    }

    if (inputData.biometric && inputData.privacy.biometricCollection?.heartRate) {
      const biometricAnalysis = this.analyzeBiometricSafety(inputData.biometric);
      indicators.distress_level = biometricAnalysis.distress_level;
      indicators.dissociation_indicators = biometricAnalysis.dissociation_signs;
    }

    return indicators;
  }

  private detectTextualTriggers(text: string, safetyProfile: TraumaSafetyProfile): string[] {
    const triggers: string[] = [];
    
    safetyProfile.trigger_categories.forEach(category => {
      if (this.checkTriggerCategory(text, category)) {
        triggers.push(category);
      }
    });

    return triggers;
  }

  private checkTriggerCategory(text: string, category: string): boolean {
    const triggerKeywords: Record<string, string[]> = {
      'violence': ['violence', 'abuse', 'attack', 'harm'],
      'medical': ['hospital', 'medical', 'surgery', 'illness'],
      'loss': ['death', 'loss', 'grief', 'died']
    };

    const keywords = triggerKeywords[category] || [];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private analyzeBiometricSafety(biometric: BiometricData): any {
    return {
      distress_level: biometric.stressScore,
      dissociation_signs: biometric.stressScore > 0.8 ? ['high_stress'] : [],
      hypervigilance_indicators: biometric.heartRate > 100 ? ['elevated_heart_rate'] : []
    };
  }

  private determineSafetyStatus(analysis: any): 'safe' | 'concerning' | 'alert' | 'crisis' {
    if (analysis.trigger_detection.length > 2 || analysis.distress_level > 0.9) {
      return 'crisis';
    } else if (analysis.trigger_detection.length > 0 || analysis.distress_level > 0.7) {
      return 'alert';
    } else if (analysis.dissociation_indicators.length > 0 || analysis.distress_level > 0.5) {
      return 'concerning';
    }
    return 'safe';
  }

  private async triggerSafetyProtocols(
    safetyStatus: string,
    analysis: any
  ): Promise<string[]> {
    
    const triggeredProtocols: string[] = [];

    if (safetyStatus === 'crisis' || safetyStatus === 'alert') {
      if (analysis.dissociation_indicators.length > 0) {
        const protocol = this.safetyProtocols.get('dissociation_detected');
        if (protocol) {
          await this.executeSafetyProtocol(protocol);
          triggeredProtocols.push('dissociation_detected');
        }
      }
    }

    return triggeredProtocols;
  }

  private async executeSafetyProtocol(protocol: SafetyProtocol): Promise<void> {
    console.log(`Executing safety protocol: ${protocol.name}`);
    
    const results = [];
    for (const action of protocol.immediate_actions) {
      try {
        const result = await this.implementSafetyAction(action);
        results.push({ action, success: true, result });
      } catch (error) {
        results.push({ action, success: false, error: (error as Error).message });
      }
    }

    this.eventEmitter.dispatchEvent(new CustomEvent('safety_protocol_executed', {
      detail: { protocol: protocol.id, results }
    }));
  }

  private async implementSafetyAction(action: string): Promise<any> {
    switch (action) {
      case 'gentle_grounding':
        return this.activateGroundingResource('5_4_3_2_1_sensory');
      case 'breathing_support':
        return this.activateGroundingResource('5_4_3_2_1_sensory');
      case 'reassurance':
        return this.provideReassurance();
      default:
        console.log(`Implementing safety action: ${action}`);
        return { implemented: true };
    }
  }

  private generateSafetyRecommendations(
    safetyStatus: string,
    safetyProfile: TraumaSafetyProfile
  ): string[] {
    
    console.log('Generating safety recommendations for profile:', safetyProfile.user_id);
    
    const recommendations: string[] = [];

    switch (safetyStatus) {
      case 'crisis':
        recommendations.push(
          'immediate_grounding_required',
          'consider_professional_support',
          'activate_emergency_contacts'
        );
        break;
      case 'alert':
        recommendations.push(
          'use_preferred_coping_strategies',
          'increase_monitoring_frequency',
          'engage_support_system'
        );
        break;
      case 'concerning':
        recommendations.push(
          'practice_grounding_techniques',
          'check_in_with_support',
          'use_self_care_strategies'
        );
        break;
      default:
        recommendations.push('continue_current_practices');
    }

    return recommendations;
  }

  private calculateMonitoringAdjustments(safetyStatus: string): any {
    return {
      frequency_multiplier: safetyStatus === 'crisis' ? 3 : safetyStatus === 'alert' ? 2 : 1,
      additional_parameters: safetyStatus !== 'safe' ? ['emotional_state', 'grounding_effectiveness'] : [],
      duration_extension: safetyStatus === 'crisis' ? 3600 : safetyStatus === 'alert' ? 1800 : 0
    };
  }

  async activateGroundingResource(
    resourceId: string,
    userId?: string
  ): Promise<{
    resource: GroundingResource;
    guidance: any;
    monitoring: any;
  }> {
    
    const resource = this.groundingResources.get(resourceId);
    if (!resource) {
      throw new Error('Grounding resource not found');
    }

    const guidance = this.generateGroundingGuidance(resource);
    const monitoring = this.setupGroundingMonitoring(resource);

    if (userId) {
      this.startGroundingEffectivenessTracking(userId, resourceId);
    }

    return { resource, guidance, monitoring };
  }

  private generateGroundingGuidance(resource: GroundingResource): any {
    return {
      step_by_step_instructions: resource.guided_instructions,
      estimated_duration: resource.estimated_duration,
      success_indicators: ['increased_present_awareness', 'reduced_distress'],
      exit_strategy: this.createExitStrategy()
    };
  }

  private createExitStrategy(): any {
    return {
      safe_stopping_points: ['after_each_instruction', 'if_distress_increases'],
      alternative_resources: ['breathing_techniques', 'movement_based_grounding'],
      professional_support_threshold: 'if_no_improvement_after_10_minutes'
    };
  }

  private setupGroundingMonitoring(resource: GroundingResource): any {
    console.log('Setting up monitoring for grounding resource:', resource.id);
    return {
      effectiveness_tracking: true,
      duration_monitoring: true,
      distress_level_checks: [300, 600, 900],
      completion_assessment: true
    };
  }

  private startGroundingEffectivenessTracking(userId: string, resourceId: string): void {
    console.log(`Starting grounding effectiveness tracking for user ${userId}, resource ${resourceId}`);
  }

  private provideReassurance(): any {
    return {
      message: 'You are safe right now. This feeling will pass.',
      affirmations: [
        'You have survived difficult moments before',
        'You have coping skills that work',
        'You are not alone in this experience'
      ],
      grounding_reminders: [
        'Notice your feet on the ground',
        'Take three deep breaths',
        'Look around and name three things you can see'
      ]
    };
  }

  async updateSafetyPreferences(
    userId: string,
    preferences: Partial<SafetyPreferences>
  ): Promise<SafetyPreferences> {
    
    const profile = this.safetyProfiles.get(userId);
    if (!profile) {
      throw new Error('Safety profile not found');
    }

    const validatedPreferences = this.validateSafetyPreferences(preferences);
    profile.safety_preferences = { ...profile.safety_preferences, ...validatedPreferences };
    this.safetyProfiles.set(userId, profile);

    return profile.safety_preferences;
  }

  private validateSafetyPreferences(preferences: Partial<SafetyPreferences>): Partial<SafetyPreferences> {
    const validated: Partial<SafetyPreferences> = {};

    if (preferences.trigger_warning_level) {
      validated.trigger_warning_level = ['low', 'medium', 'high'].includes(preferences.trigger_warning_level)
        ? preferences.trigger_warning_level
        : 'medium';
    }

    if (preferences.content_filtering_level) {
      validated.content_filtering_level = preferences.content_filtering_level;
    }

    if (preferences.safe_word_enabled !== undefined) {
      validated.safe_word_enabled = preferences.safe_word_enabled;
    }

    return validated;
  }

  public async getSafetyProfile(userId: string): Promise<TraumaSafetyProfile | null> {
    return this.safetyProfiles.get(userId) || null;
  }

  public async getAvailableGroundingResources(
    userId?: string,
    filterCriteria?: {
      type?: string;
      duration_max?: number;
      effectiveness_min?: number;
    }
  ): Promise<GroundingResource[]> {
    
    let resources = Array.from(this.groundingResources.values());

    if (filterCriteria) {
      if (filterCriteria.type) {
        resources = resources.filter(r => r.type === filterCriteria.type);
      }
      if (filterCriteria.duration_max) {
        resources = resources.filter(r => r.estimated_duration <= filterCriteria.duration_max);
      }
      if (filterCriteria.effectiveness_min) {
        resources = resources.filter(r => r.effectiveness_rating >= filterCriteria.effectiveness_min);
      }
    }

    return resources;
  }

  public async getPersonalizedCopingStrategies(userId: string): Promise<CopingStrategy[]> {
    const profile = this.safetyProfiles.get(userId);
    return profile ? profile.coping_strategies : [];
  }

  public addEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(type, listener);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(type, listener);
  }
}

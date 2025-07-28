import type { BiometricData } from '../types/advanced';

export interface CBTSkill {
  id: string;
  name: string;
  category: 'cognitive' | 'behavioral';
  description: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  exercises: CBTExercise[];
  mastery_criteria: MasteryCriteria;
}

export interface DBTSkill {
  id: string;
  name: string;
  module: 'mindfulness' | 'distress_tolerance' | 'emotion_regulation' | 'interpersonal_effectiveness';
  description: string;
  practices: DBTPractice[];
  real_world_applications: string[];
}

export interface CBTExercise {
  id: string;
  name: string;
  type: 'thought_record' | 'behavioral_experiment' | 'cognitive_restructuring';
  steps: ExerciseStep[];
  estimated_time: number;
  therapeutic_benefits: string[];
}

export interface DBTPractice {
  id: string;
  name: string;
  type: 'mindfulness' | 'distress_tolerance' | 'emotion_regulation' | 'interpersonal';
  guided_instructions: string[];
  practice_prompts: string[];
  integration_tips: string[];
}

export interface ExerciseStep {
  step_number: number;
  instruction: string;
  user_input_required: boolean;
  input_type?: 'text' | 'rating' | 'multiple_choice' | 'reflection';
  validation_criteria?: string[];
}

export interface MasteryCriteria {
  completion_threshold: number;
  consistency_requirement: number;
  quality_indicators: string[];
  progression_markers: string[];
}

export interface GamificationElement {
  user_level: number;
  experience_points: number;
  skill_badges: Badge[];
  achievement_streaks: Record<string, number>;
  progress_milestones: Milestone[];
  leaderboard_position?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  earned_date?: Date;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completion_percentage: number;
  rewards: Reward[];
  unlock_requirements: string[];
}

export interface Reward {
  type: 'badge' | 'points' | 'unlock' | 'customization';
  value: any;
  description: string;
}

export interface TherapeuticSession {
  session_id: string;
  skill_focus: string;
  difficulty_level: string;
  personalization_factors: Record<string, any>;
  progress_tracking: ProgressMetrics;
  adaptive_adjustments: AdaptiveAdjustment[];
}

export interface ProgressMetrics {
  completion_rate: number;
  engagement_score: number;
  skill_improvement: Record<string, number>;
  consistency_streak: number;
  mastery_indicators: string[];
}

export interface AdaptiveAdjustment {
  adjustment_type: 'difficulty' | 'pacing' | 'content' | 'support';
  reason: string;
  implementation: any;
  effectiveness_measure: number;
}

export class CBTDBTGamificationService {
  private skillsFramework: {
    cbt_skills: Record<string, CBTSkill>;
    dbt_skills: Record<string, DBTSkill>;
  };
  private userProgress: Map<string, ProgressMetrics> = new Map();
  private gamificationData: GamificationElement = this.initializeGamification();
  private eventEmitter: EventTarget;

  constructor() {
    this.eventEmitter = new EventTarget();
    this.skillsFramework = this.initializeTherapeuticFramework();
  }

  private initializeGamification(): GamificationElement {
    return {
      user_level: 1,
      experience_points: 0,
      skill_badges: [],
      achievement_streaks: {},
      progress_milestones: [],
      leaderboard_position: undefined
    };
  }

  private initializeTherapeuticFramework(): any {
    return {
      cbt_skills: {
        'thought_awareness': {
          id: 'thought_awareness',
          name: 'Thought Awareness',
          category: 'cognitive',
          description: 'Learning to identify and observe automatic thoughts',
          difficulty_level: 'beginner',
          exercises: this.generateCBTExercises('thought_awareness'),
          mastery_criteria: {
            completion_threshold: 0.8,
            consistency_requirement: 7,
            quality_indicators: ['accurate_identification', 'regular_practice'],
            progression_markers: ['increased_awareness', 'reduced_automatic_responding']
          }
        },
        'cognitive_restructuring': {
          id: 'cognitive_restructuring',
          name: 'Cognitive Restructuring',
          category: 'cognitive',
          description: 'Challenging and reframing unhelpful thought patterns',
          difficulty_level: 'intermediate',
          exercises: this.generateCBTExercises('cognitive_restructuring'),
          mastery_criteria: {
            completion_threshold: 0.75,
            consistency_requirement: 14,
            quality_indicators: ['balanced_thinking', 'evidence_evaluation'],
            progression_markers: ['reduced_negative_bias', 'improved_mood_regulation']
          }
        }
      },
      dbt_skills: {
        'mindful_awareness': {
          id: 'mindful_awareness',
          name: 'Mindful Awareness',
          module: 'mindfulness',
          description: 'Developing present-moment awareness without judgment',
          practices: this.generateDBTPractices('mindfulness'),
          real_world_applications: ['daily_activities', 'stress_moments', 'emotional_reactions']
        },
        'distress_tolerance': {
          id: 'distress_tolerance',
          name: 'Distress Tolerance',
          module: 'distress_tolerance',
          description: 'Learning to tolerate difficult emotions and situations',
          practices: this.generateDBTPractices('distress_tolerance'),
          real_world_applications: ['crisis_situations', 'overwhelming_emotions', 'urge_management']
        }
      }
    };
  }

  private generateCBTExercises(skillType: string): CBTExercise[] {
    const exercises: CBTExercise[] = [];
    
    if (skillType === 'thought_awareness') {
      exercises.push({
        id: 'thought_record_basic',
        name: 'Basic Thought Record',
        type: 'thought_record',
        steps: [
          {
            step_number: 1,
            instruction: 'Identify the situation that triggered your emotional response',
            user_input_required: true,
            input_type: 'text'
          },
          {
            step_number: 2,
            instruction: 'Rate your emotion intensity from 1-10',
            user_input_required: true,
            input_type: 'rating'
          }
        ],
        estimated_time: 300,
        therapeutic_benefits: ['increased_awareness', 'emotion_regulation']
      });
    }
    
    return exercises;
  }

  private generateDBTPractices(module: string): DBTPractice[] {
    const practices: DBTPractice[] = [];
    
    if (module === 'mindfulness') {
      practices.push({
        id: 'observe_practice',
        name: 'Observe Practice',
        type: 'mindfulness',
        guided_instructions: [
          'Find a comfortable position',
          'Notice what you can see around you',
          'Observe without judging or labeling'
        ],
        practice_prompts: [
          'What colors do you notice?',
          'What shapes catch your attention?'
        ],
        integration_tips: [
          'Practice during daily activities',
          'Use as a grounding technique'
        ]
      });
    }
    
    return practices;
  }

  // Main therapeutic session management
  async startPersonalizedSession(
    userId: string,
    preferences: {
      skill_focus?: string;
      session_length?: number;
      difficulty_preference?: string;
      biometric_data?: BiometricData;
    }
  ): Promise<TherapeuticSession> {
    
    const skillAssessment = await this.assessCurrentSkillLevel(userId);
    const recommendedSkill = this.selectOptimalSkill(skillAssessment, preferences);
    const difficultyLevel = this.calculateDynamicDifficulty(userId, recommendedSkill);
    
    const session: TherapeuticSession = {
      session_id: `session_${Date.now()}_${userId}`,
      skill_focus: recommendedSkill,
      difficulty_level: difficultyLevel,
      personalization_factors: this.generatePersonalizationFactors(userId, preferences),
      progress_tracking: this.initializeSessionTracking(),
      adaptive_adjustments: []
    };

    // Initialize real-time monitoring
    this.startSessionMonitoring(session);
    
    return session;
  }

  private async assessCurrentSkillLevel(userId: string): Promise<any> {
    const assessment = {
      skill_levels: {} as Record<string, number>,
      mastery_progress: {} as Record<string, number>,
      areas_for_improvement: [] as string[],
      strengths: [] as string[],
      recommendations: [] as string[]
    };

    // Assess CBT skills
    for (const [skillCategory] of Object.entries(this.skillsFramework.cbt_skills)) {
      assessment.skill_levels[skillCategory] = this.calculateSkillLevel(userId, skillCategory);
      assessment.mastery_progress[skillCategory] = this.calculateMasteryProgress(userId, skillCategory);
    }

    // Assess DBT skills
    for (const [skillCategory] of Object.entries(this.skillsFramework.dbt_skills)) {
      assessment.skill_levels[skillCategory] = this.calculateSkillLevel(userId, skillCategory);
      assessment.mastery_progress[skillCategory] = this.calculateMasteryProgress(userId, skillCategory);
    }

    assessment.recommendations = this.generateSkillRecommendations(userId, assessment);
    
    return assessment;
  }

  private selectOptimalSkill(assessment: any, preferences: any): string {
    // Select skill based on assessment and user preferences
    let selectedSkill = 'thought_awareness'; // default
    
    if (preferences.skill_focus) {
      selectedSkill = preferences.skill_focus;
    } else {
      // AI-driven skill selection based on current needs
      const needsBasedSelection = this.analyzeSkillNeeds(assessment);
      selectedSkill = needsBasedSelection;
    }
    
    return selectedSkill;
  }

  private analyzeSkillNeeds(assessment: any): string {
    // Analyze which skill would be most beneficial
    const skillPriorities: Record<string, number> = {};
    
    for (const [skill, level] of Object.entries(assessment.skill_levels)) {
      if (typeof level === 'number' && level < 0.5) {
        skillPriorities[skill] = 1 - level; // Higher priority for lower skill levels
      }
    }
    
    // Return skill with highest priority
    const prioritizedSkill = Object.entries(skillPriorities)
      .sort(([,a], [,b]) => b - a)[0];
    
    return prioritizedSkill ? prioritizedSkill[0] : 'thought_awareness';
  }

  private calculateDynamicDifficulty(userId: string, skill: string): string {
    const userProgress = this.getUserProgress(userId);
    const skillLevel = this.calculateSkillLevel(userId, skill);
    
    if (skillLevel < 0.3) return 'beginner';
    if (skillLevel < 0.7) return 'intermediate';
    return 'advanced';
  }

  private generatePersonalizationFactors(userId: string, preferences: any): Record<string, any> {
    return {
      learning_style: preferences.learning_style || 'visual',
      attention_span: preferences.session_length || 15,
      motivation_factors: ['gamification', 'progress_tracking'],
      trigger_avoidance: preferences.triggers || [],
      preferred_metaphors: ['garden_growth', 'journey', 'building']
    };
  }

  private initializeSessionTracking(): ProgressMetrics {
    return {
      completion_rate: 0,
      engagement_score: 0,
      skill_improvement: {},
      consistency_streak: 0,
      mastery_indicators: []
    };
  }

  private startSessionMonitoring(session: TherapeuticSession): void {
    // Real-time session monitoring and adaptation
    console.log(`Starting monitoring for session: ${session.session_id}`);
  }

  // Interactive exercise execution
  async executeInteractiveExercise(
    sessionId: string,
    exerciseId: string,
    userInputs: Record<string, any>
  ): Promise<any> {
    
    const exerciseData = await this.loadExerciseData(exerciseId);
    const currentStep = this.getCurrentStep(sessionId);
    
    // Process user input for current step
    const stepFeedback = this.processStepInput(currentStep, userInputs);
    
    // Generate adaptive feedback
    const feedback = this.generateStepFeedback(stepFeedback);
    
    // Determine next step or completion
    const nextStep = this.getNextStep(sessionId);
    const progressUpdate = this.updateProgress(sessionId, stepFeedback);
    
    return {
      step_completed: true,
      feedback,
      next_step: nextStep,
      progress_update: progressUpdate,
      adaptive_suggestions: this.generateAdaptiveSuggestions(stepFeedback)
    };
  }

  private async loadExerciseData(exerciseId: string): Promise<any> {
    // Load exercise data
    return {
      id: exerciseId,
      steps: [],
      current_step: 0
    };
  }

  private getCurrentStep(sessionId: string): any {
    return {
      step_number: 1,
      instruction: 'Sample instruction',
      user_input_required: true
    };
  }

  private processStepInput(step: any, userInputs: Record<string, any>): any {
    return {
      step_id: step.step_number,
      input_quality: 'good',
      therapeutic_insights: [],
      completion_score: 0.8
    };
  }

  private generateStepFeedback(stepData: any): string {
    const feedbackTemplates = [
      "Great work on completing this step!",
      "Your reflection shows good insight.",
      "This is a valuable observation."
    ];
    
    return feedbackTemplates[Math.floor(Math.random() * feedbackTemplates.length)];
  }

  private getNextStep(sessionId: string): any {
    return {
      step_number: 2,
      instruction: 'Next step instruction',
      estimated_time: 5
    };
  }

  private updateProgress(sessionId: string, stepData: any): any {
    return {
      session_completion: 0.4,
      skill_points_earned: 10,
      insights_gained: 1
    };
  }

  private generateAdaptiveSuggestions(stepData: any): string[] {
    return [
      "Try practicing this skill in a real-world situation",
      "Consider keeping a daily journal of your experiences"
    ];
  }

  // Completion and assessment
  async completeSession(
    sessionId: string,
    completionData: {
      user_feedback: string;
      difficulty_rating: number;
      helpfulness_rating: number;
      insights_gained: string[];
    }
  ): Promise<any> {
    
    const session = await this.getSessionData(sessionId);
    const completionAssessment = this.assessCompletion(session, completionData);
    
    // Update user progress
    this.updateUserProgress(session.session_id, completionAssessment);
    
    // Generate rewards and badges
    const rewards = await this.processSessionRewards(session.session_id, completionAssessment);
    
    // Update gamification elements
    this.updateGamification(session.session_id, completionAssessment);
    
    // Generate insights and recommendations
    const insights = this.generateInsights(session.session_id, completionAssessment);
    
    return {
      completion_status: 'success',
      session_summary: completionAssessment,
      rewards_earned: rewards,
      insights_generated: insights,
      next_session_recommendations: this.generateNextSessionRecommendations(session.session_id)
    };
  }

  private async getSessionData(sessionId: string): Promise<TherapeuticSession> {
    // Retrieve session data
    return {
      session_id: sessionId,
      skill_focus: 'thought_awareness',
      difficulty_level: 'beginner',
      personalization_factors: {},
      progress_tracking: this.initializeSessionTracking(),
      adaptive_adjustments: []
    };
  }

  private assessCompletion(session: any, completionData: any): any {
    return {
      completion_quality: 'high',
      skill_demonstration: 'proficient',
      engagement_level: 'high',
      learning_evidence: ['insight_formation', 'skill_application'],
      improvement_areas: ['consistency', 'real_world_application']
    };
  }

  private updateUserProgress(userId: string, assessment: any): void {
    const currentProgress = this.getUserProgress(userId);
    
    // Update metrics based on session completion
    currentProgress.completion_rate += 0.1;
    currentProgress.engagement_score = Math.min(1.0, currentProgress.engagement_score + 0.05);
    
    this.userProgress.set(userId, currentProgress);
  }

  private async processSessionRewards(userId: string, assessment: any): Promise<any> {
    const rewards = {
      experience_points: 50,
      badges: [] as Badge[],
      unlocked_content: [],
      achievement_progress: {}
    };

    // Check for new badges
    const newBadges = this.checkBadgeEligibility(userId, assessment);
    rewards.badges = newBadges;

    return rewards;
  }

  private checkBadgeEligibility(userId: string, assessment: any): Badge[] {
    const newBadges: Badge[] = [];
    
    // Example badge check
    if (assessment.completion_quality === 'high') {
      newBadges.push({
        id: 'high_quality_completion',
        name: 'Thoughtful Practitioner',
        description: 'Completed session with high quality engagement',
        criteria: ['high_quality_completion'],
        rarity: 'common'
      });
    }
    
    return newBadges;
  }

  private updateGamification(userId: string, completion: any): void {
    // Update gamification elements
    this.gamificationData.experience_points += 50;
    this.gamificationData.user_level = Math.floor(this.gamificationData.experience_points / 500) + 1;
  }

  private generateInsights(userId: string, completion: any): any {
    return {
      pattern_recognition: "You're developing stronger thought awareness",
      progress_highlights: ["Improved emotional recognition", "Better coping strategies"],
      growth_areas: ["Apply skills in challenging situations"],
      motivational_message: "Your consistent practice is building real therapeutic skills!"
    };
  }

  private generateNextSessionRecommendations(userId: string): string[] {
    return [
      'Continue building thought awareness with daily practice',
      'Try applying cognitive restructuring to a recent challenging situation',
      'Explore mindfulness techniques to enhance present-moment awareness'
    ];
  }

  // Advanced personalization and adaptation
  async generateAdaptiveDifficulty(
    userId: string,
    currentPerformance: any,
    biometricData?: BiometricData
  ): Promise<Record<string, string>> {
    
    const userHistory = this.getUserProgress(userId);
    const adaptationNeeds = this.analyzeAdaptationNeeds(userHistory, currentPerformance);
    
    const adjustments: Record<string, string> = {};
    
    // Adjust difficulty based on performance and stress levels
    for (const skill of Object.keys(adaptationNeeds)) {
      if (adaptationNeeds[skill] > 0.7) {
        adjustments[skill] = 'increase_difficulty';
      } else if (adaptationNeeds[skill] < 0.3) {
        adjustments[skill] = 'decrease_difficulty';
      }
    }
    
    // Consider biometric data for real-time adjustments
    if (biometricData && biometricData.stressScore > 0.7) {
      Object.keys(adjustments).forEach(skill => {
        adjustments[skill] = 'decrease_difficulty';
      });
    }
    
    return adjustments;
  }

  private analyzeAdaptationNeeds(userHistory: ProgressMetrics, currentPerformance: any): Record<string, number> {
    // Analyze what adaptations are needed
    return {
      'thought_awareness': userHistory.completion_rate,
      'cognitive_restructuring': userHistory.engagement_score
    };
  }

  // Helper methods
  private calculateSkillLevel(userId: string, skill: string): number {
    // Calculate current skill level (0-1)
    const progress = this.getUserProgress(userId);
    return progress.skill_improvement[skill] || 0;
  }

  private calculateMasteryProgress(userId: string, skill: string): number {
    // Calculate mastery progress (0-1)
    return this.calculateSkillLevel(userId, skill) * 0.8; // Example calculation
  }

  private generateSkillRecommendations(userId: string, assessment: any): string[] {
    const recommendations: string[] = [];
    
    // Generate recommendations based on assessment
    for (const [skill, level] of Object.entries(assessment.skill_levels)) {
      if (typeof level === 'number' && level < 0.5) {
        recommendations.push(`Focus on developing ${skill} skills`);
      }
    }
    
    return recommendations.length > 0 ? recommendations : ['Continue consistent practice'];
  }

  private getUserProgress(userId: string): ProgressMetrics {
    return this.userProgress.get(userId) || this.initializeSessionTracking();
  }

  // Public API methods
  public async getUserSkillAssessment(userId: string): Promise<any> {
    return this.assessCurrentSkillLevel(userId);
  }

  public async getPersonalizedExercises(userId: string, focusArea?: string): Promise<CBTExercise[]> {
    const assessment = await this.assessCurrentSkillLevel(userId);
    return this.generatePersonalizedExerciseSet(userId, assessment, focusArea);
  }

  private generatePersonalizedExerciseSet(userId: string, assessment: any, focusArea?: string): CBTExercise[] {
    // Generate personalized exercise set
    const exercises: CBTExercise[] = [];
    
    if (focusArea === 'thought_awareness' || !focusArea) {
      exercises.push(...this.generateCBTExercises('thought_awareness'));
    }
    
    return exercises;
  }

  public getGamificationStatus(userId: string): GamificationElement {
    return { ...this.gamificationData };
  }

  public addEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(type, listener);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(type, listener);
  }
}

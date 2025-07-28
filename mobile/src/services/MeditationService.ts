import { Animated } from 'react-native';
import * as Speech from 'expo-speech';
import { SentimentResult } from './AIService';

export interface MeditationSession {
  id: string;
  name: string;
  duration: number; // seconds
  type: 'breathing' | 'mindfulness' | 'body_scan' | 'loving_kindness' | 'visualization';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  script: MeditationStep[];
  backgroundSound?: string;
  voiceGender: 'male' | 'female' | 'neutral';
  recommendedFor: SentimentResult['mood'][];
}

export interface MeditationStep {
  id: string;
  type: 'instruction' | 'breathing' | 'silence' | 'visualization' | 'affirmation';
  duration: number; // seconds
  text: string;
  breathingPattern?: BreathingPattern;
  visualCue?: string;
}

export interface BreathingPattern {
  inhale: number; // seconds
  hold1?: number; // seconds (after inhale)
  exhale: number; // seconds
  hold2?: number; // seconds (after exhale)
  cycles: number;
}

export interface MeditationProgress {
  currentStep: number;
  timeElapsed: number;
  isPlaying: boolean;
  isPaused: boolean;
  breathingCycle: number;
  totalCycles: number;
}

class MeditationService {
  private static instance: MeditationService;
  private currentSession: MeditationSession | null = null;
  private progress: MeditationProgress | null = null;
  private progressTimer: NodeJS.Timeout | null = null;
  private breathingAnimation: Animated.Value = new Animated.Value(0);
  private isVoiceEnabled = true;

  // Meditation sessions library
  private sessions: MeditationSession[] = [
    {
      id: 'basic_breathing',
      name: 'Garden Breathing',
      duration: 300, // 5 minutes
      type: 'breathing',
      difficulty: 'beginner',
      description: 'Simple breathing exercise surrounded by your garden\'s peaceful energy',
      voiceGender: 'neutral',
      recommendedFor: ['neutral', 'negative', 'positive'],
      script: [
        {
          id: 'intro',
          type: 'instruction',
          duration: 15,
          text: 'Welcome to your garden sanctuary. Find a comfortable position and let your body relax. We\'ll practice gentle breathing together.',
          visualCue: 'garden_view'
        },
        {
          id: 'breathing_main',
          type: 'breathing',
          duration: 240,
          text: 'Breathe in slowly through your nose... hold gently... and exhale completely through your mouth.',
          breathingPattern: {
            inhale: 4,
            hold1: 2,
            exhale: 6,
            cycles: 20
          },
          visualCue: 'breathing_flower'
        },
        {
          id: 'conclusion',
          type: 'instruction',
          duration: 45,
          text: 'Take a moment to notice how you feel. Your garden grows stronger with each breath. Gently open your eyes when ready.',
          visualCue: 'garden_bloom'
        }
      ]
    },
    {
      id: 'anxiety_relief',
      name: 'Calming Storm',
      duration: 480, // 8 minutes
      type: 'mindfulness',
      difficulty: 'beginner',
      description: 'Gentle guidance for anxious moments, like finding shelter in your garden during a storm',
      voiceGender: 'female',
      recommendedFor: ['negative', 'very_negative'],
      script: [
        {
          id: 'grounding',
          type: 'instruction',
          duration: 60,
          text: 'You\'re safe in your garden. Notice the ground beneath you, solid and supportive. Feel the gentle air around you.',
          visualCue: 'protective_garden'
        },
        {
          id: 'breathing_calm',
          type: 'breathing',
          duration: 300,
          text: 'Breathe like the gentle rain nourishing your garden. In slowly... pause... out completely, releasing all tension.',
          breathingPattern: {
            inhale: 5,
            hold1: 3,
            exhale: 7,
            cycles: 15
          },
          visualCue: 'calming_rain'
        },
        {
          id: 'affirmations',
          type: 'affirmation',
          duration: 120,
          text: 'I am safe in this moment. My garden surrounds me with love. Each breath brings me peace. I trust in my ability to heal and grow.',
          visualCue: 'growing_strength'
        }
      ]
    },
    {
      id: 'joy_celebration',
      name: 'Blooming Joy',
      duration: 360, // 6 minutes
      type: 'visualization',
      difficulty: 'intermediate',
      description: 'Amplify positive emotions and share joy with your flourishing garden',
      voiceGender: 'male',
      recommendedFor: ['positive', 'very_positive'],
      script: [
        {
          id: 'joy_recognition',
          type: 'instruction',
          duration: 45,
          text: 'Feel the warmth of joy in your heart. Notice how it radiates outward, touching every plant in your garden.',
          visualCue: 'radiant_garden'
        },
        {
          id: 'joy_breathing',
          type: 'breathing',
          duration: 180,
          text: 'Breathe in the golden light of happiness. Hold it in your heart. Exhale, sharing this joy with your entire garden.',
          breathingPattern: {
            inhale: 6,
            hold1: 4,
            exhale: 6,
            cycles: 10
          },
          visualCue: 'golden_light'
        },
        {
          id: 'joy_visualization',
          type: 'visualization',
          duration: 135,
          text: 'Imagine your garden bursting into magnificent bloom. Flowers dancing, creatures singing, colors more vibrant than ever. You are the source of this beautiful energy.',
          visualCue: 'magnificent_bloom'
        }
      ]
    },
    {
      id: 'body_scan_garden',
      name: 'Garden Body Scan',
      duration: 720, // 12 minutes
      type: 'body_scan',
      difficulty: 'intermediate',
      description: 'Journey through your body like exploring different areas of your garden',
      voiceGender: 'neutral',
      recommendedFor: ['neutral', 'negative', 'positive'],
      script: [
        {
          id: 'body_intro',
          type: 'instruction',
          duration: 60,
          text: 'We\'ll explore your body like walking through different sections of your garden. Each part deserves attention and care.',
          visualCue: 'garden_path'
        },
        {
          id: 'feet_roots',
          type: 'instruction',
          duration: 90,
          text: 'Begin with your feet - your roots. Feel them connecting you to the earth. Notice any tension and let it melt away like morning dew.',
          visualCue: 'tree_roots'
        },
        {
          id: 'legs_stems',
          type: 'instruction',
          duration: 90,
          text: 'Move attention to your legs - strong stems supporting your growth. Feel the life force flowing upward, carrying nutrients and energy.',
          visualCue: 'plant_stems'
        },
        {
          id: 'torso_trunk',
          type: 'instruction',
          duration: 120,
          text: 'Your torso is the trunk of your being. Feel your breath moving like gentle wind through leaves. Your heart beats like the pulse of life in your garden.',
          visualCue: 'tree_trunk'
        },
        {
          id: 'arms_branches',
          type: 'instruction',
          duration: 90,
          text: 'Your arms are branches reaching toward the light. Feel them soft and flexible, ready to embrace life\'s experiences.',
          visualCue: 'tree_branches'
        },
        {
          id: 'head_flower',
          type: 'instruction',
          duration: 90,
          text: 'Your head is the flower crowning your being. Feel the space around your thoughts, peaceful and clear like an open sky above your garden.',
          visualCue: 'crown_flower'
        },
        {
          id: 'whole_garden',
          type: 'instruction',
          duration: 180,
          text: 'Now experience your whole self as a complete garden ecosystem. Every part connected, working in harmony. You are whole, you are beautiful.',
          visualCue: 'complete_garden'
        }
      ]
    },
    {
      id: 'loving_kindness_garden',
      name: 'Garden of Compassion',
      duration: 540, // 9 minutes
      type: 'loving_kindness',
      difficulty: 'advanced',
      description: 'Cultivate love and compassion, starting with yourself and extending to all beings',
      voiceGender: 'female',
      recommendedFor: ['neutral', 'negative', 'positive'],
      script: [
        {
          id: 'self_love_intro',
          type: 'instruction',
          duration: 60,
          text: 'In your garden sanctuary, we\'ll plant seeds of loving-kindness. Begin by offering love to yourself, the gardener of this beautiful space.',
          visualCue: 'heart_garden'
        },
        {
          id: 'self_love',
          type: 'affirmation',
          duration: 120,
          text: 'May I be happy and free from suffering. May I be healthy and strong. May I live with ease and joy. May I tend my inner garden with love.',
          visualCue: 'self_care_plant'
        },
        {
          id: 'loved_ones',
          type: 'affirmation',
          duration: 120,
          text: 'Now bring to mind someone you love. See them in your garden with you. May they be happy and free from suffering. May they bloom with joy and peace.',
          visualCue: 'shared_garden'
        },
        {
          id: 'neutral_person',
          type: 'affirmation',
          duration: 90,
          text: 'Think of someone neutral - perhaps a neighbor or acquaintance. Invite them into your garden of compassion. May they find happiness and peace.',
          visualCue: 'welcoming_garden'
        },
        {
          id: 'difficult_person',
          type: 'affirmation',
          duration: 90,
          text: 'Now, if you feel ready, think of someone who has caused you difficulty. Even they deserve happiness. May they find peace and healing.',
          visualCue: 'healing_garden'
        },
        {
          id: 'all_beings',
          type: 'affirmation',
          duration: 60,
          text: 'Finally, extend this love to all living beings everywhere. May all beings be happy. May all beings be free from suffering. May all gardens flourish.',
          visualCue: 'universal_garden'
        }
      ]
    }
  ];

  static getInstance(): MeditationService {
    if (!MeditationService.instance) {
      MeditationService.instance = new MeditationService();
    }
    return MeditationService.instance;
  }

  getMeditationSessions(): MeditationSession[] {
    return this.sessions;
  }

  getRecommendedSessions(mood: SentimentResult['mood']): MeditationSession[] {
    return this.sessions.filter(session => 
      session.recommendedFor.includes(mood)
    );
  }

  startMeditation(sessionId: string): boolean {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return false;

    this.currentSession = session;
    this.progress = {
      currentStep: 0,
      timeElapsed: 0,
      isPlaying: true,
      isPaused: false,
      breathingCycle: 0,
      totalCycles: 0
    };

    this.startProgressTimer();
    this.executeCurrentStep();
    
    return true;
  }

  pauseMeditation(): void {
    if (!this.progress) return;
    
    this.progress.isPaused = true;
    this.progress.isPlaying = false;
    
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    
    Speech.stop();
  }

  resumeMeditation(): void {
    if (!this.progress) return;
    
    this.progress.isPaused = false;
    this.progress.isPlaying = true;
    
    this.startProgressTimer();
    this.executeCurrentStep();
  }

  stopMeditation(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    
    Speech.stop();
    this.breathingAnimation.setValue(0);
    
    this.currentSession = null;
    this.progress = null;
  }

  private startProgressTimer(): void {
    this.progressTimer = setInterval(() => {
      if (!this.progress || !this.currentSession) return;
      
      this.progress.timeElapsed += 1;
      
      // Check if current step is complete
      const currentStep = this.currentSession.script[this.progress.currentStep];
      if (this.progress.timeElapsed >= this.getStepStartTime() + currentStep.duration) {
        this.nextStep();
      }
    }, 1000);
  }

  private executeCurrentStep(): void {
    if (!this.progress || !this.currentSession) return;
    
    const step = this.currentSession.script[this.progress.currentStep];
    
    switch (step.type) {
      case 'instruction':
      case 'affirmation':
      case 'visualization':
        this.speakInstruction(step.text);
        break;
      case 'breathing':
        this.startBreathingSession(step);
        break;
      case 'silence':
        // Just wait silently
        break;
    }
  }

  private speakInstruction(text: string): void {
    if (!this.isVoiceEnabled) return;
    
    Speech.speak(text, {
      language: 'en-US',
      pitch: 0.9,
      rate: 0.7, // Slower, more meditative pace
    });
  }

  private startBreathingSession(step: MeditationStep): void {
    if (!step.breathingPattern || !this.progress) return;
    
    const pattern = step.breathingPattern;
    this.progress.totalCycles = pattern.cycles;
    this.progress.breathingCycle = 0;
    
    this.speakInstruction(step.text);
    
    // Start breathing animation and guidance
    setTimeout(() => {
      this.runBreathingCycle(pattern);
    }, 3000); // Wait for initial instruction
  }

  private runBreathingCycle(pattern: BreathingPattern): void {
    if (!this.progress || this.progress.breathingCycle >= pattern.cycles) return;
    
    this.progress.breathingCycle++;
    
    // Inhale phase
    this.animateBreathing('inhale', pattern.inhale);
    
    let totalPhaseTime = pattern.inhale;
    
    // Hold after inhale
    if (pattern.hold1) {
      setTimeout(() => {
        this.animateBreathing('hold', pattern.hold1!);
      }, pattern.inhale * 1000);
      totalPhaseTime += pattern.hold1;
    }
    
    // Exhale phase
    setTimeout(() => {
      this.animateBreathing('exhale', pattern.exhale);
    }, totalPhaseTime * 1000);
    totalPhaseTime += pattern.exhale;
    
    // Hold after exhale
    if (pattern.hold2) {
      setTimeout(() => {
        this.animateBreathing('hold', pattern.hold2!);
      }, totalPhaseTime * 1000);
      totalPhaseTime += pattern.hold2;
    }
    
    // Next cycle
    setTimeout(() => {
      this.runBreathingCycle(pattern);
    }, totalPhaseTime * 1000);
  }

  private animateBreathing(phase: 'inhale' | 'exhale' | 'hold', duration: number): void {
    if (phase === 'hold') return; // No animation change during hold
    
    const targetValue = phase === 'inhale' ? 1 : 0;
    
    Animated.timing(this.breathingAnimation, {
      toValue: targetValue,
      duration: duration * 1000,
      useNativeDriver: true,
    }).start();
  }

  private nextStep(): void {
    if (!this.progress || !this.currentSession) return;
    
    this.progress.currentStep++;
    
    if (this.progress.currentStep >= this.currentSession.script.length) {
      this.completeMeditation();
      return;
    }
    
    this.executeCurrentStep();
  }

  private completeMeditation(): void {
    this.speakInstruction('Your meditation session is complete. Take a moment to appreciate the peace you\'ve cultivated in your garden.');
    
    setTimeout(() => {
      this.stopMeditation();
    }, 5000);
  }

  private getStepStartTime(): number {
    if (!this.currentSession || !this.progress) return 0;
    
    let startTime = 0;
    for (let i = 0; i < this.progress.currentStep; i++) {
      startTime += this.currentSession.script[i].duration;
    }
    return startTime;
  }

  getCurrentProgress(): MeditationProgress | null {
    return this.progress;
  }

  getCurrentSession(): MeditationSession | null {
    return this.currentSession;
  }

  getBreathingAnimation(): Animated.Value {
    return this.breathingAnimation;
  }

  getCurrentStepText(): string {
    if (!this.currentSession || !this.progress) return '';
    
    const step = this.currentSession.script[this.progress.currentStep];
    return step.text;
  }

  getCurrentVisualCue(): string {
    if (!this.currentSession || !this.progress) return 'garden_view';
    
    const step = this.currentSession.script[this.progress.currentStep];
    return step.visualCue || 'garden_view';
  }

  setVoiceEnabled(enabled: boolean): void {
    this.isVoiceEnabled = enabled;
    if (!enabled) {
      Speech.stop();
    }
  }

  isVoiceEnabledState(): boolean {
    return this.isVoiceEnabled;
  }

  getSessionProgress(): number {
    if (!this.currentSession || !this.progress) return 0;
    return this.progress.timeElapsed / this.currentSession.duration;
  }

  getBreathingProgress(): { current: number; total: number } {
    return {
      current: this.progress?.breathingCycle || 0,
      total: this.progress?.totalCycles || 0
    };
  }
}

export default MeditationService;

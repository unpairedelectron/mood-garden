import { Animated, Dimensions } from 'react-native';
import { SentimentResult } from './AIService';

const { width, height } = Dimensions.get('window');

export interface Creature {
  id: string;
  type: 'butterfly' | 'firefly' | 'bee' | 'hummingbird' | 'rabbit' | 'fox';
  emoji: string;
  position: Animated.ValueXY;
  scale: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  behavior: 'idle' | 'flying' | 'feeding' | 'playing' | 'dancing' | 'sleeping';
  mood: SentimentResult['mood'];
  energy: number; // 0-1
  socialness: number; // 0-1 (how much they interact with other creatures)
  createdAt: Date;
  lastActivity: Date;
}

export interface CreatureInteraction {
  type: 'feed' | 'pet' | 'play' | 'sing_to';
  happiness: number;
  trust: number;
  animation: string;
}

class CreatureService {
  private static instance: CreatureService;
  private activeAnimations: { [key: string]: any } = {};

  private creatureData = {
    butterfly: {
      emoji: '🦋',
      baseSpeed: 2,
      preferredMoods: ['positive', 'very_positive'],
      behaviors: ['flying', 'feeding', 'dancing'],
      sounds: ['flutter', 'gentle_wing'],
      interactions: ['feed', 'sing_to']
    },
    firefly: {
      emoji: '🧚‍✨',
      baseSpeed: 1.5,
      preferredMoods: ['neutral', 'positive'],
      behaviors: ['flying', 'idle', 'dancing'],
      sounds: ['magical_chime', 'soft_glow'],
      interactions: ['pet', 'sing_to']
    },
    bee: {
      emoji: '🐝',
      baseSpeed: 3,
      preferredMoods: ['positive', 'very_positive'],
      behaviors: ['flying', 'feeding', 'playing'],
      sounds: ['gentle_buzz', 'happy_hum'],
      interactions: ['feed', 'play']
    },
    hummingbird: {
      emoji: '🐦',
      baseSpeed: 4,
      preferredMoods: ['positive', 'very_positive'],
      behaviors: ['flying', 'feeding', 'playing'],
      sounds: ['chirp', 'wing_flutter'],
      interactions: ['feed', 'sing_to', 'play']
    },
    rabbit: {
      emoji: '🐰',
      baseSpeed: 2.5,
      preferredMoods: ['neutral', 'positive'],
      behaviors: ['idle', 'playing', 'feeding'],
      sounds: ['soft_hop', 'content_nibble'],
      interactions: ['pet', 'feed', 'play']
    },
    fox: {
      emoji: '🦊',
      baseSpeed: 2,
      preferredMoods: ['neutral', 'positive', 'negative'],
      behaviors: ['idle', 'playing', 'sleeping'],
      sounds: ['gentle_yip', 'curious_sniff'],
      interactions: ['pet', 'play', 'sing_to']
    }
  };

  static getInstance(): CreatureService {
    if (!CreatureService.instance) {
      CreatureService.instance = new CreatureService();
    }
    return CreatureService.instance;
  }

  createCreature(mood: SentimentResult['mood'], position?: { x: number; y: number }): Creature {
    const availableTypes = Object.keys(this.creatureData) as Array<keyof typeof this.creatureData>;
    
    // Choose creature type based on mood
    let creatureType: keyof typeof this.creatureData;
    switch (mood) {
      case 'very_positive':
        creatureType = Math.random() > 0.5 ? 'butterfly' : 'hummingbird';
        break;
      case 'positive':
        creatureType = (['butterfly', 'bee', 'hummingbird'] as const)[Math.floor(Math.random() * 3)];
        break;
      case 'neutral':
        creatureType = (['firefly', 'rabbit', 'fox'] as const)[Math.floor(Math.random() * 3)];
        break;
      case 'negative':
        creatureType = Math.random() > 0.5 ? 'fox' : 'firefly';
        break;
      case 'very_negative':
        creatureType = 'fox'; // Foxes are comforting during difficult times
        break;
      default:
        creatureType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }

    const data = this.creatureData[creatureType];
    const startPosition = position || {
      x: Math.random() * (width - 100) + 50,
      y: Math.random() * (height * 0.6) + height * 0.2,
    };

    const creature: Creature = {
      id: `creature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: creatureType,
      emoji: data.emoji,
      position: new Animated.ValueXY(startPosition),
      scale: new Animated.Value(0.8 + Math.random() * 0.4), // 0.8 to 1.2
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(0),
      behavior: 'idle',
      mood,
      energy: 0.5 + Math.random() * 0.5, // Start with medium to high energy
      socialness: Math.random(),
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    // Animate creature entrance
    this.animateCreatureEntrance(creature);
    
    return creature;
  }

  private animateCreatureEntrance(creature: Creature): void {
    Animated.sequence([
      Animated.timing(creature.opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(creature.scale, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      this.startBehaviorAnimation(creature);
    });
  }

  startBehaviorAnimation(creature: Creature): void {
    const data = this.creatureData[creature.type];
    const behavior = data.behaviors[Math.floor(Math.random() * data.behaviors.length)];
    creature.behavior = behavior as Creature['behavior'];

    switch (behavior) {
      case 'flying':
        this.animateFlying(creature);
        break;
      case 'feeding':
        this.animateFeeding(creature);
        break;
      case 'playing':
        this.animatePlaying(creature);
        break;
      case 'dancing':
        this.animateDancing(creature);
        break;
      case 'idle':
        this.animateIdle(creature);
        break;
      case 'sleeping':
        this.animateSleeping(creature);
        break;
    }
  }

  private animateFlying(creature: Creature): void {
    const data = this.creatureData[creature.type];
    const speed = data.baseSpeed * (0.5 + creature.energy * 0.5);
    
    // Generate random flight path
    const targetX = Math.random() * (width - 100) + 50;
    const targetY = Math.random() * (height * 0.6) + height * 0.2;
    
    // Calculate distance (simplified for animation)
    const duration = 2000 + Math.random() * 3000; // 2-5 seconds

    // Wing flutter animation
    const wingFlutter = Animated.loop(
      Animated.sequence([
        Animated.timing(creature.rotation, {
          toValue: 10,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(creature.rotation, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    );

    wingFlutter.start();

    // Flight path animation
    Animated.timing(creature.position, {
      toValue: { x: targetX, y: targetY },
      duration: Math.max(duration, 2000),
      useNativeDriver: false,
    }).start(() => {
      wingFlutter.stop();
      creature.rotation.setValue(0);
      
      // Rest briefly, then choose next behavior
      setTimeout(() => {
        if (Math.random() > 0.3) {
          this.startBehaviorAnimation(creature);
        } else {
          this.animateIdle(creature);
        }
      }, 1000 + Math.random() * 2000);
    });
  }

  private animateFeeding(creature: Creature): void {
    // Gentle bobbing motion while feeding
    const feedingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(creature.scale, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(creature.scale, {
          toValue: 0.95,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    );

    feedingAnimation.start(() => {
      creature.scale.setValue(1);
      creature.energy = Math.min(creature.energy + 0.1, 1);
      setTimeout(() => this.startBehaviorAnimation(creature), 1000);
    });
  }

  private animatePlaying(creature: Creature): void {
    // Playful bouncing
    const playAnimation = Animated.loop(
      Animated.sequence([
        Animated.spring(creature.scale, {
          toValue: 1.3,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(creature.scale, {
          toValue: 0.8,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 4 }
    );

    playAnimation.start(() => {
      creature.scale.setValue(1);
      creature.energy = Math.max(creature.energy - 0.1, 0.2);
      setTimeout(() => this.startBehaviorAnimation(creature), 500);
    });
  }

  private animateDancing(creature: Creature): void {
    // Spinning dance
    const danceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(creature.rotation, {
          toValue: 360,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(creature.scale, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(creature.scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 2 }
    );

    danceAnimation.start(() => {
      creature.rotation.setValue(0);
      setTimeout(() => this.startBehaviorAnimation(creature), 1000);
    });
  }

  private animateIdle(creature: Creature): void {
    // Gentle breathing animation
    const idleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(creature.scale, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(creature.scale, {
          toValue: 0.98,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    );

    idleAnimation.start(() => {
      creature.scale.setValue(1);
      creature.energy = Math.min(creature.energy + 0.05, 1);
      setTimeout(() => this.startBehaviorAnimation(creature), 2000);
    });
  }

  private animateSleeping(creature: Creature): void {
    // Slow, peaceful breathing
    creature.opacity.setValue(0.7);
    
    const sleepAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(creature.scale, {
          toValue: 1.02,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(creature.scale, {
          toValue: 0.98,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 5 }
    );

    sleepAnimation.start(() => {
      creature.scale.setValue(1);
      creature.opacity.setValue(1);
      creature.energy = 1; // Fully rested
      setTimeout(() => this.startBehaviorAnimation(creature), 1000);
    });
  }

  interactWithCreature(creature: Creature, interactionType: CreatureInteraction['type']): CreatureInteraction {
    const data = this.creatureData[creature.type];
    
    if (!data.interactions.includes(interactionType)) {
      return {
        type: interactionType,
        happiness: 0,
        trust: 0,
        animation: 'confused'
      };
    }

    let happiness = 0;
    let trust = 0;
    let animation = '';

    switch (interactionType) {
      case 'feed':
        happiness = 0.3 + Math.random() * 0.4;
        trust = 0.1 + Math.random() * 0.2;
        animation = 'happy_eating';
        creature.energy = Math.min(creature.energy + 0.2, 1);
        break;
      
      case 'pet':
        happiness = 0.2 + Math.random() * 0.3;
        trust = 0.2 + Math.random() * 0.3;
        animation = 'content_purr';
        break;
      
      case 'play':
        happiness = 0.4 + Math.random() * 0.4;
        trust = 0.1 + Math.random() * 0.2;
        animation = 'playful_bounce';
        creature.energy = Math.max(creature.energy - 0.1, 0.1);
        break;
      
      case 'sing_to':
        happiness = 0.3 + Math.random() * 0.5;
        trust = 0.2 + Math.random() * 0.4;
        animation = 'peaceful_sway';
        break;
    }

    // Animate interaction response
    this.animateInteractionResponse(creature, animation);
    
    creature.lastActivity = new Date();
    
    return {
      type: interactionType,
      happiness,
      trust,
      animation
    };
  }

  private animateInteractionResponse(creature: Creature, animation: string): void {
    switch (animation) {
      case 'happy_eating':
        this.animateFeeding(creature);
        break;
      case 'content_purr':
        this.animateIdle(creature);
        break;
      case 'playful_bounce':
        this.animatePlaying(creature);
        break;
      case 'peaceful_sway':
        this.animateDancing(creature);
        break;
      default:
        this.animateIdle(creature);
    }
  }

  getCreaturesByMood(mood: SentimentResult['mood']): Creature['type'][] {
    return Object.entries(this.creatureData)
      .filter(([_, data]) => data.preferredMoods.includes(mood as any))
      .map(([type, _]) => type as Creature['type']);
  }

  shouldSpawnCreature(totalMoods: number, currentCreatureCount: number, mood: SentimentResult['mood']): boolean {
    // Spawn probability based on mood and garden activity
    const baseProbability = {
      'very_positive': 0.8,
      'positive': 0.6,
      'neutral': 0.3,
      'negative': 0.2,
      'very_negative': 0.1
    }[mood];

    // Don't spawn too many creatures
    if (currentCreatureCount >= 5) return false;
    
    // Higher chance with more mood entries (active garden)
    const activityBonus = Math.min(totalMoods * 0.01, 0.3);
    
    return Math.random() < (baseProbability + activityBonus);
  }

  cleanupCreature(creature: Creature): void {
    // Animate creature leaving
    Animated.parallel([
      Animated.timing(creature.opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(creature.scale, {
        toValue: 0.5,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Clean up animations
    if (this.activeAnimations[creature.id]) {
      this.activeAnimations[creature.id].stop();
      delete this.activeAnimations[creature.id];
    }
  }
}

export default CreatureService;

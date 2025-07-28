import { Animated } from 'react-native';
import { SentimentResult } from './AIService';
import { GardenState } from './GardenService';

export interface WeatherState {
  type: 'sunny' | 'cloudy' | 'rainy' | 'misty' | 'rainbow' | 'starry' | 'snowy';
  intensity: number; // 0-1
  temperature: number; // 0-1 (cold to warm)
  humidity: number; // 0-1
  windSpeed: number; // 0-1
  visibility: number; // 0-1
  effects: WeatherEffect[];
}

export interface WeatherEffect {
  id: string;
  type: 'rain' | 'snow' | 'sparkle' | 'mist' | 'sunbeam' | 'cloud' | 'rainbow' | 'star';
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  size: number;
  opacity: Animated.Value;
  lifespan: number; // milliseconds
  createdAt: Date;
}

export interface WeatherTransition {
  from: WeatherState['type'];
  to: WeatherState['type'];
  duration: number; // milliseconds
  easeType: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

class WeatherService {
  private static instance: WeatherService;
  private currentWeather: WeatherState;
  private weatherEffects: WeatherEffect[] = [];
  private effectAnimations: { [key: string]: any } = {};
  private transitionInProgress = false;

  private weatherPatterns = {
    sunny: {
      baseIntensity: 0.8,
      temperature: 0.7,
      humidity: 0.3,
      windSpeed: 0.2,
      visibility: 1.0,
      moodCompatibility: ['positive', 'very_positive'],
      effectTypes: ['sunbeam', 'sparkle'],
      sounds: ['gentle_breeze', 'bird_chirp']
    },
    cloudy: {
      baseIntensity: 0.5,
      temperature: 0.5,
      humidity: 0.6,
      windSpeed: 0.3,
      visibility: 0.8,
      moodCompatibility: ['neutral', 'positive'],
      effectTypes: ['cloud', 'mist'],
      sounds: ['soft_wind', 'distant_thunder']
    },
    rainy: {
      baseIntensity: 0.7,
      temperature: 0.4,
      humidity: 0.9,
      windSpeed: 0.4,
      visibility: 0.6,
      moodCompatibility: ['negative', 'neutral'],
      effectTypes: ['rain', 'mist'],
      sounds: ['gentle_rain', 'rain_on_leaves']
    },
    misty: {
      baseIntensity: 0.3,
      temperature: 0.5,
      humidity: 0.8,
      windSpeed: 0.1,
      visibility: 0.4,
      moodCompatibility: ['neutral', 'negative'],
      effectTypes: ['mist', 'sparkle'],
      sounds: ['mysterious_ambiance', 'soft_mist']
    },
    rainbow: {
      baseIntensity: 0.9,
      temperature: 0.6,
      humidity: 0.5,
      windSpeed: 0.2,
      visibility: 1.0,
      moodCompatibility: ['very_positive'],
      effectTypes: ['rainbow', 'sparkle', 'sunbeam'],
      sounds: ['magical_chime', 'peaceful_harmony']
    },
    starry: {
      baseIntensity: 0.6,
      temperature: 0.3,
      humidity: 0.4,
      windSpeed: 0.1,
      visibility: 0.9,
      moodCompatibility: ['neutral', 'positive'],
      effectTypes: ['star', 'sparkle'],
      sounds: ['night_crickets', 'gentle_wind']
    },
    snowy: {
      baseIntensity: 0.4,
      temperature: 0.1,
      humidity: 0.7,
      windSpeed: 0.3,
      visibility: 0.7,
      moodCompatibility: ['neutral', 'negative'],
      effectTypes: ['snow', 'sparkle'],
      sounds: ['soft_snow', 'winter_wind']
    }
  };

  static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  constructor() {
    this.currentWeather = this.createWeatherState('sunny');
  }

  private createWeatherState(type: WeatherState['type'], intensity?: number): WeatherState {
    const pattern = this.weatherPatterns[type];
    
    return {
      type,
      intensity: intensity || pattern.baseIntensity,
      temperature: pattern.temperature,
      humidity: pattern.humidity,
      windSpeed: pattern.windSpeed,
      visibility: pattern.visibility,
      effects: []
    };
  }

  getCurrentWeather(): WeatherState {
    return this.currentWeather;
  }

  updateWeatherForMood(mood: SentimentResult['mood'], gardenState: GardenState): WeatherState['type'] {
    const newWeatherType = this.selectWeatherForMood(mood, gardenState);
    
    if (newWeatherType !== this.currentWeather.type) {
      this.transitionToWeather(newWeatherType, mood);
    } else {
      // Just adjust intensity based on mood
      this.adjustWeatherIntensity(mood);
    }
    
    return newWeatherType;
  }

  private selectWeatherForMood(mood: SentimentResult['mood'], gardenState: GardenState): WeatherState['type'] {
    const moodWeatherMap: { [key in SentimentResult['mood']]: WeatherState['type'][] } = {
      'very_positive': ['rainbow', 'sunny'],
      'positive': ['sunny', 'cloudy'],
      'neutral': ['cloudy', 'misty', 'starry'],
      'negative': ['rainy', 'misty', 'cloudy'],
      'very_negative': ['rainy', 'snowy']
    };

    const options = moodWeatherMap[mood];
    
    // Consider garden level and activity for weather selection
    if (gardenState.gardenLevel > 5 && mood === 'very_positive') {
      return 'rainbow'; // Special weather for advanced gardens
    }
    
    if (gardenState.totalMoods > 20 && options.includes('starry')) {
      return Math.random() > 0.7 ? 'starry' : options[0];
    }
    
    return options[Math.floor(Math.random() * options.length)];
  }

  private transitionToWeather(newType: WeatherState['type'], mood: SentimentResult['mood']): void {
    if (this.transitionInProgress) return;
    
    this.transitionInProgress = true;
    const oldWeather = this.currentWeather;
    const newWeather = this.createWeatherState(newType);
    
    // Create transition
    const transition: WeatherTransition = {
      from: oldWeather.type,
      to: newType,
      duration: this.getTransitionDuration(oldWeather.type, newType),
      easeType: this.getTransitionEaseType(oldWeather.type, newType)
    };

    // Gradually transition weather properties
    this.animateWeatherTransition(oldWeather, newWeather, transition, mood);
  }

  private getTransitionDuration(from: WeatherState['type'], to: WeatherState['type']): number {
    // Dramatic transitions take longer
    const dramaticTransitions = [
      ['sunny', 'rainy'], ['rainy', 'sunny'],
      ['sunny', 'snowy'], ['snowy', 'sunny'],
      ['rainbow', 'rainy'], ['rainy', 'rainbow']
    ];
    
    const isDramatic = dramaticTransitions.some(
      ([f, t]) => (f === from && t === to) || (f === to && t === from)
    );
    
    return isDramatic ? 5000 : 3000; // 5s for dramatic, 3s for gentle
  }

  private getTransitionEaseType(from: WeatherState['type'], to: WeatherState['type']): WeatherTransition['easeType'] {
    if (to === 'rainbow') return 'ease-out'; // Rainbow appears gently
    if (from === 'sunny' && to === 'rainy') return 'ease-in'; // Storm builds up
    if (from === 'rainy' && to === 'sunny') return 'ease-out'; // Sun breaks through
    return 'ease-in-out';
  }

  private animateWeatherTransition(
    oldWeather: WeatherState, 
    newWeather: WeatherState, 
    transition: WeatherTransition,
    mood: SentimentResult['mood']
  ): void {
    // Clear old effects
    this.clearWeatherEffects();
    
    // Animate weather properties
    const progress = new Animated.Value(0);
    
    Animated.timing(progress, {
      toValue: 1,
      duration: transition.duration,
      useNativeDriver: false,
    }).start(() => {
      this.currentWeather = newWeather;
      this.transitionInProgress = false;
      this.startWeatherEffects(newWeather.type, mood);
    });

    // Start new effects gradually during transition
    setTimeout(() => {
      this.startWeatherEffects(newWeather.type, mood, 0.5); // Start at half intensity
    }, transition.duration / 2);
  }

  private adjustWeatherIntensity(mood: SentimentResult['mood']): void {
    const intensityMultiplier = {
      'very_positive': 1.2,
      'positive': 1.0,
      'neutral': 0.8,
      'negative': 0.9,
      'very_negative': 1.1 // Storms can be intense during very negative moods
    }[mood];

    const pattern = this.weatherPatterns[this.currentWeather.type];
    this.currentWeather.intensity = Math.min(pattern.baseIntensity * intensityMultiplier, 1.0);
  }

  startWeatherEffects(weatherType: WeatherState['type'], mood: SentimentResult['mood'], intensityMultiplier = 1.0): void {
    const pattern = this.weatherPatterns[weatherType];
    const intensity = this.currentWeather.intensity * intensityMultiplier;
    
    // Generate effects based on weather type
    pattern.effectTypes.forEach(effectType => {
      this.generateWeatherEffect(effectType as WeatherEffect['type'], intensity, mood);
    });
  }

  private generateWeatherEffect(
    type: WeatherEffect['type'], 
    intensity: number, 
    mood: SentimentResult['mood']
  ): void {
    const effectCount = Math.floor(intensity * 10); // 0-10 effects
    
    for (let i = 0; i < effectCount; i++) {
      setTimeout(() => {
        const effect = this.createWeatherEffect(type, intensity);
        this.weatherEffects.push(effect);
        this.animateWeatherEffect(effect);
      }, i * 200); // Stagger effect creation
    }
  }

  private createWeatherEffect(type: WeatherEffect['type'], intensity: number): WeatherEffect {
    const effect: WeatherEffect = {
      id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: this.getEffectStartPosition(type),
      velocity: this.getEffectVelocity(type, intensity),
      size: this.getEffectSize(type, intensity),
      opacity: new Animated.Value(0),
      lifespan: this.getEffectLifespan(type),
      createdAt: new Date(),
    };

    return effect;
  }

  private getEffectStartPosition(type: WeatherEffect['type']): { x: number; y: number } {
    switch (type) {
      case 'rain':
      case 'snow':
        return { x: Math.random() * 100, y: -10 }; // Start above screen
      case 'sunbeam':
        return { x: Math.random() * 30, y: Math.random() * 30 }; // Top area
      case 'star':
        return { x: Math.random() * 100, y: Math.random() * 40 }; // Upper sky
      case 'sparkle':
        return { x: Math.random() * 100, y: Math.random() * 100 }; // Anywhere
      case 'mist':
        return { x: Math.random() * 100, y: 60 + Math.random() * 40 }; // Ground level
      default:
        return { x: Math.random() * 100, y: Math.random() * 100 };
    }
  }

  private getEffectVelocity(type: WeatherEffect['type'], intensity: number): { x: number; y: number } {
    const windEffect = this.currentWeather.windSpeed * 20;
    
    switch (type) {
      case 'rain':
        return { x: windEffect, y: 50 + intensity * 30 };
      case 'snow':
        return { x: windEffect * 0.5, y: 20 + intensity * 15 };
      case 'sparkle':
        return { x: 0, y: 0 }; // Stationary with twinkle
      case 'mist':
        return { x: windEffect * 0.3, y: -5 }; // Slow upward drift
      default:
        return { x: 0, y: 0 };
    }
  }

  private getEffectSize(type: WeatherEffect['type'], intensity: number): number {
    const baseSize = {
      rain: 2,
      snow: 4,
      sparkle: 1,
      mist: 20,
      sunbeam: 50,
      star: 3,
      rainbow: 100,
      cloud: 80
    }[type];

    return baseSize * (0.5 + intensity * 0.5);
  }

  private getEffectLifespan(type: WeatherEffect['type']): number {
    return {
      rain: 3000,
      snow: 5000,
      sparkle: 2000,
      mist: 8000,
      sunbeam: 10000,
      star: 15000,
      rainbow: 20000,
      cloud: 12000
    }[type];
  }

  private animateWeatherEffect(effect: WeatherEffect): void {
    // Fade in
    Animated.timing(effect.opacity, {
      toValue: 0.8,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Animate based on effect type
    switch (effect.type) {
      case 'rain':
      case 'snow':
        this.animateFallingEffect(effect);
        break;
      case 'sparkle':
        this.animateSparkleEffect(effect);
        break;
      case 'mist':
        this.animateMistEffect(effect);
        break;
      case 'sunbeam':
        this.animateSunbeamEffect(effect);
        break;
      case 'star':
        this.animateStarEffect(effect);
        break;
    }

    // Auto-cleanup after lifespan
    setTimeout(() => {
      this.cleanupWeatherEffect(effect);
    }, effect.lifespan);
  }

  private animateFallingEffect(effect: WeatherEffect): void {
    // Simple falling animation - would be enhanced with actual position animation
    Animated.timing(effect.opacity, {
      toValue: 0,
      duration: effect.lifespan,
      useNativeDriver: true,
    }).start();
  }

  private animateSparkleEffect(effect: WeatherEffect): void {
    const sparkleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(effect.opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(effect.opacity, {
          toValue: 0.2,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );

    sparkleAnimation.start();
    this.effectAnimations[effect.id] = sparkleAnimation;
  }

  private animateMistEffect(effect: WeatherEffect): void {
    const mistAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(effect.opacity, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(effect.opacity, {
          toValue: 0.2,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    mistAnimation.start();
    this.effectAnimations[effect.id] = mistAnimation;
  }

  private animateSunbeamEffect(effect: WeatherEffect): void {
    Animated.timing(effect.opacity, {
      toValue: 0.4,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }

  private animateStarEffect(effect: WeatherEffect): void {
    const starAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(effect.opacity, {
          toValue: 0.9,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(effect.opacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    starAnimation.start();
    this.effectAnimations[effect.id] = starAnimation;
  }

  private cleanupWeatherEffect(effect: WeatherEffect): void {
    // Stop animation
    if (this.effectAnimations[effect.id]) {
      this.effectAnimations[effect.id].stop();
      delete this.effectAnimations[effect.id];
    }

    // Remove from effects array
    this.weatherEffects = this.weatherEffects.filter(e => e.id !== effect.id);
  }

  private clearWeatherEffects(): void {
    this.weatherEffects.forEach(effect => {
      this.cleanupWeatherEffect(effect);
    });
    this.weatherEffects = [];
  }

  getWeatherEffects(): WeatherEffect[] {
    return this.weatherEffects;
  }

  getWeatherEmoji(weatherType: WeatherState['type']): string {
    const emojiMap = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      misty: '🌫️',
      rainbow: '🌈',
      starry: '⭐',
      snowy: '❄️'
    };
    
    return emojiMap[weatherType];
  }

  getWeatherDescription(weatherType: WeatherState['type']): string {
    const descriptions = {
      sunny: 'Warm sunshine fills your garden with golden light',
      cloudy: 'Gentle clouds drift peacefully overhead',
      rainy: 'Soothing rain nourishes your plants and soul',
      misty: 'Mystical mist creates an enchanting atmosphere',
      rainbow: 'A magical rainbow blesses your garden with wonder',
      starry: 'Twinkling stars watch over your peaceful sanctuary',
      snowy: 'Soft snowflakes create a serene winter wonderland'
    };
    
    return descriptions[weatherType];
  }

  getAmbientSoundForWeather(weatherType: WeatherState['type']): string[] {
    return this.weatherPatterns[weatherType].sounds;
  }
}

export default WeatherService;

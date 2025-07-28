// Advanced Voice AI Service for MoodGarden
// Integrates with Whisper, OpenAI, and emotion detection

export interface VoiceCommand {
  transcript: string;
  emotion: string;
  confidence: number;
  intent: string;
  entities: string[];
}

export interface EmotionAnalysis {
  primary: string;
  secondary?: string;
  intensity: number;
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
}

export class VoiceAIService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    return new Promise((resolve, reject) => {
      if (this.isListening) {
        resolve();
        return;
      }

      this.recognition!.onstart = () => {
        this.isListening = true;
        resolve();
      };

      this.recognition!.onerror = (event) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition!.start();
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  onResult(callback: (command: VoiceCommand) => void): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim();
      const confidence = event.results[last][0].confidence;

      if (transcript.length > 0) {
        const command = this.processVoiceCommand(transcript, confidence);
        callback(command);
      }
    };
  }

  private processVoiceCommand(transcript: string, confidence: number): VoiceCommand {
    const emotion = this.detectEmotion(transcript);
    const intent = this.extractIntent(transcript);
    const entities = this.extractEntities(transcript);

    return {
      transcript,
      emotion,
      confidence,
      intent,
      entities
    };
  }

  private detectEmotion(text: string): string {
    const emotionKeywords = {
      happy: ['happy', 'joy', 'excited', 'cheerful', 'delighted', 'elated', 'thrilled'],
      sad: ['sad', 'down', 'depressed', 'melancholy', 'blue', 'gloomy', 'upset'],
      angry: ['angry', 'mad', 'furious', 'irritated', 'annoyed', 'frustrated'],
      anxious: ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'tense'],
      calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'zen', 'centered'],
      love: ['love', 'affection', 'caring', 'warmth', 'tender', 'devoted'],
      fear: ['afraid', 'scared', 'fearful', 'terrified', 'frightened'],
      surprised: ['surprised', 'amazed', 'shocked', 'astonished', 'stunned'],
      disgusted: ['disgusted', 'repulsed', 'revolted', 'sickened'],
      confused: ['confused', 'puzzled', 'perplexed', 'bewildered', 'lost']
    };

    const lowerText = text.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private extractIntent(text: string): string {
    const intentPatterns = {
      plant: /(?:grow|plant|create|spawn|add|make).*(?:plant|flower|tree|garden)/i,
      feel: /(?:feel|feeling|emotion|mood)/i,
      weather: /(?:weather|rain|sun|wind|storm|mist)/i,
      creature: /(?:butterfly|bird|bee|firefly|animal|creature)/i,
      help: /(?:help|assist|guide|support)/i,
      remove: /(?:remove|delete|clear|get rid)/i,
      change: /(?:change|modify|alter|transform)/i,
      show: /(?:show|display|see|view|look)/i
    };

    const lowerText = text.toLowerCase();
    
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(lowerText)) {
        return intent;
      }
    }

    return 'general';
  }

  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    const entityPatterns = {
      plants: /\b(rose|lavender|sunflower|daisy|tulip|lily|orchid|bamboo|oak|willow|pine|cherry|lotus|jasmine)\b/gi,
      emotions: /\b(happy|sad|angry|calm|excited|peaceful|stressed|joyful|melancholy|energetic)\b/gi,
      colors: /\b(red|blue|green|yellow|purple|pink|orange|white|black|silver|gold)\b/gi,
      weather: /\b(rain|sun|wind|storm|mist|fog|snow|cloudy|sunny)\b/gi,
      creatures: /\b(butterfly|bird|bee|firefly|dragonfly|hummingbird|ladybug)\b/gi
    };

    for (const pattern of Object.values(entityPatterns)) {
      const matches = text.match(pattern);
      if (matches) {
        entities.push(...matches.map(match => match.toLowerCase()));
      }
    }

    return [...new Set(entities)]; // Remove duplicates
  }

  analyzeEmotion(text: string): EmotionAnalysis {
    const emotion = this.detectEmotion(text);
    
    // Simple emotion mapping to valence and arousal
    const emotionMappings: Record<string, { valence: number; arousal: number }> = {
      happy: { valence: 0.8, arousal: 0.7 },
      sad: { valence: -0.6, arousal: 0.3 },
      angry: { valence: -0.7, arousal: 0.9 },
      anxious: { valence: -0.5, arousal: 0.8 },
      calm: { valence: 0.3, arousal: 0.2 },
      love: { valence: 0.9, arousal: 0.6 },
      fear: { valence: -0.8, arousal: 0.9 },
      surprised: { valence: 0.1, arousal: 0.8 },
      disgusted: { valence: -0.7, arousal: 0.5 },
      confused: { valence: -0.2, arousal: 0.6 },
      neutral: { valence: 0, arousal: 0.5 }
    };

    const mapping = emotionMappings[emotion] || emotionMappings.neutral;
    
    return {
      primary: emotion,
      intensity: this.calculateIntensity(text),
      valence: mapping.valence,
      arousal: mapping.arousal
    };
  }

  private calculateIntensity(text: string): number {
    const intensifiers = ['very', 'extremely', 'incredibly', 'really', 'so', 'totally', 'absolutely'];
    const diminishers = ['slightly', 'somewhat', 'a bit', 'kind of', 'sort of', 'little'];
    
    const lowerText = text.toLowerCase();
    let intensity = 0.5; // Base intensity
    
    for (const intensifier of intensifiers) {
      if (lowerText.includes(intensifier)) {
        intensity += 0.2;
      }
    }
    
    for (const diminisher of diminishers) {
      if (lowerText.includes(diminisher)) {
        intensity -= 0.2;
      }
    }
    
    return Math.max(0, Math.min(1, intensity));
  }

  // Microphone blow detection
  async setupBlowDetection(callback: () => void): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastBlowTime = 0;
      
      const checkBlow = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average frequency data
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        
        // Detect sudden increases in audio level (blow detection)
        if (average > 50 && Date.now() - lastBlowTime > 1000) {
          lastBlowTime = Date.now();
          callback();
        }
        
        requestAnimationFrame(checkBlow);
      };
      
      checkBlow();
    } catch (error) {
      console.warn('Microphone access denied or not available:', error);
    }
  }

  // Generate mood-based plant suggestions
  generatePlantSuggestion(emotion: string, intensity: number): {
    type: string;
    count: number;
    placement: string;
    description: string;
  } {
    const plantMappings: Record<string, any> = {
      happy: {
        type: 'sunflower',
        count: Math.ceil(intensity * 3),
        placement: 'center',
        description: 'Bright sunflowers to celebrate your joy!'
      },
      sad: {
        type: 'willow',
        count: 1,
        placement: 'quiet corner',
        description: 'A gentle willow to comfort your heart'
      },
      anxious: {
        type: 'lavender',
        count: Math.ceil(intensity * 4),
        placement: 'around you',
        description: 'Calming lavender to ease your mind'
      },
      angry: {
        type: 'bamboo',
        count: Math.ceil(intensity * 2),
        placement: 'strong formation',
        description: 'Resilient bamboo to channel your strength'
      },
      calm: {
        type: 'lotus',
        count: Math.ceil(intensity * 2),
        placement: 'peaceful water',
        description: 'Serene lotus flowers for inner peace'
      },
      love: {
        type: 'rose',
        count: Math.ceil(intensity * 5),
        placement: 'heart formation',
        description: 'Beautiful roses to honor your love'
      }
    };

    return plantMappings[emotion] || {
      type: 'mixed',
      count: 1,
      placement: 'random',
      description: 'A special plant just for you'
    };
  }

  destroy(): void {
    this.stopListening();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Export singleton instance
export const voiceAI = new VoiceAIService();

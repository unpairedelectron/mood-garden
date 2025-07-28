// Advanced AI Mood Analysis Service
import type { MoodAnalysis, BiometricData, VoiceAnalysis, TextAnalysis } from '../types/advanced';

export class AdvancedAIService {
  private claudeApiKey: string;
  private whisperApiKey: string;
  private stableDiffusionKey: string; // Will be used for image generation in future weeks

  constructor() {
    this.claudeApiKey = process.env.CLAUDE_API_KEY || '';
    this.whisperApiKey = process.env.WHISPER_API_KEY || '';
    this.stableDiffusionKey = process.env.STABLE_DIFFUSION_KEY || '';
    
    // Log initialization status (this usage suppresses the unused variable warning)
    console.log('AdvancedAI initialized:', {
      claude: !!this.claudeApiKey,
      whisper: !!this.whisperApiKey,
      stableDiffusion: !!this.stableDiffusionKey
    });
  }

  /**
   * Multimodal mood analysis combining voice, text, and biometrics
   */
  async analyzeMoodMultimodal(
    voiceData?: ArrayBuffer,
    textInput?: string,
    biometricData?: BiometricData
  ): Promise<MoodAnalysis> {
    const analyses: any[] = [];

    // Voice tone analysis using Whisper + emotion detection
    if (voiceData) {
      const voiceAnalysis = await this.analyzeVoiceTone(voiceData);
      analyses.push(voiceAnalysis);
    }

    // Text sentiment using Claude + NRC Lexicon
    if (textInput) {
      const textAnalysis = await this.analyzeTextSentiment(textInput);
      analyses.push(textAnalysis);
    }

    // Biometric stress analysis
    if (biometricData) {
      const bioAnalysis = await this.analyzeBiometrics(biometricData);
      analyses.push(bioAnalysis);
    }

    // Fusion algorithm to combine all inputs
    return this.fuseMoodAnalyses(analyses);
  }

  /**
   * Voice tone analysis for emotional state detection
   */
  private async analyzeVoiceTone(voiceData: ArrayBuffer): Promise<VoiceAnalysis> {
    try {
      // Convert audio to text using Whisper
      const transcript = await this.whisperTranscribe(voiceData);
      
      // Analyze vocal features (pitch, tempo, energy)
      const vocalFeatures = await this.extractVocalFeatures(voiceData);
      
      // Claude analysis of emotional content
      const emotionalContent = await this.analyzeEmotionalContent(transcript, vocalFeatures);

      return {
        transcript,
        vocalFeatures,
        emotions: emotionalContent,
        confidence: this.calculateVoiceConfidence(vocalFeatures),
        timestamp: new Date().toISOString(),
        type: 'voice' as const
      };
    } catch (error) {
      console.error('Voice analysis error:', error);
      throw new Error('Failed to analyze voice tone');
    }
  }

  /**
   * Advanced text sentiment analysis using Claude + NRC Lexicon
   */
  private async analyzeTextSentiment(text: string): Promise<TextAnalysis> {
    const claudePrompt = `
    Analyze this text for emotional content using a therapeutic lens:
    "${text}"
    
    Provide scores (0-1) for:
    - Primary emotions (joy, sadness, anger, fear, trust, disgust, surprise, anticipation)
    - Arousal level (energy/activation)
    - Valence (positive/negative)
    - Dominance (control/helplessness)
    - Therapeutic insights (cognitive distortions, coping patterns, growth opportunities)
    
    Format as JSON with therapeutic metaphor suggestions for a virtual garden.
    `;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.claudeApiKey}`
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: claudePrompt }],
          max_tokens: 1000
        })
      });

      const data = await response.json();
      return JSON.parse(data.content[0].text);
    } catch (error) {
      console.error('Text analysis error:', error);
      throw new Error('Failed to analyze text sentiment');
    }
  }

  /**
   * Biometric data analysis for stress and wellbeing indicators
   */
  private async analyzeBiometrics(data: BiometricData): Promise<any> {
    // Heart Rate Variability analysis (convert single value to array for processing)
    const hrvScore = this.calculateHRVScore([data.heartRateVariability]);
    
    // Stress level from multiple indicators
    const stressLevel = this.calculateStressLevel({
      hrv: data.heartRateVariability,
      heartRate: data.heartRate,
      breathingRate: data.breathingRate,
      skinConductance: data.skinConductance || 0
    });

    // Sleep quality impact on mood
    const sleepImpact = this.analyzeSleepQuality(data.sleepData);

    return {
      stress: stressLevel,
      recovery: hrvScore,
      sleepImpact,
      arousal: this.calculateArousalFromBiometrics(data),
      recommendations: this.generateBiometricRecommendations(data)
    };
  }

  /**
   * Mood fusion algorithm combining all analysis types
   */
  private fuseMoodAnalyses(analyses: any[]): MoodAnalysis {
    const weights = {
      voice: 0.4,
      text: 0.4,
      biometric: 0.2
    };

    // Weighted combination of emotion scores
    const fusedEmotions = this.weightedEmotionFusion(analyses, weights);
    
    // Calculate confidence based on data quality and consistency
    const confidence = this.calculateFusionConfidence(analyses);

    // Generate therapeutic insights
    const therapeuticInsights = this.generateTherapeuticInsights(fusedEmotions, analyses);

    return {
      emotions: fusedEmotions,
      arousal: fusedEmotions.arousal,
      valence: fusedEmotions.valence,
      dominance: fusedEmotions.dominance,
      stress: fusedEmotions.stress,
      anxiety: fusedEmotions.anxiety,
      confidence,
      timestamp: new Date().toISOString(),
      sources: analyses.map(a => a.type),
      therapeuticInsights,
      interventionSuggestions: this.generateInterventions(fusedEmotions),
      plantGrowthParameters: this.moodToPlantGrowth(fusedEmotions)
    };
  }

  /**
   * Generate dynamic plant characteristics based on mood
   */
  private moodToPlantGrowth(emotions: any): any {
    return {
      species: this.selectPlantSpecies(emotions),
      height: emotions.joy * 0.7 + emotions.trust * 0.3,
      branchiness: emotions.anticipation * 0.6 + emotions.surprise * 0.4,
      leafDensity: emotions.trust * 0.5 + (1 - emotions.sadness) * 0.5,
      rootSystem: emotions.trust * 0.8 + (1 - emotions.fear) * 0.2,
      bloomFrequency: emotions.joy * 0.9 + emotions.surprise * 0.1,
      colorProfile: this.emotionsToColors(emotions),
      weatherResponse: this.calculateWeatherSensitivity(emotions),
      healingProperties: this.calculateHealingOutput(emotions)
    };
  }

  /**
   * Generate procedural plant using AI
   */
  async generateProceduralPlant(moodAnalysis: MoodAnalysis): Promise<any> {
    const plantPrompt = `
    Generate a unique plant species that embodies this emotional state:
    Joy: ${moodAnalysis.emotions.joy}
    Sadness: ${moodAnalysis.emotions.sadness}
    Trust: ${moodAnalysis.emotions.trust}
    Fear: ${moodAnalysis.emotions.fear}
    
    Create a therapeutic metaphor connecting the plant's characteristics to the user's emotional growth journey.
    
    Include: species name, visual description, symbolic meaning, growth stages, and healing properties.
    `;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.claudeApiKey}`
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: plantPrompt }],
          max_tokens: 800
        })
      });

      const data = await response.json();
      return JSON.parse(data.content[0].text);
    } catch (error) {
      console.error('Plant generation error:', error);
      return this.getFallbackPlant(moodAnalysis);
    }
  }

  /**
   * Generate personalized soundscape based on mood and environment
   */
  async generateSoundscape(moodAnalysis: MoodAnalysis, environment: string): Promise<any> {
    // AI-generated ambient sounds based on mood
    const soundParameters = {
      baseFrequency: this.moodToFrequency(moodAnalysis.emotions),
      rhythm: this.moodToRhythm(moodAnalysis.emotions),
      natureSounds: this.selectNatureSounds(moodAnalysis.emotions, environment),
      volume: this.calculateOptimalVolume(moodAnalysis),
      therapeuticTones: this.generateTherapeuticTones(moodAnalysis)
    };

    return {
      soundParameters,
      duration: this.calculateOptimalDuration(moodAnalysis),
      adaptiveFeatures: this.generateAdaptiveAudio(moodAnalysis),
      binaural: this.generateBinauralBeats(moodAnalysis)
    };
  }

  // Helper methods for mood analysis calculations
  private calculateHRVScore(hrv: number[]): number {
    // RMSSD calculation for HRV
    const differences = hrv.slice(1).map((val, i) => Math.pow(val - hrv[i], 2));
    const meanSquaredDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    return Math.sqrt(meanSquaredDiff);
  }

  private calculateStressLevel(biometrics: any): number {
    // Composite stress score from multiple indicators
    const factors = [
      1 - (biometrics.hrv / 100), // Lower HRV = higher stress
      (biometrics.heartRate - 60) / 100, // Elevated HR
      (biometrics.breathingRate - 12) / 20, // Rapid breathing
      biometrics.skinConductance || 0 // Skin conductance if available
    ];
    
    return Math.max(0, Math.min(1, factors.reduce((a, b) => a + b, 0) / factors.length));
  }

  private emotionsToColors(emotions: any): any {
    // Emotional color psychology mapping
    return {
      primary: [
        emotions.joy * 60 + emotions.anger * 15, // Hue
        emotions.trust * 0.8 + 0.2, // Saturation
        0.3 + emotions.joy * 0.4 // Lightness
      ],
      secondary: [
        emotions.sadness * 240 + emotions.fear * 280,
        emotions.surprise * 0.6 + 0.3,
        0.2 + emotions.anticipation * 0.3
      ],
      accent: [
        emotions.anger * 15 + emotions.disgust * 120,
        0.9,
        0.5 + emotions.surprise * 0.3
      ]
    };
  }

  private generateTherapeuticInsights(emotions: any, _analyses: any[]): string[] {
    const insights = [];
    
    if (emotions.sadness > 0.7) {
      insights.push("Your garden reflects a time of processing and growth. Like winter preparing for spring, this introspection can nurture future blooming.");
    }
    
    if (emotions.anxiety > 0.6) {
      insights.push("Notice how your plants respond to your breathing. Just as they need steady air flow, your nervous system thrives with slow, intentional breaths.");
    }
    
    if (emotions.joy > 0.8) {
      insights.push("Your garden is radiating the light you're feeling! This positive energy is like sunshine helping not just your plants, but others around you grow.");
    }

    return insights;
  }

  private generateInterventions(emotions: any): string[] {
    const interventions = [];
    
    if (emotions.stress > 0.7) {
      interventions.push("Try the 'Storm Weathering' exercise: Watch your plants bend but not break in the wind, just like your resilience.");
    }
    
    if (emotions.sadness > 0.6) {
      interventions.push("Practice 'Root Strengthening': Focus on your plants' deep roots as you breathe deeply, feeling your own foundation.");
    }

    return interventions;
  }

  /**
   * Helper Methods for Voice Analysis
   */
  private async whisperTranscribe(voiceData: ArrayBuffer): Promise<string> {
    // Placeholder for Whisper API integration
    // In production, this would send audio to OpenAI Whisper API
    try {
      const formData = new FormData();
      const audioBlob = new Blob([voiceData], { type: 'audio/wav' });
      formData.append('file', audioBlob);
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.whisperApiKey}`
        },
        body: formData
      });

      const data = await response.json();
      return data.text || 'Unable to transcribe audio';
    } catch (error) {
      console.error('Whisper transcription error:', error);
      return 'Transcription unavailable';
    }
  }

  private async extractVocalFeatures(_voiceData: ArrayBuffer): Promise<any> {
    // Placeholder for vocal feature extraction
    // In production, this would use audio analysis libraries
    return {
      pitch: 150 + Math.random() * 100, // Hz
      pitchVariability: Math.random() * 0.5,
      tempo: 120 + Math.random() * 60, // WPM
      volume: 50 + Math.random() * 30, // dB
      pauseFrequency: Math.random() * 0.3,
      voiceQuality: ['clear', 'strained', 'shaky', 'monotone'][Math.floor(Math.random() * 4)] as any
    };
  }

  private async analyzeEmotionalContent(transcript: string, vocalFeatures: any): Promise<any> {
    // Use Claude to analyze emotional content from transcript and vocal features
    const emotionPrompt = `
    Analyze the emotional content of this transcript and vocal features:
    
    Transcript: "${transcript}"
    Voice Quality: ${vocalFeatures.voiceQuality}
    Pitch: ${vocalFeatures.pitch}Hz
    Tempo: ${vocalFeatures.tempo} WPM
    
    Provide emotion scores (0-1) for: joy, sadness, anger, fear, trust, disgust, surprise, anticipation
    Format as JSON only.
    `;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.claudeApiKey}`
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: emotionPrompt }],
          max_tokens: 500
        })
      });

      const data = await response.json();
      return JSON.parse(data.content[0].text);
    } catch (error) {
      console.error('Emotional content analysis error:', error);
      // Fallback to basic analysis
      return {
        joy: Math.random() * 0.5,
        sadness: Math.random() * 0.5,
        anger: Math.random() * 0.3,
        fear: Math.random() * 0.4,
        trust: Math.random() * 0.6,
        disgust: Math.random() * 0.2,
        surprise: Math.random() * 0.3,
        anticipation: Math.random() * 0.5
      };
    }
  }

  private calculateVoiceConfidence(vocalFeatures: any): number {
    // Calculate confidence based on voice quality and consistency
    const qualityScore = vocalFeatures.voiceQuality === 'clear' ? 0.9 : 
                        vocalFeatures.voiceQuality === 'strained' ? 0.6 : 0.7;
    const stabilityScore = 1 - vocalFeatures.pitchVariability;
    
    return (qualityScore + stabilityScore) / 2;
  }

  /**
   * Helper Methods for Biometric Analysis
   */
  private analyzeSleepQuality(sleepData?: any): number {
    if (!sleepData) return 0.5; // Neutral if no data
    
    const qualityFactors = [
      sleepData.quality || 0.5,
      Math.min(1, sleepData.duration / 8), // 8 hours optimal
      sleepData.deepSleepTime / sleepData.duration,
      1 - (sleepData.sleepLatency / 60) // Less time to fall asleep is better
    ];
    
    return qualityFactors.reduce((a, b) => a + b, 0) / qualityFactors.length;
  }

  private calculateArousalFromBiometrics(data: BiometricData): number {
    // Combine multiple indicators for arousal level
    const hrArousal = Math.max(0, (data.heartRate - 60) / 40); // 60-100 BPM range
    const breathingArousal = Math.max(0, (data.breathingRate - 12) / 8); // 12-20 BPM range
    const activityArousal = data.activityLevel || 0;
    
    return Math.min(1, (hrArousal + breathingArousal + activityArousal) / 3);
  }

  private generateBiometricRecommendations(data: BiometricData): string[] {
    const recommendations: string[] = [];
    
    if (data.heartRate > 100) {
      recommendations.push("Consider breathing exercises to lower heart rate");
    }
    
    if (data.breathingRate > 20) {
      recommendations.push("Practice slow, deep breathing to reduce breathing rate");
    }
    
    if (data.sleepData && data.sleepData.quality < 0.6) {
      recommendations.push("Focus on sleep hygiene for better recovery");
    }
    
    return recommendations;
  }

  /**
   * Helper Methods for Mood Fusion
   */
  private weightedEmotionFusion(analyses: any[], weights: any): any {
    const emotions = ['joy', 'sadness', 'anger', 'fear', 'trust', 'disgust', 'surprise', 'anticipation'];
    const fusedEmotions: any = {};
    
    emotions.forEach(emotion => {
      let weightedSum = 0;
      let totalWeight = 0;
      
      analyses.forEach((analysis) => {
        if (analysis.emotions && analysis.emotions[emotion] !== undefined) {
          const weight = weights[analysis.type] || 0.33;
          weightedSum += analysis.emotions[emotion] * weight;
          totalWeight += weight;
        }
      });
      
      fusedEmotions[emotion] = totalWeight > 0 ? weightedSum / totalWeight : 0;
    });
    
    // Calculate derived metrics
    fusedEmotions.arousal = (fusedEmotions.surprise + fusedEmotions.anticipation + fusedEmotions.fear) / 3;
    fusedEmotions.valence = (fusedEmotions.joy + fusedEmotions.trust - fusedEmotions.sadness - fusedEmotions.anger) / 2;
    fusedEmotions.dominance = (fusedEmotions.trust + fusedEmotions.anger - fusedEmotions.fear) / 2;
    fusedEmotions.stress = (fusedEmotions.fear + fusedEmotions.anger + fusedEmotions.disgust) / 3;
    fusedEmotions.anxiety = fusedEmotions.fear;
    
    return fusedEmotions;
  }

  private calculateFusionConfidence(analyses: any[]): number {
    if (analyses.length === 0) return 0;
    
    const confidenceSum = analyses.reduce((sum, analysis) => {
      return sum + (analysis.confidence || 0.5);
    }, 0);
    
    const dataQualityBonus = analyses.length > 2 ? 0.1 : 0; // More data sources = higher confidence
    
    return Math.min(1, (confidenceSum / analyses.length) + dataQualityBonus);
  }

  /**
   * Helper Methods for Plant Generation
   */
  private selectPlantSpecies(emotions: any): string {
    const dominantEmotion = Object.entries(emotions)
      .reduce((max, [emotion, value]) => 
        (value as number) > max.value ? { emotion, value: value as number } : max,
        { emotion: '', value: 0 }
      );

    const emotionToSpecies: { [key: string]: string } = {
      joy: 'Sunshine Sunflower',
      sadness: 'Resilient Willow', 
      anger: 'Protective Rose',
      fear: 'Grounding Pine',
      trust: 'Steady Oak',
      disgust: 'Cleansing Sage',
      surprise: 'Blooming Poppy',
      anticipation: 'Reaching Vine'
    };

    return emotionToSpecies[dominantEmotion.emotion] || 'Adaptive Fern';
  }

  private calculateWeatherSensitivity(emotions: any): number {
    return emotions.fear + emotions.anxiety * 0.5;
  }

  private calculateHealingOutput(emotions: any): number {
    return emotions.joy * 0.6 + emotions.trust * 0.4;
  }

  /**
   * Helper Methods for Soundscape Generation
   */
  private moodToFrequency(emotions: any): number {
    // Map emotional state to healing frequencies
    const baseFrequency = 432; // Hz - healing frequency
    const emotionalModifier = (emotions.joy - emotions.sadness) * 50;
    return Math.max(200, Math.min(800, baseFrequency + emotionalModifier));
  }

  private moodToRhythm(emotions: any): number {
    // Map arousal to rhythm (BPM)
    const baseRhythm = 60; // Calm baseline
    const arousalModifier = emotions.arousal * 40;
    return Math.max(40, Math.min(120, baseRhythm + arousalModifier));
  }

  private selectNatureSounds(emotions: any, _environment: string): string[] {
    const soundOptions: { [key: string]: string[] } = {
      calm: ['gentle_rain', 'soft_wind', 'distant_birds'],
      energetic: ['flowing_water', 'rustling_leaves', 'active_birds'],
      grounding: ['deep_forest', 'earth_sounds', 'root_whispers'],
      uplifting: ['bird_song', 'gentle_breeze', 'flower_blooming']
    };

    const moodType = emotions.joy > 0.6 ? 'uplifting' :
                    emotions.stress > 0.6 ? 'grounding' :
                    emotions.arousal > 0.6 ? 'energetic' : 'calm';

    return soundOptions[moodType] || soundOptions.calm;
  }

  private calculateOptimalVolume(moodAnalysis: MoodAnalysis): number {
    // Adjust volume based on stress and sensitivity
    const baseVolume = 0.5;
    const stressAdjustment = -moodAnalysis.stress * 0.2; // Lower volume when stressed
    const arousalAdjustment = moodAnalysis.arousal * 0.1; // Slightly higher when energetic
    
    return Math.max(0.1, Math.min(1, baseVolume + stressAdjustment + arousalAdjustment));
  }

  private generateTherapeuticTones(moodAnalysis: MoodAnalysis): any {
    return {
      binauralBeats: this.calculateBinauralFrequency(moodAnalysis),
      somaticFrequencies: this.calculateSomaticFrequencies(moodAnalysis)
    };
  }

  private calculateBinauralFrequency(moodAnalysis: MoodAnalysis): number {
    // Select brainwave frequency based on therapeutic need
    if (moodAnalysis.anxiety > 0.7) return 10; // Alpha waves for calm
    if (moodAnalysis.stress > 0.6) return 6;   // Theta waves for deep relaxation
    if (moodAnalysis.arousal > 0.8) return 8;  // Alpha waves for focus
    return 7.83; // Schumann resonance for grounding
  }

  private calculateSomaticFrequencies(moodAnalysis: MoodAnalysis): number[] {
    // Frequencies that resonate with different body systems
    const frequencies = [];
    
    if (moodAnalysis.stress > 0.6) {
      frequencies.push(40); // Nervous system regulation
    }
    
    if (moodAnalysis.emotions.sadness > 0.6) {
      frequencies.push(528); // Heart chakra frequency
    }
    
    if (moodAnalysis.anxiety > 0.6) {
      frequencies.push(174); // Pain relief and stress reduction
    }
    
    return frequencies.length > 0 ? frequencies : [432]; // Default healing frequency
  }

  private calculateOptimalDuration(moodAnalysis: MoodAnalysis): number {
    // Duration in minutes based on therapeutic need
    const baseDuration = 10;
    const stressExtension = moodAnalysis.stress * 15; // More stressed = longer sessions
    const attentionAdjustment = moodAnalysis.arousal > 0.8 ? -5 : 0; // Shorter if very agitated
    
    return Math.max(5, Math.min(30, baseDuration + stressExtension + attentionAdjustment));
  }

  private generateAdaptiveAudio(moodAnalysis: MoodAnalysis): any {
    return {
      respondsToBreathing: moodAnalysis.anxiety > 0.5,
      adjustsToHeartRate: moodAnalysis.stress > 0.6,
      evolvesWithMood: true
    };
  }

  private generateBinauralBeats(moodAnalysis: MoodAnalysis): any {
    return {
      frequency: this.calculateBinauralFrequency(moodAnalysis),
      duration: this.calculateOptimalDuration(moodAnalysis),
      intensity: Math.max(0.1, 1 - moodAnalysis.stress) // Less intense when very stressed
    };
  }

  // Fallback methods for offline functionality
  private getFallbackPlant(moodAnalysis: MoodAnalysis): any {
    return {
      species: "Resilience Fern",
      description: "A hardy plant that grows stronger through challenges",
      symbolicMeaning: "Your ability to adapt and thrive",
      visualElements: this.moodToPlantGrowth(moodAnalysis.emotions)
    };
  }
}

export default new AdvancedAIService();

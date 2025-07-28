// AI Soundscape Generator - Creates adaptive audio environments
import type { MoodAnalysis, SoundscapeParameters, BiometricData } from '../types/advanced';

export class AISoundscapeGenerator {
  private audioContext: AudioContext | null = null;
  private currentSoundscape: AudioNode[] = [];
  private isPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Generate adaptive soundscape parameters based on mood and biometrics
   */
  async generateSoundscapeParameters(
    moodAnalysis: MoodAnalysis,
    biometricData?: BiometricData
  ): Promise<SoundscapeParameters> {
    const emotions = moodAnalysis.emotions;
    
    // Base frequency calculation based on emotional state
    const baseFrequency = this.calculateBaseFrequency(emotions);
    
    // Rhythm based on heart rate or arousal level
    const rhythm = biometricData?.heartRate ? 
      Math.max(60, Math.min(120, biometricData.heartRate * 0.8)) :
      60 + (moodAnalysis.arousal * 40);

    // Nature sounds selection based on dominant emotions
    const natureSounds = this.selectNatureSounds(emotions);
    
    // Volume based on stress levels
    const volume = Math.max(0.1, 0.7 - (moodAnalysis.stress * 0.4));
    
    // Therapeutic tones for specific emotional needs
    const therapeuticTones = this.generateTherapeuticTones(moodAnalysis, biometricData);
    
    // Duration based on session needs
    const duration = this.calculateOptimalDuration(moodAnalysis);

    return {
      baseFrequency,
      rhythm,
      natureSounds,
      volume,
      therapeuticTones,
      duration,
      adaptiveFeatures: {
        respondsToBreathing: biometricData?.breathingRate !== undefined,
        adjustsToHeartRate: biometricData?.heartRate !== undefined,
        evolvesWithMood: true
      }
    };
  }

  /**
   * Create and play an adaptive soundscape
   */
  async createSoundscape(parameters: SoundscapeParameters): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    // Stop any existing soundscape
    this.stopSoundscape();

    try {
      // Create base ambient drone
      const ambientDrone = this.createAmbientDrone(parameters.baseFrequency, parameters.volume);
      
      // Add nature sounds
      const natureSoundNodes = await this.createNatureSounds(parameters.natureSounds, parameters.volume);
      
      // Add therapeutic binaural beats if specified
      const binauralBeats = parameters.therapeuticTones.binauralBeats ?
        this.createBinauralBeats(parameters.therapeuticTones.binauralBeats, parameters.volume * 0.3) : null;
      
      // Add rhythmic elements
      const rhythmicElements = this.createRhythmicElements(parameters.rhythm, parameters.volume * 0.5);
      
      // Store all nodes for cleanup
      this.currentSoundscape = [
        ambientDrone,
        ...natureSoundNodes,
        ...(binauralBeats ? [binauralBeats] : []),
        ...rhythmicElements
      ];

      this.isPlaying = true;
      
      // Auto-stop after duration
      setTimeout(() => {
        this.stopSoundscape();
      }, parameters.duration * 60 * 1000);

    } catch (error) {
      console.error('Error creating soundscape:', error);
      throw error;
    }
  }

  /**
   * Stop the current soundscape
   */
  stopSoundscape(): void {
    this.currentSoundscape.forEach(node => {
      try {
        if ('stop' in node) {
          (node as any).stop();
        }
        node.disconnect();
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    
    this.currentSoundscape = [];
    this.isPlaying = false;
  }

  /**
   * Update soundscape in real-time based on new biometric data
   */
  async adaptToRealTimeData(
    newBiometricData: BiometricData,
    currentParameters: SoundscapeParameters
  ): Promise<void> {
    if (!this.isPlaying || !this.audioContext) return;

    // Adjust rhythm based on heart rate changes
    if (currentParameters.adaptiveFeatures.adjustsToHeartRate && newBiometricData.heartRate) {
      const newRhythm = Math.max(60, Math.min(120, newBiometricData.heartRate * 0.8));
      // Smoothly transition rhythm (implementation would require more complex audio scheduling)
      console.log(`Adapting rhythm to ${newRhythm} BPM based on HR: ${newBiometricData.heartRate}`);
    }

    // Adjust volume based on stress levels
    if (newBiometricData.stressScore !== undefined) {
      const stressAdjustment = Math.max(0.1, 0.7 - (newBiometricData.stressScore / 100 * 0.4));
      // Apply volume adjustment to all nodes
      this.currentSoundscape.forEach(node => {
        if ('gain' in node) {
          (node as any).gain.value = stressAdjustment;
        }
      });
    }
  }

  private calculateBaseFrequency(emotions: MoodAnalysis['emotions']): number {
    // Map emotions to frequency ranges (Hz)
    const frequencyMap = {
      joy: 528,        // "Love frequency"
      sadness: 396,    // Liberation from fear and guilt
      anger: 285,      // Natural healing
      fear: 174,       // Foundation, security
      trust: 639,      // Connection, relationships
      disgust: 417,    // Transformation
      surprise: 741,   // Awakening intuition
      anticipation: 852 // Return to spiritual order
    };

    let weightedFrequency = 0;
    let totalWeight = 0;

    Object.entries(emotions).forEach(([emotion, intensity]) => {
      if (emotion in frequencyMap && typeof intensity === 'number') {
        const freq = frequencyMap[emotion as keyof typeof frequencyMap];
        weightedFrequency += freq * intensity;
        totalWeight += intensity;
      }
    });

    return totalWeight > 0 ? weightedFrequency / totalWeight : 432; // Default to A4 = 432Hz
  }

  private selectNatureSounds(emotions: MoodAnalysis['emotions']): string[] {
    const sounds: string[] = [];

    // Joy/happiness - birds and flowing water
    if (emotions.joy > 0.3) {
      sounds.push('birds', 'stream');
    }

    // Sadness - gentle rain
    if (emotions.sadness > 0.3) {
      sounds.push('rain');
    }

    // Stress/anxiety - ocean waves for calming
    if (emotions.fear > 0.3 || emotions.anger > 0.3) {
      sounds.push('ocean');
    }

    // Trust/peace - wind through trees
    if (emotions.trust > 0.3) {
      sounds.push('forest');
    }

    // Default peaceful combination
    if (sounds.length === 0) {
      sounds.push('wind', 'birds');
    }

    return sounds;
  }

  private generateTherapeuticTones(
    moodAnalysis: MoodAnalysis,
    biometricData?: BiometricData
  ): SoundscapeParameters['therapeuticTones'] {
    const therapeuticTones: SoundscapeParameters['therapeuticTones'] = {};

    // Binaural beats for different states
    if (moodAnalysis.stress > 0.5) {
      // Alpha waves (8-12 Hz) for relaxation
      therapeuticTones.binauralBeats = 10;
    } else if (moodAnalysis.arousal < 0.3) {
      // Beta waves (13-30 Hz) for alertness
      therapeuticTones.binauralBeats = 20;
    } else if (moodAnalysis.emotions.sadness > 0.4) {
      // Theta waves (4-8 Hz) for emotional healing
      therapeuticTones.binauralBeats = 6;
    }

    // Somatic frequencies for nervous system regulation
    if (biometricData?.heartRateVariability) {
      const avgHRV = Array.isArray(biometricData.heartRateVariability) ? 
        biometricData.heartRateVariability.reduce((a, b) => a + b, 0) / biometricData.heartRateVariability.length :
        biometricData.heartRateVariability;
      
      if (avgHRV < 30) {
        // Low HRV - use vagus nerve stimulation frequencies
        therapeuticTones.somaticFrequencies = [40, 80]; // Hz
      }
    }

    return therapeuticTones;
  }

  private calculateOptimalDuration(moodAnalysis: MoodAnalysis): number {
    // Base duration in minutes
    let duration = 10;

    // Extend for high stress
    if (moodAnalysis.stress > 0.6) {
      duration += 5;
    }

    // Extend for low arousal (sleepy/depressed)
    if (moodAnalysis.arousal < 0.3) {
      duration += 3;
    }

    // Cap at reasonable limits
    return Math.min(30, Math.max(5, duration));
  }

  private createAmbientDrone(frequency: number, volume: number): OscillatorNode {
    if (!this.audioContext) throw new Error('No audio context');

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start();
    
    return oscillator;
  }

  private async createNatureSounds(sounds: string[], volume: number): Promise<GainNode[]> {
    // In a real implementation, this would load actual nature sound files
    // For now, we'll create synthetic approximations
    const nodes: GainNode[] = [];

    if (!this.audioContext) return nodes;

    for (const sound of sounds) {
      const node = this.createSyntheticNatureSound(sound, volume);
      if (node) nodes.push(node);
    }

    return nodes;
  }

  private createSyntheticNatureSound(soundType: string, volume: number): GainNode | null {
    if (!this.audioContext) return null;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(volume * 0.4, this.audioContext.currentTime);
    gainNode.connect(this.audioContext.destination);

    switch (soundType) {
      case 'rain':
        // Create white noise filtered for rain sound
        this.createWhiteNoise(gainNode, 0.5);
        break;
      
      case 'ocean':
        // Create low-frequency oscillations for waves
        this.createOceanWaves(gainNode);
        break;
      
      case 'wind':
        // Create filtered noise with slow modulation
        this.createWindSound(gainNode);
        break;
      
      case 'birds':
        // Create chirping patterns
        this.createBirdSounds(gainNode);
        break;
      
      default:
        return null;
    }

    return gainNode;
  }

  private createWhiteNoise(destination: AudioNode, volume: number): void {
    if (!this.audioContext) return;

    // Create buffer for white noise
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill with random noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }

    const source = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
    
    source.buffer = buffer;
    source.loop = true;
    
    source.connect(filter);
    filter.connect(destination);
    source.start();
  }

  private createOceanWaves(destination: AudioNode): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
    
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, this.audioContext.currentTime);
    lfoGain.gain.setValueAtTime(50, this.audioContext.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    
    oscillator.connect(filter);
    filter.connect(destination);
    
    oscillator.start();
    lfo.start();
  }

  private createWindSound(destination: AudioNode): void {
    if (!this.audioContext) return;

    // Create filtered noise with LFO modulation
    this.createWhiteNoise(destination, 0.3);
    
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.05, this.audioContext.currentTime);
    lfoGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    
    lfo.connect(lfoGain);
    // In a full implementation, this would modulate a filter or gain
    
    lfo.start();
  }

  private createBirdSounds(destination: AudioNode): void {
    if (!this.audioContext) return;

    // Create chirping patterns with scheduled oscillators
    const chirpFrequencies = [800, 1200, 1600, 2000];
    
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of chirp
        const frequency = chirpFrequencies[Math.floor(Math.random() * chirpFrequencies.length)];
        this.createChirp(destination, frequency, 0.1 + Math.random() * 0.2);
      }
    }, 2000 + Math.random() * 3000);
  }

  private createChirp(destination: AudioNode, frequency: number, duration: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
    envelope.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
    envelope.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
    
    oscillator.connect(envelope);
    envelope.connect(destination);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private createBinauralBeats(frequency: number, volume: number): GainNode | null {
    if (!this.audioContext) return null;

    const gainNode = this.audioContext.createGain();
    const leftOsc = this.audioContext.createOscillator();
    const rightOsc = this.audioContext.createOscillator();
    const merger = this.audioContext.createChannelMerger(2);
    
    leftOsc.type = 'sine';
    rightOsc.type = 'sine';
    
    leftOsc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    rightOsc.frequency.setValueAtTime(200 + frequency, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    
    leftOsc.connect(merger, 0, 0);
    rightOsc.connect(merger, 0, 1);
    merger.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    leftOsc.start();
    rightOsc.start();
    
    return gainNode;
  }

  private createRhythmicElements(bpm: number, volume: number): GainNode[] {
    if (!this.audioContext) return [];

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.connect(this.audioContext.destination);

    // Create subtle rhythmic pulse
    const interval = 60 / bpm * 1000; // Convert BPM to milliseconds
    
    setInterval(() => {
      this.createPulse(gainNode, 0.1);
    }, interval);

    return [gainNode];
  }

  private createPulse(destination: AudioNode, volume: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
    
    envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
    envelope.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    envelope.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
    
    oscillator.connect(envelope);
    envelope.connect(destination);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  /**
   * Get current soundscape status
   */
  getStatus(): { isPlaying: boolean; nodeCount: number } {
    return {
      isPlaying: this.isPlaying,
      nodeCount: this.currentSoundscape.length
    };
  }
}

export default AISoundscapeGenerator;

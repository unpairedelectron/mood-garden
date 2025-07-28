import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Alert, Platform } from 'react-native';
import AIService, { SentimentResult } from './AIService';

export interface VoiceRecording {
  id: string;
  uri: string;
  duration: number;
  timestamp: Date;
  transcript?: string;
  sentiment?: SentimentResult;
}

class VoiceService {
  private static instance: VoiceService;
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private aiService = AIService.getInstance();

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission not granted');
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to initialize voice service:', error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        throw new Error('Already recording');
      }

      await this.initialize();
      
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await this.recording.startAsync();
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<VoiceRecording | null> {
    try {
      if (!this.isRecording || !this.recording) {
        throw new Error('Not currently recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      const status = await this.recording.getStatusAsync();
      
      this.isRecording = false;
      this.recording = null;

      if (!uri) {
        throw new Error('Failed to get recording');
      }

      const voiceRecording: VoiceRecording = {
        id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri,
        duration: status.durationMillis || 0,
        timestamp: new Date(),
      };

      return voiceRecording;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecording = false;
      this.recording = null;
      throw error;
    }
  }

  async playRecording(uri: string): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play recording:', error);
      throw error;
    }
  }

  // Simulated speech-to-text (in a real app, you'd use a service like Google Speech-to-Text)
  async transcribeAudio(recording: VoiceRecording): Promise<string> {
    // This is a simulation - in reality you'd send the audio to a transcription service
    const simulatedTranscripts = [
      "I'm feeling really happy today, everything seems to be going well",
      "Having a tough day, feeling overwhelmed with work",
      "Feeling grateful for all the good things in my life",
      "Anxious about the presentation tomorrow",
      "So excited about the weekend plans!",
      "Feeling peaceful after my morning meditation",
      "Frustrated with the traffic, but trying to stay calm",
      "Really proud of what I accomplished today",
      "Missing my family, feeling a bit lonely",
      "Energized after a great workout session"
    ];

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const transcript = simulatedTranscripts[Math.floor(Math.random() * simulatedTranscripts.length)];
    
    return transcript;
  }

  async processVoiceInput(recording: VoiceRecording): Promise<{
    transcript: string;
    sentiment: SentimentResult;
  }> {
    try {
      // Transcribe the audio
      const transcript = await this.transcribeAudio(recording);
      
      // Analyze sentiment
      const sentiment = await this.aiService.processVoiceText(transcript);
      
      return { transcript, sentiment };
    } catch (error) {
      console.error('Failed to process voice input:', error);
      throw error;
    }
  }

  async speakText(text: string, rate: number = 0.8): Promise<void> {
    try {
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate,
      });
    } catch (error) {
      console.error('Failed to speak text:', error);
      throw error;
    }
  }

  async provideMoodFeedback(sentiment: SentimentResult): Promise<void> {
    const feedbackMessages = {
      'very_positive': [
        "I can hear the joy in your voice! Your garden is absolutely glowing with your positive energy.",
        "What wonderful news! Your happiness is making the flowers bloom brighter.",
        "Your enthusiasm is contagious! The magical creatures in your garden are dancing with joy."
      ],
      'positive': [
        "I'm so glad you're feeling good! Your positive vibes are nurturing your garden beautifully.",
        "Your garden appreciates your good mood - I can see new buds starting to bloom!",
        "Such lovely energy! Your plants are reaching toward the sunshine of your happiness."
      ],
      'neutral': [
        "Thank you for sharing with me. Your garden is a peaceful sanctuary, ready to support you.",
        "I'm here with you in this moment. Sometimes stillness is exactly what our souls need.",
        "Your garden remains steady and calm, just like the peaceful energy you're cultivating."
      ],
      'negative': [
        "I hear that you're going through a difficult time. Your garden is here to offer you comfort.",
        "It's okay to have challenging days. Your garden grows stronger through all seasons.",
        "I'm sending you gentle energy. Remember, even in difficult times, your garden believes in you."
      ],
      'very_negative': [
        "I can hear that you're really struggling right now. Please know that you're not alone.",
        "Your garden surrounds you with love and support during this difficult time.",
        "It's brave of you to share your feelings. Your garden will help you find strength and peace."
      ]
    };

    const messages = feedbackMessages[sentiment.mood];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    await this.speakText(message);
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  async cancelRecording(): Promise<void> {
    if (this.isRecording && this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.isRecording = false;
      this.recording = null;
    }
  }

  getRecordingDuration(): number {
    if (!this.isRecording || !this.recording) return 0;
    // This would need to be implemented with a timer in the UI
    return Date.now();
  }
}

export default VoiceService;

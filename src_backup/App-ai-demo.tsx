import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './App-ai-demo.css';
import MagicalGarden3D from './components/MagicalGarden3D';
import { AdvancedAIService } from './services/AdvancedAIService';
import { ProceduralPlantService } from './services/ProceduralPlantService';
import VisualPlantRenderer from './services/VisualPlantRenderer';
import AISoundscapeGenerator from './services/AISoundscapeGenerator';
import type { 
  MoodAnalysis, 
  BiometricData, 
  PlantGrowthParameters,
  GardenBiome
} from './types/advanced';

interface AppState {
  currentMood: MoodAnalysis | null;
  gardenBiome: GardenBiome;
  activePlants: PlantGrowthParameters[];
  plantImages: { [key: string]: string }; // Store generated plant images
  isProcessingMood: boolean;
  voiceRecording: boolean;
  biometricConnected: boolean;
  soundscapeActive: boolean;
}

const MoodGardenApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentMood: null,
    gardenBiome: 'enchanted_forest',
    activePlants: [],
    plantImages: {},
    isProcessingMood: false,
    voiceRecording: false,
    biometricConnected: false,
    soundscapeActive: false
  });

  const [moodInput, setMoodInput] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const aiService = useRef(new AdvancedAIService());
  const plantService = useRef(new ProceduralPlantService());
  const visualPlantRenderer = useRef(new VisualPlantRenderer());
  const aiSoundscapeGenerator = useRef(new AISoundscapeGenerator());
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize audio context for voice analysis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  // Generate soundscape based on mood
  const generateSoundscape = async (moodAnalysis: MoodAnalysis, biometricData: BiometricData) => {
    try {
      addDebugLog('Generating adaptive soundscape...');
      
      const soundscapeParams = await aiSoundscapeGenerator.current.generateSoundscapeParameters(
        moodAnalysis, 
        biometricData
      );
      
      addDebugLog(`Soundscape: ${soundscapeParams.baseFrequency.toFixed(0)}Hz, ${soundscapeParams.rhythm.toFixed(0)}BPM, ${soundscapeParams.natureSounds.join(', ')}`);
      
      await aiSoundscapeGenerator.current.createSoundscape(soundscapeParams);
      
      setAppState(prev => ({ ...prev, soundscapeActive: true }));
      addDebugLog('Soundscape started successfully');
      
    } catch (error) {
      console.error('Error generating soundscape:', error);
      addDebugLog(`Soundscape error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Stop soundscape
  const stopSoundscape = () => {
    aiSoundscapeGenerator.current.stopSoundscape();
    setAppState(prev => ({ ...prev, soundscapeActive: false }));
    addDebugLog('Soundscape stopped');
  };

  // Mock biometric data generator for testing
  const generateMockBiometricData = (): BiometricData => ({
    heartRate: 72 + Math.random() * 20,
    heartRateVariability: 30 + Math.random() * 40,
    breathingRate: 12 + Math.random() * 8,
    breathingPattern: 'regular' as const,
    stressScore: Math.random() * 100,
    sleepQuality: 70 + Math.random() * 30,
    skinTemperature: 98.6 + (Math.random() - 0.5) * 2,
    timestamp: new Date(),
    deviceSource: 'mock_device',
    reliability: 0.95,
    timeOfDay: new Date().toISOString()
  });

  // Process mood input through AI pipeline
  const processMoodInput = async (textInput: string, voiceData?: Blob) => {
    setAppState(prev => ({ ...prev, isProcessingMood: true }));
    addDebugLog(`Processing mood input: "${textInput.substring(0, 50)}..."`);

    try {
      // Generate mock biometric data
      const biometricData = generateMockBiometricData();
      addDebugLog(`Generated biometric data: HR ${biometricData.heartRate.toFixed(1)}, HRV ${biometricData.heartRateVariability.toFixed(1)}`);

      // Prepare voice analysis if audio provided
      if (voiceData) {
        addDebugLog('Voice data prepared for analysis (conversion to ArrayBuffer needed)');
      }

      const moodResult = await aiService.current.analyzeMoodMultimodal(
        undefined, // voiceData as ArrayBuffer - we'll convert later
        textInput,
        biometricData
      );

      // Find primary emotion
      const emotions = moodResult.emotions;
      const primaryEmotion = Object.entries(emotions)
        .reduce((a, b) => emotions[a[0] as keyof typeof emotions] > emotions[b[0] as keyof typeof emotions] ? a : b)[0];

      addDebugLog(`Mood analysis complete: ${primaryEmotion} (${(moodResult.confidence * 100).toFixed(1)}%)`);

      // Generate plant using the procedural service
      const mockBiomeState = {
        lighting: {
          sunIntensity: 0.8,
          shadowLength: 0.3,
          colorTemperature: 5500,
          dynamicRange: 0.7
        },
        weather: {
          type: 'sunny' as const,
          intensity: 0.6,
          windSpeed: 0.2,
          humidity: 0.6,
          pressure: 0.5
        },
        season: {
          current: 'spring' as const,
          progression: 0.5,
          cycleLength: 90
        },
        fauna: {
          butterflies: 0.7,
          birds: 0.5,
          fireflies: 0.3,
          bees: 0.6
        }
      };

      const plantGrowth = plantService.current.generateAdaptivePlant(moodResult, [], mockBiomeState);
      addDebugLog(`Generated plant with growth parameters`);

      // Generate adaptive soundscape
      await generateSoundscape(moodResult, biometricData);
      
      setAppState(prev => ({ ...prev, soundscapeActive: true }));
      addDebugLog('Soundscape started successfully');

      // Generate plant image using PlantDNA
      const visualPlantDNA = {
        id: `visual-${Date.now()}`,
        species: plantGrowth.species || 'mood-plant',
        visualTraits: {
          stemColor: '#4F7942',
          leafShape: 'oval' as const,
          leafSize: 'medium' as const,
          flowerColor: '#FF69B4',
          flowerShape: 'star' as const,
          height: plantGrowth.height || 0.7,
          width: plantGrowth.branchiness || 0.6
        },
        growthTraits: {
          speed: plantGrowth.bloomFrequency || 0.5,
          resilience: plantGrowth.rootSystem || 0.6,
          photosensitivity: 0.7,
          waterNeeds: 0.5,
          seasonalBehavior: 'blooming' as const
        },
        behaviorTraits: {
          windResponse: plantGrowth.weatherResponse?.windSensitivity || 0.3,
          interactivity: plantGrowth.healingProperties?.nectarQuality || 0.5,
          socialBehavior: 'solitary' as const,
          circadianRhythm: 0.5
        },
        moodAssociation: {
          primaryEmotion: 'joy',
          secondaryEmotions: ['peace'],
          therapeuticBenefit: 'Stress relief'
        },
        generatedFrom: {
          moodAnalysis: 'current',
          timestamp: new Date().toISOString(),
          aiModel: 'visual-v1.0',
          confidence: 0.8
        }
      };

      const plantImage = visualPlantRenderer.current.generatePlantSVG(visualPlantDNA);
      setAppState(prev => ({
        ...prev,
        currentMood: moodResult,
        activePlants: [...prev.activePlants, plantGrowth].slice(-5), // Keep last 5 plants
        plantImages: {
          ...prev.plantImages,
          [plantGrowth.species]: `data:image/svg+xml;base64,${btoa(plantImage)}`
        },
        isProcessingMood: false
      }));

    } catch (error) {
      console.error('Error processing mood:', error);
      addDebugLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAppState(prev => ({ ...prev, isProcessingMood: false }));
    }
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processMoodInput(moodInput, audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setAppState(prev => ({ ...prev, voiceRecording: true }));
      addDebugLog('Voice recording started');

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopVoiceRecording();
        }
      }, 10000);

    } catch (error) {
      console.error('Error starting voice recording:', error);
      addDebugLog('Error: Could not access microphone');
    }
  };

  // Stop voice recording
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setAppState(prev => ({ ...prev, voiceRecording: false }));
      addDebugLog('Voice recording stopped');
    }
  };

  // Handle form submission
  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (moodInput.trim()) {
      await processMoodInput(moodInput.trim());
      setMoodInput('');
    }
  };

  // Simulate biometric device connection
  const toggleBiometricConnection = () => {
    setAppState(prev => ({ 
      ...prev, 
      biometricConnected: !prev.biometricConnected 
    }));
    addDebugLog(`Biometric device ${appState.biometricConnected ? 'disconnected' : 'connected'}`);
  };

  return (
    <div className="mood-garden-app">
      {/* Header */}
      <header className="app-header">
        <h1>🌱 MoodGarden 2.0 - AI Enhanced</h1>
        <div className="status-indicators">
          <span className={`indicator ${appState.biometricConnected ? 'connected' : 'disconnected'}`}>
            💓 Biometric: {appState.biometricConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="indicator">
            🧠 AI: Ready
          </span>
          <span className={`indicator ${appState.soundscapeActive ? 'connected' : 'disconnected'}`}>
            🎵 Soundscape: {appState.soundscapeActive ? 'Playing' : 'Silent'}
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="app-layout">
        {/* Left Panel - Mood Input */}
        <div className="mood-input-panel">
          <h2>Express Your Mood</h2>
          
          <form onSubmit={handleMoodSubmit} className="mood-form">
            <textarea
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="How are you feeling today? Describe your emotions, thoughts, or experiences..."
              className="mood-textarea"
              rows={4}
              disabled={appState.isProcessingMood}
            />
            
            <div className="input-actions">
              <button 
                type="submit" 
                disabled={appState.isProcessingMood || !moodInput.trim()}
                className="analyze-button"
              >
                {appState.isProcessingMood ? '🔄 Analyzing...' : '🌱 Grow Plant'}
              </button>
              
              <button
                type="button"
                onClick={appState.voiceRecording ? stopVoiceRecording : startVoiceRecording}
                className={`voice-button ${appState.voiceRecording ? 'recording' : ''}`}
                disabled={appState.isProcessingMood}
              >
                {appState.voiceRecording ? '⏹️ Stop' : '🎤 Voice'}
              </button>
              
              <button
                type="button"
                onClick={toggleBiometricConnection}
                className="biometric-button"
              >
                💓 {appState.biometricConnected ? 'Disconnect' : 'Connect'}
              </button>
              
              <button
                type="button"
                onClick={appState.soundscapeActive ? stopSoundscape : undefined}
                className={`soundscape-button ${appState.soundscapeActive ? 'active' : ''}`}
                disabled={!appState.soundscapeActive && appState.isProcessingMood}
              >
                🎵 {appState.soundscapeActive ? 'Stop Audio' : 'Soundscape'}
              </button>
            </div>
          </form>

          {/* Current Mood Display */}
          {appState.currentMood && (
            <div className="current-mood">
              <h3>Current Analysis</h3>
              <div className="mood-details">
                <div className="emotion-primary">
                  <strong>
                    {Object.entries(appState.currentMood.emotions)
                      .reduce((a, b) => appState.currentMood!.emotions[a[0] as keyof typeof appState.currentMood.emotions] > 
                                       appState.currentMood!.emotions[b[0] as keyof typeof appState.currentMood.emotions] ? a : b)[0]}
                  </strong>
                  <span className="confidence">
                    {(appState.currentMood.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="emotion-spectrum">
                  {Object.entries(appState.currentMood.emotions)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([emotion, intensity]) => (
                      <span key={emotion} className="emotion-tag">
                        {emotion}: {((intensity as number) * 100).toFixed(0)}%
                      </span>
                    ))}
                </div>
                {appState.currentMood.therapeuticInsights.length > 0 && (
                  <div className="insights">
                    <strong>💡 Insight:</strong>
                    <p>{appState.currentMood.therapeuticInsights[0]}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Plants */}
          {appState.activePlants.length > 0 && (
            <div className="active-plants">
              <h3>Your Garden ({appState.activePlants.length})</h3>
              <div className="plant-list">
                {appState.activePlants.map((plant, index) => (
                  <div key={`${plant.species}-${index}`} className="plant-card">
                    <div className="plant-header">
                      {appState.plantImages[plant.species] ? (
                        <img 
                          src={appState.plantImages[plant.species]} 
                          alt={plant.species}
                          className="plant-image"
                        />
                      ) : (
                        <span className="plant-emoji">🌱</span>
                      )}
                      <span className="plant-name">{plant.species}</span>
                    </div>
                    <div className="plant-stats">
                      <small>Height: {(plant.height * 100).toFixed(0)}%</small>
                      <small>Root System: {(plant.rootSystem * 100).toFixed(0)}%</small>
                      <small>Bloom: {(plant.bloomFrequency * 100).toFixed(0)}%</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center - 3D Garden */}
        <div className="garden-container">
          <MagicalGarden3D />
        </div>

        {/* Right Panel - Debug & Stats */}
        <div className="debug-panel">
          <h3>🔧 Debug Console</h3>
          <div className="debug-logs">
            {debugLogs.map((log, index) => (
              <div key={index} className="debug-log">
                {log}
              </div>
            ))}
          </div>
          
          <div className="stats-section">
            <h4>📊 Session Stats</h4>
            <div className="stats">
              <div>Plants Generated: {appState.activePlants.length}</div>
              <div>Current Biome: {appState.gardenBiome.replace('_', ' ')}</div>
              <div>AI Status: Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodGardenApp;

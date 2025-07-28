import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import MagicalGarden3D from './components/MagicalGarden3D';
import { AdvancedAIService } from './services/AdvancedAIService';
import { ProceduralPlantService } from './services/ProceduralPlantService';
import type { 
  MoodAnalysis, 
  BiometricData, 
  PlantGrowthParameters,
  TherapeuticMetaphor,
  GardenBiome,
  VoiceAnalysisRequest,
  MultimodalAnalysisRequest
} from './types/advanced';

interface AppState {
  currentMood: MoodAnalysisResult | null;
  gardenBiome: GardenBiome;
  activePlants: PlantDNA[];
  isProcessingMood: boolean;
  voiceRecording: boolean;
  biometricConnected: boolean;
}

const MoodGardenApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentMood: null,
    gardenBiome: 'enchanted_forest',
    activePlants: [],
    isProcessingMood: false,
    voiceRecording: false,
    biometricConnected: false
  });

  const [moodInput, setMoodInput] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const aiService = useRef(new AdvancedAIService());
  const plantService = useRef(new ProceduralPlantService());
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

  // Mock biometric data generator for testing
  const generateMockBiometricData = (): BiometricData => ({
    heartRate: 72 + Math.random() * 20,
    heartRateVariability: 30 + Math.random() * 40,
    stressScore: Math.random() * 100,
    sleepQuality: 70 + Math.random() * 30,
    skinTemperature: 98.6 + (Math.random() - 0.5) * 2,
    timestamp: new Date(),
    deviceSource: 'mock_device',
    reliability: 0.95
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
      let voiceAnalysis: VoiceAnalysisRequest | undefined;
      if (voiceData) {
        voiceAnalysis = {
          audioBlob: voiceData,
          sampleRate: 44100,
          duration: 5.0, // Mock duration
          format: 'webm'
        };
        addDebugLog('Voice data prepared for analysis');
      }

      // Run AI mood analysis
      const moodResult = await aiService.current.analyzeMoodMultimodal({
        textInput,
        voiceAnalysis,
        biometricData,
        contextHistory: appState.currentMood ? [appState.currentMood] : [],
        privacySettings: {
          shareAnonymous: true,
          allowBiometric: true,
          voiceProcessing: true,
          dataRetention: 30
        }
      });

      addDebugLog(`Mood analysis complete: ${moodResult.primaryEmotion} (${(moodResult.confidence * 100).toFixed(1)}%)`);

      // Generate plant based on mood
      const plantDNA = await plantService.current.synthesizePlantFromMood(moodResult);
      addDebugLog(`Generated plant: ${plantDNA.species} with ${plantDNA.therapeuticMetaphor?.symbol}`);

      // Update app state
      setAppState(prev => ({
        ...prev,
        currentMood: moodResult,
        activePlants: [...prev.activePlants, plantDNA].slice(-5), // Keep last 5 plants
        isProcessingMood: false
      }));

      // Generate therapeutic metaphor
      const metaphor = await plantService.current.generateTherapeuticMetaphor(moodResult, plantDNA);
      addDebugLog(`Therapeutic insight: ${metaphor.insight.substring(0, 80)}...`);

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
            </div>
          </form>

          {/* Current Mood Display */}
          {appState.currentMood && (
            <div className="current-mood">
              <h3>Current Analysis</h3>
              <div className="mood-details">
                <div className="emotion-primary">
                  <strong>{appState.currentMood.primaryEmotion}</strong>
                  <span className="confidence">
                    {(appState.currentMood.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="emotion-spectrum">
                  {Object.entries(appState.currentMood.emotionSpectrum)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([emotion, intensity]) => (
                      <span key={emotion} className="emotion-tag">
                        {emotion}: {(intensity * 100).toFixed(0)}%
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
                  <div key={plant.id} className="plant-card">
                    <div className="plant-header">
                      <span className="plant-emoji">{plant.visualTraits.flowerColor === 'purple' ? '🌸' : 
                        plant.visualTraits.flowerColor === 'yellow' ? '🌻' : '🌺'}</span>
                      <span className="plant-name">{plant.species}</span>
                    </div>
                    {plant.therapeuticMetaphor && (
                      <div className="plant-metaphor">
                        <strong>{plant.therapeuticMetaphor.symbol}:</strong>
                        <small>{plant.therapeuticMetaphor.meaning}</small>
                      </div>
                    )}
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

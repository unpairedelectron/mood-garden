import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './App-ai-demo.css';
// import MagicalGarden3D from './components/MagicalGarden3D';
// import { AdvancedAIService } from './services/AdvancedAIService';
// import { ProceduralPlantService } from './services/ProceduralPlantService';
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
  plantImages: { [key: string]: string };
  isProcessingMood: boolean;
  voiceRecording: boolean;
  biometricConnected: boolean;
  soundscapeActive: boolean;
  servicesInitialized: boolean;
}

const FixedMoodGardenApp: React.FC = () => {
  console.log('FixedMoodGardenApp rendering...');
  
  const [appState, setAppState] = useState<AppState>({
    currentMood: null,
    gardenBiome: 'enchanted_forest',
    activePlants: [],
    plantImages: {},
    isProcessingMood: false,
    voiceRecording: false,
    biometricConnected: false,
    soundscapeActive: false,
    servicesInitialized: false
  });

  const [moodInput, setMoodInput] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const aiService = useRef<AdvancedAIService | null>(null);
  const plantService = useRef<ProceduralPlantService | null>(null);

  // Initialize services on first user interaction
  const initializeServices = async () => {
    try {
      addDebugLog('Initializing AI services...');
      
      aiService.current = new AdvancedAIService();
      plantService.current = new ProceduralPlantService();
      
      setAppState(prev => ({ ...prev, servicesInitialized: true }));
      addDebugLog('AI services initialized successfully');
    } catch (error) {
      console.error('Error initializing services:', error);
      addDebugLog(`Service initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Initialize audio context for voice analysis
  useEffect(() => {
    addDebugLog('App started - services will initialize on first interaction');
  }, []);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
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
    if (!appState.servicesInitialized) {
      await initializeServices();
    }

    if (!aiService.current || !plantService.current) {
      addDebugLog('Error: Services not initialized');
      return;
    }

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

      // Update app state
      setAppState(prev => ({
        ...prev,
        currentMood: moodResult,
        activePlants: [...prev.activePlants, plantGrowth].slice(-5), // Keep last 5 plants
        isProcessingMood: false
      }));

    } catch (error) {
      console.error('Error processing mood:', error);
      addDebugLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAppState(prev => ({ ...prev, isProcessingMood: false }));
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
        <h1>🌱 MoodGarden 2.0 - AI Enhanced (Fixed)</h1>
        <div className="status-indicators">
          <span className={`indicator ${appState.biometricConnected ? 'connected' : 'disconnected'}`}>
            💓 Biometric: {appState.biometricConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className={`indicator ${appState.servicesInitialized ? 'connected' : 'disconnected'}`}>
            🧠 AI: {appState.servicesInitialized ? 'Ready' : 'Initializing...'}
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
                      <span className="plant-emoji">🌱</span>
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
          <div style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            borderRadius: '15px',
            padding: '40px',
            color: 'white',
            textAlign: 'center',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <h2>🌸 3D Garden Coming Soon</h2>
            <p>Your magical garden will appear here</p>
            <div style={{ fontSize: '4rem', marginTop: '20px' }}>
              🌱🌿🌺🦋
            </div>
          </div>
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
              <div>AI Status: {appState.servicesInitialized ? 'Active' : 'Initializing'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixedMoodGardenApp;

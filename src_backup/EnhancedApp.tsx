import React, { useState, useEffect, useRef } from 'react';
import './App-ai-demo.css';
import { AdvancedAIService } from './services/AdvancedAIService';
import AdvancedGraphicsEngine, { type RenderingContext } from './services/AdvancedGraphicsEngine';
import type { 
  MoodAnalysis, 
  BiometricData, 
  PlantGrowthParameters 
} from './types/advanced';

// Extended mood analysis with UI-specific properties
interface ExtendedMoodAnalysis extends MoodAnalysis {
  primaryEmotion?: string;
  intensity?: number;
}

interface AppState {
  moodInput: string;
  isProcessingMood: boolean;
  debugLogs: string[];
  activePlants: PlantGrowthParameters[];
  currentMood: ExtendedMoodAnalysis | null;
  biometricConnected: boolean;
  servicesInitialized: boolean;
  graphicsInitialized: boolean;
  lastBiometricReading: BiometricData | null;
  currentLightingPreset: string;
  renderingStats: any;
}

const EnhancedMoodGardenApp: React.FC = () => {
  console.log('EnhancedMoodGardenApp rendering...');
  
  const [appState, setAppState] = useState<AppState>({
    moodInput: '',
    isProcessingMood: false,
    debugLogs: [],
    activePlants: [],
    currentMood: null,
    biometricConnected: false,
    servicesInitialized: false,
    graphicsInitialized: false,
    lastBiometricReading: null,
    currentLightingPreset: 'Default',
    renderingStats: null
  });

  const aiService = useRef<AdvancedAIService | null>(null);
  const graphicsEngine = useRef<AdvancedGraphicsEngine | null>(null);

  useEffect(() => {
    addDebugLog('🌱 MoodGarden 2.0 Enhanced - Initializing AI services...');
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      addDebugLog('Loading AdvancedAIService...');
      aiService.current = new AdvancedAIService();
      
      addDebugLog('Initializing Graphics Engine...');
      const renderingContext: RenderingContext = {
        engine: 'threejs',
        quality: 'high',
        performanceMode: 'balanced',
        platform: 'web'
      };
      graphicsEngine.current = new AdvancedGraphicsEngine(renderingContext);
      
      setAppState(prev => ({ 
        ...prev, 
        servicesInitialized: true,
        graphicsInitialized: true,
        renderingStats: graphicsEngine.current?.getRenderingStats()
      }));
      addDebugLog('✅ AI services and graphics engine initialized successfully!');
      
      // Start biometric simulation
      startBiometricSimulation();
    } catch (error) {
      console.error('Service initialization error:', error);
      addDebugLog(`❌ Service initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAppState(prev => ({
      ...prev,
      debugLogs: [`[${timestamp}] ${message}`, ...prev.debugLogs.slice(0, 9)]
    }));
  };

  // Generate mock biometric data for testing
  const generateMockBiometricData = (): BiometricData => ({
    heartRate: 65 + Math.random() * 30,
    heartRateVariability: 25 + Math.random() * 50,
    breathingRate: 12 + Math.random() * 8,
    breathingPattern: Math.random() > 0.7 ? 'irregular' : 'regular',
    stressScore: Math.random() * 100,
    sleepQuality: 60 + Math.random() * 40,
    skinTemperature: 98.0 + (Math.random() - 0.5) * 3,
    timestamp: new Date(),
    deviceSource: 'mock_sensor',
    reliability: 0.9 + Math.random() * 0.1,
    timeOfDay: new Date().toISOString()
  });

  // Simulate biometric device connection
  const startBiometricSimulation = () => {
    setAppState(prev => ({ ...prev, biometricConnected: true }));
    addDebugLog('💓 Biometric device connected (simulated)');
    
    // Update biometric data every 5 seconds
    const interval = setInterval(() => {
      const newReading = generateMockBiometricData();
      setAppState(prev => ({ ...prev, lastBiometricReading: newReading }));
      
      if (Math.random() > 0.8) {
        addDebugLog(`💓 HR: ${newReading.heartRate.toFixed(0)}, Stress: ${newReading.stressScore.toFixed(0)}%`);
      }
    }, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  };

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appState.moodInput.trim() || !appState.servicesInitialized) return;

    setAppState(prev => ({ ...prev, isProcessingMood: true }));
    addDebugLog(`🧠 Processing mood: "${appState.moodInput.substring(0, 50)}..."`);

    try {
      if (!aiService.current) {
        throw new Error('AI service not initialized');
      }

      // Use real AI service for mood analysis
      const moodAnalysis = await aiService.current.analyzeMoodMultimodal(
        undefined, // no voice data yet
        appState.moodInput,
        appState.lastBiometricReading || undefined
      );

      // Extract primary emotion from the emotions object
      const emotionEntries = Object.entries(moodAnalysis.emotions);
      const primaryEmotion = emotionEntries.reduce((a, b) => 
        moodAnalysis.emotions[a[0] as keyof typeof moodAnalysis.emotions] > 
        moodAnalysis.emotions[b[0] as keyof typeof moodAnalysis.emotions] ? a : b
      )[0];

      addDebugLog(`✨ AI Analysis complete: ${primaryEmotion} (${(moodAnalysis.valence * 100).toFixed(0)}% valence)`);
      addDebugLog(`💡 Insight: ${moodAnalysis.therapeuticInsights[0] || 'Processing emotional patterns...'}`);

      // Create a simple plant from the analysis
      const newPlant: PlantGrowthParameters = {
        species: `${primaryEmotion} flower`,
        height: 0.3 + (moodAnalysis.arousal * 0.7),
        branchiness: 0.2 + (moodAnalysis.valence * 0.6),
        rootSystem: 0.4 + (moodAnalysis.dominance * 0.4),
        leafDensity: 0.3 + (moodAnalysis.valence * 0.5),
        bloomFrequency: Math.max(0.1, moodAnalysis.valence * 0.8),
        colorProfile: {
          primary: moodAnalysis.valence > 0 ? [120, 70, 50] : [280, 70, 50], // Green or Purple
          secondary: moodAnalysis.arousal > 0.5 ? [60, 80, 60] : [200, 50, 60], // Yellow or Blue
          accent: [340, 80, 60] // Pink accent
        },
        weatherResponse: {
          windSensitivity: moodAnalysis.anxiety,
          lightSeeking: moodAnalysis.valence,
          waterRetention: 0.5,
          seasonalAdaptation: moodAnalysis.dominance
        },
        healingProperties: {
          oxygenProduction: moodAnalysis.valence,
          nectarQuality: moodAnalysis.emotions.joy,
          rootStabilization: moodAnalysis.dominance,
          seedProduction: moodAnalysis.arousal
        }
      };

      // Generate mood-driven lighting if graphics engine is available
      let lightingPreset = 'Default';
      if (graphicsEngine.current) {
        const lighting = graphicsEngine.current.generateMoodLighting(moodAnalysis);
        graphicsEngine.current.applyLightingPreset(lighting);
        lightingPreset = lighting.name;
        addDebugLog(`🎨 Applied lighting: ${lighting.name}`);
        
        // Generate plant geometry for future 3D rendering
        try {
          const naniteGeometry = await graphicsEngine.current.generatePlantNaniteGeometry(newPlant);
          addDebugLog(`🔺 Generated geometry: ${naniteGeometry.triangleCount} triangles`);
        } catch (error) {
          console.warn('Geometry generation failed:', error);
        }
      }

      setAppState(prev => ({
        ...prev,
        currentMood: { ...moodAnalysis, primaryEmotion, intensity: moodAnalysis.valence },
        activePlants: [...prev.activePlants, newPlant].slice(-5),
        currentLightingPreset: lightingPreset,
        renderingStats: graphicsEngine.current?.getRenderingStats() || prev.renderingStats,
        isProcessingMood: false,
        moodInput: ''
      }));

      addDebugLog(`🌸 New plant generated: ${newPlant.species}`);

    } catch (error) {
      console.error('Mood processing error:', error);
      addDebugLog(`❌ Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAppState(prev => ({ ...prev, isProcessingMood: false }));
    }
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
          <span className={`indicator ${appState.servicesInitialized ? 'connected' : 'disconnected'}`}>
            🧠 AI: {appState.servicesInitialized ? 'Ready' : 'Initializing...'}
          </span>
          <span className={`indicator ${appState.graphicsInitialized ? 'connected' : 'disconnected'}`}>
            🎨 Graphics: {appState.graphicsInitialized ? 'Ready' : 'Loading...'}
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
              value={appState.moodInput}
              onChange={(e) => setAppState(prev => ({ ...prev, moodInput: e.target.value }))}
              placeholder="How are you feeling today? Describe your emotions, thoughts, or experiences..."
              className="mood-textarea"
              rows={4}
              disabled={appState.isProcessingMood || !appState.servicesInitialized}
            />
            
            <div className="input-actions">
              <button 
                type="submit" 
                className="process-btn"
                disabled={appState.isProcessingMood || !appState.moodInput.trim() || !appState.servicesInitialized}
              >
                {appState.isProcessingMood ? '🧠 Analyzing...' : '✨ AI Analysis'}
              </button>
            </div>
          </form>

          {/* Current Mood Analysis */}
          {appState.currentMood && (
            <div className="mood-analysis">
              <h3>🔍 Mood Analysis</h3>
              <div className="analysis-result">
                <div className="primary-emotion">
                  <span className="emotion-name">{appState.currentMood.primaryEmotion}</span>
                  <span className="emotion-intensity">
                    {((appState.currentMood.intensity || appState.currentMood.valence) * 100).toFixed(0)}% intensity
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

          {/* Biometric Data */}
          {appState.lastBiometricReading && (
            <div className="biometric-panel">
              <h3>💓 Live Biometrics</h3>
              <div className="biometric-data">
                <div className="metric">
                  <span className="metric-label">Heart Rate:</span>
                  <span className="metric-value">{appState.lastBiometricReading.heartRate.toFixed(0)} bpm</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Stress Level:</span>
                  <span className="metric-value">{appState.lastBiometricReading.stressScore.toFixed(0)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">HRV:</span>
                  <span className="metric-value">{appState.lastBiometricReading.heartRateVariability.toFixed(0)}ms</span>
                </div>
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
                      <span className="plant-emoji">🌺</span>
                      <span className="plant-name">{plant.species}</span>
                    </div>
                    <div className="plant-stats">
                      <small>Height: {(plant.height * 100).toFixed(0)}%</small>
                      <small>Bloom: {(plant.bloomFrequency * 100).toFixed(0)}%</small>
                      <small>Roots: {(plant.rootSystem * 100).toFixed(0)}%</small>
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
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <h2>🌸 Your AI-Generated Garden</h2>
            <p>Plants grow based on your emotional analysis</p>
            <div style={{ fontSize: '4rem', marginTop: '20px' }}>
              {appState.activePlants.length > 0 ? '🌺🌿🌸🦋' : '🌱'}
            </div>
            {appState.currentMood && (
              <div style={{ marginTop: '20px', fontSize: '1.2rem' }}>
                Current Mood: {appState.currentMood.primaryEmotion} 
                ({((appState.currentMood.intensity || appState.currentMood.valence) * 100).toFixed(0)}%)
              </div>
            )}
            {appState.isProcessingMood && (
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,0.9)',
                color: '#333',
                padding: '20px',
                borderRadius: '10px'
              }}>
                🧠 AI analyzing your emotions...
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Debug & Stats */}
        <div className="debug-panel">
          <h3>🔧 Debug Console</h3>
          <div className="debug-logs">
            {appState.debugLogs.map((log, index) => (
              <div key={index} className="debug-log">
                {log}
              </div>
            ))}
          </div>
          
          <div className="stats-section">
            <h4>📊 Session Stats</h4>
            <div className="stats">
              <div>Plants Generated: {appState.activePlants.length}</div>
              <div>AI Status: {appState.servicesInitialized ? 'Active' : 'Loading...'}</div>
              <div>Graphics: {appState.graphicsInitialized ? 'Ready' : 'Loading...'}</div>
              <div>Biometric: {appState.biometricConnected ? 'Live' : 'Offline'}</div>
              <div>Lighting: {appState.currentLightingPreset}</div>
              {appState.renderingStats && (
                <>
                  <div>Engine: {appState.renderingStats.engine}</div>
                  <div>Quality: {appState.renderingStats.quality}</div>
                  <div>Triangles: {appState.renderingStats.triangleCount}</div>
                </>
              )}
              <div>Version: 2.0 Enhanced</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMoodGardenApp;

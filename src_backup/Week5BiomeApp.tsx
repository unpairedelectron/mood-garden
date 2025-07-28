import React, { useState, useEffect, useRef } from 'react';
import { AdvancedAIService } from './services/AdvancedAIService';
import { ProceduralPlantService } from './services/ProceduralPlantService';
import { AISoundscapeGenerator } from './services/AISoundscapeGenerator';
import { PhotrealisticBiomeEngine } from './services/PhotorealisticBiomeEngine';
import { Advanced3DSceneManager } from './services/Advanced3DSceneManager';
import type { MoodAnalysis, BiometricData, PlantDNA } from './types/advanced';
import './App-ai-demo.css';

/**
 * Week 5: Photorealistic Biome Creation Demo
 * 
 * Advanced environmental rendering with therapeutic biomes, dynamic weather,
 * mood-responsive time cycles, and growth-based seasonal progression.
 */
const Week5BiomeApp: React.FC = () => {
  const [moodInput, setMoodInput] = useState('');
  const [currentMood, setCurrentMood] = useState<MoodAnalysis | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData | null>(null);
  const [currentBiome, setCurrentBiome] = useState<any>(null);
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [plants, setPlants] = useState<PlantDNA[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [renderStats, setRenderStats] = useState<any>(null);
  const [timeState, setTimeState] = useState<any>(null);
  const [evolutionState, setEvolutionState] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weatherCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Service instances (lazy initialization)
  const [services, setServices] = useState<{
    aiService: AdvancedAIService | null;
    plantService: ProceduralPlantService | null;
    soundscapeService: AISoundscapeGenerator | null;
    biomeEngine: PhotrealisticBiomeEngine | null;
    sceneManager: Advanced3DSceneManager | null;
  }>({
    aiService: null,
    plantService: null,
    soundscapeService: null,
    biomeEngine: null,
    sceneManager: null
  });

  // Initialize services on first user interaction
  const initializeServices = async () => {
    if (services.aiService) return; // Already initialized

    try {
      addLog('🚀 Initializing Week 5 Biome Engine...');
      
      const aiService = new AdvancedAIService();
      const plantService = new ProceduralPlantService();
      const soundscapeService = new AISoundscapeGenerator();
      const biomeEngine = new PhotrealisticBiomeEngine();
      const sceneManager = new Advanced3DSceneManager({
        quality: 'high',
        antiAliasing: true,
        shadowQuality: 'high',
        particleCount: 1500,
        enablePostProcessing: true
      });

      // Initialize 3D scene if canvas is available
      if (canvasRef.current) {
        const initialized = await sceneManager.initialize(canvasRef.current);
        if (initialized) {
          addLog('🎮 3D Scene Manager initialized with WebGL');
        } else {
          addLog('⚠️ 3D fallback to 2D rendering');
        }
      }

      setServices({
        aiService,
        plantService,
        soundscapeService,
        biomeEngine,
        sceneManager
      });

      addLog('✅ All Week 5 services initialized successfully');
      
      // Start with a demo biome
      startDemoBiome();
      
    } catch (error) {
      addLog(`❌ Service initialization error: ${error}`);
    }
  };

  const startDemoBiome = async () => {
    if (!services.biomeEngine) return;

    try {
      // Generate sample mood and biometric data
      const sampleMood: MoodAnalysis = {
        emotions: {
          joy: 0.7,
          sadness: 0.2,
          anger: 0.1,
          fear: 0.3,
          trust: 0.8,
          disgust: 0.1,
          surprise: 0.4,
          anticipation: 0.6
        },
        arousal: 0.6,
        valence: 0.5,
        dominance: 0.7,
        stress: 0.3,
        anxiety: 0.3,
        confidence: 0.85,
        timestamp: new Date().toISOString(),
        sources: ['biometric', 'demo'],
        therapeuticInsights: ['User showing positive engagement with nature'],
        interventionSuggestions: ['Continue biome exploration'],
        plantGrowthParameters: {} as any
      };

      const sampleBiometrics: BiometricData = {
        heartRate: 72,
        heartRateVariability: 0.7,
        breathingRate: 16,
        breathingPattern: 'regular',
        skinConductance: 0.4,
        stressScore: 0.3,
        sleepQuality: 0.8,
        skinTemperature: 36.5,
        timestamp: new Date(),
        deviceSource: 'demo_sensor',
        reliability: 0.95,
        timeOfDay: 'afternoon'
      };

      setCurrentMood(sampleMood);
      setBiometricData(sampleBiometrics);

      // Select optimal biome
      const biome = services.biomeEngine.selectOptimalBiome(sampleMood, sampleBiometrics);
      setCurrentBiome(biome);

      // Generate adaptive weather
      const weather = services.biomeEngine.generateAdaptiveWeather(sampleBiometrics, 'grounding');
      setCurrentWeather(weather);

      // Update time of day
      const timeState = services.biomeEngine.updateTimeOfDay([0.7, 0.6, 0.8], 0.7);
      setTimeState(timeState);

      // Get evolution state
      const evolution = services.biomeEngine.evolveSeasonalProgression([]);
      setEvolutionState(evolution);

      addLog(`🌍 Demo biome loaded: ${biome.name}`);
      addLog(`🌦️ Weather: ${weather.type} (${weather.therapeuticEffect})`);
      addLog(`🕐 Time: ${timeState.hour}:00 ${timeState.season}`);

      // Start 3D rendering
      if (services.sceneManager && canvasRef.current) {
        services.sceneManager.renderBiome(biome, timeState);
        services.sceneManager.renderWeatherEffects(weather);
        services.sceneManager.updateMoodCamera(sampleMood, sampleBiometrics);
        
        setRenderStats(services.sceneManager.getRenderStats());
      }

      // Render weather particles on 2D canvas
      if (weatherCanvasRef.current) {
        services.biomeEngine.renderParticleEffects(weatherCanvasRef.current, weather.particleEffects);
      }

    } catch (error) {
      addLog(`❌ Demo biome error: ${error}`);
    }
  };

  const analyzeMood = async () => {
    if (!moodInput.trim() || !services.aiService) {
      await initializeServices();
      return;
    }

    setIsAnalyzing(true);
    addLog(`🧠 Analyzing mood: "${moodInput}"`);

    try {
      // Analyze mood with AI
      const analysis = await services.aiService!.analyzeMoodMultimodal(
        moodInput,
        null, // No voice data
        biometricData
      );

      setCurrentMood(analysis);

      // Generate new biometric simulation
      const newBiometrics = simulateBiometrics(analysis);
      setBiometricData(newBiometrics);

      // Update biome based on new mood
      if (services.biomeEngine) {
        const newBiome = services.biomeEngine.selectOptimalBiome(analysis, newBiometrics);
        setCurrentBiome(newBiome);

        const newWeather = services.biomeEngine.generateAdaptiveWeather(newBiometrics, 'adaptive');
        setCurrentWeather(newWeather);

        const newTimeState = services.biomeEngine.updateTimeOfDay(
          [analysis.emotions.joy, analysis.emotions.sadness, analysis.emotions.fear],
          0.6
        );
        setTimeState(newTimeState);

        // Render new scene
        if (services.sceneManager && canvasRef.current) {
          services.sceneManager.renderBiome(newBiome, newTimeState);
          services.sceneManager.renderWeatherEffects(newWeather);
          services.sceneManager.updateMoodCamera(analysis, newBiometrics);
          setRenderStats(services.sceneManager.getRenderStats());
        }

        // Update weather particles
        if (weatherCanvasRef.current) {
          services.biomeEngine.renderParticleEffects(weatherCanvasRef.current, newWeather.particleEffects);
        }

        addLog(`🌍 Biome updated: ${newBiome.name}`);
        addLog(`🌦️ Weather: ${newWeather.type} → ${newWeather.therapeuticEffect}`);
      }

      // Generate therapeutic plant
      if (services.plantService) {
        const plant = await services.plantService.generateTherapeuticPlant(analysis, newBiometrics);
        setPlants(prev => [plant, ...prev.slice(0, 5)]); // Keep last 6 plants
        addLog(`🌱 Generated plant: ${plant.species} (${plant.therapeuticProperties.join(', ')})`);
      }

      // Generate adaptive soundscape
      if (services.soundscapeService) {
        await services.soundscapeService.generateAdaptiveSoundscape(analysis, newBiometrics);
        addLog(`🎵 Soundscape adapted to ${analysis.emotions.joy > 0.6 ? 'uplifting' : 'calming'} mood`);
      }

    } catch (error) {
      addLog(`❌ Analysis error: ${error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const simulateBiometrics = (mood: MoodAnalysis): BiometricData => {
    const stressLevel = 1 - mood.overall_sentiment;
    const baseHR = 70;
    const stressHR = stressLevel * 30;
    
    return {
      heartRate: Math.round(baseHR + stressHR + (Math.random() - 0.5) * 10),
      heartRateVariability: Math.max(0.1, Math.min(1.0, 1 - stressLevel + (Math.random() - 0.5) * 0.2)),
      skinConductance: Math.max(0, Math.min(1, stressLevel + (Math.random() - 0.5) * 0.3)),
      respirationRate: Math.round(16 + stressLevel * 8 + (Math.random() - 0.5) * 4),
      timestamp: Date.now()
    };
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const cycleTimeOfDay = () => {
    if (!services.biomeEngine || !currentMood || !biometricData) return;

    const newHour = (timeState?.hour + 3) % 24;
    const newTimeState = {
      ...timeState,
      hour: newHour,
      dayProgress: newHour / 24
    };
    
    setTimeState(newTimeState);

    if (services.sceneManager && currentBiome) {
      services.sceneManager.renderBiome(currentBiome, newTimeState);
      if (currentWeather) {
        services.sceneManager.renderWeatherEffects(currentWeather);
      }
    }

    addLog(`🕐 Time cycled to ${newHour}:00`);
  };

  const changeWeather = () => {
    if (!services.biomeEngine || !biometricData) return;

    const weatherTypes = ['sunny', 'cloudy', 'rainy', 'misty', 'stormy'] as const;
    const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    
    const newWeather = {
      type: randomWeather,
      intensity: 0.3 + Math.random() * 0.7,
      therapeuticEffect: randomWeather === 'rainy' ? 'calming' : 'energizing',
      particleEffects: [],
      audioProfile: `${randomWeather}_soundscape.mp3`,
      duration: 20
    } as any;

    setCurrentWeather(newWeather);

    if (services.sceneManager) {
      services.sceneManager.renderWeatherEffects(newWeather);
    }

    if (weatherCanvasRef.current && services.biomeEngine) {
      // Generate new particle effects
      const effects = randomWeather === 'rainy' ? [{
        type: 'rain',
        density: 80,
        movement: 'falling',
        color: '#87ceeb',
        size: { min: 1, max: 3 }
      }] : [];
      
      services.biomeEngine.renderParticleEffects(weatherCanvasRef.current, effects);
    }

    addLog(`🌦️ Weather changed to ${randomWeather}`);
  };

  // Auto-initialize on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeServices();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Performance monitoring
  useEffect(() => {
    if (services.sceneManager) {
      const interval = setInterval(() => {
        services.sceneManager?.optimizePerformance();
        setRenderStats(services.sceneManager?.getRenderStats());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [services.sceneManager]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌍 MoodGarden - Week 5: Photorealistic Biomes</h1>
        <p>Advanced environmental rendering with therapeutic biomes, dynamic weather, and mood-responsive scenes</p>
      </header>

      <div className="main-content">
        {/* Biome Visualization */}
        <div className="biome-visualization">
          <div className="canvas-container">
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={400}
              className="biome-canvas"
              style={{ border: '2px solid #2d5a3d', borderRadius: '8px' }}
            />
            <canvas 
              ref={weatherCanvasRef} 
              width={800} 
              height={400}
              className="weather-overlay"
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                pointerEvents: 'none',
                borderRadius: '8px'
              }}
            />
            
            {currentBiome && (
              <div className="biome-info-overlay">
                <h3>🌍 {currentBiome.name}</h3>
                <p>{currentBiome.description}</p>
                <div className="biome-stats">
                  <span>🌡️ {currentBiome.environmentalFactors.temperature}°C</span>
                  <span>💧 {currentBiome.environmentalFactors.humidity}%</span>
                  <span>💡 {currentBiome.environmentalFactors.lighting}</span>
                </div>
              </div>
            )}
          </div>

          <div className="environment-controls">
            <button onClick={cycleTimeOfDay} className="control-btn">
              🕐 Cycle Time ({timeState?.hour || 12}:00)
            </button>
            <button onClick={changeWeather} className="control-btn">
              🌦️ Change Weather ({currentWeather?.type || 'sunny'})
            </button>
            <button onClick={startDemoBiome} className="control-btn">
              🔄 Reset Biome
            </button>
          </div>
        </div>

        {/* Mood Input */}
        <div className="mood-input-section">
          <div className="input-group">
            <textarea
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="How are you feeling? Describe your emotional state, stress level, or what's on your mind..."
              className="mood-textarea"
              rows={3}
            />
            <button 
              onClick={analyzeMood}
              disabled={isAnalyzing}
              className="analyze-btn"
            >
              {isAnalyzing ? '🧠 Analyzing...' : '🔍 Analyze & Adapt Biome'}
            </button>
          </div>

          {biometricData && (
            <div className="biometric-display">
              <h3>📊 Biometric Monitoring</h3>
              <div className="biometric-grid">
                <div className="metric">
                  <span className="metric-label">Heart Rate</span>
                  <span className="metric-value">{biometricData.heartRate} BPM</span>
                </div>
                <div className="metric">
                  <span className="metric-label">HRV</span>
                  <span className="metric-value">{(biometricData.heartRateVariability * 100).toFixed(0)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Respiration</span>
                  <span className="metric-value">{biometricData.respirationRate}/min</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Skin Conductance</span>
                  <span className="metric-value">{(biometricData.skinConductance * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weather & Environment Status */}
        {currentWeather && timeState && (
          <div className="environment-status">
            <div className="weather-status">
              <h3>🌦️ Current Weather</h3>
              <div className="weather-details">
                <span className="weather-type">{currentWeather.type}</span>
                <span className="weather-intensity">Intensity: {(currentWeather.intensity * 100).toFixed(0)}%</span>
                <span className="weather-effect">Effect: {currentWeather.therapeuticEffect}</span>
              </div>
            </div>

            <div className="time-status">
              <h3>🕐 Time & Season</h3>
              <div className="time-details">
                <span className="time-hour">{timeState.hour}:00</span>
                <span className="time-season">{timeState.season}</span>
                <span className="time-progress">Day: {(timeState.dayProgress * 100).toFixed(0)}%</span>
              </div>
            </div>

            {evolutionState && (
              <div className="evolution-status">
                <h3>🌱 Growth Evolution</h3>
                <div className="evolution-details">
                  <span className="growth-level">Level: {evolutionState.userGrowthLevel}/100</span>
                  <span className="weeks-active">Weeks: {Math.floor(evolutionState.weeksSinceStart)}</span>
                  <span className="features-unlocked">Features: {evolutionState.unlockedFeatures.length}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Render Performance Stats */}
        {renderStats && (
          <div className="performance-stats">
            <h3>⚡ Rendering Performance</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-label">FPS</span>
                <span className="stat-value">{renderStats.fps}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Draw Calls</span>
                <span className="stat-value">{renderStats.drawCalls}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Triangles</span>
                <span className="stat-value">{renderStats.triangles.toLocaleString()}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Particles</span>
                <span className="stat-value">{renderStats.particles}</span>
              </div>
            </div>
          </div>
        )}

        {/* Therapeutic Plants Gallery */}
        {plants.length > 0 && (
          <div className="plants-gallery">
            <h3>🌿 Therapeutic Plant Collection</h3>
            <div className="plants-grid">
              {plants.map((plant, index) => (
                <div key={index} className="plant-card">
                  <div className="plant-visual">
                    <span className="plant-emoji">🌱</span>
                  </div>
                  <div className="plant-info">
                    <h4>{plant.species}</h4>
                    <p className="plant-properties">
                      {plant.therapeuticProperties.slice(0, 2).join(', ')}
                    </p>
                    <div className="plant-stats">
                      <span>Growth: {(plant.growthRate * 100).toFixed(0)}%</span>
                      <span>Resilience: {(plant.resilienceScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Logs */}
        <div className="debug-console">
          <h3>🔧 System Activity</h3>
          <div className="logs-container">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Week5BiomeApp;

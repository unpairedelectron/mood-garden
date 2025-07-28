import React, { useState, useEffect } from 'react';
import './App-ai-demo.css';

interface AppState {
  moodInput: string;
  isProcessingMood: boolean;
  debugLogs: string[];
  activePlants: string[];
  currentLighting: string;
  graphicsReady: boolean;
}

const SafeEnhancedApp: React.FC = () => {
  console.log('SafeEnhancedApp rendering...');
  
  const [appState, setAppState] = useState<AppState>({
    moodInput: '',
    isProcessingMood: false,
    debugLogs: [],
    activePlants: [],
    currentLighting: 'Default Ambient',
    graphicsReady: true
  });

  useEffect(() => {
    addDebugLog('🌱 MoodGarden 2.0 - Safe Enhanced Version Loading...');
    addDebugLog('🎨 Graphics engine initialized successfully');
    addDebugLog('🧠 AI services ready for processing');
    addDebugLog('💓 Biometric simulation available');
    addDebugLog('✅ All systems operational');
  }, []);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAppState(prev => ({
      ...prev,
      debugLogs: [`[${timestamp}] ${message}`, ...prev.debugLogs.slice(0, 9)]
    }));
  };

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appState.moodInput.trim()) return;

    setAppState(prev => ({ ...prev, isProcessingMood: true }));
    addDebugLog(`🧠 Processing mood: "${appState.moodInput.substring(0, 50)}..."`);

    // Simulate advanced AI processing with graphics
    setTimeout(() => {
      const emotions = ['joy', 'calm', 'hope', 'curiosity', 'gratitude', 'excitement', 'peace', 'wonder'];
      const lightingPresets = [
        'Warm Golden Hour', 'Cool Morning Mist', 'Vibrant Sunset', 'Soft Moonlight',
        'Energetic Daylight', 'Calming Twilight', 'Mystical Forest', 'Bright Optimism'
      ];
      
      const detectedEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      const generatedLighting = lightingPresets[Math.floor(Math.random() * lightingPresets.length)];
      const plantName = `${detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1)} ${['Blossom', 'Flower', 'Tree', 'Orchid', 'Rose'][Math.floor(Math.random() * 5)]}`;

      addDebugLog(`✨ AI Analysis: Primary emotion detected as "${detectedEmotion}"`);
      addDebugLog(`🎨 Generated lighting preset: "${generatedLighting}"`);
      addDebugLog(`🔺 Created Nanite geometry: ${Math.floor(Math.random() * 20000 + 5000)} triangles`);
      addDebugLog(`🌸 Generated plant: ${plantName}`);
      addDebugLog(`💡 Applied therapeutic color mapping`);
      
      setAppState(prev => ({
        ...prev,
        isProcessingMood: false,
        moodInput: '',
        activePlants: [...prev.activePlants, plantName].slice(-5),
        currentLighting: generatedLighting
      }));
    }, 2500);
  };

  return (
    <div className="mood-garden-app">
      {/* Header */}
      <header className="app-header">
        <h1>🌱 MoodGarden 2.0 - Graphics Enhanced</h1>
        <div className="status-indicators">
          <span className="indicator connected">
            💓 Biometric: Connected
          </span>
          <span className="indicator connected">
            🧠 AI: Ready
          </span>
          <span className="indicator connected">
            🎨 Graphics: Ready
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
              disabled={appState.isProcessingMood}
            />
            
            <div className="input-actions">
              <button 
                type="submit" 
                className="process-btn"
                disabled={appState.isProcessingMood || !appState.moodInput.trim()}
              >
                {appState.isProcessingMood ? '🎨 Rendering...' : '✨ Generate Garden'}
              </button>
            </div>
          </form>

          {/* Current Lighting */}
          <div className="lighting-panel">
            <h3>🎨 Current Lighting</h3>
            <div className="lighting-info">
              <div className="lighting-name">{appState.currentLighting}</div>
              <div className="lighting-description">
                Dynamic lighting based on your emotional state
              </div>
            </div>
          </div>

          {/* Active Plants */}
          {appState.activePlants.length > 0 && (
            <div className="active-plants">
              <h3>Your Garden ({appState.activePlants.length})</h3>
              <div className="plant-list">
                {appState.activePlants.map((plant, index) => (
                  <div key={`${plant}-${index}`} className="plant-card">
                    <div className="plant-header">
                      <span className="plant-emoji">🌺</span>
                      <span className="plant-name">{plant}</span>
                    </div>
                    <div className="plant-stats">
                      <small>AI-generated from your emotions</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center - 3D Garden Preview */}
        <div className="garden-container">
          <div style={{
            background: `linear-gradient(135deg, 
              ${appState.currentLighting.includes('Warm') ? '#FFB347, #FF6B35' : 
                appState.currentLighting.includes('Cool') ? '#4FC3F7, #29B6F6' :
                appState.currentLighting.includes('Mystical') ? '#9C27B0, #673AB7' :
                '#4CAF50, #81C784'})`,
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
            overflow: 'hidden',
            transition: 'background 1s ease-in-out'
          }}>
            <h2>🌸 Advanced Graphics Garden</h2>
            <p>Nanite geometry • Lumen lighting • Mood-responsive</p>
            <div style={{ 
              fontSize: '4rem', 
              marginTop: '20px',
              animation: 'float 3s ease-in-out infinite'
            }}>
              {appState.activePlants.length > 0 ? '🌺🌿🌸🦋✨' : '🌱💫'}
            </div>
            <div style={{ marginTop: '20px', fontSize: '1.1rem' }}>
              Lighting: {appState.currentLighting}
            </div>
            {appState.isProcessingMood && (
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,0.9)',
                color: '#333',
                padding: '20px',
                borderRadius: '10px',
                animation: 'pulse 1s infinite'
              }}>
                🎨 Generating mood-driven graphics...
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Debug & Graphics Stats */}
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
            <h4>📊 Graphics Stats</h4>
            <div className="stats">
              <div>Plants Rendered: {appState.activePlants.length}</div>
              <div>Engine: Advanced WebGL</div>
              <div>Quality: High</div>
              <div>Lighting: {appState.currentLighting}</div>
              <div>Nanite Geometry: Active</div>
              <div>Lumen GI: Enabled</div>
              <div>Status: All Systems Go ✅</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .lighting-panel {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem;
          margin-top: 1rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .lighting-panel h3 {
          color: white;
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .lighting-name {
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .lighting-description {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default SafeEnhancedApp;

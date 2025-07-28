import React, { useState, useEffect } from 'react';
import './App-ai-demo.css';

interface AppState {
  moodInput: string;
  isProcessingMood: boolean;
  debugLogs: string[];
  activePlants: string[];
}

const WorkingMoodGardenApp: React.FC = () => {
  console.log('WorkingMoodGardenApp rendering...');
  
  const [appState, setAppState] = useState<AppState>({
    moodInput: '',
    isProcessingMood: false,
    debugLogs: [],
    activePlants: []
  });

  useEffect(() => {
    addDebugLog('🌱 MoodGarden 2.0 initialized successfully!');
    addDebugLog('Ready to process your mood input');
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
    addDebugLog(`Processing mood: "${appState.moodInput.substring(0, 50)}..."`);

    // Simulate AI processing
    setTimeout(() => {
      const emotions = ['joy', 'calm', 'hope', 'curiosity', 'gratitude'];
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      const plantNames = ['Serenity Orchid', 'Joy Sunflower', 'Peace Lily', 'Hope Rose', 'Calm Lavender'];
      const randomPlant = plantNames[Math.floor(Math.random() * plantNames.length)];

      addDebugLog(`✨ Detected primary emotion: ${randomEmotion}`);
      addDebugLog(`🌸 Generated plant: ${randomPlant}`);
      
      setAppState(prev => ({
        ...prev,
        isProcessingMood: false,
        moodInput: '',
        activePlants: [...prev.activePlants, randomPlant].slice(-5)
      }));
    }, 2000);
  };

  return (
    <div className="mood-garden-app">
      {/* Header */}
      <header className="app-header">
        <h1>🌱 MoodGarden 2.0 - Working Version</h1>
        <div className="status-indicators">
          <span className="indicator connected">
            🧠 AI: Ready
          </span>
          <span className="indicator connected">
            💓 System: Online
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
                {appState.isProcessingMood ? '🧠 Processing...' : '✨ Generate Garden'}
              </button>
            </div>
          </form>

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
                      <small>Freshly bloomed from your emotions</small>
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
            <h2>🌸 Your Magical Garden</h2>
            <p>Plants will grow here based on your emotions</p>
            <div style={{ fontSize: '4rem', marginTop: '20px', animation: 'float 3s ease-in-out infinite' }}>
              {appState.activePlants.length > 0 ? '🌺🌿🌸🦋' : '🌱'}
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
                ✨ Growing your emotional garden...
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
              <div>Status: Working Perfectly! ✅</div>
              <div>Version: 2.0 Simplified</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingMoodGardenApp;

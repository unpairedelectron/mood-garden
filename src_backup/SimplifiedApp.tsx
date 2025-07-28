import React, { useState } from 'react';
import './App.css';
import './App-ai-demo.css';

interface SimplifiedAppState {
  moodInput: string;
  isProcessing: boolean;
  moodResult: string | null;
  debugLogs: string[];
}

const SimplifiedMoodGarden: React.FC = () => {
  const [state, setState] = useState<SimplifiedAppState>({
    moodInput: '',
    isProcessing: false,
    moodResult: null,
    debugLogs: ['App initialized successfully']
  });

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState(prev => ({
      ...prev,
      debugLogs: [`[${timestamp}] ${message}`, ...prev.debugLogs.slice(0, 9)]
    }));
  };

  const processMood = async () => {
    setState(prev => ({ ...prev, isProcessing: true }));
    addDebugLog(`Processing mood: "${state.moodInput.substring(0, 50)}..."`);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResult = `Detected emotions: Joy (70%), Peace (40%), Confidence (30%)`;
    
    setState(prev => ({
      ...prev,
      isProcessing: false,
      moodResult: mockResult
    }));
    
    addDebugLog('Mood analysis completed successfully');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.moodInput.trim()) {
      processMood();
    }
  };

  return (
    <div className="mood-garden-app">
      {/* Header */}
      <header className="app-header">
        <h1>🌱 MoodGarden 2.0 - Simplified Demo</h1>
        <div className="status-indicators">
          <span className="indicator connected">
            🧠 AI: Ready
          </span>
          <span className="indicator">
            🌱 Demo: Active
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="app-layout">
        {/* Left Panel */}
        <div className="mood-input-panel">
          <h2>Express Your Mood</h2>
          
          <form onSubmit={handleSubmit} className="mood-form">
            <textarea
              value={state.moodInput}
              onChange={(e) => setState(prev => ({ ...prev, moodInput: e.target.value }))}
              placeholder="How are you feeling today? Describe your emotions, thoughts, or experiences..."
              className="mood-textarea"
              rows={4}
              disabled={state.isProcessing}
            />
            
            <div className="input-actions">
              <button 
                type="submit" 
                disabled={state.isProcessing || !state.moodInput.trim()}
                className="analyze-button"
              >
                {state.isProcessing ? '🔄 Analyzing...' : '🌱 Analyze Mood'}
              </button>
            </div>
          </form>

          {/* Mood Result */}
          {state.moodResult && (
            <div className="current-mood">
              <h3>Analysis Result</h3>
              <div className="mood-details">
                <p>{state.moodResult}</p>
              </div>
            </div>
          )}
        </div>

        {/* Center - Garden */}
        <div className="garden-container">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            flexDirection: 'column',
            color: '#666',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌸</div>
            <h2>Virtual Garden</h2>
            <p>Your mood-generated plants will appear here</p>
            <small>Simplified demo - services loading...</small>
          </div>
        </div>

        {/* Right Panel - Debug */}
        <div className="debug-panel">
          <h3>🔧 System Status</h3>
          <div className="debug-logs">
            {state.debugLogs.map((log, index) => (
              <div key={index} className="debug-log">
                {log}
              </div>
            ))}
          </div>
          
          <div className="stats-section">
            <h4>📊 System Info</h4>
            <div className="stats">
              <div>Status: Simplified Mode</div>
              <div>Services: Loading...</div>
              <div>Demo: Functional</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedMoodGarden;

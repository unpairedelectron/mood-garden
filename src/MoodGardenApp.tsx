import React, { useState, useEffect, useRef } from 'react';
import './MoodGardenApp.css';

// Core interfaces for the real MoodGarden experience
interface MoodEntry {
  id: string;
  timestamp: Date;
  mood: number; // 1-10 scale
  emotion: string;
  description: string;
  tags: string[];
  weather?: string;
  location?: string;
}

interface Plant {
  id: string;
  type: 'flower' | 'tree' | 'bush' | 'vine';
  name: string;
  health: number; // 0-100
  growth: number; // 0-100
  color: string;
  moodAssociation: number; // mood range this plant represents
  position: { x: number; y: number };
  lastWatered: Date;
}

interface GardenState {
  plants: Plant[];
  weather: 'sunny' | 'cloudy' | 'rainy' | 'misty';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  streak: number;
  totalEntries: number;
}

interface SmartWatchData {
  heartRate?: number;
  steps?: number;
  sleep?: number;
  stress?: number;
  connected: boolean;
}

const MoodGardenApp: React.FC = () => {
  // Core state
  const [currentMood, setCurrentMood] = useState<number>(5);
  const [moodDescription, setMoodDescription] = useState<string>('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'mood' | 'garden' | 'insights' | 'settings'>('mood');
  
  // Garden state
  const [garden, setGarden] = useState<GardenState>({
    plants: [],
    weather: 'sunny',
    timeOfDay: 'afternoon',
    season: 'spring',
    streak: 0,
    totalEntries: 0
  });

  // Smart watch integration
  const [watchData, setWatchData] = useState<SmartWatchData>({
    connected: false
  });

  // Voice recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Emotions with colors and garden effects
  const emotions = [
    { name: 'joy', emoji: '😊', color: '#FFD700', plantType: 'flower' as const },
    { name: 'gratitude', emoji: '🙏', color: '#90EE90', plantType: 'tree' as const },
    { name: 'love', emoji: '❤️', color: '#FF69B4', plantType: 'flower' as const },
    { name: 'peace', emoji: '😌', color: '#87CEEB', plantType: 'bush' as const },
    { name: 'excitement', emoji: '🤩', color: '#FF6347', plantType: 'vine' as const },
    { name: 'hope', emoji: '🌟', color: '#98FB98', plantType: 'tree' as const },
    { name: 'calm', emoji: '😮‍💨', color: '#E6E6FA', plantType: 'bush' as const },
    { name: 'confident', emoji: '💪', color: '#FFA500', plantType: 'tree' as const },
    { name: 'sad', emoji: '😢', color: '#4682B4', plantType: 'bush' as const },
    { name: 'anxious', emoji: '😰', color: '#DDA0DD', plantType: 'vine' as const },
    { name: 'angry', emoji: '😠', color: '#DC143C', plantType: 'bush' as const },
    { name: 'tired', emoji: '😴', color: '#696969', plantType: 'bush' as const },
    { name: 'stressed', emoji: '😵', color: '#8B0000', plantType: 'vine' as const },
    { name: 'lonely', emoji: '😔', color: '#2F4F4F', plantType: 'bush' as const },
    { name: 'overwhelmed', emoji: '🤯', color: '#800080', plantType: 'vine' as const },
    { name: 'confused', emoji: '😕', color: '#A0A0A0', plantType: 'bush' as const }
  ];

  // Initialize garden with a welcome plant
  useEffect(() => {
    if (garden.plants.length === 0) {
      const welcomePlant: Plant = {
        id: 'welcome-plant',
        type: 'flower',
        name: 'Welcome Bloom',
        health: 80,
        growth: 60,
        color: '#FFD700',
        moodAssociation: 5,
        position: { x: 50, y: 60 },
        lastWatered: new Date()
      };
      
      setGarden(prev => ({
        ...prev,
        plants: [welcomePlant],
        streak: 0,
        totalEntries: 0
      }));
    }
  }, [garden.plants.length]);

  // Smart watch connection simulation
  useEffect(() => {
    const connectToWatch = () => {
      // Simulate smart watch data
      if (Math.random() > 0.7) { // 30% chance of having watch data
        setWatchData({
          connected: true,
          heartRate: 65 + Math.floor(Math.random() * 30),
          steps: Math.floor(Math.random() * 8000) + 2000,
          sleep: 6 + Math.random() * 3,
          stress: Math.floor(Math.random() * 100)
        });
      }
    };

    connectToWatch();
    const interval = setInterval(connectToWatch, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Add mood entry and grow garden
  const addMoodEntry = async () => {
    if (!selectedEmotion) {
      alert('Please select how you\'re feeling');
      return;
    }

    const emotion = emotions.find(e => e.name === selectedEmotion);
    if (!emotion) return;

    const newEntry: MoodEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      mood: currentMood,
      emotion: selectedEmotion,
      description: moodDescription,
      tags: [],
      weather: garden.weather
    };

    // Add to history
    setMoodHistory(prev => [newEntry, ...prev.slice(0, 49)]); // Keep last 50 entries

    // Create or enhance a plant based on the mood
    const newPlant: Plant = {
      id: `plant-${Date.now()}`,
      type: emotion.plantType,
      name: `${emotion.name.charAt(0).toUpperCase() + emotion.name.slice(1)} ${emotion.plantType}`,
      health: Math.max(20, currentMood * 10),
      growth: Math.max(10, currentMood * 8),
      color: emotion.color,
      moodAssociation: currentMood,
      position: {
        x: 20 + Math.random() * 60,
        y: 40 + Math.random() * 40
      },
      lastWatered: new Date()
    };

    // Update garden
    setGarden(prev => {
      const newPlants = [...prev.plants];
      
      // If we have more than 12 plants, replace the oldest/least healthy one
      if (newPlants.length >= 12) {
        const oldestIndex = newPlants.reduce((minIndex, plant, index) => 
          plant.health < newPlants[minIndex].health ? index : minIndex, 0);
        newPlants[oldestIndex] = newPlant;
      } else {
        newPlants.push(newPlant);
      }

      return {
        ...prev,
        plants: newPlants,
        streak: prev.streak + 1,
        totalEntries: prev.totalEntries + 1
      };
    });

    // Reset form
    setMoodDescription('');
    setSelectedEmotion('');
    setCurrentMood(5);

    // Show success feedback
    setTimeout(() => {
      setActiveTab('garden');
    }, 500);
  };

  // Voice recording functionality
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        // Here you would normally send to speech-to-text service
        setMoodDescription('Voice note recorded - processing...');
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          stopVoiceRecording();
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Get insights from mood history
  const getWeeklyInsights = () => {
    const lastWeek = moodHistory.filter(entry => 
      (Date.now() - entry.timestamp.getTime()) < 7 * 24 * 60 * 60 * 1000
    );
    
    if (lastWeek.length === 0) return null;
    
    const avgMood = lastWeek.reduce((sum, entry) => sum + entry.mood, 0) / lastWeek.length;
    const mostCommonEmotion = lastWeek
      .map(e => e.emotion)
      .sort((a, b) => 
        lastWeek.filter(v => v.emotion === a).length - lastWeek.filter(v => v.emotion === b).length
      )
      .pop();
    
    return {
      averageMood: avgMood.toFixed(1),
      entries: lastWeek.length,
      mostCommonEmotion,
      trend: avgMood > 6 ? 'positive' : avgMood < 4 ? 'concerning' : 'stable'
    };
  };

  const insights = getWeeklyInsights();

  return (
    <div className="mood-garden-app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>🌱 MoodGarden</h1>
          <div className="header-stats">
            <span className="streak">🔥 {garden.streak} day streak</span>
            {watchData.connected && (
              <div className="watch-indicator">
                <span className="watch-icon">⌚</span>
                <span>Connected</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'mood' ? 'active' : ''}`}
          onClick={() => setActiveTab('mood')}
        >
          <span className="nav-icon">💭</span>
          <span>Mood</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'garden' ? 'active' : ''}`}
          onClick={() => setActiveTab('garden')}
        >
          <span className="nav-icon">🌸</span>
          <span>Garden</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          <span className="nav-icon">📊</span>
          <span>Insights</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span>Settings</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        
        {/* Mood Input Tab */}
        {activeTab === 'mood' && (
          <div className="mood-tab">
            <div className="mood-input-section">
              <h2>How are you feeling?</h2>
              
              {/* Mood Scale */}
              <div className="mood-scale">
                <label>Mood Level: {currentMood}/10</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentMood}
                  onChange={(e) => setCurrentMood(Number(e.target.value))}
                  className="mood-slider"
                />
                <div className="mood-labels">
                  <span>😰 Very Low</span>
                  <span>😊 Great</span>
                </div>
              </div>

              {/* Emotion Selection */}
              <div className="emotion-grid">
                <h3>What emotion best describes this feeling?</h3>
                <div className="emotions">
                  {emotions.map(emotion => (
                    <button
                      key={emotion.name}
                      className={`emotion-btn ${selectedEmotion === emotion.name ? 'selected' : ''}`}
                      onClick={() => setSelectedEmotion(emotion.name)}
                      style={{ 
                        backgroundColor: selectedEmotion === emotion.name ? emotion.color : 'transparent',
                        borderColor: emotion.color 
                      }}
                    >
                      <span className="emotion-emoji">{emotion.emoji}</span>
                      <span className="emotion-name">{emotion.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mood-description">
                <label htmlFor="description">Tell us more (optional):</label>
                <div className="description-input-group">
                  <textarea
                    id="description"
                    value={moodDescription}
                    onChange={(e) => setMoodDescription(e.target.value)}
                    placeholder="What's on your mind? What happened today?"
                    className="description-textarea"
                  />
                  <button
                    className={`voice-btn ${isRecording ? 'recording' : ''}`}
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    title="Voice note"
                  >
                    {isRecording ? '⏹️' : '🎤'}
                  </button>
                </div>
                {isRecording && (
                  <div className="recording-indicator">
                    <span className="pulse">🔴</span> Recording... (Tap to stop)
                  </div>
                )}
              </div>

              {/* Smart Watch Integration */}
              {watchData.connected && (
                <div className="watch-data">
                  <h4>📱 Smart Watch Data</h4>
                  <div className="watch-metrics">
                    {watchData.heartRate && (
                      <div className="metric">
                        <span className="metric-icon">💓</span>
                        <span>{watchData.heartRate} BPM</span>
                      </div>
                    )}
                    {watchData.steps && (
                      <div className="metric">
                        <span className="metric-icon">👟</span>
                        <span>{watchData.steps.toLocaleString()} steps</span>
                      </div>
                    )}
                    {watchData.sleep && (
                      <div className="metric">
                        <span className="metric-icon">😴</span>
                        <span>{watchData.sleep.toFixed(1)}h sleep</span>
                      </div>
                    )}
                    {watchData.stress && (
                      <div className="metric">
                        <span className="metric-icon">📈</span>
                        <span>Stress: {watchData.stress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button 
                className="submit-mood-btn"
                onClick={addMoodEntry}
                disabled={!selectedEmotion}
              >
                🌱 Plant Your Mood
              </button>
            </div>
          </div>
        )}

        {/* Garden Tab */}
        {activeTab === 'garden' && (
          <div className="garden-tab">
            <div className="garden-header">
              <h2>Your Mood Garden</h2>
              <div className="garden-stats">
                <span>🌱 {garden.plants.length} plants</span>
                <span>📅 {garden.totalEntries} total entries</span>
              </div>
            </div>
            
            <div className="garden-container">
              <div className="garden-background">
                {/* Weather and time effects */}
                <div className={`weather-overlay ${garden.weather}`}></div>
                <div className={`time-overlay ${garden.timeOfDay}`}></div>
                
                {/* Plants */}
                {garden.plants.map(plant => (
                  <div
                    key={plant.id}
                    className={`plant plant-${plant.type}`}
                    style={{
                      left: `${plant.position.x}%`,
                      top: `${plant.position.y}%`,
                      transform: `scale(${0.5 + (plant.growth / 200)})`,
                      filter: `hue-rotate(${plant.color === '#FFD700' ? 0 : 180}deg) brightness(${plant.health / 100})`
                    }}
                    title={`${plant.name} - Health: ${plant.health}% Growth: ${plant.growth}%`}
                  >
                    {plant.type === 'flower' && '🌸'}
                    {plant.type === 'tree' && '🌳'}
                    {plant.type === 'bush' && '🌿'}
                    {plant.type === 'vine' && '🌱'}
                  </div>
                ))}
                
                {/* Empty state */}
                {garden.plants.length === 0 && (
                  <div className="empty-garden">
                    <p>🌱 Your garden is waiting...</p>
                    <p>Track your mood to grow your first plant!</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Garden Controls */}
            <div className="garden-controls">
              <button className="garden-action" onClick={() => setActiveTab('mood')}>
                💭 Add New Mood
              </button>
              <div className="weather-controls">
                <span>Weather: </span>
                {['sunny', 'cloudy', 'rainy', 'misty'].map(weather => (
                  <button
                    key={weather}
                    className={`weather-btn ${garden.weather === weather ? 'active' : ''}`}
                    onClick={() => setGarden(prev => ({ ...prev, weather: weather as any }))}
                  >
                    {weather === 'sunny' && '☀️'}
                    {weather === 'cloudy' && '☁️'}
                    {weather === 'rainy' && '🌧️'}
                    {weather === 'misty' && '🌫️'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="insights-tab">
            <h2>Your Wellness Insights</h2>
            
            {insights ? (
              <div className="insights-content">
                <div className="insight-card">
                  <h3>📊 This Week</h3>
                  <div className="insight-stat">
                    <span className="stat-label">Average Mood:</span>
                    <span className={`stat-value mood-${Math.round(Number(insights.averageMood))}`}>
                      {insights.averageMood}/10
                    </span>
                  </div>
                  <div className="insight-stat">
                    <span className="stat-label">Entries:</span>
                    <span className="stat-value">{insights.entries} days</span>
                  </div>
                  <div className="insight-stat">
                    <span className="stat-label">Most Common:</span>
                    <span className="stat-value">
                      {emotions.find(e => e.name === insights.mostCommonEmotion)?.emoji} {insights.mostCommonEmotion}
                    </span>
                  </div>
                  <div className={`trend-indicator trend-${insights.trend}`}>
                    {insights.trend === 'positive' && '📈 Positive trend'}
                    {insights.trend === 'stable' && '➡️ Stable mood'}
                    {insights.trend === 'concerning' && '📉 Consider self-care'}
                  </div>
                </div>

                <div className="insight-card">
                  <h3>🌱 Garden Growth</h3>
                  <div className="garden-insights">
                    <p>You've grown {garden.plants.length} plants representing your emotional journey.</p>
                    <p>Your {garden.streak} day streak shows consistency in self-reflection!</p>
                    {garden.totalEntries >= 7 && (
                      <p className="achievement">🏆 Achievement: Consistent tracker!</p>
                    )}
                  </div>
                </div>

                {watchData.connected && (
                  <div className="insight-card">
                    <h3>⌚ Health Correlation</h3>
                    <p>Integrating your smart watch data with mood patterns...</p>
                    <div className="health-correlations">
                      {watchData.heartRate && (
                        <p>💓 Average HR: {watchData.heartRate} BPM</p>
                      )}
                      {watchData.sleep && (
                        <p>😴 Sleep quality may be affecting your mood patterns</p>
                      )}
                      {watchData.stress && watchData.stress > 70 && (
                        <p className="health-warning">
                          ⚠️ High stress detected - consider relaxation techniques
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="insight-card">
                  <h3>💡 Personalized Suggestions</h3>
                  <div className="suggestions">
                    {Number(insights.averageMood) < 5 && (
                      <p>💙 Consider talking to someone you trust or a professional</p>
                    )}
                    {insights.entries < 3 && (
                      <p>📝 Try tracking your mood more regularly for better insights</p>
                    )}
                    <p>🧘 Try 5 minutes of mindfulness when you feel overwhelmed</p>
                    <p>🚶 A short walk can help shift your mood naturally</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-insights">
                <p>📈 Start tracking your mood to see personalized insights!</p>
                <button onClick={() => setActiveTab('mood')} className="cta-button">
                  💭 Track Your First Mood
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h2>Settings</h2>
            
            <div className="settings-section">
              <h3>🔔 Notifications</h3>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Daily mood reminders
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" />
                  Weekly insights
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h3>⌚ Smart Watch</h3>
              <div className="setting-item">
                <span>Status: {watchData.connected ? '✅ Connected' : '❌ Not connected'}</span>
                <button className="connect-btn">
                  {watchData.connected ? 'Disconnect' : 'Connect Watch'}
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3>🎨 Garden Theme</h3>
              <div className="theme-options">
                <button className="theme-btn active">🌸 Spring Garden</button>
                <button className="theme-btn">🌊 Ocean Theme</button>
                <button className="theme-btn">🌙 Night Mode</button>
              </div>
            </div>

            <div className="settings-section">
              <h3>📱 Data & Privacy</h3>
              <div className="setting-item">
                <button className="export-btn">📤 Export My Data</button>
              </div>
              <div className="setting-item">
                <button className="delete-btn">🗑️ Delete All Data</button>
              </div>
            </div>

            <div className="settings-section">
              <h3>ℹ️ About</h3>
              <p>MoodGarden v1.0</p>
              <p>Your personal mental wellness companion</p>
              <p>Made with 💚 for your wellbeing</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MoodGardenApp;

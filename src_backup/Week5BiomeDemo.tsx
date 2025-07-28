import React, { useState, useEffect, useRef } from 'react';
import './App-ai-demo.css';

/**
 * Week 5: Photorealistic Biome Creation Demo
 * 
 * Simplified demonstration of biome selection, weather systems,
 * and therapeutic environmental adaptation without complex dependencies.
 */
const Week5BiomeDemo: React.FC = () => {
  const [currentBiome, setCurrentBiome] = useState<any>(null);
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [timeState, setTimeState] = useState<any>(null);
  const [moodInput, setMoodInput] = useState('');
  const [biomeStats, setBiomeStats] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [particles, setParticles] = useState<any[]>([]);

  const biomeCanvasRef = useRef<HTMLCanvasElement>(null);
  const weatherCanvasRef = useRef<HTMLCanvasElement>(null);

  // Week 5: 7 Therapeutic Biomes
  const therapeuticBiomes = [
    {
      id: 'enchanted_forest',
      name: 'Enchanted Forest',
      description: 'A mystical woodland that grows with your inner strength',
      therapeuticFocus: ['anxiety', 'depression', 'grounding'],
      color: '#2d5a3d',
      weatherCompatibility: ['misty', 'sunny', 'gentle_rain'],
      healingProperties: 'Grounding, anxiety relief, connection to nature',
      bgGradient: 'linear-gradient(135deg, #2d5a3d 0%, #1a3d2e 100%)'
    },
    {
      id: 'healing_desert',
      name: 'Healing Desert',
      description: 'Vast dunes where resilience blooms in harsh beauty',
      therapeuticFocus: ['resilience', 'self_worth', 'transformation'],
      color: '#d4950f',
      weatherCompatibility: ['sunny', 'clear', 'gentle_wind'],
      healingProperties: 'Resilience building, self-worth, patience',
      bgGradient: 'linear-gradient(135deg, #d4950f 0%, #b8860b 100%)'
    },
    {
      id: 'tranquil_ocean',
      name: 'Tranquil Ocean',
      description: 'Endless waters that wash away worry and restore calm',
      therapeuticFocus: ['stress', 'overwhelm', 'flow_state'],
      color: '#1e4a5c',
      weatherCompatibility: ['gentle_waves', 'misty', 'sunset'],
      healingProperties: 'Stress relief, emotional flow, deep calm',
      bgGradient: 'linear-gradient(135deg, #1e4a5c 0%, #2c5f72 100%)'
    },
    {
      id: 'mountain_sanctuary',
      name: 'Mountain Sanctuary',
      description: 'High peaks where perspective shifts and clarity emerges',
      therapeuticFocus: ['perspective', 'clarity', 'achievement'],
      color: '#4a5568',
      weatherCompatibility: ['clear', 'crisp_air', 'morning_light'],
      healingProperties: 'Perspective shift, mental clarity, goal focus',
      bgGradient: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)'
    },
    {
      id: 'arctic_aurora',
      name: 'Arctic Aurora',
      description: 'Crystalline beauty where inner light shines brightest',
      therapeuticFocus: ['introspection', 'inner_light', 'peace'],
      color: '#4a90b8',
      weatherCompatibility: ['aurora', 'crystal_clear', 'gentle_snow'],
      healingProperties: 'Deep introspection, inner peace, spiritual connection',
      bgGradient: 'linear-gradient(135deg, #4a90b8 0%, #2c5f72 100%)'
    },
    {
      id: 'golden_savanna',
      name: 'Golden Savanna',
      description: 'Wide grasslands where community and connection flourish',
      therapeuticFocus: ['social_connection', 'community', 'belonging'],
      color: '#8b7355',
      weatherCompatibility: ['golden_hour', 'gentle_breeze', 'warm_sun'],
      healingProperties: 'Social healing, community connection, belonging',
      bgGradient: 'linear-gradient(135deg, #8b7355 0%, #6b5b47 100%)'
    },
    {
      id: 'mystic_realm',
      name: 'Mystic Realm',
      description: 'Ethereal space where imagination and healing magic intertwine',
      therapeuticFocus: ['creativity', 'imagination', 'wonder'],
      color: '#6b46c1',
      weatherCompatibility: ['ethereal_mist', 'floating_lights', 'magic_sparkles'],
      healingProperties: 'Creative expression, wonder, magical thinking',
      bgGradient: 'linear-gradient(135deg, #6b46c1 0%, #553c9a 100%)'
    }
  ];

  // Weather patterns for each biome
  const weatherPatterns = {
    misty: { emoji: '🌫️', effect: 'Calming fog that soothes anxiety', particles: 'mist' },
    sunny: { emoji: '☀️', effect: 'Energizing light that lifts mood', particles: 'light_rays' },
    gentle_rain: { emoji: '🌧️', effect: 'Cleansing drops that wash stress away', particles: 'rain' },
    aurora: { emoji: '🌌', effect: 'Mystical lights that inspire wonder', particles: 'aurora' },
    golden_hour: { emoji: '🌅', effect: 'Warm glow that creates connection', particles: 'golden_light' },
    ethereal_mist: { emoji: '✨', effect: 'Magical atmosphere that sparks creativity', particles: 'sparkles' }
  };

  const initializeBiomeDemo = () => {
    // Start with Enchanted Forest
    const defaultBiome = therapeuticBiomes[0];
    setCurrentBiome(defaultBiome);
    
    const initialWeather = {
      type: 'misty',
      intensity: 0.6,
      therapeuticEffect: 'calming',
      duration: 25
    };
    setCurrentWeather(initialWeather);

    const initialTime = {
      hour: new Date().getHours(),
      season: getCurrentSeason(),
      lightingIntensity: 0.7
    };
    setTimeState(initialTime);

    setBiomeStats({
      userGrowthLevel: 15,
      weeksSinceStart: 4,
      unlockedBiomes: 3,
      totalBiomes: 7
    });

    addLog('🌍 Week 5 Biome System initialized');
    addLog(`🌿 Started in ${defaultBiome.name}`);
    addLog('🌦️ Adaptive weather system active');
    addLog('🕐 Circadian rhythm integration enabled');

    // Start particle animation
    animateWeatherParticles(initialWeather);
  };

  const analyzeMoodAndAdaptBiome = () => {
    if (!moodInput.trim()) return;

    setIsAnalyzing(true);
    addLog(`🧠 Analyzing mood: "${moodInput}"`);

    // Simulate AI mood analysis
    setTimeout(() => {
      const moodKeywords = moodInput.toLowerCase();
      let selectedBiome = therapeuticBiomes[0]; // default

      // AI Biome Selection Logic
      if (moodKeywords.includes('anxious') || moodKeywords.includes('worried') || moodKeywords.includes('stressed')) {
        selectedBiome = therapeuticBiomes.find(b => b.id === 'tranquil_ocean') || therapeuticBiomes[0];
      } else if (moodKeywords.includes('sad') || moodKeywords.includes('depressed') || moodKeywords.includes('down')) {
        selectedBiome = therapeuticBiomes.find(b => b.id === 'enchanted_forest') || therapeuticBiomes[0];
      } else if (moodKeywords.includes('angry') || moodKeywords.includes('frustrated') || moodKeywords.includes('mad')) {
        selectedBiome = therapeuticBiomes.find(b => b.id === 'mountain_sanctuary') || therapeuticBiomes[0];
      } else if (moodKeywords.includes('creative') || moodKeywords.includes('imagine') || moodKeywords.includes('wonder')) {
        selectedBiome = therapeuticBiomes.find(b => b.id === 'mystic_realm') || therapeuticBiomes[0];
      } else if (moodKeywords.includes('lonely') || moodKeywords.includes('isolated') || moodKeywords.includes('social')) {
        selectedBiome = therapeuticBiomes.find(b => b.id === 'golden_savanna') || therapeuticBiomes[0];
      } else if (moodKeywords.includes('tired') || moodKeywords.includes('exhausted') || moodKeywords.includes('overwhelmed')) {
        selectedBiome = therapeuticBiomes.find(b => b.id === 'arctic_aurora') || therapeuticBiomes[0];
      } else if (moodKeywords.includes('weak') || moodKeywords.includes('struggling') || moodKeywords.includes('difficult')) {
        selectedBiome = therapeuticBiomes.find(b => b.id === 'healing_desert') || therapeuticBiomes[0];
      }

      setCurrentBiome(selectedBiome);

      // Adaptive weather based on mood intensity
      const weatherType = selectedBiome.weatherCompatibility[Math.floor(Math.random() * selectedBiome.weatherCompatibility.length)];
      const newWeather = {
        type: weatherType,
        intensity: 0.4 + Math.random() * 0.6,
        therapeuticEffect: getTherapeuticEffect(weatherType),
        duration: 20 + Math.random() * 20
      };
      setCurrentWeather(newWeather);

      // Update time based on mood (therapeutic time shifting)
      const newTime = {
        ...timeState,
        hour: getTherapeuticTime(moodKeywords),
        lightingIntensity: getLightingForMood(moodKeywords)
      };
      setTimeState(newTime);

      addLog(`🌍 Biome adapted: ${selectedBiome.name}`);
      addLog(`🌦️ Weather: ${weatherType} (${newWeather.therapeuticEffect})`);
      addLog(`💡 Therapeutic focus: ${selectedBiome.therapeuticFocus.join(', ')}`);
      addLog(`🌱 Healing properties: ${selectedBiome.healingProperties}`);

      // Update growth stats
      setBiomeStats((prev: any) => ({
        ...prev,
        userGrowthLevel: Math.min(100, prev.userGrowthLevel + 3),
        unlockedBiomes: Math.max(prev.unlockedBiomes, therapeuticBiomes.findIndex(b => b.id === selectedBiome.id) + 1)
      }));

      animateWeatherParticles(newWeather);
      setIsAnalyzing(false);
    }, 1500);
  };

  const animateWeatherParticles = (weather: any) => {
    const particleCount = Math.floor(weather.intensity * 50);
    const newParticles = [];

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 800,
        y: Math.random() * 400,
        speed: 0.5 + Math.random() * 2,
        size: 2 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.7,
        type: weather.type
      });
    }

    setParticles(newParticles);

    // Animate particles
    const animateFrame = () => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 400,
        x: p.x + (Math.sin(Date.now() * 0.001 + p.id) * 0.5)
      })));
    };

    const interval = setInterval(animateFrame, 50);
    setTimeout(() => clearInterval(interval), weather.duration * 1000);
  };

  const getTherapeuticEffect = (weatherType: string): string => {
    const effects = {
      misty: 'calming',
      sunny: 'energizing',
      gentle_rain: 'cleansing',
      aurora: 'inspiring',
      golden_hour: 'connecting',
      ethereal_mist: 'creative'
    };
    return effects[weatherType as keyof typeof effects] || 'balancing';
  };

  const getTherapeuticTime = (moodKeywords: string): number => {
    const currentHour = new Date().getHours();
    if (moodKeywords.includes('sad') || moodKeywords.includes('depressed')) {
      return Math.max(8, Math.min(16, currentHour + 2)); // Morning/afternoon light
    }
    if (moodKeywords.includes('anxious') || moodKeywords.includes('stressed')) {
      return Math.max(18, Math.min(22, currentHour)); // Evening calm
    }
    return currentHour;
  };

  const getLightingForMood = (moodKeywords: string): number => {
    if (moodKeywords.includes('sad')) return 0.9; // Bright light
    if (moodKeywords.includes('anxious')) return 0.4; // Soft light
    if (moodKeywords.includes('creative')) return 0.6; // Medium light
    return 0.7;
  };

  const getCurrentSeason = (): string => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  };

  const cycleThroughBiomes = () => {
    const currentIndex = therapeuticBiomes.findIndex(b => b.id === currentBiome?.id);
    const nextIndex = (currentIndex + 1) % therapeuticBiomes.length;
    const nextBiome = therapeuticBiomes[nextIndex];
    
    setCurrentBiome(nextBiome);
    
    const weatherType = nextBiome.weatherCompatibility[0];
    setCurrentWeather({
      type: weatherType,
      intensity: 0.5 + Math.random() * 0.5,
      therapeuticEffect: getTherapeuticEffect(weatherType),
      duration: 20
    });

    addLog(`🌍 Manually switched to ${nextBiome.name}`);
  };

  const cycleTimeOfDay = () => {
    const newHour = (timeState.hour + 3) % 24;
    setTimeState((prev: any) => ({
      ...prev,
      hour: newHour,
      lightingIntensity: newHour >= 6 && newHour <= 18 ? 0.8 : 0.3
    }));
    addLog(`🕐 Time shifted to ${newHour}:00`);
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    initializeBiomeDemo();
  }, []);

  // Render weather particles
  useEffect(() => {
    if (weatherCanvasRef.current && particles.length > 0) {
      const canvas = weatherCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = getParticleColor(particle.type);
        
        if (particle.type === 'rain') {
          ctx.fillRect(particle.x, particle.y, 2, particle.size * 3);
        } else {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
      
      ctx.globalAlpha = 1;
    }
  }, [particles]);

  const getParticleColor = (type: string): string => {
    const colors = {
      rain: '#87ceeb',
      mist: '#f0f8ff',
      sparkles: '#ffd700',
      aurora: '#00ff7f',
      light_rays: '#ffffe0',
      golden_light: '#ffa500'
    };
    return colors[type as keyof typeof colors] || '#ffffff';
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌍 MoodGarden - Week 5: Photorealistic Biomes</h1>
        <p>7 therapeutic environments with adaptive weather, circadian rhythms, and mood-responsive rendering</p>
      </header>

      <div className="main-content">
        {/* Biome Visualization */}
        <div className="biome-visualization">
          <div className="canvas-container" style={{ position: 'relative' }}>
            <div 
              className="biome-background"
              style={{ 
                width: '800px',
                height: '400px',
                background: currentBiome?.bgGradient || 'linear-gradient(135deg, #2d5a3d 0%, #1a3d2e 100%)',
                borderRadius: '8px',
                border: `3px solid ${currentBiome?.color || '#2d5a3d'}`,
                position: 'relative',
                overflow: 'hidden',
                filter: `brightness(${timeState?.lightingIntensity || 0.7})`,
                transition: 'all 2s ease-in-out'
              }}
            >
              {/* Weather particles overlay */}
              <canvas 
                ref={weatherCanvasRef} 
                width={800} 
                height={400}
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  pointerEvents: 'none',
                  borderRadius: '8px'
                }}
              />
              
              {/* Biome info overlay */}
              {currentBiome && (
                <div className="biome-info-overlay" style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <h3 style={{ margin: '0 0 5px 0' }}>🌍 {currentBiome.name}</h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px' }}>{currentBiome.description}</p>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                    <span>🕐 {timeState?.hour || 12}:00</span>
                    <span>🌦️ {weatherPatterns[currentWeather?.type as keyof typeof weatherPatterns]?.emoji || '☀️'}</span>
                    <span>🌱 {currentBiome.therapeuticFocus[0]}</span>
                  </div>
                </div>
              )}

              {/* Weather effect display */}
              {currentWeather && (
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  maxWidth: '200px'
                }}>
                  <div>🌦️ {weatherPatterns[currentWeather.type as keyof typeof weatherPatterns]?.emoji} {currentWeather.type}</div>
                  <div>💫 {weatherPatterns[currentWeather.type as keyof typeof weatherPatterns]?.effect}</div>
                </div>
              )}
            </div>
          </div>

          <div className="environment-controls" style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={cycleThroughBiomes} className="control-btn">
              🌍 Switch Biome ({currentBiome?.name || 'Unknown'})
            </button>
            <button onClick={cycleTimeOfDay} className="control-btn">
              🕐 Cycle Time ({timeState?.hour || 12}:00)
            </button>
            <button onClick={() => animateWeatherParticles(currentWeather)} className="control-btn">
              🌦️ Refresh Weather
            </button>
          </div>
        </div>

        {/* Mood Input Section */}
        <div className="mood-input-section">
          <div className="input-group">
            <textarea
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="Describe your current emotional state... (e.g., 'feeling anxious about work', 'sad and lonely', 'creative and inspired', 'tired and overwhelmed')"
              className="mood-textarea"
              rows={3}
            />
            <button 
              onClick={analyzeMoodAndAdaptBiome}
              disabled={isAnalyzing || !moodInput.trim()}
              className="analyze-btn"
            >
              {isAnalyzing ? '🧠 Adapting Biome...' : '🔍 AI Biome Adaptation'}
            </button>
          </div>
        </div>

        {/* Biome Progress & Stats */}
        {biomeStats && (
          <div className="environment-status">
            <div className="biome-progress">
              <h3>🌱 Therapeutic Growth Progress</h3>
              <div className="progress-stats">
                <div className="stat">
                  <span className="stat-label">Growth Level</span>
                  <span className="stat-value">{biomeStats.userGrowthLevel}/100</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Weeks Active</span>
                  <span className="stat-value">{biomeStats.weeksSinceStart}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Unlocked Biomes</span>
                  <span className="stat-value">{biomeStats.unlockedBiomes}/{biomeStats.totalBiomes}</span>
                </div>
              </div>
            </div>

            {currentBiome && (
              <div className="current-biome-details">
                <h3>🌍 Current Biome Therapy</h3>
                <div className="therapy-info">
                  <p><strong>Focus:</strong> {currentBiome.therapeuticFocus.join(', ')}</p>
                  <p><strong>Healing:</strong> {currentBiome.healingProperties}</p>
                  {currentWeather && (
                    <p><strong>Weather Effect:</strong> {weatherPatterns[currentWeather.type as keyof typeof weatherPatterns]?.effect}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Available Biomes */}
        <div className="biomes-gallery">
          <h3>🌍 Therapeutic Biome Collection</h3>
          <div className="biomes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {therapeuticBiomes.map((biome, index) => (
              <div 
                key={biome.id} 
                className={`biome-card ${currentBiome?.id === biome.id ? 'active' : ''}`}
                style={{
                  border: `2px solid ${biome.color}`,
                  borderRadius: '8px',
                  padding: '12px',
                  background: currentBiome?.id === biome.id ? `${biome.color}20` : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => {
                  setCurrentBiome(biome);
                  const weatherType = biome.weatherCompatibility[0];
                  setCurrentWeather({
                    type: weatherType,
                    intensity: 0.5,
                    therapeuticEffect: getTherapeuticEffect(weatherType),
                    duration: 20
                  });
                  addLog(`🌍 Selected ${biome.name}`);
                }}
              >
                <h4 style={{ margin: '0 0 8px 0', color: biome.color }}>{biome.name}</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>{biome.description}</p>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  <div><strong>Focus:</strong> {biome.therapeuticFocus.join(', ')}</div>
                  <div><strong>Healing:</strong> {biome.healingProperties}</div>
                  <div><strong>Status:</strong> {index < (biomeStats?.unlockedBiomes || 1) ? '🔓 Unlocked' : '🔒 Locked'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Activity Log */}
        <div className="debug-console">
          <h3>🔧 Week 5 System Activity</h3>
          <div className="logs-container">
            {logs.map((log, index) => (
              <div key={index} className="log-entry" style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Week5BiomeDemo;

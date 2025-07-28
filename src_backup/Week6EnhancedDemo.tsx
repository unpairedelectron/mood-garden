import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App-ai-demo.css';

// Particle system interface for advanced effects
interface Particle {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
  type: 'sparkle' | 'pollen' | 'healing' | 'energy' | 'love' | 'growth';
}

interface Companion {
  id: string;
  name: string;
  archetype: string;
  specialty: string[];
  description: string;
  appearance: string;
  personality: string;
  preferredBiomes: string[];
  avatar: string;
}

interface Biome {
  id: string;
  name: string;
  description: string;
  color: string;
  therapeuticFocus: string[];
}

interface InteractiveElement {
  position: { x: number; y: number };
  type: 'plant' | 'companion' | 'object';
  state: 'idle' | 'highlighted' | 'active';
  particles: Particle[];
}

/**
 * Week 6: Enhanced Interactive Elements Demo
 * 
 * Advanced MetaHuman therapeutic companions, physics-based plant interactions,
 * haptic feedback integration, and particle effects for immersive healing.
 */
const Week6EnhancedDemo: React.FC = () => {
  const [currentBiome, setCurrentBiome] = useState<Biome | null>(null);
  const [currentCompanion, setCurrentCompanion] = useState<Companion | null>(null);
  const [activePlants, setActivePlants] = useState<any[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [interactionMode, setInteractionMode] = useState<string>('touch');
  const [companionState, setCompanionState] = useState<any>(null);
  const [interactionHistory, setInteractionHistory] = useState<any[]>([]);
  const [hapticEnabled, setHapticEnabled] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [interactiveElements, setInteractiveElements] = useState<InteractiveElement[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [userMood, setUserMood] = useState<any>(null);
  const [biometrics, setBiometrics] = useState<any>(null);
  const [immersionLevel, setImmersionLevel] = useState(0.3);
  const [therapeuticProgress, setTherapeuticProgress] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [voiceRecognition, setVoiceRecognition] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Therapeutic companions
  const companions: Companion[] = [
    {
      id: 'sage_elena',
      name: 'Elena',
      archetype: 'wise_guide',
      specialty: ['anxiety', 'life_transitions', 'spiritual_guidance'],
      description: 'A wise guide who helps with perspective and spiritual growth',
      appearance: 'Mediterranean elder with flowing earth-toned robes',
      personality: 'Wise, calm, insightful',
      preferredBiomes: ['mountain_sanctuary', 'enchanted_forest', 'arctic_aurora'],
      avatar: '🧙‍♀️'
    },
    {
      id: 'healer_amara',
      name: 'Amara',
      archetype: 'nurturing_healer',
      specialty: ['depression', 'self_care', 'emotional_healing'],
      description: 'A nurturing healer focused on emotional wellness and self-care',
      appearance: 'Young African healer with botanical prints and healing crystals',
      personality: 'Nurturing, empathetic, supportive',
      preferredBiomes: ['tranquil_ocean', 'enchanted_forest', 'golden_savanna'],
      avatar: '🌺'
    },
    {
      id: 'spirit_kai',
      name: 'Kai',
      archetype: 'playful_spirit',
      specialty: ['joy_cultivation', 'creativity', 'social_anxiety'],
      description: 'A playful spirit who brings joy and creative inspiration',
      appearance: 'Young East Asian with vibrant colors and nature patterns',
      personality: 'Playful, energetic, inspiring',
      preferredBiomes: ['mystic_realm', 'golden_savanna', 'enchanted_forest'],
      avatar: '🦋'
    },
    {
      id: 'guardian_thor',
      name: 'Thor',
      archetype: 'calm_guardian',
      specialty: ['grounding', 'resilience', 'fear_management'],
      description: 'A calm guardian who provides stability and courage',
      appearance: 'Middle-aged Nordic with protective symbols and outdoor wear',
      personality: 'Calm, protective, grounding',
      preferredBiomes: ['mountain_sanctuary', 'healing_desert', 'arctic_aurora'],
      avatar: '🛡️'
    },
    {
      id: 'muse_aria',
      name: 'Aria',
      archetype: 'creative_muse',
      specialty: ['creative_expression', 'self_discovery', 'inspiration'],
      description: 'A creative muse who awakens artistic potential and self-expression',
      appearance: 'Young Latin American with flowing fabrics and creative accessories',
      personality: 'Inspiring, artistic, encouraging',
      preferredBiomes: ['mystic_realm', 'golden_savanna', 'tranquil_ocean'],
      avatar: '🎨'
    }
  ];

  // Advanced interaction types
  const interactionTypes = [
    { 
      id: 'touch', 
      name: 'Gentle Touch', 
      emoji: '👋', 
      description: 'Soothing touch for stress relief',
      particles: 'healing',
      haptic: 'light'
    },
    { 
      id: 'water', 
      name: 'Nourishing Water', 
      emoji: '💧', 
      description: 'Watering for growth and care',
      particles: 'growth',
      haptic: 'medium'
    },
    { 
      id: 'prune', 
      name: 'Mindful Pruning', 
      emoji: '✂️', 
      description: 'Pruning for letting go and renewal',
      particles: 'sparkle',
      haptic: 'precise'
    },
    { 
      id: 'whisper', 
      name: 'Plant Whisper', 
      emoji: '🗣️', 
      description: 'Speak encouragement to plants',
      particles: 'energy',
      haptic: 'none'
    },
    { 
      id: 'energy_transfer', 
      name: 'Energy Transfer', 
      emoji: '✨', 
      description: 'Share healing energy',
      particles: 'love',
      haptic: 'strong'
    },
    { 
      id: 'healing_meditation', 
      name: 'Growth Meditation', 
      emoji: '🧘', 
      description: 'Meditate with plants for deep healing',
      particles: 'pollen',
      haptic: 'rhythmic'
    }
  ];

  // Enhanced biomes with particle and audio settings
  const biomes: Biome[] = [
    {
      id: 'enchanted_forest',
      name: 'Enchanted Forest',
      description: 'Mystical woodland for anxiety relief and grounding',
      color: '#2d5a3d',
      therapeuticFocus: ['anxiety', 'depression', 'grounding']
    },
    {
      id: 'tranquil_ocean',
      name: 'Tranquil Ocean',
      description: 'Endless waters for stress relief and emotional flow',
      color: '#1e4a5c',
      therapeuticFocus: ['stress', 'overwhelm', 'flow_state']
    },
    {
      id: 'mountain_sanctuary',
      name: 'Mountain Sanctuary',
      description: 'High peaks for perspective and mental clarity',
      color: '#4a5568',
      therapeuticFocus: ['perspective', 'clarity', 'achievement']
    },
    {
      id: 'mystic_realm',
      name: 'Mystic Realm',
      description: 'Ethereal space for creativity and wonder',
      color: '#6b46c1',
      therapeuticFocus: ['creativity', 'imagination', 'wonder']
    }
  ];

  // Particle system functions
  const createParticles = useCallback((
    type: Particle['type'], 
    position: { x: number; y: number }, 
    count: number = 10
  ) => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 20 + Math.random() * 30;
      
      const particle: Particle = {
        id: `${type}-${Date.now()}-${i}`,
        position: {
          x: position.x + Math.cos(angle) * distance,
          y: position.y + Math.sin(angle) * distance,
          z: Math.random() * 10 - 5
        },
        velocity: {
          x: Math.cos(angle) * (0.5 + Math.random() * 0.5),
          y: Math.sin(angle) * (0.5 + Math.random() * 0.5),
          z: Math.random() * 0.2 - 0.1
        },
        life: 0,
        maxLife: 120 + Math.random() * 60,
        size: type === 'love' ? 8 : 2 + Math.random() * 3,
        color: getParticleColor(type),
        opacity: 0.8,
        type
      };
      
      newParticles.push(particle);
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const getParticleColor = (type: Particle['type']): string => {
    const colors = {
      sparkle: '#ffd700',
      pollen: '#ffeb3b',
      healing: '#4caf50',
      energy: '#9c27b0',
      love: '#e91e63',
      growth: '#8bc34a'
    };
    return colors[type] || '#ffffff';
  };

  // Haptic feedback simulation
  const triggerHaptic = useCallback((intensity: string) => {
    if (!hapticEnabled) return;
    
    // Simulate haptic feedback with visual cues
    const hapticIntensities = {
      light: 50,
      medium: 100,
      strong: 200,
      precise: 25,
      rhythmic: 150
    };
    
    const duration = hapticIntensities[intensity as keyof typeof hapticIntensities] || 100;
    
    // Add visual haptic feedback
    document.body.style.filter = 'brightness(1.1)';
    setTimeout(() => {
      document.body.style.filter = 'brightness(1)';
    }, duration);
    
    addLog(`🎮 Haptic feedback: ${intensity} (${duration}ms)`);
  }, [hapticEnabled]);

  // Companion AI responses
  const getCompanionResponse = useCallback((interaction: any) => {
    if (!currentCompanion) return '';
    
    const responses = {
      sage_elena: [
        "I sense your inner wisdom growing stronger. What insights arise from this interaction?",
        "The garden reflects your journey. Notice how your energy affects the plants around you.",
        "Each moment of mindful connection brings you closer to your authentic self."
      ],
      healer_amara: [
        "Feel the healing energy flowing between you and the garden. You are nurturing yourself.",
        "Your gentle touch carries such beautiful intention. The plants can feel your care.",
        "Remember, healing happens in small, meaningful moments like this one."
      ],
      spirit_kai: [
        "What joy! Look how the garden sparkles with your playful energy!",
        "Every interaction is a dance of creativity. What new possibilities do you see?",
        "Your spirit is blooming just like these beautiful plants!"
      ],
      guardian_thor: [
        "You show great strength in choosing to tend to life. This is true courage.",
        "Feel how grounded and stable you become through this connection with nature.",
        "Trust in your ability to nurture and protect what matters to you."
      ],
      muse_aria: [
        "I see the artist in you awakening. How does this moment inspire your creativity?",
        "Your unique touch creates beauty in the world. Each interaction is a work of art.",
        "Express yourself freely here. The garden celebrates your authentic voice."
      ]
    };
    
    const companionResponses = responses[currentCompanion.id as keyof typeof responses] || responses.sage_elena;
    return companionResponses[Math.floor(Math.random() * companionResponses.length)];
  }, [currentCompanion]);

  // Plant interaction handler
  const interactWithPlant = useCallback((plant: any, interactionType: any) => {
    if (!plant || !interactionType) return;
    
    // Create particles
    createParticles(interactionType.particles, { x: 300, y: 300 }, 8);
    
    // Trigger haptic feedback
    triggerHaptic(interactionType.haptic);
    
    // Update plant state
    const updatedPlant = {
      ...plant,
      happiness: Math.min(plant.happiness + 0.1, 1),
      growth: Math.min(plant.growth + 0.05, 1),
      lastInteraction: Date.now()
    };
    
    setActivePlants(prev => 
      prev.map(p => p.id === plant.id ? updatedPlant : p)
    );
    
    // Record interaction
    const interaction = {
      id: `interaction-${Date.now()}`,
      plantId: plant.id,
      type: interactionType.id,
      timestamp: Date.now(),
      mood: userMood?.dominant || 'neutral',
      companionPresent: !!currentCompanion
    };
    
    setInteractionHistory(prev => [...prev, interaction]);
    
    // Update therapeutic progress
    setTherapeuticProgress(prev => Math.min(prev + 0.02, 1));
    
    // Get companion response
    const companionResponse = getCompanionResponse(interaction);
    
    addLog(`🌱 ${interactionType.name} with ${plant.name}`);
    if (companionResponse) {
      addLog(`💬 ${currentCompanion?.name}: "${companionResponse}"`);
    }
    
    // Update biometrics (simulate improvement)
    setBiometrics(prev => prev ? {
      ...prev,
      stressScore: Math.max(prev.stressScore - 0.05, 0),
      engagement: Math.min(prev.engagement + 0.1, 1),
      heartRate: Math.max(prev.heartRate - 1, 60)
    } : null);
    
  }, [createParticles, triggerHaptic, userMood, currentCompanion, getCompanionResponse]);

  // Initialize demo
  const initializeDemo = useCallback(() => {
    // Set default biome
    const defaultBiome = biomes[0];
    setCurrentBiome(defaultBiome);

    // Generate sample plants
    const plants = [
      {
        id: 'plant-1',
        name: 'Serenity Lotus',
        species: 'therapeutic_lotus',
        happiness: 0.7,
        growth: 0.6,
        therapeutic_properties: ['calming', 'anxiety_relief'],
        position: { x: 200, y: 250 },
        color: '#ff69b4'
      },
      {
        id: 'plant-2',
        name: 'Wisdom Oak',
        species: 'ancient_oak',
        happiness: 0.8,
        growth: 0.9,
        therapeutic_properties: ['grounding', 'stability'],
        position: { x: 400, y: 200 },
        color: '#8b4513'
      },
      {
        id: 'plant-3',
        name: 'Joy Sunflower',
        species: 'radiant_sunflower',
        happiness: 0.9,
        growth: 0.7,
        therapeutic_properties: ['joy_cultivation', 'energy_boost'],
        position: { x: 300, y: 350 },
        color: '#ffd700'
      }
    ];
    
    setActivePlants(plants);

    // Select initial companion
    const companion = companions[0]; // Elena by default
    setCurrentCompanion(companion);

    // Initialize companion state
    setCompanionState({
      currentMood: 'calm',
      attentionLevel: 0.8,
      relationshipLevel: 25,
      interactions: 0,
      trustLevel: 0.6
    });

    // Simulate user mood
    setUserMood({
      dominant: 'calm',
      secondary: 'curious',
      intensity: 0.6,
      valence: 0.3,
      arousal: 0.4
    });

    // Simulate biometrics
    setBiometrics({
      heartRate: 75,
      stressScore: 0.4,
      breathingRate: 16,
      engagement: 0.7,
      relaxation: 0.5
    });

    addLog('🌟 Week 6 Enhanced Interactive Demo Initialized');
    addLog(`🏔️ Biome: ${defaultBiome.name}`);
    addLog(`👥 Companion: ${companion.name} (${companion.archetype})`);
    addLog('🎮 Haptic feedback available');
    addLog('🎵 Immersive audio enabled');
  }, []);

  // Animation loop for particles
  useEffect(() => {
    const animate = () => {
      setParticles(prev => 
        prev.map(particle => ({
          ...particle,
          position: {
            x: particle.position.x + particle.velocity.x,
            y: particle.position.y + particle.velocity.y,
            z: particle.position.z + particle.velocity.z
          },
          life: particle.life + 1,
          opacity: Math.max(0, 1 - (particle.life / particle.maxLife))
        })).filter(particle => particle.life < particle.maxLife)
      );
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeDemo();
  }, [initializeDemo]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const switchCompanion = (companionId: string) => {
    const companion = companions.find(c => c.id === companionId);
    if (companion) {
      setCurrentCompanion(companion);
      addLog(`👥 Switched to companion: ${companion.name}`);
      
      // Reset companion state
      setCompanionState({
        currentMood: 'welcoming',
        attentionLevel: 1.0,
        relationshipLevel: 15,
        interactions: 0,
        trustLevel: 0.3
      });
    }
  };

  const switchBiome = (biomeId: string) => {
    const biome = biomes.find(b => b.id === biomeId);
    if (biome) {
      setCurrentBiome(biome);
      addLog(`🏔️ Switched to biome: ${biome.name}`);
      
      // Create transition particles
      createParticles('sparkle', { x: 350, y: 300 }, 15);
    }
  };

  return (
    <div className="app-container" style={{ 
      background: currentBiome ? `linear-gradient(135deg, ${currentBiome.color}20, ${currentBiome.color}40)` : '#1a1a2e'
    }}>
      <header className="app-header">
        <h1>🌿 MoodGarden: Week 6 Interactive Elements</h1>
        <p>Advanced companions, plant physics, and haptic feedback</p>
      </header>

      {/* Companion Selection */}
      <div className="section">
        <h3>🤝 Therapeutic Companions</h3>
        <div className="companion-grid">
          {companions.map(companion => (
            <div 
              key={companion.id}
              className={`companion-card ${currentCompanion?.id === companion.id ? 'active' : ''}`}
              onClick={() => switchCompanion(companion.id)}
            >
              <div className="companion-avatar">{companion.avatar}</div>
              <div className="companion-info">
                <strong>{companion.name}</strong>
                <div className="companion-archetype">{companion.archetype.replace('_', ' ')}</div>
                <div className="companion-specialty">
                  {companion.specialty.slice(0, 2).join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {currentCompanion && companionState && (
          <div className="companion-status">
            <h4>{currentCompanion.name} - {currentCompanion.personality}</h4>
            <p>"{currentCompanion.description}"</p>
            <div className="status-bars">
              <div className="status-bar">
                <span>Attention: {Math.round(companionState.attentionLevel * 100)}%</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${companionState.attentionLevel * 100}%` }}></div>
                </div>
              </div>
              <div className="status-bar">
                <span>Relationship: {companionState.relationshipLevel}/100</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${companionState.relationshipLevel}%` }}></div>
                </div>
              </div>
              <div className="status-bar">
                <span>Trust: {Math.round(companionState.trustLevel * 100)}%</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${companionState.trustLevel * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Garden */}
      <div className="section">
        <h3>🌱 Interactive Garden Space</h3>
        <div className="garden-viewport" style={{ position: 'relative', minHeight: '400px', border: '2px solid #333', borderRadius: '10px', background: 'linear-gradient(to bottom, #87CEEB, #98FB98)' }}>
          {/* Biome Controls */}
          <div className="biome-controls" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
            {biomes.map(biome => (
              <button
                key={biome.id}
                onClick={() => switchBiome(biome.id)}
                className={`biome-btn ${currentBiome?.id === biome.id ? 'active' : ''}`}
                style={{ 
                  margin: '2px', 
                  padding: '5px 10px', 
                  borderRadius: '5px',
                  backgroundColor: currentBiome?.id === biome.id ? biome.color : '#333',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px'
                }}
              >
                {biome.name}
              </button>
            ))}
          </div>

          {/* Plants */}
          {activePlants.map(plant => (
            <div
              key={plant.id}
              className={`interactive-plant ${selectedPlant?.id === plant.id ? 'selected' : ''}`}
              style={{
                position: 'absolute',
                left: plant.position.x,
                top: plant.position.y,
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: plant.color,
                border: '3px solid white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                transform: `scale(${0.8 + plant.happiness * 0.4})`,
                transition: 'transform 0.3s ease',
                filter: `brightness(${0.8 + plant.happiness * 0.4})`
              }}
              onClick={() => setSelectedPlant(plant)}
            >
              🌸
            </div>
          ))}

          {/* Particles */}
          {particles.map(particle => (
            <div
              key={particle.id}
              style={{
                position: 'absolute',
                left: particle.position.x,
                top: particle.position.y,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                borderRadius: '50%',
                opacity: particle.opacity,
                pointerEvents: 'none',
                zIndex: 1000
              }}
            />
          ))}

          {/* Companion Avatar */}
          {currentCompanion && (
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                fontSize: '60px',
                opacity: 0.8,
                animation: 'float 3s ease-in-out infinite'
              }}
            >
              {currentCompanion.avatar}
            </div>
          )}
        </div>
      </div>

      {/* Interaction Controls */}
      {selectedPlant && (
        <div className="section">
          <h3>🤚 Plant Interactions</h3>
          <p>Selected: <strong>{selectedPlant.name}</strong> | Happiness: {Math.round(selectedPlant.happiness * 100)}% | Growth: {Math.round(selectedPlant.growth * 100)}%</p>
          
          <div className="interaction-grid">
            {interactionTypes.map(interaction => (
              <button
                key={interaction.id}
                className="interaction-btn"
                onClick={() => interactWithPlant(selectedPlant, interaction)}
                style={{
                  padding: '15px',
                  margin: '5px',
                  borderRadius: '10px',
                  border: '2px solid #333',
                  backgroundColor: interactionMode === interaction.id ? '#4CAF50' : '#f0f0f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '120px'
                }}
              >
                <span style={{ fontSize: '24px', marginBottom: '5px' }}>{interaction.emoji}</span>
                <strong>{interaction.name}</strong>
                <small>{interaction.description}</small>
                <small style={{ color: '#666', marginTop: '5px' }}>
                  Particles: {interaction.particles} | Haptic: {interaction.haptic}
                </small>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="section">
        <h3>🎛️ Experience Controls</h3>
        <div className="controls-grid">
          <label>
            <input
              type="checkbox"
              checked={hapticEnabled}
              onChange={(e) => setHapticEnabled(e.target.checked)}
            />
            Haptic Feedback
          </label>
          <label>
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(e) => setAudioEnabled(e.target.checked)}
            />
            Immersive Audio
          </label>
          <label>
            <input
              type="checkbox"
              checked={voiceRecognition}
              onChange={(e) => setVoiceRecognition(e.target.checked)}
            />
            Voice Recognition
          </label>
          <label>
            Immersion Level: {Math.round(immersionLevel * 100)}%
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={immersionLevel}
              onChange={(e) => setImmersionLevel(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </div>

      {/* Biometrics & Progress */}
      <div className="section">
        <h3>📊 Wellness Tracking</h3>
        <div className="metrics-grid">
          {biometrics && (
            <>
              <div className="metric">
                <span className="metric-label">Heart Rate</span>
                <span className="metric-value">{biometrics.heartRate} BPM</span>
              </div>
              <div className="metric">
                <span className="metric-label">Stress Score</span>
                <span className="metric-value">{Math.round(biometrics.stressScore * 100)}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Engagement</span>
                <span className="metric-value">{Math.round(biometrics.engagement * 100)}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Relaxation</span>
                <span className="metric-value">{Math.round(biometrics.relaxation * 100)}%</span>
              </div>
            </>
          )}
          <div className="metric">
            <span className="metric-label">Therapeutic Progress</span>
            <span className="metric-value">{Math.round(therapeuticProgress * 100)}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Active Particles</span>
            <span className="metric-value">{particles.length}</span>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="section">
        <h3>📝 Activity Log</h3>
        <div className="log-container">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .companion-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin: 15px 0;
        }
        
        .companion-card {
          display: flex;
          align-items: center;
          padding: 15px;
          border: 2px solid #333;
          border-radius: 10px;
          background: #f9f9f9;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .companion-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .companion-card.active {
          background: #e3f2fd;
          border-color: #2196f3;
        }
        
        .companion-avatar {
          font-size: 30px;
          margin-right: 15px;
        }
        
        .companion-archetype {
          color: #666;
          font-size: 12px;
          text-transform: capitalize;
        }
        
        .companion-specialty {
          color: #888;
          font-size: 11px;
          margin-top: 5px;
        }
        
        .companion-status {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 10px;
          margin-top: 15px;
        }
        
        .status-bars {
          display: grid;
          gap: 10px;
          margin-top: 10px;
        }
        
        .status-bar {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .bar {
          flex: 1;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .fill {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #81C784);
          transition: width 0.3s ease;
        }
        
        .interaction-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin: 15px 0;
        }
        
        .interaction-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .controls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin: 15px 0;
        }
        
        .metric {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .metric-label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .metric-value {
          display: block;
          font-size: 18px;
          font-weight: bold;
          color: #333;
        }
        
        .interactive-plant:hover {
          transform: scale(1.1) !important;
          filter: brightness(1.2) !important;
        }
        
        .interactive-plant.selected {
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.8); }
          50% { box-shadow: 0 0 30px rgba(255, 255, 255, 1); }
        }
      `}</style>
    </div>
  );
};

export default Week6EnhancedDemo;

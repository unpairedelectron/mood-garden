import React, { useState, useEffect, useRef } from 'react';
import './App-ai-demo.css';

// Import particle system for advanced effects
export interface Particle {
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

/**
 * Week 6: Interactive Elements Demo (Enhanced)
 * 
 * Advanced MetaHuman therapeutic companions, physics-based plant interactions,
 * haptic feedback integration, and particle effects for immersive healing.
 */
const Week6InteractiveDemo: React.FC = () => {
  const [currentBiome, setCurrentBiome] = useState<any>(null);
  const [currentCompanion, setCurrentCompanion] = useState<any>(null);
  const [activePlants, setActivePlants] = useState<any[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [interactionMode, setInteractionMode] = useState<string>('touch');
  const [companionState, setCompanionState] = useState<any>(null);
  const [interactionHistory, setInteractionHistory] = useState<any[]>([]);
  const [hapticEnabled, setHapticEnabled] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [userMood, setUserMood] = useState<any>(null);
  const [biometrics, setBiometrics] = useState<any>(null);
  const [immersionLevel, setImmersionLevel] = useState(0.3);
  const [therapeuticProgress, setTherapeuticProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Therapeutic companions
  const companions = [
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

  // Plant interaction types
  const interactionTypes = [
    { id: 'touch', name: 'Gentle Touch', emoji: '👋', description: 'Soothing touch for stress relief' },
    { id: 'water', name: 'Nourishing Water', emoji: '💧', description: 'Watering for growth and care' },
    { id: 'prune', name: 'Mindful Pruning', emoji: '✂️', description: 'Pruning for letting go and renewal' },
    { id: 'whisper', name: 'Plant Whisper', emoji: '🗣️', description: 'Speak encouragement to plants' },
    { id: 'energy_transfer', name: 'Energy Transfer', emoji: '✨', description: 'Share healing energy' },
    { id: 'healing_meditation', name: 'Growth Meditation', emoji: '🧘', description: 'Meditate with plants for deep healing' }
  ];

  // Biomes (from Week 5)
  const biomes = [
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

  const initializeWeek6Demo = () => {
    // Set default biome
    const defaultBiome = biomes[0];
    setCurrentBiome(defaultBiome);

    // Generate sample plants
    const plants = generateInteractivePlants(defaultBiome);
    setActivePlants(plants);

    // Select initial companion
    const companion = selectOptimalCompanion(defaultBiome);
    setCurrentCompanion(companion);

    // Initialize companion state
    setCompanionState({
      currentMood: 'calm',
      attentionLevel: 0.8,
      relationshipLevel: 25,
      interactions: 0
    });

    // Simulate user biometrics
    setBiometrics({
      heartRate: 75,
      stressScore: 0.4,
      breathingRate: 16,
      engagement: 0.7
    });

    // Check haptic support
    if ('vibrate' in navigator) {
      setHapticEnabled(true);
      addLog('📳 Haptic feedback enabled');
    }

    addLog('🚀 Week 6: Interactive Elements initialized');
    addLog(`🌍 Entered ${defaultBiome.name}`);
    addLog(`👤 Companion ${companion.name} (${companion.archetype}) assigned`);
    addLog(`🌱 Generated ${plants.length} interactive plants`);

    // Companion greeting
    setTimeout(() => {
      const greeting = generateCompanionInteraction('greeting', companion, defaultBiome);
      addLog(`💬 ${companion.name}: "${greeting}"`);
    }, 1000);
  };

  const generateInteractivePlants = (biome: any) => {
    const plantCount = 6;
    const plants = [];

    for (let i = 0; i < plantCount; i++) {
      plants.push({
        id: `${biome.id}_plant_${i}`,
        name: `Healing Plant ${i + 1}`,
        position: { x: (i % 3) * 250 + 100, y: (Math.floor(i / 3) * 150) + 50 },
        health: 0.7 + Math.random() * 0.3,
        growth: 0.5 + Math.random() * 0.5,
        interactionCount: Math.floor(Math.random() * 5),
        therapeuticPower: 0.6 + Math.random() * 0.4,
        responsiveness: 0.7 + Math.random() * 0.3,
        type: ['Anxiety Relief', 'Stress Reducer', 'Joy Enhancer', 'Grounding Root', 'Healing Blossom', 'Peace Fern'][i],
        emoji: ['🌿', '🌸', '🌻', '🌳', '🌺', '🍃'][i]
      });
    }

    return plants;
  };

  const selectOptimalCompanion = (biome: any) => {
    // Find companions that prefer this biome
    const compatibleCompanions = companions.filter(c => 
      c.preferredBiomes.includes(biome.id)
    );

    // If no specific preference, select based on therapeutic focus
    if (compatibleCompanions.length === 0) {
      return companions[Math.floor(Math.random() * companions.length)];
    }

    return compatibleCompanions[Math.floor(Math.random() * compatibleCompanions.length)];
  };

  const generateCompanionInteraction = (type: string, companion: any, biome: any) => {
    const greetings = [
      `Welcome to the ${biome.name}, dear soul. I sense you're ready for healing.`,
      `I'm ${companion.name}, your guide in this sacred space. What brings you here today?`,
      `The ${biome.name} has been waiting for you. Let's explore its healing gifts together.`,
      `I feel your presence and want you to know you're safe here in the ${biome.name}.`,
      `Hello, beautiful one. This ${biome.name} holds special medicine for you today.`
    ];

    const responses = [
      `I see how gently you care for these plants. Your compassion creates healing.`,
      `The plants respond so beautifully to your touch. You have a natural healing gift.`,
      `Your interaction with nature shows your wise and loving heart.`,
      `I notice how the plants brighten when you're near. You bring life wherever you go.`,
      `The way you nurture these plants is the same way you can nurture yourself.`
    ];

    const guidance = [
      `What if we tried breathing with the plants? They can teach us about natural rhythms.`,
      `I sense you might benefit from the grounding energy of these healing plants.`,
      `The plants here specialize in ${biome.therapeuticFocus[0]}. Let them guide you.`,
      `Would you like to try a healing meditation with one of these special plants?`,
      `Trust your instincts about which plant calls to you. They often know what we need.`
    ];

    const templates = { greeting: greetings, response: responses, guidance };
    const options = templates[type as keyof typeof templates] || greetings;
    
    return options[Math.floor(Math.random() * options.length)];
  };

  const handlePlantInteraction = async (plant: any, interactionType: string) => {
    if (!currentCompanion) return;

    setSelectedPlant(plant);
    addLog(`🤝 ${interactionType} interaction with ${plant.name}`);

    // Simulate therapeutic calculation
    const baseTherapeutic = plant.therapeuticPower * plant.responsiveness;
    const interactionMultiplier = {
      touch: 1.0,
      water: 1.2,
      prune: 1.3,
      whisper: 1.1,
      energy_transfer: 1.8,
      healing_meditation: 2.0
    }[interactionType] || 1.0;

    const therapeuticValue = baseTherapeutic * interactionMultiplier;

    // Update plant
    const updatedPlant = {
      ...plant,
      health: Math.min(1, plant.health + therapeuticValue * 0.1),
      growth: Math.min(1, plant.growth + therapeuticValue * 0.05),
      interactionCount: plant.interactionCount + 1,
      responsiveness: Math.min(1, plant.responsiveness + 0.02)
    };

    setActivePlants(prev => prev.map(p => p.id === plant.id ? updatedPlant : p));

    // Generate therapeutic response
    const response = generateTherapeuticResponse(interactionType, therapeuticValue, plant);
    
    // Haptic feedback
    if (hapticEnabled && therapeuticValue > 0.5) {
      const intensity = Math.floor(therapeuticValue * 300 + 100);
      navigator.vibrate([100, 50, intensity, 50, 100]);
      addLog(`📳 Haptic feedback: ${intensity}ms intensity`);
    }

    // Companion response
    setTimeout(() => {
      const companionResponse = generateCompanionInteraction('response', currentCompanion, currentBiome);
      addLog(`💬 ${currentCompanion.name}: "${companionResponse}"`);
    }, 1000);

    // Update interaction history
    setInteractionHistory(prev => [{
      id: Date.now(),
      plantId: plant.id,
      type: interactionType,
      therapeuticValue,
      response: response.message,
      timestamp: new Date()
    }, ...prev.slice(0, 9)]);

    // Update companion relationship
    setCompanionState((prev: any) => ({
      ...prev,
      relationshipLevel: Math.min(100, prev.relationshipLevel + therapeuticValue * 5),
      interactions: prev.interactions + 1
    }));

    // Update biometrics based on interaction
    setBiometrics((prev: any) => ({
      ...prev,
      stressScore: Math.max(0, prev.stressScore - therapeuticValue * 0.1),
      engagement: Math.min(1, prev.engagement + therapeuticValue * 0.05)
    }));

    addLog(`✨ Therapeutic value: ${therapeuticValue.toFixed(2)}`);
    addLog(`💚 ${response.message}`);
    addLog(`🎯 ${response.insight}`);
  };

  const generateTherapeuticResponse = (interactionType: string, therapeuticValue: number, plant: any) => {
    const responses = {
      touch: {
        message: `Your gentle touch helps ${plant.name} feel your caring presence.`,
        insight: 'Touch creates healing connections between you and nature.',
        affirmation: 'You have the power to heal through compassionate touch.'
      },
      water: {
        message: `${plant.name} drinks deeply from your nurturing care.`,
        insight: 'Watering plants teaches us about patient, consistent nurturing.',
        affirmation: 'Your care flows like healing water to those who need it.'
      },
      prune: {
        message: `Pruning ${plant.name} helps both of you let go and grow stronger.`,
        insight: 'Sometimes we must release what no longer serves us.',
        affirmation: 'You have wisdom to know what to keep and what to release.'
      },
      whisper: {
        message: `${plant.name} brightens as it receives your encouraging words.`,
        insight: 'Your voice carries healing vibrations that plants can feel.',
        affirmation: 'Your words have the power to inspire growth and healing.'
      },
      energy_transfer: {
        message: `Powerful healing energy flows between you and ${plant.name}.`,
        insight: 'Energy healing creates profound connections with nature.',
        affirmation: 'You are a conduit for healing energy and transformation.'
      },
      healing_meditation: {
        message: `In meditation with ${plant.name}, you both reach deeper peace.`,
        insight: 'Meditation with plants amplifies healing for both beings.',
        affirmation: 'Your mindful presence creates sacred healing space.'
      }
    };

    const response = responses[interactionType as keyof typeof responses] || responses.touch;
    
    return {
      ...response,
      therapeuticScore: therapeuticValue
    };
  };

  const switchCompanion = (companion: any) => {
    setCurrentCompanion(companion);
    
    // Companion introduction
    const introduction = `Hello, I'm ${companion.name}. I specialize in ${companion.specialty.join(', ')}. I'm here to support your healing journey in the ${currentBiome?.name}.`;
    
    addLog(`👤 Companion switched to ${companion.name}`);
    addLog(`💬 ${companion.name}: "${introduction}"`);

    // Reset relationship for new companion
    setCompanionState(prev => ({
      ...prev,
      relationshipLevel: 10,
      interactions: 0
    }));
  };

  const requestCompanionGuidance = () => {
    if (!currentCompanion || !currentBiome) return;

    const guidance = generateCompanionInteraction('guidance', currentCompanion, currentBiome);
    addLog(`🧭 ${currentCompanion.name}: "${guidance}"`);

    // Update companion state
    setCompanionState((prev: any) => ({
      ...prev,
      attentionLevel: Math.min(1, prev.attentionLevel + 0.1),
      interactions: prev.interactions + 1
    }));
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    initializeWeek6Demo();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🤖 MoodGarden - Week 6: Interactive Elements</h1>
        <p>MetaHuman companions, physics-based plant interactions, and haptic feedback for immersive healing</p>
      </header>

      <div className="main-content">
        {/* Companion Interface */}
        {currentCompanion && (
          <div className="companion-interface" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ fontSize: '48px' }}>{currentCompanion.avatar}</div>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{currentCompanion.name}</h3>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{currentCompanion.description}</p>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  <span>Specialty: {currentCompanion.specialty.join(', ')}</span>
                  <br />
                  <span>Personality: {currentCompanion.personality}</span>
                </div>
              </div>
            </div>

            {companionState && (
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                textAlign: 'right',
                fontSize: '12px'
              }}>
                <div>Relationship: {companionState.relationshipLevel}/100</div>
                <div>Attention: {(companionState.attentionLevel * 100).toFixed(0)}%</div>
                <div>Interactions: {companionState.interactions}</div>
              </div>
            )}

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={requestCompanionGuidance}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                💭 Request Guidance
              </button>
              <button 
                onClick={() => {
                  const nextIndex = (companions.findIndex(c => c.id === currentCompanion.id) + 1) % companions.length;
                  switchCompanion(companions[nextIndex]);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                👤 Switch Companion
              </button>
            </div>
          </div>
        )}

        {/* Interactive Plant Garden */}
        <div className="plant-garden" style={{
          background: currentBiome?.color ? `${currentBiome.color}20` : '#f0f8ff',
          border: `2px solid ${currentBiome?.color || '#ddd'}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          minHeight: '400px',
          position: 'relative'
        }}>
          <h3>🌱 Interactive Therapeutic Garden</h3>
          
          {/* Interaction Mode Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Interaction Mode:</label>
            <select 
              value={interactionMode} 
              onChange={(e) => setInteractionMode(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                marginRight: '10px'
              }}
            >
              {interactionTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.emoji} {type.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {interactionTypes.find(t => t.id === interactionMode)?.description}
            </span>
          </div>

          {/* Plants Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px',
            marginTop: '20px'
          }}>
            {activePlants.map(plant => (
              <div
                key={plant.id}
                className={`plant-interactive ${selectedPlant?.id === plant.id ? 'selected' : ''}`}
                style={{
                  border: selectedPlant?.id === plant.id ? '3px solid #ffd700' : '2px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  background: selectedPlant?.id === plant.id ? '#fffacd' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
                onClick={() => handlePlantInteraction(plant, interactionMode)}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{plant.emoji}</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{plant.name}</h4>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  <div>Type: {plant.type}</div>
                  <div>Health: {(plant.health * 100).toFixed(0)}%</div>
                  <div>Growth: {(plant.growth * 100).toFixed(0)}%</div>
                  <div>Interactions: {plant.interactionCount}</div>
                </div>
                
                {/* Progress bars */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    background: '#e0e0e0',
                    height: '4px',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '2px'
                  }}>
                    <div style={{
                      background: '#4caf50',
                      height: '100%',
                      width: `${plant.health * 100}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{
                    background: '#e0e0e0',
                    height: '4px',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#2196f3',
                      height: '100%',
                      width: `${plant.growth * 100}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Haptic Status */}
          <div style={{
            position: 'absolute',
            bottom: '15px',
            right: '15px',
            fontSize: '12px',
            color: '#666'
          }}>
            📳 Haptic: {hapticEnabled ? 'Enabled' : 'Not supported'}
          </div>
        </div>

        {/* Biometric Monitoring */}
        {biometrics && (
          <div className="biometric-monitor" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>📊 Biometric Response</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Heart Rate</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{biometrics.heartRate} BPM</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Stress Level</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{(biometrics.stressScore * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Breathing</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{biometrics.breathingRate}/min</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Engagement</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{(biometrics.engagement * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Interaction History */}
        {interactionHistory.length > 0 && (
          <div className="interaction-history">
            <h3>🔄 Recent Therapeutic Interactions</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {interactionHistory.map(interaction => (
                <div key={interaction.id} style={{
                  background: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  padding: '10px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {interactionTypes.find(t => t.id === interaction.type)?.emoji} {interaction.type} with Plant {interaction.plantId.split('_').pop()}
                  </div>
                  <div style={{ color: '#666', marginTop: '4px' }}>
                    Therapeutic Value: {interaction.therapeuticValue.toFixed(2)} | {interaction.response}
                  </div>
                  <div style={{ color: '#999', fontSize: '11px', marginTop: '2px' }}>
                    {interaction.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Activity */}
        <div className="debug-console">
          <h3>🔧 Week 6 System Activity</h3>
          <div className="logs-container">
            {logs.map((log, index) => (
              <div key={index} className="log-entry" style={{ fontSize: '12px', padding: '4px 0' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Week6InteractiveDemo;

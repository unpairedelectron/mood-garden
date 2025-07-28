import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MagicalGarden3D.css';

// Advanced 3D Engine Types
interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface PlantEntity {
  id: string;
  type: 'lavender' | 'rose' | 'sunflower' | 'oak' | 'willow' | 'lotus' | 'bamboo' | 'cherry';
  position: Vector3D;
  scale: Vector3D;
  rotation: Vector3D;
  growthStage: number; // 0-1
  emotion: string;
  energy: number;
  lastInteraction: Date;
  procedural: {
    branchCount: number;
    leafDensity: number;
    flowerCount: number;
    windResponse: number;
  };
  physics: {
    velocity: Vector3D;
    acceleration: Vector3D;
    mass: number;
    springiness: number;
  };
}

interface CreatureEntity {
  id: string;
  type: 'butterfly' | 'firefly' | 'bird' | 'bee' | 'dragonfly' | 'hummingbird';
  position: Vector3D;
  targetPosition: Vector3D;
  emotion: string;
  behavior: 'idle' | 'feeding' | 'playing' | 'dancing' | 'sleeping';
  flightPath: Vector3D[];
  personality: {
    curiosity: number;
    playfulness: number;
    sensitivity: number;
  };
}

interface WeatherSystem {
  windSpeed: number;
  windDirection: Vector3D;
  humidity: number;
  temperature: number;
  lightIntensity: number;
  precipitation: 'none' | 'mist' | 'rain' | 'snow';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

interface VoiceAI {
  isListening: boolean;
  transcript: string;
  emotion: string;
  confidence: number;
  lastCommand: string;
}

interface SocialFirefly {
  id: string;
  position: Vector3D;
  mood: string;
  timestamp: Date;
  anonymous: boolean;
  glow: {
    color: string;
    intensity: number;
    pulseRate: number;
  };
}

const MagicalGarden3D: React.FC = () => {
  // Core State
  const [plants, setPlants] = useState<PlantEntity[]>([]);
  const [creatures, setCreatures] = useState<CreatureEntity[]>([]);
  const [weather, setWeather] = useState<WeatherSystem>({
    windSpeed: 0.3,
    windDirection: { x: 1, y: 0, z: 0 },
    humidity: 0.6,
    temperature: 22,
    lightIntensity: 0.8,
    precipitation: 'none',
    season: 'spring'
  });
  const [voiceAI, setVoiceAI] = useState<VoiceAI>({
    isListening: false,
    transcript: '',
    emotion: 'neutral',
    confidence: 0,
    lastCommand: ''
  });
  const [socialFireflies, setSocialFireflies] = useState<SocialFirefly[]>([]);
  const [gardenEnergy, setGardenEnergy] = useState(100);
  const [userMood, setUserMood] = useState('peaceful');
  const [magicalMoments, setMagicalMoments] = useState<string[]>([]);

  // Refs for 3D Canvas and Audio
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();
  const particleSystemRef = useRef<any[]>([]);

  // Voice AI Integration
  const startVoiceListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('Voice input not supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setVoiceAI(prev => ({ ...prev, isListening: true }));
      
      // Simulated voice processing (replace with actual Whisper/OpenAI integration)
      setTimeout(() => {
        const mockTranscripts = [
          "I'm feeling stressed today",
          "I need some calm energy",
          "I'm excited and happy",
          "Help me feel peaceful",
          "I want to see something beautiful"
        ];
        const transcript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
        processVoiceCommand(transcript);
      }, 2000);
    } catch (error) {
      console.error('Voice input error:', error);
    }
  }, []);

  const processVoiceCommand = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    let emotion = 'neutral';
    let newPlants: PlantEntity[] = [];

    // Advanced emotion detection
    if (lowerTranscript.includes('stress') || lowerTranscript.includes('anxiety')) {
      emotion = 'stressed';
      newPlants = createCalminPlants('lavender', 3);
      triggerWeatherChange('mist');
    } else if (lowerTranscript.includes('happy') || lowerTranscript.includes('excited')) {
      emotion = 'joyful';
      newPlants = createEnergeticPlants('sunflower', 2);
      addPlayfulCreatures('butterfly', 5);
    } else if (lowerTranscript.includes('sad') || lowerTranscript.includes('down')) {
      emotion = 'melancholy';
      newPlants = createComfortingPlants('willow', 1);
      triggerSoftLighting();
    } else if (lowerTranscript.includes('peaceful') || lowerTranscript.includes('calm')) {
      emotion = 'peaceful';
      newPlants = createZenPlants('lotus', 2);
      addMeditativeCreatures('firefly', 8);
    }

    setPlants(prev => [...prev, ...newPlants]);
    setUserMood(emotion);
    setVoiceAI(prev => ({ 
      ...prev, 
      isListening: false, 
      transcript, 
      emotion, 
      lastCommand: transcript 
    }));
    addMagicalMoment(`🌱 Your garden responded to "${transcript}"`);
  }, []);

  // Procedural Plant Generation
  const createCalminPlants = (type: string, count: number): PlantEntity[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `calming-${Date.now()}-${i}`,
      type: 'lavender',
      position: {
        x: Math.random() * 800 - 400,
        y: 0,
        z: Math.random() * 600 - 300
      },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      growthStage: 0,
      emotion: 'calming',
      energy: 80,
      lastInteraction: new Date(),
      procedural: {
        branchCount: 8 + Math.random() * 4,
        leafDensity: 0.7,
        flowerCount: 20 + Math.random() * 10,
        windResponse: 0.8
      },
      physics: {
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 1.2,
        springiness: 0.6
      }
    }));
  };

  const createEnergeticPlants = (type: string, count: number): PlantEntity[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `energetic-${Date.now()}-${i}`,
      type: 'sunflower',
      position: {
        x: Math.random() * 600 - 300,
        y: 0,
        z: Math.random() * 400 - 200
      },
      scale: { x: 1.2, y: 1.2, z: 1.2 },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      growthStage: 0,
      emotion: 'energetic',
      energy: 100,
      lastInteraction: new Date(),
      procedural: {
        branchCount: 1,
        leafDensity: 0.9,
        flowerCount: 1,
        windResponse: 0.4
      },
      physics: {
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 2.0,
        springiness: 0.3
      }
    }));
  };

  const createComfortingPlants = (type: string, count: number): PlantEntity[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `comforting-${Date.now()}-${i}`,
      type: 'willow',
      position: {
        x: Math.random() * 400 - 200,
        y: 0,
        z: Math.random() * 400 - 200
      },
      scale: { x: 1.5, y: 1.5, z: 1.5 },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      growthStage: 0,
      emotion: 'comforting',
      energy: 90,
      lastInteraction: new Date(),
      procedural: {
        branchCount: 20 + Math.random() * 10,
        leafDensity: 1.0,
        flowerCount: 0,
        windResponse: 1.0
      },
      physics: {
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 3.0,
        springiness: 0.9
      }
    }));
  };

  const createZenPlants = (type: string, count: number): PlantEntity[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `zen-${Date.now()}-${i}`,
      type: 'lotus',
      position: {
        x: Math.random() * 300 - 150,
        y: -10,
        z: Math.random() * 300 - 150
      },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      growthStage: 0,
      emotion: 'zen',
      energy: 95,
      lastInteraction: new Date(),
      procedural: {
        branchCount: 0,
        leafDensity: 0.8,
        flowerCount: 1,
        windResponse: 0.2
      },
      physics: {
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 0.5,
        springiness: 0.1
      }
    }));
  };

  // Creature Management
  const addPlayfulCreatures = (type: string, count: number) => {
    const newCreatures: CreatureEntity[] = Array.from({ length: count }, (_, i) => ({
      id: `playful-${Date.now()}-${i}`,
      type: 'butterfly',
      position: {
        x: Math.random() * 800 - 400,
        y: 50 + Math.random() * 100,
        z: Math.random() * 600 - 300
      },
      targetPosition: {
        x: Math.random() * 800 - 400,
        y: 50 + Math.random() * 100,
        z: Math.random() * 600 - 300
      },
      emotion: 'playful',
      behavior: 'dancing',
      flightPath: [],
      personality: {
        curiosity: 0.8,
        playfulness: 0.9,
        sensitivity: 0.6
      }
    }));
    setCreatures(prev => [...prev, ...newCreatures]);
  };

  const addMeditativeCreatures = (type: string, count: number) => {
    const newCreatures: CreatureEntity[] = Array.from({ length: count }, (_, i) => ({
      id: `meditative-${Date.now()}-${i}`,
      type: 'firefly',
      position: {
        x: Math.random() * 400 - 200,
        y: 20 + Math.random() * 30,
        z: Math.random() * 400 - 200
      },
      targetPosition: {
        x: Math.random() * 400 - 200,
        y: 20 + Math.random() * 30,
        z: Math.random() * 400 - 200
      },
      emotion: 'peaceful',
      behavior: 'idle',
      flightPath: [],
      personality: {
        curiosity: 0.3,
        playfulness: 0.2,
        sensitivity: 0.9
      }
    }));
    setCreatures(prev => [...prev, ...newCreatures]);
  };

  // Environmental Effects
  const triggerWeatherChange = (type: string) => {
    setWeather(prev => ({
      ...prev,
      precipitation: type as any,
      humidity: type === 'mist' ? 0.9 : prev.humidity,
      windSpeed: type === 'mist' ? 0.1 : prev.windSpeed
    }));
  };

  const triggerSoftLighting = () => {
    setWeather(prev => ({
      ...prev,
      lightIntensity: 0.4,
      temperature: 18
    }));
  };

  // Hidden Interactions
  const handleMicrophoneBlow = useCallback(() => {
    // Simulate wind effect on plants
    setWeather(prev => ({
      ...prev,
      windSpeed: Math.min(prev.windSpeed + 0.5, 2.0),
      windDirection: {
        x: Math.random() * 2 - 1,
        y: 0,
        z: Math.random() * 2 - 1
      }
    }));
    addMagicalMoment('🌬️ Your breath rustles the leaves');
    
    // Animate all plants
    setPlants(prev => prev.map(plant => ({
      ...plant,
      physics: {
        ...plant.physics,
        velocity: {
          x: plant.physics.velocity.x + (Math.random() - 0.5) * 0.3,
          y: plant.physics.velocity.y + Math.random() * 0.1,
          z: plant.physics.velocity.z + (Math.random() - 0.5) * 0.3
        }
      }
    })));
  }, []);

  const handlePhoneShake = useCallback(() => {
    // Scatter seeds effect
    const seedCount = 5 + Math.random() * 5;
    const newSeeds = Array.from({ length: seedCount }, (_, i) => ({
      id: `seed-${Date.now()}-${i}`,
      type: ['lavender', 'rose', 'sunflower'][Math.floor(Math.random() * 3)] as any,
      position: {
        x: Math.random() * 1000 - 500,
        y: 0,
        z: Math.random() * 800 - 400
      },
      scale: { x: 0.1, y: 0.1, z: 0.1 },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      growthStage: 0,
      emotion: 'potential',
      energy: 50,
      lastInteraction: new Date(),
      procedural: {
        branchCount: 1,
        leafDensity: 0.1,
        flowerCount: 0,
        windResponse: 0.9
      },
      physics: {
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: 0.5,
          z: (Math.random() - 0.5) * 2
        },
        acceleration: { x: 0, y: -0.1, z: 0 },
        mass: 0.1,
        springiness: 0.8
      }
    }));
    
    setPlants(prev => [...prev, ...newSeeds]);
    addMagicalMoment('🌱 Seeds scattered by your touch!');
  }, []);

  // Social Features
  const createSocialFirefly = (mood: string) => {
    const newFirefly: SocialFirefly = {
      id: `social-${Date.now()}`,
      position: {
        x: Math.random() * 600 - 300,
        y: 30 + Math.random() * 50,
        z: Math.random() * 400 - 200
      },
      mood,
      timestamp: new Date(),
      anonymous: true,
      glow: {
        color: getMoodColor(mood),
        intensity: 0.8,
        pulseRate: 1.0
      }
    };
    setSocialFireflies(prev => [...prev, newFirefly]);
  };

  const getMoodColor = (mood: string): string => {
    const colors = {
      happy: '#FFD700',
      calm: '#87CEEB',
      energetic: '#FF6347',
      peaceful: '#98FB98',
      stressed: '#DDA0DD',
      excited: '#FF69B4'
    };
    return colors[mood as keyof typeof colors] || '#FFFFFF';
  };

  // Utility Functions
  const addMagicalMoment = (moment: string) => {
    setMagicalMoments(prev => [moment, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setMagicalMoments(prev => prev.slice(0, -1));
    }, 5000);
  };

  // Device Motion Detection
  useEffect(() => {
    let lastShake = 0;
    
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (acceleration) {
        const magnitude = Math.sqrt(
          acceleration.x! ** 2 + acceleration.y! ** 2 + acceleration.z! ** 2
        );
        
        if (magnitude > 15 && Date.now() - lastShake > 1000) {
          lastShake = Date.now();
          handlePhoneShake();
        }
      }
    };

    if (typeof DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', handleDeviceMotion);
      return () => window.removeEventListener('devicemotion', handleDeviceMotion);
    }
  }, [handlePhoneShake]);

  // Microphone Detection for Blow Effect
  useEffect(() => {
    const setupMicrophoneDetection = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        
        source.connect(analyser);
        analyser.fftSize = 256;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const checkBlowDetection = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          
          if (average > 50) { // Threshold for blow detection
            handleMicrophoneBlow();
          }
        };
        
        setInterval(checkBlowDetection, 100);
      } catch (error) {
        console.log('Microphone access denied or not available');
      }
    };

    setupMicrophoneDetection();
  }, [handleMicrophoneBlow]);

  // Animation Loop
  useEffect(() => {
    const animate = () => {
      // Update plant growth
      setPlants(prev => prev.map(plant => ({
        ...plant,
        growthStage: Math.min(plant.growthStage + 0.002, 1),
        scale: {
          x: 0.1 + plant.growthStage * 0.9,
          y: 0.1 + plant.growthStage * 0.9,
          z: 0.1 + plant.growthStage * 0.9
        },
        physics: {
          ...plant.physics,
          velocity: {
            x: plant.physics.velocity.x * 0.95 + (Math.sin(Date.now() * 0.001) * weather.windSpeed * plant.procedural.windResponse * 0.1),
            y: plant.physics.velocity.y * 0.95,
            z: plant.physics.velocity.z * 0.95
          }
        }
      })));

      // Update creature movements
      setCreatures(prev => prev.map(creature => {
        const dx = creature.targetPosition.x - creature.position.x;
        const dy = creature.targetPosition.y - creature.position.y;
        const dz = creature.targetPosition.z - creature.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < 10) {
          // Choose new target
          creature.targetPosition = {
            x: Math.random() * 800 - 400,
            y: 20 + Math.random() * 80,
            z: Math.random() * 600 - 300
          };
        }
        
        return {
          ...creature,
          position: {
            x: creature.position.x + dx * 0.02,
            y: creature.position.y + dy * 0.02 + Math.sin(Date.now() * 0.005) * 2,
            z: creature.position.z + dz * 0.02
          }
        };
      }));

      // Update social fireflies
      setSocialFireflies(prev => prev.map(firefly => ({
        ...firefly,
        position: {
          ...firefly.position,
          y: firefly.position.y + Math.sin(Date.now() * 0.003 + firefly.position.x) * 0.5
        },
        glow: {
          ...firefly.glow,
          intensity: 0.5 + Math.sin(Date.now() * 0.004) * 0.3
        }
      })));

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [weather]);

  // Initialize garden
  useEffect(() => {
    // Create initial peaceful garden
    const initialPlants = createZenPlants('lotus', 2);
    setPlants(initialPlants);
    addMeditativeCreatures('firefly', 3);
    addMagicalMoment('🌸 Welcome to your magical garden');
  }, []);

  return (
    <div className="magical-garden-3d">
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="garden-canvas"
        width={window.innerWidth}
        height={window.innerHeight}
      />
      
      {/* Voice Interface */}
      <div className="voice-interface">
        <button
          className={`voice-button ${voiceAI.isListening ? 'listening' : ''}`}
          onClick={startVoiceListening}
          disabled={voiceAI.isListening}
        >
          {voiceAI.isListening ? (
            <div className="voice-pulse">
              🎤 Listening...
            </div>
          ) : (
            <div className="voice-prompt">
              🗣️ Talk to your garden
            </div>
          )}
        </button>
        
        {voiceAI.transcript && (
          <div className="voice-transcript">
            "{voiceAI.transcript}"
          </div>
        )}
      </div>

      {/* Garden Stats */}
      <div className="garden-stats">
        <div className="stat">
          <span className="stat-icon">🌱</span>
          <span className="stat-value">{plants.length}</span>
          <span className="stat-label">Plants</span>
        </div>
        <div className="stat">
          <span className="stat-icon">🦋</span>
          <span className="stat-value">{creatures.length}</span>
          <span className="stat-label">Creatures</span>
        </div>
        <div className="stat">
          <span className="stat-icon">✨</span>
          <span className="stat-value">{gardenEnergy}%</span>
          <span className="stat-label">Energy</span>
        </div>
        <div className="stat">
          <span className="stat-icon">💭</span>
          <span className="stat-value">{userMood}</span>
          <span className="stat-label">Mood</span>
        </div>
      </div>

      {/* Weather Display */}
      <div className="weather-display">
        <div className="weather-item">
          <span>🌬️ Wind: {weather.windSpeed.toFixed(1)}</span>
        </div>
        <div className="weather-item">
          <span>💧 {weather.precipitation}</span>
        </div>
        <div className="weather-item">
          <span>🌡️ {weather.temperature}°C</span>
        </div>
        <div className="weather-item">
          <span>☀️ {(weather.lightIntensity * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Social Fireflies */}
      <div className="social-panel">
        <h3>Community Moods</h3>
        <div className="firefly-list">
          {socialFireflies.slice(0, 5).map(firefly => (
            <div key={firefly.id} className="social-firefly">
              <div 
                className="firefly-glow"
                style={{ 
                  backgroundColor: firefly.glow.color,
                  opacity: firefly.glow.intensity 
                }}
              />
              <span>{firefly.mood}</span>
              <span className="firefly-time">
                {new Date(firefly.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
        <button 
          className="share-mood"
          onClick={() => createSocialFirefly(userMood)}
        >
          Share Your Mood ✨
        </button>
      </div>

      {/* Magical Moments */}
      <div className="magical-moments">
        {magicalMoments.map((moment, index) => (
          <div 
            key={index} 
            className="magical-moment"
            style={{ 
              opacity: 1 - (index * 0.2),
              transform: `translateY(${index * 30}px)`
            }}
          >
            {moment}
          </div>
        ))}
      </div>

      {/* Hidden Interaction Hints */}
      <div className="interaction-hints">
        <div className="hint">🌬️ Blow into mic to create wind</div>
        <div className="hint">📱 Shake device to scatter seeds</div>
        <div className="hint">🗣️ Speak your feelings to grow plants</div>
        <div className="hint">👆 Touch plants to interact</div>
      </div>

      {/* 3D Plant Renderer */}
      <div className="plant-renderer">
        {plants.map(plant => (
          <div
            key={plant.id}
            className={`plant-3d plant-${plant.type} ${plant.emotion}`}
            style={{
              transform: `
                translate3d(
                  ${plant.position.x + plant.physics.velocity.x}px, 
                  ${plant.position.y + plant.physics.velocity.y}px, 
                  ${plant.position.z + plant.physics.velocity.z}px
                ) 
                scale3d(${plant.scale.x}, ${plant.scale.y}, ${plant.scale.z})
                rotateY(${plant.rotation.y}rad)
              `,
              '--growth-stage': plant.growthStage,
              '--wind-effect': weather.windSpeed,
              '--energy': plant.energy / 100
            } as React.CSSProperties}
            onClick={() => {
              setPlants(prev => prev.map(p => 
                p.id === plant.id 
                  ? { ...p, energy: Math.min(p.energy + 10, 100) }
                  : p
              ));
              addMagicalMoment(`🌺 ${plant.type} loves your touch!`);
            }}
          >
            <div className="plant-stem" />
            <div className="plant-leaves" />
            {plant.procedural.flowerCount > 0 && (
              <div className="plant-flowers" />
            )}
            <div className="plant-glow" />
          </div>
        ))}
      </div>

      {/* 3D Creature Renderer */}
      <div className="creature-renderer">
        {creatures.map(creature => (
          <div
            key={creature.id}
            className={`creature-3d creature-${creature.type} behavior-${creature.behavior}`}
            style={{
              transform: `
                translate3d(
                  ${creature.position.x}px, 
                  ${creature.position.y}px, 
                  ${creature.position.z}px
                )
              `,
              '--curiosity': creature.personality.curiosity,
              '--playfulness': creature.personality.playfulness
            } as React.CSSProperties}
          >
            <div className="creature-body" />
            <div className="creature-wings" />
            <div className="creature-trail" />
          </div>
        ))}
      </div>

      {/* Particle Effects */}
      <div className="particle-system">
        {weather.precipitation === 'mist' && (
          <div className="mist-particles" />
        )}
        {weather.precipitation === 'rain' && (
          <div className="rain-particles" />
        )}
        <div className="pollen-particles" />
        <div className="magic-sparkles" />
      </div>
    </div>
  );
};

export default MagicalGarden3D;

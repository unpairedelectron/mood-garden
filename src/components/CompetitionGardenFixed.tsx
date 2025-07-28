import React, { useState, useEffect, useCallback } from 'react';
import type { GardenState, Plant, Pet } from '../types';
import MoodMusic from './MoodMusic';
import AdvancedEffects from './AdvancedEffects';
import AIGardenEvolution from './AIGardenEvolution';
import ZenBreathing from './ZenBreathing';
import './WalkableGarden.css';
import './CompetitionEnhancements.css';

interface WalkableGardenProps {
  gardenState: GardenState;
  onPlantClick: (plant: Plant) => void;
}

interface PlayerPosition {
  x: number;
  y: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'sparkle' | 'leaf' | 'petal' | 'firefly' | 'magic' | 'zen';
  color: string;
  size: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  category: 'exploration' | 'growth' | 'social' | 'mindfulness';
}

const CompetitionGarden: React.FC<WalkableGardenProps> = ({ gardenState, onPlantClick }) => {
  const [playerPos, setPlayerPos] = useState<PlayerPosition>({ x: 50, y: 70 });
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Enhanced state for competition features
  const [currentWeather, setCurrentWeather] = useState<string>('sunny');
  const [timeOfDay, setTimeOfDay] = useState<string>('morning');
  const [totalSteps, setTotalSteps] = useState(0);
  const [plantsDiscovered, setPlantsDiscovered] = useState<Set<string>>(new Set());
  const [petsInteracted, setPetsInteracted] = useState<Set<string>>(new Set());
  const [gardenLevel, setGardenLevel] = useState(1);
  const [magicMode, setMagicMode] = useState(false);
  const [zenModeActive, setZenModeActive] = useState(false);
  const [timeSpentInGarden, setTimeSpentInGarden] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'first_steps',
      title: 'First Steps',
      description: 'Begin your journey through the garden',
      icon: '👣',
      unlocked: false,
      progress: 0,
      maxProgress: 10,
      category: 'exploration'
    },
    {
      id: 'plant_whisperer',
      title: 'Plant Whisperer',
      description: 'Discover 5 different plants',
      icon: '🌿',
      unlocked: false,
      progress: 0,
      maxProgress: 5,
      category: 'exploration'
    },
    {
      id: 'zen_master',
      title: 'Zen Master',
      description: 'Spend 10 minutes in zen mode',
      icon: '🧘‍♀️',
      unlocked: false,
      progress: 0,
      maxProgress: 600,
      category: 'mindfulness'
    }
  ]);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);

  // Competition enhancement: Dynamic weather system
  useEffect(() => {
    const weatherCycle = setInterval(() => {
      const weathers = ['sunny', 'cloudy', 'rainy', 'misty', 'sunset'];
      setCurrentWeather(weathers[Math.floor(Math.random() * weathers.length)]);
    }, 30000);

    return () => clearInterval(weatherCycle);
  }, []);

  // Time of day cycle
  useEffect(() => {
    const timeCycle = setInterval(() => {
      const times = ['dawn', 'morning', 'afternoon', 'evening', 'night'];
      const currentIndex = times.indexOf(timeOfDay);
      const nextIndex = (currentIndex + 1) % times.length;
      setTimeOfDay(times[nextIndex]);
    }, 45000);

    return () => clearInterval(timeCycle);
  }, [timeOfDay]);

  // Track time spent in garden
  useEffect(() => {
    const timeTracker = setInterval(() => {
      setTimeSpentInGarden(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timeTracker);
  }, []);

  // Enhanced particle system
  useEffect(() => {
    const particleInterval = setInterval(() => {
      const newParticles: Particle[] = [];
      
      if (zenModeActive) {
        newParticles.push({
          id: `zen_${Date.now()}`,
          x: playerPos.x + (Math.random() - 0.5) * 15,
          y: playerPos.y + (Math.random() - 0.5) * 15,
          vx: 0,
          vy: -0.5,
          life: 0,
          maxLife: 300,
          type: 'zen',
          color: '#E6E6FA',
          size: 6
        });
      }

      if (magicMode) {
        newParticles.push({
          id: `magic_${Date.now()}`,
          x: playerPos.x + (Math.random() - 0.5) * 10,
          y: playerPos.y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 0,
          maxLife: 150,
          type: 'magic',
          color: '#FF69B4',
          size: 4
        });
      }

      setParticles(prev => [...prev, ...newParticles]);
    }, 500);

    return () => clearInterval(particleInterval);
  }, [zenModeActive, magicMode, playerPos]);

  // Update particles
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setParticles(prev => prev
        .map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          life: particle.life + 1
        }))
        .filter(particle => particle.life < particle.maxLife && particle.y < 105)
      );
    }, 50);

    return () => clearInterval(updateInterval);
  }, []);

  // Achievement system
  const checkAchievements = useCallback(() => {
    const updatedAchievements = achievements.map(achievement => {
      let newProgress = achievement.progress;
      
      switch (achievement.id) {
        case 'first_steps':
          newProgress = totalSteps;
          break;
        case 'plant_whisperer':
          newProgress = plantsDiscovered.size;
          break;
        case 'zen_master':
          newProgress = zenModeActive ? achievement.progress + 1 : achievement.progress;
          break;
      }
      
      const wasUnlocked = achievement.unlocked;
      const isNowUnlocked = newProgress >= achievement.maxProgress;
      
      if (!wasUnlocked && isNowUnlocked) {
        setUnlockedAchievement(achievement);
        setTimeout(() => setUnlockedAchievement(null), 4000);
      }
      
      return {
        ...achievement,
        progress: newProgress,
        unlocked: isNowUnlocked
      };
    });
    
    setAchievements(updatedAchievements);
  }, [totalSteps, plantsDiscovered.size, zenModeActive, achievements]);

  useEffect(() => {
    checkAchievements();
  }, [checkAchievements]);

  // Enhanced keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const step = 2;
      let newPos = { ...playerPos };
      let moved = false;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          newPos.y = Math.max(5, playerPos.y - step);
          moved = true;
          break;
        case 's':
        case 'arrowdown':
          newPos.y = Math.min(85, playerPos.y + step);
          moved = true;
          break;
        case 'a':
        case 'arrowleft':
          newPos.x = Math.max(5, playerPos.x - step);
          moved = true;
          break;
        case 'd':
        case 'arrowright':
          newPos.x = Math.min(95, playerPos.x + step);
          moved = true;
          break;
        case 'm':
          setMagicMode(!magicMode);
          break;
        case 'z':
          setZenModeActive(!zenModeActive);
          break;
        case 'escape':
          setSelectedPlant(null);
          break;
      }

      if (moved) {
        setPlayerPos(newPos);
        setTotalSteps(prev => prev + 1);
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 200);
        
        const newLevel = Math.floor(totalSteps / 100) + 1;
        if (newLevel > gardenLevel) {
          setGardenLevel(newLevel);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playerPos, magicMode, zenModeActive, totalSteps, gardenLevel]);

  // Check for nearby elements
  const checkNearbyElements = useCallback(() => {
    gardenState.plants.forEach(plant => {
      const distance = Math.sqrt(
        Math.pow(playerPos.x - plant.position.x, 2) + 
        Math.pow(playerPos.y - plant.position.y, 2)
      );
      
      if (distance < 8) {
        setPlantsDiscovered(prev => new Set([...prev, plant.id]));
      }
    });

    gardenState.pets.forEach(pet => {
      const distance = Math.sqrt(
        Math.pow(playerPos.x - pet.position.x, 2) + 
        Math.pow(playerPos.y - pet.position.y, 2)
      );
      
      if (distance < 10) {
        setPetsInteracted(prev => new Set([...prev, pet.id]));
      }
    });
  }, [playerPos, gardenState.plants, gardenState.pets]);

  useEffect(() => {
    checkNearbyElements();
  }, [playerPos, checkNearbyElements]);

  const handleEvolutionEvent = (event: any) => {
    console.log('🌟 Garden evolution event:', event);
  };

  const handlePlantClick = (plant: Plant) => {
    setSelectedPlant(plant);
    onPlantClick(plant);
    
    // Add interaction particles
    const clickParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      clickParticles.push({
        id: `click_${Date.now()}_${i}`,
        x: plant.position.x + (Math.random() - 0.5) * 5,
        y: plant.position.y + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2,
        life: 0,
        maxLife: 100,
        type: 'sparkle',
        color: '#32CD32',
        size: 3
      });
    }
    setParticles(prev => [...prev, ...clickParticles]);
  };

  const getPlantEmoji = (plant: Plant): string => {
    const emojiMap: { [key: string]: { [key: string]: string } } = {
      'sunflower': {
        'seed': '🌰',
        'sprout': '🌱',
        'growing': '🌿',
        'blooming': '🌻',
        'mature': '🌻'
      },
      'lavender': {
        'seed': '🟤',
        'sprout': '🌱',
        'growing': '🌿',
        'blooming': '💜',
        'mature': '🟣'
      },
      'lotus': {
        'seed': '⚫',
        'sprout': '🌱',
        'growing': '🍃',
        'blooming': '🪷',
        'mature': '🪷'
      },
      'bamboo': {
        'seed': '🟫',
        'sprout': '🌱',
        'growing': '🎋',
        'blooming': '🎋',
        'mature': '🎋'
      },
      'chamomile': {
        'seed': '🟤',
        'sprout': '🌱',
        'growing': '🌿',
        'blooming': '🌼',
        'mature': '🌼'
      }
    };

    return emojiMap[plant.type]?.[plant.stage] || '🌱';
  };

  const getPlayerSprite = (): string => {
    if (zenModeActive) return '🧘‍♀️';
    if (magicMode) return '🧙‍♀️';
    if (isMoving) return '🚶‍♀️';
    return '🙂';
  };

  const getWeatherEmoji = (weather: string): string => {
    const emojiMap: { [key: string]: string } = {
      'sunny': '☀️',
      'rainy': '🌧️',
      'cloudy': '☁️',
      'misty': '🌫️',
      'sunset': '🌅'
    };
    return emojiMap[weather] || '☀️';
  };

  const getTimeOfDayEmoji = (timeOfDay: string): string => {
    const emojiMap: { [key: string]: string } = {
      'dawn': '🌅',
      'morning': '🌄',
      'afternoon': '☀️',
      'evening': '🌇',
      'night': '🌙'
    };
    return emojiMap[timeOfDay] || '☀️';
  };

  return (
    <div className={`walkable-garden ${zenModeActive ? 'zen-mode' : ''} ${magicMode ? 'magic-mode' : ''}`}>
      {/* AI Garden Evolution System */}
      <AIGardenEvolution
        totalSteps={totalSteps}
        plantsDiscovered={plantsDiscovered}
        petsInteracted={petsInteracted}
        achievements={achievements}
        timeSpentInGarden={timeSpentInGarden}
        onEvolutionEvent={handleEvolutionEvent}
      />

      {/* Zen Breathing Guide */}
      <ZenBreathing isActive={true} zenMode={zenModeActive} />

      {/* Enhanced UI with competition features */}
      <div className="competition-ui">
        <div className="garden-header-enhanced">
          <div className="title-section">
            <h1>🌿 Serenity Garden Sanctuary 🌿</h1>
            <div className="garden-level">Level {gardenLevel} Garden ✨</div>
          </div>
          
          <div className="status-panel">
            <div className="weather-time">
              <div className="weather-indicator">
                {getWeatherEmoji(currentWeather)} {currentWeather.charAt(0).toUpperCase() + currentWeather.slice(1)}
              </div>
              <div className="time-indicator">
                {getTimeOfDayEmoji(timeOfDay)} {timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}
              </div>
            </div>
            <div className="mode-indicators">
              {magicMode && <div className="mode-active">🪄 Magic Mode</div>}
              {zenModeActive && <div className="mode-active">🧘‍♀️ Zen Mode</div>}
            </div>
          </div>
        </div>

        <div className="enhanced-controls">
          <div className="control-group">
            <span className="control-label">Move:</span>
            <span className="control-keys">WASD / Arrows</span>
          </div>
          <div className="control-group">
            <span className="control-label">Magic:</span>
            <span className="control-keys">M</span>
          </div>
          <div className="control-group">
            <span className="control-label">Zen:</span>
            <span className="control-keys">Z</span>
          </div>
          <div className="interaction-hint-enhanced">
            Click plants to connect with their wisdom ✨
          </div>
        </div>
      </div>

      {/* Enhanced garden environment */}
      <div className={`garden-environment ${currentWeather} ${timeOfDay}`}>
        <div className="garden-landscape">
          {/* Enhanced background elements */}
          <div className="environment-layer background-layer">
            <div className="sky-gradient"></div>
            <div className="cloud-layer">
              <div className="cloud cloud-1">☁️</div>
              <div className="cloud cloud-2">☁️</div>
              <div className="cloud cloud-3">☁️</div>
            </div>
            {timeOfDay === 'night' && (
              <div className="star-field">
                <div className="star">⭐</div>
                <div className="star">✨</div>
                <div className="star">⭐</div>
                <div className="star">✨</div>
                <div className="star">⭐</div>
              </div>
            )}
          </div>

          {/* Garden paths and structures */}
          <div className="garden-paths">
            <div className="path main-path"></div>
            <div className="meditation-circle">
              <div className="circle-center">🕉️</div>
            </div>
            <div className="zen-stones">
              <div className="stone">🪨</div>
              <div className="stone">🪨</div>
              <div className="stone">🪨</div>
            </div>
          </div>

          {/* Enhanced plants */}
          {gardenState.plants.map(plant => {
            const isNearby = Math.sqrt(
              Math.pow(playerPos.x - plant.position.x, 2) + 
              Math.pow(playerPos.y - plant.position.y, 2)
            ) < 8;
            
            return (
              <div
                key={plant.id}
                className={`plant-enhanced ${plant.stage} ${isNearby ? 'nearby' : ''} ${plantsDiscovered.has(plant.id) ? 'discovered' : ''}`}
                style={{
                  left: `${plant.position.x}%`,
                  top: `${plant.position.y}%`
                }}
                onClick={() => handlePlantClick(plant)}
              >
                <div className="plant-sprite">{getPlantEmoji(plant)}</div>
                <div className="plant-aura">
                  {isNearby && <span className="proximity-glow">✨</span>}
                  {plantsDiscovered.has(plant.id) && <span className="discovery-mark">💫</span>}
                </div>
                <div className="plant-shadow"></div>
                {isNearby && (
                  <div className="plant-tooltip">
                    {plant.type} - {plant.stage}
                  </div>
                )}
              </div>
            );
          })}

          {/* Enhanced pets */}
          {gardenState.pets.map(pet => {
            const petEmoji = pet.type === 'butterfly' ? '🦋' : 
                           pet.type === 'firefly' ? '✨' :
                           pet.type === 'bird' ? '🐦' : '🐝';
            
            const isNearby = Math.sqrt(
              Math.pow(playerPos.x - pet.position.x, 2) + 
              Math.pow(playerPos.y - pet.position.y, 2)
            ) < 10;
            
            return (
              <div
                key={pet.id}
                className={`pet-enhanced ${isNearby ? 'nearby' : ''} ${petsInteracted.has(pet.id) ? 'befriended' : ''}`}
                style={{
                  left: `${pet.position.x}%`,
                  top: `${pet.position.y}%`
                }}
              >
                <div className="pet-sprite">{petEmoji}</div>
                <div className="pet-aura">
                  {isNearby && <span className="friendship-glow">💕</span>}
                  {petsInteracted.has(pet.id) && <span className="friendship-mark">❤️</span>}
                </div>
                <div className="pet-shadow"></div>
              </div>
            );
          })}

          {/* Enhanced player character */}
          <div
            className={`player-enhanced ${isMoving ? 'moving' : ''} ${zenModeActive ? 'zen' : ''} ${magicMode ? 'magic' : ''}`}
            style={{
              left: `${playerPos.x}%`,
              top: `${playerPos.y}%`
            }}
          >
            <div className="player-sprite">{getPlayerSprite()}</div>
            <div className="player-aura">
              {magicMode && <span className="magic-aura">🌟✨🌟</span>}
              {zenModeActive && <span className="zen-aura">🧘‍♀️💫🧘‍♀️</span>}
            </div>
            <div className="player-shadow"></div>
          </div>

          {/* Advanced effects layer */}
          <AdvancedEffects
            isActive={true}
            playerPosition={playerPos}
            weatherType={currentWeather}
            timeOfDay={timeOfDay}
            magicMode={magicMode}
            zenMode={zenModeActive}
          />

          {/* Particle effects */}
          {particles.map(particle => (
            <div
              key={particle.id}
              className={`particle particle-${particle.type}`}
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                backgroundColor: particle.color,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                opacity: 1 - (particle.life / particle.maxLife)
              }}
            />
          ))}
        </div>
      </div>

      {/* Enhanced stats panel */}
      <div className="enhanced-stats-panel">
        <div className="stat-group">
          <div className="stat-item">
            <span className="stat-icon">👣</span>
            <span className="stat-value">{totalSteps}</span>
            <span className="stat-label">Steps</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🌱</span>
            <span className="stat-value">{plantsDiscovered.size}</span>
            <span className="stat-label">Plants</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🦋</span>
            <span className="stat-value">{petsInteracted.size}</span>
            <span className="stat-label">Friends</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🏆</span>
            <span className="stat-value">{achievements.filter(a => a.unlocked).length}</span>
            <span className="stat-label">Achievements</span>
          </div>
        </div>
      </div>

      {/* Achievement notification */}
      {unlockedAchievement && (
        <div className="achievement-notification">
          <div className="achievement-content">
            <div className="achievement-icon">{unlockedAchievement.icon}</div>
            <div className="achievement-text">
              <div className="achievement-title">Achievement Unlocked!</div>
              <div className="achievement-name">{unlockedAchievement.title}</div>
              <div className="achievement-desc">{unlockedAchievement.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced plant modal */}
      {selectedPlant && (
        <div className="enhanced-plant-modal" onClick={() => setSelectedPlant(null)}>
          <div className="enhanced-plant-content" onClick={(e) => e.stopPropagation()}>
            <div className="plant-header-enhanced">
              <div className="plant-avatar-large">{getPlantEmoji(selectedPlant)}</div>
              <div className="plant-info-enhanced">
                <h3>{selectedPlant.type.charAt(0).toUpperCase() + selectedPlant.type.slice(1)}</h3>
                <div className="plant-stage-enhanced">{selectedPlant.stage}</div>
                <div className="plant-age">
                  Age: {selectedPlant.plantedAt ? Math.floor((Date.now() - new Date(selectedPlant.plantedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} days
                </div>
              </div>
            </div>
            
            <div className="plant-wisdom">
              <h4>🌿 Plant Wisdom</h4>
              <p>{selectedPlant.lore}</p>
            </div>
            
            <div className="plant-actions-enhanced">
              <button className="action-btn nurture-btn">
                🤲 Send Love & Light
              </button>
              <button className="action-btn meditate-btn">
                🧘‍♀️ Meditate Together
              </button>
              <button className="action-btn close-btn" onClick={() => setSelectedPlant(null)}>
                🙏 Continue Journey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music component for enhanced atmosphere */}
      <MoodMusic weather={gardenState.weather} pets={gardenState.pets} plantsCount={gardenState.plants.length} />
    </div>
  );
};

export default CompetitionGarden;

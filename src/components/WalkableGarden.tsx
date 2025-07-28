import React, { useState, useEffect, useCallback } from 'react';
import type { GardenState, Plant, Pet } from '../types';
import MoodMusic from './MoodMusic';
import './WalkableGarden.css';

interface WalkableGardenProps {
  gardenState: GardenState;
  onPlantClick: (plant: Plant) => void;
}

interface PlayerPosition {
  x: number;
  y: number;
}

interface CameraPosition {
  x: number;
  y: number;
}

const WalkableGarden: React.FC<WalkableGardenProps> = ({ gardenState, onPlantClick }) => {
  const [playerPos, setPlayerPos] = useState<PlayerPosition>({ x: 50, y: 70 });
  const [cameraPos, setCameraPos] = useState<CameraPosition>({ x: 0, y: 0 });
  const [playerDirection, setPlayerDirection] = useState<'left' | 'right' | 'up' | 'down'>('down');
  const [isWalking, setIsWalking] = useState(false);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [nearbyElements, setNearbyElements] = useState<{plants: Plant[], pets: Pet[]}>({ plants: [], pets: [] });

  // Garden world dimensions (much larger for exploration)
  const WORLD_WIDTH = 400;
  const WORLD_HEIGHT = 300;
  const VIEWPORT_WIDTH = 100;
  const VIEWPORT_HEIGHT = 60;

  // Movement speed
  const MOVE_SPEED = 0.8;

  // Check for nearby interactive elements
  const checkNearbyElements = useCallback(() => {
    const INTERACTION_DISTANCE = 8;
    
    const nearbyPlants = gardenState.plants.filter(plant => {
      const distance = Math.sqrt(
        Math.pow(plant.position.x - playerPos.x, 2) + 
        Math.pow(plant.position.y - playerPos.y, 2)
      );
      return distance < INTERACTION_DISTANCE;
    });

    const nearbyPets = gardenState.pets.filter(pet => {
      const distance = Math.sqrt(
        Math.pow(pet.position.x - playerPos.x, 2) + 
        Math.pow(pet.position.y - playerPos.y, 2)
      );
      return distance < INTERACTION_DISTANCE;
    });

    setNearbyElements({ plants: nearbyPlants, pets: nearbyPets });
  }, [playerPos, gardenState.plants, gardenState.pets]);

  // Update camera to follow player
  useEffect(() => {
    const newCameraX = Math.max(0, Math.min(playerPos.x - VIEWPORT_WIDTH / 2, WORLD_WIDTH - VIEWPORT_WIDTH));
    const newCameraY = Math.max(0, Math.min(playerPos.y - VIEWPORT_HEIGHT / 2, WORLD_HEIGHT - VIEWPORT_HEIGHT));
    setCameraPos({ x: newCameraX, y: newCameraY });
    checkNearbyElements();
  }, [playerPos, checkNearbyElements]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        setKeysPressed(prev => new Set(prev).add(key));
      }
      
      // Interaction with nearby elements
      if (key === 'e' || key === 'enter') {
        if (nearbyElements.plants.length > 0) {
          handlePlantInteraction(nearbyElements.plants[0]);
        } else if (nearbyElements.pets.length > 0) {
          handlePetInteraction(nearbyElements.pets[0]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setKeysPressed(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nearbyElements]);

  // Movement logic
  useEffect(() => {
    if (keysPressed.size === 0) {
      setIsWalking(false);
      return;
    }

    setIsWalking(true);
    const interval = setInterval(() => {
      setPlayerPos(prevPos => {
        let newX = prevPos.x;
        let newY = prevPos.y;
        let newDirection = playerDirection;

        // Horizontal movement
        if (keysPressed.has('a') || keysPressed.has('arrowleft')) {
          newX = Math.max(5, prevPos.x - MOVE_SPEED);
          newDirection = 'left';
        }
        if (keysPressed.has('d') || keysPressed.has('arrowright')) {
          newX = Math.min(WORLD_WIDTH - 5, prevPos.x + MOVE_SPEED);
          newDirection = 'right';
        }

        // Vertical movement
        if (keysPressed.has('w') || keysPressed.has('arrowup')) {
          newY = Math.max(5, prevPos.y - MOVE_SPEED);
          newDirection = 'up';
        }
        if (keysPressed.has('s') || keysPressed.has('arrowdown')) {
          newY = Math.min(WORLD_HEIGHT - 5, prevPos.y + MOVE_SPEED);
          newDirection = 'down';
        }

        if (newDirection !== playerDirection) {
          setPlayerDirection(newDirection);
        }

        return { x: newX, y: newY };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [keysPressed, playerDirection]);

  const handlePlantInteraction = (plant: Plant) => {
    setSelectedPlant(plant);
    onPlantClick(plant);
  };

  const handlePetInteraction = (pet: Pet) => {
    const petMessages = {
      'butterfly': [
        '🦋 "I bring transformation and joy! Your positive energy drew me here."',
        '🦋 "Like me, you can transform through life\'s changes with grace."'
      ],
      'firefly': [
        '✨ "Your creativity lights up this garden! Keep shining bright."',
        '✨ "In darkness, we create our own light. What will you illuminate today?"'
      ],
      'bird': [
        '🐦 "Your peaceful presence calms my spirit. Thank you for walking gently."',
        '🐦 "Freedom comes from inner peace. I see that wisdom in you."'
      ],
      'bee': [
        '🐝 "Your focused energy helps this garden flourish! Keep up the great work."',
        '🐝 "Like me, you understand the value of purposeful action."'
      ]
    };

    const messages = petMessages[pet.type as keyof typeof petMessages] || ['🐾 "Thank you for visiting me in this beautiful garden."'];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Create a beautiful interaction popup
    const modal = document.createElement('div');
    modal.className = 'pet-interaction-modal';
    modal.innerHTML = `
      <div class="pet-interaction-content">
        <div class="pet-avatar">${getPetEmoji(pet.type)}</div>
        <div class="pet-message">${randomMessage}</div>
        <button class="close-interaction" onclick="this.parentElement.parentElement.remove()">✨ Continue Exploring</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 8000);
  };

  const getPetEmoji = (petType: string): string => {
    const emojiMap: { [key: string]: string } = {
      'butterfly': '🦋',
      'firefly': '✨',
      'bird': '🐦',
      'bee': '🐝'
    };
    return emojiMap[petType] || '🐾';
  };

  const getPlantEmoji = (plant: Plant): string => {
    const plantEmojis: { [key: string]: { [key: string]: string } } = {
      'sunflower': { sprout: '🌱', growing: '🌿', blooming: '🌻', mature: '🌻' },
      'lavender': { sprout: '🌱', growing: '🌿', blooming: '🪻', mature: '🪻' },
      'lotus': { sprout: '🌱', growing: '🌿', blooming: '🪷', mature: '🪷' },
      'bamboo': { sprout: '🌱', growing: '🎋', blooming: '🎋', mature: '🎋' },
      'aloe': { sprout: '🌱', growing: '🌿', blooming: '🌿', mature: '🪴' },
      'willow': { sprout: '🌱', growing: '🌿', blooming: '🌲', mature: '🌲' },
      'chamomile': { sprout: '🌱', growing: '🌿', blooming: '🌼', mature: '🌼' },
      'cactus': { sprout: '🌱', growing: '🌿', blooming: '🌵', mature: '🌵' }
    };

    return plantEmojis[plant.type]?.[plant.stage] || '🌱';
  };

  const getPlayerSprite = (): string => {
    const walking = isWalking ? 'walking' : 'idle';
    const sprites = {
      up: { idle: '🚶‍♀️', walking: '🚶‍♀️' },
      down: { idle: '🧍‍♀️', walking: '🚶‍♀️' },
      left: { idle: '🧍‍♀️', walking: '🚶‍♀️' },
      right: { idle: '🧍‍♂️', walking: '🚶‍♂️' }
    };
    
    return sprites[playerDirection][walking];
  };

  const getWeatherBackground = (weather: string): string => {
    const backgrounds = {
      'sunny': 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 40%, #90EE90 70%, #228B22 100%)',
      'rainy': 'linear-gradient(to bottom, #708090 0%, #778899 30%, #87CEEB 60%, #98FB98 100%)',
      'cloudy': 'linear-gradient(to bottom, #B0C4DE 0%, #D3D3D3 30%, #E0E0E0 60%, #98FB98 100%)',
      'misty': 'linear-gradient(to bottom, #F5F5F5 0%, #E6E6FA 30%, #F0F8FF 60%, #E8F5E8 100%)',
      'sunset': 'linear-gradient(to bottom, #FF6347 0%, #FFD700 30%, #FF8C00 60%, #228B22 100%)'
    };
    return backgrounds[weather as keyof typeof backgrounds] || backgrounds['sunny'];
  };

  return (
    <div className="walkable-garden">
      <MoodMusic 
        weather={gardenState.weather} 
        pets={gardenState.pets}
        plantsCount={gardenState.plants.length}
      />
      
      <div className="garden-ui">
        <div className="garden-header">
          <h1>🌿 Explore Your Therapeutic Garden 🌿</h1>
          <div className="weather-info">
            🌤️ {gardenState.weather.charAt(0).toUpperCase() + gardenState.weather.slice(1)} Day
          </div>
        </div>

        <div className="controls-info">
          <span>🎮 Use WASD or Arrow Keys to walk</span>
          {nearbyElements.plants.length > 0 && (
            <span className="interaction-hint">🌱 Press E to interact with {nearbyElements.plants[0].type}</span>
          )}
          {nearbyElements.pets.length > 0 && (
            <span className="interaction-hint">🦋 Press E to talk to {nearbyElements.pets[0].type}</span>
          )}
        </div>
      </div>

      <div 
        className="garden-viewport"
        style={{
          background: getWeatherBackground(gardenState.weather)
        }}
      >
        <div 
          className="garden-world"
          style={{
            transform: `translate(-${cameraPos.x}%, -${cameraPos.y}%)`,
            width: `${WORLD_WIDTH}%`,
            height: `${WORLD_HEIGHT}%`
          }}
        >
          {/* Background environment */}
          <div className="environment-layer sky"></div>
          <div className="environment-layer mountains"></div>
          <div className="environment-layer forest-distant"></div>
          <div className="environment-layer forest-mid"></div>
          <div className="environment-layer forest-close"></div>
          
          {/* Garden paths */}
          <div className="garden-paths">
            <div className="main-path"></div>
            <div className="side-path-1"></div>
            <div className="side-path-2"></div>
            <div className="circular-path"></div>
          </div>

          {/* Terrain and ground */}
          <div className="terrain-layer grass"></div>
          <div className="terrain-layer dirt-patches"></div>
          
          {/* Environmental decorations */}
          <div className="decoration stone" style={{ left: '15%', top: '75%' }}>🪨</div>
          <div className="decoration stone" style={{ left: '45%', top: '80%' }}>🪨</div>
          <div className="decoration stone" style={{ left: '75%', top: '70%' }}>🪨</div>
          
          <div className="decoration tree-stump" style={{ left: '25%', top: '65%' }}>🪵</div>
          <div className="decoration tree-stump" style={{ left: '85%', top: '75%' }}>🪵</div>
          
          <div className="decoration flower-bush" style={{ left: '35%', top: '60%' }}>🌹</div>
          <div className="decoration flower-bush" style={{ left: '65%', top: '55%' }}>🌺</div>
          <div className="decoration flower-bush" style={{ left: '80%', top: '60%' }}>🌸</div>
          
          <div className="decoration fern-cluster" style={{ left: '20%', top: '50%' }}>🌿</div>
          <div className="decoration fern-cluster" style={{ left: '70%', top: '45%' }}>🌿</div>
          <div className="decoration fern-cluster" style={{ left: '90%', top: '50%' }}>🌿</div>

          {/* Water features */}
          <div className="water-feature pond" style={{ left: '60%', top: '65%' }}>
            <div className="water-surface">💧</div>
            <div className="water-lily" style={{ left: '30%', top: '40%' }}>🪷</div>
            <div className="water-lily" style={{ left: '70%', top: '60%' }}>🪷</div>
          </div>

          {/* Garden plants */}
          {gardenState.plants.map((plant, index) => (
            <div
              key={plant.id || index}
              className={`garden-plant ${nearbyElements.plants.includes(plant) ? 'nearby' : ''}`}
              style={{
                left: `${plant.position.x}%`,
                top: `${plant.position.y}%`,
              }}
              onClick={() => handlePlantInteraction(plant)}
            >
              <div className="plant-sprite">{getPlantEmoji(plant)}</div>
              <div className="plant-shadow"></div>
              {nearbyElements.plants.includes(plant) && (
                <div className="interaction-indicator">💫</div>
              )}
            </div>
          ))}

          {/* Garden pets */}
          {gardenState.pets.map((pet, index) => (
            <div
              key={pet.id || index}
              className={`garden-pet ${nearbyElements.pets.includes(pet) ? 'nearby' : ''}`}
              style={{
                left: `${pet.position.x}%`,
                top: `${pet.position.y}%`,
              }}
              onClick={() => handlePetInteraction(pet)}
            >
              <div className="pet-sprite">{getPetEmoji(pet.type)}</div>
              <div className="pet-shadow"></div>
              {nearbyElements.pets.includes(pet) && (
                <div className="interaction-indicator">✨</div>
              )}
            </div>
          ))}

          {/* Player character */}
          <div
            className={`player-character ${playerDirection} ${isWalking ? 'walking' : 'idle'}`}
            style={{
              left: `${playerPos.x}%`,
              top: `${playerPos.y}%`,
            }}
          >
            <div className="player-sprite">{getPlayerSprite()}</div>
            <div className="player-shadow"></div>
          </div>

          {/* Atmospheric effects */}
          <div className="atmospheric-effects">
            <div className="floating-pollen" style={{ left: '20%', top: '30%' }}>✨</div>
            <div className="floating-pollen" style={{ left: '60%', top: '25%' }}>✨</div>
            <div className="floating-pollen" style={{ left: '80%', top: '35%' }}>✨</div>
            <div className="wind-effect" style={{ left: '40%', top: '40%' }}>🌬️</div>
            <div className="wind-effect" style={{ left: '75%', top: '30%' }}>🌬️</div>
          </div>
        </div>
      </div>

      {/* Garden stats */}
      <div className="garden-stats">
        <div className="stat-card">
          <span className="stat-icon">🌱</span>
          <div className="stat-content">
            <span className="stat-value">{gardenState.plants.length}</span>
            <span className="stat-label">Plants Grown</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🦋</span>
          <div className="stat-content">
            <span className="stat-value">{gardenState.pets.length}</span>
            <span className="stat-label">Garden Friends</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏃‍♀️</span>
          <div className="stat-content">
            <span className="stat-value">{Math.round(playerPos.x + playerPos.y)}</span>
            <span className="stat-label">Steps Taken</span>
          </div>
        </div>
      </div>

      {/* Plant wisdom modal */}
      {selectedPlant && (
        <div className="plant-wisdom-modal" onClick={() => setSelectedPlant(null)}>
          <div className="wisdom-content" onClick={(e) => e.stopPropagation()}>
            <div className="plant-avatar">{getPlantEmoji(selectedPlant)}</div>
            <h2>{selectedPlant.type.charAt(0).toUpperCase() + selectedPlant.type.slice(1)} Wisdom</h2>
            <div className="wisdom-text">
              <p>🌱 Growth Stage: {selectedPlant.stage}</p>
              <p>✨ This {selectedPlant.type} teaches us about {selectedPlant.moodType} and inner balance.</p>
              <p>🧘‍♀️ Take a moment to breathe deeply and appreciate this natural beauty.</p>
            </div>
            <button onClick={() => setSelectedPlant(null)}>🙏 Thank you, wise plant</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkableGarden;

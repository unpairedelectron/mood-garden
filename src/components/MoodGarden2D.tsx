import React from 'react';
import MoodMusic from './MoodMusic';
import './MoodGarden2D.css';

interface Plant {
  id: string;
  type: string;
  moodType: string;
  position: { x: number; y: number };
  stage: 'seed' | 'sprout' | 'growing' | 'blooming' | 'mature';
  plantedAt: Date;
  lore: string;
}

interface Pet {
  id: string;
  type: 'butterfly' | 'firefly' | 'bird' | 'bee';
  position: { x: number; y: number };
  animation: string;
}

interface GardenState {
  plants: Plant[];
  weather: 'sunny' | 'rainy' | 'cloudy' | 'misty' | 'sunset';
  pets: Pet[];
  challenges: any[];
  unlockedFeatures: string[];
}

interface MoodGardenProps {
  gardenState: GardenState;
  onPlantClick: (plant: Plant) => void;
}

const MoodGarden: React.FC<MoodGardenProps> = ({ gardenState, onPlantClick }) => {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    // Track scroll position for potential future parallax effects
    console.log('Garden scroll:', target.scrollLeft, target.scrollTop);
  };

  const getPlantVisual = (plant: Plant) => {
    const plantVisuals: { [key: string]: { [key: string]: { emoji: string; size: string; filter: string; animation: string } } } = {
      'sunflower': {
        'sprout': { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(34,139,34,0.3))', animation: 'gentle-sway 4s ease-in-out infinite' },
        'growing': { emoji: '🌿', size: '30px', filter: 'drop-shadow(1px 1px 3px rgba(34,139,34,0.4))', animation: 'gentle-sway 3.5s ease-in-out infinite' },
        'blooming': { emoji: '🌻', size: '40px', filter: 'drop-shadow(2px 2px 4px rgba(255,215,0,0.3)) brightness(1.1)', animation: 'sunflower-sway 3s ease-in-out infinite' },
        'mature': { emoji: '🌻', size: '50px', filter: 'drop-shadow(3px 3px 6px rgba(255,215,0,0.4)) brightness(1.2)', animation: 'sunflower-sway 3s ease-in-out infinite' }
      },
      'lavender': {
        'sprout': { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(147,112,219,0.3))', animation: 'gentle-sway 4.5s ease-in-out infinite' },
        'growing': { emoji: '🌿', size: '30px', filter: 'hue-rotate(270deg) drop-shadow(1px 1px 3px rgba(147,112,219,0.4))', animation: 'gentle-sway 4s ease-in-out infinite' },
        'blooming': { emoji: '🪻', size: '35px', filter: 'drop-shadow(2px 2px 4px rgba(147,112,219,0.3)) saturate(1.2)', animation: 'lavender-sway 4.5s ease-in-out infinite' },
        'mature': { emoji: '🪻', size: '45px', filter: 'drop-shadow(3px 3px 6px rgba(147,112,219,0.4)) saturate(1.3)', animation: 'lavender-sway 4.5s ease-in-out infinite' }
      },
      'lotus': {
        'sprout': { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(255,182,193,0.3))', animation: 'gentle-sway 5s ease-in-out infinite' },
        'growing': { emoji: '🌿', size: '30px', filter: 'hue-rotate(300deg) drop-shadow(1px 1px 3px rgba(255,182,193,0.4))', animation: 'gentle-sway 5s ease-in-out infinite' },
        'blooming': { emoji: '🪷', size: '40px', filter: 'drop-shadow(2px 2px 4px rgba(255,182,193,0.3)) brightness(1.15)', animation: 'lotus-sway 5s ease-in-out infinite' },
        'mature': { emoji: '🪷', size: '50px', filter: 'drop-shadow(3px 3px 6px rgba(255,182,193,0.4)) brightness(1.2)', animation: 'lotus-sway 5s ease-in-out infinite' }
      },
      'bamboo': {
        'sprout': { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(34,139,34,0.3))', animation: 'gentle-sway 3s ease-in-out infinite' },
        'growing': { emoji: '🎋', size: '35px', filter: 'drop-shadow(1px 1px 3px rgba(34,139,34,0.4))', animation: 'bamboo-sway 3.5s ease-in-out infinite' },
        'blooming': { emoji: '🎋', size: '45px', filter: 'drop-shadow(2px 2px 4px rgba(34,139,34,0.3)) contrast(1.1)', animation: 'bamboo-sway 3.5s ease-in-out infinite' },
        'mature': { emoji: '🎋', size: '60px', filter: 'drop-shadow(3px 3px 6px rgba(34,139,34,0.4)) contrast(1.15)', animation: 'bamboo-sway 3.5s ease-in-out infinite' }
      },
      'aloe': {
        'sprout': { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(50,205,50,0.3))', animation: 'gentle-sway 6s ease-in-out infinite' },
        'growing': { emoji: '🌿', size: '30px', filter: 'drop-shadow(1px 1px 3px rgba(50,205,50,0.4))', animation: 'gentle-sway 6s ease-in-out infinite' },
        'blooming': { emoji: '🌿', size: '35px', filter: 'drop-shadow(2px 2px 4px rgba(50,205,50,0.3)) saturate(1.3)', animation: 'gentle-sway 6s ease-in-out infinite' },
        'mature': { emoji: '🪴', size: '45px', filter: 'drop-shadow(3px 3px 6px rgba(50,205,50,0.4)) saturate(1.4)', animation: 'gentle-sway 6s ease-in-out infinite' }
      },
      'willow': {
        'sprout': { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(34,139,34,0.3))', animation: 'gentle-sway 4s ease-in-out infinite' },
        'growing': { emoji: '🌿', size: '30px', filter: 'drop-shadow(1px 1px 3px rgba(34,139,34,0.4))', animation: 'tree-sway 4s ease-in-out infinite' },
        'blooming': { emoji: '🌲', size: '50px', filter: 'drop-shadow(2px 2px 4px rgba(34,139,34,0.3)) brightness(1.05)', animation: 'tree-sway 4s ease-in-out infinite' },
        'mature': { emoji: '🌲', size: '65px', filter: 'drop-shadow(3px 3px 6px rgba(34,139,34,0.4)) brightness(1.1)', animation: 'tree-sway 4s ease-in-out infinite' }
      },
      'chamomile': {
        'sprout': { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(255,255,0,0.3))', animation: 'gentle-sway 3.8s ease-in-out infinite' },
        'growing': { emoji: '🌿', size: '30px', filter: 'drop-shadow(1px 1px 3px rgba(255,255,0,0.4))', animation: 'gentle-sway 3.8s ease-in-out infinite' },
        'blooming': { emoji: '🌼', size: '35px', filter: 'drop-shadow(2px 2px 4px rgba(255,255,0,0.3)) brightness(1.2)', animation: 'gentle-sway 3.8s ease-in-out infinite' },
        'mature': { emoji: '🌼', size: '40px', filter: 'drop-shadow(3px 3px 6px rgba(255,255,0,0.4)) brightness(1.3)', animation: 'gentle-sway 3.8s ease-in-out infinite' }
      },
      'cactus': {
        'sprout': { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(0,100,0,0.3))', animation: 'gentle-sway 8s ease-in-out infinite' },
        'growing': { emoji: '🌿', size: '30px', filter: 'hue-rotate(90deg) drop-shadow(1px 1px 3px rgba(0,100,0,0.4))', animation: 'gentle-sway 8s ease-in-out infinite' },
        'blooming': { emoji: '🌵', size: '40px', filter: 'drop-shadow(2px 2px 4px rgba(34,139,34,0.3)) contrast(1.15)', animation: 'gentle-sway 8s ease-in-out infinite' },
        'mature': { emoji: '🌵', size: '50px', filter: 'drop-shadow(3px 3px 6px rgba(34,139,34,0.4)) contrast(1.2)', animation: 'gentle-sway 8s ease-in-out infinite' }
      }
    };

    return plantVisuals[plant.type]?.[plant.stage] || { emoji: '🌱', size: '20px', filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))', animation: 'gentle-sway 4s ease-in-out infinite' };
  };

  const getPetVisual = (pet: Pet) => {
    const petVisuals: { [key: string]: { emoji: string; size: string; animation: string } } = {
      'butterfly': { emoji: '🦋', size: '25px', animation: 'flutter 3s infinite ease-in-out' },
      'firefly': { emoji: '✨', size: '20px', animation: 'glow 2s infinite ease-in-out' },
      'bird': { emoji: '🐦', size: '22px', animation: 'fly 4s infinite ease-in-out' },
      'bee': { emoji: '🐝', size: '18px', animation: 'buzz 1.5s infinite ease-in-out' }
    };

    return petVisuals[pet.type] || { emoji: '🐾', size: '20px', animation: 'none' };
  };

  const getWeatherBackground = (weather: string): string => {
    const backgrounds: { [key: string]: string } = {
      'sunny': 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 40%, #90EE90 70%, #228B22 100%)',
      'rainy': 'linear-gradient(to bottom, #708090 0%, #778899 30%, #87CEEB 60%, #98FB98 100%)',
      'cloudy': 'linear-gradient(to bottom, #B0C4DE 0%, #D3D3D3 30%, #E0E0E0 60%, #98FB98 100%)',
      'misty': 'linear-gradient(to bottom, #F5F5F5 0%, #E6E6FA 30%, #F0F8FF 60%, #E8F5E8 100%)',
      'sunset': 'linear-gradient(to bottom, #FF6347 0%, #FFD700 30%, #FF8C00 60%, #228B22 100%)'
    };
    return backgrounds[weather] || backgrounds['sunny'];
  };

  const handlePlantClick = (plant: Plant) => {
    // Enhanced therapeutic plant lore
    const enhancedLore = getEnhancedPlantLore(plant.type);
    
    const loreModal = document.createElement('div');
    loreModal.className = 'plant-lore-modal';
    loreModal.innerHTML = `
      <div class="plant-lore-content">
        <div class="plant-icon">${getPlantEmoji(plant.type)}</div>
        <h3>${getPlantName(plant.type)}</h3>
        <p class="lore-text">${enhancedLore.wisdom}</p>
        <div class="wellness-tip">
          <strong>💡 Try this:</strong> ${enhancedLore.actionableTip}
        </div>
        <button class="close-lore" onclick="this.parentElement.parentElement.remove()">✨ Thank you</button>
      </div>
    `;
    
    document.body.appendChild(loreModal);
    
    setTimeout(() => {
      if (loreModal.parentNode) {
        loreModal.remove();
      }
    }, 10000);
    
    onPlantClick(plant);
  };

  const handlePetClick = (pet: Pet) => {
    showPetInteraction(pet);
  };

  const getEnhancedPlantLore = (plantType: string) => {
    const loreMap: { [key: string]: { wisdom: string; actionableTip: string } } = {
      'sunflower': {
        wisdom: 'Sunflowers are symbols of unwavering faith and positivity. They follow the sun across the sky, teaching us to always look toward the light, even in darkness.',
        actionableTip: 'Practice the "Three Good Things" exercise tonight—write down three positive moments from your day.'
      },
      'lavender': {
        wisdom: 'Lavender has been used for over 2,500 years to promote calm and healing. Ancient Romans added it to baths for relaxation and mental clarity.',
        actionableTip: 'Try the 4-7-8 breathing technique: Inhale for 4, hold for 7, exhale for 8. Repeat 4 times.'
      },
      'lotus': {
        wisdom: 'The lotus emerges from muddy waters each morning, pristine and beautiful. It represents the soul\'s journey from material struggle to spiritual awakening.',
        actionableTip: 'Set aside 10 minutes for creative expression—draw, write, or imagine something new without judgment.'
      },
      'bamboo': {
        wisdom: 'Bamboo grows rapidly yet remains flexible, bending without breaking in strong winds. It teaches us resilience and adaptability.',
        actionableTip: 'Identify one small step toward a goal you can take today, then take it with bamboo-like determination.'
      },
      'aloe': {
        wisdom: 'Aloe vera stores healing gel within its leaves, always ready to soothe and restore. It reminds us that we carry healing power within ourselves.',
        actionableTip: 'Practice self-compassion: Speak to yourself as kindly as you would to your best friend.'
      },
      'willow': {
        wisdom: 'Willows have deep roots and flexible branches that sway gracefully with life\'s storms. They teach us that strength comes from both grounding and flexibility.',
        actionableTip: 'Acknowledge your current feelings without judgment, then do one small act of self-care.'
      },
      'chamomile': {
        wisdom: 'Chamomile has been called "the plant physician" because it helps other plants grow stronger. It embodies gentle healing and peaceful rest.',
        actionableTip: 'Create a calming bedtime ritual: dim lights, gentle music, or herbal tea 30 minutes before sleep.'
      },
      'cactus': {
        wisdom: 'Cacti thrive in harsh conditions by conserving water and protecting themselves while still producing beautiful flowers. They show us that beauty can emerge from difficult circumstances.',
        actionableTip: 'List three personal strengths that have helped you through challenges before.'
      }
    };
    
    return loreMap[plantType] || {
      wisdom: 'Every plant in nature has adapted beautifully to its environment, teaching us that growth comes in many forms.',
      actionableTip: 'Take a moment to appreciate something beautiful in your immediate surroundings.'
    };
  };

  const getPlantName = (plantType: string): string => {
    const nameMap: { [key: string]: string } = {
      'sunflower': 'Sunflower',
      'lavender': 'Lavender',
      'lotus': 'Lotus Blossom',
      'bamboo': 'Bamboo',
      'aloe': 'Aloe Vera',
      'willow': 'Weeping Willow',
      'chamomile': 'Chamomile',
      'cactus': 'Desert Cactus'
    };
    return nameMap[plantType] || 'Mysterious Plant';
  };

  const getPlantEmoji = (plantType: string): string => {
    const emojiMap: { [key: string]: string } = {
      'sunflower': '🌻',
      'lavender': '💜',
      'lotus': '🪷',
      'bamboo': '🎋',
      'aloe': '🌿',
      'willow': '🌲',
      'chamomile': '🌼',
      'cactus': '🌵'
    };
    return emojiMap[plantType] || '🌱';
  };

  const showPetInteraction = (pet: Pet) => {
    const petMessages: { [key: string]: string[] } = {
      'butterfly': [
        '🦋 "I bring transformation and joy! Your positive mood has attracted me here."',
        '🦋 "Like me, you can transform and find new beauty in change."',
        '🦋 "I dance on the winds of happiness—keep spreading those good vibes!"'
      ],
      'firefly': [
        '✨ "Your creativity lights up the garden! I\'m drawn to innovative minds."',
        '✨ "In darkness, we shine brightest. Your ideas illuminate the way."',
        '✨ "I glow when inspiration strikes—what will you create today?"'
      ],
      'bird': [
        '🐦 "Your peaceful energy calls to me. I love singing in serene gardens."',
        '🐦 "Freedom comes from inner peace—you\'re cultivating both beautifully."',
        '🐦 "I carry messages of hope and new beginnings across the sky."'
      ],
      'bee': [
        '🐝 "Your focused energy is like nectar to me! Keep up the productive work."',
        '🐝 "I help gardens flourish—just like how your positive actions help others."',
        '🐝 "Busy as a bee, but don\'t forget to appreciate the flowers!"'
      ]
    };

    const messages = petMessages[pet.type] || ['🐾 "Thanks for clicking on me! Your garden is beautiful."'];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const petModal = document.createElement('div');
    petModal.className = 'pet-interaction-modal';
    petModal.innerHTML = `
      <div class="pet-interaction-content">
        <div class="pet-message">${randomMessage}</div>
        <button class="close-pet" onclick="this.parentElement.parentElement.remove()">🌟 Amazing!</button>
      </div>
    `;
    
    document.body.appendChild(petModal);
    
    setTimeout(() => {
      if (petModal.parentNode) {
        petModal.remove();
      }
    }, 8000);
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

  return (
    <div className="mood-garden">
      <div className="garden-header">
        <h1>🌿 Your Jungle Sanctuary 🌿</h1>
        <div className="weather-indicator">
          {getWeatherEmoji(gardenState.weather)} {gardenState.weather.charAt(0).toUpperCase() + gardenState.weather.slice(1)} Jungle
        </div>
      </div>

      <div 
        className="garden-viewport"
        onScroll={handleScroll}
        style={{
          background: getWeatherBackground(gardenState.weather)
        }}
      >
        {/* Background landscape elements */}
        <div className="garden-background">
          <div className="mountain-range"></div>
          <div className="cloud-layer"></div>
          <div className="forest-background"></div>
        </div>

        {/* Garden terrain layers */}
        <div className="garden-terrain">
          <div className="grass-layer"></div>
          <div className="soil-layer"></div>
        </div>

        {/* Add some atmospheric floating elements */}
        <div className="atmospheric-elements">
          <div className="floating-pollen" style={{ left: '20%', top: '40%', animationDelay: '0s' }}>✨</div>
          <div className="floating-pollen" style={{ left: '60%', top: '30%', animationDelay: '2s' }}>✨</div>
          <div className="floating-pollen" style={{ left: '80%', top: '50%', animationDelay: '4s' }}>✨</div>
          <div className="floating-seeds" style={{ left: '35%', top: '25%', animationDelay: '1s' }}>🌬️</div>
          <div className="floating-seeds" style={{ left: '75%', top: '35%', animationDelay: '3s' }}>🌬️</div>
        </div>

        {/* Plants */}
        <div className="plants-container">
          {gardenState.plants.map((plant) => {
            const visual = getPlantVisual(plant);
            return (
              <div
                key={plant.id}
                className="plant-element"
                style={{
                  position: 'absolute',
                  left: `${plant.position.x}%`,
                  top: `${plant.position.y}%`,
                  fontSize: visual.size,
                  filter: visual.filter,
                  animation: visual.animation,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10
                }}
                onClick={() => handlePlantClick(plant)}
                title={`Click to learn about ${getPlantName(plant.type)}`}
              >
                {visual.emoji}
              </div>
            );
          })}
        </div>

        {/* Pets */}
        <div className="pets-container">
          {gardenState.pets.map((pet) => {
            const visual = getPetVisual(pet);
            return (
              <div
                key={pet.id}
                className="pet-element"
                style={{
                  position: 'absolute',
                  left: `${pet.position.x}%`,
                  top: `${pet.position.y}%`,
                  fontSize: visual.size,
                  animation: visual.animation,
                  cursor: 'pointer',
                  transition: 'all 0.5s ease',
                  zIndex: 15
                }}
                onClick={() => handlePetClick(pet)}
                title={`Click to interact with ${pet.type}`}
              >
                {visual.emoji}
              </div>
            );
          })}
        </div>

        {/* Decorative elements */}
        <div className="garden-decorations">
          <div className="rocks"></div>
          <div className="fallen-leaves"></div>
          <div className="flower-patches"></div>
          
          {/* Additional jungle decorations with emojis */}
          <div className="decoration-emoji rock" style={{ left: '12%', top: '78%', fontSize: '2rem' }}>🪨</div>
          <div className="decoration-emoji rock" style={{ left: '45%', top: '82%', fontSize: '1.8rem' }}>🪨</div>
          <div className="decoration-emoji rock" style={{ left: '78%', top: '75%', fontSize: '2.2rem' }}>🪨</div>
          
          <div className="decoration-emoji mushroom" style={{ left: '25%', top: '72%', fontSize: '1.5rem' }}>🍄</div>
          <div className="decoration-emoji mushroom" style={{ left: '62%', top: '76%', fontSize: '1.3rem' }}>🍄</div>
          
          <div className="decoration-emoji fallen-log" style={{ left: '35%', top: '80%', fontSize: '3rem', transform: 'rotate(25deg)' }}>🪵</div>
          
          <div className="decoration-emoji fern" style={{ left: '18%', top: '65%', fontSize: '2rem' }}>🌿</div>
          <div className="decoration-emoji fern" style={{ left: '72%', top: '68%', fontSize: '1.8rem' }}>🌿</div>
          <div className="decoration-emoji fern" style={{ left: '88%', top: '70%', fontSize: '2.2rem' }}>🌿</div>
          
          <div className="decoration-emoji wildflowers" style={{ left: '40%', top: '65%', fontSize: '1.4rem' }}>🌺</div>
          <div className="decoration-emoji wildflowers" style={{ left: '55%', top: '62%', fontSize: '1.2rem' }}>🌸</div>
          <div className="decoration-emoji wildflowers" style={{ left: '82%', top: '64%', fontSize: '1.3rem' }}>🌷</div>
          
          <div className="decoration-emoji leaves" style={{ left: '28%', top: '58%', fontSize: '1.5rem' }}>🍃</div>
          <div className="decoration-emoji leaves" style={{ left: '67%', top: '55%', fontSize: '1.3rem' }}>🍃</div>
          
          <div className="decoration-emoji moss" style={{ left: '15%', top: '85%', fontSize: '1rem', opacity: '0.7' }}>🟢</div>
          <div className="decoration-emoji moss" style={{ left: '52%', top: '88%', fontSize: '0.8rem', opacity: '0.6' }}>🟢</div>
          <div className="decoration-emoji moss" style={{ left: '79%', top: '83%', fontSize: '1.1rem', opacity: '0.7' }}>🟢</div>
        </div>
      </div>

      <div className="garden-stats">
        <div className="stat-item">
          <span className="stat-icon">🌱</span>
          <span className="stat-value">{gardenState.plants.length}</span>
          <span className="stat-label">Plants</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🦋</span>
          <span className="stat-value">{gardenState.pets.length}</span>
          <span className="stat-label">Visitors</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🏆</span>
          <span className="stat-value">{gardenState.unlockedFeatures.length}</span>
          <span className="stat-label">Unlocked</span>
        </div>
      </div>

      {/* Enhanced Mood Music Component */}
      <MoodMusic 
        weather={gardenState.weather} 
        pets={gardenState.pets}
        plantsCount={gardenState.plants.length}
      />

      <div className="garden-instructions">
        <p>🌿 Scroll through your jungle sanctuary to explore every corner</p>
        <p>💡 Click on plants to discover their ancient therapeutic wisdom!</p>
        <p>🦋 Interact with jungle creatures for inspiring messages!</p>
        <p>🎵 Listen to the ambient sounds that change with your jungle's mood</p>
        <p>🌍 Your 2D jungle world is vast - there's always more to discover!</p>
      </div>
    </div>
  );
};

export default MoodGarden;

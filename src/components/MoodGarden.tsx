import React, { useEffect, useRef, useState } from 'react';
import type { GardenState, Plant, Pet } from '../types';
import MoodMusic from './MoodMusic';
import './MoodGarden.css';

interface MoodGardenProps {
  gardenState: GardenState;
  onPlantClick: (plant: Plant) => void;
}

const MoodGarden: React.FC<MoodGardenProps> = ({ gardenState, onPlantClick }) => {
  const gardenRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [gardenSize] = useState({ width: 2000, height: 1200 }); // Large scrollable area

  useEffect(() => {
    // No need for canvas drawing anymore - using CSS and HTML elements
    updateGardenElements();
  }, [gardenState]);

  const updateGardenElements = () => {
    // Garden elements are now managed through React state and CSS
    // This will trigger re-renders of the plant and pet components
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollPosition({
      x: target.scrollLeft,
      y: target.scrollTop
    });
  };

  const drawWeatherBackground = (ctx: CanvasRenderingContext2D, weather: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    
    switch (weather) {
      case 'sunny':
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        break;
      case 'rainy':
        gradient.addColorStop(0, '#708090');
        gradient.addColorStop(1, '#556B2F');
        break;
      case 'cloudy':
        gradient.addColorStop(0, '#B0C4DE');
        gradient.addColorStop(1, '#90EE90');
        break;
      case 'misty':
        gradient.addColorStop(0, '#E6E6FA');
        gradient.addColorStop(1, '#F0F8FF');
        break;
      case 'sunset':
        gradient.addColorStop(0, '#FF7F50');
        gradient.addColorStop(1, '#FFB6C1');
        break;
      default:
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const drawPlant = (ctx: CanvasRenderingContext2D, plant: Plant) => {
    const x = (plant.position.x / 100) * ctx.canvas.width;
    const y = (plant.position.y / 100) * ctx.canvas.height;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Draw different plant types
    switch (plant.type) {
      case 'sunflower':
        drawSunflower(ctx, plant.stage);
        break;
      case 'lavender':
        drawLavender(ctx, plant.stage);
        break;
      case 'lotus':
        drawLotus(ctx, plant.stage);
        break;
      case 'bamboo':
        drawBamboo(ctx, plant.stage);
        break;
      case 'aloe':
        drawAloe(ctx, plant.stage);
        break;
      default:
        drawGenericPlant(ctx, plant.stage);
    }
    
    ctx.restore();
  };

  const drawSunflower = (ctx: CanvasRenderingContext2D, stage: string) => {
    // Stem
    ctx.fillStyle = '#228B22';
    ctx.fillRect(-2, -10, 4, 30);
    
    if (stage === 'sprout') return;
    
    // Petals
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 4);
      ctx.fillRect(-3, -25, 6, 15);
      ctx.restore();
    }
    
    // Center
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(0, -20, 8, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawLavender = (ctx: CanvasRenderingContext2D, stage: string) => {
    // Stem
    ctx.fillStyle = '#228B22';
    ctx.fillRect(-1, -5, 2, 25);
    
    if (stage === 'sprout') return;
    
    // Lavender spikes
    ctx.fillStyle = '#9370DB';
    ctx.fillRect(-3, -20, 6, 15);
  };

  const drawLotus = (ctx: CanvasRenderingContext2D, stage: string) => {
    if (stage === 'sprout') {
      ctx.fillStyle = '#228B22';
      ctx.fillRect(-1, -5, 2, 10);
      return;
    }
    
    // Lotus petals
    ctx.fillStyle = '#FFB6C1';
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.ellipse(0, -15, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Center
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, -15, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBamboo = (ctx: CanvasRenderingContext2D, _stage: string) => {
    ctx.fillStyle = '#228B22';
    
    // Multiple segments
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-3, -10 - (i * 15), 6, 12);
      if (i < 2) {
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(-4, -15 - (i * 15), 8, 2);
        ctx.fillStyle = '#228B22';
      }
    }
  };

  const drawAloe = (ctx: CanvasRenderingContext2D, _stage: string) => {
    ctx.fillStyle = '#9ACD32';
    
    // Aloe leaves
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 5);
      ctx.fillRect(-2, -15, 4, 20);
      ctx.restore();
    }
  };

  const drawGenericPlant = (ctx: CanvasRenderingContext2D, stage: string) => {
    ctx.fillStyle = '#228B22';
    ctx.fillRect(-2, -10, 4, 20);
    
    if (stage !== 'sprout') {
      ctx.fillStyle = '#32CD32';
      ctx.beginPath();
      ctx.arc(0, -15, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawPet = (ctx: CanvasRenderingContext2D, pet: Pet) => {
    const x = (pet.position.x / 100) * ctx.canvas.width;
    const y = (pet.position.y / 100) * ctx.canvas.height;
    
    ctx.save();
    ctx.translate(x, y);
    
    switch (pet.type) {
      case 'butterfly':
        drawButterfly(ctx);
        break;
      case 'firefly':
        drawFirefly(ctx);
        break;
      case 'bird':
        drawBird(ctx);
        break;
      case 'bee':
        drawBee(ctx);
        break;
    }
    
    ctx.restore();
  };

  const drawButterfly = (ctx: CanvasRenderingContext2D) => {
    // Wings
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.ellipse(-4, -2, 6, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(4, -2, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-1, -4, 2, 8);
  };

  const drawFirefly = (ctx: CanvasRenderingContext2D) => {
    // Body
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Glow effect
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBird = (ctx: CanvasRenderingContext2D) => {
    // Body
    ctx.fillStyle = '#87CEEB';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings
    ctx.fillStyle = '#4682B4';
    ctx.beginPath();
    ctx.ellipse(-3, -1, 3, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(3, -1, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBee = (ctx: CanvasRenderingContext2D) => {
    // Body
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Stripes
    ctx.fillStyle = '#000000';
    ctx.fillRect(-3, -1, 6, 1);
    ctx.fillRect(-3, 1, 6, 1);
    
    // Wings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-2, -2, 2, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(2, -2, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / canvas.width) * 100;
    const y = ((event.clientY - rect.top) / canvas.height) * 100;
    
    // Find clicked plant
    const clickedPlant = gardenState.plants.find(plant => {
      const distance = Math.sqrt(
        Math.pow(plant.position.x - x, 2) + Math.pow(plant.position.y - y, 2)
      );
      return distance < 8; // Increased tolerance for better UX
    });
    
    if (clickedPlant) {
      // Enhanced therapeutic plant lore with actionable wellness tips
      const enhancedLore = getEnhancedPlantLore(clickedPlant.type);
      
      // Create a more beautiful modal-like display
      const loreModal = document.createElement('div');
      loreModal.className = 'plant-lore-modal';
      loreModal.innerHTML = `
        <div class="plant-lore-content">
          <div class="plant-icon">${getPlantEmoji(clickedPlant.type)}</div>
          <h3>${getPlantName(clickedPlant.type)}</h3>
          <p class="lore-text">${enhancedLore.wisdom}</p>
          <div class="wellness-tip">
            <strong>💡 Try this:</strong> ${enhancedLore.actionableTip}
          </div>
          <button class="close-lore" onclick="this.parentElement.parentElement.remove()">✨ Thank you</button>
        </div>
      `;
      
      document.body.appendChild(loreModal);
      
      // Remove after 10 seconds or when clicked
      setTimeout(() => {
        if (loreModal.parentNode) {
          loreModal.remove();
        }
      }, 10000);
      
      onPlantClick(clickedPlant);
    }

    // Check if click is on a pet for interaction
    const clickedPet = gardenState.pets.find(pet => {
      const distance = Math.sqrt(
        Math.pow(pet.position.x - x, 2) + Math.pow(pet.position.y - y, 2)
      );
      return distance < 6;
    });

    if (clickedPet) {
      showPetInteraction(clickedPet);
    }
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
    
    // Create pet interaction popup
    const petModal = document.createElement('div');
    petModal.className = 'pet-interaction-modal';
    petModal.innerHTML = `
      <div class="pet-interaction-content">
        <div class="pet-message">${randomMessage}</div>
        <button class="close-pet" onclick="this.parentElement.parentElement.remove()">🌟 Amazing!</button>
      </div>
    `;
    
    document.body.appendChild(petModal);
    
    // Remove after 8 seconds
    setTimeout(() => {
      if (petModal.parentNode) {
        petModal.remove();
      }
    }, 8000);
  };

  return (
    <div className="mood-garden">
      <MoodMusic 
        weather={gardenState.weather} 
        pets={gardenState.pets}
        plantsCount={gardenState.plants.length}
      />
      
      <div className="garden-header">
        <h1>🌱 Your Mood Garden</h1>
        <div className="weather-indicator">
          Weather: {gardenState.weather} {getWeatherEmoji(gardenState.weather)}
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="garden-canvas"
        onClick={handleCanvasClick}
      />
      
      <div className="garden-stats">
        <div className="stat">
          <span>🌺 Plants: {gardenState.plants.length}</span>
        </div>
        <div className="stat">
          <span>🦋 Visitors: {gardenState.pets.length}</span>
        </div>
        <div className="stat">
          <span>🏆 Challenges: {gardenState.challenges.length}</span>
        </div>
      </div>
      
      <div className="garden-tips">
        <p>💡 Click on plants to learn their therapeutic wisdom!</p>
        <p>🎵 Listen to the mood music that changes with your garden's weather</p>
      </div>
    </div>
  );
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

export default MoodGarden;

import React, { useState, useEffect, useCallback } from 'react';

interface AIGardenEvolutionProps {
  totalSteps: number;
  plantsDiscovered: Set<string>;
  petsInteracted: Set<string>;
  achievements: any[];
  timeSpentInGarden: number;
  onEvolutionEvent: (event: EvolutionEvent) => void;
}

interface EvolutionEvent {
  type: 'new_plant' | 'new_pet' | 'weather_change' | 'garden_expansion' | 'special_event';
  data: any;
  message: string;
}

interface GardenPersonality {
  curiosity: number;      // 0-100, affects new plant/pet spawning
  serenity: number;       // 0-100, affects weather and ambience
  mysticism: number;      // 0-100, affects magical events
  sociability: number;    // 0-100, affects pet interactions
}

const AIGardenEvolution: React.FC<AIGardenEvolutionProps> = ({
  totalSteps,
  plantsDiscovered,
  petsInteracted,
  achievements,
  timeSpentInGarden,
  onEvolutionEvent
}) => {
  const [gardenPersonality, setGardenPersonality] = useState<GardenPersonality>({
    curiosity: 50,
    serenity: 50,
    mysticism: 30,
    sociability: 40
  });

  const [evolutionHistory, setEvolutionHistory] = useState<EvolutionEvent[]>([]);
  const [nextEvolutionTime, setNextEvolutionTime] = useState<number>(Date.now() + 30000); // 30 seconds

  // Advanced plant types that unlock based on user behavior
  const advancedPlants = [
    {
      type: 'meditation_lotus',
      requiredSerenity: 70,
      requiredSteps: 200,
      message: '🪷 A meditation lotus has bloomed, drawn by your peaceful presence...'
    },
    {
      type: 'wisdom_tree',
      requiredCuriosity: 80,
      requiredPlants: 5,
      message: '🌳 An ancient wisdom tree has taken root, attracted by your exploratory spirit...'
    },
    {
      type: 'rainbow_flower',
      requiredMysticism: 90,
      requiredAchievements: 3,
      message: '🌈 A rainbow flower materializes, responding to your magical energy...'
    },
    {
      type: 'healing_herbs',
      requiredSerenity: 60,
      requiredSociability: 60,
      message: '🌿 Healing herbs sprout nearby, sensing your compassionate nature...'
    },
    {
      type: 'crystal_moss',
      requiredMysticism: 75,
      requiredSteps: 500,
      message: '💎 Crystal moss begins to glow, resonating with your spiritual journey...'
    }
  ];

  // Advanced pets that appear based on garden evolution
  const advancedPets = [
    {
      type: 'phoenix',
      requiredMysticism: 85,
      requiredAchievements: 4,
      message: '🔥 A phoenix spirit manifests, drawn to your transformative energy...'
    },
    {
      type: 'unicorn',
      requiredSerenity: 90,
      requiredPlants: 8,
      message: '🦄 A unicorn appears in the sacred grove, blessing your pure heart...'
    },
    {
      type: 'dragon',
      requiredCuriosity: 95,
      requiredSteps: 1000,
      message: '🐉 An ancient dragon visits, honoring your dedication to growth...'
    },
    {
      type: 'spirit_wolf',
      requiredSociability: 80,
      requiredPets: 4,
      message: '🐺 A spirit wolf joins your journey, recognizing your connection to nature...'
    }
  ];

  // Weather patterns that respond to user behavior
  const dynamicWeatherPatterns = [
    {
      type: 'aurora',
      requiredMysticism: 80,
      requiredNightTime: true,
      message: '🌌 Aurora lights dance overhead, celebrating your mystical awakening...'
    },
    {
      type: 'golden_rain',
      requiredSerenity: 85,
      requiredAchievements: 5,
      message: '✨ Golden rain begins to fall, blessing your spiritual achievements...'
    },
    {
      type: 'healing_mist',
      requiredSociability: 75,
      requiredPlants: 6,
      message: '🌫️ A healing mist descends, nourishing all life in your sanctuary...'
    }
  ];

  // Update garden personality based on user behavior
  const updatePersonality = useCallback(() => {
    setGardenPersonality(prev => {
      let newPersonality = { ...prev };

      // Curiosity grows with exploration
      if (totalSteps > 100) {
        newPersonality.curiosity = Math.min(100, prev.curiosity + 1);
      }
      if (plantsDiscovered.size > 3) {
        newPersonality.curiosity = Math.min(100, prev.curiosity + 2);
      }

      // Serenity grows with time spent and mindful interaction
      if (timeSpentInGarden > 300) { // 5 minutes
        newPersonality.serenity = Math.min(100, prev.serenity + 1);
      }
      if (achievements.filter(a => a.category === 'mindfulness' && a.unlocked).length > 0) {
        newPersonality.serenity = Math.min(100, prev.serenity + 5);
      }

      // Mysticism grows with achievements and exploration
      if (achievements.filter(a => a.unlocked).length > 2) {
        newPersonality.mysticism = Math.min(100, prev.mysticism + 3);
      }
      if (totalSteps > 500) {
        newPersonality.mysticism = Math.min(100, prev.mysticism + 2);
      }

      // Sociability grows with pet interactions
      if (petsInteracted.size > 2) {
        newPersonality.sociability = Math.min(100, prev.sociability + 3);
      }

      return newPersonality;
    });
  }, [totalSteps, plantsDiscovered.size, petsInteracted.size, achievements, timeSpentInGarden]);

  // Check for evolution opportunities
  const checkEvolutionOpportunities = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime < nextEvolutionTime) return;

    // Check for new plants
    advancedPlants.forEach(plant => {
      const hasPlant = evolutionHistory.some(event => 
        event.type === 'new_plant' && event.data.type === plant.type
      );
      
      if (!hasPlant) {
        let canSpawn = true;
        
        if (plant.requiredSerenity && gardenPersonality.serenity < plant.requiredSerenity) canSpawn = false;
        if (plant.requiredCuriosity && gardenPersonality.curiosity < plant.requiredCuriosity) canSpawn = false;
        if (plant.requiredMysticism && gardenPersonality.mysticism < plant.requiredMysticism) canSpawn = false;
        if (plant.requiredSteps && totalSteps < plant.requiredSteps) canSpawn = false;
        if (plant.requiredPlants && plantsDiscovered.size < plant.requiredPlants) canSpawn = false;
        if (plant.requiredAchievements && achievements.filter(a => a.unlocked).length < plant.requiredAchievements) canSpawn = false;

        if (canSpawn && Math.random() < 0.3) { // 30% chance when conditions are met
          const event: EvolutionEvent = {
            type: 'new_plant',
            data: { 
              type: plant.type,
              position: {
                x: 20 + Math.random() * 60, // Random position in middle area
                y: 30 + Math.random() * 40
              }
            },
            message: plant.message
          };
          
          onEvolutionEvent(event);
          setEvolutionHistory(prev => [...prev, event]);
          setNextEvolutionTime(currentTime + 45000); // Next check in 45 seconds
          return;
        }
      }
    });

    // Check for new pets
    advancedPets.forEach(pet => {
      const hasPet = evolutionHistory.some(event => 
        event.type === 'new_pet' && event.data.type === pet.type
      );
      
      if (!hasPet) {
        let canSpawn = true;
        
        if (pet.requiredSerenity && gardenPersonality.serenity < pet.requiredSerenity) canSpawn = false;
        if (pet.requiredCuriosity && gardenPersonality.curiosity < pet.requiredCuriosity) canSpawn = false;
        if (pet.requiredMysticism && gardenPersonality.mysticism < pet.requiredMysticism) canSpawn = false;
        if (pet.requiredSteps && totalSteps < pet.requiredSteps) canSpawn = false;
        if (pet.requiredPlants && plantsDiscovered.size < pet.requiredPlants) canSpawn = false;
        if (pet.requiredAchievements && achievements.filter(a => a.unlocked).length < pet.requiredAchievements) canSpawn = false;
        if (pet.requiredPets && petsInteracted.size < pet.requiredPets) canSpawn = false;

        if (canSpawn && Math.random() < 0.2) { // 20% chance when conditions are met
          const event: EvolutionEvent = {
            type: 'new_pet',
            data: { 
              type: pet.type,
              position: {
                x: 15 + Math.random() * 70,
                y: 25 + Math.random() * 50
              }
            },
            message: pet.message
          };
          
          onEvolutionEvent(event);
          setEvolutionHistory(prev => [...prev, event]);
          setNextEvolutionTime(currentTime + 60000); // Next check in 1 minute
          return;
        }
      }
    });

    // Check for weather changes
    const currentHour = new Date().getHours();
    const isNight = currentHour < 6 || currentHour > 20;
    
    dynamicWeatherPatterns.forEach(weather => {
      const hasWeather = evolutionHistory.some(event => 
        event.type === 'weather_change' && event.data.type === weather.type
      );
      
      if (!hasWeather) {
        let canTrigger = true;
        
        if (weather.requiredSerenity && gardenPersonality.serenity < weather.requiredSerenity) canTrigger = false;
        if (weather.requiredMysticism && gardenPersonality.mysticism < weather.requiredMysticism) canTrigger = false;
        if (weather.requiredSociability && gardenPersonality.sociability < weather.requiredSociability) canTrigger = false;
        if (weather.requiredNightTime && !isNight) canTrigger = false;
        if (weather.requiredAchievements && achievements.filter(a => a.unlocked).length < weather.requiredAchievements) canTrigger = false;
        if (weather.requiredPlants && plantsDiscovered.size < weather.requiredPlants) canTrigger = false;

        if (canTrigger && Math.random() < 0.15) { // 15% chance when conditions are met
          const event: EvolutionEvent = {
            type: 'weather_change',
            data: { type: weather.type, duration: 120000 }, // 2 minutes
            message: weather.message
          };
          
          onEvolutionEvent(event);
          setEvolutionHistory(prev => [...prev, event]);
          setNextEvolutionTime(currentTime + 90000); // Next check in 1.5 minutes
          return;
        }
      }
    });

    // Special milestone events
    if (totalSteps === 500 && !evolutionHistory.some(e => e.data.milestone === 'steps_500')) {
      const event: EvolutionEvent = {
        type: 'special_event',
        data: { milestone: 'steps_500', effect: 'garden_blessing' },
        message: '🌟 Your dedication has awakened the garden\'s ancient magic! A blessing of growth flows through every plant and creature...'
      };
      onEvolutionEvent(event);
      setEvolutionHistory(prev => [...prev, event]);
    }

    if (plantsDiscovered.size === 5 && !evolutionHistory.some(e => e.data.milestone === 'plants_5')) {
      const event: EvolutionEvent = {
        type: 'special_event',
        data: { milestone: 'plants_5', effect: 'botanical_mastery' },
        message: '🌺 You have achieved botanical mastery! The garden recognizes you as a true plant whisperer...'
      };
      onEvolutionEvent(event);
      setEvolutionHistory(prev => [...prev, event]);
    }

    // Set next evolution check
    setNextEvolutionTime(currentTime + 30000); // Check again in 30 seconds
  }, [gardenPersonality, totalSteps, plantsDiscovered.size, petsInteracted.size, achievements, evolutionHistory, nextEvolutionTime, onEvolutionEvent]);

  // Update personality and check evolution opportunities
  useEffect(() => {
    updatePersonality();
  }, [updatePersonality]);

  useEffect(() => {
    const interval = setInterval(checkEvolutionOpportunities, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [checkEvolutionOpportunities]);

  // Generate personalized insights
  const getPersonalityInsight = () => {
    const dominant = Object.entries(gardenPersonality).reduce((a, b) => 
      gardenPersonality[a[0] as keyof GardenPersonality] > gardenPersonality[b[0] as keyof GardenPersonality] ? a : b
    );

    const insights = {
      curiosity: "Your garden reflects your exploratory spirit. New wonders await the curious heart.",
      serenity: "Peace radiates from your garden sanctuary. Your calm presence nurtures all life here.",
      mysticism: "Magic flows through your garden realm. You are awakening to deeper mysteries.",
      sociability: "Your garden thrives with companionship. The creatures sense your caring nature."
    };

    return insights[dominant[0] as keyof typeof insights];
  };

  return (
    <div className="ai-garden-evolution" style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#FFF',
      padding: '15px',
      borderRadius: '15px',
      fontSize: '0.9rem',
      maxWidth: '300px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      zIndex: 2500
    }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#FFD700' }}>
        🧠 Garden AI Evolution
      </div>
      
      <div style={{ marginBottom: '10px', fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.9 }}>
        {getPersonalityInsight()}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
        <div>
          <span style={{ color: '#87CEEB' }}>Curiosity:</span>
          <div style={{ 
            width: '100%', 
            height: '4px', 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: '2px',
            marginTop: '2px'
          }}>
            <div style={{ 
              width: `${gardenPersonality.curiosity}%`, 
              height: '100%', 
              background: '#87CEEB', 
              borderRadius: '2px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
        
        <div>
          <span style={{ color: '#E6E6FA' }}>Serenity:</span>
          <div style={{ 
            width: '100%', 
            height: '4px', 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: '2px',
            marginTop: '2px'
          }}>
            <div style={{ 
              width: `${gardenPersonality.serenity}%`, 
              height: '100%', 
              background: '#E6E6FA', 
              borderRadius: '2px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
        
        <div>
          <span style={{ color: '#FF69B4' }}>Mysticism:</span>
          <div style={{ 
            width: '100%', 
            height: '4px', 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: '2px',
            marginTop: '2px'
          }}>
            <div style={{ 
              width: `${gardenPersonality.mysticism}%`, 
              height: '100%', 
              background: '#FF69B4', 
              borderRadius: '2px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
        
        <div>
          <span style={{ color: '#90EE90' }}>Sociability:</span>
          <div style={{ 
            width: '100%', 
            height: '4px', 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: '2px',
            marginTop: '2px'
          }}>
            <div style={{ 
              width: `${gardenPersonality.sociability}%`, 
              height: '100%', 
              background: '#90EE90', 
              borderRadius: '2px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>

      {evolutionHistory.length > 0 && (
        <div style={{ 
          marginTop: '10px', 
          fontSize: '0.7rem', 
          opacity: 0.8,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: '8px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Recent Evolution:</div>
          <div>{evolutionHistory[evolutionHistory.length - 1]?.type.replace('_', ' ').toUpperCase()}</div>
        </div>
      )}
    </div>
  );
};

export default AIGardenEvolution;

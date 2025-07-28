import { useState } from 'react'
import './App.css'
import CompetitionGarden from './components/CompetitionGarden'

// Types
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

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: string;
  type: 'weekly' | 'daily' | 'monthly';
}

interface GardenState {
  plants: Plant[];
  weather: 'sunny' | 'rainy' | 'cloudy' | 'misty' | 'sunset';
  pets: Pet[];
  challenges: Challenge[];
  unlockedFeatures: string[];
}

function App() {
  // Garden state with sample data
  const [gardenState] = useState<GardenState>({
    plants: [
      {
        id: '1',
        type: 'sunflower',
        moodType: 'happy',
        position: { x: 30, y: 40 },
        stage: 'blooming',
        plantedAt: new Date('2024-01-15'),
        lore: 'Sunflowers always turn toward the light, teaching us to find brightness even in difficult times.'
      },
      {
        id: '2',
        type: 'lavender',
        moodType: 'calm',
        position: { x: 60, y: 35 },
        stage: 'mature',
        plantedAt: new Date('2024-01-10'),
        lore: 'Lavender brings peace and tranquility, helping to soothe anxious minds.'
      },
      {
        id: '3',
        type: 'lotus',
        moodType: 'peaceful',
        position: { x: 45, y: 60 },
        stage: 'growing',
        plantedAt: new Date('2024-01-20'),
        lore: 'The lotus rises from muddy waters to bloom beautifully, symbolizing transformation through adversity.'
      },
      {
        id: '4',
        type: 'bamboo',
        moodType: 'resilient',
        position: { x: 75, y: 50 },
        stage: 'mature',
        plantedAt: new Date('2024-01-05'),
        lore: 'Bamboo bends in the storm but does not break, teaching us flexibility and strength.'
      },
      {
        id: '5',
        type: 'chamomile',
        moodType: 'soothing',
        position: { x: 25, y: 65 },
        stage: 'blooming',
        plantedAt: new Date('2024-01-18'),
        lore: 'Chamomile offers gentle healing and comfort, like a warm hug for the soul.'
      }
    ],
    weather: 'sunny',
    pets: [
      {
        id: 'butterfly1',
        type: 'butterfly',
        position: { x: 35, y: 45 },
        animation: 'flutter'
      },
      {
        id: 'firefly1',
        type: 'firefly',
        position: { x: 55, y: 25 },
        animation: 'glow'
      },
      {
        id: 'bird1',
        type: 'bird',
        position: { x: 70, y: 30 },
        animation: 'chirp'
      },
      {
        id: 'bee1',
        type: 'bee',
        position: { x: 40, y: 55 },
        animation: 'buzz'
      }
    ],
    challenges: [
      {
        id: 'plant_3_flowers',
        title: 'Flower Power',
        description: 'Plant 3 different types of flowers',
        target: 3,
        current: 2,
        reward: 'Butterfly Garden',
        type: 'weekly'
      },
      {
        id: 'daily_meditation',
        title: 'Daily Mindfulness',
        description: 'Spend 10 minutes in the garden today',
        target: 600,
        current: 480,
        reward: 'Zen Stone',
        type: 'daily'
      }
    ],
    unlockedFeatures: ['basic_garden']
  });

  const handlePlantClick = (plant: Plant) => {
    console.log('Plant clicked:', plant.type);
  };

  return (
    <div className="app">
      <main className="main-content">
        <CompetitionGarden 
          gardenState={gardenState}
          onPlantClick={handlePlantClick}
        />
      </main>
    </div>
  )
}

export default App

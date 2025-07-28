# MoodGarden 2.0: AI-Driven Plant Growth System

## **Core AI Architecture**

### 1. Mood Analysis Engine
```typescript
interface MoodAnalysis {
  // Primary emotions (Plutchik's Wheel)
  joy: number;          // 0-1
  sadness: number;      // 0-1
  anger: number;        // 0-1
  fear: number;         // 0-1
  trust: number;        // 0-1
  disgust: number;      // 0-1
  surprise: number;     // 0-1
  anticipation: number; // 0-1
  
  // Derived metrics
  arousal: number;      // Energy level (0-1)
  valence: number;      // Positivity (-1 to 1)
  dominance: number;    // Control feeling (0-1)
  
  // Biometric data
  hrv: number;          // Heart rate variability
  stressLevel: number;  // 0-1 from wearables
  breathingRate: number; // Breaths per minute
  
  // Context
  timeOfDay: string;
  weatherContext: string;
  socialContext: 'alone' | 'with_others' | 'public';
}

interface TherapeuticMetaphor {
  plantSpecies: string;
  growthStage: 'seed' | 'sprout' | 'sapling' | 'mature' | 'flowering';
  symbolicMeaning: string;
  interventionSuggestion: string;
  visualElements: PlantDNA;
}
```

### 2. AI Plant Generation System
```typescript
interface PlantDNA {
  // Genetic traits influenced by mood
  species: {
    base: 'tree' | 'flower' | 'vine' | 'succulent' | 'fern' | 'moss';
    hybrid: string[]; // Cross-pollination from user's growth
  };
  
  // Visual characteristics
  morphology: {
    height: number;          // Confidence/self-esteem
    branchiness: number;     // Social connections
    leafDensity: number;     // Mental clarity
    rootSystem: number;      // Emotional stability
    bloomFrequency: number;  // Joy/accomplishment moments
  };
  
  // Color palette (HSL values)
  colorProfile: {
    primary: [number, number, number];   // Dominant mood
    secondary: [number, number, number]; // Secondary emotions
    accent: [number, number, number];    // Stress/excitement highlights
    seasonal: [number, number, number][]; // Mood patterns over time
  };
  
  // Behavior patterns
  responses: {
    windSensitivity: number;  // Anxiety levels
    lightSeeking: number;     // Optimism/hope
    waterRetention: number;   // Resilience
    seasonalAdaptation: number; // Emotional flexibility
  };
  
  // Therapeutic properties
  healing: {
    oxygenProduction: number; // Stress relief provided
    nectarQuality: number;    // Joy shared with others
    rootStabilization: number; // Grounding effect
    seedProduction: number;   // Growth potential
  };
}
```

### 3. Dynamic Environment System
```typescript
interface BiomeState {
  // Environmental conditions driven by collective mood
  lighting: {
    sunIntensity: number;     // Community happiness average
    shadowLength: number;     // Collective anxiety levels
    colorTemperature: number; // Emotional warmth (2700K-6500K)
    dynamicRange: number;     // Emotional stability
  };
  
  weather: {
    precipitation: 'none' | 'mist' | 'gentle_rain' | 'storm' | 'snow';
    windSpeed: number;        // Stress levels
    humidity: number;         // Emotional comfort
    pressure: number;         // Social pressure feeling
  };
  
  // Seasonal progression based on personal growth
  season: {
    current: 'spring' | 'summer' | 'autumn' | 'winter';
    progression: number;      // 0-1 through season
    cycleLength: number;      // Days per cycle (faster with more growth)
  };
  
  // Interactive elements
  fauna: {
    butterflies: number;      // Joy moments
    birds: number;           // Social connections
    fireflies: number;       // Hope in darkness
    bees: number;            // Productivity/purpose
  };
}
```

## **Therapeutic Mechanics**

### 1. CBT Integration
```typescript
interface CognitiveRestructuring {
  // Pruning negative thoughts
  identifyDistortions: (thought: string) => CognitiveDistortion[];
  reframeThought: (distortion: CognitiveDistortion) => string;
  visualizePruning: (plant: PlantDNA, negativeThought: string) => Animation;
  
  // Growing positive patterns
  strengthenPositive: (plant: PlantDNA, positiveThought: string) => PlantGrowth;
  buildSupport: (plant: PlantDNA, copingStrategy: string) => StructuralSupport;
}

interface DBTSkills {
  // Distress tolerance through storm weathering
  rideTheWave: (intensity: number) => WeatherEvent;
  safePlaceVisualization: () => ProtectedGreenhouse;
  
  // Emotion regulation through plant care
  oppositActionToEmotion: (emotion: string) => PlantCareAction;
  
  // Interpersonal effectiveness through pollination
  assertivenessTraining: () => PollinationQuest;
  boundarySettting: () => GardenBoundaries;
}
```

### 2. Trauma-Informed Design
```typescript
interface TraumaInformedFeatures {
  // Safety mechanisms
  triggerWarnings: {
    visualIntensity: 'low' | 'medium' | 'high';
    soundSensitivity: boolean;
    flashingLights: boolean;
    suddenMovements: boolean;
  };
  
  // Safe spaces
  greenhouse: {
    accessed: boolean;           // User can retreat here
    customization: any[];        // User controls environment
    grounding: GroundingExercise[]; // 5-4-3-2-1 technique, etc.
  };
  
  // Progress without retraumatization
  moodFossils: {
    encrypted: boolean;          // Cannot be accessed by others
    timeDelayed: boolean;        // Only viewable after healing time
    optionalReflection: boolean; // User chooses when to review
  };
  
  // Crisis intervention
  crisisDetection: {
    severeMoodDrop: boolean;
    riskKeywords: string[];
    biometricAlarms: boolean;
    emergencyContacts: string[];
    therapistNetworkAlerts: boolean;
  };
}
```

## **AI Prompt Examples for Plant Generation**

### Mood → Plant Mapping
```
User Mood: "Anxiety (0.8), Sadness (0.6), Low HRV, Rapid Breathing"
AI Generated Plant: "Weeping Willow Hybrid"
- Drooping branches (sadness representation)
- Trembling leaves (anxiety visualization)
- Deep, strong roots (hidden resilience)
- Small purple flowers (hope emerging)

Therapeutic Metaphor: "Your mind feels like this willow in a storm - 
branches swaying with worry, but notice those deep roots holding strong. 
Let's practice grounding exercises to strengthen your foundation."

Interactive Element: "Breathe slowly to calm the wind affecting your tree. 
Watch how steady breathing makes the branches sway more gently."
```

### Growth Progression Example
```
Week 1: Anxious Seedling
- Small, curled leaves
- Pale green color
- Hiding underground mostly

Week 4: Cautious Sprout  
- First true leaves emerging
- Slightly brighter green
- Beginning to reach for light

Week 8: Confident Sapling
- Multiple branches
- Rich green foliage  
- Small flower buds forming

Week 12: Flourishing Tree
- Full canopy
- Vibrant flowers
- Producing seeds for others
```

## **Technical Implementation Notes**

### Performance Optimization
- Use GPU compute shaders for real-time plant growth
- Level-of-detail (LOD) system for distant vegetation
- Procedural generation cached and reused intelligently
- Biometric data processed on-device for privacy

### Privacy & Security
- All mood data encrypted end-to-end
- AI processing happens locally when possible
- User controls all data sharing permissions
- Regular security audits for therapeutic data protection

### Accessibility
- High contrast mode for visual impairments
- Voice navigation for motor limitations
- Customizable interaction sensitivity
- Screen reader compatibility for plant descriptions

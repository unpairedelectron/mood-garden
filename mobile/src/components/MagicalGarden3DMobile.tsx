import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  StyleSheet,
  Alert,
  Vibration
} from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types for mobile garden
interface MobilePlant {
  id: string;
  type: 'lavender' | 'rose' | 'sunflower' | 'lotus' | 'willow' | 'bamboo';
  position: { x: number; y: number };
  scale: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  emotion: string;
  energy: number;
  growthStage: number;
}

interface MobileCreature {
  id: string;
  type: 'butterfly' | 'firefly' | 'bird' | 'bee';
  position: Animated.ValueXY;
  emotion: string;
  behavior: 'idle' | 'flying' | 'feeding' | 'playing';
}

interface VoiceCommand {
  transcript: string;
  emotion: string;
  confidence: number;
}

const MagicalGarden3DMobile: React.FC = () => {
  // State management
  const [plants, setPlants] = useState<MobilePlant[]>([]);
  const [creatures, setCreatures] = useState<MobileCreature[]>([]);
  const [userMood, setUserMood] = useState('peaceful');
  const [isListening, setIsListening] = useState(false);
  const [gardenEnergy, setGardenEnergy] = useState(100);
  const [magicalMoments, setMagicalMoments] = useState<string[]>([]);
  const [weatherEffect, setWeatherEffect] = useState('sunny');
  const [socialFireflies, setSocialFireflies] = useState<any[]>([]);

  // Refs
  const recording = useRef<Audio.Recording | null>(null);
  const backgroundAnimation = useRef(new Animated.Value(0)).current;
  const sparkleAnimation = useRef(new Animated.Value(0)).current;

  // Voice AI Integration
  const startVoiceListening = useCallback(async () => {
    try {
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access for voice features');
        return;
      }

      setIsListening(true);
      
      // Configure audio recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      recording.current = new Audio.Recording();
      await recording.current.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.current.startAsync();

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Simulate voice processing (replace with actual AI integration)
      setTimeout(() => {
        processVoiceCommand();
      }, 3000);

    } catch (error) {
      console.error('Voice recording error:', error);
      setIsListening(false);
    }
  }, []);

  const processVoiceCommand = useCallback(async () => {
    try {
      if (recording.current) {
        await recording.current.stopAndUnloadAsync();
        recording.current = null;
      }

      // Simulate voice processing results
      const mockCommands = [
        { transcript: "I'm feeling stressed", emotion: 'stressed', confidence: 0.9 },
        { transcript: "I need some calm energy", emotion: 'calm', confidence: 0.8 },
        { transcript: "I'm happy today", emotion: 'happy', confidence: 0.95 },
        { transcript: "Help me feel peaceful", emotion: 'peaceful', confidence: 0.85 }
      ];

      const command = mockCommands[Math.floor(Math.random() * mockCommands.length)];
      handleVoiceCommand(command);
      setIsListening(false);
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Voice processing error:', error);
      setIsListening(false);
    }
  }, []);

  const handleVoiceCommand = useCallback((command: VoiceCommand) => {
    const { emotion, transcript } = command;
    
    // Create plants based on emotion
    let newPlants: MobilePlant[] = [];
    
    switch (emotion) {
      case 'stressed':
        newPlants = createCalimingPlants('lavender', 3);
        setWeatherEffect('mist');
        break;
      case 'happy':
        newPlants = createEnergeticPlants('sunflower', 2);
        addPlayfulCreatures('butterfly', 3);
        break;
      case 'calm':
      case 'peaceful':
        newPlants = createZenPlants('lotus', 2);
        addMeditativeCreatures('firefly', 4);
        break;
      default:
        newPlants = createMixedPlants(1);
        break;
    }

    setPlants(prev => [...prev, ...newPlants]);
    setUserMood(emotion);
    addMagicalMoment(`🌱 Your garden heard: "${transcript}"`);
    
    // Trigger background animation
    Animated.sequence([
      Animated.timing(backgroundAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Plant creation functions
  const createCalimingPlants = (type: string, count: number): MobilePlant[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `calming-${Date.now()}-${i}`,
      type: 'lavender',
      position: {
        x: Math.random() * (SCREEN_WIDTH - 60) + 30,
        y: Math.random() * (SCREEN_HEIGHT - 200) + 100
      },
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(0),
      emotion: 'calming',
      energy: 80,
      growthStage: 0
    }));
  };

  const createEnergeticPlants = (type: string, count: number): MobilePlant[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `energetic-${Date.now()}-${i}`,
      type: 'sunflower',
      position: {
        x: Math.random() * (SCREEN_WIDTH - 80) + 40,
        y: Math.random() * (SCREEN_HEIGHT - 200) + 100
      },
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(0),
      emotion: 'energetic',
      energy: 100,
      growthStage: 0
    }));
  };

  const createZenPlants = (type: string, count: number): MobilePlant[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `zen-${Date.now()}-${i}`,
      type: 'lotus',
      position: {
        x: Math.random() * (SCREEN_WIDTH - 60) + 30,
        y: Math.random() * (SCREEN_HEIGHT - 200) + 100
      },
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(0),
      emotion: 'zen',
      energy: 95,
      growthStage: 0
    }));
  };

  const createMixedPlants = (count: number): MobilePlant[] => {
    const types: ('lavender' | 'rose' | 'sunflower' | 'lotus')[] = ['lavender', 'rose', 'sunflower', 'lotus'];
    return Array.from({ length: count }, (_, i) => ({
      id: `mixed-${Date.now()}-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      position: {
        x: Math.random() * (SCREEN_WIDTH - 60) + 30,
        y: Math.random() * (SCREEN_HEIGHT - 200) + 100
      },
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(0),
      emotion: 'neutral',
      energy: 70,
      growthStage: 0
    }));
  };

  // Creature functions
  const addPlayfulCreatures = (type: string, count: number) => {
    const newCreatures: MobileCreature[] = Array.from({ length: count }, (_, i) => ({
      id: `playful-${Date.now()}-${i}`,
      type: 'butterfly',
      position: new Animated.ValueXY({
        x: Math.random() * (SCREEN_WIDTH - 50),
        y: Math.random() * (SCREEN_HEIGHT - 150) + 50
      }),
      emotion: 'playful',
      behavior: 'flying'
    }));
    setCreatures(prev => [...prev, ...newCreatures]);
  };

  const addMeditativeCreatures = (type: string, count: number) => {
    const newCreatures: MobileCreature[] = Array.from({ length: count }, (_, i) => ({
      id: `meditative-${Date.now()}-${i}`,
      type: 'firefly',
      position: new Animated.ValueXY({
        x: Math.random() * (SCREEN_WIDTH - 30),
        y: Math.random() * (SCREEN_HEIGHT - 150) + 50
      }),
      emotion: 'peaceful',
      behavior: 'idle'
    }));
    setCreatures(prev => [...prev, ...newCreatures]);
  };

  // Plant interaction
  const handlePlantTouch = useCallback((plant: MobilePlant) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Grow plant
    Animated.parallel([
      Animated.spring(plant.scale, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.timing(sparkleAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.spring(plant.scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(sparkleAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
    });

    // Update plant energy
    setPlants(prev => prev.map(p => 
      p.id === plant.id 
        ? { ...p, energy: Math.min(p.energy + 10, 100) }
        : p
    ));

    addMagicalMoment(`🌺 ${plant.type} loves your touch!`);
  }, []);

  // Device shake detection
  const handleShake = useCallback(() => {
    // Create scattered seeds
    const newSeeds = createMixedPlants(3);
    setPlants(prev => [...prev, ...newSeeds]);
    addMagicalMoment('🌱 Seeds scattered!');
    
    // Vibration feedback
    Vibration.vibrate([100, 50, 100]);
  }, []);

  // Utility functions
  const addMagicalMoment = (moment: string) => {
    setMagicalMoments(prev => [moment, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setMagicalMoments(prev => prev.slice(0, -1));
    }, 4000);
  };

  const createSocialFirefly = (mood: string) => {
    const newFirefly = {
      id: `social-${Date.now()}`,
      mood,
      timestamp: new Date(),
      position: {
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT * 0.5 + 100
      }
    };
    setSocialFireflies(prev => [...prev, newFirefly]);
  };

  // Plant growth animation
  useEffect(() => {
    plants.forEach(plant => {
      if (plant.growthStage === 0) {
        // Start growth animation
        Animated.parallel([
          Animated.spring(plant.scale, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(plant.opacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(plant.rotation, {
                toValue: 0.1,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(plant.rotation, {
                toValue: -0.1,
                duration: 2000,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();

        // Update growth stage
        setPlants(prev => prev.map(p => 
          p.id === plant.id ? { ...p, growthStage: 1 } : p
        ));
      }
    });
  }, [plants]);

  // Creature animations
  useEffect(() => {
    creatures.forEach(creature => {
      const animateCreature = () => {
        const newX = Math.random() * (SCREEN_WIDTH - 50);
        const newY = Math.random() * (SCREEN_HEIGHT - 200) + 50;
        
        Animated.timing(creature.position, {
          toValue: { x: newX, y: newY },
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: false,
        }).start(() => {
          setTimeout(animateCreature, 1000 + Math.random() * 2000);
        });
      };
      
      animateCreature();
    });
  }, [creatures]);

  // Initialize garden
  useEffect(() => {
    const initialPlants = createZenPlants('lotus', 1);
    setPlants(initialPlants);
    addMeditativeCreatures('firefly', 2);
    addMagicalMoment('🌸 Welcome to your magical garden');
  }, []);

  return (
    <View style={styles.container}>
      {/* Background with weather effects */}
      <Animated.View 
        style={[
          styles.background,
          {
            backgroundColor: backgroundAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['#1a4f63', '#2d5a27']
            })
          }
        ]}
      />

      {/* Plants */}
      {plants.map(plant => (
        <TouchableOpacity
          key={plant.id}
          style={[
            styles.plant,
            {
              left: plant.position.x,
              top: plant.position.y,
            }
          ]}
          onPress={() => handlePlantTouch(plant)}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.plantContainer,
              {
                transform: [
                  { scale: plant.scale },
                  { rotate: plant.rotation.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-10deg', '10deg']
                  })}
                ],
                opacity: plant.opacity
              }
            ]}
          >
            <Text style={styles.plantEmoji}>
              {getPlantEmoji(plant.type)}
            </Text>
            <View style={[styles.energyBar, { width: `${plant.energy}%` }]} />
          </Animated.View>
        </TouchableOpacity>
      ))}

      {/* Creatures */}
      {creatures.map(creature => (
        <Animated.View
          key={creature.id}
          style={[
            styles.creature,
            {
              transform: [
                { translateX: creature.position.x },
                { translateY: creature.position.y }
              ]
            }
          ]}
        >
          <Text style={styles.creatureEmoji}>
            {getCreatureEmoji(creature.type)}
          </Text>
        </Animated.View>
      ))}

      {/* Voice Interface */}
      <View style={styles.voiceInterface}>
        <TouchableOpacity
          style={[
            styles.voiceButton,
            { backgroundColor: isListening ? '#ff6b6b' : '#667eea' }
          ]}
          onPress={startVoiceListening}
          disabled={isListening}
        >
          <Text style={styles.voiceButtonText}>
            {isListening ? '🎤 Listening...' : '🗣️ Talk to Garden'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Garden Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statIcon}>🌱</Text>
          <Text style={styles.statValue}>{plants.length}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statIcon}>🦋</Text>
          <Text style={styles.statValue}>{creatures.length}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statIcon}>✨</Text>
          <Text style={styles.statValue}>{gardenEnergy}%</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statIcon}>💭</Text>
          <Text style={styles.statLabel}>{userMood}</Text>
        </View>
      </View>

      {/* Magical Moments */}
      <View style={styles.magicalMoments}>
        {magicalMoments.map((moment, index) => (
          <Animated.View
            key={index}
            style={[
              styles.magicalMoment,
              { opacity: 1 - (index * 0.3) }
            ]}
          >
            <Text style={styles.magicalMomentText}>{moment}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Social Features */}
      <View style={styles.socialPanel}>
        <Text style={styles.socialTitle}>Community Moods</Text>
        {socialFireflies.slice(0, 3).map(firefly => (
          <View key={firefly.id} style={styles.socialFirefly}>
            <Text style={styles.fireflyMood}>{firefly.mood}</Text>
          </View>
        ))}
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => createSocialFirefly(userMood)}
        >
          <Text style={styles.shareButtonText}>Share Mood ✨</Text>
        </TouchableOpacity>
      </View>

      {/* Interaction Hints */}
      <View style={styles.hints}>
        <Text style={styles.hint}>🗣️ Speak to grow plants</Text>
        <Text style={styles.hint}>👆 Touch plants to energize</Text>
        <Text style={styles.hint}>📱 Shake to scatter seeds</Text>
      </View>
    </View>
  );
};

// Helper functions
const getPlantEmoji = (type: string): string => {
  const emojis = {
    lavender: '🪻',
    rose: '🌹',
    sunflower: '🌻',
    lotus: '🪷',
    willow: '🌿',
    bamboo: '🎋'
  };
  return emojis[type] || '🌱';
};

const getCreatureEmoji = (type: string): string => {
  const emojis = {
    butterfly: '🦋',
    firefly: '✨',
    bird: '🐦',
    bee: '🐝'
  };
  return emojis[type] || '🦋';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a4f63',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  plant: {
    position: 'absolute',
    zIndex: 10,
  },
  plantContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  plantEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  energyBar: {
    height: 3,
    backgroundColor: '#4ade80',
    borderRadius: 1.5,
    marginTop: 2,
  },
  creature: {
    position: 'absolute',
    zIndex: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatureEmoji: {
    fontSize: 24,
  },
  voiceInterface: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  voiceButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  voiceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  stats: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    color: 'white',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  magicalMoments: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 200,
    pointerEvents: 'none',
  },
  magicalMoment: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 8,
  },
  magicalMomentText: {
    color: '#2d3436',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  socialPanel: {
    position: 'absolute',
    bottom: 200,
    right: 20,
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    zIndex: 100,
  },
  socialTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  socialFirefly: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  fireflyMood: {
    color: 'white',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  shareButton: {
    backgroundColor: '#ffeaa7',
    borderRadius: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  shareButtonText: {
    color: '#2d3436',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  hints: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 100,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginBottom: 4,
  },
});

export default MagicalGarden3DMobile;

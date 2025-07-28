import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Alert, 
  TextInput,
  ScrollView,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import AIService, { SentimentResult, MoodEntry } from '../services/AIService';
import GardenService, { Plant, GardenState } from '../services/GardenService';
import VoiceService, { VoiceRecording } from '../services/VoiceService';
import AuthService, { User } from '../services/AuthService';
import CreatureService, { Creature } from '../services/CreatureService';
import WeatherService, { WeatherState } from '../services/WeatherService';
import MeditationService, { MeditationSession } from '../services/MeditationService';

const { width, height } = Dimensions.get('window');

interface MagicalGarden3DMobileProps {
  user: User;
}

const MagicalGarden3DMobile: React.FC<MagicalGarden3DMobileProps> = ({ user }) => {
  // Services
  const aiService = AIService.getInstance();
  const gardenService = GardenService.getInstance();
  const voiceService = VoiceService.getInstance();
  const authService = AuthService.getInstance();
  const creatureService = CreatureService.getInstance();
  const weatherService = WeatherService.getInstance();
  const meditationService = MeditationService.getInstance();

  // State
  const [garden, setGarden] = useState<GardenState>({
    plants: [],
    weather: 'sunny',
    season: 'spring',
    magicLevel: 50,
    totalMoods: 0,
    gardenLevel: 1,
    experience: 0,
  });

  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [weatherState, setWeatherState] = useState<WeatherState | null>(null);
  const [moodText, setMoodText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<VoiceRecording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentMood, setRecentMood] = useState<SentimentResult | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);
  const [meditationSessions, setMeditationSessions] = useState<MeditationSession[]>([]);

  // Animations
  const magicAnimation = useRef(new Animated.Value(0)).current;
  const plantAnimations = useRef<{ [key: string]: Animated.Value }>({});
  const weatherAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeGarden();
    startMagicAnimation();
    initializeVoiceService();
    initializeWeather();
    loadMeditationSessions();
  }, []);

  const initializeGarden = () => {
    // Load existing garden or create initial plants
    const initialPlants = [
      gardenService.createNewPlant('positive', { x: 0.3, y: 0.7 }),
      gardenService.createNewPlant('neutral', { x: 0.7, y: 0.6 }),
    ];
    
    setGarden(prev => ({
      ...prev,
      plants: initialPlants,
      totalMoods: user.totalMoods || 0,
      gardenLevel: user.gardenLevel || 1,
    }));
  };

  const initializeVoiceService = async () => {
    try {
      await voiceService.initialize();
    } catch (error) {
      console.error('Voice service initialization failed:', error);
    }
  };

  const initializeWeather = () => {
    const currentWeather = weatherService.getCurrentWeather();
    setWeatherState(currentWeather);
  };

  const loadMeditationSessions = () => {
    const sessions = meditationService.getMeditationSessions();
    setMeditationSessions(sessions);
  };

  const startMagicAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(magicAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(magicAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animatePlantGrowth = (plantId: string) => {
    if (!plantAnimations.current[plantId]) {
      plantAnimations.current[plantId] = new Animated.Value(0);
    }

    Animated.spring(plantAnimations.current[plantId], {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleTextMoodSubmit = async () => {
    if (!moodText.trim()) {
      Alert.alert('Empty Input', 'Please share how you\'re feeling! 🌸');
      return;
    }

    setIsProcessing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Analyze sentiment
      const sentiment = await aiService.analyzeSentiment(moodText);
      setRecentMood(sentiment);

      // Create mood entry
      const moodEntry: MoodEntry = {
        id: `mood_${Date.now()}`,
        text: moodText,
        timestamp: new Date(),
        sentiment,
        source: 'text',
        userId: user.id,
      };

      // Update garden
      await updateGardenWithMood(sentiment);
      
      // Provide feedback
      await provideMoodFeedback(sentiment);
      
      // Clear input
      setMoodText('');
      
      // Update user stats
      await authService.updateUser({ 
        totalMoods: garden.totalMoods + 1,
        gardenLevel: gardenService.calculateGardenLevel(garden.totalMoods + 1, getAveragePlantSize()),
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to process your mood. Please try again.');
      console.error('Mood processing error:', error);
    }

    setIsProcessing(false);
  };

  const handleVoiceRecording = async () => {
    try {
      if (isRecording) {
        // Stop recording
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const recording = await voiceService.stopRecording();
        setIsRecording(false);
        setCurrentRecording(recording);
        
        if (recording) {
          await processVoiceInput(recording);
        }
      } else {
        // Start recording
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await voiceService.startRecording();
        setIsRecording(true);
      }
    } catch (error) {
      setIsRecording(false);
      Alert.alert('Voice Error', 'Failed to record. Please check microphone permissions.');
      console.error('Voice recording error:', error);
    }
  };

  const processVoiceInput = async (recording: VoiceRecording) => {
    setIsProcessing(true);
    
    try {
      const { transcript, sentiment } = await voiceService.processVoiceInput(recording);
      setRecentMood(sentiment);
      
      // Show transcript to user
      Alert.alert('Voice Processed! 🎤', `You said: "${transcript}"`);
      
      // Update garden
      await updateGardenWithMood(sentiment);
      
      // Provide voice feedback
      await voiceService.provideMoodFeedback(sentiment);
      
      // Update user stats
      await authService.updateUser({ 
        totalMoods: garden.totalMoods + 1,
        gardenLevel: gardenService.calculateGardenLevel(garden.totalMoods + 1, getAveragePlantSize()),
      });

    } catch (error) {
      Alert.alert('Processing Error', 'Failed to process your voice input.');
      console.error('Voice processing error:', error);
    }
    
    setIsProcessing(false);
  };

  const updateGardenWithMood = async (sentiment: SentimentResult) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Grow existing plants
    const updatedPlants = garden.plants.map(plant => {
      const grownPlant = gardenService.growPlant(plant, sentiment);
      animatePlantGrowth(plant.id);
      return grownPlant;
    });

    // Maybe add a new plant for very positive moods
    if (sentiment.mood === 'very_positive' && Math.random() > 0.7) {
      const newPlant = gardenService.createNewPlant(sentiment.mood);
      updatedPlants.push(newPlant);
      animatePlantGrowth(newPlant.id);
    }

    // Update garden state
    const newGardenState = {
      ...garden,
      plants: updatedPlants,
      totalMoods: garden.totalMoods + 1,
      experience: garden.experience + (sentiment.intensity * 10),
    };

    // Update weather based on mood
    const newWeatherType = weatherService.updateWeatherForMood(sentiment.mood, newGardenState);
    newGardenState.weather = newWeatherType;
    
    // Update weather state
    setWeatherState(weatherService.getCurrentWeather());

    // Maybe spawn a creature
    if (creatureService.shouldSpawnCreature(newGardenState.totalMoods, creatures.length, sentiment.mood)) {
      const newCreature = creatureService.createCreature(sentiment.mood);
      setCreatures(prev => [...prev, newCreature]);
    }

    setGarden(newGardenState);
  };

  const provideMoodFeedback = async (sentiment: SentimentResult) => {
    const color = aiService.getMoodColor(sentiment.mood);
    const emoji = aiService.getMoodEmoji(sentiment.mood);
    
    Alert.alert(
      `${emoji} Mood Detected`,
      `${sentiment.suggestions[0] || 'Your garden appreciates your sharing! 🌸'}`,
      [{ text: 'Thank you! 💚', onPress: () => {} }]
    );
  };

  const getAveragePlantSize = (): number => {
    if (garden.plants.length === 0) return 0;
    return garden.plants.reduce((sum, plant) => sum + plant.size, 0) / garden.plants.length;
  };

  const renderPlant = (plant: Plant, index: number) => {
    const emoji = gardenService.getPlantEmoji(plant);
    const size = gardenService.getPlantSize(plant);
    
    const animatedStyle = plantAnimations.current[plant.id] ? {
      transform: [{
        scale: plantAnimations.current[plant.id].interpolate({
          inputRange: [0, 1],
          outputRange: [size * 0.8, size],
        })
      }]
    } : {};

    return (
      <Animated.View
        key={plant.id}
        style={[
          styles.plant,
          {
            left: plant.position.x * (width - 60),
            top: plant.position.y * (height * 0.6),
          },
          animatedStyle,
        ]}
      >
        <Text style={[styles.plantEmoji, { fontSize: 20 + size * 20 }]}>
          {emoji}
        </Text>
        {plant.happiness > 0.8 && (
          <Text style={styles.sparkle}>✨</Text>
        )}
      </Animated.View>
    );
  };

  const renderWeather = () => {
    if (!weatherState) return null;
    
    const weatherEmojis = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      misty: '🌫️',
      rainbow: '🌈',
      starry: '⭐',
      snowy: '❄️',
    };

    return (
      <Animated.View
        style={[
          styles.weather,
          {
            opacity: weatherAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
          },
        ]}
      >
        <Text style={styles.weatherEmoji}>{weatherEmojis[weatherState.type]}</Text>
        <Text style={styles.weatherText}>{Math.round(weatherState.intensity * 100)}%</Text>
      </Animated.View>
    );
  };

  const renderCreature = (creature: Creature, index: number) => {
    return (
      <Animated.View
        key={creature.id}
        style={[
          styles.creature,
          {
            transform: [
              { translateX: creature.position.x },
              { translateY: creature.position.y },
              { scale: creature.scale },
              { rotate: creature.rotation.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              })},
            ],
            opacity: creature.opacity,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleCreatureInteraction(creature)}
          style={styles.creatureEmoji}
        >
          <Text style={styles.creatureText}>{creature.emoji}</Text>
          {creature.behavior === 'playing' && (
            <Text style={styles.creatureBehavior}>💫</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleCreatureInteraction = async (creature: Creature) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const interaction = creatureService.interactWithCreature(creature, 'pet');
    
    Alert.alert(
      `${creature.emoji} Interaction`,
      `The ${creature.type} seems ${interaction.happiness > 0.5 ? 'happy' : 'content'}! Trust: ${Math.round(interaction.trust * 100)}%`,
      [{ text: 'Sweet! 💚', onPress: () => {} }]
    );
  };

  const renderMeditationSessions = () => {
    if (!recentMood) return null;
    
    const recommendedSessions = meditationService.getRecommendedSessions(recentMood.mood);
    
    return (
      <View style={styles.meditationPanel}>
        <Text style={styles.meditationTitle}>🧘 Recommended Meditations</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recommendedSessions.slice(0, 3).map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.meditationCard}
              onPress={() => startMeditation(session.id)}
            >
              <Text style={styles.meditationName}>{session.name}</Text>
              <Text style={styles.meditationDuration}>{Math.round(session.duration / 60)}min</Text>
              <Text style={styles.meditationDescription} numberOfLines={2}>
                {session.description}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const startMeditation = async (sessionId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const started = meditationService.startMeditation(sessionId);
    if (started) {
      Alert.alert(
        '🧘 Meditation Started',
        'Find a comfortable position. Your garden will guide you through this peaceful journey.',
        [{ text: 'Begin 🌸', onPress: () => {} }]
      );
      setShowMeditation(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Sky and Weather */}
      <View style={styles.sky}>
        {renderWeather()}
        <Animated.View
          style={[
            styles.magicOverlay,
            {
              opacity: magicAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.3],
              }),
            },
          ]}
        />
      </View>

      {/* Garden Area */}
      <View style={styles.gardenArea}>
        {garden.plants.map((plant, index) => renderPlant(plant, index))}
        {creatures.map((creature, index) => renderCreature(creature, index))}
        
        {/* Recent Mood Display */}
        {recentMood && (
          <View style={[styles.moodDisplay, { backgroundColor: aiService.getMoodColor(recentMood.mood) + '20' }]}>
            <Text style={styles.moodText}>
              {aiService.getMoodEmoji(recentMood.mood)} {recentMood.mood.replace('_', ' ')}
            </Text>
            <Text style={styles.moodIntensity}>
              Intensity: {Math.round(recentMood.intensity * 100)}%
            </Text>
          </View>
        )}

        {/* Meditation Recommendations */}
        {recentMood && !showStats && renderMeditationSessions()}
      </View>

      {/* Stats Panel */}
      {showStats && (
        <View style={styles.statsPanel}>
          <Text style={styles.statsTitle}>🌸 Garden Stats</Text>
          <Text style={styles.statsText}>Level: {garden.gardenLevel}</Text>
          <Text style={styles.statsText}>Plants: {garden.plants.length}</Text>
          <Text style={styles.statsText}>Total Moods: {garden.totalMoods}</Text>
          <Text style={styles.statsText}>Experience: {Math.round(garden.experience)}</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.moodInput}
          placeholder="How are you feeling? 💭"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={moodText}
          onChangeText={setMoodText}
          multiline
          maxLength={200}
        />
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.submitButton, isProcessing && styles.buttonDisabled]}
            onPress={handleTextMoodSubmit}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>
              {isProcessing ? '🌱 Growing...' : '🌸 Share'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.voiceButton, 
              isRecording && styles.recordingButton,
              isProcessing && styles.buttonDisabled
            ]}
            onPress={handleVoiceRecording}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>
              {isRecording ? '🛑 Stop' : '🎤 Voice'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => setShowStats(!showStats)}
          >
            <Text style={styles.buttonText}>📊</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a4f63',
  },
  sky: {
    height: height * 0.3,
    backgroundColor: '#4A90E2',
    position: 'relative',
  },
  weather: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  weatherEmoji: {
    fontSize: 40,
  },
  weatherText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  magicOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFD700',
  },
  gardenArea: {
    flex: 1,
    backgroundColor: '#2D5A27',
    position: 'relative',
  },
  plant: {
    position: 'absolute',
    alignItems: 'center',
  },
  plantEmoji: {
    fontSize: 30,
  },
  sparkle: {
    position: 'absolute',
    top: -10,
    fontSize: 12,
  },
  moodDisplay: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  moodText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  moodIntensity: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  statsPanel: {
    position: 'absolute',
    top: height * 0.1,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 5,
  },
  inputArea: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    paddingBottom: 40,
  },
  moodInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: 'white',
    marginBottom: 15,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  voiceButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  statsButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 15,
    padding: 15,
    minWidth: 60,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Creature styles
  creature: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatureEmoji: {
    fontSize: 25,
  },
  creatureHappiness: {
    position: 'absolute',
    top: -15,
    fontSize: 10,
    color: '#FFD700',
  },
  // Weather styles
  weatherEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rainDrop: {
    position: 'absolute',
    color: '#4A90E2',
    fontSize: 12,
  },
  snowFlake: {
    position: 'absolute',
    color: 'white',
    fontSize: 14,
  },
  // Meditation styles
  meditationPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  meditationTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  meditationCard: {
    backgroundColor: 'rgba(103, 126, 234, 0.2)',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    width: 140,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  meditationName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  meditationDuration: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 4,
  },
  meditationDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    lineHeight: 14,
  },
});

export default MagicalGarden3DMobile;

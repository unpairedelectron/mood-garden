import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { moodGardenAPI, GardenState, PlantInstance } from '../../../shared/src';

const { width: screenWidth } = Dimensions.get('window');

export default function GardenScreen() {
  const [gardenState, setGardenState] = useState<GardenState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState<PlantInstance | null>(null);

  // Mock user ID
  const userId = 'user_123';

  useEffect(() => {
    loadGarden();
  }, []);

  const loadGarden = async () => {
    try {
      setLoading(true);
      const garden = await moodGardenAPI.getGardenState(userId);
      setGardenState(garden);
    } catch (error) {
      console.error('Failed to load garden:', error);
      Alert.alert('Error', 'Failed to load your garden. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const waterPlant = async (plantId: string) => {
    try {
      const result = await moodGardenAPI.waterPlant(userId, plantId);
      setGardenState(result.garden);
      Alert.alert('🌊', 'Plant watered! Your plant is looking healthier.');
    } catch (error) {
      console.error('Failed to water plant:', error);
      Alert.alert('Error', 'Failed to water plant. Please try again.');
    }
  };

  const removePlant = async (plantId: string) => {
    Alert.alert(
      'Remove Plant',
      'Are you sure you want to remove this plant from your garden?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await moodGardenAPI.removePlant(userId, plantId);
              setGardenState(result.garden);
              setSelectedPlant(null);
            } catch (error) {
              console.error('Failed to remove plant:', error);
              Alert.alert('Error', 'Failed to remove plant. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getPlantEmoji = (type: string, stage: string) => {
    const plantEmojis: Record<string, Record<string, string>> = {
      sunflower: { seed: '🌰', sprout: '🌱', bloom: '🌻', flourish: '🌻✨' },
      daisy: { seed: '🌰', sprout: '🌱', bloom: '🌼', flourish: '🌼✨' },
      rose: { seed: '🌰', sprout: '🌱', bloom: '🌹', flourish: '🌹✨' },
      fern: { seed: '🌰', sprout: '🌱', bloom: '🌿', flourish: '🌿✨' },
      aloe: { seed: '🌰', sprout: '🌱', bloom: '🪴', flourish: '🪴✨' },
      bamboo: { seed: '🌰', sprout: '🌱', bloom: '🎋', flourish: '🎋✨' },
      lavender: { seed: '🌰', sprout: '🌱', bloom: '💜', flourish: '💜✨' },
      oak: { seed: '🌰', sprout: '🌱', bloom: '🌳', flourish: '🌳✨' },
      willow: { seed: '🌰', sprout: '🌱', bloom: '🌲', flourish: '🌲✨' },
      cactus: { seed: '🌰', sprout: '🌱', bloom: '🌵', flourish: '🌵✨' },
      lily: { seed: '🌰', sprout: '🌱', bloom: '🌺', flourish: '🌺✨' },
      moss: { seed: '🌰', sprout: '🌱', bloom: '🍃', flourish: '🍃✨' },
      vine: { seed: '🌰', sprout: '🌱', bloom: '🌾', flourish: '🌾✨' },
      'cherry-blossom': { seed: '🌰', sprout: '🌱', bloom: '🌸', flourish: '🌸✨' },
    };
    
    return plantEmojis[type]?.[stage] || '🌱';
  };

  const getWeatherEmoji = (weather: string) => {
    const weatherEmojis: Record<string, string> = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      foggy: '🌫️',
      stormy: '⛈️',
    };
    return weatherEmojis[weather] || '☀️';
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return '#4CAF50';
    if (health >= 60) return '#FFC107';
    if (health >= 40) return '#FF9800';
    return '#F44336';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading your garden...</Text>
      </View>
    );
  }

  if (!gardenState) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyTitle}>🌱 Start Your Garden</Text>
        <Text style={styles.emptyText}>
          Record your first mood to begin growing your virtual garden!
        </Text>
        <TouchableOpacity 
          style={styles.recordMoodButton}
          onPress={() => {
            // Navigate to mood input
            Alert.alert('Navigate', 'Would navigate to Mood Input tab');
          }}
        >
          <Text style={styles.recordMoodButtonText}>Record First Mood</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Environment Header */}
      <View style={styles.environmentHeader}>
        <Text style={styles.environmentTitle}>Your Garden</Text>
        <View style={styles.environmentInfo}>
          <Text style={styles.weatherText}>
            {getWeatherEmoji(gardenState.environment.weather)} {gardenState.environment.weather}
          </Text>
          <Text style={styles.timeText}>
            {gardenState.environment.timeOfDay} • {gardenState.environment.season}
          </Text>
        </View>
      </View>

      {/* Garden Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{gardenState.plants.length}</Text>
          <Text style={styles.statLabel}>Plants</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {gardenState.plants.filter(p => p.growthStage === 'flourish').length}
          </Text>
          <Text style={styles.statLabel}>Flourishing</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Math.round(gardenState.plants.reduce((sum, p) => sum + p.health, 0) / gardenState.plants.length) || 0}%
          </Text>
          <Text style={styles.statLabel}>Avg Health</Text>
        </View>
      </View>

      {/* Garden Grid */}
      {gardenState.plants.length > 0 ? (
        <View style={styles.gardenGrid}>
          <Text style={styles.sectionTitle}>Your Plants</Text>
          {gardenState.plants.map((plant) => (
            <TouchableOpacity
              key={plant.id}
              style={styles.plantCard}
              onPress={() => setSelectedPlant(plant)}
            >
              <View style={styles.plantHeader}>
                <Text style={styles.plantEmoji}>
                  {getPlantEmoji(plant.type, plant.growthStage)}
                </Text>
                <View style={styles.plantInfo}>
                  <Text style={styles.plantType}>{plant.type}</Text>
                  <Text style={styles.plantStage}>{plant.growthStage}</Text>
                </View>
                <View style={[styles.healthBadge, { backgroundColor: getHealthColor(plant.health) }]}>
                  <Text style={styles.healthText}>{plant.health}%</Text>
                </View>
              </View>
              <Text style={styles.plantDate}>
                Planted {new Date(plant.plantedAt).toLocaleDateString()}
              </Text>
              <View style={styles.plantActions}>
                <TouchableOpacity
                  style={styles.waterButton}
                  onPress={() => waterPlant(plant.id)}
                >
                  <Text style={styles.actionButtonText}>💧 Water</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePlant(plant.id)}
                >
                  <Text style={styles.actionButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyGarden}>
          <Text style={styles.emptyGardenEmoji}>🌱</Text>
          <Text style={styles.emptyGardenTitle}>Your garden is ready to grow!</Text>
          <Text style={styles.emptyGardenText}>
            Record your moods to plant beautiful flowers and watch your garden flourish.
          </Text>
        </View>
      )}

      {/* Plant Detail Modal */}
      {selectedPlant && (
        <View style={styles.overlay}>
          <View style={styles.plantDetailModal}>
            <Text style={styles.plantDetailEmoji}>
              {getPlantEmoji(selectedPlant.type, selectedPlant.growthStage)}
            </Text>
            <Text style={styles.plantDetailTitle}>{selectedPlant.type}</Text>
            <Text style={styles.plantDetailStage}>Growth: {selectedPlant.growthStage}</Text>
            <Text style={styles.plantDetailHealth}>Health: {selectedPlant.health}%</Text>
            <Text style={styles.plantDetailDate}>
              Planted: {new Date(selectedPlant.plantedAt).toLocaleDateString()}
            </Text>
            {selectedPlant.lastWatered && (
              <Text style={styles.plantDetailWatered}>
                Last watered: {new Date(selectedPlant.lastWatered).toLocaleDateString()}
              </Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalWaterButton}
                onPress={() => {
                  waterPlant(selectedPlant.id);
                  setSelectedPlant(null);
                }}
              >
                <Text style={styles.modalButtonText}>💧 Water Plant</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedPlant(null)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  recordMoodButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  recordMoodButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  environmentHeader: {
    backgroundColor: '#4CAF50',
    padding: 20,
  },
  environmentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  environmentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherText: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  timeText: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  gardenGrid: {
    marginBottom: 20,
  },
  plantCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  plantEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  plantInfo: {
    flex: 1,
  },
  plantType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  plantStage: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  plantDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  plantActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waterButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyGarden: {
    alignItems: 'center',
    padding: 40,
  },
  emptyGardenEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyGardenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyGardenText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantDetailModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  plantDetailEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  plantDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  plantDetailStage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  plantDetailHealth: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  plantDetailDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  plantDetailWatered: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalWaterButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalCloseButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

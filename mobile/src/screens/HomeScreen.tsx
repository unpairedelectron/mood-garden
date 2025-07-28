import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { moodGardenAPI, MoodEntry, AICoachResponse } from '../../../shared/src';

export default function HomeScreen() {
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);
  const [coachingTip, setCoachingTip] = useState<AICoachResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock user ID - in real app, this would come from auth context
  const userId = 'user_123';

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Load recent moods
      const moodData = await moodGardenAPI.getMoodHistory(userId, 5);
      setRecentMoods(moodData.moods);

      // Load coaching tip
      const tip = await moodGardenAPI.getCoachingTip(userId);
      setCoachingTip(tip);

    } catch (error) {
      console.error('Failed to load home data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMoodEmoji = (mood: string) => {
    const emojiMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      anxious: '😰',
      calm: '😌',
      angry: '😠',
      excited: '🤩',
      tired: '😴',
      stressed: '😵',
      content: '😊',
      lonely: '😔',
      grateful: '🙏',
      frustrated: '😤',
      peaceful: '☮️',
      overwhelmed: '🤯'
    };
    return emojiMap[mood] || '😐';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading your garden...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome to your MoodGarden! 🌱</Text>
        <Text style={styles.welcomeSubtitle}>
          How are you feeling today? Your garden grows with your emotions.
        </Text>
      </View>

      {/* Quick Mood Input */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Mood Check</Text>
        <View style={styles.moodButtons}>
          {['happy', 'calm', 'stressed', 'sad'].map((mood) => (
            <TouchableOpacity 
              key={mood}
              style={styles.moodButton}
              onPress={() => {
                // Navigate to mood input with pre-selected mood
                Alert.alert('Quick Mood', `Selected: ${mood} ${getMoodEmoji(mood)}`);
              }}
            >
              <Text style={styles.moodEmoji}>{getMoodEmoji(mood)}</Text>
              <Text style={styles.moodLabel}>{mood}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* AI Coaching Tip */}
      {coachingTip && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌿 Garden Wisdom</Text>
          <Text style={styles.coachingMessage}>{coachingTip.message}</Text>
          {coachingTip.actionItems && coachingTip.actionItems.length > 0 && (
            <View style={styles.actionItems}>
              <Text style={styles.actionItemsTitle}>Try this:</Text>
              {coachingTip.actionItems.map((item, index) => (
                <Text key={index} style={styles.actionItem}>
                  • {item}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recent Moods */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Moods</Text>
        {recentMoods.length > 0 ? (
          recentMoods.map((mood, index) => (
            <View key={index} style={styles.moodEntry}>
              <View style={styles.moodHeader}>
                <Text style={styles.moodEmoji}>
                  {getMoodEmoji(mood.processedMood.primary)}
                </Text>
                <View style={styles.moodInfo}>
                  <Text style={styles.moodType}>
                    {mood.processedMood.primary}
                  </Text>
                  <Text style={styles.moodDate}>
                    {formatDate(mood.timestamp)}
                  </Text>
                </View>
                <View style={styles.intensityBadge}>
                  <Text style={styles.intensityText}>
                    {mood.processedMood.intensity}/10
                  </Text>
                </View>
              </View>
              {mood.rawInput && (
                <Text style={styles.moodText} numberOfLines={2}>
                  "{mood.rawInput}"
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            No moods recorded yet. Start by recording your first mood! 🌱
          </Text>
        )}
      </View>

      {/* Garden Preview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Garden Preview</Text>
        <View style={styles.gardenPreview}>
          <Text style={styles.gardenEmoji}>🌻🌿🌸</Text>
          <Text style={styles.gardenText}>
            Your virtual garden is growing! Check the Garden tab to see all your plants.
          </Text>
          <TouchableOpacity 
            style={styles.viewGardenButton}
            onPress={() => {
              // Navigate to garden tab
              Alert.alert('Navigate', 'Would navigate to Garden tab');
            }}
          >
            <Text style={styles.viewGardenButtonText}>View Full Garden</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: '#4CAF50',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  moodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  coachingMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  actionItems: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  actionItemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  actionItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  moodEntry: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  moodType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  moodDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  intensityBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  moodText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  gardenPreview: {
    alignItems: 'center',
  },
  gardenEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  gardenText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  viewGardenButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewGardenButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

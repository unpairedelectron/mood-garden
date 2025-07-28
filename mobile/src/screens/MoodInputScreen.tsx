import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export default function MoodInputScreen() {
  const [inputMode, setInputMode] = useState<'text' | 'emoji' | 'voice'>('text');
  const [moodText, setMoodText] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const moods = [
    { name: 'happy', emoji: '😊', color: '#FFD54F' },
    { name: 'sad', emoji: '😢', color: '#90CAF9' },
    { name: 'anxious', emoji: '😰', color: '#FFAB91' },
    { name: 'calm', emoji: '😌', color: '#A5D6A7' },
    { name: 'angry', emoji: '😠', color: '#EF5350' },
    { name: 'excited', emoji: '🤩', color: '#FFE082' },
    { name: 'tired', emoji: '😴', color: '#B39DDB' },
    { name: 'stressed', emoji: '😵', color: '#FF8A65' },
    { name: 'content', emoji: '😊', color: '#81C784' },
    { name: 'grateful', emoji: '🙏', color: '#F8BBD9' },
    { name: 'frustrated', emoji: '😤', color: '#FFCDD2' },
    { name: 'peaceful', emoji: '☮️', color: '#B2DFDB' },
  ];

  const handleSubmitMood = async () => {
    try {
      let moodInput = '';
      
      if (inputMode === 'text') {
        moodInput = moodText.trim();
        if (!moodInput) {
          Alert.alert('Please enter your mood');
          return;
        }
      } else if (inputMode === 'emoji') {
        if (!selectedMood) {
          Alert.alert('Please select your mood');
          return;
        }
        moodInput = `Feeling ${selectedMood}`;
      } else if (inputMode === 'voice') {
        // Voice transcription would happen here
        moodInput = 'Voice recording transcription placeholder';
      }

      // TODO: Integrate with API
      // const result = await moodGardenAPI.createMoodEntry({
      //   userId: 'user_123',
      //   inputType: inputMode,
      //   rawInput: moodInput,
      //   context: { intensity }
      // });

      Alert.alert(
        'Mood Recorded! 🌱',
        `Your ${inputMode} mood entry has been saved. Your garden is growing!`,
        [
          {
            text: 'View Garden',
            onPress: () => {
              // Navigate to garden
            }
          },
          { text: 'Record Another', onPress: resetForm }
        ]
      );

      resetForm();
    } catch (error) {
      console.error('Failed to submit mood:', error);
      Alert.alert('Error', 'Failed to save your mood. Please try again.');
    }
  };

  const resetForm = () => {
    setMoodText('');
    setSelectedMood('');
    setIntensity(5);
    setInputMode('text');
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow microphone access to record your mood.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      Alert.alert(
        'Recording Complete',
        'Your voice note has been recorded. It will be transcribed and analyzed.',
        [
          { text: 'Re-record', onPress: startRecording },
          { text: 'Submit', onPress: handleSubmitMood }
        ]
      );
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const renderIntensitySlider = () => (
    <View style={styles.intensityContainer}>
      <Text style={styles.sectionTitle}>Intensity Level: {intensity}/10</Text>
      <View style={styles.intensitySlider}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.intensityDot,
              { backgroundColor: intensity >= value ? '#4CAF50' : '#e0e0e0' }
            ]}
            onPress={() => setIntensity(value)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>How are you feeling? 🌱</Text>
        <Text style={styles.subtitle}>
          Choose how you'd like to express your mood today
        </Text>
      </View>

      {/* Input Mode Selector */}
      <View style={styles.modeSelector}>
        {[
          { mode: 'text', label: 'Write', icon: '✍️' },
          { mode: 'emoji', label: 'Emoji', icon: '😊' },
          { mode: 'voice', label: 'Voice', icon: '🎤' }
        ].map(({ mode, label, icon }) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              inputMode === mode && styles.modeButtonActive
            ]}
            onPress={() => setInputMode(mode as any)}
          >
            <Text style={styles.modeIcon}>{icon}</Text>
            <Text style={[
              styles.modeLabel,
              inputMode === mode && styles.modeLabelActive
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input Content */}
      <View style={styles.inputSection}>
        {inputMode === 'text' && (
          <View>
            <Text style={styles.sectionTitle}>Write about your mood</Text>
            <TextInput
              style={styles.textInput}
              placeholder="How are you feeling right now? What's on your mind?"
              multiline
              numberOfLines={4}
              value={moodText}
              onChangeText={setMoodText}
              textAlignVertical="top"
            />
          </View>
        )}

        {inputMode === 'emoji' && (
          <View>
            <Text style={styles.sectionTitle}>Select your mood</Text>
            <View style={styles.emojiGrid}>
              {moods.map((mood) => (
                <TouchableOpacity
                  key={mood.name}
                  style={[
                    styles.emojiButton,
                    { backgroundColor: mood.color },
                    selectedMood === mood.name && styles.emojiButtonSelected
                  ]}
                  onPress={() => setSelectedMood(mood.name)}
                >
                  <Text style={styles.emojiIcon}>{mood.emoji}</Text>
                  <Text style={styles.emojiLabel}>{mood.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {inputMode === 'voice' && (
          <View style={styles.voiceSection}>
            <Text style={styles.sectionTitle}>Record your mood</Text>
            <View style={styles.voiceControls}>
              {!isRecording ? (
                <TouchableOpacity 
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <Text style={styles.recordButtonText}>🎤</Text>
                  <Text style={styles.recordLabel}>Tap to Record</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.recordButton, styles.recordingButton]}
                  onPress={stopRecording}
                >
                  <Text style={styles.recordButtonText}>⏹️</Text>
                  <Text style={styles.recordLabel}>Tap to Stop</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.voiceHint}>
              Share your thoughts out loud. We'll transcribe and analyze your words.
            </Text>
          </View>
        )}

        {/* Intensity Slider */}
        {renderIntensitySlider()}
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmitMood}
      >
        <Text style={styles.submitButtonText}>
          Plant in Garden 🌱
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#4CAF50',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 12,
    color: '#666',
  },
  modeLabelActive: {
    color: 'white',
    fontWeight: '600',
  },
  inputSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    opacity: 0.8,
  },
  emojiButtonSelected: {
    opacity: 1,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  emojiIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  emojiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  voiceSection: {
    alignItems: 'center',
  },
  voiceControls: {
    marginVertical: 20,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingButton: {
    backgroundColor: '#f44336',
  },
  recordButtonText: {
    fontSize: 32,
    marginBottom: 8,
  },
  recordLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  voiceHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  intensityContainer: {
    marginTop: 24,
  },
  intensitySlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  intensityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

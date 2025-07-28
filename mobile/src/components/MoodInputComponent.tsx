import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useCamera } from '../hooks/useCamera';
import { MOOD_TYPES, getMoodEmoji } from '../../../shared/src';

interface MoodInputComponentProps {
  onMoodSubmit: (moodData: any) => Promise<void>;
  isLoading?: boolean;
}

export default function MoodInputComponent({ onMoodSubmit, isLoading = false }: MoodInputComponentProps) {
  const [inputType, setInputType] = useState<'text' | 'emoji' | 'voice' | 'photo'>('text');
  const [textInput, setTextInput] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodIntensity, setMoodIntensity] = useState(5);
  
  const voiceRecording = useVoiceRecording();
  const camera = useCamera();

  const handleSubmit = async () => {
    let rawInput = '';
    let finalInputType: 'text' | 'emoji' | 'voice' = 'text';

    switch (inputType) {
      case 'text':
        rawInput = textInput.trim();
        finalInputType = 'text';
        break;
      case 'emoji':
        rawInput = selectedMood ? `Feeling ${selectedMood} (intensity: ${moodIntensity}/10)` : '';
        finalInputType = 'emoji';
        break;
      case 'voice':
        if (voiceRecording.uri) {
          rawInput = 'Voice note recorded'; // Will be transcribed by backend
          finalInputType = 'voice';
        }
        break;
      case 'photo':
        rawInput = 'Mood photo captured'; // Photo analysis would happen in backend
        finalInputType = 'text'; // For now, treat as text
        break;
    }

    if (!rawInput) {
      Alert.alert('Input Required', 'Please provide your mood input before submitting.');
      return;
    }

    try {
      await onMoodSubmit({
        inputType: finalInputType,
        rawInput,
        context: {
          intensity: moodIntensity,
          selectedMood,
          timestamp: new Date().toISOString(),
        },
      });

      // Reset form
      setTextInput('');
      setSelectedMood(null);
      setMoodIntensity(5);
    } catch (error) {
      console.error('Failed to submit mood:', error);
      Alert.alert('Error', 'Failed to submit mood. Please try again.');
    }
  };

  const renderTextInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>How are you feeling?</Text>
      <TextInput
        style={styles.textInput}
        value={textInput}
        onChangeText={setTextInput}
        placeholder="Describe your mood, thoughts, or what's happening..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>
  );

  const renderEmojiInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Select your mood</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
        {MOOD_TYPES.map((mood) => (
          <TouchableOpacity
            key={mood}
            style={[
              styles.moodButton,
              selectedMood === mood && styles.selectedMoodButton
            ]}
            onPress={() => setSelectedMood(mood)}
          >
            <Text style={styles.moodEmoji}>{getMoodEmoji(mood)}</Text>
            <Text style={styles.moodLabel}>{mood}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {selectedMood && (
        <View style={styles.intensityContainer}>
          <Text style={styles.label}>Intensity: {moodIntensity}/10</Text>
          <View style={styles.intensitySlider}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.intensityDot,
                  value <= moodIntensity && styles.activeDot
                ]}
                onPress={() => setMoodIntensity(value)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderVoiceInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Record a voice note</Text>
      <View style={styles.voiceControls}>
        {!voiceRecording.isRecording ? (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={voiceRecording.startRecording}
          >
            <Ionicons name="mic" size={32} color="white" />
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.recordingContainer}>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={voiceRecording.stopRecording}
            >
              <Ionicons name="stop" size={32} color="white" />
            </TouchableOpacity>
            <Text style={styles.recordingText}>
              Recording: {voiceRecording.formatDuration(voiceRecording.duration)}
            </Text>
          </View>
        )}
        
        {voiceRecording.uri && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => voiceRecording.playRecording(voiceRecording.uri!)}
          >
            <Ionicons name="play" size={24} color="white" />
            <Text style={styles.playButtonText}>Play Recording</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPhotoInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Capture your mood</Text>
      <TouchableOpacity
        style={styles.photoButton}
        onPress={camera.showImagePickerOptions}
      >
        <Ionicons name="camera" size={32} color="white" />
        <Text style={styles.photoButtonText}>Take Photo</Text>
      </TouchableOpacity>
      <Text style={styles.note}>Photos will be analyzed for mood insights</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>How are you feeling today?</Text>
      
      {/* Input Type Selector */}
      <View style={styles.typeSelector}>
        {(['text', 'emoji', 'voice', 'photo'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              inputType === type && styles.activeTypeButton
            ]}
            onPress={() => setInputType(type)}
          >
            <Ionicons
              name={
                type === 'text' ? 'chatbubble-outline' :
                type === 'emoji' ? 'happy-outline' :
                type === 'voice' ? 'mic-outline' :
                'camera-outline'
              }
              size={24}
              color={inputType === type ? 'white' : '#666'}
            />
            <Text style={[
              styles.typeButtonText,
              inputType === type && styles.activeTypeButtonText
            ]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input Content */}
      {inputType === 'text' && renderTextInput()}
      {inputType === 'emoji' && renderEmojiInput()}
      {inputType === 'voice' && renderVoiceInput()}
      {inputType === 'photo' && renderPhotoInput()}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? 'Analyzing...' : 'Submit Mood'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTypeButton: {
    backgroundColor: '#27ae60',
  },
  typeButtonText: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
  },
  activeTypeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2c3e50',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  moodScroll: {
    marginBottom: 16,
  },
  moodButton: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    minWidth: 80,
  },
  selectedMoodButton: {
    borderColor: '#27ae60',
    backgroundColor: '#27ae60',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  intensityContainer: {
    marginTop: 16,
  },
  intensitySlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  intensityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ddd',
  },
  activeDot: {
    backgroundColor: '#27ae60',
  },
  voiceControls: {
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 50,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  recordButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 8,
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stopButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 25,
    padding: 15,
    marginBottom: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  playButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  photoButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  photoButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 8,
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

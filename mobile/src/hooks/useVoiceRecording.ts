import { useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri: string | null;
}

export function useVoiceRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    uri: null,
  });

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow microphone access to record voice notes.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setRecordingState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        uri: null,
      });

      // Update duration every second
      const interval = setInterval(async () => {
        if (newRecording) {
          const status = await newRecording.getStatusAsync();
          if (status.isRecording) {
            setRecordingState(prev => ({
              ...prev,
              duration: status.durationMillis || 0,
            }));
          }
        }
      }, 1000);

      // Store interval reference for cleanup
      (newRecording as any)._interval = interval;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      if (!recording) return null;

      // Clear interval
      if ((recording as any)._interval) {
        clearInterval((recording as any)._interval);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setRecordingState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        uri,
      });

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
      return null;
    }
  }, [recording]);

  const pauseRecording = useCallback(async () => {
    try {
      if (recording) {
        await recording.pauseAsync();
        setRecordingState(prev => ({ ...prev, isPaused: true }));
      }
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }, [recording]);

  const resumeRecording = useCallback(async () => {
    try {
      if (recording) {
        await recording.startAsync();
        setRecordingState(prev => ({ ...prev, isPaused: false }));
      }
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }, [recording]);

  const playRecording = useCallback(async (uri: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording.');
    }
  }, [sound]);

  const deleteRecording = useCallback(async (uri: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      await FileSystem.deleteAsync(uri, { idempotent: true });
      setRecordingState(prev => ({ ...prev, uri: null }));
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }, [sound]);

  const formatDuration = useCallback((milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    playRecording,
    deleteRecording,
    formatDuration,
  };
}

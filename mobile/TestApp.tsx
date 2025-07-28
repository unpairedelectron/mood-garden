import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const TestApp: React.FC = () => {
  const handlePress = () => {
    Alert.alert('Success!', 'Your MoodGarden mobile app is working! 🌸');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>🌸 MoodGarden 🌸</Text>
        <Text style={styles.subtitle}>Magical Wellness App</Text>
      </View>

      <View style={styles.garden}>
        <Text style={styles.emoji}>🌻</Text>
        <Text style={styles.emoji}>🌹</Text>
        <Text style={styles.emoji}>🪻</Text>
        <Text style={styles.emoji}>🪷</Text>
        <Text style={styles.emoji}>🦋</Text>
        <Text style={styles.emoji}>✨</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>🎤 Test Voice Garden</Text>
      </TouchableOpacity>

      <View style={styles.status}>
        <Text style={styles.statusText}>✅ Mobile app is running!</Text>
        <Text style={styles.statusText}>🚀 Ready for magical features</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a4f63',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  garden: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 20,
  },
  emoji: {
    fontSize: 40,
    margin: 10,
  },
  button: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  status: {
    alignItems: 'center',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginVertical: 2,
  },
});

export default TestApp;

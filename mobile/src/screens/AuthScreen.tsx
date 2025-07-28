import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AuthService from '../services/AuthService';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const authService = AuthService.getInstance();

  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await authService.signUp(email, name);
        Alert.alert('Success!', `Welcome to MoodGarden, ${name}! 🌸`);
      } else {
        await authService.signIn(email);
        Alert.alert('Welcome back!', 'Ready to tend your garden? 🌻');
      }
      onAuthenticated();
    } catch (error) {
      Alert.alert('Error', isSignUp ? 'Failed to create account' : 'User not found. Try signing up first!');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌸 MoodGarden 🌸</Text>
        <Text style={styles.tagline}>Your Personal Wellness Sanctuary</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
        
        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={name}
            onChangeText={setName}
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '🌱 Growing...' : isSignUp ? '🌱 Plant Your Garden' : '🌻 Enter Garden'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have a garden? Sign In' : 'New to MoodGarden? Sign Up'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        <Text style={styles.featureText}>✨ AI-Powered Mood Analysis</Text>
        <Text style={styles.featureText}>🎤 Voice & Text Input</Text>
        <Text style={styles.featureText}>🌱 Dynamic Garden Growth</Text>
        <Text style={styles.featureText}>📊 Progress Tracking</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a4f63',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: 'white',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  features: {
    alignItems: 'center',
  },
  featureText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginVertical: 2,
  },
});

export default AuthScreen;

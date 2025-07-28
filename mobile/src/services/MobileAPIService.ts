import AsyncStorage from '@react-native-async-storage/async-storage';
import { moodGardenAPI } from '../../../shared/src';

class MobileAPIService {
  private static instance: MobileAPIService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): MobileAPIService {
    if (!MobileAPIService.instance) {
      MobileAPIService.instance = new MobileAPIService();
    }
    return MobileAPIService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Get stored auth token
      const token = await AsyncStorage.getItem('@mood_garden_token');
      if (token) {
        moodGardenAPI.setAuthToken(token);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize mobile API service:', error);
    }
  }

  async login(email: string, password: string) {
    try {
      const result = await moodGardenAPI.login(email, password);
      
      // Store token locally
      await AsyncStorage.setItem('@mood_garden_token', result.token);
      await AsyncStorage.setItem('@mood_garden_user', JSON.stringify(result.user));
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(email: string, username: string, password: string) {
    try {
      const result = await moodGardenAPI.register(email, username, password);
      
      // Store token locally
      await AsyncStorage.setItem('@mood_garden_token', result.token);
      await AsyncStorage.setItem('@mood_garden_user', JSON.stringify(result.user));
      
      return result;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      // Clear stored data
      await AsyncStorage.multiRemove([
        '@mood_garden_token',
        '@mood_garden_user',
        '@mood_garden_offline_moods'
      ]);
      
      // Clear API token
      moodGardenAPI.clearAuthToken();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  async getStoredUser() {
    try {
      const userString = await AsyncStorage.getItem('@mood_garden_user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Failed to get stored user:', error);
      return null;
    }
  }

  async storeOfflineMood(moodData: any) {
    try {
      const existingMoods = await AsyncStorage.getItem('@mood_garden_offline_moods');
      const moods = existingMoods ? JSON.parse(existingMoods) : [];
      
      moods.push({
        ...moodData,
        id: `offline_${Date.now()}`,
        timestamp: new Date().toISOString(),
        synced: false
      });
      
      await AsyncStorage.setItem('@mood_garden_offline_moods', JSON.stringify(moods));
    } catch (error) {
      console.error('Failed to store offline mood:', error);
    }
  }

  async syncOfflineMoods() {
    try {
      const offlineMoodsString = await AsyncStorage.getItem('@mood_garden_offline_moods');
      if (!offlineMoodsString) return;

      const offlineMoods = JSON.parse(offlineMoodsString);
      const unsyncedMoods = offlineMoods.filter((mood: any) => !mood.synced);

      for (const mood of unsyncedMoods) {
        try {
          await moodGardenAPI.createMoodEntry(mood);
          mood.synced = true;
        } catch (error) {
          console.error('Failed to sync mood:', error);
        }
      }

      // Remove synced moods
      const remainingMoods = offlineMoods.filter((mood: any) => !mood.synced);
      await AsyncStorage.setItem('@mood_garden_offline_moods', JSON.stringify(remainingMoods));
      
    } catch (error) {
      console.error('Failed to sync offline moods:', error);
    }
  }

  // Proxy methods for easier access
  get api() {
    return moodGardenAPI;
  }
}

export default MobileAPIService.getInstance();

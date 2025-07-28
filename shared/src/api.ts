import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  MoodEntry,
  GardenState,
  User,
  AICoachResponse,
  MoodAnalyticsResponse,
  GardenStatsResponse,
  ApiResponse
} from './types';

export class MoodGardenAPI {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  clearAuthToken() {
    this.token = null;
  }

  // Auth endpoints
  async register(email: string, username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.api.post('/users/register', { email, username, password });
    const { user, token } = response.data;
    this.setAuthToken(token);
    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.api.post('/users/login', { email, password });
    const { user, token } = response.data;
    this.setAuthToken(token);
    return { user, token };
  }

  // User endpoints
  async getUserProfile(userId: string): Promise<User> {
    const response = await this.api.get(`/users/${userId}/profile`);
    return response.data;
  }

  async updateUserPreferences(userId: string, preferences: Partial<User['preferences']>): Promise<User> {
    const response = await this.api.put(`/users/${userId}/preferences`, { preferences });
    return response.data.user;
  }

  // Mood endpoints
  async createMoodEntry(moodData: {
    userId: string;
    inputType: 'text' | 'emoji' | 'voice';
    rawInput: string;
    context?: any;
  }): Promise<{
    moodEntry: MoodEntry;
    plantSuggestions: any[];
    wellnessTips: string[];
  }> {
    const response = await this.api.post('/moods', moodData);
    return response.data;
  }

  async getMoodHistory(userId: string, limit: number = 30, offset: number = 0): Promise<{
    moods: MoodEntry[];
    pagination: { limit: number; offset: number; total: number };
  }> {
    const response = await this.api.get(`/moods/${userId}?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  async getMoodAnalytics(userId: string, days: number = 30): Promise<MoodAnalyticsResponse> {
    const response = await this.api.get(`/moods/${userId}/analytics?days=${days}`);
    return response.data;
  }

  // Garden endpoints
  async getGardenState(userId: string): Promise<GardenState> {
    const response = await this.api.get(`/garden/${userId}`);
    return response.data;
  }

  async waterPlant(userId: string, plantId: string): Promise<{ plant: any; garden: GardenState }> {
    const response = await this.api.post(`/garden/${userId}/plants/${plantId}/water`);
    return response.data;
  }

  async removePlant(userId: string, plantId: string): Promise<{ garden: GardenState }> {
    const response = await this.api.delete(`/garden/${userId}/plants/${plantId}`);
    return response.data;
  }

  async getGardenStats(userId: string): Promise<GardenStatsResponse> {
    const response = await this.api.get(`/garden/${userId}/stats`);
    return response.data;
  }

  // AI endpoints
  async analyzeMood(input: string, inputType: 'text' | 'emoji' | 'voice'): Promise<any> {
    const response = await this.api.post('/ai/analyze-mood', { input, inputType });
    return response.data;
  }

  async getCoachingTip(userId: string): Promise<AICoachResponse> {
    const response = await this.api.get(`/ai/coaching/${userId}`);
    return response.data;
  }

  async transcribeVoice(audioData: FormData): Promise<{ transcription: string; confidence: number }> {
    const response = await this.api.post('/ai/voice-transcribe', audioData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    const response = await this.api.get('/health');
    return response.data;
  }
}

// Export a default instance for easy use
export const moodGardenAPI = new MoodGardenAPI();

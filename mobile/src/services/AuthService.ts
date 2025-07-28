import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  gardenLevel: number;
  totalMoods: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private static instance: AuthService;
  private listeners: ((state: AuthState) => void)[] = [];
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        this.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        this.setState({ ...this.state, isLoading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.setState({ ...this.state, isLoading: false });
    }
  }

  async signUp(email: string, name: string): Promise<User> {
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      createdAt: new Date(),
      gardenLevel: 1,
      totalMoods: 0,
    };

    await AsyncStorage.setItem('user', JSON.stringify(user));
    this.setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });

    return user;
  }

  async signIn(email: string): Promise<User | null> {
    // Simulate login - in real app, this would call your backend
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.email === email) {
        this.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        return user;
      }
    }
    throw new Error('User not found');
  }

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem('user');
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  async updateUser(updates: Partial<User>): Promise<void> {
    if (!this.state.user) return;
    
    const updatedUser = { ...this.state.user, ...updates };
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    this.setState({ ...this.state, user: updatedUser });
  }

  getState(): AuthState {
    return this.state;
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private setState(newState: AuthState): void {
    this.state = newState;
    this.listeners.forEach(listener => listener(newState));
  }
}

export default AuthService;

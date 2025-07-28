import { useState, useEffect } from 'react';
import { User } from '../../../shared/src';
import MobileAPIService from '../services/MobileAPIService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      await MobileAPIService.initialize();
      const storedUser = await MobileAPIService.getStoredUser();
      
      if (storedUser) {
        setAuthState({
          user: storedUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const result = await MobileAPIService.login(email, password);
      
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return result;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const result = await MobileAPIService.register(email, username, password);
      
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return result;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await MobileAPIService.logout();
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    ...authState,
    login,
    register,
    logout,
    refreshAuth: checkAuthStatus,
  };
}

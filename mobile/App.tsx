import React, { useState, useEffect } from 'react';
import AuthScreen from './src/screens/AuthScreen';
import MagicalGarden3DMobileIntegrated from './src/components/MagicalGarden3DMobileIntegrated';
import AuthService, { AuthState, User } from './src/services/AuthService';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const authService = AuthService.getInstance();

  useEffect(() => {
    // Initialize auth service and subscribe to changes
    const initAuth = async () => {
      await authService.initialize();
      setAuthState(authService.getState());
    };

    initAuth();

    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newState) => {
      setAuthState(newState);
    });

    return unsubscribe;
  }, []);

  const handleAuthenticated = () => {
    setAuthState(authService.getState());
  };

  if (authState.isLoading) {
    return null; // Loading screen
  }

  if (!authState.isAuthenticated || !authState.user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return <MagicalGarden3DMobileIntegrated user={authState.user} />;
}

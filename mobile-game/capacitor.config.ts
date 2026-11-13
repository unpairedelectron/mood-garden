import type { CapacitorConfig } from '@capacitor/cli';

// The native app is the same game, bundled from dist/ into an iOS and an Android shell.
// Change appId to your own reverse-DNS id before submitting to the stores.
const config: CapacitorConfig = {
  appId: 'com.moodgarden.grove',
  appName: 'Mood Garden',
  webDir: 'dist',
  backgroundColor: '#0e1622',
  ios: {
    contentInset: 'never',
    // WebGL games want the full screen and no rubber-banding.
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: '#0e1622',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0e1622',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_leaf',
      iconColor: '#9be84a',
    },
  },
};

export default config;

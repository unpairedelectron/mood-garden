// Expo shell for Mood Garden. The game itself is the WebGL app in ../mobile-game;
// this wraps it in a full-screen web view so it can be tested in Expo Go.
//
// By default it loads the game from the same computer that is running Expo
// (port 5173, the Vite dev server). Set EXPO_PUBLIC_GAME_URL to point it at a
// hosted build instead.

import Constants from 'expo-constants';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';

function defaultUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GAME_URL;
  if (fromEnv) return fromEnv;
  // hostUri looks like "192.168.1.20:8081": the machine serving this app.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:5173/` : 'http://localhost:5173/';
}

export default function App() {
  useKeepAwake();
  const initial = useMemo(defaultUrl, []);
  const [url, setUrl] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (failed) {
    return (
      <View style={styles.help}>
        <StatusBar style="light" />
        <Text style={styles.title}>Can’t reach the game</Text>
        <Text style={styles.body}>
          {failed}
          {'\n\n'}On your computer, in the mobile-game folder, run “npm run dev”. Keep the phone on the same Wi‑Fi,
          then try again. If the address below is wrong, use the “Network” address that command prints.
        </Text>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.x.x:5173/"
          placeholderTextColor="#7d8794"
        />
        <Pressable
          style={styles.button}
          onPress={() => {
            setUrl(draft.trim());
            setFailed(null);
            setAttempt((n) => n + 1);
          }}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <WebView
        key={`${url}#${attempt}`}
        source={{ uri: url }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        contentInsetAdjustmentBehavior="never"
        setBuiltInZoomControls={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color="#f3d9a4" size="large" />
            <Text style={styles.loadingText}>Opening the grove…</Text>
          </View>
        )}
        onError={(e) => setFailed(`${e.nativeEvent.description || 'The page did not load'} (${url})`)}
        onHttpError={(e) => setFailed(`The server answered ${e.nativeEvent.statusCode} (${url})`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e1622' },
  web: { flex: 1, backgroundColor: '#0e1622' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0e1622', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#f7f1e6', fontSize: 15 },
  help: { flex: 1, backgroundColor: '#0e1622', padding: 28, justifyContent: 'center', gap: 16 },
  title: { color: '#f7f1e6', fontSize: 28, fontWeight: '600' },
  body: { color: 'rgba(247,241,230,0.72)', fontSize: 15, lineHeight: 22 },
  input: { borderWidth: 1, borderColor: 'rgba(247,241,230,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#f7f1e6', fontSize: 16 },
  button: { backgroundColor: '#f3d9a4', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#24190a', fontSize: 16, fontWeight: '700' },
});

import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlmanacScreen } from './src/screens/AlmanacScreen';
import { CalmScreen } from './src/screens/CalmScreen';
import { CheckInScreen } from './src/screens/CheckInScreen';
import { GardenScreen } from './src/screens/GardenScreen';
import { JourneyScreen } from './src/screens/JourneyScreen';
import { PlusScreen } from './src/screens/PlusScreen';
import { StoreProvider, useStore } from './src/state/store';
import { C, bump, tap } from './src/theme';

type Tab = 'garden' | 'almanac' | 'plant' | 'calm' | 'journey';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'garden', icon: '🏡', label: 'Garden' },
  { id: 'almanac', icon: '📖', label: 'Almanac' },
  { id: 'plant', icon: '🌱', label: 'Plant' },
  { id: 'calm', icon: '🫧', label: 'Calm' },
  { id: 'journey', icon: '📈', label: 'Journey' },
];

function Onboarding() {
  const { dispatch } = useStore();
  return (
    <View style={styles.onboard}>
      <Text style={{ fontSize: 90 }}>🌱</Text>
      <Text style={styles.onTitle}>Every feeling grows something.</Text>
      <Text style={styles.onBody}>Even the hard ones. Sad days grow rain lilies. Angry days grow ember cacti. Mixed days grow rare hybrids.</Text>
      <Text style={styles.onBody}>Check in once a day. Your garden blooms. Nothing ever dies.</Text>
      <Pressable style={styles.onBtn} onPress={() => { bump(); dispatch({ type: 'onboard' }); }}>
        <Text style={styles.onBtnText}>Plant my first seed</Text>
      </Pressable>
      <Text style={styles.onFine}>Private by design: everything stays on this phone.</Text>
    </View>
  );
}

function Shell() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('garden');
  const [plus, setPlus] = useState(false);
  const [checkInKey, setCheckInKey] = useState(0);

  // Brand-new gardens open straight onto the first check-in.
  const fresh = state.loaded && state.onboarded && state.entries.length === 0;
  useEffect(() => {
    if (fresh) setTab('plant');
  }, [fresh]);

  if (!state.loaded) return <View style={styles.center}><ActivityIndicator color={C.leaf} /></View>;
  if (!state.onboarded) return <Onboarding />;
  if (plus) return <PlusScreen onClose={() => setPlus(false)} />;

  const current = tab;
  const openPlus = () => setPlus(true);

  const go = (t: Tab) => {
    tap();
    if (t === 'plant') setCheckInKey(k => k + 1);
    setTab(t);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {current === 'garden' && <GardenScreen onPlant={() => go('plant')} onPlus={openPlus} />}
      {current === 'plant' && <CheckInScreen key={checkInKey} onDone={() => setTab('garden')} />}
      {current === 'almanac' && <AlmanacScreen onPlus={openPlus} />}
      {current === 'calm' && <CalmScreen />}
      {current === 'journey' && <JourneyScreen onPlus={openPlus} />}

      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.map(t => {
          const on = current === t.id;
          const center = t.id === 'plant';
          return (
            <Pressable key={t.id} onPress={() => go(t.id)} style={[styles.tab, center && styles.tabCenter]}>
              <Text style={{ fontSize: center ? 30 : 22, opacity: on || center ? 1 : 0.55 }}>{t.icon}</Text>
              {!center && <Text style={[styles.tabLabel, on && { color: C.leafDark, fontWeight: '800' }]}>{t.label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  tabs: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 28, paddingTop: 10, alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  tab: { alignItems: 'center', minWidth: 56 },
  tabCenter: { backgroundColor: C.leafDark, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', marginTop: -30, borderWidth: 4, borderColor: '#fff' },
  tabLabel: { fontSize: 11, color: C.soft, marginTop: 2 },
  onboard: { flex: 1, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', padding: 32 },
  onTitle: { fontSize: 28, fontWeight: '900', color: C.ink, textAlign: 'center', marginTop: 12 },
  onBody: { fontSize: 16, color: C.soft, textAlign: 'center', marginTop: 12, lineHeight: 23 },
  onBtn: { marginTop: 32, backgroundColor: C.leafDark, paddingHorizontal: 36, paddingVertical: 18, borderRadius: 30 },
  onBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  onFine: { fontSize: 12, color: C.soft, marginTop: 14 },
});

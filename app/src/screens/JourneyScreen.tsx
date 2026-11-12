import React from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ReminderPicker } from '../components/ReminderPicker';
import { FEELINGS, feelingById } from '../data/species';
import { dayKey, streakOf, useStore } from '../state/store';
import { C } from '../theme';

export function JourneyScreen({ onPlus }: { onPlus: () => void }) {
  const { state, dispatch } = useStore();

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = dayKey(d);
    const es = state.entries.filter(e => e.day === key);
    return { key, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), emoji: es.length ? feelingById(es[es.length - 1].feelings[0]).emoji : null };
  });

  const monthAgo = Date.now() - 30 * 864e5;
  const counts = FEELINGS.map(f => ({
    f,
    n: state.entries.filter(e => e.at > monthAgo && e.feelings.includes(f.id)).length,
  })).filter(c => c.n > 0).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...counts.map(c => c.n));

  const confirmReset = () => {
    const go = () => dispatch({ type: 'reset' });
    if (Platform.OS === 'web') { go(); return; }
    Alert.alert('Start a new garden?', 'This clears every plant and note on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Your journey</Text>
      <Text style={styles.sub}>{state.entries.length} feelings planted · {streakOf(state.entries)} day streak</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last 14 days</Text>
        <View style={styles.strip}>
          {days.map(d => (
            <View key={d.key} style={styles.day}>
              <Text style={{ fontSize: 18, opacity: d.emoji ? 1 : 0.25 }}>{d.emoji ?? '·'}</Text>
              <Text style={styles.dayLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.gentle}>Missed days don't hurt your garden. It just waits for you.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>This month's weather</Text>
        {counts.length === 0 && <Text style={styles.gentle}>Plant a few feelings to see patterns here.</Text>}
        {counts.map(({ f, n }) => (
          <View key={f.id} style={styles.barRow}>
            <Text style={styles.barLabel}>{f.emoji} {f.label}</Text>
            <View style={styles.barTrack}><View style={[styles.bar, { width: `${(n / max) * 100}%`, backgroundColor: f.color }]} /></View>
            <Text style={styles.barN}>{n}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notes from the soil</Text>
        {state.entries.filter(e => e.note).slice(-10).reverse().map(e => (
          <View key={e.id} style={styles.note}>
            <Text style={styles.noteMeta}>{e.feelings.map(f => feelingById(f).emoji).join(' ')} · {new Date(e.at).toLocaleDateString()}</Text>
            <Text style={styles.noteText}>{e.note}</Text>
          </View>
        ))}
        {!state.entries.some(e => e.note) && <Text style={styles.gentle}>Notes you tuck into seeds appear here.</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily reminder</Text>
        <ReminderPicker />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        <Pressable onPress={onPlus}><Text style={styles.link}>🌸 Garden+ {state.plus ? '(active preview)' : ''}</Text></Pressable>
        <Pressable onPress={() => Linking.openURL('https://findahelpline.com')}>
          <Text style={styles.link}>💛 Need to talk to someone now? Find a free helpline</Text>
        </Pressable>
        <Pressable onPress={confirmReset}><Text style={[styles.link, { color: '#C62828' }]}>Start a new garden</Text></Pressable>
        <Text style={styles.disclaimer}>MoodGarden is a self-care journal, not a medical or therapy service.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 64, paddingBottom: 140 },
  title: { fontSize: 28, fontWeight: '900', color: C.ink },
  sub: { color: C.soft, marginTop: 4, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 12, borderWidth: 1, borderColor: C.line },
  cardTitle: { fontWeight: '800', color: C.ink, fontSize: 16, marginBottom: 10 },
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', width: `${100 / 14}%` },
  dayLabel: { fontSize: 10, color: C.soft, marginTop: 2 },
  gentle: { color: C.soft, fontSize: 13, marginTop: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  barLabel: { width: 120, color: C.ink, fontSize: 13 },
  barTrack: { flex: 1, height: 12, backgroundColor: '#F3EEE2', borderRadius: 8, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 8 },
  barN: { width: 28, textAlign: 'right', color: C.soft },
  note: { borderLeftWidth: 3, borderLeftColor: C.leaf, paddingLeft: 10, marginVertical: 6 },
  noteMeta: { fontSize: 12, color: C.soft },
  noteText: { color: C.ink, fontSize: 15, marginTop: 2 },
  link: { color: C.leafDark, fontWeight: '700', paddingVertical: 8 },
  disclaimer: { fontSize: 11, color: C.soft, marginTop: 8 },
});

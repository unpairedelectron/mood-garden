import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FEELINGS, FeelingId, feelingById, speciesById } from '../data/species';
import { Harvest, useStore } from '../state/store';
import { C, bump, cheer, rarityColor, tap } from '../theme';

const PROMPTS = [
  "What's the weather like inside you?",
  'How are you, honestly?',
  'What did today feel like?',
  "What's growing in you right now?",
];

export function CheckInScreen({ onDone }: { onDone: () => void }) {
  const { checkIn } = useStore();
  const [picked, setPicked] = useState<FeelingId[]>([]);
  const [note, setNote] = useState('');
  const [harvest, setHarvest] = useState<Harvest | null>(null);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  const toggle = (id: FeelingId) => {
    tap();
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]));
  };

  const plant = () => {
    if (!picked.length) return;
    cheer();
    setHarvest(checkIn(picked, note));
  };

  if (harvest) {
    return <Celebration harvest={harvest} whisper={feelingById(picked[0]).whisper} onDone={onDone} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{prompt}</Text>
        <Text style={styles.sub}>Pick one, or two if it's mixed. Mixed days can grow rare hybrids 🌈</Text>

        <View style={styles.grid}>
          {FEELINGS.map(f => {
            const on = picked.includes(f.id);
            return (
              <Pressable key={f.id} onPress={() => toggle(f.id)}
                style={[styles.chip, { borderColor: on ? f.color : C.line, backgroundColor: on ? f.color + '33' : '#fff' }]}>
                <Text style={{ fontSize: 34, transform: [{ scale: on ? 1.15 : 1 }] }}>{f.emoji}</Text>
                <Text style={[styles.chipLabel, on && { fontWeight: '800' }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Tuck a little note into the seed (optional)"
          placeholderTextColor={C.soft}
          multiline
          maxLength={280}
          style={styles.note}
        />
        <Text style={styles.private}>🔒 Stays on your phone. No account, no cloud.</Text>

        <Pressable onPress={plant} disabled={!picked.length} style={[styles.plant, !picked.length && { opacity: 0.4 }]}>
          <Text style={styles.plantText}>
            {picked.length ? `Plant ${picked.map(id => feelingById(id).emoji).join(' + ')}` : 'Choose a feeling'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Celebration({ harvest, whisper, onDone }: { harvest: Harvest; whisper: string; onDone: () => void }) {
  const drop = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(drop, { toValue: 1, duration: 650, easing: Easing.bounce, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(grow, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ]).start(() => bump());
  }, [drop, grow, burst]);

  const special = harvest.planted.filter(p => speciesById(p.species).rarity !== 'common');
  const hero = speciesById((special[0] ?? harvest.planted[0]).species);

  return (
    <View style={[styles.celebrate, { backgroundColor: hero.color + '22' }]}>
      <View style={styles.stage}>
        {['✨', '🌟', '💫', '✨', '🌟', '💫'].map((s, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <Animated.Text key={i} style={{
              position: 'absolute', fontSize: 22,
              opacity: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 110] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 110] }) },
              ],
            }}>{s}</Animated.Text>
          );
        })}
        <Animated.Text style={{
          fontSize: 28, position: 'absolute',
          opacity: grow.interpolate({ inputRange: [0, 0.2], outputRange: [1, 0], extrapolate: 'clamp' }),
          transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-220, 40] }) }],
        }}>🌰</Animated.Text>
        <Animated.Text style={{ fontSize: 110, transform: [{ scale: grow }] }}>{hero.emoji}</Animated.Text>
        <View style={styles.dirt} />
      </View>

      {special.length > 0 && (
        <Text style={[styles.badge, { backgroundColor: rarityColor[hero.rarity] }]}>
          {hero.rarity === 'legendary' ? '👑 LEGENDARY!' : '✨ RARE HYBRID!'}
        </Text>
      )}
      <Text style={styles.title}>You planted {harvest.planted.map(p => speciesById(p.species).name).join(', ')}</Text>
      {harvest.planted.some(p => p.isNew) && <Text style={styles.newSpecies}>📖 New species added to your Almanac</Text>}
      <Text style={styles.whisper}>{whisper}</Text>

      <View style={styles.rewards}>
        <Text style={styles.reward}>💧 +{harvest.dewEarned} dew</Text>
        {harvest.bloomed > 0 && <Text style={styles.reward}>🌼 {harvest.bloomed} plant{harvest.bloomed > 1 ? 's' : ''} bloomed!</Text>}
      </View>

      <Pressable style={styles.plant} onPress={() => { tap(); onDone(); }}>
        <Text style={styles.plantText}>See my garden</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 64, paddingBottom: 140 },
  title: { fontSize: 26, fontWeight: '800', color: C.ink, textAlign: 'center' },
  sub: { fontSize: 14, color: C.soft, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: { width: '30%', aspectRatio: 1, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { marginTop: 6, color: C.ink, fontSize: 13 },
  note: { marginTop: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, minHeight: 80, fontSize: 16, color: C.ink, textAlignVertical: 'top' },
  private: { fontSize: 12, color: C.soft, marginTop: 6, textAlign: 'center' },
  plant: { marginTop: 20, backgroundColor: C.leafDark, borderRadius: 26, paddingVertical: 18, alignItems: 'center', alignSelf: 'stretch' },
  plantText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  celebrate: { flex: 1, padding: 24, paddingTop: 60, alignItems: 'center', justifyContent: 'center' },
  stage: { height: 240, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  dirt: { width: 140, height: 18, borderRadius: 20, backgroundColor: '#8D6E63', marginTop: -10 },
  badge: { color: '#fff', fontWeight: '900', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, overflow: 'hidden', marginTop: 16, letterSpacing: 1 },
  newSpecies: { marginTop: 8, color: C.rare, fontWeight: '700' },
  whisper: { fontSize: 16, color: C.soft, textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 8 },
  rewards: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  reward: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, fontWeight: '700', color: C.ink, overflow: 'hidden' },
});

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Rarity, SPECIES } from '../data/species';
import { useStore } from '../state/store';
import { C, rarityColor } from '../theme';

const SECTIONS: { rarity: Rarity; title: string; blurb: string }[] = [
  { rarity: 'common', title: 'Feeling Flowers', blurb: 'One for every feeling. All of them belong here.' },
  { rarity: 'rare', title: 'Hybrids', blurb: 'Grow when two feelings share a day.' },
  { rarity: 'legendary', title: 'Legendaries', blurb: 'Gifts for showing up.' },
];

export function AlmanacScreen({ onPlus }: { onPlus: () => void }) {
  const { state } = useStore();
  const found = new Set(state.discovered);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Seed Almanac</Text>
      <Text style={styles.progress}>{found.size} / {SPECIES.length} discovered</Text>
      <View style={styles.bar}><View style={[styles.fill, { width: `${(found.size / SPECIES.length) * 100}%` }]} /></View>

      {SECTIONS.map(sec => (
        <View key={sec.rarity}>
          <Text style={[styles.section, { color: rarityColor[sec.rarity] }]}>{sec.title}</Text>
          <Text style={styles.blurb}>{sec.blurb}</Text>
          <View style={styles.grid}>
            {SPECIES.filter(s => s.rarity === sec.rarity).map(s => {
              const has = found.has(s.id);
              return (
                <View key={s.id} style={[styles.card, has && { borderColor: s.color }]}>
                  <Text style={[styles.emoji, !has && styles.silhouette]}>{has ? s.emoji : '🌰'}</Text>
                  <Text style={styles.name} numberOfLines={2}>{has ? s.name : '???'}</Text>
                  <Text style={styles.hint} numberOfLines={2}>{has ? '' : s.hint}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {!state.plus && (
        <Pressable style={styles.plus} onPress={onPlus}>
          <Text style={styles.plusTitle}>🌸 Garden+</Text>
          <Text style={styles.plusBody}>Seasonal seed packs, new biomes and cozy decorations.</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 64, paddingBottom: 140 },
  title: { fontSize: 28, fontWeight: '900', color: C.ink },
  progress: { color: C.soft, marginTop: 4 },
  bar: { height: 10, borderRadius: 10, backgroundColor: C.line, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.leaf, borderRadius: 10 },
  section: { fontSize: 18, fontWeight: '900', marginTop: 24 },
  blurb: { color: C.soft, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '30%', flexGrow: 1, maxWidth: '33%', backgroundColor: '#fff', borderRadius: 18, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: C.line, minHeight: 120 },
  emoji: { fontSize: 40 },
  silhouette: { opacity: 0.35 },
  name: { fontWeight: '700', color: C.ink, textAlign: 'center', marginTop: 4, fontSize: 12 },
  hint: { color: C.soft, textAlign: 'center', fontSize: 11, marginTop: 2 },
  plus: { marginTop: 28, backgroundColor: '#FCE4EC', borderRadius: 20, padding: 18 },
  plusTitle: { fontSize: 18, fontWeight: '900', color: '#AD1457' },
  plusBody: { color: '#6A1B4D', marginTop: 4 },
});

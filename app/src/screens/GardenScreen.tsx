import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { PlantView } from '../components/PlantView';
import { BIOMES, DECORATIONS, feelingById, speciesById } from '../data/species';
import { BLOOM_AT, Plant, stageOf, streakOf, useStore, weatherOf } from '../state/store';
import { C, bump, rarityColor, tap } from '../theme';

function skyFor(hour: number): [string, string] {
  if (hour < 5 || hour >= 21) return ['#141E46', '#3A3F7A'];
  if (hour < 8) return ['#FFB88C', '#FFE5C4'];
  if (hour < 17) return ['#7EC8F2', '#D7F0FF'];
  return ['#FF9A8B', '#FFD3A5'];
}

function Drift({ children, from, to, duration, top, delay = 0 }: { children: React.ReactNode; from: number; to: number; duration: number; top: number; delay?: number }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [x, duration, delay]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) }] }}>
      {children}
    </Animated.View>
  );
}

function Bob({ children, style }: { children: React.ReactNode; style: object }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, style, { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export function GardenScreen({ onPlant, onPlus }: { onPlant: () => void; onPlus: () => void }) {
  const { state, dispatch } = useStore();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<Plant | null>(null);
  const [shop, setShop] = useState(false);

  const hour = new Date().getHours();
  const night = hour < 5 || hour >= 21;
  const weather = weatherOf(state.entries);
  const streak = streakOf(state.entries);
  const blooms = state.plants.filter(p => stageOf(p) >= BLOOM_AT).length;
  const biome = BIOMES.find(b => b.id === state.biome) ?? BIOMES[0];

  const critters = useMemo(() => {
    const list: { emoji: string; why: string }[] = [];
    if (blooms >= 3) list.push({ emoji: '🐝', why: '3 blooms' });
    if (blooms >= 6) list.push({ emoji: '🦋', why: '6 blooms' });
    if (streak >= 3) list.push({ emoji: '🐞', why: '3-day streak' });
    if (state.plants.length >= 12) list.push({ emoji: '🐦', why: '12 plants' });
    if (state.calmSessions >= 3) list.push({ emoji: '🐢', why: '3 calm sessions' });
    if (night && state.plants.length > 0) list.push({ emoji: '✨', why: 'night time' });
    return list;
  }, [blooms, streak, state.plants.length, state.calmSessions, night]);

  const today = new Date().toDateString();
  const checkedToday = state.entries.some(e => new Date(e.at).toDateString() === today);

  // Interleave decorations among plants so the garden feels hand-placed.
  const items: Array<{ kind: 'plant'; p: Plant } | { kind: 'deco'; emoji: string; id: string }> = [];
  const decos = [...state.decorations];
  state.plants.forEach((p, i) => {
    items.push({ kind: 'plant', p });
    if (i % 3 === 1 && decos.length) {
      const d = decos.shift()!;
      items.push({ kind: 'deco', emoji: DECORATIONS.find(x => x.id === d.deco)?.emoji ?? '🪨', id: d.id });
    }
  });
  decos.forEach(d => items.push({ kind: 'deco', emoji: DECORATIONS.find(x => x.id === d.deco)?.emoji ?? '🪨', id: d.id }));

  const selSpecies = selected ? speciesById(selected.species) : null;
  const selEntry = selected ? state.entries.find(e => e.id === selected.entryId) : null;

  return (
    <View style={{ flex: 1, backgroundColor: biome.ground[1] }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={skyFor(hour)} style={styles.sky}>
          <View style={styles.hud}>
            <Stat label="streak" value={`${streak}`} icon="🔥" />
            <Stat label="dew" value={`${state.dew}`} icon="💧" />
            <Stat label="blooms" value={`${blooms}`} icon="🌼" />
          </View>
          <Text style={[styles.celestial, { right: 24 }]}>{night ? '🌙' : weather === 'rain' ? '🌦️' : '☀️'}</Text>
          {weather !== 'sunny' && (
            <>
              <Drift from={-80} to={width + 40} duration={38000} top={70}><Text style={{ fontSize: 42 }}>☁️</Text></Drift>
              <Drift from={-120} to={width + 40} duration={52000} delay={4000} top={110}><Text style={{ fontSize: 30 }}>☁️</Text></Drift>
            </>
          )}
          {weather === 'rain' && (
            <Text style={styles.rainNote}>Gentle rain today. Rain lilies love this.</Text>
          )}
          {critters.map((c, i) => (
            <Bob key={c.emoji} style={{ top: 120 + (i % 2) * 36, left: 30 + ((i * 67) % (width - 80)) }}>
              <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
            </Bob>
          ))}
        </LinearGradient>

        <LinearGradient colors={biome.ground} style={styles.ground}>
          {state.plants.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>🕳️</Text>
              <Text style={styles.emptyTitle}>An empty patch of soil</Text>
              <Text style={styles.emptyBody}>Tell it how you feel and something will grow.</Text>
            </View>
          ) : (
            <View style={styles.bed}>
              {items.map(it =>
                it.kind === 'plant' ? (
                  <View key={it.p.id} style={{ marginTop: it.p.x * 18 }}>
                    <PlantView plant={it.p} onPress={() => setSelected(it.p)} />
                  </View>
                ) : (
                  <View key={it.id} style={styles.deco}><Text style={{ fontSize: 40 }}>{it.emoji}</Text></View>
                ),
              )}
            </View>
          )}

          {!checkedToday && (
            <Pressable style={styles.cta} onPress={() => { bump(); onPlant(); }}>
              <Text style={styles.ctaText}>🌱 Plant today's feeling</Text>
              {state.plants.some(p => stageOf(p) < BLOOM_AT) && (
                <Text style={styles.ctaSub}>Checking in waters your sprouts</Text>
              )}
            </Pressable>
          )}

          <Pressable style={styles.decorate} onPress={() => { tap(); setShop(true); }}>
            <Text style={styles.decorateText}>🎨 Decorate</Text>
          </Pressable>
          {critters.length > 0 && (
            <Text style={styles.visitors}>Visitors: {critters.map(c => `${c.emoji} (${c.why})`).join('  ')}</Text>
          )}
        </LinearGradient>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.scrim} onPress={() => setSelected(null)}>
          {selected && selSpecies && (
            <Pressable style={styles.sheet}>
              <Text style={{ fontSize: 64, textAlign: 'center' }}>{stageOf(selected) >= BLOOM_AT ? selSpecies.emoji : '🌱'}</Text>
              <Text style={styles.sheetTitle}>{selSpecies.name}</Text>
              <Text style={[styles.rarity, { color: rarityColor[selSpecies.rarity] }]}>{selSpecies.rarity.toUpperCase()}</Text>
              {stageOf(selected) < BLOOM_AT ? (
                <Text style={styles.sheetBody}>Still growing. Blooms in {BLOOM_AT - stageOf(selected)} more check-in day{BLOOM_AT - stageOf(selected) > 1 ? 's' : ''}.</Text>
              ) : (
                <Text style={styles.sheetBody}>{selSpecies.lore}</Text>
              )}
              {selEntry && (
                <View style={styles.memory}>
                  <Text style={styles.memoryLabel}>
                    🗓 Planted {new Date(selEntry.at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} feeling {selEntry.feelings.map(f => feelingById(f).label.toLowerCase()).join(' + ')}
                  </Text>
                  {!!selEntry.note && <Text style={styles.memoryNote}>“{selEntry.note}”</Text>}
                </View>
              )}
            </Pressable>
          )}
        </Pressable>
      </Modal>

      <Modal visible={shop} transparent animationType="slide" onRequestClose={() => setShop(false)}>
        <Pressable style={styles.scrim} onPress={() => setShop(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Decorate · 💧 {state.dew}</Text>
            <Text style={styles.section}>Garden style</Text>
            <View style={styles.row}>
              {BIOMES.map(b => {
                const locked = b.plus && !state.plus;
                const active = state.biome === b.id;
                return (
                  <Pressable key={b.id} onPress={() => { tap(); locked ? (setShop(false), onPlus()) : dispatch({ type: 'biome', biome: b.id }); }}
                    style={[styles.biome, active && styles.active]}>
                    <LinearGradient colors={b.ground} style={styles.swatch} />
                    <Text style={styles.small}>{locked ? '🔒 ' : ''}{b.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.section}>Shop</Text>
            <View style={styles.row}>
              {DECORATIONS.map(d => {
                const locked = d.plus && !state.plus;
                const afford = state.dew >= d.cost;
                return (
                  <Pressable key={d.id}
                    onPress={() => {
                      if (locked) { setShop(false); onPlus(); return; }
                      if (afford) { bump(); dispatch({ type: 'buy', deco: d.id }); }
                    }}
                    style={[styles.item, !afford && !locked && { opacity: 0.45 }]}>
                    <Text style={{ fontSize: 30 }}>{d.emoji}</Text>
                    <Text style={styles.small}>{d.name}</Text>
                    <Text style={[styles.small, { fontWeight: '700' }]}>{locked ? '🔒 Garden+' : `💧 ${d.cost}`}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>Earn dew by checking in, blooming plants, discovering species and calm breaths.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{icon} {value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { height: 230, paddingTop: 52 },
  hud: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  stat: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 10, color: C.soft, textTransform: 'uppercase', letterSpacing: 1 },
  celestial: { position: 'absolute', top: 48, fontSize: 44 },
  rainNote: { position: 'absolute', bottom: 12, left: 16, color: '#fff', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4 },
  ground: { minHeight: 520, borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -28, paddingTop: 24, paddingHorizontal: 8 },
  bed: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', rowGap: 6 },
  deco: { width: 58, height: 66, alignItems: 'center', justifyContent: 'flex-end' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 8 },
  emptyBody: { color: '#fff', opacity: 0.9, marginTop: 4 },
  cta: { marginTop: 24, marginHorizontal: 24, backgroundColor: '#fff', borderRadius: 24, paddingVertical: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
  ctaText: { fontSize: 18, fontWeight: '800', color: C.leafDark },
  ctaSub: { fontSize: 12, color: C.soft, marginTop: 2 },
  decorate: { alignSelf: 'center', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.35)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  decorateText: { color: '#fff', fontWeight: '800' },
  visitors: { color: '#fff', textAlign: 'center', marginTop: 14, opacity: 0.9, fontSize: 12, paddingHorizontal: 16 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.ink, textAlign: 'center' },
  rarity: { textAlign: 'center', fontWeight: '800', letterSpacing: 2, fontSize: 11, marginTop: 2 },
  sheetBody: { fontSize: 15, color: C.soft, textAlign: 'center', marginTop: 10, lineHeight: 21 },
  memory: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 16, borderWidth: 1, borderColor: C.line },
  memoryLabel: { color: C.soft, fontSize: 13 },
  memoryNote: { color: C.ink, fontSize: 16, marginTop: 6, fontStyle: 'italic' },
  section: { fontWeight: '800', color: C.ink, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  biome: { alignItems: 'center', padding: 6, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: C.leaf },
  swatch: { width: 64, height: 40, borderRadius: 10 },
  item: { width: '30%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 14, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  small: { fontSize: 11, color: C.ink, textAlign: 'center' },
  hint: { fontSize: 12, color: C.soft, textAlign: 'center', marginTop: 14 },
});

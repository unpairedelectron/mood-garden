import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../state/store';
import { C, cheer } from '../theme';

const PERKS = [
  ['🌸', '3 extra garden biomes', 'Sakura Hill, Desert Bloom, Moon Garden'],
  ['🏰', 'Cozy decoration set', 'Tea corner, stargazing tent, garden gate, a castle'],
  ['🎁', 'Monthly seasonal seed pack', 'Limited species that only grow that month'],
  ['📤', 'Garden postcards & export', 'Share a snapshot or back up your journal'],
];

/**
 * Paywall. Google Play Billing is NOT wired yet; see docs/PLAY_STORE_PLAN.md.
 * Until then, the button toggles a local preview so the full experience can be tested.
 */
export function PlusScreen({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  return (
    <LinearGradient colors={['#FCE4EC', '#FFF8EC']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable onPress={onClose} style={styles.close}><Text style={{ fontSize: 22 }}>✕</Text></Pressable>
        <Text style={{ fontSize: 72, textAlign: 'center' }}>🌸</Text>
        <Text style={styles.title}>Garden+</Text>
        <Text style={styles.sub}>The core garden is free forever. Garden+ adds more beauty, never more pressure.</Text>
        {PERKS.map(([e, t, d]) => (
          <View key={t} style={styles.perk}>
            <Text style={{ fontSize: 30 }}>{e}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.perkTitle}>{t}</Text>
              <Text style={styles.perkBody}>{d}</Text>
            </View>
          </View>
        ))}
        <View style={styles.prices}>
          <View style={[styles.price, styles.best]}>
            <Text style={styles.priceTop}>Yearly · best value</Text>
            <Text style={styles.priceBig}>$19.99</Text>
            <Text style={styles.priceSmall}>7-day free trial</Text>
          </View>
          <View style={styles.price}>
            <Text style={styles.priceTop}>Monthly</Text>
            <Text style={styles.priceBig}>$2.99</Text>
            <Text style={styles.priceSmall}>cancel anytime</Text>
          </View>
        </View>
        <Pressable style={styles.btn} onPress={() => { cheer(); dispatch({ type: 'setPlus', plus: !state.plus }); }}>
          <Text style={styles.btnText}>{state.plus ? 'End preview' : 'Preview Garden+ (billing coming soon)'}</Text>
        </Pressable>
        <Text style={styles.fine}>Prices are placeholders until Play Billing is connected.</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 56, paddingBottom: 60 },
  close: { position: 'absolute', top: 48, right: 20, padding: 8, zIndex: 2 },
  title: { fontSize: 32, fontWeight: '900', color: '#AD1457', textAlign: 'center' },
  sub: { color: C.soft, textAlign: 'center', marginTop: 6, marginBottom: 18, fontSize: 15 },
  perk: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10 },
  perkTitle: { fontWeight: '800', color: C.ink },
  perkBody: { color: C.soft, fontSize: 13 },
  prices: { flexDirection: 'row', gap: 10, marginTop: 10 },
  price: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: C.line },
  best: { borderColor: '#EC407A' },
  priceTop: { fontSize: 12, color: C.soft },
  priceBig: { fontSize: 26, fontWeight: '900', color: C.ink },
  priceSmall: { fontSize: 12, color: C.soft },
  btn: { marginTop: 18, backgroundColor: '#EC407A', borderRadius: 26, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  fine: { fontSize: 11, color: C.soft, textAlign: 'center', marginTop: 8 },
});

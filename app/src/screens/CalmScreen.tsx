import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../state/store';
import { C, cheer, tap } from '../theme';

const PHASES = [
  { label: 'Breathe in', ms: 4000, to: 1 },
  { label: 'Hold', ms: 4000, to: 1 },
  { label: 'Breathe out', ms: 6000, to: 0 },
];
const ROUNDS = 3;

/** A one-minute breathing bloom. The flower opens as you breathe in. */
export function CalmScreen() {
  const { state, dispatch } = useStore();
  const scale = useRef(new Animated.Value(0)).current;
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let step = 0;
    const next = () => {
      if (cancelled) return;
      const r = Math.floor(step / PHASES.length);
      if (r >= ROUNDS) {
        setRunning(false);
        setDone(true);
        cheer();
        dispatch({ type: 'calmDone' });
        return;
      }
      const p = PHASES[step % PHASES.length];
      setPhase(step % PHASES.length);
      setRound(r);
      tap();
      Animated.timing(scale, { toValue: p.to, duration: p.ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        step++;
        next();
      });
    };
    next();
    return () => {
      cancelled = true;
      scale.stopAnimation();
    };
  }, [running, scale, dispatch]);

  const petals = Array.from({ length: 8 });
  const s = scale.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.1] });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Calm corner</Text>
      <Text style={styles.sub}>{running ? `${PHASES[phase].label}… (${round + 1}/${ROUNDS})` : done ? 'Lovely. +5 dew for your garden 💧' : 'Three slow breaths. About a minute.'}</Text>

      <View style={styles.stage}>
        <Animated.View style={[styles.flower, { transform: [{ scale: s }] }]}>
          {petals.map((_, i) => (
            <View key={i} style={[styles.petal, { transform: [{ rotate: `${i * 45}deg` }, { translateY: -60 }] }]} />
          ))}
          <View style={styles.center} />
        </Animated.View>
      </View>

      {!running && (
        <Pressable style={styles.btn} onPress={() => { setDone(false); setRunning(true); }}>
          <Text style={styles.btnText}>{done ? 'Again' : 'Begin'}</Text>
        </Pressable>
      )}
      <Text style={styles.count}>🐢 {state.calmSessions} calm sessions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#EAF6F6', alignItems: 'center', paddingTop: 64, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '900', color: C.ink },
  sub: { color: C.soft, marginTop: 6, fontSize: 16, textAlign: 'center', minHeight: 24 },
  stage: { height: 340, width: '100%', alignItems: 'center', justifyContent: 'center' },
  flower: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  petal: { position: 'absolute', width: 70, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,143,171,0.55)' },
  center: { width: 70, height: 70, borderRadius: 40, backgroundColor: '#FFD23F' },
  btn: { backgroundColor: '#26A69A', paddingHorizontal: 48, paddingVertical: 16, borderRadius: 28 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  count: { color: C.soft, marginTop: 20 },
});

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { speciesById } from '../data/species';
import { BLOOM_AT, Plant, stageOf } from '../state/store';
import { tap } from '../theme';

interface Props {
  plant: Plant;
  size?: number;
  onPress?: () => void;
}

/** One plant in the garden. Sways gently; wiggles and sparkles when touched. */
export function PlantView({ plant, size = 44, onPress }: Props) {
  const sp = speciesById(plant.species);
  const stage = stageOf(plant);
  const sway = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1800 + plant.x * 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 1800 + plant.x * 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sway, plant.x]);

  const press = () => {
    tap();
    sparkle.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(pop, { toValue: 1.35, useNativeDriver: true, speed: 40 }),
        Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 3 }),
      ]),
      Animated.timing(sparkle, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  const glyph = stage >= BLOOM_AT ? sp.emoji : stage === 2 ? '🌿' : '🌱';
  const scale = stage >= BLOOM_AT ? 1 : stage === 2 ? 0.75 : 0.55;

  return (
    <Pressable onPress={press} hitSlop={6} style={[styles.wrap, { width: size * 1.3, height: size * 1.5 }]}>
      <Animated.View style={{ alignItems: 'center', transform: [{ rotate }, { scale: pop }] }}>
        {sp.rarity !== 'common' && stage >= BLOOM_AT && (
          <View style={[styles.aura, { width: size * 1.2, height: size * 1.2, borderRadius: size, backgroundColor: sp.color }]} />
        )}
        <Text style={{ fontSize: size * scale }}>{glyph}</Text>
      </Animated.View>
      <Animated.Text
        pointerEvents="none"
        style={[
          styles.spark,
          {
            opacity: sparkle.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateY: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0, -size] }) }],
          },
        ]}
      >
        ✨
      </Animated.Text>
      <View style={[styles.soil, { width: size * 0.8 }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-end' },
  aura: { position: 'absolute', opacity: 0.25, top: '10%' },
  spark: { position: 'absolute', top: 0, fontSize: 18 },
  soil: { height: 6, borderRadius: 6, backgroundColor: 'rgba(80,50,20,0.35)', marginTop: -4 },
});

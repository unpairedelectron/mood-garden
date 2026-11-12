import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const C = {
  bg: '#FFF8EC',
  card: '#FFFFFF',
  ink: '#2F3E2E',
  soft: '#6F7D6A',
  line: '#EADFC8',
  leaf: '#4CAF50',
  leafDark: '#2E7D32',
  dew: '#3BA7E0',
  gold: '#F4B400',
  rare: '#7E57C2',
  legendary: '#FF8F00',
};

export const rarityColor = { common: C.leaf, rare: C.rare, legendary: C.legendary } as const;

const native = Platform.OS !== 'web';
export const tap = () => native && Haptics.selectionAsync().catch(() => {});
export const bump = () => native && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
export const cheer = () => native && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

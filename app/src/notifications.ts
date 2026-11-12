import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { speciesById } from './data/species';
import { BLOOM_AT, State, dayKey, stageOf } from './state/store';

export const supported = Platform.OS !== 'web';
const CHANNEL = 'daily-reminder';
const DAYS_AHEAD = 7;

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Daily garden reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Soft, varied nudges. They mention the garden, never guilt. */
function messageFor(state: State, i: number): { title: string; body: string } {
  const sprouts = state.plants.filter(p => stageOf(p) < BLOOM_AT);
  const almost = sprouts.find(p => stageOf(p) === BLOOM_AT - 1);
  const pool: { title: string; body: string }[] = [
    { title: 'How was today? 🌱', body: 'Plant a feeling, any feeling. It takes ten seconds.' },
    { title: 'Your garden is listening 🌼', body: "What's the weather like inside you tonight?" },
    { title: 'A little dew is waiting 💧', body: 'Check in to water your garden.' },
    { title: 'Mixed day? 🌈', body: 'Two feelings at once can grow a rare hybrid.' },
  ];
  if (sprouts.length > 0) {
    pool.unshift({ title: `${sprouts.length} sprout${sprouts.length > 1 ? 's are' : ' is'} thirsty 🌱`, body: 'Checking in waters every one of them.' });
  }
  if (almost) {
    pool.unshift({ title: `Your ${speciesById(almost.species).name} is about to bloom ✨`, body: 'One more check-in and it opens.' });
  }
  return pool[i % pool.length];
}

/**
 * Schedules the next week of reminders as one-off notifications so each can carry
 * different text, and skips today if the user has already checked in.
 * Call again whenever the garden or reminder settings change (and on app open).
 */
export async function syncReminders(state: State): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!state.reminder.on) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const now = new Date();
  const checkedToday = state.entries.some(e => e.day === dayKey(now));
  let n = 0;
  for (let d = 0; d <= DAYS_AHEAD; d++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, state.reminder.hour, state.reminder.minute);
    if (at <= now || (d === 0 && checkedToday)) continue;
    await Notifications.scheduleNotificationAsync({
      content: { ...messageFor(state, n++), data: { open: 'plant' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}

export const REMINDER_TIMES: { hour: number; minute: number; label: string }[] = [
  { hour: 8, minute: 30, label: '🌅 Morning' },
  { hour: 13, minute: 0, label: '☀️ Lunch' },
  { hour: 18, minute: 30, label: '🌇 Evening' },
  { hour: 21, minute: 30, label: '🌙 Bedtime' },
];

export const timeLabel = (h: number, m: number) =>
  new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

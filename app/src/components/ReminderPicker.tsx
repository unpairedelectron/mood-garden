import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { REMINDER_TIMES, ensurePermission, supported, timeLabel } from '../notifications';
import { useStore } from '../state/store';
import { C, tap } from '../theme';

/** Turn the daily reminder on/off and choose when it arrives. */
export function ReminderPicker({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useStore();
  const { reminder } = state;
  const [denied, setDenied] = useState(false);

  const enable = async (hour: number, minute: number) => {
    tap();
    const ok = await ensurePermission();
    setDenied(!ok);
    dispatch({ type: 'reminder', reminder: { on: ok, hour, minute, asked: true } });
  };

  if (!supported) {
    return <Text style={styles.note}>Reminders work in the Android and iOS app.</Text>;
  }

  return (
    <View>
      {!compact && (
        <Text style={styles.status}>
          {reminder.on ? `🔔 Daily nudge at ${timeLabel(reminder.hour, reminder.minute)}` : '🔕 Daily reminder is off'}
        </Text>
      )}
      <View style={styles.row}>
        {REMINDER_TIMES.map(t => {
          const on = reminder.on && reminder.hour === t.hour && reminder.minute === t.minute;
          return (
            <Pressable key={t.label} onPress={() => enable(t.hour, t.minute)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{t.label}</Text>
              <Text style={[styles.chipTime, on && styles.chipLabelOn]}>{timeLabel(t.hour, t.minute)}</Text>
            </Pressable>
          );
        })}
      </View>
      {reminder.on && !compact && (
        <Pressable onPress={() => { tap(); dispatch({ type: 'reminder', reminder: { on: false } }); }}>
          <Text style={styles.off}>Turn off reminders</Text>
        </Pressable>
      )}
      {denied && (
        <Pressable onPress={() => Linking.openSettings()}>
          <Text style={styles.note}>Notifications are blocked for MoodGarden. Tap to open settings and allow them.</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  status: { color: C.ink, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexGrow: 1, minWidth: '22%', backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, borderRadius: 14, paddingVertical: 8, alignItems: 'center' },
  chipOn: { backgroundColor: C.leafDark, borderColor: C.leafDark },
  chipLabel: { fontSize: 12, fontWeight: '700', color: C.ink },
  chipTime: { fontSize: 11, color: C.soft, marginTop: 2 },
  chipLabelOn: { color: '#fff' },
  off: { color: C.soft, marginTop: 10, fontWeight: '600' },
  note: { color: '#C62828', fontSize: 12, marginTop: 8 },
});

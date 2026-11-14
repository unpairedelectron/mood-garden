// Bridge to the phone: haptics, local notifications and sharing. In the
// native app (Capacitor) these use the platform; in a browser they fall back
// to what the web offers, or quietly do nothing.

import { Capacitor } from '@capacitor/core';
import { dayNumber, seasonAt, southernHemisphere } from './clock';
import { MOOD_BY_ID, speciesOf } from './moods';
import { GROW_SECONDS, type Save } from './state';

export const isNative = Capacitor.isNativePlatform();

type HapticKind = 'select' | 'light' | 'medium' | 'success' | 'soft';

export async function haptic(kind: HapticKind) {
  if (isNative) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (kind === 'select') await Haptics.selectionChanged();
      else if (kind === 'success') await Haptics.notification({ type: NotificationType.Success });
      else await Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
    } catch {
      /* no haptics on this device */
    }
    return;
  }
  const ms: Record<HapticKind, number | number[]> = { select: 5, light: 8, soft: 6, medium: 14, success: [10, 60, 18] };
  navigator.vibrate?.(ms[kind]);
}

/** Save or share a photo. Native: the share sheet; web: Web Share with a file, or a download. */
export async function shareImage(dataUrl: string, name: string): Promise<'shared' | 'saved' | 'failed'> {
  if (isNative) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const res = await Filesystem.writeFile({ path: name, data: dataUrl.split(',')[1], directory: Directory.Cache });
      await Share.share({ files: [res.uri], title: 'Mood Garden' });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], name, { type: blob.type });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: 'Mood Garden' });
      return 'shared';
    }
  } catch {
    /* fall through to download */
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return 'saved';
}

/** Native shell set-up: full-screen status bar, splash hand-off, pause and resume. */
export async function initNative(hooks: { pause: () => void; resume: () => void }) {
  if (!isNative) return { ready: async () => {} };
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* not available on this platform */
  }
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('appStateChange', ({ isActive }) => (isActive ? hooks.resume() : hooks.pause()));
  } catch {
    /* no app events */
  }
  return {
    /** Hide the launch screen once the grove has drawn its first frame. */
    ready: async () => {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 400 });
      } catch {
        /* no splash */
      }
    },
  };
}

// ----------------------------------------------------------- notifications

interface Planned {
  id: number;
  at: Date;
  title: string;
  body: string;
}

const tenAm = (d: Date) => {
  const x = new Date(d);
  x.setHours(10, 4, 0, 0);
  return x;
};

/** Everything worth telling you about while you are away, from now on. */
export function plan(save: Save, now = new Date()): Planned[] {
  const out: Planned[] = [];
  const t0 = now.getTime();
  // A tree finishing its growth while the app is closed.
  for (const t of save.trees) {
    if (t.growth >= 1) continue;
    const at = t0 + (1 - t.growth) * GROW_SECONDS * 1000;
    if (at - t0 < 90e3) continue;
    out.push({ id: 1000 + (t.id % 9000), at: new Date(at), title: 'Your grove', body: `Your ${speciesOf(t).tree.toLowerCase()} has grown to full height.` });
    if (out.length > 3) break;
  }
  // Seasons: blossom on flowering trees, leaves turning on deciduous ones.
  const south = southernHemisphere();
  const has = (pred: (id: string) => boolean) => save.trees.some((t) => pred(t.mood));
  const findDay = (test: (phase: number) => boolean) => {
    for (let d = 1; d < 370; d++) {
      const date = new Date(t0 + d * 864e5);
      if (test(seasonAt(date, south).phase)) return date;
    }
    return null;
  };
  if (has((m) => m === 'love')) {
    const d = findDay((p) => Math.abs(p - 0.14) < 0.004);
    if (d) out.push({ id: 20, at: tenAm(d), title: 'Blossom', body: 'Your jacaranda has come into bloom.' });
  }
  if (save.trees.some((t) => speciesOf(t).deciduous)) {
    const d = findDay((p) => Math.abs(p - 0.6) < 0.004);
    if (d) out.push({ id: 21, at: tenAm(d), title: 'Autumn', body: 'The leaves are starting to turn in your grove.' });
  }
  // Anniversaries: a month and a year after each of the last few plantings.
  const recent = [...save.trees].sort((a, b) => b.planted - a.planted).slice(0, 30);
  for (const t of recent) {
    for (const [months, label] of [[1, 'A month ago'], [12, 'A year ago']] as const) {
      const d = new Date(t.planted);
      d.setMonth(d.getMonth() + months);
      if (d.getTime() <= t0) continue;
      out.push({
        id: 3000 + ((t.id * 2 + (months === 12 ? 1 : 0)) % 6000),
        at: tenAm(d),
        title: label,
        body: `${label} today you planted ${MOOD_BY_ID[t.mood].name.toLowerCase()}${t.note ? `: “${t.note}”` : ''}. It is still growing in your grove.`,
      });
    }
  }
  // The daily moment, if you asked for one: skipped on a day you have already planted.
  if (save.remindAt != null) {
    for (let d = 0; d < 7; d++) {
      const at = new Date(t0 + d * 864e5);
      at.setHours(Math.floor(save.remindAt), Math.round((save.remindAt % 1) * 60), 0, 0);
      if (at.getTime() <= t0 + 60e3) continue;
      if (dayNumber(at) === save.lastPlantDay) continue;
      out.push({ id: 10 + d, at, title: 'Mood Garden', body: 'A quiet minute: how are you feeling today?' });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 48);
}

export async function notificationsAllowed(ask: boolean): Promise<boolean> {
  if (!isNative) return false;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    let p = await LocalNotifications.checkPermissions();
    if (p.display !== 'granted' && ask) p = await LocalNotifications.requestPermissions();
    return p.display === 'granted';
  } catch {
    return false;
  }
}

/** Replace every pending notification with a fresh plan. Call when the app goes to the background. */
export async function reschedule(save: Save) {
  if (!isNative || !(await notificationsAllowed(false))) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    const items = plan(save);
    if (items.length) {
      await LocalNotifications.schedule({
        // Inexact delivery is fine for a calm app and needs no exact-alarm permission on Android.
        notifications: items.map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at } })),
      });
    }
  } catch {
    /* notifications unavailable */
  }
}

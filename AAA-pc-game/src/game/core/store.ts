// Bridge between the real-time engine and the React HUD.
// Slow-changing state goes through `ui` (subscribed with useSyncExternalStore);
// per-frame data (compass, markers) goes through `frameBus` and is written
// straight to the DOM so React never re-renders at 60 Hz.

import type { MoodId } from '../data/moods';

export type Phase = 'loading' | 'title' | 'intro' | 'play' | 'cinematic' | 'paused' | 'photo';
export type Quality = 'low' | 'medium' | 'high' | 'ultra';

export interface JournalEntry {
  id: string;
  mood: MoodId;
  note: string;
  time: number;
  x: number;
  z: number;
}

export interface Settings {
  quality: Quality;
  master: number;
  music: number;
  sensitivity: number;
  invertY: boolean;
}

export interface Card {
  kicker: string;
  title: string;
  verse: string;
  color: string;
}

export interface UIState {
  phase: Phase;
  loading: number;
  loadingText: string;
  hasSave: boolean;
  objective: string;
  objectiveDetail: string;
  prompt: string | null;
  promptKey: string;
  region: string | null;
  regionKey: number;
  awakened: MoodId[];
  heartTouched: boolean;
  finale: boolean;
  grove: { id: MoodId; have: number; need: number } | null;
  carrying: number;
  wheelOpen: boolean;
  journalOpen: boolean;
  journal: JournalEntry[];
  card: Card | null;
  subtitle: string | null;
  toast: string | null;
  toastKey: number;
  timeLabel: string;
  settings: Settings;
  touch: boolean;
  photoTime: number;
  fps: number;
}

type Listener = () => void;

class Store<T extends object> {
  private state: T;
  private listeners = new Set<Listener>();
  constructor(initial: T) {
    this.state = initial;
  }
  get = () => this.state;
  set(patch: Partial<T>) {
    let changed = false;
    for (const k in patch) {
      if (!Object.is(patch[k], this.state[k])) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'high',
  master: 0.8,
  music: 0.8,
  sensitivity: 1,
  invertY: false,
};

export const ui = new Store<UIState>({
  phase: 'loading',
  loading: 0,
  loadingText: 'Waking the island',
  hasSave: false,
  objective: '',
  objectiveDetail: '',
  prompt: null,
  promptKey: 'E',
  region: null,
  regionKey: 0,
  awakened: [],
  heartTouched: false,
  finale: false,
  grove: null,
  carrying: 0,
  wheelOpen: false,
  journalOpen: false,
  journal: [],
  card: null,
  subtitle: null,
  toast: null,
  toastKey: 0,
  timeLabel: '',
  settings: DEFAULT_SETTINGS,
  touch: false,
  photoTime: 8,
  fps: 0,
});

export interface Marker {
  id: string;
  /** Bearing relative to the camera, radians, 0 = straight ahead. */
  bearing: number;
  dist: number;
  color: string;
  kind: 'grove' | 'heart' | 'mote';
  done: boolean;
}

export interface FrameData {
  yaw: number;
  markers: Marker[];
}

type FrameListener = (f: FrameData) => void;
const frameListeners = new Set<FrameListener>();
export const frameBus = {
  emit(f: FrameData) {
    frameListeners.forEach((l) => l(f));
  },
  on(l: FrameListener) {
    frameListeners.add(l);
    return () => {
      frameListeners.delete(l);
    };
  },
};

/** Commands the HUD sends to the engine. */
export type Command =
  | { type: 'start'; fresh: boolean }
  | { type: 'resume' }
  | { type: 'pause' }
  | { type: 'skip' }
  | { type: 'feel'; mood: MoodId; note: string }
  | { type: 'wheel'; open: boolean }
  | { type: 'journal'; open: boolean }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'photo'; on: boolean }
  | { type: 'photoTime'; hour: number }
  | { type: 'snapshot' }
  | { type: 'toTitle' };

type CommandListener = (c: Command) => void;
const commandListeners = new Set<CommandListener>();
export const commands = {
  send(c: Command) {
    commandListeners.forEach((l) => l(c));
  },
  on(l: CommandListener) {
    commandListeners.add(l);
    return () => {
      commandListeners.delete(l);
    };
  },
};

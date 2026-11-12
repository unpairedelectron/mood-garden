import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { FEELINGS, FeelingId, feelingById, hybridFor, DECORATIONS } from '../data/species';

const STORAGE_KEY = 'moodgarden:v1';

export interface Entry {
  id: string;
  at: number; // epoch ms
  day: string; // local yyyy-mm-dd
  feelings: FeelingId[];
  note: string;
}

export interface Plant {
  id: string;
  species: string;
  entryId: string | null; // memory it grew from (null for milestone gifts)
  plantedDay: string;
  /** Number of distinct days it has been watered (planting counts as 1). Blooms at 3. */
  water: number;
  lastWateredDay: string;
  x: number; // 0..1 jitter inside its plot
}

export interface Placed {
  id: string;
  deco: string;
  slot: number;
}

export interface State {
  loaded: boolean;
  onboarded: boolean;
  entries: Entry[];
  plants: Plant[];
  discovered: string[]; // species ids
  dew: number;
  decorations: Placed[];
  biome: string;
  plus: boolean; // Garden+ (billing not wired yet; preview toggle only)
  calmSessions: number;
  lastSeenDay: string | null;
  reminder: { on: boolean; hour: number; minute: number; asked: boolean };
}

const initial: State = {
  loaded: false,
  onboarded: false,
  entries: [],
  plants: [],
  discovered: [],
  dew: 0,
  decorations: [],
  biome: 'meadow',
  plus: false,
  calmSessions: 0,
  lastSeenDay: null,
  reminder: { on: false, hour: 18, minute: 30, asked: false },
};

export const BLOOM_AT = 3;
export const stageOf = (p: Plant) => Math.min(BLOOM_AT, p.water);

export function dayKey(d: Date = new Date()) {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function prevDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export function streakOf(entries: Entry[], today = dayKey()) {
  const days = new Set(entries.map(e => e.day));
  let cursor = days.has(today) ? today : prevDay(today);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = prevDay(cursor);
  }
  return n;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** What a check-in produced, so the UI can celebrate it. */
export interface Harvest {
  planted: { species: string; isNew: boolean }[];
  dewEarned: number;
  bloomed: number;
}

type Action =
  | { type: 'load'; state: Partial<State> }
  | { type: 'onboard' }
  | { type: 'checkIn'; feelings: FeelingId[]; note: string; now: Date; result: { current: Harvest | null } }
  | { type: 'buy'; deco: string }
  | { type: 'biome'; biome: string }
  | { type: 'calmDone' }
  | { type: 'setPlus'; plus: boolean }
  | { type: 'seen' }
  | { type: 'reminder'; reminder: Partial<State['reminder']> }
  | { type: 'reset' };

function addPlant(s: State, species: string, entryId: string | null, day: string, out: Harvest) {
  const isNew = !s.discovered.includes(species);
  s.plants.push({ id: uid(), species, entryId, plantedDay: day, water: 1, lastWateredDay: day, x: Math.random() });
  if (isNew) s.discovered.push(species);
  out.planted.push({ species, isNew });
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load':
      // Merge nested reminder so older saves pick up new defaults.
      return { ...state, ...action.state, reminder: { ...state.reminder, ...action.state.reminder }, loaded: true };
    case 'onboard':
      return { ...state, onboarded: true };
    case 'seen':
      return { ...state, lastSeenDay: dayKey() };
    case 'reminder':
      return { ...state, reminder: { ...state.reminder, ...action.reminder } };
    case 'setPlus':
      return { ...state, plus: action.plus };
    case 'biome':
      return { ...state, biome: action.biome };
    case 'calmDone':
      return { ...state, calmSessions: state.calmSessions + 1, dew: state.dew + 5 };
    case 'buy': {
      const d = DECORATIONS.find(x => x.id === action.deco);
      if (!d || state.dew < d.cost || (d.plus && !state.plus)) return state;
      return {
        ...state,
        dew: state.dew - d.cost,
        decorations: [...state.decorations, { id: uid(), deco: d.id, slot: state.decorations.length }],
      };
    }
    case 'reset':
      return { ...initial, loaded: true };
    case 'checkIn': {
      const { feelings, note, now } = action;
      const day = dayKey(now);
      const s: State = {
        ...state,
        entries: [...state.entries],
        plants: state.plants.map(p => ({ ...p })),
        discovered: [...state.discovered],
      };
      const out: Harvest = { planted: [], dewEarned: 0, bloomed: 0 };
      const firstToday = !s.entries.some(e => e.day === day);

      // Daily check-in waters every plant once per day.
      if (firstToday) {
        for (const p of s.plants) {
          if (p.lastWateredDay !== day) {
            const before = stageOf(p);
            p.water += 1;
            p.lastWateredDay = day;
            if (before < BLOOM_AT && stageOf(p) === BLOOM_AT) out.bloomed++;
          }
        }
      }

      const entry: Entry = { id: uid(), at: now.getTime(), day, feelings, note: note.trim() };
      s.entries.push(entry);

      for (const f of feelings) addPlant(s, feelingById(f).species, entry.id, day, out);

      // Hybrids consider every feeling logged today, so mixed days reward honesty.
      const todaysFeelings = Array.from(new Set(s.entries.filter(e => e.day === day).flatMap(e => e.feelings)));
      const hybrid = hybridFor(todaysFeelings);
      const hybridGrownToday = s.plants.some(p => p.species === hybrid && p.plantedDay === day);
      if (hybrid && !hybridGrownToday) addPlant(s, hybrid, entry.id, day, out);

      // Legendaries
      const own = (id: string) => s.plants.some(p => p.species === id);
      if (!own('starlight') && streakOf(s.entries, day) >= 7) addPlant(s, 'starlight', null, day, out);
      if (!own('evergreen') && s.entries.length >= 30) addPlant(s, 'evergreen', null, day, out);
      if (!own('moonbloom') && (now.getHours() >= 22 || now.getHours() < 4)) addPlant(s, 'moonbloom', entry.id, day, out);
      const felt = new Set(s.entries.flatMap(e => e.feelings));
      if (!own('rainbow') && FEELINGS.every(f => felt.has(f.id))) addPlant(s, 'rainbow', null, day, out);

      out.dewEarned = (firstToday ? 10 : 3) + out.bloomed * 5 + out.planted.filter(p => p.isNew).length * 5;
      s.dew += out.dewEarned;
      action.result.current = out;
      return s;
    }
  }
}

interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  checkIn: (feelings: FeelingId[], note: string) => Harvest;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => dispatch({ type: 'load', state: raw ? JSON.parse(raw) : {} }))
      .catch(() => dispatch({ type: 'load', state: {} }));
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    const { loaded, ...persist } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persist)).catch(() => {});
  }, [state]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      dispatch,
      checkIn: (feelings, note) => {
        // Compute the harvest synchronously against the latest state so the UI can celebrate it.
        const result: { current: Harvest | null } = { current: null };
        const next = reducer(stateRef.current, { type: 'checkIn', feelings, note, now: new Date(), result });
        dispatch({ type: 'load', state: next });
        stateRef.current = next;
        return result.current!;
      },
    }),
    [state],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}

/** Recent emotional "weather" over the last 3 days of entries. Purely aesthetic. */
export function weatherOf(entries: Entry[]): 'sunny' | 'partly' | 'rain' {
  const cutoff = Date.now() - 3 * 864e5;
  const recent = entries.filter(e => e.at > cutoff).flatMap(e => e.feelings);
  if (recent.length === 0) return 'partly';
  const avg = recent.reduce((a, f) => a + feelingById(f).valence, 0) / recent.length;
  return avg > 0.35 ? 'sunny' : avg < -0.35 ? 'rain' : 'partly';
}

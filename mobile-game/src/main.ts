import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource-variable/inter';
import './style.css';
import { AudioEngine } from './audio';
import { Clock, dayNumber } from './clock';
import { MOODS, MOOD_BY_ID, SEED_SPECIES, SPECIES_BY_ID, speciesOf, type MoodId } from './moods';
import { haptic, initNative, isNative, notificationsAllowed, reschedule, shareImage } from './native';
import { applyAway, clearSave, loadSave, writeSave, MAX_TREES, type TreeSave } from './state';
import { World } from './world';
import { PLACES, placeById, type Place } from './terrain';
import { yearHtml } from './year';
import { drawFieldMap } from './map';
import { KEEPSAKES, whereabouts, type Keepsake } from './keepsakes';

const save = loadSave();
const isNew = save.trees.length === 0;
const matured = applyAway(save);
const audio = new AudioEngine();
const ui = document.getElementById('ui')!;
const $ = <T extends HTMLElement>(sel: string) => ui.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const qs = new URLSearchParams(location.search);
/** Dev and testing: lift the one-tree-a-day limit. */
const unlimited = qs.has('unlimited');
const today = dayNumber();
const plantedToday = () => !unlimited && save.lastPlantDay === today;

// One visit per calendar day, kept for two years.
save.visits = (save.visits ?? []).filter((d) => d > today - 800);
if (save.visits[save.visits.length - 1] !== today) save.visits.push(today);

function since(ms: number): string {
  const d = today - dayNumber(ms);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 14) return `${d} days ago`;
  if (d < 45) return d < 25 ? `${Math.round(d / 7)} weeks ago` : 'About a month ago';
  if (d < 330) return `${Math.round(d / 30.4)} months ago`;
  if (d < 400) return 'A year ago';
  return `${Math.round(d / 365)} years ago`;
}

ui.innerHTML = `
  <header class="top">
    <div class="pill" id="countPill"><i class="leaf"></i><b id="count">0</b><span id="countLabel">trees</span></div>
    <div class="pill pill--sky" id="skyPill"></div>
    <button class="round round--icon" id="photoBtn" aria-label="Photo mode"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg></button>
    <button class="round" id="menuBtn" aria-label="Menu"><i></i><i></i><i></i></button>
  </header>
  <div class="coach" id="coach"></div>
  <div class="caption" id="caption"></div>
  <div class="memory" id="memory"></div>
  <div class="place" id="place"><em></em><span></span></div>
  <div class="toast" id="toast"></div>
  <div class="stick" id="stick"><div class="stick__knob" id="knob"></div></div>
  <button class="plant" id="plantBtn"><i class="leaf"></i><span id="plantLabel">Plant</span></button>
  <button class="round round--sit" id="sitBtn" aria-label="Sit down"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="5" r="2"/><path d="M12 8v6h5l1 6M12 14l-4 6M8 11h8"/></svg></button>
  <button class="stand" id="standBtn">Stand up</button>
  <div class="photo" id="photo">
    <div class="photo__looks">${['natural', 'warm', 'faded', 'mono'].map((l) => `<button class="chip${l === 'natural' ? ' is-on' : ''}" data-look="${l}">${l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</div>
    <label class="photo__time"><span id="photoHour">Time</span><input type="range" id="hourRange" min="0" max="24" step="0.05" /></label>
    <div class="photo__row">
      <button class="ghost" id="photoClose">Done</button>
      <button class="shutter" id="shutter" aria-label="Take photo"><i></i></button>
      <span class="photo__spacer"></span>
    </div>
  </div>
  <div class="flash" id="flash"></div>
  <div class="scrim" id="scrim"></div>
  <section class="sheet" id="sheet" aria-live="polite"></section>
  <div class="splash" id="splash">
    <div class="splash__kicker">A forest that grows from how you feel</div>
    <h1>Mood <em>Garden</em></h1>
    <p id="loadText">Opening the sky</p>
    <div class="splash__bar"><i id="loadBar"></i></div>
    <button id="begin" hidden>${isNew ? 'Step into the clearing' : 'Return to your grove'}</button>
  </div>`;

let toastTimer = 0;
const queue: string[] = [];
/** Messages wait while you are walking and arrive when you stop. */
const held: string[] = [];
function toast(text: string, urgent = false) {
  if (!urgent && ui.classList.contains('is-roaming')) {
    if (!held.includes(text)) held.push(text);
    return;
  }
  const el = $('#toast');
  if (el.classList.contains('is-on')) {
    queue.push(text);
    return;
  }
  el.textContent = text;
  el.classList.add('is-on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.remove('is-on');
    const next = queue.shift();
    if (next) window.setTimeout(() => toast(next), 500);
  }, 4600);
}

const COACH = ['Use the left stick to walk · drag anywhere to look around', 'Find a spot you like, then tap Plant', ''];

function refresh() {
  $('#count').textContent = String(save.trees.length);
  $('#countLabel').textContent = save.trees.length === 1 ? 'tree' : 'trees';
  $('#plantLabel').textContent = plantedToday() ? 'Today’s tree' : 'Plant';
  $('#plantBtn').classList.toggle('is-done', plantedToday());
  const coach = $('#coach');
  const text = COACH[Math.min(save.tutorial, COACH.length - 1)];
  coach.textContent = text;
  coach.classList.toggle('is-on', !!text && world.active && !photoOn && !world.touring);
  ui.classList.toggle('is-sitting', world.sitting);
}

function caption(t: TreeSave | null) {
  const el = $('#caption');
  if (!t || world.touring || photoOn) {
    el.classList.remove('is-on');
    return;
  }
  const def = MOOD_BY_ID[t.mood];
  const stage = t.growth >= 1 ? 'full grown' : t.growth >= 0.6 ? 'nearly grown' : t.growth >= 0.2 ? 'growing' : 'a sapling';
  el.innerHTML = `<b style="color:${def.css}">${def.name}</b><span>${speciesOf(t).tree} · ${stage} · ${since(t.planted).toLowerCase()}</span>${t.note ? `<em>“${esc(t.note)}”</em>` : ''}`;
  el.classList.add('is-on');
}

const ARRIVED: Record<string, string> = {
  butterflies: 'Butterflies have found your grove.',
  bees: 'Bees are working the flowers.',
  crickets: 'Crickets have moved in. Listen for them after dark.',
  fireflies: 'Fireflies will rise here at night.',
  songbirds: 'Songbirds are nesting in your trees.',
  flock: 'A flock now passes over your forest.',
  perching: 'Birds have started to perch in your trees.',
  deer: 'Deer have come to graze at the edge of the grove.',
  fox: 'A fox has been seen at dusk.',
};
function met(id: string) {
  if (save.met.includes(id)) return;
  save.met.push(id);
  if (world.active) toast(ARRIVED[id] ?? 'Something new lives in your grove.');
  else pendingArrivals.push(id);
}
const pendingArrivals: string[] = [];

/** First arrival somewhere: its name, quietly, and a phrase of music. Shown even while walking. */
/** Quiet cards for names and finds, one at a time, each given its moment. */
let placeTimer = 0;
const cards: { title: string; line: string; small: boolean; ms: number; cue: () => void }[] = [];
function card(c: (typeof cards)[number]) {
  cards.push(c);
  if (cards.length === 1) showCard();
}
function showCard() {
  const c = cards[0];
  if (!c) return;
  const el = $('#place');
  el.querySelector('em')!.textContent = c.title;
  el.querySelector('span')!.textContent = c.line;
  el.classList.toggle('is-small', c.small);
  el.classList.add('is-on');
  c.cue();
  window.clearTimeout(placeTimer);
  placeTimer = window.setTimeout(() => {
    el.classList.remove('is-on');
    cards.shift();
    // Let one fade out before the next fades in.
    window.setTimeout(showCard, 1900);
  }, c.ms);
}

/** First arrival somewhere: its name, quietly, and a phrase of music. Shown even while walking. */
function found(p: Place) {
  card({ title: p.name, line: p.line, small: false, ms: 6500, cue: () => {
    audio.discover();
    void haptic('soft');
  } });
  writeSave(save);
}

/** Seed kinds of tree you can now grow for a feeling. */
function unlockedFor(mood: MoodId) {
  return SEED_SPECIES.filter((s) => s.mood === mood && save.keepsakes?.[`seed-${s.id}`]);
}

/** Picking something up: a quiet card, like a place's name. */
function keepsake(k: Keepsake) {
  const s = k.species ? SPECIES_BY_ID[k.species] : null;
  card({
    title: k.name,
    line: s ? `You can now grow a ${s.tree.toLowerCase()} when you feel ${MOOD_BY_ID[s.mood].name.toLowerCase()}.` : k.line,
    small: true,
    ms: 5500,
    cue: () => {
      audio.deliver(k.kind === 'seed' ? 5 : 2);
      if (k.kind === 'seed') audio.discover();
      void haptic(k.kind === 'seed' ? 'success' : 'soft');
    },
  });
  writeSave(save);
}

function journalSheet() {
  const got = save.keepsakes ?? {};
  const group = (kind: Keepsake['kind'], title: string) => {
    const all = KEEPSAKES.filter((k) => k.kind === kind);
    const have = all.filter((k) => got[k.id]).sort((a, b) => got[a.id] - got[b.id]);
    return `<h3>${title} <small>${have.length} of ${all.length}</small></h3>${have.length
      ? `<ul class="finds">${have.map((k) => `<li class="find find--${kind}"><i></i><div><strong>${k.name}</strong><span>${k.species ? `Grows a ${SPECIES_BY_ID[k.species].tree.toLowerCase()} (${MOOD_BY_ID[SPECIES_BY_ID[k.species].mood].name})` : k.line}</span><time>${fmt.format(got[k.id])}, ${whereabouts(k.x, k.z)}</time></div></li>`).join('')}</ul>`
      : `<p class="sheet__sub">${kind === 'seed' ? 'Each of the land’s places keeps one seed.' : 'None yet. Keep an eye out for something catching the light.'}</p>`}`;
  };
  openSheet(`
    <h2>Field journal</h2>
    <p class="sheet__sub">The land as you know it. It fills in where you walk.</p>
    <div class="map map--paper"><canvas id="fieldMap" width="640" height="640"></canvas></div>
    ${group('seed', 'Seeds')}
    ${group('feather', 'Feathers')}
    ${group('stone', 'Stones')}
    ${group('flower', 'Pressed flowers')}`);
  drawFieldMap(sheet.querySelector('#fieldMap') as HTMLCanvasElement, save.trees, world.explored, save.found ?? []);
}

function placesHtml(): string {
  const have = PLACES.filter((p) => save.found?.includes(p.id));
  const more = PLACES.length - have.length;
  if (!have.length) return '<p class="sheet__sub">None yet. There is more out in the woods than trees.</p>';
  return `<ul class="places">${have
    .map((p) => `<li><div><strong>${p.name}</strong><span>${p.line}</span></div><button class="link" data-place="${p.id}">Walk there</button></li>`)
    .join('')}</ul>${more ? `<p class="sheet__tip">${more === 1 ? 'One more place is' : 'More places are'} still out there.</p>` : ''}`;
}

// ------------------------------------------------------------------ sheets
const sheet = $('#sheet');
const scrim = $('#scrim');
function openSheet(html: string) {
  sheet.innerHTML = `<div class="sheet__grip"></div>${html}`;
  sheet.classList.add('is-on');
  scrim.classList.add('is-on');
  sheet.scrollTop = 0;
  world.setMove(0, 0);
}
function closeSheet() {
  sheet.classList.remove('is-on');
  scrim.classList.remove('is-on');
  (document.activeElement as HTMLElement | null)?.blur();
}
scrim.addEventListener('click', () => {
  audio.ui('close');
  closeSheet();
});
const on = (sel: string, fn: (el: HTMLElement) => void) => sheet.querySelectorAll<HTMLElement>(sel).forEach((el) => el.addEventListener('click', () => fn(el)));

/** The day's ritual: one feeling, one tree. */
function plantSheet() {
  if (plantedToday()) return todaySheet();
  if (save.trees.length >= MAX_TREES) {
    toast('Your grove is full. Let a tree go from the menu to make room.');
    return;
  }
  let picked: MoodId | null = null;
  let kind: string | null = null;
  openSheet(`
    <p class="sheet__kicker">${fmtLong.format(new Date())}</p>
    <h2>How are you, today?</h2>
    <p class="sheet__sub" id="moodSub">Choose the feeling closest to now. It grows into its own kind of tree, here, where you stand.</p>
    <div class="moods">${MOODS.map((m) => `<button class="mood" data-mood="${m.id}" style="--c:${m.css}"><i></i><span>${m.name}</span><small>${m.tree}</small></button>`).join('')}</div>
    <div class="kinds" id="kinds"></div>
    <input id="note" maxlength="120" placeholder="A few words for your future self, if you like" autocomplete="off" />
    <button class="cta" id="doPlant" disabled>Choose a feeling</button>
    <p class="sheet__tip">One feeling, one tree, each day. Over a year it becomes a forest of how you have been.</p>`);
  const btn = sheet.querySelector('#doPlant') as HTMLButtonElement;
  on('.mood', (b) => {
    picked = b.dataset.mood as MoodId;
    const def = MOOD_BY_ID[picked];
    sheet.querySelectorAll('.mood').forEach((o) => o.classList.toggle('is-on', o === b));
    (sheet.querySelector('#moodSub') as HTMLElement).textContent = def.feeling;
    btn.disabled = false;
    btn.style.setProperty('--c', def.css);
    // Seeds you have found let a feeling grow another kind of tree.
    const kinds = [SPECIES_BY_ID[picked], ...unlockedFor(picked)];
    kind = kinds[0].id;
    const box = sheet.querySelector('#kinds') as HTMLElement;
    const setKind = (id: string) => {
      kind = id;
      box.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-on', (c as HTMLElement).dataset.kind === id));
      btn.textContent = `Plant a ${SPECIES_BY_ID[id].tree.toLowerCase()}`;
    };
    box.innerHTML = kinds.length > 1 ? kinds.map((k) => `<button class="chip" data-kind="${k.id}">${k.tree}</button>`).join('') : '';
    box.querySelectorAll<HTMLElement>('.chip').forEach((c) => c.addEventListener('click', () => {
      setKind(c.dataset.kind!);
      void haptic('select');
    }));
    setKind(kind);
    audio.ui('click');
    void haptic('select');
  });
  btn.addEventListener('click', () => {
    if (!picked) return;
    const note = (sheet.querySelector('#note') as HTMLInputElement).value;
    closeSheet();
    if (world.plant(picked, note, kind ?? undefined)) {
      save.lastPlantDay = today;
      void haptic('success');
      refresh();
      toast(save.trees.length === 1 ? 'Planted. It grows while you walk, and while you are away. Come back tomorrow for the next.' : 'Planted. One feeling, one tree: see you tomorrow.');
      writeSave(save);
    }
  });
}

function todaySheet() {
  const t = [...save.trees].reverse().find((x) => dayNumber(x.planted) === today);
  const def = t ? MOOD_BY_ID[t.mood] : null;
  openSheet(`
    <p class="sheet__kicker">${fmtLong.format(new Date())}</p>
    <h2>Today’s tree is planted</h2>
    ${t && def ? `<div class="memcard" style="--c:${def.css}"><b>${def.name}</b><span>${speciesOf(t).tree} · ${Math.round(t.growth * 100)}% grown</span>${t.note ? `<em>“${esc(t.note)}”</em>` : ''}</div>` : ''}
    <p class="sheet__sub">One feeling, one tree each day. Come back tomorrow and tell the grove how you are.</p>
    <div class="row">${t ? '<button class="ghost" id="goToday">Walk to it</button>' : ''}<button class="ghost" id="closeToday">Close</button></div>`);
  sheet.querySelector('#goToday')?.addEventListener('click', () => {
    closeSheet();
    if (t) tour([t]);
  });
  sheet.querySelector('#closeToday')!.addEventListener('click', closeSheet);
}

function menuSheet() {
  const grown = world.grown;
  const life = world.life.creatures;
  const trees = [...save.trees].sort((a, b) => b.planted - a.planted);
  const q = world.quality;
  openSheet(`
    <h2>Your grove</h2>
    <div class="stats"><div><b>${save.trees.length}</b>planted</div><div><b>${grown}</b>grown</div><div><b>${(save.visits ?? []).length}</b>days visited</div></div>
    <div class="cta-row">
      <button class="cta cta--soft" id="yearBtn">Year in feelings</button>
      <button class="cta cta--soft" id="journalBtn">Field journal</button>
      <button class="cta cta--soft" id="walkBtn">Memory walk</button>
    </div>
    ${world.fromHome > 80 ? '<button class="ghost ghost--home" id="homeBtn">Walk me home</button>' : ''}
    <h3>Places you’ve found</h3>
    ${placesHtml()}
    <h3>Who lives here</h3>
    <ul class="goals">${life.filter((c) => !c.hidden).map((c) => `<li class="${c.here ? 'is-done' : ''}"><i></i><div><strong>${c.name}</strong><span>${c.here ? 'Living in your grove' : c.needs}</span></div></li>`).join('')}</ul>
    <p class="sheet__tip">Nothing here is placed by hand. Ferns, flowers and creatures arrive on their own as your trees grow.</p>
    <h3>Your trees</h3>
    ${trees.length
      ? `<ul class="journal">${trees
          .slice(0, 60)
          .map((t) => {
            const def = MOOD_BY_ID[t.mood];
            return `<li style="--c:${def.css}"><i></i><div><strong>${def.name}</strong><time>${fmt.format(t.planted)} · ${Math.round(t.growth * 100)}%</time>${t.note ? `<p>${esc(t.note)}</p>` : ''}<button class="link" data-go="${t.id}">Walk there</button> <button class="link" data-id="${t.id}">Let go</button></div></li>`;
          })
          .join('')}</ul>${trees.length > 60 ? '<p class="sheet__tip">Older trees are in your year in feelings.</p>' : ''}`
      : '<p class="sheet__sub">Nothing planted yet.</p>'}
    <h3>Settings</h3>
    <div class="row">
      <button class="ghost" id="soundBtn">Sound: ${save.sound ? 'on' : 'off'}</button>
      ${isNative ? `<button class="ghost" id="remindBtn">Daily reminder: ${save.remindAt != null ? `${Math.floor(save.remindAt)}:00` : 'off'}</button>` : ''}
    </div>
    <div class="seg" role="group" aria-label="Graphics">${(['low', 'medium', 'high'] as const).map((k) => `<button class="${k === q ? 'is-on' : ''}" data-q="${k}">${k === 'low' ? 'Battery' : k === 'medium' ? 'Balanced' : 'Beautiful'}</button>`).join('')}</div>
    <div class="row"><button class="ghost" id="resetBtn">Start over</button></div>
    <p class="credit">Trees, plants, rocks, bark, ground and skies are CC0 scans from Poly Haven.</p>`);
  sheet.querySelector('#yearBtn')!.addEventListener('click', () => yearSheet(new Date().getFullYear()));
  sheet.querySelector('#walkBtn')!.addEventListener('click', walkSheet);
  sheet.querySelector('#journalBtn')!.addEventListener('click', journalSheet);
  on('[data-place]', (b) => {
    const p = placeById(b.dataset.place!);
    closeSheet();
    walkTo(p.x, p.z, `Walking to ${p.name}…`, p.name);
  });
  sheet.querySelector('#homeBtn')?.addEventListener('click', () => {
    closeSheet();
    walkHome();
  });
  on('[data-go]', (b) => {
    const t = save.trees.find((x) => x.id === Number(b.dataset.go));
    closeSheet();
    if (t) tour([t]);
  });
  sheet.querySelectorAll<HTMLButtonElement>('[data-id]').forEach((b) => {
    let armed = false;
    b.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        b.textContent = 'Tap again to let it go';
        return;
      }
      world.remove(Number(b.dataset.id));
      menuSheet();
    });
  });
  sheet.querySelector('#soundBtn')!.addEventListener('click', (e) => {
    save.sound = !save.sound;
    audio.setVolumes(save.sound ? 0.8 : 0, 0.7);
    (e.currentTarget as HTMLElement).textContent = `Sound: ${save.sound ? 'on' : 'off'}`;
    writeSave(save);
  });
  sheet.querySelector('#remindBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLElement;
    // Off → 9 → 13 → 19 → 21 → off
    const cycle = [null, 9, 13, 19, 21];
    const i = cycle.indexOf(save.remindAt ?? null);
    const next = cycle[(i + 1) % cycle.length];
    if (next != null && !(await notificationsAllowed(true))) {
      toast('Notifications are turned off for Mood Garden in your phone’s settings.');
      return;
    }
    save.remindAt = next;
    btn.textContent = `Daily reminder: ${next != null ? `${next}:00` : 'off'}`;
    writeSave(save);
  });
  on('[data-q]', (b) => {
    try {
      localStorage.setItem('moodgarden.quality', b.dataset.q!);
    } catch {
      /* no storage */
    }
    writeSave(save);
    location.reload();
  });
  const reset = sheet.querySelector('#resetBtn') as HTMLButtonElement;
  let armed = false;
  reset.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      reset.textContent = 'Tap again to clear everything';
      return;
    }
    world.persist = false;
    clearSave();
    location.reload();
  });
}

// ------------------------------------------------------------ year & walks
function yearSheet(year: number) {
  const years = [...new Set([new Date().getFullYear(), ...save.trees.map((t) => new Date(t.planted).getFullYear())])].sort();
  openSheet(yearHtml(save.trees, year, years));
  // Open the calendar on the current month rather than January.
  const cal = sheet.querySelector('.cal') as HTMLElement;
  const now = new Date();
  const through = year < now.getFullYear() ? 1 : year > now.getFullYear() ? 0 : (now.getTime() - new Date(year, 0, 1).getTime()) / (365 * 864e5);
  cal.scrollLeft = Math.max(0, cal.scrollWidth * through - cal.clientWidth * 0.8);
  const cv = sheet.querySelector('#groveMap') as HTMLCanvasElement;
  const inYear = new Set(save.trees.filter((t) => new Date(t.planted).getFullYear() === year).map((t) => t.id));
  const hit = drawFieldMap(cv, save.trees, world.explored, save.found ?? [], inYear);
  const pick = (t: TreeSave | null) => {
    const el = sheet.querySelector('#pick') as HTMLElement;
    if (!t) return;
    const def = MOOD_BY_ID[t.mood];
    el.innerHTML = `<div class="memcard" style="--c:${def.css}"><b>${def.name}</b><span>${fmtLong.format(t.planted)} · ${since(t.planted).toLowerCase()}</span>${t.note ? `<em>“${esc(t.note)}”</em>` : ''}<button class="cta" id="goPick">Walk me there</button></div>`;
    el.querySelector('#goPick')!.addEventListener('click', () => {
      closeSheet();
      tour([t]);
    });
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    void haptic('select');
  };
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    pick(hit(((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height));
  });
  on('[data-tree]', (b) => pick(save.trees.find((t) => t.id === Number(b.dataset.tree)) ?? null));
  on('[data-year]', (b) => yearSheet(Number(b.dataset.year)));
}

function walkSheet() {
  const ago = (t: TreeSave) => today - dayNumber(t.planted);
  const sets: [string, string, TreeSave[]][] = [
    ['week', 'This past week', save.trees.filter((t) => ago(t) <= 7)],
    ['month', 'A month ago', save.trees.filter((t) => ago(t) >= 21 && ago(t) <= 45)],
    ['season', 'The last three months', save.trees.filter((t) => ago(t) <= 92)],
    ['year', 'A year ago', save.trees.filter((t) => ago(t) >= 330 && ago(t) <= 400)],
    ['all', 'From the very first', save.trees],
  ];
  openSheet(`
    <h2>Memory walk</h2>
    <p class="sheet__sub">The grove walks you past the trees you planted, oldest first, and stops at each so you can read what you felt. Touch the stick at any time to take over.</p>
    <ul class="walks">${sets
      .map(([k, label, ts]) => `<li><button class="walk" data-walk="${k}" ${ts.length ? '' : 'disabled'}><b>${label}</b><span>${ts.length ? `${Math.min(ts.length, 12)} ${ts.length === 1 ? 'tree' : 'trees'}` : 'Nothing planted then'}</span></button></li>`)
      .join('')}</ul>`);
  on('[data-walk]', (b) => {
    const set = sets.find(([k]) => k === b.dataset.walk)!;
    // Oldest first; long walks pick an even spread of at most twelve trees.
    const all = [...set[2]].sort((a, c) => a.planted - c.planted);
    const n = Math.min(12, all.length);
    const stops = Array.from({ length: n }, (_, i) => all[Math.round((i * (all.length - 1)) / Math.max(1, n - 1))]);
    closeSheet();
    tour([...new Set(stops)]);
  });
}

const memory = $('#memory');
/** Lost in the woods: the grove walks you back to the clearing. */
function walkHome() {
  walkTo(0, 6, 'Heading home through the woods…', 'Home in the clearing.');
}

/** Walk somewhere by yourself, guided: home, or a place you have found before. */
function walkTo(x: number, z: number, lead: string, arrived: string) {
  const home: TreeSave = { id: 0, mood: 'calm', note: '', planted: Date.now(), x, z, rot: 0, growth: 0 };
  ui.classList.add('is-touring');
  memory.innerHTML = `<p class="memory__lead">${esc(lead)}</p><div class="row"><button class="ghost" data-end>Stop here</button></div>`;
  memory.classList.add('is-on');
  memory.querySelector('[data-end]')!.addEventListener('click', () => world.endTour(true));
  world.startTour(
    [home],
    () => world.endTour(false),
    (interrupted) => {
      ui.classList.remove('is-touring');
      memory.classList.remove('is-on');
      if (!interrupted) toast(arrived, true);
      refresh();
    },
  );
}

function tour(stops: TreeSave[]) {
  ui.classList.add('is-touring');
  $('#caption').classList.remove('is-on');
  memory.innerHTML = `<p class="memory__lead">Walking to ${stops.length === 1 ? 'your tree' : `the first of ${stops.length} trees`}…</p><div class="row"><button class="ghost" data-end>End walk</button></div>`;
  memory.classList.add('is-on');
  memory.querySelector('[data-end]')!.addEventListener('click', () => world.endTour(true));
  world.startTour(
    stops,
    (t, i, n) => {
      const def = MOOD_BY_ID[t.mood];
      void haptic('soft');
      audio.deliver(i % 6);
      memory.innerHTML = `
        <p class="memory__when">${since(t.planted)} · ${fmtLong.format(t.planted)}</p>
        <p class="memory__what">You felt <b style="color:${def.css}">${def.name.toLowerCase()}</b>${t.note ? `, and wrote:<em>“${esc(t.note)}”</em>` : '.'}</p>
        <div class="row">${i < n - 1 ? `<button class="ghost" data-next>Next tree (${i + 2} of ${n})</button>` : ''}<button class="ghost" data-end>${i < n - 1 ? 'End walk' : 'Done'}</button></div>`;
      memory.querySelector('[data-next]')?.addEventListener('click', () => world.nextStop());
      memory.querySelector('[data-end]')!.addEventListener('click', () => world.endTour(true));
    },
    (interrupted) => {
      ui.classList.remove('is-touring');
      memory.classList.remove('is-on');
      if (!interrupted && stops.length > 1) toast('That was the last tree on the walk.');
      refresh();
    },
  );
}

/** Once a day: if you planted something a month or a year ago today, offer to visit it. */
function offerAnniversary() {
  const remembered = new Set(save.remembered ?? []);
  if (remembered.has(today) || world.touring || photoOn) return;
  const d = new Date();
  const monthAgo = new Date(d.getFullYear(), d.getMonth() - 1, d.getDate());
  const yearAgo = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
  const match = (when: Date) => save.trees.find((t) => dayNumber(t.planted) === dayNumber(when));
  const t = match(yearAgo) ?? match(monthAgo);
  if (!t) return;
  const label = match(yearAgo) === t ? 'A year ago today' : 'A month ago today';
  save.remembered = [...remembered, today].slice(-60);
  const def = MOOD_BY_ID[t.mood];
  memory.innerHTML = `
    <p class="memory__when">${label}</p>
    <p class="memory__what">you planted <b style="color:${def.css}">${def.name.toLowerCase()}</b>${t.note ? `:<em>“${esc(t.note)}”</em>` : '.'}</p>
    <div class="row"><button class="ghost" data-go>Walk there</button><button class="ghost" data-later>Not now</button></div>`;
  memory.classList.add('is-on');
  memory.querySelector('[data-go]')!.addEventListener('click', () => tour([t]));
  memory.querySelector('[data-later]')!.addEventListener('click', () => memory.classList.remove('is-on'));
}

// -------------------------------------------------------------- photo mode
let photoOn = false;
const hourRange = $('#hourRange') as HTMLInputElement;
const hourLabel = () => {
  const h = clock.hour;
  const hh = Math.floor(h), mm = Math.floor((h % 1) * 60);
  $('#photoHour').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
function photoMode(onOff: boolean) {
  photoOn = onOff;
  ui.classList.toggle('is-photo', onOff);
  if (onOff) {
    hourRange.value = String(clock.hour);
    hourLabel();
    $('#caption').classList.remove('is-on');
  } else {
    clock.hold(null);
    world.post.look = 'natural';
    ui.querySelectorAll('[data-look]').forEach((c) => c.classList.toggle('is-on', (c as HTMLElement).dataset.look === 'natural'));
  }
  refresh();
}
hourRange.addEventListener('input', () => {
  clock.hold(parseFloat(hourRange.value));
  hourLabel();
});
ui.querySelectorAll<HTMLElement>('[data-look]').forEach((b) =>
  b.addEventListener('click', () => {
    world.post.look = b.dataset.look as typeof world.post.look;
    ui.querySelectorAll('[data-look]').forEach((c) => c.classList.toggle('is-on', c === b));
    void haptic('select');
  }),
);
$('#shutter').addEventListener('click', () => {
  const shot = world.capture();
  void haptic('medium');
  audio.ui('click');
  const f = $('#flash');
  f.classList.remove('is-on');
  void f.offsetWidth;
  f.classList.add('is-on');
  const stamp = new Date();
  const name = `mood-garden-${stamp.toISOString().slice(0, 10)}-${stamp.getHours()}${String(stamp.getMinutes()).padStart(2, '0')}.jpg`;
  openSheet(`
    <h2>Your photo</h2>
    <img class="shot" src="${shot}" alt="A photo of your grove" />
    <div class="row"><button class="cta" id="keepShot">${isNative ? 'Save or share' : 'Save'}</button><button class="ghost" id="againShot">Keep shooting</button></div>`);
  sheet.querySelector('#keepShot')!.addEventListener('click', async () => {
    const r = await shareImage(shot, name);
    toast(r === 'failed' ? 'The photo could not be saved.' : r === 'shared' ? 'Shared.' : 'Saved to your downloads.');
    closeSheet();
  });
  sheet.querySelector('#againShot')!.addEventListener('click', closeSheet);
});
$('#photoClose').addEventListener('click', () => photoMode(false));

// ---------------------------------------------------------------- joystick
{
  const stick = $('#stick');
  const knob = $('#knob');
  let id = -1, cx = 0, cy = 0;
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    let dx = (e.clientX - cx) / 46;
    let dy = (e.clientY - cy) / 46;
    const l = Math.hypot(dx, dy);
    if (l > 1) {
      dx /= l;
      dy /= l;
    }
    knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
    world.setMove(dx, -dy);
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1;
    knob.style.transform = '';
    world.setMove(0, 0);
  };
  // Double-tap the stick to stroll on hands-free; tap again (or push it) to stop.
  let downAt = 0, lastTap = 0, travelled = 0;
  stick.addEventListener('pointerup', () => {
    const now = performance.now();
    if (now - downAt > 260 || travelled > 0.35) return;
    if (world.cruise) {
      world.cruise = false;
      lastTap = 0;
      return;
    }
    if (now - lastTap < 380) {
      world.cruise = true;
      lastTap = 0;
      void haptic('light');
      toast('Strolling on. Look around as you go; tap the stick to stop.', true);
    } else lastTap = now;
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId === id) travelled = Math.max(travelled, Math.hypot(e.clientX - cx, e.clientY - cy) / 46);
  });
  stick.addEventListener('pointerdown', (e) => {
    downAt = performance.now();
    travelled = 0;
    id = e.pointerId;
    const r = stick.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    stick.setPointerCapture(id);
    move(e);
  });
  stick.addEventListener('pointermove', move);
  stick.addEventListener('pointerup', up);
  stick.addEventListener('pointercancel', up);
}

// -------------------------------------------------------------------- boot
const clock = new Clock();
const world = new World(document.getElementById('scene') as HTMLCanvasElement, save, audio, clock, { toast, change: refresh, caption, met, found, keepsake });
if (import.meta.env.DEV) Object.assign(window as unknown as Record<string, unknown>, { __world: world, __ui: { tour, walkHome, walkTo, found, keepsake, journalSheet, yearSheet, walkSheet, plantSheet, menuSheet, photoMode, offerAnniversary } });

const native = initNative({
  pause: () => {
    audio.suspend(true);
    writeSave(save);
    void reschedule(save);
  },
  resume: () => audio.suspend(false),
});

// The HUD steps aside while you walk and returns when you stop.
{
  let movingFor = 0, stillFor = 0, last = performance.now();
  window.setInterval(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (!world.active) return;
    const moving = world.moving && !world.touring;
    movingFor = moving ? movingFor + dt : 0;
    stillFor = moving ? 0 : stillFor + dt;
    const roaming = ui.classList.contains('is-roaming');
    if (!roaming && movingFor > 1.5 && !sheet.classList.contains('is-on')) ui.classList.add('is-roaming');
    if (roaming && stillFor > 2.5) {
      ui.classList.remove('is-roaming');
      // Anything that happened on the way, now you have stopped.
      held.splice(0).forEach((t) => toast(t));
    }
  }, 250);
}

const skyPill = $('#skyPill');
const updateSky = () => (skyPill.textContent = clock.describe());
updateSky();
window.setInterval(updateSky, 5000);

world
  .load((p, label) => {
    $('#loadBar').style.transform = `scaleX(${p})`;
    $('#loadText').textContent = label;
  })
  .then(() => {
    $('#loadText').textContent = isNew ? 'Wander. Plant what you feel. Let it grow.' : 'The woods are as you left them.';
    ui.querySelector('.splash__bar')!.classList.add('is-done');
    $('#splash').classList.add('is-ready');
    $('#begin').hidden = false;
    refresh();
    void native.then((n) => n.ready());
  })
  .catch((err) => {
    console.error(err);
    $('#loadText').textContent = 'The grove could not load. Check your connection and reload.';
  });

$('#begin').addEventListener('click', () => {
  audio.start();
  audio.setVolumes(save.sound ? 0.8 : 0, 0.7);
  audio.ui('click');
  $('#splash').classList.add('is-gone');
  ui.classList.add('is-live');
  world.active = true;
  refresh();
  if (matured > 0) window.setTimeout(() => toast(matured === 1 ? 'A tree reached full size while you were away.' : `${matured} trees reached full size while you were away.`), 1200);
  pendingArrivals.forEach((id) => toast(ARRIVED[id] ?? 'Something new lives in your grove.'));
  window.setTimeout(offerAnniversary, 2500);
});
$('#menuBtn').addEventListener('click', () => {
  audio.ui('open');
  menuSheet();
});
$('#plantBtn').addEventListener('click', () => {
  audio.ui('open');
  plantSheet();
});
$('#sitBtn').addEventListener('click', () => {
  world.sit(true);
  void haptic('soft');
  toast('Sitting a while. The sky moves faster while you watch.', true);
});
$('#standBtn').addEventListener('click', () => world.sit(false));
$('#photoBtn').addEventListener('click', () => {
  audio.ui('open');
  photoMode(!photoOn);
});

// Plan notifications whenever the app is put away.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) void reschedule(save);
});

if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

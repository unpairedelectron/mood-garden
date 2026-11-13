import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource-variable/inter';
import './style.css';
import { AudioEngine } from './audio';
import { Clock } from './clock';
import { MOODS, MOOD_BY_ID, type MoodId } from './moods';
import { applyAway, clearSave, loadSave, writeSave, MAX_TREES, type TreeSave } from './state';
import { World } from './world';

const save = loadSave();
const isNew = save.trees.length === 0;
const matured = applyAway(save);
const audio = new AudioEngine();
const ui = document.getElementById('ui')!;
const $ = <T extends HTMLElement>(sel: string) => ui.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

ui.innerHTML = `
  <header class="top">
    <div class="pill" id="countPill"><i class="leaf"></i><b id="count">0</b><span id="countLabel">trees</span></div>
    <button class="round" id="menuBtn" aria-label="Menu"><i></i><i></i><i></i></button>
  </header>
  <div class="coach" id="coach"></div>
  <div class="caption" id="caption"></div>
  <div class="toast" id="toast"></div>
  <div class="stick" id="stick"><div class="stick__knob" id="knob"></div></div>
  <button class="plant" id="plantBtn"><i class="leaf"></i><span>Plant</span></button>
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
function toast(text: string) {
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

const COACH = ['Use the left stick to walk · drag anywhere to look around', 'Tap Plant and tell the grove how you feel', ''];

function refresh() {
  $('#count').textContent = String(save.trees.length);
  $('#countLabel').textContent = save.trees.length === 1 ? 'tree' : 'trees';
  const coach = $('#coach');
  const text = COACH[Math.min(save.tutorial, COACH.length - 1)];
  coach.textContent = text;
  coach.classList.toggle('is-on', !!text && world.active);
}

function caption(t: TreeSave | null) {
  const el = $('#caption');
  if (!t) {
    el.classList.remove('is-on');
    return;
  }
  const def = MOOD_BY_ID[t.mood];
  const stage = t.growth >= 1 ? 'full grown' : t.growth >= 0.6 ? 'nearly grown' : t.growth >= 0.2 ? 'growing' : 'a sapling';
  el.innerHTML = `<b style="color:${def.css}">${def.name}</b><span>${def.tree} · ${stage} · planted ${fmt.format(t.planted)}</span>${t.note ? `<em>“${esc(t.note)}”</em>` : ''}`;
  el.classList.add('is-on');
}

const ARRIVED: Record<string, string> = {
  butterflies: 'Butterflies have found your grove.',
  bees: 'Bees are working the flowers.',
  crickets: 'Crickets have moved in. Listen for them after dark.',
  fireflies: 'Fireflies will rise here at night.',
  songbirds: 'Songbirds are nesting in your trees.',
  flock: 'A flock now passes over your forest.',
};
function met(id: string) {
  if (save.met.includes(id)) return;
  save.met.push(id);
  if (world.active) toast(ARRIVED[id]);
  else pendingArrivals.push(id);
}
const pendingArrivals: string[] = [];

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

function plantSheet() {
  if (save.trees.length >= MAX_TREES) {
    toast('Your grove is full. Let a tree go from the menu to make room.');
    return;
  }
  let picked: MoodId | null = null;
  openSheet(`
    <h2>How do you feel, right now?</h2>
    <p class="sheet__sub" id="moodSub">Each feeling grows into its own kind of tree.</p>
    <div class="moods">${MOODS.map((m) => `<button class="mood" data-mood="${m.id}" style="--c:${m.css}"><i></i><span>${m.name}</span><small>${m.tree}</small></button>`).join('')}</div>
    <input id="note" maxlength="120" placeholder="A few words, if you like" autocomplete="off" />
    <button class="cta" id="doPlant" disabled>Choose a feeling</button>`);
  const btn = sheet.querySelector('#doPlant') as HTMLButtonElement;
  sheet.querySelectorAll<HTMLButtonElement>('.mood').forEach((b) =>
    b.addEventListener('click', () => {
      picked = b.dataset.mood as MoodId;
      const def = MOOD_BY_ID[picked];
      sheet.querySelectorAll('.mood').forEach((o) => o.classList.toggle('is-on', o === b));
      (sheet.querySelector('#moodSub') as HTMLElement).textContent = def.feeling;
      btn.disabled = false;
      btn.textContent = `Plant a ${def.tree.toLowerCase()}`;
      btn.style.setProperty('--c', def.css);
      audio.ui('click');
      navigator.vibrate?.(6);
    }),
  );
  btn.addEventListener('click', () => {
    if (!picked) return;
    const note = (sheet.querySelector('#note') as HTMLInputElement).value;
    closeSheet();
    if (world.plant(picked, note) && save.trees.length === 1) {
      toast('Planted just ahead of you. It grows while you walk, and while you are away.');
    }
  });
}

function menuSheet() {
  const grown = world.grown;
  const life = world.life.creatures;
  const trees = [...save.trees].sort((a, b) => b.planted - a.planted);
  openSheet(`
    <h2>Your grove</h2>
    <div class="stats"><div><b>${save.trees.length}</b>planted</div><div><b>${grown}</b>grown</div><div><b>${life.filter((c) => c.here).length}</b>kinds of life</div></div>
    <h3>Who lives here</h3>
    <ul class="goals">${life.map((c) => `<li class="${c.here ? 'is-done' : ''}"><i></i><div><strong>${c.name}</strong><span>${c.here ? 'Living in your grove' : c.needs}</span></div></li>`).join('')}</ul>
    <p class="sheet__tip">Nothing here is placed by hand. Ferns, flowers and creatures arrive on their own as your trees grow.</p>
    <h3>Your trees</h3>
    ${trees.length
      ? `<ul class="journal">${trees
          .map((t) => {
            const def = MOOD_BY_ID[t.mood];
            return `<li style="--c:${def.css}"><i></i><div><strong>${def.name}</strong><time>${fmt.format(t.planted)} · ${Math.round(t.growth * 100)}%</time>${t.note ? `<p>${esc(t.note)}</p>` : ''}<button class="link" data-id="${t.id}">Let go</button></div></li>`;
          })
          .join('')}</ul>`
      : '<p class="sheet__sub">Nothing planted yet.</p>'}
    <div class="row">
      <button class="ghost" id="soundBtn">Sound: ${save.sound ? 'on' : 'off'}</button>
      <button class="ghost" id="resetBtn">Start over</button>
    </div>
    <p class="credit">Trees, plants, rocks, ground and skies are CC0 scans from Poly Haven.</p>`);
  sheet.querySelectorAll<HTMLButtonElement>('.link').forEach((b) => {
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
  stick.addEventListener('pointerdown', (e) => {
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
const world = new World(document.getElementById('scene') as HTMLCanvasElement, save, audio, clock, { toast, change: refresh, caption, met });
if (import.meta.env.DEV) (window as unknown as { __world: World }).__world = world;

world
  .load((p, label) => {
    $('#loadBar').style.transform = `scaleX(${p})`;
    $('#loadText').textContent = label;
  })
  .then(() => {
    $('#loadText').textContent = 'Wander. Plant what you feel. Let it grow.';
    ui.querySelector('.splash__bar')!.classList.add('is-done');
    $('#splash').classList.add('is-ready');
    $('#begin').hidden = false;
    refresh();
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
  pendingArrivals.forEach((id) => toast(ARRIVED[id]));
});
$('#menuBtn').addEventListener('click', () => {
  audio.ui('open');
  menuSheet();
});
$('#plantBtn').addEventListener('click', () => {
  audio.ui('open');
  plantSheet();
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

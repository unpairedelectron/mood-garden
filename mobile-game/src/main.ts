import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource-variable/inter';
import './style.css';
import { AudioEngine } from './audio';
import { Garden, type Tile } from './garden';
import { MOODS, MOOD_BY_ID, type MoodId } from './moods';
import { applyAway, clearSave, loadSave, writeSave, MAX_RADIUS } from './state';

const save = loadSave();
const isNew = !save.tiles.some((t) => t.plant) && save.light === 0;
const gathered = applyAway(save);
const audio = new AudioEngine();
const ui = document.getElementById('ui')!;
const $ = <T extends HTMLElement>(sel: string) => ui.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

ui.innerHTML = `
  <header class="top">
    <div class="pill" id="lightPill" aria-label="Light"><i class="gem"></i><b id="light">0</b></div>
    <div class="pill pill--quiet" id="landPill"><span>New land</span><i class="gem"></i><b id="cost">0</b></div>
    <button class="round" id="menuBtn" aria-label="Menu"><i></i><i></i><i></i></button>
  </header>
  <div class="coach" id="coach"></div>
  <div class="toast" id="toast"></div>
  <footer class="bottom"><button class="feel" id="feelBtn"><span>How do you feel?</span></button></footer>
  <div class="scrim" id="scrim"></div>
  <section class="sheet" id="sheet" aria-live="polite"></section>
  <div class="splash" id="splash">
    <div class="splash__kicker">Pocket edition</div>
    <h1>Mood <em>Garden</em></h1>
    <p>A small floating garden that grows from how you feel.</p>
    <button id="begin">${isNew ? 'Begin' : 'Return to your garden'}</button>
  </div>`;

let toastTimer = 0;
function toast(text: string) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('is-on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-on'), 4200);
}

const COACH = [
  'Tap a tile and tell the garden how you feel',
  'Tap your seedling to water it',
  'When it has grown, tap the light it gathers',
  'Spend light on a glowing outline to raise new land',
];

function refresh() {
  $('#light').textContent = String(save.light);
  $('#cost').textContent = String(garden.nextCost);
  $('#landPill').classList.toggle('is-ready', save.light >= garden.nextCost && garden.canGrowIsland);
  $('#landPill').style.display = garden.canGrowIsland ? '' : 'none';
  const coach = $('#coach');
  const step = save.coach;
  coach.textContent = step < COACH.length ? COACH[step] : '';
  coach.classList.toggle('is-on', step < COACH.length && garden.active);
}

function flyLight(amount: number, x: number, y: number, css: string) {
  const pill = $('#lightPill');
  if (amount > 0) {
    const r = pill.getBoundingClientRect();
    const dot = document.createElement('i');
    dot.className = 'fly';
    dot.style.cssText = `left:${x}px;top:${y}px;background:${css};box-shadow:0 0 14px ${css}`;
    ui.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transform = `translate(${r.left + 18 - x}px, ${r.top + r.height / 2 - y}px) scale(0.4)`;
      dot.style.opacity = '0.2';
    });
    window.setTimeout(() => dot.remove(), 650);
  }
  window.setTimeout(() => {
    pill.classList.remove('bump');
    void pill.offsetWidth;
    pill.classList.add('bump');
    refresh();
  }, amount > 0 ? 560 : 0);
}

// ------------------------------------------------------------------ sheets
const sheet = $('#sheet');
const scrim = $('#scrim');
function openSheet(html: string) {
  sheet.innerHTML = `<div class="sheet__grip"></div>${html}`;
  sheet.classList.add('is-on');
  scrim.classList.add('is-on');
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

function moodSheet(tile: Tile) {
  let picked: MoodId | null = null;
  openSheet(`
    <h2>How do you feel, right now?</h2>
    <p class="sheet__sub" id="moodSub">Whatever it is, it can grow here.</p>
    <div class="moods">${MOODS.map((m) => `<button class="mood" data-mood="${m.id}" style="--c:${m.css}"><i></i><span>${m.name}</span></button>`).join('')}</div>
    <input id="note" maxlength="120" placeholder="A few words, if you like" autocomplete="off" />
    <button class="cta" id="plantBtn" disabled>Choose a feeling</button>`);
  const btn = sheet.querySelector('#plantBtn') as HTMLButtonElement;
  sheet.querySelectorAll<HTMLButtonElement>('.mood').forEach((b) =>
    b.addEventListener('click', () => {
      picked = b.dataset.mood as MoodId;
      const def = MOOD_BY_ID[picked];
      sheet.querySelectorAll('.mood').forEach((o) => o.classList.toggle('is-on', o === b));
      (sheet.querySelector('#moodSub') as HTMLElement).textContent = def.feeling;
      btn.disabled = false;
      btn.textContent = `Plant ${def.name.toLowerCase()}`;
      btn.style.setProperty('--c', def.css);
      audio.ui('click');
      navigator.vibrate?.(6);
    }),
  );
  btn.addEventListener('click', () => {
    if (!picked) return;
    garden.plant(tile, picked, (sheet.querySelector('#note') as HTMLInputElement).value);
    closeSheet();
  });
}

function plantCard(tile: Tile) {
  const p = tile.save.plant;
  if (!p) return;
  const def = MOOD_BY_ID[p.mood];
  const grown = p.growth >= 1;
  const harmony = garden.harmony(tile);
  const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(p.planted);
  const waitWater = Math.ceil(tile.waterCd);
  openSheet(`
    <div class="card" style="--c:${def.css}">
      <div class="card__kicker">${def.name} · planted ${date}</div>
      <h2>${def.plant}</h2>
      ${p.note ? `<p class="card__note">“${esc(p.note)}”</p>` : ''}
      <div class="bar"><i style="transform:scaleX(${p.growth.toFixed(3)})"></i></div>
      <p class="sheet__sub">${grown
        ? `Fully grown. Gathering light${harmony ? ` ${25 * harmony}% faster beside ${harmony} other feeling${harmony > 1 ? 's' : ''}` : ''}.`
        : `${Math.round(p.growth * 100)}% grown${tile.waterT > 0 ? ' — freshly watered' : ''}.`}</p>
      <p class="sheet__tip">Different feelings planted side by side help each other gather light.</p>
      <div class="row">
        ${grown ? '' : `<button class="cta" id="waterBtn" ${waitWater > 0 ? 'disabled' : ''}>${waitWater > 0 ? `Water again in ${waitWater}s` : 'Water'}</button>`}
        <button class="ghost" id="letGo">Let it go</button>
      </div>
    </div>`);
  sheet.querySelector('#waterBtn')?.addEventListener('click', () => {
    garden.water(tile);
    closeSheet();
  });
  const letGo = sheet.querySelector('#letGo') as HTMLButtonElement;
  let armed = false;
  letGo.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      letGo.textContent = 'Tap again to let it go';
      return;
    }
    garden.remove(tile);
    closeSheet();
  });
}

function menuSheet() {
  const plants = [...garden.tiles.values()].filter((t) => t.save.plant);
  const grown = plants.filter((t) => t.save.plant!.growth >= 1);
  const kinds = new Set(grown.map((t) => t.save.plant!.mood)).size;
  const full = 1 + 3 * MAX_RADIUS * (MAX_RADIUS + 1);
  const goals: [string, boolean][] = [
    ['Plant your first feeling', plants.length > 0 || save.matured > 0],
    ['Raise new land', garden.tiles.size > 7],
    [`Grow all six feelings at once (${kinds}/6)`, save.rainbow],
    [`Complete the island (${garden.tiles.size}/${full})`, garden.tiles.size >= full],
  ];
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const list = plants
    .sort((a, b) => b.save.plant!.planted - a.save.plant!.planted)
    .map((t) => {
      const p = t.save.plant!;
      const def = MOOD_BY_ID[p.mood];
      return `<li style="--c:${def.css}"><i></i><div><strong>${def.name}</strong><time>${fmt.format(p.planted)}</time>${p.note ? `<p>${esc(p.note)}</p>` : ''}</div></li>`;
    })
    .join('');
  openSheet(`
    <h2>Your garden</h2>
    <div class="stats"><div><b>${plants.length}</b>growing</div><div><b>${save.matured}</b>grown in all</div><div><b>${garden.tiles.size}</b>tiles</div></div>
    <ul class="goals">${goals.map(([t, done]) => `<li class="${done ? 'is-done' : ''}"><i></i>${t}</li>`).join('')}</ul>
    <h3>Feelings growing here</h3>
    ${list ? `<ul class="journal">${list}</ul>` : '<p class="sheet__sub">Nothing planted yet. Tap any tile to begin.</p>'}
    <h3>How to play</h3>
    <p class="sheet__sub">Tap a tile to plant a feeling. Tap a plant to water it or gather its light. Hold a plant for details. Drag to turn the island, pinch to zoom. The garden keeps growing while you are away.</p>
    <div class="row">
      <button class="ghost" id="soundBtn">Sound: ${save.sound ? 'on' : 'off'}</button>
      <button class="ghost" id="resetBtn">Start over</button>
    </div>`);
  sheet.querySelector('#soundBtn')!.addEventListener('click', (e) => {
    save.sound = !save.sound;
    audio.setVolumes(save.sound ? 0.8 : 0, 0.8);
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
    garden.persist = false;
    clearSave();
    location.reload();
  });
}

// -------------------------------------------------------------------- boot
const garden = new Garden(document.getElementById('scene') as HTMLCanvasElement, save, audio, {
  light: flyLight,
  toast,
  change: refresh,
  emptyTile: moodSheet,
  plantCard,
});
garden.start();
refresh();

$('#begin').addEventListener('click', () => {
  audio.start();
  audio.setVolumes(save.sound ? 0.8 : 0, 0.8);
  audio.ui('click');
  $('#splash').classList.add('is-gone');
  ui.classList.add('is-live');
  garden.active = true;
  refresh();
  if (gathered > 0) window.setTimeout(() => toast(`While you were away, your garden gathered ${gathered} light.`), 900);
});
$('#menuBtn').addEventListener('click', () => {
  audio.ui('open');
  menuSheet();
});
$('#feelBtn').addEventListener('click', () => {
  const t = garden.firstEmpty;
  if (!t) {
    toast(garden.canGrowIsland ? 'Every tile is planted. Raise new land, or let a plant go.' : 'Your island is full. Hold a plant to let it go.');
    return;
  }
  audio.ui('open');
  moodSheet(t);
});
$('#landPill').addEventListener('click', () => toast(`Tap a glowing outline at the island's edge to raise land for ${garden.nextCost} light.`));

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

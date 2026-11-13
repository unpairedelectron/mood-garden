// Your year in feelings: a calendar of the days you planted, a tally of
// feelings, a few words about the shape of your year, and a map of the grove
// where each dot is a tree you can tap to visit.

import { dayNumber } from './clock';
import { MOODS, MOOD_BY_ID, type MoodId } from './moods';
import type { Paths } from './paths';
import type { TreeSave } from './state';
import { HILL, POND, WORLD, stream } from './terrain';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function yearHtml(trees: TreeSave[], year: number, years: number[]): string {
  const inYear = trees.filter((t) => new Date(t.planted).getFullYear() === year);
  const byDay = new Map<number, TreeSave>();
  for (const t of inYear) byDay.set(dayNumber(t.planted), t);

  // Calendar: weeks as columns, Monday at the top.
  const jan1 = new Date(year, 0, 1);
  const offset = (jan1.getDay() + 6) % 7;
  const days = (new Date(year + 1, 0, 1).getTime() - jan1.getTime()) / 864e5;
  const today = dayNumber();
  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<i class="cal__pad"></i>';
  for (let d = 0; d < Math.round(days); d++) {
    const date = new Date(year, 0, 1 + d);
    const dn = dayNumber(date);
    const t = byDay.get(dn);
    const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (t) cells += `<button class="cal__day is-on" style="--c:${MOOD_BY_ID[t.mood].css}" data-tree="${t.id}" aria-label="${label}: ${MOOD_BY_ID[t.mood].name}"></button>`;
    else cells += `<i class="cal__day${dn === today ? ' is-today' : dn > today ? ' is-future' : ''}" title="${label}"></i>`;
  }
  const monthLabels = MONTHS.map((m, i) => {
    const col = Math.floor((offset + (new Date(year, i, 1).getTime() - jan1.getTime()) / 864e5) / 7);
    return `<span style="grid-column:${col + 1}">${m}</span>`;
  }).join('');

  // Tally of feelings.
  const counts = new Map<MoodId, number>();
  for (const t of inYear) counts.set(t.mood, (counts.get(t.mood) ?? 0) + 1);
  const total = inYear.length;
  const max = Math.max(1, ...counts.values());
  const bars = MOODS.map(
    (m) => `<li style="--c:${m.css}"><span>${m.name}</span><i style="--w:${((counts.get(m.id) ?? 0) / max) * 100}%"></i><b>${counts.get(m.id) ?? 0}</b></li>`,
  ).join('');

  return `
    <h2>Your year in feelings</h2>
    <div class="years">${years.map((y) => `<button class="chip${y === year ? ' is-on' : ''}" data-year="${y}">${y}</button>`).join('')}</div>
    <p class="sheet__sub">${total ? `${total} ${total === 1 ? 'day' : 'days'} planted in ${year}. ${reflect(inYear)}` : `Nothing planted in ${year} yet. Each day you plant a feeling, a square fills in here.`}</p>
    <div class="cal"><div class="cal__months">${monthLabels}</div><div class="cal__grid">${cells}</div></div>
    <ul class="tally">${bars}</ul>
    <h3>The grove from above</h3>
    <div class="map"><canvas id="groveMap" width="640" height="640"></canvas></div>
    <p class="sheet__tip">Tap a tree on the map or a day above to read it and walk there.</p>
    <div id="pick"></div>`;
}

/** A sentence or two about the shape of the year. Gentle, never judging. */
function reflect(trees: TreeSave[]): string {
  if (trees.length < 3) return 'The grove is just beginning.';
  const counts = new Map<MoodId, number>();
  for (const t of trees) counts.set(t.mood, (counts.get(t.mood) ?? 0) + 1);
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const month = new Map<number, Map<MoodId, number>>();
  for (const t of trees) {
    const m = new Date(t.planted).getMonth();
    if (!month.has(m)) month.set(m, new Map());
    const mm = month.get(m)!;
    mm.set(t.mood, (mm.get(t.mood) ?? 0) + 1);
  }
  let line = `Most often you felt ${MOOD_BY_ID[top[0]].name.toLowerCase()}.`;
  // The month where joy (or calm) was most present.
  for (const pick of ['joy', 'calm', 'hope'] as MoodId[]) {
    let best = -1, bm = -1;
    for (const [m, mm] of month) {
      const n = mm.get(pick) ?? 0;
      if (n > best) {
        best = n;
        bm = m;
      }
    }
    if (best >= 2 && pick !== top[0]) {
      line += ` ${MOOD_BY_ID[pick].name} came most in ${LONG_MONTHS[bm]}.`;
      break;
    }
  }
  if ((counts.get('sorrow') ?? 0) >= 2) line += ' The sorrow trees are part of it too.';
  return line;
}

/** Draw the grove from above. Returns a hit-test for taps. */
export function drawMap(cv: HTMLCanvasElement, trees: TreeSave[], paths: Paths, me: { x: number; z: number; yaw: number }, highlight: Set<number>) {
  const g = cv.getContext('2d')!;
  const S = cv.width;
  const view = 150; // metres across
  const k = S / view;
  const px = (x: number) => S / 2 + x * k;
  const pz = (z: number) => S / 2 + z * k;
  g.fillStyle = '#25301f';
  g.fillRect(0, 0, S, S);
  // Worn paths and water from the shared mask.
  const tex = paths.texture.image as { data: Uint8Array; width: number; height: number };
  const img = g.createImageData(S, S);
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const x = (i - S / 2) / k, z = (j - S / 2) / k;
      const u = Math.floor((x / WORLD + 0.5) * tex.width), v = Math.floor((z / WORLD + 0.5) * tex.height);
      const o = (j * S + i) * 4;
      const q = (v * tex.width + u) * 4;
      const path = tex.data[q] / 255, water = tex.data[q + 1] / 255;
      // Meadow green, warming toward the hill.
      const hill = Math.max(0, 1 - Math.hypot(x - HILL.x, z - HILL.z) / HILL.radius);
      let r = 46 + hill * 30, gg = 62 + hill * 22, b = 38;
      r += (138 - r) * path * 0.8;
      gg += (112 - gg) * path * 0.8;
      b += (80 - b) * path * 0.8;
      r += (52 - r) * water;
      gg += (92 - gg) * water;
      b += (112 - b) * water;
      img.data[o] = r;
      img.data[o + 1] = gg;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // Hill contours.
  g.strokeStyle = 'rgba(255,240,200,0.18)';
  g.lineWidth = 1.5;
  for (const f of [0.35, 0.65, 0.9]) {
    g.beginPath();
    g.arc(px(HILL.x), pz(HILL.z), HILL.radius * f * k, 0, 7);
    g.stroke();
  }
  // Stream line drawn over the mask so it reads at small scale.
  g.strokeStyle = 'rgba(120,170,200,0.7)';
  g.lineWidth = 3;
  g.beginPath();
  stream.forEach((p, i) => (i ? g.lineTo(px(p.x), pz(p.z)) : g.moveTo(px(p.x), pz(p.z))));
  g.stroke();
  g.fillStyle = 'rgba(247,241,230,0.65)';
  g.font = `${Math.round(S / 34)}px Inter Variable, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillText('pond', px(POND.x), pz(POND.z) + 4);
  g.fillText('hill', px(HILL.x), pz(HILL.z) + 4);
  // Trees: a dot per tree, sized by growth.
  const hits: { t: TreeSave; x: number; y: number }[] = [];
  for (const t of trees) {
    const x = px(t.x), y = pz(t.z);
    const r = (3 + 6 * Math.min(1, t.growth)) * (S / 640) * 1.4;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fillStyle = MOOD_BY_ID[t.mood].css;
    g.globalAlpha = highlight.size && !highlight.has(t.id) ? 0.3 : 1;
    g.fill();
    g.globalAlpha = 1;
    if (highlight.has(t.id)) {
      g.strokeStyle = '#fff8ea';
      g.lineWidth = 2.5;
      g.stroke();
    }
    hits.push({ t, x, y });
  }
  // You are here.
  g.save();
  g.translate(px(me.x), pz(me.z));
  g.rotate(-me.yaw + Math.PI);
  g.fillStyle = '#f3d9a4';
  g.beginPath();
  g.moveTo(0, 11);
  g.lineTo(7, -7);
  g.lineTo(0, -3);
  g.lineTo(-7, -7);
  g.closePath();
  g.fill();
  g.restore();
  return (cx: number, cy: number): TreeSave | null => {
    let best: TreeSave | null = null, bd = 22 * (S / 640) * 1.4;
    for (const h of hits) {
      const d = Math.hypot(h.x - cx, h.y - cy);
      if (d < bd) {
        bd = d;
        best = h.t;
      }
    }
    return best;
  };
}

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { getGame } from '../game/Game';
import { commands, frameBus, ui, type Quality, type UIState } from '../game/core/store';
import { MOODS, MOOD_BY_ID, type MoodId } from '../game/data/moods';
import './hud.css';

function useUI<T>(sel: (s: UIState) => T): T {
  return useSyncExternalStore(ui.subscribe, () => sel(ui.get()));
}
const sfx = (k: 'hover' | 'click') => getGame()?.audio.ui(k);

function MenuButton({ children, onClick, primary, disabled }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      className={`menu-btn${primary ? ' menu-btn--primary' : ''}`}
      disabled={disabled}
      onMouseEnter={() => sfx('hover')}
      onClick={() => {
        sfx('click');
        onClick();
      }}
    >
      <span>{children}</span>
    </button>
  );
}

// ------------------------------------------------------------------ loading
function Loading() {
  const p = useUI((s) => s.loading);
  const text = useUI((s) => s.loadingText);
  return (
    <div className="loading">
      <div className="loading__mark">Mood Garden</div>
      <div className="loading__bar">
        <i style={{ transform: `scaleX(${p})` }} />
      </div>
      <div className="loading__text">{text}</div>
    </div>
  );
}

// ----------------------------------------------------------------- settings
function SettingsPanel({ onBack }: { onBack: () => void }) {
  const s = useUI((st) => st.settings);
  const set = (patch: Partial<typeof s>) => commands.send({ type: 'settings', patch });
  const qualities: Quality[] = ['low', 'medium', 'high', 'ultra'];
  return (
    <div className="panel">
      <h2 className="panel__title">Settings</h2>
      <div className="field">
        <label>Graphics</label>
        <div className="segmented">
          {qualities.map((q) => (
            <button key={q} className={s.quality === q ? 'on' : ''} onClick={() => { sfx('click'); set({ quality: q }); }}>
              {q}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="vol-master">Master volume</label>
        <input id="vol-master" type="range" min={0} max={1} step={0.01} value={s.master} onChange={(e) => set({ master: +e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="vol-music">Music</label>
        <input id="vol-music" type="range" min={0} max={1} step={0.01} value={s.music} onChange={(e) => set({ music: +e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="sens">Look sensitivity</label>
        <input id="sens" type="range" min={0.3} max={2.5} step={0.05} value={s.sensitivity} onChange={(e) => set({ sensitivity: +e.target.value })} />
      </div>
      <div className="field">
        <label>Invert vertical look</label>
        <div className="segmented">
          <button className={!s.invertY ? 'on' : ''} onClick={() => set({ invertY: false })}>Off</button>
          <button className={s.invertY ? 'on' : ''} onClick={() => set({ invertY: true })}>On</button>
        </div>
      </div>
      <MenuButton onClick={onBack}>Back</MenuButton>
    </div>
  );
}

// -------------------------------------------------------------------- title
function Title() {
  const hasSave = useUI((s) => s.hasSave);
  const awakened = useUI((s) => s.awakened);
  const [view, setView] = useState<'menu' | 'settings' | 'confirm'>('menu');
  return (
    <div className="title">
      <div className="title__shade" />
      <div className="title__inner">
        <div className="title__kicker">An island that grows from what you feel</div>
        <h1 className="title__logo">
          Mood <em>Garden</em>
        </h1>
        <div className="title__rule">
          {MOODS.map((m) => (
            <i key={m.id} style={{ background: m.css, opacity: awakened.includes(m.id) ? 1 : 0.28 }} />
          ))}
        </div>
        {view === 'menu' && (
          <nav className="title__menu">
            {hasSave && (
              <MenuButton primary onClick={() => commands.send({ type: 'start', fresh: false })}>
                Continue
              </MenuButton>
            )}
            <MenuButton primary={!hasSave} onClick={() => (hasSave ? setView('confirm') : commands.send({ type: 'start', fresh: true }))}>
              New Journey
            </MenuButton>
            <MenuButton onClick={() => setView('settings')}>Settings</MenuButton>
          </nav>
        )}
        {view === 'confirm' && (
          <div className="panel">
            <h2 className="panel__title">Begin again?</h2>
            <p className="panel__text">The island will fall quiet and your planted feelings will be cleared.</p>
            <MenuButton primary onClick={() => commands.send({ type: 'start', fresh: true })}>
              Start a new journey
            </MenuButton>
            <MenuButton onClick={() => setView('menu')}>Keep my garden</MenuButton>
          </div>
        )}
        {view === 'settings' && <SettingsPanel onBack={() => setView('menu')} />}
      </div>
      <div className="title__foot">Best with headphones · Keyboard & mouse, gamepad or touch</div>
    </div>
  );
}

// ------------------------------------------------------------------ compass
const CARDINALS: [string, number, number][] = [
  ['N', 0, -1], ['NE', 1, -1], ['E', 1, 0], ['SE', 1, 1], ['S', 0, 1], ['SW', -1, 1], ['W', -1, 0], ['NW', -1, -1],
];

function Compass() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const pool = new Map<string, HTMLElement>();
    const HALF = Math.PI * 0.55;
    const place = (node: HTMLElement, bearing: number) => {
      const k = bearing / HALF;
      const vis = Math.abs(k) <= 1;
      node.style.opacity = vis ? String(1 - Math.pow(Math.abs(k), 4)) : '0';
      node.style.transform = `translateX(${k * el.clientWidth * 0.5}px)`;
    };
    for (const [name] of CARDINALS) {
      const n = document.createElement('span');
      n.className = `compass__card${name.length === 1 ? '' : ' compass__card--minor'}`;
      n.textContent = name;
      el.appendChild(n);
      pool.set('c:' + name, n);
    }
    return frameBus.on((f) => {
      const s = Math.sin(f.yaw);
      const c = Math.cos(f.yaw);
      for (const [name, dx, dz] of CARDINALS) place(pool.get('c:' + name)!, Math.atan2(dx * c - dz * s, -dx * s - dz * c));
      const seen = new Set<string>();
      for (const m of f.markers) {
        const key = 'm:' + m.id;
        seen.add(key);
        let n = pool.get(key);
        if (!n) {
          n = document.createElement('span');
          n.className = `compass__mark compass__mark--${m.kind}`;
          n.innerHTML = '<i></i><b></b>';
          el.appendChild(n);
          pool.set(key, n);
        }
        n.style.setProperty('--c', m.color);
        n.classList.toggle('is-done', m.done);
        (n.lastChild as HTMLElement).textContent = m.kind === 'mote' ? '' : `${Math.round(m.dist)}m`;
        // Markers behind the camera cling to the nearest edge.
        const b = Math.max(-HALF * 0.985, Math.min(HALF * 0.985, m.bearing));
        place(n, b);
        if (m.kind === 'mote' && Math.abs(m.bearing) > HALF) n.style.opacity = '0.35';
      }
      for (const [key, n] of pool) {
        if (key.startsWith('m:') && !seen.has(key)) {
          n.remove();
          pool.delete(key);
        }
      }
    });
  }, []);
  return (
    <div className="compass">
      <div className="compass__strip" ref={ref} />
      <div className="compass__needle" />
    </div>
  );
}

// ---------------------------------------------------------------- play HUD
function Keycap({ k }: { k: string }) {
  return <kbd className="keycap">{k}</kbd>;
}

function PlayHud() {
  const objective = useUI((s) => s.objective);
  const detail = useUI((s) => s.objectiveDetail);
  const prompt = useUI((s) => s.prompt);
  const promptKey = useUI((s) => s.promptKey);
  const grove = useUI((s) => s.grove);
  const awakened = useUI((s) => s.awakened);
  const heartTouched = useUI((s) => s.heartTouched);
  const touch = useUI((s) => s.touch);
  const time = useUI((s) => s.timeLabel);
  return (
    <div className="hud">
      <Compass />
      <div className="objective">
        <div className="objective__label">Current path</div>
        <div className="objective__title">{objective}</div>
        <div className="objective__detail">{detail}</div>
      </div>
      <div className="status">
        <div className="status__time">{time}</div>
        {heartTouched && (
          <div className="status__groves" aria-label="Groves awakened">
            {MOODS.map((m) => (
              <i key={m.id} title={m.name} className={awakened.includes(m.id) ? 'on' : ''} style={{ '--c': m.css } as CSSProperties} />
            ))}
          </div>
        )}
        {grove && (
          <div className="status__motes" style={{ '--c': MOOD_BY_ID[grove.id].css } as CSSProperties}>
            <span>{MOOD_BY_ID[grove.id].name} motes</span>
            <div>
              {Array.from({ length: grove.need }, (_, i) => (
                <i key={i} className={i < grove.have ? 'on' : ''} />
              ))}
            </div>
          </div>
        )}
      </div>
      {prompt && (
        <div className="prompt" onPointerDown={() => getGame()?.input.touchButton('Act', true)} onPointerUp={() => getGame()?.input.touchButton('Act', false)}>
          <Keycap k={promptKey} />
          <span>{prompt}</span>
        </div>
      )}
      {!touch && (
        <div className="legend">
          <span><Keycap k="F" /> Feel</span>
          <span><Keycap k="Q" /> Sense motes</span>
          <span><Keycap k="J" /> Journal</span>
          <span><Keycap k="Esc" /> Pause</span>
        </div>
      )}
    </div>
  );
}

function RegionBanner() {
  const region = useUI((s) => s.region);
  const key = useUI((s) => s.regionKey);
  if (!region) return null;
  return (
    <div className="region" key={key}>
      <div className="region__name">{region}</div>
      <div className="region__line" />
    </div>
  );
}

function Toast() {
  const toast = useUI((s) => s.toast);
  const key = useUI((s) => s.toastKey);
  if (!toast) return null;
  return (
    <div className="toast" key={key}>
      {toast}
    </div>
  );
}

function CardView() {
  const card = useUI((s) => s.card);
  // Keep the last card mounted while it fades out.
  const [shown, setShown] = useState(card);
  useEffect(() => {
    if (card) setShown(card);
  }, [card]);
  if (!shown) return null;
  return (
    <div className={`card${card ? ' is-in' : ''}`} style={{ '--c': shown.color } as CSSProperties}>
      <div className="card__kicker">{shown.kicker}</div>
      <div className="card__title">{shown.title}</div>
      <div className="card__rule" />
      <div className="card__verse">{shown.verse}</div>
    </div>
  );
}

function Cinematic() {
  const phase = useUI((s) => s.phase);
  const subtitle = useUI((s) => s.subtitle);
  const on = phase === 'intro' || phase === 'cinematic';
  return (
    <div className={`cine${on ? ' is-on' : ''}`}>
      <div className="cine__bar cine__bar--top" />
      <div className="cine__bar cine__bar--bottom" />
      {subtitle && (
        <div className="cine__sub" key={subtitle}>
          {subtitle}
        </div>
      )}
      {phase === 'intro' && (
        <button className="cine__skip" onClick={() => commands.send({ type: 'skip' })}>
          Skip <Keycap k="Space" />
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------ feeling wheel
function MoodWheel() {
  const [hover, setHover] = useState<MoodId | null>(null);
  const [picked, setPicked] = useState<MoodId | null>(null);
  const [note, setNote] = useState('');
  const close = () => commands.send({ type: 'wheel', open: false });
  const plant = (mood: MoodId) => commands.send({ type: 'feel', mood, note });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.tagName === 'INPUT';
      // The engine handles Escape itself, except while the note field has focus.
      if (e.code === 'Escape' && typing) close();
      else if (e.code === 'Enter' && picked) plant(picked);
      else if (!typing && /^Digit[1-6]$/.test(e.code)) setPicked(MOODS[+e.code.slice(5) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const focus = picked ?? hover;
  const def = focus ? MOOD_BY_ID[focus] : null;
  return (
    <div className="wheel" onClick={close}>
      <div className="wheel__ring" onClick={(e) => e.stopPropagation()}>
        {MOODS.map((m, i) => {
          const a = (i / MOODS.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <button
              key={m.id}
              className={`wheel__petal${picked === m.id ? ' is-picked' : ''}`}
              style={{ '--c': m.css, '--x': `${Math.cos(a) * 168}px`, '--y': `${Math.sin(a) * 168}px` } as CSSProperties}
              onMouseEnter={() => { setHover(m.id); sfx('hover'); }}
              onMouseLeave={() => setHover(null)}
              onClick={() => { sfx('click'); setPicked(m.id); }}
            >
              <i />
              <span>{m.name}</span>
            </button>
          );
        })}
        <div className="wheel__core" style={{ '--c': def?.css ?? '#f3d9a4' } as CSSProperties}>
          {!def && (
            <>
              <div className="wheel__q">How do you feel, right now?</div>
              <div className="wheel__hint">Whatever it is, it can grow here.</div>
            </>
          )}
          {def && (
            <>
              <div className="wheel__name">{def.name}</div>
              <div className="wheel__hint">{def.feeling}</div>
            </>
          )}
          {picked && (
            <div className="wheel__form">
              <input
                autoFocus
                maxLength={140}
                placeholder="A few words, if you like"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="A note about this feeling"
              />
              <button onClick={() => plant(picked)}>Plant it</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ journal
function Journal() {
  const journal = useUI((s) => s.journal);
  const close = () => commands.send({ type: 'journal', open: false });
  const counts = MOODS.map((m) => journal.filter((e) => e.mood === m.id).length);
  const total = Math.max(1, journal.length);
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div className="journal" onClick={close}>
      <aside className="journal__sheet" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Feeling Journal</h2>
          <button className="icon-btn" onClick={close} aria-label="Close journal">×</button>
        </header>
        {journal.length === 0 ? (
          <p className="journal__empty">
            Nothing planted yet. Press <Keycap k="F" /> anywhere on the island to name a feeling and watch it take root.
          </p>
        ) : (
          <>
            <div className="journal__mix" aria-label="Mix of feelings">
              {MOODS.map((m, i) => counts[i] > 0 && <i key={m.id} title={`${m.name}: ${counts[i]}`} style={{ background: m.css, flexGrow: counts[i] / total }} />)}
            </div>
            <ul>
              {[...journal].reverse().map((e) => {
                const m = MOOD_BY_ID[e.mood];
                return (
                  <li key={e.id} style={{ '--c': m.css } as CSSProperties}>
                    <i />
                    <div>
                      <div className="journal__row">
                        <strong>{m.name}</strong>
                        <time>{fmt.format(e.time)}</time>
                      </div>
                      {e.note && <p>{e.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}

// -------------------------------------------------------------------- pause
function Pause() {
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const awakened = useUI((s) => s.awakened);
  const journal = useUI((s) => s.journal);
  return (
    <div className="pause">
      <div className="pause__inner">
        <div className="title__kicker">Paused</div>
        <h1 className="pause__logo">Mood <em>Garden</em></h1>
        <div className="pause__stats">
          <span><b>{awakened.length}</b>/6 groves awake</span>
          <span><b>{journal.length}</b> feelings planted</span>
        </div>
        {view === 'menu' ? (
          <nav className="title__menu">
            <MenuButton primary onClick={() => commands.send({ type: 'resume' })}>Resume</MenuButton>
            <MenuButton onClick={() => commands.send({ type: 'photo', on: true })}>Photo mode</MenuButton>
            <MenuButton onClick={() => setView('settings')}>Settings</MenuButton>
            <MenuButton onClick={() => commands.send({ type: 'toTitle' })}>Save & return to title</MenuButton>
          </nav>
        ) : (
          <SettingsPanel onBack={() => setView('menu')} />
        )}
      </div>
    </div>
  );
}

function Photo() {
  const hour = useUI((s) => s.photoTime);
  return (
    <div className="photo">
      <div className="photo__bar">
        <label htmlFor="photo-time">Time of day</label>
        <input id="photo-time" type="range" min={0} max={24} step={0.05} value={hour} onChange={(e) => commands.send({ type: 'photoTime', hour: +e.target.value })} />
        <button onClick={() => commands.send({ type: 'snapshot' })}>Capture</button>
        <button onClick={() => commands.send({ type: 'photo', on: false })}>Done</button>
      </div>
      <div className="photo__hint">Drag to look · WASD to fly · Q / E down & up · Scroll to zoom · Shift to move faster</div>
    </div>
  );
}

// -------------------------------------------------------------------- touch
function TouchControls() {
  const stick = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stick.current!;
    let id = -1;
    let cx = 0;
    let cy = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      let dx = (e.clientX - cx) / 52;
      let dy = (e.clientY - cy) / 52;
      const l = Math.hypot(dx, dy);
      if (l > 1) {
        dx /= l;
        dy /= l;
      }
      knob.current!.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
      getGame()?.input.setTouchMove(dx, -dy);
      getGame()?.input.touchButton('Sprint', l > 0.92);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      knob.current!.style.transform = '';
      getGame()?.input.setTouchMove(0, 0);
      getGame()?.input.touchButton('Sprint', false);
    };
    const down = (e: PointerEvent) => {
      id = e.pointerId;
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      el.setPointerCapture(id);
      move(e);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);

  const look = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = look.current!;
    const last = new Map<number, [number, number]>();
    const down = (e: PointerEvent) => {
      last.set(e.pointerId, [e.clientX, e.clientY]);
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const p = last.get(e.pointerId);
      if (!p) return;
      getGame()?.input.addLook((e.clientX - p[0]) * 1.6, (e.clientY - p[1]) * 1.6);
      last.set(e.pointerId, [e.clientX, e.clientY]);
    };
    const up = (e: PointerEvent) => last.delete(e.pointerId);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);

  const btn = (name: string, label: string, cls = '') => (
    <button
      className={`touch__btn ${cls}`}
      onPointerDown={(e) => { e.preventDefault(); getGame()?.input.touchButton(name, true); }}
      onPointerUp={() => getGame()?.input.touchButton(name, false)}
      onPointerCancel={() => getGame()?.input.touchButton(name, false)}
    >
      {label}
    </button>
  );
  return (
    <div className="touch">
      <div className="touch__look" ref={look} />
      <div className="touch__stick" ref={stick}>
        <div className="touch__knob" ref={knob} />
      </div>
      <div className="touch__buttons">
        {btn('Jump', 'Jump', 'touch__btn--big')}
        {btn('Feel', 'Feel')}
        {btn('Sense', 'Sense')}
        {btn('Journal', 'Journal')}
      </div>
      <button className="touch__pause" onClick={() => commands.send({ type: 'pause' })} aria-label="Pause">II</button>
    </div>
  );
}

// --------------------------------------------------------------------- root
export function Hud() {
  const phase = useUI((s) => s.phase);
  const wheel = useUI((s) => s.wheelOpen);
  const journal = useUI((s) => s.journalOpen);
  const touch = useUI((s) => s.touch);
  return (
    <div className="ui">
      {phase === 'loading' && <Loading />}
      {phase === 'title' && <Title />}
      <Cinematic />
      {phase === 'play' && <PlayHud />}
      {phase === 'play' && <RegionBanner />}
      {phase === 'play' && <Toast />}
      {phase === 'play' && touch && !wheel && !journal && <TouchControls />}
      <CardView />
      {phase === 'play' && wheel && <MoodWheel />}
      {phase === 'play' && journal && <Journal />}
      {phase === 'paused' && <Pause />}
      {phase === 'photo' && <Photo />}
    </div>
  );
}

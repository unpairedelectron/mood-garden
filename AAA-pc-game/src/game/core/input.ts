// Keyboard, mouse (pointer lock), touch and gamepad folded into one snapshot.

export class Input {
  /** Movement intent, x = strafe right, y = forward. */
  moveX = 0;
  moveY = 0;
  lookX = 0;
  lookY = 0;
  zoom = 0;
  sprint = false;
  jumpHeld = false;
  locked = false;
  enabled = false;
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private touchMove = { x: 0, y: 0 };
  private touchButtons = new Set<string>();
  private padPrev: boolean[] = [];
  private dragging = false;
  private disposers: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const on = <K extends keyof WindowEventMap>(
      t: EventTarget,
      type: K | string,
      fn: (e: never) => void,
      opts?: AddEventListenerOptions,
    ) => {
      t.addEventListener(type, fn as EventListener, opts);
      this.disposers.push(() => t.removeEventListener(type, fn as EventListener, opts));
    };
    on(window, 'keydown', (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    on(window, 'blur', () => this.keys.clear());
    on(canvas, 'mousedown', (e: MouseEvent) => {
      if (!this.enabled) return;
      if (e.button === 0 && !this.locked) {
        this.dragging = true;
        // Pointer lock can be refused (iframes, automated browsers) – dragging still works.
        try {
          const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch {
          /* drag fallback */
        }
      }
    });
    on(window, 'mouseup', () => (this.dragging = false));
    on(window, 'mousemove', (e: MouseEvent) => {
      if (!this.enabled) return;
      if (this.locked || this.dragging) {
        this.lookX += e.movementX;
        this.lookY += e.movementY;
      }
    });
    on(document, 'pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    on(
      canvas,
      'wheel',
      (e: WheelEvent) => {
        if (!this.enabled) return;
        this.zoom += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );
    on(canvas, 'contextmenu', (e: Event) => e.preventDefault());
  }

  /** True once per key press. */
  hit(...codes: string[]): boolean {
    for (const c of codes) if (this.pressed.has(c)) return true;
    return false;
  }
  down(...codes: string[]): boolean {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  // ---- touch controls (driven by the HUD)
  setTouchMove(x: number, y: number) {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }
  addLook(dx: number, dy: number) {
    this.lookX += dx;
    this.lookY += dy;
  }
  touchButton(name: string, down: boolean) {
    if (down) {
      this.touchButtons.add(name);
      this.pressed.add('Touch' + name);
    } else this.touchButtons.delete(name);
  }

  /** Call once at the start of each frame. */
  poll() {
    let x = 0;
    let y = 0;
    if (this.down('KeyW', 'ArrowUp')) y += 1;
    if (this.down('KeyS', 'ArrowDown')) y -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    x += this.touchMove.x;
    y += this.touchMove.y;
    this.sprint = this.down('ShiftLeft', 'ShiftRight') || this.touchButtons.has('Sprint');
    this.jumpHeld = this.down('Space') || this.touchButtons.has('Jump');

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const dz = (v: number) => (Math.abs(v) < 0.16 ? 0 : v);
      x += dz(pad.axes[0] ?? 0);
      y -= dz(pad.axes[1] ?? 0);
      this.lookX += dz(pad.axes[2] ?? 0) * 14;
      this.lookY += dz(pad.axes[3] ?? 0) * 10;
      const map: Record<number, string> = { 0: 'Space', 2: 'KeyE', 3: 'KeyF', 1: 'KeyQ', 9: 'Escape', 8: 'KeyJ' };
      pad.buttons.forEach((b, i) => {
        if (b.pressed && !this.padPrev[i] && map[i]) this.pressed.add(map[i]);
        this.padPrev[i] = b.pressed;
      });
      if (pad.buttons[0]?.pressed) this.jumpHeld = true;
      if (pad.buttons[10]?.pressed || (pad.buttons[7]?.value ?? 0) > 0.4) this.sprint = true;
      break;
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    this.moveX = x;
    this.moveY = y;
  }

  /** Forget one-shot presses (so catch-up simulation steps do not replay them). */
  consume() {
    this.pressed.clear();
  }

  /** Call at the end of each frame. */
  endFrame() {
    this.pressed.clear();
    this.lookX = 0;
    this.lookY = 0;
    this.zoom = 0;
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
    this.dragging = false;
  }

  dispose() {
    this.disposers.forEach((d) => d());
  }
}

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Screen, Cell } from '@/src/game/screen';
import { Game } from '@/src/game/engine';
import { PALETTE } from '@/src/game/constants';
import { computeFrame, drawFrame, frameSignature, shakeOffset, frameDirtyRect, type OutCell } from '@/src/game/enhanced';
import { isCompact } from '@/src/game/compact';
import {
  chooseGrid,
  dirToward,
  dpadDirection,
  firstStep,
  lineHeight,
  REPEAT_DELAY_MS,
  REPEAT_MS,
  type Dir,
} from '@/src/game/viewport';

const FONT = '"HRVSTMN Mono", "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace';

const KEYMAP: Record<string, string> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'enter',
  Escape: 'esc',
  Backspace: 'backspace',
  ' ': 'space',
};

/** What the touch controls need to know about the engine, polled a few times a second. */
type Hud = { label: string; modal: boolean; typing: boolean };
type PadKey = { key: string; label: string; color: string; title: string };

// Touch utility buttons (colours from base16 Isotope Dark).
const UTIL_A: PadKey[] = [
  { key: 'i', label: 'BAG', color: '#d0d0d0', title: 'Rucksack (I)' },
  { key: 'y', label: 'TODAY', color: '#33ff00', title: "Today's plan (Y)" },
  { key: 'n', label: 'MAP', color: '#00ffff', title: 'Minimap (N)' },
  { key: 'r', label: 'NOTES', color: '#ff0099', title: 'Villager notes (R)' },
];
const HORSE: PadKey = { key: 'H', label: 'HORSE', color: '#ff9900', title: 'Whistle for your horse (Shift+H)' };
const INFO: PadKey = { key: 'p', label: 'INFO', color: '#cc00ff', title: 'Show or hide the status panel' };
const MORE_KEYS: PadKey[] = [
  { key: 'm', label: 'MEMO', color: '#00ffff', title: 'Ranch summary & memo (M)' },
  { key: 'b', label: 'BELL', color: '#33ff00', title: 'Ring the grazing bell (B)' },
  { key: 'btab', label: '◂ TOOL', color: '#d0d0d0', title: 'Previous tool (Shift+Tab)' },
  { key: '?', label: 'HELP', color: '#00ffff', title: 'Help (?)' },
];

/** A touch button: fires on pointer-down for snappy input; keyboard activation still works. */
function PadButton({
  label,
  onPress,
  className = '',
  style,
  title,
  pressed,
}: {
  label: React.ReactNode;
  onPress: () => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={`pad-btn ${className}`}
      style={style}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onClick={(e) => {
        if (e.detail === 0) onPress(); // keyboard / assistive activation; taps were handled on pointer-down
      }}
    >
      {label}
    </button>
  );
}

export default function GameScreen() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dpadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<Screen | null>(null);
  const gameRef = useRef<Game | null>(null);

  const [inputMode, setInputMode] = useState<'pending' | 'touch' | 'desktop'>('pending');
  const isTouch = inputMode === 'touch';
  const [running, setRunning] = useState(true);
  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState<Hud>({ label: 'USE', modal: false, typing: false });
  const [compact, setCompact] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');
  const [dpadDir, setDpadDir] = useState<Dir | null>(null);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const reducedMotionRef = useRef(false);
  const [hires, setHiresState] = useState(true);
  const hiresRef = useRef(true);
  const [haptics, setHapticsState] = useState(true);
  const hapticsRef = useRef(true);
  const [canFullscreen, setCanFullscreen] = useState(false);

  // Send a key to the game engine
  const sendKey = useCallback((name: string) => {
    if (screenRef.current) {
      screenRef.current.pushKey(name);
    }
  }, []);

  /** A short tick on phones that support it (Android); silently does nothing elsewhere. */
  const buzz = useCallback((ms: number) => {
    if (!hapticsRef.current) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      // vibration unsupported or blocked
    }
  }, []);

  // ---- Tap-to-walk: re-plans one step at a time so NPCs and the horse can't derail it.
  const walkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelWalk = useCallback(() => {
    if (walkRef.current) clearTimeout(walkRef.current);
    walkRef.current = null;
  }, []);

  const walkTo = useCallback(
    (gx: number, gy: number) => {
      const game = gameRef.current;
      const screen = screenRef.current;
      if (!game || !screen) return;
      cancelWalk();
      const map = game.mapname;
      const m = game.map;
      const special = (x: number, y: number) => {
        const k = `${x},${y}`;
        const t = m.tile(x, y);
        return k in m.doors || k in m.warps || t === 'down' || t === 'up';
      };
      const passable = (x: number, y: number) => game.walkable(map, x, y) && !game.npc_at(x, y) && !special(x, y);
      // Walk onto open ground; for anything else (crop, NPC, door, bin) stop beside it and face it.
      const onto = passable(gx, gy) && !(map === 'farm' && `${gx},${gy}` in game.crops);
      const isGoal = onto
        ? (x: number, y: number) => x === gx && y === gy
        : (x: number, y: number) => Math.abs(x - gx) + Math.abs(y - gy) === 1 && passable(x, y);
      let budget = 160;
      const tick = () => {
        walkRef.current = null;
        if (game.mapname !== map || game.modal_depth > 0 || budget-- <= 0) return;
        if (screen.keyQueue.length) {
          walkRef.current = setTimeout(tick, REPEAT_MS / 2);
          return;
        }
        const step = firstStep([game.px, game.py], isGoal, passable);
        if (!step) return;
        if (step.dir === null) {
          if (!onto) sendKey(dirToward(game.px, game.py, gx, gy));
          return;
        }
        // On horseback each key moves two tiles; stop rather than overshoot the last one.
        if (game.riding_horse && step.dist === 1 && onto && map === 'farm') {
          return;
        }
        sendKey(step.dir);
        walkRef.current = setTimeout(tick, REPEAT_MS);
      };
      tick();
    },
    [cancelWalk, sendKey],
  );

  // ---- D-pad: one surface; slide the thumb between directions, hold to keep walking.
  const dpad = useRef<{ pointer: number | null; dir: Dir | null; modal: boolean; timer: ReturnType<typeof setTimeout> | null }>({
    pointer: null,
    dir: null,
    modal: false,
    timer: null,
  });

  const dpadSet = useCallback(
    (dir: Dir | null) => {
      const d = dpad.current;
      if (dir === d.dir) return;
      if (d.timer) clearTimeout(d.timer);
      d.timer = null;
      d.dir = dir;
      setDpadDir(dir);
      if (!dir) return;
      cancelWalk();
      sendKey(dir);
      buzz(8);
      const tick = () => {
        const screen = screenRef.current;
        const game = gameRef.current;
        if (d.dir !== dir) return;
        // Don't queue steps the engine hasn't taken yet, and pause if a dialog pops up mid-walk
        // (a held direction would otherwise skip through its pages).
        if (screen && game && screen.keyQueue.length === 0 && (game.modal_depth > 0) === d.modal) screen.pushKey(dir);
        d.timer = setTimeout(tick, REPEAT_MS);
      };
      d.timer = setTimeout(tick, REPEAT_DELAY_MS);
    },
    [buzz, cancelWalk, sendKey],
  );

  const dpadStop = useCallback(() => {
    const d = dpad.current;
    if (d.timer) clearTimeout(d.timer);
    d.timer = null;
    d.dir = null;
    d.pointer = null;
    setDpadDir(null);
  }, []);

  const dpadAt = (e: React.PointerEvent) => {
    const el = dpadRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return dpadDirection(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), r.width * 0.12, dpad.current.dir);
  };

  const press = useCallback(
    (key: string) => {
      cancelWalk();
      buzz(10);
      sendKey(key);
    },
    [buzz, cancelWalk, sendKey],
  );

  const pressAction = useCallback(() => {
    const key = gameRef.current?.context_action().key || 'space';
    if (key === 'enter') {
      draftRef.current = '';
      setDraft('');
      inputRef.current?.blur();
    }
    cancelWalk();
    buzz(14);
    sendKey(key);
  }, [buzz, cancelWalk, sendKey]);

  // ---- Name entry on touch: mirror a real text field into the engine's text prompt.
  const onDraft = useCallback(
    (value: string) => {
      const next = value.replace(/[^\x20-\x7E]/g, '').slice(0, 12);
      const prev = draftRef.current;
      let p = 0;
      while (p < prev.length && p < next.length && prev[p] === next[p]) p++;
      for (let i = prev.length; i > p; i--) sendKey('backspace');
      for (const c of next.slice(p)) sendKey(c === ' ' ? 'space' : c);
      draftRef.current = next;
      setDraft(next);
    },
    [sendKey],
  );

  const submitDraft = useCallback(() => {
    draftRef.current = '';
    setDraft('');
    inputRef.current?.blur();
    sendKey('enter');
  }, [sendKey]);

  const toggleMotion = useCallback(() => {
    const next = !reducedMotionRef.current;
    reducedMotionRef.current = next;
    if (screenRef.current) {
      screenRef.current.reducedMotion = next;
      gameRef.current?.render();
      screenRef.current.onRender?.();
    }
    setReducedMotionState(next);
    try {
      window.localStorage.setItem('hrvstmn-motion', next ? 'off' : 'on');
    } catch {
      // storage unavailable; the choice still applies this session
    }
  }, []);

  const toggleHires = useCallback(() => {
    const next = !hiresRef.current;
    hiresRef.current = next;
    if (screenRef.current) {
      screenRef.current.setHires(next);
      screenRef.current.onRender?.();
    }
    setHiresState(next);
    try {
      window.localStorage.setItem('hrvstmn-hires', next ? 'on' : 'off');
    } catch {
      // storage unavailable; the choice still applies this session
    }
  }, []);

  const toggleHaptics = useCallback(() => {
    const next = !hapticsRef.current;
    hapticsRef.current = next;
    setHapticsState(next);
    buzz(12);
    try {
      window.localStorage.setItem('hrvstmn-haptics', next ? 'on' : 'off');
    } catch {
      // storage unavailable; the choice still applies this session
    }
  }, [buzz]);

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
      else void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
    } catch {
      // fullscreen unavailable
    }
  }, []);

  useEffect(() => {
    // Detect touch
    const hasTouch =
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
    setInputMode(hasTouch ? 'touch' : 'desktop');
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    try {
      hapticsRef.current = window.localStorage.getItem('hrvstmn-haptics') !== 'off';
    } catch {
      hapticsRef.current = true;
    }
    setHapticsState(hapticsRef.current);

    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let fontPx = 16;
    let cw = 9.6;
    let ch = 19;

    const screen = new Screen(80, 24);
    let motionOff = false;
    try {
      const savedMotion = window.localStorage.getItem('hrvstmn-motion');
      motionOff = savedMotion ? savedMotion === 'off' : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      motionOff = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    screen.reducedMotion = motionOff;
    reducedMotionRef.current = motionOff;
    setReducedMotionState(motionOff);
    let hiresOn = true;
    try {
      hiresOn = window.localStorage.getItem('hrvstmn-hires') !== 'off';
    } catch {
      hiresOn = true;
    }
    screen.hires = hiresOn;
    hiresRef.current = hiresOn;
    setHiresState(hiresOn);
    screen.onHiresChange = (next) => {
      hiresRef.current = next;
      setHiresState(next);
      try {
        window.localStorage.setItem('hrvstmn-hires', next ? 'on' : 'off');
      } catch {
        // storage unavailable; the choice still applies this session
      }
    };
    screenRef.current = screen;

    function measureCell(px: number) {
      if (!ctx) return px * 0.6;
      ctx.font = `${px}px ${FONT}`;
      return ctx.measureText('M').width;
    }

    // Desktop: 16px, shrunk to fit 80x24. Touch: the full layout down to 12px, else the compact
    // phone layout (no side panel, >= 50 columns) at the largest readable size. See viewport.ts.
    function layout() {
      if (!stage) return;
      const W = stage.clientWidth || 800;
      const H = stage.clientHeight || 500;
      const g = chooseGrid(W, H, measureCell, hasTouch);
      fontPx = g.fontPx;
      cw = measureCell(fontPx);
      ch = lineHeight(fontPx);
      if (g.cols !== screen.w || g.rows !== screen.h) screen.setSize(g.cols, g.rows);
      if (canvas) canvas.dataset.grid = `${screen.w}x${screen.h}@${fontPx}px`;
      setCompact(isCompact(screen.w));
    }

    function sizeCanvas(w: number, h: number) {
      if (!canvas || !ctx || !stage) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.ceil(w * cw * dpr);
      canvas.height = Math.ceil(h * ch * dpr);
      const fit = Math.min(1, stage.clientWidth / (w * cw), stage.clientHeight / (h * ch));
      canvas.style.width = `${w * cw * fit}px`;
      canvas.style.height = `${h * ch * fit}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `#${PALETTE['00']}`;
      ctx.fillRect(0, 0, w * cw, h * ch);
    }

    function drawCell(x: number, y: number, c: string, fg: string, bg: string, bold: boolean) {
      if (!ctx) return;
      const px = x * cw;
      const py = y * ch;
      const bgColor = PALETTE[bg] ? `#${PALETTE[bg]}` : '#000000';
      const fgColor = PALETTE[fg] ? `#${PALETTE[fg]}` : '#ffffff';
      ctx.fillStyle = bgColor;
      ctx.fillRect(Math.floor(px), py, Math.ceil(cw) + 1, ch);
      if (c !== ' ') {
        ctx.font = `${bold ? 'bold ' : ''}${fontPx}px ${FONT}`;
        ctx.fillStyle = fgColor;
        ctx.fillText(c, px, py + ch / 2 + 1);
      }
    }

    let prevBuf: Cell[][] | null = null;
    let prevFrame: OutCell[][] | null = null;
    let lastSig = '';

    let shaking = false;
    const renderEnhanced = () => {
      if (!canvas || !ctx) return;
      // heavy hits nudge the whole canvas for a moment; a CSS transform, so nothing repaints
      const [sx, sy] = shakeOffset(screen.ctx?.shake, screen.reducedMotion);
      if (sx || sy || shaking) {
        canvas.style.transform = sx || sy ? `translate(${sx}px, ${sy}px)` : '';
        shaking = !!(sx || sy);
      }
      if (!prevBuf || prevBuf.length !== screen.h || (prevBuf[0] && prevBuf[0].length !== screen.w)) {
        sizeCanvas(screen.w, screen.h);
        prevBuf = screen.buf.map((row) => [...row]);
        prevFrame = null;
        lastSig = '';
      }
      const frame = computeFrame(screen, screen.reducedMotion ? 0 : performance.now() / 1000);
      const sig = `${screen.hires ? 'h' : 'p'}:${frameSignature(frame)}`;
      if (sig === lastSig) return;
      const dirty = frameDirtyRect(prevFrame, frame);
      if (prevFrame && !dirty) return;
      lastSig = sig;
      drawFrame(ctx, frame, { cw, ch, fontPx, font: FONT, dpr: window.devicePixelRatio || 1, hires: screen.hires }, dirty ?? undefined);
      prevFrame = frame;
    };

    screen.onRender = () => {
      if (!canvas || !ctx) return;
      if (screen.style !== 'classic') {
        renderEnhanced();
        return;
      }
      lastSig = '';
      prevFrame = null;
      if (!prevBuf || prevBuf.length !== screen.h || (prevBuf[0] && prevBuf[0].length !== screen.w)) {
        sizeCanvas(screen.w, screen.h);
        prevBuf = screen.buf.map((row) => [...row]);
        for (let y = 0; y < screen.h; y++) {
          for (let x = 0; x < screen.w; x++) {
            const cell = screen.buf[y][x];
            drawCell(x, y, cell[0], cell[1], cell[2], cell[3]);
          }
        }
        return;
      }

      for (let y = 0; y < screen.h; y++) {
        const row = screen.buf[y];
        const prow = prevBuf[y];
        for (let x = 0; x < screen.w; x++) {
          const cell = row[x];
          const pcell = prow[x];
          if (
            cell[0] !== pcell[0] ||
            cell[1] !== pcell[1] ||
            cell[2] !== pcell[2] ||
            cell[3] !== pcell[3]
          ) {
            drawCell(x, y, cell[0], cell[1], cell[2], cell[3]);
            prow[x] = [...cell];
          }
        }
      }
    };

    layout();
    sizeCanvas(screen.w, screen.h);
    setReady(true);

    // Re-measure, rebuild the canvas and repaint (the engine redraws a resized grid itself;
    // outside dialogs we ask for that right away so the screen never flashes blank).
    const relayout = () => {
      layout();
      prevBuf = null;
      prevFrame = null;
      lastSig = '';
      const game = gameRef.current;
      if (game && game.modal_depth === 0) game.render();
      if (screen.onRender) screen.onRender();
    };

    // The bundled font may arrive after first paint: re-measure and repaint once it's ready.
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load(`16px ${FONT}`), document.fonts.load(`bold 16px ${FONT}`)])
        .then(relayout)
        .catch(() => {});
    }

    // Keyboard handling
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      let name: string | undefined;

      if (e.ctrlKey) {
        if (e.key === 'c') name = 'ctrl-c';
        else return;
      } else if (e.key === 'Tab') {
        name = e.shiftKey ? 'btab' : 'tab';
      } else if (KEYMAP[e.key]) {
        name = KEYMAP[e.key];
      } else if ([...e.key].length === 1) {
        name = e.key;
      } else {
        return;
      }

      e.preventDefault();
      sendKey(name);
    };

    window.addEventListener('keydown', onKeyDown);

    // Window resizes, phone rotation, browser toolbars sliding away and the touch pad appearing
    // all change the stage size; the observer catches every one of them.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(relayout, 80);
    };
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(stage);

    // Touch screens: no pinch/double-tap zoom, page bounce or long-press menus on the game.
    const inField = (e: Event) => Boolean((e.target as Element | null)?.closest?.('input, textarea'));
    const noDefault = (e: Event) => {
      if (!inField(e)) e.preventDefault();
    };
    if (hasTouch) {
      document.addEventListener('gesturestart', noDefault);
      document.addEventListener('touchmove', noDefault, { passive: false });
      document.addEventListener('contextmenu', noDefault);
    }

    // Keep Enhanced animations (water, weather, smoke, title sky) moving even while the engine
    // is waiting in a menu or dialog. Cheap: the renderer skips the paint when nothing changed.
    const animTimer = setInterval(() => {
      if (!screen.reducedMotion && screen.style !== 'classic' && screen.onRender) screen.onRender();
    }, 100);

    // Check for ?autostart=1 query param
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    // Initialize Game engine
    const game = new Game(screen, autostart);
    gameRef.current = game;

    const hudTimer = setInterval(() => {
      const a = game.context_action();
      const next: Hud = { label: a.label, modal: game.modal_depth > 0, typing: game.typing };
      setHud((prev) => (prev.label === next.label && prev.modal === next.modal && prev.typing === next.typing ? prev : next));
    }, 200);

    // Start game loop in background
    let isMounted = true;
    (async () => {
      try {
        await game.run();
      } catch (err) {
        console.error('Game error:', err);
      } finally {
        if (isMounted) {
          setRunning(false);
        }
      }
    })();

    const dpadState = dpad.current;
    return () => {
      isMounted = false;
      game.running = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      document.removeEventListener('gesturestart', noDefault);
      document.removeEventListener('touchmove', noDefault);
      document.removeEventListener('contextmenu', noDefault);
      clearTimeout(resizeTimer);
      clearInterval(animTimer);
      clearInterval(hudTimer);
      if (dpadState.timer) clearTimeout(dpadState.timer);
      cancelWalk();
    };
  }, [sendKey, cancelWalk]);

  // Leaving the name prompt (by any button) clears the field and drops the keyboard; iOS can
  // leave the page scrolled after its keyboard closes, so snap back.
  useEffect(() => {
    if (!hud.typing) {
      draftRef.current = '';
      setDraft('');
      inputRef.current?.blur();
      if (window.scrollY) window.scrollTo(0, 0);
    }
  }, [hud.typing]);

  // Tap the map to walk there (touch only, outside menus); a tap also closes the More sheet.
  const tapRef = useRef<{ id: number; x: number; y: number; t: number } | null>(null);
  const onStagePointerDown = (e: React.PointerEvent) => {
    if (moreOpen) {
      setMoreOpen(false);
      tapRef.current = null;
      return;
    }
    tapRef.current = e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null;
  };
  const onStagePointerUp = (e: React.PointerEvent) => {
    const tap = tapRef.current;
    tapRef.current = null;
    if (!isTouch || !tap || tap.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12 || performance.now() - tap.t > 600) return;
    const canvas = canvasRef.current;
    const screen = screenRef.current;
    const game = gameRef.current;
    if (!canvas || !screen || !game || game.modal_depth > 0 || !game.started) return;
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * screen.w);
    const y = Math.floor(((e.clientY - r.top) / r.height) * screen.h);
    const tag = screen.tags[y]?.[x];
    if (!tag || tag.t === 'ui' || tag.wx === undefined || tag.wy === undefined) return;
    if (tag.wx === game.px && tag.wy === game.py) return;
    buzz(6);
    walkTo(tag.wx, tag.wy);
  };

  const rootBase = 'game-root bg-[#000000] text-[#d0d0d0] overflow-hidden select-none';
  return (
    <div className={isTouch ? `${rootBase} touch-ui` : `${rootBase} flex flex-col`}>
      {/* Canvas Area */}
      <div
        ref={stageRef}
        id="stage"
        className={
          isTouch
            ? 't-stage flex items-center justify-center overflow-hidden'
            : 'flex-1 min-h-0 flex items-center justify-center p-1 overflow-hidden'
        }
        onPointerDown={onStagePointerDown}
        onPointerUp={onStagePointerUp}
        onPointerCancel={() => (tapRef.current = null)}
      >
        <canvas
          ref={canvasRef}
          id="term"
          aria-label="HRVSTMN game screen"
          className="block"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Name entry: a real text field so the phone keyboard can type into the engine prompt */}
        {isTouch && hud.typing && (
          <form
            className="type-bar"
            onSubmit={(e) => {
              e.preventDefault();
              submitDraft();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              maxLength={12}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="Tap to type (blank = default)"
              aria-label="Type your answer"
            />
            <button type="submit" className="pad-btn type-done">
              DONE
            </button>
          </form>
        )}

        {/* More sheet: the less frequent actions and touch settings */}
        {isTouch && moreOpen && (
          <div className="more-sheet" role="menu" onPointerDown={(e) => e.stopPropagation()}>
            {MORE_KEYS.map((b) => (
              <PadButton
                key={b.key}
                label={b.label}
                title={b.title}
                style={{ color: b.color }}
                onPress={() => {
                  setMoreOpen(false);
                  press(b.key);
                }}
              />
            ))}
            <PadButton
              label={`DETAIL ${hires ? 'HI' : 'LO'}`}
              title="Toggle half-size high-resolution ground textures"
              style={{ color: '#cc00ff' }}
              pressed={hires}
              onPress={toggleHires}
            />
            <PadButton
              label={`MOTION ${reducedMotion ? 'OFF' : 'ON'}`}
              title="Toggle ambient animation (also honors prefers-reduced-motion)"
              style={{ color: '#cc00ff' }}
              pressed={!reducedMotion}
              onPress={toggleMotion}
            />
            <PadButton
              label={`BUZZ ${haptics ? 'ON' : 'OFF'}`}
              title="Toggle haptic feedback on supported phones"
              style={{ color: '#cc00ff' }}
              pressed={haptics}
              onPress={toggleHaptics}
            />
            {canFullscreen && (
              <PadButton
                label="FULL"
                title="Toggle full screen"
                style={{ color: '#d0d0d0' }}
                onPress={() => {
                  setMoreOpen(false);
                  toggleFullscreen();
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Interactive Quick-Action Toolbar for Desktop Users */}
      {inputMode === 'desktop' && (
        <div
          id="hint"
          className="flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 border-t border-[#404040]/50 bg-[#080808] text-xs font-mono"
        >
          <span className="text-[#808080] mr-2 hidden sm:inline">WASD/Arrows: Move</span>
          <button
            type="button"
            onClick={() => sendKey('space')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#33ff00] cursor-pointer"
          >
            [SPC] Use Tool
          </button>
          <button
            type="button"
            onClick={() => sendKey('x')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#ff0099] cursor-pointer"
          >
            [X] Act/Talk
          </button>
          <button
            type="button"
            onClick={() => sendKey('tab')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#d0d0d0] cursor-pointer"
          >
            [TAB] Next Tool
          </button>
          <button
            type="button"
            onClick={() => sendKey('i')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#d0d0d0] cursor-pointer"
          >
            [I] Rucksack
          </button>
          <button
            type="button"
            onClick={() => sendKey('H')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#ff9900] cursor-pointer"
          >
            [Shift+H] Horse
          </button>
          <button
            type="button"
            onClick={() => sendKey('b')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#33ff00] cursor-pointer"
          >
            [B] Bell
          </button>
          <button
            type="button"
            onClick={() => sendKey('m')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#00ffff] cursor-pointer"
          >
            [M] Memo
          </button>
          <button
            type="button"
            onClick={() => sendKey('y')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#33ff00] cursor-pointer"
          >
            [Y] Today
          </button>
          <button
            type="button"
            onClick={() => sendKey('n')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#00ffff] cursor-pointer"
          >
            [N] Map
          </button>
          <button
            type="button"
            onClick={() => sendKey('r')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#ff0099] cursor-pointer"
          >
            [R] Villagers
          </button>
          <button
            type="button"
            onClick={() => sendKey('esc')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#c0c0c0] cursor-pointer"
          >
            [ESC] Diary
          </button>
          <button
            type="button"
            onClick={() => sendKey('?')}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#00ffff] cursor-pointer"
          >
            [?] Help
          </button>
          <button
            type="button"
            onClick={toggleHires}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#cc00ff] cursor-pointer"
            title="Toggle half-size high-resolution ground textures"
          >
            Detail: {hires ? 'High' : 'Plain'}
          </button>
          <button
            type="button"
            onClick={toggleMotion}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#404040] border border-[#404040] text-[#cc00ff] cursor-pointer"
            title="Toggle ambient animation (also honors prefers-reduced-motion)"
          >
            Motion: {reducedMotion ? 'Off' : 'On'}
          </button>
        </div>
      )}

      {/* Touch controls: utility row, D-pad (left thumb) and action cluster (right thumb).
          Portrait stacks them under the map; short landscape screens put them either side. */}
      {isTouch && (
        <>
          <div className="t-util">
            <div className="t-util-a">
              {UTIL_A.map((b) => (
                <PadButton key={b.key} label={b.label} title={b.title} style={{ color: b.color }} onPress={() => press(b.key)} />
              ))}
            </div>
            <div className="t-util-b">
              <PadButton label={HORSE.label} title={HORSE.title} style={{ color: HORSE.color }} onPress={() => press(HORSE.key)} />
              {compact && (
                <PadButton label={INFO.label} title={INFO.title} style={{ color: INFO.color }} onPress={() => press(INFO.key)} />
              )}
              <PadButton
                label="•••"
                title="More actions and settings"
                style={{ color: '#d0d0d0' }}
                pressed={moreOpen}
                onPress={() => {
                  buzz(8);
                  setMoreOpen((o) => !o);
                }}
              />
            </div>
          </div>

          <div className="t-move">
            <div
              ref={dpadRef}
              className="dpad"
              role="group"
              aria-label="Move"
              onPointerDown={(e) => {
                e.preventDefault();
                if (dpad.current.pointer !== null) return;
                dpad.current.pointer = e.pointerId;
                dpad.current.modal = (gameRef.current?.modal_depth ?? 0) > 0;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // capture unsupported; pointerleave below still ends the hold
                }
                dpadSet(dpadAt(e));
              }}
              onPointerMove={(e) => {
                if (e.pointerId === dpad.current.pointer) dpadSet(dpadAt(e));
              }}
              onPointerUp={(e) => {
                if (e.pointerId === dpad.current.pointer) dpadStop();
              }}
              onPointerCancel={(e) => {
                if (e.pointerId === dpad.current.pointer) dpadStop();
              }}
              onLostPointerCapture={(e) => {
                if (e.pointerId === dpad.current.pointer) dpadStop();
              }}
            >
              {(['up', 'left', 'right', 'down'] as Dir[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  tabIndex={-1}
                  className={`dpad-arm dpad-${d}`}
                  data-on={dpadDir === d ? '1' : undefined}
                  aria-label={d}
                  onClick={(e) => {
                    if (e.detail === 0) sendKey(d);
                  }}
                >
                  {d === 'up' ? '▲' : d === 'down' ? '▼' : d === 'left' ? '◀' : '▶'}
                </button>
              ))}
              <span className="dpad-hub" aria-hidden="true" />
            </div>
          </div>

          <div className="t-act">
            <div className="act-grid">
              <PadButton label="TOOL ▸" title="Next tool (Tab)" className="act-tool" onPress={() => press('tab')} />
              <PadButton label="USE" title="Use the equipped tool (Space)" className="act-use" onPress={() => press('space')} />
              <PadButton
                label={hud.typing ? 'SKIP' : hud.modal ? 'BACK' : 'MENU'}
                title={hud.modal ? 'Back / cancel (Esc)' : 'Diary & pause menu (Esc)'}
                className="act-menu"
                onPress={() => press('esc')}
              />
              <PadButton label={hud.label} title={`${hud.label} (context action)`} className="act-a" onPress={pressAction} />
            </div>
          </div>
        </>
      )}

      {/* Game Over / Exit Screen */}
      {!running && (
        <div className="fixed inset-0 bg-[#000000]/95 flex flex-col items-center justify-center p-6 text-center z-50">
          <div className="text-[#33ff00] text-xl font-bold mb-4 font-mono">Game Saved</div>
          <p className="text-[#c0c0c0] max-w-md mb-6 font-mono text-sm">
            Thanks for playing HRVSTMN! Your farm has been saved in this browser.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#404040] hover:bg-[#606060] text-[#d0d0d0] border border-[#606060] px-6 py-2.5 rounded-lg font-mono"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

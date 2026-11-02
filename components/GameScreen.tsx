'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Screen, Cell } from '@/src/game/screen';
import { Game } from '@/src/game/engine';
import { PALETTE } from '@/src/game/constants';

const FONT = 'ui-monospace, "DejaVu Sans Mono", Menlo, Consolas, monospace';
const MIN_COLS = 80;
const MIN_ROWS = 24;
const MAX_COLS = 160;
const MAX_ROWS = 50;

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

export default function GameScreen() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRef = useRef<Screen | null>(null);
  const gameRef = useRef<Game | null>(null);
  const dpadTimerRef = useRef<{ timeout?: any; interval?: any }>({});

  const [isTouch, setIsTouch] = useState(false);
  const [running, setRunning] = useState(true);
  const [ready, setReady] = useState(false);

  // Send a key to the game engine
  const sendKey = useCallback((name: string) => {
    if (screenRef.current) {
      screenRef.current.pushKey(name);
    }
  }, []);

  // Handle D-pad hold to repeat
  const handleButtonDown = useCallback(
    (key: string, e: React.PointerEvent) => {
      e.preventDefault();
      sendKey(key);
      if (dpadTimerRef.current.timeout) clearTimeout(dpadTimerRef.current.timeout);
      if (dpadTimerRef.current.interval) clearInterval(dpadTimerRef.current.interval);

      if (['up', 'down', 'left', 'right'].includes(key)) {
        dpadTimerRef.current.timeout = setTimeout(() => {
          dpadTimerRef.current.interval = setInterval(() => sendKey(key), 110);
        }, 280);
      }
    },
    [sendKey]
  );

  const handleButtonUp = useCallback(() => {
    if (dpadTimerRef.current.timeout) clearTimeout(dpadTimerRef.current.timeout);
    if (dpadTimerRef.current.interval) clearInterval(dpadTimerRef.current.interval);
  }, []);

  useEffect(() => {
    // Detect touch
    const hasTouch =
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
    setIsTouch(hasTouch);

    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let fontPx = 16;
    let cw = 9.6;
    let ch = 19;
    let cols = MIN_COLS;
    let rows = MIN_ROWS;

    const screen = new Screen(cols, rows);
    screenRef.current = screen;

    function measure(px: number) {
      if (!ctx) return { cw: 9.6, ch: 19 };
      ctx.font = `${px}px ${FONT}`;
      return { cw: ctx.measureText('M').width, ch: Math.ceil(px * 1.25) };
    }

    function layout() {
      if (!stage) return;
      const W = stage.clientWidth || 800;
      const H = stage.clientHeight || 500;
      let px = 16;
      let m = measure(px);
      if (W / m.cw < MIN_COLS || H / m.ch < MIN_ROWS) {
        px = Math.max(5, Math.floor(px * Math.min(W / (MIN_COLS * m.cw), H / (MIN_ROWS * m.ch))));
        m = measure(px);
      }
      fontPx = px;
      cw = m.cw;
      ch = m.ch;
      cols = Math.min(MAX_COLS, Math.max(MIN_COLS, Math.floor(W / cw)));
      rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.floor(H / ch)));
      screen.setSize(cols, rows);
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

    screen.onRender = () => {
      if (!canvas || !ctx) return;
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

    // Keyboard handling
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey) return;
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

    let resizeTimer: any;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        layout();
        prevBuf = null;
        if (screen.onRender) screen.onRender();
      }, 100);
    };
    window.addEventListener('resize', onResize);

    // Initialize Game engine
    const game = new Game(screen);
    gameRef.current = game;

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

    return () => {
      isMounted = false;
      game.running = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [sendKey]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#000000] text-[#d0d0d0] overflow-hidden select-none">
      {/* Canvas Area */}
      <div ref={stageRef} id="stage" className="flex-1 min-h-0 flex items-center justify-center p-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          id="term"
          aria-label="HRVSTMN game screen"
          className="block"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Control hints for desktop keyboard users */}
      {!isTouch && (
        <div id="hint" className="text-[#606060] text-xs text-center py-1 tracking-wide font-mono">
          arrows/WASD move &middot; space use tool &middot; x act &middot; tab tools &middot; i rucksack &middot; ? help &middot; auto-saved
        </div>
      )}

      {/* Touch Pad / On-Screen Controls */}
      <div
        id="pad"
        className={`${
          isTouch ? 'flex' : 'hidden sm:flex'
        } justify-between items-center px-4 py-2 border-t border-[#404040]/40 bg-[#000000]/90 z-20 gap-3`}
      >
        {/* D-Pad */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-[156px] h-[156px]">
          <button
            onPointerDown={(e) => handleButtonDown('up', e)}
            onPointerUp={handleButtonUp}
            onPointerLeave={handleButtonUp}
            onPointerCancel={handleButtonUp}
            className="col-start-2 row-start-1 bg-[#404040] hover:bg-[#606060] active:bg-[#808080] border border-[#606060] rounded-lg text-xl flex items-center justify-center text-[#d0d0d0] shadow"
            aria-label="up"
          >
            &#9650;
          </button>
          <button
            onPointerDown={(e) => handleButtonDown('left', e)}
            onPointerUp={handleButtonUp}
            onPointerLeave={handleButtonUp}
            onPointerCancel={handleButtonUp}
            className="col-start-1 row-start-2 bg-[#404040] hover:bg-[#606060] active:bg-[#808080] border border-[#606060] rounded-lg text-xl flex items-center justify-center text-[#d0d0d0] shadow"
            aria-label="left"
          >
            &#9664;
          </button>
          <button
            onPointerDown={(e) => handleButtonDown('right', e)}
            onPointerUp={handleButtonUp}
            onPointerLeave={handleButtonUp}
            onPointerCancel={handleButtonUp}
            className="col-start-3 row-start-2 bg-[#404040] hover:bg-[#606060] active:bg-[#808080] border border-[#606060] rounded-lg text-xl flex items-center justify-center text-[#d0d0d0] shadow"
            aria-label="right"
          >
            &#9654;
          </button>
          <button
            onPointerDown={(e) => handleButtonDown('down', e)}
            onPointerUp={handleButtonUp}
            onPointerLeave={handleButtonUp}
            onPointerCancel={handleButtonUp}
            className="col-start-2 row-start-3 bg-[#404040] hover:bg-[#606060] active:bg-[#808080] border border-[#606060] rounded-lg text-xl flex items-center justify-center text-[#d0d0d0] shadow"
            aria-label="down"
          >
            &#9660;
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onPointerDown={(e) => handleButtonDown('space', e)}
            onPointerUp={handleButtonUp}
            className="bg-[#404040] hover:bg-[#606060] active:bg-[#606060] border border-[#606060] rounded-lg px-4 py-3 text-sm font-bold text-[#33ff00] shadow"
          >
            USE
          </button>
          <button
            onPointerDown={(e) => handleButtonDown('x', e)}
            onPointerUp={handleButtonUp}
            className="bg-[#404040] hover:bg-[#606060] active:bg-[#606060] border border-[#606060] rounded-lg px-4 py-3 text-sm font-bold text-[#ff0099] shadow"
          >
            ACT
          </button>
          <button
            onPointerDown={(e) => handleButtonDown('tab', e)}
            onPointerUp={handleButtonUp}
            className="bg-[#404040] hover:bg-[#606060] active:bg-[#606060] border border-[#606060] rounded-lg px-3 py-3 text-sm font-medium text-[#d0d0d0] shadow"
          >
            TOOL
          </button>
          <button
            onPointerDown={(e) => handleButtonDown('i', e)}
            onPointerUp={handleButtonUp}
            className="bg-[#404040] hover:bg-[#606060] active:bg-[#606060] border border-[#606060] rounded-lg px-3 py-3 text-sm font-medium text-[#d0d0d0] shadow"
          >
            BAG
          </button>
          <button
            onPointerDown={(e) => handleButtonDown('esc', e)}
            onPointerUp={handleButtonUp}
            className="bg-[#404040] hover:bg-[#606060] active:bg-[#606060] border border-[#606060] rounded-lg px-3 py-3 text-sm font-medium text-[#d0d0d0] shadow"
          >
            MENU
          </button>
          <button
            onPointerDown={(e) => handleButtonDown('?', e)}
            onPointerUp={handleButtonUp}
            className="bg-[#404040] hover:bg-[#606060] active:bg-[#606060] border border-[#606060] rounded-lg px-3 py-3 text-sm font-medium text-[#00ffff] shadow"
          >
            HELP
          </button>
        </div>
      </div>

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

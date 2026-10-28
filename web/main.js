// Page side of the web build: draws frames from the worker onto a canvas and
// forwards keys to it through a SharedArrayBuffer.
(() => {
  const PALETTE = {
    '00': '#000000', '01': '#404040', '02': '#606060', '03': '#808080',
    '04': '#c0c0c0', '05': '#d0d0d0', '06': '#e0e0e0', '07': '#ffffff',
    '08': '#ff0000', '09': '#ff9900', '0A': '#ff0099', '0B': '#33ff00',
    '0C': '#00ffff', '0D': '#0066ff', '0E': '#cc00ff', '0F': '#3300ff',
  };
  // Must match worker.js.
  const HEAD = 4, RING = 256, NAMED_BASE = 0x110000;
  const NAMED = ['up', 'down', 'left', 'right', 'enter', 'esc', 'tab', 'btab',
    'space', 'backspace', 'ctrl-c'];
  const SAVE_KEY = 'hrvstmn-save';
  const FONT = 'ui-monospace, "DejaVu Sans Mono", Menlo, Consolas, monospace';
  const MIN_COLS = 80, MIN_ROWS = 24, MAX_COLS = 160, MAX_ROWS = 50;

  const overlay = document.getElementById('overlay');
  const status = document.getElementById('status');
  const errBox = document.getElementById('err');
  const again = document.getElementById('again');
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('term');
  const ctx = canvas.getContext('2d', { alpha: false });

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (touch) document.body.classList.add('touch');

  function showError(text) {
    overlay.hidden = false;
    status.textContent = 'Something went wrong.';
    errBox.hidden = false;
    errBox.textContent = text;
    again.hidden = false;
  }
  again.onclick = () => location.reload();

  if (location.protocol === 'file:') {
    status.textContent = 'Open this through a web server: run  python3 web/serve.py  and visit http://localhost:8000/web/';
    return;
  }
  if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
    status.textContent = 'Enabling cross-origin isolation... (if this persists, run  python3 web/serve.py)';
    // coi-serviceworker.js reloads the page once it is active.
    setTimeout(() => {
      if (!window.crossOriginIsolated) {
        status.textContent = 'This browser could not enable SharedArrayBuffer here. '
          + 'Run  python3 web/serve.py  and open http://localhost:8000/web/';
      }
    }, 4000);
    return;
  }

  // ---- grid metrics ----------------------------------------------------
  let fontPx = 16, cw = 9.6, ch = 19, cols = MIN_COLS, rows = MIN_ROWS;
  let grid = { w: 0, h: 0, cells: [] };

  function measure(px) {
    ctx.font = `${px}px ${FONT}`;
    return { cw: ctx.measureText('M').width, ch: Math.ceil(px * 1.25) };
  }

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight;
    let px = 16;
    let m = measure(px);
    if (W / m.cw < MIN_COLS || H / m.ch < MIN_ROWS) {
      px = Math.max(5, Math.floor(px * Math.min(W / (MIN_COLS * m.cw), H / (MIN_ROWS * m.ch))));
      m = measure(px);
    }
    fontPx = px; cw = m.cw; ch = m.ch;
    cols = Math.min(MAX_COLS, Math.max(MIN_COLS, Math.floor(W / cw)));
    rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.floor(H / ch)));
    Atomics.store(shared, 2, cols);
    Atomics.store(shared, 3, rows);
  }

  function sizeCanvas(w, h) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(w * cw * dpr);
    canvas.height = Math.ceil(h * ch * dpr);
    // Scale down to fit if the grid is bigger than the stage (tiny screens).
    const fit = Math.min(1, stage.clientWidth / (w * cw), stage.clientHeight / (h * ch));
    canvas.style.width = `${w * cw * fit}px`;
    canvas.style.height = `${h * ch * fit}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE['00'];
    ctx.fillRect(0, 0, w * cw, h * ch);
  }

  function drawCell(x, y, c, fg, bg, bold) {
    const px = x * cw, py = y * ch;
    ctx.fillStyle = PALETTE[bg] || '#000';
    ctx.fillRect(Math.floor(px), py, Math.ceil(cw) + 1, ch);
    if (c !== ' ') {
      ctx.font = `${bold ? 'bold ' : ''}${fontPx}px ${FONT}`;
      ctx.fillStyle = PALETTE[fg] || '#fff';
      ctx.fillText(c, px, py + ch / 2 + 1);
    }
  }

  // Every cell is kept so a pixel-only resize can be redrawn locally.
  function applyFrame(f) {
    if (f.full || f.w !== grid.w || f.h !== grid.h) {
      grid = { w: f.w, h: f.h, cells: new Array(f.w * f.h) };
      sizeCanvas(f.w, f.h);
    }
    for (const [x, y, text, fg, bg, bold] of f.runs) {
      let i = 0;
      for (const c of text) {
        drawCell(x + i, y, c, fg, bg, bold);
        grid.cells[y * f.w + x + i] = [c, fg, bg, bold];
        i++;
      }
    }
  }

  function redraw() {
    sizeCanvas(grid.w, grid.h);
    grid.cells.forEach((c, i) => {
      if (c) drawCell(i % grid.w, Math.floor(i / grid.w), c[0], c[1], c[2], c[3]);
    });
  }

  // ---- input -----------------------------------------------------------
  const sab = new SharedArrayBuffer(4 * (HEAD + RING));
  const shared = new Int32Array(sab);

  function sendKey(name) {
    const idx = NAMED.indexOf(name);
    const code = idx >= 0 ? NAMED_BASE + idx : name.codePointAt(0);
    const w = Atomics.load(shared, 0), r = Atomics.load(shared, 1);
    if (w - r >= RING) return; // buffer full: drop
    Atomics.store(shared, HEAD + (w % RING), code);
    Atomics.store(shared, 0, w + 1);
    Atomics.notify(shared, 0);
  }

  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    Enter: 'enter', Escape: 'esc', Backspace: 'backspace', ' ': 'space',
  };
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.altKey) return;
    let name;
    if (e.ctrlKey) {
      if (e.key !== 'c') return;
      name = 'ctrl-c';
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
  });

  // On-screen controls: tap, or hold to repeat.
  for (const btn of document.querySelectorAll('[data-key]')) {
    let timer = null;
    const stop = () => { clearTimeout(timer); clearInterval(timer); timer = null; };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const key = btn.dataset.key;
      sendKey(key);
      stop();
      if (['up', 'down', 'left', 'right'].includes(key)) {
        timer = setTimeout(() => { timer = setInterval(() => sendKey(key), 110); }, 280);
      }
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // A cols/rows change makes Python send a full frame; a pixel-only change is redrawn here.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layout();
      if (grid.w === cols && grid.h === rows) redraw();
    }, 100);
  });

  // ---- worker ----------------------------------------------------------
  layout();
  let save = '';
  try { save = localStorage.getItem(SAVE_KEY) || ''; } catch (_) { /* storage blocked */ }

  const worker = new Worker('worker.js');
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'status') status.textContent = m.text;
    else if (m.type === 'ready') overlay.hidden = true;
    else if (m.type === 'frame') applyFrame(JSON.parse(m.json));
    else if (m.type === 'save') {
      try { localStorage.setItem(SAVE_KEY, m.text); } catch (_) { /* storage blocked */ }
    } else if (m.type === 'quit') {
      overlay.hidden = false;
      status.textContent = 'Thanks for playing! Your farm is saved in this browser.';
      again.hidden = false;
    } else if (m.type === 'error') showError(m.text);
  };
  worker.onerror = (e) => showError(e.message || 'Worker failed to start.');
  worker.postMessage({ type: 'init', sab, save });
})();

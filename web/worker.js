// Runs hrvstmn.py under Pyodide. The Python game loop blocks this worker;
// keys arrive through a SharedArrayBuffer written by the page (main.js).
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
importScripts(PYODIDE_URL + 'pyodide.js');

// Must match main.js. Layout of the shared Int32Array:
//   [0] write count  [1] read count  [2] cols  [3] rows  [4..] key ring
const HEAD = 4;
const RING = 256;
const NAMED = ['up', 'down', 'left', 'right', 'enter', 'esc', 'tab', 'btab',
  'space', 'backspace', 'ctrl-c'];
const NAMED_BASE = 0x110000;

let shared = null;

function decode(code) {
  return code >= NAMED_BASE ? NAMED[code - NAMED_BASE] : String.fromCodePoint(code);
}

// Called from Python: returns a key name, or '' on timeout. ms < 0 waits forever.
self.waitKey = (ms) => {
  let w = Atomics.load(shared, 0);
  let r = Atomics.load(shared, 1);
  if (r === w) {
    Atomics.wait(shared, 0, w, ms < 0 ? Infinity : ms);
    w = Atomics.load(shared, 0);
    if (r === w) return '';
  }
  const code = Atomics.load(shared, HEAD + (r % RING));
  Atomics.store(shared, 1, r + 1);
  return decode(code);
};

self.getSize = () => [Atomics.load(shared, 2), Atomics.load(shared, 3)];
self.postFrame = (json) => postMessage({ type: 'frame', json });
self.postSave = (text) => postMessage({ type: 'save', text });
self.postQuit = () => postMessage({ type: 'quit' });
self.postError = (text) => postMessage({ type: 'error', text });

onmessage = async (e) => {
  if (e.data.type !== 'init') return;
  shared = new Int32Array(e.data.sab);
  try {
    postMessage({ type: 'status', text: 'Loading Python runtime...' });
    const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
    postMessage({ type: 'status', text: 'Loading game...' });
    const bust = '?v=' + Date.now();
    const [game, screen] = await Promise.all([
      fetch('../hrvstmn.py' + bust).then((r) => { if (!r.ok) throw new Error('hrvstmn.py: ' + r.status); return r.text(); }),
      fetch('webscreen.py' + bust).then((r) => { if (!r.ok) throw new Error('webscreen.py: ' + r.status); return r.text(); }),
    ]);
    pyodide.FS.writeFile('/home/pyodide/hrvstmn.py', game);
    pyodide.FS.writeFile('/home/pyodide/webscreen.py', screen);
    postMessage({ type: 'ready' });
    pyodide.globals.set('SAVE_TEXT', e.data.save || '');
    pyodide.runPython('import webscreen\nwebscreen.main(SAVE_TEXT)');
  } catch (err) {
    postMessage({ type: 'error', text: String(err && err.stack || err) });
  }
};

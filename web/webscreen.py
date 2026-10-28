"""
Browser backend for hrvstmn, run inside a Pyodide Web Worker (see worker.js).

The game itself is ../hrvstmn.py, unchanged. This module supplies a Screen
that sends frame diffs to the page and reads keys through a SharedArrayBuffer,
so the game's blocking getkey(timeout) loops work as-is.
"""
import json
import os
import sys
import traceback
import types

import js  # Pyodide: the worker's global scope

# Modules the terminal backend imports but the browser never uses.
# (Pyodide's tty module even fails to import, with a NameError.)
for _name in ('termios', 'tty'):
    sys.modules[_name] = types.ModuleType(_name)
try:
    import select  # noqa: F401
except Exception:
    sys.modules['select'] = types.ModuleType('select')

SAVE_DIR = os.environ.get('HRVSTMN_WEB_SAVE_DIR', '/hrvstmn_data')  # MEMFS in Pyodide
os.environ['XDG_DATA_HOME'] = SAVE_DIR

import hrvstmn  # noqa: E402  (must follow the XDG_DATA_HOME override)


class WebScreen(hrvstmn.Screen):
    def __init__(self):
        super().__init__(truecolor=True, headless=True)
        self.headless = False
        self.w, self.h = self._size()

    def _size(self):
        size = js.getSize()
        return max(80, int(size[0])), max(24, int(size[1]))

    def clear(self):
        w, h = self._size()
        if (w, h) != (self.w, self.h):
            self.w, self.h = w, h
            self.prev = None
        blank = (' ', '05', '00', False)
        self.buf = [[blank] * self.w for _ in range(self.h)]

    def flush(self):
        prev = self.prev
        full = prev is None
        runs = []
        for y, row in enumerate(self.buf):
            prow = None if full else prev[y]
            x, w = 0, self.w
            while x < w:
                cell = row[x]
                if prow is not None and prow[x] == cell:
                    x += 1
                    continue
                start, attr, chars = x, cell[1:], []
                while x < w and row[x][1:] == attr and (prow is None or prow[x] != row[x]):
                    chars.append(row[x][0])
                    x += 1
                runs.append([start, y, ''.join(chars), attr[0], attr[1], 1 if attr[2] else 0])
        if runs or full:
            js.postFrame(json.dumps({'w': self.w, 'h': self.h, 'full': full, 'runs': runs}))
        self.prev = self.buf

    def getkey(self, timeout=None):
        if self.queue:
            return self.queue.pop(0)
        ms = -1 if timeout is None else int(timeout * 1000)
        k = js.waitKey(ms)
        return k or None

    def close(self):
        js.postQuit()


def _install_save_hook():
    original = hrvstmn.Game.save

    def save(self):
        original(self)
        with open(hrvstmn.SAVE_PATH) as f:
            js.postSave(f.read())
    hrvstmn.Game.save = save


def _restore_save(text):
    if not text:
        return
    os.makedirs(os.path.dirname(hrvstmn.SAVE_PATH), exist_ok=True)
    with open(hrvstmn.SAVE_PATH, 'w') as f:
        f.write(text)


def main(save_text=''):
    _restore_save(save_text)
    _install_save_hook()
    scr = WebScreen()
    try:
        hrvstmn.Game(scr).run()
    except Exception:
        js.postError(traceback.format_exc())
        return
    scr.close()

# HRVSTMN

An ASCII tribute to *Harvest Moon: Friends of Mineral Town*, drawn in the
base16 Isotope Dark palette. One Python file (`hrvstmn.py`, standard library
only) runs in both a terminal and a browser.

## Terminal

```
python3 hrvstmn.py            # truecolor terminal, 80x24 or larger
python3 hrvstmn.py --256      # 256-color fallback
python3 hrvstmn.py --clock 3  # real seconds per 10 game minutes (default 6)
```

Saves go to `~/.local/share/hrvstmn/save.json` (or `$XDG_DATA_HOME`).

## Browser

```
python3 web/serve.py          # then open http://localhost:8000/web/
```

The web build runs the same `hrvstmn.py` under [Pyodide](https://pyodide.org)
inside a Web Worker, so game changes need no web-side work. `web/webscreen.py`
replaces the terminal screen: it posts frame diffs to the page (`web/main.js`
draws them on a canvas) and reads keys from a `SharedArrayBuffer`, so the
game's blocking input loops work unchanged.

- `SharedArrayBuffer` needs cross-origin isolation. `web/serve.py` sends the
  COOP/COEP headers. On static hosts that can't set headers, such as GitHub
  Pages, `web/coi-serviceworker.js` adds them (the page reloads itself once on
  first visit). Publish the repo root so that `web/` can fetch `../hrvstmn.py`.
- Saves are stored in the browser's `localStorage`.
- Touch devices get an on-screen d-pad and action buttons.
- Pyodide loads from jsDelivr (`v0.26.4`) on first visit, about 10 MB.
- Opening `index.html` straight from disk (`file://`) won't work; serve it.

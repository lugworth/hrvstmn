// Export the game's HTML controls (toolbar, menu, touch pad) as SVG with real text layers,
// by reading each element's box and computed style from the running app.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const URL = 'http://localhost:3500/?autostart=1';

function domToSvg(selectors) {
  const ASC = 0.928, DESC = 0.236;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const hex = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; if (m.length > 3 && Number(m[3]) === 0) return null; return '#' + m.slice(0, 3).map((v) => Math.round(Number(v)).toString(16).padStart(2, '0')).join(''); };
  const r2 = (n) => String(Math.round(n * 100) / 100);
  const ids = new Map();
  const uid = (s) => { const b = s.replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'layer'; const n = (ids.get(b) || 0) + 1; ids.set(b, n); return n === 1 ? b : `${b}-${n}`; };
  const roots = selectors.flatMap((s) => [...document.querySelectorAll(s)]);
  if (!roots.length) return null;
  const boxes = roots.map((e) => e.getBoundingClientRect());
  const X0 = Math.min(...boxes.map((b) => b.left)), Y0 = Math.min(...boxes.map((b) => b.top));
  const W = Math.max(...boxes.map((b) => b.right)) - X0, H = Math.max(...boxes.map((b) => b.bottom)) - Y0;
  const textOf = (str, cs, x, top, height, name) => {
    const fs = parseFloat(cs.fontSize);
    const base = top + (height - (ASC + DESC) * fs) / 2 + ASC * fs;
    const t = cs.textTransform === 'uppercase' ? str.toUpperCase() : str;
    const ls = parseFloat(cs.letterSpacing);
    return `<text id="${uid('text-' + name)}" x="${r2(x - X0)}" y="${r2(base - Y0)}" font-family="DejaVu Sans Mono" font-size="${r2(fs)}"${parseInt(cs.fontWeight) >= 600 ? ' font-weight="700"' : ''}${ls ? ` letter-spacing="${r2(ls)}"` : ''} fill="${hex(cs.color) || '#d0d0d0'}" xml:space="preserve">${esc(t)}</text>`;
  };
  const walk = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return '';
    const r = el.getBoundingClientRect();
    let inner = '';
    if (r.width && r.height && cs.display !== 'contents') {
      const bg = hex(cs.backgroundColor);
      const side = (s) => [parseFloat(cs[`border${s}Width`]) || 0, cs[`border${s}Style`] === 'none' ? null : hex(cs[`border${s}Color`])];
      const [t, rt, b, l] = ['Top', 'Right', 'Bottom', 'Left'].map(side);
      const uniform = t[0] > 0 && t[1] && [rt, b, l].every((s) => s[0] === t[0] && s[1] === t[1]);
      const rx = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
      if (bg || uniform) {
        const sw = uniform ? t[0] : 0;
        inner += `<rect id="${uid('box')}" x="${r2(r.left - X0 + sw / 2)}" y="${r2(r.top - Y0 + sw / 2)}" width="${r2(r.width - sw)}" height="${r2(r.height - sw)}"${rx ? ` rx="${r2(rx)}"` : ''} fill="${bg || 'none'}"${uniform ? ` stroke="${t[1]}" stroke-width="${sw}"` : ''}/>`;
      }
      if (!uniform) {
        if (t[0] && t[1]) inner += `<rect id="${uid('border-top')}" x="${r2(r.left - X0)}" y="${r2(r.top - Y0)}" width="${r2(r.width)}" height="${t[0]}" fill="${t[1]}"/>`;
        if (b[0] && b[1]) inner += `<rect id="${uid('border-bottom')}" x="${r2(r.left - X0)}" y="${r2(r.bottom - Y0 - b[0])}" width="${r2(r.width)}" height="${b[0]}" fill="${b[1]}"/>`;
        if (l[0] && l[1]) inner += `<rect id="${uid('border-left')}" x="${r2(r.left - X0)}" y="${r2(r.top - Y0)}" width="${l[0]}" height="${r2(r.height)}" fill="${l[1]}"/>`;
        if (rt[0] && rt[1]) inner += `<rect id="${uid('border-right')}" x="${r2(r.right - X0 - rt[0])}" y="${r2(r.top - Y0)}" width="${rt[0]}" height="${r2(r.height)}" fill="${rt[1]}"/>`;
      }
    }
    // a heading written by CSS (::before { content: attr(data-title) })
    const pre = getComputedStyle(el, '::before');
    if (pre.content && pre.content !== 'none' && pre.content !== 'normal' && el.dataset.title) {
      const fs = parseFloat(pre.fontSize);
      inner += textOf(el.dataset.title, pre, r.left + (parseFloat(pre.paddingLeft) || 0), r.top + (parseFloat(pre.paddingTop) || 0), (ASC + DESC) * fs, 'heading-' + el.dataset.title);
    }
    for (const node of el.childNodes) {
      if (node.nodeType === 1) inner += walk(node);
      else if (node.nodeType === 3 && node.textContent.trim()) {
        // one text layer per line: measure word by word and join words that share a line
        const words = [];
        const re = /\S+/g;
        let m;
        while ((m = re.exec(node.textContent))) {
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const b = range.getBoundingClientRect();
          if (b.width) words.push({ w: m[0], b });
        }
        for (let i = 0; i < words.length; ) {
          let j = i + 1;
          while (j < words.length && Math.abs(words[j].b.top - words[i].b.top) < 2) j++;
          const line = words.slice(i, j);
          inner += textOf(line.map((x) => x.w).join(' '), cs, line[0].b.left, line[0].b.top, line[0].b.height, line[0].w);
          i = j;
        }
      }
    }
    if (!inner) return '';
    const name = (el.getAttribute('role') || el.tagName.toLowerCase()) + '-' + ((el.getAttribute('aria-label') || el.dataset.title || el.dataset.label || el.textContent || el.className || '').trim().slice(0, 28));
    return `<g id="${uid(name)}">${inner}</g>`;
  };
  return { svg: roots.map(walk).join(''), w: W, h: H };
}

const sheet = (title, parts) => {
  let y = 70, W = 820, body = `<text x="28" y="38" font-family="DejaVu Sans Mono" font-size="22" font-weight="700" fill="#00ffff">${title}</text>`;
  for (const p of parts) {
    if (!p.part) { console.log('  (missing)', p.title); continue; }
    body += `<text x="28" y="${y + 8}" font-family="DejaVu Sans Mono" font-size="11" fill="#c0c0c0">${p.title}</text><g transform="translate(28 ${y + 20})">${p.part.svg}</g>`;
    y += p.part.h + 60;
    W = Math.max(W, p.part.w + 56);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(W)}" height="${Math.ceil(y)}" viewBox="0 0 ${Math.ceil(W)} ${Math.ceil(y)}"><rect id="backdrop" width="100%" height="100%" fill="#000000"/>${body}</svg>\n`;
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  // ---- desktop
  const page = await browser.newPage({ viewport: { width: 1363, height: 936 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForTimeout(2500);
  await page.locator('#term').click();
  const toolbar = await page.evaluate(domToSvg, ['.game-toolbar']);
  await page.keyboard.press('F10');
  await page.waitForTimeout(300);
  const menu = await page.evaluate(domToSvg, ['.game-menu']);
  fs.writeFileSync(`${OUT}/ui-desktop.svg`, sheet('HRVSTMN — desktop controls (real, editable text)', [
    { title: 'toolbar (under the map, 1363 px wide)', part: toolbar },
    { title: 'game menu (opens above the toolbar; first item focused)', part: menu },
  ]));
  await page.close();
  // ---- phone
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL);
  await p.waitForTimeout(2500);
  const pad = await p.evaluate(domToSvg, ['.t-util', '.t-move', '.t-act']);
  await p.evaluate(() => { const f = document.querySelector('.type-bar'); f.classList.remove('type-off'); });
  const typeBar = await p.evaluate(domToSvg, ['.type-bar']);
  await p.evaluate(() => document.querySelector('.type-bar').classList.add('type-off'));
  await p.locator('.t-util-b .pad-btn', { hasText: 'MENU' }).tap();
  await p.waitForTimeout(300);
  const sheetMenu = await p.evaluate(domToSvg, ['.game-menu']);
  fs.writeFileSync(`${OUT}/ui-touch.svg`, sheet('HRVSTMN — phone controls (Pixel 7 portrait, real text)', [
    { title: 'utility row, D-pad and action buttons', part: pad },
    { title: 'game menu as a sheet over the map', part: sheetMenu },
    { title: 'name entry bar (shown while a name prompt is open)', part: typeBar },
  ]));
  console.log('ui files written; errors:', errors.length ? errors : 'none');
  await browser.close();
})();

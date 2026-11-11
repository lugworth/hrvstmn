const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://localhost:3600/_generator/www/');
  const res = await page.evaluate(() => window.buildAssets());
  for (const [rel, body] of Object.entries(res.files)) {
    const file = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (body.startsWith('data:')) fs.writeFileSync(file, Buffer.from(body.split(',')[1], 'base64'));
    else fs.writeFileSync(file, body);
  }
  console.log('files:', Object.keys(res.files).length, 'missing glyphs:', JSON.stringify(res.missing), 'K:', res.K.toFixed(4));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();

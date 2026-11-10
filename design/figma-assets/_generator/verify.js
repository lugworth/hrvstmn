// Render SVG files in Chromium (fonts available as "DejaVu Sans Mono") to PNG for checking.
const { chromium } = require('playwright');
const fs = require('fs');
const [OUT, scale, ...svgs] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: Number(scale) });
  await page.goto('http://localhost:3600/_generator/www/');
  for (const f of svgs) {
    const svg = fs.readFileSync(f, 'utf8').replace(/<\?xml[^>]*\?>/, '');
    await page.evaluate((s) => { document.body.innerHTML = s; }, svg);
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$('svg');
    const box = await el.boundingBox();
    await page.setViewportSize({ width: Math.ceil(box.width), height: Math.min(Math.ceil(box.height), 8000) });
    const name = f.split('/').slice(-1)[0].replace('.svg', '.png');
    await el.screenshot({ path: `${OUT}/${name}` });
    console.log(name, Math.ceil(box.width), 'x', Math.ceil(box.height));
  }
  await browser.close();
})();

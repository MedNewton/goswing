// preview/shot.js — screenshot the web preview at phone size.
//   node preview/shot.js out.png [--url http://localhost:8099] [--wait 2500] [click text]...
// Each extra argument is visible text to click, in order (e.g. a tab label).
// Prefix with "@" to click by accessibility label instead (e.g. "@Close").
const { chromium } = require('playwright');

(async () => {
  const args = process.argv.slice(2);
  const out = args.shift();
  let url = 'http://localhost:8099';
  let wait = 2500;
  const clicks = [];
  while (args.length) {
    const a = args.shift();
    if (a === '--url') url = args.shift();
    else if (a === '--wait') wait = Number(args.shift());
    else clicks.push(a);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(wait);
  for (const c of clicks) {
    const loc = c.startsWith('@') ? page.getByLabel(c.slice(1), { exact: true }) : page.getByText(c, { exact: true });
    await loc.last().click({ timeout: 10000 });
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: out });
  if (errors.length) console.log('Console errors:\n' + errors.slice(0, 10).join('\n'));
  await browser.close();
})();

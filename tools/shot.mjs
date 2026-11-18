// Usage: node tools/shot.mjs <url> <out.png> [clicks json: [[x,y],...]] [waitMs]
import { readFileSync } from 'node:fs';
import puppeteer from '../app/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const [url, out, clicksJson = '[]', wait = '6000'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1600,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, +wait));
for (const step of JSON.parse(clicksJson)) {
  if (typeof step === 'string' && step.startsWith('snap:')) { await page.screenshot({ path: step.slice(5) }); continue; }
  if (typeof step === 'string' && step.startsWith('file:')) await page.evaluate(readFileSync(step.slice(5), 'utf8'));
  else if (typeof step === 'string' && step.startsWith('js:')) await page.evaluate(step.slice(3));
  else if (typeof step === 'string') await page.click(step);
  else await page.mouse.click(step[0], step[1]);
  await new Promise((r) => setTimeout(r, 1200));
}
await page.screenshot({ path: out });
console.log(logs.slice(0, 30).join('\n'));
await browser.close();

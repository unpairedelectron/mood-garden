// Usage: node tools/bake.mjs <asset> [cellHeight]   (dev server must be running on :5197,
// with the Poly Haven glTF folders downloaded to tools/raw/<asset>/).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import sharp from 'sharp';
import fs from 'node:fs';

const [name, cell = '640'] = process.argv.slice(2);
const out = new URL('../public/assets/trees/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
p.on('console', (m) => m.type() === 'error' && console.log('[page]', m.text().slice(0, 300)));
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5197/bake.html');
await p.waitForFunction(() => 'bake' in window);
const r = await p.evaluate(([n, c]) => window.bake(n, +c), [name, cell]);
await b.close();
const buf = (s) => Buffer.from(s.split(',')[1], 'base64');
await sharp(buf(r.albedo)).webp({ quality: 86, alphaQuality: 90, effort: 5, exact: true }).toFile(`${out}${name}_albedo.webp`);
const meta = await sharp(buf(r.normal)).metadata();
await sharp(buf(r.normal)).resize(Math.round(meta.width / 2), Math.round(meta.height / 2)).webp({ quality: 88, effort: 5 }).toFile(`${out}${name}_normal.webp`);
const info = { width: +r.width.toFixed(3), height: +r.height.toFixed(3), cols: 4, rows: 2, sourceTriangles: Math.round(r.tris) };
fs.writeFileSync(`${out}${name}.json`, JSON.stringify(info));
console.log(name, info, r.cellW + 'x' + r.cellH);

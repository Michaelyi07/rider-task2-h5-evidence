import { readdir, writeFile } from 'node:fs/promises';

const endpoint = 'http://127.0.0.1:8787/health';
let health = 'unreachable';
try {
  const res = await fetch(endpoint);
  health = `HTTP ${res.status} ${await res.text()}`;
} catch (err) {
  health = `ERROR: ${err.message}`;
}

let files = [];
try {
  files = (await readdir(new URL('../evidence/', import.meta.url))).sort();
} catch { /* ignore */ }

const report = [
  `collected_at=${new Date().toISOString()}`,
  `GET ${endpoint} -> ${health}`,
  '',
  'evidence files:',
  ...files.map((f) => `  - ${f}`),
  '',
  '注：仅在 mock 服务运行时 curl/health 才可达；本脚本不对输出做任何加工。'
].join('\n');

await writeFile(new URL('../evidence/evidence-summary.txt', import.meta.url), report, 'utf8');
console.log(report);

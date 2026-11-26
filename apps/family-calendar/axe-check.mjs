import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const distPath = path.resolve(import.meta.dirname, 'dist/index.html');
console.log('Loading:', distPath);

import { spawn } from 'node:child_process';
const server = spawn('node', ['scripts/serve.mjs', 'apps/family-calendar/dist', '4183'], {
  cwd: '/home/agent/worktrees/lacuna-apps/family-calendar',
  stdio: 'pipe'
});
await new Promise((resolve) => {
  server.stdout.on('data', (d) => {
    if (d.toString().includes('4183') || d.toString().includes('ready')) resolve();
  });
  setTimeout(resolve, 3000);
});

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4183/');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);

const axePath = '/home/agent/worktrees/lacuna-apps/family-calendar/node_modules/.pnpm/axe-core@4.14.1/node_modules/axe-core/axe.min.js';
const axeSource = readFileSync(axePath, 'utf8');
await page.addScriptTag({ content: axeSource });

const results = await page.evaluate(async () => {
  return await window.axe.run(document);
});

console.log('Violations:', JSON.stringify(results.violations.map(v => ({
  id: v.id,
  impact: v.impact,
  nodes: v.nodes.map(n => ({
    html: n.html,
    target: n.target,
    failureSummary: n.failureSummary
  }))
})), null, 2));

await browser.close();
server.kill();

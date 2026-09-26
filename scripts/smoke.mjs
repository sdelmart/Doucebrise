// Test de fumée : sert le jeu construit (dist/), le lance dans Chromium sans écran,
// crée une partie et ouvre les principales fenêtres. Échoue à la moindre erreur JavaScript.
//   npm run build && npm run test:smoke

import { mkdirSync } from 'node:fs';
import { preview } from 'vite';
import { chromium } from 'playwright';

const OUT = 'smoke';
mkdirSync(OUT, { recursive: true });

const server = await preview({ preview: { port: 4173, host: '127.0.0.1', strictPort: false }, logLevel: 'warn' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

const steps = [];
async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    steps.push(`✔ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    steps.push(`✘ ${name} : ${e.message.split('\n')[0]}`);
    errors.push(`${name} : ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: `${OUT}/echec.png` }).catch(() => {});
    throw e;
  }
}
const state = () => page.evaluate(() => window.game?.state);

try {
  await step('Écran titre', async () => {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.game && window.game.state === 'title', null, { timeout: 180000 });
    await page.waitForSelector('#btn-new', { state: 'visible', timeout: 30000 });
    await page.screenshot({ path: `${OUT}/1-titre.png` });
  });
  await step('Nouvelle partie', async () => {
    await page.click('#btn-new');
    await page.waitForSelector('#cr-name', { state: 'visible', timeout: 30000 });
    await page.fill('#cr-name', 'Fumée');
    await page.click('#cr-done');
    await page.waitForFunction(() => window.game.state === 'play', null, { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.click('[data-chap-ok]', { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/2-jeu.png` });
  });
  await step('Fenêtres (carte, journal, sac, aide, pause, paramètres)', async () => {
    for (const panel of ['map', 'journal', 'bag', 'help', 'pause', 'settings']) {
      await page.evaluate((p) => window.game.openPanel(p), panel);
      await page.waitForTimeout(400);
      const open = await page.evaluate(() => window.game.panel);
      if (open !== panel) throw new Error(`la fenêtre « ${panel} » ne s'ouvre pas`);
      await page.evaluate(() => window.game.closePanels());
    }
  });
  await step('Se déplacer', async () => {
    const before = await page.evaluate(() => ({ x: window.game.player.pos.x, z: window.game.player.pos.z }));
    await page.keyboard.down('KeyW');
    await page.waitForFunction((b) => Math.hypot(window.game.player.pos.x - b.x, window.game.player.pos.z - b.z) > 0.5, before, { timeout: 30000 });
    await page.keyboard.up('KeyW');
  });
  await step('Course de luge', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const sl = g.sled;
      g.player.teleport(sl.startSign.x + 1, sl.startSign.z + 1, 0);
      sl.begin();
      return new Promise((resolve) => setTimeout(() => {
        sl.countdown = 0;
        for (let i = 0; i < 900 && sl.active; i++) sl.update(1 / 30);
        resolve({ active: sl.active, runs: sl.runs });
      }, 800));
    });
    if (r.active) throw new Error('la descente ne se termine pas');
  });
  await step('Sauvegarde et reprise', async () => {
    await page.evaluate(() => window.game.saveNow());
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.game && window.game.state === 'title', null, { timeout: 180000 });
    await page.click('#btn-continue');
    await page.waitForFunction(() => window.game.state === 'play', null, { timeout: 60000 });
    const name = await page.evaluate(() => window.game.character.appearance.name);
    if (name !== 'Fumée') throw new Error(`profil perdu (nom : ${name})`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/3-reprise.png` });
  });
} catch {
  /* l'erreur est déjà notée */
}

console.log(steps.join('\n'));
if (errors.length) console.error(`\n${errors.length} erreur(s) :\n${errors.join('\n')}`);
else console.log(`\nTout va bien (état : ${await state()}).`);
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);

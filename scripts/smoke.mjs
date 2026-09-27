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
// Rendu logiciel (SwiftShader) sur une petite machine de CI : une image peut prendre
// plusieurs secondes ; clics et captures attendent donc plus longtemps que par défaut.
page.setDefaultTimeout(120000);
// SMOKE_SLOW=4 : processeur 4× plus lent, pour reproduire une machine de CI chargée.
if (process.env.SMOKE_SLOW) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.SMOKE_SLOW) });
}
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

// Attend que le jeu soit libre (carte du chapitre, dialogue d'accueil… refermés).
async function settle() {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    const s = await page.evaluate(() => ({ busy: window.game.busy, panel: window.game.panel }));
    if (!s.busy && !s.panel) return;
    // Clic direct : à 1 image par seconde, l'animation d'apparition fait échouer un clic « réel ».
    await page.evaluate(() => document.querySelector('#chapter:not(.hidden) [data-chap-ok]')?.click());
    await page.waitForTimeout(500);
  }
  throw new Error(`le jeu reste occupé : ${await page.evaluate(() => JSON.stringify({ chapitre: window.game.ui.chapterOpen, dialogue: window.game.dialogue.open, fenetre: window.game.panel }))}`);
}

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
    await settle();
    await page.screenshot({ path: `${OUT}/2-jeu.png` });
  });
  await step('Fenêtres (carte, journal, sac, aide, pause, paramètres)', async () => {
    for (const panel of ['map', 'journal', 'bag', 'help', 'pause', 'settings']) {
      await settle();
      await page.evaluate((p) => window.game.openPanel(p), panel);
      await page.waitForTimeout(400);
      const open = await page.evaluate(() => window.game.panel);
      if (open !== panel) throw new Error(`la fenêtre « ${panel} » ne s'ouvre pas (ouverte : ${open}, occupé : ${await page.evaluate(() => window.game.busy)})`);
      await page.evaluate(() => window.game.closePanels());
    }
  });
  await step('Modèles 3D', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      let models = 0;
      g.world.vegetation.group.traverse((o) => {
        if (o.isVariants || o.userData?.model) models++;
      });
      return { avatar: g.character.isModel, models };
    });
    if (!r.avatar) throw new Error('le personnage importé n\'est pas chargé');
    if (r.models < 5) throw new Error(`végétation importée incomplète (${r.models} types)`);
  });
  await step('Rendu réaliste (sol détaillé, herbe dense, arbres)', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const f = g.world.vegetation.forests || {};
      return {
        style: g.renderStyle,
        env: !!g.scene.environment,
        ground: !!g.world.terrainMesh.geometry.attributes.splatA,
        grass: g.world.grassField.geometry.instanceCount,
        trees: Object.values(f).reduce((n, x) => n + (x.bark ? x.trees.length : 0), 0),
        pins: f.pins?.leaves?.instanceCount || 0,
      };
    });
    if (r.style !== 'realiste') throw new Error(`style de rendu : ${r.style}`);
    if (!r.env) throw new Error('pas de lumière du ciel (environnement)');
    if (!r.ground) throw new Error('textures du sol non chargées');
    if (!(r.grass > 1000)) throw new Error(`tapis d'herbe vide (${r.grass})`);
    if (!(r.trees > 500 && r.pins > 300)) throw new Error(`arbres générés absents (${r.trees}, île des Pins : ${r.pins})`);
  });
  await step('Paramètres : redémarrage proposé', async () => {
    await settle();
    await page.evaluate(() => window.game.openPanel('settings'));
    await page.waitForSelector('[data-set="graphics.style"][data-val="cartoon"]', { state: 'visible', timeout: 10000 });
    await page.evaluate(() => document.querySelector('[data-set="graphics.style"][data-val="cartoon"]').click());
    await page.waitForSelector('.restart-bar [data-restart]', { state: 'visible', timeout: 5000 });
    await page.evaluate(() => document.querySelector('[data-set="graphics.style"][data-val="realiste"]').click());
    if (await page.$('.restart-bar')) throw new Error('le bandeau de redémarrage reste affiché');
    await page.evaluate(() => window.game.closePanels());
  });
  await step('Musique', async () => {
    const r = await page.evaluate(() => new Promise((resolve) => {
      const m = window.game.music;
      if (!m.tracks.length) return resolve({ skip: true });
      const t0 = m.deck?.el.currentTime ?? -1;
      setTimeout(() => resolve({ mood: m.mood, track: m.playing?.name, t0, t1: m.deck?.el.currentTime ?? -1 }), 2500);
    }));
    if (r.skip) return;
    if (!r.track) throw new Error('aucune chanson ne joue');
    if (!(r.t1 > r.t0)) throw new Error(`la chanson « ${r.track} » ne se lit pas`);
  });
  await step('Se déplacer', async () => {
    await settle();
    const before = await page.evaluate(() => ({ x: window.game.player.pos.x, z: window.game.player.pos.z }));
    await page.keyboard.down('KeyW');
    await page.waitForFunction((b) => Math.hypot(window.game.player.pos.x - b.x, window.game.player.pos.z - b.z) > 0.5, before, { timeout: 120000 });
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
    await settle();
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

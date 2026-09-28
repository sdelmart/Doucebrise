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
      // Rendu réaliste : arbres, buissons et palmiers sont générés (types de plantes des forêts).
      for (const f of Object.values(g.world.vegetation.forests || {})) models += f.kinds.length;
      return { avatar: g.character.isModel, models };
    });
    if (!r.avatar) throw new Error('le personnage importé n\'est pas chargé');
    if (r.models < 5) throw new Error(`végétation incomplète (${r.models} types)`);
  });
  await step('Habitants 3D animés', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const list = g.villagers.list;
      const models = list.filter((v) => v.character.mixer && v.character.meshes?.length === 1 && v.character.meshes[0].isSkinnedMesh);
      // Un habitant sur la place, animé : il marche puis salue.
      const v = list[0];
      v.override = { x: g.player.pos.x + 2, z: g.player.pos.z, rot: 0 };
      v.update(0.016, 10, false);
      v.character.play('wave', 1);
      for (let i = 0; i < 10; i++) v.character.update(0.05, { speed: 2.3, running: false, grounded: true, vy: 0 });
      v.override = null;
      const m = models[0]?.character.meshes[0];
      return { n: list.length, models: models.length, draw: m ? m.frustumCulled && !!m.boundingSphere : false, verts: m?.geometry.attributes.position.count || 0 };
    });
    if (r.models !== r.n) throw new Error(`${r.n - r.models} habitant(s) sans modèle animé`);
    if (!r.draw) throw new Error('volume englobant des habitants absent');
    if (!(r.verts > 1000)) throw new Error(`habitant vide (${r.verts} sommets)`);
  });
  await step('Gestes de métier (outils en main, pose, bruit)', async () => {
    const issues = await page.evaluate(() => {
      const g = window.game;
      const out = [];
      for (const v of g.villagers.list) {
        const ch = v.character;
        ch.setWork?.(v.def.id);
        if (!ch.work) continue;
        for (const m of ch.work.job.moves) {
          const wk = ch.work;
          // Pose de repos (sans geste), puis le geste.
          wk.move = null;
          wk.last = null;
          wk.restT = 99;
          ch.anim.overlay.work = 0;
          ch.update(0.05, { speed: 0, running: false, grounded: true, vy: 0 });
          const r0 = ch.bones['upperarm.r'].quaternion.clone();
          const l0 = ch.bones['upperarm.l'].quaternion.clone();
          wk.move = m;
          wk.last = m;
          wk.t = 0;
          wk.dur = 99;
          wk.played.clear();
          ch.anim.overlay.work = 1;
          ch.every = 1;
          for (let i = 0; i < 3; i++) ch.update(0.05, { speed: 0, running: false, grounded: true, vy: 0 });
          for (const side of ['r', 'l']) {
            const name = m.props?.[side];
            if (name && !wk.meshes[`${side}:${name}`]?.visible) out.push(`${v.def.id} « ${m.name} » : outil ${name} absent`);
          }
          if (!m.clips && ch.bones['upperarm.r'].quaternion.angleTo(r0) < 0.05 && ch.bones['upperarm.l'].quaternion.angleTo(l0) < 0.05) out.push(`${v.def.id} « ${m.name} » : pas de pose`);
        }
        ch.setWork(null);
        for (let i = 0; i < 20; i++) ch.update(0.05, { speed: 0, running: false, grounded: true, vy: 0 });
        if (Object.values(ch.work.meshes).some((x) => x.visible)) out.push(`${v.def.id} : outil encore visible après le travail`);
      }
      const n = g.villagers.list.filter((v) => v.character.work).length;
      if (n < 15) out.push(`seulement ${n} habitants ont un geste de métier`);
      g.audio.ensure();
      if (g.audio.ctx) for (const k of ['knock', 'saw', 'swish', 'scrape', 'shake']) g.audio.soundscape.tool(k, 0, 0.3);
      return out;
    });
    if (issues.length) throw new Error(issues.join(' ; '));
  });
  await step('Rendu réaliste (sol détaillé, herbe dense, arbres, décor)', async () => {
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
        palms: (f.corail?.kinds || []).filter((k) => k.species === 'palm').reduce((n, k) => n + k.count, 0),
        bushes: (f.main?.kinds || []).filter((k) => k.species === 'bush').reduce((n, k) => n + k.count, 0),
        rocks: !!g.world.vegetation.rockMat,
        decor: !!g.world.village.group.children.find((m) => m.geometry?.attributes.aSurf),
      };
    });
    if (r.style !== 'realiste') throw new Error(`style de rendu : ${r.style}`);
    if (!r.env) throw new Error('pas de lumière du ciel (environnement)');
    if (!r.ground) throw new Error('textures du sol non chargées');
    if (!(r.grass > 1000)) throw new Error(`tapis d'herbe vide (${r.grass})`);
    if (!(r.trees > 500 && r.pins > 300)) throw new Error(`arbres générés absents (${r.trees}, île des Pins : ${r.pins})`);
    if (!(r.palms > 50 && r.bushes > 10)) throw new Error(`palmiers ou buissons générés absents (${r.palms}, ${r.bushes})`);
    if (!r.rocks) throw new Error('rochers générés absents');
    if (!r.decor) throw new Error('matières du décor (enduit, tuiles…) absentes');
  });
  await step('Qualité automatique (tous les paliers)', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const off = g.autoOff;
      g.autoOff = false;
      const seen = [];
      for (let level = 0; level <= 9; level++) {
        g.settings.autoLevel = level;
        g.applyGraphics();
        g.postfx.render(0.016);
        seen.push({ ratio: g.renderer.getPixelRatio(), detail: g.world.terrainMesh.material === g.world.terrainMesh.userData.detailed, ao: !!g.postfx.ao });
      }
      g.settings.autoLevel = 0;
      g.applyGraphics();
      g.autoOff = off;
      return seen;
    });
    const last = r[r.length - 1];
    if (!(r[0].ratio >= 1 && r[0].detail && r[0].ao)) throw new Error(`palier 0 incomplet : ${JSON.stringify(r[0])}`);
    if (!(last.ratio < 0.6 && !last.detail && !last.ao)) throw new Error(`palier 9 pas allégé : ${JSON.stringify(last)}`);
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
  await step('Sons, pêche et fêtes (pas, ambiance, moulinet, œufs, feu d\'artifice, concours)', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const out = [];
      const sky = g.world.sky;
      const day0 = sky.day;
      const hour0 = sky.hour;
      g.audio.ensure();
      // Pas : chaque surface se joue ; la surface sous les pieds est reconnue.
      const Fs = g.footsteps.constructor;
      for (const s of ['grass', 'leaves', 'dirt', 'sand', 'stone', 'wood', 'snow', 'water']) Fs.sound(g.audio, s, {});
      const surf = g.footsteps.surfaceAt();
      if (!['grass', 'leaves', 'dirt', 'sand', 'stone', 'wood', 'snow', 'water'].includes(surf)) out.push(`surface inconnue : ${surf}`);
      // Ambiance : chœur de l'aube au village.
      const S = g.audio.soundscape;
      let birds = 0;
      const bird = S.bird.bind(S);
      S.bird = (...a) => {
        birds++;
        bird(...a);
      };
      if (g.audio.ctx) for (let i = 0; i < 100; i++) S.update(0.1, { hour: 6.5, season: 0, zone: 'village', out: 1 });
      S.bird = bird;
      if (g.audio.ctx && birds < 3) out.push(`trop peu d'oiseaux à l'aube (${birds})`);
      // Pêche : combat au moulinet, en relâchant quand le poisson tire.
      const F = g.fishing;
      const spot = g.world.fishingSpots.find((s) => s.habitat === 'mer');
      g.player.teleport(spot.x, spot.z, 0);
      let caught = null;
      const off = g.on('catch', (d) => (caught = d));
      let hold = false;
      const input = { moveVector: () => ({ x: 0, y: 0 }), down: () => hold };
      for (let n = 0; n < 5 && !caught; n++) {
        F.start(spot);
        F.catch = { fish: F.available(spot)[0] };
        F.t = 0;
        F.nibbles = [];
        F.update(1 / 30, input);
        if (F.state !== 'bite') throw new Error(`pas de morsure (état ${F.state})`);
        F.action();
        for (let i = 0; i < 1800 && F.state === 'reel'; i++) {
          const rl = F.reel;
          hold = rl.rush ? rl.tension < 0.2 : rl.tension < 0.75;
          F.update(1 / 30, input);
        }
        if (F.active) F.stop();
      }
      off?.();
      if (!caught) out.push('aucun poisson pris au moulinet');
      // Chasse aux œufs (printemps, jour 1 de la 2e année).
      const Fe = g.festivals;
      sky.day = 13;
      sky.hour = 10;
      g.calendar.onNewDay(false);
      if (Fe.eggs.length < 10) out.push(`seulement ${Fe.eggs.length} œufs cachés`);
      Fe.pickEgg(Fe.eggs[0]);
      const hunt = Fe.huntResults();
      if (!hunt.rank) out.push('pas de classement de la chasse aux œufs');
      // Fête de l'été : feu d'artifice et caisse de fusées.
      sky.day = 16;
      sky.hour = 21.5;
      g.calendar.onNewDay(false);
      if (!Fe.showOn) out.push('pas de feu d\'artifice à 21 h 30 le jour de la Fête de l\'été');
      Fe.update(0.1);
      Fe.crateCd = 0;
      Fe.launchOwn();
      for (let i = 0; i < 40; i++) Fe.fireworks.update(0.05, g.camera);
      if (!Fe.fireworks.busy) out.push('les fusées ne partent pas');
      Fe.releaseAudience();
      // Concours de cuisine.
      sky.day = 19;
      sky.hour = 11;
      g.calendar.onNewDay(false);
      if (!Fe.contestOpen) out.push('concours de cuisine fermé le jour de la fête');
      g.inventory.soupe = (g.inventory.soupe || 0) + 1;
      const c = Fe.contestResults('soupe', 5);
      if (!c.rank || !c.total) out.push('pas de note au concours de cuisine');
      sky.day = day0;
      sky.hour = hour0;
      g.calendar.onNewDay(false);
      return { issues: out, surf, birds, fish: caught?.fish, eggs: hunt.rank, cook: `${c.rank}e (${c.total})` };
    });
    if (r.issues.length) throw new Error(r.issues.join(' ; '));
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

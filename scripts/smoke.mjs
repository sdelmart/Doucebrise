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
    // Écran « Douce brise » : visite en cartes postales, poteau indicateur, personnage caché.
    const t = await page.evaluate(() => {
      const g = window.game;
      const ts = g.titleScene;
      const out = [];
      if (!ts?.active || !ts.shot) out.push('pas de visite de l\'archipel');
      if (g.cam.mode !== 'cine') out.push(`caméra ${g.cam.mode}`);
      if (g.character.root.visible) out.push('personnage visible pendant le titre');
      if (!document.querySelector('.title-postcard b')?.textContent) out.push('pas de légende de carte postale');
      if (document.querySelectorAll('.logo.brise .lt').length !== 10) out.push('lettres du logo');
      if (!document.querySelector('.signpost #btn-new')) out.push('menu hors du poteau indicateur');
      if (!document.querySelector('.sp-mascot')?.src.startsWith('data:image/png')) out.push('pas de chat sur le poteau');
      const first = ts?.shot?.id;
      ts?.next();
      if (ts?.shot?.id === first) out.push('les cartes postales ne changent pas');
      return out.join(' ; ');
    });
    if (t) throw new Error(t);
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
    const back = await page.evaluate(() => (window.game.titleScene.active || !window.game.character.root.visible ? 'visite du titre pas arrêtée' : ''));
    if (back) throw new Error(back);
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
  await step('Interface épurée (menus rapides, promenade, carnet du matin)', async () => {
    await settle();
    await page.evaluate(() => document.querySelectorAll('.tip').forEach((t) => t.classList.add('hidden')));
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const g = window.game;
      const out = [];
      const b = document.body.classList;
      const shown = (sel) => getComputedStyle(document.querySelector(sel)).display !== 'none';
      if (!b.contains('hud-clean')) out.push(`mode par défaut : ${[...b].join(' ')}`);
      if (shown('#player-tag') || shown('#zone-label')) out.push('nom ou lieu encore affichés');
      if (!g.ui.trayOpen || !shown('#hud-buttons')) out.push('Tab n\'ouvre pas les menus rapides');
      document.querySelector('#hud-buttons [data-open="journal"]').click();
      if (g.panel !== 'journal') out.push(`le bouton Journal des menus rapides n'ouvre pas le journal (${g.panel})`);
      if (g.ui.trayOpen) out.push('les menus rapides restent ouverts');
      g.closePanels();
      // Promenade : l'interface s'efface après quelques secondes de marche, revient à l'arrêt.
      const ui = g.ui;
      ui.wakeUntil = 0;
      for (let i = 0; i < 30; i++) { g.player.speed = 3; ui.updateHud(0.1); }
      if (!b.contains('hud-roam')) out.push('l\'interface ne s\'efface pas en marchant');
      for (let i = 0; i < 12; i++) { g.player.speed = 0; ui.updateHud(0.1); }
      if (b.contains('hud-roam')) out.push('l\'interface ne revient pas à l\'arrêt');
      // Interface complète : tous les boutons, sans menus rapides.
      g.settings.hud = 'complet';
      g.applySettings(false);
      if (!shown('#hud-buttons') || shown('#btn-tray')) out.push('interface complète : boutons absents');
      g.settings.hud = 'epure';
      g.applySettings(false);
      if (shown('#hud-buttons')) out.push('interface épurée : boutons encore affichés');
      // Carnet du matin : au lever du jour suivant.
      const sky = g.world.sky;
      const day0 = sky.day;
      const hour0 = sky.hour;
      sky.day += 1;
      sky.hour = 6.5;
      g.morning.schedule();
      g.morning.update();
      const txt = document.querySelector('#morning').innerText;
      if (!g.morning.open) out.push('pas de carnet du matin');
      else if (!/Bonjour/.test(txt) || !/demain/.test(txt)) out.push(`carnet du matin incomplet : ${txt.slice(0, 80)}`);
      g.morning.hide();
      sky.day = day0;
      sky.hour = hour0;
      g.lastDay = day0;
      return out.join(' ; ');
    });
    if (r) throw new Error(r);
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
        ground: g.world.terrainMesh.children.length > 1 && !!g.world.terrainMesh.children[0].geometry.attributes.splatA,
        grass: g.world.grassField.geometry.instanceCount * g.world.grassField.mesh.children.length,
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
        seen.push({ ratio: g.renderer.getPixelRatio(), detail: g.world.terrainMesh.children.every((c) => c.material === g.world.terrainMesh.userData.detailed), ao: !!g.postfx.ao });
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
    // Transitions : 2 s dans un autre lieu ne changent pas la chanson ; un moment (scène
    // tendre) la change vite, en fondu enchaîné (l'ancienne s'efface, elle ne se coupe pas).
    // Le lecteur est piloté ici 10 fois par seconde : le test ne dépend pas de la vitesse
    // d'affichage (très lente en rendu logiciel sur la CI).
    const t = await page.evaluate(async () => {
      const g = window.game;
      const m = g.music;
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
      const mood0 = m.mood;
      const orig = g.musicMood;
      const drive = async (ms, mood, moment, until = () => false) => {
        g.musicMood = () => ({ mood, moment });
        const t0 = performance.now();
        while (performance.now() - t0 < ms && !until()) {
          m.update(0.1, mood, moment);
          await sleep(100);
        }
      };
      const info = () => `lecteur ${g.audio.ctx?.state}, voulu ${m.want}, joué ${m.mood}, en fondu [${m.fading.map((d) => d.track.mood)}]`;
      // Chanson d'un moment (scène, écran titre) : la musique revient vite au lieu, c'est normal.
      if (m.moment) return { mood0, kept: true, now: null, fading: [mood0] };
      await drive(2000, mood0 === 'nature' ? 'leger' : 'nature', false);
      const back = orig.call(g);
      await drive(500, back.mood, back.moment);
      const kept = m.mood === mood0 && !m.fading.length;
      const moment = mood0 === 'tendre' ? 'magique' : 'tendre';
      await drive(10000, moment, true, () => m.mood !== mood0);
      const fading = m.fading.map((d) => d.track.mood);
      const state = info();
      g.musicMood = orig;
      return { mood0, kept, now: m.mood, fading, state };
    });
    if (!t.kept) throw new Error(`la musique change dès qu'on passe 2 s ailleurs (${t.mood0})`);
    if (t.now === t.mood0) throw new Error(`la musique ne suit pas une scène tendre (${t.state})`);
    if (!t.fading.includes(t.mood0)) throw new Error(`pas de fondu enchaîné (${t.mood0} → ${t.now} ; ${t.state})`);
  });
  await step('Se déplacer', async () => {
    await settle();
    const before = await page.evaluate(() => ({ x: window.game.player.pos.x, z: window.game.player.pos.z }));
    await page.keyboard.down('KeyW');
    await page.waitForFunction((b) => Math.hypot(window.game.player.pos.x - b.x, window.game.player.pos.z - b.z) > 0.5, before, { timeout: 120000 });
    await page.keyboard.up('KeyW');
  });
  await step('Commandes (touches maintenues, réglages, caméra qui suit, pavé tactile)', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const out = [];
      const key = (type, code, key = '', target = window) => target.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true }));
      // Avancer, puis une nouvelle correspondance des touches (première lettre apprise) :
      // la marche reste enfoncée, et se relâche normalement.
      key('keydown', 'KeyW', 'z');
      g.input.rebuild(true);
      key('keydown', 'KeyD', 'd');
      if (!g.input.keys.has('KeyW')) out.push('la marche saute quand une autre touche est apprise');
      key('keyup', 'KeyD', 'd');
      key('keyup', 'KeyW', 'z');
      if (g.input.keys.size) out.push(`touches restées enfoncées : ${[...g.input.keys]}`);
      // Un curseur des paramètres sélectionné ne bloque plus le jeu : Échap ferme la fenêtre.
      g.openPanel('settings');
      const range = document.querySelector('#settings input[type="range"]');
      range?.focus();
      key('keydown', 'Escape', 'Escape', range || window);
      key('keyup', 'Escape', 'Escape', range || window);
      if (g.panel === 'settings') out.push('Échap ne ferme pas les paramètres depuis un curseur');
      g.closePanels();
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.closest('#settings')) out.push('le focus reste dans les paramètres fermés');
      // Caméra qui suit : aller à droite fait tourner la vue ; reculer ne la fait pas tourner.
      const cam = g.cam;
      const p = g.player;
      const meadow = g.debugData().ZONES.find((z) => z.id === 'prairie');
      p.teleport(meadow.x, meadow.z, 0);
      const walk = (code, sec) => {
        g.input.keys.add(code);
        for (let i = 0; i < sec * 30; i++) {
          p.update(1 / 30, g.input, cam.yaw);
          cam.update(1 / 30, p, g.input, g.elapsed);
        }
        g.input.keys.delete(code);
        for (let i = 0; i < 20; i++) p.update(1 / 30, g.input, cam.yaw);
      };
      cam.autoFollow = 'normale';
      cam.manualT = 0;
      let y0 = cam.yaw;
      walk('KeyD', 1.5);
      const side = Math.abs(Math.atan2(Math.sin(cam.yaw - y0), Math.cos(cam.yaw - y0)));
      if (side < 0.4) out.push(`la caméra ne suit pas le personnage (${((side * 180) / Math.PI).toFixed(0)}°)`);
      y0 = cam.yaw;
      walk('KeyS', 1.5);
      const back = Math.abs(Math.atan2(Math.sin(cam.yaw - y0), Math.cos(cam.yaw - y0)));
      if (back > 0.2) out.push(`la caméra tourne en reculant (${((back * 180) / Math.PI).toFixed(0)}°)`);
      cam.autoFollow = g.settings.camAuto;
      // Pavé tactile : un balayage fait de petits défilements = un cran de zoom, pas vingt-cinq.
      const c = g.renderer.domElement;
      g.input.wheel = 0;
      for (let i = 0; i < 25; i++) c.dispatchEvent(new WheelEvent('wheel', { deltaY: 4, bubbles: true, cancelable: true }));
      const w = g.input.consumeWheel();
      if (Math.abs(w - 1) > 0.05) out.push(`zoom au pavé tactile : ${w.toFixed(2)} cran(s) au lieu de 1`);
      g.input.consumeDrag();
      return out.join(' ; ');
    });
    if (r) throw new Error(r);
  });
  await step('Petits défauts (halos ronds, étoiles filantes visibles)', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const out = [];
      if (!g.world.village.fountainDrops?.material.map) out.push('gouttes de la fontaine sans texture (carrés)');
      // Étoile filante hors de l'écran : pas d'invite ; devant la caméra : invite.
      g.wishT = 0;
      g.lastWishAt = -1e9;
      const cam = g.camera;
      cam.updateMatrixWorld();
      const fwd = cam.getWorldDirection(cam.position.clone()).setY(0).normalize();
      const behind = fwd.clone().negate().setY(0.6).normalize();
      g.onShootingStar({ a: behind, b: behind.clone().add(fwd.clone().multiplyScalar(0.01)).normalize() });
      if (g.wishT > 0) out.push('invite de vœu pour une étoile invisible');
      cam.updateMatrixWorld();
      const look = cam.getWorldDirection(cam.position.clone());
      g.onShootingStar({ a: look.clone(), b: look.clone() });
      if (!(g.wishT > 0)) out.push('pas d\'invite pour une étoile devant la caméra');
      g.wishT = 0;
      g.ui.wishPrompt?.(false);
      return out.join(' ; ');
    });
    if (r) throw new Error(r);
  });
  await step('Décor sans objets imbriqués (banc du marché, terrasse du café, tas de bois…)', async () => {
    const r = await page.evaluate(() => {
      // Obstacles du dehors (les pièces intérieures, très loin, ont des murs qui se touchent
      // exprès) ; un recouvrement de plus de 30 cm = un objet dans un autre.
      const all = new Set();
      for (const list of window.game.world.colliders.grid.values()) for (const c of list) if (c.x < 500) all.add(c);
      const cs = [...all];
      const poly = (c) => c.type === 'circle'
        ? Array.from({ length: 8 }, (_, i) => [c.x + Math.cos((i / 8) * Math.PI * 2) * c.r, c.z + Math.sin((i / 8) * Math.PI * 2) * c.r])
        : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [c.x + sx * c.hw * c.cos + sz * c.hd * c.sin, c.z - sx * c.hw * c.sin + sz * c.hd * c.cos]);
      const axes = (p) => p.map((a, i) => { const b = p[(i + 1) % p.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(a[1] - b[1]) / l, (b[0] - a[0]) / l]; });
      const depth = (A, B) => {
        let min = Infinity;
        for (const [ax, az] of [...axes(A), ...axes(B)]) {
          const pa = A.map((p) => p[0] * ax + p[1] * az);
          const pb = B.map((p) => p[0] * ax + p[1] * az);
          min = Math.min(min, Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb)));
          if (min <= 0) return 0;
        }
        return min;
      };
      const P = cs.map(poly);
      const out = [];
      for (let i = 0; i < cs.length; i++) {
        for (let j = i + 1; j < cs.length; j++) {
          if (Math.hypot(cs[i].x - cs[j].x, cs[i].z - cs[j].z) > 12) continue;
          const d = depth(P[i], P[j]);
          if (d > 0.3) out.push(`${d.toFixed(2)} m vers (${cs[i].x.toFixed(1)}, ${cs[i].z.toFixed(1)})`);
        }
      }
      return cs.length < 200 ? `trop peu d'obstacles (${cs.length})` : out.join(' ; ');
    });
    if (r) throw new Error(r);
  });
  await step('Dialogues (à faire en tête, partir avec ✕ ou en cliquant à côté)', async () => {
    const open = () => page.evaluate(async () => {
      const g = window.game;
      if (g.dialogue.open) g.dialogue.close();
      const v = g.villagers.get('pomme');
      g.player.teleport(v.pos.x + 1.4, v.pos.z + 1.4, 0);
      await new Promise((r) => setTimeout(r, 150));
      g.dialogue.start(v);
      g.dialogue.finishTyping();
      // Un point de la scène, hors de la fenêtre et des boutons.
      let pt = null;
      for (let y = 120; y < innerHeight - 40 && !pt; y += 40) for (let x = 60; x < innerWidth - 60 && !pt; x += 40) if (document.elementFromPoint(x, y)?.id === 'game') pt = [x, y];
      const cls = [...g.dialogue.el.querySelectorAll('.d-choice')].map((b) => b.className);
      const firstPlain = cls.findIndex((c) => !c.includes('todo'));
      return {
        pt,
        order: cls.slice(firstPlain).some((c) => c.includes('todo')) ? 'quêtes mêlées aux actions' : '',
        leave: cls.at(-1)?.includes('d-leave') ? '' : '« Au revoir » pas en dernier',
        close: g.dialogue.el.querySelector('.d-close') ? '' : 'pas de ✕',
      };
    });
    const isOpen = () => page.evaluate(() => window.game.dialogue.open);
    const r = await open();
    const out = [r.order, r.leave, r.close].filter(Boolean);
    if (!r.pt) out.push('aucun point de la scène libre pour cliquer');
    else {
      await page.waitForTimeout(400);
      await page.mouse.move(r.pt[0], r.pt[1]);
      await page.mouse.down();
      await page.mouse.move(r.pt[0] + 90, r.pt[1] + 20, { steps: 2 });
      await page.mouse.up();
      if (!(await isOpen())) out.push('glisser pour tourner la caméra ferme le dialogue');
      await page.mouse.click(r.pt[0], r.pt[1]);
      if (await isOpen()) out.push('un clic à côté ne ferme pas le dialogue');
      if (!(await page.evaluate(() => window.game.input.enabled))) out.push('commandes bloquées après le clic à côté');
      await open();
      await page.evaluate(() => document.querySelector('#dialogue .d-close').click());
      if (await isOpen()) out.push('le ✕ ne ferme pas le dialogue');
    }
    if (out.length) throw new Error(out.join(' ; '));
  });
  await step('Chats du café et pastèques (adoption, garde-robe, collection pastèque)', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const out = [];
      // Adoption chez Mimi : le choix est là, la fenêtre s'ouvre, le chat rejoint la famille.
      const mimi = g.villagers.get('mimi');
      g.dialogue.start(mimi);
      const choice = [...g.dialogue.el.querySelectorAll('.d-choice')].find((b) => /Adopter un chat/.test(b.textContent));
      if (!choice) out.push('pas de choix « Adopter un chat » chez Mimi');
      choice?.click();
      if (!g.adoption.isOpen) out.push('la fenêtre d\'adoption ne s\'ouvre pas');
      const before = g.animals.adoptable().length;
      if (before < 1) out.push('aucun chat à adopter au café');
      if (!document.querySelector('#adoption .adopt-pic')?.src.startsWith('data:image/png')) out.push('pas de portrait des chats');
      document.querySelector('#adoption .adopt-item .btn.primary')?.click();
      const cat = g.animals.companions().find((a) => a.cafeOrigin);
      if (!cat) out.push('le chat choisi n\'est pas adopté');
      if (g.animals.adoptable().length !== before - 1) out.push('le chat adopté est encore proposé');
      g.adoption.close();
      // Le lendemain, un nouveau pensionnaire arrive (et il est sauvegardé).
      const n = g.animals.onNewDay(g.world.sky.day + 1);
      if (n !== 1 || g.animals.adoptable().length !== before) out.push(`pas de nouveau pensionnaire (${n})`);
      const saved = JSON.parse(JSON.stringify(g.animals.serialize()));
      if (!saved.cafe?.arrivals?.length) out.push('nouveaux pensionnaires non sauvegardés');
      if (cat) {
        // Garde-robe : quatre pièces, posées sur le modèle, gardées dans la sauvegarde.
        const outfit = { tete: { id: 'pasteque' }, yeux: { id: 'rondes', color: '#2e2e3a' }, cou: { id: 'noeudpap', color: '#e5484d' }, corps: { id: 'pull', color: '#6fcf97' } };
        cat.setOutfit(outfit);
        if (cat.outfitMeshes.length !== 2) out.push(`tenue : ${cat.outfitMeshes.length} pièces 3D au lieu de 2`);
        const data = JSON.parse(JSON.stringify(cat.serialize()));
        cat.setOutfit({});
        cat.restore(data, g.animals.yard);
        if (Object.keys(cat.outfit).length !== 4) out.push('tenue perdue à la reprise');
        // Ancienne sauvegarde (un seul accessoire) reprise dans la garde-robe.
        cat.restore({ ...data, outfit: undefined, accessory: 'collier', accessoryColor: '#ffd84d' }, g.animals.yard);
        if (cat.outfit.cou?.id !== 'collier') out.push('ancien accessoire non repris');
        // Aperçu : l'animal pose devant la caméra, puis reprend sa vie.
        g.openPanel('pets');
        g.pets.dress(cat);
        if (g.cam.mode !== 'pet' || !cat.posing) out.push('pas de gros plan pour habiller');
        g.closePanels();
        if (g.cam.mode === 'pet' || cat.posing || !g.input.enabled) out.push('la garde-robe ne se referme pas proprement');
      }
      // Collection pastèque : meubles (toutes les couleurs de chair), papier peint, sol, potager, recettes.
      const ids = ['pouf-pasteque', 'canape-pasteque', 'tapis-pasteque', 'lampe-pasteque', 'table-pasteque', 'lit-pasteque', 'peluche-pasteque', 'horloge-pasteque', 'guirlande-pasteque', 'panier-pasteque', 'maison-chat-pasteque', 'parasol-pasteque', 'bouee-pasteque', 'pasteque-geante'];
      for (const id of ids) {
        for (const c of ['#ff5a6e', '#ffd166', '#ff9fb5']) {
          try {
            const o = g.house.buildObject(id, c);
            const pos = o.userData.body.geometry.attributes.position;
            if (!pos?.count || [...pos.array.slice(0, 300)].some((v) => !Number.isFinite(v))) out.push(`${id} vide ou abîmé`);
          } catch (e) { out.push(`${id} : ${e.message}`); }
        }
      }
      const tabs = g.shopTabs('menuiserie');
      const melonTab = tabs.find((t) => /Pastèque/.test(t.label));
      if (!melonTab || melonTab.items().length !== ids.length) out.push('rayon pastèque de Bruno incomplet');
      if (!tabs.find((t) => t.id === 'murs').items().some((x) => x.id === 'mur:pasteque')) out.push('pas de papier peint pastèque');
      if (!g.shopTabs('graines')[0].items().some((x) => x.id === 'sem-pasteque')) out.push('pas de semis de pastèque chez Mamie Rose');
      if (!g.shopTabs('cafe').find((t) => t.id === 'garde-robe')?.items().some((x) => x.id === 'pet:tete:pasteque')) out.push('pas de casque pastèque au café');
      if (!g.cooking.known.has('jus-pasteque')) out.push('recette du jus de pastèque inconnue');
      return out.join(' ; ');
    });
    if (r) throw new Error(r);
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
      // Lisière : deux sols mêlés, le principal gardant au moins la moitié.
      const gr = g.footsteps.readGround();
      if (gr.other && !(gr.mix > 0.2 && gr.mix <= 0.5 && gr.other !== gr.surface)) out.push(`mélange de sols incohérent : ${JSON.stringify(gr)}`);
      g.footsteps.play(1);
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
  await step('Fêtes des habitants (répliques avant / après, feu d\'artifice de tout l\'archipel, fête des neiges)', async () => {
    const r = await page.evaluate(() => {
      const g = window.game;
      const out = [];
      const sky = g.world.sky;
      const day0 = sky.day;
      const hour0 = sky.hour;
      const rose = g.villagers.get('rose');
      // Lendemain de la Fête de l'été, avec des fusées lancées : on en parle.
      g.festivals.summer = { day: 4, launched: 6 };
      sky.day = 5;
      let memo = false;
      for (let i = 0; i < 40 && !memo; i++) memo = /fusées/.test(rose.greeting());
      if (!memo) out.push('personne ne parle des fusées de la veille');
      // Feu d'artifice : les 16 habitants sur la plage.
      sky.day = 4;
      sky.hour = 21.5;
      g.calendar.onNewDay();
      g.festivals.update(0.05);
      if (g.festivals.gathered.size !== g.villagers.list.length) out.push(`public du feu d'artifice : ${g.festivals.gathered.size}/${g.villagers.list.length}`);
      // Fête des neiges (hiver, jour 1).
      sky.day = 10;
      sky.hour = 10.5;
      g.calendar.onNewDay();
      g.festivals.update(0.05);
      const sn = g.festivals.snow;
      if (g.calendar.festival?.id !== 'neige') out.push(`pas de fête des neiges (${g.calendar.festival?.id})`);
      if (sn.group.children.length < 8) out.push(`décor de la fête des neiges incomplet (${sn.group.children.length})`);
      if (!g.villagers.get('hugo').override?.snow) out.push('Hugo n\'est pas au jury');
      // Bonhomme : trois boules bien roulées, un style, et le jugement de Hugo.
      sn.startBuild();
      for (let i = 0; i < 3; i++) {
        const b = sn.building;
        b.wait = 0;
        b.x = b.zoneX + b.zone / 2;
        sn.rollPress();
      }
      sn.showDeco();
      sn.building.o = { nose: 'pomme-pin', hat: 'haut-de-forme', scarf: 'rouge' };
      sn.present();
      if (!sn.state.snowman?.rank) out.push('bonhomme non jugé');
      g.dialogue.close();
      // Bataille : quelques secondes, adversaires sortis, on lance.
      sn.startFight();
      const f = sn.fight;
      f.count = 0;
      for (const o of f.opp) {
        o.up = true;
        o.timer = 99;
        o.dy = 0;
      }
      const fire = { hit: (k) => k === 'KeyE' };
      // La visée suit la caméra (derrière la joueuse, tournée vers les murets).
      for (let i = 0; i < 160; i++) {
        g.villagers.update(0.05);
        sn.update(0.05);
        g.cam.update(0.05, g.player, g.input, g.elapsed);
        g.camera.updateMatrixWorld();
        sn.fightInput(fire);
      }
      if (!(f.my > 0)) out.push('aucune boule de neige ne touche');
      f.t = 0;
      sn.update(0.05);
      if (sn.fight || !sn.state.fight) out.push('la bataille ne se termine pas');
      g.dialogue.close();
      g.ui.setPrompt(null);
      sky.day = day0;
      sky.hour = hour0;
      g.calendar.onNewDay();
      g.lastDay = day0;
      g.festivals.update(0.05);
      return out.join(' ; ');
    });
    if (r) throw new Error(r);
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

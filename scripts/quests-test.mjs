// Test des quêtes : joue toute l'histoire (11 chapitres) avec les vraies actions du jeu
// (parler, planter, pêcher, cuisiner, acheter, décorer, adopter, scènes de nuit…), puis
// vérifie chaque quête des habitants (proposition, objectifs, remise, récompenses) et la
// cohérence des données (objets, meubles, recettes, habitants, lieux, prérequis).
//   npm run build && npm run test:quests
// QUESTS_URL=http://127.0.0.1:5173/ pour tester le serveur de développement.

import { preview } from 'vite';
import { chromium } from 'playwright';

const server = process.env.QUESTS_URL ? null : await preview({ preview: { port: 4174, host: '127.0.0.1', strictPort: false }, logLevel: 'warn' });
const url = process.env.QUESTS_URL || server.resolvedUrls.local[0];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.5 });
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/ERR_CERT|net::|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
});

const results = [];
const fail = (msg) => {
  results.push(`✘ ${msg}`);
  errors.push(msg);
};

// --- Démarrage : préréglage Basse (rendu rapide), nouvelle partie --------------------------

await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('doucebrise-settings', JSON.stringify({ preset: 'basse', graphics: {} }));
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.game && window.game.state === 'title', null, { timeout: 180000 });
await page.click('#btn-new');
await page.waitForSelector('#cr-name', { state: 'visible' });
await page.fill('#cr-name', 'Testeuse');
await page.click('#cr-done');
await page.waitForFunction(() => window.game.state === 'play', null, { timeout: 60000 });

// Outils dans la page : les mêmes fonctions que les touches du jeu.
await page.evaluate(() => {
  const g = window.game;
  const frames = async (n = 2) => {
    for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const QT = {
    frames,
    wait,
    /** Referme cartes de chapitre, dialogues et fenêtres. */
    async settle() {
      for (let i = 0; i < 40; i++) {
        document.querySelector('#chapter:not(.hidden) button')?.click();
        if (g.dialogue.villager) g.dialogue.close();
        if (g.panel) g.closePanels();
        if (g.shop?.isOpen) g.shop.close();
        if (!g.busy && !g.panel && !document.querySelector('#chapter:not(.hidden)')) return;
        await wait(250);
      }
    },
    near(x, z) {
      g.player.teleport(x, z, 0);
    },
    buttons() {
      return [...g.dialogue.el.querySelectorAll('.d-choice')];
    },
    async choose(re) {
      g.dialogue.finishTyping?.();
      const b = QT.buttons().find((x) => re.test(x.textContent) && !x.disabled);
      if (!b) throw new Error(`choix introuvable ${re} parmi : ${QT.buttons().map((x) => `${x.textContent}${x.disabled ? ' (grisé)' : ''}`).join(' | ')}`);
      b.click();
      await frames(1);
    },
    /** Attend la fin d'une scène (en cliquant son écran final) et la validation de la quête. */
    async ceremony(id, max = 600) {
      for (let i = 0; i < max && !g.quests.completed.includes(id); i++) {
        document.querySelector('#chapter:not(.hidden) button')?.click();
        await wait(100);
      }
    },
    /** Parle à un habitant (comme la touche E) ; passe une éventuelle scène d'amitié. */
    async talk(id) {
      await QT.settle();
      const v = g.villagers.get(id);
      if (!v) throw new Error(`habitant inconnu : ${id}`);
      g.player.teleport(v.pos.x + 1.2, v.pos.z + 1.2, 0);
      await frames(2);
      g.dialogue.start(v);
      await frames(1);
      if (g.dialogue.el.classList.contains('heart-scene')) await QT.choose(/💬/);
      return v;
    },
    /** Choix d'histoire, puis toutes les répliques jusqu'à « D'accord ». */
    async story(id, re) {
      await QT.talk(id);
      await QT.choose(re);
      for (let i = 0; i < 12; i++) {
        const b = QT.buttons().find((x) => /Suite|D'accord/.test(x.textContent));
        if (!b) break;
        const last = /D'accord/.test(b.textContent);
        b.click();
        await frames(1);
        if (last) break;
      }
      g.dialogue.close();
    },
    add(item, n = 1) {
      g.inventory[item] = (g.inventory[item] || 0) + n;
      g.ui.refreshInventory();
    },
    /** Ramasse des ressources (buissons, coquillages, cristaux…) comme la touche E. */
    async gather(item, times) {
      for (let i = 0; i < times; i++) {
        const n = item ? g.resources.closestOf(item) : g.resources.closestAvailable();
        if (!n) throw new Error(`plus de ressource disponible : ${item || 'n’importe laquelle'}`);
        g.player.teleport(n.x + 0.8, n.z + 0.8, 0);
        await frames(1);
        g.resources.harvest(n);
      }
    },
    /** Caresse n animaux différents (espèce facultative), comme la touche E. */
    async pet(n, species = null) {
      const list = g.animals.animals.filter((a) => !a.adopted && (!species || a.species === species) && !(a.sp.shy > 0.55 && a.trust < 15));
      if (list.length < n) throw new Error(`pas assez d'animaux à caresser (${species || 'tous'} : ${list.length})`);
      for (const a of list.slice(0, n)) {
        g.player.teleport(a.pos.x + 1, a.pos.z + 1, 0);
        await frames(1);
        a.petCooldown = 0;
        g.animals.pet(a);
      }
    },
    /** Pêche un poisson (lancer, touche, ferrage dans la zone verte), comme la touche E. */
    async fish(habitat = null) {
      await QT.settle();
      const spot = [...g.world.fishingSpots].find((s) => (habitat ? s.habitat === habitat : s.habitat !== 'falaise'));
      g.player.teleport(spot.x, spot.z, 0);
      await frames(2);
      for (let attempt = 0; attempt < 12; attempt++) {
        g.fishing.start(spot);
        g.fishing.t = 0;
        for (let i = 0; i < 200 && g.fishing.state === 'wait'; i++) await frames(1);
        if (g.fishing.state !== 'bite') throw new Error(`le poisson ne mord pas (état ${g.fishing.state})`);
        g.fishing.action();
        let caught = null;
        const off = g.on('catch', (d) => (caught = d));
        for (let i = 0; i < 20 && g.fishing.state === 'reel'; i++) {
          const r = g.fishing.reel;
          r.x = r.zoneX + r.zone / 2;
          g.fishing.action();
          await frames(1);
        }
        off?.();
        if (caught) return caught;
        await wait(200);
      }
      throw new Error('aucun poisson pêché en 12 essais (bouteilles, déchets…)');
    },
    /** Pose un meuble du stock (mode décoration), comme un clic. */
    async place(id, area = 'interior') {
      const h = g.house;
      const d = g.decor;
      d.area = area;
      d.take(id);
      const b = area === 'interior' ? { x0: -5, x1: 5, z0: -4, z1: 4 } : { x0: -6, x1: 6, z0: -6, z1: 6 };
      const base = area === 'interior' ? { x: 0, z: 0 } : { x: 0, z: 0 };
      for (let x = b.x0; x <= b.x1; x += 1) {
        for (let z = b.z0; z <= b.z1; z += 1) {
          if (h.canPlace(id, area, base.x + x, base.z + z, 0)) {
            Object.assign(d.holding, { x: base.x + x, z: base.z + z, rot: 0, valid: true });
            d.click();
            return;
          }
        }
      }
      d.cancel();
      throw new Error(`aucune place libre pour ${id} (${area})`);
    },
    /** Achète le meuble le moins cher posable dans la maison (menuiserie de Bruno). */
    async buyFurniture() {
      await QT.talk('bruno');
      await QT.choose(/Boutique/);
      await frames(1);
      const el = g.shop.el;
      const F = window.__FURNITURE;
      let best = null;
      for (const tab of [...el.querySelectorAll('#shop-tabs button')]) {
        tab.click();
        await frames(1);
        const t = g.shop.tabs.find((x) => x.id === g.shop.tab);
        for (const e of t.items ? t.items() : []) {
          const f = F[e.id];
          if (!f || f.wall || f.where === 'out' || e.locked) continue;
          if (!best || e.price < best.price) best = { ...e, tab: g.shop.tab };
        }
      }
      if (!best) throw new Error('aucun meuble d\'intérieur en vente');
      g.shop.tab = best.tab;
      g.shop.render();
      await frames(1);
      const card = [...el.querySelectorAll('.shop-item')].find((c) => c.querySelector('.si-name')?.textContent === best.label);
      const btn = card?.querySelector('button');
      if (!btn || btn.disabled) throw new Error(`impossible d'acheter ${best.label} (${best.price} 🪙, il y a ${g.coins} 🪙)`);
      btn.click();
      await frames(1);
      g.shop.close();
      return best.id;
    },
    /** Offre un objet à un habitant (menu « Offrir un cadeau »). */
    async gift(villager, item) {
      QT.add(item, 1);
      await QT.talk(villager);
      await QT.choose(/Offrir/);
      const label = window.__ITEMS[item].label;
      const b = [...g.dialogue.el.querySelectorAll('.d-item')].find((x) => x.title === label);
      if (!b) throw new Error(`${label} absent du menu des cadeaux`);
      b.click();
      await frames(1);
      g.dialogue.close();
    },
    /** Boutique d'un habitant : onglet puis bouton. */
    async shopClick(villager, tabRe, cardRe, btnRe = /Acheter/) {
      await QT.talk(villager);
      await QT.choose(/Boutique/);
      await frames(1);
      const el = g.shop.el;
      const tab = [...el.querySelectorAll('#shop-tabs button')].find((b) => tabRe.test(b.textContent));
      if (!tab) throw new Error(`onglet introuvable ${tabRe} : ${[...el.querySelectorAll('#shop-tabs button')].map((b) => b.textContent).join(' | ')}`);
      tab.click();
      await frames(1);
      const card = [...el.querySelectorAll('.shop-item')].find((c) => cardRe.test(c.textContent));
      if (!card) throw new Error(`article introuvable ${cardRe}`);
      const btn = [...card.querySelectorAll('button')].find((b) => btnRe.test(b.textContent));
      if (!btn || btn.disabled) throw new Error(`bouton indisponible ${btnRe} sur « ${card.textContent.trim().slice(0, 60)} » (pièces : ${g.coins})`);
      btn.click();
      await frames(1);
      g.shop.close();
    },
    async night(hour = 21) {
      g.world.sky.hour = hour;
      await frames(2);
    },
    zone(id) {
      const z = window.__ZONES.find((zz) => zz.id === id);
      return z;
    },
    async goZone(id) {
      const z = QT.zone(id);
      g.player.teleport(z.x, z.z, 0);
      await frames(3);
      await wait(300);
    },
  };
  window.QT = QT;
});
// Données du jeu (lieux, recettes, meubles…) exposées pour les tests.
await page.evaluate(() => {
  const d = window.game.debugData();
  Object.assign(window, { __ZONES: d.ZONES, __RECIPES: d.RECIPES, __LANDMARKS: d.LANDMARKS, __FURNITURE: d.FURNITURE, __ITEMS: d.ITEMS });
});

// --- Histoire : chaque quête, dans l'ordre -----------------------------------------------

const STEPS = {
  bienvenue: async () => QT.talk('rose'),
  maison: async () => {
    window.game.enterHouse();
    await QT.wait(600);
  },
  potager: async () => {
    const g = window.game;
    window.game.exitHouse();
    await QT.wait(600);
    const pl = g.garden.plots[0];
    g.player.teleport(pl.x + 0.5, pl.z + 0.5, 0);
    await QT.frames(1);
    g.garden.interact(pl);
    g.garden.interact(pl);
  },
  amis: async () => QT.pet(3),
  cafe: async () => QT.talk('mimi'),
  gourmand: async () => {
    const g = window.game;
    const a = g.animals.animals.find((x) => x.species === 'chat' && !x.adopted);
    g.player.teleport(a.pos.x + 1, a.pos.z + 1, 0);
    await QT.frames(1);
    g.animals.feed(a);
  },
  chats: async () => QT.pet(3, 'chat'),
  cueillette: async () => QT.gather(null, 5),
  marche: async () => {
    QT.add('baie', 2);
    await QT.shopClick('pomme', /Vendre/, /Baie/, /Vendre 1/);
  },
  filet: async () => QT.story('noe', /montrer/),
  insecte: async () => {
    const g = window.game;
    g.world.sky.hour = 11;
    g.world.weather.force('clair');
    for (let i = 0; i < 60; i++) {
      const b = g.insects.closest();
      if (b) {
        g.player.teleport(b.pos.x + 0.6, b.pos.z + 0.6, 0);
        await QT.frames(2);
        g.insects.catch(b);
        if (g.quests.completed.includes('insecte')) return;
      }
      await QT.goZone('prairie');
      await QT.wait(300);
    }
  },
  recolte: async () => {
    const g = window.game;
    // Les heures passent : la parcelle arrosée pousse (on avance le temps de jeu).
    const pl = g.garden.plots[0];
    g.garden.water(pl);
    pl.growth = 999;
    g.garden.refresh(pl);
    g.player.teleport(pl.x + 0.5, pl.z + 0.5, 0);
    await QT.frames(1);
    g.garden.interact(pl);
  },
  peche: async () => {
    await QT.fish();
    await QT.fish();
  },
  cuisine: async () => {
    const g = window.game;
    QT.add('baie', 3);
    g.enterHouse();
    await QT.wait(600);
    const r = [...g.cooking.known].map((id) => window.__RECIPES.find((x) => x.id === id)).find((x) => x && g.cooking.canCook(x));
    if (!r) throw new Error(`aucune recette faisable (connues : ${[...g.cooking.known].join(', ')})`);
    g.cooking.cook(r);
    g.exitHouse();
    await QT.wait(600);
  },
  phare: async () => QT.goZone('phare'),
  chezsoi: async () => {
    const g = window.game;
    const id = await QT.buyFurniture();
    g.enterHouse();
    await QT.wait(600);
    await QT.place(id);
  },
  facade: async () => window.game.decor.facadeChanged(),
  deco: async () => {
    const g = window.game;
    while (g.house.placed.length < 10) {
      if (g.coins < 400) g.addCoins(400);
      const id = await QT.buyFurniture();
      await QT.place(id);
    }
  },
  garage: async () => QT.talk('leo'),
  vehicule: async () => {
    const g = window.game;
    g.exitHouse();
    await QT.wait(600);
    await QT.shopClick('leo', /./, /Trottinette/);
    const id = Object.keys(g.vehicles.owned)[0];
    g.vehicles.mount(id);
    await QT.wait(800);
    g.vehicles.dismount(true);
  },
  boulot: async () => {
    const g = window.game;
    g.jobs.refresh();
    const o = g.jobs.offers.find((x) => x.type === 'courrier') || g.jobs.offers.find((x) => x.type === 'commande');
    if (!o) throw new Error(`pas de mission simple : ${g.jobs.offers.map((x) => x.type).join(', ')}`);
    g.jobs.accept(o);
    if (o.type === 'commande') QT.add(o.item, o.count);
    const who = o.type === 'courrier' ? o.to : o.from;
    await QT.talk(who);
    await QT.choose(/Donner la lettre|Livrer/);
    g.dialogue.close();
  },
  voisins: async () => {
    const g = window.game;
    g.quests.refreshRequests();
    const req = g.quests.requests.find((r) => !r.done);
    if (!req) throw new Error('aucune demande du jour');
    QT.add(req.item, req.count);
    await QT.talk(req.villager);
    await QT.choose(/Demande/);
    await QT.choose(/Donner/);
    g.dialogue.close();
    // Cadeau à un autre habitant.
    const other = g.villagers.list.find((v) => v.def.id !== req.villager && v.met && v.giftDay !== g.world.sky.day);
    await QT.gift(other.def.id, 'fleur');
  },
  adoption: async () => {
    const g = window.game;
    // La confiance monte sur plusieurs jours (caresses, plat préféré) : on la donne.
    const a = g.animals.animals.find((x) => x.species === 'chat' && !x.adopted);
    a.trust = 100;
    g.player.teleport(a.pos.x + 1, a.pos.z + 1, 0);
    await QT.frames(1);
    g.adoptDialog(a);
    await QT.wait(400);
    const input = document.querySelector('#dialog-input');
    if (!input || !input.offsetParent) throw new Error('la fenêtre pour nommer l\'animal ne s\'ouvre pas');
    input.value = 'Pistou';
    document.querySelector('#dialog-ok').click();
    await QT.wait(400);
    if (!a.adopted) throw new Error('l\'animal n\'est pas adopté après avoir choisi son nom');
  },
  amitie: async () => {
    const g = window.game;
    // L'amitié se construit sur plusieurs jours : deux habitants à 2 cœurs.
    for (const id of ['rose', 'pomme']) g.dialogue.addFriendship(g.villagers.get(id), 40);
  },
  confidence: async () => QT.talk('rose'),
  rassemblement: async () => QT.story('rose', /phare/),
  rallumer: async () => {
    const g = window.game;
    await QT.settle();
    await QT.night(20);
    const L = window.__LANDMARKS.lighthouse;
    g.player.teleport(L.x - 3, L.z + 3, 0);
    await QT.ceremony('rallumer');
  },
  'pont-brumes': async () => QT.goZone('bourg'),
  gardien: async () => QT.story('aurele', /sapin/),
  'cristaux-sapin': async () => {
    await QT.gather('cristal', 3);
    await QT.story('aurele', /cristaux/);
  },
  'belvedere-nuit': async () => {
    const g = window.game;
    await QT.night(21);
    const t = g.world.islands.telescope;
    g.player.teleport(t.x + 1, t.z + 1, 0);
    await QT.frames(2);
    g.archipelago.stargaze();
    await QT.wait(6000);
  },
  veillee: async () => {
    const g = window.game;
    g.world.sky.hour = 11;
    for (const id of ['aurele', 'elise', 'hugo']) await QT.gift(id, 'fleur');
  },
  'sapin-rallume': async () => {
    const g = window.game;
    await QT.settle();
    await QT.night(20);
    const B = window.__LANDMARKS.bourg;
    g.player.teleport(B.x + 2, B.z + 2, 0);
    await QT.ceremony('sapin-rallume');
  },
  'pont-soleil': async () => {
    window.game.world.sky.hour = 11;
    await QT.goZone('port');
  },
  capitaine: async () => QT.story('neree', /baleine/),
  conque: async () => {
    await QT.gather('corail', 2);
    await QT.gather('etoile-mer', 2);
    await QT.story('coralie', /corail/);
  },
  'fete-paillote': async () => {
    await QT.goZone('lagon');
    window.game.emote('Digit2');
  },
  'souvenir-archipel': async () => {
    const g = window.game;
    await QT.goZone('belvedere');
    g.photo.enter();
    await QT.wait(300);
    g.photo.shoot();
    await QT.wait(500);
    g.photo.exit();
  },
  'chant-baleine': async () => {
    const g = window.game;
    await QT.settle();
    await QT.night(21);
    const s = g.world.fishingSpots.find((f) => f.habitat === 'lagon');
    g.player.teleport(s.x, s.z, 0);
    await QT.ceremony('chant-baleine');
  },
  citrouille: async () => {
    const g = window.game;
    g.world.sky.hour = 11;
    QT.add('sem-citrouille', 1);
    const pl = g.garden.plots.find((p) => !p.crop);
    g.player.teleport(pl.x + 0.5, pl.z + 0.5, 0);
    await QT.frames(1);
    while (g.garden.currentSeed() !== 'sem-citrouille') g.garden.cycleSeed();
    g.garden.interact(pl);
    g.garden.water(pl);
    pl.growth = 999;
    g.garden.refresh(pl);
    g.garden.interact(pl);
  },
  agrandir: async () => {
    const g = window.game;
    g.addCoins(20000);
    await QT.shopClick('bruno', /Travaux/, /./, /Acheter|Agrandir/);
  },
  carnet: async () => {
    const g = window.game;
    for (const a of g.animals.animals) {
      if (Object.values(g.animals.discovered).reduce((s, d) => s + d.variants.length, 0) >= 12) break;
      a.trust = Math.max(a.trust, 20);
      g.player.teleport(a.pos.x + 1, a.pos.z + 1, 0);
      await QT.frames(1);
      a.petCooldown = 0;
      g.animals.pet(a);
    }
  },
  collection: async () => {
    const g = window.game;
    // Insectes de jour, de nuit, sous la pluie : on parcourt les heures et les lieux. Les
    // insectes sont appelés tout de suite : leur apparition au fil du temps suit la vitesse
    // d'affichage, très lente sur les machines de test sans carte graphique.
    const plan = [[11, 'clair'], [22, 'clair'], [14, 'pluie'], [10, 'clair'], [23, 'clair'], [15, 'pluie']];
    const zones = ['prairie', 'verger', 'foret', 'village', 'colline', 'pinede', 'bourg', 'palmeraie', 'lagon', 'port', 'etang', 'lac'];
    for (const [hour, weather] of [...plan, ...plan]) {
      g.world.sky.hour = hour;
      g.world.weather.force(weather);
      for (const z of zones) {
        if (Object.keys(g.insects.caught).length >= 6) return;
        await QT.goZone(z);
        for (let i = g.insects.active.length; i < 7; i++) g.insects.spawn();
        await QT.frames(2);
        for (let k = 0; k < 6; k++) {
          // Une espèce pas encore attrapée, en attendant la fin du coup de filet précédent.
          const b = g.insects.active.find((x) => !g.insects.caught[x.def.id] && x.flee <= 0);
          if (!b) break;
          g.player.teleport(b.pos.x + 0.5, b.pos.z + 0.5, 0);
          await QT.frames(2);
          g.insects.catch(b);
          await QT.wait(550);
        }
      }
    }
  },
  famille: async () => {
    const g = window.game;
    const a = g.animals.animals.find((x) => !x.adopted && x.species === 'chien') || g.animals.animals.find((x) => !x.adopted);
    a.trust = 100;
    g.animals.adopt(a, 'Biscotte');
  },
  coeur: async () => {
    const g = window.game;
    g.dialogue.addFriendship(g.villagers.get('rose'), 80);
  },
};

const storyIds = await page.evaluate(() => window.game.debugData().STORY.map((q) => q.id));
for (const id of storyIds) {
  const t0 = Date.now();
  const cur = await page.evaluate(() => window.game.quests.current?.id);
  if (cur !== id) {
    fail(`Histoire : attendu « ${id} », quête en cours « ${cur} »`);
    break;
  }
  const step = STEPS[id];
  if (!step) {
    fail(`Histoire : pas d'étape de test pour « ${id} »`);
    break;
  }
  try {
    await page.evaluate(`(${step.toString()})()`);
    await page.waitForFunction((qid) => window.game.quests.completed.includes(qid), id, { timeout: 30000 });
    const coins = await page.evaluate(() => window.game.coins);
    results.push(`✔ ${id} (${((Date.now() - t0) / 1000).toFixed(1)} s, ${coins} 🪙)`);
  } catch (e) {
    const diag = await page.evaluate((qid) => {
      const g = window.game;
      const q = g.quests.current;
      if (!q) return '';
      return `${q.id} : ${q.goals.map((goal, i) => `${goal.label} ${g.quests.goalProgress(q, i)}/${goal.count}`).join(' · ')}`;
    }, id).catch(() => '');
    fail(`Histoire « ${id} » : ${e.message.split('\n')[0]} — ${diag}`);
    break;
  }
  await page.evaluate(() => window.QT.settle());
}

// --- Cohérence des données : objets, meubles, recettes, habitants, lieux ------------------

const dataIssues = await page.evaluate(() => {
  const g = window.game;
  const d = g.debugData();
  const issues = [];
  const villager = (id) => !!g.villagers.get(id);
  const zone = (id) => d.ZONES.some((z) => z.id === id);
  const checkReward = (where, r = {}) => {
    for (const id of Object.keys(r.items || {})) if (!d.ITEMS[id]) issues.push(`${where} : objet inconnu « ${id} »`);
    for (const id of Object.keys(r.furniture || {})) if (!d.FURNITURE[id]) issues.push(`${where} : meuble inconnu « ${id} »`);
    if (r.recipe && !d.RECIPES.some((x) => x.id === r.recipe)) issues.push(`${where} : recette inconnue « ${r.recipe} »`);
    for (const id of Object.keys(r.friends || {})) if (!villager(id)) issues.push(`${where} : habitant inconnu « ${id} »`);
  };
  for (const q of d.STORY) {
    if (q.giver && !villager(q.giver)) issues.push(`Histoire ${q.id} : habitant inconnu « ${q.giver} »`);
    if (!d.CHAPTERS.some((c) => c.id === q.chapter)) issues.push(`Histoire ${q.id} : chapitre inconnu`);
    checkReward(`Histoire ${q.id}`, q.reward);
    if (q.story) {
      if (!villager(q.story.villager)) issues.push(`Histoire ${q.id} : habitant inconnu « ${q.story.villager} »`);
      for (const id of Object.keys(q.story.take || {})) if (!d.ITEMS[id]) issues.push(`Histoire ${q.id} : objet inconnu « ${id} »`);
      checkReward(`Histoire ${q.id} (scène)`, q.story.reward);
    }
  }
  const ids = new Set(d.SIDE_QUESTS.map((q) => q.id));
  for (const q of d.SIDE_QUESTS) {
    const w = `Quête ${q.id}`;
    if (!villager(q.giver)) issues.push(`${w} : habitant inconnu « ${q.giver} »`);
    if (q.turnIn && !villager(q.turnIn)) issues.push(`${w} : destinataire inconnu « ${q.turnIn} »`);
    if (q.req?.after && !ids.has(q.req.after)) issues.push(`${w} : prérequis inconnu « ${q.req.after} »`);
    for (const id of Object.keys(q.accept?.items || {})) if (!d.ITEMS[id]) issues.push(`${w} : objet confié inconnu « ${id} »`);
    for (const id of Object.keys(q.take || {})) if (!d.ITEMS[id]) issues.push(`${w} : objet repris inconnu « ${id} »`);
    for (const goal of q.goals) {
      if (goal.type === 'have' && !d.ITEMS[goal.item]) issues.push(`${w} : objet demandé inconnu « ${goal.item} »`);
      if (goal.talk && !villager(goal.talk)) issues.push(`${w} : habitant à qui parler inconnu « ${goal.talk} »`);
    }
    checkReward(w, q.reward);
    if (!q.offer?.length || !q.desc || !q.thanks) issues.push(`${w} : texte manquant (proposition, description ou remerciements)`);
  }
  void zone;
  return issues;
});
for (const i of dataIssues) fail(`Données : ${i}`);
if (!dataIssues.length) results.push('✔ Données des quêtes cohérentes');

// --- Quêtes des habitants : proposer, accepter, remplir, rendre --------------------------

const sideReport = await page.evaluate(async () => {
  const g = window.game;
  const QT = window.QT;
  const d = g.debugData();
  const sq = g.sideQuests;
  const out = [];
  // Événements possibles, avec des données identiques à celles du jeu.
  const candidates = {
    catch: () => d.FISH.flatMap((f) => d.fishWhere(f).map((spot) => ({ fish: f.id, size: f.size[0], rarity: f.rarity, spot }))),
    insect: () => d.INSECTS.map((b) => ({ id: b.id, rarity: b.rarity })),
    pet: () => [...new Set(g.animals.animals.map((a) => a.species))].map((sp) => ({ animal: g.animals.animals.find((a) => a.species === sp) })),
    cook: () => d.RECIPES.map((r) => ({ id: r.id })),
    gather: () => Object.keys(d.ITEMS).map((item) => ({ item, count: 1 })),
    ride: () => Object.keys(d.VEHICLES).map((id) => ({ id })),
    travel: () => ['main', 'pins', 'corail'].map((to) => ({ to })),
    bathe: () => [{}],
    stargaze: () => [{}],
    wish: () => [{}],
  };
  const seasonDay = (season) => 1 + season * 3;
  for (let round = 0; round < 8 && sq.done.size < d.SIDE_QUESTS.length; round++) {
    for (const q of d.SIDE_QUESTS) {
      if (sq.done.has(q.id)) continue;
      const r = q.req || {};
      if (r.after && !sq.done.has(r.after)) continue;
      const giver = g.villagers.get(q.giver);
      if (r.f && giver.friendship < r.f) g.dialogue.addFriendship(giver, r.f - giver.friendship);
      if (r.seasons && !r.seasons.includes(g.world.weather.seasonIndex)) g.world.sky.day = seasonDay(r.seasons[0]) + Math.floor((g.world.sky.day - 1) / 12) * 12;
      g.world.sky.hour = 11;
      try {
        if (!sq.isAvailable(q)) throw new Error('non proposée alors que les conditions sont remplies');
        // Proposition et acceptation, dans le dialogue.
        await QT.talk(q.giver);
        await QT.choose(new RegExp(`❗ ${q.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        for (let i = 0; i < 10; i++) {
          const b = QT.buttons().find((x) => /Suite|J'accepte/.test(x.textContent));
          if (!b) break;
          const last = /J'accepte/.test(b.textContent);
          b.click();
          await QT.frames(1);
          if (last) break;
        }
        g.dialogue.close();
        if (!sq.active[q.id]) throw new Error('acceptation sans effet');
        // Objectifs.
        for (const goal of q.goals) {
          if (goal.talk) continue;
          if (goal.type === 'have') QT.add(goal.item, goal.count);
          else if (goal.type === 'state') {
            if (q.id === 'bruno-deco') {
              while (g.house.placed.length < goal.count) {
                if (g.coins < 400) g.addCoins(400);
                const id = await QT.buyFurniture();
                g.enterHouse();
                await QT.wait(500);
                await QT.place(id);
              }
              g.exitHouse();
              await QT.wait(500);
            } else if (q.id === 'coralie-especes') {
              for (let k = 0; k < 80 && sq.goalValue(q, q.goals.indexOf(goal)) < goal.count; k++) await QT.fish('lagon');
            }
          } else if (goal.event === 'zone') {
            const z = d.ZONES.find((zz) => goal.filter({ zone: zz.id }, g));
            if (!z) throw new Error(`aucun lieu ne remplit l'objectif « ${goal.label} »`);
            await QT.goZone('village');
            await QT.goZone(z.id);
          } else if (goal.event === 'emote' || goal.event === 'photo') {
            const z = d.ZONES.find((zz) => {
              g.zone = zz;
              return ['wave', 'dance', 'clap', 'kiss'].some((name) => goal.filter({ name, zone: zz.id }, g));
            });
            if (!z) throw new Error(`aucun lieu ne remplit l'objectif « ${goal.label} »`);
            await QT.goZone(z.id);
            if (goal.event === 'photo') {
              g.photo.enter();
              await QT.wait(300);
              g.photo.shoot();
              await QT.wait(400);
              g.photo.exit();
            } else {
              const code = { wave: 'Digit1', dance: 'Digit2', kiss: 'Digit4', clap: 'Digit5' };
              const name = ['wave', 'dance', 'clap', 'kiss'].find((n) => goal.filter({ name: n, zone: z.id }, g));
              g.emote(code[name]);
            }
          } else if (goal.event === 'pet') {
            const c = candidates.pet().find((x) => !goal.filter || goal.filter(x, g));
            if (!c) throw new Error(`aucun animal ne remplit l'objectif « ${goal.label} »`);
            const list = g.animals.animals.filter((a) => a.species === c.animal.species);
            for (let k = 0; k < goal.count; k++) {
              const a = list[k % list.length];
              a.trust = Math.max(a.trust, 20);
              g.player.teleport(a.pos.x + 1, a.pos.z + 1, 0);
              await QT.frames(1);
              a.petCooldown = 0;
              g.animals.pet(a);
            }
          } else if (goal.event === 'sell') {
            QT.add('baie', 1);
            g.emit('sell', { id: 'baie', count: 1, total: goal.count });
          } else {
            const list = candidates[goal.event]?.() || [];
            const c = list.find((x) => !goal.filter || goal.filter(x, g));
            if (!c) throw new Error(`objectif impossible « ${goal.label} » (${goal.event})`);
            for (let k = 0; k < goal.count; k++) g.emit(goal.event, c);
          }
        }
        if (!sq.isReady(q)) throw new Error(`objectifs remplis mais quête pas prête : ${sq.progressText(q)}`);
        // Remise.
        const coins = g.coins;
        await QT.talk(sq.turnInOf(q));
        await QT.choose(/✅/);
        g.dialogue.close();
        await QT.wait(400);
        if (!sq.done.has(q.id)) throw new Error('remise sans effet');
        if (q.reward.coins && g.coins < coins + q.reward.coins) throw new Error(`récompense non versée (${g.coins - coins}/${q.reward.coins} 🪙)`);
        out.push(`✔ ${q.id}`);
      } catch (e) {
        out.push(`✘ ${q.id} : ${e.message}`);
        sq.done.add(q.id);
        delete sq.active[q.id];
      }
      await QT.settle();
    }
  }
  for (const q of d.SIDE_QUESTS) if (!out.some((l) => l.includes(` ${q.id}`))) out.push(`✘ ${q.id} : jamais proposée (prérequis non atteignable ?)`);
  return out;
});
for (const line of sideReport) {
  if (line.startsWith('✘')) fail(`Quête des habitants ${line.slice(2)}`);
  else results.push(line);
}

// --- Petits boulots : les six types, de l'acceptation à la paie ---------------------------

const jobsReport = await page.evaluate(async () => {
  const g = window.game;
  const QT = window.QT;
  const out = [];
  const types = ['livraison', 'courrier', 'promenade', 'chat', 'plage', 'commande'];
  for (const type of types) {
    try {
      let o = null;
      for (let day = g.world.sky.day; day < g.world.sky.day + 30 && !o; day++) {
        g.jobs.offerDay = 0;
        const keep = g.world.sky.day;
        g.world.sky.day = day;
        g.jobs.refresh();
        g.world.sky.day = keep;
        o = g.jobs.offers.find((x) => x.type === type);
      }
      if (!o) throw new Error('jamais proposé');
      await QT.settle();
      g.world.sky.hour = 11;
      const before = g.jobs.done;
      g.jobs.accept(o);
      const a = g.jobs.active;
      if (!a) throw new Error('acceptation sans effet');
      if (type === 'livraison') {
        const v = g.villagers.get(a.to);
        const dd = g.world.village.doorFront(v.def.house, 1.0);
        g.player.teleport(dd.x, dd.z, 0);
        await QT.frames(4);
      } else if (type === 'courrier') {
        await QT.talk(a.to);
        await QT.choose(/Donner la lettre/);
      } else if (type === 'promenade') {
        for (const sp of a.spots) {
          g.player.teleport(sp.x, sp.z, 0);
          await QT.frames(4);
        }
        await QT.talk(a.from);
        await QT.choose(/Rendre/);
      } else if (type === 'chat') {
        const pet = g.jobs.pet;
        g.player.teleport(pet.pos.x + 1, pet.pos.z + 1, 0);
        await QT.frames(2);
        const act = g.jobs.interaction();
        if (!act) throw new Error('le chat perdu ne réagit pas');
        act.act();
        await QT.talk('mimi');
        await QT.choose(/Ramener/);
      } else if (type === 'plage') {
        for (const l of a.litter) {
          g.player.teleport(l.x + 0.3, l.z + 0.3, 0);
          await QT.frames(2);
          g.jobs.interaction()?.act();
        }
      } else if (type === 'commande') {
        QT.add(a.item, a.count);
        await QT.talk(a.from);
        await QT.choose(/Livrer/);
      }
      g.dialogue.close();
      await QT.wait(300);
      if (g.jobs.done !== before + 1 || g.jobs.active) throw new Error(`mission non terminée (${g.jobs.progressText()})`);
      out.push(`✔ Petit boulot : ${type}`);
    } catch (e) {
      out.push(`✘ Petit boulot ${type} : ${e.message}`);
      if (g.jobs.active) g.jobs.cancel();
    }
  }
  return out;
});
for (const line of jobsReport) {
  if (line.startsWith('✘')) fail(line.slice(2));
  else results.push(line);
}

// --- Deux semaines de jeu : demandes, défis et boulots variés -----------------------------

const variety = await page.evaluate(() => {
  const g = window.game;
  const issues = [];
  let prev = null;
  const start = g.world.sky.day + 1;
  for (let day = start; day < start + 14; day++) {
    g.world.sky.day = day;
    g.quests.refreshRequests();
    g.progress.refreshDaily();
    g.jobs.refresh();
    const cur = {
      req: g.quests.requests.map((r) => r.villager),
      items: g.quests.requests.map((r) => r.item),
      ch: g.progress.daily.list.map((c) => c.id),
      jobs: g.jobs.offers.map((o) => o.type),
    };
    if (new Set(cur.items).size !== cur.items.length) issues.push(`jour ${day} : deux demandes du même objet`);
    if (cur.req.length < 3) issues.push(`jour ${day} : seulement ${cur.req.length} demandes`);
    if (prev) {
      if (cur.req.some((v) => prev.req.includes(v))) issues.push(`jour ${day} : un habitant redemande comme la veille`);
      if (cur.items.some((i) => prev.items.includes(i))) issues.push(`jour ${day} : même objet demandé que la veille`);
      if (cur.ch.some((c) => prev.ch.includes(c))) issues.push(`jour ${day} : défi identique à la veille`);
      if (cur.jobs.filter((t) => !prev.jobs.includes(t)).length < 2) issues.push(`jour ${day} : petits boulots presque identiques à la veille`);
    }
    for (const r of g.quests.requests) if (!window.__ITEMS[r.item]) issues.push(`jour ${day} : objet inconnu ${r.item}`);
    prev = cur;
  }
  return issues;
});
for (const i of variety) fail(`Variété : ${i}`);
if (!variety.length) results.push('✔ Deux semaines de demandes, défis et petits boulots, sans répétition d\'un jour à l\'autre');

// --- Sauvegarde et reprise : toute la progression est gardée ---------------------------

const before = await page.evaluate(() => {
  const g = window.game;
  g.saveNow();
  return { story: g.quests.completed.length, side: g.sideQuests.done.size, jobs: g.jobs.done, coins: g.coins, pets: g.animals.companions().length };
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.game && window.game.state === 'title', null, { timeout: 180000 });
await page.click('#btn-continue');
await page.waitForFunction(() => window.game.state === 'play', null, { timeout: 60000 });
const after = await page.evaluate(() => {
  const g = window.game;
  return { story: g.quests.completed.length, side: g.sideQuests.done.size, jobs: g.jobs.done, coins: g.coins, pets: g.animals.companions().length };
});
if (JSON.stringify(before) !== JSON.stringify(after)) fail(`Sauvegarde : avant ${JSON.stringify(before)}, après ${JSON.stringify(after)}`);
else results.push(`✔ Sauvegarde et reprise (${after.story} quêtes d'histoire, ${after.side} quêtes d'habitants, ${after.pets} compagnons)`);

console.log(results.join('\n'));
if (errors.length) console.error(`\n${errors.length} erreur(s) :\n${errors.join('\n')}`);
else console.log('\nToutes les quêtes fonctionnent.');
await browser.close();
await server?.close();
process.exit(errors.length ? 1 : 0);

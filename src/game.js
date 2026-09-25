import * as THREE from 'three';
import { World } from './world/world.js';
import { zoneAt, LANDMARKS } from './world/layout.js';
import { Character } from './player/character.js';
import { Player } from './player/player.js';
import { FollowCamera } from './player/camera.js';
import { DEFAULT_APPEARANCE, normalizeAppearance, randomAppearance, isLocked, shopClothes, OPTIONS } from './player/appearance.js';
import { AnimalManager } from './animals/manager.js';
import { VillagerManager } from './npc/villagers.js';
import { ITEMS, createInventory } from './game/items.js';
import { Fishing } from './game/fish.js';
import { Insects } from './game/insects.js';
import { Resources } from './game/activities.js';
import { Progress } from './game/progress.js';
import { Vehicles, VEHICLES } from './game/vehicles.js';
import { Jobs } from './game/jobs.js';
import { Calendar } from './game/calendar.js';
import { Garden } from './game/garden.js';
import { Quests } from './game/quests.js';
import { Cooking } from './game/cooking.js';
import { House } from './house/house.js';
import { DecorMode } from './house/decor.js';
import { FURNITURE, SHOP_FURNITURE, WALLPAPERS, FLOORS, FURNITURE_CATS } from './house/furniture.js';
import { HOME_SIZES, ROOF_STYLES, FACADES, HOME_EXTRAS } from './world/home.js';
import { Input } from './core/input.js';
import { Particles } from './core/particles.js';
import { Audio } from './core/audio.js';
import { loadSave, writeSave, clearSave } from './core/save.js';
import { UI } from './ui/ui.js';
import { Creator } from './ui/creator.js';
import { PetsPanel } from './ui/pets.js';
import { Dialogue } from './ui/dialogue.js';
import { Shop } from './ui/shop.js';
import { Journal } from './ui/journal.js';
import { PhotoMode } from './ui/photo.js';
import { BagPanel, SettingsPanel, QUALITY, DAY_SPEEDS } from './ui/panels.js';
import { Guide } from './ui/guide.js';

const PET_NAMES = ['Moka', 'Caramel', 'Noisette', 'Biscuit', 'Plume', 'Pépite', 'Brioche', 'Praline', 'Nougat', 'Mochi', 'Tofu', 'Pistache', 'Câlin', 'Filou', 'Guimauve', 'Cannelle', 'Pompon', 'Réglisse', 'Sésame', 'Myrtille'];
const EMOTES = { Digit1: ['wave', 1.6], Digit2: ['dance', 5], Digit3: ['sit', 0], Digit4: ['kiss', 1.6], Digit5: ['clap', 1.8] };
const TOOLS = { 'tool:filet': '🥅 Filet à papillons', 'tool:plumeau': '🪶 Plumeau' };
const UPGRADE_PRICES = [0, 4000, 10000];
const PANELS = ['#creator', '#pets', '#map', '#help', '#journal', '#bag', '#settings'];

// Chef d'orchestre : rendu, boucle, états (titre / création / jeu), interactions, sauvegarde.

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = {};
    this.save = loadSave();
    this.settings = { quality: 'haute', daySpeed: 'normale', volume: 0.5, ...(this.save?.settings || {}) };
    if (!this.save?.settings && (window.innerWidth < 720 || /Mobi|Android/i.test(navigator.userAgent))) this.settings.quality = 'moyenne';

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 900);

    this.input = new Input(canvas);
    this.audio = new Audio();
    this.world = new World(this.scene);
    this.particles = new Particles(this.scene);

    const appearance = this.save ? normalizeAppearance(this.save.appearance) : { ...DEFAULT_APPEARANCE };
    this.character = new Character(appearance);
    this.scene.add(this.character.root);
    this.player = new Player(this.world, this.character);
    this.animals = new AnimalManager(this);
    this.scene.add(this.animals.group);
    this.villagers = new VillagerManager(this);
    this.player.obstacles = () => this.villagers.obstacles();

    this.inventory = createInventory();
    this.coins = 0;
    this.unlocks = new Set();
    this.knownLoves = new Set();
    this.progress = new Progress(this);
    this.resources = new Resources(this);
    this.fishing = new Fishing(this);
    this.insects = new Insects(this);
    this.vehicles = new Vehicles(this);
    this.jobs = new Jobs(this);
    this.calendar = new Calendar(this);
    this.garden = new Garden(this);
    this.house = new House(this);
    this.cooking = new Cooking(this);
    this.quests = new Quests(this);
    this.cam = new FollowCamera(this.camera, this.world);

    this.ui = new UI(this);
    this.creator = new Creator(this);
    this.pets = new PetsPanel(this);
    this.dialogue = new Dialogue(this);
    this.shop = new Shop(this);
    this.journal = new Journal(this);
    this.decor = new DecorMode(this);
    this.photo = new PhotoMode(this);
    this.bag = new BagPanel(this);
    this.settingsPanel = new SettingsPanel(this);
    this.guide = new Guide(this);

    this.state = 'title';
    this.panel = null;
    this.elapsed = 0;
    this.saveT = 0;
    this.dirty = false;
    this.zone = null;
    this.sitting = null;
    this.on('gift', (d) => {
      if (d.reaction === 'love') this.knownLoves.add(`${d.villager.def.id}:${d.item}`);
    });
    this.on('catch', (d) => this.calendar.onCatch(d));
    this.on('buy', (d) => {
      if (d.shop === 'garage') setTimeout(() => this.ui.toast('🚲 Appuie sur V pour appeler ton véhicule !', 3500), 700);
    });

    if (this.save) this.restore(this.save);
    else this.house.restore(null);
    this.world.village.setPlayerName(this.character.appearance.name);
    this.applySettings();
    this.cam.setMode('title');
    this.cam.snap = true;

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('beforeunload', () => {
      if (this.state !== 'title') this.saveNow();
    });
    document.querySelector('#btn-new').addEventListener('click', () => this.newGame());
    document.querySelector('#btn-continue').addEventListener('click', () => this.continueGame());

    this.timer = new THREE.Timer();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    this.ui.hideLoading();
    this.ui.showTitle(!!this.save);
    let fresh = null;
    try {
      fresh = sessionStorage.getItem('doucebrise-new');
      sessionStorage.removeItem('doucebrise-new');
    } catch {
      fresh = null;
    }
    if (fresh && !this.save) setTimeout(() => this.newGame(), 50);
  }

  // --- Événements --------------------------------------------------------------

  on(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }

  emit(type, data) {
    for (const fn of this.listeners[type] || []) fn(data);
  }

  // --- Réglages ------------------------------------------------------------------

  applySettings() {
    const q = QUALITY[this.settings.quality] || QUALITY.haute;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.ratio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const sun = this.world.sky.sun;
    if (sun.castShadow !== q.shadows || (q.shadows && sun.shadow.mapSize.x !== q.shadowSize)) {
      sun.castShadow = q.shadows;
      if (q.shadows) {
        sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
    }
    this.grassRadius = q.grass;
    this.world.sky.speed = (DAY_SPEEDS[this.settings.daySpeed] || DAY_SPEEDS.normale).k;
    this.audio.setVolume(this.settings.volume);
    this.requestSave();
  }

  // --- États -------------------------------------------------------------------

  newGame() {
    // Une partie existe déjà : on repart vraiment de zéro (rechargement propre).
    if (this.save) {
      clearSave();
      try {
        sessionStorage.setItem('doucebrise-new', this.character.appearance.name || '1');
      } catch {
        /* stockage indisponible */
      }
      window.location.reload();
      return;
    }
    this.audio.ensure();
    const a = { ...randomAppearance(), name: this.character.appearance.name || 'Lou' };
    this.setAppearance(a);
    this.inventory = createInventory();
    this.inventory.baie = 3;
    this.coins = 150;
    this.world.sky.hour = 8.5;
    this.world.sky.day = 1;
    // Départ : près de la fontaine, face à la maison de Mamie Rose (première quête).
    const rose = this.world.village.houses[2];
    this.player.teleport(1.5, 13, Math.atan2(rose.x - 1.5, rose.z - 13));
    this.calendar.mailDay = 1;
    this.calendar.addLetter({ from: 'rose', title: `Bienvenue, ${a.name} !`, text: 'Ma petite maison au toit vert est juste au sud de la fontaine. Viens me voir dès que tu es installé·e : j\'ai tant de choses à te montrer ! Tu verras, Doucebrise est une île pleine de douceur… même si son vieux phare a un peu perdu son éclat.', gift: { coins: 50 } });
    this.isNewGame = true;
    this.ui.hideTitle();
    this.openPanel('creator');
  }

  continueGame() {
    this.audio.ensure();
    this.ui.hideTitle();
    this.startPlaying();
  }

  startPlaying() {
    this.state = 'play';
    this.cam.setMode('follow');
    this.cam.yaw = this.player.rotY + Math.PI;
    this.ui.showHUD(true);
    this.quests.refreshRequests();
    this.progress.refreshDaily();
    this.jobs.refresh();
    this.calendar.onNewDay(false);
    this.lastDay = this.world.sky.day;
    this.ui.refreshAll();
    if (this.audio.musicOn) this.audio.startMusic();
    if (this.isNewGame) {
      this.isNewGame = false;
      this.ui.toast(`Bienvenue à Doucebrise, ${this.character.appearance.name} ! 🌸`, 4200);
      setTimeout(() => this.quests.showChapter(), 900);
      setTimeout(() => this.ui.toast('💡 Suis la flèche dorée ! Bouton 💡 (ou T) si tu ne sais pas quoi faire. H pour l\'aide.', 6500), 2500);
      this.quests.refreshRequests();
      this.requestSave();
    } else {
      setTimeout(() => this.quests.showChapter(), 900);
    }
  }

  resetGame() {
    clearSave();
    this.state = 'title';
    window.location.reload();
  }

  get busy() {
    return this.dialogue.open || this.shop.isOpen || this.cooking.isOpen || this.decor.active || this.photo.active || this.jobs.isOpen || this.vehicles.menuOpen || this.calendar.mailOpen || this.ui.chapterOpen || this.inFinale || !document.querySelector('#dialog').classList.contains('hidden');
  }

  openPanel(name) {
    if (this.state === 'title' && name !== 'creator') return;
    if (this.panel === name) {
      this.closePanels();
      return;
    }
    if (this.busy) return;
    this.closePanels(true);
    this.panel = name;
    this.ui.openPanel = name;
    if (this.fishing.active) this.fishing.stop();
    this.standUp();
    switch (name) {
      case 'creator':
        this.state = 'creator';
        this.creator.open(this.character.appearance, this.isNewGame);
        document.querySelector('#creator').classList.remove('hidden');
        this.ui.showHUD(false);
        this.cam.setMode('studio');
        this.cam.setShift(window.innerWidth > 720 ? 0.17 : 0);
        this.input.enabled = false;
        break;
      case 'pets':
        this.pets.render();
        document.querySelector('#pets').classList.remove('hidden');
        break;
      case 'map':
        document.querySelector('#map').classList.remove('hidden');
        this.ui.drawBigMap();
        break;
      case 'journal':
        this.journal.render();
        document.querySelector('#journal').classList.remove('hidden');
        break;
      case 'bag':
        this.bag.render();
        document.querySelector('#bag').classList.remove('hidden');
        break;
      case 'settings':
        this.settingsPanel.confirmReset = false;
        this.settingsPanel.render();
        document.querySelector('#settings').classList.remove('hidden');
        break;
      case 'help':
        document.querySelector('#help').classList.remove('hidden');
        break;
      default:
        break;
    }
  }

  closePanels(silent = false) {
    for (const id of PANELS) document.querySelector(id)?.classList.add('hidden');
    const was = this.panel;
    this.panel = null;
    this.ui.openPanel = null;
    if (was === 'creator') {
      this.input.enabled = true;
      this.cam.setShift(0);
      this.world.village.setPlayerName(this.character.appearance.name);
      this.requestSave();
      if (!silent) this.startPlaying();
      else this.state = 'play';
    }
  }

  setAppearance(a, rebuild = true) {
    if (rebuild) this.character.setAppearance(normalizeAppearance(a));
    else this.character.appearance = { ...this.character.appearance, name: a.name };
  }

  isLocked(key, id) {
    return isLocked(key, id, this.unlocks);
  }

  toggleMusic() {
    this.audio.ensure();
    const on = this.audio.toggleMusic();
    document.querySelector('#btn-music')?.classList.toggle('off', !on);
    this.ui.toast(on ? '🎵 Musique activée' : '🔇 Musique coupée', 1500);
    this.requestSave();
    return on;
  }

  onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (this.state === 'title') return;
    if (this.state === 'creator') {
      if (e.code === 'Escape') this.closePanels();
      return;
    }
    if (this.dialogue.open || this.shop.isOpen || this.cooking.isOpen || this.jobs.isOpen || this.vehicles.menuOpen || this.calendar.mailOpen || this.ui.chapterOpen || this.inFinale || !document.querySelector('#dialog').classList.contains('hidden')) return;
    if (this.decor.active) return;
    if (this.photo.active) {
      if (e.code === 'Escape' || e.code === 'KeyO') this.photo.exit();
      return;
    }
    switch (e.code) {
      case 'Escape':
        this.closePanels();
        break;
      case 'KeyC':
        this.openPanel('creator');
        break;
      case 'KeyP':
        this.openPanel('pets');
        break;
      case 'KeyM':
        this.openPanel('map');
        break;
      case 'KeyH':
        this.openPanel('help');
        break;
      case 'KeyJ':
        this.openPanel('journal');
        break;
      case 'KeyI':
        this.openPanel('bag');
        break;
      case 'KeyB':
        this.startDecor();
        break;
      case 'KeyO':
        this.startPhoto();
        break;
      case 'KeyV':
        if (!this.panel) this.vehicles.toggleMenu();
        break;
      case 'KeyT':
        this.showHint();
        break;
      default:
        if (EMOTES[e.code] && !this.panel) this.emote(e.code);
        break;
    }
  }

  showHint() {
    const q = this.quests.current;
    const job = this.jobs.active;
    this.ui.toast(`💡 ${this.quests.hint()}`, 7000);
    if (job) setTimeout(() => this.ui.toast(`📋 Petit boulot : ${this.jobs.progressText()}`, 4000), 400);
    else if (!q) this.ui.toast('📋 Envie d\'action ? Le tableau des petits boulots, sur la place, a toujours du travail !', 5000);
    this.guide.flash();
  }

  startPhoto() {
    if (this.state !== 'play' || this.busy) return;
    this.closePanels();
    this.standUp();
    this.photo.enter();
  }

  emote(code) {
    if (this.vehicles.riding) return;
    const [name, dur] = EMOTES[code];
    const c = this.character;
    if (name === 'sit') {
      if (this.sitting) this.standUp();
      else {
        this.sitting = { ground: true };
        this.player.frozen = true;
        this.player.seated = true;
        c.setSit(true, 0.12);
      }
      return;
    }
    c.play(name, dur);
    if (name === 'kiss') setTimeout(() => this.particles.emit('heart', this.player.pos.clone().setY(this.player.pos.y + 1.6), { count: 3 }), 400);
    if (name === 'dance') this.audio.play('pet');
    this.emit('emote', { name });
  }

  startDecor() {
    if (this.state !== 'play' || this.busy) return;
    if (this.vehicles.riding) {
      this.ui.toast('Descends de ton véhicule pour décorer (V).');
      return;
    }
    this.closePanels();
    this.standUp();
    if (this.decor.enter()) this.ui.showHUD(false);
  }

  onDecorClosed() {
    this.ui.showHUD(true);
  }

  // --- Économie & récompenses ----------------------------------------------------

  addCoins(n) {
    this.coins += n;
    this.ui.refreshCoins(n);
    this.requestSave();
  }

  /** Donne une récompense (quête, amitié). */
  grantReward(r, villager = null, title = null) {
    const parts = [];
    if (typeof r.furniture === 'string') r = { ...r, furniture: { [r.furniture]: 1 } };
    if (r.coins) {
      this.coins += r.coins;
      parts.push(`🪙 ${r.coins}`);
    }
    if (r.stars) {
      this.progress.addStars(r.stars);
      parts.push(`⭐ ${r.stars}`);
    }
    if (r.title && this.progress.addTitle(r.title)) parts.push(`🏷️ titre « ${r.title} »`);
    for (const [id, n] of Object.entries(r.items || {})) {
      this.inventory[id] = (this.inventory[id] || 0) + n;
      parts.push(`${ITEMS[id].emoji} ×${n}`);
    }
    for (const [id, n] of Object.entries(r.furniture || {})) {
      if (!FURNITURE[id]) continue;
      this.house.addToStorage(id, n);
      parts.push(`${FURNITURE[id].emoji} ${FURNITURE[id].label}`);
    }
    if (r.recipe && this.cooking.learn(r.recipe)) parts.push(`📖 recette : ${ITEMS[r.recipe].label}`);
    for (const u of [r.clothing, r.unlock].filter(Boolean)) {
      this.unlocks.add(u);
      const [key, id] = u.split(':');
      if (key === 'rod') {
        this.fishing.rod = id;
        parts.push('🎣 nouvelle canne à pêche');
        continue;
      }
      if (TOOLS[u]) {
        parts.push(TOOLS[u]);
        continue;
      }
      const opt = OPTIONS[key]?.find((o) => o.id === id);
      parts.push(`${opt?.icon || '👒'} ${opt ? opt.label : 'tenue spéciale'}`);
    }
    if (r.furniture) setTimeout(() => this.ui.toast('🛋️ Nouveau meuble rangé ! Chez toi, appuie sur B pour décorer.', 3500), 900);
    const who = villager ? `${villager.def.emoji} ${villager.def.name} t'offre : ` : '🎁 ';
    if (parts.length) this.ui.toast(title ? `${title} ${parts.join(' · ')}` : `${who}${parts.join(' · ')}`, 4500);
    if (villager) this.particles.emit('sparkle', villager.pos.clone().setY(villager.pos.y + 2), { count: 4 });
    this.ui.refreshAll();
    this.requestSave();
  }

  /** Onglets et articles de chaque boutique. */
  shopTabs(shopId) {
    const item = (id, price, extra = {}) => ({
      id, label: ITEMS[id].label, emoji: ITEMS[id].emoji, price, repeatable: true, desc: ITEMS[id].desc,
      buy: () => (this.inventory[id] = (this.inventory[id] || 0) + 1),
      ...extra,
    });
    const unlock = (key, label, emoji, price, desc) => ({
      id: key, label, emoji, price, desc, owned: this.unlocks.has(key),
      buy: () => this.unlocks.add(key),
    });
    const count = (id) => (this.house.storage[id] || 0) + this.house.placed.filter((p) => p.id === id).length;
    const furn = (filter) => () => SHOP_FURNITURE.filter(filter).map((f) => ({
      id: f.id, label: f.label, emoji: f.emoji, price: f.price, repeatable: true,
      desc: `${f.where === 'out' ? 'Jardin' : f.where === 'both' ? 'Maison ou jardin' : f.wall ? 'Au mur' : 'Maison'}${count(f.id) ? ` · tu en as ${count(f.id)}` : ''}`,
      buy: () => this.house.addToStorage(f.id),
    }));
    switch (shopId) {
      case 'graines':
        return [{ id: 'semis', label: '🌱 Semis', items: () => Object.keys(ITEMS).filter((id) => ITEMS[id].cat === 'seed').map((id) => item(id, ITEMS[id].buy, { desc: `Donne : ${ITEMS[ITEMS[id].crop].emoji} ${ITEMS[ITEMS[id].crop].label}` })) }];
      case 'marche':
        return [
          { id: 'vendre', label: '💰 Vendre' },
          { id: 'acheter', label: '🧺 Acheter', items: () => [item('friandise', 60), item('baie', 14), item('pomme', 22), item('carotte', 26), item('graine', 10), item('poisson', 40), item('appat', 12)] },
          { id: 'outils', label: '🧰 Outils', items: () => [
            unlock('tool:filet', 'Filet à papillons', '🥅', 200, 'Pour attraper les insectes (E).'),
            { id: 'rod:fibre', label: 'Canne en fibre', emoji: '🎣', price: 800, desc: 'Ça mord plus vite, zone plus large.', owned: ['fibre', 'doree'].includes(this.fishing.rod), buy: () => this.setRod('fibre') },
            { id: 'rod:doree', label: 'Canne dorée', emoji: '✨', price: 3000, desc: 'La meilleure : poissons rares plus fréquents.', owned: this.fishing.rod === 'doree', buy: () => this.setRod('doree') },
          ] },
        ];
      case 'menuiserie': {
        const surf = (list, owned, kind) => () => list.filter((sf) => sf.price > 0).map((sf) => ({
          id: `${kind}:${sf.id}`, label: sf.label, emoji: '', color: `linear-gradient(135deg, ${sf.draw.base} 50%, ${sf.draw.accent} 50%)`, price: sf.price,
          owned: owned.has(sf.id), buy: () => owned.add(sf.id),
        }));
        return [
          ...FURNITURE_CATS.map((c) => ({ id: `f-${c.id}`, label: c.label, items: furn((f) => f.cat === c.id) })),
          { id: 'murs', label: '🧱 Papiers peints', items: surf(WALLPAPERS, this.house.ownedWalls, 'mur') },
          { id: 'sols', label: '🟫 Sols', items: surf(FLOORS, this.house.ownedFloors, 'sol') },
          { id: 'travaux', label: '🔨 Travaux', items: () => this.worksItems() },
        ];
      }
      case 'couture':
        return [{
          id: 'vetements', label: '👗 Nouveautés',
          items: () => shopClothes().map((c) => ({
            id: `${c.key}:${c.id}`, label: c.label, emoji: c.icon || '👕', price: c.price,
            desc: { hat: 'Chapeau', glasses: 'Lunettes', back: 'Accessoire de dos', top: 'Haut' }[c.key] || '',
            owned: this.unlocks.has(`${c.key}:${c.id}`),
            buy: () => {
              this.unlocks.add(`${c.key}:${c.id}`);
              setTimeout(() => this.ui.toast('👗 Essaie-le dans la personnalisation (C) !', 2500), 600);
            },
          })),
        }];
      case 'cafe':
        return [
          { id: 'chats', label: '🐱 Pour les chats', items: () => [
            item('patee', 45), item('friandise', 60),
            unlock('tool:plumeau', 'Plumeau', '🪶', 250, 'Touche G près d\'un animal pour jouer avec lui !'),
          ] },
          { id: 'f-animaux', label: '🧺 Coin des minous', items: furn((f) => f.cat === 'animaux') },
          { id: 'douceurs', label: '🍰 Douceurs', items: () => ['tarte', 'jus', 'confiture', 'maki'].map((id) => item(id, Math.round(ITEMS[id].price * 1.4), { desc: 'Parfait comme cadeau !' })) },
        ];
      case 'garage':
        return [{
          id: 'vehicules', label: '🚗 Véhicules',
          items: () => Object.entries(VEHICLES).map(([id, v]) => ({
            id: `veh:${id}`, label: v.label, emoji: v.emoji, price: v.price, desc: `${v.desc} · vitesse ${'▰'.repeat(Math.round(v.speed / 3.5))}`,
            owned: this.vehicles.has(id), buy: () => this.vehicles.buy(id),
          })),
        }];
      default:
        return [{ id: 'rien', label: 'Boutique', items: () => [] }];
    }
  }

  setRod(id) {
    const order = ['bambou', 'fibre', 'doree'];
    if (order.indexOf(id) > order.indexOf(this.fishing.rod)) this.fishing.rod = id;
  }

  /** Travaux chez Bruno : agrandissements, styles de toit et de façade, extras. */
  worksItems() {
    const h = this.house;
    const out = [];
    const next = h.size + 1;
    if (next < HOME_SIZES.length) {
      out.push({
        id: `size:${next}`, label: `Agrandir : ${HOME_SIZES[next].label}`, emoji: '🏗️', price: UPGRADE_PRICES[next], repeatable: true,
        desc: `Pièce de ${HOME_SIZES[next].room.w} × ${HOME_SIZES[next].room.d} m et maison plus grande. ${next === 2 ? 'Avec une lucarne !' : ''}`,
        buy: () => {
          h.upgrade();
          this.particles.emit('sparkle', this.player.pos.clone().setY(this.player.pos.y + 2), { count: 6, spread: 1.5 });
          setTimeout(() => this.ui.toast('🏗️ Travaux terminés ! Va voir ta maison agrandie !', 4000), 500);
          this.emit('upgrade', { size: h.size });
        },
      });
    } else {
      out.push({ id: 'size:max', label: 'Maison au maximum !', emoji: '🏰', price: 0, owned: true, ownedLabel: 'Terminé ✓', buy: () => {} });
    }
    const style = (list, prefix, emoji) => list.filter((o) => o.price > 0).map((o) => ({
      id: `${prefix}:${o.id}`, label: o.label, emoji: o.emoji || emoji, price: o.price, owned: h.ownedStyles.has(`${prefix}:${o.id}`),
      desc: 'À choisir ensuite dans ton jardin : B → Façade',
      buy: () => {
        h.ownedStyles.add(`${prefix}:${o.id}`);
        if (prefix === 'extra') h.toggleExtra(o.id);
        else h.setExterior({ [prefix === 'roof' ? 'roofStyle' : 'facade']: o.id });
        this.emit('facade', {});
      },
    }));
    return [...out, ...style(ROOF_STYLES, 'roof', '🏠'), ...style(FACADES, 'facade', '🧱'), ...style(HOME_EXTRAS, 'extra', '✨')];
  }

  // --- Maison, sommeil, sièges ----------------------------------------------------

  enterHouse() {
    if (this.vehicles.riding) return;
    const e = this.house.entryPoint;
    this.fade(() => {
      this.player.teleport(e.x, e.z, Math.PI);
      for (const a of this.animals.followers()) a.teleport(e.x + (Math.random() - 0.5) * 2, e.z - 0.8);
      this.cam.yaw = 0;
      this.cam.pitch = 0.75;
      this.cam.dist = 11;
      this.cam.snap = true;
      this.emit('enter', {});
    });
  }

  exitHouse() {
    const d = this.world.village.doorFront(0, 1.6);
    this.fade(() => {
      this.player.teleport(d.x, d.z, d.rot);
      for (const a of this.animals.followers()) a.teleport(d.x + Math.sin(d.rot) * 1.2, d.z + Math.cos(d.rot) * 1.2);
      this.cam.yaw = d.rot + Math.PI;
      this.cam.pitch = 0.36;
      this.cam.dist = 9;
      this.cam.snap = true;
    });
  }

  fade(fn, ms = 350) {
    const f = document.querySelector('#fade');
    f.classList.add('on');
    setTimeout(() => {
      fn();
      setTimeout(() => f.classList.remove('on'), 80);
    }, ms);
  }

  sleep() {
    const sky = this.world.sky;
    const night = sky.hour >= 18 || sky.hour < 5;
    this.emit('sleep', {});
    this.audio.lullaby();
    this.fade(() => {
      if (night) {
        if (sky.hour >= 18) sky.day += 1;
        sky.hour = 7;
        this.ui.toast(`☀️ Bonjour ! Jour ${sky.day} — ${this.world.weather.season.emoji} ${this.world.weather.season.label}`, 3500);
      } else {
        sky.hour = Math.min(sky.hour + 3, 20);
        this.ui.toast('😴 Petite sieste… Tu te sens en pleine forme !', 2500);
      }
      this.quests.refreshRequests();
      this.saveNow();
    }, 700);
  }

  sitOn(seat) {
    this.sitting = seat;
    this.player.pos.set(seat.x, seat.y, seat.z);
    this.player.rotY = seat.rot;
    this.player.sync();
    this.player.frozen = true;
    this.player.seated = true;
    this.character.setSit(true, seat.seatY);
    if (seat.placed) seat.placed.occupied = true;
  }

  standUp() {
    if (!this.sitting) return;
    const s = this.sitting;
    this.sitting = null;
    this.character.setSit(false);
    this.player.frozen = false;
    this.player.seated = false;
    if (s.placed) s.placed.occupied = false;
    if (!s.ground) {
      const nx = this.player.pos.x + Math.sin(this.player.rotY) * 0.7;
      const nz = this.player.pos.z + Math.cos(this.player.rotY) * 0.7;
      this.player.teleport(nx, nz, this.player.rotY);
    }
  }

  // --- Interactions ------------------------------------------------------------------

  updateInteractions() {
    const input = this.input;
    const up = new THREE.Vector3(0, 2.3, 0);

    if (this.sitting) {
      const mv = input.moveVector();
      this.ui.setPrompt({ pos: this.player.pos.clone().add(up), title: '🪑 Assis', actions: [{ key: 'E', label: 'Se lever' }] });
      if (input.hit('KeyE', 'Space') || Math.hypot(mv.x, mv.y) > 0.3) this.standUp();
      return;
    }

    if (this.fishing.active) {
      const bite = this.fishing.state === 'bite';
      const reel = this.fishing.state === 'reel';
      this.ui.setPrompt({ pos: this.player.pos.clone().add(up), title: reel ? '🎣 Dans la zone verte !' : bite ? '🎣 Ça mord !' : '🎣 Patience…', actions: [{ key: 'E', label: reel ? 'Ferrer' : bite ? 'Ferrer !' : 'Remonter la ligne' }] });
      if (input.hit('KeyE')) this.fishing.action();
      return;
    }

    // En véhicule : seule action possible, descendre.
    const veh = this.player.vehicle;
    if (veh) {
      const def = veh.def;
      this.ui.setPrompt({ pos: this.player.pos.clone().add(new THREE.Vector3(0, def.mode === 'air' ? 3 : 2.6, 0)), title: `${def.emoji} ${def.label}`, actions: [{ key: 'E', label: def.mode === 'air' ? (veh.landing ? 'Atterrissage…' : 'Atterrir') : 'Descendre' }, { key: 'Maj', label: 'Accélérer', dim: def.mode !== 'ground' }] });
      if (input.hit('KeyE')) this.vehicles.dismount();
      return;
    }

    const jobAct = this.jobs.interaction();
    if (jobAct) {
      this.ui.setPrompt(jobAct.prompt);
      if (input.hit('KeyE')) jobAct.act();
      return;
    }

    const v = this.villagers.nearest();
    if (v) {
      const req = this.quests.requestFor(v.def.id);
      const story = this.quests.current?.story?.villager === v.def.id;
      const bday = this.calendar.isBirthday(v.def.id);
      this.ui.setPrompt({
        pos: v.pos.clone().add(new THREE.Vector3(0, 2.4, 0)),
        title: `${v.def.emoji} ${v.met ? v.def.name : '???'}${bday ? ' 🎂' : ''}`,
        sub: `${v.def.job}${story ? ' · ✨ histoire' : ''}${req && !req.done ? ' · a une demande !' : ''}`,
        hearts: v.friendship,
        actions: [{ key: 'E', label: 'Parler' }],
      });
      if (input.hit('KeyE')) this.dialogue.start(v);
      return;
    }

    const animal = this.animals.nearest();
    if (animal) {
      const a = animal;
      const food = this.animals.pickFood(a);
      const favKnown = this.animals.discovered[a.species]?.fav;
      let feedLabel = 'Donner à manger (sac vide)';
      if (food) feedLabel = food === a.sp.fav ? `Donner ${ITEMS[food].emoji}${favKnown ? ' (préféré !)' : ''}` : `Donner ${ITEMS[food].emoji}`;
      const actions = [
        { key: 'E', label: a.state === 'sleep' ? 'Caresser (il dort…)' : 'Caresser' },
        { key: 'F', label: feedLabel, dim: !food },
      ];
      if (this.unlocks.has('tool:plumeau')) actions.push({ key: 'G', label: 'Jouer 🪶' });
      if (!a.adopted && a.trust >= 100) actions.push({ key: 'R', label: 'Adopter 💖' });
      if (a.adopted) actions.push({ key: 'R', label: a.follow ? 'Attends-moi au jardin' : 'Suis-moi !' });
      this.ui.setPrompt({
        pos: a.headPosition().add(new THREE.Vector3(0, 0.35, 0)),
        title: `${a.sp.emoji} ${a.adopted ? a.name : a.sp.label}`,
        sub: a.adopted ? `${a.sp.label} · ${a.variantName}` : a.variantName,
        hearts: a.trust,
        actions,
      });
      if (input.hit('KeyE')) this.animals.pet(a);
      if (input.hit('KeyF')) this.animals.feed(a);
      if (input.hit('KeyG')) this.animals.play(a);
      if (input.hit('KeyR')) {
        if (a.adopted) {
          this.animals.toggleFollow(a);
          this.ui.refreshFollowers();
        } else if (a.trust >= 100) {
          this.adoptDialog(a);
        } else {
          this.ui.toast(`Il faut 5 cœurs pleins pour adopter ce ${a.sp.label.toLowerCase()}.`);
        }
      }
      return;
    }

    const bug = this.insects.nearest();
    if (bug) {
      this.ui.setPrompt(this.insects.prompt(bug));
      if (input.hit('KeyE')) this.insects.catch(bug);
      return;
    }

    // Porte de la maison (dehors) / sortie (dedans).
    const door = this.world.village.doorFront(0, 1.0);
    if (!this.house.inside && Math.hypot(door.x - this.player.pos.x, door.z - this.player.pos.z) < 1.4) {
      this.ui.setPrompt({ pos: new THREE.Vector3(door.x, this.player.pos.y + 2.6, door.z), title: '🏡 Ta maison', actions: [{ key: 'E', label: 'Entrer' }] });
      if (input.hit('KeyE')) this.enterHouse();
      return;
    }
    if (this.house.nearDoorInside()) {
      const e = this.house.entryPoint;
      this.ui.setPrompt({ pos: new THREE.Vector3(e.x, 2.6, e.z + 0.8), title: '🚪 Porte', actions: [{ key: 'E', label: 'Sortir' }, { key: 'B', label: 'Décorer' }] });
      if (input.hit('KeyE')) this.exitHouse();
      return;
    }

    // Boîte aux lettres et tableau des petits boulots.
    const vil = this.world.village;
    if (!this.house.inside && Math.hypot(vil.mailbox.x - this.player.pos.x, vil.mailbox.z - this.player.pos.z) < 1.6) {
      const n = this.calendar.letters.length;
      this.ui.setPrompt({ pos: new THREE.Vector3(vil.mailbox.x, this.player.pos.y + 2.2, vil.mailbox.z), title: '📬 Boîte aux lettres', sub: n ? `${n} lettre${n > 1 ? 's' : ''} !` : 'Vide', actions: [{ key: 'E', label: 'Relever le courrier', dim: !n }] });
      if (input.hit('KeyE')) this.calendar.openMail();
      return;
    }
    const jb = vil.jobBoard;
    if (Math.hypot(jb.x - this.player.pos.x, jb.z - this.player.pos.z) < 1.8) {
      this.ui.setPrompt({ pos: new THREE.Vector3(jb.bx, 2.3 + 3.2, jb.bz), title: '📋 Petits boulots', sub: this.jobs.active ? 'Mission en cours' : 'Des missions payées chaque jour', actions: [{ key: 'E', label: 'Consulter' }] });
      if (input.hit('KeyE')) this.jobs.open();
      return;
    }

    const usable = this.house.nearestUsable();
    if (usable) {
      const f = FURNITURE[usable.id];
      const pos = usable.obj.position.clone().add(new THREE.Vector3(0, 1.8, 0));
      if (f.bed) {
        const night = this.world.sky.hour >= 18 || this.world.sky.hour < 5;
        this.ui.setPrompt({ pos, title: `${f.emoji} ${f.label}`, actions: [{ key: 'E', label: night ? 'Dormir jusqu\'au matin' : 'Faire une sieste' }] });
        if (input.hit('KeyE')) this.sleep();
      } else if (f.stove) {
        this.ui.setPrompt({ pos, title: `${f.emoji} ${f.label}`, actions: [{ key: 'E', label: 'Cuisiner' }] });
        if (input.hit('KeyE')) this.cooking.open();
      } else if (f.music) {
        this.ui.setPrompt({ pos, title: `${f.emoji} ${f.label}`, actions: [{ key: 'E', label: f.music === 'piano' ? 'Jouer un air' : this.audio.musicOn ? 'Arrêter la musique' : 'Mettre de la musique' }] });
        if (input.hit('KeyE')) {
          if (f.music === 'piano') {
            this.audio.ensure();
            this.audio.piano();
            this.particles.emit('note', pos.clone().setY(pos.y - 0.3), { count: 4, spread: 0.8 });
          } else this.toggleMusic();
        }
      }
      return;
    }

    const plot = this.garden.nearest();
    if (plot) {
      this.ui.setPrompt(this.garden.prompt(plot));
      if (input.hit('KeyE')) this.garden.interact(plot);
      if (input.hit('KeyF')) this.garden.cycleSeed();
      return;
    }

    const res = this.resources.nearest();
    if (res) {
      this.ui.setPrompt({ pos: new THREE.Vector3(res.x, res.y + 0.9, res.z), title: `${ITEMS[res.item].emoji} ${ITEMS[res.item].label}`, actions: [{ key: 'E', label: res.label }] });
      if (input.hit('KeyE')) this.resources.harvest(res);
      return;
    }

    const spot = this.fishing.nearestSpot();
    if (spot) {
      const contest = this.calendar.contestActive ? ' · 🏆 concours !' : '';
      this.ui.setPrompt({ pos: new THREE.Vector3(spot.x, spot.y + 2.4, spot.z), title: '🎣 Coin de pêche', sub: `${spot.name}${contest}`, actions: [{ key: 'E', label: 'Pêcher' }] });
      if (input.hit('KeyE')) this.fishing.start(spot);
      return;
    }

    const seat = this.house.nearestSeat();
    if (seat) {
      this.ui.setPrompt({ pos: new THREE.Vector3(seat.x, seat.y + 1.6, seat.z), title: '🪑 Siège', actions: [{ key: 'E', label: 'S\'asseoir' }] });
      if (input.hit('KeyE')) this.sitOn(seat);
      return;
    }
    this.ui.setPrompt(null);
  }

  // --- Grande finale ---------------------------------------------------------------

  /** Le village rassemblé au pied du phare, qui se rallume. */
  finale(done) {
    const L = LANDMARKS.lighthouse;
    this.inFinale = true;
    if (this.vehicles.riding) this.vehicles.dismount(true);
    this.standUp();
    if (this.fishing.active) this.fishing.stop();
    this.ui.setPrompt(null);
    const toCenter = Math.atan2(-L.x, -L.z);
    const fx = Math.sin(toCenter);
    const fz = Math.cos(toCenter);
    const px = L.x + fx * 7;
    const pz = L.z + fz * 7;
    this.fade(() => {
      this.player.teleport(px, pz, Math.atan2(L.x - px, L.z - pz));
      this.villagers.list.forEach((v, i) => {
        const a = toCenter + (i - (this.villagers.list.length - 1) / 2) * 0.28;
        const r = 10 + (i % 2) * 1.4;
        const x = L.x + Math.sin(a) * r;
        const z = L.z + Math.cos(a) * r;
        v.character.setSit(false);
        v.character.setFishing(false);
        v.override = { x, z, rot: Math.atan2(L.x - x, L.z - z) };
      });
      for (const a of this.animals.followers()) a.teleport(px + (Math.random() - 0.5) * 3, pz + fz * 1.5);
      const gy = this.world.heightAt(L.x, L.z);
      this.cam.setCinematic(new THREE.Vector3(L.x + fx * 21 + fz * 5, gy + 4, L.z + fz * 21 - fx * 5), new THREE.Vector3(L.x, gy + 7, L.z));
      this.cam.snap = true;
    }, 500);
    const say = (i, text, t) => setTimeout(() => this.villagers.list[i % this.villagers.list.length].say(text, 3200), t);
    say(0, 'Tout le monde est là !', 1600);
    say(4, 'Vas-y, c\'est ton moment !', 2600);
    setTimeout(() => {
      this.character.play('celebrate', 2.5);
      this.world.village.setLighthouseLevel(1, true);
      this.audio.play('chapter');
      this.ui.levelBanner('🗼 Le Cœur de Doucebrise brille à nouveau !');
      for (const v of this.villagers.list) v.character.play('celebrate', 2);
    }, 4200);
    for (let k = 0; k < 14; k++) {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2;
        const pos = new THREE.Vector3(L.x + Math.cos(a) * 6, this.world.heightAt(L.x, L.z) + 14 + Math.random() * 8, L.z + Math.sin(a) * 6);
        this.particles.emit(k % 3 === 0 ? 'heart' : 'sparkle', pos, { count: 10, spread: 5, size: 1.1, rise: 0.4, life: 2.2, delay: 0.03 });
        this.audio.play('pick');
      }, 4600 + k * 520);
    }
    const lines = ['Il brille !', 'Magnifique…', `Merci, ${this.character.appearance.name} !`, 'Comme avant !', 'Hourra !', 'Snif… c\'est beau.', 'Miaou ♥', 'Trop cool !'];
    this.villagers.list.forEach((v, i) => say(i, lines[i % lines.length], 6000 + i * 700));
    setTimeout(() => {
      const el = document.querySelector('#chapter');
      el.innerHTML = `<div class="chapter-card finale"><div class="chap-emoji">🗼💛</div><div class="chap-num">Fin du chapitre 8</div>
        <h2>Le Cœur de Doucebrise</h2><p>Le phare brille à nouveau, plus fort que jamais. Ce soir, tout le village s'est retrouvé grâce à toi, ${this.character.appearance.name}. Doucebrise est ta maison, maintenant. ♥</p>
        <p class="note">L'aventure continue : agrandis ta maison, complète tes collections, deviens le meilleur ami de chacun… et n'oublie pas les fêtes !</p>
        <button class="btn big primary" data-fin>Continuer l'aventure</button></div>`;
      el.classList.remove('hidden');
      el.querySelector('[data-fin]').onclick = () => {
        el.classList.add('hidden');
        this.fade(() => {
          for (const v of this.villagers.list) {
            v.override = null;
            v.placeAt(v.scheduled(this.world.sky.hour));
          }
          this.inFinale = false;
          this.cam.setMode('follow');
          this.cam.yaw = this.player.rotY + Math.PI;
          this.cam.pitch = 0.36;
          this.cam.dist = 9;
          this.cam.snap = true;
          done();
          this.progress.addTitle('Cœur de Doucebrise');
          this.progress.setTitle('Cœur de Doucebrise');
          setTimeout(() => this.quests.showChapter(), 3000);
        }, 400);
      };
    }, 13500);
  }

  async adoptDialog(a) {
    const used = new Set(this.animals.companions().map((c) => c.name));
    const suggestions = PET_NAMES.filter((n) => !used.has(n)).sort(() => Math.random() - 0.5).slice(0, 5);
    const name = await this.ui.askName({
      title: `Adopter ce ${a.sp.label.toLowerCase()} ${a.sp.emoji}`,
      text: `${a.variantName} te fait confiance. Comment veux-tu l'appeler ?`,
      value: '',
      suggestions,
    });
    if (name) {
      this.animals.adopt(a, name);
      this.ui.refreshFollowers();
    }
  }

  // --- Boucle ------------------------------------------------------------------

  frame(time) {
    this.timer.update(time);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    this.elapsed += dt;
    const playing = this.state === 'play';
    const free = playing && !this.busy;

    if (free && this.input.hit('Space') && this.player.grounded && !this.player.frozen) this.audio.play('jump');
    const frozen = this.player.frozen;
    if (!free) this.player.frozen = true;
    this.player.update(dt, this.input, this.cam.yaw);
    this.player.frozen = frozen;
    if (this.state === 'title') this.world.sky.hour = 10 + Math.sin(this.elapsed * 0.02) * 0.5;

    const worldDt = this.state === 'title' ? 0 : dt;
    this.world.update(worldDt, this.elapsed, this.player.pos, this.grassRadius);
    this.audio.setRain(this.state === 'play' && !this.house.inside ? this.world.weather.rainAmt : 0);
    this.animals.update(dt, this.world.sky.isNight);
    this.villagers.update(dt);
    this.resources.update(dt);
    this.garden.update(dt);
    this.fishing.update(dt, this.input);
    this.insects.update(dt);
    this.vehicles.update(dt);
    this.jobs.update(dt);
    this.calendar.update(dt);
    this.house.update(dt, this.elapsed, this.camera);
    this.decor.update();
    this.particles.update(dt);
    this.cam.update(dt, this.player, this.input, this.elapsed);
    this.guide.update(dt);

    if (playing) {
      if (free) this.updateInteractions();
      else if (!this.fishing.active) this.ui.setPrompt(null);
      this.quests.update();
      const z = this.house.inside ? null : zoneAt(this.player.pos.x, this.player.pos.z);
      if (z !== this.zone) {
        if (z) {
          this.ui.zoneBanner(z);
          this.emit('zone', { zone: z.id });
        } else this.ui.setZoneLabel(this.house.inside ? { emoji: '🏡', name: 'Ta maison' } : null);
        this.zone = z;
      }
      if (this.lastDay !== this.world.sky.day) {
        if (this.lastDay !== undefined) {
          this.quests.refreshRequests();
          this.progress.refreshDaily();
          this.jobs.refresh();
          this.calendar.onNewDay(true);
          const w = this.world.weather;
          if (w.dayInSeason === 1) this.ui.toast(`${w.season.emoji} C'est le début de : ${w.season.label} !`, 4000);
          if (this.calendar.letters.length) setTimeout(() => this.ui.toast('📬 Tu as du courrier ! Va voir ta boîte aux lettres.', 3500), 4000);
        }
        this.lastDay = this.world.sky.day;
      }
      this.ui.update(dt);
      this.saveT += dt;
      if ((this.dirty && this.saveT > 4) || this.saveT > 30) this.saveNow();
    }
    if (this.state === 'creator') this.ui.update(dt);

    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // --- Sauvegarde --------------------------------------------------------------

  requestSave() {
    this.dirty = true;
  }

  saveNow() {
    this.saveT = 0;
    this.dirty = false;
    if (this.state === 'title') return;
    const sky = this.world.sky;
    // Dans la maison, on sauvegarde la position devant la porte (plus simple au rechargement) ;
    // en bateau ou en montgolfière, sur la terre ferme la plus proche.
    let pos = this.house.inside ? this.world.village.doorFront(0, 1.6) : { x: this.player.pos.x, z: this.player.pos.z };
    if (this.player.vehicle && this.player.vehicle.def.mode !== 'ground') pos = this.vehicles.findLand(this.player.pos, 40, 0.2) || this.world.village.doorFront(0, 1.6);
    writeSave({
      appearance: this.character.appearance,
      player: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), rotY: +this.player.rotY.toFixed(2) },
      time: { hour: +sky.hour.toFixed(3), day: sky.day },
      inventory: this.inventory,
      coins: this.coins,
      unlocks: [...this.unlocks],
      knownLoves: [...this.knownLoves],
      animals: this.animals.serialize(),
      villagers: this.villagers.serialize(),
      resources: this.resources.serialize(),
      garden: this.garden.serialize(),
      house: this.house.serialize(),
      cooking: this.cooking.serialize(),
      quests: this.quests.serialize(),
      weather: this.world.weather.serialize(),
      fishing: this.fishing.serialize(),
      progress: this.progress.serialize(),
      insects: this.insects.serialize(),
      vehicles: this.vehicles.serialize(),
      jobs: this.jobs.serialize(),
      calendar: this.calendar.serialize(),
      settings: { ...this.settings, music: this.audio.musicOn, sfx: this.audio.sfxOn },
    });
  }

  restore(s) {
    if (s.player) this.player.teleport(s.player.x, s.player.z, s.player.rotY);
    if (s.time) {
      this.savedTime = s.time;
      this.world.sky.hour = s.time.hour;
      this.world.sky.day = s.time.day;
    }
    if (s.inventory) for (const [k, n] of Object.entries(s.inventory)) if (k in this.inventory) this.inventory[k] = n;
    this.coins = s.coins ?? (s.version === 1 ? 150 : 0);
    this.unlocks = new Set(s.unlocks || []);
    this.knownLoves = new Set(s.knownLoves || []);
    this.animals.restore(s.animals);
    this.villagers.restore(s.villagers);
    this.resources.restore(s.resources);
    this.garden.restore(s.garden);
    this.house.restore(s.house);
    this.cooking.restore(s.cooking);
    this.quests.restore(s.quests);
    this.world.weather.restore(s.weather);
    // Ancien format de la pêche : records par nom de poisson (ignorés).
    if (s.fishing?.best || s.fishing?.rod) this.fishing.restore(s.fishing);
    this.progress.restore(s.progress);
    this.insects.restore(s.insects);
    this.vehicles.restore(s.vehicles);
    this.jobs.restore(s.jobs);
    this.calendar.restore(s.calendar);
    if (s.settings) {
      this.audio.musicOn = !!s.settings.music;
      this.audio.sfxOn = s.settings.sfx !== false;
      document.querySelector('#btn-music')?.classList.toggle('off', !this.audio.musicOn);
    }
    // Remet l'heure sauvegardée après l'animation de l'écran titre.
    document.querySelector('#btn-continue').addEventListener('click', () => {
      this.world.sky.hour = this.savedTime?.hour ?? 8.5;
    }, { once: true });
  }
}

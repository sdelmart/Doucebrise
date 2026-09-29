import * as THREE from 'three';
import { World } from './world/world.js';
import { zoneAt, LANDMARKS, islandAt, ZONES } from './world/layout.js';
import { whaleModel } from './world/islands.js';
import { Avatar } from './player/avatar.js';
import { Player } from './player/player.js';
import { FollowCamera } from './player/camera.js';
import { DEFAULT_APPEARANCE, normalizeAppearance, randomAppearance, isLocked, shopClothes, OPTIONS } from './player/appearance.js';
import { AnimalManager } from './animals/manager.js';
import { VillagerManager } from './npc/villagers.js';
import { ITEMS, RECIPES, createInventory } from './game/items.js';
import { Fishing, FISH, fishWhere } from './game/fish.js';
import { Insects, INSECTS } from './game/insects.js';
import { Footsteps } from './core/footsteps.js';
import { Festivals } from './game/festivals.js';
import { Resources } from './game/activities.js';
import { Progress } from './game/progress.js';
import { Vehicles, VEHICLES } from './game/vehicles.js';
import { Jobs } from './game/jobs.js';
import { Calendar } from './game/calendar.js';
import { Garden } from './game/garden.js';
import { Quests, STORY, CHAPTERS } from './game/quests.js';
import { Cooking } from './game/cooking.js';
import { Archipelago } from './game/travel.js';
import { SideQuests, SIDE_QUESTS } from './game/sidequests.js';
import { SledRace } from './game/sled.js';
import { House } from './house/house.js';
import { DecorMode } from './house/decor.js';
import { Visits } from './house/visits.js';
import { FURNITURE, SHOP_FURNITURE, WALLPAPERS, FLOORS, FURNITURE_CATS, shopFurniture } from './house/furniture.js';
import { HOME_SIZES, ROOF_STYLES, FACADES, HOME_EXTRAS } from './world/home.js';
import { Input, initKeyboardLayout, logicalCode } from './core/input.js';
import { loadSettings, saveSettings, SHADOW_SIZES, DAY_SPEEDS } from './core/settings.js';
import { PostFX } from './core/postfx.js';
import { Particles } from './core/particles.js';
import { Audio } from './core/audio.js';
import { MusicPlayer } from './core/music.js';
import { setRenderStyle } from './core/materials.js';
import { AutoQuality, effectiveGraphics, initialLevel } from './core/autoquality.js';
import { loadSave, writeSave, clearSave, getSlot } from './core/save.js';
import { UI } from './ui/ui.js';
import { Creator } from './ui/creator.js';
import { PetsPanel } from './ui/pets.js';
import { Dialogue } from './ui/dialogue.js';
import { Shop } from './ui/shop.js';
import { Journal } from './ui/journal.js';
import { PhotoMode } from './ui/photo.js';
import { BagPanel } from './ui/panels.js';
import { TitleMenu, PauseMenu, SettingsPanel, Credits, toggleFullscreen } from './ui/menus.js';
import { PerfOverlay } from './ui/perf.js';
import { Tips } from './ui/tips.js';
import { UINavigator } from './ui/navigator.js';
import { Guide } from './ui/guide.js';

const PET_NAMES = ['Moka', 'Caramel', 'Noisette', 'Biscuit', 'Plume', 'Pépite', 'Brioche', 'Praline', 'Nougat', 'Mochi', 'Tofu', 'Pistache', 'Câlin', 'Filou', 'Guimauve', 'Cannelle', 'Pompon', 'Réglisse', 'Sésame', 'Myrtille'];
const EMOTES = { Digit1: ['wave', 1.6], Digit2: ['dance', 5], Digit3: ['sit', 0], Digit4: ['kiss', 1.6], Digit5: ['clap', 1.8] };
const TOOLS = { 'tool:filet': '🥅 Filet à papillons', 'tool:plumeau': '🪶 Plumeau' };
const UPGRADE_PRICES = [0, 4000, 10000];
const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
const PANELS = ['#creator', '#pets', '#map', '#help', '#journal', '#bag', '#settings', '#pause', '#credits'];

// Chef d'orchestre : rendu, boucle, états (titre / création / jeu), interactions, sauvegarde.

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = {};
    this.slot = getSlot();
    this.save = loadSave(this.slot);
    this.settings = loadSettings(this.save?.settings);
    // Style de rendu (réaliste ou cartoon) : avant la création des matériaux.
    this.renderStyle = this.settings.graphics.style || 'realiste';
    setRenderStyle(this.renderStyle);
    // Réglages pris en compte au démarrage seulement (les paramètres proposent de redémarrer).
    this.bootGraphics = { ...this.settings.graphics };

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Rendu « cozy » : couleurs sRGB, tons ACES un peu surexposés, ombres douces.
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    // Mise à jour explicite, une fois par image (PostFX.render) : sinon chaque rendu de
    // la scène (passes supplémentaires) recalculerait toutes les ombres.
    this.renderer.shadowMap.autoUpdate = false;
    // PCFSoftShadowMap a été retiré de Three.js (r186) : PCF + rayon de flou (voir sky.js).
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 900);

    this.input = new Input(canvas);
    initKeyboardLayout().then(() => this.ui?.refreshKeyHints?.());
    this.input.onRebuild = () => this.ui?.refreshKeyHints?.();
    this.audio = new Audio();
    this.music = new MusicPlayer(this.audio, () => this.settings);
    this.world = new World(this.scene);
    this.particles = new Particles(this.scene);
    this.postfx = new PostFX(this.renderer, this.scene, this.camera);
    this.autoQuality = new AutoQuality(this.renderer);
    // Qualité automatique : palier retenu de la dernière fois, sinon selon la carte
    // graphique. Désactivée sous pilotage automatique (tests) pour un rendu constant.
    this.autoOff = typeof navigator !== 'undefined' && navigator.webdriver;
    if (!Number.isInteger(this.settings.autoLevel)) this.settings.autoLevel = this.autoOff ? 0 : initialLevel(this.renderer);
    this.autoQuality.restart(this.settings.autoLevel);
    this.renderer.info.autoReset = false;
    this.perf = new PerfOverlay(this);
    this.wishT = 0;
    this.world.particles = this.particles;

    const appearance = this.save ? normalizeAppearance(this.save.appearance) : { ...DEFAULT_APPEARANCE };
    this.character = new Avatar(appearance);
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
    this.footsteps = new Footsteps(this);
    this.vehicles = new Vehicles(this);
    this.jobs = new Jobs(this);
    this.calendar = new Calendar(this);
    this.festivals = new Festivals(this);
    this.garden = new Garden(this);
    this.house = new House(this);
    this.visits = new Visits(this);
    this.cooking = new Cooking(this);
    this.quests = new Quests(this);
    this.archipelago = new Archipelago(this);
    this.sideQuests = new SideQuests(this);
    this.sled = new SledRace(this);
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
    this.titleMenu = new TitleMenu(this);
    this.pauseMenu = new PauseMenu(this);
    this.credits = new Credits(this);
    this.tips = new Tips(this);
    this.navigator = new UINavigator(this);

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
    this.audio.musicOn = this.settings.musicOn;
    document.querySelector('#btn-music')?.classList.toggle('off', !this.audio.musicOn);
    this.applySettings();
    this.world.sky.onShootingStar = (st) => this.onShootingStar(st);
    this.world.weather.onThunder = (delay) => this.audio.thunder(delay);
    this.cam.setMode('title');
    this.cam.snap = true;

    window.addEventListener('resize', () => this.resize());
    // Premier clic ou première touche : le navigateur autorise alors le son (musique du titre).
    const unlockAudio = () => {
      this.audio.ensure();
      this.audio.ctx?.resume?.();
      window.removeEventListener('pointerdown', unlockAudio, true);
      window.removeEventListener('keydown', unlockAudio, true);
    };
    window.addEventListener('pointerdown', unlockAudio, true);
    window.addEventListener('keydown', unlockAudio, true);
    this.music.onTrack = (t) => {
      if (this.state === 'play' && this.settings.musicTitles !== false) this.ui.toast(`🎵 ${t.name}`, 2600);
    };
    // Avant les autres écouteurs : Échap qui ferme une fenêtre ne doit pas ouvrir la pause.
    window.addEventListener('keydown', (e) => {
      this.escWasBusy = this.busy || !!this.panel || this.state !== 'play';
    }, true);
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.desktop?.onFullscreen?.((on) => {
      this.fullscreen = on;
    });
    window.addEventListener('beforeunload', () => {
      if (this.state !== 'title') this.saveNow();
    });

    this.timer = new THREE.Timer();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    this.ui.hideLoading();
    this.ui.showTitle();
    // Démarrage automatique après un changement de profil ou une nouvelle partie.
    let auto = null;
    try {
      auto = sessionStorage.getItem('doucebrise-autostart') || (sessionStorage.getItem('doucebrise-new') ? 'new' : null);
      sessionStorage.removeItem('doucebrise-autostart');
      sessionStorage.removeItem('doucebrise-new');
    } catch {
      auto = null;
    }
    if (auto === 'new' && !this.save) setTimeout(() => this.newGame(), 50);
    if (auto === 'continue' && this.save) setTimeout(() => this.continueGame(), 50);
  }

  // --- Événements --------------------------------------------------------------

  on(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }

  emit(type, data) {
    for (const fn of this.listeners[type] || []) fn(data);
  }

  // --- Réglages ------------------------------------------------------------------

  applySettings(save = true) {
    const st = this.settings;
    // Réglages graphiques changés à la main : la qualité automatique repart de zéro.
    const sig = JSON.stringify(st.graphics);
    if (this.graphicsSig !== undefined && sig !== this.graphicsSig) {
      st.autoLevel = 0;
      this.autoQuality.restart(0);
    }
    this.graphicsSig = sig;
    this.applyGraphics();
    this.camera.fov = st.fov;
    this.camera.updateProjectionMatrix();
    this.world.sky.speed = (DAY_SPEEDS[st.daySpeed] || DAY_SPEEDS.normale).k;
    this.input.sensitivity = st.camSensitivity;
    this.input.invertY = st.invertY;
    this.input.setBindings(st.keys);
    this.cam.autoFollow = st.camAuto;
    this.audio.setLevels(st.audio);
    this.guide.enabled = st.guideArrow;
    document.documentElement.style.setProperty('--ui-scale', st.uiScale);
    document.body.classList.toggle('no-minimap', !st.minimap);
    document.body.classList.toggle('no-keyhints', !st.keyHints);
    this.perf.setMode(st.showFps);
    this.ui.refreshKeyHints?.();
    if (save) saveSettings(st);
  }

  /** Réglages graphiques effectivement utilisés (choisis, allégés par la qualité automatique). */
  graphics() {
    const gs = this.settings.graphics;
    return effectiveGraphics(gs, gs.auto && !this.autoOff ? this.settings.autoLevel || 0 : 0);
  }

  /** Applique les réglages graphiques (au démarrage, et quand la qualité automatique change). */
  applyGraphics() {
    const gs = this.graphics();
    this.renderer.setPixelRatio(this.fullPixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const sun = this.world.sky.sun;
    const size = SHADOW_SIZES[gs.shadows] || 0;
    if (sun.castShadow !== size > 0 || (size && sun.shadow.mapSize.x !== size)) {
      sun.castShadow = size > 0;
      if (size) {
        sun.shadow.mapSize.set(size, size);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
        // Zone d'ombre plus large en ultra.
        const cam = sun.shadow.camera;
        const ext = size >= 4096 ? 60 : 42;
        cam.left = -ext;
        cam.right = ext;
        cam.top = ext;
        cam.bottom = -ext;
        cam.updateProjectionMatrix();
      }
    }
    this.grassRadius = gs.grass * gs.grassK;
    this.world.grassFieldK = gs.fieldK;
    this.world.renderDistance = gs.renderDistance;
    this.world.treeLod = gs.treeK;
    this.world.setGroundDetail(gs.ground && this.bootGraphics.ground !== false);
    this.postfx.shadowEvery = gs.shadowEvery;
    this.world.weather.fogScale = gs.renderDistance / 300;
    this.world.sky.cloudQuality = { low: 0.35, medium: 0.6, high: 1 }[gs.clouds] ?? 0.6;
    const wu = this.world.water.userData.uniforms;
    if (wu) wu.uReflect.value = gs.water === 'reflets' ? 1 : 0;
    this.postfx.configure({ aa: gs.aa, bloom: gs.bloom, grading: gs.grading, ao: gs.ao });
    this.postfx.setSize(window.innerWidth, window.innerHeight);
  }

  // --- États -------------------------------------------------------------------

  newGame() {
    // Une partie existe déjà : on repart vraiment de zéro (rechargement propre).
    if (this.save) {
      clearSave();
      try {
        sessionStorage.setItem('doucebrise-autostart', 'new');
      } catch {
        /* stockage indisponible */
      }
      window.location.reload();
      return;
    }
    this.audio.ensure();
    const a = { ...randomAppearance(), name: '' };
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
    // Remet l'heure sauvegardée après l'animation de l'écran titre.
    if (this.savedTime) this.world.sky.hour = this.savedTime.hour;
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

  /** Dans une maison (la sienne ou chez un habitant). */
  get indoors() {
    return this.house.inside || !!this.visits.active;
  }

  /** Point dehors qui représente l'intérieur (porte de la maison visitée). */
  indoorAnchor() {
    return this.world.village.doorFront(this.visits.active ? this.visits.active.def.house : 0, 1.6);
  }

  get busy() {
    return this.dialogue.open || this.shop.isOpen || this.cooking.isOpen || !!this.festivals.plating || this.decor.active || this.photo.active || this.jobs.isOpen || this.vehicles.menuOpen || this.calendar.mailOpen || this.ui.chapterOpen || this.inFinale || this.archipelago.isOpen || this.archipelago.gazing || this.sled.active || !document.querySelector('#dialog').classList.contains('hidden');
  }

  openPanel(name) {
    if (this.state === 'title' && !['creator', 'settings', 'credits', 'help'].includes(name)) return;
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
        this.ui.centerBigMap(110);
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
      case 'pause':
        this.pauseMenu.render();
        document.querySelector('#pause').classList.remove('hidden');
        break;
      case 'credits':
        document.querySelector('#credits').classList.remove('hidden');
        break;
      case 'settings':
        this.settingsPanel.open();
        document.querySelector('#settings').classList.remove('hidden');
        break;
      case 'help':
        this.ui.renderHelp();
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
      if (!this.character.appearance.name?.trim()) this.setAppearance({ ...this.character.appearance, name: 'Voyageur·se' }, false);
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
    this.settings.musicOn = on;
    saveSettings(this.settings);
    return on;
  }

  /** Petit concert au kiosque : les habitants alentour applaudissent. */
  playBandstand() {
    if (this.concertUntil && this.elapsed < this.concertUntil) return;
    this.concertUntil = this.elapsed + 3;
    const bs = this.world.islands.bandstand;
    this.audio.ensure();
    this.audio.piano();
    setTimeout(() => this.audio.piano(), 1500);
    this.character.play('dance', 3);
    for (let k = 0; k < 5; k++) setTimeout(() => this.particles.emit('note', new THREE.Vector3(bs.x + (Math.random() - 0.5) * 3, bs.y + 2.2, bs.z + (Math.random() - 0.5) * 3), { count: 2, spread: 0.8 }), k * 500);
    let fans = 0;
    for (const v of this.villagers.list) {
      if (v.pos.distanceTo(this.player.pos) < 22 && !v.home) {
        fans++;
        setTimeout(() => {
          v.character.play('clap', 2);
          if (Math.random() < 0.5) v.say(['Bravo !', 'Encore !', 'Quel talent !', '♪ ♫ ♪', 'J\'adore cet air !'][Math.floor(Math.random() * 5)], 2200);
        }, 1500 + Math.random() * 1200);
      }
    }
    this.emit('music', { fans });
    if (fans) setTimeout(() => this.ui.toast(`🎼 ${fans} habitant${fans > 1 ? 's' : ''} t'applaudi${fans > 1 ? 'ssent' : 't'} !`, 2500), 2600);
  }

  // --- Étoiles filantes et vœux -------------------------------------------------------

  onShootingStar() {
    if (this.state !== 'play' || this.indoors) return;
    this.tips.show('voeu');
    this.audio.play('star');
    this.wishT = 2.6;
    this.ui.wishPrompt?.(true);
  }

  makeWish() {
    this.musicMoment = { mood: 'magique', until: this.elapsed + 30 };
    this.wishT = 0;
    this.ui.wishPrompt?.(false);
    this.audio.play('wish');
    this.particles.emit('sparkle', this.player.pos.clone().setY(this.player.pos.y + 2), { count: 8, spread: 1.2, size: 0.7 });
    this.character.play('kiss', 1.4);
    const lines = ['🌠 Tu fais un vœu en silence… ✨', '🌠 Vœu envoyé aux étoiles ! ✨', '🌠 Chut… un vœu, ça ne se raconte pas ! ✨'];
    this.ui.toast(lines[Math.floor(Math.random() * lines.length)], 3200);
    this.calendar.wishes = (this.calendar.wishes || 0) + 1;
    this.emit('wish', {});
    this.requestSave();
  }

  onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const code = logicalCode(e);
    if (e.code === 'F11') {
      e.preventDefault();
      toggleFullscreen(!(window.desktop?.isDesktop ? this.fullscreen : document.fullscreenElement));
      return;
    }
    if (code === 'F3') {
      const order = ['off', 'fps', 'detail'];
      this.settings.showFps = order[(order.indexOf(this.settings.showFps) + 1) % order.length];
      this.perf.setMode(this.settings.showFps);
      saveSettings(this.settings);
      return;
    }
    if (this.state === 'title') {
      if (logicalCode(e) === 'Escape' && this.panel) this.closePanels();
      return;
    }
    if (this.state === 'creator') {
      if (e.code === 'Escape') this.closePanels();
      return;
    }
    if (this.dialogue.open || this.shop.isOpen || this.cooking.isOpen || this.festivals.plating || this.jobs.isOpen || this.vehicles.menuOpen || this.calendar.mailOpen || this.ui.chapterOpen || this.inFinale || this.archipelago.isOpen || this.archipelago.gazing || this.sled.active || !document.querySelector('#dialog').classList.contains('hidden')) return;
    if (this.decor.active) return;
    if (this.photo.active) {
      if (e.code === 'Escape' || e.code === 'KeyO') this.photo.exit();
      return;
    }
    switch (code) {
      case 'Escape':
        if (this.panel) this.closePanels();
        else if (!this.escWasBusy) this.openPanel('pause');
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
        if (EMOTES[code] && !this.panel) this.emote(code);
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
    this.emit('emote', { name, zone: this.zone?.id });
  }

  startDecor() {
    if (this.state !== 'play' || this.busy) return;
    if (this.visits.active) {
      this.ui.toast('🛋️ On ne décore pas chez les autres ! Rentre chez toi pour décorer.');
      return;
    }
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
    const furnEntry = (f) => ({
      id: f.id, label: f.label, emoji: f.emoji, price: f.price, repeatable: true,
      desc: `${f.where === 'out' ? 'Jardin' : f.where === 'both' ? 'Maison ou jardin' : f.wall ? 'Au mur' : 'Maison'}${count(f.id) ? ` · tu en as ${count(f.id)}` : ''}`,
      buy: () => this.house.addToStorage(f.id),
    });
    const furn = (filter) => () => SHOP_FURNITURE.filter(filter).map(furnEntry);
    const shopFurn = (shop) => () => shopFurniture(shop).map(furnEntry);
    const clothes = (shop) => ({
      id: 'mode', label: '👕 Mode des îles',
      items: () => shopClothes(shop).map((c) => ({
        id: `${c.key}:${c.id}`, label: c.label, emoji: c.icon || '👕', price: c.price,
        desc: { hat: 'Chapeau', glasses: 'Lunettes', back: 'Accessoire de dos', top: 'Haut' }[c.key] || '',
        owned: this.unlocks.has(`${c.key}:${c.id}`),
        buy: () => {
          this.unlocks.add(`${c.key}:${c.id}`);
          setTimeout(() => this.ui.toast('👗 Essaie-le dans la personnalisation (C) !', 2500), 600);
        },
      })),
    });
    const recipes = (ids) => ids.map((id) => ({
      id: `recette:${id}`, label: `Recette : ${ITEMS[id].label}`, emoji: ITEMS[id].emoji, price: 250 + ITEMS[id].price * 4,
      desc: `Ingrédients : ${Object.entries(RECIPE_BY_ID[id]?.needs || {}).map(([k, n]) => `${ITEMS[k].emoji}×${n}`).join(' ')}`,
      owned: this.cooking.known.has(id), ownedLabel: 'Connue ✓',
      buy: () => {
        this.cooking.learn(id);
        setTimeout(() => this.ui.toast(`📖 Nouvelle recette : ${ITEMS[id].emoji} ${ITEMS[id].label} ! Cuisine-la sur ta cuisinière.`, 3500), 400);
      },
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
            { id: 'rod:fibre', label: 'Canne en fibre', emoji: '🎣', price: 800, desc: 'Ça mord plus vite, ligne plus solide.', owned: ['fibre', 'doree'].includes(this.fishing.rod), buy: () => this.setRod('fibre') },
            { id: 'rod:doree', label: 'Canne dorée', emoji: '✨', price: 3000, desc: 'La meilleure : poissons rares plus fréquents, ligne très solide.', owned: this.fishing.rod === 'doree', buy: () => this.setRod('doree') },
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
          { id: 'douceurs', label: '🍰 Douceurs', items: () => ['tarte', 'jus', 'confiture', 'maki'].map((id) => item(id, Math.round(ITEMS[id].price * 1.6), { desc: 'Parfait comme cadeau !' })) },
        ];
      case 'garage':
        return [{
          id: 'vehicules', label: '🚗 Véhicules',
          items: () => Object.entries(VEHICLES).map(([id, v]) => ({
            id: `veh:${id}`, label: v.label, emoji: v.emoji, price: v.price, desc: `${v.desc} · vitesse ${'▰'.repeat(Math.round(v.speed / 3.5))}`,
            owned: this.vehicles.has(id), buy: () => this.vehicles.buy(id),
          })),
        }];
      case 'patisserie':
        return [
          { id: 'douceurs', label: '🥐 Douceurs', items: () => [item('croissant', 48), item('chocolat', 55), ...['tarte-myrtille', 'crepe', 'tarte'].map((id) => item(id, Math.round(ITEMS[id].price * 1.6), { desc: 'Tout juste sorti du four !' }))] },
          { id: 'ingredients', label: '🧺 Ingrédients', items: () => [item('myrtille', 22), item('fraise', 34), item('mais', 34), item('pomme', 22)] },
          { id: 'recettes', label: '📖 Recettes', items: () => recipes(['tarte-myrtille', 'crepe']) },
        ];
      case 'atelier':
        return [
          { id: 'chalet', label: '🪵 Meubles de chalet', items: shopFurn('atelier') },
          { id: 'foret', label: '🌲 De la forêt', items: () => [item('pomme-pin', 14), item('champignon', 24), item('myrtille', 22)] },
          clothes('atelier'),
          { id: 'recettes', label: '📖 Recettes', items: () => recipes(['soupe-bois']) },
          { id: 'vendre', label: '💰 Vendre' },
        ];
      case 'capitainerie':
        return [
          { id: 'marine', label: '⚓ Déco marine', items: shopFurn('capitainerie') },
          { id: 'peche', label: '🎣 Pêche', items: () => [item('appat', 12), item('poisson', 40),
            { id: 'rod:fibre', label: 'Canne en fibre', emoji: '🎣', price: 800, desc: 'Ça mord plus vite, ligne plus solide.', owned: ['fibre', 'doree'].includes(this.fishing.rod), buy: () => this.setRod('fibre') },
            { id: 'rod:doree', label: 'Canne dorée', emoji: '✨', price: 3000, desc: 'La meilleure : poissons rares plus fréquents, ligne très solide.', owned: this.fishing.rod === 'doree', buy: () => this.setRod('doree') }] },
          { id: 'recettes', label: '📖 Recettes', items: () => recipes(['brochette', 'maki']) },
          { id: 'vendre', label: '💰 Vendre' },
        ];
      case 'galerie':
        return [{ id: 'tableaux', label: '🖼️ Tableaux & art', items: shopFurn('galerie') }];
      case 'plongee':
        return [
          { id: 'lagon', label: '🐠 Trésors du lagon', items: shopFurn('plongee') },
          clothes('plongee'),
          { id: 'recettes', label: '📖 Recettes', items: () => recipes(['salade-tropicale']) },
        ];
      case 'paillote':
        return [
          { id: 'boissons', label: '🍹 Rafraîchissements', items: () => [item('glace', 46), item('cocktail', 62), item('jus-coco', Math.round(ITEMS['jus-coco'].price * 1.6)), item('noix-coco', 36)] },
          { id: 'plage', label: '🏖️ Esprit plage', items: shopFurn('paillote') },
          clothes('paillote'),
          { id: 'recettes', label: '📖 Recettes', items: () => recipes(['jus-coco']) },
        ];
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
    if (s.bath) {
      const sp = this.world.islands.spring;
      const a = Math.atan2(s.x - sp.x, s.z - sp.z);
      this.player.teleport(sp.x + Math.sin(a) * (sp.r + 1.6), sp.z + Math.cos(a) * (sp.r + 1.6), a);
    } else if (!s.ground) {
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
      const bath = this.sitting.bath;
      this.ui.setPrompt({ pos: this.player.pos.clone().add(up), title: bath ? '♨️ Source chaude' : '🪑 Assis', sub: bath && this.archipelago.relaxed ? 'Bien-être actif ✨' : '', actions: [{ key: 'E', label: bath ? 'Sortir de l\'eau' : 'Se lever' }] });
      if (input.hit('KeyE', 'Space') || Math.hypot(mv.x, mv.y) > 0.3) this.standUp();
      return;
    }

    if (this.fishing.active) {
      const bite = this.fishing.state === 'bite';
      const reel = this.fishing.state === 'reel';
      const nibble = this.fishing.nibbleT > 0;
      this.ui.setPrompt({ pos: this.player.pos.clone().add(up), title: reel ? '🎣 Mouline !' : bite ? '🎣 Ça mord !' : nibble ? '🎣 Ça touche… attends !' : '🎣 Patience…', actions: [{ key: 'E', label: reel ? 'Maintenir : mouliner' : bite ? 'Ferrer !' : 'Remonter la ligne' }] });
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
        sub: `${v.def.job}${story ? ' · ✨ histoire' : ''}${{ ready: ' · ✅ quête à rendre', offer: ' · ❗ a une quête' }[this.sideQuests.markerFor(v.def.id)] || ''}${req && !req.done ? ' · a une demande' : ''}`,
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

    if (this.festivals.interact(input)) return;

    const bug = this.insects.nearest();
    if (bug) {
      this.ui.setPrompt(this.insects.prompt(bug));
      if (input.hit('KeyE')) this.insects.catch(bug);
      return;
    }

    // Porte de la maison (dehors) / sortie (dedans).
    const door = this.world.village.doorFront(0, 1.0);
    if (!this.indoors && Math.hypot(door.x - this.player.pos.x, door.z - this.player.pos.z) < 1.4) {
      this.ui.setPrompt({ pos: new THREE.Vector3(door.x, this.player.pos.y + 2.6, door.z), title: '🏡 Ta maison', actions: [{ key: 'E', label: 'Entrer' }] });
      if (input.hit('KeyE')) this.enterHouse();
      return;
    }
    if (this.visits.nearExit()) {
      const e = this.visits.entryPoint;
      this.ui.setPrompt({ pos: new THREE.Vector3(e.x, 2.6, e.z + 0.8), title: '🚪 Porte', sub: `Chez ${this.visits.active.def.name}`, actions: [{ key: 'E', label: 'Sortir' }] });
      if (input.hit('KeyE')) this.visits.exit();
      return;
    }
    const vdoor = !this.indoors && !this.vehicles.riding ? this.visits.nearestDoor() : null;
    if (vdoor) {
      const { v, door: dp } = vdoor;
      const open = this.visits.canVisit();
      this.ui.setPrompt({ pos: new THREE.Vector3(dp.x, this.player.pos.y + 2.6, dp.z), title: `🚪 Maison de ${v.met ? v.def.name : '???'}`, sub: open ? 'Tu peux rendre visite' : `${v.def.name} dort (visites de 6 h à 22 h)`, actions: [{ key: 'E', label: open ? 'Frapper à la porte' : 'Frapper doucement', dim: !open }] });
      if (input.hit('KeyE')) this.visits.enter(v);
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
    if (!this.indoors && Math.hypot(vil.mailbox.x - this.player.pos.x, vil.mailbox.z - this.player.pos.z) < 1.6) {
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

    // Archipel : panneaux des voyages, longue-vue, source chaude.
    const arch = this.archipelago;
    const sign = !this.indoors && arch.nearestSign();
    if (sign) {
      this.tips.show('voyage');
      this.ui.setPrompt({ pos: new THREE.Vector3(sign.x - 1.2, this.player.pos.y + 3.4, sign.z - 1.2), title: '🧭 Voyages', sub: 'Le bateau de Nérée relie les villages', actions: [{ key: 'E', label: 'Voyager' }] });
      if (input.hit('KeyE')) arch.open(sign);
      return;
    }
    if (!this.indoors && arch.nearTelescope()) {
      const t = this.world.islands.telescope;
      this.ui.setPrompt({ pos: new THREE.Vector3(t.x, t.y + 2.6, t.z), title: '🔭 Longue-vue', sub: this.world.sky.isNight ? 'Idéal pour observer les étoiles' : 'Vue sur tout l\'archipel', actions: [{ key: 'E', label: this.world.sky.isNight ? 'Observer le ciel' : 'Regarder au loin' }] });
      if (input.hit('KeyE')) arch.stargaze();
      return;
    }
    if (!this.indoors && !this.vehicles.riding && this.sled.nearStart()) {
      const st = this.sled.startSign;
      this.tips.show('luge');
      this.ui.setPrompt({ pos: new THREE.Vector3(st.x, this.player.pos.y + 3, st.z), title: '🛷 Course de luge', sub: this.sled.best ? `Record : ${this.sled.best.toFixed(1)} s` : 'Jusqu\'en bas du Pic, en passant les portes', actions: [{ key: 'E', label: 'Descendre la piste' }] });
      if (input.hit('KeyE')) this.sled.begin();
      return;
    }
    const bs = this.world.islands.bandstand;
    if (bs && !this.indoors && !this.vehicles.riding && Math.hypot(bs.x - this.player.pos.x, bs.z - this.player.pos.z) < 3 && this.player.pos.y > bs.y - 0.3) {
      this.tips.show('kiosque');
      this.ui.setPrompt({ pos: new THREE.Vector3(bs.x, bs.y + 2.6, bs.z), title: '🎼 Kiosque à musique', sub: 'Les habitants adorent les concerts !', actions: [{ key: 'E', label: 'Jouer un air' }] });
      if (input.hit('KeyE')) this.playBandstand();
      return;
    }
    if (!this.indoors && !this.vehicles.riding && arch.inSpring()) {
      this.tips.show('source');
      const sp = this.world.islands.spring;
      this.ui.setPrompt({ pos: new THREE.Vector3(sp.x, sp.y + 2.2, sp.z), title: '♨️ Source chaude', sub: arch.bathedDay === this.world.sky.day ? 'Déjà détendu·e aujourd\'hui' : 'Bonus « Bien-être » une fois par jour', actions: [{ key: 'E', label: 'Se prélasser' }] });
      if (input.hit('KeyE')) arch.bathe();
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

  // --- Scènes de l'archipel ----------------------------------------------------------

  /** Chapitre 9 : tout Bourg-Sapin rassemblé, le grand sapin se rallume. */
  treeCeremony(done) {
    const B = LANDMARKS.bourg;
    this.inFinale = true;
    if (this.vehicles.riding) this.vehicles.dismount(true);
    this.standUp();
    this.ui.setPrompt(null);
    const gy = this.world.heightAt(B.x, B.z);
    const pins = ['aurele', 'elise', 'hugo', 'sacha'].map((id) => this.villagers.get(id));
    this.fade(() => {
      this.player.teleport(B.x, B.z + 6, Math.PI);
      pins.forEach((v, i) => {
        const a = Math.PI / 2 + (i - 1.5) * 0.55;
        const x = B.x + Math.cos(a) * 6.2;
        const z = B.z + Math.sin(a) * 6.2;
        v.character.setSit(false);
        v.override = { x, z, rot: Math.atan2(B.x - x, B.z - z) };
      });
      this.cam.setCinematic(new THREE.Vector3(B.x + 3, gy + 3.2, B.z + 15), new THREE.Vector3(B.x, gy + 5.5, B.z));
      this.cam.snap = true;
      this.ui.showHUD(false);
    }, 500);
    setTimeout(() => pins[0].say('Tout le monde est là… À toi l\'honneur !', 3000), 1400);
    setTimeout(() => {
      this.character.play('celebrate', 2.5);
      this.world.islands.setFirLit(true);
      this.audio.play('chapter');
      this.ui.levelBanner('🌲 Le grand sapin des Veilleurs brille à nouveau !');
      for (const v of pins) v.character.play('celebrate', 2);
    }, 3600);
    for (let k = 0; k < 10; k++) {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2;
        this.particles.emit(k % 3 ? 'sparkle' : 'heart', new THREE.Vector3(B.x + Math.cos(a) * 2.5, gy + 5 + Math.random() * 5, B.z + Math.sin(a) * 2.5), { count: 8, spread: 2.5, size: 0.9, life: 2 });
      }, 3800 + k * 450);
    }
    const lines = ['Magnifique…', 'Comme quand j\'étais petite !', 'Il n\'a jamais été aussi beau !', 'Merci, vraiment.'];
    pins.forEach((v, i) => setTimeout(() => v.say(lines[i], 3000), 5200 + i * 900));
    setTimeout(() => {
      this.fade(() => {
        for (const v of pins) {
          v.override = null;
          v.placeAt(v.scheduled(this.world.sky.hour));
        }
        this.inFinale = false;
        this.ui.showHUD(true);
        this.cam.setMode('follow');
        this.cam.yaw = this.player.rotY + Math.PI;
        this.cam.snap = true;
        done();
      }, 400);
    }, 10500);
  }

  /** Chapitre 10 : la conque chante, la baleine revient au large du lagon. */
  whaleEvent(spot, done) {
    this.inFinale = true;
    this.standUp();
    if (this.fishing.active) this.fishing.stop();
    this.ui.setPrompt(null);
    const dir = new THREE.Vector3(spot.dirX, 0, spot.dirZ).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const base = new THREE.Vector3(spot.x, 0, spot.z).addScaledVector(dir, 42).addScaledVector(side, -7);
    this.ui.showHUD(false);
    const w = whaleModel();
    w.root.position.copy(base).setY(-5);
    w.root.rotation.y = Math.atan2(side.x, side.z);
    this.scene.add(w.root);
    this.player.face(base.x, base.z);
    this.character.play('wave', 1.5);
    this.cam.setCinematic(new THREE.Vector3(spot.x, spot.y + 3, spot.z).addScaledVector(dir, -5).addScaledVector(side, 3), base.clone().setY(1.5));
    this.cam.snap = true;
    // Le chant : de longues notes graves qui glissent.
    this.audio.ensure();
    const song = [[220, 0.62, 0], [330, 0.55, 1.4], [262, 1.4, 3.0], [196, 0.7, 4.6], [294, 0.6, 6.2]];
    for (const [f, sl, t] of song) this.audio.tone(f, { t: t + 0.5, dur: 2.2, type: 'sine', vol: 0.12, slide: sl, bus: 'ambience', attack: 0.4 });
    this.ui.toast('🐚 Tu souffles dans la conque… Un chant grave lui répond, au loin.', 4500);
    const t0 = this.elapsed;
    const anim = () => {
      const t = this.elapsed - t0;
      const r = w.root;
      if (t < 2.2) r.position.y = -5 + (t / 2.2) * 4.3;
      else if (t < 6) {
        r.position.y = -0.7 + Math.sin(t * 1.3) * 0.15;
        r.position.addScaledVector(side, 0.02);
        if (!w.spout) {
          w.spout = true;
          for (let k = 0; k < 4; k++) setTimeout(() => this.particles.emit('smoke', r.position.clone().add(new THREE.Vector3(0, 2.5, 0)), { count: 5, spread: 1, size: 1.4, rise: 2.5, life: 2 }), k * 250);
        }
      } else if (t < 9.5) {
        const k = (t - 6) / 3.5;
        r.rotation.x = Math.sin(k * Math.PI) * 0.5;
        r.position.y = -0.7 - k * 4;
        w.tail.rotation.x = -Math.sin(k * Math.PI) * 0.9;
      }
      for (const f of w.fins) f.pivot.rotation.z = Math.sin(t * 1.6) * 0.25 * f.sx;
      if (t < 9.5) requestAnimationFrame(anim);
      else {
        this.particles.emit('sparkle', r.position.clone().setY(0.6), { count: 14, spread: 4, size: 1, life: 2 });
        this.scene.remove(r);
      }
    };
    requestAnimationFrame(anim);
    setTimeout(() => this.ui.levelBanner('🐋 La baleine est revenue !'), 3500);
    setTimeout(() => {
      this.inFinale = false;
      this.ui.showHUD(true);
      this.cam.setMode('follow');
      this.cam.yaw = this.player.rotY + Math.PI;
      this.cam.snap = true;
      const v = this.villagers.get('coralie');
      if (v) setTimeout(() => this.ui.toast(`${v.def.emoji} Coralie : « Tu l'as entendue ? Elle reviendra chaque été, maintenant. Merci ! »`, 5000), 800);
      done();
    }, 10500);
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
    // Limite d'images par seconde (réglages).
    const limit = this.settings.fpsLimit;
    if (limit && this.lastFrameAt !== undefined && time - this.lastFrameAt < 1000 / limit - 1) return;
    this.lastFrameAt = time;
    this.timer.update(time);
    const rawDt = this.timer.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.input.pollGamepad(dt, this.navigator.update(dt));
    this.elapsed += dt;
    const playing = this.state === 'play';
    const free = playing && !this.busy && this.panel !== 'pause' && this.panel !== 'settings';
    if (playing && this.panel !== 'pause') this.playtime = (this.playtime || 0) + dt;

    if (free && this.input.hit('Space') && this.player.grounded && !this.player.frozen) this.audio.play('jump');
    // Vœu sous une étoile filante (prioritaire sur les autres usages de F).
    if (this.wishT > 0) {
      this.wishT -= dt;
      if (free && this.input.hit('KeyF')) {
        this.makeWish();
        this.input.pressed.delete('KeyF');
      } else if (this.wishT <= 0) this.ui.wishPrompt?.(false);
    }
    const frozen = this.player.frozen;
    if (!free) this.player.frozen = true;
    this.player.update(dt, this.input, this.cam.yaw);
    this.player.frozen = frozen;
    this.footsteps.update(dt);
    if (this.state === 'title') this.world.sky.hour = 10 + Math.sin(this.elapsed * 0.02) * 0.5;

    // En pause (menu Échap, paramètres en cours de partie), le temps s'arrête.
    const paused = playing && (this.panel === 'pause' || this.panel === 'settings');
    const sdt = paused ? 0 : dt;
    const worldDt = this.state === 'title' ? 0 : sdt;
    this.world.update(worldDt, this.elapsed, this.player.pos, this.grassRadius, this.camera);
    this.world.sky.updateEnvironment(this.renderer);
    this.audio.setRain(this.state === 'play' && !this.indoors ? this.world.weather.rainAmt : 0);
    this.world.weather.indoors = this.indoors;
    this.visits.update(this.camera);
    this.animals.update(sdt, this.world.sky.isNight);
    this.villagers.update(sdt);
    this.resources.update(sdt);
    this.garden.update(sdt);
    this.fishing.update(sdt, this.input);
    this.insects.update(sdt);
    this.vehicles.update(sdt);
    this.sled.update(sdt);
    this.jobs.update(sdt);
    this.calendar.update(sdt);
    this.festivals.update(sdt);
    this.house.update(sdt, this.elapsed, this.camera);
    this.decor.update();
    const wish = this.musicMood();
    this.music.update(dt, wish.mood, wish.moment);
    this.audio.setMusicDuck(!!this.dialogue.open);
    this.particles.update(sdt);
    this.cam.update(dt, this.player, this.input, this.elapsed);
    this.guide.update(dt);
    this.updateAtmosphere(dt);

    if (playing) {
      if (free) this.updateInteractions();
      else if (!this.fishing.active) this.ui.setPrompt(null);
      this.quests.update();
      const z = this.indoors ? null : zoneAt(this.player.pos.x, this.player.pos.z);
      if (z !== this.zone) {
        if (z) {
          this.ui.zoneBanner(z);
          this.emit('zone', { zone: z.id });
          if (z.id === 'bourg' || z.id === 'port') setTimeout(() => this.tips.show(z.id), 2500);
        } else this.ui.setZoneLabel(this.house.inside ? { emoji: '🏡', name: 'Ta maison' } : this.visits.active ? { emoji: '🚪', name: `Chez ${this.visits.active.def.name}` } : null);
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

    this.renderer.info.reset();
    this.autoQuality.begin();
    this.postfx.render(dt);
    this.autoQuality.end();
    this.updateAutoQuality(rawDt);
    this.perf.update(rawDt);
    this.input.endFrame();
  }

  /** Données du jeu, pour les tests automatiques (scripts/quests-test.mjs). */
  debugData() {
    return { STORY, CHAPTERS, SIDE_QUESTS, ZONES, LANDMARKS, ITEMS, RECIPES, FURNITURE, VEHICLES, FISH, INSECTS, fishWhere };
  }

  /** Rapport de pixels utilisé (écran × netteté max × résolution de rendu). */
  fullPixelRatio() {
    const gs = this.graphics();
    return Math.min(window.devicePixelRatio || 1, gs.maxRatio) * gs.renderScale;
  }

  /** Qualité automatique : allège ou rétablit les réglages selon la fluidité mesurée. */
  updateAutoQuality(dt) {
    const gs = this.settings.graphics;
    if (!gs.auto || this.autoOff) return;
    // 60 images par seconde visées (ou la limite choisie, si elle est plus basse).
    const target = 1000 / Math.min(this.settings.fpsLimit || 60, 60);
    const level = this.autoQuality.update(dt, gs, target, window.devicePixelRatio || 1);
    if (this.autoQuality.struggle >= 3 && !this.struggleTold && this.state === 'play' && this.renderStyle !== 'cartoon') {
      this.struggleTold = true;
      this.ui.toast('🐢 Ton ordinateur a du mal avec le rendu réaliste : essaie le préréglage « Basse » (Paramètres → Graphismes), bien plus léger.', 9000);
    }
    if (level === null) return;
    this.settings.autoLevel = level;
    this.applyGraphics();
    saveSettings(this.settings);
  }

  /**
   * Ambiance musicale voulue à cet instant (voir core/music.js) : mood, et moment = vrai pour
   * une scène, la longue-vue ou la luge (la musique suit vite), faux pour un lieu (elle prend
   * son temps et se fond d'une chanson à l'autre).
   */
  musicMood() {
    const moment = (mood) => ({ mood, moment: true });
    const place = (mood) => ({ mood, moment: false });
    if (this.state !== 'play') return moment('magique');
    if (this.musicMoment && this.elapsed < this.musicMoment.until) return moment(this.musicMoment.mood);
    if (this.inFinale || (this.dialogue.open && this.dialogue.el?.classList.contains('heart-scene'))) return moment('tendre');
    if (this.archipelago.gazing) return moment('magique');
    if (this.sled.active) return moment('festif');
    // Un peu d'écart entre l'entrée et la sortie : pas d'aller-retour au bord d'une averse ou du café.
    const rain = this.world.weather.rainAmt;
    this.musicRain = rain > (this.musicRain ? 0.2 : 0.35);
    const p = this.player.pos;
    const cafe = this.world.village.shopSpots.cafe;
    this.musicCafe = !!cafe && Math.hypot(cafe.x - p.x, cafe.z - p.z) < (this.musicCafe ? 13 : 9);
    if (this.shop.isOpen) return place('mignon');
    if (this.indoors) return place('cozy');
    const sky = this.world.sky;
    const island = islandAt(p.x, p.z);
    if (this.musicRain) return place('melancolique');
    const fest = this.calendar.festival?.id;
    if (fest === 'etoiles' && sky.isNight) return place('magique');
    const festIsland = { port: 'corail', lanternes: 'pins', hiver: 'pins' }[fest] || (fest ? 'main' : null);
    if (festIsland === island && sky.hour >= 7 && sky.hour < 22) return place('festif');
    if (sky.isNight) return place('nuit');
    if (this.musicCafe) return place('mignon');
    if (island === 'pins') return place('montagnard');
    if (island === 'main' && (!this.zone || this.zone.id === 'village')) return place('leger');
    return place('nature');
  }

  /** Ambiance : lumière du post-traitement, sons, musique, étoiles filantes, aurores. */
  updateAtmosphere(dt) {
    const w = this.world;
    const sky = w.sky;
    const golden = sky.sunDir.y > 0 ? 1 - Math.min(1, sky.sunDir.y / 0.35) : 0;
    this.postfx.setMood({ night: sky.nightFactor, golden, flash: w.weather.flash * 0.25, fog: w.weather.fogAmt });
    const festival = this.calendar.festival?.id === 'etoiles';
    sky.shootEvery = festival ? [2, 5] : [16, 38];
    this.atmoT = (this.atmoT || 0) - dt;
    if (this.atmoT <= 0) {
      this.atmoT = 0.5;
      const p = this.player.pos;
      const island = islandAt(p.x, p.z);
      w.weather.auroraBoost = island === 'pins' ? 1 : 0.7;
      // Proximité de la mer : part des points alentour sous l'eau.
      let wet = 0;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        if (w.heightAt(p.x + Math.cos(a) * 14, p.z + Math.sin(a) * 14) < -0.3) wet++;
      }
      this.atmo = { sea: wet / 8, altitude: w.heightAt(p.x, p.z), island, animals: this.nearbyAnimalVoices() };
      this.audio.setMood(sky.isNight ? 'nuit' : island === 'pins' ? 'pins' : island === 'corail' ? 'corail' : 'village');
      // Astuces de première fois.
      if (this.state === 'play' && !this.busy && !this.panel) {
        if (!this.tips.seen.has('quete') && this.villagers.list.some((v) => v.root.visible && v.pos.distanceTo(p) < 14 && this.sideQuests.markerFor(v.def.id) === 'offer')) this.tips.show('quete');
        if (sky.isNight && !this.indoors && this.playtime > 60) this.tips.show('nuit');
        if (this.playtime > 240) this.tips.show('pause');
        this.ui.refreshBuffs();
      }
      // Chœur de l'aube : une fois par jour, dehors au petit matin, là où les oiseaux chantent.
      const zid = this.zone?.id;
      if (this.state === 'play' && !this.indoors && sky.hour >= 5 && sky.hour < 7.5 && ['foret', 'verger', 'prairie', 'colline', 'pinede'].includes(zid) && this.dawnDay !== sky.day && w.weather.rainAmt < 0.3 && w.weather.seasonIndex !== 3) {
        this.dawnDay = sky.day;
        this.emit('dawn', { zone: zid });
        this.ui.toast('🐦 Chut… écoute : le chœur des oiseaux de l\'aube !', 3200);
      }
    }
    const a = this.atmo || { sea: 0, altitude: 0 };
    this.audio.updateAmbience(dt, {
      hour: sky.hour, season: w.weather.seasonIndex, rain: w.weather.rainAmt, sea: a.sea, altitude: a.altitude,
      storm: w.weather.isStorm, inside: this.indoors, active: this.state === 'play',
      zone: this.zone?.id || null, island: a.island, animals: a.animals || [],
    });
  }

  /** Animaux proches qui peuvent se faire entendre (le plus proche de chaque espèce). */
  nearbyAnimalVoices() {
    const p = this.player.pos;
    const cam = this.camera;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const best = {};
    for (const a of this.animals.animals) {
      const d = a.pos.distanceTo(p);
      if (d > 22 || (best[a.species] && best[a.species].d < d)) continue;
      best[a.species] = { d, a };
    }
    return Object.entries(best).map(([species, { d, a }]) => {
      const dir = a.pos.clone().sub(cam.position).setY(0).normalize();
      return { species, pan: dir.dot(right) * 0.8, far: Math.min(0.85, d / 24) };
    });
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    // (Fenêtre passée sur un autre écran : la densité de pixels peut changer.)
    this.renderer.setPixelRatio(this.fullPixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.postfx.setSize(window.innerWidth, window.innerHeight);
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
    let pos = this.indoors ? this.indoorAnchor() : { x: this.player.pos.x, z: this.player.pos.z };
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
      archipelago: this.archipelago.serialize(),
      tips: this.tips.serialize(),
      visits: this.visits.serialize(),
      sideQuests: this.sideQuests.serialize(),
      sled: this.sled.serialize(),
      festivals: this.festivals.serialize(),
      stats: { playtime: Math.round(this.playtime || 0) },
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
    this.archipelago.restore(s.archipelago);
    this.tips.restore(s.tips);
    this.visits.restore(s.visits);
    this.sideQuests.restore(s.sideQuests);
    this.sled.restore(s.sled);
    this.festivals.restore(s.festivals);
    this.playtime = s.stats?.playtime || 0;
  }
}

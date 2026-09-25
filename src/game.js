import * as THREE from 'three';
import { World } from './world/world.js';
import { zoneAt } from './world/layout.js';
import { Character } from './player/character.js';
import { Player } from './player/player.js';
import { FollowCamera } from './player/camera.js';
import { DEFAULT_APPEARANCE, normalizeAppearance, randomAppearance } from './player/appearance.js';
import { AnimalManager } from './animals/manager.js';
import { FOODS } from './animals/species.js';
import { Resources, Fishing } from './game/activities.js';
import { Input } from './core/input.js';
import { Particles } from './core/particles.js';
import { Audio } from './core/audio.js';
import { loadSave, writeSave } from './core/save.js';
import { UI } from './ui/ui.js';
import { Creator } from './ui/creator.js';
import { PetsPanel } from './ui/pets.js';

const PET_NAMES = ['Moka', 'Caramel', 'Noisette', 'Biscuit', 'Plume', 'Pépite', 'Brioche', 'Praline', 'Nougat', 'Mochi', 'Tofu', 'Pistache', 'Câlin', 'Filou', 'Guimauve', 'Cannelle', 'Pompon', 'Réglisse'];

// Chef d'orchestre : rendu, boucle, états (titre / création / jeu), sauvegarde.

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 900);

    this.input = new Input(canvas);
    this.audio = new Audio();
    this.world = new World(this.scene);
    this.particles = new Particles(this.scene);

    this.save = loadSave();
    const appearance = this.save ? normalizeAppearance(this.save.appearance) : { ...DEFAULT_APPEARANCE };
    this.character = new Character(appearance);
    this.scene.add(this.character.root);
    this.player = new Player(this.world, this.character);
    this.animals = new AnimalManager(this);
    this.scene.add(this.animals.group);
    this.inventory = Object.fromEntries(Object.keys(FOODS).map((k) => [k, 0]));
    this.resources = new Resources(this);
    this.fishing = new Fishing(this);
    this.cam = new FollowCamera(this.camera, this.world);

    this.ui = new UI(this);
    this.creator = new Creator(this);
    this.pets = new PetsPanel(this);

    this.state = 'title';
    this.panel = null;
    this.elapsed = 0;
    this.saveT = 0;
    this.dirty = false;
    this.zone = null;
    this.target = null;

    if (this.save) this.restore(this.save);
    this.world.village.setPlayerName(this.character.appearance.name);
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
  }

  // --- États -------------------------------------------------------------------

  newGame() {
    this.audio.ensure();
    const a = { ...randomAppearance(), name: this.character.appearance.name || 'Lou' };
    this.setAppearance(a);
    this.inventory = Object.fromEntries(Object.keys(FOODS).map((k) => [k, 0]));
    this.inventory.baie = 3;
    this.world.sky.hour = 8.5;
    this.world.sky.day = 1;
    // Point de départ : au sud de la place, la fontaine en arrière-plan.
    this.player.teleport(0, 6.2, 0);
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
    this.ui.refreshInventory();
    this.ui.refreshFollowers();
    if (this.isNewGame) {
      this.isNewGame = false;
      this.ui.toast(`Bienvenue à Doucebrise, ${this.character.appearance.name} ! 🌸`, 4200);
      setTimeout(() => this.ui.toast('Approche-toi d\'un animal et appuie sur E pour le caresser. (H = aide)', 5200), 1500);
      this.requestSave();
    }
  }

  openPanel(name) {
    if (this.state === 'title' && name !== 'creator') return;
    if (this.panel === name) {
      this.closePanels();
      return;
    }
    this.closePanels(true);
    this.panel = name;
    this.ui.openPanel = name;
    if (this.fishing.active) this.fishing.stop();
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
      case 'help':
        document.querySelector('#help').classList.remove('hidden');
        break;
      default:
        break;
    }
  }

  closePanels(silent = false) {
    for (const id of ['#creator', '#pets', '#map', '#help']) document.querySelector(id).classList.add('hidden');
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

  toggleMusic() {
    const on = this.audio.toggleMusic();
    document.querySelector('#btn-music').classList.toggle('off', !on);
    this.ui.toast(on ? '🎵 Musique activée' : '🔇 Musique coupée', 1500);
    this.requestSave();
  }

  onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (this.state === 'title') return;
    if (!document.querySelector('#dialog').classList.contains('hidden')) return;
    if (this.state === 'creator') {
      if (e.code === 'Escape') this.closePanels();
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
      default:
        break;
    }
  }

  // --- Interactions ------------------------------------------------------------

  updateInteractions() {
    const input = this.input;
    if (this.fishing.active) {
      const bite = this.fishing.state === 'bite';
      const pos = this.player.pos.clone().add(new THREE.Vector3(0, 2.3, 0));
      this.ui.setPrompt({ pos, title: bite ? '🎣 Ça mord !' : '🎣 Patience…', actions: [{ key: 'E', label: bite ? 'Ferrer !' : 'Remonter la ligne' }] });
      if (input.hit('KeyE')) this.fishing.action();
      return;
    }

    const animal = this.animals.nearest();
    if (animal) {
      const a = animal;
      const inv = this.inventory;
      const hasFood = Object.values(inv).some((n) => n > 0);
      const favKnown = this.animals.discovered[a.species]?.fav;
      const favFood = FOODS[a.sp.fav];
      const feedLabel = hasFood ? (inv[a.sp.fav] > 0 ? `Donner ${favFood.emoji}${favKnown ? ' (préféré !)' : ''}` : 'Donner à manger') : 'Donner à manger (sac vide)';
      const actions = [
        { key: 'E', label: a.state === 'sleep' ? 'Caresser (il dort…)' : 'Caresser' },
        { key: 'F', label: feedLabel, dim: !hasFood },
      ];
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

    const res = this.resources.nearest();
    if (res) {
      this.ui.setPrompt({ pos: new THREE.Vector3(res.x, res.y + 0.9, res.z), title: `${FOODS[res.item].emoji} ${FOODS[res.item].label}`, actions: [{ key: 'E', label: res.label }] });
      if (input.hit('KeyE')) this.resources.harvest(res);
      return;
    }

    const spot = this.fishing.nearestSpot();
    if (spot) {
      this.ui.setPrompt({ pos: new THREE.Vector3(spot.x, spot.y + 2.4, spot.z), title: `🎣 Coin de pêche`, sub: spot.name, actions: [{ key: 'E', label: 'Pêcher' }] });
      if (input.hit('KeyE')) this.fishing.start(spot);
      return;
    }
    this.ui.setPrompt(null);
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

    if (playing) {
      if (this.input.hit('Space') && this.player.grounded && !this.player.frozen) this.audio.play('jump');
      this.player.update(dt, this.input, this.cam.yaw);
    } else {
      this.player.frozen = true;
      this.player.update(dt, this.input, this.cam.yaw);
      this.player.frozen = false;
    }
    if (this.state === 'title') this.world.sky.hour = 10 + Math.sin(this.elapsed * 0.02) * 0.5;

    this.world.update(this.state === 'title' ? 0 : dt, this.elapsed, this.player.pos);
    this.animals.update(dt, this.world.sky.isNight);
    this.resources.update(dt);
    this.fishing.update(dt, this.input);
    this.particles.update(dt);
    this.cam.update(dt, this.player, this.input, this.elapsed);

    if (playing) {
      this.updateInteractions();
      const z = zoneAt(this.player.pos.x, this.player.pos.z);
      if (z !== this.zone) {
        if (z) this.ui.zoneBanner(z);
        else this.ui.setZoneLabel(null);
        this.zone = z;
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
    const sky = this.world.sky;
    writeSave({
      appearance: this.character.appearance,
      player: { x: +this.player.pos.x.toFixed(2), z: +this.player.pos.z.toFixed(2), rotY: +this.player.rotY.toFixed(2) },
      time: { hour: +sky.hour.toFixed(3), day: sky.day },
      inventory: this.inventory,
      animals: this.animals.serialize(),
      resources: this.resources.serialize(),
      fishing: this.fishing.best,
      settings: { music: this.audio.musicOn },
    });
  }

  restore(s) {
    if (s.player) this.player.teleport(s.player.x, s.player.z, s.player.rotY);
    if (s.time) {
      this.savedTime = s.time;
      this.world.sky.hour = s.time.hour;
      this.world.sky.day = s.time.day;
    }
    if (s.inventory) Object.assign(this.inventory, s.inventory);
    this.animals.restore(s.animals);
    this.resources.restore(s.resources);
    if (s.fishing) this.fishing.best = s.fishing;
    // Remet l'heure sauvegardée après l'animation de l'écran titre.
    const btn = document.querySelector('#btn-continue');
    btn.addEventListener('click', () => {
      this.world.sky.hour = this.savedTime?.hour ?? 8.5;
    }, { once: true });
  }
}

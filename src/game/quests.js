import { ITEMS, RECIPES } from './items.js';
import { createRng } from '../core/math.js';

// Quêtes : une histoire guidée (tutoriel puis objectifs) et des demandes du jour.

const ev = (event, count, label, filter = null) => ({ event, count, label, filter });
const st = (check, count, label) => ({ check, count, label });

export const STORY = [
  {
    id: 'bienvenue', title: 'Bienvenue à Doucebrise', giver: 'rose',
    desc: 'Mamie Rose, la jardinière, aimerait te rencontrer. Sa maison a un toit vert, au sud de la place.',
    goals: [ev('talk', 1, 'Parler à Mamie Rose', (d) => d.villager.def.id === 'rose')],
    reward: { coins: 50, items: { 'sem-carotte': 3 } },
  },
  {
    id: 'potager', title: 'Le potager', giver: 'rose',
    desc: 'Ton jardin, derrière ta maison, a 9 parcelles. Plante tes semis de carotte et arrose-les.',
    goals: [ev('plant', 1, 'Planter un semis'), ev('water', 1, 'Arroser une parcelle')],
    reward: { coins: 30, items: { 'sem-fraise': 2 } },
  },
  {
    id: 'amis', title: 'Des amis à poils', giver: null,
    desc: 'Les animaux de l\'île adorent les câlins. Approche-toi doucement et caresse-les (E).',
    goals: [ev('pet', 3, 'Caresser des animaux')],
    reward: { coins: 20, items: { friandise: 2 } },
  },
  {
    id: 'gourmand', title: 'Petit gourmand', giver: null,
    desc: 'Chaque espèce a un plat préféré. Essaie différentes nourritures (F) pour le découvrir !',
    goals: [ev('feed', 1, 'Donner son plat préféré à un animal', (d) => d.fav)],
    reward: { coins: 40 },
  },
  {
    id: 'cueillette', title: 'Cueillette', giver: null,
    desc: 'Baies, pommes, champignons, coquillages, fleurs… L\'île regorge de trésors.',
    goals: [ev('gather', 8, 'Cueillir ou ramasser des objets')],
    reward: { coins: 50 },
  },
  {
    id: 'marche', title: 'Au marché', giver: 'pomme',
    desc: 'Pomme, au stand rayé de la place, achète tout ce que tu trouves.',
    goals: [ev('sell', 1, 'Vendre quelque chose à Pomme')],
    reward: { coins: 40 },
  },
  {
    id: 'recolte', title: 'Première récolte', giver: 'rose',
    desc: 'Arrose ton potager chaque jour (la pluie le fait pour toi) jusqu\'à la récolte.',
    goals: [ev('harvest', 1, 'Récolter une parcelle')],
    reward: { coins: 40, items: { 'sem-tomate': 3 } },
  },
  {
    id: 'peche', title: 'Graine de pêcheur', giver: 'marin',
    desc: 'Au bout du ponton ou à l\'étang : attends que le flotteur plonge, puis ferre (E) !',
    goals: [ev('catch', 3, 'Pêcher des poissons')],
    reward: { coins: 80 },
  },
  {
    id: 'adoption', title: 'Une nouvelle famille', giver: null,
    desc: 'Remplis les 5 cœurs d\'un animal pour pouvoir l\'adopter (R).',
    goals: [ev('adopt', 1, 'Adopter un animal')],
    reward: { coins: 100, furniture: { panier: 1 } },
  },
  {
    id: 'chezsoi', title: 'Chez soi', giver: 'bruno',
    desc: 'Bruno fabrique des meubles. Achète-en un, puis entre chez toi et décore (touche B).',
    goals: [ev('buy', 1, 'Acheter un meuble', (d) => d.shop === 'menuiserie'), ev('place', 1, 'Placer un meuble')],
    reward: { coins: 100 },
  },
  {
    id: 'cuisine', title: 'Petit chef', giver: null,
    desc: 'Utilise la cuisinière de ta maison pour préparer un plat.',
    goals: [ev('cook', 1, 'Cuisiner un plat')],
    reward: { coins: 60, items: { 'sem-mais': 2 } },
  },
  {
    id: 'voisins', title: 'Bon voisin', giver: null,
    desc: 'Les habitants apprécient les cadeaux et ont parfois besoin d\'aide (icône « ! »).',
    goals: [ev('gift', 1, 'Offrir un cadeau'), ev('request', 1, 'Terminer une demande du jour')],
    reward: { coins: 150 },
  },
  {
    id: 'amitie', title: 'Une belle amitié', giver: null,
    desc: 'Discute chaque jour avec les habitants et offre-leur ce qu\'ils aiment.',
    goals: [st((g) => Math.max(...g.villagers.list.map((v) => v.friendship)), 40, 'Atteindre 2 cœurs avec un habitant')],
    reward: { coins: 200 },
  },
  {
    id: 'carnet', title: 'Naturaliste', giver: 'noe',
    desc: 'Noé veut connaître tous les animaux de l\'île ! Caresse-les pour remplir ton carnet.',
    goals: [st((g) => Object.values(g.animals.discovered).reduce((s, d) => s + d.variants.length, 0), 12, 'Découvrir des pelages')],
    reward: { coins: 250, furniture: { 'arbre-chat': 1 } },
  },
  {
    id: 'famille', title: 'Grande famille', giver: null,
    desc: 'Un chat, un chien, un lapin… Et pourquoi pas tous ?',
    goals: [st((g) => g.animals.companions().length, 3, 'Adopter des animaux')],
    reward: { coins: 300, unlock: 'hat:etoile' },
  },
  {
    id: 'citrouille', title: 'La citrouille géante', giver: 'rose',
    desc: 'Les citrouilles demandent de la patience… Mamie Rose vend les semis.',
    goals: [ev('harvest', 1, 'Récolter une citrouille', (d) => d.crop === 'citrouille')],
    reward: { coins: 300 },
  },
  {
    id: 'coeur', title: 'Le cœur de Doucebrise', giver: null,
    desc: 'Deviens le meilleur ami d\'un habitant de l\'île.',
    goals: [st((g) => Math.max(...g.villagers.list.map((v) => v.friendship)), 100, 'Atteindre 5 cœurs avec un habitant')],
    reward: { coins: 500, furniture: { trophee: 1 } },
  },
];

const INTROS = [
  'Tu pourrais m\'aider ?',
  'J\'ai une petite faim…',
  'C\'est pour une recette secrète !',
  'Je prépare une surprise pour quelqu\'un.',
  'J\'en rêve depuis ce matin !',
  'C\'est pour décorer ma maison.',
];

export class Quests {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.progress = {};
    this.completed = [];
    this.requests = [];
    this.requestDay = 0;
    this.stats = { cooked: 0, fish: 0, sold: 0, earned: 0 };
    const events = ['talk', 'plant', 'water', 'harvest', 'pet', 'feed', 'gather', 'sell', 'catch', 'adopt', 'buy', 'place', 'cook', 'gift', 'request'];
    for (const e of events) game.on(e, (d) => this.onEvent(e, d));
    game.on('friendship', () => this.check());
    game.on('sell', (d) => {
      this.stats.sold += d.count;
      this.stats.earned += d.total;
    });
    game.on('cook', () => this.stats.cooked++);
    game.on('catch', () => this.stats.fish++);
  }

  get current() {
    return STORY[this.index] || null;
  }

  goalProgress(q, i) {
    const goal = q.goals[i];
    if (goal.check) return Math.min(goal.count, goal.check(this.game) || 0);
    return Math.min(goal.count, this.progress[`${q.id}:${i}`] || 0);
  }

  onEvent(type, data) {
    const q = this.current;
    if (!q) return;
    q.goals.forEach((goal, i) => {
      if (goal.event !== type) return;
      if (goal.filter && !goal.filter(data || {})) return;
      const key = `${q.id}:${i}`;
      const inc = type === 'gather' ? data?.count || 1 : 1;
      this.progress[key] = (this.progress[key] || 0) + inc;
    });
    this.check();
  }

  check() {
    const q = this.current;
    if (!q) return;
    const done = q.goals.every((_, i) => this.goalProgress(q, i) >= q.goals[i].count);
    this.game.ui.refreshQuest();
    if (!done) return;
    this.completed.push(q.id);
    this.index++;
    this.game.grantReward(q.reward, null, `📜 Quête terminée : ${q.title} !`);
    this.game.audio.play('adopt');
    this.game.requestSave();
    const next = this.current;
    if (next) setTimeout(() => this.game.ui.toast(`📜 Nouvelle quête : ${next.title}`, 3500), 1600);
    else setTimeout(() => this.game.ui.toast('🌟 Tu as terminé toute l\'histoire de Doucebrise ! Merci d\'avoir joué ♥', 6000), 1600);
    this.game.ui.refreshQuest();
    // Une quête peut être déjà remplie (objectifs d'état).
    setTimeout(() => this.check(), 50);
  }

  // --- Demandes du jour ---------------------------------------------------------

  refreshRequests() {
    const g = this.game;
    const day = g.world.sky.day;
    if (this.requestDay === day) return;
    this.requestDay = day;
    const rng = createRng(day * 977 + 13);
    const pool = ['baie', 'pomme', 'carotte', 'poisson', 'champignon', 'coquillage', 'fleur', 'graine'];
    if (day >= 3) pool.push('fraise', 'tomate', 'mais');
    if (day >= 5) pool.push('citrouille');
    const known = g.cooking ? g.cooking.known : new Set();
    for (const r of RECIPES) if (known.has(r.id) && r.id !== 'friandise') pool.push(r.id);
    const villagers = [...g.villagers.list].sort(() => rng() - 0.5).slice(0, 3);
    this.requests = villagers.map((v) => {
      let item = rng.pick(pool);
      if (v.def.dislikes.includes(item)) item = rng.pick(pool);
      const price = ITEMS[item].price;
      const count = price >= 60 ? 1 : price >= 20 ? rng.int(1, 3) : rng.int(2, 5);
      return {
        villager: v.def.id,
        item,
        count,
        reward: Math.round((price * count * 1.8 + 25) / 5) * 5,
        text: rng.pick(INTROS),
        done: false,
      };
    });
  }

  requestFor(villagerId) {
    return this.requests.find((r) => r.villager === villagerId) || null;
  }

  serialize() {
    return { i: this.index, p: this.progress, c: this.completed, r: this.requests, d: this.requestDay, s: this.stats };
  }

  restore(d) {
    if (!d) return;
    this.index = d.i || 0;
    this.progress = d.p || {};
    this.completed = d.c || [];
    this.requests = d.r || [];
    this.requestDay = d.d || 0;
    this.stats = { ...this.stats, ...(d.s || {}) };
  }
}

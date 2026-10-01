import { createRng } from '../core/math.js';
import { FURNITURE } from '../house/furniture.js';
import { ZONES } from '../world/layout.js';

// Progression : métiers (XP et niveaux), défis du jour, succès, titres
// et carnet d'étoiles (une piste de récompenses).

// --- Métiers --------------------------------------------------------------------

export const SKILLS = {
  peche: { label: 'Pêche', emoji: '🎣', perk: 'Ça mord plus vite et les poissons rares viennent plus souvent.', title: 'Maître pêcheur' },
  jardin: { label: 'Jardinage', emoji: '🌱', perk: 'Chance de récolte double au potager.', title: 'Main verte' },
  cuisine: { label: 'Cuisine', emoji: '🍳', perk: 'Chance de cuisiner un plat en plus.', title: 'Grand chef' },
  soins: { label: 'Soins des animaux', emoji: '🐾', perk: 'Les animaux te font confiance plus vite.', title: 'Ami des bêtes' },
  cueillette: { label: 'Cueillette', emoji: '🧺', perk: 'Chance de ramasser un objet en plus.', title: 'Glaneur·se' },
  insectes: { label: 'Insectes', emoji: '🦋', perk: 'Les insectes t\'échappent moins souvent.', title: 'Entomologiste' },
  service: { label: 'Petits boulots', emoji: '📋', perk: 'Les petits boulots rapportent davantage.', title: 'Pilier du village' },
};

/** XP cumulée pour atteindre chaque niveau (index = niveau - 1). */
export const LEVELS = [0, 50, 130, 250, 420, 650, 950, 1350, 1850, 2500];
export const MAX_LEVEL = LEVELS.length;

/** Récompenses de niveau, communes à tous les métiers + spécifiques. */
const SKILL_REWARDS = {
  peche: { 2: { items: { appat: 5 } }, 3: { unlock: 'rod:fibre' }, 5: { furniture: { 'trophee-peche': 1 } }, 7: { items: { appat: 15 } }, 10: { unlock: 'rod:doree', clothing: 'hat:marin' } },
  jardin: { 2: { items: { 'sem-fraise': 5 } }, 3: { items: { 'sem-citrouille': 3 } }, 5: { furniture: { 'pot-fleurs': 2 } }, 7: { items: { 'sem-mais': 8 } }, 10: { clothing: 'hat:fleur', furniture: { arche: 1 } } },
  cuisine: { 2: { items: { friandise: 3 } }, 3: { recipe: 'jus' }, 5: { furniture: { 'plan-travail': 1 } }, 7: { recipe: 'soupe' }, 10: { clothing: 'hat:chef' } },
  soins: { 2: { items: { friandise: 4 } }, 3: { items: { patee: 3 } }, 5: { furniture: { panier: 1 } }, 7: { furniture: { 'lit-chat': 1 } }, 10: { furniture: { 'statue-chat': 1 } } },
  cueillette: { 2: { items: { baie: 10 } }, 3: { items: { appat: 5 } }, 5: { furniture: { 'caisse-fruits': 1 } }, 7: { items: { friandise: 5 } }, 10: { furniture: { 'coussin-coeur': 2 } } },
  insectes: { 2: { items: { friandise: 2 } }, 3: { furniture: { plante: 1 } }, 5: { furniture: { 'lampe-lune': 1 } }, 7: { clothing: 'back:papillon' }, 10: { furniture: { 'vitrine-papillons': 1 } } },
  service: { 2: { coins: 100 }, 3: { furniture: { 'tabouret': 2 } }, 5: { clothing: 'back:sacChat' }, 7: { furniture: { 'horloge-comtoise': 1 } }, 10: { furniture: { 'lit-baldaquin': 1 } } },
};

export function levelFor(xp) {
  let lvl = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lvl = i + 1;
  return lvl;
}

// --- Défis du jour ------------------------------------------------------------------

// Défi proposé seulement quand il est faisable à ce stade (outil obtenu, activité découverte).
const done = (id) => (g) => g.quests.completed.includes(id);
const CAN = {
  feed: done('amis'),
  catch: done('peche'),
  rare: done('peche'),
  harvest: (g) => g.garden.plots.some((p) => p.crop) || done('recolte')(g),
  water: done('potager'),
  gift: (g) => g.villagers.list.filter((v) => v.met).length >= 2,
  talk: (g) => g.villagers.list.filter((v) => v.met).length >= 4,
  cook: done('cuisine'),
  sell: done('marche'),
  insect: (g) => g.unlocks.has('tool:filet'),
  job: done('boulot'),
  play: (g) => g.unlocks.has('tool:plumeau'),
};

export const CHALLENGES = [
  { id: 'pet', event: 'pet', count: 5, label: 'Caresse 5 animaux', emoji: '🤲' },
  { id: 'feed', event: 'feed', count: 3, label: 'Nourris 3 animaux', emoji: '🥕' },
  { id: 'catch', event: 'catch', count: 3, label: 'Pêche 3 poissons', emoji: '🐟' },
  { id: 'harvest', event: 'harvest', count: 4, label: 'Récolte 4 légumes ou fruits', emoji: '🥬', amount: true },
  { id: 'gather', event: 'gather', count: 8, label: 'Ramasse 8 trouvailles', emoji: '🧺', amount: true },
  { id: 'talk', event: 'talk', count: 4, label: 'Discute avec 4 habitants', emoji: '💬', distinct: true },
  { id: 'gift', event: 'gift', count: 2, label: 'Offre 2 cadeaux', emoji: '🎁' },
  { id: 'cook', event: 'cook', count: 2, label: 'Cuisine 2 plats', emoji: '🍳' },
  { id: 'sell', event: 'sell', count: 200, label: 'Gagne 200 🪙 au marché', emoji: '💰', total: true },
  { id: 'insect', event: 'insect', count: 2, label: 'Attrape 2 insectes', emoji: '🦋' },
  { id: 'photo', event: 'photo', count: 1, label: 'Prends une photo souvenir', emoji: '📷' },
  { id: 'dance', event: 'emote', count: 1, label: 'Danse sur la place (touche 2)', emoji: '💃', filter: (d) => d.name === 'dance' },
  { id: 'job', event: 'job', count: 1, label: 'Termine un petit boulot', emoji: '📋' },
  { id: 'play', event: 'play', count: 2, label: 'Joue avec 2 animaux (touche G)', emoji: '🪶' },
  { id: 'water', event: 'water', count: 4, label: 'Arrose 4 parcelles', emoji: '💧' },
  { id: 'cat', event: 'pet', count: 3, label: 'Caresse 3 chats', emoji: '🐱', filter: (d) => d.animal?.species === 'chat' },
  { id: 'rare', event: 'catch', count: 1, label: 'Pêche un poisson rare', emoji: '✨', filter: (d) => d.rarity >= 2 },
];

// --- Succès ---------------------------------------------------------------------------

const A = (id, label, desc, check, reward = {}) => ({ id, label, desc, check, reward: { stars: 5, ...reward } });
export const ACHIEVEMENTS = [
  A('premiers-pas', 'Premiers pas', 'Terminer la première quête.', (g) => g.quests.completed.length >= 1),
  A('calin', 'Câlin', 'Caresser un animal.', (g, s) => s.pet >= 1),
  A('calin-100', 'Pluie de câlins', 'Caresser 100 fois des animaux.', (g, s) => s.pet >= 100, { coins: 300 }),
  A('adoption', 'Nouvelle famille', 'Adopter un animal.', (g) => g.animals.companions().length >= 1),
  A('adoption-5', 'Maison pleine', 'Adopter 5 animaux.', (g) => g.animals.companions().length >= 5, { coins: 500, title: 'Grande famille' }),
  A('chat-habille', 'Petit mannequin', 'Habiller un compagnon de la tête aux pattes (4 pièces).', (g) => g.animals.companions().some((a) => Object.keys(a.outfit).length >= 4), { coins: 300 }),
  A('pasteque-6', 'Fan de pastèque', 'Avoir 6 meubles ou décorations de la collection pastèque.', (g) => {
    const h = g.house;
    const ids = new Set([...Object.keys(h.storage).filter((id) => h.storage[id] > 0), ...h.placed.map((p) => p.id)]);
    return [...ids].filter((id) => FURNITURE[id]?.cat === 'pasteque').length >= 6;
  }, { title: 'Cœur de pastèque', coins: 600 }),
  A('chats-3', 'Reine des chats', 'Adopter 3 chats.', (g) => g.animals.companions().filter((a) => a.species === 'chat').length >= 3, { title: 'Reine des chats', furniture: { 'statue-chat': 1 } }),
  A('carnet-20', 'Naturaliste', 'Découvrir 20 pelages.', (g) => Object.values(g.animals.discovered).reduce((t, d) => t + d.variants.length, 0) >= 20, { coins: 400 }),
  A('carnet-40', 'Encyclopédie vivante', 'Découvrir 40 pelages.', (g) => Object.values(g.animals.discovered).reduce((t, d) => t + d.variants.length, 0) >= 40, { title: 'Naturaliste', coins: 800 }),
  A('poisson', 'Ça mord !', 'Pêcher un poisson.', (g, s) => s.catch >= 1),
  A('poisson-50', 'Pêcheur du dimanche', 'Pêcher 50 poissons.', (g, s) => s.catch >= 50, { coins: 400 }),
  A('poisson-rare', 'Prise rare', 'Pêcher un poisson rare.', (g, s) => s.rareFish >= 1),
  A('legende', 'Légende des mers', 'Pêcher un poisson légendaire.', (g, s) => s.legendFish >= 1, { title: 'Légende des mers', coins: 1000 }),
  A('aquarium-15', 'Ichtyologiste', 'Pêcher 15 espèces différentes.', (g) => Object.keys(g.fishing.best).length >= 15, { furniture: { aquarium: 1 } }),
  A('potager', 'Premier semis', 'Planter une graine.', (g, s) => s.plant >= 1),
  A('recolte-50', 'Belle saison', 'Récolter 50 légumes ou fruits.', (g, s) => s.harvest >= 50, { coins: 400 }),
  A('citrouille', 'Citrouille géante', 'Récolter une citrouille.', (g, s) => s.pumpkins >= 1),
  A('chef', 'Petit chef', 'Cuisiner un plat.', (g, s) => s.cook >= 1),
  A('chef-9', 'Livre de recettes', 'Connaître les 9 recettes.', (g) => g.cooking.known.size >= 9, { title: 'Cordon bleu', coins: 600 }),
  A('cueillette-100', 'Panier plein', 'Ramasser 100 trouvailles.', (g, s) => s.gather >= 100, { coins: 300 }),
  A('insecte', 'Attrapé !', 'Attraper un insecte.', (g, s) => s.insect >= 1),
  A('insectes-12', 'Collection complète', 'Attraper 12 espèces d\'insectes.', (g) => Object.keys(g.insects.caught).length >= 12, { title: 'Entomologiste', furniture: { 'vitrine-papillons': 1 } }),
  A('bavard', 'Bavard·e', 'Parler 30 fois aux habitants.', (g, s) => s.talk >= 30),
  A('ami', 'Ami·e fidèle', 'Atteindre 3 cœurs avec un habitant.', (g) => g.villagers.list.some((v) => v.friendship >= 60)),
  A('meilleur-ami', 'Meilleur·e ami·e', 'Atteindre 5 cœurs avec un habitant.', (g) => g.villagers.list.some((v) => v.friendship >= 100), { title: 'Cœur d\'or' }),
  A('tout-le-monde', 'Âme du village', 'Atteindre 3 cœurs avec tous les habitants.', (g) => g.villagers.list.every((v) => v.friendship >= 60), { title: 'Âme du village', coins: 1500 }),
  A('cadeaux-20', 'Généreux·se', 'Offrir 20 cadeaux.', (g, s) => s.gift >= 20, { coins: 300 }),
  A('demandes-10', 'Serviable', 'Terminer 10 demandes du jour.', (g, s) => s.request >= 10, { coins: 500 }),
  A('boulot', 'Premier salaire', 'Terminer un petit boulot.', (g, s) => s.job >= 1),
  A('boulots-20', 'Travailleur·se', 'Terminer 20 petits boulots.', (g, s) => s.job >= 20, { title: 'Pilier du village', coins: 800 }),
  A('riche-1000', 'Tirelire', 'Posséder 1 000 🪙.', (g) => g.coins >= 1000),
  A('riche-10000', 'Fortune de Doucebrise', 'Posséder 10 000 🪙.', (g) => g.coins >= 10000, { title: 'Magnat', furniture: { trophee: 1 } }),
  A('deco-10', 'Petit nid', 'Poser 10 meubles.', (g) => g.house.placed.length >= 10),
  A('deco-30', 'Maison de rêve', 'Poser 30 meubles.', (g) => g.house.placed.length >= 30, { title: 'Décorateur·rice', coins: 600 }),
  A('photo', 'Souvenir', 'Prendre une photo.', (g, s) => s.photo >= 1),
  A('danse', 'Pas de danse', 'Danser 10 fois.', (g, s) => s.dance >= 10),
  A('dodo', 'Bonne nuit', 'Dormir dans son lit.', (g, s) => s.sleep >= 1),
  A('saisons', 'Tour des saisons', 'Vivre les 4 saisons.', (g) => g.world.sky.day >= 10),
  A('defis-10', 'Challenger', 'Terminer 10 défis du jour.', (g, s) => s.challenge >= 10, { coins: 400 }),
  A('metier-5', 'Spécialiste', 'Atteindre le niveau 5 dans un métier.', (g) => Object.values(g.progress.xp).some((x) => levelFor(x) >= 5)),
  A('metier-10', 'Maître artisan', 'Atteindre le niveau 10 dans un métier.', (g) => Object.values(g.progress.xp).some((x) => levelFor(x) >= 10), { coins: 1000 }),
  A('etoiles-100', 'Pluie d\'étoiles', 'Gagner 100 étoiles.', (g) => g.progress.stars >= 100),
  A('concours', 'Champion·ne', 'Gagner un concours de pêche.', (g, s) => s.contest >= 1, { title: 'Champion·ne de pêche' }),
  A('vehicule', 'En route !', 'Acheter un véhicule.', (g) => Object.keys(g.vehicles.owned).length >= 1),
  A('garage-plein', 'Collectionneur·se', 'Posséder tous les véhicules.', (g) => Object.keys(g.vehicles.owned).length >= 6, { title: 'As du volant', coins: 1500 }),
  A('ciel', 'La tête dans les nuages', 'Voler en montgolfière.', (g, s) => s.fly >= 1),
  A('agrandir', 'Travaux terminés', 'Agrandir sa maison.', (g) => g.house.size >= 1, { coins: 300 }),
  A('chateau', 'Château de rêve', 'Agrandir sa maison au maximum.', (g) => g.house.size >= 2, { title: 'Châtelain·e', coins: 800 }),
  A('facade', 'Coup de pinceau', 'Personnaliser sa façade.', (g, s) => s.facade >= 1),
  A('courrier', 'Facteur de cœur', 'Lire 10 lettres.', (g, s) => s.mail >= 10),
  A('anniversaire', 'Joyeux anniversaire !', 'Offrir un cadeau d\'anniversaire.', (g, s) => s.birthday >= 1),
  A('scenes', 'Confident·e', 'Vivre 5 scènes d\'amitié.', (g, s) => s.heartEvent >= 5, { coins: 500 }),
  A('histoire', 'Le Cœur de Doucebrise', 'Rallumer le phare.', (g) => g.quests.lighthouseLit, { title: 'Cœur de Doucebrise', coins: 1000 }),
  A('chapitre-4', 'À mi-chemin', 'Terminer le chapitre 4.', (g) => g.quests.chapterIndex >= 4),
  // Archipel.
  A('bourg', 'Air de la montagne', 'Arriver à Bourg-Sapin.', (g) => g.progress.zones.has('bourg')),
  A('port', 'Parfum d\'iode', 'Arriver à Port-Corail.', (g) => g.progress.zones.has('port')),
  A('sommet', 'Sur le toit de l\'archipel', 'Atteindre le Pic des Neiges.', (g) => g.progress.zones.has('pic'), { coins: 300 }),
  A('cartographe', 'Cartographe', 'Découvrir tous les lieux de l\'archipel.', (g) => ZONES.every((z) => g.progress.zones.has(z.id)), { title: 'Cartographe', coins: 1000 }),
  A('voyage', 'Globe-trotter', 'Voyager d\'un village à l\'autre avec Nérée.', (g, s) => s.travel >= 1),
  A('source', 'Détente absolue', 'Se prélasser dans la source chaude.', (g, s) => s.bathe >= 1),
  A('etoile-filante', 'Fais un vœu', 'Faire un vœu sous une étoile filante.', (g, s) => s.wish >= 1),
  A('voeux-10', 'Attrape-étoiles', 'Faire 10 vœux sous les étoiles filantes.', (g, s) => s.wish >= 10, { title: 'Attrape-étoiles', furniture: { 'etoile-murale': 1 } }),
  A('veilleurs', 'Nuit des Veilleurs', 'Rallumer le grand sapin de Bourg-Sapin.', (g) => g.quests.completed.includes('sapin-rallume'), { coins: 400 }),
  A('baleine', 'Le chant du lagon', 'Faire revenir la baleine au large de l\'île Corail.', (g) => g.quests.completed.includes('chant-baleine'), { coins: 600 }),
  A('visite', 'Toc toc !', 'Rendre visite à un habitant chez lui.', (g) => Object.keys(g.visits.visitedDay).length >= 1),
  A('lieux-4', 'Touriste de l\'archipel', 'Entrer au Café des Chats, au garage de Léo, au Muséum des Pins et à l\'Aquarium du lagon.', (g) => g.visits.placesSeen.size >= 4, { title: 'Touriste', coins: 400 }),
  A('visites-16', 'Voisin·e de tout l\'archipel', 'Rendre visite aux 16 habitants.', (g) => Object.keys(g.visits.visitedDay).length >= 16, { title: 'Voisin·e modèle', coins: 800 }),
  A('kiosque', 'Première représentation', 'Jouer un air au kiosque à musique.', (g, s) => s.music >= 1),
  A('concert', 'Star du kiosque', 'Jouer au kiosque devant au moins 3 habitants.', (g, s) => s.concert >= 1, { title: 'Star du kiosque', coins: 300 }),
  A('luge', 'Descente du Pic', 'Terminer la course de luge du Pic des Neiges.', (g, s) => s.sled >= 1),
  A('luge-portes', 'Slalom parfait', 'Passer les 7 portes en une seule descente.', (g, s) => s.sledGates >= 1, { coins: 300 }),
  A('luge-record', 'Bolide des neiges', 'Descendre la piste de luge en moins de 7 secondes.', (g) => g.sled?.best != null && g.sled.best < 7, { title: 'Bolide des neiges', coins: 500 }),
  A('telescope', 'Astronome en herbe', 'Observer le ciel au télescope de Sacha.', (g, s) => s.stargaze >= 1),
  A('aquarium-30', 'Grand aquarium', 'Pêcher 30 espèces différentes.', (g) => Object.keys(g.fishing.best).length >= 30, { title: 'Maître pêcheur', furniture: { 'aquarium-geant': 1 } }),
  A('insectes-20', 'Muséum d\'histoire naturelle', 'Attraper 20 espèces d\'insectes.', (g) => Object.keys(g.insects.caught).length >= 20, { coins: 1200 }),
  A('service', 'Coup de main', 'Terminer une quête d\'habitant.', (g, s) => s.sidequest >= 1),
  A('service-15', 'Bon·ne samaritain·e', 'Terminer 15 quêtes d\'habitants.', (g, s) => s.sidequest >= 15, { coins: 800 }),
  A('service-all', 'Héros de l\'archipel', 'Terminer toutes les quêtes des habitants.', (g) => g.sideQuests?.allDone(), { title: 'Héros de l\'archipel', coins: 3000 }),
];

// --- Carnet d'étoiles ------------------------------------------------------------------

export const STAR_STEP = 10;
export const STAR_TRACK = [
  { coins: 100 }, { items: { friandise: 3 } }, { furniture: { 'coussin-coeur': 1 } }, { coins: 200 }, { clothing: 'hat:aureole' },
  { items: { appat: 10 } }, { furniture: { 'lanterne-papier': 1 } }, { coins: 300 }, { items: { patee: 5 } }, { furniture: { 'tapis-arcenciel': 1 } },
  { title: 'Étoile montante' }, { coins: 400 }, { clothing: 'back:ailesAnge' }, { furniture: { 'fauteuil-nuage': 1 } }, { items: { 'sem-citrouille': 5 } },
  { coins: 500 }, { furniture: { 'lampe-lune': 1 } }, { clothing: 'hat:chatBonnet' }, { items: { friandise: 10 } }, { furniture: { 'lit-chat': 1 } },
  { coins: 700 }, { furniture: { 'etoile-murale': 1 } }, { clothing: 'glasses:lune' }, { items: { appat: 20 } }, { furniture: { 'fontaine-chat': 1 } },
  { coins: 1000 }, { clothing: 'back:ailesArcEnCiel' }, { furniture: { 'statue-chat': 1 } }, { title: 'Étoile de Doucebrise' }, { coins: 2000, furniture: { trophee: 1 } },
];

// ----------------------------------------------------------------------------------------

export class Progress {
  constructor(game) {
    this.game = game;
    this.xp = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0]));
    this.skillRewards = [];
    this.stats = {};
    this.done = new Set();
    this.titles = new Set(['Nouveau venu']);
    this.title = 'Nouveau venu';
    this.stars = 0;
    this.starClaimed = 0;
    this.daily = { day: 0, list: [] };
    this.talkedToday = new Set();
    this.zones = new Set();

    const bump = (k, n = 1) => (this.stats[k] = (this.stats[k] || 0) + n);
    const on = (e, fn) => game.on(e, (d = {}) => {
      fn(d);
      this.onChallengeEvent(e, d);
      this.checkAchievements();
    });
    on('pet', () => bump('pet'));
    on('feed', () => bump('feed'));
    on('play', () => bump('play'));
    on('adopt', () => bump('adopt'));
    on('catch', (d) => {
      bump('catch');
      if (d.rarity >= 2) bump('rareFish');
      if (d.rarity >= 3) bump('legendFish');
    });
    on('plant', () => bump('plant'));
    on('water', () => bump('water'));
    on('harvest', (d) => {
      bump('harvest', d.count || 1);
      if (d.crop === 'citrouille') bump('pumpkins');
    });
    on('cook', () => bump('cook'));
    on('gather', (d) => bump('gather', d.count || 1));
    on('talk', () => bump('talk'));
    on('gift', (d) => {
      bump('gift');
      if (d.birthday) bump('birthday');
    });
    on('request', () => bump('request'));
    on('job', () => bump('job'));
    on('insect', () => bump('insect'));
    on('photo', () => bump('photo'));
    on('sleep', () => bump('sleep'));
    on('contest', () => bump('contest'));
    on('ride', (d) => {
      bump('ride');
      if (d.id === 'montgolfiere') bump('fly');
    });
    on('facade', () => bump('facade'));
    on('travel', () => bump('travel'));
    on('bathe', () => bump('bathe'));
    on('wish', () => bump('wish'));
    on('visit', () => bump('visit'));
    on('music', (d) => {
      bump('music');
      if (d.fans >= 3) bump('concert');
    });
    on('stargaze', () => bump('stargaze'));
    on('sled', (d) => {
      bump('sled');
      if (d.gates >= 7) bump('sledGates');
    });
    on('sidequest', () => bump('sidequest'));
    on('zone', (d) => this.zones.add(d.zone));
    on('mail', () => bump('mail'));
    on('heartEvent', () => bump('heartEvent'));
    on('vehicle', () => {});
    on('finale', () => {});
    on('upgrade', () => {});
    on('story', () => {});
    on('emote', (d) => {
      if (d.name === 'dance') bump('dance');
    });
    on('sell', () => {});
    on('place', () => {});
    on('friendship', () => {});
  }

  // --- Métiers ------------------------------------------------------------------------

  level(skill) {
    return levelFor(this.xp[skill] || 0);
  }

  /** Fraction de progression vers le niveau suivant. */
  levelProgress(skill) {
    const x = this.xp[skill] || 0;
    const l = levelFor(x);
    if (l >= MAX_LEVEL) return 1;
    return (x - LEVELS[l - 1]) / (LEVELS[l] - LEVELS[l - 1]);
  }

  addXp(skill, amount) {
    const g = this.game;
    const before = this.level(skill);
    if (g.archipelago?.relaxed) amount *= 1.2;
    this.xp[skill] = (this.xp[skill] || 0) + Math.round(amount);
    g.ui.xpPop?.(SKILLS[skill].emoji, Math.round(amount));
    const after = this.level(skill);
    if (after > before) {
      for (let l = before + 1; l <= after; l++) this.onLevelUp(skill, l);
    }
    g.requestSave();
  }

  onLevelUp(skill, lvl) {
    const g = this.game;
    const s = SKILLS[skill];
    g.ui.levelBanner?.(`${s.emoji} ${s.label} : niveau ${lvl} !`);
    g.audio.play('adopt');
    g.particles.emit('sparkle', g.player.pos.clone().setY(g.player.pos.y + 1.8), { count: 5, spread: 0.8 });
    const key = `${skill}:${lvl}`;
    if (this.skillRewards.includes(key)) return;
    this.skillRewards.push(key);
    const r = { stars: 3, coins: lvl * 40, ...(SKILL_REWARDS[skill]?.[lvl] || {}) };
    if (lvl === MAX_LEVEL) r.title = s.title;
    setTimeout(() => g.grantReward(r, null, `${s.emoji} Niveau ${lvl} :`), 900);
    this.checkAchievements();
  }

  /** Bonus liés aux niveaux. */
  perk(skill) {
    return this.level(skill) - 1;
  }

  // --- Défis du jour ------------------------------------------------------------------

  refreshDaily() {
    const day = this.game.world.sky.day;
    if (this.daily.day === day) return;
    const rng = createRng(day * 7919 + 5);
    // Faisables maintenant, et pas ceux d'hier (sauf s'il n'y a pas assez de choix).
    const g = this.game;
    const yesterday = new Set((this.daily.list || []).map((c) => c.id));
    const feasible = CHALLENGES.filter((c) => !CAN[c.id] || CAN[c.id](g));
    const fresh = feasible.filter((c) => !yesterday.has(c.id));
    const pool = [...(fresh.length >= 3 ? fresh : feasible)];
    const list = [];
    while (list.length < 3 && pool.length) {
      const c = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      if (list.some((x) => x.event === c.event)) continue;
      list.push({ id: c.id, progress: 0, done: false, reward: 50 + Math.floor(rng() * 5) * 15 });
    }
    this.daily = { day, list, bonus: false };
    this.talkedToday = new Set();
    this.game.ui.refreshChallenges?.();
  }

  challengeDef(id) {
    return CHALLENGES.find((c) => c.id === id);
  }

  onChallengeEvent(event, data) {
    if (!this.daily.list.length) return;
    let changed = false;
    for (const c of this.daily.list) {
      if (c.done) continue;
      const def = this.challengeDef(c.id);
      if (!def || def.event !== event) continue;
      if (def.filter && !def.filter(data)) continue;
      if (def.distinct) {
        const id = data.villager?.def.id;
        if (!id || this.talkedToday.has(id)) continue;
        this.talkedToday.add(id);
      }
      const inc = def.total ? data.total || 0 : def.amount ? data.count || 1 : 1;
      c.progress = Math.min(def.count, c.progress + inc);
      changed = true;
      if (c.progress >= def.count) {
        c.done = true;
        this.stats.challenge = (this.stats.challenge || 0) + 1;
        this.game.grantReward({ coins: c.reward, stars: 3 }, null, `🎯 Défi réussi : ${def.label} !`);
      }
    }
    if (!this.daily.bonus && this.daily.list.every((c) => c.done)) {
      this.daily.bonus = true;
      setTimeout(() => this.game.grantReward({ stars: 5, items: { friandise: 2 }, coins: 100 }, null, '🌟 Tous les défis du jour !'), 1500);
    }
    if (changed) this.game.ui.refreshChallenges?.();
  }

  // --- Succès ---------------------------------------------------------------------------

  checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (this.done.has(a.id)) continue;
      let ok = false;
      try {
        ok = a.check(this.game, this.stats);
      } catch {
        ok = false;
      }
      if (ok) {
        this.done.add(a.id);
        const g = this.game;
        setTimeout(() => g.grantReward(a.reward, null, `🏅 Succès : ${a.label} !`), 600);
      }
    }
  }

  // --- Étoiles & titres ------------------------------------------------------------------

  addStars(n) {
    this.stars += n;
    this.game.ui?.refreshName?.();
    // Paliers débloqués.
    while (this.starClaimed < STAR_TRACK.length && this.stars >= (this.starClaimed + 1) * STAR_STEP) {
      const tier = STAR_TRACK[this.starClaimed];
      this.starClaimed++;
      const idx = this.starClaimed;
      setTimeout(() => this.game.grantReward(tier, null, `⭐ Palier ${idx} du carnet d'étoiles :`), 1200 + idx * 50);
    }
  }

  addTitle(t) {
    if (this.titles.has(t)) return false;
    this.titles.add(t);
    return true;
  }

  setTitle(t) {
    if (this.titles.has(t)) this.title = t;
    this.game.ui.refreshName?.();
    this.game.requestSave();
  }

  // --- Sauvegarde --------------------------------------------------------------------------

  serialize() {
    return {
      xp: this.xp, sr: this.skillRewards, st: this.stats, done: [...this.done], titles: [...this.titles],
      title: this.title, stars: this.stars, sc: this.starClaimed, daily: this.daily, zones: [...this.zones],
    };
  }

  restore(d) {
    if (!d) return;
    Object.assign(this.xp, d.xp || {});
    this.skillRewards = d.sr || [];
    this.stats = d.st || {};
    this.done = new Set(d.done || []);
    this.titles = new Set(d.titles || ['Nouveau venu']);
    this.title = d.title || 'Nouveau venu';
    this.stars = d.stars || 0;
    this.starClaimed = d.sc || 0;
    if (d.daily) this.daily = d.daily;
    this.zones = new Set(d.zones || []);
  }
}


import { ITEMS, countItem, takeItem } from './items.js';
import { FISH, fishWhere } from './fish.js';
import { ZONES } from '../world/layout.js';

// Quêtes des habitants : chacun a ses histoires et ses petits services à rendre.
// Un « ! » doré au-dessus de la tête = une quête à proposer, un « ? » = quête à rendre.
// Certaines quêtes font voyager d'un village à l'autre (lettres, colis…).

// Objets de quête (ne se vendent pas, ne s'offrent pas).
const QUEST_ITEMS = {
  'lettre-rose': { label: 'Lettre de Mamie Rose', emoji: '✉️' },
  'plan-bruno': { label: 'Plan de Bruno', emoji: '📐' },
  'colis-leo': { label: 'Colis de Léo', emoji: '📦' },
  'panier-croissants': { label: 'Panier de croissants', emoji: '🧺' },
  'bouteille-neree': { label: 'Message de Nérée', emoji: '🍾' },
  'carnet-sacha': { label: 'Carnet de Sacha', emoji: '📓' },
  'toile-maelys': { label: 'Toile de Maëlys', emoji: '🖼️' },
};
for (const [id, it] of Object.entries(QUEST_ITEMS)) ITEMS[id] = { ...it, cat: 'quest', price: 0, desc: 'Objet de quête : à remettre en main propre.' };

// --- Objectifs --------------------------------------------------------------------------

/** Avoir des objets dans le sac (ils sont remis à la fin). */
const have = (item, count) => ({ type: 'have', item, count, label: `${ITEMS[item]?.emoji || ''} ${ITEMS[item]?.label || item}` });
/** Compter des événements du jeu pendant que la quête est active. */
const on = (event, count, label, filter = null, amount = null) => ({ type: 'event', event, count, label, filter, amount });
/** Un état du jeu à atteindre. */
const state = (check, count, label) => ({ type: 'state', check, count, label });
/** Parler à quelqu'un (livraison). */
const talkTo = (id, label) => ({ type: 'event', event: 'talk', count: 1, label, filter: (d) => d.villager?.def.id === id, talk: id });

const inZone = (g, ids) => ids.includes(g.zone?.id);
const lagoonFish = FISH.filter((f) => fishWhere(f).includes('lagon')).map((f) => f.id);

const S = (id, giver, title, o) => ({ id, giver, title, req: {}, ...o });

// Activité qu'il faut avoir débloquée pour une quête (elle n'est proposée qu'ensuite) :
// pêcher, cuisiner, rouler, attraper des insectes… selon ses objectifs.
const EVENT_FEATURE = {
  catch: 'peche', cook: 'cuisine', cookcontest: 'cuisine', ride: 'vehicules', job: 'boulots', insect: 'insectes',
  place: 'deco', sell: 'marche', buy: 'marche', adopt: 'adoption', travel: 'voyages', request: 'demandes',
  plant: 'potager', harvest: 'potager', water: 'potager',
};
export function questNeeds(q) {
  const out = new Set(q.needs || []);
  for (const goal of q.goals) {
    if (goal.event && EVENT_FEATURE[goal.event]) out.add(EVENT_FEATURE[goal.event]);
    if (goal.type !== 'have') continue;
    const cat = ITEMS[goal.item]?.cat;
    if (goal.item === 'poisson' || cat === 'fish') out.add('peche');
    else if (cat === 'dish') out.add('cuisine');
    else if (cat === 'crop') out.add('potager');
  }
  return [...out];
}

export const SIDE_QUESTS = [
  // --- Mamie Rose -------------------------------------------------------------------------
  S('rose-bouquet', 'rose', 'Un bouquet pour la place', {
    offer: ['Mon petit, j\'aimerais fleurir la fontaine de la place. Elle a l\'air si triste sans fleurs…', 'Tu veux bien m\'en cueillir cinq ? La Prairie aux Fleurs, à l\'est, en regorge !'],
    desc: 'Cueille 5 fleurs (Prairie aux Fleurs) et rapporte-les à Mamie Rose.',
    goals: [have('fleur', 5)],
    thanks: 'Oh, qu\'elles sont belles ! La fontaine va retrouver toutes ses couleurs. Tiens, des semis de fraise, pour ton potager.',
    reward: { coins: 120, items: { 'sem-fraise': 4 } },
  }),
  S('rose-lettre', 'rose', 'Une lettre pour Élise', {
    req: { after: 'rose-bouquet' },
    offer: ['Tu sais, quand j\'étais jeune, ma meilleure amie s\'appelait Élise. Elle a ouvert une pâtisserie à Bourg-Sapin, sur l\'île des Pins.', 'Je lui ai écrit une lettre… mais mes vieilles jambes ne passeront jamais le Pont des Brumes. Tu pourrais la lui porter ?'],
    desc: 'Porte la lettre de Mamie Rose à Élise, la pâtissière de Bourg-Sapin (île des Pins, au nord-ouest).',
    accept: { items: { 'lettre-rose': 1 } },
    goals: [talkTo('elise', 'Remettre la lettre à Élise')],
    turnIn: 'elise',
    take: { 'lettre-rose': 1 },
    thanks: 'Une lettre de Rose ?! Ça fait trente ans… Oh, elle se souvient de nos goûters ! Merci, merci ! Prends ces croissants, et dis-lui que je viendrai la voir au printemps.',
    reward: { coins: 200, items: { croissant: 3 }, friends: { rose: 10, elise: 10 } },
  }),
  S('rose-citrouille', 'rose', 'La reine des citrouilles', {
    req: { after: 'rose-lettre', f: 40 },
    offer: ['Chaque automne, je rêve de gagner le prix de la plus belle citrouille… Mais je n\'ai plus la force de les porter.', 'Si tu en fais pousser une dans ton potager, je te confierai mon secret de jardinière !'],
    desc: 'Fais pousser et récolte une citrouille, puis apporte-la à Mamie Rose.',
    goals: [have('citrouille', 1)],
    thanks: 'Quelle merveille ! Mon secret ? Leur parler tous les matins. Tiens, ce petit épouvantail veillera sur ton jardin.',
    reward: { coins: 300, furniture: { epouvantail: 1 }, items: { 'sem-citrouille': 3 }, stars: 5 },
  }),

  // --- Pomme ---------------------------------------------------------------------------------
  S('pomme-stock', 'pomme', 'Rupture de stock', {
    offer: ['Catastrophe ! Tout le monde veut des pommes aujourd\'hui et mon étal est vide !', 'Le Verger Pommelé, au nord-est de la place, en est plein. Tu m\'en rapportes six ?'],
    desc: 'Rapporte 6 pommes à Pomme (Verger Pommelé).',
    goals: [have('pomme', 6)],
    thanks: 'Tu me sauves la journée ! Voilà ta part, et un petit bonus pour la route.',
    reward: { coins: 150, items: { friandise: 2 } },
  }),
  S('pomme-coco', 'pomme', 'Saveurs d\'ailleurs', {
    req: { after: 'pomme-stock' },
    offer: ['Mes clients me réclament des fruits exotiques ! On dit qu\'il pousse des cocotiers sur l\'île Corail, de l\'autre côté du Pont du Soleil.', 'Trois noix de coco, et je t\'offre une place d\'honneur sur mon étal… et une belle récompense !'],
    desc: 'Récolte 3 noix de coco sur l\'île Corail (secoue les cocotiers de la Palmeraie).',
    goals: [have('noix-coco', 3)],
    thanks: 'Des vraies noix de coco ! Ça sent les vacances. Voilà pour toi, et deux jus de fruits maison !',
    reward: { coins: 250, items: { jus: 2 } },
  }),
  S('pomme-marche', 'pomme', 'Le grand marché', {
    req: { after: 'pomme-coco', f: 40 },
    offer: ['J\'ai un pari avec Nérée : il dit que personne ne peut vendre pour 500 pièces en une semaine.', 'Montre-lui qu\'il a tort ! Vends tes récoltes, tes poissons, tes plats…'],
    desc: 'Gagne 500 🪙 en vendant des objets (chez Pomme, Hugo ou Nérée).',
    goals: [on('sell', 500, 'Pièces gagnées en vendant', null, (d) => d.total || 0)],
    thanks: 'Ha ! Nérée me doit un gâteau ! Tu es un·e vrai·e commerçant·e. Tiens, un souvenir de notre victoire.',
    reward: { coins: 400, furniture: { 'caisse-fruits': 1 }, stars: 5, title: 'Roi·ne du marché' },
  }),

  // --- Bruno ---------------------------------------------------------------------------------
  S('bruno-pin', 'bruno', 'Du bois qui sent bon', {
    offer: ['Hmm. Je voudrais essayer une essence de bois que je ne connais pas.', 'Les pins de l\'île des Pins, au nord-ouest. Rapporte-moi cinq pommes de pin, que je sache si le bois est bon.'],
    desc: 'Ramasse 5 pommes de pin sur l\'île des Pins et rapporte-les à Bruno.',
    goals: [have('pomme-pin', 5)],
    thanks: 'Ça sent la résine… Bon bois. Très bon bois. Tiens, un banc que j\'ai fait avec.',
    reward: { coins: 200, furniture: { 'banc-rondins': 1 } },
  }),
  S('bruno-hugo', 'bruno', 'Le plan secret', {
    req: { after: 'bruno-pin' },
    offer: ['Il y a un bûcheron à Bourg-Sapin. Hugo. On dit qu\'il sculpte mieux que moi.', 'Porte-lui ce plan de chaise. S\'il arrive à la fabriquer… je reconnaîtrai qu\'il est doué.'],
    desc: 'Apporte le plan de Bruno à Hugo, le bûcheron de Bourg-Sapin.',
    accept: { items: { 'plan-bruno': 1 } },
    goals: [talkTo('hugo', 'Donner le plan à Hugo')],
    turnIn: 'hugo',
    take: { 'plan-bruno': 1 },
    thanks: 'Un plan de Bruno ! Ha ha, il n\'a pas changé. Dis-lui que sa chaise est magnifique… et que j\'en ai fait une étagère pour toi !',
    reward: { coins: 200, furniture: { 'etagere-rondins': 1 }, friends: { bruno: 8, hugo: 10 } },
  }),
  S('bruno-deco', 'bruno', 'Une maison qui me ressemble', {
    req: { after: 'bruno-hugo', f: 40 },
    needs: ['deco'],
    offer: ['Une maison, ce n\'est pas quatre murs. C\'est ce qu\'on met dedans.', 'Pose quatorze meubles chez toi ou dans ton jardin. Après, on en reparle.'],
    desc: 'Pose 14 meubles chez toi ou dans ton jardin (B pour décorer).',
    goals: [state((g) => g.house.placed.length, 14, 'Meubles posés')],
    thanks: '… C\'est beau. Vraiment. Tu as l\'œil. Prends cette horloge, elle vient de mon grand-père.',
    reward: { coins: 400, furniture: { 'horloge-comtoise': 1 }, stars: 5 },
  }),

  // --- Lila ----------------------------------------------------------------------------------
  S('lila-nacre', 'lila', 'Boutons de nacre', {
    offer: ['Je couds une robe de soirée, mais il me manque des boutons ! Les coquillages de la plage feraient des boutons de nacre parfaits.', 'Six, s\'il te plaît ! La Plage Coquillage est au sud du village.'],
    desc: 'Ramasse 6 coquillages et apporte-les à Lila.',
    goals: [have('coquillage', 6)],
    thanks: 'Ils sont parfaits ! La robe sera sublime. Voilà pour ta peine, beauté !',
    reward: { coins: 150, items: { 'sem-tomate': 3 } },
  }),
  S('lila-tropiques', 'lila', 'Les couleurs des tropiques', {
    req: { after: 'lila-nacre' },
    offer: ['J\'ai une idée de collection « Lagon » ! Il me faut des hibiscus pour teindre mes tissus.', 'On en trouve sur l\'île Corail, près de la Palmeraie. Quatre fleurs suffiront !'],
    desc: 'Cueille 4 hibiscus sur l\'île Corail pour Lila.',
    goals: [have('hibiscus', 4)],
    thanks: 'Ce rose ! Ce rouge ! Ma collection va faire sensation. Tiens, pour toi.',
    reward: { coins: 250, stars: 3 },
  }),
  S('lila-perle', 'lila', 'La perle rare', {
    req: { after: 'lila-tropiques', f: 40 },
    offer: ['Pour la robe de mes rêves, il me faudrait… une vraie perle. On dit qu\'on en trouve parfois dans le corail du lagon.', 'C\'est un peu de chance, beaucoup de patience. Tu t\'en sens capable ?'],
    desc: 'Trouve une perle (en ramassant du corail au Lagon Turquoise) et offre-la à Lila.',
    goals: [have('perle', 1)],
    thanks: 'Elle brille comme une petite lune… C\'est le plus beau cadeau qu\'on m\'ait jamais fait. Je te dois bien ça !',
    reward: { coins: 600, furniture: { 'coiffeuse': 1 }, stars: 8 },
  }),

  // --- Marin ---------------------------------------------------------------------------------
  S('marin-repas', 'marin', 'Le repas du vieux loup', {
    offer: ['Ohé moussaillon ! Mes vieux bras fatiguent… Et j\'ai promis du poisson au Café des Chats.', 'Pêche-moi trois poissons, n\'importe lesquels. Le ponton est juste là !'],
    desc: 'Pêche 3 poissons.',
    goals: [on('catch', 3, 'Poissons pêchés')],
    thanks: 'Bien joué ! Les minous de Mimi vont se régaler. Tiens, des appâts pour la suite.',
    reward: { coins: 100, items: { appat: 10 } },
  }),
  S('marin-lac', 'marin', 'Le poisson des montagnes', {
    req: { after: 'marin-repas' },
    offer: ['Quand j\'étais mousse, on parlait d\'un lac tout là-haut, sur l\'île des Pins. Un lac si clair qu\'on y voit les étoiles en plein jour.', 'Va y pêcher un poisson, et raconte-moi !'],
    desc: 'Pêche un poisson au Lac Miroir, sur l\'île des Pins.',
    goals: [on('catch', 1, 'Poisson du Lac Miroir', (d) => d.spot === 'lac')],
    thanks: 'Un poisson du Lac Miroir ! Alors la légende est vraie… Merci, tu m\'as rajeuni de vingt ans !',
    reward: { coins: 250, items: { appat: 10 } },
  }),
  S('marin-legende', 'marin', 'La légende du lagon', {
    req: { after: 'marin-lac', f: 60 },
    offer: ['Il paraît que le Lagon Turquoise abrite des poissons plus rares que tout ce que j\'ai pêché dans ma vie.', 'Pêche un poisson rare au lagon. Si tu y arrives, je te donne ma plus belle maquette.'],
    desc: 'Pêche un poisson rare ou légendaire au Lagon Turquoise (île Corail).',
    goals: [on('catch', 1, 'Poisson rare du lagon', (d) => d.spot === 'lagon' && d.rarity >= 2)],
    thanks: 'Par tous les vents ! Tu es le meilleur pêcheur que j\'aie connu. Cette maquette est à toi.',
    reward: { coins: 800, furniture: { 'maquette-bateau': 1 }, stars: 10, title: 'Loup de mer' },
  }),

  // --- Noé -----------------------------------------------------------------------------------
  S('noe-papillons', 'noe', 'Chasse aux papillons', {
    req: { unlock: 'tool:filet' },
    offer: ['J\'ai un exposé sur les insectes à faire ! Tu m\'aides ? Il m\'en faudrait trois, n\'importe lesquels !'],
    desc: 'Attrape 3 insectes avec ton filet.',
    goals: [on('insect', 3, 'Insectes attrapés')],
    thanks: 'Trop bien ! Mon exposé va être génial. Tiens, c\'est pour toi !',
    reward: { coins: 150, items: { friandise: 2 } },
  }),
  S('noe-sommet', 'noe', 'Le toit de l\'archipel', {
    req: { after: 'noe-papillons' },
    offer: ['Tu sais ce qu\'il y a de plus haut dans tout l\'archipel ? Le Pic des Neiges !', 'Je parie que tu n\'oses pas monter tout en haut ! Allez, chiche !'],
    desc: 'Grimpe jusqu\'au Pic des Neiges, sur l\'île des Pins.',
    goals: [on('zone', 1, 'Atteindre le Pic des Neiges', (d) => d.zone === 'pic')],
    thanks: 'T\'es monté·e tout en haut ?! Trop fort ! Raconte, on voit la mer de partout ?',
    reward: { coins: 200, stars: 3 },
  }),
  S('noe-cristaux', 'noe', 'Des cailloux qui brillent', {
    req: { after: 'noe-sommet' },
    offer: ['Sacha m\'a dit qu\'il y a des cristaux sur les flancs du Pic ! Des vrais !', 'Tu m\'en rapportes deux pour ma collection ? S\'il te plaîîît !'],
    desc: 'Détache 2 cristaux sur les flancs du Pic des Neiges.',
    goals: [have('cristal', 2)],
    thanks: 'Ils sont magnifiques ! Ils brillent même dans le noir ! Tiens, ma boîte de trésors.',
    reward: { coins: 300, furniture: { coffre: 1 } },
  }),
  S('noe-hercule', 'noe', 'Le scarabée géant', {
    req: { after: 'noe-cristaux', f: 60, seasons: [1, 2] },
    offer: ['Dans mon livre, ils parlent du scarabée Hercule. Il est ÉNORME ! Il vivrait dans la Palmeraie, la nuit, en été et en automne.', 'Si tu en attrapes un, tu deviens officiellement le plus grand explorateur du monde !'],
    desc: 'Attrape un scarabée Hercule (Palmeraie, la nuit, en été ou en automne).',
    goals: [on('insect', 1, 'Scarabée Hercule', (d) => d.id === 'hercule')],
    thanks: 'IL EST GÉANT ! C\'est le plus beau jour de ma vie ! Tu es le plus grand explorateur du monde !',
    reward: { coins: 1000, stars: 10, title: 'Grand explorateur' },
  }),

  // --- Mimi ----------------------------------------------------------------------------------
  S('mimi-calins', 'mimi', 'Tournée de câlins', {
    offer: ['Les chats du village se sentent un peu seuls ces temps-ci… Miaou.', 'Tu pourrais faire le tour et en caresser cinq ? Ça leur ferait tellement plaisir !'],
    desc: 'Caresse 5 chats.',
    goals: [on('pet', 5, 'Chats caressés', (d) => d.animal?.species === 'chat')],
    thanks: 'Ils ronronnent tous ! Tu as un don avec les chats, je le savais. Tiens, de la pâtée pour tes minous.',
    reward: { coins: 100, items: { patee: 3 } },
  }),
  S('mimi-menu', 'mimi', 'Menu de fête', {
    req: { after: 'mimi-calins' },
    offer: ['C\'est l\'anniversaire du café ! Je voudrais préparer un grand festin de poisson pour les chats.', 'Il m\'en faudrait quatre. Marin t\'expliquera comment pêcher !'],
    desc: 'Apporte 4 poissons à Mimi.',
    goals: [have('poisson', 4)],
    thanks: 'Les chats vont faire la fête toute la nuit ! Merci, merci ! Voilà une fontaine à chat pour chez toi.',
    reward: { coins: 200, furniture: { 'fontaine-chat': 1 } },
  }),
  S('mimi-perroquet', 'mimi', 'Un drôle d\'oiseau', {
    req: { after: 'mimi-menu' },
    offer: ['On raconte qu\'il y a des perroquets qui parlent sur l\'île Corail ! Mes chats n\'en croient pas leurs moustaches.', 'Va en caresser un et raconte-moi s\'il dit vraiment « bonjour » !'],
    desc: 'Caresse un perroquet sur l\'île Corail.',
    goals: [on('pet', 1, 'Perroquet caressé', (d) => d.animal?.species === 'perroquet')],
    thanks: 'Il a dit « Coucou » ?! Trop mignon ! Il faudra que j\'aille voir ça. Tiens, pour la peine !',
    reward: { coins: 200, items: { friandise: 3 } },
  }),

  // --- Léo -----------------------------------------------------------------------------------
  S('leo-essai', 'leo', 'Essai sur route', {
    req: { chapter: 5 },
    offer: ['J\'ai réglé tous les moteurs du garage aux petits oignons. Il me faut quelqu\'un pour un essai !', 'Achète un véhicule (ou prends le tien) et fais un tour. Appuie sur V !'],
    desc: 'Fais un tour en véhicule (touche V).',
    goals: [on('ride', 1, 'Tour en véhicule')],
    thanks: 'Alors, ça ronronne bien ? Parfait ! Tiens, ta prime de pilote d\'essai.',
    reward: { coins: 150 },
  }),
  S('leo-phare', 'leo', 'Un phare pour ma moto', {
    req: { after: 'leo-essai' },
    offer: ['J\'invente un phare de moto qui brille tout seul. Il me faudrait un cristal de montagne !', 'Il y en a sur les flancs du Pic des Neiges.'],
    desc: 'Rapporte un cristal du Pic des Neiges à Léo.',
    goals: [have('cristal', 1)],
    thanks: 'Regarde comme il brille ! Mon phare va être génial. Merci, voilà pour toi.',
    reward: { coins: 300, stars: 3 },
  }),
  S('leo-colis', 'leo', 'Livraison express', {
    req: { after: 'leo-phare' },
    offer: ['Paco, à la paillote du lagon, m\'a commandé une pièce pour son mixeur à cocktails.', 'Tu peux lui livrer ce colis ? C\'est à l\'autre bout de l\'île Corail !'],
    desc: 'Livre le colis de Léo à Paco, à la paillote du Lagon Turquoise.',
    accept: { items: { 'colis-leo': 1 } },
    goals: [talkTo('paco', 'Livrer le colis à Paco')],
    turnIn: 'paco',
    take: { 'colis-leo': 1 },
    thanks: 'Ma pièce de mixeur ! Enfin ! Ce soir, cocktails pour tout le monde ! Tiens, le premier est pour toi.',
    reward: { coins: 250, items: { cocktail: 2 }, friends: { leo: 8, paco: 10 } },
  }),

  // --- Aurèle (source chaude) ---------------------------------------------------------------
  S('aurele-bain', 'aurele', 'Détente obligatoire', {
    offer: ['Bienvenue à la source chaude, voyageur. Tu as l\'air tendu·e. Beaucoup trop tendu·e.', 'Va te prélasser dans l\'eau. C\'est un ordre du gardien !'],
    desc: 'Prélasse-toi dans la source chaude (E au bord de l\'eau).',
    goals: [on('bathe', 1, 'Bain à la source')],
    thanks: 'Voilà. Tes épaules sont redescendues d\'au moins trois centimètres. Un chocolat chaud pour finir ?',
    reward: { coins: 100, items: { chocolat: 2 } },
  }),
  S('aurele-edelweiss', 'aurele', 'Fleurs des cimes', {
    req: { after: 'aurele-bain' },
    offer: ['L\'edelweiss ne pousse qu\'en altitude, là où le vent est pur. Mes bains d\'herbes en ont besoin.', 'Trois fleurs, cueillies avec respect. Tu les trouveras en montant vers le Pic.'],
    desc: 'Cueille 3 edelweiss sur les pentes du Pic des Neiges.',
    goals: [have('edelweiss', 3)],
    thanks: 'Parfaites. Le vent les a choisies pour toi. Prends ce plaid, il vient de ma grand-mère.',
    reward: { coins: 250, furniture: { 'fauteuil-plaid': 1 } },
  }),
  S('aurele-soupe', 'aurele', 'Une soupe pour l\'hiver', {
    req: { after: 'aurele-edelweiss', f: 40 },
    offer: ['Les nuits sont froides, là-haut. Hugo connaît une soupe des bois qui réchauffe le cœur.', 'Si tu apprends à la cuisiner, j\'aimerais beaucoup y goûter.'],
    desc: 'Cuisine une soupe des bois (recette de Hugo) et apporte-la à Aurèle.',
    goals: [have('soupe-bois', 1)],
    thanks: 'Mmm… Des champignons, de la carotte, et ce petit goût de pin. C\'est la soupe de mon enfance. Merci.',
    reward: { coins: 350, furniture: { poele: 1 }, stars: 5 },
  }),

  // --- Élise ---------------------------------------------------------------------------------
  S('elise-myrtilles', 'elise', 'La cueillette de myrtilles', {
    offer: ['Bonjour ! Ma tarte aux myrtilles est célèbre dans tout le bourg… mais je n\'ai plus une seule myrtille !', 'Les buissons de la Grande Pinède en sont pleins. Cinq, et je t\'apprends la recette !'],
    desc: 'Cueille 5 myrtilles dans la Grande Pinède pour Élise.',
    goals: [have('myrtille', 5)],
    thanks: 'Qu\'elles sont belles ! Comme promis, voici ma recette secrète. Ne la répète à personne… sauf à Rose !',
    reward: { coins: 150, recipe: 'tarte-myrtille' },
  }),
  S('elise-croissants', 'elise', 'Croissants pour le port', {
    req: { after: 'elise-myrtilles' },
    offer: ['Nérée, le capitaine de Port-Corail, me commande des croissants chaque semaine pour son équipage.', 'Tu peux lui porter ce panier ? Le bateau part d\'ici, au panneau 🧭 Voyages !'],
    desc: 'Porte le panier de croissants à Nérée, le capitaine de Port-Corail.',
    accept: { items: { 'panier-croissants': 1 } },
    goals: [talkTo('neree', 'Livrer les croissants à Nérée')],
    turnIn: 'neree',
    take: { 'panier-croissants': 1 },
    thanks: 'Les croissants d\'Élise ! Encore tièdes ! Mon équipage va chanter de joie. Merci, matelot !',
    reward: { coins: 250, friends: { elise: 8, neree: 10 } },
  }),
  S('elise-concours', 'elise', 'Le concours des douceurs', {
    req: { after: 'elise-croissants', f: 40 },
    offer: ['Je prépare le grand concours de pâtisserie du bourg ! Il me faut un jury… et des desserts.', 'Apporte-moi une tarte aux myrtilles et des crêpes faites de tes mains. On verra si l\'élève dépasse la maîtresse !'],
    desc: 'Cuisine une tarte aux myrtilles et des crêpes, puis apporte-les à Élise.',
    goals: [have('tarte-myrtille', 1), have('crepe', 1)],
    thanks: 'Mmmh ! C\'est… c\'est meilleur que les miennes ! Je te décerne le premier prix. Et ce gâteau de fête !',
    reward: { coins: 500, furniture: { 'gateau-etage': 1 }, stars: 8, title: 'Pâtissier·ère d\'or' },
  }),

  // --- Hugo ----------------------------------------------------------------------------------
  S('hugo-champignons', 'hugo', 'Soupe des bois', {
    offer: ['Salut ! Rien de tel qu\'une soupe des bois après une journée à couper du pin.', 'Rapporte-moi quatre champignons et je t\'apprends ma recette.'],
    desc: 'Ramasse 4 champignons pour Hugo.',
    goals: [have('champignon', 4)],
    thanks: 'Des beaux cèpes ! Tiens, voilà ma recette. Une pomme de pin dedans, c\'est le secret.',
    reward: { coins: 100, recipe: 'soupe-bois' },
  }),
  S('hugo-ecureuils', 'hugo', 'Le modèle idéal', {
    req: { after: 'hugo-champignons' },
    offer: ['Je veux sculpter un écureuil, mais ces petits filous ne tiennent jamais en place !', 'Si tu arrives à en caresser trois, ils seront peut-être plus calmes pour poser…'],
    desc: 'Caresse 3 écureuils de la Grande Pinède.',
    goals: [on('pet', 3, 'Écureuils caressés', (d) => d.animal?.species === 'ecureuil')],
    thanks: 'Ils sont tout calmes ! Tu as des mains magiques. Pour te remercier, cette tête d\'élan en peluche.',
    reward: { coins: 250, furniture: { 'tete-elan': 1 } },
  }),
  S('hugo-luge', 'hugo', 'La luge du Pic', {
    req: { after: 'hugo-ecureuils', f: 40 },
    offer: ['J\'ai fabriqué une luge. Mais pour l\'essayer, il faut quelqu\'un d\'assez courageux pour monter au Pic des Neiges…', 'Monte là-haut, et reviens me dire si la neige est bonne !'],
    desc: 'Monte au Pic des Neiges puis reviens voir Hugo.',
    goals: [on('zone', 1, 'Atteindre le Pic des Neiges', (d) => d.zone === 'pic')],
    thanks: 'La neige est bonne ? Alors cette luge est à toi ! Fais attention aux sapins.',
    reward: { coins: 300, furniture: { luge: 1 } },
  }),

  // --- Sacha ---------------------------------------------------------------------------------
  S('sacha-telescope', 'sacha', 'Nuit d\'observation', {
    offer: ['Tu as vu ma longue-vue, au belvédère ? De nuit, on voit des étoiles qu\'on ne soupçonne même pas.', 'Reviens une nuit et regarde le ciel. Tu m\'en diras des nouvelles !'],
    desc: 'Observe le ciel de nuit à la longue-vue du belvédère (près du Pic).',
    goals: [on('stargaze', 1, 'Observer les étoiles')],
    thanks: 'Tu as vu la constellation du Chat ? Moi, je l\'ai baptisée comme ça. Tiens, mon vieux carnet d\'astronome.',
    reward: { coins: 200, furniture: { globe: 1 } },
  }),
  S('sacha-chevres', 'sacha', 'Recensement des chèvres', {
    req: { after: 'sacha-telescope' },
    offer: ['Je dois compter les chèvres des neiges pour le registre de l\'île. Mais elles ne se laissent pas approcher facilement.', 'Caresse-en trois : elles s\'habitueront aux randonneurs.'],
    desc: 'Caresse 3 chèvres des neiges près du Pic.',
    goals: [on('pet', 3, 'Chèvres caressées', (d) => d.animal?.species === 'chevre')],
    thanks: 'Elles te suivent maintenant ! Tu ferais un excellent guide de montagne.',
    reward: { coins: 250, items: { myrtille: 5 } },
  }),
  S('sacha-voeu', 'sacha', 'Le vœu de l\'étoile', {
    req: { after: 'sacha-chevres', f: 40 },
    offer: ['Les nuits claires, des étoiles filantes traversent le ciel. Si tu es rapide, tu peux faire un vœu (touche F).', 'Fais-en un pour moi aussi, d\'accord ?'],
    desc: 'Fais un vœu en voyant une étoile filante, la nuit : tourne la caméra vers le ciel, ou regarde dans une longue-vue (touche F quand elle passe).',
    goals: [on('wish', 1, 'Faire un vœu')],
    thanks: 'Tu as fait un vœu ? Ne me dis pas lequel, sinon il ne se réalise pas ! Tiens, mon carnet, il est à toi.',
    reward: { coins: 300, furniture: { 'etoile-murale': 1 }, stars: 5 },
  }),
  S('sacha-aurore', 'sacha', 'Le papillon des aurores', {
    req: { after: 'sacha-voeu', f: 60, seasons: [3] },
    offer: ['Les nuits d\'hiver, un papillon qui brille comme une aurore danse près du Pic et du Lac Miroir.', 'Personne ne l\'a jamais attrapé. Tu veux essayer ?'],
    desc: 'Attrape un papillon aurore (Pic ou Lac Miroir, les nuits d\'hiver).',
    goals: [on('insect', 1, 'Papillon aurore', (d) => d.id === 'papillon-aurore')],
    thanks: 'Il est encore plus beau que dans les légendes… Tu as réalisé mon rêve. Merci, du fond du cœur.',
    reward: { coins: 1200, stars: 10, title: 'Gardien·ne des aurores' },
  }),

  // --- Nérée ---------------------------------------------------------------------------------
  S('neree-voyage', 'neree', 'Premier voyage', {
    offer: ['Bienvenue à Port-Corail, matelot ! Mon bateau relie tous les villages de l\'archipel.', 'Fais un voyage depuis un panneau 🧭 Voyages : c\'est gratuit pour les amis de Doucebrise !'],
    desc: 'Voyage d\'un village à l\'autre depuis un panneau 🧭 Voyages.',
    goals: [on('travel', 1, 'Faire un voyage')],
    thanks: 'Alors, le mal de mer ? Ha ha ! Voilà des appâts, cadeau de la maison.',
    reward: { coins: 100, items: { appat: 10 } },
  }),
  S('neree-corail', 'neree', 'Du corail pour la capitainerie', {
    req: { after: 'neree-voyage' },
    offer: ['Je voudrais décorer la capitainerie avec du corail. Le lagon en est plein.', 'Trois morceaux, ramassés sur le sable, sans abîmer le récif !'],
    desc: 'Ramasse 3 morceaux de corail au Lagon Turquoise.',
    goals: [have('corail', 3)],
    thanks: 'Magnifique ! La capitainerie va avoir fière allure. Prends cette bouée, elle porte bonheur.',
    reward: { coins: 250, furniture: { bouee: 1 } },
  }),
  S('neree-marin', 'neree', 'Message pour un vieux loup', {
    req: { after: 'neree-corail' },
    offer: ['Marin, le pêcheur de Doucebrise, était mon capitaine, autrefois. On ne s\'est pas parlé depuis des années…', 'J\'ai glissé un message dans cette bouteille. Tu la lui donnes ?'],
    desc: 'Apporte le message de Nérée à Marin, le pêcheur du village.',
    accept: { items: { 'bouteille-neree': 1 } },
    goals: [talkTo('marin', 'Remettre la bouteille à Marin')],
    turnIn: 'marin',
    take: { 'bouteille-neree': 1 },
    thanks: 'Un message de Nérée ? Ce vieux forban… « Viens pêcher avec moi au lagon, comme avant. » … J\'irai. Merci, moussaillon.',
    reward: { coins: 300, furniture: { ancre: 1 }, friends: { neree: 10, marin: 10 } },
  }),

  // --- Coralie -------------------------------------------------------------------------------
  S('coralie-etoiles', 'coralie', 'Recensement des étoiles de mer', {
    offer: ['Salut ! Je compte les étoiles de mer du lagon pour mes recherches.', 'Tu peux m\'en rapporter quatre ? Je les remettrai à l\'eau après les avoir mesurées, promis !'],
    desc: 'Ramasse 4 étoiles de mer sur les plages de l\'île Corail.',
    goals: [have('etoile-mer', 4)],
    thanks: 'Super ! Elles sont en pleine forme. Merci pour la science ! Tiens, un bocal pour tes futurs poissons.',
    reward: { coins: 200, furniture: { 'bocal-poisson': 1 } },
  }),
  S('coralie-tortues', 'coralie', 'Les tortues du lagon', {
    req: { after: 'coralie-etoiles' },
    offer: ['Les tortues pondent sur la plage du lagon. Je dois vérifier qu\'elles vont bien.', 'Approche-toi doucement et caresse-en trois. Elles adorent les tomates !'],
    desc: 'Caresse 3 tortues sur l\'île Corail.',
    goals: [on('pet', 3, 'Tortues caressées', (d) => d.animal?.species === 'tortue')],
    thanks: 'Elles sont toutes en bonne santé ! Tu as été très douce·doux avec elles. Merci !',
    reward: { coins: 250, items: { tomate: 3 } },
  }),
  S('coralie-especes', 'coralie', 'Inventaire du lagon', {
    req: { after: 'coralie-tortues', f: 40 },
    needs: ['peche'],
    offer: ['Mon grand projet : répertorier toutes les espèces du lagon !', 'Pêche quatre espèces différentes du Lagon Turquoise. Ton journal gardera la trace de tes prises.'],
    desc: 'Pêche 4 espèces différentes au Lagon Turquoise.',
    goals: [state((g) => lagoonFish.filter((id) => g.fishing.best[id]).length, 4, 'Espèces du lagon')],
    thanks: 'Quatre espèces ! Mon inventaire avance à pas de géant. Ce coquillage géant est pour toi.',
    reward: { coins: 500, furniture: { 'coquillage-geant': 1 }, stars: 5 },
  }),

  // --- Paco ----------------------------------------------------------------------------------
  S('paco-coco', 'paco', 'Pénurie de coco', {
    offer: ['Hola ! Grosse journée à la paillote, et plus une seule noix de coco pour mes jus !', 'Secoue les cocotiers de la Palmeraie et rapporte-m\'en trois. Je te paierai en glaces !'],
    desc: 'Récolte 3 noix de coco pour Paco.',
    goals: [have('noix-coco', 3)],
    thanks: '¡ Perfecto ! Voilà ta paie… et deux glaces à la noix de coco, mes meilleures !',
    reward: { coins: 200, items: { glace: 2 }, recipe: 'jus-coco' },
  }),
  S('paco-danse', 'paco', 'De l\'ambiance !', {
    req: { after: 'paco-coco' },
    offer: ['La plage est trop calme ce soir ! Il faut quelqu\'un pour lancer la fête.', 'Viens danser sur la plage du lagon ! (Touche 2 pour danser.)'],
    desc: 'Danse au Lagon Turquoise ou dans la Palmeraie (touche 2).',
    goals: [on('emote', 1, 'Danser sur la plage', (d, g) => d.name === 'dance' && inZone(g, ['lagon', 'palmeraie', 'corail']))],
    thanks: 'Olé ! Tout le monde danse maintenant ! Tiens, un cocktail pour la reine ou le roi de la piste !',
    reward: { coins: 150, items: { cocktail: 2 } },
  }),
  S('paco-fete', 'paco', 'La grande fête de la paillote', {
    req: { after: 'paco-danse', f: 40 },
    offer: ['J\'organise la plus grande fête de l\'archipel ! Mais il me faut des jus de coco maison, faits avec amour.', 'Prépare-m\'en deux, et tu seras l\'invité·e d\'honneur !'],
    desc: 'Cuisine 2 jus de coco et apporte-les à Paco.',
    goals: [have('jus-coco', 2)],
    thanks: 'Ils sont délicieux ! La fête sera légendaire. Prends ce bar tiki, pour faire la fête chez toi aussi !',
    reward: { coins: 400, furniture: { 'torche-tiki': 2 }, stars: 5 },
  }),

  // --- Maëlys --------------------------------------------------------------------------------
  S('maelys-inspiration', 'maelys', 'En manque d\'inspiration', {
    offer: ['Je voudrais peindre le lagon, mais je n\'arrive pas à trouver le bon angle…', 'Prends une photo du Lagon Turquoise pour moi (touche O) ? Tes yeux verront peut-être ce que je ne vois pas.'],
    desc: 'Prends une photo (touche O) au Lagon Turquoise.',
    goals: [on('photo', 1, 'Photo du lagon', (d, g) => inZone(g, ['lagon']))],
    thanks: 'Oh ! Cet angle ! Cette lumière ! Je vais commencer tout de suite. Merci ! Tiens, un de mes tableaux.',
    reward: { coins: 200, furniture: { 'tableau-lagon': 1 } },
  }),
  S('maelys-pigments', 'maelys', 'Pigments naturels', {
    req: { after: 'maelys-inspiration' },
    offer: ['Mes couleurs, je les fabrique moi-même, avec des fleurs et des fruits.', 'Il me faudrait trois fleurs, deux hibiscus et trois myrtilles. Du rose, du rouge, du bleu !'],
    desc: 'Apporte à Maëlys 3 fleurs, 2 hibiscus et 3 myrtilles.',
    goals: [have('fleur', 3), have('hibiscus', 2), have('myrtille', 3)],
    thanks: 'Quelle palette ! Je vais pouvoir peindre l\'aurore. Voilà mon chevalet de voyage, il est à toi.',
    reward: { coins: 300, furniture: { chevalet: 1 } },
  }),
  S('maelys-toile', 'maelys', 'Une toile pour Bourg-Sapin', {
    req: { after: 'maelys-pigments' },
    offer: ['Aurèle, le gardien de la source chaude, m\'a commandé un tableau du Pic.', 'Il est fini ! Tu peux lui apporter ? Fais attention, la peinture est encore fraîche…'],
    desc: 'Apporte la toile de Maëlys à Aurèle, à la source chaude de l\'île des Pins.',
    accept: { items: { 'toile-maelys': 1 } },
    goals: [talkTo('aurele', 'Remettre la toile à Aurèle')],
    turnIn: 'aurele',
    take: { 'toile-maelys': 1 },
    thanks: 'Le Pic, au lever du soleil… Elle a capturé l\'âme de la montagne. Merci de l\'avoir portée jusqu\'ici.',
    reward: { coins: 300, furniture: { 'tableau-montagne': 1 }, friends: { maelys: 10, aurele: 10 } },
  }),
  S('maelys-portrait', 'maelys', 'Le portrait', {
    req: { after: 'maelys-toile', f: 60 },
    offer: ['J\'aimerais faire ton portrait… Tu es devenu·e quelqu\'un de très important pour moi, tu sais.', 'Fais-moi un petit signe de la main (touche 1), là, sur la place du port. Ne bouge plus !'],
    desc: 'Fais un signe de la main (touche 1) sur la place de Port-Corail.',
    goals: [on('emote', 1, 'Poser pour le portrait', (d, g) => d.name === 'wave' && inZone(g, ['port']))],
    thanks: 'Voilà… C\'est toi, comme je te vois. Garde-le. Et reviens me voir souvent, d\'accord ?',
    reward: { coins: 500, furniture: { portrait: 1 }, stars: 10 },
  }),

  // --- Fêtes de saison, pêche au moulinet, chœur de l'aube --------------------------------
  S('rose-oeufs', 'rose', 'La grande chasse aux œufs', {
    req: { seasons: [0], festival: 'oeufs' },
    offer: ['Chaque premier jour du printemps, je cache des œufs peints partout sur l\'île. C\'est ma petite tradition !', 'Cette année, j\'aimerais tant que tu participes… Trouves-en six avant ce soir, et je te réserve une douceur.'],
    desc: 'Trouve 6 œufs peints pendant la Chasse aux œufs (aujourd\'hui, de 7 h à 20 h), puis reviens voir Mamie Rose.',
    goals: [on('egg', 6, 'Œufs peints trouvés')],
    thanks: 'Six œufs ! Tu as des yeux de lynx, mon petit. Tiens, des œufs en chocolat : ils sont encore meilleurs que les vrais !',
    reward: { coins: 200, items: { 'oeuf-choco': 3 }, friends: { rose: 5 } },
  }),
  S('leo-feux', 'leo', 'Un ciel qui pétille', {
    req: { seasons: [1], festival: 'ete' },
    offer: ['C\'est la Fête de l\'été ! Ce soir, le ciel au-dessus de la plage va s\'illuminer.', 'J\'ai laissé une caisse de fusées sur le sable. Lances-en trois, à deux c\'est encore plus beau… je dis ça, je dis rien !'],
    desc: 'Lance 3 fusées depuis la caisse de la plage (Fête de l\'été, dès 19 h).',
    goals: [on('firework', 3, 'Fusées lancées')],
    thanks: 'Tu as vu ce cœur dans le ciel ?! Magnifique. Tiens, des lampions pour que l\'été dure un peu plus longtemps chez toi.',
    reward: { coins: 250, furniture: { lampions: 1 }, stars: 3 },
  }),
  S('mimi-concours', 'mimi', 'Le concours de cuisine', {
    req: { seasons: [2], festival: 'cuisine' },
    offer: ['Aujourd\'hui, c\'est le concours de cuisine ! Je suis dans le jury, avec Élise et Pomme.', 'Tu viens nous présenter un plat ? Même un tout simple : ce qui compte, c\'est d\'y mettre du cœur… et une jolie présentation !'],
    desc: 'Présente un plat au jury du concours de cuisine (devant le café, de 9 h à 18 h).',
    goals: [on('cookcontest', 1, 'Plat présenté au jury')],
    thanks: 'Quel courage ! Pour te remercier, voilà ma recette secrète : la tarte à la citrouille. Chut, c\'est entre nous !',
    reward: { coins: 250, recipe: 'tarte-citrouille', friends: { mimi: 8, elise: 5, pomme: 5 } },
  }),
  S('noe-neige', 'noe', 'La grande bataille de neige', {
    req: { seasons: [3], festival: 'neige' },
    offer: ['C\'est la Fête des neiges ! Léo, Sacha et moi, on a construit des murets sur la prairie. On est l\'équipe la plus forte de l\'archipel !', 'Tu oses nous défier ? Touche-nous cinq fois avec tes boules de neige, et je t\'offre mon trésor secret !'],
    desc: 'Pendant la Fête des neiges (Prairie aux Fleurs, de 9 h à 17 h), touche l\'équipe de Noé 5 fois à la bataille de boules de neige.',
    goals: [on('snowball', 5, 'Boules de neige qui touchent')],
    thanks: 'Cinq fois ! J\'ai de la neige jusque dans les chaussettes ! Tiens, mon trésor : des chocolats chauds que j\'ai gardés au chaud dans mon manteau.',
    reward: { coins: 200, items: { chocolat: 3 }, friends: { noe: 8, leo: 4, sacha: 4 } },
  }),
  S('hugo-bonhomme', 'hugo', 'Un bonhomme qui a du caractère', {
    req: { seasons: [3], festival: 'neige' },
    offer: ['Je suis descendu du bourg pour juger les bonshommes de neige. Chaque année, c\'est la même chose : trois boules, une carotte, et voilà.', 'Toi, montre-moi un bonhomme qui a du caractère. Roule-le bien, habille-le avec goût, et présente-le-moi.'],
    desc: 'Construis un bonhomme de neige et présente-le à Hugo (Fête des neiges, Prairie aux Fleurs, de 9 h à 17 h).',
    goals: [on('snowman', 1, 'Bonhomme présenté à Hugo')],
    thanks: 'Voilà enfin un bonhomme avec une âme ! Tiens, pour ta peine… et tu as mon respect. Ça, c\'est plus rare que l\'or.',
    reward: { coins: 250, stars: 3, friends: { hugo: 10 } },
  }),
  S('marin-combat', 'marin', 'Le combat du siècle', {
    req: { after: 'marin-legende' },
    offer: ['Moussaillon, un vrai pêcheur ne se contente pas de sardines. Il faut sentir la ligne se tendre, tenir bon, relâcher au bon moment…', 'Ramène-moi un poisson d\'au moins un mètre. Là, on parlera de toi dans les tavernes !'],
    desc: 'Pêche un poisson d\'au moins 1 m (100 cm) : mouline, et relâche quand il tire !',
    goals: [on('catch', 1, 'Poisson d\'au moins 1 m', (d) => d.size >= 100)],
    thanks: 'Un mètre ! Tu as tenu bon, hein ? Je le savais. Tiens, des appâts de compétition : les gros poissons en raffolent.',
    reward: { coins: 350, items: { appat: 12 }, stars: 5 },
  }),
  S('noe-aube', 'noe', 'Le chœur de l\'aube', {
    req: { after: 'noe-papillons' },
    offer: ['Tu savais qu\'à l\'aube, tous les oiseaux chantent en même temps ? Le merle, la mésange, le pinson…', 'Lève-toi tôt et va écouter dans la forêt, au verger, dans la prairie ou sur la colline, entre 5 h et 7 h 30. Pas l\'hiver, ils sont trop frileux !'],
    desc: 'Écoute le chœur des oiseaux à l\'aube (forêt, verger, prairie ou colline, entre 5 h et 7 h 30, hors hiver).',
    goals: [on('dawn', 1, 'Chœur de l\'aube écouté')],
    thanks: 'Alors, tu as entendu le coucou ? Et le pic qui tambourine ? J\'ai fabriqué un nichoir pour ton jardin : peut-être qu\'une mésange viendra y chanter !',
    reward: { coins: 200, furniture: { nichoir: 1 }, stars: 3 },
  }),
];

const BY_ID = Object.fromEntries(SIDE_QUESTS.map((q) => [q.id, q]));

// --- Moteur ---------------------------------------------------------------------------------

export class SideQuests {
  constructor(game) {
    this.game = game;
    this.active = {}; // id → { p: [progress…] }
    this.done = new Set();
    this.tracked = null;
    for (const e of ['sell', 'catch', 'insect', 'zone', 'pet', 'ride', 'bathe', 'stargaze', 'wish', 'travel', 'photo', 'emote', 'talk', 'cook', 'gather', 'egg', 'firework', 'cookcontest', 'dawn', 'snowball', 'snowman']) {
      game.on(e, (d) => this.onEvent(e, d || {}));
    }
  }

  get(id) {
    return BY_ID[id];
  }

  get total() {
    return SIDE_QUESTS.length;
  }

  allDone() {
    return this.done.size >= SIDE_QUESTS.length;
  }

  /** Conditions pour qu'un habitant propose la quête. */
  isAvailable(q) {
    if (this.done.has(q.id) || this.active[q.id]) return false;
    const g = this.game;
    // Les quêtes des habitants s'ouvrent au chapitre 3 (avant, l'histoire suffit).
    if (g.features && !g.features.unlocked('quetes')) return false;
    // … et seulement si on sait déjà faire ce qu'elles demandent.
    if (g.features && questNeeds(q).some((id) => !g.features.unlocked(id))) return false;
    const r = q.req || {};
    if (r.after && !this.done.has(r.after)) return false;
    if (r.f && (g.villagers.get(q.giver)?.friendship || 0) < r.f) return false;
    if (r.chapter && g.quests.chapterIndex < r.chapter) return false;
    if (r.unlock && !g.unlocks.has(r.unlock)) return false;
    // Quêtes de saison : proposées seulement quand c'est faisable.
    if (r.seasons && !r.seasons.includes(g.world.weather.seasonIndex)) return false;
    // Quêtes de fête : proposées le jour de la fête.
    if (r.festival && g.calendar.festival?.id !== r.festival) return false;
    // Une seule quête proposée à la fois par habitant.
    return !SIDE_QUESTS.some((o) => o.giver === q.giver && this.active[o.id]);
  }

  availableFor(villagerId) {
    return SIDE_QUESTS.find((q) => q.giver === villagerId && this.isAvailable(q)) || null;
  }

  /** Habitant à qui rendre la quête. */
  turnInOf(q) {
    return q.turnIn || q.giver;
  }

  goalValue(q, i) {
    const goal = q.goals[i];
    const g = this.game;
    if (goal.type === 'have') return Math.min(goal.count, countItem(g.inventory, goal.item));
    if (goal.type === 'state') {
      try {
        return Math.min(goal.count, goal.check(g) || 0);
      } catch {
        return 0;
      }
    }
    return Math.min(goal.count, this.active[q.id]?.p[i] || 0);
  }

  isReady(q) {
    if (!this.active[q.id]) return false;
    // Pour une livraison, parler au destinataire suffit : on vérifie tout le reste.
    return q.goals.every((goal, i) => goal.talk || this.goalValue(q, i) >= goal.count);
  }

  /** Quête prête à être rendue auprès de cet habitant. */
  readyFor(villagerId) {
    return SIDE_QUESTS.find((q) => this.active[q.id] && this.turnInOf(q) === villagerId && this.isReady(q)) || null;
  }

  /** Quête en cours donnée par cet habitant (pour un rappel). */
  activeFrom(villagerId) {
    return SIDE_QUESTS.find((q) => this.active[q.id] && q.giver === villagerId && !this.readyFor(villagerId)) || null;
  }

  /** Marqueur au-dessus d'un habitant : 'ready' (?), 'offer' (!) ou null. */
  markerFor(villagerId) {
    // Recalculé deux fois par seconde (appelé à chaque image pour chaque habitant).
    const now = performance.now();
    if (!this.markers || now - this.markersAt > 500) {
      this.markersAt = now;
      this.markers = {};
      for (const v of this.game.villagers.list) {
        const id = v.def.id;
        this.markers[id] = this.readyFor(id) ? 'ready' : this.availableFor(id) ? 'offer' : null;
      }
    }
    return this.markers[villagerId] || null;
  }

  activeList() {
    return SIDE_QUESTS.filter((q) => this.active[q.id]);
  }

  onEvent(type, data) {
    const g = this.game;
    let changed = false;
    for (const q of this.activeList()) {
      q.goals.forEach((goal, i) => {
        if (goal.type !== 'event' || goal.event !== type || goal.talk) return;
        if (goal.filter && !goal.filter(data, g)) return;
        const st = this.active[q.id];
        const inc = goal.amount ? goal.amount(data) : type === 'gather' ? data.count || 1 : 1;
        const before = st.p[i] || 0;
        st.p[i] = Math.min(goal.count, before + inc);
        if (st.p[i] !== before) changed = true;
        if (before < goal.count && st.p[i] >= goal.count && this.isReady(q)) {
          const v = g.villagers.get(this.turnInOf(q));
          g.ui.toast(`✅ ${q.title} : retourne voir ${v.def.emoji} ${v.def.name} !`, 4000);
        }
      });
    }
    if (changed) {
      g.ui.refreshSideQuest?.();
      g.requestSave();
    }
  }

  // --- Dialogue ------------------------------------------------------------------------------

  dialogueChoices(v, dialogue) {
    const g = this.game;
    const out = [];
    const ready = this.readyFor(v.def.id);
    if (ready) {
      out.push({ tag: 'Quête finie', label: `✅ ${ready.title}`, primary: true, action: () => this.turnIn(ready, v, dialogue) });
    }
    const offer = this.availableFor(v.def.id);
    if (offer) {
      out.push({ tag: 'Nouvelle quête', label: `❗ ${offer.title}`, primary: true, action: () => this.propose(offer, v, dialogue) });
    }
    const act = this.activeFrom(v.def.id);
    if (act && act !== ready) {
      out.push({ tag: 'Quête en cours', label: `📜 ${act.title}`, action: () => dialogue.render(`${act.desc} ${this.progressText(act)}`) });
    }
    // Livraison : le destinataire reconnaît le colis.
    for (const q of this.activeList()) {
      if (q.turnIn === v.def.id && q !== ready && !this.isReady(q)) {
        out.push({ tag: 'Livraison', label: `📦 ${q.title}`, action: () => dialogue.render(`Oh, c'est pour moi ? Il te manque encore quelque chose… ${this.progressText(q)}`) });
      }
    }
    void g;
    return out;
  }

  propose(q, v, dialogue) {
    const g = this.game;
    const lines = [...q.offer];
    let i = 0;
    const next = () => {
      const last = i === lines.length - 1;
      const text = lines[i++];
      if (!last) {
        dialogue.render(text, [{ label: '▶ Suite', primary: true, action: next }]);
        return;
      }
      dialogue.render(text, [
        // Accepté (ou remis à plus tard) : la fenêtre se ferme, l'habitant remercie d'une bulle.
        { label: '🤝 J\'accepte !', primary: true, action: () => {
          this.accept(q);
          v.character.play('celebrate', 1.2);
          dialogue.close();
          v.say(`Merci ! ${q.desc}`, 4000);
        } },
        { label: '🙏 Plus tard', action: () => {
          dialogue.close();
          v.say('Pas de souci, reviens quand tu veux !');
        } },
      ]);
    };
    g.audio.play('ui');
    next();
  }

  accept(q) {
    const g = this.game;
    this.active[q.id] = { p: q.goals.map(() => 0) };
    for (const [id, n] of Object.entries(q.accept?.items || {})) g.inventory[id] = (g.inventory[id] || 0) + n;
    if (!this.tracked || !this.active[this.tracked]) this.tracked = q.id;
    if (this.tracked === q.id) g.focus = 'side';
    g.ui.toast(`📜 Nouvelle quête : ${q.title}`, 3500);
    g.audio.play('mail');
    g.ui.refreshInventory();
    g.ui.refreshSideQuest?.();
    g.requestSave();
  }

  abandon(id) {
    const q = this.get(id);
    delete this.active[id];
    for (const [it, n] of Object.entries(q.accept?.items || {})) this.game.inventory[it] = Math.max(0, (this.game.inventory[it] || 0) - n);
    if (this.tracked === id) this.tracked = this.activeList()[0]?.id || null;
    this.game.ui.refreshSideQuest?.();
    this.game.requestSave();
  }

  turnIn(q, v, dialogue) {
    const g = this.game;
    // Objets remis.
    for (const goal of q.goals) if (goal.type === 'have') takeItem(g.inventory, goal.item, goal.count);
    for (const [id, n] of Object.entries(q.take || {})) g.inventory[id] = Math.max(0, (g.inventory[id] || 0) - n);
    delete this.active[q.id];
    this.done.add(q.id);
    if (this.tracked === q.id) this.tracked = this.activeList()[0]?.id || null;
    v.character.play('celebrate', 1.5);
    g.particles.emit('heart', v.pos.clone().setY(v.pos.y + 2.2), { count: 4 });
    g.audio.play('adopt');
    dialogue.render(q.thanks);
    const { friends, ...reward } = q.reward;
    for (const [id, n] of Object.entries({ [q.giver]: 10, ...(friends || {}) })) {
      const vv = g.villagers.get(id);
      if (vv) dialogue.addFriendship(vv, n);
    }
    setTimeout(() => g.grantReward({ stars: 2, ...reward }, null, `📜 Quête terminée : ${q.title} !`), 300);
    g.progress.addXp('service', 25);
    g.emit('sidequest', { id: q.id });
    g.ui.refreshInventory();
    g.ui.refreshSideQuest?.();
    g.requestSave();
  }

  progressText(q) {
    return q.goals.map((goal, i) => `${goal.label} ${goal.talk ? '' : `${this.goalValue(q, i)}/${goal.count}`}`.trim()).join(' · ');
  }

  // --- Guide ---------------------------------------------------------------------------------

  /** Où aller pour la quête suivie. */
  target() {
    const q = this.tracked && this.get(this.tracked);
    if (!q || !this.active[q.id]) return null;
    const g = this.game;
    const T = g.quests.targets;
    if (this.isReady(q)) return T.villager(this.turnInOf(q))(g);
    const i = q.goals.findIndex((goal, k) => !goal.talk && this.goalValue(q, k) < goal.count);
    const goal = q.goals[i];
    if (!goal) return T.villager(this.turnInOf(q))(g);
    return this.goalTarget(q, goal) || T.villager(q.giver)(g);
  }

  goalTarget(q, goal) {
    const g = this.game;
    const T = g.quests.targets;
    const zone = (id) => {
      const z = ZONES.find((zz) => zz.id === id);
      return z ? { x: z.x, z: z.z, label: `${z.emoji} ${z.name}`, area: true } : null;
    };
    if (goal.type === 'have') {
      const it = goal.item === 'poisson' ? null : goal.item;
      if (!it) return T.fishing(g);
      const r = g.resources.closestOf?.(it);
      if (r) return { x: r.x, z: r.z, y: r.y, label: `${ITEMS[it].emoji} ${ITEMS[it].label}` };
      if (ITEMS[it]?.cat === 'dish') return T.stove(g);
      if (it === 'citrouille') return T.garden(g);
      if (it === 'perle' || it === 'corail') return zone('lagon');
      return null;
    }
    const byId = {
      'noe-sommet': 'pic', 'hugo-luge': 'pic', 'marin-lac': 'lac', 'marin-legende': 'lagon', 'noe-hercule': 'palmeraie', 'sacha-aurore': 'pic',
      'maelys-inspiration': 'lagon', 'maelys-portrait': 'port', 'paco-danse': 'lagon', 'hugo-ecureuils': 'pinede', 'sacha-chevres': 'pic',
      'coralie-tortues': 'lagon', 'mimi-perroquet': 'palmeraie', 'coralie-especes': 'lagon',
    };
    if (byId[q.id]) {
      if (goal.event === 'catch') {
        const spot = g.world.fishingSpots.find((s) => s.habitat === byId[q.id]);
        if (spot) return { x: spot.x, z: spot.z, y: spot.y, label: `🎣 ${spot.name}` };
      }
      return zone(byId[q.id]);
    }
    if (goal.event === 'catch') return T.fishing(g);
    if (goal.event === 'bathe') {
      const s = g.world.islands.spring;
      return { x: s.x, z: s.z, label: '♨️ Source chaude' };
    }
    if (goal.event === 'stargaze') {
      const t = g.world.islands.telescope;
      return { x: t.x, z: t.z, label: '🔭 Longue-vue' };
    }
    if (goal.event === 'travel') {
      const p = g.player.pos;
      const t = [...g.world.islands.travelPoints].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      return t ? { x: t.x, z: t.z, label: '🧭 Voyages' } : null;
    }
    if (goal.event === 'pet') return T.animal(q.id === 'mimi-calins' ? 'chat' : null)(g);
    if (goal.event === 'insect') return T.insect(g);
    return null;
  }

  // --- Sauvegarde ----------------------------------------------------------------------------

  serialize() {
    return { a: this.active, d: [...this.done], t: this.tracked };
  }

  restore(d) {
    if (!d) return;
    this.active = {};
    for (const [id, st] of Object.entries(d.a || {})) if (BY_ID[id]) this.active[id] = st;
    this.done = new Set((d.d || []).filter((id) => BY_ID[id]));
    this.tracked = d.t && this.active[d.t] ? d.t : null;
  }
}

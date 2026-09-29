// Les habitants parlent des fêtes : la veille (on s'y prépare), le jour même, et le
// lendemain (on s'en souvient… et on te félicite si tu y as brillé). Répliques partagées,
// répliques propres à certains habitants, bavardages entre eux et petites bulles.

import { DAYS_PER_SEASON } from '../world/weather.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Fête d'un jour donné (jour absolu du jeu), comme le calendrier : pas de fête le jour 1. */
function festivalAt(calendar, day) {
  if (day <= 1) return null;
  const season = Math.floor((day - 1) / DAYS_PER_SEASON) % 4;
  const dayInSeason = ((day - 1) % DAYS_PER_SEASON) + 1;
  return calendar.festivalOn(season, dayInSeason);
}

/**
 * Fêtes dont on parle aujourd'hui : celle du jour, celle de demain (la veille) et celle
 * d'hier (le lendemain). Presque chaque jour a sa fête : on parle un peu des trois.
 */
export function festivalMoments(game) {
  const cal = game.calendar;
  if (!cal) return [];
  const day = game.world.sky.day;
  const out = [];
  const today = cal.festival;
  if (today) out.push({ f: today, when: 'day' });
  const tomorrow = festivalAt(cal, day + 1);
  if (tomorrow) out.push({ f: tomorrow, when: 'eve' });
  const yesterday = festivalAt(cal, day - 1);
  if (yesterday) out.push({ f: yesterday, when: 'after' });
  return out;
}

/** Une des fêtes du moment, celle du jour plus souvent que les autres. */
function chooseMoment(game) {
  const list = festivalMoments(game);
  if (!list.length) return null;
  const weight = { day: 2, eve: 1, after: 1 };
  let r = Math.random() * list.reduce((a, m) => a + weight[m.when], 0);
  for (const m of list) {
    r -= weight[m.when];
    if (r <= 0) return m;
  }
  return list[0];
}

// --- Répliques partagées -----------------------------------------------------------------

export const FEST_TALK = {
  oeufs: {
    eve: ['Demain, c\'est la chasse aux œufs ! Mamie Rose en peint depuis une semaine.', 'Tu viens chercher les œufs demain ? Il paraît qu\'il y en a même dans la forêt !'],
    day: ['Tu as trouvé des œufs ? Moi, j\'en ai vu briller près de l\'étang… chut !', 'La chasse aux œufs ! Regarde bien au pied des arbres.', 'Un œuf bleu, un œuf rose… Mamie Rose a du talent !'],
    after: ['Quelle chasse aux œufs, hier ! J\'ai encore du chocolat plein les poches.', 'Tu as vu tous les œufs qu\'on a trouvés hier ? Rose était aux anges.'],
  },
  ete: {
    eve: ['Demain soir, feu d\'artifice sur la plage ! Tu viendras ?', 'Léo a préparé une caisse de fusées pour demain. Il ne tient plus en place !', 'Demain, c\'est la Fête de l\'été. Même ceux du bourg et du port viennent pour le feu d\'artifice !'],
    day: ['Ce soir, tout l\'archipel se retrouve sur la plage pour le feu d\'artifice !', 'Vivement 21 h ! On se met où, sur la plage ?', 'Il paraît qu\'il y aura une fusée en forme de cœur ce soir…'],
    after: ['Tu as vu le feu d\'artifice hier ? Le ciel était plein de couleurs !', 'J\'ai encore les étoiles du feu d\'artifice dans les yeux.', 'Hier soir, sur la plage… quelle belle soirée, tous ensemble !'],
  },
  cuisine: {
    eve: ['Demain, concours de cuisine devant le café ! Tu as choisi ton plat ?', 'Je répète ma recette pour le concours de demain. Enfin… j\'essaie.'],
    day: ['Le jury goûte tout, aujourd\'hui ! Mimi note sévèrement, attention.', 'Ça sent bon partout sur l\'île : c\'est le concours de cuisine !'],
    after: ['Le concours d\'hier… j\'en ai encore l\'eau à la bouche.', 'Élise a trouvé le niveau très relevé, hier. Au propre comme au figuré !'],
  },
  fleurs: {
    eve: ['Demain, Fête des Fleurs ! Pense à cueillir des bouquets.', 'Les fleurs se vendront le double demain. Mamie Rose le sait bien !'],
    day: ['Des fleurs partout, quel bonheur !', 'Tu m\'offres une fleur ? C\'est la fête, après tout !'],
    after: ['L\'île sent encore les fleurs d\'hier.', 'Tu as vu toutes ces fleurs, hier ? On aurait dit un tableau.'],
  },
  peche: {
    eve: ['Demain, concours de pêche ! Marin astique déjà sa canne.', 'Un conseil pour demain : lève-toi tôt, les gros poissons aussi.'],
    day: ['Tu participes au concours ? Bonne chance !', 'Marin dit qu\'il a vu un poisson « grand comme une barque » ce matin.'],
    after: ['Le concours de pêche d\'hier ? On en parlera encore longtemps sur le port !', 'Marin raconte déjà le concours d\'hier. Le poisson grandit à chaque fois.'],
  },
  recolte: {
    eve: ['Demain, Fête des Récoltes : Pomme rachète tout plus cher !', 'Garde tes plus belles récoltes pour demain.'],
    day: ['Quelle belle fête des récoltes !', 'Les paniers débordent aujourd\'hui. Tu as vu les citrouilles ?'],
    after: ['Pomme a le sourire depuis la fête d\'hier. Ses étals sont pleins !', 'Hier, on a récolté de quoi tenir tout l\'hiver !'],
  },
  etoiles: {
    eve: ['Demain, c\'est la Nuit des Étoiles. Il faudra lever les yeux !', 'Les lanternes seront allumées sur la place demain soir.'],
    day: ['Ce soir, on regarde les étoiles ensemble ?', 'Fais un vœu si tu vois une étoile filante ce soir !'],
    after: ['Tu as fait un vœu, hier soir ? Moi oui… mais je ne dirai rien !', 'Quelle nuit, hier ! Le ciel pleuvait d\'étoiles.'],
  },
  cerisiers: {
    eve: ['Demain, pique-nique sous les cerisiers ! Tu apportes un plat ?'],
    day: ['Un pique-nique sous les cerisiers, c\'est la meilleure fête de l\'année !', 'Les pétales tombent dans les assiettes… c\'est si joli.'],
    after: ['Le pique-nique d\'hier était délicieux. Merci d\'être venu·e !', 'J\'ai encore des pétales de cerisier dans les cheveux depuis hier.'],
  },
  port: {
    eve: ['Demain, Fête du Port ! Les voiliers arrivent dans la baie.', 'Nérée a repeint la capitainerie pour la fête de demain.'],
    day: ['Tu as vu les voiliers dans la baie ? Magnifique !', 'Les poissons se vendent bien aujourd\'hui : c\'est la Fête du Port !'],
    after: ['Les voiliers sont repartis… la baie paraît bien vide ce matin.', 'Paco a dansé jusqu\'à l\'aube, hier, à la paillote !'],
  },
  lanternes: {
    eve: ['Demain soir, les lanternes flotteront sur le Lac Miroir.', 'Tu as déjà vu la Fête des Lanternes ? Demain, il faut venir !'],
    day: ['Ce soir, les lanternes vont flotter sur le Lac Miroir. Il faut voir ça !', 'Un cadeau aujourd\'hui compte double. C\'est la magie des lanternes !'],
    after: ['Les lanternes d\'hier sur le lac… on aurait dit des lucioles géantes.', 'J\'ai gardé ma lanterne d\'hier. Je la rallumerai l\'an prochain.'],
  },
  hiver: {
    eve: ['Demain, marché d\'hiver à Bourg-Sapin ! Chocolat chaud pour tout le monde.', 'Le grand sapin s\'illuminera demain. Tu viendras le voir ?'],
    day: ['Le marché d\'hiver ! Un chocolat chaud, et tout va mieux.', 'Tu as vu le grand sapin ? Il brille jusqu\'au port !'],
    after: ['Le marché d\'hier sentait la cannelle. J\'en rêve encore.', 'Élise a vendu toutes ses bûches, hier ! Plus une miette.'],
  },
  neige: {
    eve: ['Demain, Fête des neiges à la prairie ! Bonshommes et boules de neige !', 'Noé prépare ses boules de neige depuis ce matin. Pour demain, dit-il.', 'Hugo vient du bourg demain pour juger les bonshommes de neige. Il est sévère !'],
    day: ['La prairie est toute blanche : bonshommes et bataille de boules de neige !', 'Tu as fait ton bonhomme de neige ? Hugo attend les participants.', 'Attention aux boules de neige de Noé : il vise bien !'],
    after: ['Les bonshommes de neige d\'hier tiennent encore debout sur la prairie !', 'J\'ai encore de la neige dans le col depuis la bataille d\'hier. Brrr !'],
  },
};

// --- Répliques propres à certains habitants ---------------------------------------------

const BY = {
  rose: {
    oeufs: { eve: ['J\'ai peint quatorze œufs cette année. Demain, je les cache… mais je ne te dirai pas où !'], day: ['Alors, mon petit, combien d\'œufs ? Viens me les montrer avant ce soir !'], after: ['Merci d\'avoir joué le jeu, hier. Ça me rappelle quand j\'étais petite.'] },
    cerisiers: { day: ['J\'ai fait une tarte aux cerises pour le pique-nique. Sers-toi !'] },
    neige: { day: ['Mon bonhomme a un chapeau de paille. Un bonhomme de jardinière, forcément !'] },
  },
  leo: {
    ete: { eve: ['J\'ai vérifié chaque fusée deux fois. Demain soir, ça va pétiller !'], day: ['La caisse de fusées est sur la plage, dès 19 h. Lance-en, c\'est plus beau à plusieurs !'], after: ['Tu as vu le bouquet final, hier ? Trois fusées d\'un coup, j\'en tremble encore !'] },
    neige: { day: ['Je suis dans l\'équipe de Noé pour la bataille. On est imbattables !'] },
  },
  mimi: {
    cuisine: { eve: ['Demain, je suis dans le jury. Je vais goûter… beaucoup. Miaou.'], day: ['Viens me présenter ton plat avant 18 h ! Le jury a faim.'], after: ['J\'ai tellement goûté hier que je n\'ai plus faim. Enfin… presque.'] },
  },
  elise: {
    cuisine: { day: ['Le jury, c\'est Mimi, Pomme et moi. La présentation compte beaucoup !'] },
    hiver: { eve: ['Demain, j\'offre le chocolat chaud au marché. Viens tôt, il part vite !'], day: ['Un chocolat chaud ? C\'est offert, c\'est le marché d\'hiver !'] },
    ete: { day: ['Je suis descendue du bourg pour le feu d\'artifice ! J\'ai apporté des biscuits.'] },
  },
  pomme: {
    recolte: { day: ['Aujourd\'hui, je rachète tout 50 % plus cher ! Apporte tes récoltes !'] },
    cuisine: { day: ['Je note la saveur. Une pointe de citrouille, et tu me fais plaisir !'] },
  },
  marin: {
    peche: { eve: ['Demain, concours de pêche. Moussaillon, prépare tes appâts !'], day: ['Ramène-moi le plus gros poisson de l\'archipel, et on en parlera dans les tavernes !'], after: ['Le concours d\'hier ? J\'ai vu des prises dignes des légendes.'] },
  },
  noe: {
    neige: { eve: ['Demain, bataille de boules de neige ! J\'ai déjà une réserve secrète. Chut !'], day: ['Viens te battre avec nous ! Enfin… à coups de boules de neige, hein !'], after: ['Hier, j\'ai reçu une boule de neige dans l\'oreille. C\'était trop bien !'] },
    oeufs: { day: ['J\'ai trouvé un œuf dans un nid d\'oiseau ! Ah non, c\'était un vrai.'] },
  },
  hugo: {
    neige: { eve: ['Demain, je descends juger vos bonshommes de neige. Je veux de la sculpture, pas des boules !'], day: ['Viens me voir quand ton bonhomme est prêt. Je juge la forme, le style… et le nez.'], after: ['Les bonshommes d\'hier avaient du caractère. Je suis fier de vous.'] },
    hiver: { day: ['Le grand sapin, c\'est moi qui l\'ai choisi. Il est beau, hein ?'] },
    ete: { day: ['Je suis venu du bourg pour les fusées. Je ne rate jamais ça.'] },
  },
  sacha: {
    etoiles: { day: ['Ce soir, je te montrerai la constellation du Chat. Promis.'] },
    neige: { day: ['La neige de la prairie est parfaite pour les boules : bien collante !'] },
  },
  aurele: {
    etoiles: { day: ['Une nuit d\'étoiles, c\'est un cadeau qu\'on ne peut pas emballer.'] },
    ete: { day: ['À mon âge, un feu d\'artifice, c\'est une jeunesse qui revient.'] },
  },
  lila: {
    fleurs: { day: ['Une fleur à la boutonnière, et te voilà prêt·e pour la fête !'] },
    neige: { day: ['J\'ai tricoté une écharpe pour mon bonhomme. Il est plus élégant que moi !'] },
  },
  neree: { port: { eve: ['Demain, les voiliers de tout l\'archipel viennent jeter l\'ancre ici !'], day: ['Regarde-les, ces voiliers ! La plus belle fête de l\'année.'] } },
  paco: { port: { day: ['¡ Fiesta ! Ce soir, la paillote ne ferme pas !'] }, ete: { day: ['Je suis venu de Port-Corail avec des jus de coco pour le feu d\'artifice !'] } },
  coralie: { ete: { day: ['Le feu d\'artifice se reflète dans l\'eau… deux spectacles pour le prix d\'un !'] } },
  maelys: { ete: { day: ['Je vais essayer de peindre le feu d\'artifice. Ça bouge trop vite !'] }, lanternes: { day: ['Les lanternes sur le lac… Il me faut du jaune, beaucoup de jaune.'] } },
  bruno: { neige: { day: ['Mon bonhomme a des bras en branches de chêne. Du solide.'] } },
};

// --- Bavardages entre habitants et petites bulles ---------------------------------------

const CHAT = {
  eve: [
    ['Tu viens à la fête demain ?', 'Je ne la raterais pour rien au monde !'],
    ['Demain, c\'est jour de fête !', 'J\'ai déjà choisi ma tenue.'],
  ],
  day: [
    ['Quelle belle fête !', 'Tout l\'archipel est là !'],
    ['Tu t\'amuses ?', 'Comme jamais !'],
  ],
  after: [
    ['C\'était bien, hier, hein ?', 'Vivement l\'an prochain !'],
    ['Tu es rentré·e tard, hier ?', 'Chut… tout le monde dormait déjà.'],
  ],
};

const CHAT_BY = {
  ete: { eve: [['Tu te mets où pour le feu d\'artifice ?', 'Tout devant, près de la caisse de Léo !']], day: [['Ce soir, le ciel va exploser de couleurs !', 'J\'ai apporté une couverture pour la plage.']], after: [['Tu as vu la fusée en forme de cœur ?', 'Oui ! Toute la plage a applaudi !'], ['Hugo et Élise sont venus du bourg, hier !', 'Et Paco avait apporté des jus de coco !']] },
  oeufs: { day: [['Combien d\'œufs tu as trouvés ?', 'Trois… mais j\'en ai mangé un.']] },
  cuisine: { after: [['Tu as goûté le plat du gagnant, hier ?', 'Une merveille. J\'ai demandé la recette !']] },
  neige: { eve: [['Tu fais un bonhomme, demain ?', 'Oui, avec un chapeau et une grande écharpe !']], day: [['Attention, boule de neige !', 'Raté ! Ha ha !']], after: [['Mon bonhomme d\'hier a perdu son nez.', 'Un lapin l\'a mangé, c\'est sûr.']] },
};

const BUBBLES = {
  eve: ['Vivement demain !', '♪ Demain, c\'est la fête…'],
  day: ['Quelle fête !', '♪ La la la !', 'Youpi !'],
  after: ['Quelle soirée, hier…', '*bâille*'],
};
const BUBBLES_BY = {
  ete: { day: ['Vivement ce soir !', '🎆 !'] },
  neige: { day: ['☃️ !', 'Une boule de neige ?', 'Brrr !'] },
  oeufs: { day: ['🥚 ?', 'Un œuf !'] },
  hiver: { day: ['☕ Mmmh…'] },
};

// --- Souvenirs de la joueuse : on la félicite le lendemain -------------------------------

function memory(game, f) {
  const fe = game.festivals;
  const yesterday = game.world.sky.day - 1;
  const me = game.character.appearance.name;
  const rankText = (r) => (r === 1 ? 'la première place' : `la ${r}e place`);
  if (f.id === 'oeufs' && fe?.hunt?.day === yesterday && fe.hunt.found.length) {
    const n = fe.hunt.found.length;
    return fe.hunt.rank === 1 ? `Tu as gagné la chasse aux œufs, hier ! ${n} œufs, ${me}, quel flair !` : `${n} œuf${n > 1 ? 's' : ''} trouvé${n > 1 ? 's' : ''} hier ! Bravo, c'était une belle chasse.`;
  }
  if (f.id === 'ete' && fe?.summer?.day === yesterday && fe.summer.launched > 0) {
    return fe.summer.launched >= 5 ? 'C\'était toi, toutes ces fusées hier soir ? Et ce cœur dans le ciel… magnifique !' : 'Je t\'ai vu·e lancer des fusées, hier soir ! Elles étaient superbes.';
  }
  if (f.id === 'cuisine' && fe?.cook?.day === yesterday && fe.cook.done) {
    return fe.cook.rank === 1 ? 'Le grand prix du concours de cuisine ! Tout le monde ne parle que de ton plat.' : `Ton plat au concours, hier… ${rankText(fe.cook.rank)}, bravo ! Il était délicieux.`;
  }
  if (f.id === 'peche' && game.calendar.contest?.day === yesterday && game.calendar.contest.best > 0) {
    return `Ton poisson d'hier, ${game.calendar.contest.best} cm ! Marin le raconte à tout le monde.`;
  }
  if (f.id === 'neige') {
    const s = fe?.snow?.state;
    if (s?.day === yesterday && s.snowman) return s.snowman.rank === 1 ? 'Ton bonhomme de neige a gagné, hier ! Hugo n\'en revenait pas.' : `Ton bonhomme de neige d'hier avait fière allure ! ${rankText(s.snowman.rank)}, bravo.`;
    if (s?.day === yesterday && s.fight) return s.fight.win ? 'Tu as battu l\'équipe de Noé à la bataille de boules de neige ! Il en parle encore.' : 'Belle bataille de boules de neige, hier ! Noé veut sa revanche l\'an prochain.';
  }
  return null;
}

/** Une réplique de fête pour cet habitant (ou null s'il n'y a rien à fêter). */
export function festivalLine(villager, game) {
  // Ce que la joueuse a fait à la fête d'hier : on lui en parle volontiers.
  const after = festivalMoments(game).find((x) => x.when === 'after');
  if (after && Math.random() < 0.45) {
    const mem = memory(game, after.f);
    if (mem) return mem;
  }
  const m = chooseMoment(game);
  if (!m) return null;
  const { f, when } = m;
  const own = BY[villager.def.id]?.[f.id]?.[when];
  if (own && Math.random() < 0.6) return pick(own);
  const shared = FEST_TALK[f.id]?.[when];
  return shared ? pick(shared) : null;
}

/** Deux habitants qui bavardent de la fête (ou null). */
export function festivalChatter(game) {
  const m = chooseMoment(game);
  if (!m) return null;
  const own = CHAT_BY[m.f.id]?.[m.when];
  return pick(own && Math.random() < 0.65 ? own : CHAT[m.when]);
}

/** Petite bulle de fête (ou null). */
export function festivalBubble(game) {
  const m = chooseMoment(game);
  if (!m) return null;
  const own = BUBBLES_BY[m.f.id]?.[m.when];
  return pick(own && Math.random() < 0.6 ? own : BUBBLES[m.when]);
}

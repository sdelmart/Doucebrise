import * as THREE from 'three';
import { ITEMS, RECIPES, countItem, takeItem } from './items.js';
import { LANDMARKS, ZONES } from '../world/layout.js';
import { createRng } from '../core/math.js';

// L'histoire « Le Cœur de Doucebrise » : 8 chapitres (plus un épilogue) qui font
// découvrir toute l'île. Chaque quête sait où guider le joueur (flèche dorée) et
// propose un indice (bouton 💡). Plus les demandes du jour des habitants.

const ev = (event, count, label, filter = null) => ({ event, count, label, filter });
const st = (check, count, label) => ({ check, count, label });

// --- Cibles du guide ------------------------------------------------------------------

export const T = {
  villager: (id) => (g) => {
    const v = g.villagers.get(id);
    if (!v) return null;
    if (v.home || !v.root.visible && v.pos.distanceTo(g.player.pos) > 70) {
      const d = g.world.village.doorFront(v.def.house, 1.2);
      return { x: d.x, z: d.z, label: `${v.def.emoji} ${v.def.name}${v.home ? ' (chez elle/lui)' : ''}` };
    }
    return { x: v.pos.x, z: v.pos.z, y: v.pos.y, label: `${v.def.emoji} ${v.def.name}` };
  },
  homeDoor: (g) => {
    const d = g.world.village.doorFront(0, 1.0);
    return { x: d.x, z: d.z, label: '🏡 Ta maison' };
  },
  garden: (g) => {
    const y = g.world.village.yard;
    return { x: y.x, z: y.z, label: '🌱 Ton potager' };
  },
  shop: (id, label) => (g) => {
    const s = g.world.village.shopSpots[id];
    return s ? { x: s.x + Math.sin(s.rot) * 2, z: s.z + Math.cos(s.rot) * 2, label } : null;
  },
  animal: (species = null) => (g) => {
    const p = g.player.pos;
    let best = null;
    let bd = Infinity;
    for (const a of g.animals.animals) {
      if (a.adopted || (species && a.species !== species)) continue;
      const d = a.pos.distanceTo(p);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best ? { x: best.pos.x, z: best.pos.z, y: best.pos.y, label: `${best.sp.emoji} ${best.sp.label}` } : null;
  },
  resourceOf: (item) => (g) => {
    const r = g.resources.closestOf?.(item);
    return r ? { x: r.x, z: r.z, y: r.y, label: `${ITEMS[item].emoji} ${ITEMS[item].label}` } : null;
  },
  resource: (g) => {
    const r = g.resources.closestAvailable?.();
    return r ? { x: r.x, z: r.z, y: r.y, label: `${ITEMS[r.item].emoji} ${ITEMS[r.item].label}` } : null;
  },
  fishing: (g) => {
    const p = g.player.pos;
    const s = [...g.world.fishingSpots].filter((f) => f.habitat !== 'falaise').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    return s ? { x: s.x, z: s.z, y: s.y, label: `🎣 ${s.name}` } : null;
  },
  insect: (g) => {
    const b = g.insects.closest();
    if (b && b.pos.distanceTo(g.player.pos) < 40) return { x: b.pos.x, z: b.pos.z, y: b.pos.y, label: `${b.def.emoji} Insecte` };
    const z = ZONES.find((zz) => zz.id === 'prairie');
    return { x: z.x, z: z.z, label: '🌷 Prairie aux Fleurs', area: true };
  },
  zone: (id) => () => {
    const z = ZONES.find((zz) => zz.id === id);
    return { x: z.x, z: z.z, label: `${z.emoji} ${z.name}` };
  },
  lighthouse: () => ({ x: LANDMARKS.lighthouse.x - 3, z: LANDMARKS.lighthouse.z + 3, label: '🗼 Le phare' }),
  jobBoard: (g) => {
    const b = g.world.village.jobBoard;
    return { x: b.x, z: b.z, label: '📋 Tableau des petits boulots' };
  },
  stove: (g) => {
    if (!g.house.inside) return T.homeDoor(g);
    const s = g.house.placed.find((p) => p.id === 'cuisiniere');
    return s ? { x: s.obj.position.x, z: s.obj.position.z + 1, y: 0, label: '🍳 Cuisinière', inside: true } : null;
  },
};

// --- Chapitres ----------------------------------------------------------------------------

export const CHAPTERS = [
  { id: 'arrivee', n: 1, title: 'Bienvenue à Doucebrise', emoji: '⛵',
    text: 'Tu débarques sur la petite île de Doucebrise. On raconte que son phare brillait jadis si fort qu\'on le voyait depuis l\'autre bout de la mer… Mais sa lumière s\'est affaiblie, et les habitants se sont un peu perdus de vue. Mamie Rose t\'a écrit pour t\'inviter : elle t\'attend !' },
  { id: 'amis', n: 2, title: 'Des amis à poils', emoji: '🐾',
    text: 'Les animaux de l\'île sont timides, mais ils ont un cœur immense. Mimi, qui tient le Café des Chats, connaît tous leurs petits secrets.' },
  { id: 'tresors', n: 3, title: 'Les trésors de l\'île', emoji: '🧺',
    text: 'Baies, coquillages, papillons… L\'île regorge de merveilles. Noé, le petit explorateur, a une surprise pour toi !' },
  { id: 'grandbleu', n: 4, title: 'Le grand bleu', emoji: '🌊',
    text: 'Marin, le vieux pêcheur, dit que la mer murmure des histoires à ceux qui savent l\'écouter. Et le phare, là-bas, veille toujours…' },
  { id: 'nid', n: 5, title: 'Un nid douillet', emoji: '🏡',
    text: 'Une maison, c\'est plus que des murs : c\'est un endroit où l\'on a envie de revenir. Bruno le menuisier peut t\'aider à la rendre unique.' },
  { id: 'chemins', n: 6, title: 'Sur les chemins', emoji: '🚲',
    text: 'Léo, le mécano, répare tout ce qui roule, flotte ou vole. Et le village a besoin de bras pour de petits boulots !' },
  { id: 'famille', n: 7, title: 'Une grande famille', emoji: '💞',
    text: 'Les habitants s\'étaient éloignés les uns des autres. Et si c\'était toi, le lien qui les rassemble ?' },
  { id: 'coeur', n: 8, title: 'Le Cœur de Doucebrise', emoji: '🗼',
    text: 'Grâce à toi, l\'île a retrouvé le sourire. Il ne reste qu\'une chose à faire : rallumer le phare. Tout le monde t\'attendra au Cap du Phare, à la tombée de la nuit…' },
  { id: 'pins', n: 9, title: 'Les veilleurs des Pins', emoji: '🏔️',
    text: 'Depuis que le phare brille, on aperçoit de nouveau des lumières au nord-ouest : Bourg-Sapin, le village de l\'île des Pins. Mais là-haut, le grand sapin des Veilleurs s\'est éteint, comme le phare autrefois… Le Pont des Brumes t\'attend.' },
  { id: 'lagon', n: 10, title: 'Le chant du lagon', emoji: '🐋',
    text: 'Une mouette dépose un message de Port-Corail : le capitaine Nérée a vu le phare se rallumer et t\'invite sur l\'île Corail. On raconte qu\'une baleine chantait au large du lagon, les nuits d\'été… et qu\'elle ne revient plus.' },
  { id: 'epilogue', n: 11, title: 'Épilogue : la vie dans l\'archipel', emoji: '🌈',
    text: 'Le phare brille à nouveau ! Doucebrise est ta maison, maintenant. Il reste mille choses à faire : agrandir ta maison, compléter tes collections, devenir le meilleur ami de chacun…' },
];

export const STORY = [
  // 1 — Bienvenue
  { id: 'bienvenue', chapter: 'arrivee', title: 'La lettre de Mamie Rose', giver: 'rose',
    desc: 'Mamie Rose, la jardinière, t\'attend. Sa maison a un toit vert, au sud de la place.',
    hint: 'Suis la flèche dorée (ou l\'étoile sur la mini-carte). Approche-toi de Mamie Rose et appuie sur E pour lui parler.',
    goals: [ev('talk', 1, 'Parler à Mamie Rose', (d) => d.villager.def.id === 'rose')],
    target: T.villager('rose'), reward: { coins: 50, items: { 'sem-carotte': 3 } } },
  { id: 'maison', chapter: 'arrivee', title: 'Ta petite maison', giver: 'rose',
    desc: 'Ta maison t\'attend juste à côté de la place, avec la pancarte à ton nom. Entre donc voir !',
    hint: 'Va devant la porte de ta maison (pancarte « Chez… ») et appuie sur E pour entrer.',
    goals: [ev('enter', 1, 'Entrer dans ta maison')],
    target: T.homeDoor, reward: { coins: 30 } },
  { id: 'potager', chapter: 'arrivee', title: 'Le potager', giver: 'rose',
    desc: 'Derrière ta maison, ton jardin a 9 parcelles. Plante tes semis de carotte et arrose-les.',
    hint: 'Dans le jardin clôturé derrière ta maison : approche-toi d\'une parcelle, E pour planter, puis E encore pour arroser. F change de semis.',
    goals: [ev('plant', 1, 'Planter un semis'), ev('water', 1, 'Arroser une parcelle')],
    target: T.garden, reward: { coins: 30, items: { 'sem-fraise': 2 } } },
  // 2 — Des amis à poils
  { id: 'amis', chapter: 'amis', title: 'Des amis à poils', giver: null,
    desc: 'Les animaux adorent les câlins. Approche-toi doucement (sans courir !) et caresse-les.',
    hint: 'Marche près d\'un animal et appuie sur E. Évite de courir (Maj) : ça effraie les plus timides.',
    goals: [ev('pet', 3, 'Caresser des animaux')],
    target: T.animal(), reward: { items: { friandise: 2 } } },
  { id: 'cafe', chapter: 'amis', title: 'Le Café des Chats', giver: 'mimi',
    desc: 'Mimi tient le Café des Chats, la maison rose aux oreilles de chat, à l\'ouest de la place. Va lui dire bonjour !',
    hint: 'Le café a des oreilles de chat sur le toit ! Suis la flèche et parle à Mimi (E).',
    goals: [ev('talk', 1, 'Parler à Mimi', (d) => d.villager.def.id === 'mimi')],
    target: T.villager('mimi'), reward: { coins: 30, items: { patee: 2 } } },
  { id: 'gourmand', chapter: 'amis', title: 'Petit gourmand', giver: 'mimi',
    desc: 'Chaque espèce a un plat préféré. Essaie différentes nourritures pour le découvrir !',
    hint: 'Près d\'un animal, appuie sur F pour lui donner à manger. Le lapin adore les carottes, le chat… la pâtée ou le poisson !',
    goals: [ev('feed', 1, 'Donner son plat préféré à un animal', (d) => d.fav || (d.food === 'patee' && d.animal?.species === 'chat'))],
    target: T.animal('chat'), reward: { coins: 40 } },
  { id: 'chats', chapter: 'amis', title: 'La colonie de Mimi', giver: 'mimi',
    desc: 'Une ribambelle de chats vit devant le café. Fais-leur des câlins !',
    hint: 'Les chats se prélassent devant le Café des Chats et sur la place. Caresse-les avec E.',
    goals: [ev('pet', 3, 'Caresser des chats', (d) => d.animal?.species === 'chat')],
    target: T.animal('chat'), reward: { coins: 50, items: { patee: 2 } } },
  // 3 — Les trésors de l'île
  { id: 'cueillette', chapter: 'tresors', title: 'Cueillette', giver: null,
    desc: 'Baies, pommes, champignons, coquillages, fleurs… L\'île regorge de trésors.',
    hint: 'Cherche les buissons à baies, les pommiers du verger, les champignons en forêt et les coquillages sur la plage. E pour ramasser.',
    goals: [ev('gather', 8, 'Cueillir ou ramasser des objets')],
    target: T.resource, reward: { coins: 50 } },
  { id: 'marche', chapter: 'tresors', title: 'Au marché', giver: 'pomme',
    desc: 'Pomme, au stand rayé de la place, achète tout ce que tu trouves.',
    hint: 'Parle à Pomme (stand rose et blanc sur la place), choisis Boutique puis l\'onglet Vendre.',
    goals: [ev('sell', 1, 'Vendre quelque chose à Pomme')],
    target: T.shop('marche', '🧺 Marché de Pomme'), reward: { coins: 40 } },
  { id: 'filet', chapter: 'tresors', title: 'La surprise de Noé', giver: 'noe',
    desc: 'Noé t\'attend : il paraît qu\'il a un cadeau pour toi !',
    hint: 'Noé joue souvent dans la prairie aux fleurs pendant la journée. Parle-lui et choisis « Tu voulais me montrer quelque chose ? ».',
    goals: [ev('story', 1, 'Parler à Noé de sa surprise', (d) => d.id === 'filet')],
    story: { villager: 'noe', label: '🦋 Tu voulais me montrer quelque chose ?', lines: [
      'Ouiii ! Regarde, c\'est mon vieux filet à papillons ! Je l\'ai réparé rien que pour toi.',
      'Approche-toi tout doucement d\'un insecte et appuie sur E. Si tu cours, ils s\'envolent !',
      'Il y a treize sortes d\'insectes sur l\'île. Certains ne sortent que la nuit… ou sous la pluie ! On fait la course pour tous les trouver ?',
    ], reward: { unlock: 'tool:filet', clothing: 'back:filet' } },
    target: T.villager('noe'), reward: { coins: 30 } },
  { id: 'insecte', chapter: 'tresors', title: 'Chasse aux papillons', giver: 'noe',
    desc: 'Avec ton nouveau filet, attrape ton premier insecte !',
    hint: 'Les papillons volent dans la prairie et le village en journée. Approche-toi sans courir et appuie sur E.',
    goals: [ev('insect', 1, 'Attraper un insecte')],
    target: T.insect, reward: { coins: 60 } },
  { id: 'recolte', chapter: 'tresors', title: 'Première récolte', giver: 'rose',
    desc: 'Arrose ton potager chaque jour (la pluie le fait pour toi) jusqu\'à la récolte.',
    hint: 'Les semis poussent en 1 à 2 jours s\'ils sont arrosés. Dors dans ton lit pour passer la nuit plus vite !',
    goals: [ev('harvest', 1, 'Récolter une parcelle')],
    target: T.garden, reward: { coins: 40, items: { 'sem-tomate': 3 } } },
  // 4 — Le grand bleu
  { id: 'peche', chapter: 'grandbleu', title: 'Graine de pêcheur', giver: 'marin',
    desc: 'Au bout du ponton de la plage ou à l\'étang : attends que le flotteur plonge, puis ferre dans la zone verte !',
    hint: 'Appuie sur E au coin de pêche. Quand « Ça mord ! » s\'affiche, appuie sur E, puis encore sur E quand le curseur passe dans la zone verte.',
    goals: [ev('catch', 3, 'Pêcher des poissons')],
    target: T.fishing, reward: { coins: 80, items: { appat: 5 } } },
  { id: 'cuisine', chapter: 'grandbleu', title: 'Petit chef', giver: 'marin',
    desc: 'Utilise la cuisinière de ta maison pour préparer un plat.',
    hint: 'Chez toi, approche-toi de la cuisinière et appuie sur E. La confiture ne demande que 3 baies !',
    goals: [ev('cook', 1, 'Cuisiner un plat')],
    target: T.stove, reward: { coins: 60, items: { 'sem-mais': 2 } } },
  { id: 'phare', chapter: 'grandbleu', title: 'Le vieux phare', giver: 'marin',
    desc: 'Marin dit que le phare veille sur l\'île depuis cent ans. Va le voir de près, au Cap du Phare.',
    hint: 'Le phare rayé rouge et blanc se trouve au nord-est. Prends le chemin qui passe par le verger.',
    goals: [ev('zone', 1, 'Visiter le Cap du Phare', (d) => d.zone === 'phare')],
    target: T.lighthouse, reward: { coins: 80 } },
  // 5 — Un nid douillet
  { id: 'chezsoi', chapter: 'nid', title: 'Chez soi', giver: 'bruno',
    desc: 'Bruno fabrique des meubles. Achète-en un, puis entre chez toi et décore (touche B).',
    hint: 'La menuiserie de Bruno est devant sa maison au toit orange. Ensuite, chez toi, appuie sur B, choisis le meuble et clique pour le poser.',
    goals: [ev('buy', 1, 'Acheter un meuble', (d) => d.shop === 'menuiserie'), ev('place', 1, 'Placer un meuble')],
    target: T.shop('menuiserie', '🪚 Menuiserie de Bruno'), reward: { coins: 100 } },
  { id: 'facade', chapter: 'nid', title: 'Un coup de pinceau', giver: 'bruno',
    desc: 'Dans ton jardin, appuie sur B puis ouvre l\'onglet « Façade » : murs, toit, volets, porte… Change au moins une couleur !',
    hint: 'Va dans ton jardin (derrière la maison), appuie sur B, onglet 🏠 Façade, puis clique une couleur.',
    goals: [ev('facade', 1, 'Personnaliser ta façade')],
    target: T.garden, reward: { coins: 100 } },
  { id: 'deco', chapter: 'nid', title: 'Maison de rêve', giver: 'bruno',
    desc: 'Rends ta maison vraiment douillette : au moins 10 meubles posés, dedans ou dans le jardin.',
    hint: 'Bruno vend plus de 90 meubles, rangés par pièce. Les gros meubles peuvent aussi aller au jardin !',
    goals: [st((g) => g.house.placed.length, 10, 'Meubles posés')],
    target: T.shop('menuiserie', '🪚 Menuiserie de Bruno'), reward: { coins: 150, furniture: { 'lampe-champignon': 1 } } },
  // 6 — Sur les chemins
  { id: 'garage', chapter: 'chemins', title: 'Le garage de Léo', giver: 'leo',
    desc: 'Léo tient le garage au nord-est de la place, près du chemin de la plage. Va faire sa connaissance !',
    hint: 'Cherche le bâtiment bleu et rouge avec la voiturette devant. Parle à Léo (E).',
    goals: [ev('talk', 1, 'Parler à Léo', (d) => d.villager.def.id === 'leo')],
    target: T.villager('leo'), reward: { coins: 50 } },
  { id: 'vehicule', chapter: 'chemins', title: 'En route !', giver: 'leo',
    desc: 'Achète ton premier véhicule au garage (la trottinette ne coûte que 450 🪙), puis appuie sur V pour monter !',
    hint: 'Parle à Léo → Boutique. Une fois acheté, appuie sur V n\'importe où dehors. V ou E pour descendre, Maj pour accélérer.',
    goals: [ev('ride', 1, 'Faire un tour en véhicule')],
    target: T.shop('garage', '🔧 Garage de Léo'), reward: { coins: 150 } },
  { id: 'boulot', chapter: 'chemins', title: 'Un coup de main', giver: 'leo',
    desc: 'Le tableau en bois de la place propose chaque jour des petits boulots payés. Accepte-en un et termine-le !',
    hint: 'Le tableau « Petits boulots » est à l\'ouest de la fontaine. Une fois la mission acceptée, suis la flèche bleue.',
    goals: [ev('job', 1, 'Terminer un petit boulot')],
    target: T.jobBoard, reward: { coins: 100 } },
  { id: 'voisins', chapter: 'chemins', title: 'Bon voisin', giver: null,
    desc: 'Les habitants apprécient les cadeaux et ont parfois besoin d\'aide (petit « ! » bleu au-dessus de leur tête).',
    hint: 'Parle à un habitant et choisis « Offrir un cadeau ». Les demandes du jour sont dans le journal (J), onglet Demandes.',
    goals: [ev('gift', 1, 'Offrir un cadeau'), ev('request', 1, 'Terminer une demande du jour')],
    target: null, reward: { coins: 150 } },
  // 7 — Une grande famille
  { id: 'adoption', chapter: 'famille', title: 'Une nouvelle famille', giver: 'mimi',
    desc: 'Remplis les 5 cœurs d\'un animal pour pouvoir l\'adopter (R).',
    hint: 'Caresse le même animal chaque jour et donne-lui son plat préféré : ses cœurs montent vite. À 5 cœurs, appuie sur R !',
    goals: [ev('adopt', 1, 'Adopter un animal')],
    target: T.animal(), reward: { coins: 100, furniture: { panier: 1 } } },
  { id: 'amitie', chapter: 'famille', title: 'Tisser des liens', giver: null,
    desc: 'Discute chaque jour avec les habitants et offre-leur ce qu\'ils aiment : deviens ami·e avec trois d\'entre eux.',
    hint: 'Chaque discussion quotidienne et chaque cadeau aimé font monter l\'amitié. Leurs goûts sont notés dans le journal une fois découverts.',
    goals: [st((g) => g.villagers.list.filter((v) => v.friendship >= 40).length, 3, 'Habitants à 2 cœurs')],
    target: null, reward: { coins: 200 } },
  { id: 'confidence', chapter: 'famille', title: 'Une confidence', giver: null,
    desc: 'Quand un habitant te fait assez confiance (2 cœurs), il te confie un souvenir. Écoute-le !',
    hint: 'Parle à un habitant avec qui tu as au moins 2 cœurs : une scène spéciale se déclenche.',
    goals: [ev('heartEvent', 1, 'Vivre une scène d\'amitié')],
    target: null, reward: { coins: 150 } },
  // 8 — Le Cœur de Doucebrise
  { id: 'rassemblement', chapter: 'coeur', title: 'Le secret du phare', giver: 'rose',
    desc: 'Mamie Rose veut te parler du phare. Elle a l\'air émue…',
    hint: 'Parle à Mamie Rose et choisis « 🗼 Le phare… ».',
    goals: [ev('story', 1, 'Écouter Mamie Rose', (d) => d.id === 'rassemblement')],
    story: { villager: 'rose', label: '🗼 Le phare…', lines: [
      'Assieds-toi, mon petit. Tu sais… autrefois, le phare brillait de mille feux. On l\'appelait « le Cœur de Doucebrise ».',
      'Il s\'est éteint petit à petit, quand chacun a commencé à rester dans son coin. Plus personne ne se parlait vraiment.',
      'Et puis tu es arrivé·e. Tu as parlé à tout le monde, rendu service, adopté nos animaux… Regarde : chaque étincelle que tu as rallumée brille là-haut.',
      'Ce soir, tout le village se retrouve au phare. Viens à la tombée de la nuit : c\'est toi qui vas le rallumer. ♥',
    ] },
    target: T.villager('rose'), reward: { coins: 100 } },
  { id: 'rallumer', chapter: 'coeur', title: 'Rallumer le phare', giver: null,
    desc: 'Rends-toi au pied du phare, au Cap du Phare, entre 19 h et 5 h. Tout le monde t\'y attend !',
    hint: 'S\'il fait encore jour, fais une sieste dans ton lit ou attends le soir. Un véhicule t\'y emmène plus vite !',
    goals: [ev('finale', 1, 'Rallumer le phare, la nuit')],
    target: T.lighthouse, reward: { coins: 2000, furniture: { trophee: 1 }, stars: 20 } },
  // 9 — Les veilleurs des Pins
  { id: 'pont-brumes', chapter: 'pins', title: 'Le Pont des Brumes', giver: 'rose',
    desc: 'Au nord-ouest de la place, le Pont des Brumes mène à l\'île des Pins. Traverse-le jusqu\'à Bourg-Sapin.',
    hint: 'Prends le chemin qui part vers le nord-ouest depuis la place, passe sous l\'arche fleurie et traverse le grand pont de bois.',
    goals: [ev('zone', 1, 'Arriver à Bourg-Sapin', (d) => d.zone === 'bourg')],
    target: T.zone('bourg'), reward: { coins: 150 } },
  { id: 'gardien', chapter: 'pins', title: 'Le gardien de la source', giver: 'aurele',
    desc: 'Grand-père Aurèle veille sur la source chaude, au sud du bourg. Il a quelque chose à te dire.',
    hint: 'La source chaude fume au sud de la place de Bourg-Sapin. Parle à Aurèle et choisis « 🌲 Le grand sapin… ».',
    goals: [ev('story', 1, 'Écouter Aurèle', (d) => d.id === 'gardien')],
    story: { villager: 'aurele', label: '🌲 Le grand sapin…', lines: [
      'Te voilà enfin. J\'ai vu la lumière du phare traverser la brume, l\'autre nuit. Ça faisait des années.',
      'Ici aussi, nous avions notre lumière : le grand sapin des Veilleurs, au milieu de la place. Ses guirlandes brillaient toutes les nuits.',
      'Elles se sont éteintes une à une, quand les gens ont cessé de monter au Pic et de se retrouver le soir.',
      'Les anciens disaient que les cristaux du Pic gardent un peu de lumière d\'étoile. Rapporte-m\'en trois, et nous verrons…',
    ] },
    target: T.villager('aurele'), reward: { coins: 100 } },
  { id: 'cristaux-sapin', chapter: 'pins', title: 'La lumière des cristaux', giver: 'aurele',
    desc: 'Détache 3 cristaux sur les flancs du Pic des Neiges, puis apporte-les à Aurèle.',
    hint: 'Les cristaux violets et bleus poussent sur les pentes du Pic, au nord-ouest du bourg. Approche-toi et appuie sur E.',
    goals: [ev('story', 1, 'Apporter 3 cristaux à Aurèle', (d) => d.id === 'cristaux-sapin')],
    story: { villager: 'aurele', label: '💎 Voici les cristaux', take: { cristal: 3 }, lines: [
      'Trois cristaux du Pic… Regarde comme ils scintillent, même en plein jour.',
      'Je vais les tailler et les accrocher au grand sapin. Mais il manque encore quelque chose : les gens du bourg.',
      'Une lumière, ça ne sert à rien si personne ne la regarde ensemble.',
    ] },
    target: (g) => (countItem(g.inventory, 'cristal') >= 3 ? T.villager('aurele')(g) : T.resourceOf('cristal')(g)), reward: { coins: 150 } },
  { id: 'belvedere-nuit', chapter: 'pins', title: 'Le phare vu d\'en haut', giver: 'sacha',
    desc: 'Sacha dit que, du belvédère du Pic, on voit le phare de Doucebrise briller la nuit. Observe le ciel à la longue-vue, de nuit.',
    hint: 'La longue-vue est au belvédère, près du sommet du Pic. Viens après 20 h 30 et appuie sur E devant elle.',
    goals: [ev('stargaze', 1, 'Observer le ciel de nuit au belvédère')],
    target: (g) => ({ x: g.world.islands.telescope.x, z: g.world.islands.telescope.z, label: '🔭 Longue-vue' }), reward: { coins: 120, stars: 3 } },
  { id: 'veillee', chapter: 'pins', title: 'Les gens du bourg', giver: 'elise',
    desc: 'Pour la veillée, Élise veut que tout le monde se sente invité. Offre un cadeau à trois habitants de Bourg-Sapin (Aurèle, Élise, Hugo ou Sacha).',
    hint: 'Parle aux habitants du bourg et choisis « Offrir un cadeau ». Myrtilles, champignons et chocolat chaud font toujours plaisir ici !',
    goals: [ev('gift', 3, 'Cadeaux aux habitants du bourg', (d) => ['aurele', 'elise', 'hugo', 'sacha'].includes(d.villager?.def.id))],
    target: T.villager('elise'), reward: { coins: 150, items: { chocolat: 2 } } },
  { id: 'sapin-rallume', chapter: 'pins', title: 'La nuit des Veilleurs', giver: 'aurele',
    desc: 'Tout le bourg se retrouve au pied du grand sapin, à la nuit tombée (après 19 h). C\'est toi qui allumeras les guirlandes !',
    hint: 'Rends-toi sur la place de Bourg-Sapin entre 19 h et 5 h, près du grand sapin.',
    goals: [ev('treeLit', 1, 'Rallumer le grand sapin, la nuit')],
    target: T.zone('bourg'), reward: { coins: 800, stars: 15, furniture: { 'lanterne-chalet': 2 }, title: 'Veilleur·se des Pins' } },
  // 10 — Le chant du lagon
  { id: 'pont-soleil', chapter: 'lagon', title: 'Le Pont du Soleil', giver: 'neree',
    desc: 'À l\'est de la Prairie aux Fleurs, le Pont du Soleil mène à l\'île Corail. Rejoins Port-Corail.',
    hint: 'Traverse la prairie vers le nord-est, passe l\'arche fleurie, puis le long pont. Tu peux aussi voyager depuis un panneau 🧭.',
    goals: [ev('zone', 1, 'Arriver à Port-Corail', (d) => d.zone === 'port')],
    target: T.zone('port'), reward: { coins: 150 } },
  { id: 'capitaine', chapter: 'lagon', title: 'Le message du capitaine', giver: 'neree',
    desc: 'Le capitaine Nérée t\'attend à la capitainerie du port.',
    hint: 'La capitainerie est la maison violette avec une bouée, près des pontons. Parle à Nérée et choisis « 🐋 La baleine ? ».',
    goals: [ev('story', 1, 'Écouter Nérée', (d) => d.id === 'capitaine')],
    story: { villager: 'neree', label: '🐋 La baleine ?', lines: [
      'Ah, te voilà, matelot ! C\'est toi qui as rallumé le phare ? Tout l\'archipel en parle.',
      'Autrefois, une baleine venait chanter au large du lagon, les nuits d\'été. Les pêcheurs se guidaient à son chant.',
      'Depuis que le phare s\'était éteint, elle ne vient plus. Elle doit croire qu\'il n\'y a plus personne ici…',
      'Coralie, au club de plongée, connaît une vieille légende à ce sujet. Va la voir !',
    ] },
    target: T.villager('neree'), reward: { coins: 100 } },
  { id: 'conque', chapter: 'lagon', title: 'La conque des pêcheurs', giver: 'coralie',
    desc: 'Coralie peut fabriquer une conque qui imite le chant de la baleine, avec 2 morceaux de corail et 2 étoiles de mer.',
    hint: 'Le corail se ramasse au bord du Lagon Turquoise ; les étoiles de mer sur les plages de l\'île Corail. Rapporte-les à Coralie.',
    goals: [ev('story', 1, 'Apporter corail et étoiles de mer à Coralie', (d) => d.id === 'conque')],
    story: { villager: 'coralie', label: '🐚 Voici le corail et les étoiles', take: { corail: 2, 'etoile-mer': 2 }, lines: [
      'Parfait ! Le corail pour la voix, les étoiles de mer pour la mémoire… c\'est ce que dit la légende.',
      'Et voilà : une conque des pêcheurs. Quand on souffle dedans, elle chante comme une baleine.',
      'Il faudra souffler au bout du ponton du lagon, une nuit. Mais d\'abord, il faut que l\'île entière soit en fête !',
    ], reward: { items: { conque: 1 } } },
    target: (g) => (countItem(g.inventory, 'corail') >= 2 && countItem(g.inventory, 'etoile-mer') >= 2 ? T.villager('coralie')(g) : countItem(g.inventory, 'corail') < 2 ? T.zone('lagon')() : T.resourceOf('etoile-mer')(g)), reward: { coins: 150 } },
  { id: 'fete-paillote', chapter: 'lagon', title: 'La fête de la paillote', giver: 'paco',
    desc: 'Paco organise une fête pour le retour de la baleine. Mets l\'ambiance : danse au bord du lagon !',
    hint: 'Va sur la plage du Lagon Turquoise ou dans la Palmeraie et appuie sur 2 pour danser.',
    goals: [ev('emote', 1, 'Danser au bord du lagon', (d) => d.name === 'dance' && ['lagon', 'palmeraie', 'corail'].includes(d.zone))],
    target: T.zone('lagon'), reward: { coins: 120, items: { cocktail: 2 } } },
  { id: 'souvenir-archipel', chapter: 'lagon', title: 'Un souvenir pour Maëlys', giver: 'maelys',
    desc: 'Maëlys veut peindre l\'archipel entier. Prends une photo depuis la Colline aux Mouettes, là où se dresse la gloriette.',
    hint: 'La gloriette blanche au toit turquoise est au sommet de la colline, au sud-est du port. Appuie sur O pour le mode photo.',
    goals: [ev('photo', 1, 'Photo depuis la Colline aux Mouettes', (d) => d.zone === 'belvedere')],
    target: T.zone('belvedere'), reward: { coins: 150, furniture: { 'tableau-lagon': 1 } } },
  { id: 'chant-baleine', chapter: 'lagon', title: 'Le chant de la baleine', giver: 'coralie',
    desc: 'La nuit (après 20 h), souffle dans la conque au bout du ponton du Lagon Turquoise.',
    hint: 'Le ponton du lagon part de la plage, près de la paillote. Va tout au bout, de nuit : la conque sonnera toute seule.',
    goals: [ev('whale', 1, 'Appeler la baleine, la nuit')],
    target: (g) => {
      const s = g.world.fishingSpots.find((f) => f.habitat === 'lagon');
      return s ? { x: s.x, z: s.z, y: s.y, label: '🐚 Bout du ponton du lagon' } : T.zone('lagon')();
    }, reward: { coins: 1500, stars: 20, furniture: { 'aquarium-geant': 1 }, title: 'Ami·e des baleines' } },
  // Épilogue
  { id: 'citrouille', chapter: 'epilogue', title: 'La citrouille géante', giver: 'rose',
    desc: 'Les citrouilles demandent de la patience… Mamie Rose vend les semis.',
    hint: 'Les semis de citrouille sont chez Mamie Rose. Elles poussent en 3 jours, bien arrosées.',
    goals: [ev('harvest', 1, 'Récolter une citrouille', (d) => d.crop === 'citrouille')],
    target: T.garden, reward: { coins: 300 } },
  { id: 'agrandir', chapter: 'epilogue', title: 'Pousser les murs', giver: 'bruno',
    desc: 'Bruno peut agrandir ta maison : plus de place pour tes meubles et une nouvelle façade !',
    hint: 'Parle à Bruno → Boutique → onglet 🔨 Travaux.',
    goals: [st((g) => g.house.size, 1, 'Agrandir ta maison')],
    target: T.shop('menuiserie', '🪚 Menuiserie de Bruno'), reward: { coins: 400 } },
  { id: 'carnet', chapter: 'epilogue', title: 'Naturaliste', giver: 'noe',
    desc: 'Noé veut connaître tous les animaux de l\'île ! Caresse-les pour remplir ton carnet.',
    hint: 'Chaque pelage différent compte. Les chats, à eux seuls, en ont dix-neuf !',
    goals: [st((g) => Object.values(g.animals.discovered).reduce((s, d) => s + d.variants.length, 0), 20, 'Découvrir des pelages')],
    target: null, reward: { coins: 250, furniture: { 'arbre-chat': 1 } } },
  { id: 'collection', chapter: 'epilogue', title: 'Petites bêtes', giver: 'noe',
    desc: 'Attrape 8 espèces d\'insectes différentes. Certaines ne sortent que la nuit ou sous la pluie !',
    hint: 'Le journal (J) → Collections indique les insectes déjà trouvés.',
    goals: [st((g) => Object.keys(g.insects.caught).length, 8, 'Espèces d\'insectes')],
    target: null, reward: { coins: 300 } },
  { id: 'famille', chapter: 'epilogue', title: 'Grande famille', giver: null,
    desc: 'Un chat, un chien, un lapin… Et pourquoi pas tous ?',
    hint: 'Tu peux avoir autant de compagnons que tu veux ; trois peuvent te suivre en même temps.',
    goals: [st((g) => g.animals.companions().length, 3, 'Adopter des animaux')],
    target: null, reward: { coins: 300, unlock: 'hat:etoile' } },
  { id: 'coeur', chapter: 'epilogue', title: 'Meilleur·e ami·e', giver: null,
    desc: 'Deviens le meilleur ami ou la meilleure amie d\'un habitant de l\'île.',
    hint: 'À 4 cœurs, une deuxième scène d\'amitié se débloque.',
    goals: [st((g) => Math.max(...g.villagers.list.map((v) => v.friendship)), 100, 'Atteindre 5 cœurs avec un habitant')],
    target: null, reward: { coins: 500, furniture: { 'statue-chat': 1 } } },
];

const CHAPTER_REWARDS = {
  pins: { coins: 600, furniture: { 'lit-chalet': 1 } },
  lagon: { coins: 800, furniture: { 'bar-tiki': 1 } },
  arrivee: { coins: 100 },
  amis: { coins: 150, furniture: { gamelle: 1 } },
  tresors: { coins: 200 },
  grandbleu: { coins: 250, items: { appat: 5 } },
  nid: { coins: 300, furniture: { 'vase-fleurs': 1 } },
  chemins: { coins: 400 },
  famille: { coins: 500, furniture: { 'coussin-coeur': 1 } },
};

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
    this.targets = T;
    this.index = 0;
    this.progress = {};
    this.completed = [];
    this.requests = [];
    this.requestDay = 0;
    this.sparks = 0;
    this.lighthouseLit = false;
    this.seenChapters = [];
    this.stats = { cooked: 0, fish: 0, sold: 0, earned: 0 };
    const events = ['talk', 'plant', 'water', 'harvest', 'pet', 'feed', 'gather', 'sell', 'catch', 'adopt', 'buy', 'place', 'cook', 'gift', 'request', 'enter', 'insect', 'story', 'zone', 'facade', 'ride', 'job', 'heartEvent', 'finale', 'stargaze', 'emote', 'photo', 'treeLit', 'whale'];
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

  get chapter() {
    const q = this.current;
    return CHAPTERS.find((c) => c.id === (q ? q.chapter : 'epilogue'));
  }

  /** Nombre de chapitres terminés. */
  get chapterIndex() {
    const q = this.current;
    return q ? CHAPTERS.findIndex((c) => c.id === q.chapter) : CHAPTERS.length;
  }

  chapterQuests(id) {
    return STORY.filter((q) => q.chapter === id);
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
    const g = this.game;
    this.completed.push(q.id);
    this.index++;
    g.grantReward(q.reward, null, `📜 Quête terminée : ${q.title} !`);
    g.audio.play('adopt');
    g.requestSave();
    const next = this.current;
    // Fin de chapitre : une étincelle du Cœur se rallume.
    if (!next || next.chapter !== q.chapter) {
      const chap = CHAPTERS.find((c) => c.id === q.chapter);
      if (CHAPTER_REWARDS[q.chapter]) {
        if (chap.n <= 7) this.sparks = Math.min(7, this.sparks + 1);
        g.world.village.setLighthouseLevel?.(this.sparks / 7, this.lighthouseLit);
        const sparkTxt = chap.n <= 7 ? ` Étincelle du Cœur ${this.sparks}/7 —` : '';
        setTimeout(() => g.grantReward({ ...CHAPTER_REWARDS[q.chapter], stars: 10 }, null, `✨ Chapitre ${chap.n} terminé !${sparkTxt}`), 1800);
      }
      if (next) setTimeout(() => this.showChapter(), 4200);
    } else {
      setTimeout(() => g.ui.toast(`📜 Nouvelle quête : ${next.title}`, 3500), 1600);
    }
    if (!next) setTimeout(() => g.ui.toast('🌟 Tu as terminé toute l\'histoire de Doucebrise ! Merci d\'avoir joué ♥', 6000), 2600);
    g.ui.refreshQuest();
    // Une quête peut être déjà remplie (objectifs d'état).
    setTimeout(() => this.check(), 50);
  }

  /** Carte d'introduction du chapitre en cours (une seule fois). */
  showChapter(force = false) {
    const chap = this.chapter;
    if (!chap || (!force && this.seenChapters.includes(chap.id))) return;
    if (!this.seenChapters.includes(chap.id)) this.seenChapters.push(chap.id);
    this.game.ui.chapterCard?.(chap);
    this.game.requestSave();
  }

  /** Où aller pour la quête en cours. */
  target() {
    const q = this.current;
    if (!q || !q.target) return null;
    try {
      return q.target(this.game);
    } catch {
      return null;
    }
  }

  hint() {
    const q = this.current;
    return q ? q.hint || q.desc : 'Tu as tout accompli ! Profite de l\'île, complète tes collections et fais-toi plein d\'amis.';
  }

  /** Choix de dialogue liés à l'histoire. */
  dialogueChoices(v, dialogue) {
    const q = this.current;
    if (!q?.story || q.story.villager !== v.def.id) return [];
    const g = this.game;
    const take = q.story.take || {};
    const missing = Object.entries(take).filter(([id, n]) => countItem(g.inventory, id) < n);
    if (missing.length) {
      const need = Object.entries(take).map(([id, n]) => `${ITEMS[id].emoji} ${countItem(g.inventory, id)}/${n}`).join(' · ');
      return [{ label: `${q.story.label} (${need})`, disabled: true, action: () => {} }];
    }
    return [{ label: q.story.label, primary: true, story: true, action: () => {
      for (const [id, n] of Object.entries(take)) takeItem(g.inventory, id, n);
      if (Object.keys(take).length) g.ui.refreshInventory();
      dialogue.sequence(q.story.lines, () => {
        if (q.story.reward) g.grantReward(q.story.reward, v);
        g.emit('story', { id: q.id, villager: v });
      });
    } }];
  }

  // --- Finale -----------------------------------------------------------------------------

  /** Vérifie si le joueur est au pied du phare, la nuit, pendant la dernière quête. */
  update() {
    const q = this.current;
    if (!q || this.finaleRunning) return;
    if (q.id === 'sapin-rallume' || q.id === 'chant-baleine') {
      this.updateArchipelago(q);
      return;
    }
    if (q.id !== 'rallumer') return;
    const g = this.game;
    const h = g.world.sky.hour;
    const L = LANDMARKS.lighthouse;
    const d = Math.hypot(g.player.pos.x - L.x, g.player.pos.z - L.z);
    if (d < 9 && (h >= 19 || h < 5)) {
      this.finaleRunning = true;
      g.finale?.(() => {
        this.lighthouseLit = true;
        g.world.village.setLighthouseLevel?.(1, true);
        this.finaleRunning = false;
        g.emit('finale', {});
      });
    } else if (d < 9 && !this.warned) {
      this.warned = true;
      g.ui.toast('🗼 Tout le monde viendra à la tombée de la nuit (19 h). Fais une sieste ou reviens plus tard !', 4000);
    }
  }

  /** Scènes des chapitres de l'archipel : le grand sapin et la baleine. */
  updateArchipelago(q) {
    const g = this.game;
    if (g.busy || g.state !== 'play') return;
    const h = g.world.sky.hour;
    const p = g.player.pos;
    if (q.id === 'sapin-rallume') {
      const B = LANDMARKS.bourg;
      const d = Math.hypot(p.x - B.x, p.z - B.z);
      if (d < 10 && (h >= 19 || h < 5)) {
        this.finaleRunning = true;
        g.treeCeremony(() => {
          this.finaleRunning = false;
          g.emit('treeLit', {});
        });
      } else if (d < 10 && this.warned !== q.id) {
        this.warned = q.id;
        g.ui.toast('🌲 Les habitants du bourg se retrouveront ici à la nuit tombée (19 h). Reviens ce soir !', 4500);
      }
    } else {
      const s = g.world.fishingSpots.find((f) => f.habitat === 'lagon');
      if (!s) return;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < 3.2 && (h >= 20 || h < 5)) {
        this.finaleRunning = true;
        g.whaleEvent(s, () => {
          this.finaleRunning = false;
          g.emit('whale', {});
        });
      } else if (d < 3.2 && this.warned !== q.id) {
        this.warned = q.id;
        g.ui.toast('🐚 La baleine ne chante que la nuit. Reviens au bout du ponton après 20 h !', 4500);
      }
    }
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
    return { i: this.index, p: this.progress, c: this.completed, r: this.requests, d: this.requestDay, s: this.stats, sp: this.sparks, lit: this.lighthouseLit, ch: this.seenChapters };
  }

  restore(d) {
    if (!d) return;
    this.progress = d.p || {};
    this.completed = d.c || [];
    this.requests = d.r || [];
    this.requestDay = d.d || 0;
    this.stats = { ...this.stats, ...(d.s || {}) };
    this.lighthouseLit = !!d.lit;
    this.seenChapters = d.ch || [];
    // On reprend à la première quête non terminée (compatible avec les anciennes sauvegardes).
    const done = new Set(this.completed);
    const i = STORY.findIndex((q) => !done.has(q.id));
    this.index = i < 0 ? STORY.length : i;
    const chapIdx = this.chapterIndex;
    this.sparks = d.sp ?? Math.min(7, chapIdx);
    if (d.ch === undefined) this.seenChapters = CHAPTERS.slice(0, chapIdx + 1).map((c) => c.id);
    this.game.world.village.setLighthouseLevel?.(this.sparks / 7, this.lighthouseLit);
    this.game.world.islands.setFirLit?.(this.completed.includes('sapin-rallume'));
  }
}

export { THREE };

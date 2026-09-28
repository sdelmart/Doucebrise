import * as THREE from 'three';
import { Character } from '../player/character.js';
import { normalizeAppearance, OPTIONS } from '../player/appearance.js';
import { createVillagerBody } from './villagerBody.js';
import { JOBS } from './jobGestures.js';
import { ITEMS } from '../game/items.js';
import { damp, lerpAngle } from '../core/math.js';
import { PATHS } from '../world/layout.js';

const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();

// Les habitants de Doucebrise : apparence, emploi du temps, goûts et répliques.

export const VILLAGERS = [
  {
    id: 'rose',
    name: 'Mamie Rose',
    emoji: '👵',
    house: 2,
    shop: 'graines',
    job: 'Jardinière',
    appearance: { skin: '#f3c4a2', height: 0.92, build: 1.1, eyes: 'doux', eyeColor: '#6b4226', brows: 'fins', mouth: 'sourire', blush: true, lashes: true, hair: 'chignon', hairColor: '#dcdde3', hairTip: '#dcdde3', top: 'pull', topColor: '#c9a0ff', topColor2: '#fff3d6', pattern: 'uni', bottom: 'jupeLongue', bottomColor: '#6f7fb8', shoes: 'ballerines', shoesColor: '#a0785a', hat: 'aucun', glasses: 'rondes', glassesColor: '#c58b52', back: 'echarpe', backColor: '#ff8fab' },
    loves: ['tarte', 'fleur', 'confiture'],
    likes: ['fraise', 'carotte', 'jus', 'salade', 'pomme'],
    dislikes: ['poisson', 'maki'],
    rewards: { 40: { recipe: 'salade' }, 60: { furniture: 'plante-grande' }, 100: { clothing: 'hat:fleur' } },
    lines: {
      hello: ['Bonjour mon petit ! Tu as bien dormi ?', 'Oh, te voilà ! Viens, viens, je ne mords pas.', 'Quelle belle journée pour jardiner, tu ne trouves pas ?'],
      friend: ['Tu es toujours le bienvenu chez moi, tu sais.', "Tu me rappelles moi, à ton âge. Toujours dans l'herbe !"],
      chat: [
        "Une carotte bien arrosée, c'est une carotte heureuse. C'est ma devise !",
        'Les citrouilles demandent de la patience… mais quelle récompense !',
        "Le secret d'une bonne tarte ? Des pommes du verger et un peu d'amour.",
        "J'ai planté mon premier rosier il y a soixante ans. Il fleurit encore.",
        'Les lapins adorent mes carottes. Je fais semblant de ne pas les voir…',
        "N'oublie pas d'arroser tes semis. Sauf s'il pleut, bien sûr !",
      ],
      rain: ['Ah, la pluie ! Mes plantes la réclamaient.'],
      snow: ["L'hiver, le jardin se repose. Et moi aussi, avec un bon thé."],
      autumn: ['Regarde ces feuilles rousses… On dirait un tableau.'],
      evening: ['Le soir, j\'aime regarder les lucioles depuis mon banc.'],
      gift: { love: 'Oh ! Tu m\'as gâtée… Tu es un ange !', like: 'Comme c\'est gentil ! Merci beaucoup.', neutral: 'Merci, mon petit.', dislike: 'Oh… c\'est… original. Merci quand même.' },
      shop: 'Des semis pour ton potager ? Choisis, choisis !',
    },
  },
  {
    id: 'pomme',
    name: 'Pomme',
    emoji: '🧑‍🌾',
    house: 4,
    shop: 'marche',
    job: 'Marchande',
    appearance: { skin: '#fbd5bd', height: 1.0, eyes: 'petillants', eyeColor: '#3d9970', brows: 'doux', mouth: 'rire', blush: true, freckles: true, lashes: true, hair: 'queue', hairColor: '#c8553a', hairTip: '#ffcf5c', top: 'salopette', topColor: '#ff8fab', topColor2: '#fff3d6', pattern: 'carreaux', bottom: 'short', shoes: 'bottes', shoesColor: '#ffd84d', hat: 'casquette', hatColor: '#ffd84d', glasses: 'aucune', back: 'aucun' },
    loves: ['jus', 'fraise', 'popcorn'],
    likes: ['pomme', 'tomate', 'mais', 'tarte', 'confiture'],
    dislikes: ['champignon'],
    rewards: { 40: { recipe: 'jus' }, 60: { furniture: 'caisse-fruits' }, 100: { clothing: 'back:panier' } },
    lines: {
      hello: ['Salut salut ! Qu\'est-ce que je peux faire pour toi ?', 'Oh, un client ! Enfin, un ami. Un client-ami !', 'Hé ! Tu tombes bien, j\'ai plein de trucs à vendre !'],
      friend: ['Pour toi, je fais toujours un prix. Enfin… presque toujours !', 'Mon meilleur client est aussi mon meilleur ami !'],
      chat: [
        'Les citrouilles se vendent super bien. Si tu en fais pousser, pense à moi !',
        'Tu savais que les plats cuisinés valent bien plus que les ingrédients ?',
        'Le matin, je fais le tour du verger. Les pommes les plus rouges sont pour moi !',
        'Mes friandises rendent les animaux complètement gagas. Essaie !',
        'Un jour, j\'aurai la plus grande boutique de l\'île. Tu verras !',
      ],
      rain: ['Pluie = moins de clients. Mais plus de temps pour ranger !'],
      snow: ['Brrr ! Je vends des soupes chaudes, un jour. Bientôt !'],
      autumn: ['L\'automne, c\'est la saison des citrouilles. Ka-ching !'],
      evening: ['Journée finie ! J\'ai les pieds en compote.'],
      gift: { love: 'Nooon ! Mon préféré ! Tu me connais trop bien !', like: 'Trop sympa ! Merci !', neutral: 'Merci, c\'est gentil !', dislike: 'Euh… je vais le… garder précieusement. Voilà.' },
      shop: 'Tu vends ou tu achètes ?',
    },
  },
  {
    id: 'bruno',
    name: 'Bruno',
    emoji: '🧔',
    house: 5,
    shop: 'menuiserie',
    job: 'Menuisier',
    appearance: { skin: '#d39469', height: 1.1, build: 1.2, head: 1.0, eyes: 'points', eyeColor: '#3b2519', brows: 'epais', mouth: 'neutre', blush: false, lashes: false, hair: 'court', hairColor: '#4a2f22', hairTip: '#4a2f22', top: 'tshirt', topColor: '#e5484d', topColor2: '#2e2e3a', pattern: 'carreaux', bottom: 'pantalon', bottomColor: '#3d5a98', shoes: 'bottes', shoesColor: '#a0785a', hat: 'bonnet', hatColor: '#6fa8dc', glasses: 'aucune', back: 'aucun' },
    loves: ['soupe', 'tarte'],
    likes: ['champignon', 'poisson', 'maki', 'omelette', 'mais'],
    dislikes: ['fleur'],
    rewards: { 40: { recipe: 'soupe' }, 60: { furniture: 'cheminee' }, 100: { clothing: 'hat:chef' } },
    lines: {
      hello: ['Hm. Salut.', 'Ah, c\'est toi. Bonjour.', 'Besoin d\'un meuble ?'],
      friend: ['Content de te voir. Vraiment.', 'Tu veux voir mon nouveau projet ? …Plus tard. Il n\'est pas fini.'],
      chat: [
        'Le bois de pin sent bon. Le bois de cerisier est plus joli.',
        'Une maison sans meubles, c\'est comme une forêt sans arbres.',
        'Mesure deux fois, coupe une fois. C\'est la règle.',
        'J\'ai construit le ponton de la plage. Il tient encore. Évidemment.',
        'Les chats de la place dorment sur mes planches. Je les laisse faire.',
      ],
      rain: ['La pluie ? Parfait pour travailler à l\'abri.'],
      snow: ['L\'hiver, je fabrique des jouets en bois. Ne le dis à personne.'],
      autumn: ['L\'automne, c\'est la saison des bonnes soupes.'],
      evening: ['…Belle soirée.'],
      gift: { love: '…C\'est exactement ce qu\'il me fallait. Merci.', like: 'Merci. C\'est sympa.', neutral: 'Hm. Merci.', dislike: '…Je ne sais pas quoi faire de ça.' },
      shop: 'Regarde. Tout est fait main.',
    },
  },
  {
    id: 'lila',
    name: 'Lila',
    emoji: '👩‍🎨',
    house: 1,
    shop: 'couture',
    job: 'Couturière',
    appearance: { skin: '#9a5f3e', height: 1.02, eyes: 'chat', eyeColor: '#7a5cc2', brows: 'fins', mouth: 'langue', blush: true, lashes: true, hair: 'long', hairColor: '#c7a4ff', hairTip: '#ff9ec7', top: 'robe', topColor: '#fff3d6', topColor2: '#b69cf0', pattern: 'pois', shoes: 'ballerines', shoesColor: '#b69cf0', hat: 'beret', hatColor: '#b69cf0', glasses: 'aucune', back: 'aucun' },
    loves: ['fleur', 'omelette', 'coquillage'],
    likes: ['fraise', 'jus', 'confiture', 'champignon'],
    dislikes: ['citrouille'],
    rewards: { 40: { recipe: 'omelette' }, 60: { furniture: 'miroir' }, 100: { clothing: 'hat:couronne' } },
    lines: {
      hello: ['Oh ! J\'adore ta tenue aujourd\'hui !', 'Coucou ! Tu viens pour un nouveau look ?', 'Bonjour, bonjour, mon mannequin préféré !'],
      friend: ['Tu es ma source d\'inspiration, tu sais ?', 'J\'ai dessiné une robe en pensant à toi !'],
      chat: [
        'Les couleurs de l\'automne sont les plus élégantes. Mais celles du printemps…',
        'Un bon accessoire peut changer toute une tenue !',
        'J\'ai trouvé un coquillage nacré sur la plage. Je vais en faire des boutons !',
        'Noé grandit si vite… Il use ses pantalons à toute allure !',
        'Le vichy revient à la mode. Enfin, il n\'est jamais parti.',
      ],
      rain: ['La pluie, c\'est l\'occasion de sortir son plus joli parapluie !'],
      snow: ['Pulls, écharpes, bonnets… L\'hiver, c\'est ma saison préférée !'],
      autumn: ['Orange, rouge, moutarde… L\'automne est un défilé de mode.'],
      evening: ['Le coucher de soleil me donne plein d\'idées de couleurs.'],
      gift: { love: 'C\'est MAGNIFIQUE ! Tu as un goût exquis !', like: 'Oh, c\'est charmant ! Merci !', neutral: 'Merci, c\'est gentil.', dislike: 'Hmm… ce n\'est pas vraiment mon style.' },
      shop: 'Regarde mes nouvelles créations !',
    },
  },
  {
    id: 'marin',
    name: 'Marin',
    emoji: '🎣',
    house: 3,
    shop: null,
    job: 'Pêcheur',
    appearance: { skin: '#e6ae88', height: 1.05, build: 1.05, eyes: 'endormis', eyeColor: '#3f7cc0', brows: 'doux', mouth: 'sourire', blush: false, lashes: false, hair: 'court', hairColor: '#9aa0ab', hairTip: '#9aa0ab', top: 'pull', topColor: '#ffffff', topColor2: '#3d5a98', pattern: 'rayures', bottom: 'pantalon', bottomColor: '#2e2e3a', shoes: 'bottes', shoesColor: '#ffd84d', hat: 'bonnet', hatColor: '#e5484d', glasses: 'aucune', back: 'aucun' },
    loves: ['maki', 'soupe'],
    likes: ['poisson', 'coquillage', 'omelette', 'tarte'],
    dislikes: ['fraise', 'fleur'],
    rewards: { 40: { recipe: 'maki' }, 60: { furniture: 'aquarium' }, 100: { clothing: 'hat:marin' } },
    lines: {
      hello: ['Ohé, moussaillon !', 'Belle mer aujourd\'hui. Ça mord bien.', 'Tiens, un visage ami.'],
      friend: ['Tu as l\'âme d\'un vrai marin, toi.', 'Un jour, je t\'emmènerai voir le poisson-lune. Promis.'],
      chat: [
        'Quand le flotteur plonge, il faut ferrer tout de suite. Pas avant !',
        'Il paraît qu\'un poisson-lune géant rôde près du ponton…',
        'Les chats du village me suivent jusqu\'au ponton. Je me demande pourquoi.',
        'Le phare veille sur nous depuis cent ans.',
        'À l\'étang, on attrape plutôt des carpes koï. En mer, des sardines.',
      ],
      rain: ['Les poissons adorent la pluie. Moi un peu moins.'],
      snow: ['Même l\'hiver, la mer ne dort jamais.'],
      autumn: ['Le vent d\'automne sent le sel et les pommes.'],
      evening: ['Le soir, le phare s\'allume. Je ne m\'en lasse pas.'],
      gift: { love: 'Ho ho ! Voilà un vrai trésor !', like: 'Merci, moussaillon.', neutral: 'C\'est gentil.', dislike: 'Hm, je vais le donner aux mouettes.' },
      shop: '',
    },
  },
  {
    id: 'noe',
    name: 'Noé',
    emoji: '🧒',
    house: 1,
    shop: null,
    job: 'Petit explorateur',
    appearance: { skin: '#b87850', height: 0.86, build: 0.95, head: 1.08, eyes: 'rond', eyeColor: '#3b2519', brows: 'doux', mouth: 'rire', blush: true, lashes: false, hair: 'herisse', hairColor: '#2a1d17', hairTip: '#2a1d17', top: 'tshirt', topColor: '#ffd84d', topColor2: '#6fa8dc', pattern: 'etoiles', bottom: 'short', bottomColor: '#6fcf97', shoes: 'baskets', shoesColor: '#e5484d', hat: 'casquette', hatColor: '#6fa8dc', glasses: 'aucune', back: 'sac', backColor: '#ff8a3d' },
    loves: ['popcorn', 'friandise', 'jus'],
    likes: ['fraise', 'baie', 'pomme', 'coquillage', 'mais'],
    dislikes: ['salade', 'champignon'],
    rewards: { 40: { recipe: 'popcorn' }, 60: { furniture: 'arbre-chat' }, 100: { clothing: 'back:nounours' } },
    lines: {
      hello: ['Salut ! T\'as vu le papillon ? Il était ÉNORME !', 'Hé ! On joue ?', 'Coucou ! J\'ai trouvé un caillou tout rond !'],
      friend: ['T\'es mon meilleur ami ! Enfin, avec le chat de la place.', 'Quand je serai grand, j\'aurai cent animaux. Comme toi !'],
      chat: [
        'Les renards sont trop timides. Faut marcher tout doucement, comme un ninja !',
        'Les lapins adorent les carottes. Moi je préfère le pop-corn.',
        'Tu savais que les canards dorment avec un œil ouvert ?',
        'Maman Lila dit que je dois pas courir dans la prairie. Mais c\'est trop bien !',
        'J\'ai vu un faon dans la forêt ! Il m\'a regardé !',
      ],
      rain: ['Les flaques ! Les FLAQUES !'],
      snow: ['On fait un bonhomme de neige ? Allez !'],
      autumn: ['Je saute dans les tas de feuilles !'],
      evening: ['J\'ai pas sommeil. Pas du tout. *bâille*'],
      gift: { love: 'OUAAAH ! Merci merci merci !', like: 'Trop bien ! Merci !', neutral: 'Merci !', dislike: 'Beurk… euh, merci quand même.' },
      shop: '',
    },
  },
  {
    id: 'mimi',
    name: 'Mimi',
    emoji: '👩‍🍳',
    house: 6,
    shop: 'cafe',
    job: 'Café des Chats',
    appearance: { skin: '#ffe6d6', height: 0.97, eyes: 'chat', eyeColor: '#3d9970', brows: 'doux', mouth: 'chat', blush: true, lashes: true, freckles: true, hair: 'couettes', hairColor: '#ff9ec7', hairTip: '#fff3d6', top: 'robe', topColor: '#ffffff', topColor2: '#ff8fab', pattern: 'pois', shoes: 'ballerines', shoesColor: '#ff8fab', hat: 'chat', hatColor: '#ff8fab', glasses: 'aucune', back: 'aucun' },
    loves: ['maki', 'tarte', 'fraise'],
    likes: ['poisson', 'jus', 'confiture', 'fleur', 'friandise'],
    dislikes: ['champignon'],
    rewards: { 40: { furniture: 'griffoir' }, 60: { furniture: 'maison-chat' }, 100: { clothing: 'hat:tasse' } },
    lines: {
      hello: ['Miaou ! Euh… bonjour ! Pardon, l\'habitude.', 'Bienvenue au Café des Chats ! Installe-toi !', 'Coucou ! Caramel t\'a vu arriver avant moi !'],
      friend: ['Les chats t\'adorent, et moi aussi !', 'Tu es officiellement membre d\'honneur du café !'],
      chat: [
        'Les chats adorent la pâtée. Donne-leur-en et ils te suivront partout !',
        'Avec un plumeau (touche G), tu peux jouer avec les chats. Ils deviennent fous !',
        'Il y a dix-neuf sortes de chats sur l\'île ! Tu les as toutes vues ?',
        'Un chat qui cligne lentement des yeux, c\'est un bisou. Essaie !',
        'Le tigré de la place s\'appelle Monsieur Moustache. C\'est lui le chef.',
        'Mon rêve : une salle de sieste pour chats. Avec des coussins partout !',
      ],
      rain: ['Les jours de pluie, tous les chats viennent faire la sieste au café !'],
      snow: ['Chocolat chaud et chaton sur les genoux… le bonheur !'],
      autumn: ['Les chats adorent jouer dans les feuilles mortes.'],
      evening: ['Le soir, je compte les chats. Il en manque toujours un !'],
      gift: { love: 'Kyaaa ! C\'est parfait ! Tu es adorable !', like: 'Oh, merci ! Les chats vont être jaloux !', neutral: 'Merci beaucoup !', dislike: 'Hmm… les chats n\'aiment pas trop ça, et moi non plus.' },
      shop: 'Pâtée, jouets, paniers… Tout pour tes minous !',
    },
  },
  {
    id: 'leo',
    name: 'Léo',
    emoji: '🧑‍🔧',
    house: 7,
    shop: 'garage',
    job: 'Mécanicien',
    appearance: { skin: '#e6ae88', height: 1.04, build: 1.05, eyes: 'petillants', eyeColor: '#3f7cc0', brows: 'epais', mouth: 'rire', blush: false, lashes: false, hair: 'meche', hairColor: '#2a1d17', hairTip: '#4a2f22', top: 'salopette', topColor: '#3d5a98', topColor2: '#ffffff', pattern: 'uni', bottom: 'pantalon', bottomColor: '#3d5a98', shoes: 'bottes', shoesColor: '#2e2e3a', hat: 'casquette', hatColor: '#e5484d', glasses: 'aucune', back: 'aucun' },
    loves: ['popcorn', 'soupe', 'omelette'],
    likes: ['mais', 'pomme', 'jus', 'poisson', 'tarte'],
    dislikes: ['coquillage'],
    rewards: { 40: { coins: 300 }, 60: { furniture: 'tv-retro' }, 100: { clothing: 'hat:capitaine' } },
    lines: {
      hello: ['Yo ! Ça roule ?', 'Salut ! Attention, j\'ai de la graisse plein les mains !', 'Hé, content de te voir ! Tu veux faire un tour ?'],
      friend: ['Toi et moi, on forme une sacrée équipe !', 'Si t\'as besoin d\'un coup de clé à molette, je suis là !'],
      chat: [
        'Avec un véhicule, tu traverses l\'île en un rien de temps. Appuie sur V !',
        'Le bateau, c\'est pour la mer et l\'étang. Mets-le à l\'eau depuis la plage !',
        'La montgolfière… c\'est mon chef-d\'œuvre. Tu vois toute l\'île d\'en haut !',
        'Maintiens Maj pour accélérer. Mais doucement dans les virages !',
        'Un jour, je construirai une fusée. Si si, je te jure.',
        'Mimi dit que mes moteurs font peur aux chats. C\'est pas vrai… enfin, un peu.',
      ],
      rain: ['La pluie, ça fait briller les carrosseries !'],
      snow: ['Pneus neige obligatoires ! …Je rigole, on n\'en a pas.'],
      autumn: ['L\'automne, c\'est la saison des balades à vélo.'],
      evening: ['Le soir, je bricole sous les étoiles. C\'est tranquille.'],
      gift: { love: 'Trop cool ! C\'est mon truc préféré !', like: 'Sympa, merci !', neutral: 'Merci, c\'est gentil !', dislike: 'Euh… je vais le mettre dans la boîte à bazar.' },
      shop: 'Deux roues, quatre roues, zéro roue… j\'ai tout ce qu\'il te faut !',
    },
  },
  // --- Bourg-Sapin -------------------------------------------------------------------
  {
    id: 'aurele',
    name: 'Grand-père Aurèle',
    emoji: '👴',
    house: 8,
    shop: null,
    job: 'Gardien de la source',
    work: { at: (w) => ({ x: w.islands.spring.x - 7, z: w.islands.spring.z + 1.5, rot: Math.PI / 2 }), path: [[-120, -136], [-117, -148]] },
    appearance: { skin: '#e6ae88', height: 0.9, build: 1.05, eyes: 'doux', eyeColor: '#3f7cc0', brows: 'epais', mouth: 'sourire', blush: true, lashes: false, hair: 'rase', hairColor: '#f7f5f0', hairTip: '#f7f5f0', top: 'pull', topColor: '#c0584a', topColor2: '#fff3d6', pattern: 'carreaux', bottom: 'pantalon', bottomColor: '#6b4a3a', shoes: 'bottes', shoesColor: '#6b4a3a', hat: 'bonnet', hatColor: '#3d5a98', glasses: 'rondes', glassesColor: '#c58b52', back: 'echarpe', backColor: '#ffd84d' },
    loves: ['edelweiss', 'soupe', 'tarte-myrtille'],
    likes: ['myrtille', 'champignon', 'pomme-pin', 'cristal', 'jus'],
    dislikes: ['maki'],
    rewards: { 40: { items: { 'pomme-pin': 5 } }, 60: { furniture: 'poele' }, 100: { furniture: 'lampe-lune' } },
    lines: {
      hello: ['Ah, un visiteur ! Approche, approche, l\'eau est bonne.', 'Bonjour, jeune pousse. Tu as l\'air d\'avoir marché longtemps.', 'Les étoiles m\'avaient dit que tu viendrais.'],
      friend: ['Tu es toujours le bienvenu près de ma source.', 'Tu me rappelles le temps où le phare brillait tous les soirs.'],
      chat: [
        'Un bain à la source chaude, et tous les soucis s\'envolent. Essaie donc !',
        'La nuit, depuis le belvédère, on voit filer des étoiles. Fais un vœu, surtout !',
        'Les edelweiss ne poussent que là-haut, près des cristaux. Ce sont des fleurs courageuses.',
        'Le Pic des Neiges garde son manteau blanc toute l\'année. Il n\'aime pas avoir froid aux épaules.',
        'Quand j\'étais jeune, on traversait le Pont des Brumes à la lanterne.',
      ],
      rain: ['La pluie chante sur les toits des chalets. Écoute…'],
      snow: ['Rien ne vaut un bain chaud quand il neige.'],
      autumn: ['Les mélèzes deviennent dorés. C\'est ma saison préférée.'],
      evening: ['Regarde le ciel ce soir. Il se passe toujours quelque chose là-haut.'],
      gift: { love: 'Oh… tu m\'as fait un vieux cœur tout neuf. Merci.', like: 'Merci, c\'est très gentil.', neutral: 'Merci, jeune pousse.', dislike: 'Hmm, je ne suis pas sûr de savoir quoi en faire.' },
      shop: '',
    },
  },
  {
    id: 'elise',
    name: 'Élise',
    emoji: '👩‍🍳',
    house: 9,
    shop: 'patisserie',
    job: 'Pâtissière',
    appearance: { skin: '#fbd5bd', height: 0.98, eyes: 'rieurs', eyeColor: '#6b4226', brows: 'fins', mouth: 'rire', blush: true, freckles: true, lashes: true, hair: 'chignon', hairColor: '#c58b52', hairTip: '#e3b875', top: 'robe', topColor: '#fff3d6', topColor2: '#ff8fab', pattern: 'carreaux', shoes: 'ballerines', shoesColor: '#c0584a', hat: 'noeud', hatColor: '#ff6f91', glasses: 'aucune', back: 'aucun' },
    loves: ['tarte', 'fraise', 'confiture'],
    likes: ['myrtille', 'pomme', 'jus', 'crepe', 'edelweiss'],
    dislikes: ['poisson'],
    rewards: { 40: { recipe: 'crepe' }, 60: { furniture: 'gateau-etage' }, 100: { recipe: 'tarte-myrtille' } },
    lines: {
      hello: ['Bonjour ! Ça sent bon, hein ? Ce sont mes croissants !', 'Coucou ! Tu tombes à pic, la fournée sort du four !', 'Oh, un nouveau visage ! Tu veux goûter ?'],
      friend: ['Pour toi, j\'ai toujours une petite douceur en réserve.', 'Tu es mon goûteur officiel, maintenant !'],
      chat: [
        'Le secret d\'une bonne tarte aux myrtilles ? Des myrtilles cueillies le matin !',
        'Un chocolat chaud au coin du feu, c\'est le paradis, non ?',
        'Grand-père Aurèle prend toujours deux croissants. Il dit que c\'est pour les oiseaux…',
        'Hugo m\'a fabriqué un rouleau à pâtisserie. Il est trop beau pour s\'en servir !',
        'J\'ai appris la pâtisserie à Port-Corail, avant de monter vivre ici.',
      ],
      rain: ['Jour de pluie, jour de gâteaux !'],
      snow: ['La neige, c\'est comme du sucre glace sur le monde.'],
      autumn: ['Tarte aux pommes et cannelle… l\'automne, quoi !'],
      evening: ['Le soir, je prépare la pâte de demain. Elle doit dormir, elle aussi !'],
      gift: { love: 'Ooooh ! Tu sais parler à mon cœur de pâtissière !', like: 'Merci ! Je vais en faire quelque chose de bon !', neutral: 'Merci, c\'est gentil !', dislike: 'Oh… ça ne va pas trop dans mes gâteaux, ça.' },
      shop: 'Des douceurs toutes chaudes, et quelques recettes secrètes !',
    },
  },
  {
    id: 'hugo',
    name: 'Hugo',
    emoji: '🪓',
    house: 10,
    shop: 'atelier',
    job: 'Bûcheron-sculpteur',
    appearance: { skin: '#d39469', height: 1.12, build: 1.25, head: 0.98, eyes: 'points', eyeColor: '#3b2519', brows: 'epais', mouth: 'sourire', blush: true, lashes: false, hair: 'boucles', hairColor: '#8a4a2a', hairTip: '#8a4a2a', top: 'veste', topColor: '#e5484d', topColor2: '#2e2e3a', pattern: 'carreaux', bottom: 'pantalon', bottomColor: '#3d5a98', shoes: 'bottes', shoesColor: '#6b4a3a', hat: 'bonnet', hatColor: '#ffd84d', glasses: 'aucune', back: 'aucun' },
    loves: ['soupe', 'omelette', 'pomme-pin'],
    likes: ['champignon', 'myrtille', 'tarte', 'mais', 'croissant'],
    dislikes: ['fleur', 'hibiscus'],
    rewards: { 40: { furniture: 'banc-rondins' }, 60: { furniture: 'luge' }, 100: { furniture: 'lit-chalet' } },
    lines: {
      hello: ['Salut ! Attention aux copeaux !', 'Hé ! Belle journée pour couper du bois.', 'Tiens, bonjour. Tu viens voir mes sculptures ?'],
      friend: ['Tu sais, je t\'ai sculpté un petit truc. …Plus tard. Il n\'est pas fini.', 'T\'es solide, toi. Comme un vieux chêne.'],
      chat: [
        'Chaque arbre que je coupe, j\'en replante deux. C\'est la règle de la montagne.',
        'Bruno, sur l\'île principale ? On se dispute toujours sur le meilleur bois. Il a tort.',
        'Les pommes de pin, ça fait de super allume-feux. Et les écureuils adorent !',
        'Mon poêle à bois chauffe tout le chalet. Je peux t\'en fabriquer un.',
        'Le vent du nord sent la résine. J\'adore ça.',
      ],
      rain: ['La pluie, ça fait pousser les sapins. Pas de quoi se plaindre !'],
      snow: ['Luge ! Qui vient faire de la luge ?'],
      autumn: ['L\'automne, je rentre le bois pour l\'hiver. Tout un art.'],
      evening: ['Rien de mieux qu\'une soirée au coin du feu.'],
      gift: { love: 'Ha ! C\'est parfait ! Merci, l\'ami !', like: 'Super, merci !', neutral: 'Merci bien.', dislike: 'Euh… je vais le poser sur une étagère. Tout en haut.' },
      shop: 'Des meubles de chalet, taillés dans le pin de l\'île !',
    },
  },
  {
    id: 'sacha',
    name: 'Sacha',
    emoji: '🧗',
    house: 11,
    shop: null,
    job: 'Guide de montagne',
    work: { at: (w) => ({ x: w.islands.telescope.x - 2.2, z: w.islands.telescope.z + 2.2, rot: 2.4 }), path: [[-140, -134], [-156, -150], [-166, -158]], wander: 3 },
    appearance: { skin: '#b87850', height: 1.02, build: 0.98, eyes: 'petillants', eyeColor: '#3d9970', brows: 'froncés', mouth: 'sourire', blush: false, freckles: true, lashes: true, hair: 'queue', hairColor: '#2a1d17', hairTip: '#6e4430', top: 'sweat', topColor: '#6fcf97', topColor2: '#2e2e3a', pattern: 'uni', bottom: 'pantalon', bottomColor: '#7a7f8c', shoes: 'baskets', shoesColor: '#ff8a3d', hat: 'casquette', hatColor: '#ff8a3d', glasses: 'soleil', glassesColor: '#4e4c62', back: 'sac', backColor: '#e5484d' },
    loves: ['cristal', 'jus-coco', 'brochette'],
    likes: ['myrtille', 'pomme', 'noix-coco', 'jus', 'edelweiss'],
    dislikes: ['confiture'],
    rewards: { 40: { items: { cristal: 2 } }, 60: { furniture: 'skis-deco' }, 100: { clothing: 'back:sacRando' } },
    lines: {
      hello: ['Yo ! Tu montes au sommet aujourd\'hui ?', 'Salut ! Belle visibilité ce matin, on voit jusqu\'au phare !', 'Hé ! Toi aussi tu cherches les cristaux ?'],
      friend: ['On forme une super cordée, toi et moi.', 'Un jour, on grimpera ensemble jusqu\'aux nuages !'],
      chat: [
        'Les cristaux poussent sur les flancs du Pic. Ils brillent même la nuit !',
        'Du belvédère, la longue-vue montre toute l\'île. Et la nuit… les étoiles filantes !',
        'Le Lac Miroir porte bien son nom : le matin, il reflète le Pic à la perfection.',
        'Ne cours pas trop sur les chemins de montagne, ça glisse !',
        'Mon rêve ? Voir une aurore boréale depuis le sommet. Il paraît que ça arrive en hiver.',
      ],
      rain: ['Pas de grimpe sous la pluie. Même moi je suis raisonnable !'],
      snow: ['La neige fraîche, c\'est magique… mais attention où tu mets les pieds.'],
      autumn: ['Les couleurs de l\'automne vues d\'en haut, c\'est dingue.'],
      evening: ['Le coucher de soleil depuis le belvédère… je ne m\'en lasse pas.'],
      gift: { love: 'Génial ! Tu me connais par cœur !', like: 'Top, merci !', neutral: 'Merci !', dislike: 'Ah… on va dire que c\'est l\'intention qui compte.' },
      shop: '',
    },
  },
  // --- Port-Corail -------------------------------------------------------------------
  {
    id: 'neree',
    name: 'Capitaine Nérée',
    emoji: '🧑‍✈️',
    house: 17,
    shop: 'capitainerie',
    job: 'Capitaine du port',
    appearance: { skin: '#7a4630', height: 1.08, build: 1.15, eyes: 'doux', eyeColor: '#3b2519', brows: 'epais', mouth: 'sourire', blush: false, lashes: false, hair: 'court', hairColor: '#dcdde3', hairTip: '#dcdde3', top: 'veste', topColor: '#ffffff', topColor2: '#3d5a98', pattern: 'uni', bottom: 'pantalon', bottomColor: '#3d5a98', shoes: 'bottes', shoesColor: '#2e2e3a', hat: 'capitaine', hatColor: '#3d5a98', glasses: 'aucune', back: 'aucun' },
    loves: ['brochette', 'maki', 'perle'],
    likes: ['poisson', 'noix-coco', 'soupe', 'corail', 'etoile-mer'],
    dislikes: ['edelweiss'],
    rewards: { 40: { items: { appat: 10 } }, 60: { furniture: 'maquette-bateau' }, 100: { furniture: 'barre-gouvernail' } },
    lines: {
      hello: ['Bienvenue à bord ! Enfin, à terre. Enfin, bienvenue !', 'Ahoy, matelot !', 'Belle marée aujourd\'hui. Tout va bien au port.'],
      friend: ['Tu as le pied marin, je le vois tout de suite.', 'Tant que je serai capitaine, tu auras toujours une place sur mon bateau.'],
      chat: [
        'Mon bateau-navette relie les villages. Parle-moi si tu veux voyager !',
        'Marin, sur l\'île principale ? On a fait nos premières pêches ensemble. On se dispute encore sur qui a pris le plus gros.',
        'Le lagon regorge de poissons colorés. Coralie les connaît tous par leur prénom.',
        'Les poteaux « Voyages » sur les places te ramènent vite d\'un village à l\'autre.',
        'Un bon capitaine écoute toujours la mer. Elle a beaucoup à dire.',
      ],
      rain: ['Grain à l\'horizon ! Rentrez les voiles !'],
      snow: ['De la neige sur les palmiers… voilà qui est rare !'],
      autumn: ['Les tempêtes d\'automne font de belles vagues.'],
      evening: ['Le phare du port s\'allume. La journée est finie, matelot.'],
      gift: { love: 'Par tous les océans ! C\'est un trésor !', like: 'Merci, matelot !', neutral: 'C\'est gentil.', dislike: 'Hmm… Je vais le donner aux mouettes.' },
      shop: 'Voyages, appâts et trésors de marin !',
    },
  },
  {
    id: 'coralie',
    name: 'Coralie',
    emoji: '🤿',
    house: 19,
    shop: 'plongee',
    job: 'Biologiste marine',
    appearance: { skin: '#9a5f3e', height: 1.0, eyes: 'rond', eyeColor: '#4fb6c9', brows: 'doux', mouth: 'sourire', blush: true, lashes: true, hair: 'couettes', hairColor: '#2a1d17', hairTip: '#7fdcbd', top: 'tshirt', topColor: '#7fdcbd', topColor2: '#ffffff', pattern: 'rayures', bottom: 'short', bottomColor: '#3d5a98', shoes: 'sabots', shoesColor: '#ffd84d', hat: 'aucun', hatColor: '#ffd84d', glasses: 'rondes', glassesColor: '#4fb6c9', back: 'aucun' },
    loves: ['corail', 'jus-coco', 'salade-tropicale'],
    likes: ['etoile-mer', 'coquillage', 'perle', 'fraise', 'hibiscus'],
    dislikes: ['maki', 'brochette'],
    rewards: { 40: { furniture: 'bocal-poisson' }, 60: { furniture: 'aquarium' }, 100: { clothing: 'glasses:plongee' } },
    lines: {
      hello: ['Salut ! Tu as vu la raie manta ce matin ?', 'Coucou ! J\'ai les cheveux encore mouillés, désolée !', 'Bonjour ! Le lagon est magnifique aujourd\'hui.'],
      friend: ['Tu es comme un poisson-clown : toujours là quand il faut.', 'On devrait faire une sortie en bateau ensemble !'],
      chat: [
        'Les coraux du lagon abritent des centaines d\'espèces. Il faut les protéger !',
        'Parfois, en ramassant du corail, on trouve une perle. C\'est très rare !',
        'La raie manta ne vient que les soirs d\'été, au lagon. Un vrai rêve de pêcheur.',
        'Les étoiles de mer peuvent faire repousser leurs bras. Incroyable, non ?',
        'J\'étudie les tortues de la Plage Coquillage. Elles reviennent chaque année !',
      ],
      rain: ['Sous l\'eau, la pluie ne mouille pas ! Ha ha !'],
      snow: ['Même en hiver, le lagon reste doux. Un petit miracle.'],
      autumn: ['L\'automne, les poissons migrateurs passent par ici.'],
      evening: ['La nuit, le plancton brille dans le lagon. C\'est magique.'],
      gift: { love: 'Waouh ! Merci infiniment !', like: 'Trop gentil !', neutral: 'Merci !', dislike: 'Oh non… pauvres poissons.' },
      shop: 'Aquariums, bocaux et petits trésors du lagon !',
    },
  },
  {
    id: 'paco',
    name: 'Paco',
    emoji: '🍹',
    house: 14,
    shop: 'paillote',
    job: 'Patron de la paillote',
    work: { at: (w) => w.village.shopSpots.paillote, path: [[162, 76], [184, 86], [190, 94]] },
    appearance: { skin: '#c68a5e', height: 1.05, build: 1.1, eyes: 'rieurs', eyeColor: '#3b2519', brows: 'doux', mouth: 'rire', blush: true, lashes: false, hair: 'herisse', hairColor: '#2a1d17', hairTip: '#ffcf5c', top: 'tshirt', topColor: '#ffb27a', topColor2: '#6fcf97', pattern: 'fleurs', bottom: 'short', bottomColor: '#6fa8dc', shoes: 'sabots', shoesColor: '#ff6f91', hat: 'paille', hatColor: '#ff6f91', glasses: 'soleil', glassesColor: '#ff8fab', back: 'aucun' },
    loves: ['jus-coco', 'popcorn', 'glace'],
    likes: ['noix-coco', 'fraise', 'jus', 'hibiscus', 'mais'],
    dislikes: ['soupe'],
    rewards: { 40: { recipe: 'jus-coco' }, 60: { furniture: 'bouee-licorne' }, 100: { furniture: 'bar-tiki' } },
    lines: {
      hello: ['Holaaa ! Un petit jus ?', 'Hé, l\'ami ! Pose-toi, profite du soleil !', 'Bienvenue à la paillote, le meilleur endroit du monde !'],
      friend: ['Pour toi, c\'est toujours la maison qui régale !', 'Toi, tu as compris le secret de la vie : profiter !'],
      chat: [
        'Le secret d\'un bon jus de coco ? Une noix fraîchement tombée !',
        'Les couchers de soleil sur le lagon… rien ne bat ça. Rien !',
        'J\'organise parfois des soirées au bord de l\'eau. Il y a de la musique et des lampions !',
        'Coralie dit que je fais peur aux poissons avec mes chansons. Jalouse !',
        'Tu as essayé le hamac ? Attention, on ne peut plus en sortir.',
      ],
      rain: ['La pluie ? Parfait pour un chocolat… euh, un jus chaud ?'],
      snow: ['De la neige à la plage ?! On fait un bonhomme de sable-neige !'],
      autumn: ['L\'automne, c\'est encore l\'été ici. Enfin presque.'],
      evening: ['Le soir, les lampions s\'allument. C\'est l\'heure de danser !'],
      gift: { love: '¡Increíble! Tu es un·e champion·ne !', like: 'Ooh merci, l\'ami !', neutral: 'Merci, c\'est cool.', dislike: 'Aïe aïe aïe… non merci, amigo.' },
      shop: 'Jus, glaces et tout pour la plage !',
    },
  },
  {
    id: 'maelys',
    name: 'Maëlys',
    emoji: '🎨',
    house: 18,
    shop: 'galerie',
    job: 'Peintre',
    appearance: { skin: '#ffe6d6', height: 0.96, eyes: 'chat', eyeColor: '#7a5cc2', brows: 'fins', mouth: 'langue', blush: true, lashes: true, hair: 'carre', hairColor: '#7fb8ff', hairTip: '#c7a4ff', top: 'salopette', topColor: '#fff3d6', topColor2: '#b69cf0', pattern: 'pois', bottom: 'short', shoes: 'baskets', shoesColor: '#b69cf0', hat: 'beret', hatColor: '#e5484d', glasses: 'aucune', back: 'aucun' },
    loves: ['hibiscus', 'edelweiss', 'crepe'],
    likes: ['fleur', 'coquillage', 'etoile-mer', 'confiture', 'cristal'],
    dislikes: ['champignon'],
    rewards: { 40: { furniture: 'tableau-phare' }, 60: { furniture: 'chevalet' }, 100: { furniture: 'portrait' } },
    lines: {
      hello: ['Oh ! Ne bouge pas, la lumière est parfaite sur toi !', 'Bonjour ! Tu aimes les couleurs ? Moi, je les adore.', 'Coucou ! J\'ai de la peinture sur le nez, c\'est ça ?'],
      friend: ['Tu es ma muse, tu le sais ?', 'Un jour, je peindrai ton portrait. Un vrai !'],
      chat: [
        'Le phare au coucher du soleil… c\'est mon tableau préféré.',
        'Prends des photos (touche O) et montre-les-moi ! J\'adore les belles lumières.',
        'Les maisons du port, je les ai toutes aidé à peindre. Chacune sa couleur !',
        'La montagne des Pins est si différente d\'ici. Deux mondes, une seule île… enfin, un archipel !',
        'Le bleu du lagon, je n\'arrive jamais à le reproduire. Il est trop beau.',
      ],
      rain: ['La pluie adoucit toutes les couleurs. C\'est poétique.'],
      snow: ['Le blanc, c\'est la couleur la plus difficile à peindre.'],
      autumn: ['Orange, ocre, carmin… mes pinceaux sont en fête !'],
      evening: ['L\'heure dorée ! Vite, mon chevalet !'],
      gift: { love: 'C\'est une œuvre d\'art ! Merci !', like: 'Oh, charmant ! Merci !', neutral: 'Merci, c\'est gentil.', dislike: 'Hmm… ça ne m\'inspire pas trop.' },
      shop: 'Des tableaux pour égayer ta maison !',
    },
  },
];


// Anniversaires : saison (0 printemps … 3 hiver) et jour de la saison.
export const BIRTHDAYS = {
  noe: [0, 1], lila: [0, 3], pomme: [1, 1], marin: [1, 3], mimi: [2, 1], rose: [2, 3], bruno: [3, 1], leo: [3, 3],
  elise: [0, 2], sacha: [0, 1], coralie: [1, 1], paco: [1, 2], neree: [1, 3], maelys: [2, 2], hugo: [3, 1], aurele: [3, 2],
};

// Scènes d'amitié : à 2 puis 4 cœurs, une confidence et un choix de réponse.
const c = (label, reply, gain, reward = null) => ({ label, reply, gain, reward });
export const HEART_EVENTS = {
  rose: [
    { at: 40, text: 'Tu sais, ce jardin, c\'est mon mari qui l\'avait planté. Chaque rosier porte le nom d\'un de nos souvenirs…', choices: [
      c('Racontez-moi un souvenir ?', 'Le rosier rouge, c\'est notre premier bal. Il m\'avait marché sur les pieds toute la soirée ! Merci de m\'écouter, mon petit.', 10),
      c('Ils sont magnifiques, comme vous.', 'Oh, flatteur ! Tu vas me faire rougir comme une tomate.', 7),
      c('Moi, je préfère les légumes…', 'Ha ! Au moins, tu es honnête. Les carottes aussi ont leur charme.', 2),
    ] },
    { at: 80, text: 'Une confidence : je n\'arrive plus à porter les gros arrosoirs. Mais grâce à toi, le village a retrouvé son cœur. Je le sens.', choices: [
      c('Je viendrai vous aider, promis !', 'Tu es un amour. Tiens, ce sont mes graines préférées. Prends-en soin.', 10, { items: { 'sem-citrouille': 3, 'sem-fraise': 3 } }),
      c('Vous êtes plus forte que vous ne croyez.', 'Hi hi… Tu as raison. Et puis, j\'ai de bons amis.', 7),
    ] },
  ],
  pomme: [
    { at: 40, text: 'Psst ! J\'ai un secret : je rêve d\'ouvrir une vraie épicerie. Avec une enseigne qui clignote !', choices: [
      c('Une enseigne en forme de pomme !', 'OUI ! Une pomme géante qui clignote ! Tu es un génie !', 10),
      c('Je serai ta première cliente !', 'Première cliente, première ristourne ! Enfin… petite ristourne.', 8),
      c('Ce n\'est pas un peu cher ?', 'Hmm… Tu as raison. Il faut que je vende plus de citrouilles !', 2),
    ] },
    { at: 80, text: 'Tu sais quoi ? Grâce à toi, j\'ai mis assez de pièces de côté pour l\'enseigne ! Tu veux choisir la couleur ?', choices: [
      c('Rouge pomme, évidemment !', 'Rouge pomme ! Parfait ! Tiens, un petit cadeau d\'associée.', 10, { coins: 300 }),
      c('Rose, comme tes joues !', 'Hi hi ! Rose alors ! Merci, associée de cœur !', 10, { coins: 300 }),
    ] },
  ],
  bruno: [
    { at: 40, text: '…Tu veux voir ? J\'ai fabriqué un petit cheval à bascule. Pour Noé. Tu crois qu\'il va aimer ?', choices: [
      c('Il va l\'adorer !', '…Tu crois ? Bon. Je vais peindre des étoiles dessus.', 10),
      c('Peins-le en rouge, ça va plus vite.', 'Hm. Logique. Rouge, alors.', 7),
      c('Noé n\'est pas un peu grand ?', '…C\'est pour la déco. Voilà.', 2),
    ] },
    { at: 80, text: 'Mon père disait : « Un bon menuisier construit des ponts entre les gens. » Je crois que je comprends, maintenant.', choices: [
      c('Tu as construit un pont jusqu\'à moi.', '…Ouais. Un solide. Tiens. Je l\'ai fait pour toi.', 10, { furniture: { 'rocking-chair': 1 } }),
      c('Ton père avait raison.', 'Il avait souvent raison. Merci.', 7),
    ] },
  ],
  lila: [
    { at: 40, text: 'Je dessine une collection « Doucebrise » ! Quelle couleur pour la pièce phare ?', choices: [
      c('Rose bonbon !', 'Rose bonbon… avec des nœuds ! C\'est adorable, je note !', 9),
      c('Bleu océan !', 'Bleu océan, comme la mer au pied du phare… Sublime !', 9),
      c('Vert prairie !', 'Vert prairie avec des fleurs brodées… Tu as l\'œil !', 9),
    ] },
    { at: 80, text: 'Je prépare un défilé sur la place… et je voudrais que tu en sois la star. Tu acceptes ?', choices: [
      c('Avec plaisir, je vais briller !', 'Merveilleux ! Tiens, porte ceci pour les répétitions.', 10, { clothing: 'glasses:aviateur' }),
      c('Seulement si Noé défile aussi !', 'Ha ha ! Il va être ravi. Tiens, un petit cadeau pour la star.', 10, { clothing: 'glasses:aviateur' }),
    ] },
  ],
  marin: [
    { at: 40, text: 'Tu vois cette bouteille ? Je l\'ai repêchée il y a trente ans. Le message d\'une inconnue, de l\'autre côté de la mer. Je n\'ai jamais répondu.', choices: [
      c('Il n\'est jamais trop tard !', '…Tu as peut-être raison, moussaillon. Je vais écrire une lettre ce soir.', 10),
      c('Garde-la comme porte-bonheur.', 'C\'est ce que j\'ai fait. Et la chance m\'a mené jusqu\'à toi.', 7),
      c('Elle était jolie ?', 'Ho ho ! Je ne l\'ai jamais vue, voyons !', 4),
    ] },
    { at: 80, text: 'J\'ai répondu à la lettre. Et tu sais quoi ? Elle m\'a écrit ! Elle viendra peut-être voir le phare, cet été.', choices: [
      c('Je suis si content pour toi !', 'Merci, moussaillon. Tiens, mes appâts secrets. Ne les montre à personne.', 10, { items: { appat: 15 } }),
      c('Il faudra lui montrer le poisson-lune !', 'Ho ho ! Si on le trouve un jour ! Tiens, pour t\'entraîner.', 10, { items: { appat: 15 } }),
    ] },
  ],
  noe: [
    { at: 40, text: 'Chut ! J\'ai une cabane secrète dans le Bois Chuchotant. Tu veux être membre du club ?', choices: [
      c('Oui ! C\'est quoi le mot de passe ?', 'Le mot de passe, c\'est… « pop-corn » ! Chuuut !', 10),
      c('Tu n\'as pas peur, tout seul là-bas ?', 'Un peu… Mais les faons me tiennent compagnie !', 6),
    ] },
    { at: 80, text: 'Quand je serai grand, je veux être comme toi. Tu as plein d\'animaux et tout le monde t\'aime !', choices: [
      c('Tu es déjà génial comme tu es.', 'C\'est vrai ? Alors tiens, c\'est mon insecte le plus rare !', 10, { coins: 250 }),
      c('Alors il faudra manger ta salade !', 'Beeerk ! Bon… d\'accord. Une feuille. Une seule !', 6),
    ] },
  ],
  mimi: [
    { at: 40, text: 'Tu sais pourquoi j\'ai ouvert le café ? En arrivant sur l\'île, j\'étais toute seule. Un chaton roux m\'a suivie jusqu\'ici… C\'était Caramel.', choices: [
      c('Les chats choisissent les bonnes personnes.', 'Oh… Alors les chats t\'ont choisi·e aussi, hi hi !', 10),
      c('Caramel a bon goût !', 'Il a surtout bon appétit ! Mais oui, il a bon goût.', 8),
      c('Moi, je préfère les chiens…', 'Tu es pardonné·e. Les chiens sont gentils aussi !', 2),
    ] },
    { at: 80, text: 'Je veux agrandir le café avec une salle de sieste pour chats ! Tu m\'aides à choisir les coussins ?', choices: [
      c('Des coussins en forme de poisson !', 'Génial ! Les chats vont les mordiller… Tiens, prends ce lit, il est pour ton minou.', 10, { furniture: { 'lit-chat': 1 } }),
      c('Des coussins cœur, évidemment.', 'Trop mignon ! Tiens, prends ce lit, il est pour ton minou.', 10, { furniture: { 'lit-chat': 1 } }),
    ] },
  ],
  leo: [
    { at: 40, text: 'Hé ! Tu veux savoir un truc ? Je construis une fusée dans l\'arrière-boutique. Bon, pour l\'instant, c\'est un tonneau avec des ailes.', choices: [
      c('Je veux être le premier passager !', 'Ha ha ! Casque obligatoire, hein !', 10),
      c('Ça a l\'air… dangereux.', 'Un peu ! Mais c\'est ça qui est drôle.', 5),
    ] },
    { at: 80, text: 'J\'ai jamais été doué à l\'école. Mais toi, tu m\'as fait confiance. Merci, sérieux.', choices: [
      c('Tu es le meilleur mécano de l\'île !', 'Arrête, je vais rougir ! Tiens, un casque tout neuf.', 10, { clothing: 'hat:casque' }),
      c('On fait la course jusqu\'au phare ?', 'Tope là ! Et le perdant paie les jus de fruits ! Tiens, pour la course.', 10, { clothing: 'hat:casque' }),
    ] },
  ],
};

Object.assign(HEART_EVENTS, {
  aurele: [
    { at: 40, text: 'Tu sais pourquoi je veille sur cette source ? Ma femme adorait s\'y baigner en regardant les étoiles. Depuis, je la garde chaude pour elle.', choices: [
      c('C\'est une belle façon de se souvenir.', 'Oui… Et maintenant, elle a des visiteurs. Ça lui aurait plu.', 10),
      c('Elle doit veiller sur vous de là-haut.', 'Tu crois ? Alors je lui ferai un signe ce soir. Merci, jeune pousse.', 9),
      c('L\'eau n\'est pas trop chaude ?', 'Ha ha ! Juste ce qu\'il faut pour de vieux os.', 3),
    ] },
    { at: 80, text: 'Autrefois, on voyait le phare de Doucebrise depuis le belvédère. Il guidait les bateaux de nuit. Grâce à toi, j\'ai l\'impression qu\'il brille de nouveau… même quand il est éteint.', choices: [
      c('On le rallumera ensemble.', 'Ensemble… Oui. Tiens, prends cette lampe. Elle éclairait mes soirées d\'étoiles.', 10, { furniture: { 'lampe-lune': 1 } }),
      c('Les étoiles aussi nous guident.', 'Tu as raison. Tiens, prends cette lampe, elle les imite si bien.', 10, { furniture: { 'lampe-lune': 1 } }),
    ] },
  ],
  elise: [
    { at: 40, text: 'Je vais te confier un secret : j\'ai raté mon premier gâteau d\'anniversaire. Il s\'est effondré devant tout le village ! J\'ai failli arrêter la pâtisserie.', choices: [
      c('Et pourtant tu es devenue la meilleure !', 'La meilleure ? Oh, arrête… Bon, peut-être un peu. Hi hi !', 10),
      c('Un gâteau effondré reste délicieux.', 'C\'est exactement ce que m\'a dit Aurèle ! Il en a mangé trois parts.', 9),
      c('Tu aurais dû ajouter plus de farine.', 'Hmm… Merci pour le conseil, chef.', 2),
    ] },
    { at: 80, text: 'Je rêve de créer un gâteau qui raconte l\'archipel : une couche de montagne, une couche de lagon, et un phare au sommet. Tu m\'aides à le goûter ?', choices: [
      c('Avec grand plaisir !', 'Parfait ! Tiens, voilà la recette de ma tarte aux myrtilles, pour te remercier.', 10, { recipe: 'tarte-myrtille' }),
      c('Seulement s\'il y a de la crème !', 'Plein de crème ! Tiens, en attendant, ma recette de tarte aux myrtilles.', 10, { recipe: 'tarte-myrtille' }),
    ] },
  ],
  hugo: [
    { at: 40, text: 'Tu vois ce vieux sapin, là-bas ? C\'est mon grand-père qui l\'a planté. Je ne le couperai jamais. Il fait partie de la famille.', choices: [
      c('Il est magnifique.', 'Hein ? Oui… il l\'est. Merci de le remarquer.', 10),
      c('Tu devrais lui donner un nom !', 'Un nom ? …Gustave. Il s\'appellera Gustave. Ha !', 9),
      c('Il ferait un beau buffet.', '…Jamais de la vie.', 1),
    ] },
    { at: 80, text: 'J\'ai fini ce que je sculptais pour toi. C\'est… un petit ours en bois. Il te ressemble, un peu. Enfin, je trouve.', choices: [
      c('Il est adorable, merci !', 'Ha ! Je savais qu\'il te plairait. Et tiens, un lit de chalet, pour qu\'il ait où dormir.', 10, { furniture: { 'lit-chalet': 1 } }),
      c('Je ne ressemble pas à un ours !', 'Si, un peu. Un gentil ours ! Tiens, un lit de chalet pour vous deux.', 8, { furniture: { 'lit-chalet': 1 } }),
    ] },
  ],
  sacha: [
    { at: 40, text: 'Un jour, je me suis perdue dans le brouillard, là-haut. J\'ai eu très peur. C\'est un cristal qui brillait qui m\'a montré le chemin.', choices: [
      c('Tu es courageuse d\'y être retournée.', 'On ne laisse pas la peur décider à sa place. Mais merci.', 10),
      c('Les cristaux protègent la montagne.', 'C\'est ce que je crois aussi. Tu es de la montagne, toi.', 9),
      c('Tu devrais prendre une boussole.', 'J\'en ai trois maintenant. Ha ha !', 4),
    ] },
    { at: 80, text: 'Je voudrais emmener tout le monde voir le lever du soleil depuis le sommet. Mais ils disent que c\'est trop haut… Tu viendrais, toi ?', choices: [
      c('Évidemment, je serai là !', 'Génial ! Tiens, mon vieux sac de rando. Il a vu tous les sommets.', 10, { clothing: 'back:sacRando' }),
      c('On emmènera même Aurèle !', 'Sur mon dos s\'il le faut ! Tiens, mon sac de rando, il porte bonheur.', 10, { clothing: 'back:sacRando' }),
    ] },
  ],
  neree: [
    { at: 40, text: 'Mon premier bateau s\'appelait « La Douce ». Il a coulé dans une tempête… Je m\'en suis sorti grâce à Marin. Je ne l\'ai jamais vraiment remercié.', choices: [
      c('Il n\'est jamais trop tard pour le faire.', 'Tu as raison, matelot. La prochaine fois que je le vois, je lui offre un maki.', 10),
      c('Il le sait sûrement déjà.', 'Peut-être… Marin est un vieux loup de mer. Il comprend sans les mots.', 8),
      c('Tu devrais racheter un bateau.', 'J\'en ai quatre au port, ha ha !', 3),
    ] },
    { at: 80, text: 'J\'ai baptisé ma nouvelle navette. Je voulais te demander… accepterais-tu qu\'elle porte ton nom ?', choices: [
      c('Ce serait un honneur !', 'Alors c\'est dit ! Et tiens, la barre de mon ancien bateau. Accroche-la chez toi.', 10, { furniture: { 'barre-gouvernail': 1 } }),
      c('Seulement si tu m\'emmènes naviguer !', 'Marché conclu ! Tiens, la barre de mon ancien bateau, en souvenir.', 10, { furniture: { 'barre-gouvernail': 1 } }),
    ] },
  ],
  coralie: [
    { at: 40, text: 'Quand j\'étais petite, j\'avais peur de l\'eau. C\'est une tortue qui m\'a donné envie de plonger : elle nageait si calmement…', choices: [
      c('Et maintenant tu protèges les tortues !', 'La boucle est bouclée, hein ? Hi hi.', 10),
      c('Les tortues sont de bonnes profs.', 'Les meilleures ! Patientes et sages.', 9),
      c('Moi aussi j\'ai peur de l\'eau…', 'On ira doucement, alors. Promis.', 6),
    ] },
    { at: 80, text: 'J\'ai trouvé une perle géante en nettoyant le lagon. Je voudrais qu\'elle serve à quelque chose de beau. Tu as une idée ?', choices: [
      c('Offre-la au phare, comme une lumière.', 'Quelle idée magnifique… Tiens, mes lunettes de plongée. Je veux que tu voies le lagon comme moi.', 10, { clothing: 'glasses:plongee' }),
      c('Garde-la, elle te ressemble.', 'Oh… Merci. Tiens, mes lunettes de plongée, pour toi.', 10, { clothing: 'glasses:plongee' }),
    ] },
  ],
  paco: [
    { at: 40, text: 'Tu sais, avant, j\'étais cuisinier dans un grand restaurant, très loin. Toujours pressé, toujours stressé. Ici, j\'ai appris à respirer.', choices: [
      c('La paillote te va beaucoup mieux.', 'Hein ? Oui ! Le soleil, le lagon, les amis… Que demander de plus ?', 10),
      c('Tu cuisines toujours aussi bien !', 'Ha ! Mes jus sont des chefs-d\'œuvre, c\'est vrai.', 9),
      c('Tu ne t\'ennuies pas ?', 'M\'ennuyer ? Avec un hamac ? Jamais !', 4),
    ] },
    { at: 80, text: 'J\'organise une fête sur la plage pour tout l\'archipel. Tu seras mon invité·e d\'honneur ! Tu choisis la musique ?', choices: [
      c('De la musique douce, au coucher du soleil.', 'Parfait ! Et tiens, mon bar tiki. Pour que la fête continue chez toi !', 10, { furniture: { 'bar-tiki': 1 } }),
      c('Des chansons de Paco, évidemment !', 'Ha ha ! Tu es mon public préféré ! Tiens, mon bar tiki, amigo.', 10, { furniture: { 'bar-tiki': 1 } }),
    ] },
  ],
  maelys: [
    { at: 40, text: 'Je peins beaucoup, mais je ne montre presque rien. J\'ai peur qu\'on trouve mes tableaux… ratés.', choices: [
      c('Tes couleurs rendent les gens heureux.', 'C\'est vrai ? … Alors je vais en exposer un de plus.', 10),
      c('Moi, je les trouve magnifiques.', 'Tu dis ça pour me faire plaisir… mais ça marche. Merci.', 9),
      c('Certains sont un peu étranges…', 'Étranges… C\'est peut-être un compliment, non ?', 4),
    ] },
    { at: 80, text: 'J\'ai fini le portrait dont je t\'avais parlé. C\'est… toi, au milieu de l\'archipel, avec le phare derrière. Tu veux le voir ?', choices: [
      c('Oh, c\'est magnifique !', 'Il est à toi. Accroche-le chez toi, et pense à moi en le regardant !', 10, { furniture: { portrait: 1 } }),
      c('Tu m\'as fait plus beau/belle qu\'en vrai !', 'Pas du tout ! Je peins ce que je vois. Tiens, il est pour toi.', 10, { furniture: { portrait: 1 } }),
    ] },
  ],
});

// Petites phrases en bulle (quand on passe à côté) et bavardages entre voisins.
export const BUBBLES = {
  rose: ['♪ Tra la la…', 'Mes tomates poussent bien !', 'Quelle douceur, aujourd\'hui.'],
  pomme: ['Pommes fraîches ! Pommes !', 'Ka-ching !', 'Qui veut des fraises ?'],
  bruno: ['Hm.', '*sifflote*', 'Du bon bois, ça.'],
  lila: ['Ooh, quelle couleur !', 'Il me faut du ruban…', '♪ Défilé, défilé…'],
  marin: ['Ohé !', 'Belle mer…', 'Ça mord, ça mord !'],
  noe: ['Vrouuuum !', 'Un papillon !', 'Je suis un explorateur !'],
  mimi: ['Minou minou !', 'Miaou ♪', 'Qui veut de la pâtée ?'],
  leo: ['Vroum vroum !', 'Où est ma clé de 12 ?', 'Pouet pouet !'],
  aurele: ['Ahh, quelle vue…', 'Les étoiles seront belles ce soir.', '*fredonne une vieille chanson*'],
  elise: ['Croissants tout chauds !', 'Un peu plus de sucre…', '♪ Tarte, tarte, tarte…'],
  hugo: ['Toc, toc, toc…', 'Du bon pin, ça !', 'Qui veut une bûche ?'],
  sacha: ['On grimpe ?', 'Quelle vue !', 'Le sommet m\'appelle !'],
  neree: ['Ahoy !', 'Vent d\'ouest, bonne pêche.', 'Larguez les amarres !'],
  coralie: ['Une tortue !', 'Le lagon est si clair…', 'Blub blub !'],
  paco: ['¡Hola!', 'Jus de coco frais !', '♪ La la la, la playa…'],
  maelys: ['Quelle lumière !', 'Un peu de bleu ici…', 'Ne bouge pas !'],
};

export const CHATTER = [
  ['Tu as vu le nouvel habitant ?', 'Oui ! Tout le monde en parle !'],
  ['Il paraît que Marin a pêché un poisson énorme.', 'Il dit toujours ça !'],
  ['Tu viens au café ce soir ?', 'Seulement s\'il y a des chats !'],
  ['Il fait beau, hein ?', 'Parfait pour une balade !'],
  ['Tu as goûté la tarte de Mamie Rose ?', 'Un délice !'],
  ['Le phare brillait plus fort, avant…', 'On dit que c\'est le cœur de l\'île.'],
  ['J\'ai vu passer un vélo fleuri !', 'C\'est sûrement Léo qui l\'a réparé.'],
  ['Tu crois qu\'il va pleuvoir ?', 'Mes genoux disent que oui !'],
  ['Les lapins ont encore mangé mes carottes.', 'Ils sont trop mignons pour qu\'on leur en veuille !'],
  ['Tu connais le mot de passe du club de Noé ?', 'Chut, c\'est secret !'],
  ['Tu es montée au belvédère ?', 'Oui ! On voit même le port d\'en haut !'],
  ['Elle est chaude, la source, aujourd\'hui ?', 'Parfaite, comme toujours !'],
  ['Les croissants d\'Élise…', 'Un délice. J\'en rêve la nuit.'],
  ['Le bateau de Nérée repart à quelle heure ?', 'Quand il veut, c\'est le capitaine !'],
  ['Tu as vu les couleurs du lagon ?', 'Maëlys dit qu\'elles sont impossibles à peindre.'],
  ['On va à la paillote ce soir ?', 'Paco a promis des lampions !'],
];

// Marqueurs au-dessus des têtes : « ! » quête à proposer, « ? » quête à rendre,
// petit « ! » bleu pour une demande du jour.
const markerTex = {};
function markerTexture(kind) {
  if (markerTex[kind]) return markerTex[kind];
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const fill = kind === 'request' ? '#8fd0ff' : kind === 'ready' ? '#7fe0a0' : '#ffd84d';
  ctx.shadowColor = 'rgba(91, 70, 54, 0.35)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(64, 60, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.fillStyle = '#5b4636';
  ctx.font = '900 72px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind === 'ready' ? '?' : '!', 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  markerTex[kind] = t;
  return t;
}

// Répliques supplémentaires (archipel, saisons, souvenirs).
const EXTRA_CHAT = {
  rose: ['Élise et moi, on faisait les confitures ensemble, autrefois. Les meilleures de l\'archipel !', 'Tu as vu les cerisiers au printemps ? On dirait de la neige rose.', 'Un jardin, c\'est comme une amitié : ça s\'arrose tous les jours.', 'Si tu passes au bourg, dis bonjour à Élise de ma part.', 'Les abeilles adorent mes fleurs. Moi, j\'adore leur miel !'],
  pomme: ['Les noix de coco de Paco se vendent comme des petits pains !', 'Au marché, on apprend tout ce qui se passe sur l\'île. Tout !', 'Une pomme par jour… et le docteur n\'a plus de clients !', 'Nérée prétend que ses poissons sont plus frais que les miens. Pfff.', 'Le verger donne plus de pommes depuis que le phare brille. Coïncidence ?'],
  bruno: ['Le pin de l\'île des Pins sent bon la résine. Hugo a de la chance.', 'Une chaise bancale, c\'est une chaise qui a une histoire.', '… Le kiosque de la prairie ? C\'est moi qui ai posé le plancher.', 'Mesure deux fois, coupe une fois. Toujours.', 'Le bois vivant craque la nuit. Il raconte sa journée.'],
  lila: ['Les hibiscus de l\'île Corail donnent une teinture rose incroyable !', 'Un chapeau, c\'est la cerise sur le gâteau d\'une tenue.', 'Maëlys et moi, on prépare un défilé sur la plage. Chut, c\'est secret !', 'J\'ai cousu une écharpe pour chaque chèvre des neiges. Elles n\'ont pas aimé.', 'Le vichy revient à la mode. Enfin, il n\'est jamais parti.'],
  marin: ['Nérée était mon second, autrefois. Un sacré marin, ce gamin.', 'Les baleines chantaient, quand j\'étais jeune. Tu y crois, toi ?', 'Le vent du large a toujours raison. Toujours.', 'Au Lac Miroir, l\'eau est si froide que les poissons ont des écharpes. Ha !', 'Un bon pêcheur sait attendre. Un très bon pêcheur sait attendre en dormant.'],
  noe: ['Sacha m\'a montré une chèvre qui escalade les rochers à la verticale ! TROP FORT !', 'Un jour, j\'irai jusqu\'au sommet du Pic tout seul. Enfin… avec toi.', 'Tu savais que les loutres se tiennent la main pour dormir ? C\'est vrai !', 'J\'ai trouvé un cristal ! Ah non, c\'est un bonbon.', 'Les perroquets de la palmeraie savent dire « Noé ». Je leur ai appris !'],
  mimi: ['Les chats de Port-Corail adorent les sardines de Nérée. Traîtres !', 'Miaou… pardon, c\'est l\'habitude.', 'Un chat qui ronronne, c\'est un chat qui dit merci.', 'J\'ai rêvé que les chats avaient leur propre île. Ce serait le paradis.', 'Chut… Pompon dort sur la caisse. On ne le dérange pas.'],
  leo: ['Le pont du Soleil tient bon. Je l\'ai vérifié à vélo. Trois fois.', 'Une luge avec un moteur, tu crois que Hugo me laisserait essayer ?', 'Les montgolfières détestent le vent d\'orage. Moi aussi.', 'Si ça roule, je le répare. Si ça vole, je le répare aussi !', 'J\'ai installé des phares sur ma trottinette. Pour les balades de nuit.'],
  aurele: ['L\'eau de la source vient du cœur de la montagne. Elle est plus vieille que moi.', 'Un bain le matin, une tisane le soir. Voilà le secret d\'une longue vie.', 'Les jeunes courent partout. Moi, je laisse le monde venir à moi.', 'Le Pic a vu passer mille hivers. Il a de la patience, lui aussi.', 'Écoute le silence de la neige. Il en dit long.'],
  elise: ['Rose m\'écrit de nouveau ! Tu ne sais pas le bonheur que ça me fait.', 'Le secret d\'une pâte feuilletée ? Du beurre froid et des mains chaudes.', 'Les croissants du matin partent avant sept heures. Lève-toi tôt !', 'Hugo mange mes tartes en cachette. Je le sais, il y a des miettes partout.', 'Une pincée de cannelle, et tout l\'hiver sent bon.'],
  hugo: ['Un arbre abattu, deux arbres plantés. C\'est la règle de la montagne.', 'Bruno ? Un grand artisan. Mais ne lui dis pas que j\'ai dit ça.', 'Les écureuils me volent mes pommes de pin. On a un accord, eux et moi.', 'La hache, c\'est comme le piano : il faut du rythme.', 'Le soir, je sculpte au coin du poêle. Des chèvres, surtout.'],
  sacha: ['Là-haut, on voit les trois îles d\'un seul coup d\'œil. Magique.', 'La constellation du Chat, c\'est moi qui l\'ai baptisée. Elle est officielle. Presque.', 'Les aurores dansent surtout les nuits d\'hiver bien claires.', 'Une bonne randonnée commence par de bonnes chaussettes.', 'Les chèvres des neiges connaissent des chemins que personne ne connaît.'],
  neree: ['Le port n\'a jamais été aussi animé depuis que le phare brille !', 'Marin ? Il m\'a tout appris. Même à perdre aux cartes.', 'Un bon capitaine sent la tempête avant qu\'elle arrive. Là, je sens… des croissants.', 'Mon bateau s\'appelle « Bonne Brise ». Original, hein ?', 'La mer donne, la mer reprend. Surtout mes chapeaux.'],
  coralie: ['Le lagon abrite plus de cent espèces. J\'en ai compté quatre-vingt-dix-sept !', 'Les tortues reviennent pondre sur la même plage où elles sont nées. Fascinant.', 'Le corail, c\'est vivant ! Il faut le ramasser seulement quand il est tombé.', 'Un jour, je plongerai avec la baleine. C\'est mon rêve.', 'Les perles naissent d\'un grain de sable. Comme les belles idées.'],
  paco: ['¡ Hola ! Un jus de coco pour te rafraîchir ?', 'La paillote ferme quand le dernier danseur s\'endort.', 'Le secret de mes cocktails ? De la musique pendant qu\'on mélange !', 'Les perroquets me réclament des cacahuètes. Je n\'ai que des noix de coco.', 'Le coucher de soleil sur le lagon, c\'est gratuit et c\'est le plus beau spectacle.'],
  maelys: ['Les couleurs du lagon changent toutes les heures. Impossible de les attraper !', 'Je peins le phare chaque saison. Il n\'est jamais pareil.', 'Un tableau, c\'est une fenêtre qu\'on ouvre sur un souvenir.', 'Lila m\'a promis une robe couleur aurore. J\'ai hâte !', 'Parfois, je peins les yeux fermés. C\'est… surprenant.'],
};
const SHARED_LINES = {
  storm: ['Quel orage ! Reste à l\'abri, d\'accord ?', 'Tu as entendu ce coup de tonnerre ? J\'ai sursauté !', 'Les éclairs, c\'est beau… de loin.'],
  fog: ['Quel brouillard ce matin ! On ne voit pas le bout de son nez.', 'Le brouillard, c\'est la mer qui fait la grasse matinée.'],
  aurora: ['Tu as vu les aurores, cette nuit ? Le ciel dansait !'],
  visit: ['Fais comme chez toi ! Mais ne touche pas à mes affaires, hein.', 'Ça me fait plaisir que tu passes me voir.', 'Tu veux un thé ? J\'en ai toujours un qui chauffe.', 'Alors, comment tu trouves ma déco ?'],
  festival: {
    fleurs: ['Des fleurs partout, quel bonheur !'], peche: ['Tu participes au concours ? Bonne chance !'], recolte: ['Quelle belle fête des récoltes !'], etoiles: ['Ce soir, on regarde les étoiles ensemble ?'],
    cerisiers: ['Un pique-nique sous les cerisiers, c\'est la meilleure fête de l\'année !'], port: ['Tu as vu les voiliers dans la baie ? Magnifique !'],
    lanternes: ['Ce soir, les lanternes vont flotter sur le Lac Miroir. Il faut voir ça !'], hiver: ['Le marché d\'hiver ! Un chocolat chaud, et tout va mieux.'],
  },
};
for (const v of VILLAGERS) if (EXTRA_CHAT[v.id]) v.lines.chat.push(...EXTRA_CHAT[v.id]);

const RING = 6.8;
const WALK = 2.3;

const MAIN_CENTER = { x: 0, z: 0, ring: RING };

function ring(a, c = MAIN_CENTER) {
  return [c.x + Math.cos(a) * c.ring, c.z + Math.sin(a) * c.ring];
}

/** Lieu : position finale + chemin d'approche depuis l'anneau de la place du village. */
function location(pos, approach = [], rot = 0, extra = {}, c = MAIN_CENTER) {
  const first = approach.length ? approach[0] : pos;
  return { pos, approach: [...approach, pos], angle: Math.atan2(first[1] - c.z, first[0] - c.x), rot, center: c, ...extra };
}

function route(from, to) {
  const pts = [];
  const c = to.center || MAIN_CENTER;
  const back = [...from.approach].reverse().slice(1);
  pts.push(...back);
  let a0 = from.angle;
  const a1 = to.angle;
  let d = ((a1 - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  pts.push(ring(a0, c));
  const steps = Math.ceil(Math.abs(d) / 0.5);
  for (let i = 1; i <= steps; i++) pts.push(ring(a0 + (d * i) / steps, c));
  pts.push(...to.approach);
  return pts;
}

export class Villager {
  constructor(def, game) {
    this.def = def;
    this.game = game;
    // Personnage importé animé (KayKit) ; à défaut, le personnage construit en code.
    const appearance = normalizeAppearance({ ...def.appearance, name: def.name });
    this.character = createVillagerBody(def.id, appearance) || new Character(appearance);
    this.root = this.character.root;
    this.pos = new THREE.Vector3();
    this.rotY = 0;
    this.path = [];
    this.speed = 0;
    this.home = true;
    this.loc = null;
    this.locName = '';
    this.friendship = 0;
    this.talkedDay = 0;
    this.giftDay = 0;
    this.rewardsGiven = [];
    this.seenEvents = [];
    this.met = false;
    this.wanderT = 0;
    this.bubbleT = 4 + Math.random() * 8;
    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture('request'), depthWrite: false }));
    this.markerKind = 'request';
    this.bubble.scale.setScalar(0.5);
    this.bubble.position.y = 2.25 * (def.appearance.height || 1);
    this.bubble.visible = false;
    this.root.add(this.bubble);
    this.buildLocations();
  }

  buildLocations() {
    const v = this.game.world.village;
    const house = v.houses[this.def.house];
    const vid = house.village || 'main';
    const c = v.centers?.[vid] || MAIN_CENTER;
    this.villageId = vid;
    const door = v.doorFront(this.def.house);
    const doorPt = [door.x, door.z];
    const L = {};
    const loc = (pos, approach, rot, extra) => location(pos, approach, rot, extra, c);
    L.home = loc(doorPt, [[c.x + (door.x - c.x) * 0.62, c.z + (door.z - c.z) * 0.62]], door.rot + Math.PI, { inside: true });
    // Petite balade du matin : un point dégagé de la place.
    const sa = Math.atan2(door.z - c.z, door.x - c.x) + 0.3;
    L.stroll = loc([c.x + Math.cos(sa) * (c.ring + 0.6), c.z + Math.sin(sa) * (c.ring + 0.6)], [], door.rot);
    const w = this.def.work;
    if (w) {
      // Lieu de travail hors de la place, rejoint par un chemin.
      const spot = typeof w.at === 'function' ? w.at(this.game.world) : w.at;
      L.work = loc([spot.x, spot.z], (w.path || []).map((p) => [p[0], p[1]]), spot.rot ?? 0, { wander: w.wander, fishing: w.fishing });
    } else if (this.def.shop) {
      // On contourne l'étal par le côté pour se placer derrière.
      const s = v.shopSpots[this.def.shop];
      const fx = Math.sin(s.rot);
      const fz = Math.cos(s.rot);
      const side = this.def.shop === 'marche' ? -2.4 : 1.9; // côté opposé aux tonneaux pour le marché
      const sx = fz * side;
      const sz = -fx * side;
      L.work = loc([s.x, s.z], [[s.x + fx * 2.2 + sx, s.z + fz * 2.2 + sz], [s.x + sx, s.z + sz]], s.rot);
      // Au travail, le marchand se tient à côté de son étal (côté opposé au panneau), un
      // peu tourné vers lui : derrière, le comptoir le cachait, lui et ses gestes.
      const cx = s.x + fx * 1.0;
      const cz = s.z + fz * 1.0;
      const out = this.def.shop === 'marche' ? 2.25 : 1.6;
      const wx = cx - fz * out + fx * 0.25;
      const wz = cz + fx * out + fz * 0.25;
      const free = this.game.world.colliders.resolve(wx, wz, 0.35);
      if (Math.hypot(free.x - wx, free.z - wz) < 0.05 && this.game.world.heightAt(wx, wz) > 0.3) {
        L.work = loc([wx, wz], [[cx + fx * 1.6 - fz * out, cz + fz * 1.6 + fx * out]], s.rot + 0.45);
      }
    } else if (this.def.id === 'marin') {
      const f = this.game.world.fishingSpots.find((sp) => sp.habitat === 'mer');
      const path = PATHS[4].slice(1).map((p) => [p[0], p[1]]);
      L.work = loc([f.x + 1.1, f.z - 5], path, 0, { fishing: true });
    } else {
      const path = PATHS[0].slice(1, 2).map((p) => [p[0], p[1]]);
      L.work = loc([42, 12], path, 0, { wander: 7 });
    }
    const benches = v.benchesBy?.[vid] || v.benches;
    const benchIndex = { rose: 0, bruno: 2, marin: 4, pomme: 6, lila: 1, noe: 7, mimi: 3, leo: 5, aurele: 0, elise: 3, hugo: 5, sacha: 6, neree: 1, coralie: 2, paco: 5, maelys: 7 }[this.def.id] ?? 0;
    const b = benches[benchIndex % benches.length];
    const bx = b.x + Math.sin(b.rot) * 0.9;
    const bz = b.z + Math.cos(b.rot) * 0.9;
    L.evening = loc([b.x, b.z], [[c.x + (bx - c.x) * 0.75, c.z + (bz - c.z) * 0.75], [bx, bz]], b.rot, { sit: b.y });
    this.L = L;
  }

  /** Où doit être l'habitant à cette heure ? */
  scheduled(hour) {
    if (hour < 7 || hour >= 21.5) return 'home';
    if (hour < 8.5) return 'stroll';
    if (hour < 18) return 'work';
    return 'evening';
  }

  placeAt(name) {
    const loc = this.L[name];
    this.locName = name;
    this.loc = loc;
    this.path = [];
    this.pos.set(loc.pos[0], this.game.world.groundAt(loc.pos[0], loc.pos[1]), loc.pos[1]);
    this.rotY = loc.rot;
    this.home = !!loc.inside;
    this.arrive();
  }

  goTo(name) {
    const to = this.L[name];
    const from = this.loc || to;
    this.leave();
    this.path = route(from, to);
    this.locName = name;
    this.loc = to;
    this.home = false;
  }

  leave() {
    this.character.setSit(false);
    this.character.setFishing(false);
  }

  arrive() {
    const loc = this.loc;
    this.home = !!loc.inside;
    if (loc.sit) {
      this.pos.y = loc.sit - 0.5;
      this.character.setSit(true, 0.5);
    }
    if (loc.fishing) this.character.setFishing(true);
    this.rotY = loc.rot;
  }

  get interactable() {
    return !this.home && this.root.visible;
  }

  update(dt, hour, raining) {
    // Position imposée (grande finale au phare).
    if (this.override) {
      const o = this.override;
      this.pos.set(o.x, this.game.world.groundAt(o.x, o.z), o.z);
      this.rotY = o.rot;
      this.home = false;
      this.path = [];
      this.root.visible = true;
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.rotY;
      this.character.setUmbrella(false);
      this.character.setWork?.(null);
      this.character.setDistance?.(this.pos.distanceTo(this.game.camera.position));
      this.character.update(dt, { speed: 0, running: false, grounded: true, vy: 0 });
      return;
    }
    const want = this.scheduled(hour);
    if (want !== this.locName) {
      if (!this.loc) this.placeAt(want);
      else this.goTo(want);
    }
    const player = this.game.player;
    let speed = 0;
    if (this.path.length) {
      const [tx, tz] = this.path[0];
      const dx = tx - this.pos.x;
      const dz = tz - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) {
        this.path.shift();
        this.stuckT = 0;
        if (!this.path.length) this.arrive();
      } else {
        this.rotY = lerpAngle(this.rotY, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
        const step = Math.min(WALK * dt, d);
        let nx = this.pos.x + (dx / d) * step;
        let nz = this.pos.z + (dz / d) * step;
        // Dernier pas vers un banc : pas de collision (l'assise est dans le banc).
        if (!(this.path.length === 1 && this.loc?.sit)) {
          const r = this.game.world.colliders.resolve(nx, nz, 0.3);
          nx = r.x;
          nz = r.z;
        }
        const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
        this.stuckT = moved < step * 0.3 ? (this.stuckT || 0) + dt : 0;
        this.pos.x = nx;
        this.pos.z = nz;
        // Bloqué contre un obstacle : on saute à l'étape suivante.
        if (this.stuckT > 2.5) {
          this.pos.x = tx;
          this.pos.z = tz;
          this.stuckT = 0;
        }
        this.pos.y = this.game.world.groundAt(this.pos.x, this.pos.z);
        speed = WALK;
      }
    } else if (!this.home) {
      // À destination : Noé gambade, les autres regardent le joueur s'il approche.
      const loc = this.loc;
      if (loc.wander) {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = 3 + Math.random() * 4;
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * loc.wander;
          const x = loc.pos[0] + Math.cos(a) * r;
          const z = loc.pos[1] + Math.sin(a) * r;
          if (this.game.world.heightAt(x, z) > 0.5) this.path = [[x, z]];
        }
      }
      const pd = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      // Au travail, on ne s'interrompt que si le joueur vient vraiment parler.
      const near = JOBS[this.def.id] && this.locName === 'work' ? 2.4 : 4;
      if (pd < near && !loc.sit && !loc.fishing) {
        this.rotY = lerpAngle(this.rotY, Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z), 1 - Math.exp(-4 * dt));
      } else if (!loc.wander) {
        this.rotY = lerpAngle(this.rotY, loc.rot, 1 - Math.exp(-3 * dt));
      }
    }
    this.speed = damp(this.speed, speed, 10, dt);
    this.character.setUmbrella(raining && !this.home && !this.loc?.fishing, '#ff8fab');
    // Gestes de métier : à son poste, sans parapluie, sauf pendant une conversation.
    const talking = this.game.dialogue?.villager === this;
    const playerDist = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    const working = !!JOBS[this.def.id] && this.locName === 'work' && !this.path.length && !this.home && !this.loc?.sit && !this.loc?.fishing && !raining && !talking && playerDist >= 2.4;
    this.character.setWork?.(working ? this.def.id : null);
    const far = this.pos.distanceTo(player.pos) > 80;
    this.root.visible = !this.home && !far;
    if (this.root.visible) {
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.rotY;
      this.character.setDistance?.(this.pos.distanceTo(this.game.camera.position));
      this.character.update(dt, { speed: this.speed, running: false, grounded: true, vy: 0 });
      const hit = this.character.takeWorkHit?.();
      if (hit) this.toolSound(hit);
    }
  }

  /** Bruit d'un outil (marteau, scie…), entendu de près, placé à gauche ou à droite. */
  toolSound(kind) {
    const g = this.game;
    const a = g.audio;
    if (!a.ctx || g.indoors || g.state !== 'play') return;
    const d = this.pos.distanceTo(g.player.pos);
    if (d > 16) return;
    const cam = g.camera;
    const right = _right.set(1, 0, 0).applyQuaternion(cam.quaternion);
    const dir = _dir.copy(this.pos).sub(cam.position).setY(0).normalize();
    a.soundscape.tool(kind, dir.dot(right) * 0.8, Math.min(0.85, d / 18));
  }

  // --- Relations -------------------------------------------------------------

  get hearts() {
    return Math.floor(this.friendship / 20);
  }

  line(kind) {
    const list = this.def.lines[kind];
    if (!list || !list.length) return '';
    return Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : list;
  }

  greeting() {
    const g = this.game;
    const w = g.world.weather;
    const h = g.world.sky.hour;
    const pool = [];
    if (w.isRaining) pool.push(this.line('rain'));
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    if (w.isStorm) pool.push(pick(SHARED_LINES.storm));
    if (w.current === 'brouillard') pool.push(pick(SHARED_LINES.fog));
    if (w.seasonIndex === 3 && (h < 9 || h > 20)) pool.push(pick(SHARED_LINES.aurora));
    const fest = g.calendar?.festival;
    if (fest && SHARED_LINES.festival[fest.id]) pool.push(pick(SHARED_LINES.festival[fest.id]), pick(SHARED_LINES.festival[fest.id]));
    if (g.visits?.active === this) pool.push(pick(SHARED_LINES.visit), pick(SHARED_LINES.visit));
    if (w.seasonIndex === 3) pool.push(this.line('snow'));
    if (w.seasonIndex === 2) pool.push(this.line('autumn'));
    if (h >= 18) pool.push(this.line('evening'));
    if (this.friendship >= 60) pool.push(this.line('friend'));
    const r = Math.random() < 0.45 ? this.remark() : null;
    if (r) pool.unshift(r);
    pool.push(this.line('hello'));
    return pool[Math.floor(Math.random() * Math.min(pool.length, 2))] || this.line('hello');
  }

  /** Réaction à la tenue du joueur, à ses compagnons… */
  remark() {
    const g = this.game;
    const a = g.character.appearance;
    const out = [];
    const pets = g.animals.followers();
    if (pets.length) {
      const p = pets[Math.floor(Math.random() * pets.length)];
      out.push(this.def.id === 'mimi' && p.species === 'chat' ? `Oh ! ${p.name} ! Viens voir tata Mimi ! ${p.sp.emoji}💕` : `Oh, ${p.name} t'accompagne ! Bonjour, toi ! ${p.sp.emoji}`);
    }
    for (const key of ['hat', 'back', 'glasses']) {
      const none = key === 'glasses' ? 'aucune' : key === 'hat' ? 'aucun' : 'aucun';
      if (a[key] === none) continue;
      const opt = OPTIONS[key].find((o) => o.id === a[key]);
      if (!opt) continue;
      out.push(this.def.id === 'lila' ? `${opt.icon || '✨'} ${opt.label} ? Quel style ! Tu as l'œil, je le dis toujours.` : `Oh, ${opt.icon || '✨'} ${opt.label.toLowerCase()} ! Ça te va trop bien !`);
    }
    const t = g.progress?.title;
    if (t && t !== 'Nouveau venu' && Math.random() < 0.3) out.push(`Mais c'est ${t.toLowerCase()} en personne ! Bonjour !`);
    return out.length ? out[Math.floor(Math.random() * out.length)] : null;
  }

  reaction(itemId) {
    const d = this.def;
    const ids = ITEMS[itemId]?.tag === 'poisson' ? [itemId, 'poisson'] : [itemId];
    if (ids.some((id) => d.loves.includes(id))) return 'love';
    if (ids.some((id) => d.likes.includes(id))) return 'like';
    if (ids.some((id) => d.dislikes.includes(id))) return 'dislike';
    return 'neutral';
  }

  /** Petite bulle de texte au-dessus de la tête. */
  say(text, ms = 2600) {
    if (!this.root.visible) return;
    const h = 2.35 * (this.def.appearance.height || 1);
    this.game.ui.bubble?.(() => this.pos.clone().setY(this.pos.y + h), text, ms);
  }

  serialize() {
    return { f: this.friendship, t: this.talkedDay, g: this.giftDay, r: this.rewardsGiven, m: this.met, e: this.seenEvents };
  }

  restore(d) {
    if (!d) return;
    this.friendship = d.f || 0;
    this.talkedDay = d.t || 0;
    this.giftDay = d.g || 0;
    this.rewardsGiven = d.r || [];
    this.met = !!d.m;
    this.seenEvents = d.e || [];
  }
}

export class VillagerManager {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.list = VILLAGERS.map((d) => new Villager(d, game));
    for (const v of this.list) this.group.add(v.root);
    game.scene.add(this.group);
    this.initialized = false;
  }

  get(id) {
    return this.list.find((v) => v.def.id === id);
  }

  update(dt) {
    const sky = this.game.world.sky;
    if (!this.initialized) {
      for (const v of this.list) v.placeAt(v.scheduled(sky.hour));
      this.initialized = true;
    }
    const raining = this.game.world.weather.isRaining || this.game.world.weather.isSnowing;
    for (const v of this.list) {
      v.update(dt, sky.hour, raining);
      const req = this.game.quests?.requestFor(v.def.id);
      const kind = v.override ? null : this.game.sideQuests?.markerFor(v.def.id) || (req && !req.done ? 'request' : null);
      v.bubble.visible = !!kind;
      if (kind) {
        if (v.markerKind !== kind) {
          v.markerKind = kind;
          v.bubble.material.map = markerTexture(kind);
          v.bubble.scale.setScalar(kind === 'request' ? 0.5 : 0.72);
        }
        v.bubble.position.y = 2.3 * (v.def.appearance.height || 1) + Math.sin(this.game.elapsed * 3) * 0.06 + (kind === 'request' ? 0 : 0.1);
      }
    }
    this.updateChatter(dt);
  }

  /** Bavardages : bulles quand on passe près des habitants. */
  updateChatter(dt) {
    const g = this.game;
    if (g.state !== 'play' || g.dialogue?.open) return;
    const p = g.player.pos;
    for (const v of this.list) {
      if (!v.root.visible || v.home) continue;
      v.bubbleT -= dt;
      if (v.bubbleT > 0) continue;
      v.bubbleT = 9 + Math.random() * 12;
      const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z);
      if (d > 16 || d < 2.5) continue;
      const other = this.list.find((o) => o !== v && o.root.visible && !o.home && Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z) < 5);
      if (other && Math.random() < 0.6) {
        const [a, b] = CHATTER[Math.floor(Math.random() * CHATTER.length)];
        v.say(a, 2800);
        other.bubbleT = Math.max(other.bubbleT, 6);
        setTimeout(() => other.say(b, 2800), 2300);
      } else {
        const list = BUBBLES[v.def.id] || ['♪'];
        v.say(list[Math.floor(Math.random() * list.length)], 2200);
      }
    }
  }

  nearest(maxDist = 2.3) {
    const p = this.game.player.pos;
    let best = null;
    let bestD = maxDist;
    for (const v of this.list) {
      if (!v.interactable) continue;
      const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z);
      if (d < bestD) {
        best = v;
        bestD = d;
      }
    }
    return best;
  }

  /** Obstacles mobiles pour le joueur (on ne traverse pas les habitants). */
  obstacles() {
    return this.list.filter((v) => v.interactable).map((v) => v.pos);
  }

  serialize() {
    return Object.fromEntries(this.list.map((v) => [v.def.id, v.serialize()]));
  }

  restore(d) {
    if (!d) return;
    for (const v of this.list) v.restore(d[v.def.id]);
  }
}

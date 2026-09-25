import * as THREE from 'three';
import { Character } from '../player/character.js';
import { normalizeAppearance, OPTIONS } from '../player/appearance.js';
import { ITEMS } from '../game/items.js';
import { damp, lerpAngle } from '../core/math.js';
import { PATHS } from '../world/layout.js';

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
];


// Anniversaires : saison (0 printemps … 3 hiver) et jour de la saison.
export const BIRTHDAYS = {
  noe: [0, 1], lila: [0, 3], pomme: [1, 1], marin: [1, 3], mimi: [2, 1], rose: [2, 3], bruno: [3, 1], leo: [3, 3],
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
];

let bubbleTex = null;
function bubbleTexture() {
  if (bubbleTex) return bubbleTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffd84d';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(32, 30, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5b4636';
  ctx.font = '900 34px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 32, 32);
  bubbleTex = new THREE.CanvasTexture(c);
  bubbleTex.colorSpace = THREE.SRGBColorSpace;
  return bubbleTex;
}

const RING = 6.8;
const WALK = 2.3;

function ring(a) {
  return [Math.cos(a) * RING, Math.sin(a) * RING];
}

/** Lieu : position finale + chemin d'approche depuis l'anneau de la place. */
function location(pos, approach = [], rot = 0, extra = {}) {
  const first = approach.length ? approach[0] : pos;
  return { pos, approach: [...approach, pos], angle: Math.atan2(first[1], first[0]), rot, ...extra };
}

function route(from, to) {
  const pts = [];
  const back = [...from.approach].reverse().slice(1);
  pts.push(...back);
  let a0 = from.angle;
  const a1 = to.angle;
  let d = ((a1 - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  pts.push(ring(a0));
  const steps = Math.ceil(Math.abs(d) / 0.5);
  for (let i = 1; i <= steps; i++) pts.push(ring(a0 + (d * i) / steps));
  pts.push(...to.approach);
  return pts;
}

export class Villager {
  constructor(def, game) {
    this.def = def;
    this.game = game;
    this.character = new Character(normalizeAppearance({ ...def.appearance, name: def.name }));
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
    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture(), depthWrite: false }));
    this.bubble.scale.setScalar(0.5);
    this.bubble.position.y = 2.25 * (def.appearance.height || 1);
    this.bubble.visible = false;
    this.root.add(this.bubble);
    this.buildLocations();
  }

  buildLocations() {
    const v = this.game.world.village;
    const door = v.doorFront(this.def.house);
    const doorPt = [door.x, door.z];
    const L = {};
    L.home = location(doorPt, [[door.x * 0.62, door.z * 0.62]], door.rot + Math.PI, { inside: true });
    // Petite balade du matin : un point dégagé de la place.
    const sa = Math.atan2(door.z, door.x) + 0.3;
    L.stroll = location([Math.cos(sa) * 7.4, Math.sin(sa) * 7.4], [], door.rot);
    if (this.def.shop) {
      // On contourne l'étal par le côté pour se placer derrière.
      const s = v.shopSpots[this.def.shop];
      const fx = Math.sin(s.rot);
      const fz = Math.cos(s.rot);
      const side = this.def.shop === 'marche' ? -2.4 : 1.9; // côté opposé aux tonneaux pour le marché
      const sx = fz * side;
      const sz = -fx * side;
      L.work = location([s.x, s.z], [[s.x + fx * 2.2 + sx, s.z + fz * 2.2 + sz], [s.x + sx, s.z + sz]], s.rot);
    } else if (this.def.id === 'marin') {
      const f = this.game.world.fishingSpots.find((sp) => sp.habitat === 'mer');
      const path = PATHS[4].slice(1).map((p) => [p[0], p[1]]);
      L.work = location([f.x + 1.1, f.z - 5], path, 0, { fishing: true });
    } else {
      const path = PATHS[0].slice(1, 2).map((p) => [p[0], p[1]]);
      L.work = location([42, 12], path, 0, { wander: 7 });
    }
    const benchIndex = { rose: 0, bruno: 2, marin: 4, pomme: 6, lila: 1, noe: 7, mimi: 3, leo: 5 }[this.def.id];
    const b = v.benches[benchIndex % v.benches.length];
    const bx = b.x + Math.sin(b.rot) * 0.9;
    const bz = b.z + Math.cos(b.rot) * 0.9;
    L.evening = location([b.x, b.z], [[bx * 0.75, bz * 0.75], [bx, bz]], b.rot, { sit: b.y });
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
      if (pd < 4 && !loc.sit && !loc.fishing) {
        this.rotY = lerpAngle(this.rotY, Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z), 1 - Math.exp(-4 * dt));
      } else if (!loc.wander) {
        this.rotY = lerpAngle(this.rotY, loc.rot, 1 - Math.exp(-3 * dt));
      }
    }
    this.speed = damp(this.speed, speed, 10, dt);
    this.character.setUmbrella(raining && !this.home && !this.loc?.fishing, '#ff8fab');
    const far = this.pos.distanceTo(player.pos) > 80;
    this.root.visible = !this.home && !far;
    if (this.root.visible) {
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.rotY;
      this.character.update(dt, { speed: this.speed, running: false, grounded: true, vy: 0 });
    }
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
      v.bubble.visible = !!req && !req.done && !v.override;
      if (v.bubble.visible) v.bubble.position.y = 2.25 * (v.def.appearance.height || 1) + Math.sin(this.game.elapsed * 3) * 0.05;
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

# 🌸 Doucebrise

Un jeu 3D **cosy** dans l'esprit de *Heartopia* : un archipel de trois îles et trois villages à explorer, des animaux à apprivoiser, 16 habitants avec leurs histoires et leurs quêtes, une maison à construire et décorer, des véhicules, des métiers, une météo vivante, un ciel étoilé… et une histoire à suivre, « Le Cœur de Doucebrise ».

Le jeu est écrit avec Three.js. Il se joue **dans le navigateur** ou comme **application de bureau Windows et macOS**. Les modèles 3D, les visages, les motifs, les meubles, le ciel, l'eau et les bruitages sont tous générés par le code ; les musiques viennent du dossier `music/`.

## Télécharger l'application (Windows / macOS)

Chaque envoi sur GitHub construit automatiquement les applications (workflow **Applications Windows et macOS**) :

1. Onglet **Actions** du dépôt → dernier passage vert du workflow → section **Artifacts**.
2. **Doucebrise-Windows** : installateur `Doucebrise-x.y.z-installation.exe` et version portable `Doucebrise-x.y.z-portable.exe` (aucune installation).
3. **Doucebrise-macOS** : `Doucebrise-x.y.z-mac.dmg`, universel (Mac Intel et Apple Silicon). L'application n'étant pas signée par un compte développeur Apple, au premier lancement : clic droit sur Doucebrise → **Ouvrir** → **Ouvrir**.

Un tag `v*` (par exemple `v0.5.0`) publie aussi les fichiers dans une **Release** GitHub. L'application vérifie au démarrage si une Release plus récente existe et l'annonce sur l'écran titre, avec un lien pour la télécharger (désactivable dans Paramètres → Jeu ; nécessite un dépôt public).

Pour construire soi-même : `npm run dist:win` (sous Windows) ou `npm run dist:mac` (sous macOS). `npm run app` lance l'application de bureau en local.

## Lancer la version navigateur

```bash
npm install
npm run dev      # puis ouvrir http://localhost:5173
```

Version de production (fichiers statiques dans `dist/`, déployables sur n'importe quel hébergeur) : `npm run build` puis `npm run preview`.

## Tests

`npm run build && npm run test:smoke` lance le jeu dans Chromium sans écran : écran titre, nouvelle partie, fenêtres principales, déplacement, course de luge, sauvegarde et reprise. Le test échoue à la moindre erreur JavaScript. Il tourne aussi sur GitHub à chaque envoi (workflow **Test du jeu**, captures d'écran en *Artifacts*).

## Commandes

Toutes les touches sont **réassignables** (Échap → Paramètres → Contrôles). Les claviers AZERTY et QWERTY sont détectés : l'aide et le HUD affichent les bonnes lettres.

| Touche (par défaut) | Action |
| --- | --- |
| `Z Q S D` (AZERTY) / `W A S D` / flèches | Se déplacer |
| `Maj` · `Espace` | Courir (ça effraie les animaux timides !) · sauter |
| Glisser la souris · molette | Tourner la caméra · zoomer |
| `E` | Parler · caresser · cueillir · planter / arroser · pêcher · entrer · frapper chez un habitant · s'asseoir · voyager · se baigner · luge |
| `F` | Donner à manger · changer de semis · **faire un vœu** sous une étoile filante |
| `R` · `G` | Adopter / « suis-moi » · jouer avec un animal (plumeau) |
| `1` … `5` | Émotes : salut, danse, s'asseoir, bisou, applaudir |
| `V` · `T` ou 💡 | Véhicules · « Que faire ? » (indice de la quête) |
| `B` | Décorer (maison ou jardin) |
| `C` `P` `J` `I` `M` `O` `H` | Tenue · animaux · journal · sac · carte · photo · aide |
| `Échap` | Menu pause (le temps s'arrête) : paramètres, sauvegarde, profils, quitter |
| `F3` · `F11` | Compteur FPS (simple / détaillé) · plein écran |

**Manette** : stick gauche pour bouger, stick droit pour la caméra, A interagir, X nourrir / vœu, Y sauter, B / Start menu, LB carte, RB journal, Select sac, gâchette gauche pour courir. **Tous les menus se pilotent à la manette** (croix ou stick pour choisir, A valider, B retour, LB / RB changer d'onglet) et aussi aux flèches du clavier + Entrée. Sur mobile, un joystick et des boutons tactiles apparaissent.

## Contenu

### 🏝️ L'archipel et ses trois villages
- **Île de Doucebrise** : la place et sa fontaine, la Prairie aux Fleurs et son **kiosque à musique** (joue un air, les habitants applaudissent), le Bois Chuchotant, l'étang, le moulin, la plage, le verger et le vieux phare.
- **Île des Pins — Bourg-Sapin** (par le Pont des Brumes, sous une arche fleurie) : chalets en rondins autour d'un grand sapin illuminé, **source chaude** où se prélasser (bonus d'expérience), **Lac Miroir**, **Pic des Neiges** et son belvédère avec une **longue-vue** pour observer le ciel, et la **piste de luge** 🛷 : dévale le Pic jusqu'au bourg en passant les 7 portes, attrape les étoiles et bats ton record.
- **Île Corail — Port-Corail** (par le Pont du Soleil) : maisons colorées, fontaine au dauphin, port et bateaux, maisons sur pilotis, **Palmeraie**, **Lagon Turquoise** et sa paillote, gloriette sur la Colline aux Mouettes.
- **Voyages rapides** entre les villages depuis les panneaux 🧭 (une fois le village découvert à pied).
- **Grande carte** zoomable de l'archipel (relief, chemins, boutiques, voyages), mini-carte.

### 🗼 L'histoire : « Le Cœur de Doucebrise »
- **10 chapitres + un épilogue** (45 quêtes) : de la lettre de Mamie Rose jusqu'à la grande soirée où l'on rallume le phare avec tout le village.
- **Chapitre 9 — « La Nuit des Veilleurs »** à Bourg-Sapin : le grand sapin s'est éteint ; cristaux du Pic, veillée à la source chaude et cérémonie où tout le bourg le rallume.
- **Chapitre 10 — « Le Chant du Lagon »** à Port-Corail : la conque de Nérée, la fête à la paillote et le retour de la **baleine** au large de l'île Corail.
- Une **astuce** apparaît la première fois qu'on découvre quelque chose (voyages, vœux, source chaude, luge, visites…).
- **Guide** : balise lumineuse, flèche au bord de l'écran avec la distance et étoile sur la mini-carte — dorée pour l'histoire, violette pour les quêtes des habitants, bleue pour les petits boulots.

### 💞 16 habitants et 51 quêtes
- **Doucebrise** : Mamie Rose (graines), Pomme (marché), Bruno (menuiserie, travaux), Lila (couture), Marin (pêcheur), Noé (explorateur), Mimi (Café des Chats), Léo (garage).
- **Bourg-Sapin** : Grand-père Aurèle (source chaude), Élise (pâtisserie), Hugo (atelier du bois), Sacha (guide de montagne).
- **Port-Corail** : Capitaine Nérée (capitainerie), Coralie (club de plongée), Paco (paillote), Maëlys (galerie de peinture).
- **Quêtes des habitants** : un « ! » doré au-dessus de la tête = une quête à proposer, un « ? » = une quête à rendre. Cueillettes, pêche au lac ou au lagon, insectes rares, photos, concerts, livraisons de lettres et de colis d'un village à l'autre, amitiés à renouer… avec meubles, recettes, titres et étoiles en récompense. Journal → onglet **Quêtes** pour suivre ou abandonner.
- **Visites** : frappe à la porte d'un habitant le soir ou tôt le matin (quand il est chez lui) et découvre son intérieur, décoré à son image — 16 maisons toutes différentes.
- Emplois du temps, scènes d'amitié à 2 et 4 cœurs, anniversaires, courrier chaque matin, bavardages (qui parlent de la météo, des aurores, des fêtes…), demandes du jour (petit « ! » bleu).

### 🐾 Animaux
- **16 espèces, 73 pelages** : chat (19 races), chien, lapin, renard, canard, mouton, faon, hérisson, panda roux, poule, oiseau, tortue, et sur les îles **écureuil**, **chèvre des neiges**, **loutre** (qui nage) et **perroquet**.
- Confiance sur 5 cœurs, **adoption**, jusqu'à 3 compagnons qui te suivent, accessoires, carnet des espèces.

### 🌦️ Ciel et météo
- **Cycle jour/nuit** avec lever et coucher de soleil dorés, nuages qui dérivent, **étoiles scintillantes**, **Voie lactée**, **lune** avec ses phases.
- **Étoiles filantes** : appuie sur `F` pour faire un vœu… et trouve parfois un fragment d'étoile au courrier. Pluie d'étoiles pendant la Nuit des Étoiles.
- **Aurores boréales** les nuits d'hiver (encore plus belles sur l'île des Pins).
- **Météo** : soleil, nuages, pluie, **orages** (éclairs et tonnerre), **brouillard** matinal, neige, arc-en-ciel ; **pétales** de cerisier au printemps, **feuilles** qui tombent en automne. Prévisions du lendemain au survol de l'horloge.
- **4 saisons** de 3 jours et **8 fêtes** : Fête des Fleurs, Concours de pêche, Fête des Récoltes et Nuit des Étoiles à Doucebrise ; Pique-nique des cerisiers, **Fête du Port** (voiliers dans la baie, poissons plus chers, boutiques en promo), **Fête des Lanternes** (lanternes flottantes sur le Lac Miroir) et **Marché d'hiver de Bourg-Sapin** dans les îles.

### 🎵 Musique
- **Une ambiance musicale par moment du jeu**, avec fondus enchaînés : la chanson reprend là où elle s'était arrêtée quand on revient dans une ambiance.

  | Ambiance (dossier) | Quand |
  | --- | --- |
  | `leger` | Le village de Doucebrise en journée |
  | `nature` | Forêt, prairie, plage, étang, île Corail |
  | `montagnard` | Bourg-Sapin et le Pic des Neiges |
  | `nuit` | Dehors, la nuit |
  | `melancolique` | Pluie et orage |
  | `festif` | Fêtes des villages, course de luge |
  | `cozy` | À la maison et chez les habitants |
  | `mignon` | Boutiques et Café des Chats |
  | `tendre` | Scènes d'amitié, cérémonies de l'histoire |
  | `magique` | Écran titre, longue-vue, vœux sous les étoiles filantes |

- **Ajouter des chansons au jeu** : les mettre dans `music/<ambiance>/` (MP3, M4A, OGG…), puis `npm run music:levels` (avec ffmpeg installé) pour égaliser leurs volumes. Plusieurs chansons par ambiance : elles tournent. Une ambiance vide reprend les chansons d'une ambiance proche.
- **Ma musique** (Paramètres → Audio) : écouter chaque ambiance, y ajouter des fichiers depuis l'ordinateur (gardés dans le jeu, sur cet ordinateur), masquer une chanson, afficher ou non le titre de la chanson qui commence.
- Sans aucune chanson, le jeu joue sa petite musique générée.

### 🎨 Graphismes
- Style cartoon doux, **halo lumineux** (lanternes, fenêtres et étoiles qui brillent la nuit), étalonnage et vignette, **eau** avec reflets du ciel, éclat du soleil et lagon turquoise.
- Ombres jusqu'à 4096 px, anticrénelage FXAA / SMAA / MSAA.

### ⚙️ Paramètres complets
- **Graphismes** : préréglages Basse / Moyenne / Haute / Ultra ou réglages sur mesure (résolution de rendu, netteté Retina, ombres, distance d'affichage, herbe, anticrénelage, bloom, étalonnage, eau, nuages).
- **Affichage** : plein écran, compteur FPS (simple ou détaillé avec graphique, appels de dessin, triangles, carte graphique), limite d'images par seconde (30 à 144), champ de vision, taille de l'interface, barre d'aide des touches, mini-carte, flèche du guide.
- **Contrôles** : touches réassignables, sensibilité et inversion de la caméra, caméra qui suit, manette.
- **Audio** : volumes général, musique, effets et ambiance séparés. La musique change selon l'île et la nuit ; ambiances d'oiseaux, de grillons, de vagues, de vent et de pluie.
- **Jeu** : durée des journées, export de la sauvegarde, vérification des nouvelles versions (application de bureau).

### 👤 Profils
- **3 profils de sauvegarde** sur l'écran titre, chacun avec son **pseudo** (obligatoire à la création), sa saison, ses pièces et son temps de jeu. Export / import de sauvegarde en fichier.

### 🎯 Progression
- **7 métiers** à 10 niveaux, **3 défis par jour**, **76 succès**, **titres**, carnet d'étoiles de 30 paliers, petits boulots, **record de luge**.

### 🌱 Activités
- **Potager**, **cueillette** (baies, pommes, myrtilles, noix de coco, cristaux, corail et perles…), **pêche** (**38 poissons** entre mer, étang, Lac Miroir et Lagon Turquoise), **insectes** (**22 espèces**), **cuisine** (15 recettes), boutiques dans les trois villages.

### 🛋️ Maison et décoration
- Maison agrandissable (2 agrandissements), façades, toits, couleurs et extras.
- **Mode des îles** : bonnet à pompon et luge à porter dans le dos (atelier de Hugo), capeline et planche de surf (paillote), fleur d'hibiscus (club de plongée).
- **Plus de 130 meubles** (dont meubles de chalet, déco marine, esprit plage, tableaux, aquariums), papiers peints et sols ; mode décoration (`B`).

### 🚲 Véhicules
- Trottinette, vélo, scooter, voiturette, petit bateau et montgolfière.

## Organisation du code

```
scripts/smoke.mjs        Test de fumée (Chromium sans écran)
scripts/music-levels.mjs Égalise le volume des musiques (music/levels.json)
music/<ambiance>/        Les chansons du jeu, rangées par ambiance
electron/                Application de bureau (fenêtre, protocole interne app://, plein écran)
src/
  main.js, game.js       Démarrage, boucle, états, interactions, récompenses, sauvegarde
  core/                  Maths, matériaux cartoon, entrées (touches, manette), paramètres,
                         post-traitement, particules, sons et musique, sauvegarde (profils), mises à jour
  world/                 Terrain de l'archipel, ciel, météo, eau, villages, îles, végétation, collisions
  player/                Personnage, visage, apparence, déplacement, caméra
  animals/               Espèces (modèles 3D), comportement, gestion
  npc/                   Habitants : apparence, emploi du temps, trajets, goûts et répliques
  house/                 Maison : pièce, meubles, papiers peints, mode décoration, visites chez les habitants
  game/                  Objets, potager, cueillette, pêche, insectes, cuisine, histoire, quêtes des
                         habitants, progression, petits boulots, véhicules, calendrier, voyages, luge
  ui/                    HUD, guide, menus (titre, pause, paramètres), carte, dialogues, boutiques,
                         journal, photo, compteur FPS
```

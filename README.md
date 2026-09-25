# 🌸 Doucebrise

Un jeu 3D **cosy** dans l'esprit de *Heartopia* : une petite île à explorer, des animaux à apprivoiser, des habitants à rencontrer, une maison à construire et décorer, des véhicules, des métiers, des petits boulots… et une histoire à suivre, « Le Cœur de Doucebrise ».

Le jeu tourne directement dans le navigateur (Three.js). Aucun fichier externe : les modèles 3D, les visages, les motifs, les meubles et les sons sont tous générés par le code.

## Lancer le jeu

```bash
npm install
npm run dev      # puis ouvrir http://localhost:5173
```

Version de production (fichiers statiques dans `dist/`, déployables sur n'importe quel hébergeur) :

```bash
npm run build
npm run preview
```

## Commandes

| Touche | Action |
| --- | --- |
| `Z Q S D` / `W A S D` / flèches | Se déplacer (AZERTY et QWERTY) |
| `Maj` · `Espace` | Courir (ça effraie les animaux timides !) · sauter |
| Glisser la souris · molette | Tourner la caméra · zoomer |
| `E` | Parler · caresser · cueillir · planter / arroser / récolter · pêcher · entrer · s'asseoir · dormir · cuisiner |
| `F` | Donner à manger (plat préféré en priorité) · changer de semis |
| `R` | Adopter (cœurs pleins) · « suis-moi » / « attends au jardin » |
| `1` … `5` | Émotes : salut, danse, s'asseoir, bisou, applaudir |
| `G` | Jouer avec un animal (plumeau du Café des Chats) |
| `V` | Véhicules : appeler / descendre (`Maj` pour accélérer) |
| `T` ou 💡 | « Que faire ? » : un indice pour la quête en cours |
| `B` | Décorer (chez soi ou dans le jardin, onglet Façade dehors) |
| `C` `P` `J` `I` `M` `O` `H` | Tenue · animaux · journal · sac · carte · photo · aide |

Sur mobile, un joystick et des boutons tactiles apparaissent.

## Contenu

### 🗼 L'histoire : « Le Cœur de Doucebrise »
- **8 chapitres + un épilogue** (33 quêtes) : arriver sur l'île, apprivoiser les animaux, découvrir ses trésors, la mer, se faire un nid, prendre la route, rassembler les habitants… et rallumer le vieux phare lors d'une grande soirée avec tout le village.
- Chaque chapitre s'ouvre sur une **carte d'introduction** et rallume une **étincelle du Cœur** : le phare brille un peu plus à chaque fois.
- **Guide** : une balise lumineuse sur l'objectif, une flèche au bord de l'écran avec la distance, une étoile sur la mini-carte (dorée pour l'histoire, bleue pour les petits boulots) et un bouton 💡 « Que faire ? ».

### 🧍 Personnalisation du personnage
- **Corps** : 12 teintes de peau + couleur libre, taille, carrure, taille de la tête.
- **Visage** : 7 styles d'yeux, 10 couleurs, cils, 5 sourcils, 6 bouches, joues rosées, taches de rousseur. Le personnage cligne des yeux et sourit.
- **Cheveux** : 10 coiffures, 16 couleurs, pointes en dégradé.
- **Tenue** : 7 hauts (dont la veste), 2 couleurs et 7 motifs, 4 bas, 4 chaussures.
- **Accessoires** : 24 chapeaux, 8 lunettes, 13 accessoires de dos (ailes d'ange ou arc-en-ciel animées, guitare, sac chat…).
- Certains articles s'achètent chez Lila ou s'obtiennent en cadeau d'amitié.

### 🐾 Animaux
- **12 espèces, 59 pelages** (dont 19 races de chats) : chat, chien, lapin, renard, canard, mouton, faon, hérisson, panda roux, poule, oiseau, tortue.
- Une **colonie de chats** vit devant le Café des Chats ; pâtée, friandises et **plumeau** pour jouer (`G`).
- Chaque espèce a son caractère (les timides fuient si on court) et son **plat préféré** à découvrir.
- **Confiance** sur 5 cœurs, puis **adoption** avec un nom. Jusqu'à 3 compagnons vous suivent (même dans la maison), les autres restent au jardin et dorment la nuit dans leur panier.
- **Accessoires** pour animaux (collier, nœud, foulard, chapeau de fête, couronne de fleurs) et **carnet** des espèces.

### 🏡 Habitants
- **8 villageois** avec emploi du temps : balade le matin, travail la journée, bancs de la place le soir, maison la nuit ; parapluie quand il pleut.
- **Mamie Rose** (graines), **Pomme** (marché, outils), **Bruno** (meubles, travaux de la maison), **Lila** (vêtements), **Marin** (pêcheur), **Noé** (petit explorateur), **Mimi** (Café des Chats), **Léo** (garage).
- **Scènes d'amitié** à 2 et 4 cœurs, avec des choix de réponse ; **anniversaires** (cadeau qui compte double) ; ils commentent ta tenue et tes compagnons, et **bavardent** entre eux (bulles).
- **Courrier** : chaque matin, des lettres (parfois avec un cadeau) dans ta boîte aux lettres.
- **Amitié** sur 5 cœurs : discuter chaque jour, offrir des cadeaux (chacun a ses goûts), rendre service. Les paliers débloquent des recettes, des meubles et des tenues.
- **Demandes du jour** (icône « ! ») récompensées en pièces.

### 🎯 Progression
- **7 métiers** avec 10 niveaux (pêche, jardinage, cuisine, soins des animaux, cueillette, insectes, petits boulots) : bonus permanents et récompenses à chaque niveau.
- **3 défis par jour**, **53 succès**, **titres** à afficher, et un **carnet d'étoiles** de 30 paliers de récompenses.
- **Petits boulots** (tableau de la place) : livraisons, lettres en main propre, promenade du chien, chat perdu à retrouver, nettoyage de la plage, commandes.
- **Journal** : histoire, demandes, défis, métiers, succès, étoiles et titres, habitants, collections (recettes, poissons, insectes), calendrier.

### 📅 Calendrier
- Une fête par saison : **Fête des Fleurs**, **Concours de pêche** (avec classement), **Fête des Récoltes**, **Nuit des Étoiles** (lanternes et étoiles filantes).

### 🌱 Activités
- **Potager** de 9 parcelles : carottes, fraises, tomates, maïs, citrouilles. On plante, on arrose (la pluie aide), on récolte.
- **Cueillette** : baies, pommes, carottes sauvages, graines de tournesol, champignons, coquillages, fleurs.
- **Pêche** au ponton, à l'étang et sur la falaise du phare : **24 poissons** (selon le lieu, l'heure, la saison, la pluie), mini-jeu de ferrage, appâts, 3 cannes, bouteilles à la mer.
- **Insectes** : **13 espèces** à attraper au filet (certaines la nuit ou sous la pluie).
- **Cuisine** : 9 recettes (friandises pour animaux, tartes, soupe de citrouille, makis…).
- **Économie** : on vend au marché, on achète des semis, des meubles et des vêtements.

### 🛋️ Maison et décoration
- On entre chez soi. La pièce s'affiche en « maison de poupée » : les murs côté caméra se coupent.
- **Maison personnalisable** : 2 agrandissements (la pièce grandit aussi, jusqu'à 16 × 11 m), couleurs des murs, du toit, des boiseries, de la porte, des volets et de la clôture, 3 styles de toit, 4 façades (colombages, bardage…) et 11 extras (auvent, porche à colonnes, lierre, lanternes, girouette…).
- **Mode décoration** (`B`) : placer à la souris, tourner, changer la couleur, déplacer ou ranger.
- **Plus de 100 meubles** rangés par pièce : lit à baldaquin, canapé arrondi, télé rétro, baignoire à pattes, vaisselier, horloge comtoise, nounours géant, lampe champignon, coin des chats…
- **Déco du jardin** : hamac, puits, barbecue, fontaine, mare avec grenouille, épouvantail, brouette fleurie…
- **8 papiers peints, 6 sols**. On dort dans son lit pour passer la nuit.

### 🌦️ Monde vivant
- **4 saisons** de 3 jours : cerisiers au printemps, feuillage roux en automne, neige sur l'île et les toits en hiver.
- **Météo** : soleil, nuages, pluie (qui arrose le potager), neige, arc-en-ciel après la pluie.
- **Cycle jour/nuit** : lampadaires, fenêtres éclairées, phare, lucioles, papillons.
- 8 lieux, mini-carte et grande carte.

### 🚲 Véhicules
- Au **garage de Léo** : trottinette, vélo fleuri, scooter rétro, voiturette, **petit bateau** (sur la mer et l'étang) et **montgolfière** pour survoler l'île. Couleurs au choix.

### 📷 Et aussi
- **Mode photo** (`O`) : filtres, poses, album souvenir.
- **Réglages** : qualité graphique, durée des journées, musique et bruitages.
- **Sauvegarde automatique** dans le navigateur.

## Organisation du code

```
src/
  main.js, game.js       Démarrage, boucle, états, interactions, récompenses, sauvegarde
  core/                  Maths/bruit, matériaux cartoon (vent, saisons), entrées, particules, sons, sauvegarde
  world/                 Terrain, ciel jour/nuit, météo & saisons, eau, village, végétation, collisions
  player/                Personnage (modèle + animations), visage, apparence, déplacement, caméra
  animals/               Espèces (modèles 3D), comportement, gestion et interactions
  npc/                   Habitants : apparence, emploi du temps, trajets, goûts et répliques
  house/                 Maison : pièce, meubles, papiers peints, mode décoration
  game/                  Objets, potager, cueillette, pêche, insectes, cuisine, histoire & quêtes,
                         progression (métiers, défis, succès, étoiles), petits boulots, véhicules, calendrier
  ui/                    HUD, guide, création du personnage, dialogues, boutiques, journal, photo, réglages
```

## Pistes pour la suite

- Multijoueur pour visiter l'île de ses amis (demande un serveur)
- Étage et pièces séparées dans la maison
- Bébés animaux et élevage, balades à cheval

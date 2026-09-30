# 🌸 Doucebrise

Un jeu 3D **cosy** dans l'esprit de *Heartopia* : un archipel de trois îles et trois villages à explorer, des animaux à apprivoiser, 16 habitants avec leurs histoires et leurs quêtes, une maison à construire et décorer, des véhicules, des métiers, une météo vivante, un ciel étoilé… et une histoire à suivre, « Le Cœur de Doucebrise ».

Le jeu est écrit avec Three.js. Il se joue **dans le navigateur** ou comme **application de bureau Windows et macOS**. Le personnage, les habitants, les fleurs et les rochers viennent de packs de modèles 3D libres (KayKit, Kenney) ; les arbres réalistes sont générés au lancement, avec des écorces et des rameaux photographiés ; les maisons, les animaux, les meubles, le ciel, l'eau et les bruitages sont générés par le code ; les musiques viennent du dossier `music/`.

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

`npm run build && npm run test:quests` **joue toute l'histoire** (les 45 quêtes des 11 chapitres, avec les vraies actions du jeu : parler, planter, pêcher, cuisiner, acheter, décorer, adopter, cérémonies de nuit…), puis **les 58 quêtes des habitants** (proposition, objectifs, remise, récompenses), les **six petits boulots**, deux semaines de demandes et de défis (aucune répétition d'un jour à l'autre), et vérifie la cohérence des données (objets, meubles, recettes, habitants, prérequis) et la sauvegarde. Il tourne aussi sur GitHub à chaque envoi.

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
| `Tab` · ☰ | Menus rapides (sous la mini-carte) : tenue, animaux, journal, sac, décorer, carte, photo, véhicules, musique, menu, aide |
| `Échap` | Menu pause (le temps s'arrête) : paramètres, sauvegarde, profils, quitter |
| `F3` · `F11` | Compteur FPS (simple / détaillé) · plein écran |

**Écran tactile** : joystick et boutons d'action à icônes (✋ interagir, 🍓 nourrir, 💞 adopter…) ; les bulles de touches du clavier disparaissent dès qu'on touche l'écran et reviennent au premier appui sur une touche.

**Manette** : stick gauche pour bouger, stick droit pour la caméra, A interagir, X nourrir / vœu, Y sauter, B / Start menu, LB carte, RB journal, Select sac, gâchette gauche pour courir. **Tous les menus se pilotent à la manette** (croix ou stick pour choisir, A valider, B retour, LB / RB changer d'onglet) et aussi aux flèches du clavier + Entrée. Sur mobile, un joystick et des boutons tactiles apparaissent.

## Interface épurée

L'écran reste dégagé pour profiter de l'île (Paramètres → Affichage → Interface : **Complète**, **Épurée** par défaut, **Minimale**).
- **En haut à gauche** : une seule petite carte avec l'heure, la saison, le jour et les pièces, et en dessous l'objectif de la quête en cours, sur une ligne. L'ampoule 💡 ne s'allume que si la quête n'avance plus depuis quelques minutes.
- **En haut à droite** : la mini-carte et un bouton ☰ (`Tab`) qui déplie les **menus rapides**, avec leur nom et leur touche. Décorer n'y apparaît qu'à la maison ou au jardin, les véhicules seulement quand on en a un.
- **Au besoin seulement** : la barre d'objets apparaît quelques secondes quand un objet arrive ou part, et quand on peut en donner un (à un animal…), sans les cases vides ; les défis du jour se montrent quand ils avancent ; les compagnons qui suivent sont de petites frimousses en bas à droite.
- **En promenade**, l'interface s'efface doucement au bout de quelques secondes de marche et revient dès qu'on s'arrête, qu'on la survole ou qu'une quête avance (réglable).
- **Aide des touches** : une rangée pendant les 15 premières minutes, puis seulement dans les situations particulières (pêche au moulinet, véhicule, assis) ; ou toujours, ou jamais.
- **Moins de messages** : le titre de la chanson s'affiche en petit en bas à droite, un message identique n'est plus empilé, trois au plus à la fois ; les conseils du début arrivent un par un sous forme de petites cartes.
- **Carnet du matin** : au lever du jour, une carte résume la journée — nouvelle saison, fête du jour (ou de demain), anniversaires, plantes prêtes ou assoiffées au potager, courrier, demandes des habitants, défis du jour, météo et prévisions. Un clic sur l'horloge la rouvre à tout moment.
- **Minimale** : juste l'heure ; la quête, les pièces et les défis reviennent un instant quand ils changent, tout s'affiche quand les menus rapides sont ouverts.

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

### 💞 16 habitants et 58 quêtes
- **Doucebrise** : Mamie Rose (graines), Pomme (marché), Bruno (menuiserie, travaux), Lila (couture), Marin (pêcheur), Noé (explorateur), Mimi (Café des Chats), Léo (garage).
- **Bourg-Sapin** : Grand-père Aurèle (source chaude), Élise (pâtisserie), Hugo (atelier du bois), Sacha (guide de montagne).
- **Port-Corail** : Capitaine Nérée (capitainerie), Coralie (club de plongée), Paco (paillote), Maëlys (galerie de peinture).
- **Quêtes des habitants** : un « ! » doré au-dessus de la tête = une quête à proposer, un « ? » = une quête à rendre. Cueillettes, pêche au lac ou au lagon, insectes rares, photos, concerts, livraisons de lettres et de colis d'un village à l'autre, amitiés à renouer… avec meubles, recettes, titres et étoiles en récompense. Journal → onglet **Quêtes** pour suivre ou abandonner.
- **Visites** : frappe à la porte d'un habitant le soir ou tôt le matin (quand il est chez lui) et découvre son intérieur, décoré à son image — 16 maisons toutes différentes.
- Emplois du temps, scènes d'amitié à 2 et 4 cœurs, anniversaires, courrier chaque matin, bavardages (qui parlent de la météo, des aurores, des fêtes…), demandes du jour (petit « ! » bleu).
- **Quêtes courtes et variées** : les demandes du jour viennent des habitants déjà rencontrés, dans les villages déjà visités, souvent pour un objet qu'ils aiment, jamais le même habitant ni le même objet deux jours de suite ; les défis du jour ne proposent que ce qui est faisable à ce stade ; les petits boulots restent près de chez toi et changent d'un jour à l'autre. Les quêtes « va voir… », « adopte… », « vis une scène d'amitié » sont validées si c'est déjà fait.

### 🐾 Animaux
- **16 espèces, 73 pelages** : chat (19 races), chien, lapin, renard, canard, mouton, faon, hérisson, panda roux, poule, oiseau, tortue, et sur les îles **écureuil**, **chèvre des neiges**, **loutre** (qui nage) et **perroquet**.
- Confiance sur 5 cœurs, **adoption**, jusqu'à 3 compagnons qui te suivent, accessoires, carnet des espèces.

### 🌦️ Ciel et météo
- **Cycle jour/nuit** avec lever et coucher de soleil dorés, nuages qui dérivent, **étoiles scintillantes**, **Voie lactée**, **lune** avec ses phases.
- **Étoiles filantes** : appuie sur `F` pour faire un vœu… et trouve parfois un fragment d'étoile au courrier. Pluie d'étoiles pendant la Nuit des Étoiles.
- **Aurores boréales** les nuits d'hiver (encore plus belles sur l'île des Pins).
- **Météo** : soleil, nuages, pluie, **orages** (éclairs et tonnerre), **brouillard** matinal, neige, arc-en-ciel ; **pétales** de cerisier au printemps, **feuilles** qui tombent en automne. Prévisions du lendemain au survol de l'horloge.
- **4 saisons** de 3 jours et **12 fêtes** : Fête des Fleurs, Concours de pêche, Fête des Récoltes et Nuit des Étoiles à Doucebrise ; Pique-nique des cerisiers, **Fête du Port** (voiliers dans la baie, poissons plus chers, boutiques en promo), **Fête des Lanternes** (lanternes flottantes sur le Lac Miroir) et **Marché d'hiver de Bourg-Sapin** dans les îles.

### 🎉 Fêtes de saison et mini-jeux (`src/game/festivals.js`)
Le premier jour de chaque saison (sauf le tout premier jour de la partie) :
- **Chasse aux œufs** (printemps) : 14 œufs peints cachés au village, dans la prairie, au verger, sur la colline, dans la forêt, à la plage et près de l'étang, qui scintillent de temps en temps. Montre-les à Mamie Rose : classement contre Noé, Mimi, Léo et Pomme, œufs en chocolat et **panier d'œufs peints** pour le gagnant.
- **Fête de l'été** : grand **feu d'artifice** sur la plage de 21 h à 23 h (pivoines, saules dorés, anneaux, **cœurs**, étoiles crépitantes, bouquet final ; la détonation arrive avec le retard du son). **Tout l'archipel** vient regarder : les habitants du village devant, ceux de Bourg-Sapin et de Port-Corail juste derrière. Une **caisse de fusées** sur le sable permet de lancer les siennes dès 19 h.
- **Concours de cuisine** (automne) : présente un plat au jury (Mimi, Élise, Pomme) devant le café, après un petit jeu de **dressage de l'assiette** (trois garnitures à poser au bon moment). Note selon le goût, la présentation, les goûts du jury et les saveurs d'automne ; **trophée** et titre « Grand·e chef » pour le gagnant.
- **Fête des neiges** (hiver, `src/game/snowfest.js`) : de 9 h à 17 h à la Prairie aux Fleurs, près du kiosque, au milieu des bonshommes de Mamie Rose, Bruno, Lila, Mimi et Pomme.
  - **Concours de bonshommes de neige** : Hugo descend du bourg pour juger. On **roule trois boules** (appuyer quand la boule a la bonne taille : trop petite ou trop grosse, le bonhomme penche), puis on choisit le **nez** (carotte, pomme de pin, cerise), le **chapeau** (bonnet, seau, haut-de-forme, paille, oreilles de chat) et l'**écharpe** (rouge, bleue, jaune, rayée), en voyant le bonhomme prendre forme dans la prairie. Hugo note la forme, ses goûts et les accords chapeau-écharpe ; le gagnant reçoit un **bonhomme de neige pour son jardin**, qui ne fond jamais.
  - **Bataille de boules de neige** contre l'équipe de Noé (Léo et Sacha), cachés derrière trois murets de neige : une minute, `E` pour lancer (visée aidée vers l'adversaire le plus proche du centre de l'écran), et on bouge pour esquiver leurs boules. Tache de neige à l'écran quand on est touché·e ; revanche possible.
  - Deux quêtes de fête : « La grande bataille de neige » (Noé) et « Un bonhomme qui a du caractère » (Hugo).

### 💬 Les habitants parlent des fêtes (`src/npc/festivalTalk.js`)
- **La veille** (« Demain soir, feu d'artifice sur la plage ! Tu viendras ? »), **le jour même** et **le lendemain** (« Tu as vu le feu d'artifice hier ? »), pour chacune des douze fêtes : répliques partagées, répliques propres à certains habitants (Rose pour les œufs, Léo pour les fusées, Mimi et Élise pour la cuisine, Marin pour la pêche, Noé et Hugo pour la neige…), bavardages entre eux et petites bulles.
- **Ils se souviennent de ce que tu as fait** : chasse aux œufs gagnée, fusées lancées, place au concours de cuisine, taille de ton poisson au concours de pêche, bonhomme de neige, bataille de boules de neige.

### 🔊 Sons (tout est synthétisé, `src/core/soundscape.js` et `footsteps.js`)
- **Bruits de pas selon le sol** : herbe, sous-bois, terre, sable, pierre et pavés, bois (ponts, pontons, maisons), neige, eau peu profonde ; un peu mouillés sous la pluie ; au rythme des pieds de l'animation, à peine plus appuyés à la réception d'un saut. **Discrets** : ils restent au niveau de l'ambiance (oiseaux, vent) et sous la musique, avec des attaques douces et sans aigus secs ; à la **lisière de deux sols** (herbe qui devient terre, sable qui devient herbe…), le pas mêle les deux au lieu de basculer d'un coup. Désactivables (Paramètres → Audio).
- **Ambiance vivante** selon l'heure, la saison et le lieu : **chœur des oiseaux à l'aube** (merle, mésange, pinson, rouge-gorge, moineaux, alouette), plus calme à l'heure de la sieste ; tourterelle, coucou au printemps, pic qui tambourine en forêt, loriot sous les tropiques, corneilles l'hiver ; **mouettes** et **vagues qui déferlent** au bord de la mer ; **grillons** le soir, **grenouilles** près de l'étang, du lac et de la source (et sous la pluie), **chouette** la nuit ; **cigales** l'été dans les lieux ensoleillés ; feuillage au vent en forêt ; cris des animaux proches (moutons, chèvres, canards, poules et le coq au lever du jour, chats, chiens). Sons étouffés à l'intérieur.

### 🎵 Musique
- **Une ambiance musicale par moment du jeu**, qui se fond dans le décor : en changeant de lieu, la musique attend quelques secondes que le nouveau lieu se confirme (traverser une lisière ou passer la tête dans une maison ne change rien), puis la chanson s'efface lentement pendant que la suivante monte doucement (long fondu enchaîné, sans blanc ni à-coup). Les moments (scène tendre, longue-vue, luge, vœu) suivent plus vite, toujours en fondu. La chanson reprend là où elle s'était arrêtée quand on revient dans une ambiance ; si l'on revient pendant le fondu, elle remonte simplement.
- **Musique de fond** : bien plus basse que les bruitages et l'ambiance (oiseaux, vagues…), voix des chansons adoucies, et encore un peu plus discrète pendant les dialogues.

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
- **Rendu réaliste** (par défaut) : matériaux physiques, **lumière du ciel** (le ciel du moment éclaire la scène et s'y reflète), **ombres de contact** (occlusion ambiante GTAO), ombres du soleil douces et stables, tons **ACES** (exposition 1,15). Le style **Cartoon** (aplats et contours) reste disponible dans les paramètres (préréglage Basse).
- **Sol détaillé** : textures photographiques (Poly Haven, CC0) mélangées selon le terrain — herbe, sous-bois, terre des chemins, sable, roche des falaises, pavés des places, neige des sommets — avec relief (normales) et transitions par la hauteur (les cailloux dépassent de l'herbe). Les couleurs des biomes et des saisons sont gardées.
- **Tapis d'herbe dense** autour du joueur : des dizaines de milliers de brins animés par le vent, qui s'écartent à ton passage, dorés en automne et tassés sous la neige (réglage « Herbe »).
- **Personnage 3D animé** (KayKit Adventurers) : Mage, Chevalier, Barbare, Rôdeur, Voleur, Voleur à capuche — ou le style **Classique** entièrement personnalisable (onglet Style du créateur). Marche, course, saut, cueillette, caresses via les animations KayKit ; s'asseoir, saluer, danser, applaudir, pêcher sont posés en code.
- **Habitants 3D animés** (`src/npc/villagerBody.js`) : les 16 habitants utilisent les mêmes modèles et animations que le joueur (marche, attente, assis sur les bancs, salut, joie, pêche, parapluie), **repeints à leurs couleurs** — peau, cheveux (ou barbe), haut, bas, chaussures — et coiffés de **leurs chapeaux, lunettes, écharpes et sacs** d'avant, ajustés à la forme de la tête et du torse. Chaque habitant est fusionné en un seul maillage animé avec un matériau partagé (un appel de dessin), n'est pas dessiné hors champ, et s'anime moins souvent au loin. Sans les modèles, le jeu reprend les habitants construits en code.
- **Gestes de métier** (`src/npc/jobGestures.js`) : pendant leurs heures de travail, les habitants s'activent à côté de leur étal ou à leur poste, un outil en main — Bruno cloue et scie, Rose arrose ses semis, Pomme range ses fruits et appelle les clients, Lila coud, Mimi essuie le comptoir et sert, Léo visse, Élise étale la pâte et fouette, Hugo sculpte, Aurèle balaie, Sacha lit sa carte et montre les sommets, Noé scrute l'horizon aux jumelles, Nérée à la longue-vue, Coralie nettoie son masque, Paco secoue ses cocktails, Maëlys peint (Marin, lui, pêche). Gestes en alternance avec des pauses, bruits d'outils entendus de près ; ils s'interrompent quand on vient leur parler.
- **Arbres réalistes** (rendu réaliste) : chênes, bouleaux, cerisiers, pommiers, arbres dorés, pins, sapins et arbres tropicaux, **générés au lancement** (tronc et branches qui poussent selon l'essence, `src/world/treeGen.js`, d'après EZ-Tree) avec des **écorces** et des **rameaux photographiés**. Plusieurs variantes par essence ; le vent fait bouger l'arbre et frémir les feuilles.
  - **Saisons** : feuilles rousses à l'automne (quelques-unes tombent), **branches nues** l'hiver avec la neige posée dessus, feuillage revenu au printemps ; les cerisiers sont roses, les sapins d'altitude gardent leur neige.
  - **Vue dégagée** : les branches entre la caméra et le personnage s'effacent, la vue n'est jamais bouchée en forêt.
- **Décor homogène** (rendu réaliste) : tout le décor suit le style des arbres.
  - **Palmiers** générés : tronc courbe annelé, couronne de palmes qui retombent (palme dessinée par le jeu), noix de coco sous chaque couronne.
  - **Buissons à baies et myrtilliers** générés comme les arbres (mêmes rameaux photographiés, vent, saisons), baies posées sur chaque forme.
  - **Rochers** générés (`src/world/rocks.js`) : formes bosselées à arêtes, roche photographiée du sol projetée sans étirement, mousse sur le dessus, neige l'hiver.
  - **Maisons et mobilier** (`src/world/decor.js`) : grain des matières sur leurs couleurs — enduit des murs, tuiles des toits, bardage des chalets, bois des portes, volets, bancs et pontons, moellons des soubassements et cheminées — avec un léger relief. Coupé avec « Sol détaillé » sur les petits ordinateurs.
  - **Fleurs, tulipes et champignons** construits plus finement (`src/world/flowers.js`) : pétales courbés en dégradé, tige souple, feuilles.
  - En style Cartoon, buissons, fleurs, champignons, rochers et palmiers restent ceux des packs importés (KayKit Forest, Kenney Nature Kit), recolorés dans la palette du jeu, comme les arbres.
- **Eau** : houle et vaguelettes, reflet du ciel selon l'angle (Fresnel), éclat du soleil, écume en dentelle sur les rivages, lagon turquoise.
- **Halo lumineux** (lanternes, fenêtres et étoiles qui brillent la nuit), étalonnage et vignette.
- Ombres jusqu'à 4096 px, anticrénelage FXAA / SMAA / MSAA.

### 🧱 Textures du sol et des arbres (dossier `assets/textures/`)
- `terrain-albedo.jpg` (couleurs) et `terrain-normal-height.jpg` (rouge/vert : normale, bleu : hauteur) : sept textures de 1024 px (normales en 512 px) empilées de haut en bas, dans l'ordre de `GROUND_LAYERS` (`src/world/terrainTextures.js`) : herbe (*leafy_grass*), sous-bois (*forrest_ground_01*), terre (*park_dirt*), sable (*sand_01*), roche (*rock_face*), pavés (*cobblestone_floor_01*), neige (*snow_02*). Toutes viennent de [Poly Haven](https://polyhaven.com/textures) (CC0) ; crédits : `assets/textures/CREDITS.md`.
- Sans ces fichiers (ou avec « Sol détaillé » désactivé), le terrain garde ses couleurs unies.
- `trees-bark.jpg` / `trees-bark-normal.jpg` : écorces de chêne, bouleau et pin (Poly Haven, TextureCan — CC0) ; `trees-leaves.jpg` + `trees-leaves-alpha.png` : huit rameaux (chêne, frêne, tremble, pin, et des variantes recolorées : cerisier, bouleau, pommier, tropical) du projet EZ-Tree (MIT). Sans eux, le jeu reprend les arbres des packs de modèles.
- `decor-detail.jpg` : grain des matières du décor (enduit, bois, planches, tuiles, pierre), cinq textures Poly Haven (CC0) en niveaux de gris empilées ; l'ordre est celui de `SURF` (`src/world/decor.js`). Une pièce construite reçoit sa matière avec l'option `surf` de `Shape.add` ; sans elle, les bruns deviennent du bois et les teintes claires de l'enduit.

### 🧱 Modèles 3D (dossier `assets/models/`)
```
assets/models/
  characters/      KayKit Adventurers → Characters/gltf/*.glb (un fichier par personnage)
  animations/      KayKit Adventurers → Animations/gltf/Rig_Medium/*.glb (animations partagées)
  nature/kaykit/   KayKit Forest Nature Pack → Assets/gltf/*.gltf + *.bin + forest_texture.png
  nature/kenney/   Kenney Nature Kit → Models/GLTF format/*.glb
```
- Formats : **.glb** (tout-en-un) de préférence ; les **.gltf** fonctionnent aussi, avec leur **.bin** et leur texture **.png** posés à côté (le jeu les retrouve par leur nom).
- Tout est détecté automatiquement : un nouveau personnage déposé dans `characters/` apparaît dans le créateur (il doit utiliser le squelette KayKit « Rig_Medium »). Quels modèles remplacent quelles plantes : `src/world/natureModels.js`.
- Sans ces fichiers, le jeu reprend ses modèles construits en code. Crédits et licences (CC0) : `assets/models/CREDITS.md`.

### ⚡ Fluidité
- **Peu d'appels de dessin** : chaque animal et chaque habitant se dessine en un ou deux maillages « skinnés » (leurs pièces articulées servent d'os, `src/core/rig.js`) au lieu d'une dizaine ; les ombres du soleil sont calculées une seule fois par image ; l'occlusion ambiante relit la profondeur de l'image au lieu de redessiner la scène. Environ 4 fois moins d'appels de dessin qu'en 0.7.0 (≈ 370 au lieu de ≈ 1 470 au village).
- **Qualité automatique** (activée par défaut, `src/core/autoquality.js`) : le jeu mesure sa fluidité et, sous ~50 images/s, allège ses réglages par paliers, du moins visible au plus visible — ombres de contact, netteté Retina (×2 → ×1), herbe, ombres et halo, résolution de rendu (jusqu'à 52 %), sol simplifié, ombres recalculées une image sur deux ou trois… — puis les remonte quand il y a de la marge (temps réel de la carte graphique quand le navigateur le donne, sinon essais de plus en plus espacés). Jamais au-delà des réglages choisis. Le palier atteint est retenu, y compris quand on change un réglage à la main (pas de retour brutal à la qualité maximale) ; au premier lancement, il part d'une estimation selon la carte graphique (puces intégrées Intel / AMD / Apple M1 déjà allégées). Si même tout allégé le jeu rame, il propose le préréglage Basse. Le compteur FPS détaillé (F3) et les paramètres affichent le palier du moment.
- Occlusion ambiante toujours à demi-résolution (≈ 3 fois moins chère, même rendu une fois lissée) ; sol détaillé qui ne lit que ses deux couches principales par pixel ; éclairage du ciel mis à jour sur place (pas d'à-coup) ; sol et herbe sans calcul inutile au loin.
- **Arbres** : toute une île se dessine en **deux lots** (écorces, feuillages) où chaque arbre est trié et écarté s'il est hors champ ; **trois niveaux de détail** selon la distance (moins de rameaux, plus grands, au loin) ; les ombres utilisent la version la plus légère ; chaque rameau est découpé au plus près de sa forme (deux fois moins de pixels transparents) ; l'éclairage des feuilles est calculé par sommet. Les lampes éteintes (le jour) ou lointaines ne sont plus calculées pour chaque pixel du jeu.
- **Rien de dessiné hors champ, image identique** : le sol est découpé en 64 morceaux, le tapis d'herbe en 16 carrés et les grands semis de buissons, fleurs et rochers en zones de 60 m ; seuls ceux qui entrent dans le champ de la caméra (ou dans celui de la carte d'ombres) sont dessinés. Les panneaux se dessinent en 2 appels au lieu de 6. Mêmes objets aux mêmes places, aucun réglage baissé : 17 à 45 % de triangles en moins selon l'endroit (≈ 1,92 M → 1,47 M au village, 2,04 M → 1,69 M en forêt, 1,22 M → 0,67 M à la plage).
- **Rien de calculé pour rien, image identique** : les animaux et les habitants trop loin pour être affichés, et la végétation des îles lointaines, ne sont plus recalculés à chaque image (`src/core/matrices.js`) ; un habitant ou un animal ni dans le champ de la caméra, ni dans la zone des ombres, n'est plus animé : il reprend sa pose, avec le temps écoulé, dès qu'il peut réapparaître (`src/core/viewcull.js`). Ceux tout proches restent animés (bruits d'outils, caresses). Calcul par image : 10 à 40 % de moins selon l'endroit (≈ 3,7 → 2,3 ms à Bourg-Sapin, 4,0 → 2,9 ms en forêt), dont le recalcul des positions divisé par deux.

### ⚙️ Paramètres complets
- **Graphismes** : préréglages Basse / Moyenne / Haute / Ultra ou réglages sur mesure (style de rendu réaliste ou cartoon, résolution de rendu, netteté Retina, qualité automatique, ombres, ombres de contact, sol détaillé, distance d'affichage, herbe, anticrénelage, bloom, étalonnage, eau, nuages). Le style et le sol détaillé demandent un redémarrage : un bouton le propose aussitôt.
- **Affichage** : plein écran, compteur FPS (simple ou détaillé avec graphique, appels de dessin, triangles, carte graphique), limite d'images par seconde (30 à 144), champ de vision, interface (complète, épurée, minimale), interface qui s'efface en marchant, taille de l'interface, aide des touches (au début, toujours, jamais), mini-carte, flèche du guide.
- **Contrôles** : touches réassignables, sensibilité et inversion de la caméra, caméra qui suit, manette.
- **Audio** : volumes général, musique, effets et ambiance séparés. La musique change selon l'île et la nuit ; ambiances d'oiseaux, de grillons, de vagues, de vent et de pluie.
- **Jeu** : durée des journées, export de la sauvegarde, vérification des nouvelles versions (application de bureau).

### 👤 Profils
- **3 profils de sauvegarde** sur l'écran titre, chacun avec son **pseudo** (obligatoire à la création), sa saison, ses pièces et son temps de jeu. Export / import de sauvegarde en fichier.

### 🎯 Progression
- **7 métiers** à 10 niveaux, **3 défis par jour**, **76 succès**, **titres**, carnet d'étoiles de 30 paliers, petits boulots, **record de luge**.

### 🌱 Activités
- **Potager**, **cueillette** (baies, pommes, myrtilles, noix de coco, cristaux, corail et perles…), **pêche** (**38 poissons** entre mer, étang, Lac Miroir et Lagon Turquoise), **insectes** (**22 espèces**), **cuisine** (16 recettes), boutiques dans les trois villages.
- **Pêche au moulinet** : l'**ombre du poisson** approche du flotteur (sa taille trahit la prise), quelques **touches** trompeuses avant la vraie morsure (ferrer trop tôt fait fuir le poisson), puis le **combat** : maintiens `E` (ou le panneau, au doigt) pour mouliner, relâche quand le poisson tire, sinon la ligne casse. Plus la prise est rare, plus elle se débat ; les meilleures cannes ont une ligne plus solide.

### 🛋️ Maison et décoration
- Maison agrandissable (2 agrandissements), façades, toits, couleurs et extras.
- **Mode des îles** : bonnet à pompon et luge à porter dans le dos (atelier de Hugo), capeline et planche de surf (paillote), fleur d'hibiscus (club de plongée).
- **Plus de 130 meubles** (dont meubles de chalet, déco marine, esprit plage, tableaux, aquariums), papiers peints et sols ; mode décoration (`B`).

### 🚲 Véhicules
- Trottinette, vélo, scooter, voiturette, petit bateau et montgolfière.

## Organisation du code

```
scripts/smoke.mjs        Test de fumée (Chromium sans écran)
scripts/quests-test.mjs  Test de toutes les quêtes (histoire complète, habitants, boulots)
scripts/music-levels.mjs Égalise le volume des musiques (music/levels.json)
music/<ambiance>/        Les chansons du jeu, rangées par ambiance
assets/models/           Modèles 3D importés (personnages, animations, végétation)
assets/textures/         Textures du sol (Poly Haven) et des arbres (écorces, rameaux)
electron/                Application de bureau (fenêtre, protocole interne app://, plein écran)
src/
  main.js, game.js       Démarrage, boucle, états, interactions, récompenses, sauvegarde
  core/                  Maths, matériaux (réaliste ou cartoon), fusion des modèles articulés (rig.js),
                         qualité automatique (autoquality.js), entrées (touches, manette), paramètres,
                         post-traitement, particules, sons, paysage sonore (soundscape.js), bruits de pas
                         (footsteps.js), musique, sauvegarde (profils), mises à jour,
                         chargement des modèles 3D (models.js)
  world/                 Terrain de l'archipel (et sol détaillé : terrainTextures.js), ciel, météo,
                         eau, villages, îles, végétation (modèles importés : natureModels.js ;
                         arbres générés : treeGen.js, trees.js),
                         tapis d'herbe (grassField.js), feux d'artifice (fireworks.js), collisions
  player/                Personnage classique, personnage importé animé (avatar.js), visage,
                         apparence, déplacement, caméra
  animals/               Espèces (modèles 3D), comportement, gestion
  npc/                   Habitants : apparence, emploi du temps, trajets, goûts et répliques,
                         gestes de métier (jobGestures.js), répliques des fêtes (festivalTalk.js)
  house/                 Maison : pièce, meubles, papiers peints, mode décoration, visites chez les habitants
  game/                  Objets, potager, cueillette, pêche, insectes, cuisine, histoire, quêtes des
                         habitants, progression, petits boulots, véhicules, calendrier, fêtes de saison
                         (festivals.js, fête des neiges : snowfest.js), voyages, luge
  ui/                    HUD (interface épurée, menus rapides), carnet du matin (morning.js), guide,
                         menus (titre, pause, paramètres), carte, dialogues, boutiques, journal,
                         photo, compteur FPS
```

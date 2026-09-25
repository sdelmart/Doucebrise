# 🌸 Doucebrise

Un jeu 3D **cosy** dans l'esprit de *Heartopia* : une petite île à explorer, des animaux à apprivoiser, des habitants à rencontrer, une maison à décorer et un personnage à personnaliser dans les moindres détails.

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
| `B` | Décorer (chez soi ou dans le jardin) |
| `C` `P` `J` `I` `M` `O` `H` | Tenue · animaux · journal · sac · carte · photo · aide |

Sur mobile, un joystick et des boutons tactiles apparaissent.

## Contenu

### 🧍 Personnalisation du personnage
- **Corps** : 12 teintes de peau + couleur libre, taille, carrure, taille de la tête.
- **Visage** : 7 styles d'yeux, 10 couleurs, cils, 5 sourcils, 6 bouches, joues rosées, taches de rousseur. Le personnage cligne des yeux et sourit.
- **Cheveux** : 10 coiffures, 16 couleurs, pointes en dégradé.
- **Tenue** : 7 hauts (dont la veste), 2 couleurs et 7 motifs, 4 bas, 4 chaussures.
- **Accessoires** : 19 chapeaux, 6 lunettes, 10 accessoires de dos (ailes de fée ou de papillon animées, guitare, sac nounours…).
- Certains articles s'achètent chez Lila ou s'obtiennent en cadeau d'amitié.

### 🐾 Animaux
- **12 espèces, 45 pelages** : chat, chien, lapin, renard, canard, mouton, faon, hérisson, panda roux, poule, oiseau, tortue.
- Chaque espèce a son caractère (les timides fuient si on court) et son **plat préféré** à découvrir.
- **Confiance** sur 5 cœurs, puis **adoption** avec un nom. Jusqu'à 3 compagnons vous suivent (même dans la maison), les autres restent au jardin et dorment la nuit dans leur panier.
- **Accessoires** pour animaux (collier, nœud, foulard, chapeau de fête, couronne de fleurs) et **carnet** des espèces.

### 🏡 Habitants
- **6 villageois** avec emploi du temps : balade le matin, travail la journée, bancs de la place le soir, maison la nuit ; parapluie quand il pleut.
- **Mamie Rose** (graines), **Pomme** (marché : vente et achat), **Bruno** (meubles, papiers peints, sols), **Lila** (vêtements), **Marin** (pêcheur), **Noé** (petit explorateur).
- **Amitié** sur 5 cœurs : discuter chaque jour, offrir des cadeaux (chacun a ses goûts), rendre service. Les paliers débloquent des recettes, des meubles et des tenues.
- **Demandes du jour** (icône « ! ») récompensées en pièces.

### 📜 Quêtes
- Une **histoire de 17 quêtes** qui fait découvrir toutes les activités, jusqu'au « Cœur de Doucebrise ».
- **Journal** : quêtes, demandes, habitants, recettes, poissons et statistiques.

### 🌱 Activités
- **Potager** de 9 parcelles : carottes, fraises, tomates, maïs, citrouilles. On plante, on arrose (la pluie aide), on récolte.
- **Cueillette** : baies, pommes, carottes sauvages, graines de tournesol, champignons, coquillages, fleurs.
- **Pêche** au ponton et à l'étang (8 prises, records de taille).
- **Cuisine** : 9 recettes (friandises pour animaux, tartes, soupe de citrouille, makis…).
- **Économie** : on vend au marché, on achète des semis, des meubles et des vêtements.

### 🛋️ Maison et décoration
- On entre chez soi. La pièce s'affiche en « maison de poupée » : les murs côté caméra se coupent.
- **Mode décoration** (`B`) : placer à la souris, tourner, changer la couleur, déplacer ou ranger.
- **40 meubles** : lits, canapé, cheminée qui crépite, piano jouable, tourne-disque, aquarium, arbre à chat, panier pour animal, cuisinière, tableaux, guirlande lumineuse…
- **Déco du jardin** : banc, lanterne, arche de roses, balançoire, nain de jardin, bain d'oiseaux…
- **8 papiers peints, 6 sols**. On dort dans son lit pour passer la nuit.

### 🌦️ Monde vivant
- **4 saisons** de 3 jours : cerisiers au printemps, feuillage roux en automne, neige sur l'île et les toits en hiver.
- **Météo** : soleil, nuages, pluie (qui arrose le potager), neige, arc-en-ciel après la pluie.
- **Cycle jour/nuit** : lampadaires, fenêtres éclairées, phare, lucioles, papillons.
- 8 lieux, mini-carte et grande carte.

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
  game/                  Objets, potager, cueillette & pêche, cuisine, quêtes
  ui/                    HUD, création du personnage, dialogues, boutiques, journal, photo, réglages
```

## Pistes pour la suite

- Multijoueur pour visiter l'île de ses amis (demande un serveur)
- Plus d'habitants, d'événements saisonniers (fête des fleurs, Halloween, Noël)
- Agrandissement de la maison (étage, pièces supplémentaires)
- Bébés animaux et élevage, balades à cheval

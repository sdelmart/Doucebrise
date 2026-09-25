# 🌸 Doucebrise

Un jeu 3D **cosy** dans l'esprit de *Heartopia* : une petite île à explorer, des animaux à apprivoiser et un personnage à personnaliser dans les moindres détails.

Le jeu tourne directement dans le navigateur (Three.js), sans aucun fichier externe : tous les modèles 3D, les visages, les motifs de vêtements et les sons sont générés par le code.

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
| `Maj` | Courir (ça effraie les animaux timides !) |
| `Espace` | Sauter |
| Glisser la souris · molette | Tourner la caméra · zoomer |
| `E` | Caresser · cueillir · pêcher |
| `F` | Donner à manger (le plat préféré en priorité) |
| `R` | Adopter (cœurs pleins) · « suis-moi » / « attends au jardin » |
| `C` / `P` / `M` / `H` | Personnaliser · animaux · carte · aide |

Sur mobile, un joystick et des boutons tactiles apparaissent.

## Ce qu'il y a dans cette première version

### 🧍 Personnalisation du personnage
- **Corps** : 12 teintes de peau (dont des teintes fantaisie) + couleur libre, taille, carrure, taille de la tête.
- **Visage** : 7 styles d'yeux, 10 couleurs d'yeux, cils, 5 sourcils, 6 bouches, joues rosées, taches de rousseur. Le personnage cligne des yeux et sourit quand il caresse un animal.
- **Cheveux** : 10 coiffures (carré, long, queue, couettes, chignon, bouclés, hérissé…), 16 couleurs, **pointes en dégradé**.
- **Tenue** : 6 hauts (t-shirt, pull, sweat à capuche, robe, salopette, kimono) avec 2 couleurs et 7 motifs (rayures, pois, vichy, cœurs, étoiles, fleurs), 4 bas, 4 paires de chaussures.
- **Accessoires** : 10 chapeaux (béret, paille, bonnet, grenouille, sorcière, oreilles de chat/lapin, couronne de fleurs…), 4 lunettes, accessoires de dos (sac, ailes de fée animées, cape, écharpe, queue de renard).
- Toutes les couleurs ont aussi un **sélecteur libre**.

### 🐾 Animaux
- **8 espèces** et **32 pelages** : chat, chien, lapin, renard, canard, mouton, faon, hérisson.
- Chaque espèce a son caractère : les renards et les faons sont farouches et fuient si on court près d'eux, les canards nagent dans l'étang, les lapins sautillent…
- **Confiance** (5 cœurs) : caresser, nourrir, et découvrir le **plat préféré** de chaque espèce.
- **Adoption** : on donne un nom, jusqu'à 3 compagnons vous suivent, les autres vous attendent dans votre jardin.
- **Accessoires pour animaux** : collier, nœud, foulard, chapeau de fête, couronne de fleurs, en 8 couleurs.
- **Carnet** : toutes les espèces et tous les pelages à découvrir.
- Ils dorment la nuit (petits « Zzz »), remuent la queue, clignent des yeux.

### 🏝️ L'île
- 8 lieux : Place du Village (fontaine, marché), Prairie aux Fleurs, Bois Chuchotant, Étang des Canards, Colline du Moulin, Plage Coquillage (ponton, parasol, château de sable), Cap du Phare, Verger Pommelé.
- **Cycle jour/nuit** (~14 min) : lever et coucher de soleil, étoiles, lampadaires et fenêtres qui s'allument, faisceau du phare, lucioles, papillons.
- Récolte : 🍓 baies, 🍎 pommes, 🥕 carottes, 🌻 graines (elles repoussent avec le temps).
- 🎣 **Pêche** au ponton et à l'étang (8 prises possibles, records de taille).
- Mini-carte, grande carte, votre maison avec votre nom sur la pancarte.
- Musique douce et sons générés (bouton 🎵).
- **Sauvegarde automatique** dans le navigateur.

## Organisation du code

```
src/
  main.js, game.js       Démarrage, boucle de jeu, états, sauvegarde
  core/                  Maths/bruit, matériaux cartoon, entrées, particules, sons, sauvegarde
  world/                 Terrain, ciel jour/nuit, eau, village, végétation, collisions, plan de l'île
  player/                Personnage (modèle + animations), visage, apparence, déplacement, caméra
  animals/               Espèces (modèles 3D), comportement, gestion et interactions
  game/                  Activités : cueillette et pêche
  ui/                    Interface HTML/CSS : HUD, création du personnage, panneau des animaux
```

## Pistes pour la suite

- Décoration de la maison (intérieur, meubles à placer)
- Potager, cuisine, artisanat
- Habitants du village (PNJ) avec quêtes et amitiés
- Boutique et monnaie, vêtements à débloquer
- Saisons et météo (pluie, neige)
- Plus d'espèces (oiseaux, chevaux, pandas roux…) et des bébés animaux
- Multijoueur pour visiter les îles de ses amis

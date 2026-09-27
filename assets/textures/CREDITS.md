# Textures

## Sol

Toutes ces textures viennent de **Poly Haven** (https://polyhaven.com) et sont sous licence **CC0** (domaine public) : libres d'utilisation, même commerciale.

| Couche | Texture Poly Haven |
| --- | --- |
| Herbe | Leafy Grass — https://polyhaven.com/a/leafy_grass |
| Sous-bois | Forest Ground 01 — https://polyhaven.com/a/forrest_ground_01 |
| Terre des chemins | Park Dirt — https://polyhaven.com/a/park_dirt |
| Sable | Sand 01 — https://polyhaven.com/a/sand_01 |
| Roche | Rock Face — https://polyhaven.com/a/rock_face |
| Pavés | Cobblestone Floor 01 — https://polyhaven.com/a/cobblestone_floor_01 |
| Neige | Snow 02 — https://polyhaven.com/a/snow_02 |

Les deux images du jeu sont ces textures (1K, cartes *diff*, *nor_gl* et *disp*) redimensionnées et empilées :
- `terrain-albedo.jpg` : les couleurs (1024 × 1024 par couche) ;
- `terrain-normal-height.jpg` : rouge et vert = normale (convention OpenGL), bleu = hauteur (512 × 512 par couche).

## Arbres

| Image | Contenu | Source et licence |
| --- | --- | --- |
| `trees-bark.jpg`, `trees-bark-normal.jpg` | Écorces de chêne, de bouleau et de pin (couleur 1024 px, relief 512 px, empilées) | Chêne : Poly Haven, Bark Brown 02 — https://polyhaven.com/a/bark_brown_02 (CC0). Bouleau et pin : TextureCan — https://www.texturecan.com/details/221/ et https://www.texturecan.com/details/588/ (CC0) |
| `trees-leaves.jpg` + `trees-leaves-alpha.png` | Huit rameaux (couleur, et transparence à part) : chêne, frêne, tremble doré, pin, puis des variantes recolorées (cerisier rose, bouleau, pommier, arbre tropical) | Rameaux du projet EZ-Tree de Daniel Greenheck — https://github.com/dgreenheck/ez-tree (licence MIT, voir `LICENSE-EZ-Tree.txt`) |

Les formes des arbres sont générées au lancement par `src/world/treeGen.js`, adapté de l'algorithme d'EZ-Tree (licence MIT).

import * as THREE from 'three';
import { MODEL_FILES, bakedGeometry, getModel } from '../core/models.js';

// Végétation importée (assets/models/nature/) : quels modèles pour quel type de plante,
// à quelle hauteur, et comment les recolorer dans la palette du jeu (feuillage en
// dégradé, cerisiers roses, arbres d'automne, neige sur les sapins de l'île des Pins).
// Un type sans modèle garde sa version construite en code.

const _lo = new THREE.Color();
const _hi = new THREE.Color();
const _snow = new THREE.Color('#eef4ff');
const _tmp = new THREE.Color();

/** Feuillage : vert ou vert d'eau (troncs, pétales et cailloux ne le sont pas). */
export function isLeaf(c) {
  return c.g > c.r * 1.08 && c.g >= c.b * 0.88;
}

const lum = (c) => c.r * 0.3 + c.g * 0.59 + c.b * 0.11;

/**
 * Recoloration : feuillage en dégradé (bas → haut), troncs et le reste vers une teinte
 * donnée (en gardant un peu de leur modelé), neige sur les faces tournées vers le ciel.
 */
function palette({ leaves = null, trunk = null, other = null, snow = 0, keep = 0.25 } = {}) {
  const lo = leaves && new THREE.Color(leaves[0]);
  const hi = leaves && new THREE.Color(leaves[1]);
  const tr = trunk && new THREE.Color(trunk);
  const ot = other && new THREE.Color(other);
  return (c, y, n) => {
    const leaf = isLeaf(c);
    if (leaf && lo) {
      const t = THREE.MathUtils.clamp(y * 1.05 + n.y * 0.12, 0, 1);
      c.copy(_lo.copy(lo).lerp(_hi.copy(hi), t));
    } else if (!leaf && (tr || ot)) {
      const target = tr || ot;
      const shade = THREE.MathUtils.clamp(lum(c) / Math.max(0.05, lum(target)), 0.75, 1.2);
      c.lerp(_tmp.copy(target).multiplyScalar(shade), 1 - keep);
    }
    if (snow > 0 && n.y > 0.45) {
      const s = THREE.MathUtils.smoothstep(n.y, 0.45, 0.85) * snow;
      c.lerp(_snow, s);
    }
  };
}

const ROUND = /\/Tree_1_[A-Z]_Color\d+$/i;
const TRUNK = '#9a6a4a';

// Hauteurs calées sur les modèles construits en code (en mètres, avant l'échelle aléatoire).
export const NATURE_KINDS = {
  treeRound: { match: ROUND, height: 5.8, recolor: palette({ leaves: ['#4c9a4a', '#a6dd7a'], trunk: TRUNK }) },
  treeLight: { match: ROUND, height: 5.3, recolor: palette({ leaves: ['#79bd57', '#d6ee8a'], trunk: TRUNK }) },
  treeCherry: { match: ROUND, height: 5.6, recolor: palette({ leaves: ['#ea8db1', '#ffe0ec'], trunk: '#8a5a4a' }) },
  treeGolden: { match: ROUND, height: 5.6, recolor: palette({ leaves: ['#e58b3a', '#ffd98a'], trunk: '#8a5a43' }) },
  treeApple: { match: /\/Tree_1_A_Color\d+$/i, height: 4.8, recolor: palette({ leaves: ['#5fb257', '#a8de7a'], trunk: TRUNK }) },
  treeTropical: { match: /\/Tree_3_[A-Z]_Color\d+$/i, height: 5.4, recolor: palette({ leaves: ['#4fae55', '#b5e07a'], trunk: '#9a6a4a' }) },
  pine: { match: /\/tree_pine(Round[A-F]|Default[AB])$/i, height: 6.5, recolor: palette({ leaves: ['#2f7d52', '#7cc784'], trunk: '#8a5d43' }) },
  fir: { match: /\/tree_pineTall[A-D]$/i, height: 6.6, recolor: palette({ leaves: ['#2c7050', '#6cb47a'], trunk: '#7a5240' }) },
  pineSnow: { match: /\/tree_pineRound[A-F]$/i, height: 5.8, recolor: palette({ leaves: ['#2f7652', '#70b47c'], trunk: '#7a5240', snow: 0.85 }) },
  palm: { match: /\/tree_palm(Tall|Bend|Short|DetailedTall|DetailedShort)?$/i, height: 6.2, recolor: palette({ leaves: ['#3f9a4f', '#9ad870'], trunk: '#b08458', keep: 0.4 }) },
  palmCoco: { match: /\/tree_palm$/i, height: 6.2, recolor: palette({ leaves: ['#3f9a4f', '#9ad870'], trunk: '#b08458', keep: 0.4 }) },
  rock: { match: /\/Rock_1_[A-H]_Color\d+$/i, height: 1.15, yOffset: -0.2, recolor: palette({ other: '#b3aca2', keep: 0.55 }) },
  bush: { match: /\/Bush_1_A_Color\d+$/i, height: 1.35, recolor: palette({ leaves: ['#4f9e55', '#8ed07a'] }) },
  bushBlue: { match: /\/Bush_2_A_Color\d+$/i, height: 1.05, recolor: palette({ leaves: ['#3f7f55', '#79b87a'] }) },
  mushroom: { match: /\/mushroom_red$/i, height: 0.42 },
  flower: { match: /\/flower_redB$/i, height: 0.5 },
  tulip: { match: /\/flower_redA$/i, height: 0.62 },
};

function idsFor(kind) {
  const k = NATURE_KINDS[kind];
  return MODEL_FILES.filter((m) => m.dir.startsWith('nature') && k.match.test(m.id)).map((m) => m.id);
}

/** Tous les modèles de végétation utilisés (à charger avant de construire le monde). */
export const NATURE_MODEL_IDS = [...new Set(Object.keys(NATURE_KINDS).flatMap(idsFor))];

/**
 * Géométries (une par modèle) d'un type de plante, ou null si aucun modèle n'est chargé.
 * extra : recoloration supplémentaire (ex. couleur des pétales d'une fleur).
 */
export function natureGeometries(kind, { extra = null, key = '' } = {}) {
  const k = NATURE_KINDS[kind];
  if (!k) return null;
  const geos = idsFor(kind)
    .filter((id) => getModel(id))
    .map((id) => bakedGeometry(id, {
      height: k.height,
      key: `${kind}${key}`,
      recolor: (c, y, n) => {
        k.recolor?.(c, y, n);
        extra?.(c, y, n);
      },
    }))
    .filter(Boolean);
  return geos.length ? geos : null;
}

export function kindOffset(kind) {
  return NATURE_KINDS[kind]?.yOffset || 0;
}

/** Fleur recolorée : tige verte, pétales de la couleur voulue. */
export function flowerColors(petal) {
  const p = new THREE.Color(petal);
  const stem = new THREE.Color('#4f9e4f');
  return (c) => {
    if (isLeaf(c)) c.copy(stem);
    else c.copy(p);
  };
}

/**
 * Points répartis sur le feuillage d'une géométrie (fruits, baies) : sommets tournés
 * vers l'extérieur, au-dessus d'une hauteur donnée, bien espacés les uns des autres.
 */
export function surfaceSpots(geo, count, { minY = 0.4, out = 0.08, seed = 1 } = {}) {
  geo.computeBoundingBox();
  const top = geo.boundingBox.max.y;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const col = geo.attributes.color;
  const cands = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < top * minY) continue;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = nor.getX(i);
    const ny = nor.getY(i);
    const nz = nor.getZ(i);
    const r = Math.hypot(x, z) || 1;
    if ((nx * x + nz * z) / r + ny * 0.4 < 0.35) continue;
    if (col) {
      c.setRGB(col.getX(i), col.getY(i), col.getZ(i));
      if (!isLeaf(c) && c.r > c.g) continue;
    }
    cands.push(new THREE.Vector3(x + nx * out, y + ny * out, z + nz * out));
  }
  if (!cands.length) return [];
  // Tirage le plus éloigné (déterministe) : des fruits bien répartis.
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const picks = [cands[Math.floor(rnd() * cands.length)]];
  while (picks.length < count && picks.length < cands.length) {
    let best = null;
    let bestD = -1;
    for (let t = 0; t < 60; t++) {
      const p = cands[Math.floor(rnd() * cands.length)];
      let d = Infinity;
      for (const q of picks) d = Math.min(d, p.distanceToSquared(q));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    picks.push(best);
  }
  return picks;
}

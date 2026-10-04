import * as THREE from 'three';
import detailUrl from '/assets/textures/decor-detail.jpg?url';
import { loadImage, arrayTexture } from './terrainTextures.js';
import { setVertexColorEnhancer } from '../core/materials.js';

// Matières du décor construit (maisons, boutiques, bancs, clôtures, pontons, meubles) et
// des personnages : enduit, bois, planches, tuiles, pierre, tissu, métal, céramique,
// peau, cheveux, cuir. Une texture en niveaux de gris (assets/textures/decor-detail.jpg,
// Poly Haven, CC0) module la couleur de chaque surface et lui donne un léger relief ; la
// rugosité et le côté métallique changent aussi d'une matière à l'autre (bois satiné,
// métal qui reflète le ciel, céramique brillante, tissu mat…). Sans cela, tout avait la
// même surface mate et lisse : un aspect « pâte à modeler ».
// La texture est projetée selon l'orientation de chaque face (rangs de tuiles et
// planches à l'horizontale), en mètres : même échelle partout. Les personnages la
// prennent dans leur pose de repos, pour que le tissu ne glisse pas quand ils bougent.

/** Matières (attribut aSurf des géométries, voir setSurf). 0 : devinée d'après la couleur. */
export const SURF = {
  auto: 0, plaster: 1, wood: 2, planks: 3, tiles: 4, stone: 5, plain: 6,
  fabric: 7, metal: 8, ceramic: 9, skin: 10, hair: 11, leather: 12, painted: 13,
};

// Par couche de la texture : mètres par répétition, force du grain, relief (m).
const SPEC = [
  { tile: 2.4, gain: 0.55, bump: 0.002 }, // enduit
  { tile: 1.3, gain: 0.8, bump: 0.004 }, // bois
  { tile: 2.0, gain: 0.9, bump: 0.01 }, // planches
  { tile: 2.2, gain: 1.0, bump: 0.03 }, // tuiles
  { tile: 1.8, gain: 0.9, bump: 0.025 }, // pierre
];

// Rugosité de chaque matière (index = SURF), et part de métal.
const ROUGH = [0.82, 0.92, 0.62, 0.72, 0.55, 0.86, 0.6, 0.9, 0.38, 0.28, 0.58, 0.46, 0.52, 0.42];
const METAL = { 8: 0.7 };

let texture = null;
/** Grain allumé (1) ou coupé (0, sol simplifié des petits ordinateurs). */
export const decorUniforms = { uDecor: { value: 1 } };

export async function loadDecorTextures() {
  if (texture) return texture;
  try {
    texture = arrayTexture(await loadImage(detailUrl), SPEC.length, false);
    // Meubles, objets et personnages : matières prises dans leur propre repère.
    setVertexColorEnhancer((m) => addDecor(m, { object: true }));
  } catch (err) {
    console.warn('Grain du décor indisponible :', err);
    texture = null;
  }
  return texture;
}

export const decorTexture = () => texture;

const f = (x) => x.toFixed(4);
const pick = (key) => SPEC.map((s, i) => (i < SPEC.length - 1 ? `layer == ${i} ? ${f(s[key])} : ` : f(s[key]))).join('');
const roughOf = () => ROUGH.map((r, i) => (i < ROUGH.length - 1 ? `surf < ${i}.5 ? ${f(r)} : ` : f(r))).join('');
const metalOf = () => `${Object.entries(METAL).map(([s, m]) => `abs(surf - ${s}.0) < 0.5 ? ${f(m)} : `).join('')}0.0`;

/**
 * Ajoute les matières à un matériau à couleurs par sommet (MeshStandardMaterial ou
 * MeshToonMaterial). À appeler après addSeason : la neige recouvre le grain.
 * object : coordonnées de la pose de repos (personnages animés, objets qu'on déplace) au
 * lieu de la position dans le monde.
 */
export function addDecor(material, { object = false } = {}) {
  if (!texture) return material;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey() : '';
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    shader.uniforms.tDecor = { value: texture };
    shader.uniforms.uDecor = decorUniforms.uDecor;
    shader.vertexShader = `attribute float aSurf;\nvarying float vSurf;\nvarying vec3 vDecorPos;\nvarying vec3 vDecorN;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      object
        ? `#include <project_vertex>
      vSurf = aSurf;
      vDecorPos = position;
      vDecorN = normal;`
        : `#include <project_vertex>
      vSurf = aSurf;
      {
        vec4 dp = vec4(transformed, 1.0);
        vec3 dn = objectNormal;
        #ifdef USE_INSTANCING
          dp = instanceMatrix * dp;
          dn = mat3(instanceMatrix) * dn;
        #endif
        vDecorPos = (modelMatrix * dp).xyz;
        vDecorN = normalize(mat3(modelMatrix) * dn);
      }`,
    );
    shader.fragmentShader = `uniform highp sampler2DArray tDecor;\nuniform float uDecor;\nvarying float vSurf;\nvarying vec3 vDecorPos;\nvarying vec3 vDecorN;\n${shader.fragmentShader}`
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float decorH = 0.5;
        float decorBump = 0.0;
        float surf = floor(vSurf + 0.5);
        {
          if (surf < 0.5) {
            // Matière devinée : les bruns sont du bois, les teintes claires et douces de
            // l'enduit (du tissu sur un personnage), les gris très sombres du métal ; le
            // reste (peinture, fleurs…) est une surface unie.
            vec3 cs = sqrt(max(diffuseColor.rgb, vec3(0.0)));
            float mx = max(cs.r, max(cs.g, cs.b));
            float mn = min(cs.r, min(cs.g, cs.b));
            float sat = (mx - mn) / max(mx, 1e-3);
            float hue = (cs.g - cs.b) / max(cs.r - cs.b, 1e-3);
            bool wood = cs.r >= cs.g && cs.g >= cs.b && sat > 0.22 && sat < 0.8 && mx > 0.2 && mx < 0.9 && hue > 0.22 && hue < 0.8;
            bool light = sat < 0.3 && mx > 0.5;
            bool dark = mx < 0.3 && sat < 0.35;
            surf = wood ? 2.0 : light ? ${object ? '7.0' : '1.0'} : dark ? 8.0 : 6.0;
          }
          // Grain de chaque matière : couche de la texture, taille (m), force, relief (m).
          int layer = -1;
          float tile = 1.0;
          float gain = 0.0;
          float bump = 0.0;
          if (surf < 5.5) {
            layer = int(surf) - 1;
            tile = ${pick('tile')};
            gain = ${pick('gain')};
            bump = ${pick('bump')};
          } else if (abs(surf - 7.0) < 0.5) {
            layer = 0; tile = 0.22; gain = 0.28; bump = 0.0009; // tissu : trame fine
          } else if (abs(surf - 11.0) < 0.5) {
            layer = 1; tile = 0.14; gain = 0.35; bump = 0.0012; // cheveux : mèches
          } else if (abs(surf - 12.0) < 0.5) {
            layer = 0; tile = 0.32; gain = 0.3; bump = 0.0011; // cuir : grain serré
          } else if (abs(surf - 13.0) < 0.5) {
            layer = 1; tile = 0.9; gain = 0.24; bump = 0.0016; // bois peint : veinage sous la peinture
          }
          if (uDecor > 0.5 && layer >= 0) {
            // Repère de la face : tangente horizontale, puis le long de la pente.
            vec3 dN = normalize(vDecorN);
            vec3 dT = abs(dN.y) < 0.96 ? normalize(vec3(dN.z, 0.0, -dN.x)) : vec3(1.0, 0.0, 0.0);
            vec3 dB = cross(dN, dT);
            vec2 dst = vec2(dot(vDecorPos, dT), dot(vDecorPos, dB));
            vec2 ddx = dFdx(dst);
            vec2 ddy = dFdy(dst);
            decorH = textureGrad(tDecor, vec3(dst / tile, float(layer)), ddx / tile, ddy / tile).r;
            diffuseColor.rgb *= mix(1.0, decorH * 2.0, gain);
            decorBump = bump;
          }
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        // Rugosité de la matière, un peu variée par le grain (veines du bois, tuiles…).
        roughnessFactor = clamp((${roughOf()}) + (decorH - 0.5) * 0.18, 0.06, 1.0);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = ${metalOf()};`,
      )
      .replace(
        '#include <lights_fragment_end>',
        object
          ? `#include <lights_fragment_end>
        // Objets et personnages : le côté à l'ombre ressort un peu (moins « pâte à modeler »).
        reflectedLight.indirectDiffuse *= 0.8;`
          : '#include <lights_fragment_end>',
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // Relief du grain (bump mapping d'après la hauteur, en mètres).
          float dh = (decorH - 0.5) * decorBump;
          vec3 sx = dFdx(-vViewPosition);
          vec3 sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal);
          vec3 r2 = cross(normal, sx);
          float det = dot(sx, r1) * faceDirection;
          vec3 grad = sign(det) * (dFdx(dh) * r1 + dFdy(dh) * r2);
          if (decorBump > 0.0 && abs(det) > 0.0) normal = normalize(abs(det) * normal - grad);
        }`,
      );
  };
  material.customProgramCacheKey = () => `${prevKey}|decor${object ? '-obj' : ''}`;
  return material;
}

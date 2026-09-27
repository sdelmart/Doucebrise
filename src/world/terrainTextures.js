import * as THREE from 'three';
import albedoUrl from '/assets/textures/terrain-albedo.jpg?url';
import normalHeightUrl from '/assets/textures/terrain-normal-height.jpg?url';

// Sol détaillé : textures photographiques (Poly Haven, CC0) empilées dans deux images
// (assets/textures/) — l'albédo, et la normale + la hauteur (rouge/vert : normale,
// bleu : relief). Le terrain garde ses couleurs (biomes, saisons) : la texture n'apporte
// que le grain, le relief et les petites variations de teinte.

/** Couches, dans l'ordre des images empilées (l'herbe est la couche de fond). */
export const GROUND_LAYERS = [
  // tile : mètres couverts par une répétition ; avg : couleur moyenne (linéaire) de l'albédo.
  { id: 'herbe', tile: 3.2, rough: 0.92, bump: 0.9, avg: [0.3198, 0.2357, 0.1061] },
  { id: 'sous-bois', tile: 3.6, rough: 0.94, bump: 1.0, avg: [0.2918, 0.2482, 0.1198] },
  { id: 'terre', tile: 2.8, rough: 0.9, bump: 1.0, avg: [0.198, 0.1337, 0.0508] },
  { id: 'sable', tile: 4.5, rough: 0.96, bump: 0.8, avg: [0.3819, 0.3062, 0.1622] },
  { id: 'roche', tile: 5.5, rough: 0.82, bump: 1.2, avg: [0.1214, 0.0615, 0.0319] },
  { id: 'pavés', tile: 2.6, rough: 0.78, bump: 1.3, avg: [0.2819, 0.23, 0.1609] },
  { id: 'neige', tile: 4.5, rough: 0.62, bump: 0.7, avg: [0.379, 0.3786, 0.3886] },
];
export const LAYER = { grass: 0, forest: 1, dirt: 2, sand: 3, rock: 4, paving: 5, snow: 6 };

let textures = null;

async function loadImage(url) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  return img;
}

/** Image empilée (couches les unes sous les autres) → texture tableau pour le GPU. */
function arrayTexture(img, layers, srgb) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = new Uint8Array(ctx.getImageData(0, 0, w, h).data.buffer);
  const tex = new THREE.DataArrayTexture(data, w, h / layers, layers);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Charge les textures du sol (à appeler avant de construire le monde). */
export async function loadGroundTextures() {
  if (textures) return textures;
  try {
    const [a, n] = await Promise.all([loadImage(albedoUrl), loadImage(normalHeightUrl)]);
    const layers = GROUND_LAYERS.length;
    textures = { albedo: arrayTexture(a, layers, true), normalHeight: arrayTexture(n, layers, false) };
  } catch (err) {
    console.warn('Textures du sol indisponibles :', err);
    textures = null;
  }
  return textures;
}

export const groundTextures = () => textures;

/**
 * Ajoute le sol détaillé à un matériau de terrain (MeshStandardMaterial ou
 * MeshToonMaterial) : attributs splatA (sous-bois, terre, sable) et splatB (roche,
 * pavés, neige), l'herbe prenant le reste. À appeler APRÈS addSeason, pour que le
 * grain soit posé avant la neige et les couleurs d'automne.
 */
export function addGroundDetail(material, { maxAnisotropy = 8 } = {}) {
  const tex = textures;
  if (!tex) return material;
  tex.albedo.anisotropy = maxAnisotropy;
  tex.normalHeight.anisotropy = maxAnisotropy;
  const n = GROUND_LAYERS.length;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey() : '';
  const f = (v) => v.toFixed(4);
  const list = (fn) => GROUND_LAYERS.map(fn).join(', ');
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    shader.uniforms.tGroundAlbedo = { value: tex.albedo };
    shader.uniforms.tGroundNormal = { value: tex.normalHeight };
    shader.vertexShader = `attribute vec3 splatA;
attribute vec3 splatB;
varying vec3 vSplatA;
varying vec3 vSplatB;
varying vec3 vGroundPos;
varying vec3 vGroundNormal;
${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vSplatA = splatA;
      vSplatB = splatB;
      vGroundPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vGroundNormal = normalize(mat3(modelMatrix) * objectNormal);`,
    );
    shader.fragmentShader = `uniform highp sampler2DArray tGroundAlbedo;
uniform highp sampler2DArray tGroundNormal;
varying vec3 vSplatA;
varying vec3 vSplatB;
varying vec3 vGroundPos;
varying vec3 vGroundNormal;
const float G_TILE[${n}] = float[](${list((l) => f(1 / l.tile))});
const float G_ROUGH[${n}] = float[](${list((l) => f(l.rough))});
const float G_BUMP[${n}] = float[](${list((l) => f(l.bump))});
const vec3 G_AVG[${n}] = vec3[](${list((l) => `vec3(${l.avg.map(f).join(', ')})`)});
vec3 gDetail = vec3(1.0);
vec3 gNormalTS = vec3(0.0, 0.0, 1.0);
float gRough = 0.9;
// Échantillonnage d'une couche (gradients calculés hors des branches : pas de
// scintillement aux frontières). L'herbe, le sous-bois et le sable (grandes surfaces)
// mélangent deux échelles tournées pour casser la répétition.
void groundSample(int i, vec2 p, vec2 dx, vec2 dy, out vec4 alb, out vec4 nh) {
  float k = G_TILE[i];
  vec3 uv = vec3(p * k, float(i));
  alb = textureGrad(tGroundAlbedo, uv, dx * k, dy * k);
  nh = textureGrad(tGroundNormal, uv, dx * k, dy * k);
  if (i == 0 || i == 1 || i == 3) {
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8) * 0.37;
    vec3 uv2 = vec3(r * uv.xy + vec2(0.31, 0.73), uv.z);
    vec2 dx2 = r * dx * k;
    vec2 dy2 = r * dy * k;
    alb = mix(alb, textureGrad(tGroundAlbedo, uv2, dx2, dy2), 0.45);
    nh = mix(nh, textureGrad(tGroundNormal, uv2, dx2, dy2), 0.35);
  }
}
${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        float w[${n}];
        w[1] = vSplatA.x; w[2] = vSplatA.y; w[3] = vSplatA.z;
        w[4] = vSplatB.x; w[5] = vSplatB.y; w[6] = vSplatB.z;
        w[0] = max(0.0, 1.0 - (w[1] + w[2] + w[3] + w[4] + w[5] + w[6]));
        // Roche : projection sur trois axes (pas d'étirement sur les falaises).
        vec3 pdx = dFdx(vGroundPos);
        vec3 pdy = dFdy(vGroundPos);
        vec3 an = abs(normalize(vGroundNormal));
        vec3 tw = pow(an, vec3(4.0));
        tw /= (tw.x + tw.y + tw.z);
        // Mélange par la hauteur : les cailloux et pavés dépassent de l'herbe, etc.
        vec4 alb[${n}];
        vec4 nh[${n}];
        float top = -1.0;
        for (int i = 0; i < ${n}; i++) {
          if (w[i] < 0.004) { alb[i] = vec4(0.0); nh[i] = vec4(0.5, 0.5, 0.0, 1.0); continue; }
          if (i == 4) {
            vec4 ax, nx, ay, ny, az, nz;
            groundSample(i, vGroundPos.zy, pdx.zy, pdy.zy, ax, nx);
            groundSample(i, vGroundPos.xz, pdx.xz, pdy.xz, ay, ny);
            groundSample(i, vGroundPos.xy, pdx.xy, pdy.xy, az, nz);
            alb[i] = ax * tw.x + ay * tw.y + az * tw.z;
            nh[i] = ny;
            nh[i].b = nx.b * tw.x + ny.b * tw.y + nz.b * tw.z;
          } else {
            groundSample(i, vGroundPos.xz, pdx.xz, pdy.xz, alb[i], nh[i]);
          }
          top = max(top, w[i] + nh[i].b * 0.35);
        }
        vec3 detail = vec3(0.0);
        vec3 nts = vec3(0.0);
        float rough = 0.0;
        float sum = 0.0;
        for (int i = 0; i < ${n}; i++) {
          if (w[i] < 0.004) continue;
          float b = max(w[i] + nh[i].b * 0.35 - top + 0.12, 0.0);
          // Creux un peu plus sombres (joints des pavés, fissures de la roche).
          float cavity = mix(0.72, 1.0, smoothstep(0.0, 0.55, nh[i].b));
          detail += b * clamp(alb[i].rgb / G_AVG[i], 0.0, 3.0) * mix(1.0, cavity, G_BUMP[i] * 0.6);
          vec2 xy = (nh[i].rg * 2.0 - 1.0) * G_BUMP[i];
          nts += b * vec3(xy, 1.0);
          rough += b * G_ROUGH[i];
          sum += b;
        }
        detail /= max(sum, 1e-4);
        gRough = rough / max(sum, 1e-4);
        gNormalTS = normalize(nts);
        // Le grain s'estompe au loin (moins de scintillement, couleurs des biomes intactes).
        float fade = 1.0 - smoothstep(60.0, 160.0, length(vGroundPos - cameraPosition));
        gDetail = mix(vec3(1.0), detail, 0.85 * fade);
        gNormalTS = normalize(mix(vec3(0.0, 0.0, 1.0), gNormalTS, fade));
        diffuseColor.rgb *= gDetail;
        // Herbe un peu moins acidulée que les aplats d'origine ; sable et terre plus chauds.
        float grassy = clamp(w[0] + w[1], 0.0, 1.0);
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), diffuseColor.rgb, mix(1.12, 0.88, grassy)) * mix(1.0, 0.94, grassy);
      }`,
    ).replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      {
        vec3 N = normalize(vGroundNormal);
        vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
        vec3 B = normalize(cross(N, T));
        // Image : le haut de la texture pointe vers -Z (B = N × T = -Z sur le plat).
        vec3 Nw = normalize(T * gNormalTS.x + B * gNormalTS.y + N * gNormalTS.z);
        normal = normalize((viewMatrix * vec4(Nw, 0.0)).xyz);
      }`,
    ).replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      roughnessFactor = gRough;`,
    );
  };
  material.customProgramCacheKey = () => `${prevKey}|ground-${n}`;
  return material;
}

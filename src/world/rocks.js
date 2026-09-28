import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GROUND_LAYERS, LAYER, groundTextures } from './terrainTextures.js';

// Rochers générés (rendu réaliste) : une sphère déformée par un bruit (bosses, arêtes,
// base aplatie), texturée avec la roche photographiée du sol, projetée selon l'orientation
// de chaque face (sans étirement), avec un peu de mousse sur le dessus. Même matière que
// les falaises : les rochers semblent sortir du terrain.

function hash(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

/** Bruit de valeur 3D (interpolation douce entre des valeurs aléatoires). */
function noise(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(ix + dx, iy + dy, iz + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  ) * 2 - 1;
}

function fbm(x, y, z, octaves = 4) {
  let a = 0.5;
  let s = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    s += a * noise(x * f, y * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}

/**
 * Géométries de rochers (plusieurs formes), hauteur donnée, posées sur y = 0 (base
 * enfoncée de quelques centimètres pour épouser les pentes).
 */
export function rockGeometries(count = 6, height = 1.15) {
  const out = [];
  const v = new THREE.Vector3();
  for (let r = 0; r < count; r++) {
    let g = new THREE.IcosahedronGeometry(1, 4);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = mergeVertices(g);
    const o = r * 13.7 + 2.3;
    const sx = 1 + hash(r, 1, 2) * 0.55;
    const sy = 0.55 + hash(r, 3, 4) * 0.35;
    const sz = 0.8 + hash(r, 5, 6) * 0.4;
    const pos = g.attributes.position;
    const disp = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Bosses larges, arêtes (bruit « plissé »), petit grain.
      const big = fbm(v.x * 1.2 + o, v.y * 1.2, v.z * 1.2 - o, 3);
      const ridge = 0.5 - Math.abs(noise(v.x * 2.2 - o, v.y * 2.2 + o, v.z * 2.2));
      const ridge2 = 0.5 - Math.abs(noise(v.x * 4.5 + o, v.y * 4.5, v.z * 4.5 - o));
      const d = 1 + big * 0.45 + ridge * 0.26 + ridge2 * 0.09 + fbm(v.x * 7 + o, v.y * 7, v.z * 7, 2) * 0.035;
      disp[i] = d;
      v.multiplyScalar(d);
      v.set(v.x * sx, v.y * sy, v.z * sz);
      // Base aplatie (le rocher repose sur le sol).
      const floor = -0.25 * sy;
      if (v.y < floor) v.y = floor + (v.y - floor) * 0.2;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const k = height / (bb.max.y - bb.min.y);
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g.scale(k, k, k);
    g.translate(0, -0.12 * height, 0);
    g.computeVertexNormals();
    // Couleur : un gris chaud, plus sombre dans les creux et au pied.
    const col = new Float32Array(pos.count * 3);
    const base = new THREE.Color().setHSL(0.08 + hash(r, 7, 8) * 0.04, 0.12, 0.62);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / height;
      const cav = THREE.MathUtils.clamp(0.75 + (disp[i] - 1) * 1.2, 0.55, 1.05);
      const foot = THREE.MathUtils.clamp(0.7 + y * 1.2, 0.7, 1);
      const s = cav * foot;
      col[i * 3] = base.r * s;
      col[i * 3 + 1] = base.g * s;
      col[i * 3 + 2] = base.b * s;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeBoundingSphere();
    out.push(g);
  }
  return out;
}

/**
 * Texture de roche du sol sur un matériau de rocher (à couleurs par sommet, instancié) :
 * projection triplanaire en coordonnées du monde, grain en relief, mousse sur le dessus.
 * À appeler après addSeason (la neige recouvre la roche).
 */
export function addRockDetail(material, { moss = 0.45 } = {}) {
  const tex = groundTextures();
  if (!tex) return material;
  const rock = GROUND_LAYERS[LAYER.rock];
  const grass = GROUND_LAYERS[LAYER.forest];
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey() : '';
  const f = (x) => x.toFixed(4);
  const v3 = (c) => `vec3(${c.map(f).join(', ')})`;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    shader.uniforms.tRockAlbedo = { value: tex.albedo };
    shader.vertexShader = `varying vec3 vRockPos;\nvarying vec3 vRockN;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 rp = vec4(transformed, 1.0);
        vec3 rn = objectNormal;
        #ifdef USE_INSTANCING
          rp = instanceMatrix * rp;
          rn = mat3(instanceMatrix) * rn;
        #endif
        vRockPos = (modelMatrix * rp).xyz;
        vRockN = normalize(mat3(modelMatrix) * rn);
      }`,
    );
    shader.fragmentShader = `uniform highp sampler2DArray tRockAlbedo;\nvarying vec3 vRockPos;\nvarying vec3 vRockN;\n${shader.fragmentShader}`
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float rockH = 0.5;
        {
          vec3 n = normalize(vRockN);
          vec3 w = pow(abs(n), vec3(4.0));
          w /= w.x + w.y + w.z;
          vec3 p = vRockPos / ${f(rock.tile * 0.24)};
          vec3 a = texture(tRockAlbedo, vec3(p.zy, ${LAYER.rock}.0)).rgb * w.x
                 + texture(tRockAlbedo, vec3(p.xz, ${LAYER.rock}.0)).rgb * w.y
                 + texture(tRockAlbedo, vec3(p.xy, ${LAYER.rock}.0)).rgb * w.z;
          // Couleur de la roche rapportée à sa moyenne : la teinte du rocher reste.
          vec3 rel = a / ${v3(rock.avg)};
          float l = dot(rel, vec3(0.2126, 0.7152, 0.0722));
          rockH = clamp(l * 0.5, 0.0, 1.0);
          diffuseColor.rgb *= mix(vec3(l * l), rel * l, 0.4);
          // Mousse sur les faces tournées vers le ciel.
          float up = smoothstep(0.55, 0.9, n.y) * ${f(moss)};
          vec3 g = texture(tRockAlbedo, vec3(vRockPos.xz / ${f(grass.tile * 0.5)}, ${LAYER.forest}.0)).rgb / ${v3(grass.avg)};
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.24, 0.07) * g, up * smoothstep(0.15, 0.45, rockH));
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          float dh = (rockH - 0.5) * 0.08;
          vec3 sx = dFdx(-vViewPosition);
          vec3 sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal);
          vec3 r2 = cross(normal, sx);
          float det = dot(sx, r1) * faceDirection;
          vec3 grad = sign(det) * (dFdx(dh) * r1 + dFdy(dh) * r2);
          if (abs(det) > 0.0) normal = normalize(abs(det) * normal - grad);
        }`,
      );
  };
  material.customProgramCacheKey = () => `${prevKey}|rock-${moss}`;
  return material;
}

import * as THREE from 'three';
import { buildAnimal } from '../animals/species.js';
import { buildOutfit } from '../animals/outfits.js';
import { plainVertexColor } from '../core/materials.js';

// Portraits des animaux (fiches d'adoption, compagnons) : le modèle 3D, avec sa tenue, est
// rendu de trois quarts dans une petite image, avec le moteur du jeu. Gardés en cache.

const cache = new Map();
let stage = null;

function setup() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff6ec', '#b9a48f', 1.6));
  scene.add(new THREE.AmbientLight('#ffffff', 0.5));
  const sun = new THREE.DirectionalLight('#fff3df', 2.2);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  return { scene, camera, holder: new THREE.Group() };
}

/**
 * Image (data URL) d'un animal.
 * @param {THREE.WebGLRenderer} renderer
 */
export function petPortrait(renderer, species, variant, outfit = {}, size = 168) {
  const key = `${species}:${variant}:${size}:${JSON.stringify(outfit)}`;
  if (cache.has(key)) return cache.get(key);
  if (!stage) {
    stage = setup();
    stage.scene.add(stage.holder);
  }
  const { scene, camera, holder } = stage;
  const m = buildAnimal(species, variant);
  const parts = buildOutfit(m, outfit);
  const extra = [];
  for (const [where, geo] of [['head', parts.head], ['body', parts.body]]) {
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, plainVertexColor());
    (where === 'head' ? m.head : m.body).add(mesh);
    extra.push(mesh);
  }
  m.root.rotation.y = -0.55;
  holder.add(m.root);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m.root);
  const center = box.getCenter(new THREE.Vector3());
  const dim = box.getSize(new THREE.Vector3());
  const radius = Math.max(dim.x, dim.y, dim.z) * 0.62;
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.set(center.x + dist * 0.12, center.y + dist * 0.22, center.z + dist);
  camera.lookAt(center.x, center.y - dim.y * 0.04, center.z);

  const px = size * 2;
  const rt = new THREE.WebGLRenderTarget(px, px, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const prevTarget = renderer.getRenderTarget();
  const prevClear = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  const prevAuto = renderer.autoClear;
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;
  renderer.clear();
  renderer.render(scene, camera);
  const buf = new Uint8Array(px * px * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, px, px, buf);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  renderer.autoClear = prevAuto;
  rt.dispose();

  holder.remove(m.root);
  m.root.traverse((o) => {
    if (o.isMesh) o.geometry.dispose();
  });
  for (const e of extra) e.geometry.dispose();

  // Image retournée (les pixels lus partent du bas).
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(px, px);
  for (let y = 0; y < px; y++) img.data.set(buf.subarray((px - 1 - y) * px * 4, (px - y) * px * 4), y * px * 4);
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  return url;
}

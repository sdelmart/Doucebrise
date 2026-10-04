import * as THREE from 'three';
import { Shape, G, toon, withOutline, paintGradientY, vertexColorToon, getGradientMap, shadedMaterial } from '../core/materials.js';
import { mergeRig } from '../core/rig.js';
import { createFaceTextures, createPatternTexture, FACE_PHI, FACE_THETA0, FACE_THETA_LEN } from './face.js';
import { clamp, damp } from '../core/math.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SURF, addDecor } from '../world/decor.js';

// Personnage « chibi » construit à partir de primitives, entièrement paramétré
// par une apparence (voir appearance.js). Hiérarchie :
//   root → body → hips → { jambes, bas, torso → { bras, tête, accessoires de dos } }

const R = 0.36; // rayon de la tête
const HC = [0, 0.3, 0]; // centre de la tête dans le repère du groupe tête
const HEAD_SCALE = [1.04, 0.97, 1.0];
const OUTLINE = 0.011;
const RIBBON = '#ff8fa3';
/** Repères de la tête et du torse (repris pour habiller les habitants importés). */
export const CLASSIC_FRAME = { R, HC, HEAD_SCALE, eyes: [0.118, 0.23, 0.37], torsoHalf: [0.215, 0.185], neck: 0.44 };

const TORSO_PROFILE = [
  [0.0, -0.05], [0.16, -0.045], [0.205, 0.02], [0.215, 0.12], [0.205, 0.24],
  [0.185, 0.33], [0.14, 0.4], [0.07, 0.435], [0.0, 0.44],
];

function lathe(profile, segments = 20) {
  // Un profil tracé de haut en bas tourne les faces vers l'intérieur : vue de dehors, la
  // forme devenait transparente (jupes, robe). On le remet toujours de bas en haut.
  const pts = profile[0][1] > profile[profile.length - 1][1] ? [...profile].reverse() : profile;
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

function lighten(hex, f) {
  return `#${new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), f).getHexString()}`;
}
function darken(hex, f) {
  return `#${new THREE.Color(hex).multiplyScalar(1 - f).getHexString()}`;
}

/** Point à la surface de la tête (angles en radians : az = gauche/droite, el = haut/bas). */
function onHead(az, el, lift = 1.0) {
  const x = Math.sin(az) * Math.cos(el) * R * lift * HEAD_SCALE[0];
  const y = Math.sin(el) * R * lift * HEAD_SCALE[1];
  const z = Math.cos(az) * Math.cos(el) * R * lift * HEAD_SCALE[2];
  return { pos: [HC[0] + x, HC[1] + y, HC[2] + z], dir: [x, y, z] };
}

export class Character {
  constructor(appearance) {
    this.root = new THREE.Group();
    this.root.name = 'character';
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.hips = new THREE.Group();
    this.hips.position.y = 0.46;
    this.body.add(this.hips);
    this.torso = new THREE.Group();
    this.hips.add(this.torso);
    this.head = new THREE.Group();
    this.head.position.y = 0.44;
    this.torso.add(this.head);
    this.legL = new THREE.Group();
    this.legR = new THREE.Group();
    this.hips.add(this.legL, this.legR);
    this.armL = new THREE.Group();
    this.armR = new THREE.Group();
    this.torso.add(this.armL, this.armR);

    this.parts = [];
    this.textures = [];
    this.tails = [];
    this.wings = [];
    this.cape = null;
    this.foxTail = null;
    this.anim = { phase: 0, amp: 0, t: 0, blinkT: 2.5, blink: 0, happy: 0, action: null, actionT: 0, lean: 0 };

    this.skinMat = null;
    this.setAppearance(appearance);
    this.createRod();
  }

  // --------------------------------------------------------------------------
  // Construction
  // --------------------------------------------------------------------------

  clear() {
    for (const p of this.parts) {
      p.removeFromParent();
      p.traverse((o) => {
        if (o.isMesh && o.name !== 'outline') o.geometry.dispose();
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
    }
    for (const t of this.textures) t.dispose();
    for (const m of this.materials || []) m.dispose();
    this.parts = [];
    this.textures = [];
    this.materials = [];
    this.tails = [];
    this.wings = [];
    this.cape = null;
    this.foxTail = null;
  }

  /**
   * Matière de chaque sommet d'après sa couleur : peau, cheveux, chaussures (cuir),
   * vêtements (tissu) ; le reste (yeux, accessoires…) est deviné par le matériau.
   */
  tagSurf(geo) {
    const col = geo.attributes.color;
    if (!col) return geo;
    const a = this.appearance;
    const keys = [[a.skin, SURF.skin], [a.hairColor, SURF.hair], [a.hairTip, SURF.hair], [a.shoesColor, SURF.leather], [a.topColor, SURF.fabric], [a.topColor2, SURF.fabric], [a.bottomColor, SURF.fabric]]
      .filter(([hex]) => hex)
      .map(([hex, s]) => [new THREE.Color(hex), s]);
    const prev = geo.attributes.aSurf;
    const out = new Float32Array(col.count);
    for (let i = 0; i < col.count; i++) {
      const r = col.getX(i);
      const g = col.getY(i);
      const b = col.getZ(i);
      const hit = keys.find(([c]) => Math.abs(c.r - r) + Math.abs(c.g - g) + Math.abs(c.b - b) < 0.004);
      out[i] = hit ? hit[1] : prev ? prev.getX(i) : 0;
    }
    geo.setAttribute('aSurf', new THREE.BufferAttribute(out, 1));
    return geo;
  }

  addPart(parent, geo, material = vertexColorToon(), { outline = true, shadow = true } = {}) {
    if (material.vertexColors) this.tagSurf(geo);
    // Les pièces à couleurs par sommet d'un même groupe sont fusionnées en un seul
    // maillage (voir flushParts) : bien moins d'appels de dessin par personnage.
    if (material === vertexColorToon() && this.pending) {
      const key = `${outline ? 1 : 0}${shadow ? 1 : 0}`;
      let groups = this.pending.get(parent);
      if (!groups) this.pending.set(parent, (groups = {}));
      (groups[key] ||= []).push(geo);
      return null;
    }
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = shadow;
    if (outline) withOutline(mesh, OUTLINE);
    parent.add(mesh);
    this.parts.push(mesh);
    return mesh;
  }

  flushParts() {
    for (const [parent, groups] of this.pending) {
      for (const [key, geos] of Object.entries(groups)) {
        // (Chaque pièce a sa matière : voir tagSurf.)
        const geo = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
        if (geos.length > 1) geos.forEach((g) => g.dispose());
        const mesh = new THREE.Mesh(geo, vertexColorToon());
        mesh.castShadow = key[1] === '1';
        if (key[0] === '1') withOutline(mesh, OUTLINE);
        parent.add(mesh);
        this.parts.push(mesh);
      }
    }
    this.pending = null;
  }

  setAppearance(a) {
    this.appearance = { ...a };
    this.clear();
    this.pending = new Map();
    this.body.scale.setScalar(a.height);
    this.head.scale.setScalar(a.head);

    const b = a.build;
    const isDress = a.top === 'robe';
    const isOveralls = a.top === 'salopette';
    const inner = isOveralls || a.top === 'veste';
    const base = inner ? a.topColor2 : a.topColor;
    const accent = inner ? a.topColor : a.topColor2;
    const pattern = createPatternTexture(a.pattern, base, accent);
    pattern.repeat.set(3, 2);
    this.textures.push(pattern);
    this.clothMat = shadedMaterial({ map: pattern, gradientMap: getGradientMap(), roughness: 0.9 });
    this.materials.push(this.clothMat);

    this.armL.position.set(0.2 * b + 0.02, 0.35, 0);
    this.armR.position.set(-(0.2 * b + 0.02), 0.35, 0);
    this.legL.position.set(0.1 * b, 0, 0);
    this.legR.position.set(-0.1 * b, 0, 0);

    this.buildTorso(a, b, isDress, isOveralls);
    this.buildArms(a);
    this.buildLegs(a, b, isDress, isOveralls);
    this.buildHead(a);
    this.buildHair(a);
    this.buildHat(a);
    this.buildGlasses(a);
    this.buildBack(a, b);
    this.flushParts();
    if (this.rod) this.armR.add(this.rod);
    // Une pièce par matériau (les pièces d'origine servent d'os) : quelques appels de
    // dessin par personnage au lieu d'une quinzaine.
    const own = new Set();
    for (const p of this.parts) p.traverse((o) => o.isMesh && own.add(o));
    for (const m of mergeRig(this.root, { only: own })) this.parts.push(m);
  }

  buildTorso(a, b, isDress, isOveralls) {
    const torso = lathe(TORSO_PROFILE);
    torso.scale(b, 1, 0.86 * b);
    this.addPart(this.torso, torso, this.clothMat);

    const s = new Shape();
    s.add(G.cyl(0.075, 0.08, 0.12, 10), a.skin, { pos: [0, 0.46, 0] });
    const c2 = a.topColor2;
    switch (a.top) {
      case 'tshirt':
        s.add(G.torus(0.085, 0.022, 6, 16), c2, { pos: [0, 0.43, 0], rot: [Math.PI / 2, 0, 0] });
        break;
      case 'pull':
        s.add(G.torus(0.09, 0.034, 6, 16), c2, { pos: [0, 0.43, 0], rot: [Math.PI / 2, 0, 0] });
        s.add(G.torus(0.2, 0.028, 6, 24), c2, { pos: [0, 0.0, 0], rot: [Math.PI / 2, 0, 0], scale: [b, 0.86 * b, 1] });
        break;
      case 'sweat':
        s.add(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), a.topColor, { pos: [0, 0.4, -0.13], rot: [-1.1, 0, 0], scale: [1.15, 0.9, 0.8] });
        s.add(G.box(0.24, 0.11, 0.035), c2, { pos: [0, 0.1, 0.18 * b] });
        for (const x of [-0.045, 0.045]) s.add(G.cyl(0.008, 0.008, 0.14, 4), '#ffffff', { pos: [x, 0.33, 0.165 * b] });
        s.add(G.torus(0.2, 0.026, 6, 24), c2, { pos: [0, 0.0, 0], rot: [Math.PI / 2, 0, 0], scale: [b, 0.86 * b, 1] });
        break;
      case 'robe':
        for (const x of [-0.05, 0.05]) {
          s.add(G.sphere(0.07, 10, 8), c2, { pos: [x * 1.4, 0.42, 0.075], scale: [1, 0.35, 0.8], rot: [0.5, 0, x > 0 ? -0.4 : 0.4] });
        }
        s.add(G.torus(0.205, 0.02, 6, 24), c2, { pos: [0, 0.12, 0], rot: [Math.PI / 2, 0, 0], scale: [b, 0.86 * b, 1] });
        s.add(G.sphere(0.04, 8, 6), c2, { pos: [0, 0.12, 0.18 * b] });
        break;
      case 'salopette': {
        const col = a.topColor;
        s.add(G.box(0.24, 0.2, 0.03), col, { pos: [0, 0.2, 0.172 * b], rot: [-0.08, 0, 0] });
        s.add(G.box(0.1, 0.06, 0.035), darken(col, 0.15), { pos: [0, 0.2, 0.19 * b] });
        for (const x of [-0.085, 0.085]) {
          s.add(G.box(0.04, 0.2, 0.025), col, { pos: [x, 0.36, 0.13 * b], rot: [-0.55, 0, 0] });
          s.add(G.box(0.04, 0.3, 0.025), col, { pos: [x, 0.3, -0.15 * b], rot: [0.3, 0, 0] });
          s.add(G.sphere(0.022, 6, 5), '#ffd84d', { pos: [x, 0.29, 0.185 * b] });
        }
        s.add(G.torus(0.085, 0.02, 6, 16), a.topColor2, { pos: [0, 0.43, 0], rot: [Math.PI / 2, 0, 0] });
        break;
      }
      case 'veste': {
        const shell = new THREE.LatheGeometry(TORSO_PROFILE.slice(1, 7).map(([r, y]) => new THREE.Vector2(r * 1.08, y)), 20, 0.42, Math.PI * 2 - 0.84);
        shell.scale(b, 1, 0.86 * b);
        const js = new Shape();
        js.add(shell, a.topColor);
        const jm = addDecor(shadedMaterial({ vertexColors: true, gradientMap: getGradientMap(), side: THREE.DoubleSide }), { object: true });
        this.materials.push(jm);
        this.addPart(this.torso, js.build(), jm);
        for (const side of [-1, 1]) {
          s.add(G.box(0.07, 0.2, 0.02), darken(a.topColor, 0.12), { pos: [side * 0.08, 0.33, 0.17 * b], rot: [-0.35, 0, side * -0.35] });
          s.add(G.sphere(0.018, 6, 5), '#ffd84d', { pos: [side * 0.12, 0.12 + (side > 0 ? 0.1 : 0), 0.21 * b] });
        }
        s.add(G.torus(0.085, 0.022, 6, 16), c2, { pos: [0, 0.43, 0], rot: [Math.PI / 2, 0, 0] });
        break;
      }
      case 'kimono':
        s.add(G.cyl(0.212 * b, 0.215 * b, 0.1, 20), c2, { pos: [0, 0.14, 0], scale: [1, 1, 0.87] });
        s.add(G.box(0.18, 0.1, 0.06), c2, { pos: [0, 0.16, -0.19 * b] });
        s.add(G.sphere(0.06, 8, 6), c2, { pos: [0.09, 0.16, -0.2 * b], scale: [1.2, 0.9, 0.5] });
        s.add(G.sphere(0.06, 8, 6), c2, { pos: [-0.09, 0.16, -0.2 * b], scale: [1.2, 0.9, 0.5] });
        s.add(G.box(0.035, 0.26, 0.02), c2, { pos: [0.04, 0.32, 0.165 * b], rot: [-0.3, 0, 0.55] });
        s.add(G.box(0.035, 0.26, 0.02), c2, { pos: [-0.04, 0.32, 0.165 * b], rot: [-0.3, 0, -0.55] });
        break;
      default:
        break;
    }
    this.addPart(this.torso, s.build(), vertexColorToon(), { outline: false });

    if (isDress) {
      const skirt = lathe([[0.0, 0.1], [0.2, 0.1], [0.24, 0.0], [0.31, -0.18], [0.36, -0.3], [0.0, -0.3]], 22);
      skirt.scale(b, 1, 0.9 * b);
      this.addPart(this.hips, skirt, this.clothMat);
    }
  }

  buildArms(a) {
    for (const [pivot, side] of [[this.armL, 1], [this.armR, -1]]) {
      pivot.rotation.set(0, 0, side * 0.12);
      const s = new Shape();
      s.add(G.capsule(0.056, 0.2, 4, 10), a.skin, { pos: [0, -0.16, 0] });
      s.add(G.sphere(0.068, 12, 10), a.skin, { pos: [0, -0.32, 0.01] });
      this.addPart(pivot, s.build());

      let sleeve = null;
      switch (a.top) {
        case 'tshirt':
        case 'salopette':
          sleeve = G.cyl(0.074, 0.084, 0.15, 12);
          sleeve.translate(0, -0.05, 0);
          break;
        case 'pull':
        case 'sweat':
          sleeve = G.cyl(0.076, 0.07, 0.3, 12);
          sleeve.translate(0, -0.13, 0);
          break;
        case 'robe':
          sleeve = G.sphere(0.09, 12, 8);
          sleeve.scale(1, 0.85, 1);
          sleeve.translate(0, -0.02, 0);
          break;
        case 'kimono':
          sleeve = G.cyl(0.08, 0.15, 0.3, 12);
          sleeve.translate(0, -0.14, -0.02);
          break;
        case 'veste': {
          const vs = new Shape();
          vs.add(G.cyl(0.08, 0.074, 0.3, 12), a.topColor, { pos: [0, -0.13, 0] });
          vs.add(G.torus(0.072, 0.016, 6, 14), darken(a.topColor, 0.15), { pos: [0, -0.27, 0], rot: [Math.PI / 2, 0, 0] });
          this.addPart(pivot, vs.build());
          break;
        }
        default:
          break;
      }
      if (sleeve) this.addPart(pivot, sleeve, this.clothMat);
      if (a.top === 'pull' || a.top === 'sweat') {
        const cuff = new Shape().add(G.torus(0.068, 0.018, 6, 14), a.topColor2, { pos: [0, -0.27, 0], rot: [Math.PI / 2, 0, 0] });
        this.addPart(pivot, cuff.build(), vertexColorToon(), { outline: false });
      }
    }
  }

  buildLegs(a, b, isDress, isOveralls) {
    const bottomCol = isOveralls ? a.topColor : a.bottomColor;
    const bottom = isOveralls ? 'pantalon' : isDress ? 'aucun' : a.bottom;

    if (bottom !== 'aucun') {
      const s = new Shape();
      s.add(G.cyl(0.2, 0.205, 0.12, 20), bottomCol, { pos: [0, -0.01, 0], scale: [b, 1, 0.86 * b] });
      if (bottom === 'jupe' || bottom === 'jupeLongue') {
        const long = bottom === 'jupeLongue';
        const skirt = lathe([[0.0, 0.05], [0.205, 0.05], [0.24, -0.02], [long ? 0.33 : 0.3, long ? -0.36 : -0.2], [0.0, long ? -0.36 : -0.2]], 22);
        skirt.scale(b, 1, 0.9 * b);
        s.add(skirt, bottomCol);
        s.add(G.torus(0.205, 0.02, 6, 22), darken(bottomCol, 0.15), { pos: [0, 0.04, 0], rot: [Math.PI / 2, 0, 0], scale: [b, 0.87 * b, 1] });
      }
      this.addPart(this.hips, s.build());
    }

    for (const pivot of [this.legL, this.legR]) {
      const s = new Shape();
      s.add(G.capsule(0.068, 0.28, 4, 10), a.skin, { pos: [0, -0.2, 0] });
      if (bottom === 'short') s.add(G.cyl(0.085, 0.09, 0.15, 12), bottomCol, { pos: [0, -0.07, 0] });
      if (bottom === 'pantalon') {
        s.add(G.cyl(0.084, 0.078, 0.34, 12), bottomCol, { pos: [0, -0.17, 0] });
        s.add(G.cyl(0.082, 0.082, 0.04, 12), darken(bottomCol, 0.12), { pos: [0, -0.34, 0] });
      }
      const sc = a.shoesColor;
      switch (a.shoes) {
        case 'bottes':
          s.add(G.cyl(0.084, 0.08, 0.2, 12), sc, { pos: [0, -0.33, 0] });
          s.add(G.sphere(0.08, 12, 8), sc, { pos: [0, -0.415, 0.03], scale: [1.05, 0.65, 1.5] });
          s.add(G.cyl(0.09, 0.09, 0.03, 12), darken(sc, 0.35), { pos: [0, -0.445, 0.02], scale: [1, 1, 1.5] });
          s.add(G.torus(0.084, 0.012, 5, 14), lighten(sc, 0.4), { pos: [0, -0.23, 0], rot: [Math.PI / 2, 0, 0] });
          break;
        case 'ballerines':
          s.add(G.sphere(0.075, 12, 8), sc, { pos: [0, -0.425, 0.03], scale: [1, 0.5, 1.55] });
          s.add(G.sphere(0.025, 6, 5), lighten(sc, 0.5), { pos: [0, -0.4, 0.12] });
          break;
        case 'sabots':
          s.add(G.box(0.15, 0.08, 0.24), sc, { pos: [0, -0.42, 0.03] });
          s.add(G.sphere(0.075, 10, 8), sc, { pos: [0, -0.41, 0.1], scale: [1, 0.7, 0.8] });
          s.add(G.box(0.16, 0.03, 0.25), darken(sc, 0.4), { pos: [0, -0.455, 0.03] });
          break;
        default:
          s.add(G.sphere(0.08, 12, 8), sc, { pos: [0, -0.41, 0.025], scale: [1, 0.72, 1.5] });
          s.add(G.sphere(0.085, 12, 8), '#ffffff', { pos: [0, -0.438, 0.028], scale: [1.02, 0.3, 1.6] });
          s.add(G.box(0.07, 0.015, 0.05), '#ffffff', { pos: [0, -0.37, 0.08], rot: [-0.5, 0, 0] });
          break;
      }
      this.addPart(pivot, s.build());
    }
  }

  buildHead(a) {
    const s = new Shape();
    s.add(G.sphere(R, 32, 24), a.skin, { pos: HC, scale: HEAD_SCALE });
    for (const side of [-1, 1]) {
      s.add(G.sphere(0.07, 10, 8), a.skin, { pos: [side * R * 1.02, 0.27, 0], scale: [0.5, 0.85, 0.7] });
    }
    this.addPart(this.head, s.build());

    this.faceTex = createFaceTextures(a);
    this.textures.push(...Object.values(this.faceTex));
    this.faceMat = shadedMaterial({
      map: this.faceTex.normal,
      gradientMap: getGradientMap(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.materials.push(this.faceMat);
    const face = new THREE.SphereGeometry(R * 1.004, 40, 24, Math.PI / 2 - FACE_PHI / 2, FACE_PHI, FACE_THETA0, FACE_THETA_LEN);
    face.scale(...HEAD_SCALE);
    face.translate(...HC);
    const faceMesh = this.addPart(this.head, face, this.faceMat, { outline: false, shadow: false });
    faceMesh.renderOrder = 1;
  }

  buildHair(a) {
    const base = a.hairColor;
    const tip = a.hairTip || base;
    const s = new Shape();
    let bottom = 0.15;
    const bottoms = { long: -0.52, carre: -0.08, queue: 0.1, couettes: 0.1, court: 0.12, chignon: 0.12, boucles: 0.0, herisse: 0.15, meche: 0.1, rase: 0.15 };
    bottom = bottoms[a.hair] ?? 0.1;
    const paint = (g) => paintGradientY(g, tip, base, bottom, bottom + 0.4);
    const cap = (scale = 1.07, tilt = -0.3, len = 0.56) => {
      s.add(new THREE.SphereGeometry(R * scale, 28, 16, 0, Math.PI * 2, 0, Math.PI * len), paint, { pos: HC, rot: [tilt, 0, 0], scale: HEAD_SCALE });
    };
    const bangs = (count, spread, y, len, size = 0.085) => {
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const az = (t - 0.5) * 2 * spread;
        const p = onHead(az, y, 1.05);
        s.add(G.sphere(size, 10, 8), paint, { pos: [p.pos[0], p.pos[1] - len * 0.2, p.pos[2]], dir: p.dir, scale: [1.15, 1 + len * 2.2, 0.55] });
      }
    };
    const blob = (pos, radii, rot = [0, 0, 0]) => s.add(G.sphere(1, 14, 10), paint, { pos, scale: radii, rot });

    switch (a.hair) {
      case 'court':
        cap();
        bangs(5, 0.75, 0.45, 0.12);
        blob([0.33, 0.3, 0.03], [0.07, 0.13, 0.1]);
        blob([-0.33, 0.3, 0.03], [0.07, 0.13, 0.1]);
        blob([0, 0.24, -0.26], [0.26, 0.18, 0.13]);
        break;
      case 'carre':
        cap();
        bangs(7, 0.8, 0.47, 0.22);
        blob([0.31, 0.17, -0.02], [0.13, 0.25, 0.27]);
        blob([-0.31, 0.17, -0.02], [0.13, 0.25, 0.27]);
        blob([0, 0.2, -0.17], [0.35, 0.29, 0.23]);
        break;
      case 'long':
        cap();
        bangs(5, 0.7, 0.44, 0.18);
        blob([0.3, 0.06, 0.06], [0.1, 0.36, 0.13], [0, 0, 0.08]);
        blob([-0.3, 0.06, 0.06], [0.1, 0.36, 0.13], [0, 0, -0.08]);
        blob([0, -0.02, -0.22], [0.35, 0.52, 0.16], [0.28, 0, 0]);
        blob([0, 0.24, -0.18], [0.36, 0.3, 0.22]);
        break;
      case 'queue':
      case 'couettes': {
        cap(1.06, -0.25, 0.58);
        bangs(a.hair === 'queue' ? 5 : 6, 0.72, 0.44, 0.16);
        const ties = a.hair === 'queue' ? [[0, 0.46, -0.37, 0]] : [[0.33, 0.4, -0.12, 1], [-0.33, 0.4, -0.12, -1]];
        const ribbon = new Shape();
        for (const [x, y, z, side] of ties) {
          ribbon.add(G.torus(0.05, 0.022, 6, 12), RIBBON, { pos: [x, y, z], rot: side === 0 ? [0.3, 0, 0] : [0, 0, Math.PI / 2 + side * 0.3] });
          const pivot = new THREE.Group();
          pivot.position.set(x, y, z);
          this.head.add(pivot);
          this.parts.push(pivot);
          const t = new Shape();
          const tb = -0.45;
          const tp = (g) => paintGradientY(g, tip, base, tb, tb + 0.4);
          if (side === 0) {
            t.add(G.sphere(1, 14, 10), tp, { pos: [0, -0.16, -0.1], scale: [0.12, 0.24, 0.12], rot: [0.45, 0, 0] });
            t.add(G.sphere(1, 12, 8), tp, { pos: [0, -0.34, -0.14], scale: [0.08, 0.14, 0.08], rot: [0.3, 0, 0] });
          } else {
            t.add(G.sphere(1, 14, 10), tp, { pos: [side * 0.05, -0.2, 0], scale: [0.1, 0.24, 0.1], rot: [0, 0, side * 0.2] });
            t.add(G.sphere(1, 12, 8), tp, { pos: [side * 0.08, -0.38, 0.01], scale: [0.07, 0.12, 0.07] });
          }
          this.addPart(pivot, t.build());
          this.tails.push({ pivot, side });
        }
        this.addPart(this.head, ribbon.build(), vertexColorToon(), { outline: false });
        break;
      }
      case 'chignon':
        cap(1.06, -0.2, 0.6);
        bangs(4, 0.55, 0.47, 0.1);
        blob([0, 0.72, -0.12], [0.16, 0.15, 0.16]);
        blob([0.3, 0.18, 0.1], [0.045, 0.17, 0.05], [0, 0, 0.1]);
        blob([-0.3, 0.18, 0.1], [0.045, 0.17, 0.05], [0, 0, -0.1]);
        s.add(G.torus(0.13, 0.025, 6, 16), RIBBON, { pos: [0, 0.62, -0.1], rot: [Math.PI / 2 - 0.3, 0, 0] });
        break;
      case 'boucles': {
        cap(1.08, -0.25, 0.58);
        for (let i = 0; i < 34; i++) {
          const az = (i * 2.399) % (Math.PI * 2);
          const el = -0.25 + ((i * 0.618) % 1) * 1.6;
          if (Math.cos(az) > 0.35 && el < 0.55) continue; // garder le visage dégagé
          const p = onHead(az, el, 1.12);
          s.add(G.sphere(0.09 + (i % 3) * 0.01, 10, 8), paint, { pos: p.pos });
        }
        bangs(5, 0.7, 0.5, 0.02, 0.09);
        break;
      }
      case 'herisse':
        cap(1.06, -0.3, 0.54);
        for (let i = 0; i < 11; i++) {
          const az = (i / 11) * Math.PI * 2;
          const el = 0.75 + (i % 2) * 0.35;
          const p = onHead(az, el, 1.0);
          s.add(G.cone(0.085, 0.24, 6).rotateX(Math.PI / 2), paint, { pos: [p.pos[0] * 1.02, p.pos[1] + 0.06, p.pos[2]], dir: [p.dir[0], p.dir[1] + 0.25, p.dir[2]] });
        }
        bangs(4, 0.5, 0.5, 0.05);
        break;
      case 'meche':
        cap();
        blob([-0.06, 0.52, 0.22], [0.27, 0.1, 0.16], [0.35, 0, 0.35]);
        blob([0.2, 0.44, 0.27], [0.12, 0.14, 0.08], [0.3, 0, -0.3]);
        blob([0.3, 0.2, 0.08], [0.07, 0.2, 0.09], [0, 0, 0.1]);
        blob([0, 0.24, -0.26], [0.26, 0.18, 0.13]);
        break;
      default: // ras
        cap(1.025, -0.3, 0.55);
        break;
    }
    // Petit épi rigolo.
    if (a.hair !== 'herisse' && a.hair !== 'rase') {
      s.add(G.cone(0.03, 0.12, 5), paint, { pos: [0.02, 0.7, 0.02], rot: [0.3, 0, -0.4] });
    }
    this.addPart(this.head, s.build());
  }

  buildHat(a) {
    if (a.hat === 'aucun') return;
    const c = a.hatColor;
    const s = new Shape();
    switch (a.hat) {
      case 'pompon':
        s.add(new THREE.SphereGeometry(R * 1.13, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), c, { pos: HC, rot: [-0.25, 0, 0], scale: HEAD_SCALE });
        s.add(G.torus(R * 1.1, 0.055, 8, 28), '#ffffff', { pos: [0, 0.37, -0.03], rot: [Math.PI / 2 - 0.25, 0, 0], scale: [HEAD_SCALE[0], 1, 1] });
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          s.add(G.sphere(0.035, 6, 5), '#ffffff', { pos: [Math.sin(a) * 0.36, 0.52 - Math.cos(a) * 0.08, Math.cos(a) * 0.34 - 0.05], scale: [1, 1, 0.6] });
        }
        s.add(G.sphere(0.14, 12, 10), '#ffffff', { pos: [0, 0.8, -0.1] });
        for (const side of [-1, 1]) {
          s.add(G.sphere(0.1, 10, 8), c, { pos: [side * 0.33, 0.24, -0.02], scale: [0.45, 1.25, 0.9] });
          s.add(G.cyl(0.012, 0.012, 0.3, 4), '#ffffff', { pos: [side * 0.34, 0.03, 0] });
          s.add(G.sphere(0.04, 6, 5), '#ffffff', { pos: [side * 0.34, -0.13, 0] });
        }
        break;
      case 'capeline':
        s.add(G.cyl(0.74, 0.74, 0.02, 32), c, { pos: [0, 0.6, -0.02], rot: [-0.16, 0, 0.04] });
        s.add(G.torus(0.74, 0.02, 5, 32), darken(c, 0.08), { pos: [0, 0.6, -0.02], rot: [Math.PI / 2 - 0.16, 0, 0.04] });
        s.add(G.cyl(0.26, 0.3, 0.22, 20), c, { pos: [0, 0.72, -0.04], rot: [-0.14, 0, 0] });
        s.add(G.cyl(0.305, 0.305, 0.07, 20), '#ffffff', { pos: [0, 0.645, -0.03], rot: [-0.14, 0, 0] });
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          s.add(G.sphere(0.05, 8, 6), '#ff6f91', { pos: [0.3 + Math.cos(a) * 0.05, 0.68 + Math.sin(a) * 0.05, 0.1], scale: [1, 1, 0.5] });
        }
        s.add(G.sphere(0.03, 6, 5), '#ffd84d', { pos: [0.3, 0.68, 0.13] });
        break;
      case 'hibiscus': {
        s.add(G.torus(0.34, 0.03, 6, 28), '#5fae55', { pos: [0, 0.57, -0.02], rot: [Math.PI / 2 - 0.25, 0, 0] });
        const cols = [c, '#ff6f91', '#ffd84d'];
        for (let i = 0; i < 6; i++) {
          const an = (i / 6) * Math.PI * 2 + 0.3;
          const x = Math.cos(an) * 0.34;
          const zz = Math.sin(an) * 0.34;
          const y = 0.57 - zz * Math.sin(0.25);
          const z = zz * Math.cos(0.25) - 0.02;
          for (let p = 0; p < 5; p++) {
            const pa = (p / 5) * Math.PI * 2;
            s.add(G.sphere(0.06, 7, 5), cols[i % cols.length], { pos: [x + Math.cos(pa) * 0.06, y + 0.03, z + Math.sin(pa) * 0.06], scale: [1, 0.45, 1] });
          }
          s.add(G.sphere(0.03, 6, 5), '#ffe27a', { pos: [x, y + 0.06, z] });
          s.add(G.sphere(0.06, 6, 5), '#5fae55', { pos: [x * 1.12, y - 0.01, z * 1.12], scale: [1.4, 0.35, 0.8] });
        }
        break;
      }
      case 'beret':
        s.add(G.sphere(0.33, 18, 10), c, { pos: [0.05, 0.66, -0.02], scale: [1.12, 0.32, 1.12], rot: [0, 0, -0.25] });
        s.add(G.cyl(0.015, 0.02, 0.07, 5), c, { pos: [0.02, 0.77, -0.02] });
        break;
      case 'casquette':
        s.add(new THREE.SphereGeometry(R * 1.11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), c, { pos: HC, rot: [-0.12, 0, 0], scale: HEAD_SCALE });
        s.add(new THREE.CylinderGeometry(0.25, 0.25, 0.025, 20, 1, false, -Math.PI / 2, Math.PI), darken(c, 0.12), { pos: [0, 0.46, 0.2], rot: [-0.2, 0, 0], scale: [1, 1, 1.3] });
        s.add(G.sphere(0.03, 6, 5), darken(c, 0.12), { pos: [0, 0.7, -0.05] });
        break;
      case 'paille':
        s.add(G.cyl(0.62, 0.62, 0.025, 28), '#f3d98f', { pos: [0, 0.6, -0.02], rot: [-0.1, 0, 0] });
        s.add(G.cyl(0.27, 0.3, 0.22, 20), '#f3d98f', { pos: [0, 0.72, -0.04], rot: [-0.1, 0, 0] });
        s.add(G.cyl(0.305, 0.305, 0.065, 20), c, { pos: [0, 0.645, -0.03], rot: [-0.1, 0, 0] });
        s.add(G.sphere(0.06, 8, 6), c, { pos: [0.28, 0.66, 0.08], scale: [1.4, 0.8, 0.5] });
        break;
      case 'bonnet':
        s.add(new THREE.SphereGeometry(R * 1.13, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), c, { pos: HC, rot: [-0.25, 0, 0], scale: HEAD_SCALE });
        s.add(G.torus(R * 1.1, 0.045, 8, 28), darken(c, 0.1), { pos: [0, 0.37, -0.03], rot: [Math.PI / 2 - 0.25, 0, 0], scale: [HEAD_SCALE[0], 1, 1] });
        s.add(G.sphere(0.1, 10, 8), '#ffffff', { pos: [0, 0.74, -0.08] });
        break;
      case 'chat':
      case 'lapin': {
        s.add(G.torus(0.375, 0.02, 5, 20, Math.PI), c, { pos: [0, 0.3, 0.02] });
        for (const side of [-1, 1]) {
          if (a.hat === 'chat') {
            s.add(G.cone(0.11, 0.18, 8), c, { pos: [side * 0.2, 0.67, 0.02], rot: [0, 0, -side * 0.4], scale: [1, 1, 0.55] });
            s.add(G.cone(0.065, 0.11, 8), '#ffb3c2', { pos: [side * 0.195, 0.65, 0.05], rot: [0, 0, -side * 0.4], scale: [1, 1, 0.4] });
          } else {
            s.add(G.sphere(0.075, 12, 10), c, { pos: [side * 0.12, 0.9, -0.02], rot: [0, 0, -side * 0.15], scale: [1, 3.3, 0.5] });
            s.add(G.sphere(0.045, 10, 8), '#ffb3c2', { pos: [side * 0.12, 0.9, 0.01], rot: [0, 0, -side * 0.15], scale: [1, 3.8, 0.4] });
          }
        }
        break;
      }
      case 'fleurs': {
        s.add(G.torus(0.34, 0.028, 6, 28), '#5fae55', { pos: [0, 0.57, -0.02], rot: [Math.PI / 2 - 0.25, 0, 0] });
        const cols = [c, '#ffffff', '#ffd84d', lighten(c, 0.4)];
        for (let i = 0; i < 10; i++) {
          const an = (i / 10) * Math.PI * 2;
          const x = Math.cos(an) * 0.34;
          const zz = Math.sin(an) * 0.34;
          const y = 0.57 - zz * Math.sin(0.25);
          const z = zz * Math.cos(0.25) - 0.02;
          for (let p = 0; p < 5; p++) {
            const pa = (p / 5) * Math.PI * 2;
            s.add(G.sphere(0.035, 6, 5), cols[i % cols.length], { pos: [x + Math.cos(pa) * 0.035, y + 0.02, z + Math.sin(pa) * 0.035], scale: [1, 0.6, 1] });
          }
          s.add(G.sphere(0.022, 6, 5), '#ffcf3a', { pos: [x, y + 0.035, z] });
        }
        break;
      }
      case 'noeud': {
        const p = onHead(0.65, 0.75, 1.1);
        const bow = new Shape();
        bow.add(G.sphere(0.1, 12, 8), c, { pos: [0.11, 0, 0], scale: [1.35, 1, 0.5], rot: [0, 0, -0.3] });
        bow.add(G.sphere(0.1, 12, 8), c, { pos: [-0.11, 0, 0], scale: [1.35, 1, 0.5], rot: [0, 0, 0.3] });
        bow.add(G.sphere(0.05, 8, 6), darken(c, 0.12), { scale: [1, 1, 0.8] });
        const g = bow.build();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...p.dir).normalize());
        g.applyQuaternion(q);
        g.translate(...p.pos);
        s.addRaw(g);
        break;
      }
      case 'grenouille':
        s.add(new THREE.SphereGeometry(R * 1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.53), c, { pos: HC, rot: [-0.22, 0, 0], scale: HEAD_SCALE });
        for (const side of [-1, 1]) {
          s.add(G.sphere(0.1, 12, 10), c, { pos: [side * 0.16, 0.7, 0.1] });
          s.add(G.sphere(0.065, 10, 8), '#ffffff', { pos: [side * 0.16, 0.72, 0.17] });
          s.add(G.sphere(0.035, 8, 6), '#2b1d1d', { pos: [side * 0.16, 0.72, 0.22] });
        }
        s.add(G.torus(0.08, 0.012, 5, 12, Math.PI), '#e5484d', { pos: [0, 0.6, 0.33], rot: [0.2, 0, Math.PI] });
        break;
      case 'fleur': {
        const p = onHead(0.75, 0.55, 1.08);
        const fl = new Shape();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          fl.add(G.sphere(0.07, 10, 8), c, { pos: [Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0], scale: [1.2, 0.8, 0.35], rot: [0, 0, a] });
        }
        fl.add(G.sphere(0.045, 8, 6), '#ffd84d', { pos: [0, 0, 0.02] });
        fl.add(G.sphere(0.06, 8, 6), '#5fae55', { pos: [-0.12, -0.08, -0.02], scale: [1.4, 0.5, 0.3], rot: [0, 0, 0.6] });
        const g = fl.build();
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...p.dir).normalize()));
        g.translate(...p.pos);
        s.addRaw(g);
        break;
      }
      case 'couronne':
        s.add(G.cyl(0.25, 0.23, 0.1, 20, true), '#ffd166', { pos: [0, 0.68, -0.02], rot: [-0.12, 0, 0] });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          s.add(G.cone(0.05, 0.11, 4), '#ffd166', { pos: [Math.sin(a) * 0.235, 0.78 - Math.cos(a) * 0.02, Math.cos(a) * 0.235 - 0.02] });
          if (i % 2 === 0) s.add(G.sphere(0.03, 6, 5), c, { pos: [Math.sin(a) * 0.25, 0.69, Math.cos(a) * 0.25 - 0.02] });
        }
        break;
      case 'chef':
        s.add(G.cyl(0.27, 0.26, 0.2, 18), '#ffffff', { pos: [0, 0.66, -0.03], rot: [-0.12, 0, 0] });
        s.add(G.cyl(0.275, 0.275, 0.05, 18), c, { pos: [0, 0.6, -0.02], rot: [-0.12, 0, 0] });
        for (const [x, z] of [[0, 0], [0.13, 0.06], [-0.13, 0.06], [0.1, -0.12], [-0.1, -0.12]]) s.add(G.sphere(0.16, 12, 8), '#ffffff', { pos: [x, 0.86, z - 0.05] });
        break;
      case 'marin':
        s.add(new THREE.SphereGeometry(R * 1.1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), '#ffffff', { pos: HC, rot: [-0.15, 0, 0], scale: HEAD_SCALE });
        s.add(G.cyl(0.4, 0.42, 0.06, 22, true), '#ffffff', { pos: [0, 0.55, -0.01], rot: [-0.15, 0, 0] });
        s.add(G.torus(0.36, 0.025, 5, 22), c, { pos: [0, 0.58, -0.01], rot: [Math.PI / 2 - 0.15, 0, 0] });
        break;
      case 'etoile': {
        s.add(G.torus(0.375, 0.02, 5, 20, Math.PI), c, { pos: [0, 0.3, 0.02] });
        const st = new THREE.Shape();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 0.05 : 0.12;
          const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
          if (i === 0) st.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else st.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        const sg = new THREE.ExtrudeGeometry(st, { depth: 0.04, bevelEnabled: false });
        s.add(sg, '#ffd84d', { pos: [0.12, 0.78, 0.0], rot: [0, 0, -0.3] });
        break;
      }
      case 'ours':
        s.add(G.torus(0.375, 0.02, 5, 20, Math.PI), c, { pos: [0, 0.3, 0.02] });
        for (const side of [-1, 1]) {
          s.add(G.sphere(0.1, 12, 10), c, { pos: [side * 0.25, 0.64, 0.0], scale: [1, 1, 0.55] });
          s.add(G.sphere(0.06, 10, 8), '#ffd6c2', { pos: [side * 0.25, 0.63, 0.04], scale: [1, 1, 0.4] });
        }
        break;
      case 'melon':
        s.add(new THREE.SphereGeometry(0.27, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), c, { pos: [0, 0.66, -0.03], scale: [1, 0.9, 1], rot: [-0.12, 0, 0] });
        s.add(G.cyl(0.4, 0.4, 0.03, 22), c, { pos: [0, 0.66, -0.03], rot: [-0.12, 0, 0] });
        s.add(G.cyl(0.275, 0.275, 0.05, 20), darken(c, 0.35), { pos: [0, 0.69, -0.03], rot: [-0.12, 0, 0] });
        break;
      case 'cowboy':
        s.add(new THREE.CylinderGeometry(0.65, 0.65, 0.03, 26), c, { pos: [0, 0.62, -0.03], rot: [-0.1, 0, 0], scale: [1, 1, 0.85] });
        for (const side of [-1, 1]) s.add(G.box(0.18, 0.03, 0.8), c, { pos: [side * 0.58, 0.7, -0.03], rot: [-0.1, 0, side * -0.6] });
        s.add(G.cyl(0.24, 0.28, 0.3, 16), c, { pos: [0, 0.78, -0.04], rot: [-0.1, 0, 0] });
        s.add(G.sphere(0.2, 10, 6), darken(c, 0.12), { pos: [0, 0.93, -0.05], scale: [1.2, 0.3, 1] });
        s.add(G.cyl(0.285, 0.285, 0.06, 16), darken(c, 0.4), { pos: [0, 0.67, -0.03], rot: [-0.1, 0, 0] });
        break;
      case 'casque':
        s.add(new THREE.SphereGeometry(R * 1.14, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), c, { pos: HC, rot: [-0.18, 0, 0], scale: HEAD_SCALE });
        for (const x of [-0.12, 0, 0.12]) s.add(G.box(0.05, 0.03, 0.62), '#ffffff', { pos: [x, 0.7 - Math.abs(x) * 0.5, -0.05], rot: [-0.18, 0, x * 1.4] });
        s.add(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), darken(c, 0.2), { pos: [0, 0.42, 0.22], rot: [-0.35, 0, 0], scale: [1, 1, 0.8] });
        for (const side of [-1, 1]) s.add(G.box(0.02, 0.3, 0.03), '#3d3744', { pos: [side * 0.36, 0.2, 0.05], rot: [0, 0, side * 0.1] });
        break;
      case 'bandeau': {
        s.add(G.torus(R * 1.08, 0.035, 6, 28), c, { pos: [0, 0.5, -0.02], rot: [Math.PI / 2 - 0.35, 0, 0], scale: [HEAD_SCALE[0], 1, 1] });
        const p = onHead(0.8, 0.6, 1.1);
        const bow = new Shape();
        bow.add(G.sphere(0.07, 10, 8), c, { pos: [0.08, 0, 0], scale: [1.4, 1, 0.5], rot: [0, 0, -0.3] });
        bow.add(G.sphere(0.07, 10, 8), c, { pos: [-0.08, 0, 0], scale: [1.4, 1, 0.5], rot: [0, 0, 0.3] });
        bow.add(G.sphere(0.035, 8, 6), darken(c, 0.15), {});
        const g = bow.build();
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...p.dir).normalize()));
        g.translate(...p.pos);
        s.addRaw(g);
        break;
      }
      case 'aureole':
        s.add(G.torus(0.2, 0.035, 8, 28), '#ffe27a', { pos: [0, 0.98, -0.02], rot: [Math.PI / 2 - 0.1, 0, 0] });
        s.add(G.torus(0.2, 0.015, 6, 28), '#fff6c9', { pos: [0, 1.0, -0.02], rot: [Math.PI / 2 - 0.1, 0, 0] });
        break;
      case 'chatBonnet':
        s.add(new THREE.SphereGeometry(R * 1.13, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), c, { pos: HC, rot: [-0.22, 0, 0], scale: HEAD_SCALE });
        s.add(G.torus(R * 1.1, 0.045, 8, 28), lighten(c, 0.4), { pos: [0, 0.37, -0.03], rot: [Math.PI / 2 - 0.22, 0, 0], scale: [HEAD_SCALE[0], 1, 1] });
        for (const side of [-1, 1]) {
          s.add(G.cone(0.11, 0.2, 8), c, { pos: [side * 0.2, 0.72, -0.02], rot: [0, 0, -side * 0.35], scale: [1, 1, 0.55] });
          s.add(G.cone(0.065, 0.12, 8), '#ffb3c2', { pos: [side * 0.195, 0.7, 0.02], rot: [0, 0, -side * 0.35], scale: [1, 1, 0.4] });
        }
        break;
      case 'capitaine':
        s.add(G.cyl(0.3, 0.26, 0.16, 20), '#ffffff', { pos: [0, 0.66, -0.03], rot: [-0.12, 0, 0], scale: [1.05, 1, 1.05] });
        s.add(G.cyl(0.27, 0.27, 0.07, 20), '#2e2e3a', { pos: [0, 0.6, -0.02], rot: [-0.12, 0, 0] });
        s.add(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 20, 1, false, -Math.PI / 2, Math.PI), '#2e2e3a', { pos: [0, 0.56, 0.2], rot: [-0.25, 0, 0], scale: [1, 1, 1.1] });
        s.add(G.torus(0.27, 0.015, 4, 20), '#ffd84d', { pos: [0, 0.64, -0.02], rot: [Math.PI / 2 - 0.12, 0, 0] });
        s.add(G.sphere(0.045, 8, 6), '#ffd84d', { pos: [0, 0.68, 0.27], scale: [1, 1, 0.4] });
        break;
      case 'pasteque': {
        // Demi-écorce de pastèque en casque, bord blanc puis rouge, petite queue.
        const dome = (r, col, a0, len, segs) => s.add(new THREE.SphereGeometry(r, segs, 12, a0, len, 0, Math.PI * 0.52), col, { pos: HC, rot: [-0.22, 0, 0], scale: HEAD_SCALE });
        dome(R * 1.14, '#3f9d4a', 0, Math.PI * 2, 24);
        for (let i = 0; i < 9; i++) dome(R * 1.152, '#24693a', (i / 9) * Math.PI * 2, 0.24, 3);
        s.add(G.torus(R * 1.12, 0.04, 8, 28), '#f4f7e8', { pos: [0, 0.37, -0.03], rot: [Math.PI / 2 - 0.22, 0, 0], scale: [HEAD_SCALE[0], 1, 1] });
        s.add(G.torus(R * 1.07, 0.03, 8, 28), '#ff5a6e', { pos: [0, 0.35, -0.03], rot: [Math.PI / 2 - 0.22, 0, 0], scale: [HEAD_SCALE[0], 1, 1] });
        s.add(G.cyl(0.025, 0.035, 0.12, 6), '#8a6a3a', { pos: [0, 0.74, -0.12], rot: [-0.22, 0, 0.2] });
        break;
      }
      case 'tasse':
        s.add(G.cyl(0.26, 0.26, 0.025, 20), '#ffffff', { pos: [0.04, 0.64, -0.02], rot: [-0.1, 0, -0.15] });
        s.add(G.cyl(0.16, 0.12, 0.2, 18), c, { pos: [0.06, 0.76, -0.02], rot: [-0.1, 0, -0.15] });
        s.add(G.cyl(0.15, 0.15, 0.02, 16), '#b8704a', { pos: [0.07, 0.86, -0.03], rot: [-0.1, 0, -0.15] });
        s.add(G.torus(0.06, 0.018, 5, 10), c, { pos: [0.23, 0.77, -0.02], rot: [0, 0, -0.15] });
        break;
      case 'sorciere':
        s.add(G.cyl(0.52, 0.52, 0.025, 28), c, { pos: [0, 0.6, -0.02], rot: [-0.1, 0, 0] });
        s.add(G.cone(0.29, 0.5, 20), c, { pos: [0, 0.86, -0.05], rot: [-0.18, 0, 0] });
        s.add(G.cone(0.1, 0.22, 12), c, { pos: [0, 1.15, -0.16], rot: [-0.7, 0, 0] });
        s.add(G.cyl(0.285, 0.29, 0.07, 20), '#b69cf0', { pos: [0, 0.65, -0.03], rot: [-0.1, 0, 0] });
        s.add(G.box(0.08, 0.07, 0.02), '#ffd84d', { pos: [0, 0.65, 0.26], rot: [-0.1, 0, 0] });
        break;
      default:
        break;
    }
    if (!s.empty) this.addPart(this.head, s.build());
  }

  buildGlasses(a) {
    if (a.glasses === 'aucune') return;
    const c = a.glassesColor;
    const s = new Shape();
    const ex = 0.118;
    const ey = 0.23;
    const ez = 0.37;
    for (const side of [-1, 1]) {
      const x = side * ex;
      switch (a.glasses) {
        case 'rondes':
          s.add(G.torus(0.07, 0.012, 6, 20), c, { pos: [x, ey, ez], rot: [0, side * 0.2, 0] });
          break;
        case 'carrees':
          s.add(G.torus(0.085, 0.013, 4, 4), c, { pos: [x, ey, ez], rot: [0, side * 0.2, Math.PI / 4], scale: [1.15, 0.85, 1] });
          break;
        case 'soleil':
          s.add(G.cyl(0.078, 0.078, 0.012, 18), '#2e2e3a', { pos: [x, ey, ez], rot: [Math.PI / 2, side * 0.2, 0], order: 'YXZ' });
          s.add(G.torus(0.078, 0.012, 6, 20), c, { pos: [x, ey, ez + 0.005], rot: [0, side * 0.2, 0] });
          break;
        case 'etoiles': {
          const st = new THREE.Shape();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 ? 0.04 : 0.09;
            const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
            if (i === 0) st.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else st.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          s.add(new THREE.ExtrudeGeometry(st, { depth: 0.015, bevelEnabled: false }), c, { pos: [x, ey, ez - 0.01], rot: [0, side * 0.2, 0] });
          break;
        }
        case 'aviateur': {
          s.add(G.sphere(0.085, 14, 10), '#3d3744', { pos: [x, ey - 0.01, ez - 0.02], scale: [1, 0.85, 0.2], rot: [0, side * 0.2, 0] });
          s.add(G.torus(0.082, 0.01, 5, 18), c, { pos: [x, ey - 0.01, ez], rot: [0, side * 0.2, 0], scale: [1, 0.85, 1] });
          break;
        }
        case 'plongee':
          if (side === 1) {
            s.add(G.box(0.46, 0.2, 0.06), '#7fdcbd', { pos: [0, ey, ez - 0.01] });
            s.add(G.box(0.4, 0.15, 0.05), '#dff4ff', { pos: [0, ey, ez + 0.02] });
            s.add(G.torus(0.36, 0.02, 4, 20), '#2e2e3a', { pos: [0, ey, 0.02], rot: [Math.PI / 2, 0, 0], scale: [1.05, 1, 1] });
            s.add(G.cyl(0.025, 0.025, 0.5, 6), '#ffd84d', { pos: [0.34, ey + 0.2, 0.05] });
          }
          break;
        case 'lune': {
          const ms = new THREE.Shape();
          ms.absarc(0, 0, 0.085, 0.5, Math.PI * 2 - 0.5, false);
          ms.absarc(0.05, 0, 0.065, Math.PI * 2 - 0.9, 0.9, true);
          s.add(new THREE.ExtrudeGeometry(ms, { depth: 0.015, bevelEnabled: false, curveSegments: 10 }), '#ffd84d', { pos: [x, ey, ez - 0.01], rot: [0, side * 0.2, side < 0 ? Math.PI : 0] });
          break;
        }
        case 'pasteque': {
          // Verres en tranche de pastèque (écorce en bas), quelques pépins.
          const o = { pos: [x, ey + 0.03, ez], rot: [0, side * 0.2, 0] };
          s.add(new THREE.RingGeometry(0.078, 0.098, 18, 1, Math.PI, Math.PI), '#3f9d4a', o);
          s.add(new THREE.CircleGeometry(0.078, 18, Math.PI, Math.PI), '#ff5a6e', { ...o, pos: [x, ey + 0.03, ez + 0.002] });
          for (const [dx, dy] of [[-0.03, -0.03], [0, -0.05], [0.03, -0.03]]) s.add(G.sphere(0.007, 5, 4), '#2b2420', { pos: [x + dx, ey + 0.03 + dy, ez + 0.006], scale: [0.7, 1.2, 0.4] });
          break;
        }
        case 'monocle':
          if (side === -1) {
            s.add(G.torus(0.075, 0.012, 6, 20), '#ffd166', { pos: [x, ey, ez], rot: [0, side * 0.2, 0] });
            s.add(G.cyl(0.07, 0.07, 0.005, 16), '#e8f6ff', { pos: [x, ey, ez], rot: [Math.PI / 2, side * 0.2, 0], order: 'YXZ' });
            s.add(G.cyl(0.005, 0.005, 0.35, 4), '#ffd166', { pos: [x - 0.05, ey - 0.2, ez - 0.05], rot: [0.2, 0, 0.3] });
          }
          break;
        case 'coeur': {
          const hs = new THREE.Shape();
          hs.moveTo(0, -0.07);
          hs.bezierCurveTo(-0.1, 0.0, -0.05, 0.08, 0, 0.035);
          hs.bezierCurveTo(0.05, 0.08, 0.1, 0.0, 0, -0.07);
          const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.015, bevelEnabled: false, curveSegments: 8 });
          s.add(hg, c, { pos: [x, ey, ez - 0.01], rot: [0, side * 0.2, 0] });
          break;
        }
        default:
          break;
      }
      // Branches jusqu'aux oreilles.
      if (a.glasses !== 'monocle' && a.glasses !== 'plongee') s.add(G.box(0.012, 0.012, 0.3), a.glasses === 'coeur' || a.glasses === 'lune' ? '#4e4c62' : c, { pos: [side * 0.345, ey + 0.01, 0.2], rot: [0, side * 0.2, 0] });
    }
    if (a.glasses !== 'monocle' && a.glasses !== 'plongee') s.add(G.cyl(0.008, 0.008, 0.08, 4), a.glasses === 'coeur' ? '#4e4c62' : c, { pos: [0, ey + 0.015, ez + 0.01], rot: [0, 0, Math.PI / 2] });
    this.addPart(this.head, s.build(), vertexColorToon(), { outline: false, shadow: false });
  }

  buildBack(a, b) {
    const c = a.backColor;
    switch (a.back) {
      case 'sac': {
        const s = new Shape();
        s.add(G.box(0.3, 0.32, 0.13), c, { pos: [0, 0.23, -0.25 * b] });
        s.add(G.sphere(0.15, 12, 8), c, { pos: [0, 0.38, -0.25 * b], scale: [1, 0.35, 0.45] });
        s.add(G.box(0.2, 0.12, 0.05), darken(c, 0.15), { pos: [0, 0.15, -0.325 * b] });
        s.add(G.sphere(0.02, 6, 5), '#ffd84d', { pos: [0, 0.3, -0.33 * b] });
        for (const x of [-0.1, 0.1]) {
          s.add(G.box(0.035, 0.3, 0.02), darken(c, 0.2), { pos: [x, 0.24, 0.175 * b], rot: [-0.1, 0, 0] });
          s.add(G.box(0.035, 0.03, 0.4 * b), darken(c, 0.2), { pos: [x, 0.39, 0] });
        }
        this.addPart(this.torso, s.build());
        break;
      }
      case 'ailes': {
        for (const side of [1, -1]) {
          const pivot = new THREE.Group();
          pivot.position.set(side * 0.04, 0.28, -0.17 * b);
          this.torso.add(pivot);
          this.parts.push(pivot);
          const s = new Shape();
          s.add(G.sphere(1, 16, 10), lighten(c, 0.35), { pos: [side * 0.22, 0.1, -0.02], scale: [0.25, 0.13, 0.015], rot: [0, 0, side * 0.55] });
          s.add(G.sphere(1, 16, 10), lighten(c, 0.1), { pos: [side * 0.22, 0.1, -0.03], scale: [0.18, 0.08, 0.016], rot: [0, 0, side * 0.55] });
          s.add(G.sphere(1, 14, 8), lighten(c, 0.35), { pos: [side * 0.15, -0.09, -0.02], scale: [0.15, 0.09, 0.015], rot: [0, 0, -side * 0.45] });
          const mat = shadedMaterial({ vertexColors: true, gradientMap: getGradientMap(), transparent: true, opacity: 0.85, side: THREE.DoubleSide, emissive: lighten(c, 0.6), emissiveIntensity: 0.25 });
          this.materials.push(mat);
          const m = this.addPart(pivot, s.build(), mat, { outline: false });
          m.castShadow = false;
          this.wings.push({ pivot, side });
        }
        break;
      }
      case 'cape': {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.42, 0);
        this.torso.add(pivot);
        this.parts.push(pivot);
        const g = new THREE.CylinderGeometry(0.2 * b, 0.38 * b, 0.8, 18, 1, true, Math.PI * 0.62, Math.PI * 0.76);
        g.translate(0, -0.4, 0);
        const s = new Shape();
        s.add(g, c);
        const mat = shadedMaterial({ vertexColors: true, gradientMap: getGradientMap(), side: THREE.DoubleSide });
        this.materials.push(mat);
        this.addPart(pivot, s.build(), mat, { outline: false });
        const col = new Shape();
        col.add(G.torus(0.1, 0.03, 6, 16), darken(c, 0.15), { pos: [0, 0.43, 0], rot: [Math.PI / 2, 0, 0] });
        col.add(G.sphere(0.03, 6, 5), '#ffd84d', { pos: [0, 0.41, 0.1] });
        this.addPart(this.torso, col.build(), vertexColorToon(), { outline: false });
        this.cape = pivot;
        break;
      }
      case 'echarpe': {
        const s = new Shape();
        s.add(G.torus(0.12, 0.052, 8, 18), c, { pos: [0, 0.43, 0], rot: [Math.PI / 2, 0, 0] });
        s.add(G.torus(0.12, 0.054, 8, 18, Math.PI * 2), lighten(c, 0.6), { pos: [0, 0.43, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.3] });
        s.add(G.box(0.085, 0.24, 0.035), c, { pos: [0.08, 0.3, 0.185 * b], rot: [-0.15, 0, 0.12] });
        for (let i = 0; i < 3; i++) s.add(G.box(0.012, 0.04, 0.012), lighten(c, 0.6), { pos: [0.055 + i * 0.022, 0.165, 0.2 * b] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'panier': {
        const s = new Shape();
        s.add(G.cyl(0.18, 0.15, 0.3, 14), '#c98b58', { pos: [0, 0.24, -0.3 * b] });
        s.add(G.torus(0.18, 0.025, 5, 14), '#d9a86c', { pos: [0, 0.39, -0.3 * b], rot: [Math.PI / 2, 0, 0] });
        const fr = ['#e5484d', '#ffd84d', '#6fcf97'];
        for (let i = 0; i < 3; i++) s.add(G.sphere(0.07, 8, 6), fr[i], { pos: [-0.07 + i * 0.07, 0.42, -0.3 * b + (i % 2) * 0.05] });
        s.add(G.sphere(0.08, 8, 6), '#5fae55', { pos: [0.05, 0.47, -0.34 * b], scale: [1, 0.4, 1] });
        for (const x of [-0.1, 0.1]) s.add(G.box(0.035, 0.3, 0.02), '#a0785a', { pos: [x, 0.24, 0.175 * b], rot: [-0.1, 0, 0] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'nounours': {
        const s = new Shape();
        s.add(G.sphere(0.15, 12, 10), c, { pos: [0, 0.18, -0.27 * b], scale: [1, 1.1, 0.8] });
        s.add(G.sphere(0.12, 12, 10), c, { pos: [0, 0.4, -0.27 * b] });
        for (const side of [-1, 1]) {
          s.add(G.sphere(0.05, 8, 6), c, { pos: [side * 0.1, 0.5, -0.27 * b] });
          s.add(G.sphere(0.05, 8, 6), c, { pos: [side * 0.14, 0.24, -0.25 * b] });
        }
        s.add(G.sphere(0.05, 8, 6), lighten(c, 0.5), { pos: [0, 0.37, -0.37 * b] });
        s.add(G.sphere(0.02, 6, 5), '#2b1d1d', { pos: [0, 0.39, -0.41 * b] });
        for (const side of [-1, 1]) s.add(G.sphere(0.018, 6, 5), '#2b1d1d', { pos: [side * 0.045, 0.44, -0.38 * b] });
        for (const x of [-0.1, 0.1]) s.add(G.box(0.035, 0.3, 0.02), darken(c, 0.3), { pos: [x, 0.24, 0.175 * b], rot: [-0.1, 0, 0] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'guitare': {
        const s = new Shape();
        const g = new Shape();
        g.add(G.sphere(0.16, 14, 10), c, { pos: [0, 0, 0], scale: [1, 1, 0.3] });
        g.add(G.sphere(0.12, 14, 10), c, { pos: [0, 0.18, 0], scale: [1, 1, 0.3] });
        g.add(G.cyl(0.045, 0.045, 0.015, 12), '#3d3744', { pos: [0, 0.08, 0.05], rot: [Math.PI / 2, 0, 0] });
        g.add(G.box(0.06, 0.45, 0.04), '#8f6243', { pos: [0, 0.48, 0] });
        g.add(G.box(0.09, 0.1, 0.05), '#6b4a3a', { pos: [0, 0.74, 0] });
        const geo = g.build();
        geo.rotateZ(0.7);
        geo.translate(0, 0.2, -0.3 * b);
        s.addRaw(geo);
        s.add(G.box(0.03, 0.6, 0.02), '#6b4a3a', { pos: [0, 0.22, 0.18 * b], rot: [0, 0, 0.7] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'papillon': {
        for (const side of [1, -1]) {
          const pivot = new THREE.Group();
          pivot.position.set(side * 0.04, 0.28, -0.17 * b);
          this.torso.add(pivot);
          this.parts.push(pivot);
          const s = new Shape();
          s.add(G.sphere(1, 16, 10), c, { pos: [side * 0.2, 0.12, -0.02], scale: [0.22, 0.2, 0.015], rot: [0, 0, side * 0.3] });
          s.add(G.sphere(1, 12, 8), lighten(c, 0.6), { pos: [side * 0.24, 0.16, -0.03], scale: [0.08, 0.07, 0.016] });
          s.add(G.sphere(1, 14, 8), darken(c, 0.2), { pos: [side * 0.15, -0.1, -0.02], scale: [0.13, 0.12, 0.015], rot: [0, 0, -side * 0.4] });
          s.add(G.sphere(1, 10, 8), '#2e2e3a', { pos: [side * 0.33, 0.24, -0.025], scale: [0.03, 0.03, 0.016] });
          const mat = shadedMaterial({ vertexColors: true, gradientMap: getGradientMap(), side: THREE.DoubleSide });
          this.materials.push(mat);
          const m = this.addPart(pivot, s.build(), mat, { outline: false });
          m.castShadow = false;
          this.wings.push({ pivot, side });
        }
        break;
      }
      case 'sacPasteque': {
        // Sac à dos en tranche de pastèque (le côté plat en haut).
        const s = new Shape();
        const half = (r, col, d, z) => {
          const sh = new THREE.Shape();
          sh.absarc(0, 0, r, Math.PI, Math.PI * 2, false);
          sh.lineTo(-r, 0);
          const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 16 });
          g.translate(0, 0, -d / 2);
          s.add(g, col, { pos: [0, 0.36, z] });
        };
        half(0.2, '#3f9d4a', 0.12, -0.26 * b);
        half(0.18, '#f4f7e8', 0.13, -0.26 * b);
        half(0.165, '#ff5a6e', 0.14, -0.26 * b);
        for (const [x, y] of [[-0.08, -0.05], [0, -0.1], [0.08, -0.05], [-0.04, -0.02], [0.04, -0.02]]) s.add(G.sphere(0.012, 5, 4), '#2b2420', { pos: [x, 0.36 + y, -0.26 * b - 0.072], scale: [0.7, 1.2, 0.4] });
        for (const x of [-0.1, 0.1]) {
          s.add(G.box(0.035, 0.3, 0.02), '#24693a', { pos: [x, 0.24, 0.175 * b], rot: [-0.1, 0, 0] });
          s.add(G.box(0.035, 0.03, 0.4 * b), '#24693a', { pos: [x, 0.39, 0] });
        }
        this.addPart(this.torso, s.build());
        break;
      }
      case 'sacChat': {
        const s = new Shape();
        s.add(G.box(0.3, 0.3, 0.14), c, { pos: [0, 0.23, -0.26 * b] });
        for (const x of [-0.1, 0.1]) {
          s.add(G.cone(0.06, 0.1, 4), c, { pos: [x, 0.42, -0.26 * b], rot: [0, Math.PI / 4, 0] });
          s.add(G.sphere(0.025, 6, 5), '#2b1d1d', { pos: [x * 0.7, 0.27, -0.34 * b] });
        }
        s.add(G.sphere(0.02, 6, 5), '#ff8fab', { pos: [0, 0.22, -0.34 * b] });
        for (const x of [-0.1, 0.1]) s.add(G.box(0.035, 0.3, 0.02), darken(c, 0.25), { pos: [x, 0.24, 0.175 * b], rot: [-0.1, 0, 0] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'surf': {
        const s = new Shape();
        const board = new Shape();
        board.add(G.sphere(1, 16, 10), c, { scale: [0.2, 0.62, 0.04] });
        board.add(G.box(0.03, 1.1, 0.085), '#ffffff', {});
        board.add(G.sphere(1, 10, 6), lighten(c, 0.35), { pos: [0, -0.35, 0.02], scale: [0.14, 0.12, 0.03] });
        board.add(G.cone(0.05, 0.12, 4), '#3d3744', { pos: [0, -0.52, -0.05], rot: [Math.PI / 2, 0, 0], scale: [0.3, 1, 1] });
        const geo = board.build();
        geo.rotateZ(0.35);
        geo.translate(0, 0.25, -0.3 * b);
        s.addRaw(geo);
        s.add(G.box(0.03, 0.6, 0.02), '#6b4a3a', { pos: [0, 0.22, 0.18 * b], rot: [0, 0, 0.35] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'luge': {
        const s = new Shape();
        const sl = new Shape();
        for (const x of [-0.14, 0.14]) {
          sl.add(G.box(0.03, 0.62, 0.03), '#c0584a', { pos: [x, 0, 0.06] });
          sl.add(G.torus(0.06, 0.015, 5, 10, Math.PI), '#c0584a', { pos: [x, 0.31, 0.02], rot: [0, Math.PI / 2, 0] });
        }
        for (let i = 0; i < 5; i++) sl.add(G.box(0.36, 0.08, 0.025), i % 2 ? '#e8c9a0' : c, { pos: [0, -0.24 + i * 0.12, 0] });
        const geo = sl.build();
        geo.rotateZ(-0.2);
        geo.translate(0, 0.22, -0.28 * b);
        s.addRaw(geo);
        for (const x of [-0.12, 0.12]) s.add(G.box(0.03, 0.34, 0.02), '#6b4a3a', { pos: [x, 0.24, 0.175 * b], rot: [-0.1, 0, 0] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'sacRando': {
        const s = new Shape();
        s.add(G.box(0.36, 0.5, 0.2), c, { pos: [0, 0.2, -0.28 * b] });
        s.add(G.cyl(0.1, 0.1, 0.42, 10), '#6fcf97', { pos: [0, 0.5, -0.28 * b], rot: [0, 0, Math.PI / 2] });
        s.add(G.box(0.26, 0.16, 0.06), darken(c, 0.2), { pos: [0, 0.08, -0.4 * b] });
        s.add(G.cyl(0.015, 0.015, 0.6, 4), '#b8c0cc', { pos: [0.2, 0.2, -0.32 * b], rot: [0.2, 0, 0.3] });
        for (const x of [-0.12, 0.12]) s.add(G.box(0.04, 0.34, 0.02), darken(c, 0.3), { pos: [x, 0.24, 0.175 * b], rot: [-0.1, 0, 0] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'filet': {
        const s = new Shape();
        s.add(G.cyl(0.018, 0.018, 1.0, 6), '#b98457', { pos: [0.02, 0.35, -0.24 * b], rot: [0, 0, 0.5] });
        s.add(G.torus(0.13, 0.015, 5, 14), '#fffaf2', { pos: [0.3, 0.8, -0.24 * b], rot: [0, 0, 0.5] });
        s.add(G.cone(0.12, 0.25, 10), '#e8f3ff', { pos: [0.24, 0.72, -0.28 * b], rot: [0.3, 0, 0.5 + Math.PI] });
        for (const x of [-0.1, 0.1]) s.add(G.box(0.03, 0.3, 0.02), '#8f6243', { pos: [x, 0.24, 0.175 * b], rot: [-0.1, 0, 0] });
        this.addPart(this.torso, s.build());
        break;
      }
      case 'ailesAnge':
      case 'ailesArcEnCiel': {
        const rainbow = ['#ff6f91', '#ffb27a', '#ffd84d', '#b5e48c', '#8fd6e8', '#b69cf0'];
        for (const side of [1, -1]) {
          const pivot = new THREE.Group();
          pivot.position.set(side * 0.04, 0.3, -0.17 * b);
          this.torso.add(pivot);
          this.parts.push(pivot);
          const s = new Shape();
          if (a.back === 'ailesAnge') {
            for (let i = 0; i < 5; i++) s.add(G.sphere(1, 12, 8), i % 2 ? '#ffffff' : '#f4f1ea', { pos: [side * (0.12 + i * 0.06), 0.18 - i * 0.07, -0.02 - i * 0.005], scale: [0.2 - i * 0.02, 0.07, 0.02], rot: [0, 0, side * (0.5 - i * 0.18)] });
          } else {
            rainbow.forEach((col, i) => s.add(G.sphere(1, 14, 8), col, { pos: [side * 0.2, 0.1 - i * 0.012, -0.02 - i * 0.004], scale: [0.26 - i * 0.03, 0.15 - i * 0.017, 0.015], rot: [0, 0, side * 0.45] }));
            rainbow.forEach((col, i) => i % 2 === 0 && s.add(G.sphere(1, 12, 8), col, { pos: [side * 0.14, -0.1, -0.02 - i * 0.004], scale: [0.14 - i * 0.02, 0.09 - i * 0.012, 0.015], rot: [0, 0, -side * 0.45] }));
          }
          const mat = shadedMaterial({ vertexColors: true, gradientMap: getGradientMap(), side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: a.back === 'ailesAnge' ? 0.15 : 0.08 });
          this.materials.push(mat);
          const m = this.addPart(pivot, s.build(), mat, { outline: false });
          m.castShadow = false;
          this.wings.push({ pivot, side });
        }
        break;
      }
      case 'queueRenard': {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.03, -0.17 * b);
        this.torso.add(pivot);
        this.parts.push(pivot);
        const s = new Shape();
        s.add(G.sphere(1, 16, 12), c, { pos: [0, 0.1, -0.2], scale: [0.12, 0.12, 0.26], rot: [-0.6, 0, 0] });
        s.add(G.sphere(1, 12, 10), '#ffffff', { pos: [0, 0.26, -0.38], scale: [0.09, 0.09, 0.12], rot: [-0.6, 0, 0] });
        this.addPart(pivot, s.build());
        this.foxTail = pivot;
        break;
      }
      default:
        break;
    }
  }

  createRod() {
    const s = new Shape();
    s.add(G.cyl(0.018, 0.028, 1.5, 6), '#a0785a', { pos: [0, 0.75, 0] });
    s.add(G.cyl(0.035, 0.035, 0.2, 8), '#e5484d', { pos: [0, 0.12, 0] });
    s.add(G.torus(0.04, 0.012, 5, 10), '#4e4c62', { pos: [0.04, 0.3, 0], rot: [0, Math.PI / 2, 0] });
    this.rod = new THREE.Mesh(s.build(), vertexColorToon());
    this.rod.position.set(0, -0.32, 0.03);
    this.rod.rotation.set(Math.PI / 2 - 0.35, 0, 0);
    this.rod.visible = false;
    this.armR.add(this.rod);
    this.rodTip = new THREE.Object3D();
    this.rodTip.position.set(0, 1.5, 0);
    this.rod.add(this.rodTip);
  }

  createNet() {
    const s = new Shape();
    s.add(G.cyl(0.018, 0.022, 1.2, 6), '#b98457', { pos: [0, 0.6, 0] });
    s.add(G.torus(0.2, 0.018, 5, 16), '#fffaf2', { pos: [0, 1.38, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.cone(0.19, 0.35, 12), '#e8f3ff', { pos: [0, 1.22, 0], rot: [Math.PI, 0, 0] });
    this.net = new THREE.Mesh(s.build(), vertexColorToon());
    this.net.position.set(0, -0.32, 0.03);
    this.net.rotation.set(Math.PI / 2 - 0.35, 0, 0);
    this.net.visible = false;
    this.armR.add(this.net);
  }

  setNet(on) {
    if (!this.net) this.createNet();
    this.net.visible = on;
  }

  /** Posture sur un véhicule : 'bike', 'sit', 'stand', 'boat', 'balloon' (ou null). */
  setRide(pose, seat = 0) {
    this.anim.ride = pose ? { pose, seat } : null;
  }

  setRideSpeed(v) {
    this.anim.rideSpeed = v;
  }

  // --------------------------------------------------------------------------
  // Animation
  // --------------------------------------------------------------------------

  /** Joue une action courte : 'pet', 'wave', 'feed', 'celebrate', 'pick'. */
  play(action, duration = 1.2) {
    this.anim.action = action;
    this.anim.actionT = duration;
    if (action !== 'pick') this.anim.happy = Math.max(this.anim.happy, duration);
  }

  /** Assis (sur un banc : hauteur d'assise en mètres) ou debout. */
  setSit(on, seatHeight = 0.12) {
    this.anim.sit = on;
    this.anim.sitHeight = seatHeight;
  }

  setUmbrella(on, color = '#ff8fab') {
    if (on && !this.umbrella) {
      const s = new Shape();
      for (let i = 0; i < 8; i++) {
        const g = new THREE.ConeGeometry(0.78, 0.32, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4);
        s.add(g, i % 2 ? '#ffffff' : color, { pos: [0.02, 1.36, 0.08] });
      }
      s.add(G.cyl(0.016, 0.016, 1.3, 5), '#6b4a3a', { pos: [-0.2, 0.72, 0.14] });
      s.add(G.sphere(0.035, 6, 4), color, { pos: [0.02, 1.53, 0.08] });
      s.add(G.torus(0.05, 0.014, 5, 10, Math.PI), '#6b4a3a', { pos: [-0.25, 0.08, 0.14], rot: [0, 0, Math.PI] });
      const mat = shadedMaterial({ vertexColors: true, gradientMap: getGradientMap(), side: THREE.DoubleSide });
      this.umbrella = new THREE.Mesh(s.build(), mat);
      this.umbrella.userData.noMerge = true;
      this.umbrella.castShadow = true;
      this.torso.add(this.umbrella);
    }
    if (this.umbrella) this.umbrella.visible = on;
    this.anim.umbrella = on;
  }

  setFishing(on) {
    this.anim.fishing = on;
    this.rod.visible = on;
  }

  setExpression(expr) {
    if (this.faceMat.map !== this.faceTex[expr]) {
      this.faceMat.map = this.faceTex[expr];
      this.faceMat.needsUpdate = true;
    }
  }

  /**
   * @param {number} dt
   * @param {{speed:number, running:boolean, grounded:boolean, vy:number}} s
   */
  /** Avancée des pas (les pieds se posent aux extrémités du balancement des jambes). */
  stepPhase() {
    return (this.anim.phase / Math.PI + 0.5) % 2;
  }

  update(dt, s = { speed: 0, running: false, grounded: true, vy: 0 }) {
    const an = this.anim;
    an.t += dt;
    const target = s.speed > 0.15 ? clamp(s.speed / 4.2, 0.4, 1.35) : 0;
    an.amp = damp(an.amp, target, 10, dt);
    an.phase += dt * (3 + s.speed * 2.1);
    const amp = an.amp;
    const sw = Math.sin(an.phase);

    // Marche / course.
    let legL = sw * 0.75 * amp;
    let legR = -sw * 0.75 * amp;
    let armLx = -sw * 0.7 * amp;
    let armRx = sw * 0.7 * amp;
    let armLz = 0.12 + amp * 0.08;
    let armRz = -0.12 - amp * 0.08;
    let bob = Math.abs(Math.cos(an.phase)) * 0.05 * amp;
    const leanTarget = s.running ? 0.2 : amp * 0.06;
    an.lean = damp(an.lean, leanTarget, 8, dt);

    if (!s.grounded) {
      legL = -0.7;
      legR = 0.35;
      armLz = 1.1;
      armRz = -1.1;
      armLx = -0.2;
      armRx = -0.2;
      bob = 0;
    }

    // Actions.
    if (an.actionT > 0) {
      an.actionT -= dt;
      const k = Math.min(1, an.actionT * 4);
      switch (an.action) {
        case 'pet':
          armRx = -1.25 + Math.sin(an.t * 12) * 0.2;
          armRz = -0.25;
          break;
        case 'feed':
          armRx = -1.1;
          armRz = -0.1;
          break;
        case 'pick':
          armRx = -0.9 * k;
          armLx = -0.9 * k;
          bob -= 0.08 * k;
          break;
        case 'wave':
          armRz = -2.6 + Math.sin(an.t * 14) * 0.35;
          armRx = 0;
          break;
        case 'celebrate':
          armLz = 2.5;
          armRz = -2.5;
          bob += Math.abs(Math.sin(an.t * 9)) * 0.15;
          break;
        case 'dance':
          armLz = 1.4 + Math.sin(an.t * 8) * 0.9;
          armRz = -1.4 + Math.sin(an.t * 8) * 0.9;
          legL = Math.max(0, Math.sin(an.t * 8)) * -0.6;
          legR = Math.max(0, -Math.sin(an.t * 8)) * -0.6;
          bob += Math.abs(Math.sin(an.t * 8)) * 0.1;
          an.danceTwist = Math.sin(an.t * 4) * 0.5;
          break;
        case 'kiss':
          armRx = -1.9 + Math.max(0, an.actionT - 0.6) * 0;
          armRz = 0.35;
          armLx = -0.4;
          break;
        case 'clap':
          armLx = -1.25;
          armRx = -1.25;
          armLz = -0.25 + Math.abs(Math.sin(an.t * 14)) * 0.45;
          armRz = 0.25 - Math.abs(Math.sin(an.t * 14)) * 0.45;
          break;
        case 'think':
          armRx = -1.6;
          armRz = 0.55;
          break;
        case 'swing': {
          const t = 1 - an.actionT / 0.6;
          armRx = -2.4 + Math.min(1, t * 1.6) * 2.2;
          armRz = -0.2;
          break;
        }
        default:
          break;
      }
      if (an.actionT <= 0) an.action = null;
    }
    if (an.action !== 'dance') an.danceTwist = damp(an.danceTwist || 0, 0, 8, dt);
    if (an.fishing) {
      armRx = -0.9;
      armLx = -0.7;
      armLz = -0.25;
    }
    if (an.umbrella && !an.fishing) {
      armRx = -0.5;
      armRz = -0.05;
    }
    // Position assise (banc ou par terre).
    if (an.sit) {
      legL = -1.45;
      legR = -1.45;
      if (!an.action) {
        armLx = -0.35;
        armRx = -0.35;
      }
      bob = (an.sitHeight ?? 0.12) - 0.46 * this.appearance.height;
    }

    // Sur un véhicule.
    if (an.ride) {
      const r = an.ride;
      const standing = r.pose === 'stand' || r.pose === 'balloon';
      bob = standing ? r.seat : r.seat - 0.46 * this.appearance.height;
      an.ridePhase = (an.ridePhase || 0) + dt * (an.rideSpeed || 0) * 1.6;
      if (r.pose === 'bike') {
        legL = -1.15 + Math.sin(an.ridePhase) * 0.45;
        legR = -1.15 - Math.sin(an.ridePhase) * 0.45;
      } else if (!standing) {
        legL = -1.45;
        legR = -1.45;
      } else {
        legL = r.pose === 'stand' ? -0.15 : 0;
        legR = r.pose === 'stand' ? 0.1 : 0;
      }
      if (!an.action) {
        armLx = r.pose === 'boat' ? -0.5 : r.pose === 'balloon' ? -0.6 : -1.15;
        armRx = armLx;
        armLz = r.pose === 'balloon' ? 0.45 : 0.08;
        armRz = -armLz;
      }
      an.lean = damp(an.lean, r.pose === 'bike' || r.pose === 'stand' ? 0.12 : 0, 8, dt);
    }

    const k = 1 - Math.exp(-18 * dt);
    this.legL.rotation.x += (legL - this.legL.rotation.x) * k;
    this.legR.rotation.x += (legR - this.legR.rotation.x) * k;
    this.armL.rotation.x += (armLx - this.armL.rotation.x) * k;
    this.armR.rotation.x += (armRx - this.armR.rotation.x) * k;
    this.armL.rotation.z += (armLz - this.armL.rotation.z) * k;
    this.armR.rotation.z += (armRz - this.armR.rotation.z) * k;
    this.body.position.y = bob;
    this.hips.rotation.x = an.lean;
    this.torso.rotation.y = Math.sin(an.phase) * 0.1 * amp + (an.danceTwist || 0);
    const breathe = 1 + Math.sin(an.t * 2.4) * 0.012 * (1 - amp);
    this.torso.scale.set(1, breathe, 1);
    this.head.rotation.z = Math.sin(an.t * 0.8) * 0.04 * (1 - amp);
    this.head.rotation.x = -an.lean * 0.6 + (an.action === 'pet' || an.action === 'feed' ? 0.25 : 0);

    // Cheveux, cape, ailes, queue.
    for (const t of this.tails) {
      const swing = -amp * 0.35 - (s.grounded ? 0 : 0.3) + Math.sin(an.phase * 2) * 0.1 * amp;
      t.pivot.rotation.x = damp(t.pivot.rotation.x, -swing * 0.6 + an.lean, 8, dt);
      t.pivot.rotation.z = damp(t.pivot.rotation.z, t.side * (0.1 + amp * 0.2) + Math.sin(an.t * 1.3) * 0.05, 6, dt);
    }
    if (this.cape) this.cape.rotation.x = damp(this.cape.rotation.x, -(amp * 0.45 + (s.running ? 0.35 : 0)) + Math.sin(an.t * 3) * 0.04, 6, dt);
    for (const w of this.wings) {
      const f = s.grounded ? 3 : 14;
      w.pivot.rotation.y = w.side * (0.25 + Math.abs(Math.sin(an.t * f)) * 0.55);
    }
    if (this.foxTail) {
      this.foxTail.rotation.y = Math.sin(an.t * (4 + amp * 4)) * 0.35;
      this.foxTail.rotation.x = -0.1 + amp * 0.2;
    }

    // Visage : clignements et joie.
    an.happy = Math.max(0, an.happy - dt);
    an.blinkT -= dt;
    if (an.blinkT <= 0) {
      an.blink = 0.13;
      an.blinkT = 2.2 + Math.random() * 3;
    }
    an.blink = Math.max(0, an.blink - dt);
    this.setExpression(an.happy > 0 ? 'happy' : an.blink > 0 ? 'blink' : 'normal');
  }
}

import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Character } from './character.js';
import { modelsIn, getModel } from '../core/models.js';
import { Shape, G, getGradientMap, outlineMaterial, vertexColorToon } from '../core/materials.js';
import { damp } from '../core/math.js';

// Apparence du joueur : un personnage KayKit importé (assets/models/characters/, animé par
// un AnimationMixer) ou le personnage « classique » construit en code (coiffures, tenues…).
// Les deux ont la même interface (update, play, setSit, setFishing…) : le reste du jeu ne
// voit pas la différence.

export const CHARACTER_MODELS = modelsIn('characters').map((m) => ({ id: m.id, name: m.name }));
const ANIMATION_IDS = modelsIn('animations').map((m) => m.id);
/** Modèles à charger au démarrage (personnages + fichiers d'animations partagés). */
export const CHARACTER_MODEL_IDS = CHARACTER_MODELS.length ? [...CHARACTER_MODELS.map((m) => m.id), ...ANIMATION_IDS] : [];

const LABELS = { Mage: 'Mage', Knight: 'Chevalier', Barbarian: 'Barbare', Ranger: 'Rôdeur', Rogue: 'Voleur', Rogue_Hooded: 'Voleur à capuche', Druid: 'Druide', Engineer: 'Ingénieur' };
const PREFERRED = ['Mage', 'Ranger', 'Knight', 'Rogue', 'Barbarian'];

export function modelLabel(id) {
  const name = id.split('/').pop();
  return LABELS[name] || name.replace(/_/g, ' ');
}

/** Personnages importés bien chargés. */
export function availableModels() {
  return CHARACTER_MODELS.filter((m) => getModel(m.id));
}

const ICONS = { Mage: '🧙', Knight: '🛡️', Barbarian: '🪓', Ranger: '🏹', Rogue: '🗡️', Rogue_Hooded: '🥷', Druid: '🌿', Engineer: '🔧' };
export function modelIcon(id) {
  return ICONS[id.split('/').pop()] || '🧑';
}

/** Modèle proposé par défaut (null s'il n'y a aucun personnage importé). */
export function defaultModel() {
  for (const p of PREFERRED) {
    const m = CHARACTER_MODELS.find((x) => x.name === p && getModel(x.id));
    if (m) return m.id;
  }
  return CHARACTER_MODELS.find((x) => getModel(x.id))?.id || null;
}

/** Modèle à utiliser pour une apparence : null = personnage classique. */
export function resolveModel(a) {
  if (!a || a.model === 'classique') return null;
  if (a.model && a.model !== 'auto' && getModel(a.model)) return a.model;
  return defaultModel();
}

// --- Animations ---------------------------------------------------------------------------

// Nom de l'animation voulue → noms possibles dans les fichiers (le premier trouvé gagne).
const CLIP_NAMES = {
  idle: [/^Idle_A$/i, /^Idle$/i, /idle/i],
  idle2: [/^Idle_B$/i],
  walk: [/^Walking_A$/i, /^Walk$/i, /walk/i],
  run: [/^Running_A$/i, /^Run$/i, /run/i],
  jump: [/^Jump_Idle$/i, /jump/i],
  interact: [/^Interact$/i],
  pickup: [/^PickUp$/i, /pick/i],
  use: [/^Use_Item$/i],
  throw: [/^Throw$/i],
  sit: [/^Sit_Chair_Idle$/i, /^Sit_Floor_Idle$/i, /sit.*idle/i],
  wave: [/wave/i],
  cheer: [/cheer|victory|celebrat/i],
  dance: [/dance/i],
};

// Actions courtes du jeu → animation importée (sinon : pose construite en code).
const ACTION_CLIPS = { pick: 'pickup', pet: 'interact', feed: 'interact', swing: 'use', wave: 'wave', celebrate: 'cheer', dance: 'dance' };

let sharedClips = null;
function allClips() {
  if (sharedClips) return sharedClips;
  sharedClips = [];
  for (const id of [...ANIMATION_IDS, ...CHARACTER_MODELS.map((m) => m.id)]) {
    for (const clip of getModel(id)?.animations || []) {
      if (!sharedClips.some((c) => c.name === clip.name)) sharedClips.push(clip);
    }
  }
  return sharedClips;
}

function findClip(clips, key) {
  for (const re of CLIP_NAMES[key] || []) {
    const c = clips.find((x) => re.test(x.name));
    if (c) return c;
  }
  return null;
}

/** Garde seulement les pistes qui visent un os de ce personnage (pas d'avertissements). */
function clipFor(clip, names) {
  const tracks = clip.tracks.filter((t) => names.has(t.name.split('.')[0]));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

// --- Accessoires (canne à pêche, filet, parapluie) ---------------------------------------------

function rodMesh() {
  const s = new Shape();
  s.add(G.cyl(0.018, 0.028, 1.5, 6), '#a0785a', { pos: [0, 0.75, 0] });
  s.add(G.cyl(0.035, 0.035, 0.2, 8), '#e5484d', { pos: [0, 0.12, 0] });
  s.add(G.torus(0.04, 0.012, 5, 10), '#4e4c62', { pos: [0.04, 0.3, 0], rot: [0, Math.PI / 2, 0] });
  return new THREE.Mesh(s.build(), vertexColorToon());
}

function netMesh() {
  const s = new Shape();
  s.add(G.cyl(0.018, 0.022, 1.2, 6), '#b98457', { pos: [0, 0.6, 0] });
  s.add(G.torus(0.2, 0.018, 5, 16), '#fffaf2', { pos: [0, 1.38, 0], rot: [Math.PI / 2, 0, 0] });
  s.add(G.cone(0.19, 0.35, 12), '#e8f3ff', { pos: [0, 1.22, 0], rot: [Math.PI, 0, 0] });
  return new THREE.Mesh(s.build(), vertexColorToon());
}

function umbrellaMesh(color) {
  const s = new Shape();
  for (let i = 0; i < 8; i++) {
    const g = new THREE.ConeGeometry(0.78, 0.32, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4);
    s.add(g, i % 2 ? '#ffffff' : color, { pos: [0, 1.36, 0] });
  }
  s.add(G.cyl(0.016, 0.016, 1.3, 5), '#6b4a3a', { pos: [0, 0.72, 0] });
  s.add(G.sphere(0.035, 6, 4), color, { pos: [0, 1.53, 0] });
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getGradientMap(), side: THREE.DoubleSide });
  const m = new THREE.Mesh(s.build(), mat);
  m.castShadow = true;
  return m;
}

// --- Personnage importé --------------------------------------------------------------------

const TARGET_HEIGHT = 1.62; // hauteur à l'échelle 1 (le personnage classique mesure ~1,55 m)
const WALK_REF = 3.4;
const RUN_REF = 7;
const POSED_BONES = ['upperleg.l', 'upperleg.r', 'lowerleg.l', 'lowerleg.r', 'upperarm.l', 'upperarm.r', 'lowerarm.l', 'lowerarm.r'];
const BONE_NAMES = [...POSED_BONES, 'hips', 'spine', 'chest', 'head', 'hand.l', 'hand.r', 'handslot.l', 'handslot.r'];
const OUTLINE = 0.011;
// Canne et filet tenus vers l'avant et un peu vers le haut (repère du personnage).
const HELD = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, 0, 0));
const _q = new THREE.Quaternion();
const _mq = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

function toonFrom(mat) {
  const m = new THREE.MeshToonMaterial({
    color: mat.color?.clone() || new THREE.Color('#ffffff'),
    map: mat.map || null,
    gradientMap: getGradientMap(),
    transparent: mat.transparent,
    alphaTest: mat.alphaTest,
    side: mat.side,
    vertexColors: !!mat.vertexColors,
  });
  m.name = mat.name;
  return m;
}

class ModelBody {
  constructor(id, appearance) {
    const gltf = getModel(id);
    this.id = id;
    this.appearance = { ...appearance };
    this.root = new THREE.Group();
    this.pivot = new THREE.Group(); // assis, en selle, rebond
    this.root.add(this.pivot);
    this.model = cloneSkinned(gltf.scene);
    this.pivot.add(this.model);

    // Os rangés sous leur nom d'origine (« upperarm.r ») : le chargeur de Three.js retire
    // les points des noms (« upperarmr »), on retrouve donc chaque os par son nom nettoyé.
    this.bones = {};
    this.meshes = [];
    const byName = {};
    this.model.traverse((o) => {
      if (o.isBone) byName[o.name] = o;
      if (o.isMesh) {
        o.material = toonFrom(o.material);
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        this.meshes.push(o);
      }
    });
    for (const n of BONE_NAMES) {
      const b = byName[THREE.PropertyBinding.sanitizeNodeName(n)] || byName[n];
      if (b) this.bones[n] = b;
    }

    // Taille : même gabarit que les autres personnages du jeu.
    this.model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.model);
    this.unit = TARGET_HEIGHT / Math.max(0.01, box.max.y - box.min.y);
    // Os retouchés par les poses construites en code : on repart de leur position de repos.
    this.rest = {};
    for (const n of POSED_BONES) if (this.bones[n]) this.rest[n] = this.bones[n].quaternion.clone();
    // Contour dessiné (comme le reste du jeu), qui suit le squelette.
    for (const m of this.meshes) {
      if (!m.isSkinnedMesh) continue;
      const o = new THREE.SkinnedMesh(m.geometry, outlineMaterial(OUTLINE / this.unit));
      o.name = 'outline';
      o.bind(m.skeleton, m.bindMatrix);
      o.frustumCulled = false;
      o.raycast = () => {};
      m.parent.add(o);
    }
    this.applyScale();

    // Animations.
    this.mixer = new THREE.AnimationMixer(this.model);
    const names = new Set();
    this.model.traverse((o) => names.add(o.name));
    const clips = allClips();
    this.actions = {};
    for (const key of Object.keys(CLIP_NAMES)) {
      const clip = findClip(clips, key);
      if (clip) this.actions[key] = this.mixer.clipAction(clipFor(clip, names));
    }
    this.base = null;
    this.oneShot = null;
    this.setBase('idle', 0);

    this.anim = { t: 0, action: null, actionT: 0, pose: 0, sit: false, sitHeight: 0.12, ride: null, fishing: false, umbrella: false, overlay: {} };
    this.hipsY = this.boneHeight('hips') || TARGET_HEIGHT * 0.33;

    // Accessoires tenus en main.
    const hand = this.bones['handslot.r'] || this.bones['hand.r'] || this.model;
    const handL = this.bones['handslot.l'] || this.bones['hand.l'] || this.model;
    this.rod = rodMesh();
    this.rod.visible = false;
    this.rod.scale.setScalar(1 / (this.unit * this.appearance.height));
    this.rod.rotation.set(Math.PI / 2 - 0.35, 0, 0);
    hand.add(this.rod);
    this.rodTip = new THREE.Object3D();
    this.rodTip.position.set(0, 1.5, 0);
    this.rod.add(this.rodTip);
    this.hand = hand;
    this.handL = handL;
  }

  /** Hauteur d'un os au repos, en mètres (échelle du jeu). */
  boneHeight(name) {
    const b = this.bones[name];
    if (!b) return 0;
    this.root.updateMatrixWorld(true);
    return b.getWorldPosition(_v).y - this.root.getWorldPosition(new THREE.Vector3()).y;
  }

  /** Échelle (taille choisie dans le créateur), pieds posés sur le sol. */
  applyScale() {
    const s = this.unit * (this.appearance.height || 1);
    this.model.scale.setScalar(s);
    this.model.position.y = 0;
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.model);
    this.model.position.y = this.pivot.getWorldPosition(_v).y - box.min.y;
  }

  setAppearance(a) {
    const h = this.appearance.height;
    this.appearance = { ...a };
    if (a.height !== h) {
      this.applyScale();
      this.hipsY = this.boneHeight('hips') || this.hipsY;
      for (const acc of [this.rod, this.net]) acc?.scale.setScalar(1 / (this.unit * a.height));
    }
  }

  setBase(key, fade = 0.22) {
    const next = this.actions[key] || this.actions.idle;
    if (!next || this.base === next) return;
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    if (fade <= 0) {
      next.reset().play();
      if (this.base) this.base.stop();
    } else if (this.base && !this.oneShot) {
      next.reset().play();
      this.base.crossFadeTo(next, fade, false);
    } else {
      next.reset().fadeIn(fade).play();
      if (this.base) this.base.fadeOut(fade);
    }
    this.base = next;
  }

  play(action, duration = 1.2) {
    this.anim.action = action;
    this.anim.actionT = duration;
    const clip = this.actions[ACTION_CLIPS[action]];
    if (!clip) return;
    // Animation importée par-dessus la marche ou l'attente.
    if (this.oneShot) this.oneShot.fadeOut(0.1);
    clip.reset();
    clip.setLoop(clip === this.actions.dance ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    clip.clampWhenFinished = true;
    clip.setEffectiveTimeScale(Math.max(1, clip.getClip().duration / Math.max(0.4, duration)));
    clip.fadeIn(0.12).play();
    this.base?.fadeOut(0.12);
    this.oneShot = clip;
  }

  endOneShot() {
    if (!this.oneShot) return;
    this.oneShot.fadeOut(0.25);
    this.oneShot = null;
    if (this.base) this.base.reset().fadeIn(0.25).play();
  }

  setSit(on, seatHeight = 0.12) {
    this.anim.sit = on;
    this.anim.sitHeight = seatHeight;
  }

  setRide(pose, seat = 0) {
    this.anim.ride = pose ? { pose, seat } : null;
  }

  setRideSpeed(v) {
    this.anim.rideSpeed = v;
  }

  setFishing(on) {
    this.anim.fishing = on;
    this.rod.visible = on;
  }

  setNet(on) {
    if (!this.net) {
      this.net = netMesh();
      this.net.scale.setScalar(1 / (this.unit * this.appearance.height));
      this.net.rotation.set(Math.PI / 2 - 0.35, 0, 0);
      this.hand.add(this.net);
    }
    this.net.visible = on;
  }

  setUmbrella(on, color = '#ff8fab') {
    if (on && !this.umbrella) {
      this.umbrella = umbrellaMesh(color);
      this.umbrella.position.set(0.22, 0.25, 0.12);
      this.pivot.add(this.umbrella);
    }
    if (this.umbrella) this.umbrella.visible = on;
    this.anim.umbrella = on;
  }

  setExpression() {}

  /** Oriente un objet tenu en main dans le repère du personnage (quelle que soit la main). */
  alignHeld(mesh) {
    this.model.getWorldQuaternion(_mq);
    mesh.parent.getWorldQuaternion(_pq);
    mesh.quaternion.copy(_pq.invert().multiply(_mq).multiply(HELD));
  }

  /**
   * Tourne un os par-dessus l'animation, avec des angles donnés dans le repère du
   * personnage (x : vers l'avant / l'arrière, z : sur le côté, y : autour de la verticale).
   * Les os des modèles importés ont chacun leurs propres axes : on convertit.
   */
  turn(name, x, y, z, w = 1) {
    const b = this.bones[name];
    if (!b || w <= 0.001) return;
    this.model.getWorldQuaternion(_mq);
    b.parent.getWorldQuaternion(_pq);
    _pq.premultiply(_mq.invert()); // parent → repère du personnage
    _q.setFromEuler(_e.set(x * w, y * w, z * w));
    _q.premultiply(_pq.clone().invert()).multiply(_pq);
    b.quaternion.premultiply(_q);
    b.updateMatrixWorld(true);
  }

  update(dt, s = { speed: 0, running: false, grounded: true, vy: 0 }) {
    const an = this.anim;
    an.t += dt;
    const seated = an.sit || (an.ride && an.ride.pose !== 'stand' && an.ride.pose !== 'balloon');

    // Attente, marche, course, saut.
    let base = 'idle';
    if (seated) base = this.actions.sit ? 'sit' : 'idle';
    else if (an.ride) base = 'idle';
    else if (!s.grounded) base = this.actions.jump ? 'jump' : 'idle';
    else if (s.speed > 5.4 && this.actions.run) base = 'run';
    else if (s.speed > 0.35) base = 'walk';
    if (!this.oneShot) this.setBase(base);
    else this.base = this.actions[base] || this.base;
    // Cadence des pas accordée à la vitesse (marche 4,6 m/s, course 8,2 m/s).
    const h = this.appearance.height || 1;
    if (this.actions.walk) this.actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(s.speed / (WALK_REF * h), 0.6, 1.8));
    if (this.actions.run) this.actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(s.speed / (RUN_REF * h), 0.7, 1.6));

    // Action courte : fin de l'animation importée.
    if (an.actionT > 0) {
      an.actionT -= dt;
      if (an.actionT <= 0) {
        an.action = null;
        this.endOneShot();
      }
    }
    for (const [n, q] of Object.entries(this.rest)) this.bones[n].quaternion.copy(q);
    this.mixer.update(dt);
    this.model.updateMatrixWorld(true);

    // Poses construites en code, par-dessus les animations (lissées).
    const o = an.overlay;
    const want = (key, on) => {
      o[key] = damp(o[key] || 0, on ? 1 : 0, 10, dt);
      return o[key];
    };
    const coded = an.action && !this.actions[ACTION_CLIPS[an.action]];
    const t = an.t;
    const sitW = want('sit', seated && !this.actions.sit);
    this.turn('upperleg.l', -1.45, 0, 0.05, sitW);
    this.turn('upperleg.r', -1.45, 0, -0.05, sitW);
    this.turn('lowerleg.l', 1.5, 0, 0, sitW);
    this.turn('lowerleg.r', 1.5, 0, 0, sitW);
    const waveW = want('wave', coded && (an.action === 'wave' || an.action === 'kiss'));
    this.turn('upperarm.r', 0, 0, -(2.4 + Math.sin(t * 12) * 0.25), waveW);
    const upW = want('up', coded && (an.action === 'celebrate' || an.action === 'dance'));
    const dance = an.action === 'dance' ? Math.sin(t * 8) * 0.6 : 0;
    this.turn('upperarm.l', 0, 0, 2.4 + dance, upW);
    this.turn('upperarm.r', 0, 0, -(2.4 - dance), upW);
    const clapW = want('clap', coded && an.action === 'clap');
    const clap = Math.abs(Math.sin(t * 14)) * 0.35;
    this.turn('upperarm.l', -1.2, 0, -0.35 + clap, clapW);
    this.turn('upperarm.r', -1.2, 0, 0.35 - clap, clapW);
    const thinkW = want('think', coded && an.action === 'think');
    this.turn('upperarm.r', -1.3, 0, 0.3, thinkW);
    this.turn('lowerarm.r', -1.6, 0, 0, thinkW);
    const fishW = want('fish', an.fishing || an.umbrella);
    this.turn('upperarm.r', -0.9, 0, 0.15, fishW);
    const rideW = want('ride', !!an.ride && !an.action);
    this.turn('upperarm.l', -1.0, 0, 0, rideW * (an.ride?.pose === 'balloon' ? 0.4 : 1));
    this.turn('upperarm.r', -1.0, 0, 0, rideW * (an.ride?.pose === 'balloon' ? 0.4 : 1));

    if (this.rod.visible) this.alignHeld(this.rod);
    if (this.net?.visible) this.alignHeld(this.net);

    // Hauteur : assis sur un banc, en selle, petits sauts de joie.
    let y = 0;
    if (an.sit) y = (an.sitHeight ?? 0.12) - this.hipsY * 0.92;
    if (an.ride) y = an.ride.pose === 'stand' || an.ride.pose === 'balloon' ? an.ride.seat : an.ride.seat - this.hipsY * 0.92;
    if (upW > 0.01 && an.action) y += Math.abs(Math.sin(t * (an.action === 'dance' ? 8 : 9))) * 0.12 * upW;
    this.pivot.position.y = damp(this.pivot.position.y, y, 14, dt);
    this.pivot.rotation.y = an.action === 'dance' && coded ? Math.sin(t * 4) * 0.5 : damp(this.pivot.rotation.y, 0, 8, dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    for (const m of this.meshes) m.material.dispose();
  }
}

// --- Façade ---------------------------------------------------------------------------------

export class Avatar {
  constructor(appearance) {
    this.root = new THREE.Group();
    this.root.name = 'character';
    this.impl = null;
    this.kindKey = null;
    this.state = { sit: [false, 0.12], ride: [null, 0], fishing: false, umbrella: [false], net: false };
    this.setAppearance(appearance);
  }

  get appearance() {
    return this._appearance;
  }

  set appearance(a) {
    this._appearance = a;
    if (this.impl) this.impl.appearance = a;
  }

  get isModel() {
    return this.impl instanceof ModelBody;
  }

  get rodTip() {
    return this.impl.rodTip;
  }

  setAppearance(a) {
    const id = resolveModel(a);
    const key = id ? `m:${id}` : 'classique';
    if (key !== this.kindKey) {
      if (this.impl) {
        if (this.impl.dispose) this.impl.dispose();
        else this.impl.root.removeFromParent();
      }
      this.impl = id ? new ModelBody(id, a) : new Character(a);
      this.root.add(this.impl.root);
      this.kindKey = key;
      // On garde la posture en cours (assis, à vélo, en train de pêcher…).
      const st = this.state;
      this.impl.setSit(...st.sit);
      this.impl.setRide(...st.ride);
      this.impl.setFishing(st.fishing);
      if (st.umbrella[0]) this.impl.setUmbrella(...st.umbrella);
      if (st.net) this.impl.setNet(true);
    } else {
      this.impl.setAppearance(a);
    }
    this._appearance = this.impl.appearance;
  }

  update(dt, s) {
    this.impl.update(dt, s);
  }

  play(action, duration) {
    this.impl.play(action, duration);
  }

  setSit(on, h = 0.12) {
    this.state.sit = [on, h];
    this.impl.setSit(on, h);
  }

  setRide(pose, seat = 0) {
    this.state.ride = [pose, seat];
    this.impl.setRide(pose, seat);
  }

  setRideSpeed(v) {
    this.impl.setRideSpeed(v);
  }

  setFishing(on) {
    this.state.fishing = on;
    this.impl.setFishing(on);
  }

  setUmbrella(on, color) {
    this.state.umbrella = [on, color];
    this.impl.setUmbrella(on, color);
  }

  setNet(on) {
    this.state.net = on;
    this.impl.setNet(on);
  }

  setExpression(expr) {
    this.impl.setExpression?.(expr);
  }
}

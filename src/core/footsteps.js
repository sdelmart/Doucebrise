import * as THREE from 'three';
import { globalUniforms } from './materials.js';

// Bruits de pas selon le sol : herbe, sous-bois, terre, sable, pierre et pavés, bois (ponts,
// pontons, maisons), neige, eau peu profonde ; un peu mouillés sous la pluie. Sons
// synthétisés (bruit filtré et petites percussions), cadence accordée à l'animation de
// marche ou de course, à peine plus appuyé à la réception d'un saut.
// Discrets : ils restent sous l'ambiance (oiseaux, vent, vagues) et sous la musique, avec des
// attaques douces et sans aigus secs, pour se fondre dans le décor au lieu de claquer.

const rand = (a, b) => a + Math.random() * (b - a);

// Volume d'ensemble des pas (avant le volume des effets).
const LEVEL = 0.3;
// Coupure des aigus par surface : garde le caractère du sol sans clic.
const SOFTEN = { grass: 3000, leaves: 3400, dirt: 2400, sand: 2400, stone: 2800, wood: 2200, snow: 3200, water: 3200 };

// Types de sol du terrain (voir GROUND_LAYERS) → surface entendue.
const LAYER_SURFACE = ['grass', 'leaves', 'dirt', 'sand', 'stone', 'stone', 'snow'];

export class Footsteps {
  constructor(game) {
    this.game = game;
    this.lastK = null;
    this.lastStepAt = -Infinity;
    this.airborne = false;
    this.fallSpeed = 0;
    this.w = new Float32Array(7);
    this.col = new THREE.Color();
    this.surfaceT = 0;
    this.surface = 'grass';
    this.other = null; // sol voisin, mêlé au premier à la lisière (herbe qui devient terre…)
    this.mix = 0;
  }

  /** Joue un pas (tests, démonstrations). */
  static sound(audio, surface, opts) {
    footstepSound(audio, surface, opts);
  }

  /** Surface sous les pieds du joueur. */
  surfaceAt() {
    return this.readGround().surface;
  }

  /** Sol sous les pieds : surface principale, et à la lisière le sol voisin et sa part (0 à 0,5). */
  readGround() {
    const g = this.game;
    const one = (surface) => ({ surface, other: null, mix: 0 });
    if (g.indoors) return one('wood');
    const w = g.world;
    const p = g.player.pos;
    if (w.onPlatform(p.x, p.z)) return one('wood');
    const t = w.terrain;
    const h = t.heightAt(p.x, p.z);
    if (h < -0.08) return one('water');
    t.colorAt(p.x, p.z, h, t.normalAt(p.x, p.z).y, this.col, this.w);
    const by = {};
    for (let k = 0; k < 7; k++) by[LAYER_SURFACE[k]] = (by[LAYER_SURFACE[k]] || 0) + this.w[k];
    const [[surface, w1], [other, w2] = [null, 0]] = Object.entries(by).sort((a, b) => b[1] - a[1]);
    // Neige de l'hiver (sauf sur le sable mouillé du bord de mer).
    if (globalUniforms.uSnow.value > 0.45 && surface !== 'sand') return one('snow');
    const mix = w2 / Math.max(1e-6, w1 + w2);
    return mix > 0.2 ? { surface, other, mix } : one(surface);
  }

  update(dt) {
    const g = this.game;
    const pl = g.player;
    const ch = pl.character;
    if (g.state !== 'play' || !g.settings.footsteps || pl.vehicle || g.sled?.active || !ch) {
      this.airborne = false;
      return;
    }
    // Réception d'un saut : un pas appuyé.
    if (!pl.grounded) {
      this.airborne = true;
      this.fallSpeed = Math.max(this.fallSpeed, -pl.vy);
      return;
    }
    if (this.airborne) {
      this.airborne = false;
      if (this.fallSpeed > 3) this.play(1.25);
      this.fallSpeed = 0;
    }
    if (pl.speed < 0.6 || pl.frozen) {
      this.lastK = null;
      return;
    }
    // Un pas à chaque appui d'un pied dans l'animation de marche ou de course.
    const k = Math.floor(ch.stepPhase());
    if (this.lastK !== null && k !== this.lastK && g.elapsed - this.lastStepAt > 0.16) this.play(pl.speed > 5.4 ? 1.1 : 1);
    this.lastK = k;
  }

  play(force = 1) {
    const g = this.game;
    this.lastStepAt = g.elapsed;
    // La surface ne change pas à chaque pas : on la relit toutes les 0,25 s.
    const now = g.elapsed;
    if (now - this.surfaceT > 0.25) {
      this.surfaceT = now;
      Object.assign(this, this.readGround());
    }
    const wet = !g.indoors && g.world.weather.rainAmt > 0.35;
    const side = (this.side = -(this.side || 1));
    // À la lisière de deux sols, le pas mêle les deux (en puissance) : pas de bascule nette.
    if (this.other) {
      footstepSound(g.audio, this.surface, { force: force * Math.sqrt(1 - this.mix), wet, side });
      footstepSound(g.audio, this.other, { force: force * Math.sqrt(this.mix), wet, side });
    } else footstepSound(g.audio, this.surface, { force, wet, side });
  }
}

/** Un pas : surface, appui (1 marche, 1,1 course, 1,25 réception), sol mouillé, pied. */
export function footstepSound(audio, surface, { force = 1, wet = false, side = 1 } = {}) {
  const ctx = audio.ctx;
  if (!ctx || audio.levels.sfx < 0.001) return;
  const t0 = ctx.currentTime + 0.005;
  const out = ctx.createStereoPanner();
  out.pan.value = side * 0.05;
  const soft = ctx.createBiquadFilter();
  soft.type = 'lowpass';
  soft.Q.value = 0.5;
  soft.frequency.value = SOFTEN[surface] || 2800;
  const bus = ctx.createGain();
  bus.gain.value = LEVEL * force;
  out.connect(soft).connect(bus).connect(audio.buses.sfx);
  const nodes = [out, soft, bus];

  /** Bruit filtré avec son enveloppe (attaque, durée) et un balayage de fréquence. */
  const noise = (t, dur, { type = 'bandpass', f = 1500, f1 = f, q = 0.8, vol = 0.1, attack = 0.008 } = {}) => {
    const src = ctx.createBufferSource();
    src.buffer = audio.noiseBuffer(1);
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.Q.value = q;
    // Fréquence posée dès la création : un saut depuis la valeur par défaut claque.
    flt.frequency.value = f;
    flt.frequency.setValueAtTime(f, t0 + t);
    if (f1 !== f) flt.frequency.exponentialRampToValueAtTime(f1, t0 + t + dur);
    const gn = ctx.createGain();
    gn.gain.value = 0;
    gn.gain.setValueAtTime(0.0001, t0 + t);
    gn.gain.linearRampToValueAtTime(vol, t0 + t + attack);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t + dur);
    src.connect(flt).connect(gn).connect(out);
    src.start(t0 + t, Math.random() * 0.5);
    src.stop(t0 + t + dur + 0.02);
    nodes.push(src, flt, gn);
  };
  /** Petite percussion (talon, planche), attaque arrondie. */
  const thump = (t, dur, f, f1, vol, attack = 0.007) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.frequency.setValueAtTime(f, t0 + t);
    osc.frequency.exponentialRampToValueAtTime(f1, t0 + t + dur);
    const gn = ctx.createGain();
    gn.gain.value = 0;
    gn.gain.setValueAtTime(0.0001, t0 + t);
    gn.gain.linearRampToValueAtTime(vol, t0 + t + attack);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t + dur);
    osc.connect(gn).connect(out);
    osc.start(t0 + t);
    osc.stop(t0 + t + dur + 0.02);
    nodes.push(osc, gn);
  };

  // D'un pas à l'autre, l'appui varie un peu (certains pas presque effleurés).
  const v = rand(0.75, 1.05);
  switch (surface) {
    case 'grass':
      // Froissement d'herbe : souffle doux, talon étouffé.
      noise(0, rand(0.08, 0.11), { f: rand(1800, 2500), f1: 1200, q: 0.6, vol: 0.08 * v, attack: 0.02 });
      noise(0.015, 0.07, { type: 'lowpass', f: 450, vol: 0.06 * v, attack: 0.014 });
      break;
    case 'leaves':
      // Sous-bois : feuilles froissées, quelques brindilles feutrées.
      noise(0, 0.11, { f: 1800, f1: 1100, q: 0.6, vol: 0.06 * v, attack: 0.016 });
      for (let i = 0; i < 3; i++) noise(rand(0.01, 0.08), 0.016, { f: rand(2200, 3400), q: 2, vol: rand(0.015, 0.03) * v, attack: 0.004 });
      noise(0.01, 0.06, { type: 'lowpass', f: 420, vol: 0.06 * v, attack: 0.012 });
      break;
    case 'dirt':
      // Terre battue : pas mat, un grain de gravier.
      noise(0, 0.08, { type: 'lowpass', f: 800, f1: 380, vol: 0.08 * v, attack: 0.01 });
      thump(0, 0.06, 120, 75, 0.035 * v, 0.01);
      noise(rand(0.01, 0.04), 0.014, { f: rand(2400, 3000), q: 1.5, vol: 0.01 * v, attack: 0.004 });
      break;
    case 'sand':
      // Sable : glissement étouffé.
      noise(0, rand(0.13, 0.17), { f: rand(1300, 1700), f1: 650, q: 0.6, vol: 0.08 * v, attack: 0.03 });
      noise(0.01, 0.1, { type: 'lowpass', f: 360, vol: 0.06 * v, attack: 0.025 });
      break;
    case 'stone':
      // Pierre, pavés : talon feutré, léger frottement de semelle.
      thump(0, 0.05, rand(170, 210), 110, 0.04 * v);
      noise(0, 0.04, { f: 1600, q: 1, vol: 0.022 * v, attack: 0.005 });
      noise(0.006, 0.06, { f: 1100, q: 1.2, vol: 0.018 * v, attack: 0.008 });
      break;
    case 'wood':
      // Planches : pas creux et rond, sans claquement.
      thump(0, 0.09, rand(125, 150), 90, 0.04 * v, 0.009);
      noise(0, 0.07, { f: rand(650, 820), q: 2.5, vol: 0.025 * v, attack: 0.006 });
      break;
    case 'snow':
      // Neige : crissement tassé, fait de petits grains serrés.
      for (let i = 0; i < 6; i++) noise(i * 0.018 + rand(0, 0.008), 0.024, { f: rand(1400, 2600), q: 1.1, vol: rand(0.04, 0.07) * v, attack: 0.005 });
      noise(0, 0.12, { type: 'lowpass', f: 550, vol: 0.08 * v, attack: 0.018 });
      break;
    case 'water':
      // Eau peu profonde : clapotis.
      noise(0, rand(0.18, 0.24), { f: 600, f1: 1800, q: 0.7, vol: 0.07 * v, attack: 0.02 });
      noise(0.05, 0.2, { f: 2600, q: 0.8, vol: 0.02 * v, attack: 0.03 });
      break;
    default:
      break;
  }
  // Sol détrempé : petit bruit de succion.
  if (wet && (surface === 'grass' || surface === 'dirt' || surface === 'leaves')) {
    noise(0.03, 0.09, { f: 500, f1: 1000, q: 2, vol: 0.025 * v, attack: 0.015 });
  }
  setTimeout(() => {
    for (const n of nodes) n.disconnect();
  }, 700);
}

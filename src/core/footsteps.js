import * as THREE from 'three';
import { globalUniforms } from './materials.js';

// Bruits de pas selon le sol : herbe, sous-bois, terre, sable, pierre et pavés, bois (ponts,
// pontons, maisons), neige, eau peu profonde ; un peu mouillés sous la pluie. Sons
// synthétisés (bruit filtré et petites percussions), cadence accordée à l'animation de
// marche ou de course, pas plus appuyé à la réception d'un saut.

const rand = (a, b) => a + Math.random() * (b - a);

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
  }

  /** Joue un pas (tests, démonstrations). */
  static sound(audio, surface, opts) {
    footstepSound(audio, surface, opts);
  }

  /** Surface sous les pieds du joueur. */
  surfaceAt() {
    const g = this.game;
    if (g.indoors) return 'wood';
    const w = g.world;
    const p = g.player.pos;
    if (w.onPlatform(p.x, p.z)) return 'wood';
    const t = w.terrain;
    const h = t.heightAt(p.x, p.z);
    if (h < -0.08) return 'water';
    t.colorAt(p.x, p.z, h, t.normalAt(p.x, p.z).y, this.col, this.w);
    let best = 0;
    for (let k = 1; k < 7; k++) if (this.w[k] > this.w[best]) best = k;
    const surface = LAYER_SURFACE[best];
    // Neige de l'hiver (sauf sur le sable mouillé du bord de mer).
    if (globalUniforms.uSnow.value > 0.45 && surface !== 'sand') return 'snow';
    return surface;
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
      if (this.fallSpeed > 3) this.play(1.5);
      this.fallSpeed = 0;
    }
    if (pl.speed < 0.6 || pl.frozen) {
      this.lastK = null;
      return;
    }
    // Un pas à chaque appui d'un pied dans l'animation de marche ou de course.
    const k = Math.floor(ch.stepPhase());
    if (this.lastK !== null && k !== this.lastK && g.elapsed - this.lastStepAt > 0.16) this.play(pl.speed > 5.4 ? 1.25 : 1);
    this.lastK = k;
  }

  play(force = 1) {
    const g = this.game;
    this.lastStepAt = g.elapsed;
    // La surface ne change pas à chaque pas : on la relit toutes les 0,25 s.
    const now = g.elapsed;
    if (now - this.surfaceT > 0.25) {
      this.surfaceT = now;
      this.surface = this.surfaceAt();
    }
    const wet = !g.indoors && g.world.weather.rainAmt > 0.35;
    footstepSound(g.audio, this.surface, { force, wet, side: (this.side = -(this.side || 1)) });
  }
}

/** Un pas : surface, appui (1 marche, 1,25 course, 1,5 réception), sol mouillé, pied. */
export function footstepSound(audio, surface, { force = 1, wet = false, side = 1 } = {}) {
  const ctx = audio.ctx;
  if (!ctx || audio.levels.sfx < 0.001) return;
  const t0 = ctx.currentTime + 0.005;
  const out = ctx.createStereoPanner();
  out.pan.value = side * 0.08;
  const bus = ctx.createGain();
  bus.gain.value = 0.9 * force;
  out.connect(bus).connect(audio.buses.sfx);
  const nodes = [out, bus];

  /** Bruit filtré avec son enveloppe (attaque, durée) et un balayage de fréquence. */
  const noise = (t, dur, { type = 'bandpass', f = 1500, f1 = f, q = 0.8, vol = 0.1, attack = 0.004 } = {}) => {
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
  /** Petite percussion (talon, planche). */
  const thump = (t, dur, f, f1, vol, type = 'sine') => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    osc.frequency.setValueAtTime(f, t0 + t);
    osc.frequency.exponentialRampToValueAtTime(f1, t0 + t + dur);
    const gn = ctx.createGain();
    gn.gain.value = 0;
    gn.gain.setValueAtTime(0.0001, t0 + t);
    gn.gain.linearRampToValueAtTime(vol, t0 + t + 0.004);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t + dur);
    osc.connect(gn).connect(out);
    osc.start(t0 + t);
    osc.stop(t0 + t + dur + 0.02);
    nodes.push(osc, gn);
  };

  const v = rand(0.85, 1.15);
  switch (surface) {
    case 'grass':
      // Froissement d'herbe : bruit aigu doux, talon étouffé.
      noise(0, rand(0.07, 0.1), { f: rand(2600, 3600), f1: 1800, q: 0.7, vol: 0.08 * v, attack: 0.012 });
      noise(0.02, 0.06, { type: 'lowpass', f: 500, vol: 0.07 * v });
      break;
    case 'leaves':
      // Sous-bois : brindilles et feuilles sèches qui craquent.
      noise(0, 0.1, { f: 2200, f1: 1400, q: 0.6, vol: 0.06 * v, attack: 0.01 });
      for (let i = 0; i < 4; i++) noise(rand(0, 0.08), 0.012, { type: 'highpass', f: rand(2500, 4500), vol: rand(0.03, 0.07) * v, attack: 0.001 });
      noise(0.01, 0.05, { type: 'lowpass', f: 450, vol: 0.07 * v });
      break;
    case 'dirt':
      // Terre battue : pas mat, un peu de gravier.
      noise(0, 0.07, { type: 'lowpass', f: 900, f1: 400, vol: 0.09 * v, attack: 0.003 });
      thump(0, 0.05, 130, 80, 0.06 * v);
      for (let i = 0; i < 2; i++) noise(rand(0.005, 0.04), 0.01, { type: 'highpass', f: rand(3000, 5000), vol: 0.015 * v, attack: 0.001 });
      break;
    case 'sand':
      // Sable : glissement étouffé, sans claquement.
      noise(0, rand(0.13, 0.17), { f: rand(1400, 1900), f1: 700, q: 0.6, vol: 0.09 * v, attack: 0.025 });
      noise(0.01, 0.1, { type: 'lowpass', f: 380, vol: 0.07 * v, attack: 0.02 });
      break;
    case 'stone':
      // Pierre, pavés, roche : talon net, petit claquement.
      thump(0, 0.045, rand(190, 240), 120, 0.08 * v);
      noise(0, 0.03, { type: 'highpass', f: 2600, vol: 0.05 * v, attack: 0.001 });
      noise(0.004, 0.06, { f: 1200, q: 1.4, vol: 0.03 * v });
      break;
    case 'wood':
      // Planches : pas creux qui résonne.
      thump(0, 0.11, rand(135, 165), 95, 0.11 * v);
      noise(0, 0.08, { f: rand(700, 900), q: 3, vol: 0.05 * v, attack: 0.002 });
      noise(0, 0.02, { type: 'highpass', f: 3000, vol: 0.03 * v, attack: 0.001 });
      break;
    case 'snow':
      // Neige : crissement fait de petits craquements serrés.
      for (let i = 0; i < 7; i++) noise(i * 0.016 + rand(0, 0.008), 0.02, { f: rand(1600, 3200), q: 1.2, vol: rand(0.05, 0.09) * v, attack: 0.002 });
      noise(0, 0.12, { type: 'lowpass', f: 600, vol: 0.06 * v, attack: 0.015 });
      break;
    case 'water':
      // Eau peu profonde : éclaboussure.
      noise(0, rand(0.18, 0.24), { f: 700, f1: 2400, q: 0.7, vol: 0.11 * v, attack: 0.01 });
      noise(0.05, 0.2, { type: 'highpass', f: 3500, vol: 0.04 * v, attack: 0.02 });
      thump(0.02, 0.06, 420, 900, 0.015 * v);
      break;
    default:
      break;
  }
  // Sol détrempé : petit bruit de succion.
  if (wet && (surface === 'grass' || surface === 'dirt' || surface === 'leaves')) {
    noise(0.03, 0.09, { f: 500, f1: 1100, q: 2, vol: 0.035 * v, attack: 0.01 });
  }
  setTimeout(() => {
    for (const n of nodes) n.disconnect();
  }, 700);
}

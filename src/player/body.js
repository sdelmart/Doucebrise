import * as THREE from 'three';
import { Character } from './character.js';
import { ModelBody, resolveModel } from './avatar.js';
import { createPlayerBody, gearKept } from '../npc/villagerBody.js';

// --- Façade ---------------------------------------------------------------------------------

/** Le personnage du joueur : aventurier importé (habillé à son goût) ou style Classique. */
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
    // Un autre modèle de base quand on retire ou remet le chapeau / la cape d'aventurier.
    const gear = gearKept(a);
    const key = id ? `m:${id}:${gear.hat ? 1 : 0}${gear.back ? 1 : 0}` : 'classique';
    if (key !== this.kindKey) {
      if (this.impl) {
        if (this.impl.dispose) this.impl.dispose();
        else this.impl.root.removeFromParent();
      }
      this.impl = id ? createPlayerBody(id, a) || new ModelBody(id, a) : new Character(a);
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

  stepPhase() {
    return this.impl.stepPhase();
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

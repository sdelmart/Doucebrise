import * as THREE from 'three';
import { FURNITURE, WALLPAPERS, FLOORS, PALETTE, FURNITURE_CATS } from './furniture.js';
import { HOME_COLORS, ROOF_STYLES, FACADES, HOME_EXTRAS } from '../world/home.js';
import { ROOM } from './house.js';
import { escapeHtml, isTouchUI } from '../ui/ui.js';

// Mode décoration (touche B) : choisir un meuble rangé, le placer à la souris,
// le tourner (R), changer sa couleur (C), le déplacer ou le ranger. Les petits objets
// (vases, lampes, plantes, livres…) se posent aussi sur les tables, commodes, étagères…

const GRID = 0.25;
const snap = (v, step = GRID) => Math.round(v / step) * step;

export class DecorMode {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.area = null;
    this.holding = null;
    this.tab = 'meubles';
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.el = document.createElement('div');
    this.el.id = 'decor';
    this.el.className = 'decor hidden';
    document.body.appendChild(this.el);

    const canvas = game.canvas;
    let down = null;
    canvas.addEventListener('pointermove', (e) => {
      // Au doigt, l'objet ne suit pas le glissement (qui tourne la vue) : un toucher le place.
      if (e.pointerType === 'touch') return;
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
    canvas.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.active || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved < 6) {
        this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        // Au doigt : un toucher montre l'objet à cet endroit, « ✓ Poser » le pose.
        if (e.pointerType === 'touch' && this.holding) {
          this.update();
          return;
        }
        this.click();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.code === 'KeyR') this.rotate();
      if (e.code === 'KeyC') this.recolor();
      if (e.code === 'Escape' || e.code === 'Delete' || e.code === 'Backspace') {
        if (this.holding) this.cancel();
        else if (e.code === 'Escape') this.exit();
        e.preventDefault();
      }
    });
  }

  /** Zone décorable où se trouve le joueur, ou null. */
  availableArea() {
    const g = this.game;
    if (g.house.inside) return 'interior';
    const y = g.world.village.yard;
    if (Math.hypot(g.player.pos.x - y.x, g.player.pos.z - y.z) < y.r + 1.5) return 'yard';
    return null;
  }

  enter() {
    const area = this.availableArea();
    if (!area) {
      this.game.ui.toast('🛋️ Tu peux décorer chez toi ou dans ton jardin.');
      return false;
    }
    this.active = true;
    this.area = area;
    const g = this.game;
    g.player.frozen = true;
    this.tab = 'meubles';
    this.render();
    this.el.classList.remove('hidden');
    this.focusArea();
    return true;
  }

  focusArea() {
    const g = this.game;
    const a = g.house.areas[this.area];
    // La scène au milieu de la place que laisse le panneau, en bas de l'écran.
    g.cam.frameBeside(this.el);
    if (this.tab === 'facade') {
      const h = g.world.village.houses[0];
      // De face (un peu de trois quarts), à hauteur de la porte : on voit les murs, les
      // volets et la porte, pas seulement le toit ; assez loin pour que toute la maison
      // tienne au-dessus du panneau.
      g.cam.setOverview(new THREE.Vector3(h.x, g.world.heightAt(h.x, h.z) + 2.4, h.z), Math.min(22, 14 * g.cam.studio.fit), 0.3);
      g.cam.over.yaw = h.rot + 0.45;
      return;
    }
    g.cam.setOverview(new THREE.Vector3(a.cx, this.area === 'interior' ? 0 : g.world.heightAt(a.cx, a.cz), a.cz), this.area === 'interior' ? 12 + (ROOM.w - 10) * 0.7 : 12);
  }

  exit() {
    if (!this.active) return;
    if (this.holding) this.cancel();
    this.active = false;
    this.el.classList.add('hidden');
    this.game.player.frozen = false;
    this.game.cam.setMode('follow');
    this.game.cam.setShift(0);
    this.game.requestSave();
    this.game.onDecorClosed?.();
  }

  // --- Interface ---------------------------------------------------------------

  render() {
    const g = this.game;
    const h = g.house;
    const tabs = [['meubles', '🛋️ Meubles']];
    if (this.area === 'interior') tabs.push(['murs', '🧱 Papier peint'], ['sols', '🟫 Sol']);
    else tabs.push(['facade', '🏠 Façade']);
    let html = `<div class="decor-head"><div class="tabs">${tabs.map(([id, l]) => `<button class="tab${this.tab === id ? ' active' : ''}" data-dtab="${id}">${l}</button>`).join('')}</div>
      <button class="btn primary" data-dexit>✓ Terminer</button></div><div class="decor-items${this.tab === 'facade' ? ' facade' : ''}">`;
    if (this.tab === 'meubles') {
      const ids = Object.keys(h.storage).filter((id) => h.storage[id] > 0 && FURNITURE[id]);
      if (!ids.length) html += '<div class="note">Aucun meuble rangé. Achète-en chez Bruno (Menuiserie) ou clique un meuble posé pour le déplacer.</div>';
      const order = FURNITURE_CATS.map((c) => c.id);
      ids.sort((a, b) => order.indexOf(FURNITURE[a].cat) - order.indexOf(FURNITURE[b].cat));
      for (const id of ids) {
        const f = FURNITURE[id];
        const ok = this.area === 'interior' ? f.where !== 'out' : f.where !== 'in';
        html += `<button class="decor-item${ok ? '' : ' off'}" data-fid="${id}" ${ok ? '' : 'disabled'} title="${escapeHtml(f.label)}${ok ? '' : ' (pas ici)'}"><span>${f.emoji}</span><small>${escapeHtml(f.label)}</small><b>${h.storage[id]}</b></button>`;
      }
    } else if (this.tab === 'facade') {
      html += this.facadeHtml();
    } else {
      const list = this.tab === 'murs' ? WALLPAPERS : FLOORS;
      const owned = this.tab === 'murs' ? h.ownedWalls : h.ownedFloors;
      const cur = this.tab === 'murs' ? h.wallId : h.floorId;
      for (const sf of list) {
        const has = owned.has(sf.id);
        html += `<button class="decor-item surface${cur === sf.id ? ' active' : ''}${has ? '' : ' off'}" data-sid="${sf.id}" ${has ? '' : 'disabled'}>
          <span class="swatch-big" style="background:linear-gradient(135deg, ${sf.draw.base} 50%, ${sf.draw.accent} 50%)"></span><small>${escapeHtml(sf.label)}</small>${has ? '' : '<b>🔒</b>'}</button>`;
      }
    }
    const shopTip = (this.tab === 'murs' || this.tab === 'sols') ? ' · 🔒 motifs en vente à la Menuiserie de Bruno' : this.tab === 'facade' ? ' · 🔒 styles et extras en vente chez Bruno (onglet Travaux)' : '';
    const small = this.holding && FURNITURE[this.holding.id].small;
    const touch = isTouchUI();
    // Objet en main : boutons (au doigt, il n'y a ni R, ni C, ni Échap).
    if (this.holding) {
      html += `</div><div class="decor-actions">${touch ? '<button class="btn primary" data-dact="place">✓ Poser</button>' : ''}<button class="btn" data-dact="rotate">↻ Tourner</button><button class="btn" data-dact="color">🎨 Couleur</button><button class="btn" data-dact="cancel">📦 Ranger</button>`;
    }
    html += `</div><div class="decor-tips">${this.holding && touch ? `Touche le sol${small ? ' (ou une table, une commode, une étagère…)' : ''} pour y montrer l'objet, puis ✓ Poser.` : this.holding ? `<b>Clic</b> : poser${small ? ' (par terre ou sur une table, une commode, une étagère…)' : ''} · <b>R</b> : tourner · <b>C</b> : couleur · <b>Échap</b> : ranger` : touch ? `Touche un meuble posé pour le déplacer · glisse pour tourner la vue${shopTip}` : `<b>Clic</b> sur un meuble posé : le déplacer · glisser : tourner la vue · molette : zoom${shopTip}`}</div>`;
    this.el.innerHTML = html;
    // Au doigt, objet en main : la liste se replie, il reste les boutons (plus de place pour viser).
    this.el.classList.toggle('holding', !!this.holding);
    this.el.querySelectorAll('[data-dtab]').forEach((b) => {
      b.onclick = () => {
        if (this.holding) this.cancel();
        this.tab = b.dataset.dtab;
        this.render();
        this.focusArea();
      };
    });
    this.el.querySelector('[data-dexit]').onclick = () => this.exit();
    this.el.querySelectorAll('[data-dact]').forEach((b) => {
      b.onclick = () => {
        const act = b.dataset.dact;
        if (act === 'place') this.click();
        else if (act === 'rotate') this.rotate();
        else if (act === 'color') this.recolor();
        else this.cancel();
      };
    });
    this.el.querySelectorAll('[data-fid]').forEach((b) => {
      b.onclick = () => this.take(b.dataset.fid);
    });
    this.el.querySelectorAll('[data-sid]').forEach((b) => {
      b.onclick = () => {
        if (this.tab === 'murs') h.setWall(b.dataset.sid);
        else h.setFloor(b.dataset.sid);
        g.audio.play('ui');
        this.render();
      };
    });
    this.el.querySelectorAll('[data-hcol]').forEach((b) => {
      b.onclick = () => {
        const [key, col] = b.dataset.hcol.split('|');
        h.setExterior({ [key]: col });
        this.facadeChanged();
      };
    });
    this.el.querySelectorAll('[data-hstyle]').forEach((b) => {
      b.onclick = () => {
        const [key, id] = b.dataset.hstyle.split('|');
        h.setExterior({ [key]: id });
        this.facadeChanged();
      };
    });
    this.el.querySelectorAll('[data-hextra]').forEach((b) => {
      b.onclick = () => {
        h.toggleExtra(b.dataset.hextra);
        this.facadeChanged();
      };
    });
  }

  facadeChanged() {
    const g = this.game;
    g.audio.play('pick');
    g.emit('facade', {});
    const hs = g.world.village.houses[0];
    g.particles.emit('sparkle', new THREE.Vector3(hs.x, g.world.heightAt(hs.x, hs.z) + 3, hs.z), { count: 3, spread: 3 });
    this.render();
  }

  facadeHtml() {
    const h = this.game.house;
    const ex = h.exterior;
    const colorRow = (key, label) => `<div class="fac-row"><span class="fac-label">${label}</span><div class="swatches small">${HOME_COLORS[key].map((c) => `<button class="swatch${ex[key] === c ? ' active' : ''}" style="background:${c}" data-hcol="${key}|${c}"></button>`).join('')}</div></div>`;
    let html = '<div class="fac-cols"><div class="fac-col">';
    html += colorRow('wall', '🧱 Murs') + colorRow('roof', '🏠 Toit') + colorRow('trim', '🪵 Boiseries') + colorRow('door', '🚪 Porte') + colorRow('shutter', '🪟 Volets & auvent') + colorRow('fence', '🌿 Clôture');
    html += '</div><div class="fac-col">';
    const styleRow = (list, key, prefix, label) => `<div class="fac-row"><span class="fac-label">${label}</span><div class="chips">${list.map((o) => {
      const own = h.ownedStyles.has(`${prefix}:${o.id}`);
      return `<button class="chip${ex[key] === o.id ? ' active' : ''}${own ? '' : ' locked'}" ${own ? `data-hstyle="${key}|${o.id}"` : 'disabled'}>${own ? '' : '🔒 '}${o.label}</button>`;
    }).join('')}</div></div>`;
    html += styleRow(ROOF_STYLES, 'roofStyle', 'roof', '🏠 Style de toit') + styleRow(FACADES, 'facade', 'facade', '🧱 Façade');
    html += `<div class="fac-row"><span class="fac-label">✨ Extras</span><div class="chips">${HOME_EXTRAS.map((o) => {
      const own = h.ownedStyles.has(`extra:${o.id}`);
      const on = ex.extras.includes(o.id);
      return `<button class="chip${on ? ' active' : ''}${own ? '' : ' locked'}" ${own ? `data-hextra="${o.id}"` : 'disabled'}>${own ? (on ? '✓ ' : '') : '🔒 '}${o.emoji} ${o.label}</button>`;
    }).join('')}</div></div>`;
    html += '</div></div>';
    return html;
  }

  // --- Manipulation ---------------------------------------------------------------

  take(id, from = null) {
    const h = this.game.house;
    if (this.holding) this.cancel();
    const f = FURNITURE[id];
    if (!from) {
      h.storage[id] -= 1;
      if (h.storage[id] <= 0) delete h.storage[id];
    }
    const color = from ? from.color : f.color;
    const ghost = h.buildObject(id, color, { ghost: true });
    this.game.scene.add(ghost);
    this.holding = { id, color, rot: from ? from.rot : 0, ghost, valid: false, x: 0, z: 0, fromPlaced: !!from };
    this.game.audio.play('ui');
    this.render();
  }

  cancel() {
    const h = this.game.house;
    if (!this.holding) return;
    this.holding.ghost.removeFromParent();
    h.addToStorage(this.holding.id);
    this.holding = null;
    this.render();
  }

  rotate() {
    if (!this.holding) return;
    this.holding.rot = (this.holding.rot + 1) % 4;
    this.game.audio.play('ui');
  }

  recolor() {
    const hd = this.holding;
    if (!hd) return;
    const f = FURNITURE[hd.id];
    const pal = f.colors || PALETTE;
    const i = pal.indexOf(hd.color);
    hd.color = pal[(i + 1) % pal.length];
    const pos = hd.ghost.position.clone();
    const rot = hd.ghost.rotation.y;
    hd.ghost.removeFromParent();
    hd.ghost = this.game.house.buildObject(hd.id, hd.color, { ghost: true });
    hd.ghost.position.copy(pos);
    hd.ghost.rotation.y = rot;
    this.game.scene.add(hd.ghost);
    this.game.audio.play('ui');
  }

  groundPoint() {
    const g = this.game;
    const a = g.house.areas[this.area];
    const y = this.area === 'interior' ? 0 : g.world.heightAt(a.cx, a.cz);
    this.raycaster.setFromCamera(this.pointer, g.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, hit) ? hit : null;
  }

  click() {
    const g = this.game;
    const h = g.house;
    if (this.holding) {
      const hd = this.holding;
      if (!hd.valid) {
        g.audio.play('bite');
        return;
      }
      const f = FURNITURE[hd.id];
      const p = { id: hd.id, area: this.area, x: hd.x, z: hd.z, rot: hd.rot, color: hd.color };
      if (f.wall) Object.assign(p, { wallName: hd.wallName, along: hd.along, wallRot: hd.wallRot });
      if (hd.support) p.y = hd.y;
      h.place(p);
      hd.ghost.removeFromParent();
      this.holding = null;
      g.audio.play('pick');
      g.particles.emit('sparkle', p.obj.position.clone().add(new THREE.Vector3(0, 0.8, 0)), { count: 2 });
      g.emit('place', { id: p.id });
      this.render();
      return;
    }
    // Sinon : ramasser le meuble cliqué.
    this.raycaster.setFromCamera(this.pointer, g.camera);
    const objs = h.placed.filter((p) => p.area === this.area && p.obj.visible).map((p) => p.obj);
    const hits = this.raycaster.intersectObjects(objs, true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && !o.userData.placed) o = o.parent;
    if (!o) return;
    const p = o.userData.placed;
    // Un meuble qu'on déplace : ce qui est posé dessus retourne dans le rangement.
    const on = FURNITURE[p.id].top !== undefined ? h.itemsOn(p) : [];
    for (const it of on) {
      h.unplace(it);
      h.addToStorage(it.id);
    }
    if (on.length) g.ui.toast(`📦 ${on.length > 1 ? 'Les objets posés dessus sont rangés' : 'L\'objet posé dessus est rangé'} (onglet Meubles).`, 2600);
    h.unplace(p);
    this.take(p.id, p);
  }

  /**
   * Petit objet tenu au-dessus d'un meuble support : le plateau visé par la souris (le
   * plus proche de la caméra), ou null.
   */
  supportUnderPointer() {
    const g = this.game;
    const h = g.house;
    const ray = this.raycaster.ray;
    this.raycaster.setFromCamera(this.pointer, g.camera);
    const hit = new THREE.Vector3();
    let best = null;
    for (const p of h.placed) {
      if (p.area !== this.area || !p.obj.visible || FURNITURE[p.id].top === undefined) continue;
      const b = h.supportBox(p);
      if (!ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -b.top), hit)) continue;
      if (Math.abs(hit.x - b.x) > b.hw + 0.05 || Math.abs(hit.z - b.z) > b.hd + 0.05) continue;
      const d = ray.origin.distanceTo(hit);
      if (!best || d < best.d) best = { p, b, x: hit.x, z: hit.z, d };
    }
    return best;
  }

  update() {
    if (!this.active || !this.holding || this.tab === 'facade') return;
    const g = this.game;
    const h = g.house;
    const hd = this.holding;
    const pt = this.groundPoint();
    if (!pt) return;
    const a = h.areas[this.area];
    const f = FURNITURE[hd.id];
    hd.support = null;
    // Petit objet au-dessus d'une table, d'une commode, d'une étagère… : posé sur le plateau.
    const st = f.small ? this.supportUnderPointer() : null;
    if (st) {
      const { b } = st;
      const [fw, fd] = h.footprint(hd.id, hd.rot);
      const mx = Math.max(0, b.hw - Math.min(b.hw, Math.max(0.03, fw * 0.2)));
      const mz = Math.max(0, b.hd - Math.min(b.hd, Math.max(0.03, fd * 0.2)));
      const wx = Math.min(b.x + mx, Math.max(b.x - mx, a.cx + snap(st.x - a.cx, 0.05)));
      const wz = Math.min(b.z + mz, Math.max(b.z - mz, a.cz + snap(st.z - a.cz, 0.05)));
      hd.support = st.p;
      hd.x = wx - a.cx;
      hd.z = wz - a.cz;
      hd.y = b.top;
      hd.valid = h.canStack(hd.id, this.area, wx, wz, hd.rot, st.p);
      hd.ghost.position.set(wx, b.top + (hd.valid ? 0.005 : 0.03), wz);
      hd.ghost.rotation.y = hd.rot * (Math.PI / 2);
      const m = hd.ghost.userData.mat;
      m.emissive.set(hd.valid ? '#39d98a' : '#ff4d6d');
      m.emissiveIntensity = hd.valid ? 0.25 : 0.55;
      return;
    }
    let lx = snap(pt.x - a.cx);
    let lz = snap(pt.z - a.cz);
    let wallInfo = null;
    if (f.wall && this.area === 'interior') {
      // Accroche au mur le plus proche (fond, gauche ou droite).
      const dBack = lz + ROOM.d / 2;
      const dLeft = lx + ROOM.w / 2;
      const dRight = ROOM.w / 2 - lx;
      const inset = 0.1 + f.d / 2;
      if (dBack <= dLeft && dBack <= dRight) {
        wallInfo = { name: 'back', along: lx, len: ROOM.w };
        lz = -ROOM.d / 2 + inset;
        hd.wallRot = 0;
      } else if (dLeft < dRight) {
        wallInfo = { name: 'left', along: lz, len: ROOM.d };
        lx = -ROOM.w / 2 + inset;
        hd.wallRot = Math.PI / 2;
      } else {
        wallInfo = { name: 'right', along: lz, len: ROOM.d };
        lx = ROOM.w / 2 - inset;
        hd.wallRot = -Math.PI / 2;
      }
      hd.wallName = wallInfo.name;
      hd.along = wallInfo.along;
    }
    hd.x = lx;
    hd.z = lz;
    hd.valid = h.canPlace(hd.id, this.area, lx, lz, hd.rot, null, wallInfo);
    const wx = a.cx + lx;
    const wz = a.cz + lz;
    const y = h.worldPos({ id: hd.id, area: this.area, x: lx, z: lz, rot: hd.rot }).y;
    hd.ghost.position.set(wx, y + (hd.valid ? 0 : 0.02), wz);
    hd.ghost.rotation.y = f.wall ? hd.wallRot : hd.rot * (Math.PI / 2);
    const m = hd.ghost.userData.mat;
    m.emissive.set(hd.valid ? '#39d98a' : '#ff4d6d');
    m.emissiveIntensity = hd.valid ? 0.25 : 0.55;
  }
}

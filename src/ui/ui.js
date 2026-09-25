import * as THREE from 'three';
import { SPECIES } from '../animals/species.js';
import { ITEMS, HOTBAR } from '../game/items.js';
import { ZONES } from '../world/layout.js';
import { STORY } from '../game/quests.js';

// Interface HTML : HUD, bulle d'interaction, notifications, mini-carte, fenêtres.

const $ = (sel) => document.querySelector(sel);
const _v = new THREE.Vector3();

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      hud: $('#hud'),
      title: $('#title'),
      loading: $('#loading'),
      clockIcon: $('#clock-icon'),
      clockTime: $('#clock-time'),
      clockDay: $('#clock-day'),
      coins: $('#coins'),
      quest: $('#quest-tracker'),
      zone: $('#zone-label'),
      banner: $('#zone-banner'),
      prompt: $('#prompt'),
      toasts: $('#toasts'),
      inventory: $('#inventory'),
      followers: $('#followers'),
      minimap: $('#minimap'),
      bigmap: $('#bigmap'),
      dialog: $('#dialog'),
      touch: $('#touch'),
    };
    this.openPanel = null;
    this.promptKey = '';
    this.mapT = 0;

    this.buildInventory();
    this.mapImage = game.world.terrain.renderMap(384, 110);

    // Boutons du HUD.
    document.querySelectorAll('[data-open]').forEach((b) => {
      b.addEventListener('click', () => this.game.openPanel(b.dataset.open));
    });
    document.querySelectorAll('[data-close]').forEach((b) => {
      b.addEventListener('click', () => this.game.closePanels());
    });
    this.el.minimap.addEventListener('click', () => this.game.openPanel('map'));
    $('#btn-music').addEventListener('click', () => this.game.toggleMusic());
    $('#btn-decor').addEventListener('click', () => this.game.startDecor());
    $('#btn-photo').addEventListener('click', () => this.game.startPhoto());
    this.el.quest.addEventListener('click', () => this.game.openPanel('journal'));
    for (const id of ['#map', '#help']) {
      $(id).addEventListener('click', (e) => {
        if (e.target === e.currentTarget) this.game.closePanels();
      });
    }
    this.setupTouch();
  }

  // --- Écrans ----------------------------------------------------------------

  hideLoading() {
    this.el.loading.classList.add('hidden');
  }

  showTitle(hasSave) {
    this.el.title.classList.remove('hidden');
    $('#btn-continue').classList.toggle('hidden', !hasSave);
    this.el.hud.classList.add('hidden');
  }

  hideTitle() {
    this.el.title.classList.add('hidden');
  }

  showHUD(on) {
    this.el.hud.classList.toggle('hidden', !on);
    this.el.touch.classList.toggle('hidden', !(on && this.game.input.isTouch));
    if (!on) this.setPrompt(null);
  }

  // --- Inventaire & compagnons ----------------------------------------------

  buildInventory() {
    this.el.inventory.innerHTML = '';
    this.slots = {};
    for (const id of HOTBAR) {
      const f = ITEMS[id];
      const d = document.createElement('div');
      d.className = 'slot';
      d.title = f.label;
      d.innerHTML = `${f.emoji}<span class="count">0</span>`;
      this.el.inventory.appendChild(d);
      this.slots[id] = d;
    }
    const bag = document.createElement('button');
    bag.className = 'slot bag-btn';
    bag.title = 'Mon sac (I)';
    bag.innerHTML = '🎒<span class="count key-hint">I</span>';
    bag.onclick = () => this.game.openPanel('bag');
    this.el.inventory.appendChild(bag);
  }

  refreshInventory() {
    const inv = this.game.inventory;
    for (const [id, d] of Object.entries(this.slots)) {
      const n = inv[id] || 0;
      const c = d.querySelector('.count');
      if (c.textContent !== String(n)) {
        c.textContent = n;
        d.classList.remove('bump');
        void d.offsetWidth;
        d.classList.add('bump');
      }
      d.classList.toggle('empty', n === 0);
      d.classList.toggle('hidden', id === 'friandise' && n === 0);
    }
    if (this.openPanel === 'bag') this.game.bag.render();
  }

  refreshCoins(delta = 0) {
    this.el.coins.textContent = `🪙 ${this.game.coins}`;
    if (delta) {
      const f = document.createElement('div');
      f.className = 'coin-pop';
      f.textContent = `${delta > 0 ? '+' : ''}${delta} 🪙`;
      this.el.coins.parentElement.appendChild(f);
      setTimeout(() => f.remove(), 1200);
      this.el.coins.classList.remove('bump');
      void this.el.coins.offsetWidth;
      this.el.coins.classList.add('bump');
    }
  }

  refreshQuest() {
    const q = this.game.quests.current;
    const el = this.el.quest;
    if (!q) {
      el.innerHTML = '<b>🌟 Histoire terminée</b>';
      return;
    }
    const qs = this.game.quests;
    const i = q.goals.findIndex((g, k) => qs.goalProgress(q, k) < g.count);
    const goal = q.goals[Math.max(i, 0)];
    const p = qs.goalProgress(q, Math.max(i, 0));
    el.innerHTML = `<div class="qt-title">📜 ${escapeHtml(q.title)} <span>${STORY.indexOf(q) + 1}/${STORY.length}</span></div><div class="qt-goal">${escapeHtml(goal.label)} — ${p}/${goal.count}</div>`;
  }

  refreshAll() {
    this.refreshInventory();
    this.refreshCoins();
    this.refreshQuest();
    this.refreshFollowers();
  }

  refreshFollowers() {
    const list = this.game.animals.followers();
    this.el.followers.innerHTML = list
      .map((a) => `<div class="follower"><span class="em">${a.sp.emoji}</span>${escapeHtml(a.name)}</div>`)
      .join('');
  }

  // --- Notifications ----------------------------------------------------------

  toast(msg, ms = 3200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 450);
    }, ms);
  }

  setZoneLabel(zone) {
    this.el.zone.textContent = zone ? `${zone.emoji} ${zone.name}` : '🏝️ Île de Doucebrise';
  }

  zoneBanner(zone) {
    const b = this.el.banner;
    b.textContent = `${zone.emoji} ${zone.name}`;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 2600);
    this.el.zone.textContent = `${zone.emoji} ${zone.name}`;
  }

  // --- Bulle d'interaction ---------------------------------------------------

  /**
   * @param {null | {pos: THREE.Vector3, title: string, sub?: string, hearts?: number, actions: {key:string,label:string,dim?:boolean}[]}} target
   */
  setPrompt(target) {
    const el = this.el.prompt;
    if (!target) {
      el.classList.add('hidden');
      this.promptKey = '';
      return;
    }
    const key = JSON.stringify([target.title, target.sub, target.hearts, target.actions]);
    if (key !== this.promptKey) {
      this.promptKey = key;
      let html = `<div class="p-title">${escapeHtml(target.title)}</div>`;
      if (target.sub) html += `<div class="p-sub">${escapeHtml(target.sub)}</div>`;
      if (target.hearts !== undefined) html += `<div class="hearts">${heartsString(target.hearts)}</div>`;
      html += '<div class="actions">';
      for (const a of target.actions) {
        html += `<div class="act${a.dim ? ' dim' : ''}"><span class="key">${a.key}</span>${escapeHtml(a.label)}</div>`;
      }
      html += '</div>';
      el.innerHTML = html;
    }
    el.classList.remove('hidden');
    _v.copy(target.pos).project(this.game.camera);
    const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
    if (_v.z > 1) {
      el.classList.add('hidden');
      return;
    }
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y - 10)}px`;
  }

  // --- HUD par frame ---------------------------------------------------------

  update(dt) {
    const sky = this.game.world.sky;
    const h = sky.hour;
    const w = this.game.world.weather;
    this.el.clockTime.textContent = sky.timeLabel();
    this.el.clockDay.textContent = `${w.season.emoji} ${w.season.label} · jour ${sky.day}`;
    const night = h < 5.5 || h >= 20.5;
    let icon = night ? '🌙' : h < 7.5 ? '🌅' : h >= 18.5 ? '🌇' : '☀️';
    if (w.current !== 'clair') icon = night ? w.info.night : w.info.emoji;
    this.el.clockIcon.textContent = icon;
    this.el.clockIcon.title = w.info.label;
    this.mapT -= dt;
    if (this.mapT <= 0) {
      this.mapT = 0.15;
      this.drawMinimap();
      if (this.openPanel === 'map') this.drawBigMap();
    }
  }

  drawMinimap() {
    const c = this.el.minimap;
    const ctx = c.getContext('2d');
    const size = c.width;
    // Dans la maison, la carte reste centrée sur le jardin.
    const p = this.game.house.inside ? this.game.world.village.doorFront(0, 1.6) : this.game.player.pos;
    const range = 46; // unités visibles de part et d'autre
    const img = this.mapImage;
    const scale = img.width / 220;
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#6fc6e2';
    ctx.fillRect(0, 0, size, size);
    const sx = (p.x - range + 110) * scale;
    const sy = (p.z - range + 110) * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, sx, sy, range * 2 * scale, range * 2 * scale, 0, 0, size, size);
    const toMap = (x, z) => [((x - p.x + range) / (range * 2)) * size, ((z - p.z + range) / (range * 2)) * size];
    this.drawMarkers(ctx, toMap, 1);
    ctx.restore();
  }

  drawBigMap() {
    const c = this.el.bigmap;
    const ctx = c.getContext('2d');
    const size = c.width;
    ctx.fillStyle = '#6fc6e2';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(this.mapImage, 0, 0, size, size);
    const toMap = (x, z) => [((x + 110) / 220) * size, ((z + 110) / 220) * size];
    ctx.font = '800 14px Nunito, sans-serif';
    ctx.textAlign = 'center';
    for (const z of ZONES) {
      const [x, y] = toMap(z.x, z.z);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.fillStyle = '#5b4636';
      ctx.strokeText(`${z.emoji} ${z.name}`, x, y);
      ctx.fillText(`${z.emoji} ${z.name}`, x, y);
    }
    this.drawMarkers(ctx, toMap, 1.4);
  }

  drawMarkers(ctx, toMap, k) {
    const g = this.game;
    // Maison.
    const home = g.world.village.houses[0];
    const [hx, hy] = toMap(home.x, home.z);
    ctx.font = `${Math.round(16 * k)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏠', hx, hy);
    // Animaux adoptés.
    for (const a of g.animals.companions()) {
      const [ax, ay] = toMap(a.pos.x, a.pos.z);
      ctx.fillStyle = '#ff8fab';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax, ay, 4.5 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Joueur : flèche orientée.
    const p = g.player;
    const pp = g.house.inside ? g.world.village.doorFront(0, 1.6) : p.pos;
    const [px, py] = toMap(pp.x, pp.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-p.rotY + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#5b4636';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -9 * k);
    ctx.lineTo(7 * k, 7 * k);
    ctx.lineTo(0, 3 * k);
    ctx.lineTo(-7 * k, 7 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --- Dialogue de nom ------------------------------------------------------

  askName({ title, text, value = '', suggestions = [] }) {
    return new Promise((resolve) => {
      const d = this.el.dialog;
      $('#dialog-title').textContent = title;
      $('#dialog-text').textContent = text;
      const input = $('#dialog-input');
      input.value = value;
      const chips = $('#dialog-chips');
      chips.innerHTML = '';
      for (const s of suggestions) {
        const b = document.createElement('button');
        b.className = 'chip';
        b.textContent = s;
        b.onclick = () => {
          input.value = s;
        };
        chips.appendChild(b);
      }
      d.classList.remove('hidden');
      this.game.input.enabled = false;
      setTimeout(() => input.focus(), 50);
      const done = (val) => {
        d.classList.add('hidden');
        this.game.input.enabled = true;
        $('#dialog-ok').onclick = null;
        $('#dialog-cancel').onclick = null;
        input.onkeydown = null;
        resolve(val);
      };
      $('#dialog-ok').onclick = () => done(input.value.trim() || value || suggestions[0] || '');
      $('#dialog-cancel').onclick = () => done(null);
      input.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') done(input.value.trim() || value || suggestions[0] || '');
        if (e.key === 'Escape') done(null);
      };
    });
  }

  // --- Tactile ---------------------------------------------------------------

  setupTouch() {
    const input = this.game.input;
    const joy = $('#joystick');
    const stick = joy.querySelector('.stick');
    let id = null;
    const move = (t) => {
      const r = joy.getBoundingClientRect();
      let x = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let y = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      input.joystick.x = x;
      input.joystick.y = -y;
      input.joystick.active = true;
      stick.style.transform = `translate(${x * 36}px, ${y * 36}px)`;
    };
    joy.addEventListener('touchstart', (e) => {
      id = e.changedTouches[0].identifier;
      move(e.changedTouches[0]);
      e.preventDefault();
    }, { passive: false });
    joy.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) move(t);
      e.preventDefault();
    }, { passive: false });
    const end = () => {
      id = null;
      input.joystick.active = false;
      input.joystick.x = 0;
      input.joystick.y = 0;
      stick.style.transform = '';
    };
    joy.addEventListener('touchend', end);
    joy.addEventListener('touchcancel', end);
    document.querySelectorAll('.tbtn').forEach((b) => {
      b.addEventListener('touchstart', (e) => {
        input.tap(b.dataset.key);
        e.preventDefault();
      }, { passive: false });
      b.addEventListener('click', () => input.tap(b.dataset.key));
    });
  }
}

export function heartsString(trust) {
  const full = Math.floor(trust / 20);
  const half = trust % 20 >= 10 ? 1 : 0;
  let s = '';
  for (let i = 0; i < 5; i++) s += i < full ? '💗' : i === full && half ? '💓' : '🤍';
  return s;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export { SPECIES };

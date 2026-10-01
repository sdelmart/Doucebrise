import * as THREE from 'three';
import { SHOP_FEATURE } from '../game/features.js';
import { ITEMS, countItem, takeItem } from '../game/items.js';
import { HEART_EVENTS } from '../npc/villagers.js';
import { FISH } from '../game/fish.js';
import { heartsString, escapeHtml } from './ui.js';

// Fenêtre de dialogue avec les habitants : discuter, offrir, demande du jour, boutique.

const TALK_GAIN = 4;
const GIFT_GAIN = { love: 18, like: 10, neutral: 4, dislike: -3 };

export class Dialogue {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'dialogue';
    this.el.className = 'dialogue hidden';
    document.body.appendChild(this.el);
    this.villager = null;
    this.typing = null;
    this.openedAt = 0;
    window.addEventListener('keydown', (e) => {
      if (!this.villager) return;
      if (e.target && e.target.tagName === 'INPUT') return;
      const n = parseInt(e.key, 10);
      const buttons = [...this.el.querySelectorAll('.d-choice:not(.d-leave)')];
      if (n >= 1 && n <= buttons.length) {
        buttons[n - 1].click();
        e.preventDefault();
      } else if (e.code === 'Escape') {
        this.close();
      } else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        if (this.typing) this.finishTyping();
        else if (buttons.length === 1) buttons[0].click();
        e.preventDefault();
      }
    });
    // Partir en cliquant à côté de la fenêtre, sur la scène. Un simple clic (ou un toucher) :
    // glisser pour tourner la caméra ne ferme rien.
    let down = null;
    // (Heures des événements eux-mêmes : une image lente entre l'appui et le relâchement ne
    // change rien.)
    window.addEventListener('pointerdown', (e) => {
      down = this.villager && e.target?.id === 'game' ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
    }, true);
    window.addEventListener('pointerup', (e) => {
      if (!down) return;
      const click = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && e.timeStamp - down.t < 1000;
      down = null;
      if (click && this.villager && e.timeStamp - this.openedAt > 300) {
        this.game.audio.play('ui');
        this.close();
      }
    }, true);
  }

  get open() {
    return !!this.villager;
  }

  start(v) {
    const g = this.game;
    this.villager = v;
    this.openedAt = performance.now();
    g.input.enabled = false;
    g.player.face(v.pos.x, v.pos.z);
    v.rotY = Math.atan2(g.player.pos.x - v.pos.x, g.player.pos.z - v.pos.z);
    v.character.play('wave', 1.2);
    const day = g.world.sky.day;
    let text;
    const birthday = g.calendar.isBirthday(v.def.id);
    if (!v.met) {
      v.met = true;
      const place = { pins: 'de Bourg-Sapin', corail: 'de Port-Corail' }[v.villageId] || 'de Doucebrise';
      text = `Bonjour ! Je suis ${v.def.name}, ${v.def.job.toLowerCase()} ${place}. Toi, tu dois être ${g.character.appearance.name} ! Bienvenue ${v.villageId === 'main' || !v.villageId ? 'sur l\'île' : 'chez nous'} !`;
      // Première rencontre : cet habitant peut désormais avoir une demande du jour.
      g.quests.refreshRequests();
    } else if (birthday && v.talkedDay !== day) {
      text = 'Tu sais quel jour on est ? C\'est mon anniversaire ! 🎂 Hi hi, merci d\'être passé·e !';
    } else {
      text = v.greeting();
    }
    const first = v.talkedDay !== day;
    if (first) {
      v.talkedDay = day;
      this.addFriendship(v, TALK_GAIN);
    }
    g.emit('talk', { villager: v });
    // Scène d'amitié en attente ?
    const ev = (HEART_EVENTS[v.def.id] || []).find((e) => v.friendship >= e.at && !v.seenEvents.includes(e.at));
    if (ev && v.met) {
      this.heartEvent(v, ev);
      return;
    }
    this.render(text);
  }

  /** Scène d'amitié : une confidence, puis un choix de réponse. */
  heartEvent(v, ev) {
    const g = this.game;
    v.character.play('think', 1.4);
    g.audio.play('chapter');
    const choices = ev.choices.map((c) => ({
      label: `💬 ${c.label}`,
      action: () => {
        // Vue une fois la réponse choisie : partir avant (Échap, clic à côté) la garde pour
        // la prochaine visite.
        if (!v.seenEvents.includes(ev.at)) v.seenEvents.push(ev.at);
        this.addFriendship(v, c.gain);
        v.character.play(c.gain >= 8 ? 'celebrate' : 'clap', 1.3);
        if (c.gain >= 7) g.particles.emit('heart', v.pos.clone().setY(v.pos.y + 2.2), { count: 4 });
        if (c.reward) setTimeout(() => g.grantReward(c.reward, v), 400);
        g.emit('heartEvent', { villager: v, at: ev.at });
        this.render(c.reply);
      },
    }));
    this.render(`💞 ${ev.text}`, choices);
    this.el.classList.add('heart-scene');
    this.cinematic(true);
  }

  /** Enchaîne plusieurs répliques, puis appelle done(). */
  sequence(lines, done, { cinematic = false } = {}) {
    let i = 0;
    if (cinematic) this.cinematic(true);
    const next = () => {
      const last = i === lines.length - 1;
      const text = lines[i++];
      this.render(text, [{ label: last ? '✨ D\'accord !' : '▶ Suite', primary: true, action: () => {
        if (last) {
          this.cinematic(false);
          done?.();
          if (this.villager) this.render(this.villager.greeting());
        } else next();
      } }]);
    };
    next();
  }

  /**
   * Répliques de l'histoire : bandes de cinéma et plan sur l'habitant qui parle, vu de
   * trois quarts par-dessus l'épaule de la joueuse ; la caméra revient ensuite derrière elle.
   */
  cinematic(on) {
    const g = this.game;
    if (on === !!this.cine) return;
    if (!on) {
      const prev = this.cine;
      this.cine = null;
      document.body.classList.remove('letterbox');
      if (g.cam.mode === 'cine' && !g.inFinale) {
        g.cam.setMode('follow');
        Object.assign(g.cam, prev);
      }
      return;
    }
    const v = this.villager;
    if (!v || g.inFinale) return;
    const p = g.player.pos;
    const dir = new THREE.Vector3(v.pos.x - p.x, 0, v.pos.z - p.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    dir.normalize();
    let side = new THREE.Vector3(-dir.z, 0, dir.x);
    const mid = new THREE.Vector3((p.x + v.pos.x) / 2, (p.y + v.pos.y) / 2, (p.z + v.pos.z) / 2);
    // Du côté où se trouve déjà la caméra (pas de saut d'un bord à l'autre).
    if (side.dot(g.camera.position.clone().sub(mid)) < 0) side = side.negate();
    const h = 1.45 * (v.def.appearance?.height || 1);
    const pos = mid.clone().addScaledVector(side, 2.7).addScaledVector(dir, -1.1);
    pos.y = mid.y + h + 0.25;
    const look = new THREE.Vector3(v.pos.x, v.pos.y + h * 0.82, v.pos.z).addScaledVector(dir, -0.3);
    this.cine = { yaw: g.cam.yaw, pitch: g.cam.pitch, dist: g.cam.dist };
    g.cam.setCinematic(pos, look);
    g.cam.snap = true;
    document.body.classList.add('letterbox');
  }

  close() {
    if (!this.villager) return;
    this.cinematic(false);
    this.villager = null;
    this.el.classList.add('hidden');
    this.el.classList.remove('heart-scene');
    this.game.input.enabled = true;
    clearInterval(this.typing);
    this.typing = null;
  }

  addFriendship(v, amount) {
    const before = v.friendship;
    v.friendship = Math.max(0, Math.min(100, v.friendship + amount));
    this.game.emit('friendship', { villager: v });
    for (const [thr, reward] of Object.entries(v.def.rewards)) {
      const t = parseInt(thr, 10);
      if (before < t && v.friendship >= t && !v.rewardsGiven.includes(t)) {
        v.rewardsGiven.push(t);
        this.game.grantReward(reward, v);
      }
    }
    this.game.requestSave();
  }

  header(v) {
    return `<div class="d-head"><span class="d-avatar">${v.def.emoji}</span>
      <div><div class="d-name">${escapeHtml(v.def.name)} <span class="d-job">${escapeHtml(v.def.job)}</span></div>
      <div class="d-hearts">${heartsString(v.friendship)}</div></div></div>`;
  }

  render(text, choices = null) {
    const v = this.villager;
    const g = this.game;
    if (!v) return;
    this.el.classList.remove('hidden');
    if (!choices) this.el.classList.remove('heart-scene');
    // ✕ en dernier dans la page (placé en haut à droite) : la manette commence par les choix.
    this.el.innerHTML = `${this.header(v)}<p class="d-text"></p><div class="d-choices"></div><button type="button" class="d-close" title="Partir (Échap)" aria-label="Partir">✕</button>`;
    this.el.querySelector('.d-close').onclick = () => {
      g.audio.play('ui');
      this.close();
    };
    this.type(text);
    const box = this.el.querySelector('.d-choices');
    const list = choices || this.mainChoices();
    let n = 0;
    for (const c of list) {
      const b = document.createElement('button');
      // « À faire » (étiquette : quête, demande…) en pleine largeur, puis les actions
      // simples, puis « Au revoir » à droite (touche Échap).
      b.className = `d-choice${c.primary ? ' primary' : ''}${c.tag ? ' todo' : ''}${c.leave ? ' d-leave' : ''}`;
      const tag = c.tag ? `<span class="d-tag">${c.tag}</span>` : '';
      b.innerHTML = `<span class="key">${c.leave ? 'Échap' : ++n}</span>${tag}<span class="d-label">${c.label}</span>`;
      b.disabled = !!c.disabled;
      b.onclick = () => {
        g.audio.play('ui');
        c.action();
      };
      box.appendChild(b);
    }
  }

  mainChoices() {
    const v = this.villager;
    const g = this.game;
    const day = g.world.sky.day;
    // Ce qu'on a à faire avec cet habitant (avec une étiquette), puis les actions de tous
    // les jours.
    const tagged = (list, tag) => list.map((c) => ({ tag, ...c }));
    const list = [
      ...tagged(g.quests.dialogueChoices(v, this), 'Histoire'),
      ...tagged(g.sideQuests.dialogueChoices(v, this), 'Quête'),
      ...tagged(g.jobs.dialogueChoices(v, this), 'Petit boulot'),
      ...tagged(g.festivals.dialogueChoices(v, this), 'Fête'),
    ];
    const c = g.calendar;
    if (v.def.id === 'marin' && c.contestActive && c.contest && !c.contest.done && g.features.unlocked('peche')) {
      const f = c.contest.fish ? FISH.find((x) => x.id === c.contest.fish) : null;
      list.push({
        tag: 'Fête',
        label: f ? `🏆 Concours : présenter ${f.emoji} ${f.label} (${c.contest.best} cm)` : '🏆 Concours de pêche : les règles ?',
        primary: !!f,
        action: () => {
          if (!f) {
            this.render('Aujourd\'hui, c\'est le grand concours ! Pêche le plus gros poisson possible avant 18 h, puis reviens me le montrer. Le plus gros gagne !');
            return;
          }
          const r = c.contestResults();
          const podium = r.all.slice(0, 3).map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${x.name} (${x.size} cm)`).join(' · ');
          this.render(r.rank === 1 ? `Incroyable ! ${c.contest.best} cm ! Tu remportes le concours, moussaillon ! ${podium}` : `Belle prise ! Tu termines ${r.rank}e. ${podium}`);
        },
      });
    }
    const req = g.quests.requestFor(v.def.id);
    if (req && !req.done) {
      const it = ITEMS[req.item];
      list.push({ tag: 'Demande du jour', label: `📋 ${it.label} ${it.emoji} ×${req.count}`, primary: true, action: () => this.requestMenu(req) });
    }
    list.push({ label: '💬 Discuter', action: () => this.render(v.line('chat')) });
    list.push({ label: v.giftDay === day ? '🎁 Déjà offert aujourd\'hui' : '🎁 Offrir un cadeau', disabled: v.giftDay === day, action: () => this.giftMenu() });
    // Boutique et adoption : ouvertes avec l'histoire (avant, l'habitant dit quand).
    const F = g.features;
    const soon = (id) => () => this.render(F.sayLocked(id, v.def.id));
    if (v.def.shop === 'cafe' && F.unlocked('adoption')) list.push({ label: '🐱 Adopter un chat', action: () => this.openAdoption() });
    const shopF = SHOP_FEATURE[v.def.shop];
    if (v.def.shop && shopF && !F.unlocked(shopF)) list.push({ label: '🔒 Boutique', action: soon(shopF) });
    else if (v.def.shop) list.push({ label: '🛍️ Boutique', action: () => this.openShop() });
    list.push({ label: '👋 Au revoir', leave: true, action: () => this.close() });
    return list;
  }

  openAdoption() {
    const v = this.villager;
    if (!v) return;
    this.close();
    this.game.adoption.open(v);
  }

  openShop() {
    const v = this.villager;
    if (!v) return;
    this.close();
    this.game.shop.open(v.def.shop, v);
  }

  giftMenu() {
    const g = this.game;
    const owned = Object.keys(ITEMS).filter((id) => g.inventory[id] > 0 && ITEMS[id].cat !== 'seed' && ITEMS[id].cat !== 'quest');
    if (!owned.length) {
      this.render('Oh, tu n\'as rien dans ton sac… Ce n\'est pas grave !', [{ label: '↩️ Retour', action: () => this.render(this.villager.greeting()) }]);
      return;
    }
    this.el.querySelector('.d-text').textContent = 'Que veux-tu offrir ?';
    const box = this.el.querySelector('.d-choices');
    box.innerHTML = '';
    box.classList.add('grid');
    for (const id of owned) {
      const b = document.createElement('button');
      b.className = 'd-item';
      b.title = ITEMS[id].label;
      b.innerHTML = `<span>${ITEMS[id].emoji}</span><small>${g.inventory[id]}</small>`;
      b.onclick = () => this.give(id);
      box.appendChild(b);
    }
    const back = document.createElement('button');
    back.className = 'd-choice';
    back.textContent = '↩️ Retour';
    back.onclick = () => {
      box.classList.remove('grid');
      this.render(this.villager.greeting());
    };
    box.appendChild(back);
  }

  give(id) {
    const g = this.game;
    const v = this.villager;
    g.inventory[id] -= 1;
    v.giftDay = g.world.sky.day;
    const r = v.reaction(id);
    const birthday = g.calendar.isBirthday(v.def.id);
    const flowers = g.calendar.festival?.id === 'fleurs' && id === 'fleur';
    const gain = GIFT_GAIN[r] * (birthday && r !== 'dislike' ? 2 : 1) * (flowers ? 1.5 : 1) * (r !== 'dislike' ? g.calendar.giftBonus(id) : 1);
    this.addFriendship(v, Math.round(gain));
    v.character.play(r === 'dislike' ? 'think' : r === 'love' ? 'celebrate' : 'clap', 1.4);
    if (r !== 'dislike') g.particles.emit('heart', v.pos.clone().setY(v.pos.y + 2.2), { count: r === 'love' ? 5 : 2 });
    g.audio.play(r === 'love' ? 'fav' : 'pet');
    g.emit('gift', { villager: v, item: id, reaction: r, birthday });
    g.ui.refreshInventory();
    this.el.querySelector('.d-choices').classList.remove('grid');
    const tip = r === 'love' ? ' (Son cadeau préféré !)' : '';
    const bday = birthday && r !== 'dislike' ? ' Et pour mon anniversaire, en plus ! Tu es un amour ! 🎂' : '';
    this.render(`${v.def.lines.gift[r]}${tip}${bday}`);
  }

  requestMenu(req) {
    const g = this.game;
    const v = this.villager;
    const have = countItem(g.inventory, req.item);
    const it = ITEMS[req.item];
    const text = `${req.text} Il me faudrait ${req.count} ${it.label.toLowerCase()} ${it.emoji}. Je te donnerai ${req.reward} 🪙 !`;
    const choices = [];
    if (have >= req.count) {
      choices.push({ label: `✅ Donner ${it.emoji} ×${req.count}`, primary: true, action: () => {
        takeItem(g.inventory, req.item, req.count);
        g.addCoins(req.reward);
        req.done = true;
        this.addFriendship(v, 12);
        v.character.play('celebrate', 1.4);
        g.particles.emit('sparkle', v.pos.clone().setY(v.pos.y + 2), { count: 3 });
        g.audio.play('adopt');
        g.emit('request', { villager: v });
        g.ui.refreshInventory();
        this.render(`Merci infiniment ! Voilà ${req.reward} 🪙, comme promis.`);
      } });
    } else {
      choices.push({ label: `Tu en as ${have}/${req.count}`, disabled: true, action: () => {} });
    }
    choices.push({ label: '↩️ Retour', action: () => this.render(v.greeting()) });
    this.render(text, choices);
  }

  type(text) {
    const p = this.el.querySelector('.d-text');
    clearInterval(this.typing);
    let i = 0;
    p.textContent = '';
    this.fullText = text;
    this.typing = setInterval(() => {
      i += 2;
      p.textContent = text.slice(0, i);
      if (i >= text.length) this.finishTyping();
    }, 16);
  }

  finishTyping() {
    clearInterval(this.typing);
    this.typing = null;
    const p = this.el.querySelector('.d-text');
    if (p) p.textContent = this.fullText;
  }
}

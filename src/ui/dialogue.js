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
    window.addEventListener('keydown', (e) => {
      if (!this.villager) return;
      if (e.target && e.target.tagName === 'INPUT') return;
      const n = parseInt(e.key, 10);
      const buttons = [...this.el.querySelectorAll('.d-choice')];
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
  }

  get open() {
    return !!this.villager;
  }

  start(v) {
    const g = this.game;
    this.villager = v;
    g.input.enabled = false;
    g.player.face(v.pos.x, v.pos.z);
    v.rotY = Math.atan2(g.player.pos.x - v.pos.x, g.player.pos.z - v.pos.z);
    v.character.play('wave', 1.2);
    const day = g.world.sky.day;
    let text;
    const birthday = g.calendar.isBirthday(v.def.id);
    if (!v.met) {
      v.met = true;
      text = `Bonjour ! Je suis ${v.def.name}, ${v.def.job.toLowerCase()} de Doucebrise. Toi, tu dois être ${g.character.appearance.name} ! Bienvenue sur l'île !`;
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
    v.seenEvents.push(ev.at);
    v.character.play('think', 1.4);
    g.audio.play('chapter');
    const choices = ev.choices.map((c) => ({
      label: `💬 ${c.label}`,
      action: () => {
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
  }

  /** Enchaîne plusieurs répliques, puis appelle done(). */
  sequence(lines, done) {
    let i = 0;
    const next = () => {
      const last = i === lines.length - 1;
      const text = lines[i++];
      this.render(text, [{ label: last ? '✨ D\'accord !' : '▶ Suite', primary: true, action: () => {
        if (last) {
          done?.();
          if (this.villager) this.render(this.villager.greeting());
        } else next();
      } }]);
    };
    next();
  }

  close() {
    if (!this.villager) return;
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
    this.el.innerHTML = `${this.header(v)}<p class="d-text"></p><div class="d-choices"></div>`;
    this.type(text);
    const box = this.el.querySelector('.d-choices');
    const list = choices || this.mainChoices();
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = `d-choice${c.primary ? ' primary' : ''}`;
      b.innerHTML = `<span class="key">${i + 1}</span>${c.label}`;
      b.disabled = !!c.disabled;
      b.onclick = () => {
        g.audio.play('ui');
        c.action();
      };
      box.appendChild(b);
    });
  }

  mainChoices() {
    const v = this.villager;
    const g = this.game;
    const day = g.world.sky.day;
    const list = [...g.quests.dialogueChoices(v, this), ...g.sideQuests.dialogueChoices(v, this), ...g.jobs.dialogueChoices(v, this)];
    list.push({ label: '💬 Discuter', action: () => this.render(v.line('chat')) });
    const c = g.calendar;
    if (v.def.id === 'marin' && c.contestActive && c.contest && !c.contest.done) {
      const f = c.contest.fish ? FISH.find((x) => x.id === c.contest.fish) : null;
      list.push({
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
    list.push({ label: v.giftDay === day ? '🎁 Déjà offert aujourd\'hui' : '🎁 Offrir un cadeau', disabled: v.giftDay === day, action: () => this.giftMenu() });
    const req = g.quests.requestFor(v.def.id);
    if (req && !req.done) list.push({ label: `📋 Demande : ${ITEMS[req.item].emoji} ×${req.count}`, primary: true, action: () => this.requestMenu(req) });
    if (v.def.shop) list.push({ label: '🛍️ Boutique', primary: true, action: () => this.openShop() });
    list.push({ label: '👋 Au revoir', action: () => this.close() });
    return list;
  }

  openShop() {
    const v = this.villager;
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
    const gain = GIFT_GAIN[r] * (birthday && r !== 'dislike' ? 2 : 1) * (flowers ? 1.5 : 1);
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

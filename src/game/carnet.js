import * as THREE from 'three';
import { LANDMARKS } from '../world/layout.js';
import { softDotTexture } from '../core/materials.js';
import { escapeHtml } from '../ui/ui.js';

// Le carnet du gardien : sept pages du journal de l'ancien gardien du phare, envolées sur
// l'île. Chaque chapitre terminé (1 à 7) en libère une ; une colonne de lumière pâle la
// signale de loin, une énigme dit où chercher. Ensemble, elles racontent pourquoi le phare
// s'est éteint… et qui l'a écrit.

const local = (b, lx, lz) => ({ x: b.x + lx * Math.cos(b.rot) + lz * Math.sin(b.rot), z: b.z - lx * Math.sin(b.rot) + lz * Math.cos(b.rot) });
const dock = (g, name, back = 1.6) => {
  const s = g.world.fishingSpots.find((f) => f.name === name);
  return s ? { x: s.x - s.dirX * back, z: s.z - s.dirZ * back } : null;
};
const toward = (from, to, d) => {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x: from.x + (dx / l) * d, z: from.z + (dz / l) * d };
};

export const PAGES = [
  {
    n: 1, chapter: 'arrivee', emoji: '🌱', date: 'Printemps — premier jour au phare',
    riddle: 'Là où arrivent les lettres, une autre attend depuis bien plus longtemps…',
    place: 'près de ta boîte aux lettres',
    spot: (g) => toward(g.world.village.mailbox, { x: 0, z: 0 }, 1.6),
    text: [
      'Le vieux gardien m\'a confié les clés ce matin, avec un seul conseil : « La lumière, petit, ce n\'est pas la lampe qui la fait. C\'est l\'île. » Je n\'ai rien compris.',
      'À midi, une jeune fille aux mains pleines de terre est montée jusqu\'ici. Elle m\'a tendu un sachet de graines « pour que tu ne te sentes pas seul, là-haut ».',
      'Elle s\'appelle Rose.',
    ],
  },
  {
    n: 2, chapter: 'amis', emoji: '🐈', date: 'Une nuit d\'orage',
    riddle: 'Là où un grand chat roux fait la sieste sur le toit, cherche du côté de sa queue.',
    place: 'à côté du Café des Chats',
    spot: (g) => {
      const b = g.world.village.cafe;
      return b ? local(b, 4.9, 0.9) : null;
    },
    text: [
      'Un chaton s\'est faufilé dans le phare cette nuit, trempé jusqu\'aux moustaches. Je l\'ai séché près de la lampe et je l\'ai appelé Mistral.',
      'Rose dit qu\'il a choisi le phare parce que c\'est l\'endroit le plus chaud de l\'île. Moi, je crois qu\'il cherchait seulement quelqu\'un.',
      'Ce soir, le faisceau m\'a paru plus doux. Le vieux gardien avait peut-être raison.',
    ],
  },
  {
    n: 3, chapter: 'tresors', emoji: '🎶', date: 'La fête des fleurs',
    riddle: 'Au milieu des fleurs, sous un toit tout rond, on y jouait de la musique jusqu\'à minuit.',
    place: 'sur le kiosque à musique de la prairie',
    spot: (g) => {
      const b = g.world.islands.bandstand;
      return b ? { x: b.x, z: b.z } : null;
    },
    text: [
      'Tout le village a dansé dans la prairie jusqu\'à minuit. Depuis la galerie du phare, j\'ai vu le faisceau devenir doré, comme s\'il dansait avec eux.',
      'Rose m\'a appris à danser. Je lui ai marché sur les pieds trois fois. Elle a ri si fort que les musiciens se sont arrêtés.',
      'Je crois que je n\'oublierai jamais ce rire.',
    ],
  },
  {
    n: 4, chapter: 'grandbleu', emoji: '⛵', date: 'La grande tempête',
    riddle: 'Au bout des planches qui avancent dans la mer, là où l\'on attend que ça morde.',
    place: 'au bout du ponton de la plage',
    spot: (g) => dock(g, 'le ponton'),
    text: [
      'Le petit Marin — douze ans à peine, quel têtard ! — est parti pêcher seul. Puis la tempête est tombée, et la brume avec.',
      'J\'ai gardé la lampe allumée toute la nuit. Quand l\'huile a manqué, j\'ai brûlé mes chaises, puis ma table.',
      'Au matin, sa barque est rentrée, guidée par le faisceau. Sa mère m\'a serré si fort que j\'en ai encore mal aux côtes. Ça valait bien une table.',
    ],
  },
  {
    n: 5, chapter: 'nid', emoji: '🏮', date: 'Fin d\'été',
    riddle: 'Ses grandes ailes tournent toute la journée… et pourtant, il ne s\'envole jamais.',
    place: 'au pied du moulin',
    spot: (g) => toward(LANDMARKS.windmill, { x: 0, z: 0 }, 4.2),
    text: [
      'J\'ai aidé le vieux Barnabé, le menuisier, à refaire le toit du moulin. En échange, il m\'a sculpté une petite lanterne en bois, avec un cœur découpé sur la porte.',
      'Je l\'ai offerte à Rose. Sous le pied, j\'avais gravé une question.',
      'Elle a souri et m\'a dit : « Demande-le-moi en vrai, le soir où le phare sera le plus beau de tous. » Alors j\'attends ce soir-là.',
    ],
  },
  {
    n: 6, chapter: 'chemins', emoji: '🍂', date: 'Les années passent',
    riddle: 'Au bord de l\'eau qui dort, sur les planches où l\'on pêche les carpes.',
    place: 'sur le ponton de l\'étang',
    spot: (g) => dock(g, 'l\'étang'),
    text: [
      'Le bateau à moteur relie maintenant le continent. Les jeunes partent, les fêtes se font rares, chacun reste chez soi.',
      'Le faisceau faiblit un peu plus chaque nuit. J\'ai tout vérifié : la lampe, les miroirs, l\'huile. Rien n\'est cassé.',
      'Rose ne monte plus au phare. Je n\'ose plus descendre au village. C\'est idiot, n\'est-ce pas ?',
    ],
  },
  {
    n: 7, chapter: 'famille', emoji: '🗼', date: 'Dernière page',
    riddle: 'Au pied du géant rayé qui veille sur la mer, là où tout a commencé.',
    place: 'au pied du phare',
    spot: () => toward(LANDMARKS.lighthouse, { x: 0, z: 0 }, 5.6),
    text: [
      'Le phare n\'éclaire presque plus. Je crois que j\'ai enfin compris le vieux gardien : la lumière, c\'était nous tous. Je n\'ai pas su la garder.',
      'Je pars demain pour l\'île des Pins, au nord, là où la brume cache tout. Je n\'ai jamais posé ma question à Rose.',
      'Si quelqu\'un trouve ce carnet… rallume le phare. Pour elle.',
    ],
    sign: '— Aurèle',
  },
];

// Texture de page : papier crème, lignes, écriture griffonnée.
function pageTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 168;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7ead0';
  ctx.fillRect(0, 0, 128, 168);
  ctx.strokeStyle = 'rgba(160, 120, 80, 0.35)';
  ctx.lineWidth = 2;
  for (let y = 26; y < 160; y += 14) {
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.lineTo(116, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(70, 50, 40, 0.7)';
  ctx.lineWidth = 2.2;
  for (let y = 22; y < 150; y += 14) {
    ctx.beginPath();
    let x = 14 + Math.random() * 6;
    ctx.moveTo(x, y);
    const end = 70 + Math.random() * 44;
    while (x < end) {
      x += 4 + Math.random() * 5;
      ctx.lineTo(x, y + (Math.random() - 0.5) * 3);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = '#c9a77a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 162);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Colonne de lumière : plus lumineuse en bas, qui s'efface vers le haut.
function pillarTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const ctx = c.getContext('2d');
  const gr = ctx.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export class Carnet {
  constructor(game) {
    this.game = game;
    this.found = new Set();
    this.tracked = null;
    this.introduced = false;
    this.group = new THREE.Group();
    this.group.name = 'carnet';
    game.scene.add(this.group);
    this.items = new Map(); // n → { page, root, paper, spot }
    this.paperTex = pageTexture();
    this.paperMat = new THREE.MeshBasicMaterial({ map: this.paperTex, side: THREE.DoubleSide });
    this.pillarMat = new THREE.MeshBasicMaterial({ map: pillarTexture(), color: '#ffe2a6', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.glowMat = new THREE.SpriteMaterial({ map: softDotTexture(), color: '#ffd98a', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    this.t = 0;
    this.buildModal();
  }

  /** La page est-elle libérée (son chapitre terminé) ? */
  unlocked(p) {
    const q = this.game.quests;
    return q.chapterQuests(p.chapter).every((s) => q.completed.includes(s.id));
  }

  /** Pages libérées pas encore trouvées, dans l'ordre. */
  available() {
    return PAGES.filter((p) => this.unlocked(p) && !this.found.has(p.n));
  }

  /** Prochaine page à chercher (la suivie d'abord). */
  next() {
    const list = this.available();
    return list.find((p) => p.n === this.tracked) || list[0] || null;
  }

  get count() {
    return this.found.size;
  }

  get pages() {
    return PAGES;
  }

  /** Page libérée par ce chapitre. */
  pageOfChapter(id) {
    return PAGES.find((p) => p.chapter === id) || null;
  }

  spotOf(p) {
    const it = this.items.get(p.n);
    if (it) return it.spot;
    try {
      const s = p.spot(this.game);
      if (!s) return null;
      const r = this.game.world.colliders.resolve(s.x, s.z, 0.55);
      return { x: r.x, z: r.z, y: this.game.world.groundAt(r.x, r.z) };
    } catch {
      return null;
    }
  }

  /** Cible du guide : la page suivie. */
  target() {
    if (!this.tracked) return null;
    const p = PAGES.find((x) => x.n === this.tracked);
    if (!p || this.found.has(p.n) || !this.unlocked(p)) return null;
    const s = this.spotOf(p);
    return s ? { x: s.x, z: s.z, y: s.y, label: `📖 Page ${p.n} du carnet` } : null;
  }

  track(n) {
    this.tracked = n;
    const g = this.game;
    if (n) g.focus = 'page';
    else if (g.focus === 'page') g.focus = 'story';
    g.ui.refreshQuest?.();
    g.requestSave();
  }

  /** Crée ou retire les pages posées dans le monde. */
  sync() {
    const want = new Set(this.available().map((p) => p.n));
    for (const [n, it] of this.items) {
      if (want.has(n)) continue;
      it.root.removeFromParent();
      it.pillar.geometry.dispose();
      it.paper.geometry.dispose();
      this.items.delete(n);
    }
    for (const p of this.available()) {
      if (this.items.has(p.n)) continue;
      const spot = this.spotOf(p);
      if (!spot) continue;
      const root = new THREE.Group();
      root.position.set(spot.x, spot.y, spot.z);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), this.paperMat);
      paper.position.y = 1.15;
      root.add(paper);
      const glow = new THREE.Sprite(this.glowMat);
      glow.scale.setScalar(1.6);
      glow.position.y = 1.15;
      root.add(glow);
      const pg = new THREE.CylinderGeometry(0.28, 0.5, 9, 14, 1, true);
      pg.translate(0, 4.5, 0);
      const pillar = new THREE.Mesh(pg, this.pillarMat);
      root.add(pillar);
      this.group.add(root);
      this.items.set(p.n, { page: p, root, paper, glow, pillar, spot });
    }
  }

  /** Page à portée de main (dehors). */
  nearest(max = 1.9) {
    const g = this.game;
    if (g.indoors) return null;
    const pp = g.player.pos;
    for (const it of this.items.values()) {
      const s = it.spot;
      if (Math.hypot(s.x - pp.x, s.z - pp.z) < max && Math.abs(s.y - pp.y) < 2.5) return it.page;
    }
    return null;
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    this.group.visible = g.state === 'play' || g.state === 'creator';
    if (!this.items.size) return;
    const night = g.world.sky.nightFactor;
    this.pillarMat.opacity = 0.32 + night * 0.4 + Math.sin(this.t * 2) * 0.05;
    for (const it of this.items.values()) {
      it.paper.position.y = 1.15 + Math.sin(this.t * 1.8 + it.page.n) * 0.12;
      it.paper.rotation.y += dt * 0.9;
      it.paper.rotation.z = Math.sin(this.t * 1.3 + it.page.n) * 0.18;
      it.glow.position.y = it.paper.position.y;
    }
    // Quelques paillettes autour de la page la plus proche.
    this.sparkT = (this.sparkT || 0) - dt;
    if (this.sparkT <= 0) {
      this.sparkT = 0.6;
      const pp = g.player.pos;
      for (const it of this.items.values()) {
        if (Math.hypot(it.spot.x - pp.x, it.spot.z - pp.z) > 30) continue;
        g.particles.emit('sparkle', new THREE.Vector3(it.spot.x, it.spot.y + 1.2, it.spot.z), { count: 2, spread: 0.6, size: 0.35, life: 1.2, rise: 0.4 });
      }
    }
  }

  /** Ramasse une page : elle rejoint le carnet, on la lit tout de suite. */
  pick(p) {
    const g = this.game;
    if (this.found.has(p.n)) return;
    this.found.add(p.n);
    if (this.tracked === p.n) this.tracked = null;
    const it = this.items.get(p.n);
    if (it) g.particles.emit('sparkle', new THREE.Vector3(it.spot.x, it.spot.y + 1.2, it.spot.z), { count: 18, spread: 1.2, size: 0.7, life: 1.6, rise: 1 });
    this.sync();
    g.audio.play('chapter');
    g.character.play('pick', 1);
    g.emit('page', { n: p.n });
    g.requestSave();
    this.read(p.n, true);
  }

  // --- Lecture ------------------------------------------------------------------------------

  buildModal() {
    this.el = document.createElement('div');
    this.el.id = 'carnet-page';
    this.el.className = 'modal hidden';
    this.el.innerHTML = '<div class="parchment"></div>';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') {
        e.preventDefault();
        this.close();
      }
    });
    this.isOpen = false;
  }

  /** Ouvre une page (fresh : vient d'être trouvée → récompense en la rangeant). */
  read(n, fresh = false) {
    const g = this.game;
    const p = PAGES.find((x) => x.n === n);
    if (!p) return;
    this.fresh = fresh ? p : null;
    const card = this.el.querySelector('.parchment');
    const paras = p.text.map((t) => `<p>${escapeHtml(t)}</p>`).join('');
    const met = g.villagers.get('aurele')?.met;
    const twist = met ? 'Aurèle… comme le grand-père de la source chaude, à Bourg-Sapin ?' : 'Aurèle… Il est parti pour l\'île des Pins. Vit-il encore là-bas ?';
    card.innerHTML = `<div class="pc-head">Carnet du gardien · page ${p.n}/${PAGES.length}</div>
      <div class="pc-art" aria-hidden="true">${p.emoji}</div>
      <h3 class="pc-date">${escapeHtml(p.date)}</h3>
      <div class="pc-text">${paras}</div>
      <div class="pc-sign">${escapeHtml(p.sign || '— A.')}</div>
      ${fresh ? `<div class="pc-found">${this.found.size === PAGES.length ? '✨ Le carnet est complet !' : `📖 ${this.found.size}/${PAGES.length} pages retrouvées`}</div>` : ''}
      ${p.sign && fresh ? `<div class="pc-found pc-twist">${twist}</div>` : ''}
      <button class="btn primary" data-pc-close>${fresh ? '📖 Ranger la page dans le carnet' : 'Fermer'}</button>`;
    card.querySelector('[data-pc-close]').onclick = () => this.close();
    this.el.classList.remove('hidden');
    this.isOpen = true;
    g.input.enabled = false;
  }

  close() {
    if (!this.isOpen) return;
    const g = this.game;
    this.isOpen = false;
    this.el.classList.add('hidden');
    g.input.enabled = true;
    g.input.pressed?.clear(); // la touche qui ferme la page ne sert pas une deuxième fois
    g.audio.play('ui');
    const p = this.fresh;
    this.fresh = null;
    if (p) {
      g.grantReward({ coins: 80, stars: 2 }, null, `📖 Page ${p.n} du carnet du gardien`);
      const nxt = this.available()[0];
      if (this.found.size === PAGES.length) setTimeout(() => g.ui.toast('📖 Les sept pages sont réunies. Le carnet porte une signature : Aurèle…', 5000), 1200);
      else if (nxt) setTimeout(() => g.ui.toast(`📖 Une autre page t'attend : « ${nxt.riddle} »`, 5000), 1200);
      g.ui.refreshQuest();
    }
  }

  /**
   * Partie commencée avant le carnet : des pages se sont déjà envolées. On l'annonce une
   * fois, avec l'énigme de la première (les nouvelles parties l'apprennent en fin de chapitre).
   */
  announce() {
    const g = this.game;
    if (this.introduced) return;
    const list = this.available();
    if (!list.length) return;
    if (g.busy || g.panel || g.state !== 'play') {
      setTimeout(() => this.announce(), 1500);
      return;
    }
    this.introduced = true;
    g.requestSave();
    const el = document.querySelector('#chapter');
    const p = list[0];
    el.innerHTML = `<div class="chapter-card chap-end"><div class="chap-emoji">📖</div><div class="chap-num">Nouveau</div><h2>Le carnet du gardien</h2>
      <p>Pendant ton absence, le vent a dispersé sur l'île les pages d'un vieux carnet : celui de l'ancien gardien du phare. ${list.length > 1 ? `${list.length} pages t'attendent déjà` : 'Une page t\'attend déjà'}, chacune signalée par une colonne de lumière pâle.</p>
      <div class="chap-page"><b>Page ${p.n}</b><i>« ${escapeHtml(p.riddle)} »</i></div>
      <p class="note">Les énigmes sont dans le journal (J), onglet 📖 Carnet. Une nouvelle page s'envole à chaque chapitre terminé.</p>
      <div class="chap-btns"><button class="btn" data-chap-track>🧭 Me guider</button><button class="btn big primary" data-chap-ok>Plus tard</button></div></div>`;
    el.classList.remove('hidden');
    g.audio.play('chapter');
    g.input.enabled = false;
    g.ui.chapterOpen = true;
    const close = () => {
      el.classList.add('hidden');
      g.input.enabled = true;
      g.ui.chapterOpen = false;
      g.ui.refreshQuest();
    };
    el.querySelector('[data-chap-ok]').onclick = close;
    el.querySelector('[data-chap-track]').onclick = () => {
      this.track(p.n);
      close();
      g.guide?.flash();
    };
  }

  serialize() {
    return { f: [...this.found], t: this.tracked, i: this.introduced };
  }

  restore(d) {
    this.found = new Set(Array.isArray(d?.f) ? d.f : []);
    this.tracked = d?.t ?? null;
    this.introduced = !!d?.i;
  }
}

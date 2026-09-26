import { loadPhotos, savePhotos } from '../core/save.js';

// Mode photo (O) : interface masquée, filtres, poses, album de souvenirs.

const FILTERS = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'doux', label: 'Doux', css: 'saturate(1.15) brightness(1.06) contrast(0.95)' },
  { id: 'reve', label: 'Rêve', css: 'saturate(1.3) brightness(1.1) hue-rotate(-12deg) contrast(0.9)' },
  { id: 'sepia', label: 'Sépia', css: 'sepia(0.75) contrast(1.05)' },
  { id: 'nb', label: 'Noir & blanc', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.3) saturate(1.4) contrast(0.9) brightness(1.05)' },
];
const POSES = [
  { id: 'wave', label: '👋 Salut' },
  { id: 'dance', label: '💃 Danse' },
  { id: 'kiss', label: '😘 Bisou' },
  { id: 'celebrate', label: '🎉 Youpi' },
  { id: 'sit', label: '🧘 Assis' },
];
const MAX = 12;

export class PhotoMode {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.filter = FILTERS[0];
    this.photos = loadPhotos();
    this.bar = document.createElement('div');
    this.bar.className = 'photo-bar hidden';
    document.body.appendChild(this.bar);
    this.album = document.createElement('div');
    this.album.className = 'modal hidden';
    this.album.innerHTML = `<div class="modal-card album-card"><button class="close" data-aclose>✕</button><h2>📷 Album souvenir</h2>
      <p class="note">Tes ${MAX} dernières photos sont gardées dans ce navigateur.</p><div class="album-grid" id="album-grid"></div><div id="album-view"></div></div>`;
    document.body.appendChild(this.album);
    this.album.querySelector('[data-aclose]').onclick = () => this.closeAlbum();
    this.album.addEventListener('click', (e) => {
      if (e.target === this.album) this.closeAlbum();
    });
    this.flash = document.createElement('div');
    this.flash.className = 'flash';
    document.body.appendChild(this.flash);
  }

  enter() {
    const g = this.game;
    this.active = true;
    g.player.frozen = true;
    g.cam.photo = true;
    document.body.classList.add('photo-mode');
    this.render();
    this.bar.classList.remove('hidden');
  }

  exit() {
    if (!this.active) return;
    const g = this.game;
    this.active = false;
    g.player.frozen = false;
    g.cam.photo = false;
    g.character.setSit(false);
    g.canvas.style.filter = '';
    document.body.classList.remove('photo-mode');
    this.bar.classList.add('hidden');
  }

  render() {
    this.bar.innerHTML = `<div class="pb-row">${FILTERS.map((f) => `<button class="chip${f === this.filter ? ' active' : ''}" data-f="${f.id}">${f.label}</button>`).join('')}</div>
      <div class="pb-row">${POSES.map((p) => `<button class="chip" data-p="${p.id}">${p.label}</button>`).join('')}</div>
      <div class="pb-row"><button class="btn" data-album>🖼️ Album (${this.photos.length})</button><button class="btn primary big-shot" data-shot>📸 Photo</button><button class="btn" data-exit>✕ Quitter</button></div>
      <div class="pb-tip">Glisser : tourner · molette : zoomer · Échap : quitter</div>`;
    this.bar.querySelectorAll('[data-f]').forEach((b) => {
      b.onclick = () => {
        this.filter = FILTERS.find((f) => f.id === b.dataset.f);
        this.game.canvas.style.filter = this.filter.css;
        this.render();
      };
    });
    this.bar.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => {
        const c = this.game.character;
        if (b.dataset.p === 'sit') c.setSit(!c.anim.sit);
        else c.play(b.dataset.p, b.dataset.p === 'dance' ? 6 : 2.5);
      };
    });
    this.bar.querySelector('[data-shot]').onclick = () => this.shoot();
    this.bar.querySelector('[data-album]').onclick = () => this.openAlbum();
    this.bar.querySelector('[data-exit]').onclick = () => this.exit();
  }

  shoot() {
    const g = this.game;
    g.postfx.render(0);
    const src = g.canvas;
    const w = 720;
    const h = Math.round((src.height / src.width) * w);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.filter = this.filter.css;
    ctx.drawImage(src, 0, 0, w, h);
    ctx.filter = 'none';
    ctx.font = '800 18px Nunito, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(91,70,54,0.5)';
    ctx.lineWidth = 3;
    const label = `Doucebrise · Jour ${g.world.sky.day}`;
    ctx.strokeText(label, w - 14, h - 14);
    ctx.fillText(label, w - 14, h - 14);
    let url;
    try {
      url = c.toDataURL('image/jpeg', 0.82);
    } catch {
      g.ui.toast('Impossible de prendre la photo sur cet appareil.');
      return;
    }
    this.photos.unshift({ url, day: g.world.sky.day });
    this.photos = this.photos.slice(0, MAX);
    if (!savePhotos(this.photos)) {
      this.photos = this.photos.slice(0, 6);
      savePhotos(this.photos);
    }
    this.flash.classList.remove('go');
    void this.flash.offsetWidth;
    this.flash.classList.add('go');
    g.audio.play('cast');
    g.emit('photo', { zone: g.zone?.id });
    this.render();
  }

  openAlbum() {
    this.album.classList.remove('hidden');
    const grid = this.album.querySelector('#album-grid');
    const view = this.album.querySelector('#album-view');
    view.innerHTML = '';
    grid.innerHTML = this.photos.length ? '' : '<p class="empty-state">Pas encore de photo. Appuie sur 📸 !</p>';
    this.photos.forEach((p, i) => {
      const img = document.createElement('img');
      img.src = p.url;
      img.alt = `Photo du jour ${p.day}`;
      img.onclick = () => {
        view.innerHTML = `<img class="album-big" src="${p.url}" alt="Photo du jour ${p.day}"/><div class="pb-row"><a class="btn" href="${p.url}" download="doucebrise-jour-${p.day}.jpg">⬇️ Enregistrer</a><button class="btn" data-del>🗑️ Supprimer</button></div>`;
        view.querySelector('[data-del]').onclick = () => {
          this.photos.splice(i, 1);
          savePhotos(this.photos);
          this.openAlbum();
          this.render();
        };
      };
      grid.appendChild(img);
    });
  }

  closeAlbum() {
    this.album.classList.add('hidden');
  }
}

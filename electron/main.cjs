// Doucebrise — application de bureau (Windows / macOS).
// Le jeu (dossier dist/, construit par Vite) est servi par un protocole interne
// « app:// » : modules ES, sauvegardes (localStorage) et polices fonctionnent hors ligne.

const { app, BrowserWindow, protocol, net, Menu, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { Readable } = require('node:stream');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// Laisse le jeu utiliser la carte graphique même si le pilote est sur liste noire.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

const ROOT = path.join(__dirname, '..', 'dist');
let win = null;

// Musiques : servies par morceaux (en-tête Range) pour pouvoir reprendre une chanson
// en plein milieu ; sans cela, le lecteur audio repartirait toujours du début.
const MEDIA = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.flac': 'audio/flac', '.webm': 'audio/webm' };

function serveMedia(request, file, type) {
  let size;
  try {
    size = fs.statSync(file).size;
  } catch {
    return new Response('Introuvable', { status: 404 });
  }
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes' };
  const m = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  if (!m || (!m[1] && !m[2])) {
    return new Response(Readable.toWeb(fs.createReadStream(file)), { status: 200, headers: { ...headers, 'Content-Length': String(size) } });
  }
  let start = m[1] ? parseInt(m[1], 10) : Math.max(0, size - parseInt(m[2], 10));
  let end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
    status: 206,
    headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` },
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'Doucebrise',
    backgroundColor: '#cfeefb',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://jeu/index.html');
  // Liens (page des nouvelles versions) : ouverts dans le navigateur, jamais dans le jeu.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('app://')) return;
    e.preventDefault();
    if (/^https:\/\//.test(url)) shell.openExternal(url);
  });
  win.on('enter-full-screen', () => win.webContents.send('app:fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('app:fullscreen', false));
}

function buildMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }
  // macOS : menu minimal (Cmd+Q, copier-coller dans les champs, plein écran).
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      { label: 'Affichage', submenu: [{ role: 'togglefullscreen', label: 'Plein écran' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
      { role: 'windowMenu' },
    ]),
  );
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(ROOT)) return new Response('Introuvable', { status: 404 });
    const type = MEDIA[path.extname(file).toLowerCase()];
    if (type) return serveMedia(request, file, type);
    return net.fetch(pathToFileURL(file).toString());
  });
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle('app:quit', () => app.quit());
ipcMain.handle('app:set-fullscreen', (e, on) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  w.setFullScreen(!!on);
  return w.isFullScreen();
});
ipcMain.handle('app:is-fullscreen', (e) => BrowserWindow.fromWebContents(e.sender).isFullScreen());

app.on('window-all-closed', () => app.quit());

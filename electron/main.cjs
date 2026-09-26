// Doucebrise — application de bureau (Windows / macOS).
// Le jeu (dossier dist/, construit par Vite) est servi par un protocole interne
// « app:// » : modules ES, sauvegardes (localStorage) et polices fonctionnent hors ligne.

const { app, BrowserWindow, protocol, net, Menu, ipcMain, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// Laisse le jeu utiliser la carte graphique même si le pilote est sur liste noire.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

const ROOT = path.join(__dirname, '..', 'dist');
let win = null;

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

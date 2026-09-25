// Pont minimal entre le jeu et l'application : quitter, plein écran.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  quit: () => ipcRenderer.invoke('app:quit'),
  setFullscreen: (on) => ipcRenderer.invoke('app:set-fullscreen', on),
  isFullscreen: () => ipcRenderer.invoke('app:is-fullscreen'),
  onFullscreen: (fn) => ipcRenderer.on('app:fullscreen', (_e, on) => fn(on)),
});
